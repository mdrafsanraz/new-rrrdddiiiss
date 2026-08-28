import Link from "next/link";
import { ArrowRight, ChatCircleDots, CheckCircle, ClockCountdown, Plus, Ticket } from "@phosphor-icons/react/dist/ssr";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { NewSupportTicketForm } from "@/components/dashboard/new-support-ticket-form";
import { supportCategoryLabel, supportStatusLabel, supportTicketNumber } from "@/lib/support";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export const metadata = { title: "Support" };
type Props = { searchParams: Promise<{ view?: string | string[] }> };

function statusTone(status: string) {
  if (status === "closed") return "border-zinc-300 bg-zinc-100 text-zinc-600";
  if (status === "answered") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "in_progress") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-sky-200 bg-sky-50 text-sky-700";
}

export default async function SupportPage({ searchParams }: Props) {
  const user = await requireUser();
  const query = await searchParams;
  const requestedView = Array.isArray(query.view) ? query.view[0] : query.view;
  const creating = requestedView === "new";
  const tickets = await prisma.supportTicket.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 }, _count: { select: { messages: true } } },
  });
  const activeCount = tickets.filter((ticket) => ticket.status === "open" || ticket.status === "in_progress").length;
  const answeredCount = tickets.filter((ticket) => ticket.status === "answered").length;
  const closedCount = tickets.filter((ticket) => ticket.status === "closed").length;

  return (
    <div className="mx-auto max-w-[1120px] space-y-7">
      <header className="relative overflow-hidden rounded-2xl border border-border bg-foreground px-6 py-7 text-background sm:px-9 sm:py-9">
        <div className="absolute -right-16 -top-20 size-64 rounded-full border border-background/10" />
        <div className="absolute -right-4 top-4 size-40 rounded-full border border-background/10" />
        <div className="relative flex flex-col justify-between gap-7 md:flex-row md:items-end">
          <div className="max-w-xl"><div className="flex items-center gap-2 text-primary"><ChatCircleDots size={18} weight="duotone" /><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em]">Artist support</p></div><h1 className="mt-4 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">{creating ? "Start a conversation" : "Your support desk"}</h1><p className="mt-3 max-w-lg text-sm leading-6 text-background/55">{creating ? "Tell us what is getting in the way. Your request lands directly with the RDISTRO support team." : "Every question, reply, and resolution in one focused workspace."}</p></div>
          <Link href={creating ? "/dashboard/support" : "/dashboard/support?view=new"} className={cn(buttonVariants(), "h-11 shrink-0 bg-background px-5 text-foreground hover:bg-background/90")}>{creating ? <ArrowRight size={16} weight="bold" /> : <Plus size={16} weight="bold" />}{creating ? "Back to tickets" : "New ticket"}</Link>
        </div>
      </header>

      {creating ? <NewSupportTicketForm /> : <>
        <section className="grid overflow-hidden rounded-2xl border border-border bg-card sm:grid-cols-3">
          <div className="flex items-center gap-4 p-5 sm:p-6"><div className="flex size-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><ClockCountdown size={20} weight="duotone" /></div><div><p className="text-2xl font-semibold tabular-nums">{activeCount}</p><p className="text-xs text-muted-foreground">Active requests</p></div></div>
          <div className="flex items-center gap-4 border-y border-border p-5 sm:border-x sm:border-y-0 sm:p-6"><div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><ChatCircleDots size={20} weight="duotone" /></div><div><p className="text-2xl font-semibold tabular-nums">{answeredCount}</p><p className="text-xs text-muted-foreground">Awaiting your reply</p></div></div>
          <div className="flex items-center gap-4 p-5 sm:p-6"><div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground"><CheckCircle size={20} weight="duotone" /></div><div><p className="text-2xl font-semibold tabular-nums">{closedCount}</p><p className="text-xs text-muted-foreground">Resolved</p></div></div>
        </section>
        <section>
          <div className="mb-4 flex items-end justify-between gap-4"><div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Conversation history</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Manage tickets</h2></div><p className="text-xs text-muted-foreground">{tickets.length} total</p></div>
          {tickets.length === 0 ? <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center"><div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><Ticket size={26} weight="duotone" /></div><h3 className="mt-5 text-lg font-semibold">Your inbox is clear</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">When you need help with a release, billing, or your account, start a conversation here.</p><Link href="/dashboard/support?view=new" className={cn(buttonVariants(), "mt-6 h-10 px-5")}><Plus size={15} weight="bold" /> Create ticket</Link></div> : <div className="overflow-hidden rounded-2xl border border-border bg-card">{tickets.map((ticket, index) => <Link key={ticket.id} href={`/dashboard/support/${ticket.id}`} className={cn("group grid gap-4 p-5 transition-colors hover:bg-muted/35 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6", index > 0 && "border-t border-border")}><div className="min-w-0"><div className="flex flex-wrap items-center gap-2.5"><span className="font-mono text-[11px] font-semibold tracking-wide text-muted-foreground">{supportTicketNumber(ticket.id)}</span><span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide", statusTone(ticket.status))}>{supportStatusLabel(ticket.status)}</span><span className="text-xs text-muted-foreground">{supportCategoryLabel(ticket.category)}</span></div><h3 className="mt-3 truncate text-base font-semibold tracking-tight transition-colors group-hover:text-primary">{ticket.subject}</h3><p className="mt-1.5 line-clamp-1 text-sm text-muted-foreground">{ticket.messages[0]?.body ?? "No messages yet"}</p><p className="mt-3 text-[11px] text-muted-foreground/75">{ticket._count.messages} message{ticket._count.messages === 1 ? "" : "s"} · Updated {ticket.updatedAt.toLocaleString()}</p></div><div className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-all group-hover:translate-x-1 group-hover:border-primary/30 group-hover:text-primary"><ArrowRight size={15} weight="bold" /></div></Link>)}</div>}
        </section>
      </>}
    </div>
  );
}
