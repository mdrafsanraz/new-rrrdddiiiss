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

function personName(name: string) {
  const parts = name.trim().split(/\s+/);
  return {
    firstName: parts.shift() ?? "",
    lastName: parts.join(" ") || "Unknown",
  };
}

/**
 * Map a saved release into ReleaseBuilder initial state (edit / re-upload
 * flow). `live`, when supplied, is the just-fetched LabelGrid release —
 * its cover/audio URLs win over the local cache, which can lag behind
 * (e.g. a track whose async processing finished after the local sync
 * request's own poll budget expired never got its audioUrl persisted).
 */
export function wizardStateFromRelease(
  release: ReleaseWithTracks,
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
            title: liveTrack?.title ?? t.title,
            mixVersion: liveTrack?.mixVersion ?? tMeta.mixVersion ?? "",
            isrc: liveTrack?.isrc ?? t.isrc ?? "",
            compositionType:
              (tMeta.compositionType as WizardTrack["compositionType"]) ??
              "original_composition",
            explicit:
              liveTrack?.explicit === "on" ||
              liveTrack?.explicit === "edited" ||
              liveTrack?.explicit === "off"
                ? liveTrack.explicit
                : ((tMeta.explicit as WizardTrack["explicit"]) ?? "off"),
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

  const liveContributors = live?.tracks[0]?.contributors?.length
    ? live.tracks[0].contributors.map((contributor) => ({
        id: crypto.randomUUID(),
        writerId: contributor.id,
        ...personName(contributor.name),
        roles: contributor.roles,
        aiContribution:
          contributors.find((item) => item.writerId === contributor.id)
            ?.aiContribution ?? ("none" as const),
      }))
    : contributors;

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

  const liveWriterSplits = live?.tracks[0]?.writers?.length
    ? live.tracks[0].writers.map((writer) => ({
        id: crypto.randomUUID(),
        writerId: writer.id,
        ...personName(writer.name),
        roles: writer.roles,
        share: writer.share ?? 0,
      }))
    : writerSplits;
  const livePublisherSplits = live?.tracks[0]?.publishers?.length
    ? live.tracks[0].publishers.map((publisher) => ({
        id: crypto.randomUUID(),
        publisherId: publisher.id,
        name: publisher.name,
        share: publisher.share ?? 0,
      }))
    : publisherSplits;

  const year = String(new Date().getFullYear());
  const artworkUrl = live?.coverUrl ?? release.artworkUrl;
  const selectedReleaseDate =
    live?.releaseDate?.slice(0, 10) ??
    (release.releaseDate ? release.releaseDate.toISOString().slice(0, 10) : "");
  const copyrightYear = (rMeta.originalReleaseDate || selectedReleaseDate).slice(0, 4) || year;

  return {
    releaseId: release.id,
    step: 0,
    artworkFile: null,
    artworkUrl,
    artworkPreview: artworkUrl,
    artworkAiUsage:
      (live?.artworkAiUsage as WizardState["artworkAiUsage"]) ??
      (release.artworkAiUsage as WizardState["artworkAiUsage"]) ??
      "none",
    isTransfer: Boolean(rMeta.transferFromDistributor),
    transferFromDistributor: rMeta.transferFromDistributor ?? "",
    originalReleaseDate: rMeta.originalReleaseDate ?? "",
    title:
      (live?.title ?? release.title) === "Untitled release"
        ? ""
        : (live?.title ?? release.title),
    artistId: release.artistId ?? "",
    contentType:
      live?.contentType === "Single" ||
      live?.contentType === "EP" ||
      live?.contentType === "Album"
        ? live.contentType
        : ((release.contentType as WizardState["contentType"]) ?? "Single"),
    mixVersion: live?.mixVersion ?? rMeta.mixVersion ?? "",
    primaryGenreId: live?.primaryGenreId ?? rMeta.primaryGenreId ?? null,
    primaryGenreName: live?.primaryGenre ?? release.primaryGenre ?? "",
    releaseDate: selectedReleaseDate,
    upc: live?.barcodeNumber ?? release.upc ?? "",
    preferredLocalization:
      live?.preferredLocalization ?? rMeta.preferredLocalization ?? "en",
    allStores: rMeta.allStores ?? true,
    selectedOutletKeys: rMeta.selectedOutletKeys ?? [],
    worldwide: rMeta.worldwide ?? true,
    territoryCodes: rMeta.territoryCodes ?? [],
    tracks,
    contributors: liveContributors,
    writerSplits: liveWriterSplits,
    publisherSplits: livePublisherSplits,
    selfPublished:
      live?.tracks[0]?.publishers !== undefined
        ? live.tracks[0].publishers.length === 0
        : (rMeta.selfPublished ?? true),
    clineYear: copyrightYear,
    clineName: live?.clineName ?? rMeta.clineName ?? "",
    plineYear: copyrightYear,
    plineName: live?.plineName ?? rMeta.plineName ?? "",
    rightsConfirmed: false,
  };
}
