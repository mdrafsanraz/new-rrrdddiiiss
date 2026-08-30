import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requirePermissionApi } from "@/lib/auth/admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { prisma } from "@/lib/db";
import { notifyWithdrawalStatusChanged } from "@/lib/email";

const money = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,12})?$/, "Enter a valid non-negative amount.");

const schema = z.object({
  status: z.enum(["processing", "paid", "declined"]),
  reference: z.string().trim().max(100).optional(),
  reason: z.string().trim().max(500).optional(),
  note: z.string().trim().max(1000).optional(),
  // Settlement breakdown — only used (and meaningful) when marking paid.
  payoutAmount: money.optional(),
  taxWithholding: money.optional(),
  fee: money.optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const gate = await requirePermissionApi("royalties.write");
  if ("error" in gate)
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  try {
    const { id } = await context.params;
    const input = schema.parse(await request.json());
    const existing = await prisma.withdrawal.findUnique({
      where: { id },
      include: { user: { select: { email: true, name: true } } },
    });
    if (!existing)
      return NextResponse.json(
        { error: "Withdrawal not found." },
        { status: 404 },
      );
    if (["paid", "declined"].includes(existing.status))
      return NextResponse.json(
        { error: "Completed withdrawal decisions cannot be silently changed." },
        { status: 409 },
      );
    const allowed = existing.status === "pending" ? ["processing", "declined"] : existing.status === "processing" ? ["paid", "declined"] : [];
    if (!allowed.includes(input.status))
      return NextResponse.json({ error: `A ${existing.status} withdrawal cannot be marked ${input.status}.` }, { status: 409 });
    if (input.status === "declined" && !input.reason)
      return NextResponse.json({ error: "A decline reason is required." }, { status: 400 });

    let settlement: {
      payoutAmount: Prisma.Decimal;
      taxWithholding: Prisma.Decimal;
      fee: Prisma.Decimal;
      paidAmount: Prisma.Decimal;
    } | null = null;
    if (input.status === "paid") {
      const payoutAmount = new Prisma.Decimal(input.payoutAmount ?? existing.amount.toString());
      const taxWithholding = new Prisma.Decimal(input.taxWithholding ?? "0");
      const fee = new Prisma.Decimal(input.fee ?? "0");
      const paidAmount = payoutAmount.minus(taxWithholding).minus(fee);
      if (paidAmount.isNegative())
        return NextResponse.json(
          { error: "Tax withholding and fee cannot exceed the payout amount." },
          { status: 400 },
        );
      settlement = { payoutAmount, taxWithholding, fee, paidAmount };
    }

    const processedAt = ["paid", "declined"].includes(input.status)
      ? new Date()
      : null;
    const withdrawal = await prisma.$transaction(async (tx) => {
      const updated = await tx.withdrawal.update({
        where: { id },
        data: {
          status: input.status,
          processedAt,
          failureReason:
            input.status === "declined"
              ? input.reason || "Declined by RDISTRO finance"
              : null,
          ...(input.reference ? { reference: input.reference } : {}),
          ...(settlement
            ? {
                payoutAmount: settlement.payoutAmount,
                taxWithholding: settlement.taxWithholding,
                fee: settlement.fee,
                paidAmount: settlement.paidAmount,
              }
            : {}),
        },
      });
      await tx.walletTransaction.update({
        where: {
          sourceType_sourceId: { sourceType: "withdrawal", sourceId: id },
        },
        data: { status: input.status },
      });
      return updated;
    });
    await writeAuditLog({
      actorUserId: gate.admin.id,
      action: "payout_action",
      targetType: "withdrawal",
      targetId: id,
      summary: `Withdrawal marked ${input.status}`,
      metadata: {
        previousStatus: existing.status,
        reference: withdrawal.reference,
        reason: input.reason,
        note: input.note,
        ...(settlement
          ? {
              payoutAmount: settlement.payoutAmount.toString(),
              taxWithholding: settlement.taxWithholding.toString(),
              fee: settlement.fee.toString(),
              paidAmount: settlement.paidAmount.toString(),
            }
          : {}),
      },
    });
    await notifyWithdrawalStatusChanged({
      to: existing.user.email,
      name: existing.user.name,
      amount: existing.amount.toString(),
      currency: existing.currency,
      status: input.status,
      reason: input.status === "declined" ? withdrawal.failureReason : null,
      settlement: settlement
        ? {
            payoutAmount: settlement.payoutAmount.toString(),
            taxWithholding: settlement.taxWithholding.toString(),
            fee: settlement.fee.toString(),
            paidAmount: settlement.paidAmount.toString(),
          }
        : undefined,
    });
    return NextResponse.json({ ok: true, withdrawal });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid status." },
        { status: 400 },
      );
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not update withdrawal.",
      },
      { status: 422 },
    );
  }
}
