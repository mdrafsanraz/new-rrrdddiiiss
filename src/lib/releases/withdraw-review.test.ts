import assert from "node:assert/strict";
import test from "node:test";
import { withdrawalSchema, withdrawalStatusUpdate } from "./withdraw-review";

test("withdrawal accepts only the four offered statuses and preserves the existing default", () => {
  assert.equal(withdrawalSchema.parse({}).status, "in_review");
  for (const status of ["in_review", "taken_down", "rejected", "draft"]) {
    assert.equal(withdrawalSchema.parse({ status }).status, status);
  }
  for (const value of [null, [], { status: "live" }, { status: "internal_approved" }, { status: "" }, { status: "draft", permanentlyLocked: true }]) {
    assert.equal(withdrawalSchema.safeParse(value).success, false);
  }
});

test("local takedown is protected from provider sync while rejection uses the final rejection lock", () => {
  const takenDown = withdrawalStatusUpdate("taken_down");
  assert.equal(takenDown.status, "taken_down");
  assert.equal(takenDown.manualTakenDown, true);
  assert.equal(takenDown.permanentlyLocked, false);
  const rejected = withdrawalStatusUpdate("rejected");
  assert.equal(rejected.status, "internal_rejected");
  assert.equal(rejected.permanentlyLocked, true);
  assert.equal(rejected.manualTakenDown, false);
  assert.equal(rejected.internalRejectionReason, null);
});

test("review retains approval for admin resubmission; draft remains editable", () => {
  assert.equal(withdrawalStatusUpdate("in_review").status, "internal_approved");
  for (const status of ["in_review", "draft"] as const) {
    const update = withdrawalStatusUpdate(status);
    assert.equal(update.permanentlyLocked, false);
    assert.equal(update.manualTakenDown, false);
  }
  assert.equal(withdrawalStatusUpdate("draft").status, "draft");
  assert.equal(withdrawalStatusUpdate("draft").reviewNotes, null);
});
