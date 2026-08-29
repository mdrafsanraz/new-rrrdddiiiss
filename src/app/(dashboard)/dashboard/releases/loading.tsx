import { Skeleton } from "@/components/ui/skeleton";

export default function ReleasesLoading() {
  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-7">
        <div className="space-y-2">
          <Skeleton className="h-11 w-72 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="grid border border-border bg-card lg:grid-cols-2">
        <div className="grid grid-cols-4 divide-x divide-border border-b border-border p-5 lg:border-r lg:border-b-0">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-8 px-3 first:pl-0 last:pr-0">
              <Skeleton className="h-3 w-14 max-w-full" />
              <Skeleton className="h-8 w-10" />
            </div>
          ))}
        </div>
        <div className="space-y-3 p-5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-3 w-72 max-w-full" />
        </div>
      </div>

      <div className="border border-border bg-card">
        <div className="p-5">
          <Skeleton className="h-11 w-full" />
        </div>
        <div className="flex gap-2 border-t border-border p-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20" />
          ))}
        </div>
      </div>

      <div className="border border-border bg-card">
        <div className="border-b border-border px-5 py-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-2 h-3 w-28" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-5">
              <Skeleton className="size-16 shrink-0" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-8 w-20 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
