import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

const schema = z.object({
  method: z.enum(["bank_transfer", "paypal", "wise"]),
  email: z.string().trim().email().max(120),
  currency: z.enum(["USD", "EUR", "GBP"]),
  threshold: z.number().int().min(25).max(250),
});

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = schema.parse(await request.json());
    const user = await prisma.user.update({
      where: { id: sessionUser.id },
      data: { payoutMethod: body.method, payoutEmail: body.email, payoutCurrency: body.currency, payoutThreshold: body.threshold, payoutUpdatedAt: new Date() },
      select: { payoutMethod: true, payoutEmail: true, payoutCurrency: true, payoutThreshold: true, payoutUpdatedAt: true },
    });
    return NextResponse.json({ payout: user });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payout settings" }, { status: 400 });
    console.error("[account/payout]", error);
    return NextResponse.json({ error: "Could not update payout settings" }, { status: 500 });
  }
}
