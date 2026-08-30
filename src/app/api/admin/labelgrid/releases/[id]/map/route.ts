import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermissionApi } from "@/lib/auth/admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { prisma } from "@/lib/db";
import { getRelease } from "@/lib/labelgrid";
import { listTracksForRelease, unwrapLabelGridData } from "@/lib/labelgrid/catalog";
import type { ReleaseData } from "@/lib/labelgrid/types";

const schema = z.object({ localReleaseId: z.string().min(1) });
type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const gate = await requirePermissionApi("releases.moderate");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  try {
    const { id } = await params;
    if (!/^\d+$/.test(id)) return NextResponse.json({ error: "Invalid LabelGrid release ID." }, { status: 400 });
    const input = schema.parse(await request.json());
    const [providerRaw, providerTracks, target, existingMapping] = await Promise.all([
      getRelease(id),
      listTracksForRelease(Number(id)),
      prisma.release.findUnique({ where: { id: input.localReleaseId }, include: { tracks: { select: { id: true, title: true, isrc: true, labelgridId: true } } } }),
      prisma.release.findFirst({ where: { labelgridId: id }, select: { id: true, title: true } }),
    ]);
    if (!target) return NextResponse.json({ error: "RDISTRO release not found." }, { status: 404 });
    if (existingMapping && existingMapping.id !== target.id) return NextResponse.json({ error: `This LabelGrid release is already mapped to ${existingMapping.title}.` }, { status: 409 });
    if (target.labelgridId && target.labelgridId !== id) return NextResponse.json({ error: "The selected RDISTRO release is already mapped to another LabelGrid release." }, { status: 409 });

    const provider = unwrapLabelGridData<ReleaseData>(providerRaw);
    const providerIsrcCounts = new Map<string, number>();
    for (const track of providerTracks) { if (track.isrc) { const isrc = track.isrc.trim().toUpperCase(); providerIsrcCounts.set(isrc, (providerIsrcCounts.get(isrc) ?? 0) + 1); } }
    const providerTracksByIsrc = new Map(providerTracks.filter((track) => track.isrc && providerIsrcCounts.get(track.isrc.trim().toUpperCase()) === 1).map((track) => [track.isrc!.trim().toUpperCase(), track]));
    const providerTrackIds = providerTracks.map((track) => String(track.id));
    const conflictingTracks = providerTrackIds.length ? await prisma.track.findMany({ where: { labelgridId: { in: providerTrackIds }, releaseId: { not: target.id } }, select: { labelgridId: true } }) : [];
    const conflictingIds = new Set(conflictingTracks.map((track) => track.labelgridId));
    const trackMappings = target.tracks.flatMap((track) => {
      if (!track.isrc || track.labelgridId) return [];
      const providerTrack = providerTracksByIsrc.get(track.isrc.trim().toUpperCase());
      if (!providerTrack || conflictingIds.has(String(providerTrack.id))) return [];
      return [{ localTrackId: track.id, labelgridId: String(providerTrack.id) }];
    });

    await prisma.$transaction([
      prisma.release.update({ where: { id: target.id }, data: { labelgridId: id, labelgridReviewStatus: provider.review_status ?? null, artworkUrl: provider.front_cover?.url ?? target.artworkUrl, lastSyncedAt: new Date() } }),
      ...trackMappings.map((mapping) => prisma.track.update({ where: { id: mapping.localTrackId }, data: { labelgridId: mapping.labelgridId } })),
      prisma.releaseActivity.create({ data: { releaseId: target.id, type: "note", title: "LabelGrid release mapped", description: `Mapped LabelGrid release ${id}. ${trackMappings.length} track mapping${trackMappings.length === 1 ? "" : "s"} matched by ISRC.`, actorUserId: gate.admin.id, metadataJson: JSON.stringify({ labelgridId: id, trackMappings }) } }),
    ]);
    await writeAuditLog({ actorUserId: gate.admin.id, action: "labelgrid_sync", targetType: "release", targetId: target.id, summary: `Mapped LabelGrid release ${id} to ${target.title}`, metadata: { labelgridId: id, userId: target.userId, trackMappings } });
    return NextResponse.json({ ok: true, releaseId: target.id, mappedTracks: trackMappings.length });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid mapping." }, { status: 400 });
    console.error("[admin-labelgrid] release mapping failed", error);
    return NextResponse.json({ error: "Could not map the LabelGrid release." }, { status: 500 });
  }
}
