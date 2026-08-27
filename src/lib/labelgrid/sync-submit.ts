import type { Artist, Release, Track } from "@prisma/client";
import { prisma } from "@/lib/db";
import { LabelGridApiError } from "@/lib/labelgrid/client";
import {
  isLabelGridLive,
  LabelGridConfigError,
} from "@/lib/labelgrid/config";
import {
  createArtist,
  createRelease,
  createTrack,
  listGenres,
  listLabels,
  listTerritories,
  submitReleaseForReview,
  updateRelease,
  updateTrack,
  uploadReleasePhoto,
  uploadTrackLicense,
  uploadTrackStereoAudio,
  validateRelease,
} from "@/lib/labelgrid";
import {
  describeLabelGridMediaGaps,
  ensureWriter,
  getLabelGridMediaStatus,
  isLabelGridDraftMediaReady,
  unwrapLabelGridId,
} from "@/lib/labelgrid/catalog";
import { loadStoredUpload, type ValidatedFile } from "@/lib/uploads/store";
import {
  parseJsonObject,
  type ReleaseMetadata,
  type TrackMetadata,
} from "@/lib/releases/constants";

type ReleaseWithRels = Release & { artist: Artist | null; tracks: Track[] };

/**
 * Audio for one local track, held only in memory — LabelGrid is the file
 * store; we never write this to our own disk.
 */
export type TrackAudioInput = { localTrackId: string; upload: ValidatedFile };

function splitName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "Artist", last: "Unknown" };
  if (parts.length === 1) return { first: parts[0], last: parts[0] };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

function formatLgError(error: unknown): string {
  if (error instanceof LabelGridApiError) {
    const body =
      typeof error.body === "string"
        ? error.body
        : JSON.stringify(error.body);
    return `${error.message}${body ? ` — ${body.slice(0, 400)}` : ""}`;
  }
  if (error instanceof LabelGridConfigError) return error.message;
  if (error instanceof Error) return error.message;
  return "Unknown LabelGrid error";
}

async function resolveLabelId(): Promise<number> {
  const fromEnv = process.env.LABELGRID_LABEL_ID?.trim();
  if (fromEnv && /^\d+$/.test(fromEnv)) return Number(fromEnv);

  const labels = await listLabels(1, 50);
  const first = labels.data?.[0]?.id;
  if (!first) {
    throw new Error(
      "No LabelGrid label found. Set LABELGRID_LABEL_ID to your shared RDISTRO sandbox label id."
    );
  }
  return first;
}

type GenreRow = {
  id: number;
  name?: string | null;
  title?: string | null;
  category?: string | null;
  base_genre?: string | null;
};

let genresCache: GenreRow[] | null = null;

/** Normalize LabelGrid /genres response — OpenAPI returns a bare array. */
function unwrapGenreRows(raw: unknown): GenreRow[] {
  if (Array.isArray(raw)) return raw as GenreRow[];
  if (raw && typeof raw === "object") {
    const obj = raw as { data?: unknown };
    if (Array.isArray(obj.data)) return obj.data as GenreRow[];
  }
  return [];
}

async function loadGenres(): Promise<GenreRow[]> {
  if (genresCache && genresCache.length > 0) return genresCache;
  const raw = await listGenres();
  const rows = unwrapGenreRows(raw).filter(
    (g) => typeof g?.id === "number" && Number.isFinite(g.id)
  );
  genresCache = rows;
  return genresCache;
}

function normalizeGenreKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[/_-]+/g, " ")
    .replace(/\s+/g, " ");
}

