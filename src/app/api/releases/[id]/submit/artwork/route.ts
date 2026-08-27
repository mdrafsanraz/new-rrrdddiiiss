import { NextResponse } from "next/server";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import { uploadArtworkForSubmit } from "@/lib/labelgrid/sync-submit";
import { loadOwnedReleaseForSubmit } from "@/lib/releases/submit-auth";
import { withSubmissionLock } from "@/lib/releases/submission-lock";
import { validateArtwork } from "@/lib/uploads/store";

type Params = { params: Promise<{ id: string }> };

/**
 * Stage 3 (Upload Artwork). The browser sends the artwork bytes it's held
 * in memory since Step 1 — this is the first and only time they're
 * transmitted anywhere. Skips the upload entirely (no network call) if
 * release.artworkUrl is already set from a prior successful run.
 */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const { user, release } = await loadOwnedReleaseForSubmit(id);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!release) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isLabelGridLive()) {
    return NextResponse.json({ error: "LabelGrid is not configured." }, { status: 503 });
  }

  if (release.artworkUrl) {
    return NextResponse.json({ ok: true, skipped: true, url: release.artworkUrl });
  }
  if (!release.labelgridId) {
    return NextResponse.json(
      { error: "Run the Create Release stage first." },
      { status: 409 }
    );
  }

  const form = await request.formData();
  const file = form.get("artwork");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No artwork file provided." }, { status: 400 });
  }

  try {
    const validated = await validateArtwork(file);
    const outcome = await withSubmissionLock(id, () =>
      uploadArtworkForSubmit(release, validated)
    );
    if (!outcome.ok) {
      return NextResponse.json(
        { error: "Another submission is already in progress for this release." },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: true, url: outcome.result.url });
  } catch (error) {
    console.error("[submit/artwork]", id, error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not upload artwork to LabelGrid.",
      },
      { status: 502 }
    );
  }
}
