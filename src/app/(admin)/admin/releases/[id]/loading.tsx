export default function AdminReleaseDetailLoading() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-6" aria-label="Loading release review" aria-busy="true">
      <div className="flex gap-5 rounded-2xl border border-border bg-card p-6">
        <div className="size-24 shrink-0 rounded-xl border border-border bg-muted sm:size-32" />
        <div className="flex-1 space-y-3 pt-2">
          <div className="h-3 w-24 bg-muted" />
          <div className="h-7 w-full max-w-md bg-muted" />
          <div className="h-4 w-full max-w-64 bg-muted" />
          <div className="grid max-w-3xl grid-cols-3 gap-3 pt-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-8 bg-muted/70" />
            ))}
          </div>
        </div>
      </div>
      <div className="h-32 rounded-2xl border border-border bg-muted/30" />
      <div className="grid overflow-hidden rounded-xl border border-border sm:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-16 border-r border-border bg-muted/40 last:border-r-0" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <div className="h-14 rounded-xl border border-border bg-muted/30" />
          <div className="h-72 rounded-xl border border-border bg-muted/30" />
          <div className="h-64 rounded-xl border border-border bg-muted/30" />
        </div>
        <div className="h-[520px] rounded-xl border border-border bg-muted/40" />
      </div>
    </div>
  );
}
