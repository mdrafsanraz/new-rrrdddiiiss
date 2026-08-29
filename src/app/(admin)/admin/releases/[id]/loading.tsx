export default function AdminReleaseDetailLoading() {
  return (
    <div className="animate-pulse space-y-5" aria-label="Loading release review">
      <div className="flex gap-5 border-b border-border pb-5">
        <div className="size-28 shrink-0 border border-border bg-muted" />
        <div className="flex-1 space-y-3 pt-2">
          <div className="h-3 w-24 bg-muted" />
          <div className="h-7 w-full max-w-md bg-muted" />
          <div className="h-4 w-64 bg-muted" />
          <div className="grid max-w-3xl grid-cols-3 gap-3 pt-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-8 bg-muted/70" />
            ))}
          </div>
        </div>
      </div>
      <div className="grid border border-border sm:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-16 border-r border-border bg-muted/40 last:border-r-0" />
        ))}
      </div>
      <div className="h-9 border-b border-border bg-muted/30" />
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <div className="h-72 border border-border bg-muted/30" />
          <div className="h-96 border border-border bg-muted/30" />
          <div className="h-64 border border-border bg-muted/30" />
        </div>
        <div className="h-[520px] border border-border bg-muted/40" />
      </div>
    </div>
  );
}
