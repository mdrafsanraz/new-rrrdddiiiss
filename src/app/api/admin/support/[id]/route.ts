import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { notifySupportUser } from "@/lib/email";
import { supportStatusLabel, supportTicketNumber } from "@/lib/support";
import { writeAuditLog } from "@/lib/admin/audit";

type Params = { params: Promise<{ id: string }> };

const replySchema = z.object({
  body: z.string().min(1).max(8000),
  status: z
    .enum(["open", "in_progress", "answered", "resolved", "closed"])
    .optional(),
});

const statusSchema = z.object({
  status: z.enum(["open", "in_progress", "answered", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  assignedToId: z.string().nullable().optional(),
  releaseId: z.string().nullable().optional(),
  artistId: z.string().nullable().optional(),
  escalated: z.boolean().optional(),
  internalNote: z.string().trim().max(4000).optional(),
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
    const existing = await prisma.supportTicket.findUnique({
      where: { id },
      include: { user: { select: { email: true, name: true } } },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (body.assignedToId) {
      const staff = await prisma.user.findFirst({ where: { id: body.assignedToId, role: { not: "user" } }, select: { id: true } });
      if (!staff) return NextResponse.json({ error: "Assigned staff member was not found." }, { status: 400 });
    }
    if (body.releaseId) {
      const release = await prisma.release.findFirst({ where: { id: body.releaseId, userId: existing.userId }, select: { id: true } });
      if (!release) return NextResponse.json({ error: "Release does not belong to this user." }, { status: 400 });
    }
    if (body.artistId) {
      const artist = await prisma.artist.findFirst({ where: { id: body.artistId, userId: existing.userId }, select: { id: true } });
      if (!artist) return NextResponse.json({ error: "Artist does not belong to this user." }, { status: 400 });
    }
    const [ticket] = await prisma.$transaction([
      prisma.supportTicket.update({ where: { id }, data: { ...(body.status ? { status: body.status } : {}), ...(body.priority ? { priority: body.priority } : {}), ...(body.assignedToId !== undefined ? { assignedToId: body.assignedToId } : {}), ...(body.releaseId !== undefined ? { releaseId: body.releaseId } : {}), ...(body.artistId !== undefined ? { artistId: body.artistId } : {}), ...(body.escalated !== undefined ? { escalatedAt: body.escalated ? new Date() : null, priority: body.escalated ? "urgent" : body.priority } : {}) } }),
      ...(body.internalNote ? [prisma.internalNote.create({ data: { entityType: "support_ticket", entityId: id, body: body.internalNote, authorId: gate.admin.id } })] : []),
    ]);
    await writeAuditLog({ actorUserId: gate.admin.id, action: body.internalNote ? "note_added" : "other", targetType: "support_ticket", targetId: id, summary: body.internalNote ? "Added internal support note" : "Updated support operations", metadata: { status: body.status, priority: body.priority, assignedToId: body.assignedToId, releaseId: body.releaseId, artistId: body.artistId, escalated: body.escalated } });
    if (body.status && existing.status !== body.status) {
      await notifySupportUser({
        to: existing.user.email,
        subject: `[${supportTicketNumber(id)}] Ticket status updated`,
        preheader: `Your support ticket is now ${supportStatusLabel(body.status)}.`,
        heading: `Status: ${supportStatusLabel(body.status)}`,
        message: `Hi ${existing.user.name},\n\nThe status of your support request has changed from ${supportStatusLabel(existing.status)} to ${supportStatusLabel(body.status)}.`,
        ticketNumber: supportTicketNumber(id),
        ticketSubject: existing.subject,
        actionUrl: `${new URL(request.url).origin}/dashboard/support/${id}`,
        actionLabel: "View your ticket",
      });
    }
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
    const existing = await prisma.supportTicket.findUnique({
      where: { id },
      include: { user: { select: { email: true, name: true } } },
    });
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

    const statusNote = existing.status !== nextStatus
      ? `\n\nTicket status: ${supportStatusLabel(nextStatus)}`
      : "";
    await notifySupportUser({
      to: existing.user.email,
      subject: `[${supportTicketNumber(id)}] RDISTRO Support replied`,
      preheader: `There is a new reply on ${existing.subject}.`,
      heading: "A new reply from RDISTRO",
      message: `Hi ${existing.user.name},\n\n${body.body.trim()}${statusNote}`,
      ticketNumber: supportTicketNumber(id),
      ticketSubject: existing.subject,
      actionUrl: `${new URL(request.url).origin}/dashboard/support/${id}`,
      actionLabel: "Read and reply",
    });

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
