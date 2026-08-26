import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { assertCanSubmitRelease } from "@/lib/entitlements/server";
import {
  ARTWORK_AI_USAGE,
  CONTENT_TYPES,
  PRIMARY_GENRES,
} from "@/lib/releases/constants";

/**
 * One-step release submit (LabelGrid ReleaseCreateData-aligned fields, local DB).
 * Submitting locks the selected artist profile (read-only thereafter).
 */
const submitSchema = z.object({
  artistId: z.string().min(1),
  title: z.string().min(1).max(200),
  catalogNumber: z.string().min(1).max(20),
  contentType: z.enum(CONTENT_TYPES),
  primaryGenre: z.enum(PRIMARY_GENRES),
  releaseDate: z.string().min(1),
  artworkAiUsage: z.enum(ARTWORK_AI_USAGE),
  explicit: z.enum(["off", "on", "edited"]),
  trackTitle: z.string().min(1).max(200),
  upc: z.string().max(13).optional().or(z.literal("")),
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = submitSchema.parse(await request.json());
    await assertCanSubmitRelease(user.id, user.planId);

    const artist = await prisma.artist.findFirst({
      where: { id: body.artistId, userId: user.id },
    });
    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    const now = new Date();
    const release = await prisma.$transaction(async (tx) => {
      const created = await tx.release.create({
        data: {
          userId: user.id,
          artistId: artist.id,
          title: body.title.trim(),
          catalogNumber: body.catalogNumber.trim().toUpperCase(),
          contentType: body.contentType,
          primaryGenre: body.primaryGenre,
          artworkAiUsage: body.artworkAiUsage,
          explicit: body.explicit,
          upc: body.upc?.trim() || null,
          releaseDate: new Date(body.releaseDate),
          status: "submitted",
          submittedAt: now,
          tracks: {
            create: {
              userId: user.id,
              title: body.trackTitle.trim(),
              trackNumber: 1,
            },
          },
        },
        include: { tracks: true, artist: true },
      });

      // Rule: once an artist is used on a submitted release, profile fields lock.
      await tx.artist.update({
        where: { id: artist.id },
        data: {
          locked: true,
          lockedAt: artist.lockedAt ?? now,
        },
      });

      return created;
    });

    return NextResponse.json({ release }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    const message =
      error instanceof Error ? error.message : "Could not submit release";
    const status = message.includes("limit") ? 403 : 500;
    console.error("[releases/submit]", error);
    return NextResponse.json({ error: message }, { status });
  }
}
