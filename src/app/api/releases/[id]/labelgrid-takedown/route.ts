import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { takedownReleaseAll } from "@/lib/labelgrid";
import { LabelGridApiError } from "@/lib/labelgrid/client";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import { fetchLabelGridDeliveryStatus } from "@/lib/labelgrid/status-sync";
import { computeReleaseLifecycleActions } from "@/lib/labelgrid/release-actions";
import { logReleaseActivity } from "@/lib/releases/activity";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  message: z.string().max(255).optional(),
  confirmContractHold: z.boolean().optional(),
});

/**
 * Request a managed takedown — POST /releases/{release}/takedown-all.
 * Eligibility is re-checked against live LabelGrid state server-side (the
 * client button's visibility is UX only). Never DELETEs a release that has
 * entered distribution — this route only ever calls takedown-all.
 *
 * LabelGrid's own docs: while the account is under a minimum-term
 * agreement, the first call returns 409 CONTRACT_HOLD_CONFIRM_REQUIRED;
 * the takedown proceeds once retried with confirm_contract_hold: true. We
 * detect that 409 defensively (the response shape for it isn't in the
 * OpenAPI schema) and hand the client a flag to prompt for confirmation
 * rather than guessing the exact body shape.
 */
export async function POST(request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const release = await prisma.release.findFirst({
    where: { id, userId: user.id },
  });
  if (!release) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!release.labelgridId) {
    return NextResponse.json(
      { error: "This release has not been synced to LabelGrid yet." },
      { status: 409 }
    );
  }
  if (!isLabelGridLive()) {
    return NextResponse.json(
      { error: "LabelGrid is not configured." },
      { status: 503 }
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { message, confirmContractHold } = parsed.data;

  const delivery = await fetchLabelGridDeliveryStatus(release.labelgridId);
  const { canTakedown, takedownDisabledReason } = computeReleaseLifecycleActions({
    everSubmitted: delivery?.ever_submitted,
    deliveryState: delivery?.state ?? null,
  });
  if (!canTakedown) {
    return NextResponse.json(
      {
        error:
          takedownDisabledReason ??
          "This release is not eligible for a takedown request. If you believe this is a mistake, refresh and try again.",
      },
      { status: 409 }
    );
  }

  try {
    await takedownReleaseAll(release.labelgridId, {
      message: message?.trim() || null,
      confirm_contract_hold: confirmContractHold,
    });
  } catch (error) {
    if (error instanceof LabelGridApiError && error.status === 409) {
      const bodyText =
        typeof error.body === "string"
          ? error.body
          : JSON.stringify(error.body ?? "");
      const contractHoldConfirmRequired = bodyText.includes(
        "CONTRACT_HOLD_CONFIRM_REQUIRED"
      );
      return NextResponse.json(
        {
          error: contractHoldConfirmRequired
            ? "This account is under a minimum-term agreement. Confirm to proceed with the takedown anyway."
            : error.message,
          contractHoldConfirmRequired,
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not request the takedown on LabelGrid.",
      },
      { status: 502 }
    );
  }

  await logReleaseActivity({
    releaseId: id,
    type: "takedown_requested",
    title: "Takedown requested",
    description: message?.trim() || null,
    actorUserId: user.id,
  });

  return NextResponse.json({ ok: true });
}
