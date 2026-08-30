"use client";

import { Disc, SpeakerSlash } from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function DashboardProviderArtwork({ releaseId, alt = "", className }: { releaseId: string; alt?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className={cn("grid place-items-center bg-muted text-muted-foreground", className)}><Disc className="size-5" aria-hidden /><span className="sr-only">Artwork unavailable</span></div>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/api/releases/${releaseId}/media/artwork`} alt={alt} className={className} onError={() => setFailed(true)} />
  );
}

export function DashboardProviderAudio({ releaseId, trackId }: { releaseId: string; trackId: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><SpeakerSlash aria-hidden /> Audio unavailable</span>;
  return <audio controls preload="metadata" src={`/api/releases/${releaseId}/tracks/${trackId}/audio`} onError={() => setFailed(true)} className="h-9 w-full max-w-72" />;
}
