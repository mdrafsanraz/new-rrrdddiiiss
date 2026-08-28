import Link from "next/link";
import { ArrowRight, Disc, LockKey, MapPin, UsersThree } from "@phosphor-icons/react/dist/ssr";
import { requireUser } from "@/lib/auth/session";
import { getUserUsage } from "@/lib/entitlements/server";
import { prisma } from "@/lib/db";
import { CreateArtistForm } from "@/components/dashboard/create-artist-form";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export const metadata = { title: "Artists" };

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export default async function ArtistsPage() {
  const user = await requireUser();
  const [artists, usage] = await Promise.all([
    prisma.artist.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { releases: true } },
        releases: { orderBy: { updatedAt: "desc" }, take: 1, select: { title: true, status: true } },
      },
    }),
    getUserUsage(user.id, user.planId),
  ]);
  const totalReleases = artists.reduce((sum, artist) => sum + artist._count.releases, 0);
  const lockedArtists = artists.filter((artist) => artist.locked).length;

  return (
    <div className="mx-auto max-w-[1200px] space-y-8">
      <header className="relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-7 sm:px-9 sm:py-9">
        <div className="pointer-events-none absolute right-0 top-0 size-[28rem] bg-[radial-gradient(circle_at_top_right,color-mix(in_oklch,var(--primary)_14%,transparent),transparent_64%)]" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Artist roster</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Your sound starts with an identity.</h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">Build artist profiles, connect releases, and keep every catalog identity organized in one place.</p>
          </div>
          {usage.canCreateArtist ? <CreateArtistForm /> : <Link href="/dashboard/settings/subscription" className={cn(buttonVariants(), "h-11 px-5")}>Upgrade to add artists <ArrowRight size={16} weight="bold" /></Link>}
        </div>
        <div className="relative mt-9 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
          <div className="bg-card px-5 py-4"><p className="text-xs text-muted-foreground">Artists</p><p className="mt-1 text-2xl font-semibold tabular-nums">{artists.length}</p></div>
          <div className="bg-card px-5 py-4"><p className="text-xs text-muted-foreground">Catalog releases</p><p className="mt-1 text-2xl font-semibold tabular-nums">{totalReleases}</p></div>
          <div className="bg-card px-5 py-4"><p className="text-xs text-muted-foreground">Profile capacity</p><p className="mt-1 text-2xl font-semibold tabular-nums">{usage.artistsLimit === null ? "Unlimited" : `${usage.artistsUsed}/${usage.artistsLimit}`}</p></div>
        </div>
      </header>

      {!usage.canCreateArtist ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/[0.045] px-5 py-4"><div><p className="text-sm font-semibold">Your artist slots are full</p><p className="mt-0.5 text-xs text-muted-foreground">Upgrade your plan to expand this roster.</p></div><Link href="/dashboard/settings/subscription" className="text-sm font-semibold text-primary hover:underline">Compare plans</Link></div> : null}

      <section>
        <div className="mb-4 flex items-end justify-between gap-4"><div><h2 className="text-xl font-semibold tracking-tight">Roster</h2><p className="mt-1 text-sm text-muted-foreground">{lockedArtists ? `${lockedArtists} profile${lockedArtists === 1 ? " is" : "s are"} locked after submission.` : "Profiles remain editable until their first submission."}</p></div></div>
        {artists.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card"><EmptyState icon={<UsersThree size={23} weight="duotone" />} title="Your roster is ready for its first artist" description="Create an artist profile, then start building their first release." action={usage.canCreateArtist ? <CreateArtistForm /> : undefined} /></div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {artists.map((artist, index) => (
              <Link key={artist.id} href={`/dashboard/artists/${artist.id}`} className="group relative min-h-64 overflow-hidden rounded-2xl border border-border bg-card p-5 transition-[transform,border-color,box-shadow] duration-500 ease-[var(--ease-rdistro)] hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_22px_60px_color-mix(in_oklch,var(--primary)_10%,transparent)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2" style={{ animationDelay: `${Math.min(index * 60, 300)}ms` }}>
                <div className="absolute -right-20 -top-20 size-52 rounded-full bg-primary/[0.045] transition-transform duration-700 group-hover:scale-125" />
                <div className="relative flex items-start justify-between"><div className="flex size-14 items-center justify-center rounded-2xl bg-foreground text-lg font-semibold tracking-tight text-background shadow-sm">{initials(artist.name)}</div>{artist.locked ? <span className="flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground"><LockKey size={11} weight="bold" /> Locked</span> : <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">Editable</span>}</div>
                <div className="relative mt-7"><h3 className="truncate text-xl font-semibold tracking-[-0.03em]">{artist.name}</h3><div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">{artist.location ? <span className="flex items-center gap-1"><MapPin size={12} weight="bold" />{artist.location}</span> : null}<span className="flex items-center gap-1"><Disc size={12} weight="bold" />{artist._count.releases} release{artist._count.releases === 1 ? "" : "s"}</span></div>{artist.bioShort ? <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted-foreground">{artist.bioShort}</p> : <p className="mt-4 text-sm text-muted-foreground">No profile bio added yet.</p>}</div>
                <div className="absolute inset-x-5 bottom-5 flex items-center justify-between border-t border-border pt-4 text-xs"><span className="truncate text-muted-foreground">{artist.releases[0]?.title ? `Latest: ${artist.releases[0].title}` : "No releases yet"}</span><ArrowRight className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-1" weight="bold" /></div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
