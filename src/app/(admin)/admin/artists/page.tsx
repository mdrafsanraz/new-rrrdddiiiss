import Link from "next/link";
import { requirePermission } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { formatShortDate } from "@/lib/admin/format";
import { getPlanCatalog, planLabel } from "@/lib/plans";

export const metadata = { title: "Artists | Admin" };
type Props = { searchParams: Promise<{ q?: string; state?: string; page?: string }> };

export default async function AdminArtistsPage({ searchParams }: Props) {
  await requirePermission("artists.read");
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const state = sp.state === "locked" || sp.state === "editable" ? sp.state : "all";
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const pageSize = 50;
  const where = {
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { fullName: { contains: q, mode: "insensitive" as const } }, { email: { contains: q, mode: "insensitive" as const } }, { labelgridId: { contains: q, mode: "insensitive" as const } }, { user: { name: { contains: q, mode: "insensitive" as const } } }, { user: { email: { contains: q, mode: "insensitive" as const } } }] } : {}),
    ...(state === "all" ? {} : { locked: state === "locked" }),
  };
  const [total, artists, planCatalog] = await Promise.all([
    prisma.artist.count({ where }),
    prisma.artist.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, include: {
      user: { select: { id: true, name: true, email: true, planId: true, _count: { select: { artists: true } } } },
      releases: { select: { status: true, _count: { select: { tracks: true } } } },
    } }),
    getPlanCatalog(),
  ]);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const query = new URLSearchParams({ ...(q ? { q } : {}), ...(state !== "all" ? { state } : {}) });
  const pageHref = (value: number) => `/admin/artists?${new URLSearchParams({ ...Object.fromEntries(query), ...(value > 1 ? { page: String(value) } : {}) })}`;

  return <div className="space-y-5">
    <header className="border-b border-border pb-5"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Catalog ownership</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Artists</h1><p className="mt-1 text-sm text-muted-foreground">Find artist entities, verify account ownership, and inspect their catalog footprint.</p></header>
    <section className="border border-border bg-card p-4"><form className="flex flex-col gap-2 sm:flex-row"><input name="q" defaultValue={q} placeholder="Artist, legal name, email, owner or LabelGrid ID" aria-label="Search artists" className="h-10 flex-1 border border-border bg-background px-3 text-sm outline-none focus:border-foreground/40" /><select name="state" defaultValue={state} aria-label="Artist state" className="h-10 border border-border bg-background px-3 text-xs"><option value="all">Any state</option><option value="locked">Name protected</option><option value="editable">Editable</option></select><button className="h-10 bg-foreground px-5 text-xs font-semibold text-background">Apply filters</button>{q || state !== "all" ? <Link href="/admin/artists" className="h-10 border border-border px-4 py-3 text-center text-xs font-semibold">Clear</Link> : null}</form></section>
    <div className="flex justify-between border-y border-border py-2 text-xs"><p><span className="font-semibold">{total.toLocaleString()}</span> <span className="text-muted-foreground">matching artists</span></p><p className="text-muted-foreground">Page {page} of {pages}</p></div>
    <section className="overflow-hidden border border-border bg-card"><div className="overflow-x-auto"><table className="w-full min-w-[1060px] text-left text-sm"><thead className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-[0.12em] text-muted-foreground"><tr><th className="px-4 py-3">Artist</th><th className="px-3 py-3">Owner</th><th className="px-3 py-3">Plan capacity</th><th className="px-3 py-3">Catalog</th><th className="px-3 py-3">Provider identity</th><th className="px-3 py-3">Created</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-border">
      {!artists.length ? <tr><td colSpan={7} className="px-4 py-16 text-center"><p className="font-medium">No artists match these filters</p><p className="mt-1 text-xs text-muted-foreground">Try another artist, owner, email, or provider identifier.</p></td></tr> : artists.map((artist) => {
        const tracks = artist.releases.reduce((sum, release) => sum + release._count.tracks, 0);
        const live = artist.releases.filter((release) => release.status === "live").length;
        const limit = planCatalog.find((plan) => plan.id === artist.user.planId)?.artists ?? 0;
        return <tr key={artist.id} className="align-top hover:bg-muted/25"><td className="px-4 py-3"><Link href={`/admin/artists/${artist.id}`} className="font-semibold hover:underline">{artist.name}</Link><p className="mt-1 text-[10px] text-muted-foreground">{artist.locked ? "Name protected" : "Editable"}{artist.location ? ` / ${artist.location}` : ""}</p></td><td className="px-3 py-3"><Link href={`/admin/users/${artist.user.id}`} className="block max-w-48 truncate text-xs font-medium hover:underline">{artist.user.name}</Link><p className="max-w-48 truncate text-[10px] text-muted-foreground">{artist.user.email}</p></td><td className="px-3 py-3 text-xs"><p className="font-medium">{planLabel(artist.user.planId)}</p><p className="mt-1 text-[10px] text-muted-foreground">{artist.user._count.artists} of {limit ?? "Unlimited"} artists</p></td><td className="px-3 py-3 text-xs"><p>{artist.releases.length} releases / {tracks} tracks</p><p className="mt-1 text-[10px] text-muted-foreground">{live} live releases</p></td><td className="px-3 py-3 text-xs"><p className="font-mono text-[10px]">{artist.labelgridId ? `LG ${artist.labelgridId}` : "Not synced"}</p><p className="mt-1 text-[10px] text-muted-foreground">{artist.labelgridId ? "Profiles sourced from LabelGrid" : "Local draft identity"}</p></td><td className="px-3 py-3 text-xs text-muted-foreground">{formatShortDate(artist.createdAt)}</td><td className="px-4 py-3 text-right"><Link href={`/admin/artists/${artist.id}`} className="inline-flex h-8 items-center border border-border px-3 text-[11px] font-semibold hover:border-foreground hover:bg-foreground hover:text-background">View artist</Link></td></tr>;
      })}
    </tbody></table></div></section>
    {pages > 1 ? <nav className="flex justify-end gap-2 text-xs" aria-label="Artist pagination">{page > 1 ? <Link href={pageHref(page - 1)} className="border border-border px-3 py-2 font-semibold">Previous</Link> : null}{page < pages ? <Link href={pageHref(page + 1)} className="border border-border px-3 py-2 font-semibold">Next</Link> : null}</nav> : null}
  </div>;
}
