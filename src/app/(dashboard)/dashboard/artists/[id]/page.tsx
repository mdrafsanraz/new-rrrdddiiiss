import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EditArtistForm } from "@/components/dashboard/edit-artist-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return { title: `Artist ${id.slice(0, 6)}` };
}

export default async function ArtistDetailPage({ params }: Props) {
  const user = await requireUser();
  const { id } = await params;
  const artist = await prisma.artist.findFirst({
    where: { id, userId: user.id },
    include: {
      releases: { orderBy: { updatedAt: "desc" } },
    },
  });
  if (!artist) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard/artists"
          className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Artists
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
          {artist.name}
        </h1>
        {artist.bioShort ? (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {artist.bioShort}
          </p>
        ) : null}
      </div>

      <EditArtistForm
        artist={{
          id: artist.id,
          name: artist.name,
          fullName: artist.fullName ?? "",
          email: artist.email ?? "",
          location: artist.location ?? "",
          bioShort: artist.bioShort ?? "",
        }}
      />

      <section className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Releases</h2>
          <Link
            href={`/dashboard/releases/new?artistId=${artist.id}`}
            className={cn(buttonVariants({ variant: "outline" }), "h-8 px-3 text-xs")}
          >
            New release
          </Link>
        </div>
        {artist.releases.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">
            No releases for this artist yet.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {artist.releases.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/dashboard/releases/${r.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-muted/50"
                >
                  <span className="font-medium">{r.title}</span>
                  <StatusBadge status={r.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
