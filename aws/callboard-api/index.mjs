// Call board API for a TTS Players show portal (AWS Lambda behind CloudFront at /api/calls).
// Replaces the Google Sheet "Rehearsals" tab. Same actions and JSON shapes as the Apps Script,
// so the front end only changes its URL. Calendar sync stays in Apps Script (see bridge below).
//
// Environment:
//   TABLE_NAME        DynamoDB table (partition key "id", string)
//   PIN_PARAM         SSM SecureString name holding the staff PIN
//   SYNC_PARAM        SSM SecureString name holding the shared secret for the Apps Script bridge
//   APPS_SCRIPT_URL   Apps Script web app /exec URL (calendar bridge); "" turns the bridge off
//   YT_PARAM          SSM SecureString name holding the YouTube Data API key (never sent to browsers)
//   YT_PLAYLIST_ID    Choreography playlist to list at GET /api/videos (fixed here so callers cannot pick others)

import { createHash, timingSafeEqual } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { SSMClient, GetParametersCommand } from "@aws-sdk/client-ssm";

const MAX_BODY_BYTES = 32 * 1024;       // a call is a few hundred bytes; reject anything large before parsing
const MAX_ITEMS_RETURNED = 2000;        // hard cap on the list so a runaway table cannot exhaust memory
const LOCK_ID = "_auth";                // bookkeeping item for PIN brute-force lockout (never listed)
const LOCK_MAX_FAILURES = 10;
const LOCK_WINDOW_MS = 15 * 60 * 1000;
const BRIDGE_TIMEOUT_MS = 8000;
const VIDEOS_CACHE_MS = 5 * 60 * 1000;  // playlist is cached in memory so page views cost almost no YouTube quota
const VIDEOS_MAX_PAGES = 10;            // 10 pages x 50 entries bounds quota use and response size
const VIDEO_ID_PATTERN = /^[\w-]{11}$/;
const HIDDEN_TITLES = ["Private video", "Deleted video"];

const json = (statusCode, body) => ({
  statusCode,
  headers: { "content-type": "application/json", "cache-control": "no-store" },
  body: JSON.stringify(body),
});

/** Structured audit line: who/what/when/result. Never includes the PIN or secrets. */
const audit = (log, fields) => log(JSON.stringify({ ts: new Date().toISOString(), ...fields }));

/** Constant-time string comparison (hashes first so lengths match). */
export function safeEqual(a, b) {
  const ha = createHash("sha256").update(String(a)).digest();
  const hb = createHash("sha256").update(String(b)).digest();
  return timingSafeEqual(ha, hb);
}

const isDate = (s) => {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
};

const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const list = (v, maxItems, maxLen) => {
  const arr = Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : [];
  return arr.map((x) => str(x, maxLen)).filter(Boolean).slice(0, maxItems);
};

/**
 * Validates and normalizes a call coming from the browser. Unknown fields are dropped.
 * Returns { item } or { error } (error text is safe to show the client).
 */
export function cleanCall(raw, now = Date.now()) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { error: "Missing call data" };
  const id = raw.id == null || raw.id === "" ? `reh-${now}` : String(raw.id);
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id) || id.startsWith("_")) return { error: "Invalid call id" };
  if (!isDate(raw.date)) return { error: "Date must be YYYY-MM-DD" };
  const startTime = str(raw.startTime, 20);
  const endTime = str(raw.endTime, 20);
  return {
    item: {
      id,
      title: str(raw.title, 200) || "Rehearsal Call",
      date: raw.date,
      startTime,
      endTime,
      time: startTime + (endTime ? " - " + endTime : ""),
      location: str(raw.location, 300),
      type: str(raw.type, 100) || "Wednesday Partial Call",
      calledRoles: list(raw.calledRoles, 300, 120),
      focusScenes: list(raw.focusScenes, 60, 500),
      notes: str(raw.notes, 4000),
      isArchived: raw.isArchived === true || String(raw.isArchived).toLowerCase() === "true",
    },
  };
}

