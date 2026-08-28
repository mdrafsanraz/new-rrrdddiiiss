import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { notifySupportTeam } from "@/lib/email";
import { supportTicketNumber } from "@/lib/support";

type Params = { params: Promise<{ id: string }> };

const replySchema = z.object({
  body: z.string().min(1).max(8000),
});

export async function GET(_request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const ticket = await prisma.supportTicket.findFirst({
    where: { id, userId: user.id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true } } },
      },
    },
  });
  if (!ticket) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ticket });
}

export async function POST(request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = replySchema.parse(await request.json());
    const ticket = await prisma.supportTicket.findFirst({
      where: { id, userId: user.id },
    });
    if (!ticket) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (ticket.status === "closed") {
      return NextResponse.json(
        { error: "This ticket is closed" },
        { status: 400 }
      );
    }

    const [, message] = await prisma.$transaction([
      prisma.supportTicket.update({
        where: { id },
        data: { status: "open", updatedAt: new Date() },
      }),
      prisma.supportMessage.create({
        data: {
          ticketId: id,
          authorId: user.id,
          body: body.body.trim(),
          isStaff: false,
        },
      }),
    ]);

    await notifySupportTeam({
      subject: `[${supportTicketNumber(ticket.id)}] Customer reply: ${ticket.subject}`,
      preheader: `${user.name} replied to a support ticket.`,
      heading: "New customer reply",
      message: `${body.body.trim()}\n\nFrom: ${user.name} (${user.email})`,
      ticketNumber: supportTicketNumber(ticket.id),
      ticketSubject: ticket.subject,
      actionUrl: `${new URL(request.url).origin}/admin/support/${ticket.id}`,
      actionLabel: "Review reply",
      replyTo: user.email,
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    console.error("[support/reply]", error);
    return NextResponse.json({ error: "Could not reply" }, { status: 500 });
  }
}
