import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { assertCanSubmitRelease } from "@/lib/entitlements/server";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import { syncSubmittedReleaseToLabelGrid } from "@/lib/labelgrid/sync-submit";
import {
  ARTWORK_AI_USAGE,
  CONTENT_TYPES,
  PRIMARY_GENRES,
} from "@/lib/releases/constants";
import { saveArtwork, saveAudio } from "@/lib/uploads/store";

/**
 * User submit:
 * - Local status = in_review (what the user sees)
 * - LabelGrid = create draft + upload cover/audio (not submitted for LG review yet)
 * Admin approval later calls distribute (submit-for-review) on LabelGrid.
 */
const fieldsSchema = z.object({
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
    const form = await request.formData();
    const fields = fieldsSchema.parse({
      artistId: String(form.get("artistId") ?? ""),
      title: String(form.get("title") ?? ""),
      catalogNumber: String(form.get("catalogNumber") ?? ""),
      contentType: String(form.get("contentType") ?? ""),
      primaryGenre: String(form.get("primaryGenre") ?? ""),
      releaseDate: String(form.get("releaseDate") ?? ""),
      artworkAiUsage: String(form.get("artworkAiUsage") ?? ""),
      explicit: String(form.get("explicit") ?? ""),
      trackTitle: String(form.get("trackTitle") ?? ""),
      upc: String(form.get("upc") ?? ""),
    });

    const artworkFile = form.get("artwork");
    const audioFile = form.get("audio");
    if (!(artworkFile instanceof File) || artworkFile.size === 0) {
      return NextResponse.json(
        { error: "Cover artwork is required (JPEG, PNG, or WebP)" },
        { status: 400 }
      );
    }
    if (!(audioFile instanceof File) || audioFile.size === 0) {
      return NextResponse.json(
        { error: "Track audio is required (WAV, FLAC, or MP3)" },
        { status: 400 }
      );
    }

    await assertCanSubmitRelease(user.id, user.planId);

    const artist = await prisma.artist.findFirst({
      where: { id: fields.artistId, userId: user.id },
    });
    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    const artwork = await saveArtwork(user.id, artworkFile);
    const audio = await saveAudio(user.id, audioFile);

    const now = new Date();
    const release = await prisma.$transaction(async (tx) => {
      const created = await tx.release.create({
        data: {
          userId: user.id,
          artistId: artist.id,
          title: fields.title.trim(),
          catalogNumber: fields.catalogNumber.trim().toUpperCase(),
          contentType: fields.contentType,
          primaryGenre: fields.primaryGenre,
          artworkAiUsage: fields.artworkAiUsage,
          explicit: fields.explicit,
          upc: fields.upc?.trim() || null,
          releaseDate: new Date(fields.releaseDate),
          artworkUrl: artwork.publicUrl,
          // User-facing: always admin review — never expose LabelGrid draft.
          status: "in_review",
          submittedAt: now,
          tracks: {
            create: {
              userId: user.id,
              title: fields.trackTitle.trim(),
              trackNumber: 1,
              audioUrl: audio.publicUrl,
            },
          },
        },
        include: { tracks: true, artist: true },
      });

      await tx.artist.update({
        where: { id: artist.id },
        data: {
          locked: true,
          lockedAt: artist.lockedAt ?? now,
        },
      });

      return created;
    });

    let labelgrid: {
      draftSynced: boolean;
      releaseId?: number;
      trackId?: number;
      error?: string;
    } = { draftSynced: false };

    if (isLabelGridLive()) {
      const result = await syncSubmittedReleaseToLabelGrid({
        release,
        artwork,
        audio,
      });
      if (result.ok) {
        labelgrid = {
          draftSynced: true,
          releaseId: result.releaseId,
          trackId: result.trackId,
        };
      } else {
        labelgrid = { draftSynced: false, error: result.error };
        // Keep user status in_review; admin sees syncError on the release.
      }
    } else {
      await prisma.release.update({
        where: { id: release.id },
        data: {
          syncError:
            "LABELGRID_API_TOKEN not set — draft not uploaded to LabelGrid yet.",
        },
      });
      labelgrid = {
        draftSynced: false,
        error: "LABELGRID_API_TOKEN not set",
      };
    }

    const fresh = await prisma.release.findUnique({
      where: { id: release.id },
      include: { tracks: true, artist: true },
    });

    return NextResponse.json(
      { release: fresh ?? release, labelgrid },
      { status: 201 }
    );
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
