import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getUserUsage } from "@/lib/entitlements/server";
import { prisma } from "@/lib/db";
import { UsageMeter } from "@/components/dashboard/usage-meter";
import { CreateArtistForm } from "@/components/dashboard/create-artist-form";

export const metadata = { title: "Artists" };

export default async function ArtistsPage() {
  const user = await requireUser();
  const [artists, usage] = await Promise.all([
    prisma.artist.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { releases: true } } },
    }),
    getUserUsage(user.id, user.planId),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Catalog</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
            Artists
          </h1>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <UsageMeter
          label="Artist slots"
          used={usage.artistsUsed}
          limit={usage.artistsLimit}
        />
        {!usage.canCreateArtist ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Limit reached.{" "}
            <Link
              href="/dashboard/subscription"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              Upgrade your plan
            </Link>{" "}
            to add more artists.
          </p>
        ) : null}
      </section>

      {usage.canCreateArtist ? <CreateArtistForm /> : null}

      <section className="rounded-xl border border-border bg-card">
        {artists.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="font-semibold">No artists yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Add an artist to attach releases.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {artists.map((artist) => (
              <li key={artist.id}>
                <Link
                  href={`/dashboard/artists/${artist.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {artist.name}
                      {artist.locked ? (
                        <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                          Locked
                        </span>
                      ) : null}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {artist._count.releases} release
                      {artist._count.releases === 1 ? "" : "s"}
                      {artist.location ? ` · ${artist.location}` : ""}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-primary">View</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
