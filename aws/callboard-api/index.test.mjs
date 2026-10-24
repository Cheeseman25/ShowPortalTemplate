// Unit tests for the call board API. Run: node --test aws/callboard-api/index.test.mjs
// Uses an in-memory fake of the DynamoDB document client, so no AWS access is needed.
import test from "node:test";
import assert from "node:assert/strict";
import { makeHandler, cleanCall, safeEqual } from "./index.mjs";

function fakeDb() {
  const rows = new Map();
  return {
    rows,
    async send(cmd) {
      const n = cmd.constructor.name, i = cmd.input;
      if (n === "ScanCommand") return { Items: [...rows.values()].map((r) => ({ ...r })) };
      if (n === "GetCommand") return { Item: rows.get(i.Key.id) && { ...rows.get(i.Key.id) } };
      if (n === "PutCommand") { rows.set(i.Item.id, { ...i.Item }); return {}; }
      if (n === "UpdateCommand") {
        const r = rows.get(i.Key.id); r.isArchived = i.ExpressionAttributeValues[":a"]; r.updatedAt = i.ExpressionAttributeValues[":u"]; return {};
      }
      throw new Error("unexpected " + n);
    },
  };
}

function setup(over = {}) {
  const db = fakeDb(), logs = [], bridgeCalls = [];
  let t = 1_000_000;
  const h = makeHandler({
    db,
    getSecrets: async () => ({ pin: "4321", sync: "s3cret" }),
    getYoutubeKey: async () => "YT-KEY-SECRET",
    fetchImpl: over.fetchImpl || (async (url, opts) => { bridgeCalls.push(JSON.parse(opts.body)); return { json: async () => ({ status: "success", report: [], unmatched: [] }) }; }),
    env: { TABLE_NAME: "t", APPS_SCRIPT_URL: "https://apps.example/exec", YT_PLAYLIST_ID: "PLfixed", ...(over.env || {}) },
    log: (l) => logs.push(l),
    now: () => t,
  });
  const post = (body) => h({ requestContext: { http: { method: "POST" } }, body: typeof body === "string" ? body : JSON.stringify(body), headers: {} });
  const get = () => h({ requestContext: { http: { method: "GET" } }, headers: {} });
  return { h, db, logs, bridgeCalls, post, get, tick: (ms) => { t += ms; } };
}

const call = { id: "reh-1", title: "Act 1", date: "2026-11-04", startTime: "5:30 PM", endTime: "7:30 PM", location: "Hall", type: "Full Cast", calledRoles: ["Anna (Elsa)"], focusScenes: "1, 2", notes: "bring water", isArchived: false };
const body = (r) => JSON.parse(r.body);

test("cleanCall validates date, id, drops unknown fields, caps lengths", () => {
  assert.ok(cleanCall({ ...call, date: "2026-13-40" }).error);
  assert.ok(cleanCall({ ...call, id: "../x" }).error);
  assert.ok(cleanCall({ ...call, id: "_auth" }).error);
  const { item } = cleanCall({ ...call, evil: "x", title: "a".repeat(500) });
  assert.equal(item.evil, undefined);
  assert.equal(item.title.length, 200);
  assert.deepEqual(item.focusScenes, ["1", "2"]);
  assert.equal(item.time, "5:30 PM - 7:30 PM");
  assert.match(cleanCall({ ...call, id: "" }, 55).item.id, /^reh-55$/);
});

test("long focus-scene text (survey notices) is kept whole", () => {
  const long = "Please fill out the survey for additional availability. ".repeat(6).trim();
  assert.ok(long.length > 120 && long.length < 500);
  assert.equal(cleanCall({ ...call, focusScenes: [long] }).item.focusScenes[0], long);
});

test("safeEqual", () => { assert.ok(safeEqual("a", "a")); assert.ok(!safeEqual("a", "b")); });

test("verifyPin accepts the right PIN and rejects a wrong one", async () => {
  const s = setup();
  assert.equal(body(await s.post({ action: "verifyPin", pin: "4321" })).status, "success");
  assert.equal(body(await s.post({ action: "verifyPin", pin: "0000" })).status, "error");
});

test("save requires the PIN and never stores without it", async () => {
  const s = setup();
  const r = body(await s.post({ action: "save", pin: "nope", item: call }));
  assert.equal(r.status, "error");
  assert.equal(s.db.rows.has("reh-1"), false);
});

test("save stores, lists without internal fields, and bridges to the calendar", async () => {
  const s = setup();
  const r = body(await s.post({ action: "save", pin: "4321", item: call }));
  assert.equal(r.status, "success");
  const list = body(await s.get());
  assert.equal(list.length, 1);
  assert.equal(list[0].updatedAt, undefined);
  assert.equal(list[0].id, "reh-1");
  assert.equal(s.bridgeCalls[0].action, "awsSync");
  assert.equal(s.bridgeCalls[0].secret, "s3cret");
  assert.equal(s.bridgeCalls[0].calls.length, 1);
});

test("a bridge failure does not fail the save", async () => {
  const s = setup({ fetchImpl: async () => { throw new Error("down"); } });
  const r = body(await s.post({ action: "save", pin: "4321", item: call }));
  assert.equal(r.status, "success");
  assert.equal(r.sync, null);
  assert.equal(s.db.rows.has("reh-1"), true);
});

