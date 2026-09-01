import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermissionApi } from "@/lib/auth/admin";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import { withdrawReleaseFromReview } from "@/lib/labelgrid";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/admin/audit";
import { logReleaseActivity } from "@/lib/releases/activity";
import { emailUrl, notifyReleaseReviewAction, notifyReleaseStatusChanged } from "@/lib/email";
import {
  canAdminDecide,
  canAdminSendBackToDraft,
  normalizeReleaseStatus,
} from "@/lib/releases/status";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("hold"),
    reason: z.string().min(1).max(2000),
  }),
  z.object({
    action: z.literal("request_document"),
    notes: z.string().min(1).max(2000),
    documentKind: z.string().min(1).max(120),
    trackId: z.string().optional(),
  }),
  z.object({
    action: z.literal("send_back_to_draft"),
    notes: z.string().max(2000).optional(),
  }),
  z.object({ action: z.literal("assign_to_me") }),
]);

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const gate = await requirePermissionApi("releases.moderate");
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
        { error: "Release is permanently locked." },
        { status: 400 }
      );
    }

    if (body.action === "assign_to_me") {
      if (!["pending_internal_review", "submitted", "in_review"].includes(release.status)) {
        return NextResponse.json({ error: "Only releases waiting for RDISTRO review can be assigned." }, { status: 400 });
      }
      const fresh = await prisma.release.update({ where: { id }, data: { reviewedById: gate.admin.id } });
      await logReleaseActivity({ releaseId: id, type: "edited", title: "Reviewer assigned", description: `Assigned to ${gate.admin.name}`, actorUserId: gate.admin.id });
      await writeAuditLog({ actorUserId: gate.admin.id, action: "other", targetType: "release", targetId: id, summary: `Assigned ${release.title} to ${gate.admin.name}`, metadata: { kind: "release_reviewer_assigned" } });
      return NextResponse.json({ release: fresh });
    }

    if (body.action === "hold") {
      if (!canAdminDecide(release.status, release.permanentlyLocked)) {
        return NextResponse.json(
          { error: `Cannot hold release in status "${release.status}"` },
          { status: 400 }
        );
      }
      const fresh = await prisma.release.update({
        where: { id },
        data: {
          status: "on_hold",
          holdReason: body.reason.trim(),
          heldAt: new Date(),
          heldById: gate.admin.id,
          reviewedAt: new Date(),
          reviewedById: gate.admin.id,
        },
      });
      await logReleaseActivity({
        releaseId: id,
        type: "held",
        title: "Placed on hold",
        description: body.reason.trim(),
        actorUserId: gate.admin.id,
      });
      await writeAuditLog({
        actorUserId: gate.admin.id,
        action: "release_held",
        targetType: "release",
        targetId: id,
        summary: `Held release ${release.title}`,
        metadata: { reason: body.reason.trim() },
      });
      return NextResponse.json({ release: fresh });
    }

    // request_document
    if (body.action === "request_document") {
      const issue = await prisma.releaseReviewIssue.create({
        data: {
          releaseId: id,
          source: "INTERNAL",
          code: "document_requested",
          category: body.documentKind,
          title: `Document requested: ${body.documentKind}`,
          message: body.notes.trim(),
          severity: "warning",
          requiresDocument: true,
          requiresFeedback: true,
          affectedTrackId: body.trackId ?? null,
          status: "open",
        },
      });

      const fresh = await prisma.release.update({
        where: { id },
        data: {
          status: "internal_changes_required",
          reviewNotes: body.notes.trim(),
          reviewedAt: new Date(),
          reviewedById: gate.admin.id,
        },
        include: { user: true },
      });

      await logReleaseActivity({
        releaseId: id,
        type: "document_requested",
        title: `Document requested: ${body.documentKind}`,
        description: body.notes.trim(),
        actorUserId: gate.admin.id,
        metadata: { issueId: issue.id, kind: body.documentKind },
      });
      await writeAuditLog({
        actorUserId: gate.admin.id,
        action: "release_document_requested",
        targetType: "release",
        targetId: id,
        summary: `Requested ${body.documentKind} for ${release.title}`,
      });
      if (fresh.user.email) {
        await notifyReleaseReviewAction({
          to: fresh.user.email,
          releaseTitle: fresh.title,
          releaseUrl: emailUrl(`/dashboard/releases/${id}`),
          kind: "document_requested",
          message: body.notes.trim(),
          documentKind: body.documentKind,
        });
      }

      return NextResponse.json({ release: fresh, issue });
    }

    // send_back_to_draft
    if (!canAdminSendBackToDraft(release.status, release.permanentlyLocked)) {
      return NextResponse.json(
        { error: `Cannot send release in status "${release.status}" back to draft.` },
        { status: 400 }
      );
    }

    const normalized = normalizeReleaseStatus(release.status);
    if (
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
          "[admin/releases/moderate] withdraw-review failed (continuing)",
          error
        );
      }
    }

    const userNotes =
      body.notes?.trim() ||
      "Your release was sent back to draft. Re-upload artwork and audio, then submit again.";

    const fresh = await prisma.release.update({
      where: { id },
      data: {
        status: "ready_to_submit",
        syncError: null,
        holdReason: null,
        heldAt: null,
        heldById: null,
        reviewNotes: userNotes,
        reviewedAt: new Date(),
        reviewedById: gate.admin.id,
        labelgridReviewStatus: release.labelgridId ? "draft" : null,
      },
      include: { user: true },
    });

    await logReleaseActivity({
      releaseId: id,
      type: "edited",
      title: "Sent back to draft",
      description: userNotes,
      actorUserId: gate.admin.id,
    });
    await writeAuditLog({
      actorUserId: gate.admin.id,
      action: "release_changes_requested",
      targetType: "release",
      targetId: id,
      summary: `Sent ${release.title} back to draft`,
      metadata: { notes: userNotes, kind: "send_back_to_draft" },
    });
    if (fresh.user.email) {
      await notifyReleaseStatusChanged({
        to: fresh.user.email,
        name: fresh.user.name,
        releaseId: id,
        releaseTitle: fresh.title,
        statusLabel: "back to draft",
        statusDescription: userNotes,
      });
    }

    return NextResponse.json({ release: fresh });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    console.error("[admin/releases/moderate]", error);
    return NextResponse.json({ error: "Moderation failed" }, { status: 500 });
  }
}
