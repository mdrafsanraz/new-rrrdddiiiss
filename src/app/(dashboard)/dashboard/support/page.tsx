import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { NewSupportTicketForm } from "@/components/dashboard/new-support-ticket-form";
import {
  supportCategoryLabel,
  supportStatusLabel,
} from "@/lib/support";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export const metadata = { title: "Support" };

export default async function SupportPage() {
  const user = await requireUser();
  const tickets = await prisma.supportTicket.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: { select: { messages: true } },
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Support</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Open a ticket for catalog, billing, or account help. RDISTRO staff
          reply here — you never need to contact the distributor directly.
        </p>
      </div>

      <NewSupportTicketForm />

      <section className="border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Your tickets</h2>
        </div>
        {tickets.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">
            No tickets yet.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {tickets.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.subject}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {supportCategoryLabel(t.category)} ·{" "}
                    {supportStatusLabel(t.status)} ·{" "}
                    {t._count.messages} message
                    {t._count.messages === 1 ? "" : "s"} · updated{" "}
                    {t.updatedAt.toLocaleString()}
                  </p>
                </div>
                <Link
                  href={`/dashboard/support/${t.id}`}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "h-8 px-3 text-xs"
                  )}
                >
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
