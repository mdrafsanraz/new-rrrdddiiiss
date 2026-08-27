/**
 * Client-side draft shape for the 5-step Create Release wizard.
 * Order: Release → Distribution → Tracks → Credits → Review.
 * Every field maps to a real LabelGrid field or a genuine RDISTRO need —
 * no decorative state. Catalog values (genres, outlets, territories,
 * contributor roles, writers, publishers) come from live LabelGrid
 * fetches, never hardcoded lists.
 */

import type {
  ContributorDraft,
  PublisherSplitDraft,
  WriterSplitDraft,
} from "@/lib/releases/constants";

export type WizardTrack = {
  clientId: string;
  id?: string;
  title: string;
  mixVersion: string;
  isrc: string;
  compositionType: "original_composition" | "cover_song" | "public_domain";
  explicit: "off" | "on" | "edited";
  audioAiUsage: "none" | "some" | "material" | "all";
  compositionAiUsage: "none" | "some" | "material" | "all";
  commercialSamples: "no" | "exclusive" | "non_exclusive";
  audioLanguage: string;
  featuredArtistNames: string[];
  hasMechanicalLicense: boolean;
  lyrics: string;
  audioFile: File | null;
  audioUrl: string | null;
  audioDurationSec: number | null;
  /** LabelGrid async audio processing (PUT stereo → 202 upload_attempt). */
  audioProcessing: boolean;
  audioProcessingError: string | null;
  /** Cover/sample license file for progressive disclosure */
  licenseFile: File | null;
  licenseType: "cover" | "sample" | null;
  /** Already-saved license document (server storage; synced to LabelGrid). */
  licenseUrl: string | null;
};

export type WizardState = {
  releaseId: string | null;
  step: number;
  // Step 1 — Release
  artworkFile: File | null;
  artworkUrl: string | null;
  artworkPreview: string | null;
  artworkAiUsage: "none" | "some" | "material" | "all";
  /** Transferring from another distributor? */
  isTransfer: boolean;
  transferFromDistributor: string;
  /** Original release date (transfers) — sent as LabelGrid release_date. */
  originalReleaseDate: string;
  title: string;
  artistId: string;
  contentType: "Single" | "EP" | "Album";
  mixVersion: string;
  /** Live LabelGrid genre id + display name (GET /genres). */
  primaryGenreId: number | null;
  primaryGenreName: string;
  releaseDate: string;
  upc: string;
  preferredLocalization: string;
  // Step 2 — Distribution
  allStores: boolean;
  /** LabelGrid distro outlet key slugs (GET /distro-outlets). */
  selectedOutletKeys: string[];
  worldwide: boolean;
  /** ISO alpha-2 codes from live GET /territories. */
  territoryCodes: string[];
  // Step 3 — Tracks
  tracks: WizardTrack[];
  // Step 4 — Credits
  contributors: ContributorDraft[];
  writerSplits: WriterSplitDraft[];
  publisherSplits: PublisherSplitDraft[];
  selfPublished: boolean;
  clineYear: string;
  clineName: string;
  plineYear: string;
  plineName: string;
  // Step 5 — Review
  rightsConfirmed: boolean;
};

export function newTrack(partial?: Partial<WizardTrack>): WizardTrack {
  return {
    clientId: crypto.randomUUID(),
    title: "",
    mixVersion: "",
    isrc: "",
    compositionType: "original_composition",
    explicit: "off",
    audioAiUsage: "none",
    compositionAiUsage: "none",
    commercialSamples: "no",
    audioLanguage: "en",
    featuredArtistNames: [],
    hasMechanicalLicense: false,
    lyrics: "",
    audioFile: null,
    audioUrl: null,
    audioDurationSec: null,
    audioProcessing: false,
    audioProcessingError: null,
    licenseFile: null,
    licenseType: null,
    licenseUrl: null,
    ...partial,
  };
}

export function newContributor(
  defaultRoles: string[] = [],
  catalogLoaded = false
): ContributorDraft {
  return {
    id: crypto.randomUUID(),
    writerId: null,
    firstName: "",
    lastName: "",
    // Caller resolves defaultRoles against the live catalog first — this
    // factory never invents a label on its own.
    roles: defaultRoles,
    aiContribution: "none",
    // False only when the catalog wasn't loaded yet at creation time, so
    // the Credits step's backfill effect fills defaults in once it is.
    // True whenever the catalog WAS consulted, even if it resolved to no
    // roles — otherwise the backfill effect would retry forever.
    defaultsApplied: catalogLoaded,
  };
}

export function newWriterSplit(share = 100): WriterSplitDraft {
  return {
    id: crypto.randomUUID(),
    writerId: null,
    firstName: "",
    lastName: "",
    roles: [],
    share,
  };
}

export function newPublisherSplit(share = 100): PublisherSplitDraft {
  return {
    id: crypto.randomUUID(),
    publisherId: null,
    name: "",
    share,
  };
}

export const WIZARD_STEPS = [
  { id: "release", label: "Release", title: "Tell us about your release" },
  { id: "distribution", label: "Distribution", title: "Choose where your music goes" },
  { id: "tracks", label: "Tracks", title: "Add your music" },
  { id: "credits", label: "Credits", title: "Credits & rights" },
  { id: "review", label: "Review", title: "Review your release" },
] as const;

export const STEP_RELEASE = 0;
export const STEP_DISTRIBUTION = 1;
export const STEP_TRACKS = 2;
export const STEP_CREDITS = 3;
export const STEP_REVIEW = 4;
