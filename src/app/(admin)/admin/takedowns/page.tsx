import Link from "next/link";
import { requirePermission } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { formatShortDate } from "@/lib/admin/format";
import { AdminStatusBadge } from "@/components/admin/status-badges";
import { TakedownForm } from "@/components/admin/takedown-form";

export const metadata = { title: "Takedowns · Admin" };

export default async function AdminTakedownsPage() {
  await requirePermission("releases.takedown");

  const [requests, liveReleases] = await Promise.all([
    prisma.takedownRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        release: {
          select: { id: true, title: true, status: true },
        },
        requestedBy: { select: { name: true } },
      },
    }),
    prisma.release.findMany({
      where: {
        status: { in: ["live", "delivering", "labelgrid_approved"] },
        labelgridId: { not: null },
      },
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: {
        id: true,
        title: true,
        status: true,
        artist: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Takedowns</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          LabelGrid supports managed takedown via{" "}
          <code className="text-xs">POST /releases/&#123;id&#125;/takedown-all</code>{" "}
          only (all eligible outlets). Per-store takedown is not in the API.
        </p>
      </div>

      <section className="rounded-md border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Request takedown</h2>
        <TakedownForm
          releases={liveReleases.map((r) => ({
            id: r.id,
            label: `${r.title} · ${r.artist?.name ?? "—"}`,
          }))}
        />
      </section>

      <section className="rounded-md border border-border bg-card">
        <div className="border-b border-border px-4 py-2.5">
          <h2 className="text-sm font-semibold">Recent requests</h2>
        </div>
        <ul className="divide-y divide-border">
          {requests.length === 0 ? (
            <li className="px-4 py-8 text-sm text-muted-foreground">
              No takedown requests yet.
            </li>
          ) : (
            requests.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div>
                  <Link
                    href={`/admin/releases/${t.releaseId}`}
                    className="font-medium hover:underline"
                  >
                    {t.release.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {t.reason.replace("_", " ")} · {t.status} ·{" "}
                    {formatShortDate(t.createdAt)}
                    {t.requestedBy ? ` · ${t.requestedBy.name}` : ""}
                  </p>
                </div>
                <AdminStatusBadge status={t.release.status} />
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
