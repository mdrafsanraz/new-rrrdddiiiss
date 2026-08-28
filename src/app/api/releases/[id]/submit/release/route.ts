import { NextResponse } from "next/server";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import { ensureLabelGridReleaseForSubmit } from "@/lib/labelgrid/sync-submit";
import { loadOwnedReleaseForSubmit } from "@/lib/releases/submit-auth";
import { withSubmissionLock } from "@/lib/releases/submission-lock";
import { LabelGridApiError, labelGridApiErrorMessage } from "@/lib/labelgrid/client";

type Params = { params: Promise<{ id: string }> };

/**
 * Stage 2 (Create or update Release). Idempotent:
 * ensureLabelGridReleaseForSubmit PATCHes the mapped release whenever
 * release.labelgridId is already set, and only POSTs when no mapping exists.
 * This guarantees an edit updates the same LabelGrid release instead of
 * creating a duplicate. Wrapped in the submission lock so concurrent runs
 * cannot race while creating the first mapping.
 */
export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  const { user, release } = await loadOwnedReleaseForSubmit(id);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!release) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isLabelGridLive()) {
    return NextResponse.json({ error: "LabelGrid is not configured." }, { status: 503 });
  }

  try {
    const outcome = await withSubmissionLock(id, () =>
      ensureLabelGridReleaseForSubmit(release)
    );
    if (!outcome.ok) {
      return NextResponse.json(
        { error: "Another submission is already in progress for this release." },
        { status: 409 }
      );
    }
    return NextResponse.json({
      ok: true,
      labelgridReleaseId: outcome.result.lgReleaseId,
    });
  } catch (error) {
    console.error("[submit/release]", id, error);
    return NextResponse.json(
      {
        error:
          error instanceof LabelGridApiError
            ? labelGridApiErrorMessage(error)
            : error instanceof Error
            ? error.message
            : "Could not create the release on LabelGrid.",
      },
      { status: 502 }
    );
  }
}
