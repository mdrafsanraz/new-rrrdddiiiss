import { Skeleton } from "@/components/ui/skeleton";

export default function ArtistsLoading() {
  return <div className="mx-auto max-w-[1200px] space-y-8" aria-label="Loading artists"><Skeleton className="h-[330px] rounded-2xl" /><div><Skeleton className="h-7 w-28" /><Skeleton className="mt-3 h-4 w-72" /></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-64 rounded-2xl" />)}</div></div>;
}
