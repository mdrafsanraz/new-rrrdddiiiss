import type { Release, Track } from "@prisma/client";
import {
  parseJsonObject,
  type ReleaseMetadata,
  type TrackMetadata,
} from "@/lib/releases/constants";
import {
  newContributor,
  newTrack,
  type WizardState,
  type WizardTrack,
} from "@/lib/releases/wizard-types";

type ReleaseWithTracks = Release & {
  tracks: Track[];
};

/** Map a saved release into ReleaseBuilder initial state (edit / re-upload flow). */
export function wizardStateFromRelease(
  release: ReleaseWithTracks,
  artistName: string
): WizardState {
  const rMeta = parseJsonObject<ReleaseMetadata>(release.metadataJson);
  const tracks: WizardTrack[] =
    release.tracks.length > 0
      ? release.tracks.map((t) => {
          const tMeta = parseJsonObject<TrackMetadata>(t.metadataJson);
          return newTrack({
            id: t.id,
            clientId: t.id,
            title: t.title,
            mixVersion: tMeta.mixVersion ?? "",
            isrc: t.isrc ?? "",
            compositionType:
              (tMeta.compositionType as WizardTrack["compositionType"]) ??
              "original_composition",
            explicit:
              (tMeta.explicit as WizardTrack["explicit"]) ??
              (release.explicit as WizardTrack["explicit"]) ??
              "off",
            audioAiUsage:
              (tMeta.audioAiUsage as WizardTrack["audioAiUsage"]) ?? "none",
            compositionAiUsage:
              (tMeta.compositionAiUsage as WizardTrack["compositionAiUsage"]) ??
              "none",
            commercialSamples:
              (tMeta.commercialSamples as WizardTrack["commercialSamples"]) ??
              "no",
            audioLanguage: tMeta.audioLanguage ?? "en",
            featuredArtistNames: tMeta.featuredArtistNames ?? [],
            hasMechanicalLicense: tMeta.hasMechanicalLicense ?? false,
            lyrics: tMeta.lyrics ?? "",
            audioFile: null,
            audioUrl: t.audioUrl,
            audioDurationSec: null,
            audioProcessing: tMeta.audioProcessing ?? false,
            audioProcessingError: tMeta.audioProcessingError ?? null,
            licenseFile: null,
            licenseType: tMeta.licenseType ?? null,
            licenseUrl: tMeta.licenseUrl ?? null,
          });
        })
      : [newTrack()];

  const contributors =
    release.tracks[0] &&
    parseJsonObject<TrackMetadata>(release.tracks[0].metadataJson).contributors
      ?.length
      ? parseJsonObject<TrackMetadata>(release.tracks[0].metadataJson)
          .contributors!.map((c) => ({
            id: crypto.randomUUID(),
            firstName: c.firstName,
            lastName: c.lastName,
            roles: c.roles,
          }))
      : [newContributor()];

  return {
    releaseId: release.id,
    step: 0,
    artworkFile: null,
    artworkUrl: release.artworkUrl,
    artworkPreview: release.artworkUrl,
    title: release.title === "Untitled release" ? "" : release.title,
    artistId: release.artistId ?? "",
    contentType: (release.contentType as WizardState["contentType"]) ?? "Single",
    primaryGenre: release.primaryGenre ?? "Pop",
    secondaryGenre: rMeta.secondaryGenre ?? "",
    releaseDate: release.releaseDate
      ? release.releaseDate.toISOString().slice(0, 10)
      : "",
    upc: release.upc ?? "",
    mixVersion: rMeta.mixVersion ?? "",
    preferredLocalization: rMeta.preferredLocalization ?? "en",
    artworkAiUsage:
      (release.artworkAiUsage as WizardState["artworkAiUsage"]) ?? "none",
    explicit: (release.explicit as WizardState["explicit"]) ?? "off",
    transferFromDistributor: rMeta.transferFromDistributor ?? "",
    tracks,
    contributors,
    clineYear: rMeta.clineYear ? String(rMeta.clineYear) : String(new Date().getFullYear()),
    clineName: rMeta.clineName ?? artistName,
    plineYear: rMeta.plineYear ? String(rMeta.plineYear) : String(new Date().getFullYear()),
    plineName: rMeta.plineName ?? artistName,
    hasSamples: tracks.some((t) => t.commercialSamples !== "no"),
    isRemix: false,
    allStores: rMeta.allStores ?? true,
    selectedOutletKeys: rMeta.selectedOutletKeys ?? [],
    worldwide: rMeta.worldwide ?? true,
    territoryCodes: rMeta.territoryCodes ?? [],
    rightsConfirmed: false,
  };
}
