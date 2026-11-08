import Link from "next/link";
import { AdminStatusBadge, QcBadge } from "@/components/admin/status-badges";
import { ProviderArtwork } from "@/components/admin/provider-artwork";
import { ReleaseListFilters, releaseListHref as href, type ReleaseListSearch as Search } from "@/components/admin/release-list-filters";
import { adminReleaseWhere, ADMIN_RELEASE_FILTERS, type AdminReleaseFilter } from "@/lib/admin/release-filters";
import { formatShortDate } from "@/lib/admin/format";
import { requirePermission } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { listReleases } from "@/lib/labelgrid";
import { deliveryStateLabel } from "@/lib/labelgrid/state-labels";
import type { ReleaseData } from "@/lib/labelgrid/types";
import { cn } from "@/lib/utils";

export const metadata = { title: "Release operations | Admin" };

type Props = { searchParams: Promise<Search> };

const clean = (value?: string) => value?.trim() || undefined;
function parseDate(value?: string, end = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T${end ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function AdminReleasesPage({ searchParams }: Props) {
  await requirePermission("releases.read");
  const sp = await searchParams;
  const filter = (ADMIN_RELEASE_FILTERS.some((item) => item.value === sp.filter) ? sp.filter : "pending_review") as AdminReleaseFilter;
  const q = clean(sp.q);
  const requestedPage = Number(sp.page ?? "1");
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const source = sp.source === "labelgrid" ? "labelgrid" : "rdistro";
  if (source === "labelgrid") return <LabelGridCatalogPage page={page} search={sp} />;
  const pageSize = 40;
  const qc = sp.qc === "yes" || sp.qc === "no" ? sp.qc : undefined;
  const docs = sp.docs === "yes" || sp.docs === "no" ? sp.docs : undefined;
  const where = adminReleaseWhere(filter, q, {
    user: clean(sp.user), artist: clean(sp.artist), label: clean(sp.label), upc: clean(sp.upc), isrc: clean(sp.isrc),
    dateFrom: parseDate(sp.dateFrom), dateTo: parseDate(sp.dateTo, true), dspStatus: clean(sp.dspStatus), qc, docs,
  });
  const [total, releases, overview] = await Promise.all([
    prisma.release.count({ where }),
    prisma.release.findMany({
      where,
      orderBy: [{ priorityReview: "desc" }, { submittedAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { id: true, name: true, email: true } },
        artist: { select: { name: true } }, label: { select: { name: true } }, reviewedBy: { select: { name: true } },
        documents: { where: { reviewStatus: "pending" }, select: { id: true } },
        reviewIssues: { where: { resolved: false }, select: { id: true, isBlocking: true } },
        _count: { select: { tracks: true } },
      },
    }),
    Promise.all((["all", "pending_review", "preflight", "action_required"] as const).map((value) => prisma.release.count({ where: adminReleaseWhere(value) }))),
  ]);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = releases.length ? (page - 1) * pageSize + 1 : 0;
  const last = releases.length ? Math.min(page * pageSize, total) : 0;
  const advancedCount = [sp.user, sp.artist, sp.label, sp.upc, sp.isrc, sp.dateFrom, sp.dateTo, sp.dspStatus, qc, docs].filter(Boolean).length;

  return <div className="space-y-5">
    <CatalogHeader source="rdistro" />

    <SourceNav active="rdistro" />

    <div className="space-y-2"><p className="text-[11px] text-muted-foreground">RDISTRO workflow totals · across all users, before filters</p>
    <section aria-label="RDISTRO workflow overview" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {([
        { value: "all", label: "All releases", detail: "Every release in the user workflow" },
        { value: "pending_review", label: "Internal review", detail: "Review and send to LabelGrid" },
        { value: "preflight", label: "Preflight confirmation", detail: "Check QC, then confirm into review" },
        { value: "action_required", label: "Needs attention", detail: "QC, changes, documents or sync issues" },
      ] as const).map((item, index) => <Link key={item.value} href={href({ source: "rdistro" }, { filter: item.value })} aria-current={filter === item.value ? "page" : undefined} className={cn("rounded-xl border p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", filter === item.value ? "border-primary bg-primary/5" : "border-border bg-card hover:border-foreground/30")}><p className="text-xs font-medium text-muted-foreground">{item.label}</p><p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{overview[index].toLocaleString()}</p><p className="mt-1 text-[11px] text-muted-foreground">{item.detail}</p></Link>)}
    </section>

    </div>

    <ReleaseListFilters key={JSON.stringify(sp)} search={sp} filter={filter} />

    <div className="flex flex-wrap items-center justify-between gap-2 border-y border-border py-2 text-xs">
      <p><span className="font-semibold tabular-nums">{total.toLocaleString()}</span> <span className="text-muted-foreground">matching releases</span>{advancedCount ? <span className="ml-2 border-l border-border pl-2 text-muted-foreground">{advancedCount} advanced filter{advancedCount === 1 ? "" : "s"}</span> : null}</p>
      <p className="text-muted-foreground">Showing {first.toLocaleString()} to {last.toLocaleString()}</p>
    </div>

    <section aria-label="Release results" className="overflow-hidden rounded-xl border border-border bg-card"><div className="overflow-x-auto">
      <table className="w-full min-w-[1180px] text-left text-sm">
        <thead className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-[0.12em] text-muted-foreground"><tr><th className="w-[30%] px-4 py-3 font-semibold">Release</th><th className="px-3 py-3 font-semibold">Owner</th><th className="px-3 py-3 font-semibold">Catalog</th><th className="px-3 py-3 font-semibold">Schedule</th><th className="px-3 py-3 font-semibold">Review health</th><th className="px-3 py-3 font-semibold">DSP delivery</th><th className="px-4 py-3 text-right font-semibold">Action</th></tr></thead>
        <tbody className="divide-y divide-border">
          {!releases.length ? <tr><td colSpan={7} className="px-4 py-16 text-center"><p className="font-medium">No releases match this view</p><p className="mt-1 text-xs text-muted-foreground">Clear a filter or search with a different catalog identifier.</p></td></tr> : releases.map((release) => {
            const blocking = release.reviewIssues.filter((issue) => issue.isBlocking).length;
            return <tr key={release.id} className="group align-top transition-colors hover:bg-muted/25">
              <td className="px-4 py-3"><div className="flex items-center gap-3">
                {release.labelgridId ? <ProviderArtwork releaseId={release.id} className="size-12 shrink-0 rounded-md object-cover" /> : <div className="grid size-12 shrink-0 place-items-center rounded-md border border-border bg-muted text-[9px] font-semibold text-muted-foreground">NO ART</div>}
                <div className="min-w-0"><Link href={`/admin/releases/${release.id}`} className="block max-w-72 truncate font-semibold underline-offset-4 group-hover:underline">{release.title}</Link><p className="mt-0.5 truncate text-xs text-muted-foreground">{release.artist?.name ?? "Artist not set"} / {release.contentType} / {release._count.tracks} track{release._count.tracks === 1 ? "" : "s"}</p><div className="mt-1 flex flex-wrap gap-1">{release.priorityReview ? <span className="bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-900">Priority</span> : null}{release.label?.name ? <span className="border border-border px-1.5 py-0.5 text-[9px] text-muted-foreground">{release.label.name}</span> : null}</div></div>
              </div></td>
              <td className="px-3 py-3"><Link href={`/admin/users/${release.user.id}`} className="block max-w-44 truncate text-xs font-medium hover:underline">{release.user.name}</Link><p className="mt-0.5 max-w-44 truncate text-[10px] text-muted-foreground">{release.user.email}</p></td>
              <td className="px-3 py-3 text-[10px] leading-5"><p><span className="text-muted-foreground">UPC</span> {release.upc || "Not assigned"}</p><p className="max-w-40 truncate"><span className="text-muted-foreground">RD</span> {release.catalogNumber || release.id}</p>{release.labelgridId ? <p className="max-w-40 truncate"><span className="text-muted-foreground">LG</span> {release.labelgridId}</p> : null}</td>
              <td className="px-3 py-3 text-[10px] leading-5"><p><span className="text-muted-foreground">Release</span> {formatShortDate(release.releaseDate)}</p><p><span className="text-muted-foreground">Submitted</span> {formatShortDate(release.submittedAt)}</p>{release.reviewedBy?.name ? <p className="max-w-36 truncate"><span className="text-muted-foreground">Reviewer</span> {release.reviewedBy.name}</p> : null}</td>
              <td className="px-3 py-3"><div className="flex flex-wrap items-center gap-1.5"><AdminStatusBadge status={release.status} /><span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">QC <QcBadge status={release.qcStatus} /></span></div><div className="mt-2 flex flex-wrap gap-1 text-[9px] font-semibold uppercase tracking-wide">{blocking ? <span className="bg-red-100 px-1.5 py-0.5 text-red-900">{blocking} blocking</span> : null}{release.documents.length ? <span className="bg-amber-100 px-1.5 py-0.5 text-amber-900">{release.documents.length} docs pending</span> : null}{release.reviewIssues.length > blocking ? <span className="bg-muted px-1.5 py-0.5 text-muted-foreground">{release.reviewIssues.length - blocking} other issues</span> : null}</div></td>
              <td className="px-3 py-3 text-xs"><p className="font-medium">{deliveryStateLabel(release.deliveryState)}</p><p className="mt-1 max-w-40 truncate text-[10px] text-muted-foreground">LabelGrid: {release.labelgridReviewStatus || (release.labelgridId ? "Created" : "Not created")}</p></td>
              <td className="px-4 py-3 text-right"><Link href={`/admin/releases/${release.id}`} className="inline-flex h-8 items-center border border-border px-3 text-[11px] font-semibold transition-colors hover:border-foreground hover:bg-foreground hover:text-background">{release.status === "labelgrid_preflight" ? "Review QC" : ["pending_internal_review", "submitted", "in_review"].includes(release.status) ? "Review" : "View"}</Link></td>
            </tr>;
          })}
        </tbody>
      </table>
    </div></section>

    {pages > 1 ? <nav aria-label="Release pagination" className="flex items-center justify-between border-t border-border pt-4 text-xs"><p className="text-muted-foreground">Page {page.toLocaleString()} of {pages.toLocaleString()}</p><div className="flex gap-2">{page > 1 ? <Link href={href(sp, { filter, page: page - 1 })} className="border border-border px-3 py-2 font-semibold hover:border-foreground">Previous</Link> : null}{page < pages ? <Link href={href(sp, { filter, page: page + 1 })} className="border border-border px-3 py-2 font-semibold hover:border-foreground">Next</Link> : null}</div></nav> : null}
  </div>;
}

async function LabelGridCatalogPage({ page, search }: { page: number; search: Search }) {
  let response;
  const filters = { upc: clean(search.upc), catalogNumber: clean(search.cat), liveOnly: search.live === "1" };
  try { response = await listReleases(page, 50, filters); }
  catch (error) {
    console.error("[admin/releases] LabelGrid catalog fetch failed", error);
    return <div className="space-y-5"><CatalogHeader /><SourceNav active="labelgrid" /><section className="border border-amber-300 bg-amber-50 p-6"><h2 className="font-semibold text-amber-950">LabelGrid catalog unavailable</h2><p className="mt-2 text-sm text-amber-900">The provider did not return the release catalog. No local data is substituted into this view.</p><Link href="/admin/releases?source=rdistro" className="mt-4 inline-flex h-9 items-center border border-amber-400 px-4 text-xs font-semibold text-amber-950">Open RDISTRO workflow</Link></section></div>;
  }
  const rows = response.data ?? [];
  const ids = rows.map((release) => String(release.id));
  const mappings = ids.length ? await prisma.release.findMany({ where: { labelgridId: { in: ids } }, select: { id: true, labelgridId: true, title: true, user: { select: { name: true, email: true } } } }) : [];
  const mappingByProviderId = new Map(mappings.map((mapping) => [mapping.labelgridId, mapping]));
  const total = response.meta?.total ?? rows.length;
  const pages = response.meta?.last_page ?? 1;
  const from = rows.length ? (page - 1) * (response.meta?.per_page ?? 50) + 1 : 0;
  const to = rows.length ? Math.min(total, from + rows.length - 1) : 0;

  return <div className="space-y-5"><CatalogHeader /><SourceNav active="labelgrid" /><section aria-label="LabelGrid catalog overview" className="grid overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-3"><Metric label="Matching provider releases" value={total.toLocaleString()} /><Metric label="Mapped on this page" value={mappings.length.toLocaleString()} /><Metric label="Unmapped on this page" value={(rows.length - mappings.length).toLocaleString()} alert={rows.length > mappings.length} /></section><ProviderCatalogFilters search={search} /><div className="flex flex-wrap items-center justify-between gap-3 border-y border-border py-3 text-xs"><p><span className="font-semibold">{total.toLocaleString()}</span> <span className="text-muted-foreground">releases returned by LabelGrid</span></p><Link href="/admin/releases?source=rdistro&filter=all" className="font-semibold text-primary hover:underline">Search and filter user releases</Link><p className="text-muted-foreground">Showing {from.toLocaleString()} to {to.toLocaleString()}</p></div><section aria-label="Release results" className="overflow-hidden rounded-xl border border-border bg-card"><div className="overflow-x-auto"><table className="w-full min-w-[1040px] text-left text-sm"><thead className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">Release</th><th className="px-3 py-3">Provider catalog</th><th className="px-3 py-3">Review</th><th className="px-3 py-3">RDISTRO mapping</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-border">{!rows.length ? <tr><td colSpan={5} className="px-4 py-16 text-center text-sm text-muted-foreground">No releases returned for this page.</td></tr> : null}{rows.map((release) => { const mapping = mappingByProviderId.get(String(release.id)); return <tr key={release.id} className="align-top hover:bg-muted/25"><td className="px-4 py-3"><div className="flex gap-3"><ProviderArtwork labelgridId={release.id} className="size-12 shrink-0 rounded-md object-cover" /><div className="min-w-0"><p className="max-w-72 truncate font-semibold">{providerTitle(release)}</p><p className="mt-1 max-w-72 truncate text-xs text-muted-foreground">{providerArtists(release)}</p></div></div></td><td className="px-3 py-3 text-xs"><p>LG {release.id}</p><p className="mt-1 text-[10px] text-muted-foreground">UPC {release.barcode_number ?? "Not assigned"}</p><p className="text-[10px] text-muted-foreground">CAT {release.cat ?? "Not assigned"}</p></td><td className="px-3 py-3 text-xs"><p className="font-semibold capitalize">{release.review_status?.replaceAll("_", " ") ?? "Not supplied"}</p><p className="mt-1 text-[10px] text-muted-foreground">Release {release.release_date ?? "not scheduled"}</p></td><td className="px-3 py-3">{mapping ? <><Link href={`/admin/releases/${mapping.id}`} className="text-xs font-semibold hover:underline">{mapping.title}</Link><p className="mt-1 text-[10px] text-muted-foreground">{mapping.user.name} / {mapping.user.email}</p></> : <span className="bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-900">Unmapped</span>}</td><td className="px-4 py-3 text-right"><Link href={mapping ? `/admin/releases/${mapping.id}` : `/admin/releases/labelgrid/${release.id}`} className="inline-flex h-8 items-center border border-border px-3 text-[11px] font-semibold hover:border-foreground hover:bg-foreground hover:text-background">{mapping ? "View release" : "View and map"}</Link></td></tr>; })}</tbody></table></div></section>{pages > 1 ? <nav className="flex items-center justify-between border-t border-border pt-4 text-xs"><p className="text-muted-foreground">Page {page} of {pages}</p><div className="flex gap-2">{page > 1 ? <Link href={href({ source: "labelgrid", upc: filters.upc, cat: filters.catalogNumber, live: filters.liveOnly ? "1" : undefined }, { page: page - 1 })} className="border border-border px-3 py-2 font-semibold">Previous</Link> : null}{page < pages ? <Link href={href({ source: "labelgrid", upc: filters.upc, cat: filters.catalogNumber, live: filters.liveOnly ? "1" : undefined }, { page: page + 1 })} className="border border-border px-3 py-2 font-semibold">Next</Link> : null}</div></nav> : null}</div>;
}

function ProviderCatalogFilters({ search }: { search: Search }) {
  const inputClass = "mt-2 h-10 w-full min-w-0 border border-border bg-background px-3 text-sm font-normal focus-visible:outline-2 focus-visible:outline-ring";
  return <section aria-label="Filter LabelGrid catalog" className="border border-border bg-card p-4 sm:p-5">
    <form action="/admin/releases" className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_200px_auto]">
      <input type="hidden" name="source" value="labelgrid" />
      <label className="min-w-0 text-xs font-semibold">UPC<input name="upc" defaultValue={search.upc} placeholder="Exact barcode number" className={inputClass} /></label>
      <label className="min-w-0 text-xs font-semibold">Catalog number<input name="cat" defaultValue={search.cat} placeholder="Exact catalog number" className={inputClass} /></label>
      <label className="text-xs font-semibold">Distribution<select name="live" defaultValue={search.live === "1" ? "1" : ""} className={inputClass}><option value="">All releases</option><option value="1">Distributed only</option></select></label>
      <button type="submit" className="h-10 bg-foreground px-5 text-xs font-semibold text-background hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Apply filters</button>
    </form>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground"><p>UPC and catalog filters match exactly across the full provider catalog.</p>{search.upc || search.cat || search.live === "1" ? <Link href="/admin/releases?source=labelgrid" className="font-semibold hover:text-foreground hover:underline">Clear filters</Link> : null}</div>
  </section>;
}
function CatalogHeader({ source = "labelgrid" }: { source?: "rdistro" | "labelgrid" }) {
  return <header className="flex flex-wrap items-end justify-between gap-4 pb-1">
    <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Catalog operations</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Releases</h1><p className="mt-1 max-w-xl text-sm text-muted-foreground">{source === "rdistro" ? "Find a release, check its progress, and open it for review." : "Browse the full LabelGrid catalog and map releases to user accounts."}</p></div>
    <div className="flex flex-wrap gap-2"><Link href="/admin/review-queue?stage=pending" className="inline-flex h-9 items-center border border-border bg-card px-3 text-xs font-semibold hover:border-foreground focus-visible:outline-2 focus-visible:outline-ring">1. Internal review</Link><Link href="/admin/review-queue?stage=preflight" className="inline-flex h-9 items-center border border-foreground bg-foreground px-3 text-xs font-semibold text-background hover:opacity-85 focus-visible:outline-2 focus-visible:outline-ring">2. Preflight confirmation</Link></div>
  </header>;
}
function SourceNav({ active }: { active: "labelgrid" | "rdistro" }) {
  return <nav aria-label="Catalog source" className="grid border-b border-border sm:flex">
    {([
      { value: "rdistro", href: "/admin/releases", label: "RDISTRO workflow", detail: "User releases, review states and filters" },
      { value: "labelgrid", href: "/admin/releases?source=labelgrid", label: "LabelGrid catalog", detail: "All provider releases, including unmapped" },
    ] as const).map((item) => <Link key={item.value} href={item.href} aria-current={active === item.value ? "page" : undefined} className={cn("border-b-2 px-4 py-3 focus-visible:outline-2 focus-visible:outline-ring", active === item.value ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground")}><span className="text-xs font-semibold">{item.label}</span><span className="mt-1 block text-[11px] font-normal text-muted-foreground">{item.detail}</span></Link>)}
  </nav>;
}
function Metric({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) { return <div className="border-b border-border p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className={cn("mt-2 text-2xl font-semibold", alert && "text-amber-800")}>{value}</p></div>; }
function providerTitle(release: ReleaseData) { return release.title?.trim() || release.titles?.[0]?.text?.trim() || "Untitled release"; }
function providerArtists(release: ReleaseData) { const names = release.artists?.map((row) => row.artist?.artist_name?.trim()).filter(Boolean) ?? []; return names.length ? names.join(", ") : "Artist not supplied"; }
