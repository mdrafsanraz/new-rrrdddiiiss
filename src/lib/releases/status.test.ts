import assert from "node:assert/strict";
import test from "node:test";
import { mapLabelGridStatusToLocalStatus } from "./status";

test("keeps a partially taken-down distributed release live", () => {
  assert.equal(
    mapLabelGridStatusToLocalStatus("approved", "removed", true, "distributed"),
    "live",
  );
  assert.equal(
    mapLabelGridStatusToLocalStatus("approved", "removed", false, "distributed"),
    "live",
  );
});

test("marks a fully removed release as taken down", () => {
  assert.equal(
    mapLabelGridStatusToLocalStatus("approved", "removed", false, "takedown"),
    "taken_down",
  );
});
