import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import { listDistroOutlets } from "@/lib/labelgrid";

/**
 * Proxy LabelGrid distro outlets for the distribution step.
 * Never expose API tokens to the client.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isLabelGridLive()) {
    return NextResponse.json({
      outlets: [
        { id: 1, key: "spotify", name: "Spotify", type: "dsp" },
        { id: 2, key: "applemusic", name: "Apple Music", type: "dsp" },
        { id: 3, key: "youtubemusic", name: "YouTube Music", type: "dsp" },
        { id: 4, key: "amazon", name: "Amazon Music", type: "dsp" },
        { id: 5, key: "deezer", name: "Deezer", type: "dsp" },
        { id: 6, key: "tiktok", name: "TikTok", type: "ugc" },
      ],
      sandbox: false,
      note: "LabelGrid token not configured — showing placeholder store names.",
    });
  }

  try {
    const raw = await listDistroOutlets();
    const list = Array.isArray(raw)
      ? raw
      : ((raw as { data?: unknown[] })?.data ?? []);
    const outlets = (list as Array<Record<string, unknown>>).map((o) => ({
      id: Number(o.id),
      key: String(o.key ?? ""),
      name: String(o.name ?? o.key ?? "Store"),
      type: String(o.type ?? "dsp"),
      is_ai_dsp: Boolean(o.is_ai_dsp),
      is_ugc_store: Boolean(o.is_ugc_store),
    }));
    return NextResponse.json({ outlets, sandbox: true });
  } catch (error) {
    console.error("[labelgrid/outlets]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not load distribution outlets",
      },
      { status: 502 }
    );
  }
}
