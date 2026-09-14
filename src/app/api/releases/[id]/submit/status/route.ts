import { NextResponse } from "next/server";
import { getSubmittedArtworkUrl } from "@/lib/labelgrid/artwork";
import { loadOwnedReleaseForSubmit } from "@/lib/releases/submit-auth";
import { parseJsonObject, type TrackMetadata } from "@/lib/releases/constants";

type Params = { params: Promise<{ id: string }> };

/**
 * Authoritative, persisted per-stage state — never a client-only cache.
 * A page reload mid-submission calls this to reconstruct exactly which
 * stages already completed, so <SubmissionProgress> can resume instead of
 * restarting anything already done.
 */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const { user, release } = await loadOwnedReleaseForSubmit(id);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!release) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let hasArtwork = false;
  if (release.labelgridId) {
    try {
      hasArtwork = Boolean(await getSubmittedArtworkUrl(release.labelgridId));
    } catch {
      return NextResponse.json(
        { error: "Could not verify artwork with LabelGrid. Please retry; your release has not been submitted." },
        { status: 503 },
      );
    }
  }

  const isLocked =
    Boolean(release.submissionLockedAt) &&
    Date.now() - release.submissionLockedAt!.getTime() < 90_000;

  return NextResponse.json({
    locked: isLocked,
    release: {
      hasLabelGridId: Boolean(release.labelgridId),
      hasArtwork,
    },
    tracks: release.tracks.map((t) => {
      const tMeta = parseJsonObject<TrackMetadata>(t.metadataJson);
      return {
        id: t.id,
        title: t.title,
        hasLabelGridId: Boolean(t.labelgridId),
        hasAudioUrl: Boolean(t.audioUrl),
        audioProcessing: Boolean(tMeta.audioProcessing),
        audioProcessingError: tMeta.audioProcessingError ?? null,
        creditsSynced: Boolean(tMeta.creditsSyncedAt),
      };
    }),
  });
}