/** Map friendly RDISTRO genre labels → common LabelGrid name variants. */
const GENRE_ALIASES: Record<string, string[]> = {
  pop: ["pop"],
  "hip hop rap": ["hip hop", "hip-hop", "rap", "hip hop/rap", "hiphop"],
  "r and b": ["r&b", "rnb", "r and b", "rhythm and blues"],
  electronic: ["electronic", "electronica", "edm"],
  dance: ["dance", "dance / electronic", "dance/electronic"],
  rock: ["rock"],
  indie: ["indie", "indie rock", "indie pop"],
  alternative: ["alternative", "alt", "alternative rock"],
  country: ["country"],
  latin: ["latin", "latino", "latin pop"],
  afrobeats: ["afrobeats", "afrobeat", "afro beats"],
  jazz: ["jazz"],
  folk: ["folk", "folk/americana"],
  metal: ["metal", "heavy metal"],
  reggae: ["reggae", "dancehall"],
  world: ["world", "world music"],
  soundtrack: ["soundtrack", "score", "ost"],
  ambient: ["ambient"],
  classical: ["classical"],
  other: ["other", "miscellaneous", "misc"],
};

function genreLabelCandidates(genreName: string): string[] {
  const key = normalizeGenreKey(genreName);
  const aliases = GENRE_ALIASES[key] ?? [];
  return [key, ...aliases.map(normalizeGenreKey)];
}

async function resolveGenreId(
  genreName: string | null | undefined
): Promise<number | null> {
  if (!genreName?.trim()) return null;
  const genres = await loadGenres();
  if (!genres.length) return null;

  const candidates = genreLabelCandidates(genreName);

  const exact = genres.find((g) => {
    const name = normalizeGenreKey(g.name ?? g.title ?? "");
    const base = normalizeGenreKey(g.base_genre ?? "");
    const category = normalizeGenreKey(g.category ?? "");
    return candidates.some(
      (c) => c === name || c === base || (category && c === category)
    );
  });
  if (exact) return exact.id;

  const fuzzy = genres.find((g) => {
    const name = normalizeGenreKey(g.name ?? g.title ?? "");
    const base = normalizeGenreKey(g.base_genre ?? "");
    return candidates.some(
      (c) =>
        (name && (name.includes(c) || c.includes(name))) ||
        (base && (base.includes(c) || c.includes(base)))
    );
  });
  return fuzzy?.id ?? null;
}

async function requireGenreId(genreName: string | null): Promise<number> {
  const id = await resolveGenreId(genreName);
  if (id) return id;

  // Empty cache from a bad unwrap should not stick forever.
  genresCache = null;
  const genres = await loadGenres();
  const fallback =
    genres.find((g) =>
      /pop|other|miscellaneous/i.test(g.name ?? g.title ?? "")
    ) ?? genres[0];
  if (fallback?.id) return fallback.id;

  throw new Error(
    "Could not resolve a LabelGrid genre id. Check sandbox /genres access."
  );
}

function unwrapId(res: unknown): number {
  return unwrapLabelGridId(res);
}

async function ensureLabelGridArtist(artist: Artist): Promise<number> {
  if (artist.labelgridId && /^\d+$/.test(artist.labelgridId)) {
    return Number(artist.labelgridId);
  }

  const created = await createArtist({
    artist_name: artist.name,
    full_name: artist.fullName ?? undefined,
    email: artist.email ?? undefined,
    location: artist.location ?? undefined,
    bio_short: artist.bioShort ?? undefined,
  });

  const id = unwrapId(created);
  await prisma.artist.update({
    where: { id: artist.id },
    data: { labelgridId: String(id) },
  });
  return id;
}

let territoriesCache: string[] | null = null;

/** All distributable alpha-2 codes from GET /territories (cached). */
async function loadTerritoryCodes(): Promise<string[]> {
  if (territoriesCache && territoriesCache.length > 0) return territoriesCache;
  const rows = await listTerritories();
  const list = Array.isArray(rows)
    ? rows
    : ((rows as unknown as { data?: unknown[] })?.data ?? []);
  territoriesCache = (list as Array<{ code2?: string }>)
    .map((t) => (t.code2 ?? "").toUpperCase())
    .filter((c) => /^[A-Z]{2}$/.test(c));
  return territoriesCache;
}

