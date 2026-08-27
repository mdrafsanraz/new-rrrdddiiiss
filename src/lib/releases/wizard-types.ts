/**
 * Client-side draft shape for the 5-step Create Release wizard.
 * Maps to local DB + LabelGrid via /api/releases/drafts and submit.
 */

import type { ContributorDraft } from "@/lib/releases/constants";

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
  // Step 1
  artworkFile: File | null;
  artworkUrl: string | null;
  artworkPreview: string | null;
  title: string;
  artistId: string;
  contentType: "Single" | "EP" | "Album";
  primaryGenre: string;
  secondaryGenre: string;
  releaseDate: string;
  upc: string;
  mixVersion: string;
  preferredLocalization: string;
  artworkAiUsage: "none" | "some" | "material" | "all";
  explicit: "off" | "on" | "edited";
  // Step 2 — Distribution
  allStores: boolean;
  selectedOutletIds: number[];
  worldwide: boolean;
  territoryCodes: string[];
  // Step 3 — Tracks
  tracks: WizardTrack[];
  // Step 4 — Credits
  contributors: ContributorDraft[];
  clineYear: string;
  clineName: string;
  plineYear: string;
  plineName: string;
  hasSamples: boolean;
  isRemix: boolean;
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

export function newContributor(): ContributorDraft {
  return {
    id: crypto.randomUUID(),
    firstName: "",
    lastName: "",
    roles: ["Composer", "Lyricist"],
  };
}

export const WIZARD_STEPS = [
  { id: "release", label: "Release", title: "Tell us about your release" },
  { id: "distribution", label: "Distribution", title: "Choose where your music goes" },
  { id: "tracks", label: "Tracks", title: "Add your music" },
  { id: "credits", label: "Credits", title: "Credits & rights" },
  { id: "review", label: "Review", title: "Review your release" },
] as const;
