import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const gate = await requirePermissionApi("admin.access");
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const [users, releases, artists] = await Promise.all([
    prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
          { id: { equals: q } },
          { stripeCustomerId: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 8,
      select: { id: true, name: true, email: true, planId: true },
    }),
    prisma.release.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { upc: { contains: q, mode: "insensitive" } },
          { labelgridId: { contains: q, mode: "insensitive" } },
          { catalogNumber: { contains: q, mode: "insensitive" } },
          { id: { equals: q } },
          {
            tracks: {
              some: { isrc: { contains: q, mode: "insensitive" } },
            },
          },
        ],
      },
      take: 8,
      select: {
        id: true,
        title: true,
        upc: true,
        status: true,
        artist: { select: { name: true } },
      },
    }),
    prisma.artist.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { id: { equals: q } },
          { labelgridId: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 6,
      select: {
        id: true,
        name: true,
        user: { select: { email: true } },
      },
    }),
  ]);

  const results = [
    ...users.map((u) => ({
      type: "user" as const,
      id: u.id,
      title: u.name,
      subtitle: `${u.email} · ${u.planId}`,
      href: `/admin/users/${u.id}`,
    })),
    ...releases.map((r) => ({
      type: "release" as const,
      id: r.id,
      title: r.title,
      subtitle: `${r.artist?.name ?? "—"} · ${r.status}${r.upc ? ` · ${r.upc}` : ""}`,
      href: `/admin/releases/${r.id}`,
    })),
    ...artists.map((a) => ({
      type: "artist" as const,
      id: a.id,
      title: a.name,
      subtitle: a.user.email,
      href: `/admin/artists?q=${encodeURIComponent(a.name)}`,
    })),
  ];

  return NextResponse.json({ results });
}
