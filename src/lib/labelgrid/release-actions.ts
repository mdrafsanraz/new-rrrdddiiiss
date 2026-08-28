/**
 * Delete-vs-takedown eligibility, decided from LabelGrid's own
 * GET /releases/{id}/delivery-status flags — `ever_delivered` and `state`
 * — never from RDISTRO's local status.
 *
 * Uses `ever_delivered` rather than `ever_submitted`: takedown-all's own
 * description says it queues removal "to each store the release was
 * delivered to" — it targets delivered content. A release merely submitted
 * into LabelGrid's own review queue (ever_submitted=true) but never
 * actually delivered anywhere yet has nothing to take down; it should
 * still be deletable (or edited) like any other not-yet-distributed
 * release. RDISTRO review is an explicit exception: while a release is in
 * review it exposes neither Delete nor Takedown. It must leave review before
 * another destructive lifecycle action becomes available.
 *
 *   Never delivered draft → Delete Release (DELETE /releases/{release})
 *   In RDISTRO/LabelGrid review → No destructive action
 *   Delivering / delivered / live → Request Takedown
 *                                    (POST /releases/{release}/takedown-all)
 *
 * The two actions are mutually exclusive by construction — never both true.
 */
export type ReleaseLifecycleActions = {
  canDelete: boolean;
  canTakedown: boolean;
  /** Set when the release is already mid-takedown or fully removed. */
  takedownDisabledReason: string | null;
};

export function computeReleaseLifecycleActions(input: {
  /** GET /releases/{id}/delivery-status .ever_delivered — false/undefined when never checked. */
  everDelivered: boolean | null | undefined;
  /** GET /releases/{id}/delivery-status .state — null when never checked. */
  deliveryState: string | null | undefined;
  /** RDISTRO's user-facing review state overrides pre-delivery deletion. */
  isInReview?: boolean;
}): ReleaseLifecycleActions {
  const everDelivered = Boolean(input.everDelivered);
  const state = input.deliveryState ?? null;

  if (input.isInReview) {
    return { canDelete: false, canTakedown: false, takedownDisabledReason: null };
  }

  if (state === "removed") {
    return {
      canDelete: false,
      canTakedown: false,
      takedownDisabledReason: "This release has already been taken down.",
    };
  }
  if (state === "removing") {
    return {
      canDelete: false,
      canTakedown: false,
      takedownDisabledReason: "A takedown is already in progress.",
    };
  }

  // Delivering right now, has delivered before, live, or flagged for
  // attention post-distribution — a takedown applies, not a delete.
  const inDistributionPipeline =
    everDelivered ||
    state === "in_progress" ||
    state === "live" ||
    state === "action_needed";

  if (inDistributionPipeline) {
    return { canDelete: false, canTakedown: true, takedownDisabledReason: null };
  }
  return { canDelete: true, canTakedown: false, takedownDisabledReason: null };
}
