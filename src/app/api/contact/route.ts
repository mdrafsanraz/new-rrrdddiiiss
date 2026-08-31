import { NextResponse } from "next/server";
import { z } from "zod";
import { notifyContactMessage } from "@/lib/email";

const schema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(120, "Name is too long."),
  email: z.string().trim().email("Enter a valid email address.").max(160, "Email is too long."),
  message: z.string().trim().min(1, "Enter a message.").max(5000, "Message is too long."),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    await notifyContactMessage(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    console.error("[contact]", error);
    return NextResponse.json({ error: "Could not send message" }, { status: 500 });
  }
}
