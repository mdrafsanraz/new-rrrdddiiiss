import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { deleteRelease, getReleaseDeliveryStatus } from "@/lib/labelgrid";
import { LabelGridApiError } from "@/lib/labelgrid/client";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import { computeReleaseLifecycleActions } from "@/lib/labelgrid/release-actions";

type Params = { params: Promise<{ id: string }> };

/**
 * Delete a draft release — DELETE /releases/{release}. Only ever deletes
 * the RDISTRO mapping row (and everything it cascades: tracks, activity,
 * documents, review issues) AFTER LabelGrid confirms the release itself is
 * gone; a release that was never synced (no labelgridId) has nothing to
 * confirm and is removed locally right away. Eligibility is re-checked here
 * against live LabelGrid state — the client's button visibility is a UX
 * nicety, not the actual authorization.
 */
export async function POST(_request: Request, { params }: Params) {
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
    await prisma.release.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  }

  if (!isLabelGridLive()) {
    return NextResponse.json(
      { error: "LabelGrid is not configured." },
      { status: 503 }
    );
  }

  // Fail closed: if delivery-status can't be checked, refuse the delete
  // rather than risk deleting a release that has actually been distributed.
  // LabelGrid's own DELETE endpoint enforces this too, but a clear local
  // refusal is safer than depending solely on that as the only backstop.
  try {
    const raw = await getReleaseDeliveryStatus(release.labelgridId);
    const delivery =
      raw && typeof raw === "object" && "data" in raw
        ? (raw as { data: { state?: string; ever_submitted?: boolean } }).data
        : (raw as { state?: string; ever_submitted?: boolean });
    const { canDelete } = computeReleaseLifecycleActions({
      everSubmitted: delivery?.ever_submitted,
      deliveryState: delivery?.state ?? null,
    });
    if (!canDelete) {
      return NextResponse.json(
        {
          error:
            "This release has already entered distribution and can no longer be deleted — request a takedown instead.",
        },
        { status: 409 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not verify this release's distribution status on LabelGrid.",
      },
      { status: 502 }
    );
  }

  try {
    await deleteRelease(release.labelgridId);
  } catch (error) {
    if (!(error instanceof LabelGridApiError) || error.status !== 404) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Could not delete the release on LabelGrid.",
        },
        { status: 502 }
      );
    }
    // Already gone on LabelGrid — proceed to remove the local mapping.
  }

  await prisma.release.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
