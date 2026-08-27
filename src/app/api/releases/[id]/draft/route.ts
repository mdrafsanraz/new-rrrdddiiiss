import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { logReleaseActivity } from "@/lib/releases/activity";
import { canUserEditRelease, isFinalRejection } from "@/lib/releases/status";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import {
  syncReleaseToLabelGrid,
  type TrackAudioInput,
} from "@/lib/labelgrid/sync-submit";
import {
  ARTWORK_AI_USAGE,
  COMMERCIAL_SAMPLES,
  COMPOSITION_TYPES,
  parseJsonObject,
  type ReleaseMetadata,
  type TrackMetadata,
} from "@/lib/releases/constants";
import {
  saveGenericUpload,
  validateArtwork,
  validateAudio,
  type StoredUpload,
  type ValidatedFile,
} from "@/lib/uploads/store";

type Params = { params: Promise<{ id: string }> };

const contributorSchema = z.object({
  /** LabelGrid writer id from the picker (managed on LabelGrid; mapped here). */
  writerId: z.number().int().positive().nullable().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  roles: z.array(z.string()).min(1),
  aiContribution: z.enum(["none", "partly", "all"]).optional(),
});

const trackSchema = z.object({
  id: z.string().optional(),
  clientId: z.string().optional(),
  title: z.string().min(1).max(200),
  mixVersion: z.string().max(200).optional().or(z.literal("")),
  isrc: z.string().max(15).optional().or(z.literal("")),
  compositionType: z.enum([
    COMPOSITION_TYPES[0].value,
    COMPOSITION_TYPES[1].value,
    COMPOSITION_TYPES[2].value,
  ]),
  explicit: z.enum(["off", "on", "edited"]),
  audioAiUsage: z.enum(ARTWORK_AI_USAGE),
  compositionAiUsage: z.enum(ARTWORK_AI_USAGE),
  commercialSamples: z.enum([
    COMMERCIAL_SAMPLES[0].value,
    COMMERCIAL_SAMPLES[1].value,
    COMMERCIAL_SAMPLES[2].value,
  ]),
  audioLanguage: z.string().min(2).max(20),
  featuredArtistNames: z.array(z.string()).optional(),
  hasMechanicalLicense: z.boolean().optional(),
  lyrics: z.string().max(20000).optional().or(z.literal("")),
  /** Cover/sample clearance doc type; file arrives as license_{clientId|id}. */
  licenseType: z.enum(["cover", "sample"]).nullable().optional(),
  contributors: z.array(contributorSchema).optional(),
});

const writerSplitSchema = z.object({
  writerId: z.number().int().positive().nullable().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  roles: z.array(z.string()).min(1),
  share: z.number().min(0).max(100),
});

const publisherSplitSchema = z.object({
  publisherId: z.number().int().positive().nullable().optional(),
  name: z.string().min(1),
  share: z.number().min(0).max(100),
});

const schema = z.object({
  title: z.string().min(1).max(200).optional(),
  artistId: z.string().optional(),
  contentType: z.enum(["Single", "EP", "Album"]).optional(),
  /** Live LabelGrid genre id + display name (GET /genres). */
  primaryGenreId: z.number().int().positive().nullable().optional(),
  primaryGenreName: z.string().max(120).optional().or(z.literal("")),
  releaseDate: z.string().optional().nullable(),
  originalReleaseDate: z.string().optional().or(z.literal("")),
  upc: z.string().max(13).optional().nullable(),
  mixVersion: z.string().optional().or(z.literal("")),
  preferredLocalization: z.string().optional(),
  artworkAiUsage: z.enum(ARTWORK_AI_USAGE).optional(),
  transferFromDistributor: z.string().max(255).optional().or(z.literal("")),
  clineYear: z.string().optional().or(z.literal("")),
  clineName: z.string().optional().or(z.literal("")),
  plineYear: z.string().optional().or(z.literal("")),
  plineName: z.string().optional().or(z.literal("")),
  allStores: z.boolean().optional(),
  selectedOutletKeys: z.array(z.string()).optional(),
  worldwide: z.boolean().optional(),
  territoryCodes: z.array(z.string()).optional(),
  tracks: z.array(trackSchema).optional(),
  contributors: z.array(contributorSchema).optional(),
  writerSplits: z.array(writerSplitSchema).optional(),
  publisherSplits: z.array(publisherSplitSchema).optional(),
  selfPublished: z.boolean().optional(),
  /**
   * Wizard checkpoint: force a LabelGrid metadata sync (release/distribution
   * after the Distribution step, tracks/credits after the Credits step)
   * even when this particular save carries no new file.
   */
  syncToLabelGrid: z.boolean().optional(),
});

