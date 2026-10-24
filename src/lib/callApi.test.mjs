// Tests for postCall. Run: node --test src/lib/callApi.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { postCall } from "./callApi.js";

function mockFetch(reply = { status: "success" }) {
  const calls = [];
  globalThis.fetch = async (url, opts) => { calls.push({ url, opts }); return { json: async () => reply }; };
  return calls;
}

test("Apps Script URL: same request the app always sent, with no extra headers (avoids a CORS preflight)", async () => {
  const calls = mockFetch();
  await postCall("https://script.google.com/macros/s/ID/exec", { action: "save", pin: "1", item: { id: "a" } });
  assert.equal(calls[0].url, "https://script.google.com/macros/s/ID/exec");
  assert.equal(calls[0].opts.method, "POST");
  assert.deepEqual(calls[0].opts.headers, { "Content-Type": "text/plain;charset=utf-8" });
  assert.equal(calls[0].opts.body, JSON.stringify({ action: "save", pin: "1", item: { id: "a" } }));
});

test("same-site API URL: adds the body's SHA-256 that CloudFront needs to sign the POST", async () => {
  const calls = mockFetch();
  const body = { action: "verifyPin", pin: "x" };
  await postCall("/api/calls", body);
  const { createHash } = await import("node:crypto");
  assert.equal(calls[0].opts.headers["x-amz-content-sha256"], createHash("sha256").update(JSON.stringify(body)).digest("hex"));
});

test("returns the parsed reply", async () => {
  mockFetch({ status: "error", message: "nope" });
  assert.deepEqual(await postCall("/api/calls", {}), { status: "error", message: "nope" });
});
