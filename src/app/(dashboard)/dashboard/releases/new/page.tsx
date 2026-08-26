import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { NewReleaseForm } from "@/components/dashboard/new-release-form";

export const metadata = { title: "New release" };

type Props = { searchParams: Promise<{ artistId?: string }> };

export default async function NewReleasePage({ searchParams }: Props) {
  const user = await requireUser();
  const sp = await searchParams;
  const artists = await prisma.artist.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link
          href="/dashboard/releases"
          className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Releases
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">New release</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Saved as a local draft. Submission for review comes after you finish
          metadata — drafts do not use your monthly submit allowance.
        </p>
      </div>

      {artists.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 text-sm">
          <p className="font-semibold">Add an artist first</p>
          <p className="mt-2 text-muted-foreground">
            Releases must belong to an artist on your account.
          </p>
          <Link
            href="/dashboard/artists"
            className="mt-4 inline-flex font-semibold text-primary underline-offset-4 hover:underline"
          >
            Go to artists
          </Link>
        </div>
      ) : (
        <NewReleaseForm
          artists={artists.map((a) => ({ id: a.id, name: a.name }))}
          defaultArtistId={sp.artistId}
        />
      )}
    </div>
  );
}
