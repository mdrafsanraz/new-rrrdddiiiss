import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createPasswordResetToken } from "@/lib/auth/password-reset";
import { emailUrl, sendPasswordResetEmail } from "@/lib/email";

const schema = z.object({
  email: z.string().email(),
});

/** Always returns 200 with the same message, whether or not the email is on file, so this can't be used to enumerate accounts. */
export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const email = body.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const token = await createPasswordResetToken(user.id);
      const resetUrl = emailUrl(`/reset-password?token=${token}`);
      await sendPasswordResetEmail(user.email, resetUrl);
    }

    return NextResponse.json({
      message: "If an account exists for that email, a reset link is on its way.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    console.error("[auth/forgot-password]", error);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