/**
 * Store + territory selections → LabelGrid fields.
 * - dsp_configs is sent explicitly on every create/update (not just the
 *   narrowed case): "Updating this field replaces all existing
 *   configurations" per document.json, so omitting it after a user narrows
 *   stores and then switches back to "All stores" would leave the stale
 *   restriction in place on LabelGrid. Sending the full desired state every
 *   time keeps the two systems in sync.
 * - Territory narrowing uses the documented exclusion form of release_dates
 *   ("worldwide except X, Y"): exclude every territory NOT selected. Omitted
 *   for the worldwide default (no documented "clear" semantics to reset a
 *   prior exclusion via this field, so it is only sent while narrowing).
 */
async function buildDistributionFields(
  release: Release
): Promise<Record<string, unknown>> {
  const fields: Record<string, unknown> = {};
  const meta = parseJsonObject<ReleaseMetadata>(release.metadataJson);

  const stores = parseJsonObject<{ allStores?: boolean; outletKeys?: string[] }>(
    release.storesJson
  );
  const allStores = stores.allStores ?? meta.allStores ?? true;
  // distro_outlet_id is the outlet's `key` slug (e.g. "spotify"), fetched
  // live from GET /distro-outlets — never a hardcoded numeric id.
  const outletKeys = stores.outletKeys ?? meta.selectedOutletKeys ?? [];
  fields.dsp_configs =
    !allStores && outletKeys.length > 0
      ? [
          { distro_outlet_id: "all_dsps", enabled: false },
          ...outletKeys.map((key) => ({
            distro_outlet_id: key,
            enabled: true,
          })),
        ]
      : [{ distro_outlet_id: "all_dsps", enabled: true }];

  const territories = parseJsonObject<{ worldwide?: boolean; codes?: string[] }>(
    release.territoriesJson
  );
  const worldwide = territories.worldwide ?? meta.worldwide ?? true;
  const codes = (territories.codes ?? meta.territoryCodes ?? []).map((c) =>
    c.toUpperCase()
  );
  if (!worldwide && codes.length > 0) {
    const all = await loadTerritoryCodes();
    if (!all.length) {
      throw new Error(
        "Could not load LabelGrid territories to apply the territory selection."
      );
    }
    const selected = new Set(codes);
    const excluded = all.filter((c) => !selected.has(c));
    if (excluded.length > 0) {
      fields.release_dates = [{ countries: excluded, exclude: true }];
    }
  }

  return fields;
}

type TrackSyncContext = {
  lgReleaseId: number;
  lgArtistId: number;
  locale: string;
  artisticRole: string;
  releaseExplicit: string;
  releasePrimaryGenre: string | null;
  artist: Artist;
};

async function buildTrackContributors(
  track: Track,
  tMeta: TrackMetadata,
  artist: Artist
): Promise<
  Array<{ writer_id: number; roles: Record<string, string>; ai_contribution: string }>
> {
  const contribList =
    tMeta.contributors?.filter(
      (c) => c.firstName?.trim() && c.lastName?.trim() && c.roles?.length
    ) ?? [];

  const fallbackName = splitName(artist.fullName || artist.name);
  const contributorsInput =
    contribList.length > 0
      ? contribList
      : [
          {
            firstName: fallbackName.first,
            lastName: fallbackName.last,
            roles: ["Composer", "Lyricist"],
          },
        ];

  const lgContributors: Array<{
    writer_id: number;
    roles: Record<string, string>;
    ai_contribution: string;
  }> = [];

  for (const c of contributorsInput) {
    const writerId = await ensureWriter({
      first_name: c.firstName.trim(),
      last_name: c.lastName.trim(),
      email: artist.email ?? undefined,
    });
    lgContributors.push({
      writer_id: writerId,
      // LabelGrid validates each roles.* entry as a string (422: "The
      // contributor role field must be a string") — a boolean presence
      // flag is rejected even though it's semantically what this is.
      roles: Object.fromEntries(c.roles.map((r) => [r, "true"])),
      ai_contribution: "none",
    });
  }
  return lgContributors;
}

