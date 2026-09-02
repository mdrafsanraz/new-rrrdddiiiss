import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { logReleaseActivity } from "@/lib/releases/activity";
import {
  ARTWORK_AI_USAGE,
  CONTENT_TYPES,
  makeCatalogCandidate,
  type ReleaseMetadata,
} from "@/lib/releases/constants";

const schema = z.object({
  artistId: z.string().min(1),
  title: z.string().min(1).max(200).optional().or(z.literal("")),
  contentType: z.enum(["Single", "EP", "Album"]).default("Single"),
  /** Live LabelGrid genre id + display name (GET /genres). */
  primaryGenreId: z.number().int().positive().nullable().optional(),
  primaryGenreName: z.string().max(120).optional().or(z.literal("")),
  releaseDate: z.string().optional().or(z.literal("")),
  /** Original release date for distributor transfers. */
  originalReleaseDate: z.string().optional().or(z.literal("")),
  upc: z.string().max(13).optional().or(z.literal("")),
  mixVersion: z.string().max(200).optional().or(z.literal("")),
  preferredLocalization: z.string().default("en"),
  artworkAiUsage: z.enum(ARTWORK_AI_USAGE).default("none"),
  transferFromDistributor: z.string().max(255).optional().or(z.literal("")),
  clineYear: z.string().optional().or(z.literal("")),
  clineName: z.string().optional().or(z.literal("")),
  plineYear: z.string().optional().or(z.literal("")),
  plineName: z.string().optional().or(z.literal("")),
  allStores: z.boolean().optional(),
  selectedOutletKeys: z.array(z.string()).optional(),
  worldwide: z.boolean().optional(),
  territoryCodes: z.array(z.string()).optional(),
});

async function allocateCatalogNumber(): Promise<string> {
  for (let i = 0; i < 12; i++) {
    const candidate = makeCatalogCandidate();
    const exists = await prisma.release.findFirst({
      where: { catalogNumber: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }
  return makeCatalogCandidate();
}

/**
 * Steps 1-4 are local data entry only — this route creates just the local
 * RDISTRO mapping row (ownership + cached display fields). It never touches
 * LabelGrid: no release is created there until the user reaches Step 5 and
 * clicks Submit (see /api/releases/[id]/submit/*). Artwork stays an
 * in-memory File in the wizard's browser state until then — this route
 * doesn't accept or store it.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const raw = form.get("payload");
    if (typeof raw !== "string") {
      return NextResponse.json({ error: "Missing payload" }, { status: 400 });
    }
    const fields = schema.parse(JSON.parse(raw));

    const artist = await prisma.artist.findFirst({
      where: { id: fields.artistId, userId: user.id },
    });
    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    const catalogNumber = await allocateCatalogNumber();
    const title = fields.title?.trim() || "Untitled release";
    const selectedDate = fields.originalReleaseDate || fields.releaseDate;
    const year = selectedDate ? Number(selectedDate.slice(0, 4)) : new Date().getFullYear();

    const meta: ReleaseMetadata = {
      mixVersion: fields.mixVersion || undefined,
      preferredLocalization: fields.preferredLocalization,
      artisticRole: "MainArtist",
      clineYear: year,
      clineName: fields.clineName || undefined,
      plineYear: year,
      plineName: fields.plineName || undefined,
      primaryGenreId: fields.primaryGenreId ?? null,
      transferFromDistributor: fields.transferFromDistributor || undefined,
      originalReleaseDate: fields.originalReleaseDate || undefined,
      allStores: fields.allStores ?? true,
      selectedOutletKeys: fields.selectedOutletKeys ?? [],
      worldwide: fields.worldwide ?? true,
      territoryCodes: fields.territoryCodes ?? [],
    };

    const release = await prisma.release.create({
      data: {
        userId: user.id,
        artistId: artist.id,
        title,
        catalogNumber,
        contentType: CONTENT_TYPES.includes(fields.contentType as never)
          ? fields.contentType
          : "Single",
        primaryGenre: fields.primaryGenreName?.trim() || null,
        artworkAiUsage: fields.artworkAiUsage,
        upc: fields.upc?.trim() || null,
        releaseDate: fields.releaseDate
          ? new Date(`${fields.releaseDate}T00:00:00.000Z`)
          : null,
        metadataJson: JSON.stringify(meta),
        status: "draft",
        storesJson: JSON.stringify({
          allStores: meta.allStores,
          outletKeys: meta.selectedOutletKeys,
        }),
        territoriesJson: JSON.stringify({
          worldwide: meta.worldwide,
          codes: meta.territoryCodes,
        }),
      },
      include: { artist: true, tracks: true },
    });

    await logReleaseActivity({
      releaseId: release.id,
      type: "created",
      title: "Draft created",
      actorUserId: user.id,
    });

    return NextResponse.json({ release }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    console.error("[releases/drafts]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save draft" },
      { status: 500 }
    );
  }
}
