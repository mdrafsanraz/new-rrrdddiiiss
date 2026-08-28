import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChatCircleDots, CheckCircle, Clock, EnvelopeSimple, User } from "@phosphor-icons/react/dist/ssr";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { SupportReplyForm } from "@/components/dashboard/support-reply-form";
import { supportCategoryLabel, supportStatusLabel, supportTicketNumber } from "@/lib/support";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export default async function SupportTicketPage({ params }: Props) {
  const user = await requireUser();
  const { id } = await params;
  const ticket = await prisma.supportTicket.findFirst({ where: { id, userId: user.id }, include: { messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } } } });
  if (!ticket) notFound();
  const isClosed = ticket.status === "closed";

  return (
    <div className="mx-auto max-w-[1120px] space-y-6">
      <Link href="/dashboard/support" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft size={14} weight="bold" /> All tickets</Link>
      <header className="overflow-hidden rounded-2xl border border-border bg-card"><div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-foreground px-3 py-1.5 font-mono text-[10px] font-semibold tracking-wider text-background">{supportTicketNumber(ticket.id)}</span><span className="rounded-full border border-border bg-muted/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{supportStatusLabel(ticket.status)}</span></div><h1 className="mt-5 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">{ticket.subject}</h1><p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground"><span>{supportCategoryLabel(ticket.category)}</span><span className="flex items-center gap-1.5"><Clock size={14} /> Opened {ticket.createdAt.toLocaleDateString()}</span></p></div><div className="flex items-center gap-3 rounded-xl border border-border bg-muted/35 px-4 py-3"><div className={cn("size-2 rounded-full", isClosed ? "bg-zinc-400" : "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,.12)]")} /><div><p className="text-xs font-semibold">{isClosed ? "Conversation closed" : "Support thread active"}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{ticket.messages.length} message{ticket.messages.length === 1 ? "" : "s"}</p></div></div></div><div className="h-1 bg-[linear-gradient(90deg,var(--primary),color-mix(in_oklch,var(--primary)_24%,transparent),transparent)]" /></header>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_310px]">
        <main className="space-y-5"><div className="flex items-center gap-2"><ChatCircleDots size={17} className="text-primary" weight="duotone" /><h2 className="text-sm font-semibold">Conversation</h2><div className="h-px flex-1 bg-border" /></div><ol className="space-y-5">{ticket.messages.map((message) => <li key={message.id} className={cn("flex gap-3 sm:gap-4", message.isStaff && "flex-row-reverse")}><div className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl border", message.isStaff ? "border-primary/20 bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground")}>{message.isStaff ? <EnvelopeSimple size={17} weight="duotone" /> : <User size={17} weight="duotone" />}</div><article className={cn("min-w-0 max-w-[85%] rounded-2xl border p-4 sm:p-5", message.isStaff ? "rounded-tr-sm border-primary/20 bg-primary/[0.045]" : "rounded-tl-sm border-border bg-card")}><div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1"><p className="text-xs font-semibold">{message.isStaff ? "RDISTRO Support" : message.author.name}</p><time className="text-[10px] text-muted-foreground">{message.createdAt.toLocaleString()}</time></div><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground/85">{message.body}</p></article></li>)}</ol><SupportReplyForm ticketId={ticket.id} closed={isClosed} /></main>
        <aside className="space-y-4 lg:sticky lg:top-6"><section className="rounded-2xl border border-border bg-card p-5"><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Ticket details</p><dl className="mt-5 divide-y divide-border text-sm"><div className="flex items-center justify-between gap-3 pb-3"><dt className="text-muted-foreground">Reference</dt><dd className="font-mono font-semibold">{supportTicketNumber(ticket.id)}</dd></div><div className="flex items-center justify-between gap-3 py-3"><dt className="text-muted-foreground">Category</dt><dd className="font-medium">{supportCategoryLabel(ticket.category)}</dd></div><div className="flex items-center justify-between gap-3 py-3"><dt className="text-muted-foreground">Status</dt><dd className="font-medium">{supportStatusLabel(ticket.status)}</dd></div><div className="flex items-center justify-between gap-3 pt-3"><dt className="text-muted-foreground">Last update</dt><dd className="text-right text-xs font-medium">{ticket.updatedAt.toLocaleDateString()}</dd></div></dl></section><section className="rounded-2xl border border-border bg-foreground p-5 text-background"><CheckCircle size={22} className="text-primary" weight="duotone" /><h3 className="mt-4 font-semibold">We keep you in the loop</h3><p className="mt-2 text-xs leading-5 text-background/55">Status changes and staff replies are sent to your account email automatically.</p></section></aside>
      </div>
    </div>
  );
}