/**
 * Autosave / update a draft release (and its tracks).
 * Does not change submittedAt or submit to LabelGrid review.
 */
export async function PATCH(request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.release.findFirst({
    where: { id, userId: user.id },
    include: { tracks: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (isFinalRejection(existing) || !canUserEditRelease(existing)) {
    return NextResponse.json(
      { error: "This release cannot be edited." },
      { status: 403 }
    );
  }

  try {
    const form = await request.formData();
    const raw = form.get("payload");
    if (typeof raw !== "string") {
      return NextResponse.json({ error: "Missing payload" }, { status: 400 });
    }
    const fields = schema.parse(JSON.parse(raw));

    if (fields.artistId) {
      const artist = await prisma.artist.findFirst({
        where: { id: fields.artistId, userId: user.id },
      });
      if (!artist) {
        return NextResponse.json({ error: "Artist not found" }, { status: 404 });
      }
    }

    const artworkFile = form.get("artwork");
    const artwork: ValidatedFile | null =
      artworkFile instanceof File && artworkFile.size > 0
        ? await validateArtwork(artworkFile)
        : null;

    const prevMeta = parseJsonObject<ReleaseMetadata & Record<string, unknown>>(
      existing.metadataJson
    );
    const nextMeta = {
      ...prevMeta,
      ...(fields.mixVersion !== undefined
        ? { mixVersion: fields.mixVersion || undefined }
        : {}),
      ...(fields.preferredLocalization
        ? { preferredLocalization: fields.preferredLocalization }
        : {}),
      ...(fields.primaryGenreId !== undefined
        ? { primaryGenreId: fields.primaryGenreId }
        : {}),
      ...(fields.originalReleaseDate !== undefined
        ? { originalReleaseDate: fields.originalReleaseDate || undefined }
        : {}),
      ...(fields.transferFromDistributor !== undefined
        ? {
            transferFromDistributor:
              fields.transferFromDistributor || undefined,
          }
        : {}),
      ...(fields.writerSplits !== undefined
        ? { writerSplits: fields.writerSplits }
        : {}),
      ...(fields.publisherSplits !== undefined
        ? { publisherSplits: fields.publisherSplits }
        : {}),
      ...(fields.selfPublished !== undefined
        ? { selfPublished: fields.selfPublished }
        : {}),
      ...(fields.clineYear !== undefined
        ? {
            clineYear: fields.clineYear
              ? Number(fields.clineYear)
              : prevMeta.clineYear,
          }
        : {}),
      ...(fields.clineName !== undefined
        ? { clineName: fields.clineName || undefined }
        : {}),
      ...(fields.plineYear !== undefined
        ? {
            plineYear: fields.plineYear
              ? Number(fields.plineYear)
              : prevMeta.plineYear,
          }
        : {}),
      ...(fields.plineName !== undefined
        ? { plineName: fields.plineName || undefined }
        : {}),
      ...(fields.allStores !== undefined ? { allStores: fields.allStores } : {}),
      ...(fields.selectedOutletKeys !== undefined
        ? { selectedOutletKeys: fields.selectedOutletKeys }
        : {}),
      ...(fields.worldwide !== undefined ? { worldwide: fields.worldwide } : {}),
      ...(fields.territoryCodes !== undefined
        ? { territoryCodes: fields.territoryCodes }
        : {}),
    };

    await prisma.release.update({
      where: { id },
      data: {
        ...(fields.title ? { title: fields.title.trim() } : {}),
        ...(fields.artistId ? { artistId: fields.artistId } : {}),
        ...(fields.contentType ? { contentType: fields.contentType } : {}),
        ...(fields.primaryGenreName
          ? { primaryGenre: fields.primaryGenreName.trim() }
          : {}),
        ...(fields.artworkAiUsage
          ? { artworkAiUsage: fields.artworkAiUsage }
          : {}),
        ...(fields.upc !== undefined
          ? { upc: fields.upc?.trim() || null }
          : {}),
        ...(fields.releaseDate !== undefined
          ? {
              releaseDate: fields.releaseDate
                ? new Date(`${fields.releaseDate}T00:00:00.000Z`)
                : null,
            }
          : {}),
        metadataJson: JSON.stringify(nextMeta),
        storesJson: JSON.stringify({
          allStores: nextMeta.allStores ?? true,
          outletKeys: nextMeta.selectedOutletKeys ?? [],
        }),
        territoriesJson: JSON.stringify({
          worldwide: nextMeta.worldwide ?? true,
          codes: nextMeta.territoryCodes ?? [],
        }),
      },
    });

    // Replace tracks when provided
    const audioInputs: TrackAudioInput[] = [];
    if (fields.tracks) {
      const keepIds: string[] = [];
      let index = 0;
      for (const t of fields.tracks) {
        index += 1;
        const audioKey = `audio_${t.clientId ?? t.id ?? index}`;
        const audioFile = form.get(audioKey);
        const audio: ValidatedFile | null =
          audioFile instanceof File && audioFile.size > 0
            ? await validateAudio(audioFile)
            : null;

        const contributors =
          t.contributors ??
          fields.contributors ??
          [];

        // Preserve server-managed fields (license sync, audio attempts).
        const prevTrackMeta = t.id
          ? parseJsonObject<TrackMetadata>(
              existing.tracks.find((x) => x.id === t.id)?.metadataJson
            )
          : ({} as TrackMetadata);

        const licenseKey = `license_${t.clientId ?? t.id ?? index}`;
        const licenseFile = form.get(licenseKey);
        let licenseUpload: StoredUpload | null = null;
        if (licenseFile instanceof File && licenseFile.size > 0) {
          licenseUpload = await saveGenericUpload(user.id, licenseFile, "license");
        }

        const tMeta: TrackMetadata = {
          ...prevTrackMeta,
          mixVersion: t.mixVersion || undefined,
          compositionType: t.compositionType,
          audioAiUsage: t.audioAiUsage,
          compositionAiUsage: t.compositionAiUsage,
          commercialSamples: t.commercialSamples,
          audioLanguage: t.audioLanguage,
          primaryGenre:
            fields.primaryGenreName?.trim() ||
            existing.primaryGenre ||
            undefined,
          hasMechanicalLicense: Boolean(t.hasMechanicalLicense),
          lyrics: t.lyrics || undefined,
          explicit: t.explicit,
          contributors,
          featuredArtistNames: t.featuredArtistNames,
        };
        if (t.licenseType !== undefined) tMeta.licenseType = t.licenseType;
        if (licenseUpload) {
          tMeta.licenseUrl = licenseUpload.publicUrl;
          // New file → needs a fresh LabelGrid license upload.
          tMeta.licenseSyncedAt = null;
        }

        let trackId: string;
        if (t.id) {
          const owned = existing.tracks.find((x) => x.id === t.id);
          if (!owned) continue;
          await prisma.track.update({
            where: { id: t.id },
            data: {
              title: t.title.trim(),
              trackNumber: index,
              isrc: t.isrc?.trim() || null,
              metadataJson: JSON.stringify(tMeta),
            },
          });
          await prisma.trackContributor.deleteMany({ where: { trackId: t.id } });
          if (contributors.length) {
            await prisma.trackContributor.createMany({
              data: contributors.map((c) => ({
                trackId: t.id!,
                name: `${c.firstName} ${c.lastName}`.trim(),
                role: c.roles.join(", "),
              })),
            });
          }
          keepIds.push(t.id);
          trackId = t.id;
        } else {
          const created = await prisma.track.create({
            data: {
              userId: user.id,
              releaseId: id,
              title: t.title.trim(),
              trackNumber: index,
              isrc: t.isrc?.trim() || null,
              metadataJson: JSON.stringify(tMeta),
              contributors: {
                create: contributors.map((c) => ({
                  name: `${c.firstName} ${c.lastName}`.trim(),
                  role: c.roles.join(", "),
                })),
              },
            },
          });
          keepIds.push(created.id);
          trackId = created.id;
        }

        if (audio) audioInputs.push({ localTrackId: trackId, upload: audio });
      }

      await prisma.track.deleteMany({
        where: { releaseId: id, id: { notIn: keepIds } },
      });

      // Release-level explicit is derived, not user-entered: explicit if any
      // track is explicit, otherwise clean/edited if any, otherwise off.
      const releaseExplicit = fields.tracks.some((t) => t.explicit === "on")
        ? "on"
        : fields.tracks.some((t) => t.explicit === "edited")
          ? "edited"
          : "off";
      await prisma.release.update({
        where: { id },
        data: { explicit: releaseExplicit },
      });
    } else if (fields.contributors && existing.tracks[0]) {
      const trackId = existing.tracks[0].id;
      const tMeta = parseJsonObject<TrackMetadata>(
        existing.tracks[0].metadataJson
      );
      tMeta.contributors = fields.contributors;
      await prisma.track.update({
        where: { id: trackId },
        data: { metadataJson: JSON.stringify(tMeta) },
      });
      await prisma.trackContributor.deleteMany({ where: { trackId } });
      await prisma.trackContributor.createMany({
        data: fields.contributors.map((c) => ({
          trackId,
          name: `${c.firstName} ${c.lastName}`.trim(),
          role: c.roles.join(", "),
        })),
      });
    }

    await logReleaseActivity({
      releaseId: id,
      type: "edited",
      title: "Draft saved",
      actorUserId: user.id,
    });

    let fresh = await prisma.release.findUnique({
      where: { id },
      include: {
        artist: true,
        tracks: { orderBy: { trackNumber: "asc" } },
      },
    });

    let labelgrid:
      | { uploaded: boolean; error?: string; processingTrackIds?: string[] }
      | undefined;
    // Hit LabelGrid when this request carries a new file, or when the
    // wizard explicitly asked for a checkpoint sync (leaving Distribution
    // or Credits) — metadata-only keystrokes otherwise skip the round trip;
    // the final metadata sync also happens at submit-for-review/approve.
    if (
      fresh &&
      isLabelGridLive() &&
      (artwork || audioInputs.length > 0 || fields.syncToLabelGrid)
    ) {
      const pushResult = await syncReleaseToLabelGrid({
        release: fresh,
        artwork,
        audios: audioInputs,
      });
      labelgrid = pushResult.ok
        ? { uploaded: true, processingTrackIds: pushResult.processingTrackIds }
        : { uploaded: false, error: pushResult.error };
      // Re-fetch so the response reflects the labelgridId + LabelGrid-hosted
      // artwork/audio URLs + per-track processing state written above.
      fresh = await prisma.release.findUnique({
        where: { id },
        include: { artist: true, tracks: { orderBy: { trackNumber: "asc" } } },
      });
    }

    return NextResponse.json({ release: fresh, labelgrid });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    console.error("[releases/draft]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Save failed" },
      { status: 500 }
    );
  }
}
