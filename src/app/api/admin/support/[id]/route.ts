import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

const replySchema = z.object({
  body: z.string().min(1).max(8000),
  status: z
    .enum(["open", "in_progress", "answered", "closed"])
    .optional(),
});

const statusSchema = z.object({
  status: z.enum(["open", "in_progress", "answered", "closed"]),
});

export async function GET(_request: Request, { params }: Params) {
  const gate = await requireAdminApi();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, planId: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, role: true } } },
      },
    },
  });
  if (!ticket) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ticket });
}

export async function PATCH(request: Request, { params }: Params) {
  const gate = await requireAdminApi();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;
  try {
    const body = statusSchema.parse(await request.json());
    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: { status: body.status },
    });
    return NextResponse.json({ ticket });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    console.error("[admin/support/status]", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  const gate = await requireAdminApi();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;
  try {
    const body = replySchema.parse(await request.json());
    const existing = await prisma.supportTicket.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const nextStatus = body.status ?? "answered";

    const [, message] = await prisma.$transaction([
      prisma.supportTicket.update({
        where: { id },
        data: { status: nextStatus },
      }),
      prisma.supportMessage.create({
        data: {
          ticketId: id,
          authorId: gate.admin.id,
          body: body.body.trim(),
          isStaff: true,
        },
      }),
    ]);

    return NextResponse.json({ message, status: nextStatus }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    console.error("[admin/support/reply]", error);
    return NextResponse.json({ error: "Could not reply" }, { status: 500 });
  }
}
