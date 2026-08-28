import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-6" aria-label="Loading analytics">
      <div className="flex items-end justify-between border-b border-border pb-6">
        <div><Skeleton className="h-3 w-24" /><Skeleton className="mt-3 h-9 w-40" /><Skeleton className="mt-3 h-4 w-72" /></div>
        <Skeleton className="h-10 w-72" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-32 rounded-2xl" />)}
      </div>
      <Skeleton className="h-[390px] rounded-2xl" />
      <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-80 rounded-2xl" /><Skeleton className="h-80 rounded-2xl" /></div>
    </div>
  );
}
