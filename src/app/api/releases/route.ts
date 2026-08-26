import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getUserUsage } from "@/lib/entitlements/server";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  catalogNumber: z.string().min(1).max(20),
  artistId: z.string().min(1),
  releaseDate: z.string().optional(),
});

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const status = searchParams.get("status")?.trim();

  const releases = await prisma.release.findMany({
    where: {
      userId: user.id,
      ...(status ? { status: status as never } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { catalogNumber: { contains: q } },
              { upc: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: { artist: true, _count: { select: { tracks: true } } },
  });

  const usage = await getUserUsage(user.id, user.planId);
  return NextResponse.json({ releases, usage });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = createSchema.parse(await request.json());

    const artist = await prisma.artist.findFirst({
      where: { id: body.artistId, userId: user.id },
    });
    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    // Drafts do not consume Free monthly submit quota (important.md §17).
    const release = await prisma.release.create({
      data: {
        userId: user.id,
        artistId: artist.id,
        title: body.title.trim(),
        catalogNumber: body.catalogNumber.trim().toUpperCase(),
        releaseDate: body.releaseDate ? new Date(body.releaseDate) : null,
        status: "draft",
        tracks: {
          create: {
            userId: user.id,
            title: body.title.trim(),
            trackNumber: 1,
          },
        },
      },
      include: { tracks: true, artist: true },
    });

    return NextResponse.json({ release }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    console.error("[releases/create]", error);
    return NextResponse.json({ error: "Could not create release" }, { status: 500 });
  }
}
