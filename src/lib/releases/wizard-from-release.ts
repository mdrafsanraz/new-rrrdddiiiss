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
import type { LiveRelease } from "@/lib/labelgrid/live-release";

type ReleaseWithTracks = Release & {
  tracks: Track[];
};

/**
 * Map a saved release into ReleaseBuilder initial state (edit / re-upload
 * flow). `live`, when supplied, is the just-fetched LabelGrid release —
 * its cover/audio URLs win over the local cache, which can lag behind
 * (e.g. a track whose async processing finished after the local sync
 * request's own poll budget expired never got its audioUrl persisted).
 */
export function wizardStateFromRelease(
  release: ReleaseWithTracks,
  artistName: string,
  live?: LiveRelease | null
): WizardState {
  const rMeta = parseJsonObject<ReleaseMetadata>(release.metadataJson);
  const liveTrackById = new Map(
    (live?.tracks ?? []).map((lt) => [String(lt.id), lt])
  );
  const tracks: WizardTrack[] =
    release.tracks.length > 0
      ? release.tracks.map((t) => {
          const tMeta = parseJsonObject<TrackMetadata>(t.metadataJson);
          const liveTrack = t.labelgridId
            ? liveTrackById.get(t.labelgridId)
            : undefined;
          return newTrack({
            id: t.id,
            clientId: t.id,
            title: t.title,
            mixVersion: tMeta.mixVersion ?? "",
            isrc: t.isrc ?? "",
            compositionType:
              (tMeta.compositionType as WizardTrack["compositionType"]) ??
              "original_composition",
            explicit: (tMeta.explicit as WizardTrack["explicit"]) ?? "off",
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
            audioUrl: liveTrack?.audio?.url ?? t.audioUrl,
            audioDurationSec: null,
            audioProcessing: tMeta.audioProcessing ?? false,
            audioProcessingError: tMeta.audioProcessingError ?? null,
            licenseFile: null,
            licenseType: tMeta.licenseType ?? null,
            licenseUrl: tMeta.licenseUrl ?? null,
            originalTrackLink: tMeta.originalTrackLink ?? null,
          });
        })
      : [newTrack()];

  const firstTrackMeta = release.tracks[0]
    ? parseJsonObject<TrackMetadata>(release.tracks[0].metadataJson)
    : ({} as TrackMetadata);

  const contributors = firstTrackMeta.contributors?.length
    ? firstTrackMeta.contributors.map((c) => ({
        id: crypto.randomUUID(),
        writerId: c.writerId ?? null,
        firstName: c.firstName,
        lastName: c.lastName,
        roles: c.roles,
        aiContribution: c.aiContribution ?? ("none" as const),
      }))
    : [newContributor()];

  const writerSplits = (rMeta.writerSplits ?? []).map((w) => ({
    id: crypto.randomUUID(),
    writerId: w.writerId ?? null,
    firstName: w.firstName,
    lastName: w.lastName,
    roles: w.roles,
    share: w.share,
  }));

  const publisherSplits = (rMeta.publisherSplits ?? []).map((p) => ({
    id: crypto.randomUUID(),
    publisherId: p.publisherId ?? null,
    name: p.name,
    share: p.share,
  }));

  const year = String(new Date().getFullYear());
  const artworkUrl = live?.coverUrl ?? release.artworkUrl;

  return {
    releaseId: release.id,
    step: 0,
    artworkFile: null,
    artworkUrl,
    artworkPreview: artworkUrl,
    artworkAiUsage:
      (release.artworkAiUsage as WizardState["artworkAiUsage"]) ?? "none",
    isTransfer: Boolean(rMeta.transferFromDistributor),
    transferFromDistributor: rMeta.transferFromDistributor ?? "",
    originalReleaseDate: rMeta.originalReleaseDate ?? "",
    title: release.title === "Untitled release" ? "" : release.title,
    artistId: release.artistId ?? "",
    contentType: (release.contentType as WizardState["contentType"]) ?? "Single",
    mixVersion: rMeta.mixVersion ?? "",
    primaryGenreId: rMeta.primaryGenreId ?? null,
    primaryGenreName: release.primaryGenre ?? "",
    releaseDate: release.releaseDate
      ? release.releaseDate.toISOString().slice(0, 10)
      : "",
    upc: release.upc ?? "",
    preferredLocalization: rMeta.preferredLocalization ?? "en",
    allStores: rMeta.allStores ?? true,
    selectedOutletKeys: rMeta.selectedOutletKeys ?? [],
    worldwide: rMeta.worldwide ?? true,
    territoryCodes: rMeta.territoryCodes ?? [],
    tracks,
    contributors,
    writerSplits,
    publisherSplits,
    selfPublished: rMeta.selfPublished ?? true,
    clineYear: rMeta.clineYear ? String(rMeta.clineYear) : year,
    clineName: rMeta.clineName ?? artistName,
    plineYear: rMeta.plineYear ? String(rMeta.plineYear) : year,
    plineName: rMeta.plineName ?? artistName,
    rightsConfirmed: false,
  };
}
