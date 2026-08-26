import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermissionApi } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { takedownReleaseAll } from "@/lib/labelgrid";
import { writeAuditLog } from "@/lib/admin/audit";
import { logReleaseActivity } from "@/lib/releases/activity";
import { LabelGridApiError } from "@/lib/labelgrid/client";

const schema = z.object({
  releaseId: z.string().min(1),
  reason: z.enum([
    "user_requested",
    "compliance",
    "copyright",
    "fraud",
    "dsp_request",
    "administrative",
  ]),
  message: z.string().max(255).optional(),
  internalNotes: z.string().max(2000).optional(),
  confirmContractHold: z.boolean().optional(),
});

export async function POST(request: Request) {
  const gate = await requirePermissionApi("releases.takedown");
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const body = schema.parse(await request.json());
    const release = await prisma.release.findUnique({
      where: { id: body.releaseId },
    });
    if (!release) {
      return NextResponse.json({ error: "Release not found" }, { status: 404 });
    }
    if (!release.labelgridId) {
      return NextResponse.json(
        { error: "Release has no LabelGrid ID" },
        { status: 400 }
      );
    }

    const record = await prisma.takedownRequest.create({
      data: {
        releaseId: release.id,
        reason: body.reason,
        status: "submitted",
        scope: "all",
        message: body.message ?? null,
        internalNotes: body.internalNotes ?? null,
        requestedById: gate.admin.id,
        submittedAt: new Date(),
      },
    });

    try {
      const result = await takedownReleaseAll(release.labelgridId, {
        message: body.message ?? null,
        confirm_contract_hold: body.confirmContractHold ?? false,
      });

      await prisma.takedownRequest.update({
        where: { id: record.id },
        data: {
          status: "processing",
          providerResponse: JSON.stringify(result),
        },
      });

      await prisma.release.update({
        where: { id: release.id },
        data: { status: "takedown_pending" },
      });

      await logReleaseActivity({
        releaseId: release.id,
        type: "takedown_requested",
        title: "Takedown requested",
        description: body.reason,
        actorUserId: gate.admin.id,
      });

      await writeAuditLog({
        actorUserId: gate.admin.id,
        action: "takedown_submitted",
        targetType: "release",
        targetId: release.id,
        summary: `Takedown submitted for ${release.title}`,
        metadata: { reason: body.reason, takedownId: record.id },
      });

      return NextResponse.json({ ok: true, takedown: record });
    } catch (error) {
      const message =
        error instanceof LabelGridApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Takedown API failed";
      await prisma.takedownRequest.update({
        where: { id: record.id },
        data: { status: "failed", error: message.slice(0, 2000) },
      });
      return NextResponse.json({ error: message }, { status: 502 });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    console.error("[admin/takedowns]", error);
    return NextResponse.json({ error: "Takedown failed" }, { status: 500 });
  }
}
