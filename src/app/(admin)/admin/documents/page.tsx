import Link from "next/link";
import { requirePermission } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { formatShortDate } from "@/lib/admin/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Rights & Documents · Admin" };

type Props = {
  searchParams: Promise<{ status?: string; kind?: string }>;
};

const STATUSES = [
  "pending",
  "approved",
  "rejected",
  "replacement_requested",
] as const;

export default async function AdminDocumentsPage({ searchParams }: Props) {
  await requirePermission("documents.manage");
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as (typeof STATUSES)[number])
    ? (sp.status as (typeof STATUSES)[number])
    : "pending";

  const docs = await prisma.releaseDocument.findMany({
    where: { reviewStatus: status },
    orderBy: { createdAt: "desc" },
    take: 80,
    include: {
      release: {
        select: {
          id: true,
          title: true,
          artist: { select: { name: true } },
          user: { select: { email: true } },
        },
      },
      issue: { select: { title: true, category: true } },
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Rights & Documents
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Global queue — open a document to review it on the release page.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/documents?status=${s}`}
            className={cn(
              "rounded-sm px-2.5 py-1 text-[11px] font-medium capitalize",
              status === s
                ? "bg-foreground text-background"
                : "border border-border bg-card text-muted-foreground"
            )}
          >
            {s.replace("_", " ")}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Release</th>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Issue</th>
              <th className="px-3 py-2">Uploaded</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {docs.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-10 text-center text-muted-foreground"
                >
                  No documents in this view.
                </td>
              </tr>
            ) : (
              docs.map((d) => (
                <tr key={d.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2.5 font-medium">{d.kind}</td>
                  <td className="px-3 py-2.5">
                    <p>{d.release.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.release.artist?.name ?? "—"}
                    </p>
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {d.release.user.email}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {d.issue?.title ?? d.issue?.category ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {formatShortDate(d.createdAt)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Link
                      href={`/admin/releases/${d.releaseId}`}
                      className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                    >
                      Open release
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