async function buildTrackBody(
  track: Track,
  ctx: TrackSyncContext,
  /** release_id is create-only — TrackUpdateData has no such field. */
  opts: { forUpdate?: boolean } = {}
): Promise<Record<string, unknown>> {
  const tMeta = parseJsonObject<TrackMetadata>(track.metadataJson);
  const trackPrimaryGenreId = await resolveGenreId(
    tMeta.primaryGenre ?? ctx.releasePrimaryGenre
  );
  const contributors = await buildTrackContributors(track, tMeta, ctx.artist);

  const body: Record<string, unknown> = {
    ...(opts.forUpdate ? {} : { release_id: ctx.lgReleaseId }),
    disc: 1,
    track_num: track.trackNumber || 1,
    composition_type: tMeta.compositionType || "original_composition",
    audio_ai_usage: tMeta.audioAiUsage || "none",
    composition_ai_usage: tMeta.compositionAiUsage || "none",
    commercial_samples: tMeta.commercialSamples || "no",
    audio_language: tMeta.audioLanguage || "en",
    preferred_localization: ctx.locale,
    explicit: tMeta.explicit || ctx.releaseExplicit,
    recording_country: tMeta.recordingCountry || undefined,
    isrc: track.isrc || undefined,
    iswc: tMeta.iswc || undefined,
    has_mechanical_license: tMeta.hasMechanicalLicense ?? undefined,
    preview_start_time: tMeta.previewStartTime ?? undefined,
    preview_length: tMeta.previewLength ?? undefined,
    album_only: tMeta.albumOnly ?? undefined,
    free_download: tMeta.freeDownload ?? undefined,
    instant_gratification: tMeta.instantGratification ?? undefined,
    cline_year: tMeta.clineYear ?? undefined,
    cline_name: tMeta.clineName || undefined,
    pline_year: tMeta.plineYear ?? undefined,
    pline_name: tMeta.plineName || undefined,
    titles: [{ iso_code: ctx.locale, text: track.title }],
    artists: [
      {
        artist_id: ctx.lgArtistId,
        artistic_role: ctx.artisticRole,
        position: 1,
      },
    ],
    contributors,
  };

  if (trackPrimaryGenreId) body.primary_genre_id = trackPrimaryGenreId;
  if (tMeta.mixVersion?.trim()) {
    body.mix_versions = [{ iso_code: ctx.locale, text: tMeta.mixVersion.trim() }];
  }
  if (tMeta.lyrics?.trim()) {
    body.lyrics = [{ iso_code: ctx.locale, text: tMeta.lyrics.trim() }];
  }

  return body;
}

/**
 * Create the LG track if the local row has no labelgridId yet, otherwise
 * PATCH the existing one with current metadata (composition, credits,
 * explicit, etc.) — never creates a second track for an already-synced row.
 */
async function ensureLabelGridTrack(
  track: Track,
  ctx: TrackSyncContext
): Promise<number> {
  if (track.labelgridId && /^\d+$/.test(track.labelgridId)) {
    const lgTrackId = Number(track.labelgridId);
    const body = await buildTrackBody(track, ctx, { forUpdate: true });
    await updateTrack(lgTrackId, body);
    return lgTrackId;
  }
  const body = await buildTrackBody(track, ctx);
  const created = await createTrack(body);
  const lgTrackId = unwrapId(created);
  await prisma.track.update({
    where: { id: track.id },
    data: { labelgridId: String(lgTrackId) },
  });
  return lgTrackId;
}

/**
 * Upload stereo audio for one track, persist the resulting LabelGrid file
 * URL (our only durable record of it — the bytes never touch our disk), and
 * persist the async-processing state (attempt id + processing flag).
 *
 * A per-track audio failure (e.g. LabelGrid's async processing rejected the
 * file) must not abort the whole release sync — other tracks still need to
 * upload. Failures are recorded on the track and surfaced in the UI instead.
 */
