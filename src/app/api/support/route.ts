import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

const createSchema = z.object({
  subject: z.string().min(3).max(160),
  category: z.enum([
    "general",
    "release",
    "billing",
    "account",
    "technical",
  ]),
  body: z.string().min(10).max(8000),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tickets = await prisma.supportTicket.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, createdAt: true, isStaff: true },
      },
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json({ tickets });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = createSchema.parse(await request.json());
    const ticket = await prisma.supportTicket.create({
      data: {
        userId: user.id,
        subject: body.subject.trim(),
        category: body.category,
        status: "open",
        messages: {
          create: {
            authorId: user.id,
            body: body.body.trim(),
            isStaff: false,
          },
        },
      },
      include: { messages: true },
    });
    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    console.error("[support]", error);
    return NextResponse.json({ error: "Could not create ticket" }, { status: 500 });
  }
}
