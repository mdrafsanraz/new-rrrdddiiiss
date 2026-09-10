import { getLabelGridMediaStatus, type LabelGridMediaStatus } from "@/lib/labelgrid/catalog";

type MediaRelease = {
  labelgridId: string | null;
  tracks: Array<{ labelgridId: string | null }>;
};

/** Fail closed before review; a provider outage is not evidence of missing files. */
export async function verifySubmissionMedia(
  release: MediaRelease,
  load: (id: number) => Promise<LabelGridMediaStatus> = getLabelGridMediaStatus,
): Promise<{ error: string; status: number } | null> {
  if (!release.labelgridId || !release.tracks.length || release.tracks.some((track) => !track.labelgridId)) {
    return { error: "Finish syncing the release and all tracks before submitting.", status: 409 };
  }
  let media: LabelGridMediaStatus;
  try {
    media = await load(Number(release.labelgridId));
  } catch {
    return { error: "Unable to verify artwork and audio with the distribution service right now. Please retry shortly. Your release has not been submitted.", status: 503 };
  }
  if (!media.hasCover) {
    return { error: "Cover artwork is not ready on the distribution service. Finish uploading it and retry.", status: 409 };
  }
  if (release.tracks.some((track) => !media.tracks.some((remote) => remote.id === Number(track.labelgridId) && remote.hasStereo)) || media.tracks.some((track) => !track.hasStereo)) {
    return { error: "Audio is not ready for every track on the distribution service. Finish uploading or processing the audio and retry.", status: 409 };
  }
  return null;
}
