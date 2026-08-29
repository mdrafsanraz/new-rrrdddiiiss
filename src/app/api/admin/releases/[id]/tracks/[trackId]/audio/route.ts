import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { getTrackFile } from "@/lib/labelgrid";
import { proxyLabelGridMedia } from "@/lib/labelgrid/media-proxy";
import type { FileData } from "@/lib/labelgrid/types";

type Params = { params: Promise<{ id: string; trackId: string }> };

export async function GET(request: Request, { params }: Params) {
  const gate = await requirePermissionApi("releases.read");
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id, trackId } = await params;
  const track = await prisma.track.findFirst({
    where: { id: trackId, releaseId: id },
    select: { labelgridId: true },
  });
  if (!track?.labelgridId) {
    return NextResponse.json({ error: "Audio is not available." }, { status: 404 });
  }

  try {
    const raw = await getTrackFile(track.labelgridId, "stereo");
    const file = raw && typeof raw === "object" && "data" in raw
      ? raw.data
      : raw as FileData;
    if (!file?.url) {
      return NextResponse.json({ error: "Audio is not available." }, { status: 404 });
    }
    return proxyLabelGridMedia(request, file.url);
  } catch (error) {
    console.error(`[admin-media] audio lookup failed for track ${trackId}`, error);
    return NextResponse.json(
      { error: "Could not retrieve audio from LabelGrid." },
      { status: 502 }
    );
  }
}