async function uploadAudioForTrack(
  track: Track,
  lgTrackId: number,
  upload: ValidatedFile
): Promise<{ processing: boolean }> {
  const tMeta = parseJsonObject<TrackMetadata>(track.metadataJson);

  try {
    const result = await uploadTrackStereoAudio(lgTrackId, {
      buffer: upload.buffer,
      filename: upload.filename,
      mimeType: upload.mimeType,
    });
    tMeta.audioUploadAttemptId = result.attemptId;
    tMeta.audioProcessing = result.processing;
    tMeta.audioProcessingError = null;
    await prisma.track.update({
      where: { id: track.id },
      data: {
        metadataJson: JSON.stringify(tMeta),
        // LabelGrid's hosted URL is the only record of this file we keep.
        ...(result.url ? { audioUrl: result.url } : {}),
      },
    });
    return { processing: result.processing };
  } catch (error) {
    tMeta.audioProcessing = false;
    tMeta.audioProcessingError =
      error instanceof Error ? error.message : "Audio upload failed";
    await prisma.track.update({
      where: { id: track.id },
      data: { metadataJson: JSON.stringify(tMeta) },
    });
    return { processing: false };
  }
}

/**
 * Push the track's cover/sample license to LabelGrid once
 * (POST /tracks/{id}/licenses). No-op when absent or already synced.
 * License documents are still staged on our own storage (LabelGrid's public
 * API has no equivalent "get me a license upload URL" endpoint), unlike
 * artwork/audio which go straight to LabelGrid.
 */
async function syncTrackLicense(track: Track, lgTrackId: number): Promise<void> {
  const tMeta = parseJsonObject<TrackMetadata>(track.metadataJson);
  if (!tMeta.licenseType || !tMeta.licenseUrl || tMeta.licenseSyncedAt) return;

  const file = await loadStoredUpload(tMeta.licenseUrl);
  if (!file) return;

  await uploadTrackLicense(lgTrackId, {
    buffer: file.buffer,
    filename: file.filename,
    mimeType: file.mimeType,
    type: tMeta.licenseType,
  });

  tMeta.licenseSyncedAt = new Date().toISOString();
  await prisma.track.update({
    where: { id: track.id },
    data: { metadataJson: JSON.stringify(tMeta) },
  });
}

async function buildReleaseBody(
  release: ReleaseWithRels,
  input: {
    labelId: number;
    primaryGenreId: number;
    lgArtistId: number;
    locale: string;
    artisticRole: string;
  }
): Promise<Record<string, unknown>> {
  const rMeta = parseJsonObject<ReleaseMetadata>(release.metadataJson);

  const body: Record<string, unknown> = {
    content_type: release.contentType,
    label_id: input.labelId,
    cat: release.catalogNumber,
    artwork_ai_usage: release.artworkAiUsage,
    primary_genre_id: input.primaryGenreId,
    preferred_localization: input.locale,
    barcode_number: release.upc || undefined,
    // Spec: release_date is UTC; date-only means midnight UTC. toISOString
    // emits the canonical Z form.
    release_date: release.releaseDate
      ? release.releaseDate.toISOString()
      : undefined,
    explicit: release.explicit,
    transfer_from_distributor: rMeta.transferFromDistributor || undefined,
    cline_year: rMeta.clineYear ?? undefined,
    cline_name: rMeta.clineName || undefined,
    pline_year: rMeta.plineYear ?? undefined,
    pline_name: rMeta.plineName || undefined,
    titles: [
      {
        iso_code: input.locale,
        text: release.title,
        phonetic: null,
      },
    ],
    artists: [
      {
        artist_id: input.lgArtistId,
        artistic_role: input.artisticRole,
        position: 1,
      },
    ],
  };

  if (rMeta.mixVersion?.trim()) {
    body.mix_versions = [
      { iso_code: input.locale, text: rMeta.mixVersion.trim(), phonetic: null },
    ];
  }

  Object.assign(body, await buildDistributionFields(release));

  return body;
}

