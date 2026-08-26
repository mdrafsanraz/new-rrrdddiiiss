import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { logReleaseActivity } from "@/lib/releases/activity";
import {
  canUserResubmitRelease,
  isFinalRejection,
} from "@/lib/releases/status";

type Params = { params: Promise<{ id: string }> };

/**
 * User resubmits after Changes Required.
 * Re-enters RDISTRO internal review (LabelGrid stays draft until admin approves again).
 * Does NOT consume another Free-plan monthly slot (submittedAt unchanged).
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

  if (isFinalRejection(release)) {
    return NextResponse.json(
      {
        error:
          "This release was rejected and cannot be edited or resubmitted. Contact support if you believe this decision needs review.",
      },
      { status: 403 }
    );
  }

  if (!canUserResubmitRelease(release)) {
    return NextResponse.json(
      {
        error:
          "Only releases marked Changes Required can be resubmitted for review.",
      },
      { status: 400 }
    );
  }

  const claimed = await prisma.release.updateMany({
    where: {
      id,
      userId: user.id,
      permanentlyLocked: false,
      status: {
        in: [
          "internal_changes_required",
          "labelgrid_changes_required",
          "changes_required",
          "ready_to_submit",
        ],
      },
    },
    data: {
      status: "pending_internal_review",
      // Do NOT touch submittedAt — quota is first-submit only.
      syncError: null,
    },
  });

  if (claimed.count === 0) {
    return NextResponse.json(
      { error: "Release is no longer eligible for resubmit." },
      { status: 409 }
    );
  }

  await prisma.releaseReviewIssue.updateMany({
    where: { releaseId: id, resolved: false },
    data: { resolved: true, resolvedAt: new Date(), status: "resubmitted" },
  });

  await logReleaseActivity({
    releaseId: id,
    type: "resubmitted",
    title: "Resubmitted",
    description: "Sent back to RDISTRO review.",
    actorUserId: user.id,
  });

  const fresh = await prisma.release.findUnique({
    where: { id },
    include: { tracks: true, artist: true },
  });

  return NextResponse.json({ release: fresh });
}
