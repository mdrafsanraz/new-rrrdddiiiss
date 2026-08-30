import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getRelease } from "@/lib/labelgrid";
import { unwrapLabelGridData } from "@/lib/labelgrid/catalog";
import { proxyLabelGridMedia } from "@/lib/labelgrid/media-proxy";
import type { ReleaseData } from "@/lib/labelgrid/types";

type Params = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const release = await prisma.release.findFirst({ where: { id, userId: user.id }, select: { labelgridId: true } });
  if (!release?.labelgridId) return NextResponse.json({ error: "Artwork is not available." }, { status: 404 });
  try {
    // document.json: GET /releases/{release}; artwork is front_cover.url.
    const live = unwrapLabelGridData<ReleaseData>(await getRelease(release.labelgridId));
    if (!live.front_cover?.url) return NextResponse.json({ error: "Artwork is not available." }, { status: 404 });
    return proxyLabelGridMedia(request, live.front_cover.url);
  } catch (error) {
    console.error(`[media] artwork lookup failed for release ${id}`, error);
    return NextResponse.json({ error: "Could not retrieve artwork from LabelGrid." }, { status: 502 });
  }
}