/** Create the release on LabelGrid if needed, or update it; persist labelgridId. */
async function ensureLabelGridReleaseMetadata(
  release: ReleaseWithRels
): Promise<{ lgReleaseId: number; lgArtistId: number; locale: string; artisticRole: string }> {
  if (!release.artist) {
    throw new Error("Release has no artist to sync.");
  }

  const rMeta = parseJsonObject<ReleaseMetadata>(release.metadataJson);
  const [labelId, primaryGenreId, lgArtistId] = await Promise.all([
    resolveLabelId(),
    requireGenreId(release.primaryGenre),
    ensureLabelGridArtist(release.artist),
  ]);

  const locale = rMeta.preferredLocalization || "en";
  const artisticRole = rMeta.artisticRole || "MainArtist";

  const releaseBody = await buildReleaseBody(release, {
    labelId,
    primaryGenreId,
    lgArtistId,
    locale,
    artisticRole,
  });

  const lgRelease = release.labelgridId
    ? await updateRelease(Number(release.labelgridId), releaseBody).then(
        () => ({ data: { id: Number(release.labelgridId) } })
      )
    : await createRelease(releaseBody);
  const lgReleaseId = unwrapId(lgRelease);

  // Persist the mapping immediately so a mid-sync failure never orphans the
  // LabelGrid draft or creates a duplicate on retry.
  await prisma.release.update({
    where: { id: release.id },
    data: { labelgridId: String(lgReleaseId) },
  });

  return { lgReleaseId, lgArtistId, locale, artisticRole };
}

export type SyncOutcome =
  | {
      ok: true;
      releaseId: number;
      trackIds: number[];
      /** true if this call created the LabelGrid release for the first time. */
      created: boolean;
      /** true when at least one audio file is still processing on LabelGrid. */
      audioProcessing: boolean;
      /** Local track ids whose audio is still processing on LabelGrid. */
      processingTrackIds: string[];
    }
  | { ok: false; error: string };

/**
 * Push a release into LabelGrid as a **draft** and sync whatever assets are
 * provided. Order matches the documented flow — Release, then Track(s),
 * THEN assets (cover, audio, licenses) — so a cover-art rejection or a
 * missing audio file never prevents the release and its tracks from
 * existing on LabelGrid. Safe to call repeatedly (idempotent — only ever
 * creates what doesn't already exist) as the wizard autosaves. Does not
 * submit for LabelGrid review — admin approval does that later.
 */
export async function syncReleaseToLabelGrid(input: {
  release: ReleaseWithRels;
  artwork?: ValidatedFile | null;
  audios?: TrackAudioInput[];
}): Promise<SyncOutcome> {
  if (!isLabelGridLive()) {
    return {
      ok: false,
      error: "LABELGRID_API_TOKEN is not set — skipped distributor sync.",
    };
  }

  const { release, artwork } = input;
  const audios = input.audios ?? [];
  const created = !release.labelgridId;
  const audioByTrackId = new Map(audios.map((a) => [a.localTrackId, a.upload]));

  try {
    const { lgReleaseId, lgArtistId, locale, artisticRole } =
      await ensureLabelGridReleaseMetadata(release);

    const ctx: TrackSyncContext = {
      lgReleaseId,
      lgArtistId,
      locale,
      artisticRole,
      releaseExplicit: release.explicit,
      releasePrimaryGenre: release.primaryGenre,
      artist: release.artist!,
    };

    // Every local track must exist on LabelGrid before any asset upload is
    // attempted, regardless of whether this call carries files for it yet.
    const ordered = [...release.tracks].sort(
      (a, b) => a.trackNumber - b.trackNumber
    );
    const trackIds: number[] = [];
    for (const track of ordered) {
      trackIds.push(await ensureLabelGridTrack(track, ctx));
    }

    let coverArtError: string | null = null;
    if (artwork) {
      try {
        const file = await uploadReleasePhoto(
          lgReleaseId,
          new Blob([new Uint8Array(artwork.buffer)], { type: artwork.mimeType }),
          artwork.filename
        );
        await prisma.release.update({
          where: { id: release.id },
          data: { artworkUrl: file?.url ?? null },
        });
      } catch (error) {
        // Non-fatal: tracks are already created above. Surface the failure
        // (e.g. LabelGrid rejecting dimensions) without losing track sync.
        coverArtError = formatLgError(error);
        console.error("[labelgrid/sync/cover]", release.id, coverArtError);
      }
    }

    const processingTrackIds: string[] = [];
    for (let i = 0; i < ordered.length; i++) {
      const track = ordered[i];
      const lgTrackId = trackIds[i];
      const upload = audioByTrackId.get(track.id);
      if (upload) {
        const { processing } = await uploadAudioForTrack(
          track,
          lgTrackId,
          upload
        );
        if (processing) processingTrackIds.push(track.id);
      }
      await syncTrackLicense(track, lgTrackId);
    }

    await prisma.release.update({
      where: { id: release.id },
      data: {
        syncError: coverArtError
          ? `Cover art: ${coverArtError}`.slice(0, 2000)
          : null,
        ...(created ? { labelgridReviewStatus: "draft" } : {}),
      },
    });

    return {
      ok: true,
      releaseId: lgReleaseId,
      trackIds,
      created,
      audioProcessing: processingTrackIds.length > 0,
      processingTrackIds,
    };
  } catch (error) {
    const message = formatLgError(error);
    console.error("[labelgrid/sync]", release.id, message);
    await prisma.release.update({
      where: { id: release.id },
      data: { syncError: message.slice(0, 2000) },
    });
    return { ok: false, error: message };
  }
}

