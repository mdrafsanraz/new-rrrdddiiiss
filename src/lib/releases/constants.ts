/** LabelGrid-aligned constants for the release builder. */

export const CONTENT_TYPES = [
  "Single",
  "EP",
  "Album",
  "Compilation",
  "Mix",
  "Podcast",
] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

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
  { value: "ko", label: "Korean (ko)" },
  { value: "zh", label: "Chinese (zh)" },
  { value: "zxx", label: "No linguistic content (zxx)" },
] as const;

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
  { value: "BD", label: "Bangladesh" },
  { value: "IN", label: "India" },
  { value: "JP", label: "Japan" },
  { value: "KR", label: "South Korea" },
  { value: "NG", label: "Nigeria" },
  { value: "BR", label: "Brazil" },
  { value: "MX", label: "Mexico" },
] as const;

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

// Contributor roles are never hardcoded — the Credits step fetches
// LabelGrid's live catalog via GET /api/labelgrid/contributor-roles.

export type ContributorDraft = {
  id: string;
  firstName: string;
  lastName: string;
  roles: string[];
};

export type ReleaseMetadata = {
  mixVersion?: string;
  preferredLocalization?: string;
  artisticRole?: string;
  clineYear?: number | null;
  clineName?: string;
  plineYear?: number | null;
  plineName?: string;
  secondaryGenre?: string;
  /** Name of the previous distributor when this release is a transfer. */
  transferFromDistributor?: string;
  allStores?: boolean;
  /** LabelGrid distro outlet slugs (the `key` field) — not numeric ids. */
  selectedOutletKeys?: string[];
  worldwide?: boolean;
  territoryCodes?: string[];
};

export type TrackMetadata = {
  mixVersion?: string;
  compositionType?: string;
  audioAiUsage?: string;
  compositionAiUsage?: string;
  commercialSamples?: string;
  audioLanguage?: string;
  recordingCountry?: string;
  primaryGenre?: string;
  hasMechanicalLicense?: boolean;
  iswc?: string;
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
  featuredArtistNames?: string[];
  /** Multiple writer/contributor credits for LabelGrid. */
  contributors?: Array<{
    firstName: string;
    lastName: string;
    roles: string[];
  }>;
  /** Cover/sample clearance document (POST /tracks/{id}/licenses). */
  licenseType?: "cover" | "sample" | null;
  licenseUrl?: string | null;
  /** Set once the license has been uploaded to LabelGrid. */
  licenseSyncedAt?: string | null;
  /** LabelGrid async audio processing (PUT stereo → 202 upload_attempt). */
  audioUploadAttemptId?: string | null;
  audioProcessing?: boolean;
  /** Set when the upload_attempt resolved to status "failed". */
  audioProcessingError?: string | null;
};

export function parseJsonObject<T extends object>(
  raw: string | null | undefined
): T {
  if (!raw) return {} as T;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? (v as T) : ({} as T);
  } catch {
    return {} as T;
  }
}

/** RDISTRO + 6 alphanumeric chars (no ambiguous 0/O/1/I). */
export function makeCatalogCandidate(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `RDISTRO${suffix}`;
}
