import Link from "next/link";
import type { ReleaseStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Release queue · Admin" };

type Props = {
  searchParams: Promise<{ status?: string; q?: string }>;
};

const FILTERS: { value: string; label: string }[] = [
  { value: "in_review", label: "In review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "error", label: "Sync error" },
  { value: "all", label: "All" },
];

export default async function AdminReleasesPage({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;
  const statusFilter = sp.status ?? "in_review";
  const q = (sp.q ?? "").trim();

  const where = {
    ...(statusFilter !== "all"
      ? { status: statusFilter as ReleaseStatus }
      : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { catalogNumber: { contains: q, mode: "insensitive" as const } },
            { user: { email: { contains: q, mode: "insensitive" as const } } },
            { user: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const releases = await prisma.release.findMany({
    where,
    orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      user: { select: { id: true, name: true, email: true } },
      artist: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Release queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Releases arrive as LabelGrid drafts. Approve submits them for
          LabelGrid review; reject returns notes to the user.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={
              f.value === "in_review"
                ? "/admin/releases?status=in_review"
                : `/admin/releases?status=${f.value}`
            }
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium",
              statusFilter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <form className="flex gap-2">
        <input type="hidden" name="status" value={statusFilter} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Search title, catalog, user…"
          className="h-10 w-full max-w-md rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-primary"
        />
        <button
          type="submit"
          className={cn(buttonVariants({ variant: "outline" }), "h-10 px-4")}
        >
          Search
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Release</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">User</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">
                Status
              </th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {releases.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  No releases match.
                </td>
              </tr>
            ) : (
              releases.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.catalogNumber}
                      {r.artist ? ` · ${r.artist.name}` : ""}
                    </p>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <p>{r.user.name}</p>
                    <p className="text-xs text-muted-foreground">{r.user.email}</p>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/releases/${r.id}`}
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "h-8 px-3 text-xs"
                      )}
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
