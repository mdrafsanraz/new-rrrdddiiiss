/**
 * LabelGrid payload builders — UI never builds these directly.
 * Field names and enums come from document.json (ReleaseCreateData / TrackCreateData).
 */

import type { Artist, Release, Track } from "@prisma/client";
import {
  parseJsonObject,
  type ReleaseMetadata,
  type TrackMetadata,
  type ContributorDraft,
} from "@/lib/releases/constants";

export type ReleaseArtistInput = {
  artist_id: number;
  artistic_role: string;
  position: number;
};

export type TitleLoc = {
  iso_code: string;
  text: string;
  phonetic?: string | null;
};

/** Friendly UI release type → LabelGrid ContentTypeEnum */
export const UI_CONTENT_TYPE_TO_LG = {
  Single: "Single",
  EP: "EP",
  Album: "Album",
} as const;

/** Friendly explicit → LabelGrid explicit enum */
export const UI_EXPLICIT_TO_LG = {
  no: "off",
  yes: "on",
  clean: "edited",
} as const;

/** Friendly composition → LabelGrid composition_type */
export const UI_COMPOSITION_TO_LG = {
  original: "original_composition",
  cover: "cover_song",
  public_domain: "public_domain",
} as const;

/** Friendly samples Yes/No → LabelGrid CommercialSamplesEnum (clearance detail in advanced) */
export const UI_SAMPLES_TO_LG = {
  no: "no",
  yes_exclusive: "exclusive",
  yes_non_exclusive: "non_exclusive",
} as const;

export function buildLabelGridReleasePayload(input: {
  labelId: number;
  catalogNumber: string;
  title: string;
  locale: string;
  contentType: string;
  artworkAiUsage: string;
  primaryGenreId: number;
  secondaryGenreId?: number | null;
  artisticRole: string;
  lgArtistId: number;
  releaseDateIso?: string | null;
  barcode?: string | null;
  mixVersion?: string | null;
  explicit?: string;
  clineYear?: number | null;
  clineName?: string | null;
  plineYear?: number | null;
  plineName?: string | null;
  dspConfigs?: Array<{
    distro_outlet_id: number;
    enabled: boolean;
  }>;
  /** PublicReleaseDate-style overrides when not worldwide-default */
  releaseDates?: unknown[] | null;
}): Record<string, unknown> {
  const body: Record<string, unknown> = {
    content_type: input.contentType,
    label_id: input.labelId,
    cat: input.catalogNumber,
    artwork_ai_usage: input.artworkAiUsage,
    primary_genre_id: input.primaryGenreId,
    preferred_localization: input.locale,
    explicit: input.explicit ?? "off",
    titles: [
      {
        iso_code: input.locale,
        text: input.title,
        phonetic: null,
      } satisfies TitleLoc,
    ],
    artists: [
      {
        artist_id: input.lgArtistId,
        artistic_role: input.artisticRole,
        position: 1,
      } satisfies ReleaseArtistInput,
    ],
  };

  if (input.secondaryGenreId) {
    body.secondary_genre_id = input.secondaryGenreId;
  }
  if (input.releaseDateIso) body.release_date = input.releaseDateIso;
  if (input.barcode?.trim()) body.barcode_number = input.barcode.trim();
  if (input.mixVersion?.trim()) {
    body.mix_versions = [
      {
        iso_code: input.locale,
        text: input.mixVersion.trim(),
        phonetic: null,
      },
    ];
  }
  if (input.clineYear != null) body.cline_year = input.clineYear;
  if (input.clineName?.trim()) body.cline_name = input.clineName.trim();
  if (input.plineYear != null) body.pline_year = input.plineYear;
  if (input.plineName?.trim()) body.pline_name = input.plineName.trim();
  if (input.dspConfigs?.length) body.dsp_configs = input.dspConfigs;
  if (input.releaseDates) body.release_dates = input.releaseDates;

  return body;
}

