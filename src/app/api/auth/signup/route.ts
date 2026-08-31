import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth/session";
import { sendWelcomeEmail } from "@/lib/email";
import type { PlanId } from "@prisma/client";

const schema = z.object({
  name: z.string().min(1, "Enter your name.").max(80, "Name is too long."),
  email: z.string().email("Enter a valid email address.").max(120, "Email is too long."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password must be under 128 characters."),
  planId: z.enum(["free", "starter", "pro"]).default("free"),
  artistName: z
    .string()
    .min(2, "Artist name must be at least 2 characters.")
    .max(64, "Artist name is too long.")
    .optional(),
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
    await sendWelcomeEmail(user.email, user.name);

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
