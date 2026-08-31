import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  consumePasswordResetToken,
  findPasswordResetToken,
} from "@/lib/auth/password-reset";
import { setSessionCookie } from "@/lib/auth/session";

const schema = z.object({
  token: z.string().min(1, "Reset link is missing its token."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password must be under 128 characters."),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const record = await findPasswordResetToken(body.token);
    if (!record) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash, mustResetPassword: false },
    });
    await consumePasswordResetToken(record.id);
    await setSessionCookie(user.id, user.email);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    console.error("[auth/reset-password]", error);
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}
