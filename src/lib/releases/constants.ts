/** Fields aligned with LabelGrid ReleaseCreateData (document.json) — local until sandbox sync. */

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

/** LabelGrid ReleaseCreateData.explicit */
export const EXPLICIT_OPTIONS = [
  { value: "off", label: "Not explicit" },
  { value: "on", label: "Explicit" },
  { value: "edited", label: "Clean / edited" },
] as const;

/** Common genres for the form; map to LabelGrid genre ids when syncing. */
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
