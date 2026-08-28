/**
 * LabelGrid is the source of truth for release/track/credit/audio data.
 * RDISTRO's DB supplies only ownership + the LabelGrid id — everything
 * rendered to the user here (title, artwork, tracks, track metadata,
 * credits, audio file status) is fetched live, never read from the local
 * cache fields that sync-submit.ts writes for its own bookkeeping.
 *
 * Audio uses the documented Track Files endpoint directly:
 *   GET /tracks/{trackId}/files/stereo
 */

import { prisma } from "@/lib/db";
import { LabelGridApiError } from "@/lib/labelgrid/client";
import {
  getRelease,
  getTrack,
  getTrackFile,
  listDistroOutlets,
  listTerritories,
} from "@/lib/labelgrid";
import { listTracksForRelease, unwrapLabelGridData } from "@/lib/labelgrid/catalog";
import type {
  FileData,
  ReleaseData,
  TrackContributorRow,
  TrackData,
  TrackPublisherRow,
  TrackWriterRow,
} from "@/lib/labelgrid/types";

export type LiveAudioFile = {
  url: string | null;
  filename: string | null;
  filesize: number | null;
  status: string | null;
};

export type LiveCredit = { id: number; name: string; roles: string[] };
export type LiveWriterSplit = LiveCredit & { share: number | null };
export type LivePublisherSplit = { id: number; name: string; share: number | null };

export type LiveTrack = {
  id: number;
  trackNumber: number | null;
  title: string;
  artist: string | null;
  mixVersion: string | null;
  isrc: string | null;
  iswc: string | null;
  explicit: string | null;
  contributors: LiveCredit[];
  writers: LiveWriterSplit[];
  publishers: LivePublisherSplit[];
  audio: LiveAudioFile | null;
};

export type LiveReleaseArtist = { id: number | null; name: string; role: string | null };

export type LiveRelease = {
  id: number;
  title: string;
  artist: string | null;
  artists: LiveReleaseArtist[];
  mixVersion: string | null;
  primaryGenreId: number | null;
  primaryGenre: string | null;
  contentType: string | null;
  releaseDate: string | null;
  barcodeNumber: string | null;
  catalogNumber: string | null;
  preferredLocalization: string | null;
  artworkAiUsage: string | null;
  explicit: string | null;
  coverUrl: string | null;
  reviewStatus: string | null;
  clineYear: number | null;
  clineName: string | null;
  plineYear: number | null;
  plineName: string | null;
  /** Raw dsp_configs — resolve distro_outlet_id → name against GET /distro-outlets. */
  dspConfigs: { outletId: string; enabled: boolean }[];
  /** Worldwide unless release_dates carries an exclusion list. */
  worldwide: boolean;
  excludedTerritoryCodes: string[];
  tracks: LiveTrack[];
};

export type LiveReleaseSummary = {
  id: number;
  title: string;
  artist: string | null;
  coverUrl: string | null;
  primaryGenre: string | null;
  releaseDate: string | null;
  reviewStatus: string | null;
  trackCount: number;
};

function displayTitle(row: {
  title?: string | null;
  titles?: { text?: string | null }[] | null;
}): string {
  return row.title?.trim() || row.titles?.[0]?.text?.trim() || "Untitled";
}

function buildArtistRows(
  artists: ReleaseData["artists"]
): LiveReleaseArtist[] {
  if (!Array.isArray(artists)) return [];
  return artists
    .filter((a) => a.artist?.artist_name?.trim())
    .map((a) => ({
      id: a.artist?.id ?? null,
      name: a.artist!.artist_name!.trim(),
      role: a.artistic_role ?? null,
    }));
}

function joinArtists(artists: ReleaseData["artists"]): string | null {
  const rows = buildArtistRows(artists);
  return rows.length > 0 ? rows.map((r) => r.name).join(", ") : null;
}

function rolesFromDict(roles: Record<string, string> | null | undefined): string[] {
  if (!roles || typeof roles !== "object") return [];
  return Object.values(roles).filter(
    (v): v is string => typeof v === "string" && v.length > 0
  );
}

/**
 * Prefer a name LabelGrid embedded directly on the credit row; fall back to
 * RDISTRO's writer-mapping cache (populated from LabelGrid when the user
 * originally picked this writer) purely for a display label — the credit
 * itself (roles, share, existence) is never sourced from that cache.
 */
