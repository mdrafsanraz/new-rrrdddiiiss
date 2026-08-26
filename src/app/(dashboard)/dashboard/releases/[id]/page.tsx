import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { SubmitReleaseButton } from "@/components/dashboard/submit-release-button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export default async function ReleaseDetailPage({ params }: Props) {
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

  const editable = [
    "draft",
    "incomplete",
    "ready_to_submit",
    "changes_required",
    "error",
  ].includes(release.status);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/releases"
            className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
          >
            ← Releases
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              {release.title}
            </h1>
            <StatusBadge status={release.status} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {release.artist?.name ?? "No artist"} · {release.catalogNumber}
            {release.upc ? ` · UPC ${release.upc}` : ""}
          </p>
        </div>
        {editable && !release.submittedAt ? (
          <SubmitReleaseButton releaseId={release.id} />
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Release info</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Status" value={<StatusBadge status={release.status} />} />
            <Row
              label="Release date"
              value={
                release.releaseDate
                  ? release.releaseDate.toLocaleDateString()
                  : "Not set"
              }
            />
            <Row
              label="Submitted"
              value={
                release.submittedAt
                  ? release.submittedAt.toLocaleString()
                  : "Not submitted"
              }
            />
            <Row
              label="Distribution ID"
              value={release.labelgridId ?? "Not synced yet"}
            />
          </dl>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Artwork</h2>
          {release.artworkUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={release.artworkUrl}
              alt=""
              className="mt-4 aspect-square w-40 rounded-lg object-cover"
            />
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Artwork upload will connect in the multi-step editor (sandbox file
              URLs).
            </p>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Tracks</h2>
        </div>
        <ul className="divide-y divide-border">
          {release.tracks.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 px-5 py-3.5 text-sm"
            >
              <span>
                <span className="mr-3 tabular-nums text-muted-foreground">
                  {String(t.trackNumber).padStart(2, "0")}
                </span>
                {t.title}
              </span>
              <span className="text-muted-foreground">
                {t.isrc ?? "ISRC pending"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {release.syncError ? (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
          <p className="font-semibold">Sync issue</p>
          <p className="mt-1">{release.syncError}</p>
        </section>
      ) : null}

      {release.artist ? (
        <Link
          href={`/dashboard/artists/${release.artist.id}`}
          className={cn(buttonVariants({ variant: "outline" }), "h-9 px-4")}
        >
          View artist
        </Link>
      ) : null}
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
