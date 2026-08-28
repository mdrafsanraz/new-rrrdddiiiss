import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { SupportReplyForm } from "@/components/dashboard/support-reply-form";
import { AdminSupportStatusForm } from "@/components/admin/support-status-form";
import { LoginAsUserButton } from "@/components/admin/login-as-user-button";
import {
  supportCategoryLabel,
  supportStatusLabel,
  supportTicketNumber,
} from "@/lib/support";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export default async function AdminSupportTicketPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, planId: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true } } },
      },
    },
  });
  if (!ticket) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/support"
            className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
          >
            ← Inbox
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            {ticket.subject}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-mono font-semibold text-foreground/70">{supportTicketNumber(ticket.id)}</span> ·{" "}
            {supportCategoryLabel(ticket.category)} ·{" "}
            {supportStatusLabel(ticket.status)}
          </p>
        </div>
        <LoginAsUserButton
          userId={ticket.user.id}
          userName={ticket.user.name}
        />
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">User</h2>
        <p className="mt-2 text-sm">
          {ticket.user.name} · {ticket.user.email} · {ticket.user.planId}
        </p>
        <Link
          href={`/admin/users/${ticket.user.id}`}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "mt-3 h-8 px-3 text-xs"
          )}
        >
          Manage user
        </Link>
      </section>

      <AdminSupportStatusForm ticketId={ticket.id} status={ticket.status} />

      <ul className="space-y-3">
        {ticket.messages.map((m) => (
          <li
            key={m.id}
            className={cn(
              "rounded-xl border px-4 py-3 text-sm",
              m.isStaff
                ? "border-primary/30 bg-primary/5"
                : "border-border bg-card"
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {m.isStaff ? `Staff · ${m.author.name}` : m.author.name}
              </span>
              <span>{m.createdAt.toLocaleString()}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap">{m.body}</p>
          </li>
        ))}
      </ul>

      <SupportReplyForm ticketId={ticket.id} admin />
    </div>
  );
}