async function resolveWriterName(
  userId: string,
  writerId: number,
  embedded: { first_name?: string | null; last_name?: string | null } | null | undefined
): Promise<string> {
  const embeddedName = `${embedded?.first_name ?? ""} ${embedded?.last_name ?? ""}`.trim();
  if (embeddedName) return embeddedName;
  const cached = await prisma.writerMapping.findFirst({
    where: { userId, labelgridId: writerId },
    select: { firstName: true, lastName: true },
  });
  if (cached) return `${cached.firstName} ${cached.lastName}`.trim();
  return `Writer #${writerId}`;
}

async function resolvePublisherName(
  userId: string,
  publisherId: number,
  embedded: { name?: string | null } | null | undefined
): Promise<string> {
  if (embedded?.name?.trim()) return embedded.name.trim();
  const cached = await prisma.publisherMapping.findFirst({
    where: { userId, labelgridId: publisherId },
    select: { name: true },
  });
  if (cached) return cached.name;
  return `Publisher #${publisherId}`;
}

function unwrapFile(raw: unknown): FileData | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as { data?: FileData } & FileData;
  return obj.data ?? obj;
}

/** GET /tracks/{trackId}/files/stereo — null when no file has been uploaded yet. */
async function fetchTrackAudio(trackId: number): Promise<LiveAudioFile | null> {
  try {
    const file = unwrapFile(await getTrackFile(trackId, "stereo"));
    if (!file || (!file.url && !file.filename)) return null;
    return {
      url: file.url ?? null,
      filename: file.filename ?? null,
      filesize: file.filesize ?? null,
      status: file.status ?? null,
    };
  } catch (error) {
    if (error instanceof LabelGridApiError && error.status === 404) return null;
    throw error;
  }
}

/**
 * GET /tracks (list, used for ordering) does NOT include `writers` or
 * `contributors` in its response schema — only GET /tracks/{track} (the
 * single-track "show" endpoint) does. So this always re-fetches full
 * TrackData per track rather than trusting the list-endpoint row.
 */
async function buildLiveTrack(
  userId: string,
  trackId: number
): Promise<LiveTrack> {
  const t = unwrapLabelGridData<TrackData>(await getTrack(trackId));
  const contributorsRaw = Array.isArray(t.contributors) ? t.contributors : [];
  const writersRaw = Array.isArray(t.writers) ? t.writers : [];
  const publishersRaw = Array.isArray(t.publishers) ? t.publishers : [];

  const [contributors, writers, publishers, audio] = await Promise.all([
    Promise.all(
      contributorsRaw.map(async (c: TrackContributorRow) => ({
        id: c.writer_id,
        name: await resolveWriterName(userId, c.writer_id, c.writer),
        roles: rolesFromDict(c.roles),
      }))
    ),
    Promise.all(
      writersRaw.map(async (w: TrackWriterRow) => ({
        id: w.writer_id,
        name: await resolveWriterName(userId, w.writer_id, w.writer),
        roles: rolesFromDict(w.roles),
        share: w.percentage_share ?? null,
      }))
    ),
    Promise.all(
      publishersRaw.map(async (p: TrackPublisherRow) => ({
        id: p.id,
        name: await resolvePublisherName(userId, p.id, p.publisher),
        share: p.percentage_share ?? null,
      }))
    ),
    fetchTrackAudio(t.id),
  ]);

  const trackArtistNames = Array.isArray(t.artists)
    ? t.artists
        .map((a) => a.artist?.artist_name?.trim())
        .filter((n): n is string => Boolean(n))
        .join(", ")
    : "";

  return {
    id: t.id,
    trackNumber: t.track_num ?? null,
    title: displayTitle(t),
    artist: trackArtistNames || t.default_display_artist?.trim() || null,
    mixVersion: t.mix_version?.trim() || t.mix_versions?.[0]?.text?.trim() || null,
    isrc: t.isrc ?? null,
    iswc: t.iswc ?? null,
    explicit: t.explicit ?? null,
    contributors,
    writers,
    publishers,
    audio,
  };
}

/**
 * Full live release for the Release Detail page: metadata, cover, every
 * track's metadata, credits, and stereo audio status — all fetched from
 * LabelGrid. `labelgridId` must already be verified as owned by `userId`
 * by the caller (local ownership check happens before this is ever called).
 */
