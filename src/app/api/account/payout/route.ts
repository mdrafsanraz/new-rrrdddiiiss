import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

const schema = z.object({
  method: z.enum(["bank_transfer", "paypal", "wise"]),
  email: z.string().trim().email().max(120),
  currency: z.enum(["USD", "EUR", "GBP"]),
  threshold: z.number().int().min(25).max(250),
  currentPassword: z.string().min(1).max(200),
});

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = schema.parse(await request.json());
    const existing = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        passwordHash: true,
        payoutMethod: true,
        payoutCurrency: true,
        payoutThreshold: true,
      },
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
          payoutEmail: body.email,
          payoutCurrency: body.currency,
          payoutThreshold: body.threshold,
          payoutUpdatedAt: new Date(),
        },
        select: {
          payoutMethod: true,
          payoutEmail: true,
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
            previousCurrency: existing.payoutCurrency,
            newCurrency: body.currency,
            previousThreshold: existing.payoutThreshold,
            newThreshold: body.threshold,
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
