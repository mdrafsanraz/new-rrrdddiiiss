import Link from "next/link";
import { CaretDown, MagnifyingGlass, SlidersHorizontal, X } from "@phosphor-icons/react/dist/ssr";
import { ADMIN_RELEASE_FILTERS, type AdminReleaseFilter } from "@/lib/admin/release-filters";

export type ReleaseListSearch = {
  source?: string; filter?: string; q?: string; page?: string; cat?: string; live?: string;
  user?: string; artist?: string; label?: string; upc?: string; isrc?: string;
  dateFrom?: string; dateTo?: string; dspStatus?: string; qc?: string; docs?: string;
};

export function releaseListHref(search: ReleaseListSearch, changes: Partial<Record<keyof ReleaseListSearch, string | number | undefined>>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...search, ...changes })) {
    if (value !== undefined && value !== "" && key !== "page") params.set(key, String(value));
  }
  if (changes.page && Number(changes.page) > 1) params.set("page", String(changes.page));
  return `/admin/releases?${params}`;
}

const inputClass = "h-10 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const groups: { label: string; values: AdminReleaseFilter[] }[] = [
  { label: "Catalog", values: ["all", "draft", "live"] },
  { label: "Review and delivery", values: ["pending_review", "labelgrid_in_review", "priority", "preflight", "labelgrid_review", "approved", "delivering"] },
  { label: "Needs attention", values: ["action_required", "changes_required", "qc_flagged", "documents_required", "sync_issues", "on_hold", "rejected"] },
  { label: "Takedowns", values: ["takedown_pending", "taken_down"] },
];
const advancedLabels = {
  user: "User", artist: "Artist", label: "Label", upc: "UPC", isrc: "ISRC",
  dateFrom: "Release from", dateTo: "Release to", dspStatus: "DSP delivery", qc: "QC issues", docs: "Documents",
} as const;
const choiceLabels: Record<string, Record<string, string>> = {
  dspStatus: { in_progress: "In progress", live: "Live", action_needed: "Action needed", removing: "Removing", removed: "Removed" },
  qc: { yes: "Has QC issues", no: "No QC issues" },
  docs: { yes: "Needs documentation", no: "No pending documents" },
};

export function ReleaseListFilters({ search, filter }: { search: ReleaseListSearch; filter: AdminReleaseFilter }) {
  const active = Object.entries(advancedLabels).flatMap(([key, label]) => {
    const value = search[key as keyof ReleaseListSearch]?.trim();
    return value ? [{ key: key as keyof ReleaseListSearch, label, value: choiceLabels[key]?.[value] ?? value }] : [];
  });
  const scopedSearch = { ...search, source: "rdistro", filter };
  return <section aria-label="Find and filter releases" className="rounded-xl border border-border bg-card">
    <nav aria-label="Frequently used review filters" className="flex flex-wrap gap-2 border-b border-border px-4 py-3 sm:px-5">
      {(["pending_review", "labelgrid_in_review"] as const).map((value) => <Link key={value} href={releaseListHref(scopedSearch, { filter: value })} aria-current={filter === value ? "page" : undefined} className={`inline-flex min-h-9 items-center border px-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${filter === value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{value === "pending_review" ? "In RDISTRO Review" : "In LabelGrid Review"}</Link>)}
    </nav>
    <form action="/admin/releases" className="p-4 sm:p-5">
      <input type="hidden" name="source" value="rdistro" />
      <div className="grid items-end gap-3 lg:grid-cols-[minmax(0,1fr)_240px_auto]">
        <label className="min-w-0 space-y-2 text-xs font-semibold">Search releases
          <span className="relative block"><MagnifyingGlass size={16} aria-hidden className="pointer-events-none absolute left-3 top-3 text-muted-foreground" /><input name="q" defaultValue={search.q} placeholder="Title, UPC, ISRC, catalog ID or user email" className={`${inputClass} pl-9 font-normal`} /></span>
        </label>
        <label className="space-y-2 text-xs font-semibold">Release view
          <select name="filter" defaultValue={filter} className={`${inputClass} font-normal`}>
            {groups.map((group) => <optgroup key={group.label} label={group.label}>{group.values.map((value) => <option key={value} value={value}>{ADMIN_RELEASE_FILTERS.find((item) => item.value === value)?.label}</option>)}</optgroup>)}
          </select>
        </label>
        <button type="submit" className="h-10 rounded-lg bg-foreground px-5 text-xs font-semibold text-background hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Apply filters</button>
      </div>
      <details open={active.length > 0} className="group mt-4 border-t border-border pt-3">
        <summary className="flex w-fit cursor-pointer list-none items-center gap-2 rounded text-xs font-medium text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden"><SlidersHorizontal size={15} aria-hidden />Advanced filters{active.length ? <span className="rounded bg-muted px-1.5 py-0.5 tabular-nums">{active.length}</span> : null}<CaretDown size={12} aria-hidden className="group-open:rotate-180" /></summary>
        <div className="mt-4 grid gap-5 md:grid-cols-3">
          <fieldset className="min-w-0 space-y-3"><legend className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">People and ownership</legend>
            {(["user", "artist", "label"] as const).map((key) => <label key={key} className="block space-y-1.5 text-xs font-medium">{advancedLabels[key]}<input name={key} defaultValue={search[key]} placeholder={key === "user" ? "Name or email" : `Search ${key}`} className={inputClass} /></label>)}
          </fieldset>
          <fieldset className="min-w-0 space-y-3"><legend className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Identifiers and schedule</legend>
            <div className="grid grid-cols-2 gap-2">{(["upc", "isrc"] as const).map((key) => <label key={key} className="min-w-0 space-y-1.5 text-xs font-medium">{advancedLabels[key]}<input name={key} defaultValue={search[key]} className={inputClass} /></label>)}</div>
            {(["dateFrom", "dateTo"] as const).map((key) => <label key={key} className="block space-y-1.5 text-xs font-medium">{advancedLabels[key]}<input type="date" name={key} defaultValue={search[key]} className={inputClass} /></label>)}
          </fieldset>
          <fieldset className="min-w-0 space-y-3"><legend className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Delivery and exceptions</legend>
            {(["dspStatus", "qc", "docs"] as const).map((key) => <label key={key} className="block space-y-1.5 text-xs font-medium">{advancedLabels[key]}<select name={key} defaultValue={search[key] ?? ""} className={inputClass}><option value="">Any</option>{Object.entries(choiceLabels[key]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>)}
          </fieldset>
        </div>
        <div className="mt-4 flex justify-end"><button type="submit" className="h-10 w-full border border-border px-4 text-xs font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring sm:w-auto">Apply advanced filters</button></div>
      </details>
    </form>
    {search.q || active.length ? <div aria-label="Active filters" className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3 sm:px-5">
      <span className="mr-1 text-[11px] text-muted-foreground">Applied</span>
      {[...(search.q ? [{ key: "q" as const, label: "Search", value: search.q }] : []), ...active].map((item) => <Link key={item.key} href={releaseListHref(scopedSearch, { [item.key]: undefined })} aria-label={`Remove ${item.label} filter: ${item.value}`} className="inline-flex max-w-full items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-1 text-[11px] hover:border-foreground/40"><span className="truncate">{item.label}: {item.value}</span><X size={11} aria-hidden className="shrink-0" /></Link>)}
      <Link href={releaseListHref({ source: "rdistro", filter }, {})} className="ml-auto text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline">Clear all</Link>
    </div> : null}
  </section>;
}
