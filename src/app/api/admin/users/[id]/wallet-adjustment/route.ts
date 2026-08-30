import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requirePermissionApi } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/admin/audit";
import { notifyWalletAdjustment } from "@/lib/email";

const schema = z.object({
  amount: z
    .number()
    .finite()
    .refine((v) => v !== 0, "Amount must not be zero."),
  reason: z.string().trim().min(3).max(500),
});

type Params = { params: Promise<{ id: string }> };

/** Manual per-user wallet credit/debit — the only way to fulfil the "Corrections must create adjustments or reversals" note on the admin wallet view, since nothing else creates a WalletTransaction of type "adjustment". */
export async function POST(request: Request, { params }: Params) {
  const gate = await requirePermissionApi("royalties.write");
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;

  try {
    const body = schema.parse(await request.json());
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const isCredit = body.amount > 0;
    const amount = new Prisma.Decimal(Math.abs(body.amount));
    const reference = `ADJ-${randomBytes(6).toString("hex").toUpperCase()}`;
    const now = new Date();

    const transaction = await prisma.walletTransaction.create({
      data: {
        userId: id,
        type: "adjustment",
        amount,
        currency: "USD",
        direction: isCredit ? "credit" : "debit",
        sourceType: "adjustment",
        sourceId: reference,
        title: isCredit ? "Manual credit" : "Manual debit",
        description: body.reason.trim(),
        // calculateWalletBalances only counts a credit toward the
        // available balance at status "available", but only counts a
        // debit as *reducing* it at "pending"/"processing"/"paid" (the
        // withdrawal lifecycle) — "available" on a debit is invisible to
        // that sum. A manual debit is already final, so "paid" is the
        // terminal status that actually takes effect immediately.
        status: isCredit ? "available" : "paid",
        availableAt: now,
        createdAt: now,
      },
    });

    await writeAuditLog({
      actorUserId: gate.admin.id,
      action: "payout_action",
      targetType: "user",
      targetId: id,
      summary: `${isCredit ? "Credited" : "Debited"} ${amount.toString()} USD ${isCredit ? "to" : "from"} ${user.name}'s wallet`,
      metadata: { reference, reason: body.reason.trim(), amount: amount.toString(), isCredit },
    });

    await notifyWalletAdjustment({
      to: user.email,
      name: user.name,
      amount: amount.toString(),
      currency: "USD",
      isCredit,
      reason: body.reason.trim(),
    });

    return NextResponse.json({ ok: true, transaction });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    console.error("[admin/users/wallet-adjustment]", error);
    return NextResponse.json({ error: "Could not create adjustment." }, { status: 500 });
  }
}
