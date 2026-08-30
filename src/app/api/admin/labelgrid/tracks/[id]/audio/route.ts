import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth/admin";
import { proxyLabelGridMedia } from "@/lib/labelgrid/media-proxy";
import { resolveTrackAudioUrl } from "@/lib/labelgrid/track-audio";

type Params = { params: Promise<{ id: string }> };

async function checkAccess(id: string) {
  const gate = await requirePermissionApi("releases.read");
  if ("error" in gate) return { error: gate.error, status: gate.status };
  if (!/^\d+$/.test(id)) return { error: "Invalid LabelGrid track ID." as const, status: 400 as const };
  return { ok: true as const };
}

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const access = await checkAccess(id);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const resolved = await resolveTrackAudioUrl(id);
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
  const { id } = await params;
  const access = await checkAccess(id);
  if ("error" in access) return new NextResponse(null, { status: access.status });
  const resolved = await resolveTrackAudioUrl(id);
  return new NextResponse(null, { status: resolved.ok ? 200 : resolved.status });
}
