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
  createWriter,
  listGenres,
  listLabels,
  submitReleaseForReview,
  uploadReleasePhoto,
  uploadTrackStereoAudio,
  validateRelease,
} from "@/lib/labelgrid";
import type { StoredUpload } from "@/lib/uploads/store";
import {
  parseJsonObject,
  type ReleaseMetadata,
  type TrackMetadata,
} from "@/lib/releases/constants";

type SyncInput = {
  release: Release & { artist: Artist | null; tracks: Track[] };
  artwork: StoredUpload;
  audio: StoredUpload;
};

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
  if (!res || typeof res !== "object") {
    throw new Error("Unexpected LabelGrid response shape");
  }
  const obj = res as { id?: number; data?: { id?: number } };
  const id = obj.data?.id ?? obj.id;
  if (typeof id !== "number") {
    throw new Error("LabelGrid response missing numeric id");
  }
  return id;
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

/**
 * Push release + cover + stereo audio into LabelGrid as a **draft**.
 * Does not submit for LabelGrid review — admin approval does that later.
 * Updates local labelgridId fields; stores syncError on failure.
 */
export async function syncSubmittedReleaseToLabelGrid(
  input: SyncInput
): Promise<{ ok: true; releaseId: number; trackId: number } | { ok: false; error: string }> {
  if (!isLabelGridLive()) {
    return {
      ok: false,
      error: "LABELGRID_API_TOKEN is not set — skipped distributor sync.",
    };
  }

  const { release, artwork, audio } = input;
  if (!release.artist) {
    return { ok: false, error: "Release has no artist to sync." };
  }
  const track = release.tracks[0];
  if (!track) {
    return { ok: false, error: "Release has no track to sync." };
  }

  const rMeta = parseJsonObject<ReleaseMetadata>(release.metadataJson);
  const tMeta = parseJsonObject<TrackMetadata>(track.metadataJson);

  try {
    const [labelId, primaryGenreId, lgArtistId] = await Promise.all([
      resolveLabelId(),
      requireGenreId(release.primaryGenre),
      ensureLabelGridArtist(release.artist),
    ]);

    const trackPrimaryGenreId = await resolveGenreId(
      tMeta.primaryGenre ?? release.primaryGenre
    );

    const locale = rMeta.preferredLocalization || "en";
    const titleText = release.title;
    const artisticRole = rMeta.artisticRole || "MainArtist";

    const contribList =
      tMeta.contributors?.filter(
        (c) => c.firstName?.trim() && c.lastName?.trim() && c.roles?.length
      ) ?? [];

    const fallbackName = splitName(
      release.artist.fullName || release.artist.name
    );
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
      roles: Record<string, boolean>;
      ai_contribution: string;
    }> = [];

    for (const c of contributorsInput) {
      const writer = await createWriter({
        first_name: c.firstName.trim(),
        last_name: c.lastName.trim(),
        email: release.artist.email ?? undefined,
      });
      lgContributors.push({
        writer_id: unwrapId(writer),
        roles: Object.fromEntries(c.roles.map((r) => [r, true])),
        ai_contribution: "none",
      });
    }

    const releaseBody: Record<string, unknown> = {
      content_type: release.contentType,
      label_id: labelId,
      cat: release.catalogNumber,
      artwork_ai_usage: release.artworkAiUsage,
      primary_genre_id: primaryGenreId,
      preferred_localization: locale,
      barcode_number: release.upc || undefined,
      release_date: release.releaseDate
        ? release.releaseDate.toISOString()
        : undefined,
      explicit: release.explicit,
      cline_year: rMeta.clineYear ?? undefined,
      cline_name: rMeta.clineName || undefined,
      pline_year: rMeta.plineYear ?? undefined,
      pline_name: rMeta.plineName || undefined,
      titles: [
        {
          iso_code: locale,
          text: titleText,
          phonetic: null,
        },
      ],
      artists: [
        {
          artist_id: lgArtistId,
          artistic_role: artisticRole,
          position: 1,
        },
      ],
    };

    if (rMeta.mixVersion?.trim()) {
      releaseBody.mix_versions = [
        { iso_code: locale, text: rMeta.mixVersion.trim(), phonetic: null },
      ];
    }

    const lgRelease = await createRelease(releaseBody);
    const lgReleaseId = unwrapId(lgRelease);

    await uploadReleasePhoto(
      lgReleaseId,
      new Blob([new Uint8Array(artwork.buffer)], { type: artwork.mimeType }),
      artwork.filename
    );

    const trackBody: Record<string, unknown> = {
      release_id: lgReleaseId,
      disc: 1,
      track_num: track.trackNumber || 1,
      composition_type: tMeta.compositionType || "original_composition",
      audio_ai_usage: tMeta.audioAiUsage || "none",
      composition_ai_usage: tMeta.compositionAiUsage || "none",
      commercial_samples: tMeta.commercialSamples || "no",
      audio_language: tMeta.audioLanguage || "en",
      preferred_localization: locale,
      explicit: tMeta.explicit || release.explicit,
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
      titles: [{ iso_code: locale, text: track.title }],
      artists: [
        {
          artist_id: lgArtistId,
          artistic_role: artisticRole,
          position: 1,
        },
      ],
      contributors: lgContributors,
    };

    if (trackPrimaryGenreId) trackBody.primary_genre_id = trackPrimaryGenreId;
    if (tMeta.mixVersion?.trim()) {
      trackBody.mix_versions = [
        { iso_code: locale, text: tMeta.mixVersion.trim() },
      ];
    }
    if (tMeta.lyrics?.trim()) {
      trackBody.lyrics = [{ iso_code: locale, text: tMeta.lyrics.trim() }];
    }

    const lgTrack = await createTrack(trackBody);
    const lgTrackId = unwrapId(lgTrack);

    await uploadTrackStereoAudio(lgTrackId, {
      buffer: audio.buffer,
      filename: audio.filename,
      mimeType: audio.mimeType,
    });

    await prisma.$transaction([
      prisma.release.update({
        where: { id: release.id },
        data: {
          labelgridId: String(lgReleaseId),
          syncError: null,
        },
      }),
      prisma.track.update({
        where: { id: track.id },
        data: { labelgridId: String(lgTrackId) },
      }),
    ]);

    return { ok: true, releaseId: lgReleaseId, trackId: lgTrackId };
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
 * Upload cover and/or stereo audio to LabelGrid via their API.
 * - No labelgridId yet → creates draft + uploads both files (requires artwork + audio).
 * - Existing draft → POST /releases/{id}/photo and/or track stereo upload-url flow.
 */
export async function pushMediaToLabelGrid(input: {
  release: Release & { artist: Artist | null; tracks: Track[] };
  artwork?: StoredUpload | null;
  audio?: StoredUpload | null;
  /** Local track id when uploading audio (defaults to first track). */
  localTrackId?: string | null;
}): Promise<
  | { ok: true; releaseId: number; trackId?: number; created: boolean }
  | { ok: false; error: string }
> {
  if (!isLabelGridLive()) {
    return {
      ok: false,
      error: "LABELGRID_API_TOKEN is not set — cannot upload to LabelGrid.",
    };
  }

  const { release, artwork, audio } = input;
  const lgReleaseId = release.labelgridId ? Number(release.labelgridId) : NaN;

  // First-time: create draft + upload both assets.
  if (!Number.isFinite(lgReleaseId)) {
    if (!artwork || !audio) {
      return {
        ok: false,
        error:
          "Need both cover artwork and audio in memory to create the LabelGrid draft.",
      };
    }
    const synced = await syncSubmittedReleaseToLabelGrid({
      release,
      artwork,
      audio,
    });
    if (!synced.ok) return synced;
    return {
      ok: true,
      releaseId: synced.releaseId,
      trackId: synced.trackId,
      created: true,
    };
  }

  try {
    let lgTrackId: number | undefined;

    if (!artwork && !audio) {
      return {
        ok: true,
        releaseId: lgReleaseId,
        created: false,
      };
    }

    if (artwork) {
      await uploadReleasePhoto(
        lgReleaseId,
        new Blob([new Uint8Array(artwork.buffer)], { type: artwork.mimeType }),
        artwork.filename
      );
    }

    if (audio) {
      const track =
        (input.localTrackId
          ? release.tracks.find((t) => t.id === input.localTrackId)
          : release.tracks[0]) ?? null;
      if (!track) {
        return { ok: false, error: "No track found for audio upload." };
      }

      if (track.labelgridId && /^\d+$/.test(track.labelgridId)) {
        lgTrackId = Number(track.labelgridId);
      } else {
        // Track row exists locally but was never created on LabelGrid — create it.
        if (!release.artist) {
          return { ok: false, error: "Release has no artist to sync track." };
        }
        const rMeta = parseJsonObject<ReleaseMetadata>(release.metadataJson);
        const tMeta = parseJsonObject<TrackMetadata>(track.metadataJson);
        const locale = rMeta.preferredLocalization || "en";
        const artisticRole = rMeta.artisticRole || "MainArtist";
        const lgArtistId = await ensureLabelGridArtist(release.artist);
        const trackPrimaryGenreId = await resolveGenreId(
          tMeta.primaryGenre ?? release.primaryGenre
        );

        const trackBody: Record<string, unknown> = {
          release_id: lgReleaseId,
          disc: 1,
          track_num: track.trackNumber || 1,
          composition_type: tMeta.compositionType || "original_composition",
          audio_ai_usage: tMeta.audioAiUsage || "none",
          composition_ai_usage: tMeta.compositionAiUsage || "none",
          commercial_samples: tMeta.commercialSamples || "no",
          audio_language: tMeta.audioLanguage || "en",
          preferred_localization: locale,
          explicit: tMeta.explicit || release.explicit,
          isrc: track.isrc || undefined,
          titles: [{ iso_code: locale, text: track.title }],
          artists: [
            {
              artist_id: lgArtistId,
              artistic_role: artisticRole,
              position: 1,
            },
          ],
        };
        if (trackPrimaryGenreId) trackBody.primary_genre_id = trackPrimaryGenreId;

        const lgTrack = await createTrack(trackBody);
        lgTrackId = unwrapId(lgTrack);
        await prisma.track.update({
          where: { id: track.id },
          data: { labelgridId: String(lgTrackId) },
        });
      }

      await uploadTrackStereoAudio(lgTrackId, {
        buffer: audio.buffer,
        filename: audio.filename,
        mimeType: audio.mimeType,
      });
    }

    await prisma.release.update({
      where: { id: release.id },
      data: {
        syncError: null,
        labelgridReviewStatus: release.labelgridReviewStatus ?? "draft",
      },
    });

    return {
      ok: true,
      releaseId: lgReleaseId,
      trackId: lgTrackId,
      created: false,
    };
  } catch (error) {
    const message = formatLgError(error);
    console.error("[labelgrid/media]", release.id, message);
    await prisma.release.update({
      where: { id: release.id },
      data: { syncError: message.slice(0, 2000) },
    });
    return { ok: false, error: message };
  }
}

/**
 * Submit an already-synced LabelGrid draft into LG distribution review.
 * If local release has no labelgridId yet, syncs as draft first (with files).
 */
export async function submitLabelGridDraftForReview(input: {
  release: Release & { artist: Artist | null; tracks: Track[] };
  artwork?: StoredUpload | null;
  audio?: StoredUpload | null;
}): Promise<
  | { ok: true; releaseId: number; trackId?: number }
  | { ok: false; error: string }
> {
  if (!isLabelGridLive()) {
    return {
      ok: false,
      error: "LABELGRID_API_TOKEN is not set — cannot submit to LabelGrid.",
    };
  }

  const { release } = input;
  let lgReleaseId = release.labelgridId
    ? Number(release.labelgridId)
    : NaN;
  let lgTrackId = release.tracks[0]?.labelgridId
    ? Number(release.tracks[0].labelgridId)
    : undefined;

  try {
    if (!Number.isFinite(lgReleaseId)) {
      if (!input.artwork || !input.audio) {
        return {
          ok: false,
          error:
            "Release is not on LabelGrid yet and artwork/audio files are missing on the server. " +
            "Re-upload media on the release page, then approve again. " +
            "Set UPLOADS_DIR to a Railway volume path so uploads persist across redeploys.",
        };
      }
      const synced = await syncSubmittedReleaseToLabelGrid({
        release,
        artwork: input.artwork,
        audio: input.audio,
      });
      if (!synced.ok) return synced;
      lgReleaseId = synced.releaseId;
      lgTrackId = synced.trackId;
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

    return { ok: true, releaseId: lgReleaseId, trackId: lgTrackId };
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
