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

type GenreRow = { id: number; name?: string; title?: string };

let genresCache: GenreRow[] | null = null;

async function loadGenres(): Promise<GenreRow[]> {
  if (genresCache) return genresCache;
  const genres = await listGenres(1, 200);
  genresCache = genres.data ?? [];
  return genresCache;
}

async function resolveGenreId(
  genreName: string | null | undefined
): Promise<number | null> {
  if (!genreName?.trim()) return null;
  const genres = await loadGenres();
  const needle = genreName.trim().toLowerCase();
  const match =
    genres.find((g) => {
      const name = (g.name ?? g.title ?? "").toLowerCase();
      return name === needle || name.includes(needle);
    }) ?? null;
  return match?.id ?? null;
}

async function requireGenreId(genreName: string | null): Promise<number> {
  const id = await resolveGenreId(genreName);
  if (id) return id;
  const genres = await loadGenres();
  if (genres[0]?.id) return genres[0].id;
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

function pickStoreUrls(urls: ReleaseMetadata["storeUrls"]) {
  if (!urls) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(urls)) {
    if (v?.trim()) out[k] = v.trim();
  }
  return out;
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

    const [secondaryGenreId, tertiaryGenreId, trackPrimaryGenreId, trackSecondaryGenreId, trackTertiaryGenreId] =
      await Promise.all([
        resolveGenreId(rMeta.secondaryGenre),
        resolveGenreId(rMeta.tertiaryGenre),
        resolveGenreId(tMeta.primaryGenre ?? release.primaryGenre),
        resolveGenreId(tMeta.secondaryGenre),
        resolveGenreId(tMeta.tertiaryGenre),
      ]);

    const writerFirst =
      tMeta.writerFirstName ||
      splitName(release.artist.fullName || release.artist.name).first;
    const writerLast =
      tMeta.writerLastName ||
      splitName(release.artist.fullName || release.artist.name).last;

    const writer = await createWriter({
      first_name: writerFirst,
      last_name: writerLast,
      email: release.artist.email ?? undefined,
    });
    const writerId = unwrapId(writer);

    const locale = rMeta.preferredLocalization || "en";
    const titleText = release.title;
    const artisticRole = rMeta.artisticRole || "MainArtist";

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
      release_pre_order_date: rMeta.preOrderDate
        ? new Date(`${rMeta.preOrderDate}T00:00:00.000Z`).toISOString()
        : undefined,
      enable_exact_release_time: Boolean(rMeta.enableExactReleaseTime),
      explicit: release.explicit,
      description_long: rMeta.descriptionLong || undefined,
      cline_year: rMeta.clineYear ?? undefined,
      cline_name: rMeta.clineName || undefined,
      pline_year: rMeta.plineYear ?? undefined,
      pline_name: rMeta.plineName || undefined,
      courtesy_line: rMeta.courtesyLine || undefined,
      transfer_from_distributor: rMeta.transferFromDistributor || undefined,
      titles: [
        {
          iso_code: locale,
          text: titleText,
          phonetic: rMeta.phoneticTitle || null,
        },
      ],
      artists: [
        {
          artist_id: lgArtistId,
          artistic_role: artisticRole,
          position: 1,
        },
      ],
      ...pickStoreUrls(rMeta.storeUrls),
    };

    if (secondaryGenreId) releaseBody.secondary_genre_id = secondaryGenreId;
    if (tertiaryGenreId) releaseBody.tertiary_genre_id = tertiaryGenreId;
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

    const trackLocale = tMeta.preferredLocalization || locale;
    const writerRoles = tMeta.writerRoles?.length
      ? tMeta.writerRoles
      : ["Composer", "Lyricist"];
    const rolesObj = Object.fromEntries(writerRoles.map((r) => [r, true]));

    const trackBody: Record<string, unknown> = {
      release_id: lgReleaseId,
      disc: tMeta.disc ?? 1,
      track_num: track.trackNumber || 1,
      composition_type: tMeta.compositionType || "original_composition",
      audio_ai_usage: tMeta.audioAiUsage || "none",
      composition_ai_usage: tMeta.compositionAiUsage || "none",
      commercial_samples: tMeta.commercialSamples || "no",
      audio_language: tMeta.audioLanguage || "en",
      preferred_localization: trackLocale,
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
      courtesy_line: tMeta.courtesyLine || undefined,
      titles: [{ iso_code: trackLocale, text: track.title }],
      artists: [
        {
          artist_id: lgArtistId,
          artistic_role: artisticRole,
          position: 1,
        },
      ],
      contributors: [
        {
          writer_id: writerId,
          roles: rolesObj,
          ai_contribution: "none",
        },
      ],
    };

    if (trackPrimaryGenreId) trackBody.primary_genre_id = trackPrimaryGenreId;
    if (trackSecondaryGenreId) trackBody.secondary_genre_id = trackSecondaryGenreId;
    if (trackTertiaryGenreId) trackBody.tertiary_genre_id = trackTertiaryGenreId;
    if (tMeta.mixVersion?.trim()) {
      trackBody.mix_versions = [
        { iso_code: trackLocale, text: tMeta.mixVersion.trim() },
      ];
    }
    if (tMeta.lyrics?.trim()) {
      trackBody.lyrics = [
        { iso_code: trackLocale, text: tMeta.lyrics.trim() },
      ];
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
            "Release is not on LabelGrid yet and artwork/audio files are missing.",
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
