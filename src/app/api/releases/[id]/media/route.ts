import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { requirePermissionApi } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import {
  syncReleaseToLabelGrid,
  type TrackAudioInput,
} from "@/lib/labelgrid/sync-submit";
import { logReleaseActivity } from "@/lib/releases/activity";
import {
  canUserReplaceMedia,
  isFinalRejection,
} from "@/lib/releases/status";
import { validateArtwork, validateAudio } from "@/lib/uploads/store";

type Params = { params: Promise<{ id: string }> };

/**
 * Replace cover artwork and/or track audio — uploaded straight to LabelGrid
 * (POST /releases/{id}/photo + track stereo upload-url); never staged on
 * our own disk. Owner (when canUserReplaceMedia) or staff with
 * releases.moderate.
 */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;

  const user = await getSessionUser();
  const staff = await requirePermissionApi("releases.moderate");
  const isStaff = !("error" in staff);

  if (!user && !isStaff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const release = await prisma.release.findUnique({
    where: { id },
    include: {
      artist: true,
      tracks: { orderBy: { trackNumber: "asc" } },
    },
  });
  if (!release) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isStaff) {
    if (!user || release.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (isFinalRejection(release) || !canUserReplaceMedia(release)) {
      return NextResponse.json(
        { error: "Media cannot be replaced for this release." },
        { status: 403 }
      );
    }
  } else if (isFinalRejection(release)) {
    return NextResponse.json(
      { error: "Permanently locked releases cannot receive new media." },
      { status: 403 }
    );
  }

  if (!isLabelGridLive()) {
    return NextResponse.json(
      { error: "Distributor is not configured — cannot accept media." },
      { status: 503 }
    );
  }

  try {
    const form = await request.formData();
    const artworkFile = form.get("artwork");
    const audioFile = form.get("audio");
    const trackIdRaw = form.get("trackId");
    const trackId =
      typeof trackIdRaw === "string" && trackIdRaw.trim()
        ? trackIdRaw.trim()
        : null;

    const changed: string[] = [];

    const artwork =
      artworkFile instanceof File && artworkFile.size > 0
        ? await validateArtwork(artworkFile)
        : null;
    if (artwork) changed.push("artwork");

    const audios: TrackAudioInput[] = [];
    if (audioFile instanceof File && audioFile.size > 0) {
      const track =
        (trackId
          ? release.tracks.find((t) => t.id === trackId)
          : release.tracks[0]) ?? null;
      if (!track) {
        return NextResponse.json(
          { error: "No track found to attach audio." },
          { status: 400 }
        );
      }
      const audio = await validateAudio(audioFile);
      audios.push({ localTrackId: track.id, upload: audio });
      changed.push(`audio (track ${track.trackNumber})`);
    }

    if (changed.length === 0) {
      return NextResponse.json(
        { error: "Choose artwork and/or audio to upload." },
        { status: 400 }
      );
    }

    const pushResult = await syncReleaseToLabelGrid({
      release,
      artwork,
      audios,
    });

    const labelgrid = pushResult.ok
      ? {
          uploaded: true,
          releaseId: pushResult.releaseId,
          trackId: pushResult.trackIds[0],
          created: pushResult.created,
          processingTrackIds: pushResult.processingTrackIds,
        }
      : { uploaded: false, error: pushResult.error };

    await logReleaseActivity({
      releaseId: id,
      type: "track_uploaded",
      title: labelgrid.uploaded
        ? "Media uploaded to LabelGrid"
        : "Media upload failed",
      description: labelgrid.error
        ? `${changed.join(", ")} — LabelGrid: ${labelgrid.error}`
        : changed.join(", "),
      actorUserId: isStaff ? staff.admin.id : user!.id,
      metadata: labelgrid,
    });

    const fresh = await prisma.release.findUnique({
      where: { id },
      include: { tracks: { orderBy: { trackNumber: "asc" } }, artist: true },
    });

    if (!pushResult.ok) {
      return NextResponse.json(
        {
          error: `LabelGrid upload failed: ${labelgrid.error}`,
          release: fresh,
          labelgrid,
          changed,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ release: fresh, changed, labelgrid });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Media upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
