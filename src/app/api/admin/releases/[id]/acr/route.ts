import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth/admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { prisma } from "@/lib/db";
import { identifyLabelGridAudio, isAcrCloudConfigured } from "@/lib/acrcloud/client";
import { resolveReleaseTrackLabelGridId, resolveTrackAudioUrl } from "@/lib/labelgrid/track-audio";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const gate = await requirePermissionApi("releases.qc");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  if (!isAcrCloudConfigured()) {
    return NextResponse.json({ error: "ACRCloud is not configured." }, { status: 503 });
  }

  const { id } = await params;
  const release = await prisma.release.findUnique({
    where: { id },
    select: {
      labelgridId: true,
      tracks: {
        orderBy: { trackNumber: "asc" },
        select: { id: true, title: true, trackNumber: true, isrc: true, labelgridId: true },
      },
    },
  });
  if (!release) return NextResponse.json({ error: "Release not found." }, { status: 404 });
  if (!release.labelgridId) {
    return NextResponse.json({ error: "Sync this release to LabelGrid before running ACR." }, { status: 409 });
  }

  const results = [];
  for (const track of release.tracks) {
    try {
      const labelgridTrackId = await resolveReleaseTrackLabelGridId({
        releaseLabelGridId: release.labelgridId,
        trackLabelGridId: track.labelgridId,
        trackNumber: track.trackNumber,
        isrc: track.isrc,
      });
      if (!labelgridTrackId) throw new Error("LabelGrid track mapping was not found.");
      const audio = await resolveTrackAudioUrl(labelgridTrackId);
      if (!audio.ok) throw new Error("LabelGrid audio is unavailable.");
      const identification = await identifyLabelGridAudio(audio.url);
      results.push({
        trackId: track.id,
        labelgridTrackId,
        trackNumber: track.trackNumber,
        submittedTitle: track.title,
        submittedIsrc: track.isrc,
        ...identification,
        error: null,
      });
    } catch (error) {
      results.push({
        trackId: track.id,
        labelgridTrackId: track.labelgridId,
        trackNumber: track.trackNumber,
        submittedTitle: track.title,
        submittedIsrc: track.isrc,
        recognized: false,
        message: "Scan failed",
        matches: [],
        error: error instanceof Error ? error.message : "ACR scan failed.",
      });
    }
  }

  await writeAuditLog({
    actorUserId: gate.admin.id,
    action: "release_acr_scan",
    targetType: "release",
    targetId: id,
    summary: `Ran ACRCloud recognition for ${results.length} track(s)`,
    metadata: {
      recognized: results.filter((result) => result.recognized).length,
      failed: results.filter((result) => result.error).length,
    },
  });

  return NextResponse.json({ results });
}
