import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { requirePermissionApi } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { getAudioUploadStatus } from "@/lib/labelgrid";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import { parseJsonObject, type TrackMetadata } from "@/lib/releases/constants";

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

    tMeta.audioProcessing = false;
    tMeta.audioProcessingError =
      attempt.status === "failed" ? attempt.error?.message ?? "Audio processing failed" : null;
    await prisma.track.update({
      where: { id: track.id },
      data: { metadataJson: JSON.stringify(tMeta) },
    });

    return NextResponse.json({
      status: attempt.status === "failed" ? "failed" : "ready",
      error: tMeta.audioProcessingError,
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
