import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const gate = await requirePermissionApi("royalties.write");
  if ("error" in gate)
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  const query = new URL(request.url).searchParams.get("q")?.trim();
  if (!query || query.length < 2) return NextResponse.json({ tracks: [] });
  const tracks = await prisma.track.findMany({
    where: {
      OR: [
        { isrc: { contains: query, mode: "insensitive" } },
        { title: { contains: query, mode: "insensitive" } },
        { release: { upc: { contains: query, mode: "insensitive" } } },
      ],
    },
    take: 12,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      isrc: true,
      release: {
        select: {
          title: true,
          upc: true,
          user: { select: { name: true, email: true } },
        },
      },
    },
  });
  return NextResponse.json({ tracks });
}
