import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermissionApi } from "@/lib/auth/admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { prisma } from "@/lib/db";

const schema = z.object({ trackId: z.string().min(1), note: z.string().trim().max(500).optional() });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const gate = await requirePermissionApi("royalties.write");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  try {
    const { id } = await context.params;
    const input = schema.parse(await request.json());
    const [transaction, track] = await Promise.all([
      prisma.royaltyTransaction.findUnique({ where: { id } }),
      prisma.track.findUnique({ where: { id: input.trackId }, include: { release: { select: { id: true, userId: true, labelgridId: true } } } }),
    ]);
    if (!transaction || !track) return NextResponse.json({ error: "Transaction or track not found." }, { status: 404 });
    const updated = await prisma.royaltyTransaction.update({ where: { id }, data: { originalMatchState: { status: transaction.matchStatus, userId: transaction.userId, releaseId: transaction.releaseId, trackId: transaction.trackId }, userId: track.release.userId, releaseId: track.release.id, trackId: track.id, labelgridReleaseId: track.release.labelgridId, labelgridTrackId: track.labelgridId, matchStatus: "manual_match", matchMethod: "admin_manual", matchNotes: input.note, manuallyMatchedById: gate.admin.id, manuallyMatchedAt: new Date(), calculationStatus: "pending" } });
    await writeAuditLog({ actorUserId: gate.admin.id, action: "other", targetType: "royalty_transaction", targetId: id, summary: "Manually matched royalty transaction", metadata: { trackId: track.id, userId: track.release.userId, previousStatus: transaction.matchStatus, note: input.note } });
    return NextResponse.json({ ok: true, transaction: updated });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Manual match failed." }, { status: 422 });
  }
}
