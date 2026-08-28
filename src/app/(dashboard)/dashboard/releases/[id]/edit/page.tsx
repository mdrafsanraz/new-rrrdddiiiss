import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Disc } from "@phosphor-icons/react/dist/ssr";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { ReleaseBuilder } from "@/components/dashboard/release-builder";
import { wizardStateFromRelease } from "@/lib/releases/wizard-from-release";
import {
  canUserEditRelease,
  isFinalRejection,
} from "@/lib/releases/status";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import {
  fetchLiveRelease,
  withTimeout,
  type LiveRelease,
} from "@/lib/labelgrid/live-release";

type Props = { params: Promise<{ id: string }> };

/** Always rebuild edit state from the latest DB row and live LabelGrid data. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const r = await prisma.release.findUnique({
    where: { id },
    select: { title: true },
  });
  return { title: r ? `Edit ${r.title}` : "Edit release" };
}

export default async function EditReleasePage({ params }: Props) {
  const user = await requireUser();
  const { id } = await params;

  const release = await prisma.release.findFirst({
    where: { id, userId: user.id },
    include: {
      artist: true,
      tracks: { orderBy: { trackNumber: "asc" } },
    },
  });
  if (!release) notFound();

  if (isFinalRejection(release) || !canUserEditRelease(release)) {
    redirect(`/dashboard/releases/${id}`);
  }

  const artists = await prisma.artist.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });

  // Prefer LabelGrid's actual cover/audio URLs over the local cache, which
  // can lag behind (e.g. audio whose async processing finished after the
  // original sync request's own poll budget expired). Best-effort — never
  // block editing on LabelGrid latency, the local cache is still a fine
  // fallback if this fails.
  let live: LiveRelease | null = null;
  if (isLabelGridLive() && release.labelgridId) {
    try {
      live = await withTimeout(
        fetchLiveRelease(user.id, Number(release.labelgridId)),
        8000
      );
    } catch (error) {
      console.error("[releases/edit] live fetch failed", error);
    }
  }

  const initialWizard = wizardStateFromRelease(
    release,
    release.artist?.name ?? "",
    live
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="space-y-4">
        <Link
          href={`/dashboard/releases/${id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          <ArrowLeft size={14} weight="bold" aria-hidden />
          Back to release
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Catalog
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-balance">
              Edit release
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Update metadata and re-upload artwork or audio. Changes stay in
              this editor until you click Submit Release.
            </p>
          </div>
          <div className="flex size-12 items-center justify-center border border-border bg-primary/10 text-primary">
            <Disc size={24} weight="regular" aria-hidden />
          </div>
        </div>
      </div>

      <ReleaseBuilder
        artists={artists.map((a) => ({
          id: a.id,
          name: a.name,
          locked: a.locked,
        }))}
        defaultArtistId={release.artistId ?? undefined}
        initialWizard={initialWizard}
      />
    </div>
  );
}
