import { NextResponse } from "next/server";
import { z } from "zod";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import { getTrackFileUploadUrl, sanitizeUploadFilename } from "@/lib/labelgrid";
import { loadOwnedTrackForSubmit } from "@/lib/releases/submit-auth";

type Params = { params: Promise<{ id: string; trackId: string }> };

const bodySchema = z.object({ filename: z.string().min(1).max(255) });

/**
 * Stage 5a (Upload Audio — request URL). Returns a short-lived presigned
 * URL the browser PUTs the audio bytes to directly — that PUT sends no
 * Authorization header (confirmed against document.json), so the bytes
 * never round-trip through our server at all. Skips (no LabelGrid call)
 * if audioUrl is already set from a prior successful run.
 */
export async function POST(request: Request, { params }: Params) {
  const { id, trackId } = await params;
  const { user, track } = await loadOwnedTrackForSubmit(id, trackId);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!track) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isLabelGridLive()) {
    return NextResponse.json({ error: "LabelGrid is not configured." }, { status: 503 });
  }

  if (track.audioUrl) {
    return NextResponse.json({ ok: true, skipped: true });
  }
  if (!track.labelgridId || !/^\d+$/.test(track.labelgridId)) {
    return NextResponse.json(
      { error: "Run the Create Tracks stage first." },
      { status: 409 }
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing filename." }, { status: 400 });
  }

  try {
    const raw = await getTrackFileUploadUrl(
      track.labelgridId,
      "stereo",
      sanitizeUploadFilename(parsed.data.filename)
    );
    const payload =
      raw && typeof raw === "object" && "data" in raw
        ? (raw as { data: { upload_url: string; key: string } }).data
        : (raw as { upload_url: string; key: string });
    if (!payload?.upload_url || !payload?.key) {
      return NextResponse.json(
        { error: "LabelGrid did not return an upload URL for stereo audio." },
        { status: 502 }
      );
    }
    return NextResponse.json({
      ok: true,
      uploadUrl: payload.upload_url,
      key: payload.key,
    });
  } catch (error) {
    console.error("[submit/audio-upload-url]", id, trackId, error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not request an upload URL from LabelGrid.",
      },
      { status: 502 }
    );
  }
}
