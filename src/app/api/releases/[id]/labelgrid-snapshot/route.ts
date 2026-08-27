import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getRelease } from "@/lib/labelgrid";
import { isLabelGridLive } from "@/lib/labelgrid/config";

type Params = { params: Promise<{ id: string }> };

type LiveTrack = {
  id: number;
  track_num: number | null;
  title: string | null;
  mix_version: string | null;
  default_display_artist: string | null;
};

type LiveReleaseSnapshot = {
  id: number;
  title: string | null;
  artist: string | null;
  primary_genre: string | null;
  content_type: string | null;
  release_date: string | null;
  barcode_number: string | null;
  cover_url: string | null;
  review_status: string | null;
  store_count: number | null;
  all_stores: boolean;
  tracks: LiveTrack[];
};

/**
 * Review step (Step 5) reads this instead of trusting the local cache — the
 * spec is explicit: "do not rely on an outdated duplicate local release
 * record." Ownership is enforced through the local mapping row before the
 * LabelGrid id is ever used (IDOR protection), then GET /releases/{id} is
 * fetched live and normalized for display.
 */
export async function GET(_request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const release = await prisma.release.findFirst({
    where: { id, userId: user.id },
    select: { labelgridId: true },
  });
  if (!release) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!release.labelgridId) {
    return NextResponse.json(
      { error: "This release has not been created on LabelGrid yet." },
      { status: 409 }
    );
  }
  if (!isLabelGridLive()) {
    return NextResponse.json(
      { error: "LabelGrid is not configured." },
      { status: 503 }
    );
  }

  try {
    const raw = await getRelease(release.labelgridId);
    const lg = (raw as { data: Record<string, unknown> }).data;

    const artists = Array.isArray(lg.artists)
      ? (lg.artists as Array<{ artist?: { artist_name?: string } }>)
          .map((a) => a.artist?.artist_name)
          .filter(Boolean)
          .join(", ")
      : null;

    const genre = (lg.primary_genre as { name?: string } | null)?.name ?? null;
    const cover = (lg.front_cover as { url?: string } | null)?.url ?? null;

    const dspConfigs = lg.dsp_configs;
    const allStoresConfig = Array.isArray(dspConfigs)
      ? (dspConfigs as Array<{ distro_outlet_id: string; enabled: boolean }>).find(
          (c) => c.distro_outlet_id === "all_dsps"
        )
      : null;
    const allStores = allStoresConfig ? allStoresConfig.enabled : true;
    const storeCount = Array.isArray(dspConfigs)
      ? (dspConfigs as unknown[]).length
      : null;

    const tracks: LiveTrack[] = Array.isArray(lg.tracks)
      ? (lg.tracks as Array<Record<string, unknown>>).map((t) => ({
          id: t.id as number,
          track_num: (t.track_num as number | null) ?? null,
          title: (t.title as string | null) ?? null,
          mix_version: (t.mix_version as string | null) ?? null,
          default_display_artist:
            (t.default_display_artist as string | null) ?? null,
        }))
      : [];

    const snapshot: LiveReleaseSnapshot = {
      id: lg.id as number,
      title: (lg.title as string | null) ?? null,
      artist: artists,
      primary_genre: genre,
      content_type: (lg.content_type as string | null) ?? null,
      release_date: (lg.release_date as string | null) ?? null,
      barcode_number: (lg.barcode_number as string | null) ?? null,
      cover_url: cover,
      review_status: (lg.review_status as string | null) ?? null,
      store_count: storeCount,
      all_stores: allStores,
      tracks: tracks.sort((a, b) => (a.track_num ?? 0) - (b.track_num ?? 0)),
    };

    return NextResponse.json({ snapshot });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not fetch the release from LabelGrid.",
      },
      { status: 502 }
    );
  }
}
