import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/admin";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import { withdrawReleaseFromReview } from "@/lib/labelgrid";
import { prisma } from "@/lib/db";
import { logReleaseActivity } from "@/lib/releases/activity";
import { notifyReleaseReviewAction } from "@/lib/email";
import { appUrl } from "@/lib/stripe";
import {
  canAdminDecide,
  normalizeReleaseStatus,
} from "@/lib/releases/status";

/**
 * Admin decision against a release in RDISTRO internal review.
 *
 * - changes_required: NOT final — editable; user fixes & resubmits to RDISTRO
 * - rejected: FINAL — permanently locked
 */
const schema = z.object({
  notes: z.string().min(1).max(2000),
  outcome: z.enum(["changes_required", "rejected"]),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const gate = await requireAdminApi();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;

  try {
    const body = schema.parse(await request.json());
    const release = await prisma.release.findUnique({ where: { id } });
    if (!release) {
      return NextResponse.json({ error: "Release not found" }, { status: 404 });
    }
    if (release.permanentlyLocked) {
      return NextResponse.json(
        { error: "This release is permanently rejected and locked." },
        { status: 400 }
      );
    }

    const normalized = normalizeReleaseStatus(release.status);
    const isFinalReject = body.outcome === "rejected";

    // Admin can also request changes after LG require_changes if needed later;
    // for now decisions are for internal queue + early LG errors.
    const allowed =
      canAdminDecide(release.status, release.permanentlyLocked) ||
      normalized === "submitting_to_labelgrid" ||
      normalized === "labelgrid_in_review" ||
      normalized === "labelgrid_changes_required";

    if (!allowed) {
      return NextResponse.json(
        { error: `Cannot decide on release in status "${release.status}"` },
        { status: 400 }
      );
    }

    // If already on LabelGrid review, pull back to draft when requesting changes.
    if (
      !isFinalReject &&
      release.labelgridId &&
      isLabelGridLive() &&
      (normalized === "labelgrid_in_review" ||
        normalized === "labelgrid_changes_required" ||
        normalized === "submitting_to_labelgrid")
    ) {
      try {
        await withdrawReleaseFromReview(release.labelgridId);
      } catch (error) {
        console.warn(
          "[admin/releases/reject] withdraw-review failed (continuing)",
          error
        );
      }
    }

    const nextStatus = isFinalReject
      ? normalized.startsWith("labelgrid_") ||
        normalized === "submitting_to_labelgrid"
        ? "labelgrid_rejected"
        : "internal_rejected"
      : normalized.startsWith("labelgrid_") ||
          normalized === "submitting_to_labelgrid"
        ? "labelgrid_changes_required"
        : "internal_changes_required";

    const fresh = await prisma.release.update({
      where: { id },
      data: {
        status: nextStatus,
        reviewNotes: body.notes.trim(),
        internalRejectionReason: isFinalReject ? body.notes.trim() : null,
        reviewedAt: new Date(),
        reviewedById: gate.admin.id,
        syncError: null,
        permanentlyLocked: isFinalReject,
        labelgridReviewStatus: isFinalReject
          ? release.labelgridReviewStatus
          : release.labelgridId
            ? "draft"
            : release.labelgridReviewStatus,
      },
      include: { tracks: true, artist: true, user: true },
    });

    if (!isFinalReject) {
      await prisma.releaseReviewIssue.create({
        data: {
          releaseId: id,
          source: "INTERNAL",
          category: "Review",
          title: "Changes required",
          message: body.notes.trim(),
          isBlocking: true,
          requiresFeedback: true,
          status: "open",
        },
      });
      if (fresh.user.email) {
        await notifyReleaseReviewAction({
          to: fresh.user.email,
          releaseTitle: fresh.title,
          releaseUrl: appUrl(`/dashboard/releases/${id}`),
          kind: "changes_required",
          message: body.notes.trim(),
        });
      }
    }

    await logReleaseActivity({
      releaseId: id,
      type: isFinalReject
        ? nextStatus === "labelgrid_rejected"
          ? "labelgrid_rejected"
          : "internal_rejected"
        : nextStatus === "labelgrid_changes_required"
          ? "labelgrid_changes_required"
          : "internal_changes_required",
      title: isFinalReject ? "Rejected" : "Changes required",
      description: body.notes.trim(),
      actorUserId: gate.admin.id,
    });

    return NextResponse.json({ release: fresh });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error:
            error.issues[0]?.message ??
            "Notes and outcome (changes_required | rejected) are required",
        },
        { status: 400 }
      );
    }
    console.error("[admin/releases/reject]", error);
    return NextResponse.json({ error: "Decision failed" }, { status: 500 });
  }
}
