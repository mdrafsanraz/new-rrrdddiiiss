import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/admin";
import { submitLabelGridDraftForReview } from "@/lib/labelgrid/sync-submit";
import { prisma } from "@/lib/db";
import { logReleaseActivity } from "@/lib/releases/activity";
import { writeAuditLog } from "@/lib/admin/audit";
import {
  canAdminDecide,
  normalizeReleaseStatus,
} from "@/lib/releases/status";

const schema = z.object({
  notes: z.string().max(2000).optional(),
});

type Params = { params: Promise<{ id: string }> };

/**
 * Admin approve → submit the EXISTING LabelGrid sandbox draft for LabelGrid review
 * (POST /releases/{id}/distribute). Idempotent: already in LG review → no-op success.
 */
export async function POST(request: Request, { params }: Params) {
  const gate = await requireAdminApi();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;

  try {
    const body = schema.parse(await request.json().catch(() => ({})));

    const release = await prisma.release.findUnique({
      where: { id },
      include: { tracks: { orderBy: { trackNumber: "asc" } }, artist: true },
    });
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

    // Idempotent: already past distribute.
    if (
      normalized === "labelgrid_in_review" ||
      normalized === "labelgrid_approved" ||
      normalized === "delivering" ||
      normalized === "live"
    ) {
      return NextResponse.json({
        release,
        labelgrid: {
          submittedForReview: true,
          releaseId: release.labelgridId
            ? Number(release.labelgridId)
            : undefined,
          idempotent: true,
        },
      });
    }

    if (!canAdminDecide(release.status, release.permanentlyLocked)) {
      return NextResponse.json(
        { error: `Cannot approve release in status "${release.status}"` },
        { status: 400 }
      );
    }

    // Cover art and audio already live on LabelGrid — uploaded straight
    // there as the user worked through the wizard. Readiness is verified
    // inside submitLabelGridDraftForReview via getLabelGridMediaStatus.

    const now = new Date();

    // Claim the transition under a status guard (double-click safe).
    const claimed = await prisma.release.updateMany({
      where: {
        id,
        permanentlyLocked: false,
        status: {
          in: [
            "pending_internal_review",
            "submitted",
            "in_review",
            "sync_error",
            "error",
            "internal_approved",
            "on_hold",
          ],
        },
      },
      data: {
        status: "submitting_to_labelgrid",
        reviewedAt: now,
        reviewedById: gate.admin.id,
        reviewNotes: body.notes?.trim() || release.reviewNotes,
        syncError: null,
      },
    });

    if (claimed.count === 0) {
      const fresh = await prisma.release.findUnique({ where: { id } });
      return NextResponse.json({
        release: fresh,
        labelgrid: { submittedForReview: true, idempotent: true },
      });
    }

    await logReleaseActivity({
      releaseId: id,
      type: "internal_approved",
      title: "Approved by RDISTRO",
      description: body.notes?.trim() || null,
      actorUserId: gate.admin.id,
    });

    const forSync = await prisma.release.findUnique({
      where: { id },
      include: { tracks: { orderBy: { trackNumber: "asc" } }, artist: true },
    });
    if (!forSync) {
      return NextResponse.json({ error: "Release not found" }, { status: 404 });
    }

    await logReleaseActivity({
      releaseId: id,
      type: "submitting_labelgrid",
      title: "Submitted for distribution review",
      actorUserId: gate.admin.id,
    });

    const result = await submitLabelGridDraftForReview({
      release: forSync,
      artwork: null,
      audios: [],
    });

    if (!result.ok) {
      await prisma.release.update({
        where: { id },
        data: {
          status: "sync_error",
          syncError: result.error.slice(0, 2000),
        },
      });
      await logReleaseActivity({
        releaseId: id,
        type: "sync_error",
        title: "Distribution submit failed",
        description: result.error.slice(0, 500),
        actorUserId: gate.admin.id,
      });
      return NextResponse.json(
        { error: result.error, labelgrid: { submittedForReview: false } },
        { status: 502 }
      );
    }

    const fresh = await prisma.release.update({
      where: { id },
      data: {
        status: "labelgrid_in_review",
        labelgridId: String(result.releaseId),
        labelgridReviewStatus: "to_review",
        syncError: null,
      },
      include: { tracks: true, artist: true, user: true },
    });

    await logReleaseActivity({
      releaseId: id,
      type: "labelgrid_in_review",
      title: "In distribution review",
      actorUserId: gate.admin.id,
      metadata: { labelgridReleaseId: result.releaseId },
    });

    await writeAuditLog({
      actorUserId: gate.admin.id,
      action: "release_approved",
      targetType: "release",
      targetId: id,
      summary: `Approved ${forSync.title} → LabelGrid review`,
      metadata: { labelgridReleaseId: result.releaseId },
    });

    return NextResponse.json({
      release: fresh,
      labelgrid: {
        submittedForReview: true,
        releaseId: result.releaseId,
        trackIds: result.trackIds,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    console.error("[admin/releases/approve]", error);
    return NextResponse.json({ error: "Approve failed" }, { status: 500 });
  }
}
