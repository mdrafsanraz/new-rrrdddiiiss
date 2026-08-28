import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { writeAuditLog } from "@/lib/admin/audit";
import { getSessionUser } from "@/lib/auth/session";
import { requestWithdrawal } from "@/lib/wallet";

const schema = z.object({
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid withdrawal amount."),
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const input = schema.parse(await request.json());
    const amount = new Prisma.Decimal(input.amount);
    if (amount.lte(0))
      return NextResponse.json(
        { error: "Withdrawal amount must be greater than zero." },
        { status: 400 },
      );
    const withdrawal = await requestWithdrawal({ userId: user.id, amount });
    await writeAuditLog({
      actorUserId: user.id,
      action: "payout_action",
      targetType: "withdrawal",
      targetId: withdrawal.id,
      summary: `Requested ${withdrawal.currency} ${withdrawal.amount.toString()} withdrawal`,
      metadata: { method: withdrawal.method, reference: withdrawal.reference },
    });
    return NextResponse.json({
      ok: true,
      withdrawal: {
        id: withdrawal.id,
        status: withdrawal.status,
        reference: withdrawal.reference,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid withdrawal request." },
        { status: 400 },
      );
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    )
      return NextResponse.json(
        { error: "Your balance changed. Please try again." },
        { status: 409 },
      );
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not request withdrawal.",
      },
      { status: 422 },
    );
  }
}
