import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import { createWriter } from "@/lib/labelgrid";
import { unwrapLabelGridId } from "@/lib/labelgrid/catalog";

/**
 * Writer picker backend for the Credits step, mirroring LabelGrid's own
 * "Search writers / Create new" control. Writers are MANAGED on LabelGrid
 * (the shared RDISTRO account) but MAPPED per user here — search reads the
 * local mapping so one tenant's writers never appear in another tenant's
 * picker, and names are only a search/display cache (LabelGrid stays the
 * source of truth for the entity).
 */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  const rows = await prisma.writerMapping.findMany({
    where: {
      userId: user.id,
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    writers: rows.map((w) => ({
      id: w.labelgridId,
      first_name: w.firstName,
      last_name: w.lastName,
    })),
  });
}

const createSchema = z.object({
  firstName: z.string().min(1).max(255),
  lastName: z.string().min(1).max(255),
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
    const firstName = body.firstName.trim();
    const lastName = body.lastName.trim();

    const created = await createWriter({
      first_name: firstName,
      last_name: lastName,
    });
    const id = unwrapLabelGridId(created);

    await prisma.writerMapping.upsert({
      where: { userId_labelgridId: { userId: user.id, labelgridId: id } },
      create: { userId: user.id, labelgridId: id, firstName, lastName },
      update: { firstName, lastName },
    });

    return NextResponse.json(
      { writer: { id, first_name: firstName, last_name: lastName } },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    console.error("[labelgrid/writers:post]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not create writer",
      },
      { status: 502 }
    );
  }
}
