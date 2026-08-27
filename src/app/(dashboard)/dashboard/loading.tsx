import { Skeleton } from "@/components/ui/skeleton";

/**
 * Next.js App Router convention — rendered automatically as a Suspense
 * fallback while page.tsx's server-side data fetch resolves. Shaped to
 * match the real layout (metric blocks, chart, list cards) so the
 * skeleton → content swap doesn't jump.
 */
export default function DashboardHomeLoading() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-border bg-card p-5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-7 w-12" />
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-border bg-card px-4 py-3">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="mt-2 h-5 w-8" />
          </div>
        ))}
      </div>

      <div className="border border-border bg-card">
        <div className="border-b border-border p-5">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="p-5">
          <Skeleton className="aspect-[2.6/1] w-full" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-4 border border-border bg-card p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="border border-border bg-card">
            <div className="border-b border-border p-5">
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="divide-y divide-border">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3 px-5 py-3.5">
                  <Skeleton className="h-4 w-full max-w-56" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
