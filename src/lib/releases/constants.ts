/** LabelGrid ReleaseCreateData + TrackCreateData aligned constants (sandbox OpenAPI). */

export const CONTENT_TYPES = [
  "Single",
  "EP",
  "Album",
  "Compilation",
  "Mix",
  "Podcast",
] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

/** LabelGrid AiUsageEnum */
export const ARTWORK_AI_USAGE = ["none", "some", "material", "all"] as const;
export type ArtworkAiUsage = (typeof ARTWORK_AI_USAGE)[number];

export const EXPLICIT_OPTIONS = [
  { value: "off", label: "Not explicit" },
  { value: "on", label: "Explicit" },
  { value: "edited", label: "Clean / edited" },
] as const;

export const COMPOSITION_TYPES = [
  { value: "original_composition", label: "Original composition" },
  { value: "cover_song", label: "Cover song" },
  { value: "public_domain", label: "Public domain" },
] as const;

export const COMMERCIAL_SAMPLES = [
  { value: "no", label: "No commercial samples" },
  { value: "exclusive", label: "Exclusive sample clearance" },
  { value: "non_exclusive", label: "Non-exclusive sample clearance" },
] as const;

/** Common artistic roles accepted as strings by LabelGrid ReleaseArtistUpdateData */
export const ARTISTIC_ROLES = [
  "MainArtist",
  "FeaturedArtist",
  "Remixer",
  "Producer",
  "Composer",
  "Lyricist",
  "Arranger",
  "Conductor",
  "Orchestra",
  "Actor",
  "With",
] as const;

export const LOCALES = [
  { value: "en", label: "English (en)" },
  { value: "es", label: "Spanish (es)" },
  { value: "es-419", label: "Latin American Spanish (es-419)" },
  { value: "fr", label: "French (fr)" },
  { value: "de", label: "German (de)" },
  { value: "pt", label: "Portuguese (pt)" },
  { value: "pt-BR", label: "Brazilian Portuguese (pt-BR)" },
  { value: "it", label: "Italian (it)" },
  { value: "ja", label: "Japanese (ja)" },
  { value: "ja-Jpan", label: "Japanese Kanji (ja-Jpan)" },
  { value: "ko", label: "Korean (ko)" },
  { value: "zh", label: "Chinese (zh)" },
  { value: "zxx", label: "No linguistic content (zxx)" },
] as const;

/** Common recording countries (ISO 3166-1 alpha-2) — subset of LabelGrid enum */
export const RECORDING_COUNTRIES = [
  { value: "", label: "Not specified" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "ES", label: "Spain" },
  { value: "IT", label: "Italy" },
  { value: "NL", label: "Netherlands" },
  { value: "SE", label: "Sweden" },
  { value: "NO", label: "Norway" },
  { value: "DK", label: "Denmark" },
  { value: "FI", label: "Finland" },
  { value: "IE", label: "Ireland" },
  { value: "PT", label: "Portugal" },
  { value: "BR", label: "Brazil" },
  { value: "MX", label: "Mexico" },
  { value: "AR", label: "Argentina" },
  { value: "JP", label: "Japan" },
  { value: "KR", label: "South Korea" },
  { value: "IN", label: "India" },
  { value: "NG", label: "Nigeria" },
  { value: "ZA", label: "South Africa" },
  { value: "BD", label: "Bangladesh" },
  { value: "PK", label: "Pakistan" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "SG", label: "Singapore" },
  { value: "NZ", label: "New Zealand" },
] as const;

/** Common genres for the form; mapped to LabelGrid genre ids when syncing. */
export const PRIMARY_GENRES = [
  "Pop",
  "Hip Hop/Rap",
  "R&B",
  "Electronic",
  "Dance",
  "Rock",
  "Indie",
  "Alternative",
  "Country",
  "Latin",
  "Afrobeats",
  "Jazz",
  "Folk",
  "Metal",
  "Reggae",
  "World",
  "Soundtrack",
  "Ambient",
  "Classical",
  "Other",
] as const;

export const CONTRIBUTOR_ROLE_KEYS = [
  "Composer",
  "Lyricist",
  "Producer",
  "Mixer",
  "Engineer",
  "Arranger",
  "FeaturedArtist",
] as const;

/** Stored on Release.metadataJson — mirrors optional ReleaseCreateData fields. */
export type ReleaseMetadata = {
  mixVersion?: string;
  phoneticTitle?: string;
  descriptionLong?: string;
  secondaryGenre?: string;
  tertiaryGenre?: string;
  preOrderDate?: string;
  preferredLocalization?: string;
  enableExactReleaseTime?: boolean;
  releaseTime?: string; // HH:mm when enableExactReleaseTime
  artisticRole?: string;
  clineYear?: number | null;
  clineName?: string;
  plineYear?: number | null;
  plineName?: string;
  courtesyLine?: string;
  transferFromDistributor?: string;
  /** Existing DSP / store URLs */
  storeUrls?: Partial<
    Record<
      | "spotify_url"
      | "applemusic_url"
      | "itunes_url"
      | "youtubemusic_url"
      | "youtube_url"
      | "deezer_url"
      | "tidal_url"
      | "amazon_url"
      | "beatport_url"
      | "soundcloud_url"
      | "bandcamp_url",
      string
    >
  >;
};

/** Stored on Track.metadataJson — mirrors TrackCreateData fields. */
export type TrackMetadata = {
  mixVersion?: string;
  disc?: number;
  compositionType?: string;
  audioAiUsage?: string;
  compositionAiUsage?: string;
  commercialSamples?: string;
  audioLanguage?: string;
  recordingCountry?: string;
  preferredLocalization?: string;
  primaryGenre?: string;
  secondaryGenre?: string;
  tertiaryGenre?: string;
  hasMechanicalLicense?: boolean;
  iswc?: string;
  dolbyIsrc?: string;
  lyrics?: string;
  previewStartTime?: number | null;
  previewLength?: number | null;
  albumOnly?: boolean;
  freeDownload?: boolean;
  instantGratification?: boolean;
  explicit?: string;
  clineYear?: number | null;
  clineName?: string;
  plineYear?: number | null;
  plineName?: string;
  courtesyLine?: string;
  /** Writer credit used to create LabelGrid writer + contributor */
  writerFirstName?: string;
  writerLastName?: string;
  writerRoles?: string[];
};

export function parseJsonObject<T extends object>(raw: string | null | undefined): T {
  if (!raw) return {} as T;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? (v as T) : ({} as T);
  } catch {
    return {} as T;
  }
}
