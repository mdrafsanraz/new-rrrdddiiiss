import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import { listGenres } from "@/lib/labelgrid";

/**
 * Live LabelGrid genre catalog for Step 1 — the wizard stores and sends
 * the real primary_genre_id, never a local genre-name guess.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isLabelGridLive()) {
    return NextResponse.json({
      genres: [],
      note: "LabelGrid token not configured.",
    });
  }

  try {
    const raw = await listGenres();
    const list = Array.isArray(raw)
      ? raw
      : ((raw as { data?: unknown[] })?.data ?? []);
    const genres = (list as Array<Record<string, unknown>>)
      .map((g) => ({
        id: Number(g.id),
        name: String(g.name ?? g.title ?? ""),
      }))
      .filter((g) => Number.isFinite(g.id) && g.name)
      .sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ genres });
  } catch (error) {
    console.error("[labelgrid/genres]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load genres" },
      { status: 502 }
    );
  }
}
