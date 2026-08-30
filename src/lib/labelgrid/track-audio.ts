import { getTrack, getTrackFile } from "@/lib/labelgrid";
import { listTracksForRelease } from "@/lib/labelgrid/catalog";
import { LabelGridApiError } from "@/lib/labelgrid/client";
import type { FileData, TrackData } from "@/lib/labelgrid/types";

export type TrackAudioResolution =
  | { ok: true; url: string }
  | { ok: false; status: 404 | 502 };

/**
 * Prefer the master URL from GET /tracks/{track}/files/stereo. Some catalog
 * tracks do not expose that file endpoint even though LabelGrid can generate
 * playback from the master; document.json exposes that URL as
 * GET /tracks/{track} `.audio_preview_url`.
 */
export async function resolveTrackAudioUrl(
  labelgridTrackId: number | string
): Promise<TrackAudioResolution> {
  let stereoUrl: string | null = null;
  try {
    const raw = await getTrackFile(labelgridTrackId, "stereo");
    const file =
      raw && typeof raw === "object" && "data" in raw
        ? raw.data
        : (raw as FileData);
    stereoUrl = file?.url ?? null;
    if (stereoUrl) {
      try {
        const absolute = new URL(stereoUrl);
        if (absolute.protocol === "https:" || absolute.protocol === "http:") {
          return { ok: true, url: absolute.toString() };
        }
      } catch {
        // LabelGrid sandbox returns storage paths such as `labels/...mp3`.
        // Resolve those against the CDN origin exposed by the track preview.
      }
    }
  } catch (error) {
    if (!(error instanceof LabelGridApiError) || error.status !== 404) {
      console.error(`[track-audio] lookup failed for track ${labelgridTrackId}`, error);
      return { ok: false, status: 502 };
    }
  }

  try {
    const raw = await getTrack(labelgridTrackId);
    const track = raw?.data ?? (raw as unknown as TrackData);
    if (track.audio_preview_url) {
      if (stereoUrl) {
        const preview = new URL(track.audio_preview_url);
        const fullStereoUrl = new URL(stereoUrl.replace(/^\/+/, ""), `${preview.origin}/`);
        return { ok: true, url: fullStereoUrl.toString() };
      }
      return { ok: true, url: track.audio_preview_url };
    }
    return { ok: false, status: 404 };
  } catch (error) {
    if (error instanceof LabelGridApiError && error.status === 404) {
      return { ok: false, status: 404 };
    }
    console.error(`[track-audio] preview lookup failed for track ${labelgridTrackId}`, error);
    return { ok: false, status: 502 };
  }
}

/** Resolve legacy local tracks that were mapped before provider track IDs were persisted. */
export async function resolveReleaseTrackLabelGridId(input: {
  releaseLabelGridId: string;
  trackLabelGridId: string | null;
  trackNumber: number;
  isrc: string | null;
}): Promise<string | null> {
  const tracks = await listTracksForRelease(Number(input.releaseLabelGridId));
  if (
    input.trackLabelGridId &&
    tracks.some((track) => String(track.id) === input.trackLabelGridId)
  ) {
    return input.trackLabelGridId;
  }
  const normalizedIsrc = input.isrc?.trim().toUpperCase();
  if (normalizedIsrc) {
    const matches = tracks.filter(
      (track) => track.isrc?.trim().toUpperCase() === normalizedIsrc,
    );
    if (matches.length === 1) return String(matches[0].id);
  }
  const numbered = tracks.filter(
    (track) => track.track_num === input.trackNumber,
  );
  return numbered.length === 1 ? String(numbered[0].id) : null;
}
