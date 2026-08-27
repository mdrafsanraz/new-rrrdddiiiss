/**
 * Delete-vs-takedown eligibility, decided from LabelGrid's own
 * GET /releases/{id}/delivery-status flags — `ever_submitted` and `state`
 * — never from RDISTRO's local status. These two fields are exactly what
 * LabelGrid exposes for "has this ever entered the distribution pipeline,"
 * so nothing here is inferred/guessed from review_status combinations.
 *
 *   DRAFT / NOT SUBMITTED  → Delete Release  (DELETE /releases/{release})
 *   APPROVED / SUBMITTED / DELIVERING / LIVE → Request Takedown
 *                            (POST /releases/{release}/takedown-all)
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
  /** GET /releases/{id}/delivery-status .ever_submitted — false/undefined when never checked. */
  everSubmitted: boolean | null | undefined;
  /** GET /releases/{id}/delivery-status .state — null when never checked. */
  deliveryState: string | null | undefined;
}): ReleaseLifecycleActions {
  const everSubmitted = Boolean(input.everSubmitted);
  const state = input.deliveryState ?? null;

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

  if (!everSubmitted) {
    return { canDelete: true, canTakedown: false, takedownDisabledReason: null };
  }

  return { canDelete: false, canTakedown: true, takedownDisabledReason: null };
}
