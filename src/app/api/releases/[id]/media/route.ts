import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { requirePermissionApi } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import { pushMediaToLabelGrid } from "@/lib/labelgrid/sync-submit";
import { logReleaseActivity } from "@/lib/releases/activity";
import {
  canUserReplaceMedia,
  isFinalRejection,
} from "@/lib/releases/status";
import {
  loadStoredUpload,
  saveArtwork,
  saveAudio,
  type StoredUpload,
} from "@/lib/uploads/store";

type Params = { params: Promise<{ id: string }> };

/**
 * Replace cover artwork and/or track audio, then push to LabelGrid API
 * (POST /releases/{id}/photo + track stereo upload-url).
 * Owner (when canUserReplaceMedia) or staff with releases.moderate.
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

  const ownerId = release.userId;

  try {
    const form = await request.formData();
    const artworkFile = form.get("artwork");
    const audioFile = form.get("audio");
    const trackIdRaw = form.get("trackId");
    const trackId =
      typeof trackIdRaw === "string" && trackIdRaw.trim()
        ? trackIdRaw.trim()
        : null;

    let artworkUrl = release.artworkUrl;
    let audioUrl: string | null = null;
    let updatedTrackId: string | null = null;
    let artworkUpload: StoredUpload | null = null;
    let audioUpload: StoredUpload | null = null;
    const changed: string[] = [];

    if (artworkFile instanceof File && artworkFile.size > 0) {
      artworkUpload = await saveArtwork(ownerId, artworkFile);
      artworkUrl = artworkUpload.publicUrl;
      changed.push("artwork");
    }

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
      audioUpload = await saveAudio(ownerId, audioFile);
      audioUrl = audioUpload.publicUrl;
      updatedTrackId = track.id;
      changed.push(`audio (track ${track.trackNumber})`);
    }

    if (changed.length === 0) {
      return NextResponse.json(
        { error: "Choose artwork and/or audio to upload." },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      if (artworkUpload) {
        await tx.release.update({
          where: { id },
          data: { artworkUrl, syncError: null },
        });
      }
      if (updatedTrackId && audioUrl) {
        await tx.track.update({
          where: { id: updatedTrackId },
          data: { audioUrl },
        });
        if (!artworkUpload) {
          await tx.release.update({
            where: { id },
            data: { syncError: null },
          });
        }
      }
    });

    let labelgrid: {
      uploaded: boolean;
      releaseId?: number;
      trackId?: number;
      created?: boolean;
      error?: string;
    } = { uploaded: false };

    if (isLabelGridLive()) {
      const forSync = await prisma.release.findUnique({
        where: { id },
        include: {
          artist: true,
          tracks: { orderBy: { trackNumber: "asc" } },
        },
      });

      if (forSync) {
        // Existing LG draft: upload only files from this request.
        // New draft: need both artwork + audio (load the other from disk if needed).
        let artwork: StoredUpload | null = artworkUpload;
        let audio: StoredUpload | null = audioUpload;

        if (!forSync.labelgridId) {
          if (!artwork) artwork = await loadStoredUpload(forSync.artworkUrl);
          if (!audio) {
            const t =
              forSync.tracks.find((tr) => tr.id === updatedTrackId) ??
              forSync.tracks[0];
            audio = t ? await loadStoredUpload(t.audioUrl) : null;
          }
        }

        const pushResult = await pushMediaToLabelGrid({
          release: forSync,
          artwork,
          audio,
          localTrackId: updatedTrackId,
        });

        if (pushResult.ok) {
          labelgrid = {
            uploaded: true,
            releaseId: pushResult.releaseId,
            trackId: pushResult.trackId,
            created: pushResult.created,
          };
        } else {
          labelgrid = { uploaded: false, error: pushResult.error };
        }
      }
    }

    await logReleaseActivity({
      releaseId: id,
      type: "track_uploaded",
      title: labelgrid.uploaded
        ? "Media uploaded to LabelGrid"
        : "Media re-uploaded locally",
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

    if (labelgrid.error && !labelgrid.uploaded) {
      return NextResponse.json(
        {
          error: `Saved locally, but LabelGrid upload failed: ${labelgrid.error}`,
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
