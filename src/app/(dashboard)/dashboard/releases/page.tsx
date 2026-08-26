import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getUserUsage } from "@/lib/entitlements/server";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { UsageMeter } from "@/components/dashboard/usage-meter";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReleasesFilter } from "@/components/dashboard/releases-filter";

export const metadata = { title: "Releases" };

type Props = {
  searchParams: Promise<{ q?: string; status?: string }>;
};

export default async function ReleasesPage({ searchParams }: Props) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = sp.q?.trim();
  const status = sp.status?.trim();

  const [releases, usage] = await Promise.all([
    prisma.release.findMany({
      where: {
        userId: user.id,
        ...(status ? { status: status as never } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q } },
                { catalogNumber: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: { artist: true, _count: { select: { tracks: true } } },
    }),
    getUserUsage(user.id, user.planId),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Catalog</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
            Releases
          </h1>
        </div>
        <Link
          href="/dashboard/releases/new"
          className={cn(buttonVariants(), "h-10 px-5")}
        >
          New release
        </Link>
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <UsageMeter
          label="Submitted this month"
          used={usage.releasesThisMonth}
          limit={usage.releasesLimit}
          hint="Drafts do not count toward this limit."
        />
      </section>

      <ReleasesFilter initialQ={q ?? ""} initialStatus={status ?? ""} />

      <section className="rounded-xl border border-border bg-card">
        {releases.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="font-semibold">No releases</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Create a local draft first. Submission syncs to distribution later.
            </p>
            <Link
              href="/dashboard/releases/new"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "mt-5 h-9 px-4"
              )}
            >
              Create release
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {releases.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/dashboard/releases/${r.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{r.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {r.artist?.name ?? "No artist"} · {r.catalogNumber} ·{" "}
                      {r._count.tracks} track
                      {r._count.tracks === 1 ? "" : "s"}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
