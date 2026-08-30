import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { proxyLabelGridMedia } from "@/lib/labelgrid/media-proxy";
import { resolveTrackAudioUrl } from "@/lib/labelgrid/track-audio";

type Params = { params: Promise<{ id: string; trackId: string }> };

async function findTrack(id: string, trackId: string) {
  const gate = await requirePermissionApi("releases.read");
  if ("error" in gate) return { error: gate.error, status: gate.status };
  const track = await prisma.track.findFirst({
    where: { id: trackId, releaseId: id },
    select: { labelgridId: true },
  });
  if (!track?.labelgridId) return { error: "Audio is not available." as const, status: 404 as const };
  return { labelgridId: track.labelgridId };
}

export async function GET(request: Request, { params }: Params) {
  const { id, trackId } = await params;
  const found = await findTrack(id, trackId);
  if ("error" in found) return NextResponse.json({ error: found.error }, { status: found.status });
  const resolved = await resolveTrackAudioUrl(found.labelgridId);
  if (!resolved.ok) {
    return NextResponse.json(
      {
        error:
          resolved.status === 404
            ? "Audio is not available."
            : "Could not retrieve audio from LabelGrid.",
      },
      { status: resolved.status }
    );
  }
  return proxyLabelGridMedia(request, resolved.url);
}

/** Status-only check the player uses to decide what to show without downloading the file. */
export async function HEAD(_request: Request, { params }: Params) {
  const { id, trackId } = await params;
  const found = await findTrack(id, trackId);
  if ("error" in found) return new NextResponse(null, { status: found.status });
  const resolved = await resolveTrackAudioUrl(found.labelgridId);
  return new NextResponse(null, { status: resolved.ok ? 200 : resolved.status });
}
