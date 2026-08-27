import Link from "next/link";
import { ArrowLeft, Disc, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { requireUser } from "@/lib/auth/session";
import { getUserUsage } from "@/lib/entitlements/server";
import { prisma } from "@/lib/db";
import { formatLimit } from "@/lib/plans";
import { ReleaseBuilder } from "@/components/dashboard/release-builder";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export const metadata = { title: "New release" };

type Props = { searchParams: Promise<{ artistId?: string }> };

export default async function NewReleasePage({ searchParams }: Props) {
  const user = await requireUser();
  const sp = await searchParams;
  const [artists, usage] = await Promise.all([
    prisma.artist.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
    }),
    getUserUsage(user.id, user.planId),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="space-y-4">
        <Link
          href="/dashboard/releases"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          <ArrowLeft size={14} weight="bold" aria-hidden />
          Releases
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Catalog
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-balance">
              Create release
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Five steps — details, tracks, credits, distribution, then review.
              We&apos;ll check everything before it goes live
              {usage.releasesLimit === null
                ? ""
                : ` · ${usage.releasesThisMonth}/${formatLimit(usage.releasesLimit)} used this month`}
              .
            </p>
          </div>
          <div className="flex size-12 items-center justify-center border border-border bg-primary/10 text-primary">
            <Disc size={24} weight="regular" aria-hidden />
          </div>
        </div>
      </div>

      {!usage.canCreateRelease ? (
        <div className="border border-amber-500/40 bg-amber-50 px-5 py-5 text-sm text-amber-950">
          <div className="flex items-start gap-3">
            <WarningCircle
              size={20}
              weight="fill"
              className="mt-0.5 shrink-0"
              aria-hidden
            />
            <div>
              <p className="font-semibold">Monthly submission limit reached</p>
              <p className="mt-1 text-amber-900/80">
                Upgrade your plan to submit more releases this month.
              </p>
              <Link
                href="/dashboard/subscription"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "mt-4 h-10 border-amber-900/20 bg-white px-4 text-amber-950 hover:bg-amber-100"
                )}
              >
                View subscription
              </Link>
            </div>
          </div>
        </div>
      ) : artists.length === 0 ? (
        <div className="border border-border bg-card px-6 py-10 text-center">
          <div className="mx-auto flex size-12 items-center justify-center border border-border bg-muted text-muted-foreground">
            <Disc size={22} weight="regular" aria-hidden />
          </div>
          <p className="mt-4 text-base font-semibold">Add an artist first</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Releases must belong to an artist on your account before you can
            start the builder.
          </p>
          <Link
            href="/dashboard/artists"
            className={cn(buttonVariants(), "mt-5 h-10 px-5")}
          >
            Go to artists
          </Link>
        </div>
      ) : (
        <ReleaseBuilder
          artists={artists.map((a) => ({
            id: a.id,
            name: a.name,
            locked: a.locked,
          }))}
          defaultArtistId={sp.artistId}
        />
      )}
    </div>
  );
}
