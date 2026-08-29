import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth/admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { prisma } from "@/lib/db";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const gate = await requirePermissionApi("royalties.write");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const { id } = await context.params;
  const period = await prisma.royaltyPeriod.findUnique({ where: { id }, include: { statements: { select: { id: true } }, _count: { select: { imports: true, transactions: true } } } });
  if (!period) return NextResponse.json({ error: "Royalty period not found." }, { status: 404 });
  if (period.status === "published" || period.publishedAt) return NextResponse.json({ error: "Published royalty periods cannot be deleted." }, { status: 409 });
  const statementIds = period.statements.map((statement) => statement.id);
  const walletEntries = statementIds.length ? await prisma.walletTransaction.count({ where: { sourceType: "user_royalty_statement", sourceId: { in: statementIds } } }) : 0;
  if (walletEntries > 0) return NextResponse.json({ error: "This period has wallet ledger entries and cannot be deleted." }, { status: 409 });

  await prisma.$transaction(async (tx) => {
    await tx.royaltyAdjustment.deleteMany({ where: { royaltyPeriodId: id } });
    await tx.royaltyTransaction.deleteMany({ where: { royaltyPeriodId: id } });
    await tx.userRoyaltyStatement.deleteMany({ where: { royaltyPeriodId: id } });
    await tx.royaltyImport.deleteMany({ where: { royaltyPeriodId: id } });
    await tx.royaltyPeriod.delete({ where: { id } });
  });
  try {
    await writeAuditLog({ actorUserId: gate.admin.id, action: "other", targetType: "royalty_period", targetId: id, summary: `Deleted unpublished royalty period ${period.period}`, metadata: { kind: "royalty_period_deleted", status: period.status, imports: period._count.imports, transactions: period._count.transactions } });
  } catch (error) {
    console.error("[admin/royalties/period/delete] audit log failed", error);
  }
  return NextResponse.json({ ok: true });
}
