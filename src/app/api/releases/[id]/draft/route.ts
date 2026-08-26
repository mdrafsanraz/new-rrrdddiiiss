import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { logReleaseActivity } from "@/lib/releases/activity";
import { canUserEditRelease, isFinalRejection } from "@/lib/releases/status";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import { pushMediaToLabelGrid } from "@/lib/labelgrid/sync-submit";
import {
  ARTWORK_AI_USAGE,
  COMMERCIAL_SAMPLES,
  COMPOSITION_TYPES,
  parseJsonObject,
  type ReleaseMetadata,
  type TrackMetadata,
} from "@/lib/releases/constants";
import {
  saveArtwork,
  saveAudio,
  type StoredUpload,
} from "@/lib/uploads/store";

type Params = { params: Promise<{ id: string }> };

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
  contributors: z
    .array(
      z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        roles: z.array(z.string()).min(1),
      })
    )
    .optional(),
});

const schema = z.object({
  title: z.string().min(1).max(200).optional(),
  artistId: z.string().optional(),
  contentType: z.enum(["Single", "EP", "Album"]).optional(),
  primaryGenre: z.string().optional(),
  secondaryGenre: z.string().optional().or(z.literal("")),
  releaseDate: z.string().optional().nullable(),
  upc: z.string().max(13).optional().nullable(),
  mixVersion: z.string().optional().or(z.literal("")),
  preferredLocalization: z.string().optional(),
  artworkAiUsage: z.enum(ARTWORK_AI_USAGE).optional(),
  explicit: z.enum(["off", "on", "edited"]).optional(),
  clineYear: z.string().optional().or(z.literal("")),
  clineName: z.string().optional().or(z.literal("")),
  plineYear: z.string().optional().or(z.literal("")),
  plineName: z.string().optional().or(z.literal("")),
  allStores: z.boolean().optional(),
  selectedOutletIds: z.array(z.number()).optional(),
  worldwide: z.boolean().optional(),
  territoryCodes: z.array(z.string()).optional(),
  tracks: z.array(trackSchema).optional(),
  contributors: z
    .array(
      z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        roles: z.array(z.string()).min(1),
      })
    )
    .optional(),
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
    let artworkUrl = existing.artworkUrl;
    let artworkUpload: StoredUpload | null = null;
    if (artworkFile instanceof File && artworkFile.size > 0) {
      artworkUpload = await saveArtwork(user.id, artworkFile);
      artworkUrl = artworkUpload.publicUrl;
    }

    const audioUploads = new Map<string, StoredUpload>();

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
      ...(fields.secondaryGenre !== undefined
        ? { secondaryGenre: fields.secondaryGenre || undefined }
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
      ...(fields.selectedOutletIds !== undefined
        ? { selectedOutletIds: fields.selectedOutletIds }
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
        ...(fields.primaryGenre ? { primaryGenre: fields.primaryGenre } : {}),
        ...(fields.artworkAiUsage
          ? { artworkAiUsage: fields.artworkAiUsage }
          : {}),
        ...(fields.explicit ? { explicit: fields.explicit } : {}),
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
        artworkUrl,
        metadataJson: JSON.stringify(nextMeta),
        storesJson: JSON.stringify({
          allStores: nextMeta.allStores ?? true,
          outletIds: nextMeta.selectedOutletIds ?? [],
        }),
        territoriesJson: JSON.stringify({
          worldwide: nextMeta.worldwide ?? true,
          codes: nextMeta.territoryCodes ?? [],
        }),
      },
    });

    // Replace tracks when provided
    if (fields.tracks) {
      const keepIds: string[] = [];
      let index = 0;
      for (const t of fields.tracks) {
        index += 1;
        const audioKey = `audio_${t.clientId ?? t.id ?? index}`;
        const audioFile = form.get(audioKey);
        let audioUrl: string | null = null;
        if (audioFile instanceof File && audioFile.size > 0) {
          const saved = await saveAudio(user.id, audioFile);
          audioUrl = saved.publicUrl;
          const trackKey = t.id ?? t.clientId ?? String(index);
          audioUploads.set(trackKey, saved);
        }

        const contributors =
          t.contributors ??
          fields.contributors ??
          [];

        const tMeta: TrackMetadata = {
          mixVersion: t.mixVersion || undefined,
          compositionType: t.compositionType,
          audioAiUsage: t.audioAiUsage,
          compositionAiUsage: t.compositionAiUsage,
          commercialSamples: t.commercialSamples,
          audioLanguage: t.audioLanguage,
          primaryGenre: fields.primaryGenre ?? existing.primaryGenre ?? undefined,
          hasMechanicalLicense: Boolean(t.hasMechanicalLicense),
          lyrics: t.lyrics || undefined,
          explicit: t.explicit,
          contributors,
          featuredArtistNames: t.featuredArtistNames,
        };

        if (t.id) {
          const owned = existing.tracks.find((x) => x.id === t.id);
          if (!owned) continue;
          await prisma.track.update({
            where: { id: t.id },
            data: {
              title: t.title.trim(),
              trackNumber: index,
              isrc: t.isrc?.trim() || null,
              ...(audioUrl ? { audioUrl } : {}),
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
        } else {
          const created = await prisma.track.create({
            data: {
              userId: user.id,
              releaseId: id,
              title: t.title.trim(),
              trackNumber: index,
              isrc: t.isrc?.trim() || null,
              audioUrl,
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
        }
      }

      await prisma.track.deleteMany({
        where: { releaseId: id, id: { notIn: keepIds } },
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

    const fresh = await prisma.release.findUnique({
      where: { id },
      include: {
        artist: true,
        tracks: { orderBy: { trackNumber: "asc" } },
      },
    });

    let labelgrid: { uploaded: boolean; error?: string } | undefined;
    if (
      fresh &&
      isLabelGridLive() &&
      (artworkUpload || audioUploads.size > 0)
    ) {
      const firstTrack = fresh.tracks[0];
      const audioUpload =
        (firstTrack &&
          [...audioUploads.values()].find((u) => u.publicUrl === firstTrack.audioUrl)) ??
        [...audioUploads.values()][0] ??
        null;
      const pushResult = await pushMediaToLabelGrid({
        release: fresh,
        artwork: artworkUpload,
        audio: audioUpload,
        localTrackId: firstTrack?.id,
      });
      labelgrid = pushResult.ok
        ? { uploaded: true }
        : { uploaded: false, error: pushResult.error };
      if (!pushResult.ok && !fresh.labelgridId) {
        await prisma.release.update({
          where: { id },
          data: {
            syncError: `LabelGrid upload: ${pushResult.error}`.slice(0, 2000),
          },
        });
      }
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