export async function fetchLiveRelease(
  userId: string,
  labelgridId: number
): Promise<LiveRelease> {
  const [releaseRaw, trackRows] = await Promise.all([
    getRelease(labelgridId),
    listTracksForRelease(labelgridId),
  ]);
  const release = unwrapLabelGridData<ReleaseData>(releaseRaw);
  const sortedTrackIds = [...trackRows]
    .sort((a, b) => (a.track_num ?? 0) - (b.track_num ?? 0))
    .map((t) => t.id);
  const tracks = await Promise.all(
    sortedTrackIds.map((id) => buildLiveTrack(userId, id))
  );

  const excludedTerritoryCodes = Array.isArray(release.release_dates)
    ? release.release_dates
        .filter((r) => r.exclude)
        .flatMap((r) => r.countries ?? [])
    : [];

  return {
    id: release.id,
    title: displayTitle(release),
    artist: joinArtists(release.artists),
    artists: buildArtistRows(release.artists),
    mixVersion: release.mix_version?.trim() || release.mix_versions?.[0]?.text?.trim() || null,
    primaryGenreId: release.primary_genre?.id ?? null,
    primaryGenre: release.primary_genre?.name ?? null,
    contentType: release.content_type ?? null,
    releaseDate: release.release_date ?? null,
    barcodeNumber: release.barcode_number ?? null,
    catalogNumber: release.cat ?? null,
    preferredLocalization: release.preferred_localization ?? null,
    artworkAiUsage: release.artwork_ai_usage ?? null,
    explicit: release.explicit ?? null,
    coverUrl: release.front_cover?.url ?? null,
    reviewStatus: release.review_status ?? null,
    clineYear: release.cline_year ?? null,
    clineName: release.cline_name ?? null,
    plineYear: release.pline_year ?? null,
    plineName: release.pline_name ?? null,
    dspConfigs: Array.isArray(release.dsp_configs)
      ? release.dsp_configs.map((c) => ({
          outletId: c.distro_outlet_id,
          enabled: c.enabled,
        }))
      : [],
    worldwide: excludedTerritoryCodes.length === 0,
    excludedTerritoryCodes,
    tracks,
  };
}

/** Lightweight single-release-call summary for list views — no per-track drill-down. */
export async function fetchLiveReleaseSummary(
  labelgridId: number
): Promise<LiveReleaseSummary> {
  const [releaseRaw, trackRows] = await Promise.all([
    getRelease(labelgridId),
    listTracksForRelease(labelgridId),
  ]);
  const release = unwrapLabelGridData<ReleaseData>(releaseRaw);
  return {
    id: release.id,
    title: displayTitle(release),
    artist: joinArtists(release.artists),
    coverUrl: release.front_cover?.url ?? null,
    primaryGenre: release.primary_genre?.name ?? null,
    releaseDate: release.release_date ?? null,
    reviewStatus: release.review_status ?? null,
    trackCount: trackRows.length,
  };
}

/** distro_outlet_id → display name, straight from GET /distro-outlets — never hardcoded. */
export async function loadOutletNames(): Promise<Record<string, string>> {
  try {
    const raw = await listDistroOutlets();
    const list = Array.isArray(raw)
      ? raw
      : ((raw as { data?: unknown[] })?.data ?? []);
    const map: Record<string, string> = {};
    for (const o of list as Array<Record<string, unknown>>) {
      const key = String(o.key ?? "");
      if (key) map[key] = String(o.name ?? o.key ?? key);
    }
    return map;
  } catch {
    return {};
  }
}

/** alpha-2 code → territory name, straight from GET /territories — never hardcoded. */
export async function loadTerritoryNames(): Promise<Record<string, string>> {
  try {
    const rows = await listTerritories();
    const map: Record<string, string> = {};
    for (const t of rows) {
      if (t.code2) map[t.code2.toUpperCase()] = t.name;
    }
    return map;
  } catch {
    return {};
  }
}

export class LiveFetchTimeoutError extends Error {
  constructor() {
    super("Timed out waiting for LabelGrid.");
    this.name = "LiveFetchTimeoutError";
  }
}

/**
 * Race a live fetch against a timeout so a slow/unreachable LabelGrid never
 * hangs the page — rejects with LiveFetchTimeoutError on timeout so callers
 * can tell "LabelGrid didn't answer in time" apart from other errors and
 * show an accurate fallback notice.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_resolve, reject) =>
      setTimeout(() => reject(new LiveFetchTimeoutError()), ms)
    ),
  ]);
}
