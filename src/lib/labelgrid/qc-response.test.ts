import assert from "node:assert/strict";
import test from "node:test";
import { readQcResponse } from "./qc-response";

test("HTML gateway and unexpected successful HTML responses produce actionable errors", async () => {
  for (const status of [200, 502, 504]) {
    await assert.rejects(readQcResponse(new Response("<!DOCTYPE html><html>Gateway error</html>", { status })),
      error => error instanceof Error && error.message.includes(`HTTP ${status}`) && error.message.includes("Fetch the report") && !error.message.includes("DOCTYPE"));
  }
});
test("JSON provider errors are preserved and auth errors explain session recovery", async () => {
  await assert.rejects(readQcResponse(Response.json({ error: "Release is not on hold" }, { status: 409 })), /Release is not on hold/);
  await assert.rejects(readQcResponse(new Response("<html>Login</html>", { status: 401 })), /Sign in again/);
});
test("accepts successful JSON and rejects invalid payloads", async () => {
  assert.deepEqual(await readQcResponse(Response.json({ ok: true })), { report: undefined });
  for (const value of [null, [], "html"]) await assert.rejects(readQcResponse(Response.json(value)), /Invalid QC response/);
});
