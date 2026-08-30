"use client";

import { ArrowClockwise, SpeakerSlash } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

export function ProviderAudioPlayer({
  releaseId,
  trackId,
  labelgridTrackId,
}: {
  releaseId?: string;
  trackId?: string;
  labelgridTrackId?: number;
}) {
  const src = labelgridTrackId
    ? `/api/admin/labelgrid/tracks/${labelgridTrackId}/audio`
    : `/api/admin/releases/${releaseId}/tracks/${trackId}/audio`;
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
    return <p className="mt-3 text-xs text-muted-foreground">Checking LabelGrid…</p>;
  }
  if (state === "missing") {
    return (
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <SpeakerSlash aria-hidden />
        LabelGrid has no audio file for this track yet.
      </p>
    );
  }
  if (state === "error") {
    return (
      <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <SpeakerSlash aria-hidden />
        Could not reach LabelGrid for this track&apos;s audio.
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
      </p>
    );
  }
  return (
    <audio
      controls
      preload="metadata"
      src={src}
      onError={() => setState("error")}
      className="mt-3 w-full max-w-lg"
    />
  );
}
