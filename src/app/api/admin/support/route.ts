import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import type { SupportTicketStatus } from "@prisma/client";

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
