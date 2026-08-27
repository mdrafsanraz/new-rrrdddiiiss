import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import { syncReleaseToLabelGrid } from "@/lib/labelgrid/sync-submit";
import { logReleaseActivity } from "@/lib/releases/activity";
import {
  ARTWORK_AI_USAGE,
  CONTENT_TYPES,
  PRIMARY_GENRES,
  makeCatalogCandidate,
  type ReleaseMetadata,
} from "@/lib/releases/constants";
import { validateArtwork } from "@/lib/uploads/store";

const schema = z.object({
  artistId: z.string().min(1),
  title: z.string().min(1).max(200).optional().or(z.literal("")),
  contentType: z.enum(["Single", "EP", "Album"]).default("Single"),
  primaryGenre: z.string().optional(),
  releaseDate: z.string().optional().or(z.literal("")),
  upc: z.string().max(13).optional().or(z.literal("")),
  mixVersion: z.string().max(200).optional().or(z.literal("")),
  preferredLocalization: z.string().default("en"),
  artworkAiUsage: z.enum(ARTWORK_AI_USAGE).default("none"),
  explicit: z.enum(["off", "on", "edited"]).default("off"),
  transferFromDistributor: z.string().max(255).optional().or(z.literal("")),
  secondaryGenre: z.string().optional().or(z.literal("")),
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
 * Create a local draft release (does not consume Free quota, does not submit
 * to LabelGrid review). Optional artwork upload.
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

    const artworkFile = form.get("artwork");
    const artwork =
      artworkFile instanceof File && artworkFile.size > 0
        ? await validateArtwork(artworkFile)
        : null;

    const catalogNumber = await allocateCatalogNumber();
    const title = fields.title?.trim() || "Untitled release";
    const year = new Date().getFullYear();

    const meta: ReleaseMetadata & Record<string, unknown> = {
      mixVersion: fields.mixVersion || undefined,
      preferredLocalization: fields.preferredLocalization,
      artisticRole: "MainArtist",
      clineYear: fields.clineYear ? Number(fields.clineYear) : year,
      clineName: fields.clineName || artist.name,
      plineYear: fields.plineYear ? Number(fields.plineYear) : year,
      plineName: fields.plineName || artist.name,
      secondaryGenre: fields.secondaryGenre || undefined,
      transferFromDistributor: fields.transferFromDistributor || undefined,
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
        primaryGenre:
          fields.primaryGenre &&
          (PRIMARY_GENRES as readonly string[]).includes(fields.primaryGenre)
            ? fields.primaryGenre
            : "Pop",
        artworkAiUsage: fields.artworkAiUsage,
        explicit: fields.explicit,
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

    // Create the LabelGrid release right away (section 6: don't wait for
    // the whole form) so cover art / audio have a release to attach to as
    // soon as the user provides them. Artwork uploads straight to LabelGrid
    // now — never staged on our own disk.
    let labelgrid: { synced: boolean; releaseId?: number; error?: string } = {
      synced: false,
    };
    if (isLabelGridLive()) {
      const result = await syncReleaseToLabelGrid({
        release,
        artwork,
        audios: [],
      });
      labelgrid = result.ok
        ? { synced: true, releaseId: result.releaseId }
        : { synced: false, error: result.error };
    }

    const fresh = labelgrid.synced
      ? await prisma.release.findUnique({
          where: { id: release.id },
          include: { artist: true, tracks: true },
        })
      : release;

    return NextResponse.json({ release: fresh, labelgrid }, { status: 201 });
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