/**
 * Submit an already-synced LabelGrid draft into LG distribution review.
 * If local release has no labelgridId yet, syncs as draft first (with
 * whatever assets are provided).
 */
export async function submitLabelGridDraftForReview(input: {
  release: ReleaseWithRels;
  artwork?: ValidatedFile | null;
  audios?: TrackAudioInput[];
}): Promise<
  | { ok: true; releaseId: number; trackIds: number[] }
  | { ok: false; error: string }
> {
  if (!isLabelGridLive()) {
    return {
      ok: false,
      error: "LABELGRID_API_TOKEN is not set — cannot submit to LabelGrid.",
    };
  }

  const { release } = input;
  const audios = input.audios ?? [];
  const expected = release.tracks.length;

  try {
    // Always resync so this request's assets (if any) are pushed and the
    // release/tracks are guaranteed to exist before we check readiness.
    const synced = await syncReleaseToLabelGrid({
      release,
      artwork: input.artwork,
      audios,
    });
    if (!synced.ok) return synced;
    const { releaseId: lgReleaseId, trackIds } = synced;

    // Uniform gate before distribute: cover + stereo audio on EVERY track
    // (also catches audio still processing).
    const mediaStatus = await getLabelGridMediaStatus(lgReleaseId);
    if (!isLabelGridDraftMediaReady(mediaStatus, expected)) {
      const gaps = describeLabelGridMediaGaps(mediaStatus, expected);
      return {
        ok: false,
        error:
          `LabelGrid draft is missing media: ${gaps.join("; ")}. ` +
          "If audio was just uploaded it may still be processing — try again shortly. " +
          "Otherwise upload the missing files in the release builder, then approve again.",
      };
    }

    // Best-effort validation before submit-for-review.
    try {
      await validateRelease(lgReleaseId);
    } catch (error) {
      console.warn(
        "[labelgrid/validate]",
        lgReleaseId,
        formatLgError(error)
      );
    }

    await submitReleaseForReview(lgReleaseId);

    await prisma.release.update({
      where: { id: release.id },
      data: { syncError: null },
    });

    return { ok: true, releaseId: lgReleaseId, trackIds };
  } catch (error) {
    const message = formatLgError(error);
    console.error("[labelgrid/submit-review]", release.id, message);
    await prisma.release.update({
      where: { id: release.id },
      data: { syncError: message.slice(0, 2000) },
    });
    return { ok: false, error: message };
  }
}
