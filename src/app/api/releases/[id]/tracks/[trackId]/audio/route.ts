import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getTrackFile } from "@/lib/labelgrid";
import { proxyLabelGridMedia } from "@/lib/labelgrid/media-proxy";
import type { FileData } from "@/lib/labelgrid/types";

type Params = { params: Promise<{ id: string; trackId: string }> };
export async function GET(request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, trackId } = await params;
  const track = await prisma.track.findFirst({ where: { id: trackId, releaseId: id, release: { userId: user.id } }, select: { labelgridId: true } });
  if (!track?.labelgridId) return NextResponse.json({ error: "Audio is not available." }, { status: 404 });
  try {
    // document.json: GET /tracks/{track}/files/{fileType} with stereo.
    const raw = await getTrackFile(track.labelgridId, "stereo");
    const file = raw && typeof raw === "object" && "data" in raw ? raw.data : raw as FileData;
    if (!file?.url) return NextResponse.json({ error: "Audio is not available." }, { status: 404 });
    return proxyLabelGridMedia(request, file.url);
  } catch (error) {
    console.error(`[media] audio lookup failed for track ${trackId}`, error);
    return NextResponse.json({ error: "Could not retrieve audio from LabelGrid." }, { status: 502 });
  }
}
