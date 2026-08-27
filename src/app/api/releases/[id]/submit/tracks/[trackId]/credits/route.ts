import { NextResponse } from "next/server";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import {
  buildTrackSyncContext,
  verifyOrSyncTrackCredits,
} from "@/lib/labelgrid/sync-submit";
import { loadOwnedTrackForSubmit } from "@/lib/releases/submit-auth";
import { withSubmissionLock } from "@/lib/releases/submission-lock";

type Params = { params: Promise<{ id: string; trackId: string }> };

/**
 * Stage 7 (Credits & Rights) — a verification stage, not a duplicate
 * PATCH. Stage 4 already sent the final credits in the same call that
 * created/updated the track; if creditsSyncedAt is already set this does
 * no network call for credits at all. It still runs the license-document
 * upload (a genuinely separate LabelGrid endpoint) when one is pending.
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
      return verifyOrSyncTrackCredits(track, ctx);
    });
    if (!outcome.ok) {
      return NextResponse.json(
        { error: "Another submission is already in progress for this release." },
        { status: 409 }
      );
    }
    return NextResponse.json({
      ok: true,
      alreadySynced: outcome.result.alreadySynced,
    });
  } catch (error) {
    console.error("[submit/credits]", id, trackId, error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not sync credits to LabelGrid.",
      },
      { status: 502 }
    );
  }
}
