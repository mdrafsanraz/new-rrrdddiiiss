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

async function resolveGenreId(primaryGenre: string | null): Promise<number> {
  const genres = await listGenres(1, 200);
  const needle = (primaryGenre ?? "").trim().toLowerCase();
  const match =
    genres.data?.find((g) => {
      const name = (g.name ?? g.title ?? "").toLowerCase();
      return name === needle || name.includes(needle);
    }) ?? genres.data?.[0];

  if (!match?.id) {
    throw new Error(
      "Could not resolve a LabelGrid genre id. Check sandbox /genres access."
    );
  }
  return match.id;
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

  try {
    const [labelId, genreId, lgArtistId] = await Promise.all([
      resolveLabelId(),
      resolveGenreId(release.primaryGenre),
      ensureLabelGridArtist(release.artist),
    ]);

    const { first, last } = splitName(
      release.artist.fullName || release.artist.name
    );
    const writer = await createWriter({
      first_name: first,
      last_name: last,
      email: release.artist.email ?? undefined,
    });
    const writerId = unwrapId(writer);

    const titleText = release.title;
    const lgRelease = await createRelease({
      content_type: release.contentType,
      label_id: labelId,
      cat: release.catalogNumber,
      artwork_ai_usage: release.artworkAiUsage,
      primary_genre_id: genreId,
      upc: release.upc || undefined,
      release_date: release.releaseDate
        ? release.releaseDate.toISOString()
        : undefined,
      explicit: release.explicit,
      titles: [{ iso_code: "en", text: titleText }],
      artists: [
        {
          artist_id: lgArtistId,
          artistic_role: "MainArtist",
          position: 1,
        },
      ],
    });

    const lgReleaseId = unwrapId(lgRelease);

    await uploadReleasePhoto(
      lgReleaseId,
      new Blob([new Uint8Array(artwork.buffer)], { type: artwork.mimeType }),
      artwork.filename
    );

    const lgTrack = await createTrack({
      release_id: lgReleaseId,
      disc: 1,
      track_num: track.trackNumber || 1,
      composition_type: "original_composition",
      audio_ai_usage: "none",
      composition_ai_usage: "none",
      commercial_samples: "no",
      audio_language: "en",
      explicit: release.explicit,
      primary_genre_id: genreId,
      titles: [{ iso_code: "en", text: track.title }],
      artists: [
        {
          artist_id: lgArtistId,
          artistic_role: "MainArtist",
          position: 1,
        },
      ],
      contributors: [
        {
          writer_id: writerId,
          roles: { Composer: true, Lyricist: true },
          ai_contribution: "none",
        },
      ],
    });

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
