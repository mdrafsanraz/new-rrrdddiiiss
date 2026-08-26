import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Admin" };

export default async function AdminHomePage() {
  await requireAdmin();

  const [pending, users, releases, approved, rejected] = await Promise.all([
    prisma.release.count({ where: { status: "in_review" } }),
    prisma.user.count(),
    prisma.release.count(),
    prisma.release.count({ where: { status: "approved" } }),
    prisma.release.count({ where: { status: "rejected" } }),
  ]);

  const queue = await prisma.release.findMany({
    where: { status: "in_review" },
    orderBy: { submittedAt: "asc" },
    take: 8,
    include: {
      user: { select: { name: true, email: true } },
      artist: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Admin overview
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          User submits upload to LabelGrid as a draft (they see Admin review).
          Approve submits that draft for LabelGrid review; reject stops it here.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="In review" value={pending} href="/admin/releases?status=in_review" />
        <Stat label="Users" value={users} href="/admin/users" />
        <Stat label="Approved" value={approved} href="/admin/releases?status=approved" />
        <Stat label="Rejected" value={rejected} href="/admin/releases?status=rejected" />
      </div>

      <section className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Review queue</h2>
          <Link
            href="/admin/releases?status=in_review"
            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            View all
          </Link>
        </div>
        {queue.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">
            No releases waiting for review.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {queue.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {r.user.name} · {r.artist?.name ?? "—"} · {r.catalogNumber}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={r.status} />
                  <Link
                    href={`/admin/releases/${r.id}`}
                    className={cn(buttonVariants({ variant: "outline" }), "h-8 px-3 text-xs")}
                  >
                    Review
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        Total releases tracked: {releases}
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold tabular-nums">{value}</p>
    </Link>
  );
}
