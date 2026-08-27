import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { assertCanSubmitRelease } from "@/lib/entitlements/server";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import { syncReleaseToLabelGrid } from "@/lib/labelgrid/sync-submit";
import { logReleaseActivity } from "@/lib/releases/activity";
import { getPlanLimits } from "@/lib/plans";
import {
  canUserResubmitRelease,
  canUserSubmitRelease,
  isFinalRejection,
} from "@/lib/releases/status";

type Params = { params: Promise<{ id: string }> };

/**
 * Submit an existing local draft for RDISTRO internal review.
 * LabelGrid object remains a draft (synced if possible). Does NOT call distribute.
 */
export async function POST(_request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const release = await prisma.release.findFirst({
    where: { id, userId: user.id },
    include: { artist: true, tracks: { orderBy: { trackNumber: "asc" } } },
  });
  if (!release) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (isFinalRejection(release)) {
    return NextResponse.json(
      {
        error:
          "This release was rejected and cannot be edited or resubmitted. Contact support if you believe this decision needs review.",
      },
      { status: 403 }
    );
  }

  const isFirstSubmit = !release.submittedAt;
  const maySubmit =
    canUserSubmitRelease(release) || canUserResubmitRelease(release);
  if (!maySubmit && release.status !== "draft" && release.status !== "incomplete" && release.status !== "ready_to_submit" && release.status !== "sync_error") {
    // Allow draft/incomplete explicitly
    if (!["draft", "incomplete", "ready_to_submit", "sync_error", "internal_changes_required", "labelgrid_changes_required", "changes_required"].includes(release.status)) {
      return NextResponse.json(
        { error: "This release cannot be submitted for review." },
        { status: 400 }
      );
    }
  }

  if (!release.title.trim() || release.title === "Untitled release") {
    return NextResponse.json(
      { error: "Please add a release title." },
      { status: 400 }
    );
  }
  if (!release.artworkUrl) {
    return NextResponse.json(
      { error: "Please upload your cover artwork." },
      { status: 400 }
    );
  }
  if (!release.releaseDate) {
    return NextResponse.json(
      { error: "Please choose a release date." },
      { status: 400 }
    );
  }
  if (!release.tracks.length) {
    return NextResponse.json(
      { error: "Please add at least one track." },
      { status: 400 }
    );
  }
  for (const t of release.tracks) {
    if (!t.audioUrl) {
      return NextResponse.json(
        { error: `Please upload audio for “${t.title}”.` },
        { status: 400 }
      );
    }
  }

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

  // Idempotent claim
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
            priorityReview: getPlanLimits(user.planId).priorityReview,
          }
        : {}),
      syncError: null,
    },
  });

  if (claimed.count === 0) {
    const fresh = await prisma.release.findUnique({ where: { id } });
    if (fresh?.status === "pending_internal_review" || fresh?.status === "in_review") {
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

  let labelgrid: {
    draftSynced: boolean;
    releaseId?: number;
    error?: string;
  } = {
    draftSynced: Boolean(release.labelgridId),
    releaseId: release.labelgridId ? Number(release.labelgridId) : undefined,
  };

  // Assets already live on LabelGrid (uploaded straight there as the user
  // worked through the wizard) — this just resyncs metadata (title, dates,
  // distribution config, any tracks not yet created) before review.
  if (isLabelGridLive()) {
    const forSync = await prisma.release.findUnique({
      where: { id },
      include: { artist: true, tracks: { orderBy: { trackNumber: "asc" } } },
    });
    if (forSync) {
      const result = await syncReleaseToLabelGrid({
        release: forSync,
        artwork: null,
        audios: [],
      });
      if (result.ok) {
        labelgrid = { draftSynced: true, releaseId: result.releaseId };
        await prisma.release.update({
          where: { id },
          data: {
            labelgridReviewStatus: forSync.labelgridReviewStatus ?? "draft",
          },
        });
      } else {
        labelgrid = {
          draftSynced: Boolean(forSync.labelgridId),
          releaseId: forSync.labelgridId
            ? Number(forSync.labelgridId)
            : undefined,
          error: result.error,
        };
      }
    }
  }

  const fresh = await prisma.release.findUnique({
    where: { id },
    include: { artist: true, tracks: true },
  });

  return NextResponse.json({ release: fresh, labelgrid });
}
