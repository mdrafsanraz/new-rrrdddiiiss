import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, LinkSimple, Warning } from "@phosphor-icons/react/dist/ssr";
import { MapLabelGridReleaseForm } from "@/components/admin/map-labelgrid-release-form";
import { ProviderArtwork } from "@/components/admin/provider-artwork";
import { ProviderAudioPlayer } from "@/components/admin/provider-audio-player";
import { requirePermission } from "@/lib/auth/admin";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { LabelGridApiError } from "@/lib/labelgrid/client";
import { fetchLiveRelease } from "@/lib/labelgrid/live-release";

type Props = { params: Promise<{ id: string }> };

export default async function UnmappedLabelGridReleasePage({ params }: Props) {
  const admin = await requirePermission("releases.read");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const mapped = await prisma.release.findFirst({ where: { labelgridId: id }, select: { id: true } });
  if (mapped) redirect(`/admin/releases/${mapped.id}`);

  let release;
  try { release = await fetchLiveRelease("", Number(id)); }
  catch (error) { if (error instanceof LabelGridApiError && error.status === 404) notFound(); throw error; }

  return <div className="mx-auto max-w-[1400px] space-y-5"><header className="border-b border-border pb-5"><Link href="/admin/releases" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft /> LabelGrid catalog</Link><div className="mt-4 flex items-center gap-2 text-amber-700"><Warning weight="fill" /><span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em]">Unmapped provider release</span></div><h1 className="mt-2 text-3xl font-semibold tracking-tight">{release.title}</h1><p className="mt-1 text-sm text-muted-foreground">{release.artist ?? "Artist not supplied"} / LabelGrid {release.id}</p></header>
    <section className="grid gap-5 xl:grid-cols-[1fr_360px]"><div className="space-y-5"><section className="grid gap-5 border border-border bg-card p-5 md:grid-cols-[180px_1fr]"><ProviderArtwork labelgridId={release.id} alt={`${release.title} artwork`} className="aspect-square w-full object-cover" /><dl className="grid content-start gap-4 text-xs sm:grid-cols-2"><Item label="LabelGrid ID" value={String(release.id)} /><Item label="Review status" value={release.reviewStatus ?? "Not supplied"} /><Item label="UPC" value={release.barcodeNumber ?? "Not assigned"} /><Item label="Catalog number" value={release.catalogNumber ?? "Not assigned"} /><Item label="Release date" value={release.releaseDate ?? "Not scheduled"} /><Item label="Content type" value={release.contentType ?? "Not supplied"} /><Item label="Genre" value={release.primaryGenre ?? "Not supplied"} /><Item label="Territories" value={release.worldwide ? "Worldwide" : `${release.excludedTerritoryCodes.length} exclusions`} /></dl></section>
      <section className="border border-border bg-card"><div className="border-b border-border px-4 py-3"><h2 className="text-sm font-semibold">Provider tracks</h2><p className="mt-1 text-[11px] text-muted-foreground">Metadata and audio fetched directly from LabelGrid.</p></div><div className="divide-y divide-border">{release.tracks.map((track) => <article key={track.id} className="p-4"><div className="flex flex-wrap justify-between gap-3"><div><p className="text-sm font-semibold">{track.trackNumber ?? "?"}. {track.title}</p><p className="mt-1 text-xs text-muted-foreground">{track.artist ?? release.artist ?? "Artist not supplied"} / ISRC {track.isrc ?? "not assigned"} / LG {track.id}</p></div><span className="text-[10px] font-semibold capitalize text-muted-foreground">{track.audio?.status ?? (track.audio ? "Audio available" : "No audio")}</span></div>{track.audio ? <ProviderAudioPlayer labelgridTrackId={track.id} /> : null}<div className="mt-3 grid gap-3 text-xs sm:grid-cols-3"><Item label="Writers" value={track.writers.length ? track.writers.map((writer) => writer.name).join(", ") : "None supplied"} /><Item label="Contributors" value={track.contributors.length ? track.contributors.map((contributor) => contributor.name).join(", ") : "None supplied"} /><Item label="Publishers" value={track.publishers.length ? track.publishers.map((publisher) => publisher.name).join(", ") : "None supplied"} /></div></article>)}</div></section></div>
      <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start"><section className="border border-border bg-card p-4"><div className="flex items-center gap-2"><LinkSimple /><h2 className="text-sm font-semibold">Mapping state</h2></div><p className="mt-2 text-xs leading-5 text-muted-foreground">This release exists in the LabelGrid account but has no RDISTRO owner. Assigning it imports provider metadata under the selected user without recreating or editing the LabelGrid release.</p></section>{hasPermission(admin.role, "releases.moderate") ? <MapLabelGridReleaseForm labelgridId={release.id} /> : null}</aside>
    </section></div>;
}

function Item({ label, value }: { label: string; value: string }) { return <div className="min-w-0"><dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>; }
