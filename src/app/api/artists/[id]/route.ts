import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { updateArtist } from "@/lib/labelgrid";
import { isLabelGridLive } from "@/lib/labelgrid/config";

type Params = { params: Promise<{ id: string }> };

/** Empty clears the link; otherwise it must be an artist profile URL on the expected host. */
function isArtistProfileUrl(value: string, host: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  try {
    const url = new URL(trimmed);
    return (
      url.protocol === "https:" &&
      (url.hostname === host || url.hostname.endsWith(`.${host}`)) &&
      url.pathname.includes("/artist/")
    );
  } catch {
    return false;
  }
}

const patchSchema = z.object({
  name: z.string().min(2).max(64).optional(),
  fullName: z.string().max(64).optional().nullable(),
  email: z.string().email().max(64).optional().nullable().or(z.literal("")),
  location: z.string().max(255).optional().nullable(),
  bioShort: z.string().max(2000).optional().nullable(),
  spotifyUrl: z
    .string()
    .max(255)
    .optional()
    .nullable()
    .refine((v) => v == null || isArtistProfileUrl(v, "open.spotify.com"), {
      message:
        "Spotify link must be an artist profile URL like https://open.spotify.com/artist/...",
    }),
  appleMusicUrl: z
    .string()
    .max(255)
    .optional()
    .nullable()
    .refine((v) => v == null || isArtistProfileUrl(v, "music.apple.com"), {
      message:
        "Apple Music link must be an artist profile URL like https://music.apple.com/us/artist/...",
    }),
});

async function ownedArtist(userId: string, id: string) {
  return prisma.artist.findFirst({
    where: { id, userId },
    include: {
      releases: { orderBy: { updatedAt: "desc" }, take: 20 },
      _count: { select: { releases: true } },
    },
  });
}

export async function GET(_request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const artist = await ownedArtist(user.id, id);
  if (!artist) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ artist });
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await prisma.artist.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const body = patchSchema.parse(await request.json());
    if (
      existing.locked &&
      body.name !== undefined &&
      body.name.trim() !== existing.name
    ) {
      return NextResponse.json(
        { error: "Artist names cannot be changed after submission." },
        { status: 403 }
      );
    }
    const providerData = {
      ...(!existing.locked && body.name !== undefined ? { artist_name: body.name.trim() } : {}),
      ...(body.fullName !== undefined ? { full_name: body.fullName?.trim() || "" } : {}),
      ...(body.email !== undefined ? { email: body.email?.trim() || "" } : {}),
      ...(body.location !== undefined ? { location: body.location?.trim() || "" } : {}),
      ...(body.bioShort !== undefined ? { bio_short: body.bioShort?.trim() || "" } : {}),
      ...(body.spotifyUrl !== undefined ? { spotify_url: body.spotifyUrl?.trim() || "" } : {}),
      ...(body.appleMusicUrl !== undefined ? { applemusic_url: body.appleMusicUrl?.trim() || "" } : {}),
    };
    if (existing.labelgridId && isLabelGridLive()) {
      try {
        await updateArtist(existing.labelgridId, providerData);
      } catch (error) {
        console.error("[artists/patch] LabelGrid update failed", error);
        return NextResponse.json({ error: "LabelGrid artist update failed. Local data was not changed." }, { status: 502 });
      }
    }
    const artist = await prisma.artist.update({
      where: { id: existing.id },
      data: {
        ...(!existing.locked && body.name !== undefined
          ? { name: body.name.trim() }
          : {}),
        ...(body.fullName !== undefined
          ? { fullName: body.fullName?.trim() || null }
          : {}),
        ...(body.email !== undefined
          ? { email: body.email?.trim() || null }
          : {}),
        ...(body.location !== undefined
          ? { location: body.location?.trim() || null }
          : {}),
        ...(body.bioShort !== undefined
          ? { bioShort: body.bioShort?.trim() || null }
          : {}),
        ...(body.spotifyUrl !== undefined
          ? { spotifyUrl: body.spotifyUrl?.trim() || null }
          : {}),
        ...(body.appleMusicUrl !== undefined
          ? { appleMusicUrl: body.appleMusicUrl?.trim() || null }
          : {}),
      },
    });
    return NextResponse.json({ artist });
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
