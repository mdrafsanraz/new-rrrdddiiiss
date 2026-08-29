import Link from "next/link";
import type { SupportTicketPriority, SupportTicketStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import {
  supportCategoryLabel,
  supportStatusLabel,
  supportTicketNumber,
} from "@/lib/support";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export const metadata = { title: "Support · Admin" };

type Props = { searchParams: Promise<{ status?: string; q?: string; priority?: string; category?: string; assigned?: string; age?: string }> };

export default async function AdminSupportPage({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;
  const statusFilter = sp.status ?? "open";
  const q = (sp.q ?? "").trim();
  const priority = ["low", "normal", "high", "urgent"].includes(sp.priority ?? "") ? sp.priority as SupportTicketPriority : undefined;
  const category = ["general", "release", "billing", "account", "technical"].includes(sp.category ?? "") ? sp.category : undefined;
  const assigned = sp.assigned ?? "";
  const ageHours = ["24", "72", "168"].includes(sp.age ?? "") ? Number(sp.age) : undefined;
  const [{ now: requestTime }] = await prisma.$queryRaw<Array<{ now: Date }>>`SELECT NOW() AS now`;
  const [staff, statusGroups, priorityGroups] = await Promise.all([
    prisma.user.findMany({ where: { role: { not: "user" } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.supportTicket.groupBy({ by: ["status"], _count: true }),
    prisma.supportTicket.groupBy({ by: ["priority"], where: { status: { notIn: ["closed", "resolved"] } }, _count: true }),
  ]);

  const tickets = await prisma.supportTicket.findMany({
    where: {
      ...(statusFilter !== "all"
        ? { status: statusFilter === "awaiting_staff" ? { in: ["open", "in_progress"] as SupportTicketStatus[] } : statusFilter === "awaiting_user" ? "answered" as SupportTicketStatus : statusFilter as SupportTicketStatus }
        : {}),
      ...(priority ? { priority } : {}),
      ...(category ? { category: category as never } : {}),
      ...(assigned === "unassigned" ? { assignedToId: null } : assigned ? { assignedToId: assigned } : {}),
      ...(ageHours ? { updatedAt: { lte: new Date(requestTime.getTime() - ageHours * 60 * 60 * 1000) } } : {}),
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
      user: { select: { name: true, email: true } },
      assignedTo: { select: { name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true, isStaff: true } },
      _count: { select: { messages: true } },
    },
  });

  const openCount = await prisma.supportTicket.count({
    where: { status: { in: ["open", "in_progress"] } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Support inbox</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {openCount} open / in progress. Reply to users from ticket threads.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { value: "awaiting_staff", label: "Awaiting staff" },
          { value: "awaiting_user", label: "Awaiting user" },
          { value: "resolved", label: "Resolved" },
          { value: "closed", label: "Closed" },
          { value: "all", label: "All" },
        ].map((f) => (
          <Link
            key={f.value}
            href={`/admin/support?status=${f.value}`}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium",
              statusFilter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <section className="grid border border-border bg-card sm:grid-cols-3"><div className="p-4 sm:border-r sm:border-border"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Open workload</p><p className="mt-2 text-2xl font-semibold">{openCount}</p></div><div className="p-4 sm:border-r sm:border-border"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Urgent</p><p className="mt-2 text-2xl font-semibold text-red-700">{priorityGroups.find((item) => item.priority === "urgent")?._count ?? 0}</p></div><div className="p-4"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Resolved</p><p className="mt-2 text-2xl font-semibold">{statusGroups.find((item) => item.status === "resolved")?._count ?? 0}</p></div></section>

      <form className="grid gap-2 border border-border bg-card p-4 sm:grid-cols-2 xl:grid-cols-[1fr_repeat(4,180px)_auto]">
        <input type="hidden" name="status" value={statusFilter} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Search subject or user"
          className="h-10 w-full border border-border bg-background px-3 text-sm outline-none focus-visible:border-primary"
        />
        <select name="priority" defaultValue={priority ?? ""} className="h-10 border border-border bg-background px-3 text-xs"><option value="">All priorities</option><option value="urgent">Urgent</option><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></select>
        <select name="category" defaultValue={category ?? ""} className="h-10 border border-border bg-background px-3 text-xs"><option value="">All categories</option><option value="general">General</option><option value="release">Release</option><option value="billing">Billing</option><option value="account">Account</option><option value="technical">Technical</option></select>
        <select name="assigned" defaultValue={assigned} className="h-10 border border-border bg-background px-3 text-xs"><option value="">Any assignee</option><option value="unassigned">Unassigned</option>{staff.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select name="age" defaultValue={sp.age ?? ""} className="h-10 border border-border bg-background px-3 text-xs"><option value="">Any age</option><option value="24">Older than 24 hours</option><option value="72">Older than 3 days</option><option value="168">Older than 7 days</option></select>
        <button
          type="submit"
          className={cn(buttonVariants({ variant: "outline" }), "h-10 px-4")}
        >
          Search
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Ticket</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">User</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Queue</th><th className="hidden px-4 py-3 font-medium lg:table-cell">Owner</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tickets.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  No tickets match.
                </td>
              </tr>
            ) : (
              tickets.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{t.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-mono font-semibold text-foreground/70">{supportTicketNumber(t.id)}</span> / {supportCategoryLabel(t.category)} / {t._count.messages}{" "}
                      messages / {t.priority} priority
                    </p>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <p>{t.user.name}</p>
                    <p className="text-xs text-muted-foreground">{t.user.email}</p>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <p>{t.status === "resolved" || t.status === "closed" ? supportStatusLabel(t.status) : t.messages[0]?.isStaff ? "Awaiting user" : "Awaiting staff"}</p><p className="mt-1 text-[10px] text-muted-foreground">Waiting {Math.max(0, Math.floor((requestTime.getTime() - (t.messages[0]?.createdAt ?? t.createdAt).getTime()) / 3600000))}h</p>
                  </td>
                  <td className="hidden px-4 py-3 text-xs lg:table-cell">{t.assignedTo?.name ?? "Unassigned"}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/support/${t.id}`}
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "h-8 px-3 text-xs"
                      )}
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
