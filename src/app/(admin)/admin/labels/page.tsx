import Link from "next/link";
import { formatShortDate } from "@/lib/admin/format";
import { requirePermission } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { listLabels } from "@/lib/labelgrid";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import type { LabelData } from "@/lib/labelgrid/types";

export const metadata = { title: "Labels | Admin" };
type Props = { searchParams: Promise<{ q?: string; page?: string }> };

export default async function AdminLabelsPage({ searchParams }: Props) {
  await requirePermission("releases.read");
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const pageSize = 50;
  const where = q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { labelgridId: { contains: q, mode: "insensitive" as const } }, { user: { name: { contains: q, mode: "insensitive" as const } } }, { user: { email: { contains: q, mode: "insensitive" as const } } }] } : {};
  const [total, labels] = await Promise.all([
    prisma.label.count({ where }),
    prisma.label.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, include: {
      user: { select: { id: true, name: true, email: true } },
      releases: { select: { status: true, artistId: true, _count: { select: { tracks: true } } } },
    } }),
  ]);
  let providerLabels = new Map<string, LabelData>();
  let providerUnavailable = false;
  if (isLabelGridLive()) {
    try {
      const response = await listLabels(1, 100);
      providerLabels = new Map(response.data.map((label) => [String(label.id), label]));
    } catch (error) {
      providerUnavailable = true;
      console.error("[admin/labels] LabelGrid fetch failed", error);
    }
  }
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (value: number) => `/admin/labels?${new URLSearchParams({ ...(q ? { q } : {}), ...(value > 1 ? { page: String(value) } : {}) })}`;

  return <div className="space-y-5">
    <header className="border-b border-border pb-5"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Catalog entities</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Labels</h1><p className="mt-1 text-sm text-muted-foreground">Inspect label ownership, mapped LabelGrid identity, and catalog size.</p></header>
    {providerUnavailable ? <div className="border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">LabelGrid label status is temporarily unavailable. Local ownership and catalog counts remain visible.</div> : null}
    <section className="border border-border bg-card p-4"><form className="flex gap-2"><input name="q" defaultValue={q} placeholder="Label, owner, email or LabelGrid ID" aria-label="Search labels" className="h-10 flex-1 border border-border bg-background px-3 text-sm outline-none focus:border-foreground/40" /><button className="h-10 bg-foreground px-5 text-xs font-semibold text-background">Search</button>{q ? <Link href="/admin/labels" className="h-10 border border-border px-4 py-3 text-xs font-semibold">Clear</Link> : null}</form></section>
    <div className="flex justify-between border-y border-border py-2 text-xs"><p><span className="font-semibold">{total.toLocaleString()}</span> <span className="text-muted-foreground">matching labels</span></p><p className="text-muted-foreground">Page {page} of {pages}</p></div>
    <section className="overflow-hidden border border-border bg-card"><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-[0.12em] text-muted-foreground"><tr><th className="px-4 py-3">Label</th><th className="px-3 py-3">Owner</th><th className="px-3 py-3">LabelGrid</th><th className="px-3 py-3">Catalog size</th><th className="px-3 py-3">Capabilities</th><th className="px-3 py-3">Created</th></tr></thead><tbody className="divide-y divide-border">
      {!labels.length ? <tr><td colSpan={6} className="px-4 py-16 text-center"><p className="font-medium">No labels match this search</p></td></tr> : labels.map((label) => {
        const provider = label.labelgridId ? providerLabels.get(label.labelgridId) : undefined;
        const tracks = label.releases.reduce((sum, release) => sum + release._count.tracks, 0);
        const artists = new Set(label.releases.map((release) => release.artistId).filter(Boolean)).size;
        return <tr key={label.id} className="align-top hover:bg-muted/25"><td className="px-4 py-3"><p className="font-semibold">{provider?.name ?? label.name}</p><p className="mt-1 font-mono text-[10px] text-muted-foreground">{label.id}</p></td><td className="px-3 py-3"><Link href={`/admin/users/${label.user.id}`} className="block max-w-48 truncate text-xs font-medium hover:underline">{label.user.name}</Link><p className="max-w-48 truncate text-[10px] text-muted-foreground">{label.user.email}</p></td><td className="px-3 py-3 text-xs"><p className="font-mono text-[10px]">{label.labelgridId ?? "Not mapped"}</p><p className={`mt-1 text-[10px] font-semibold ${provider?.active ? "text-emerald-800" : "text-muted-foreground"}`}>{provider ? (provider.active ? "Active" : "Inactive") : label.labelgridId ? "Not returned in first 100 provider labels" : "Local entity"}</p></td><td className="px-3 py-3 text-xs"><p>{label.releases.length} releases / {tracks} tracks</p><p className="mt-1 text-[10px] text-muted-foreground">{artists} associated artists</p></td><td className="px-3 py-3 text-[10px]"><p>Beatport: {provider?.beatport_enabled ? "Enabled" : "Not enabled"}</p><p>YouTube Music: {provider?.youtubemusic_enabled ? "Enabled" : "Not enabled"}</p><p className="mt-1 text-muted-foreground">Analytics: {provider?.analytics_readiness ?? "Not available"}</p></td><td className="px-3 py-3 text-xs text-muted-foreground">{formatShortDate(label.createdAt)}</td></tr>;
      })}
    </tbody></table></div></section>
    {pages > 1 ? <nav aria-label="Label pagination" className="flex justify-end gap-2 text-xs">{page > 1 ? <Link href={href(page - 1)} className="border border-border px-3 py-2 font-semibold">Previous</Link> : null}{page < pages ? <Link href={href(page + 1)} className="border border-border px-3 py-2 font-semibold">Next</Link> : null}</nav> : null}
    <p className="text-[11px] text-muted-foreground">LabelGrid fields follow LabelData in document.json. RDISTRO does not create one LabelGrid label per signup under the current business rule.</p>
  </div>;
}
