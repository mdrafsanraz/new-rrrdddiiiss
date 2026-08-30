import { getTrackFile } from "@/lib/labelgrid";
import { listTracksForRelease } from "@/lib/labelgrid/catalog";
import { LabelGridApiError } from "@/lib/labelgrid/client";
import type { FileData } from "@/lib/labelgrid/types";

export type TrackAudioResolution =
  | { ok: true; url: string }
  | { ok: false; status: 404 | 502 };

/**
 * Live GET /tracks/{track}/files/stereo — shared by every audio route (admin
 * and end-user, both by local track and by raw LabelGrid track id) so the
 * 404-vs-502 distinction is made once: 404 means LabelGrid genuinely has no
 * file for this track yet (normal, nothing to retry); 502 means the lookup
 * itself failed (transient — worth retrying).
 */
export async function resolveTrackAudioUrl(
  labelgridTrackId: number | string
): Promise<TrackAudioResolution> {
  try {
    const raw = await getTrackFile(labelgridTrackId, "stereo");
    const file =
      raw && typeof raw === "object" && "data" in raw
        ? raw.data
        : (raw as FileData);
    if (!file?.url) return { ok: false, status: 404 };
    return { ok: true, url: file.url };
  } catch (error) {
    if (error instanceof LabelGridApiError && error.status === 404) {
      return { ok: false, status: 404 };
    }
    console.error(`[track-audio] lookup failed for track ${labelgridTrackId}`, error);
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
  if (input.trackLabelGridId) return input.trackLabelGridId;
  const tracks = await listTracksForRelease(Number(input.releaseLabelGridId));
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
