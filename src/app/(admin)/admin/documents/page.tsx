import Link from "next/link";
import { requirePermission } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { formatShortDate } from "@/lib/admin/format";
import { cn } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export const metadata = { title: "Rights & Documents · Admin" };

type Props = {
  searchParams: Promise<{ status?: string; kind?: string; q?: string; page?: string }>;
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
    : sp.status === "expired" || sp.status === "all" ? sp.status : "pending";
  const q = sp.q?.trim() ?? ""; const page = Math.max(1, Number(sp.page) || 1); const take = 50;
  const [{ now }] = await prisma.$queryRaw<Array<{ now: Date }>>`SELECT NOW() AS now`;
  const where: Prisma.ReleaseDocumentWhereInput = { ...(status === "expired" ? { expiresAt: { lt: now } } : status === "all" ? {} : { reviewStatus: status }), ...(sp.kind ? { kind: sp.kind } : {}), ...(q ? { OR: [{ filename: { contains: q, mode: "insensitive" } }, { release: { is: { OR: [{ title: { contains: q, mode: "insensitive" } }, { upc: { contains: q, mode: "insensitive" } }, { user: { is: { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } } }] } } }] } : {}) };

  const [docs, total, statusGroups, kindGroups, expired] = await Promise.all([prisma.releaseDocument.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * take, take,
    include: {
      release: {
        select: {
          id: true,
          title: true,
          artist: { select: { name: true } },
          user: { select: { name: true, email: true } }, upc: true,
        },
      },
      issue: { select: { title: true, category: true } },
    },
  }), prisma.releaseDocument.count({ where }), prisma.releaseDocument.groupBy({ by: ["reviewStatus"], _count: true }), prisma.releaseDocument.groupBy({ by: ["kind"], orderBy: { kind: "asc" } }), prisma.releaseDocument.count({ where: { expiresAt: { lt: now } } })]);
  const pages = Math.max(1, Math.ceil(total / take));

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

      <section className="grid border border-border bg-card sm:grid-cols-3 xl:grid-cols-5">{STATUSES.map((item) => <Link key={item} href={`/admin/documents?status=${item}`} className="border-b border-border p-4 sm:border-r xl:border-b-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{item.replaceAll("_", " ")}</p><p className="mt-2 text-2xl font-semibold">{statusGroups.find((group) => group.reviewStatus === item)?._count ?? 0}</p></Link>)}<Link href="/admin/documents?status=expired" className="border-b border-border p-4 sm:border-r xl:border-b-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Expired</p><p className="mt-2 text-2xl font-semibold text-red-700">{expired}</p></Link></section>

      <div className="flex flex-wrap gap-1.5">
        {[...STATUSES, "expired", "all"].map((s) => (
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

      <form className="grid gap-2 border border-border bg-card p-4 sm:grid-cols-[1fr_220px_auto]"><input type="hidden" name="status" value={status} /><input name="q" defaultValue={q} placeholder="Release, UPC, user or filename" className="h-10 border border-border bg-background px-3 text-sm" /><select name="kind" defaultValue={sp.kind ?? ""} className="h-10 border border-border bg-background px-3 text-xs"><option value="">All document types</option>{kindGroups.map((item) => <option key={item.kind} value={item.kind}>{item.kind}</option>)}</select><button className="h-10 bg-foreground px-4 text-xs font-semibold text-background">Apply filters</button></form>

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
                    <p>{d.release.user.name}</p><p className="text-[10px] text-muted-foreground">{d.release.user.email}</p>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {d.issue?.title ?? d.issue?.category ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {formatShortDate(d.createdAt)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Link
                      href={`/admin/documents/${d.id}`}
                      className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pages > 1 ? <nav className="flex justify-end gap-2 text-xs">{page > 1 ? <Link href={`/admin/documents?status=${status}&page=${page - 1}`} className="border border-border px-3 py-2 font-semibold">Previous</Link> : null}{page < pages ? <Link href={`/admin/documents?status=${status}&page=${page + 1}`} className="border border-border px-3 py-2 font-semibold">Next</Link> : null}</nav> : null}
    </div>
  );
}
