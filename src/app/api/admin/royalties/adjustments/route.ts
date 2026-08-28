import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermissionApi } from "@/lib/auth/admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { prisma } from "@/lib/db";

const schema = z.object({ royaltyPeriodId: z.string().min(1), transactionId: z.string().min(1), type: z.enum(["fixed", "manual", "tax_withholding", "processing", "correction", "other"]), amount: z.string().regex(/^-?\d+(\.\d{1,12})?$/), reason: z.string().trim().min(3).max(500) });

export async function POST(request: Request) {
  const gate = await requirePermissionApi("royalties.write");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  try {
    const input = schema.parse(await request.json());
    const transaction = await prisma.royaltyTransaction.findFirst({ where: { id: input.transactionId, royaltyPeriodId: input.royaltyPeriodId }, select: { userId: true, royaltyPeriod: { select: { status: true } } } });
    if (!transaction?.userId) return NextResponse.json({ error: "Adjustments require an allocated transaction." }, { status: 422 });
    if (transaction.royaltyPeriod.status === "published") return NextResponse.json({ error: "Published periods require a correction in a future period." }, { status: 409 });
    const adjustment = await prisma.royaltyAdjustment.create({ data: { userId: transaction.userId, royaltyPeriodId: input.royaltyPeriodId, transactionId: input.transactionId, type: input.type, amount: input.amount, reason: input.reason, createdById: gate.admin.id } });
    await prisma.royaltyPeriod.update({ where: { id: input.royaltyPeriodId }, data: { status: "needs_review", calculatedAt: null } });
    await writeAuditLog({ actorUserId: gate.admin.id, action: "other", targetType: "royalty_adjustment", targetId: adjustment.id, summary: `Created ${input.type.replaceAll("_", " ")} royalty adjustment`, metadata: { amount: input.amount, reason: input.reason, transactionId: input.transactionId } });
    return NextResponse.json({ ok: true, adjustment });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create adjustment." }, { status: 422 });
  }
}
