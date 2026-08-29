export default function AdminReleasesLoading() {
  return <div className="animate-pulse space-y-5" aria-label="Loading release workspace">
    <div className="border-b border-border pb-5"><div className="h-3 w-28 bg-muted" /><div className="mt-3 h-7 w-56 bg-muted" /><div className="mt-2 h-4 w-full max-w-xl bg-muted" /></div>
    <div className="flex gap-1 overflow-hidden">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-8 w-28 shrink-0 border border-border bg-muted/70" />)}</div>
    <div className="h-44 border border-border bg-muted/40" /><div className="h-10 border-y border-border bg-muted/30" />
    <div className="border border-border"><div className="h-10 bg-muted/60" />{Array.from({ length: 7 }).map((_, index) => <div key={index} className="h-[76px] border-t border-border bg-muted/20" />)}</div>
  </div>;
}
