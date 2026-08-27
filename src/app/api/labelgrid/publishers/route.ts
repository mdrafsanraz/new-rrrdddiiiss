import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import { createPublisher } from "@/lib/labelgrid";
import { unwrapLabelGridId } from "@/lib/labelgrid/catalog";

/**
 * Publisher picker backend for the Credits step. Publishers are MANAGED on
 * LabelGrid (POST /publishers) but MAPPED per user on RDISTRO, so one
 * tenant's publishers never appear in another tenant's picker. Names are a
 * search/display cache only.
 */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  const rows = await prisma.publisherMapping.findMany({
    where: {
      userId: user.id,
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    publishers: rows.map((p) => ({ id: p.labelgridId, name: p.name })),
  });
}

const createSchema = z.object({
  name: z.string().min(1).max(255),
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isLabelGridLive()) {
    return NextResponse.json(
      { error: "LabelGrid not configured." },
      { status: 503 }
    );
  }

  try {
    const body = createSchema.parse(await request.json());
    const name = body.name.trim();

    const created = await createPublisher({ name });
    const id = unwrapLabelGridId(created);

    await prisma.publisherMapping.upsert({
      where: { userId_labelgridId: { userId: user.id, labelgridId: id } },
      create: { userId: user.id, labelgridId: id, name },
      update: { name },
    });

    return NextResponse.json({ publisher: { id, name } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    console.error("[labelgrid/publishers:post]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not create publisher",
      },
      { status: 502 }
    );
  }
}
