import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getUserUsage } from "@/lib/entitlements/server";
import { prisma } from "@/lib/db";
import { formatLimit } from "@/lib/plans";
import { ReleaseSubmitForm } from "@/components/dashboard/release-submit-form";

export const metadata = { title: "Submit release" };

type Props = { searchParams: Promise<{ artistId?: string }> };

export default async function NewReleasePage({ searchParams }: Props) {
  const user = await requireUser();
  const sp = await searchParams;
  const [artists, usage] = await Promise.all([
    prisma.artist.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
    }),
    getUserUsage(user.id, user.planId),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/dashboard/releases"
          className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Releases
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          Submit a release
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Fields follow LabelGrid ReleaseCreateData + TrackCreateData. Submitting
          uploads a LabelGrid draft and queues RDISTRO admin review
          {usage.releasesLimit === null
            ? " (unlimited on your plan)"
            : ` (${usage.releasesThisMonth}/${formatLimit(usage.releasesLimit)} used this month)`}
          . The selected artist locks after submit.
        </p>
      </div>

      {!usage.canCreateRelease ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
          <p className="font-semibold">Monthly submission limit reached</p>
          <p className="mt-1">
            Upgrade your plan to submit more releases this month.{" "}
            <Link
              href="/dashboard/subscription"
              className="font-semibold underline-offset-4 hover:underline"
            >
              View subscription
            </Link>
          </p>
        </div>
      ) : artists.length === 0 ? (
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
        <ReleaseSubmitForm
          artists={artists.map((a) => ({
            id: a.id,
            name: a.name,
            locked: a.locked,
          }))}
          defaultArtistId={sp.artistId}
        />
      )}
    </div>
  );
}