test("archive and unarchive flip the flag and never delete", async () => {
  const s = setup();
  await s.post({ action: "save", pin: "4321", item: call });
  await s.post({ action: "archive", pin: "4321", id: "reh-1" });
  assert.equal(s.db.rows.get("reh-1").isArchived, true);
  await s.post({ action: "unarchive", pin: "4321", id: "reh-1" });
  assert.equal(s.db.rows.get("reh-1").isArchived, false);
  assert.equal(body(await s.post({ action: "archive", pin: "4321", id: "missing" })).status, "error");
});

test("calendarAttach and calendarCreate go through the bridge", async () => {
  const s = setup();
  await s.post({ action: "save", pin: "4321", item: call });
  s.bridgeCalls.length = 0;
  await s.post({ action: "calendarAttach", pin: "4321", id: "reh-1", eventId: "ev9" });
  await s.post({ action: "calendarCreate", pin: "4321", id: "reh-1" });
  assert.deepEqual(s.bridgeCalls.map((b) => b.action), ["awsAttach", "awsCreate"]);
  assert.equal(s.bridgeCalls[0].eventId, "ev9");
  assert.equal(body(await s.post({ action: "calendarAttach", pin: "4321", id: "reh-1" })).status, "error");
});

test("lockout after 10 wrong PINs, even for the right PIN, then clears after the window", async () => {
  const s = setup();
  for (let i = 0; i < 10; i++) await s.post({ action: "verifyPin", pin: "bad" });
  const locked = await s.post({ action: "verifyPin", pin: "4321" });
  assert.equal(locked.statusCode, 429);
  s.tick(16 * 60 * 1000);
  assert.equal(body(await s.post({ action: "verifyPin", pin: "4321" })).status, "success");
});

test("oversized and malformed bodies are rejected; the lock item is never listed", async () => {
  const s = setup();
  assert.equal((await s.post("x".repeat(40 * 1024))).statusCode, 413);
  assert.equal((await s.post("{not json")).statusCode, 400);
  await s.post({ action: "verifyPin", pin: "bad" });
  assert.equal(body(await s.get()).length, 0);
});

test("logs are structured and never contain the PIN", async () => {
  const s = setup();
  await s.post({ action: "save", pin: "4321", item: call });
  await s.post({ action: "verifyPin", pin: "wrongpin99" });
  const all = s.logs.join("\n");
  assert.ok(all.includes('"event":"save"'));
  assert.ok(!all.includes("4321") && !all.includes("wrongpin99"));
});

test("internal errors return a generic message", async () => {
  const s = setup();
  s.db.send = async () => { throw new Error("secret table detail"); };
  const r = await s.post({ action: "verifyPin", pin: "4321" });
  assert.equal(r.statusCode, 500);
  assert.ok(!r.body.includes("secret table detail"));
});

const ytPage = (items, next) => ({ ok: true, status: 200, json: async () => ({ items, nextPageToken: next }) });
const ytItem = (id, title) => ({ snippet: { title, resourceId: { videoId: id }, thumbnails: { medium: { url: "https://i.ytimg.com/" + id } } } });
const getVideos = (s, query = "") => s.h({ requestContext: { http: { method: "GET" } }, rawPath: "/api/videos", rawQueryString: query, headers: {} });

test("videos: returns the cleaned playlist, hides private entries, and never leaks the key", async () => {
  const seen = [];
  const s = setup({ fetchImpl: async (url, opts) => { seen.push({ url, opts });
    return seen.length === 1 ? ytPage([ytItem("aaaaaaaaaaa", "One"), ytItem("bbbbbbbbbbb", "Private video"), ytItem("bad", "Bad id")], "P2")
                             : ytPage([ytItem("ccccccccccc", "Three")]); } });
  const r = await getVideos(s);
  assert.equal(r.statusCode, 200);
  assert.deepEqual(body(r).map((v) => v.id), ["aaaaaaaaaaa", "ccccccccccc"]);
  assert.ok(!r.body.includes("YT-KEY-SECRET"));
  assert.ok(!seen[0].url.includes("YT-KEY-SECRET"));
  assert.equal(seen[0].opts.headers["x-goog-api-key"], "YT-KEY-SECRET");
  assert.ok(seen[1].url.includes("pageToken=P2"));
});

test("videos: playlist comes from server settings, not the request", async () => {
  let url;
  const s = setup({ fetchImpl: async (u) => { url = u; return ytPage([]); } });
  await getVideos(s, "playlistId=PLattacker");
  assert.ok(url.includes("playlistId=PLfixed") && !url.includes("PLattacker"));
});

test("videos: cached for five minutes, refreshed after", async () => {
  let calls = 0;
  const s = setup({ fetchImpl: async () => { calls++; return ytPage([ytItem("aaaaaaaaaaa", "One")]); } });
  await getVideos(s); await getVideos(s);
  assert.equal(calls, 1);
  s.tick(6 * 60 * 1000);
  await getVideos(s);
  assert.equal(calls, 2);
});

test("videos: serves the last good list if YouTube fails, 502 with no detail if nothing cached", async () => {
  let fail = false;
  const s = setup({ fetchImpl: async () => fail ? { ok: false, status: 403, json: async () => ({}) } : ytPage([ytItem("aaaaaaaaaaa", "One")]) });
  await getVideos(s);
  s.tick(6 * 60 * 1000); fail = true;
  assert.equal(body(await getVideos(s)).length, 1);
  const cold = setup({ fetchImpl: async () => ({ ok: false, status: 403, json: async () => ({}) }) });
  const r = await getVideos(cold);
  assert.equal(r.statusCode, 502);
  assert.ok(!r.body.includes("403"));
});
