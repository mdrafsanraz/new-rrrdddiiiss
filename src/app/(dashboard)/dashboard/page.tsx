import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { requireUser } from "@/lib/auth/session";
import { getUserUsage } from "@/lib/entitlements/server";
import { formatLimit, planLabel } from "@/lib/plans";
import { prisma } from "@/lib/db";
import { buttonVariants } from "@/components/ui/button";
import { UsageMeter } from "@/components/dashboard/usage-meter";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { cn } from "@/lib/utils";
import { releaseTitleLabel } from "@/lib/releases/display";

export const metadata = { title: "Dashboard" };

export default async function DashboardHomePage() {
  const user = await requireUser();
  const usage = await getUserUsage(user.id, user.planId);

  const [recent, upcoming] = await Promise.all([
    prisma.release.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { artist: true },
    }),
    prisma.release.findMany({
      where: {
        userId: user.id,
        releaseDate: { gt: new Date() },
        status: { notIn: ["taken_down", "rejected"] },
      },
      orderBy: { releaseDate: "asc" },
      take: 3,
      include: { artist: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Overview</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
            Welcome back, {user.name.split(" ")[0]}
          </h1>
        </div>
        <Link
          href="/dashboard/releases/new"
          className={cn(buttonVariants(), "h-10 px-5")}
        >
          Create release
          <ArrowRight className="size-4" weight="bold" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Releases" value={String(usage.totalReleases)} />
        <Kpi label="Tracks" value={String(usage.totalTracks)} />
        <Kpi label="Artists" value={String(usage.artistsUsed)} />
        <Kpi label="Plan" value={planLabel(user.planId)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Plan usage</h2>
          <div className="mt-4 space-y-4">
            <UsageMeter
              label="Artists"
              used={usage.artistsUsed}
              limit={usage.artistsLimit}
            />
            <UsageMeter
              label="Submitted this month"
              used={usage.releasesThisMonth}
              limit={usage.releasesLimit}
              hint={
                usage.releasesLimit === null
                  ? "Unlimited submissions"
                  : `Free plan counts submitted releases only (not drafts). ${formatLimit(usage.releasesLimit)} / month.`
              }
            />
          </div>
          {!usage.canCreateArtist || !usage.canCreateRelease ? (
            <Link
              href="/dashboard/subscription"
              className="mt-4 inline-flex text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              Upgrade plan
            </Link>
          ) : null}
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Subscription</h2>
          <p className="mt-3 text-2xl font-bold tracking-tight">
            {planLabel(user.planId)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground capitalize">
            Billing: {user.stripeStatus === "none" ? "none" : user.stripeStatus}
          </p>
          <Link
            href="/dashboard/subscription"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "mt-5 h-9 px-4 text-sm"
            )}
          >
            Manage subscription
          </Link>
        </section>
      </div>

      <section className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Recent releases</h2>
          <Link
            href="/dashboard/releases"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <Empty
            title="No releases yet"
            body="Create a draft release. Submission to stores happens after you review and submit."
            href="/dashboard/releases/new"
            cta="Create release"
          />
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/dashboard/releases/${r.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {releaseTitleLabel(r.title)}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {r.artist?.name ?? "No artist"} · {r.catalogNumber}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {upcoming.length > 0 ? (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Upcoming</h2>
          <ul className="mt-3 space-y-2">
            {upcoming.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="font-medium">{r.title}</span>
                <span className="text-muted-foreground">
                  {r.releaseDate
                    ? r.releaseDate.toLocaleDateString()
                    : "TBD"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

function Empty({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        {body}
      </p>
      <Link
        href={href}
        className={cn(buttonVariants({ variant: "outline" }), "mt-5 h-9 px-4")}
      >
        {cta}
      </Link>
    </div>
  );
}
