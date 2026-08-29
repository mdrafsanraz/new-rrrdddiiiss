import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { requirePermissionApi } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { getAudioUploadStatus, getTrackFile } from "@/lib/labelgrid";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import { parseJsonObject, type TrackMetadata } from "@/lib/releases/constants";

/** GET /tracks/{track}/files/stereo — best-effort, never throws. */
async function fetchStereoUrl(trackId: string): Promise<string | null> {
  try {
    const raw = await getTrackFile(trackId, "stereo");
    const file = raw && typeof raw === "object" && "data" in raw ? raw.data : raw;
    return file?.url ?? null;
  } catch {
    return null;
  }
}

type Params = { params: Promise<{ id: string; trackId: string }> };

/**
 * Poll LabelGrid for a queued audio upload (GET
 * /tracks/{track}/file-upload-attempts/{uploadAttempt}) and persist the
 * resolved status. The wizard calls this while a track shows "Processing…"
 * so the UI can flip to Ready / Upload failed without a full page reload.
 * Ownership is enforced via the local release row before touching LabelGrid.
 */
export async function POST(_request: Request, { params }: Params) {
  const { id, trackId } = await params;

  const user = await getSessionUser();
  const staff = await requirePermissionApi("releases.read");
  const isStaff = !("error" in staff);
  if (!user && !isStaff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const release = await prisma.release.findUnique({
    where: { id },
    include: { tracks: true },
  });
  if (!release) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!isStaff && (!user || release.userId !== user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const track = release.tracks.find((t) => t.id === trackId);
  if (!track) {
    return NextResponse.json({ error: "Track not found" }, { status: 404 });
  }

  const tMeta = parseJsonObject<TrackMetadata>(track.metadataJson);

  // Self-heal a track orphaned by a since-fixed bug in this route: an
  // upload attempt that resolved while audioProcessing got cleared without
  // ever capturing a URL, so nothing was left to poll it again. If
  // LabelGrid actually has the file, one more direct check can still
  // recover it instead of leaving it stuck "not found" forever.
  if (
    isLabelGridLive() &&
    track.labelgridId &&
    !track.audioUrl &&
    !tMeta.audioProcessing &&
    !tMeta.audioProcessingError &&
    tMeta.audioUploadAttemptId
  ) {
    const recovered = await fetchStereoUrl(track.labelgridId);
    if (recovered) {
      await prisma.track.update({
        where: { id: track.id },
        data: { audioUrl: recovered },
      });
      return NextResponse.json({ status: "ready", error: null, audioUrl: recovered });
    }
  }

  if (
    !isLabelGridLive() ||
    !track.labelgridId ||
    !tMeta.audioUploadAttemptId ||
    !tMeta.audioProcessing
  ) {
    return NextResponse.json({
      status: tMeta.audioProcessingError
        ? "failed"
        : track.audioUrl
          ? "ready"
          : "none",
      error: tMeta.audioProcessingError ?? null,
      audioUrl: track.audioUrl ?? null,
    });
  }

  try {
    const attempt = await getAudioUploadStatus(
      track.labelgridId,
      tMeta.audioUploadAttemptId
    );

    if (attempt.status === "queued" || attempt.status === "processing") {
      return NextResponse.json({ status: "processing", error: null });
    }

    if (attempt.status === "failed") {
      tMeta.audioProcessing = false;
      tMeta.audioProcessingError = attempt.error?.message ?? "Audio processing failed";
      await prisma.track.update({
        where: { id: track.id },
        data: { metadataJson: JSON.stringify(tMeta) },
      });
      return NextResponse.json({
        status: "failed",
        error: tMeta.audioProcessingError,
        audioUrl: track.audioUrl ?? null,
      });
    }

    // The upload attempt itself resolved (no longer queued/processing), but
    // LabelGrid's files/stereo GET can lag a beat behind that — don't
    // declare victory until it actually resolves a URL. Reporting "ready"
    // here without one would persist audioProcessing=false and permanently
    // stop polling (the early-return above then reports "none" forever,
    // since nothing else ever retries), orphaning the track's audio.
    const audioUrl = await fetchStereoUrl(track.labelgridId);
    if (!audioUrl) {
      return NextResponse.json({ status: "processing", error: null });
    }

    tMeta.audioProcessing = false;
    tMeta.audioProcessingError = null;
    await prisma.track.update({
      where: { id: track.id },
      data: { metadataJson: JSON.stringify(tMeta), audioUrl },
    });

    return NextResponse.json({
      status: "ready",
      error: null,
      audioUrl,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not check audio processing status",
      },
      { status: 502 }
    );
  }
}
