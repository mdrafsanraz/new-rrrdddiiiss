import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

const currentPassword = z.string().min(1).max(200);

const wiseSchema = z.object({
  method: z.literal("wise"),
  wiseAccount: z.string().trim().min(1, "Wise tag or email is required").max(160),
  currentPassword,
});

const paypalSchema = z.object({
  method: z.literal("paypal"),
  email: z.string().trim().email().max(120),
  currentPassword,
});

const bankSchema = z.object({
  method: z.literal("bank_transfer"),
  bankCurrency: z.enum(["USD", "EUR"]),
  bankName: z.string().trim().min(1, "Bank name is required").max(160),
  bankAddress: z.string().trim().min(1, "Bank address is required").max(255),
  bankCountry: z.string().trim().min(1, "Bank country is required").max(120),
  accountHolderName: z.string().trim().min(1, "Account holder's full name is required").max(160),
  accountNumber: z.string().trim().min(1, "Account number is required").max(64),
  swiftBic: z.string().trim().max(32).optional(),
  currentPassword,
});

const schema = z.discriminatedUnion("method", [wiseSchema, paypalSchema, bankSchema]);

/** Payout fields not owned by the saved method are cleared so stale destination data never lingers. */
function payoutData(body: z.infer<typeof schema>) {
  const cleared = {
    payoutEmail: null,
    payoutWiseAccount: null,
    payoutBankCurrency: null,
    payoutBankName: null,
    payoutBankAddress: null,
    payoutBankCountry: null,
    payoutBankAccountHolder: null,
    payoutBankAccountNumber: null,
    payoutBankSwift: null,
  };

  if (body.method === "wise") {
    return { ...cleared, payoutWiseAccount: body.wiseAccount };
  }
  if (body.method === "paypal") {
    return { ...cleared, payoutEmail: body.email };
  }
  return {
    ...cleared,
    payoutBankCurrency: body.bankCurrency,
    payoutBankName: body.bankName,
    payoutBankAddress: body.bankAddress,
    payoutBankCountry: body.bankCountry,
    payoutBankAccountHolder: body.accountHolderName,
    payoutBankAccountNumber: body.accountNumber,
    payoutBankSwift: body.swiftBic || null,
  };
}

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = schema.parse(await request.json());
    const existing = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { passwordHash: true, payoutMethod: true },
    });
    if (
      !existing ||
      !(await bcrypt.compare(body.currentPassword, existing.passwordHash))
    )
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 403 },
      );
    const [user] = await prisma.$transaction([
      prisma.user.update({
        where: { id: sessionUser.id },
        data: {
          payoutMethod: body.method,
          // Fixed for every account — not user-editable.
          payoutCurrency: "USD",
          payoutThreshold: 50,
          payoutUpdatedAt: new Date(),
          ...payoutData(body),
        },
        select: {
          payoutMethod: true,
          payoutCurrency: true,
          payoutThreshold: true,
          payoutUpdatedAt: true,
        },
      }),
      prisma.auditLog.create({
        data: {
          actorUserId: sessionUser.id,
          action: "payout_action",
          targetType: "user_payout_settings",
          targetId: sessionUser.id,
          summary: "Updated payout destination",
          metadataJson: JSON.stringify({
            previousMethod: existing.payoutMethod,
            newMethod: body.method,
          }),
        },
      }),
    ]);
    return NextResponse.json({ payout: user });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid payout settings" },
        { status: 400 },
      );
    console.error("[account/payout]", error);
    return NextResponse.json(
      { error: "Could not update payout settings" },
      { status: 500 },
    );
  }
}
