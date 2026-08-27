import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { SupportReplyForm } from "@/components/dashboard/support-reply-form";
import {
  supportCategoryLabel,
  supportStatusLabel,
} from "@/lib/support";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export default async function SupportTicketPage({ params }: Props) {
  const user = await requireUser();
  const { id } = await params;

  const ticket = await prisma.supportTicket.findFirst({
    where: { id, userId: user.id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true } } },
      },
    },
  });
  if (!ticket) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/dashboard/support"
          className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Support
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{ticket.subject}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {supportCategoryLabel(ticket.category)} ·{" "}
          {supportStatusLabel(ticket.status)}
        </p>
      </div>

      <ul className="space-y-3">
        {ticket.messages.map((m) => (
          <li
            key={m.id}
            className={cn(
              "border px-4 py-3 text-sm",
              m.isStaff
                ? "border-primary/30 bg-primary/5"
                : "border-border bg-card"
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {m.isStaff ? "RDISTRO Support" : m.author.name}
              </span>
              <span>{m.createdAt.toLocaleString()}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap">{m.body}</p>
          </li>
        ))}
      </ul>

      <SupportReplyForm
        ticketId={ticket.id}
        closed={ticket.status === "closed"}
      />
    </div>
  );
}
