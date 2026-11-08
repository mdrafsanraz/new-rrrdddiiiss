import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

/** Legacy release uploads are retired. Evidence and replies belong in support tickets. */
export async function POST(_request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const release = await prisma.release.findFirst({ where: { id, userId: user.id }, select: { id: true } });
  if (!release) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    error: "Release document uploads have been removed. Please create a support ticket and attach any requested files there to resolve the reviewer’s feedback.",
    supportUrl: `/dashboard/support?view=new&releaseId=${encodeURIComponent(id)}`,
  }, { status: 410 });
}
