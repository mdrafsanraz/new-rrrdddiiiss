"use client";

import { ArrowClockwise, Disc, SpeakerSlash } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
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
  const src = `/api/releases/${releaseId}/tracks/${trackId}/audio`;
  const [state, setState] = useState<"checking" | "ready" | "missing" | "error">("checking");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(src, { method: "HEAD", cache: "no-store" })
      .then((res) => {
        if (cancelled) return;
        if (res.ok) setState("ready");
        else if (res.status === 404) setState("missing");
        else setState("error");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [src, attempt]);

  if (state === "checking") {
    return <span className="text-xs text-muted-foreground">Checking…</span>;
  }
  if (state === "missing") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <SpeakerSlash aria-hidden /> No audio yet
      </span>
    );
  }
  if (state === "error") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <SpeakerSlash aria-hidden /> Couldn&apos;t load audio
        <button
          type="button"
          onClick={() => {
            setState("checking");
            setAttempt((n) => n + 1);
          }}
          className="inline-flex items-center gap-1 font-semibold text-foreground hover:underline"
        >
          <ArrowClockwise size={12} weight="bold" />
          Retry
        </button>
      </span>
    );
  }
  return (
    <audio
      controls
      preload="metadata"
      src={src}
      onError={() => setState("error")}
      className="h-9 w-full max-w-72"
    />
  );
}
