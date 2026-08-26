import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { assertCanSubmitRelease } from "@/lib/entitlements/server";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import { syncSubmittedReleaseToLabelGrid } from "@/lib/labelgrid/sync-submit";
import {
  ARTISTIC_ROLES,
  ARTWORK_AI_USAGE,
  COMMERCIAL_SAMPLES,
  COMPOSITION_TYPES,
  CONTENT_TYPES,
  PRIMARY_GENRES,
  makeCatalogCandidate,
  type ReleaseMetadata,
  type TrackMetadata,
} from "@/lib/releases/constants";
import { saveArtwork, saveAudio } from "@/lib/uploads/store";

const ai = z.enum(ARTWORK_AI_USAGE);

const contributorSchema = z.object({
  firstName: z.string().min(1).max(255),
  lastName: z.string().min(1).max(255),
  roles: z.array(z.string().min(1)).min(1),
});

const payloadSchema = z.object({
  artistId: z.string().min(1),
  artisticRole: z.string().min(1).max(255).default("MainArtist"),
  title: z.string().min(1).max(200),
  mixVersion: z.string().max(200).optional().or(z.literal("")),
  contentType: z.enum(CONTENT_TYPES),
  primaryGenre: z.enum(PRIMARY_GENRES),
  preferredLocalization: z.string().min(2).max(20).default("en"),
  releaseDate: z.string().min(1),
  artworkAiUsage: ai,
  explicit: z.enum(["off", "on", "edited"]),
  barcode: z.string().max(13).optional().or(z.literal("")),
  clineYear: z.string().optional().or(z.literal("")),
  clineName: z.string().max(255).optional().or(z.literal("")),
  plineYear: z.string().optional().or(z.literal("")),
  plineName: z.string().max(255).optional().or(z.literal("")),
  track: z.object({
    title: z.string().min(1).max(200),
    mixVersion: z.string().max(200).optional().or(z.literal("")),
    trackNumber: z.string().min(1),
    compositionType: z.enum([
      COMPOSITION_TYPES[0].value,
      COMPOSITION_TYPES[1].value,
      COMPOSITION_TYPES[2].value,
    ]),
    audioAiUsage: ai,
    compositionAiUsage: ai,
    commercialSamples: z.enum([
      COMMERCIAL_SAMPLES[0].value,
      COMMERCIAL_SAMPLES[1].value,
      COMMERCIAL_SAMPLES[2].value,
    ]),
    audioLanguage: z.string().min(2).max(20),
    recordingCountry: z.string().max(2).optional().or(z.literal("")),
    explicit: z.enum(["off", "on", "edited"]),
    isrc: z.string().max(15).optional().or(z.literal("")),
    iswc: z.string().max(15).optional().or(z.literal("")),
    lyrics: z.string().max(20000).optional().or(z.literal("")),
    previewStartTime: z.string().optional().or(z.literal("")),
    previewLength: z.string().optional().or(z.literal("")),
    albumOnly: z.boolean().optional(),
    freeDownload: z.boolean().optional(),
    instantGratification: z.boolean().optional(),
    hasMechanicalLicense: z.boolean().optional(),
    clineYear: z.string().optional().or(z.literal("")),
    clineName: z.string().max(255).optional().or(z.literal("")),
    plineYear: z.string().optional().or(z.literal("")),
    plineName: z.string().max(255).optional().or(z.literal("")),
    contributors: z.array(contributorSchema).min(1),
  }),
});

function yearOrNull(v?: string) {
  if (!v?.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function intOrNull(v?: string) {
  if (!v?.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

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

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const rawPayload = form.get("payload");
    if (typeof rawPayload !== "string") {
      return NextResponse.json({ error: "Missing release payload" }, { status: 400 });
    }

    const parsed = JSON.parse(rawPayload);
    if (!parsed.artisticRole) parsed.artisticRole = "MainArtist";
    if (
      parsed.artisticRole &&
      !ARTISTIC_ROLES.includes(parsed.artisticRole as (typeof ARTISTIC_ROLES)[number])
    ) {
      // allow custom but keep string
    }
    const fields = payloadSchema.parse(parsed);

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
    const catalogNumber = await allocateCatalogNumber();

    const releaseMeta: ReleaseMetadata = {
      mixVersion: fields.mixVersion || undefined,
      preferredLocalization: fields.preferredLocalization,
      artisticRole: fields.artisticRole || "MainArtist",
      clineYear: yearOrNull(fields.clineYear),
      clineName: fields.clineName || undefined,
      plineYear: yearOrNull(fields.plineYear),
      plineName: fields.plineName || undefined,
    };

    const trackMeta: TrackMetadata = {
      mixVersion: fields.track.mixVersion || undefined,
      compositionType: fields.track.compositionType,
      audioAiUsage: fields.track.audioAiUsage,
      compositionAiUsage: fields.track.compositionAiUsage,
      commercialSamples: fields.track.commercialSamples,
      audioLanguage: fields.track.audioLanguage,
      recordingCountry: fields.track.recordingCountry || undefined,
      primaryGenre: fields.primaryGenre,
      hasMechanicalLicense: Boolean(fields.track.hasMechanicalLicense),
      iswc: fields.track.iswc || undefined,
      lyrics: fields.track.lyrics || undefined,
      previewStartTime: intOrNull(fields.track.previewStartTime),
      previewLength: intOrNull(fields.track.previewLength),
      albumOnly: Boolean(fields.track.albumOnly),
      freeDownload: Boolean(fields.track.freeDownload),
      instantGratification: Boolean(fields.track.instantGratification),
      explicit: fields.track.explicit,
      clineYear: yearOrNull(fields.track.clineYear),
      clineName: fields.track.clineName || undefined,
      plineYear: yearOrNull(fields.track.plineYear),
      plineName: fields.track.plineName || undefined,
      contributors: fields.track.contributors,
    };

    const releaseDate = new Date(`${fields.releaseDate}T00:00:00.000Z`);
    const now = new Date();

    const release = await prisma.$transaction(async (tx) => {
      const created = await tx.release.create({
        data: {
          userId: user.id,
          artistId: artist.id,
          title: fields.title.trim(),
          catalogNumber,
          contentType: fields.contentType,
          primaryGenre: fields.primaryGenre,
          artworkAiUsage: fields.artworkAiUsage,
          explicit: fields.explicit,
          upc: fields.barcode?.trim() || null,
          releaseDate,
          artworkUrl: artwork.publicUrl,
          metadataJson: JSON.stringify(releaseMeta),
          status: "in_review",
          submittedAt: now,
          tracks: {
            create: {
              userId: user.id,
              title: fields.track.title.trim(),
              trackNumber: Number(fields.track.trackNumber) || 1,
              isrc: fields.track.isrc?.trim() || null,
              audioUrl: audio.publicUrl,
              metadataJson: JSON.stringify(trackMeta),
              contributors: {
                create: fields.track.contributors.map((c) => ({
                  name: `${c.firstName} ${c.lastName}`.trim(),
                  role: c.roles.join(", "),
                })),
              },
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
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid release payload" }, { status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "Could not submit release";
    const status = message.includes("limit") ? 403 : 500;
    console.error("[releases/submit]", error);
    return NextResponse.json({ error: message }, { status });
  }
}
