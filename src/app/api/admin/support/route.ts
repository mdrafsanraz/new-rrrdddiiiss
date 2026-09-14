import { NextResponse } from "next/server";
import { z } from "zod";
import { readSupportRequest, saveSupportAttachments } from "@/lib/support-attachments";
import { writeAuditLog } from "@/lib/admin/audit";
import { emailUrl, notifySupportUser } from "@/lib/email";
import { supportTicketNumber } from "@/lib/support";
import { requireAdminApi } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import type { SupportTicketStatus } from "@prisma/client";

export async function POST(request: Request) {
  const gate = await requireAdminApi();
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  try {
    const { fields, files } = await readSupportRequest(request);
    const body = z.object({ email: z.string().trim().email(), subject: z.string().trim().min(3).max(160),
      category: z.enum(["general", "release", "billing", "account", "technical"]), body: z.string().trim().min(10).max(8000) }).parse(fields);
    const user = await prisma.user.findFirst({ where: { email: { equals: body.email, mode: "insensitive" } } });
    if (!user) return NextResponse.json({ error: "No user found with that email address." }, { status: 404 });
    const attachmentsJson = await saveSupportAttachments(user.id, files);
    const ticket = await prisma.supportTicket.create({ data: { userId: user.id, subject: body.subject,
      category: body.category, status: "open", messages: { create: { authorId: gate.admin.id, isStaff: true,
        body: body.body, attachmentsJson } } } });
    await writeAuditLog({ actorUserId: gate.admin.id, action: "other", targetType: "support_ticket", targetId: ticket.id,
      summary: "Created support ticket on behalf of user", metadata: { userId: user.id } }).catch(error => console.error("[support] audit failed", error));
    await notifySupportUser({ to: user.email, subject: `[${supportTicketNumber(ticket.id)}] Support ticket opened`,
      preheader: "RDISTRO opened a support ticket on your behalf.", heading: "A ticket has been opened for you",
      message: body.body, ticketNumber: supportTicketNumber(ticket.id), ticketSubject: ticket.subject,
      actionUrl: emailUrl(`/dashboard/support/${ticket.id}`), actionLabel: "View and reply" }).catch(error => console.error("[support] notification failed", error));
    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    console.error("[admin/support/create]", error);
    return NextResponse.json({ error: "Could not create ticket. Check file storage configuration if attaching files." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const gate = await requireAdminApi();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const q = (searchParams.get("q") ?? "").trim();

  const tickets = await prisma.supportTicket.findMany({
    where: {
      ...(status && status !== "all"
        ? { status: status as SupportTicketStatus }
        : {}),
      ...(q
        ? {
            OR: [
              { subject: { contains: q, mode: "insensitive" } },
              { user: { email: { contains: q, mode: "insensitive" } } },
              { user: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      user: { select: { id: true, name: true, email: true } },
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
