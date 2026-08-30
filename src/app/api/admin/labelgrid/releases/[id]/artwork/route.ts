import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth/admin";
import { getRelease } from "@/lib/labelgrid";
import { unwrapLabelGridData } from "@/lib/labelgrid/catalog";
import { proxyLabelGridMedia } from "@/lib/labelgrid/media-proxy";
import type { ReleaseData } from "@/lib/labelgrid/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const gate = await requirePermissionApi("releases.read");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const { id } = await params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: "Invalid LabelGrid release ID." }, { status: 400 });
  try {
    const release = unwrapLabelGridData<ReleaseData>(await getRelease(id));
    if (!release.front_cover?.url) return NextResponse.json({ error: "Artwork is not available." }, { status: 404 });
    return proxyLabelGridMedia(request, release.front_cover.url);
  } catch (error) {
    console.error(`[admin-labelgrid] artwork lookup failed for release ${id}`, error);
    return NextResponse.json({ error: "Could not retrieve artwork from LabelGrid." }, { status: 502 });
  }
}