export function buildLabelGridTrackPayload(input: {
  lgReleaseId: number;
  disc?: number;
  trackNumber: number;
  title: string;
  locale: string;
  compositionType: string;
  audioAiUsage: string;
  compositionAiUsage: string;
  commercialSamples: string;
  audioLanguage: string;
  artisticRole: string;
  lgArtistId: number;
  featuredLgArtistIds?: number[];
  contributors: Array<{
    writer_id: number;
    roles: Record<string, boolean>;
    ai_contribution?: string;
  }>;
  primaryGenreId?: number | null;
  isrc?: string | null;
  mixVersion?: string | null;
  explicit?: string | null;
  recordingCountry?: string | null;
  hasMechanicalLicense?: boolean | null;
  clineYear?: number | null;
  clineName?: string | null;
  plineYear?: number | null;
  plineName?: string | null;
  lyrics?: string | null;
}): Record<string, unknown> {
  const artists: ReleaseArtistInput[] = [
    {
      artist_id: input.lgArtistId,
      artistic_role: input.artisticRole,
      position: 1,
    },
  ];
  (input.featuredLgArtistIds ?? []).forEach((id, i) => {
    artists.push({
      artist_id: id,
      artistic_role: "FeaturedArtist",
      position: i + 2,
    });
  });

  const body: Record<string, unknown> = {
    release_id: input.lgReleaseId,
    disc: input.disc ?? 1,
    track_num: input.trackNumber,
    composition_type: input.compositionType,
    audio_ai_usage: input.audioAiUsage,
    composition_ai_usage: input.compositionAiUsage,
    commercial_samples: input.commercialSamples,
    audio_language: input.audioLanguage,
    preferred_localization: input.locale,
    titles: [{ iso_code: input.locale, text: input.title }],
    artists,
    contributors: input.contributors.map((c) => ({
      writer_id: c.writer_id,
      roles: c.roles,
      ai_contribution: c.ai_contribution ?? "none",
    })),
  };

  if (input.primaryGenreId) body.primary_genre_id = input.primaryGenreId;
  if (input.isrc?.trim()) body.isrc = input.isrc.trim();
  if (input.mixVersion?.trim()) {
    body.mix_versions = [
      { iso_code: input.locale, text: input.mixVersion.trim() },
    ];
  }
  if (input.explicit) body.explicit = input.explicit;
  if (input.recordingCountry) body.recording_country = input.recordingCountry;
  if (input.hasMechanicalLicense != null) {
    body.has_mechanical_license = input.hasMechanicalLicense;
  }
  if (input.clineYear != null) body.cline_year = input.clineYear;
  if (input.clineName?.trim()) body.cline_name = input.clineName.trim();
  if (input.plineYear != null) body.pline_year = input.plineYear;
  if (input.plineName?.trim()) body.pline_name = input.plineName.trim();
  if (input.lyrics?.trim()) {
    body.lyrics = [{ iso_code: input.locale, text: input.lyrics.trim() }];
  }

  return body;
}

export function buildLabelGridWriterPayload(input: {
  firstName: string;
  lastName: string;
  email?: string | null;
}): { first_name: string; last_name: string; email?: string } {
  return {
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    ...(input.email ? { email: input.email } : {}),
  };
}

/** Extract draft wizard state from local release + tracks. */
export function releaseToWizardSnapshot(
  release: Release & { artist: Artist | null; tracks: Track[] }
) {
  const rMeta = parseJsonObject<ReleaseMetadata>(release.metadataJson);
  return {
    title: release.title,
    artistId: release.artistId,
    contentType: release.contentType,
    primaryGenre: release.primaryGenre,
    releaseDate: release.releaseDate
      ? release.releaseDate.toISOString().slice(0, 10)
      : "",
    upc: release.upc ?? "",
    artworkAiUsage: release.artworkAiUsage,
    explicit: release.explicit,
    artworkUrl: release.artworkUrl,
    metadata: rMeta,
    tracks: release.tracks.map((t) => {
      const tMeta = parseJsonObject<TrackMetadata>(t.metadataJson);
      return {
        id: t.id,
        title: t.title,
        trackNumber: t.trackNumber,
        isrc: t.isrc ?? "",
        audioUrl: t.audioUrl,
        metadata: tMeta,
      };
    }),
  };
}

export function contributorRolesObject(roles: string[]): Record<string, string> {
  // LabelGrid validates each roles.* entry as a string (422 on boolean).
  return Object.fromEntries(roles.map((r) => [r, "true"]));
}

export type { ContributorDraft };
