import type { ReleaseMetadata, TrackMetadata } from "./constants";
import type { TrackCreditsDraft, WizardState, WizardTrack } from "./wizard-types";

/** Older drafts inherit shared credits until an individual track is edited. */
export function getTrackCredits(track: WizardTrack, defaults: TrackCreditsDraft): TrackCreditsDraft {
  return track.credits ?? {
    contributors: defaults.contributors, writerSplits: defaults.writerSplits,
    publisherSplits: defaults.publisherSplits, selfPublished: defaults.selfPublished,
  };
}

/** Explicit empty arrays belong to that track and must never inherit another track's splits. */
export function trackPublishingMetadata(track: TrackMetadata, release: ReleaseMetadata): ReleaseMetadata {
  return {
    ...release,
    writerSplits: track.writerSplits ?? release.writerSplits,
    publisherSplits: track.publisherSplits ?? release.publisherSplits,
    selfPublished: track.selfPublished ?? release.selfPublished,
  };
}

export function updateTrackCredits(state: WizardState, clientId: string, update: (credits: TrackCreditsDraft) => TrackCreditsDraft): WizardState {
  const track = state.tracks.find((item) => item.clientId === clientId);
  if (!track) return state;
  const before = getTrackCredits(track, state);
  const after = update(before);
  if (after === before || (after.contributors === before.contributors && after.writerSplits === before.writerSplits && after.publisherSplits === before.publisherSplits && after.selfPublished === before.selfPublished)) return state;
  return { ...state, tracks: state.tracks.map((item) => item.clientId === clientId ? { ...item, credits: after } : item) };
}