/** Builds the handler around injectable dependencies so it can be unit tested without AWS. */
export function makeHandler(deps) {
  const { db, getSecrets, getYoutubeKey, fetchImpl, env, log, now } = deps;
  let videosCache = null;   // { at, list }

  async function listCalls() {
    const items = [];
    let key;
    do {
      const out = await db.send(new ScanCommand({ TableName: env.TABLE_NAME, ExclusiveStartKey: key }));
      for (const it of out.Items || []) if (!it.id.startsWith("_")) items.push(it);
      key = out.LastEvaluatedKey;
    } while (key && items.length < MAX_ITEMS_RETURNED);
    return items.slice(0, MAX_ITEMS_RETURNED).map(({ updatedAt, ...call }) => call);
  }

  /**
   * Lists the choreography playlist as [{ id, title, thumb }], using the server-side YouTube key.
   * Cached for VIDEOS_CACHE_MS; if YouTube fails, the last good list is served instead.
   */
  async function listVideos() {
    if (videosCache && now() - videosCache.at < VIDEOS_CACHE_MS) return videosCache.list;
    try {
      if (!env.YT_PLAYLIST_ID) throw new Error("YT_PLAYLIST_ID not set");
      const key = await getYoutubeKey();
      const list = [];
      let pageToken = "";
      for (let page = 0; page < VIDEOS_MAX_PAGES; page++) {
        const params = new URLSearchParams({ part: "snippet", maxResults: "50", playlistId: env.YT_PLAYLIST_ID });
        if (pageToken) params.set("pageToken", pageToken);
        // The key goes in a header, not the URL, so it never lands in any request log.
        const res = await fetchImpl(`https://www.googleapis.com/youtube/v3/playlistItems?${params}`, {
          headers: { "x-goog-api-key": key },
          signal: AbortSignal.timeout(BRIDGE_TIMEOUT_MS),
        });
        if (!res.ok) {
          // Google's reason code (for example API_KEY_HTTP_REFERRER_BLOCKED) helps diagnose key settings; it never contains the key.
          let reason = "";
          try { const e = await res.json(); reason = (e.error && (e.error.errors?.[0]?.reason || e.error.status)) || ""; } catch { /* body not JSON */ }
          throw new Error(`YouTube returned ${res.status} ${reason}`.trim());
        }
        const data = await res.json();
        for (const entry of data.items || []) {
          const snip = entry.snippet || {};
          const id = snip.resourceId && snip.resourceId.videoId;
          if (!id || !VIDEO_ID_PATTERN.test(id) || HIDDEN_TITLES.includes(snip.title)) continue;
          const thumbs = snip.thumbnails || {};
          list.push({ id, title: snip.title || "Untitled video", thumb: (thumbs.medium || thumbs.default || {}).url || "" });
        }
        if (!data.nextPageToken) break;
        pageToken = data.nextPageToken;
      }
      videosCache = { at: now(), list };
      return list;
    } catch (err) {
      audit(log, { event: "videos_error", error: String(err && err.message) });
      if (videosCache) return videosCache.list;
      throw err;
    }
  }

  /** Counts a failed PIN attempt; returns true if the lockout is now active. */
  async function recordFailure() {
    const t = now();
    const cur = (await db.send(new GetCommand({ TableName: env.TABLE_NAME, Key: { id: LOCK_ID } }))).Item;
    const fresh = !cur || t - cur.windowStart > LOCK_WINDOW_MS;
    const count = fresh ? 1 : cur.count + 1;
    await db.send(new PutCommand({
      TableName: env.TABLE_NAME,
      Item: { id: LOCK_ID, count, windowStart: fresh ? t : cur.windowStart },
    }));
    return count >= LOCK_MAX_FAILURES;
  }

  async function isLocked() {
    const cur = (await db.send(new GetCommand({ TableName: env.TABLE_NAME, Key: { id: LOCK_ID } }))).Item;
    return Boolean(cur && now() - cur.windowStart <= LOCK_WINDOW_MS && cur.count >= LOCK_MAX_FAILURES);
  }

  /** Returns "ok", "bad" or "locked". Resets the failure counter on success. */
  async function checkPin(pin, secrets) {
    if (await isLocked()) return "locked";
    if (typeof pin === "string" && safeEqual(pin.trim(), secrets.pin)) {
      await db.send(new PutCommand({ TableName: env.TABLE_NAME, Item: { id: LOCK_ID, count: 0, windowStart: now() } }));
      return "ok";
    }
    return (await recordFailure()) ? "locked" : "bad";
  }

  /**
   * Hands calendar work to Apps Script, which owns the Google Calendar.
   * Sends every call on the date so its sync code sees the same picture the Sheet used to give it.
   * Failure never blocks a save: the call is already stored.
   */
  async function bridge(secrets, payload, date) {
    if (!env.APPS_SCRIPT_URL) return null;
    try {
      const all = (await listCalls()).filter((c) => c.date === date);
      const res = await fetchImpl(env.APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "content-type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ ...payload, secret: secrets.sync, date, calls: all }),
        redirect: "follow",
        signal: AbortSignal.timeout(BRIDGE_TIMEOUT_MS),
      });
      const out = await res.json();
      return out;
    } catch (err) {
      audit(log, { event: "bridge_error", error: String(err && err.message) });
      return null;
    }
  }

  return async function handler(event) {
    const method = event.requestContext?.http?.method || event.httpMethod;
    const who = event.headers?.["x-forwarded-for"] || event.requestContext?.http?.sourceIp || "unknown";
    try {
      const path = event.rawPath || event.path || "";
      if (method === "GET" && path.endsWith("/videos")) {
        try { return json(200, await listVideos()); }
        catch { return json(502, { status: "error", message: "Videos unavailable" }); }
      }
      if (method === "GET") {
        return json(200, await listCalls());
      }
      if (method !== "POST") return json(405, { status: "error", message: "Method not allowed" });

      const rawBody = event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString("utf8") : event.body || "";
      if (Buffer.byteLength(rawBody) > MAX_BODY_BYTES) return json(413, { status: "error", message: "Request too large" });
      let data;
      try { data = JSON.parse(rawBody); } catch { return json(400, { status: "error", message: "Invalid request" }); }
      if (!data || typeof data !== "object" || typeof data.action !== "string") {
        return json(400, { status: "error", message: "Invalid request" });
      }

      const secrets = await getSecrets();
      const pinResult = await checkPin(data.pin, secrets);
      if (pinResult === "locked") {
        audit(log, { event: "auth_locked", action: data.action, who });
        return json(429, { status: "error", message: "Too many wrong PINs. Try again in 15 minutes." });
      }
      if (pinResult !== "ok") {
        audit(log, { event: "auth_failed", action: data.action, who });
        return json(200, { status: "error", message: data.action === "verifyPin" ? "Invalid PIN" : "Unauthorized. Invalid staff credentials." });
      }

      if (data.action === "verifyPin") return json(200, { status: "success", message: "PIN accepted" });

      if (data.action === "save") {
        const { item, error } = cleanCall(data.item, now());
        if (error) return json(200, { status: "error", message: error });
        await db.send(new PutCommand({ TableName: env.TABLE_NAME, Item: { ...item, updatedAt: new Date(now()).toISOString() } }));
        audit(log, { event: "save", id: item.id, archived: item.isArchived, who, result: "ok" });
        const sync = await bridge(secrets, { action: "awsSync" }, item.date);
        return json(200, { status: "success", id: item.id, sync });
      }

      if (data.action === "archive" || data.action === "delete" || data.action === "unarchive") {
        const archived = data.action !== "unarchive";
        const id = String(data.id || "");
        const cur = /^[A-Za-z0-9_-]{1,64}$/.test(id) && !id.startsWith("_")
          ? (await db.send(new GetCommand({ TableName: env.TABLE_NAME, Key: { id } }))).Item : null;
        if (!cur) return json(200, { status: "error", message: "Notice ID not found" });
        await db.send(new UpdateCommand({
          TableName: env.TABLE_NAME, Key: { id },
          UpdateExpression: "SET isArchived = :a, updatedAt = :u",
          ExpressionAttributeValues: { ":a": archived, ":u": new Date(now()).toISOString() },
        }));
        audit(log, { event: data.action, id, who, result: "ok" });
        await bridge(secrets, { action: "awsSync" }, cur.date);
        return json(200, { status: "success", id, isArchived: archived });
      }

      if (data.action === "calendarAttach" || data.action === "calendarCreate") {
        const id = String(data.id || "");
        const cur = /^[A-Za-z0-9_-]{1,64}$/.test(id) && !id.startsWith("_")
          ? (await db.send(new GetCommand({ TableName: env.TABLE_NAME, Key: { id } }))).Item : null;
        if (!cur) return json(200, { status: "error", message: "Notice ID not found" });
        const eventId = data.action === "calendarAttach" ? str(data.eventId, 300) : "";
        if (data.action === "calendarAttach" && !eventId) return json(200, { status: "error", message: "Missing calendar event" });
        const out = await bridge(secrets, { action: data.action === "calendarAttach" ? "awsAttach" : "awsCreate", id, eventId }, cur.date);
        audit(log, { event: data.action, id, who, result: out && out.status });
        return json(200, out || { status: "error", message: "Calendar service unavailable" });
      }

      return json(200, { status: "error", message: "Unknown action" });
    } catch (err) {
      // Detail stays in the server log; the client gets a generic message.
      audit(log, { event: "error", who, error: String(err && err.stack || err) });
      return json(500, { status: "error", message: "Server error. Please try again." });
    }
  };
}

