import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth/session";
import type { PlanId } from "@prisma/client";

const schema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email().max(120),
  password: z.string().min(8).max(128),
  planId: z.enum(["free", "starter", "pro"]).default("free"),
  artistName: z.string().min(2).max(64).optional(),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const email = body.email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // Paid plans start as free until Stripe webhook confirms payment.
    const planId: PlanId = body.planId === "free" ? "free" : "free";
    const pendingPlan = body.planId;

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: {
        name: body.name.trim(),
        email,
        passwordHash,
        planId,
        ...(body.artistName?.trim()
          ? {
              artists: {
                create: { name: body.artistName.trim() },
              },
            }
          : {}),
      },
    });

    await setSessionCookie(user.id, user.email);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        planId: user.planId,
      },
      pendingPlan,
      checkoutRequired: pendingPlan !== "free",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    console.error("[auth/signup]", error);
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
