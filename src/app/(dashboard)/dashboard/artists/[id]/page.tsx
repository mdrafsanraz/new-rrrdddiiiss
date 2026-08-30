/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Disc, LockKey, MapPin, Plus } from "@phosphor-icons/react/dist/ssr";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EditArtistForm } from "@/components/dashboard/edit-artist-form";
import { buttonVariants } from "@/components/ui/button-variants";
import { getUserFacingReleaseStatus } from "@/lib/releases/status";
import { cn } from "@/lib/utils";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import {
  fetchLiveReleaseSummary,
  withTimeout,
  type LiveReleaseSummary,
} from "@/lib/labelgrid/live-release";
import { DashboardProviderArtwork } from "@/components/dashboard/provider-media";

type Props = { params: Promise<{ id: string }> };
function firstLetter(name: string) { return name.trim().charAt(0).toUpperCase() || "A"; }

/** Same live-artwork overlay used on the releases list and dashboard home — LabelGrid is the source of truth for cover art. */
async function fetchLiveArtwork(
  labelgridIds: string[]
): Promise<Map<string, LiveReleaseSummary>> {
  if (!isLabelGridLive() || labelgridIds.length === 0) return new Map();
  const results = await Promise.allSettled(
    labelgridIds.map((id) => withTimeout(fetchLiveReleaseSummary(Number(id)), 4000))
  );
  const map = new Map<string, LiveReleaseSummary>();
  results.forEach((r, i) => {
    if (r.status === "fulfilled") map.set(labelgridIds[i], r.value);
  });
  return map;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const artist = await prisma.artist.findUnique({ where: { id }, select: { name: true } });
  return { title: artist?.name ?? "Artist" };
}

export default async function ArtistDetailPage({ params }: Props) {
  const user = await requireUser();
  const { id } = await params;
  const artist = await prisma.artist.findFirst({
    where: { id, userId: user.id },
    include: { releases: { orderBy: { updatedAt: "desc" }, include: { tracks: { select: { id: true } } } } },
  });
  if (!artist) notFound();
  const liveCount = artist.releases.filter((release) => getUserFacingReleaseStatus(release.status) === "live").length;
  const totalTracks = artist.releases.reduce((sum, release) => sum + release.tracks.length, 0);
  const liveArtworkByLabelgridId = await fetchLiveArtwork(
    artist.releases
      .map((release) => release.labelgridId)
      .filter((id): id is string => Boolean(id))
  );

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <Link href="/dashboard/artists" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft size={14} weight="bold" /> Artist roster</Link>

      <header className="relative overflow-hidden rounded-2xl border border-border bg-foreground text-background">
        <div className="absolute inset-0 bg-[linear-gradient(110deg,color-mix(in_oklch,var(--foreground)_98%,transparent)_20%,color-mix(in_oklch,var(--foreground)_76%,transparent))]" />
        <div className="relative grid gap-7 p-6 sm:p-9 lg:grid-cols-[auto_1fr_auto] lg:items-end">
          <div className="flex size-24 items-center justify-center overflow-hidden rounded-2xl border border-background/15 bg-background/10 text-6xl font-semibold leading-none shadow-2xl sm:size-32 sm:text-8xl" aria-hidden="true">{firstLetter(artist.name)}</div>
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Artist profile</p>{artist.locked ? <span className="flex items-center gap-1 rounded-full border border-background/15 bg-background/10 px-2.5 py-1 text-[10px] font-semibold text-background/70"><LockKey size={11} weight="bold" /> Name protected</span> : null}</div><h1 className="mt-3 truncate text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">{artist.name}</h1><div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-background/55">{artist.location ? <span className="flex items-center gap-1.5"><MapPin size={14} weight="bold" />{artist.location}</span> : null}<span>{artist.releases.length} release{artist.releases.length === 1 ? "" : "s"}</span><span>{totalTracks} track{totalTracks === 1 ? "" : "s"}</span></div></div>
          <Link href={`/dashboard/releases/new?artistId=${artist.id}`} className={cn(buttonVariants(), "h-11 bg-background px-5 text-foreground hover:bg-background/90")}><Plus size={16} weight="bold" /> New release</Link>
        </div>
        <div className="relative grid border-t border-background/10 sm:grid-cols-3"><div className="px-6 py-4 sm:px-9"><p className="text-[10px] uppercase tracking-wider text-background/40">Releases</p><p className="mt-1 text-xl font-semibold">{artist.releases.length}</p></div><div className="border-background/10 px-6 py-4 sm:border-x sm:px-9"><p className="text-[10px] uppercase tracking-wider text-background/40">Live catalog</p><p className="mt-1 text-xl font-semibold">{liveCount}</p></div><div className="px-6 py-4 sm:px-9"><p className="text-[10px] uppercase tracking-wider text-background/40">Profile state</p><p className="mt-1 text-xl font-semibold">{artist.locked ? "Name protected" : "Editable"}</p></div></div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
        <EditArtistForm artist={{ id: artist.id, name: artist.name, fullName: artist.fullName ?? "", email: artist.email ?? "", location: artist.location ?? "", bioShort: artist.bioShort ?? "", locked: artist.locked }} />
        <aside className="rounded-2xl border border-border bg-card p-6"><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Artist note</p><h2 className="mt-3 text-xl font-semibold tracking-tight">Profile story</h2><p className="mt-4 text-sm leading-7 text-muted-foreground">{artist.bioShort || "Add a short bio to keep context about this artist, their sound, and the identity behind the catalog."}</p>{artist.email || artist.fullName ? <div className="mt-7 space-y-3 border-t border-border pt-5 text-sm"><div><p className="text-xs text-muted-foreground">Legal name</p><p className="mt-1 font-medium">{artist.fullName || "Not provided"}</p></div><div><p className="text-xs text-muted-foreground">Contact</p><p className="mt-1 font-medium">{artist.email || "Not provided"}</p></div></div> : null}</aside>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Discography</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Release catalog</h2></div><Link href={`/dashboard/releases/new?artistId=${artist.id}`} className={cn(buttonVariants({ variant: "outline" }), "h-9 px-4")}><Plus size={14} weight="bold" /> Add release</Link></div>
        {artist.releases.length === 0 ? <div className="mt-6 rounded-xl border border-dashed border-border px-6 py-12 text-center"><div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground"><Disc size={22} weight="duotone" /></div><p className="mt-4 font-semibold">No releases yet</p><p className="mt-2 text-sm text-muted-foreground">Start this artist&apos;s catalog with a new release.</p></div> : <div className="mt-6 grid gap-3 md:grid-cols-2">{artist.releases.map((release) => { const liveArtwork = release.labelgridId ? liveArtworkByLabelgridId.get(release.labelgridId)?.coverUrl : undefined; const artworkUrl = liveArtwork ?? release.artworkUrl; return <Link key={release.id} href={`/dashboard/releases/${release.id}`} className="group flex items-center gap-4 rounded-xl border border-border p-3 transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-primary/30"><div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground">{liveArtwork ? <DashboardProviderArtwork releaseId={release.id} className="size-full object-cover" /> : artworkUrl ? <img src={artworkUrl} alt="" className="size-full object-cover" /> : <Disc size={20} weight="duotone" />}</div><div className="min-w-0 flex-1"><p className="truncate font-semibold">{release.title}</p><div className="mt-1 flex items-center gap-2"><StatusBadge status={release.status} /><span className="text-xs text-muted-foreground">{release.tracks.length} track{release.tracks.length === 1 ? "" : "s"}</span></div></div><ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" weight="bold" /></Link>; })}</div>}
      </section>
    </div>
  );
}