// ---------- production wiring ----------

let cachedSecrets;
async function loadSecrets() {
  if (cachedSecrets) return cachedSecrets;
  const ssm = new SSMClient({});
  const out = await ssm.send(new GetParametersCommand({ Names: [process.env.PIN_PARAM, process.env.SYNC_PARAM], WithDecryption: true }));
  const by = Object.fromEntries((out.Parameters || []).map((p) => [p.Name, p.Value]));
  if (!by[process.env.PIN_PARAM] || !by[process.env.SYNC_PARAM]) throw new Error("secrets missing in SSM");
  cachedSecrets = { pin: by[process.env.PIN_PARAM], sync: by[process.env.SYNC_PARAM] };
  return cachedSecrets;
}

let cachedYoutubeKey;
async function loadYoutubeKey() {
  if (cachedYoutubeKey) return cachedYoutubeKey;
  const out = await new SSMClient({}).send(new GetParametersCommand({ Names: [process.env.YT_PARAM], WithDecryption: true }));
  const value = out.Parameters && out.Parameters[0] && out.Parameters[0].Value;
  if (!value) throw new Error("YouTube key missing in SSM");
  cachedYoutubeKey = value;
  return value;
}

export const handler = makeHandler({
  db: DynamoDBDocumentClient.from(new DynamoDBClient({}), { marshallOptions: { removeUndefinedValues: true } }),
  getSecrets: loadSecrets,
  getYoutubeKey: loadYoutubeKey,
  fetchImpl: fetch,
  env: process.env,
  log: console.log,
  now: Date.now,
});
