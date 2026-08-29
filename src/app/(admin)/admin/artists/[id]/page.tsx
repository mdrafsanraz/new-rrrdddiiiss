import Link from "next/link";
import { notFound } from "next/navigation";
import { EditArtistNameForm } from "@/components/admin/edit-artist-name-form";
import { LoginAsUserButton } from "@/components/admin/login-as-user-button";
import { AdminStatusBadge } from "@/components/admin/status-badges";
import { formatDistanceToNow, formatShortDate } from "@/lib/admin/format";
import { requirePermission } from "@/lib/auth/admin";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { getConfiguredPlan, planLabel } from "@/lib/plans";
import { getArtist } from "@/lib/labelgrid";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import type { ArtistData } from "@/lib/labelgrid/types";

type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Props) { const { id } = await params; const artist = await prisma.artist.findUnique({ where: { id }, select: { name: true } }); return { title: artist ? `${artist.name} | Admin` : "Artist | Admin" }; }

export default async function AdminArtistDetailPage({ params }: Props) {
  const admin = await requirePermission("artists.read");
  const { id } = await params;
  const artist = await prisma.artist.findUnique({ where: { id }, include: {
    user: { select: { id: true, name: true, email: true, planId: true, createdAt: true, _count: { select: { artists: true, releases: true } } } },
    releases: { orderBy: { updatedAt: "desc" }, include: { _count: { select: { tracks: true } }, activities: { orderBy: { createdAt: "desc" }, take: 8 } } },
  } });
  if (!artist) notFound();
  let providerArtist: ArtistData | null = null;
  let providerUnavailable = false;
  if (artist.labelgridId && isLabelGridLive()) {
    try {
      providerArtist = (await getArtist(artist.labelgridId)).data;
    } catch (error) {
      providerUnavailable = true;
      console.error("[admin/artists/detail] LabelGrid artist fetch failed", error);
    }
  }
  const tracks = artist.releases.reduce((sum, release) => sum + release._count.tracks, 0);
  const live = artist.releases.filter((release) => release.status === "live").length;
  const limit = (await getConfiguredPlan(artist.user.planId)).artists;
  const activities = artist.releases.flatMap((release) => release.activities.map((activity) => ({ ...activity, releaseTitle: release.title }))).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 24);
  const canEdit = hasPermission(admin.role, "users.write");
  const canImpersonate = hasPermission(admin.role, "users.impersonate");

  return <div className="space-y-5">
    <header className="flex flex-wrap items-start gap-5 border-b border-border pb-5"><div className="grid size-24 shrink-0 place-items-center border border-border bg-foreground text-4xl font-semibold text-background">{artist.name.trim().charAt(0).toUpperCase() || "A"}</div><div className="min-w-0 flex-1"><Link href="/admin/artists" className="text-xs font-medium text-muted-foreground hover:underline">Back to artists</Link><div className="mt-2 flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold tracking-tight">{artist.name}</h1><span className={`px-2 py-1 text-[10px] font-semibold ${artist.locked ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`}>{artist.locked ? "Name protected" : "Editable"}</span></div><p className="mt-1 text-sm text-muted-foreground">Owned by {artist.user.name} / created {formatShortDate(artist.createdAt)}</p></div><div className="flex flex-wrap gap-2">{canEdit ? <EditArtistNameForm artistId={artist.id} initialName={artist.name} /> : null}{canImpersonate ? <LoginAsUserButton userId={artist.user.id} userName={artist.user.name} /> : null}</div></header>
    <section className="grid border border-border bg-card sm:grid-cols-2 xl:grid-cols-5"><Metric label="Releases" value={String(artist.releases.length)} /><Metric label="Tracks" value={String(tracks)} /><Metric label="Live releases" value={String(live)} /><Metric label="Artist slots" value={`${artist.user._count.artists} / ${limit ?? "Unlimited"}`} /><Metric label="LabelGrid ID" value={artist.labelgridId ?? "Not synced"} /></section>
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]"><main className="space-y-5">
      <Section title="Artist profile"><dl className="grid gap-3 text-sm sm:grid-cols-2"><Row label="Display name" value={providerArtist?.artist_name ?? artist.name} /><Row label="Legal name" value={providerArtist?.full_name ?? artist.fullName ?? "Not provided"} /><Row label="Contact email" value={providerArtist?.email ?? artist.email ?? "Not provided"} /><Row label="Location" value={providerArtist?.location ?? artist.location ?? "Not provided"} /><Row label="LabelGrid artist ID" value={artist.labelgridId ?? "Not synced"} /><Row label="Last updated locally" value={formatShortDate(artist.updatedAt)} /></dl>{providerUnavailable ? <p className="mt-4 border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">LabelGrid artist data is temporarily unavailable. Provider profiles are not being replaced with local values.</p> : null}{(providerArtist?.bio_short ?? artist.bioShort) ? <div className="mt-4 border-t border-border pt-4"><p className="text-xs font-semibold text-muted-foreground">Biography</p><p className="mt-2 text-sm leading-6">{providerArtist?.bio_short ?? artist.bioShort}</p></div> : null}</Section>
      <Section title="LabelGrid platform profiles"><p className="mb-4 text-xs text-muted-foreground">Read directly from the LabelGrid ArtistData resource documented in document.json.</p>{!artist.labelgridId ? <p className="text-sm text-muted-foreground">This artist has not been created in LabelGrid yet.</p> : providerUnavailable ? <p className="text-sm text-muted-foreground">Provider profiles could not be loaded.</p> : <dl className="grid gap-3 text-sm sm:grid-cols-2">{platformProfiles(providerArtist).map(([label, url]) => <Row key={label} label={label} value={url ? <a href={url} target="_blank" rel="noreferrer" className="font-medium hover:underline">Open profile</a> : "Not provided"} />)}<Row label="Spotify artist ID" value={providerArtist?.spotify_artist_id ?? "Not provided"} /><Row label="Apple artist ID" value={providerArtist?.apple_artist_id ?? "Not provided"} /></dl>}</Section>
      <Section title="Release catalog">{!artist.releases.length ? <p className="text-sm text-muted-foreground">This artist has no releases.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="text-[10px] uppercase tracking-wide text-muted-foreground"><tr><th className="pb-2">Release</th><th className="pb-2">Status</th><th className="pb-2">Tracks</th><th className="pb-2">Release date</th><th className="pb-2 text-right">Action</th></tr></thead><tbody className="divide-y divide-border">{artist.releases.map((release) => <tr key={release.id}><td className="py-3 font-medium">{release.title}</td><td className="py-3"><AdminStatusBadge status={release.status} /></td><td className="py-3 text-xs">{release._count.tracks}</td><td className="py-3 text-xs text-muted-foreground">{formatShortDate(release.releaseDate)}</td><td className="py-3 text-right"><Link href={`/admin/releases/${release.id}`} className="text-xs font-semibold hover:underline">Review</Link></td></tr>)}</tbody></table></div>}</Section>
      <Section title="Recent catalog activity">{!activities.length ? <p className="text-sm text-muted-foreground">No release activity has been recorded for this artist.</p> : <ol className="divide-y divide-border">{activities.map((activity) => <li key={activity.id} className="grid gap-1 py-3 sm:grid-cols-[140px_1fr]"><time className="text-[10px] text-muted-foreground">{formatDistanceToNow(activity.createdAt)}</time><div><p className="text-sm font-medium">{activity.title}</p><p className="text-xs text-muted-foreground">{activity.releaseTitle}{activity.description ? ` / ${activity.description}` : ""}</p></div></li>)}</ol>}</Section>
    </main><aside className="space-y-5 xl:sticky xl:top-20 xl:self-start"><Section title="Owner account"><Link href={`/admin/users/${artist.user.id}`} className="font-semibold hover:underline">{artist.user.name}</Link><p className="mt-1 text-xs text-muted-foreground">{artist.user.email}</p><dl className="mt-4 space-y-2 text-sm"><Row label="Plan" value={planLabel(artist.user.planId)} /><Row label="Artist usage" value={`${artist.user._count.artists} of ${limit ?? "Unlimited"}`} /><Row label="Total releases" value={String(artist.user._count.releases)} /><Row label="Registered" value={formatShortDate(artist.user.createdAt)} /></dl><p className="mt-4 border-t border-border pt-3 text-[11px] text-muted-foreground">This artist has one owning account in the current data model.</p></Section></aside></div>
  </div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="border border-border bg-card"><div className="border-b border-border px-4 py-3"><h2 className="text-sm font-semibold">{title}</h2></div><div className="p-4">{children}</div></section>; }
function Row({ label, value }: { label: string; value: React.ReactNode }) { return <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{label}</dt><dd className="max-w-[60%] break-words text-right font-medium">{value}</dd></div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="border-b border-border px-4 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 truncate text-lg font-semibold tabular-nums">{value}</p></div>; }
function platformProfiles(artist: ArtistData | null): [string, string | null | undefined][] { return [["Spotify", artist?.spotify_url], ["Apple Music", artist?.applemusic_url], ["YouTube", artist?.youtube_url], ["YouTube Music", artist?.youtubemusic_url], ["Beatport", artist?.beatport_url], ["Amazon Music", artist?.amazon_url], ["Deezer", artist?.deezer_url], ["Tidal", artist?.tidal_url], ["SoundCloud", artist?.soundcloud_url], ["Bandcamp", artist?.bandcamp_url]]; }
