import { NextResponse } from "next/server";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import {
  buildTrackSyncContext,
  ensureLabelGridTrackForSubmit,
} from "@/lib/labelgrid/sync-submit";
import { loadOwnedTrackForSubmit } from "@/lib/releases/submit-auth";
import { withSubmissionLock } from "@/lib/releases/submission-lock";

type Params = { params: Promise<{ id: string; trackId: string }> };

/**
 * Stage 4 (Create Tracks), one track per call so the client can render a
 * real per-track checklist. Sends the FULL current contributors/writers/
 * publishers in the same create/update body — by Step 5 the user has
 * already finished Credits, so there's no need to patch them in later.
 * Idempotent: ensureLabelGridTrackForSubmit only PATCHes if
 * track.labelgridId is already set, never creates a duplicate.
 */
export async function POST(_request: Request, { params }: Params) {
  const { id, trackId } = await params;
  const { user, release, track } = await loadOwnedTrackForSubmit(id, trackId);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!release || !track) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!isLabelGridLive()) {
    return NextResponse.json({ error: "LabelGrid is not configured." }, { status: 503 });
  }

  try {
    const outcome = await withSubmissionLock(id, async () => {
      const ctx = await buildTrackSyncContext(release);
      return ensureLabelGridTrackForSubmit(track, ctx);
    });
    if (!outcome.ok) {
      return NextResponse.json(
        { error: "Another submission is already in progress for this release." },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: true, labelgridTrackId: outcome.result });
  } catch (error) {
    console.error("[submit/tracks]", id, trackId, error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not create the track on LabelGrid.",
      },
      { status: 502 }
    );
  }
}
