import { NextResponse } from "next/server";
import { assertCanSubmitRelease } from "@/lib/entitlements/server";
import { getConfiguredPlan } from "@/lib/plans";
import { logReleaseActivity } from "@/lib/releases/activity";
import { isFinalRejection } from "@/lib/releases/status";
import { validateReleaseForSubmit } from "@/lib/releases/submit-validate";
import { loadOwnedReleaseForSubmit } from "@/lib/releases/submit-auth";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

/**
 * Stage 8 (Finalize). By the time this runs, Stages 2-7 have already
 * synced the release/tracks/artwork/audio/credits with the CURRENT wizard
 * data — unlike the old submit-for-review route (kept unmodified,
 * unreferenced by the wizard now), this deliberately does NOT call
 * syncReleaseToLabelGrid again; that would just be a redundant full
 * re-sync of work Stages 2-7 already did. This route only: re-validates,
 * flips local status to pending_internal_review ("IN_REVIEW"), and logs
 * the activity. LabelGrid's own review_status stays draft — distribute is
 * never called here, only by admin approval.
 */
export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  const { user, release } = await loadOwnedReleaseForSubmit(id);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!release) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (isFinalRejection(release)) {
    return NextResponse.json(
      {
        error:
          "This release was rejected and cannot be edited or resubmitted. Contact support if you believe this decision needs review.",
      },
      { status: 403 }
    );
  }

  const errors = validateReleaseForSubmit(release);
  if (errors.length > 0) {
    return NextResponse.json({ error: errors[0], errors }, { status: 400 });
  }
  if (!release.labelgridId) {
    return NextResponse.json(
      { error: "Run the Create Release stage first." },
      { status: 409 }
    );
  }
  if (!release.artworkUrl) {
    return NextResponse.json(
      { error: "Artwork hasn't finished uploading yet." },
      { status: 409 }
    );
  }
  for (const t of release.tracks) {
    if (!t.audioUrl) {
      return NextResponse.json(
        { error: `Audio for "${t.title}" hasn't finished uploading yet.` },
        { status: 409 }
      );
    }
  }

  const isFirstSubmit = !release.submittedAt;
  if (isFirstSubmit) {
    try {
      await assertCanSubmitRelease(user.id, user.planId);
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Monthly submission limit reached.",
        },
        { status: 403 }
      );
    }
  }

  // Idempotent claim — a retry/double-click after this already landed just
  // reports success again rather than erroring.
  const claimed = await prisma.release.updateMany({
    where: {
      id,
      userId: user.id,
      permanentlyLocked: false,
      status: {
        in: [
          "draft",
          "incomplete",
          "ready_to_submit",
          "sync_error",
          "error",
          "internal_changes_required",
          "labelgrid_changes_required",
          "changes_required",
        ],
      },
    },
    data: {
      status: "pending_internal_review",
      ...(isFirstSubmit
        ? {
            submittedAt: new Date(),
            priorityReview: (await getConfiguredPlan(user.planId)).priorityReview,
          }
        : {}),
      syncError: null,
    },
  });

  if (claimed.count === 0) {
    const fresh = await prisma.release.findUnique({ where: { id } });
    if (fresh?.status === "pending_internal_review") {
      return NextResponse.json({ release: fresh, idempotent: true });
    }
    return NextResponse.json(
      { error: "Release is no longer eligible for submission." },
      { status: 409 }
    );
  }

  if (release.artistId) {
    await prisma.artist.updateMany({
      where: { id: release.artistId, userId: user.id, locked: false },
      data: { locked: true, lockedAt: new Date() },
    });
  }

  await logReleaseActivity({
    releaseId: id,
    type: "submitted_internal",
    title: "Submitted to RDISTRO review",
    description: "Your release is in review.",
    actorUserId: user.id,
  });

  const fresh = await prisma.release.findUnique({
    where: { id },
    include: { artist: true, tracks: true },
  });

  return NextResponse.json({ release: fresh });
}
