import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import {
  assertCanCreateArtist,
  getUserUsage,
} from "@/lib/entitlements/server";
import { createOrReuseArtist } from "@/lib/labelgrid";
import { isLabelGridLive } from "@/lib/labelgrid/config";

const createSchema = z.object({
  name: z.string().min(2).max(64),
  fullName: z.string().max(64).optional(),
  email: z.string().email().max(64).optional().or(z.literal("")),
  location: z.string().max(255).optional(),
  bioShort: z.string().max(2000).optional(),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [artists, usage] = await Promise.all([
    prisma.artist.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { releases: true } } },
    }),
    getUserUsage(user.id, user.planId),
  ]);

  return NextResponse.json({ artists, usage });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = createSchema.parse(await request.json());
    await assertCanCreateArtist(user.id, user.planId);

    let labelgridId: string | null = null;
    if (isLabelGridLive()) {
      const provider = await createOrReuseArtist({
        artist_name: body.name.trim(),
        ...(body.fullName?.trim() ? { full_name: body.fullName.trim() } : {}),
        ...(body.email?.trim() ? { email: body.email.trim() } : {}),
        ...(body.location?.trim() ? { location: body.location.trim() } : {}),
        ...(body.bioShort?.trim() ? { bio_short: body.bioShort.trim() } : {}),
      });
      labelgridId = String(provider.id);

      const existing = await prisma.artist.findFirst({
        where: {
          userId: user.id,
          OR: [
            { labelgridId },
            { name: { equals: body.name.trim(), mode: "insensitive" } },
          ],
        },
      });
      if (existing) {
        const artist = existing.labelgridId
          ? existing
          : await prisma.artist.update({
              where: { id: existing.id },
              data: { labelgridId },
            });
        return NextResponse.json({ artist, reused: true });
      }
    }

    const artist = await prisma.artist.create({
      data: {
        userId: user.id,
        name: body.name.trim(),
        fullName: body.fullName?.trim() || null,
        email: body.email?.trim() || null,
        location: body.location?.trim() || null,
        bioShort: body.bioShort?.trim() || null,
        labelgridId,
      },
    });
    return NextResponse.json({ artist }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    const message =
      error instanceof Error ? error.message : "Could not create artist";
    const status = message.includes("limit") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
