import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { SupportReplyForm } from "@/components/dashboard/support-reply-form";
import { SupportOperationsForm } from "@/components/admin/support-operations-form";
import { LoginAsUserButton } from "@/components/admin/login-as-user-button";
import {
  supportCategoryLabel,
  supportStatusLabel,
  supportTicketNumber,
} from "@/lib/support";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "@/lib/admin/format";

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
      assignedTo: { select: { id: true, name: true } },
    },
  });
  if (!ticket) notFound();
  const [staff, releases, artists, notes] = await Promise.all([
    prisma.user.findMany({ where: { role: { not: "user" } }, orderBy: { name: "asc" }, select: { id: true, name: true, email: true } }),
    prisma.release.findMany({ where: { userId: ticket.userId }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, title: true, upc: true } }),
    prisma.artist.findMany({ where: { userId: ticket.userId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.internalNote.findMany({ where: { entityType: "support_ticket", entityId: ticket.id }, orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } }),
  ]);
  const lastMessage = ticket.messages.at(-1);
  const waitingSince = lastMessage?.createdAt ?? ticket.createdAt;
  const waitingFor = ticket.status === "closed" || ticket.status === "resolved" ? "Completed" : lastMessage?.isStaff ? "Awaiting user" : "Awaiting staff";

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

      <section className="grid border border-border bg-card sm:grid-cols-4"><div className="p-4 sm:border-r sm:border-border"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Queue state</p><p className="mt-2 text-lg font-semibold">{waitingFor}</p></div><div className="p-4 sm:border-r sm:border-border"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Waiting time</p><p className="mt-2 text-lg font-semibold">{formatDistanceToNow(waitingSince)}</p></div><div className="p-4 sm:border-r sm:border-border"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Priority</p><p className="mt-2 text-lg font-semibold capitalize">{ticket.priority}</p></div><div className="p-4"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Assigned</p><p className="mt-2 text-lg font-semibold">{ticket.assignedTo?.name ?? "Unassigned"}</p></div></section>

      <SupportOperationsForm ticketId={ticket.id} initial={{ status: ticket.status, priority: ticket.priority, assignedToId: ticket.assignedToId, releaseId: ticket.releaseId, artistId: ticket.artistId, escalated: Boolean(ticket.escalatedAt) }} staff={staff.map((item) => ({ id: item.id, label: `${item.name} (${item.email})` }))} releases={releases.map((item) => ({ id: item.id, label: `${item.title}${item.upc ? ` / ${item.upc}` : ""}` }))} artists={artists.map((item) => ({ id: item.id, label: item.name }))} />

      {notes.length ? <section className="border border-border bg-card"><div className="border-b border-border px-5 py-3"><h2 className="text-sm font-semibold">Internal notes</h2></div><div className="divide-y divide-border">{notes.map((note) => <div key={note.id} className="px-5 py-4"><div className="flex justify-between text-[10px] text-muted-foreground"><span className="font-semibold text-foreground">{note.author.name}</span><span>{note.createdAt.toLocaleString()}</span></div><p className="mt-2 whitespace-pre-wrap text-sm">{note.body}</p></div>)}</div></section> : null}

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
