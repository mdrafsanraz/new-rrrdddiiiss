import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  name: z.string().min(2).max(64).optional(),
  fullName: z.string().max(64).optional().nullable(),
  email: z.string().email().max(64).optional().nullable().or(z.literal("")),
  location: z.string().max(255).optional().nullable(),
  bioShort: z.string().max(2000).optional().nullable(),
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
  if (existing.locked) {
    return NextResponse.json(
      {
        error:
          "This artist is locked because they were used on a submitted release. Profile fields cannot be edited.",
      },
      { status: 403 }
    );
  }

  try {
    const body = patchSchema.parse(await request.json());
    const artist = await prisma.artist.update({
      where: { id: existing.id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
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
