import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/admin";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import { withdrawReleaseFromReview } from "@/lib/labelgrid";
import { prisma } from "@/lib/db";

/**
 * Admin decision against a release in RDISTRO review.
 *
 * LabelGrid semantics we mirror:
 * - changes_required: not final — release returns editable; user fixes & resubmits
 * - rejected: final policy rejection — permanently locked, no edit/resubmit
 */
const schema = z.object({
  notes: z.string().min(1).max(2000),
  outcome: z.enum(["changes_required", "rejected"]),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const gate = await requireAdminApi();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;

  try {
    const body = schema.parse(await request.json());
    const release = await prisma.release.findUnique({ where: { id } });
    if (!release) {
      return NextResponse.json({ error: "Release not found" }, { status: 404 });
    }
    if (release.permanentlyLocked || release.status === "rejected") {
      return NextResponse.json(
        { error: "This release is permanently rejected and locked." },
        { status: 400 }
      );
    }
    if (!["in_review", "submitted", "syncing", "error"].includes(release.status)) {
      return NextResponse.json(
        { error: `Cannot decide on release in status "${release.status}"` },
        { status: 400 }
      );
    }

    const isFinalReject = body.outcome === "rejected";

    // If already on LabelGrid review, pull back to draft when requesting changes.
    if (
      !isFinalReject &&
      release.labelgridId &&
      isLabelGridLive()
    ) {
      try {
        await withdrawReleaseFromReview(release.labelgridId);
      } catch (error) {
        console.warn(
          "[admin/releases/reject] withdraw-review failed (continuing)",
          error
        );
      }
    }

    const fresh = await prisma.release.update({
      where: { id },
      data: {
        status: body.outcome,
        reviewNotes: body.notes.trim(),
        reviewedAt: new Date(),
        reviewedById: gate.admin.id,
        syncError: null,
        permanentlyLocked: isFinalReject,
      },
      include: { tracks: true, artist: true, user: true },
    });

    return NextResponse.json({ release: fresh });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error:
            error.issues[0]?.message ??
            "Notes and outcome (changes_required | rejected) are required",
        },
        { status: 400 }
      );
    }
    console.error("[admin/releases/reject]", error);
    return NextResponse.json({ error: "Decision failed" }, { status: 500 });
  }
}
