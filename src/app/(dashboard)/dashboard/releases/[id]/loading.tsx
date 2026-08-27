import { Skeleton } from "@/components/ui/skeleton";

export default function ReleaseDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Skeleton className="h-4 w-20" />

      <div className="flex flex-wrap items-start gap-5 border-b border-border pb-6">
        <Skeleton className="size-20 shrink-0" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-full max-w-md" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="mb-2 h-5 w-20" />
        ))}
      </div>

      <div className="space-y-4">
        <div className="border border-border bg-card p-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
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
