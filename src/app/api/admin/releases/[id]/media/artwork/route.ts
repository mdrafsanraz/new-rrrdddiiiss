import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { getRelease } from "@/lib/labelgrid";
import { unwrapLabelGridData } from "@/lib/labelgrid/catalog";
import { proxyLabelGridMedia } from "@/lib/labelgrid/media-proxy";
import type { ReleaseData } from "@/lib/labelgrid/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const gate = await requirePermissionApi("releases.read");
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;
  const release = await prisma.release.findUnique({
    where: { id },
    select: { labelgridId: true },
  });
  if (!release?.labelgridId) {
    return NextResponse.json({ error: "Artwork is not available." }, { status: 404 });
  }

  try {
    const raw = await getRelease(release.labelgridId);
    const live = unwrapLabelGridData<ReleaseData>(raw);
    const url = live.front_cover?.url;
    if (!url) {
      return NextResponse.json({ error: "Artwork is not available." }, { status: 404 });
    }
    return proxyLabelGridMedia(request, url);
  } catch (error) {
    console.error(`[admin-media] artwork lookup failed for release ${id}`, error);
    return NextResponse.json(
      { error: "Could not retrieve artwork from LabelGrid." },
      { status: 502 }
    );
  }
}
