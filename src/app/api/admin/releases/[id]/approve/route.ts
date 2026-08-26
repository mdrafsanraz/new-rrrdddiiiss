import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/admin";
import { submitLabelGridDraftForReview } from "@/lib/labelgrid/sync-submit";
import { prisma } from "@/lib/db";
import { loadStoredUpload } from "@/lib/uploads/store";

const schema = z.object({
  notes: z.string().max(2000).optional(),
});

type Params = { params: Promise<{ id: string }> };

/**
 * Admin approve → submit the LabelGrid **draft** for LabelGrid review
 * (POST /releases/{id}/distribute). User-facing status becomes approved.
 */
export async function POST(request: Request, { params }: Params) {
  const gate = await requireAdminApi();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;

  try {
    const body = schema.parse(await request.json().catch(() => ({})));

    const release = await prisma.release.findUnique({
      where: { id },
      include: { tracks: { orderBy: { trackNumber: "asc" } }, artist: true },
    });
    if (!release) {
      return NextResponse.json({ error: "Release not found" }, { status: 404 });
    }
    if (release.permanentlyLocked || release.status === "rejected") {
      return NextResponse.json(
        { error: "This release is permanently rejected and locked." },
        { status: 400 }
      );
    }
    if (!["in_review", "submitted", "error"].includes(release.status)) {
      return NextResponse.json(
        { error: `Cannot approve release in status "${release.status}"` },
        { status: 400 }
      );
    }

    const artwork = await loadStoredUpload(release.artworkUrl);
    const audio = await loadStoredUpload(release.tracks[0]?.audioUrl);

    const now = new Date();
    await prisma.release.update({
      where: { id },
      data: {
        status: "syncing",
        reviewedAt: now,
        reviewedById: gate.admin.id,
        reviewNotes: body.notes?.trim() || null,
        syncError: null,
      },
    });

    const result = await submitLabelGridDraftForReview({
      release,
      artwork,
      audio,
    });

    if (!result.ok) {
      await prisma.release.update({
        where: { id },
        data: {
          status: "error",
          syncError: result.error.slice(0, 2000),
        },
      });
      return NextResponse.json(
        { error: result.error, labelgrid: { submittedForReview: false } },
        { status: 502 }
      );
    }

    const fresh = await prisma.release.update({
      where: { id },
      data: {
        status: "approved",
        labelgridId: String(result.releaseId),
      },
      include: { tracks: true, artist: true, user: true },
    });

    return NextResponse.json({
      release: fresh,
      labelgrid: {
        submittedForReview: true,
        releaseId: result.releaseId,
        trackId: result.trackId,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    console.error("[admin/releases/approve]", error);
    return NextResponse.json({ error: "Approve failed" }, { status: 500 });
  }
}
