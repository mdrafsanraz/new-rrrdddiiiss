import Link from "next/link";
import type { SupportTicketStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import {
  supportCategoryLabel,
  supportStatusLabel,
} from "@/lib/support";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Support · Admin" };

type Props = { searchParams: Promise<{ status?: string; q?: string }> };

export default async function AdminSupportPage({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;
  const statusFilter = sp.status ?? "open";
  const q = (sp.q ?? "").trim();

  const tickets = await prisma.supportTicket.findMany({
    where: {
      ...(statusFilter !== "all"
        ? { status: statusFilter as SupportTicketStatus }
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
      user: { select: { name: true, email: true } },
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
          { value: "open", label: "Open" },
          { value: "in_progress", label: "In progress" },
          { value: "answered", label: "Answered" },
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

      <form className="flex gap-2">
        <input type="hidden" name="status" value={statusFilter} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Search subject or user…"
          className="h-10 w-full max-w-md rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-primary"
        />
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
              <th className="hidden px-4 py-3 font-medium sm:table-cell">
                Status
              </th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tickets.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
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
                      {supportCategoryLabel(t.category)} · {t._count.messages}{" "}
                      msgs · {t.updatedAt.toLocaleString()}
                    </p>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <p>{t.user.name}</p>
                    <p className="text-xs text-muted-foreground">{t.user.email}</p>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    {supportStatusLabel(t.status)}
                  </td>
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
