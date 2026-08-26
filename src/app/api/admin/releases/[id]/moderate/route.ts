import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermissionApi } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/admin/audit";
import { logReleaseActivity } from "@/lib/releases/activity";
import { canAdminDecide } from "@/lib/releases/status";

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

    return NextResponse.json({ release: fresh, issue });
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
