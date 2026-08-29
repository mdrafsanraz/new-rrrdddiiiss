import { Skeleton } from "@/components/ui/skeleton";

export default function ReleaseDetailLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      <Skeleton className="h-4 w-20" />

      <div className="grid border border-border bg-card md:grid-cols-[15rem_minmax(0,1fr)]">
        <Skeleton className="aspect-square w-full" />
        <div className="min-w-0 space-y-4 p-5 sm:p-7">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-11 w-72 max-w-full" />
          <Skeleton className="h-5 w-40" />
          <div className="grid grid-cols-4 gap-4 border border-border p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
          <Skeleton className="h-4 w-full max-w-md" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 border border-border bg-card sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="m-4 h-10" />
        ))}
      </div>

      <div className="border border-border bg-card p-2">
        <div className="flex gap-2 overflow-hidden border-b border-border pb-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 shrink-0" />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 border border-border sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="m-4 h-14" />
          ))}
        </div>
        <div className="mt-4 border border-border p-4">
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
