import { NextResponse } from "next/server";
import { z } from "zod";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import { registerUploadedAudio } from "@/lib/labelgrid/sync-submit";
import { loadOwnedTrackForSubmit } from "@/lib/releases/submit-auth";
import { withSubmissionLock } from "@/lib/releases/submission-lock";

type Params = { params: Promise<{ id: string; trackId: string }> };

const bodySchema = z.object({ key: z.string().min(1) });

/**
 * Stage 5b (Upload Audio — register). The browser has already PUT the
 * bytes to the presigned URL itself; this registers the S3 key against
 * the track and polls briefly for processing (registerUploadedAudio
 * persists audioUploadAttemptId/audioProcessing/audioUrl immediately, not
 * batched at the end).
 */
export async function POST(request: Request, { params }: Params) {
  const { id, trackId } = await params;
  const { user, track } = await loadOwnedTrackForSubmit(id, trackId);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!track) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isLabelGridLive()) {
    return NextResponse.json({ error: "LabelGrid is not configured." }, { status: 503 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing upload key." }, { status: 400 });
  }

  try {
    const outcome = await withSubmissionLock(id, () =>
      registerUploadedAudio(track, parsed.data.key)
    );
    if (!outcome.ok) {
      return NextResponse.json(
        { error: "Another submission is already in progress for this release." },
        { status: 409 }
      );
    }
    if (outcome.result.error) {
      return NextResponse.json({ error: outcome.result.error }, { status: 502 });
    }
    return NextResponse.json({ ok: true, processing: outcome.result.processing });
  } catch (error) {
    console.error("[submit/audio-register]", id, trackId, error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not register the uploaded audio with LabelGrid.",
      },
      { status: 502 }
    );
  }
}
