import { Skeleton } from "@/components/ui/skeleton";

export default function ArtistDetailLoading() {
  return <div className="mx-auto max-w-[1200px] space-y-6" aria-label="Loading artist profile"><Skeleton className="h-4 w-28" /><Skeleton className="h-[360px] rounded-2xl" /><div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]"><Skeleton className="h-[520px] rounded-2xl" /><Skeleton className="h-[360px] rounded-2xl" /></div><Skeleton className="h-80 rounded-2xl" /></div>;
}
