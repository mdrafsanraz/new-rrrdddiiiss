import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermissionApi } from "@/lib/auth/admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { prisma } from "@/lib/db";
import { getRelease } from "@/lib/labelgrid";
import { listTracksForRelease, unwrapLabelGridData } from "@/lib/labelgrid/catalog";
import type { ReleaseData } from "@/lib/labelgrid/types";
import { mapLabelGridStatusToLocalStatus } from "@/lib/releases/status";

const schema = z.object({ userEmail: z.string().trim().email().max(120) });
type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const gate = await requirePermissionApi("releases.moderate");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  try {
    const { id } = await params;
    if (!/^\d+$/.test(id)) return NextResponse.json({ error: "Invalid LabelGrid release ID." }, { status: 400 });
    const input = schema.parse(await request.json());
    const [providerRaw, providerTracks, user, existingMapping] = await Promise.all([
      getRelease(id),
      listTracksForRelease(Number(id)),
      prisma.user.findFirst({ where: { email: { equals: input.userEmail, mode: "insensitive" }, role: "user" }, select: { id: true, name: true, email: true } }),
      prisma.release.findFirst({ where: { labelgridId: id }, select: { id: true, title: true } }),
    ]);
    if (!user) return NextResponse.json({ error: "No RDISTRO user account was found for that email." }, { status: 404 });
    if (existingMapping) return NextResponse.json({ error: `This LabelGrid release is already mapped to ${existingMapping.title}.` }, { status: 409 });
    const provider = unwrapLabelGridData<ReleaseData>(providerRaw);
    const exactUpcMatches = provider.barcode_number ? await prisma.release.findMany({ where: { userId: user.id, upc: provider.barcode_number, labelgridId: null }, include: { tracks: { select: { id: true, isrc: true, labelgridId: true } } }, take: 2 }) : [];
    if (exactUpcMatches.length > 1) return NextResponse.json({ error: "This user has multiple unmapped releases with the same UPC. Resolve the duplicate before mapping." }, { status: 409 });
    const target = exactUpcMatches[0] ?? null;
    const providerIsrcCounts = new Map<string, number>();
    for (const track of providerTracks) { if (track.isrc) { const isrc = track.isrc.trim().toUpperCase(); providerIsrcCounts.set(isrc, (providerIsrcCounts.get(isrc) ?? 0) + 1); } }
    const providerTracksByIsrc = new Map(providerTracks.filter((track) => track.isrc && providerIsrcCounts.get(track.isrc.trim().toUpperCase()) === 1).map((track) => [track.isrc!.trim().toUpperCase(), track]));
    const providerTrackIds = providerTracks.map((track) => String(track.id));
    const conflictingTracks = providerTrackIds.length ? await prisma.track.findMany({ where: { labelgridId: { in: providerTrackIds } }, select: { labelgridId: true, releaseId: true } }) : [];
    const conflictingIds = new Set(conflictingTracks.map((track) => track.labelgridId));
    const trackMappings = target?.tracks.flatMap((track) => {
      if (!track.isrc || track.labelgridId) return [];
      const providerTrack = providerTracksByIsrc.get(track.isrc.trim().toUpperCase());
      if (!providerTrack || conflictingIds.has(String(providerTrack.id))) return [];
      return [{ localTrackId: track.id, labelgridId: String(providerTrack.id) }];
    }) ?? [];

    const title = provider.title?.trim() || provider.titles?.[0]?.text?.trim() || `LabelGrid release ${id}`;
    const primaryArtist = provider.artists?.find((row) => row.artist?.artist_name?.trim())?.artist;
    const releaseDate = provider.release_date ? new Date(`${provider.release_date}T00:00:00.000Z`) : null;
    const status = mapLabelGridStatusToLocalStatus(provider.review_status, provider.delivery_status) ?? "draft";
    const result = await prisma.$transaction(async (tx) => {
      const raced = await tx.release.findFirst({ where: { labelgridId: id }, select: { id: true } });
      if (raced) throw new Error("MAPPING_CONFLICT");
      if (target) {
        await tx.release.update({ where: { id: target.id }, data: { labelgridId: id, labelgridReviewStatus: provider.review_status ?? null, deliveryState: provider.delivery_status ?? null, artworkUrl: provider.front_cover?.url ?? target.artworkUrl, lastSyncedAt: new Date() } });
        for (const mapping of trackMappings) await tx.track.update({ where: { id: mapping.localTrackId }, data: { labelgridId: mapping.labelgridId } });
        await tx.releaseActivity.create({ data: { releaseId: target.id, type: "note", title: "LabelGrid release assigned", description: `Assigned LabelGrid release ${id} to ${user.email}. Reused the exact UPC match and mapped ${trackMappings.length} track${trackMappings.length === 1 ? "" : "s"} by ISRC.`, actorUserId: gate.admin.id, metadataJson: JSON.stringify({ labelgridId: id, userId: user.id, trackMappings, reusedExactUpcMatch: true }) } });
        return { id: target.id, title: target.title, mappedTracks: trackMappings.length, imported: false };
      }
      let artistId: string | null = null;
      if (primaryArtist?.artist_name?.trim()) {
        const existingArtist = primaryArtist.id ? await tx.artist.findFirst({ where: { userId: user.id, labelgridId: String(primaryArtist.id) }, select: { id: true } }) : null;
        artistId = existingArtist?.id ?? (await tx.artist.create({ data: { userId: user.id, name: primaryArtist.artist_name.trim(), labelgridId: primaryArtist.id ? String(primaryArtist.id) : null, locked: true, lockedAt: new Date() }, select: { id: true } })).id;
      }
      const created = await tx.release.create({ data: { userId: user.id, artistId, title, catalogNumber: provider.cat ?? "", upc: provider.barcode_number ?? null, releaseDate: releaseDate && !Number.isNaN(releaseDate.getTime()) ? releaseDate : null, contentType: provider.content_type ?? "Single", artworkAiUsage: provider.artwork_ai_usage ?? "none", primaryGenre: provider.primary_genre?.name ?? null, explicit: provider.explicit ?? "off", status, permanentlyLocked: status === "labelgrid_rejected", labelgridId: id, labelgridReviewStatus: provider.review_status ?? null, deliveryState: provider.delivery_status ?? null, artworkUrl: provider.front_cover?.url ?? null, storesJson: JSON.stringify(provider.dsp_configs?.filter((config) => config.enabled).map((config) => config.distro_outlet_id) ?? []), lastSyncedAt: new Date(), metadataJson: JSON.stringify({ importedFromLabelGrid: true, providerPublicId: provider.public_id, mixVersion: provider.mix_version ?? provider.mix_versions?.[0]?.text ?? null, clineYear: provider.cline_year ?? null, clineName: provider.cline_name ?? null, plineYear: provider.pline_year ?? null, plineName: provider.pline_name ?? null }), tracks: { create: providerTracks.map((track, index) => ({ userId: user.id, title: track.title?.trim() || track.titles?.[0]?.text?.trim() || `Track ${track.track_num ?? index + 1}`, isrc: track.isrc ?? null, trackNumber: track.track_num ?? index + 1, labelgridId: String(track.id), metadataJson: JSON.stringify({ importedFromLabelGrid: true, mixVersion: track.mix_version ?? track.mix_versions?.[0]?.text ?? null, explicit: track.explicit ?? null }) })) }, activities: { create: { type: "created", title: "LabelGrid release assigned", description: `Imported LabelGrid release ${id} for ${user.email}.`, actorUserId: gate.admin.id, metadataJson: JSON.stringify({ labelgridId: id, userId: user.id, importedFromLabelGrid: true }) } } }, select: { id: true, title: true, _count: { select: { tracks: true } } } });
      return { id: created.id, title: created.title, mappedTracks: created._count.tracks, imported: true };
    });
    await writeAuditLog({ actorUserId: gate.admin.id, action: "labelgrid_sync", targetType: "release", targetId: result.id, summary: `Assigned LabelGrid release ${id} to ${user.email}`, metadata: { labelgridId: id, userId: user.id, imported: result.imported, mappedTracks: result.mappedTracks } });
    return NextResponse.json({ ok: true, releaseId: result.id, mappedTracks: result.mappedTracks, imported: result.imported });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid mapping." }, { status: 400 });
    if (error instanceof Error && error.message === "MAPPING_CONFLICT") return NextResponse.json({ error: "This LabelGrid release was mapped by another request." }, { status: 409 });
    console.error("[admin-labelgrid] release mapping failed", error);
    return NextResponse.json({ error: "Could not map the LabelGrid release." }, { status: 500 });
  }
}
