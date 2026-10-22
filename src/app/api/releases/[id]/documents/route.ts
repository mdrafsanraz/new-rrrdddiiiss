import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { logReleaseActivity } from "@/lib/releases/activity";
import { canUserEditRelease, isFinalRejection } from "@/lib/releases/status";
import { saveGenericUpload } from "@/lib/uploads/store";

type Params = { params: Promise<{ id: string }> };

const kindSchema = z.enum([
  "proof_of_rights",
  "remix_permission",
  "artist_authorization",
  "previous_distributor_confirmation",
  "cover_license",
  "master_ownership",
  "other",
]);

/**
 * Upload supporting documents for Changes Required.
 *
 * Documents and user notes stay in RDISTRO for admin review.
 * This user-facing route must never send feedback to LabelGrid.
 */
export async function POST(request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const release = await prisma.release.findFirst({
    where: { id, userId: user.id },
  });
  if (!release) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (isFinalRejection(release)) {
    return NextResponse.json(
      { error: "This release is locked and cannot accept documents." },
      { status: 403 }
    );
  }
  if (!canUserEditRelease(release)) {
    return NextResponse.json(
      { error: "Documents can only be uploaded while Changes Required." },
      { status: 403 }
    );
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    const kindRaw = String(form.get("kind") ?? "other");
    const issueId = String(form.get("issueId") ?? "") || null;
    const trackId = String(form.get("trackId") ?? "") || null;
    const note = z.string().trim().max(2000).parse(String(form.get("note") ?? ""));

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File must be under 25MB" },
        { status: 400 }
      );
    }

    const kind = kindSchema.parse(kindRaw);

    if (issueId) {
      const issue = await prisma.releaseReviewIssue.findFirst({
        where: { id: issueId, releaseId: release.id },
      });
      if (!issue) {
        return NextResponse.json({ error: "Issue not found" }, { status: 404 });
      }
    }
    if (trackId) {
      const track = await prisma.track.findFirst({
        where: { id: trackId, releaseId: release.id, userId: user.id },
      });
      if (!track) {
        return NextResponse.json({ error: "Track not found" }, { status: 404 });
      }
    }

    const stored = await saveGenericUpload(user.id, file, "documents");

    const doc = await prisma.releaseDocument.create({
      data: {
        releaseId: release.id,
        trackId,
        issueId,
        kind,
        filename: stored.filename,
        mimeType: stored.mimeType,
        url: stored.publicUrl,
        uploadedById: user.id,
      },
    });

    await logReleaseActivity({
      releaseId: release.id,
      type: "document_uploaded",
      title: "Document uploaded",
      description: `${kind}: ${stored.filename}${note ? `\n\nUser note: ${note}` : ""}`,
      actorUserId: user.id,
      metadata: { documentId: doc.id, issueId, trackId, note, notePosted: false, awaitingAdminReview: true },
    });

    return NextResponse.json({ document: doc, notePosted: false }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    console.error("[releases/documents]", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
