import assert from "node:assert/strict";
import test from "node:test";
import { computeReleaseLifecycleActions } from "./release-actions";

test("offers takedown while a partially removed release remains live", () => {
  assert.deepEqual(
    computeReleaseLifecycleActions({
      everDelivered: true,
      deliveryState: "removed",
      currentlyLive: true,
    }),
    { canDelete: false, canTakedown: true, takedownDisabledReason: null },
  );
});

test("blocks another takedown after a full removal", () => {
  assert.equal(
    computeReleaseLifecycleActions({
      everDelivered: true,
      deliveryState: "removed",
      currentlyLive: false,
      isLive: false,
    }).canTakedown,
    false,
  );
});

test("offers takedown for a locally live release when provider state lags", () => {
  assert.equal(
    computeReleaseLifecycleActions({
      everDelivered: true,
      deliveryState: null,
      isLive: true,
    }).canTakedown,
    true,
  );
});
