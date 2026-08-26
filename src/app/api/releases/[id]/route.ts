import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { assertCanSubmitRelease } from "@/lib/entitlements/server";
import { logReleaseActivity } from "@/lib/releases/activity";
import { getPlanLimits } from "@/lib/plans";
import {
  canUserEditRelease,
  canUserSubmitRelease,
  isFinalRejection,
} from "@/lib/releases/status";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const release = await prisma.release.findFirst({
    where: { id, userId: user.id },
    include: {
      artist: true,
      tracks: {
        include: { contributors: true },
        orderBy: { trackNumber: "asc" },
      },
      reviewIssues: {
        where: { resolved: false },
        orderBy: { createdAt: "desc" },
      },
      activities: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
  if (!release) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ release });
}

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  catalogNumber: z.string().min(1).max(20).optional(),
  upc: z.string().max(13).optional().nullable(),
  releaseDate: z.string().optional().nullable(),
  artworkUrl: z.string().url().optional().nullable().or(z.literal("")),
  status: z.enum(["draft", "incomplete", "ready_to_submit"]).optional(),
});

export async function PATCH(request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await prisma.release.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (isFinalRejection(existing)) {
    return NextResponse.json(
      {
        error:
          "This release was rejected and cannot be edited or resubmitted. Contact support if you believe this decision needs review.",
      },
      { status: 403 }
    );
  }
  if (!canUserEditRelease(existing)) {
    return NextResponse.json(
      { error: "This release can no longer be edited." },
      { status: 403 }
    );
  }

  try {
    const body = patchSchema.parse(await request.json());
    const release = await prisma.release.update({
      where: { id: existing.id },
      data: {
        ...(body.title !== undefined ? { title: body.title.trim() } : {}),
        ...(body.catalogNumber !== undefined
          ? { catalogNumber: body.catalogNumber.trim().toUpperCase() }
          : {}),
        ...(body.upc !== undefined ? { upc: body.upc?.trim() || null } : {}),
        ...(body.releaseDate !== undefined
          ? {
              releaseDate: body.releaseDate
                ? new Date(body.releaseDate)
                : null,
            }
          : {}),
        ...(body.artworkUrl !== undefined
          ? { artworkUrl: body.artworkUrl?.trim() || null }
          : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
      },
    });

    await logReleaseActivity({
      releaseId: release.id,
      type: "edited",
      title: "Release updated",
      actorUserId: user.id,
    });

    return NextResponse.json({ release });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

/** Submit an existing local draft into RDISTRO internal review. */
export async function POST(request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
  };

  if (body.action !== "submit") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const existing = await prisma.release.findFirst({
    where: { id, userId: user.id },
    include: { tracks: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canUserSubmitRelease(existing)) {
    return NextResponse.json(
      { error: "This release cannot be submitted." },
      { status: 409 }
    );
  }

  try {
    await assertCanSubmitRelease(user.id, user.planId);
    const priorityReview = getPlanLimits(user.planId).priorityReview;

    const release = await prisma.$transaction(async (tx) => {
      const lockedRelease = await tx.release.findFirst({
        where: {
          id: existing.id,
          userId: user.id,
          submittedAt: null,
          permanentlyLocked: false,
        },
      });
      if (!lockedRelease) {
        throw new Error("Already submitted.");
      }
      const now = new Date();
      const updated = await tx.release.update({
        where: { id: lockedRelease.id },
        data: {
          status: "pending_internal_review",
          submittedAt: now,
          priorityReview,
        },
      });
      if (lockedRelease.artistId) {
        await tx.artist.updateMany({
          where: {
            id: lockedRelease.artistId,
            userId: user.id,
            locked: false,
          },
          data: { locked: true, lockedAt: now },
        });
      }
      await logReleaseActivity({
        tx,
        releaseId: updated.id,
        type: "submitted_internal",
        title: "Submitted to RDISTRO review",
        actorUserId: user.id,
      });
      return updated;
    });

    return NextResponse.json({ release });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Submit failed";
    const status = message.includes("limit") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
