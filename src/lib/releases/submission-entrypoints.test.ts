import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("legacy submit endpoint delegates to the validated finalizer instead of changing status", () => {
  const route = readFileSync("src/app/api/releases/[id]/route.ts", "utf8");
  const submit = route.slice(route.indexOf("export async function POST"));
  assert.match(route, /import \{ POST as finalizeSubmission \} from "\.\/submit\/finalize\/route"/);
  assert.match(submit, /body\.action !== "submit"/);
  assert.match(submit, /return finalizeSubmission\(request, context\)/);
  assert.doesNotMatch(submit, /prisma\.|pending_internal_review/);
});

test("release-page submit control resumes the builder without a direct submission request", () => {
  const source = readFileSync("src/components/dashboard/submit-release-button.tsx", "utf8");
  assert.ok(source.includes("/dashboard/releases/${releaseId}/edit"));
  assert.doesNotMatch(source, /fetch\(/);
});
