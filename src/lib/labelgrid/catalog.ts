import { LabelGridApiError } from "@/lib/labelgrid/client";
import {
  createWriter,
  getRelease,
  getTrackFile,
  listTracks,
  listWriters,
} from "@/lib/labelgrid";
import type { FileData, ReleaseData, TrackData } from "@/lib/labelgrid/types";

export function unwrapLabelGridData<T extends { id?: number }>(
  raw: unknown
): T {
  if (!raw || typeof raw !== "object") {
    throw new Error("Unexpected LabelGrid response shape");
  }
  const obj = raw as { data?: T; id?: number };
  const row = (obj.data ?? obj) as T;
  if (typeof row.id !== "number") {
    throw new Error("LabelGrid response missing numeric id");
  }
  return row;
}

export function unwrapLabelGridId(raw: unknown): number {
  return unwrapLabelGridData<{ id: number }>(raw).id;
}

function normalizePersonName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Find or create a writer — reuses catalog match on 422 duplicate name. */
export async function ensureWriter(body: {
  first_name: string;
  last_name: string;
  email?: string;
}): Promise<number> {
  const first_name = body.first_name.trim();
  const last_name = body.last_name.trim();

  try {
    const created = await createWriter({
      first_name,
      last_name,
      email: body.email,
    });
    return unwrapLabelGridId(created);
  } catch (error) {
    if (!(error instanceof LabelGridApiError) || error.status !== 422) {
      throw error;
    }
    const existing = await findWriterByName(first_name, last_name);
    if (existing) return existing;
    throw error;
  }
}

async function findWriterByName(
  firstName: string,
  lastName: string
): Promise<number | null> {
  const wantFirst = normalizePersonName(firstName);
  const wantLast = normalizePersonName(lastName);

  for (const term of [lastName, firstName, `${firstName} ${lastName}`]) {
    let page = 1;
    for (;;) {
      const res = await listWriters(page, 100, term);
      const rows = res.data ?? [];
      const hit = rows.find(
        (w) =>
          normalizePersonName(w.first_name ?? "") === wantFirst &&
          normalizePersonName(w.last_name ?? "") === wantLast
      );
      if (hit) return hit.id;

      const lastPage = res.meta?.last_page ?? 1;
      if (page >= lastPage || rows.length === 0) break;
      page += 1;
    }
  }
  return null;
}

function fileReady(file: FileData | null | undefined): boolean {
  if (!file) return false;
  return Boolean(file.url || file.filename);
}

function unwrapFile(raw: unknown): FileData | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as { data?: FileData } & FileData;
  return obj.data ?? obj;
}

export type LabelGridMediaStatus = {
  releaseId: number;
  hasCover: boolean;
  tracks: Array<{ id: number; hasStereo: boolean }>;
};

/** GET release + tracks + stereo file status from LabelGrid API. */
export async function getLabelGridMediaStatus(
  releaseId: number
): Promise<LabelGridMediaStatus> {
  const release = unwrapLabelGridData<ReleaseData>(await getRelease(releaseId));
  const hasCover = fileReady(release.front_cover ?? null);

  const trackRows = await listTracksForRelease(releaseId);
  const tracks: Array<{ id: number; hasStereo: boolean }> = [];

  for (const track of trackRows) {
    let hasStereo = false;
    try {
      const raw = await getTrackFile(track.id, "stereo");
      hasStereo = fileReady(unwrapFile(raw));
    } catch (error) {
      if (error instanceof LabelGridApiError && error.status === 404) {
        hasStereo = false;
      } else {
        throw error;
      }
    }
    tracks.push({ id: track.id, hasStereo });
  }

  return { releaseId, hasCover, tracks };
}

export async function listTracksForRelease(
  releaseId: number
): Promise<TrackData[]> {
  const rows: TrackData[] = [];
  let page = 1;
  for (;;) {
    const res = await listTracks(page, 100, releaseId);
    rows.push(...(res.data ?? []));
    const lastPage = res.meta?.last_page ?? 1;
    if (page >= lastPage || (res.data?.length ?? 0) === 0) break;
    page += 1;
  }
  return rows;
}

/**
 * Draft is ready for distribute only when the cover is up and EVERY track
 * has stereo audio (an album must not pass on one ready track). Pass
 * expectedTrackCount to also catch tracks that never reached LabelGrid.
 */
export function isLabelGridDraftMediaReady(
  status: LabelGridMediaStatus,
  expectedTrackCount?: number
): boolean {
  if (!status.hasCover || status.tracks.length === 0) return false;
  if (
    typeof expectedTrackCount === "number" &&
    status.tracks.length < expectedTrackCount
  ) {
    return false;
  }
  return status.tracks.every((t) => t.hasStereo);
}

export function describeLabelGridMediaGaps(
  status: LabelGridMediaStatus,
  expectedTrackCount?: number
): string[] {
  const missing: string[] = [];
  if (!status.hasCover) missing.push("cover artwork is not on LabelGrid yet");
  if (!status.tracks.length) {
    missing.push("no tracks on LabelGrid yet");
  } else {
    if (
      typeof expectedTrackCount === "number" &&
      status.tracks.length < expectedTrackCount
    ) {
      missing.push(
        `only ${status.tracks.length} of ${expectedTrackCount} tracks are on LabelGrid`
      );
    }
    const withoutAudio = status.tracks.filter((t) => !t.hasStereo);
    if (withoutAudio.length) {
      missing.push(
        `${withoutAudio.length} track${withoutAudio.length === 1 ? " is" : "s are"} missing stereo audio on LabelGrid`
      );
    }
  }
  return missing;
}
