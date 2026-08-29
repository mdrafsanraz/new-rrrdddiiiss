import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermissionApi } from "@/lib/auth/admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { prisma } from "@/lib/db";

const schema = z.object({ action: z.enum(["approve", "reject", "request_replacement"]), reviewNote: z.string().trim().max(2000).optional(), internalNote: z.string().trim().max(4000).optional(), expiresAt: z.string().date().nullable().optional() });
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const gate = await requirePermissionApi("documents.manage"); if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  try {
    const { id } = await context.params; const input = schema.parse(await request.json());
    if (input.action !== "approve" && !input.reviewNote) return NextResponse.json({ error: "A user-facing review note is required." }, { status: 400 });
    const existing = await prisma.releaseDocument.findUnique({ where: { id }, include: { release: { select: { id: true, title: true } } } });
    if (!existing) return NextResponse.json({ error: "Document not found." }, { status: 404 });
    const reviewStatus = input.action === "approve" ? "approved" : input.action === "reject" ? "rejected" : "replacement_requested";
    const [document] = await prisma.$transaction([
      prisma.releaseDocument.update({ where: { id }, data: { reviewStatus, reviewNote: input.reviewNote || null, reviewedById: gate.admin.id, reviewedAt: new Date(), ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt ? new Date(`${input.expiresAt}T23:59:59.999Z`) : null } : {}) } }),
      prisma.releaseActivity.create({ data: { releaseId: existing.releaseId, type: "document_reviewed", title: `Document ${reviewStatus.replaceAll("_", " ")}`, description: input.reviewNote || null, actorUserId: gate.admin.id, metadataJson: JSON.stringify({ documentId: id, previousStatus: existing.reviewStatus }) } }),
      ...(input.internalNote ? [prisma.internalNote.create({ data: { entityType: "document", entityId: id, body: input.internalNote, authorId: gate.admin.id } })] : []),
    ]);
    await writeAuditLog({ actorUserId: gate.admin.id, action: input.action === "approve" ? "document_approved" : input.action === "reject" ? "document_rejected" : "document_replacement_requested", targetType: "release_document", targetId: id, summary: `${input.action.replaceAll("_", " ")} for ${existing.release.title}`, metadata: { releaseId: existing.releaseId, previousStatus: existing.reviewStatus, reviewNote: input.reviewNote, expiresAt: input.expiresAt } });
    return NextResponse.json({ ok: true, document });
  } catch (error) { if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid document review." }, { status: 400 }); return NextResponse.json({ error: error instanceof Error ? error.message : "Could not review document." }, { status: 422 }); }
}
