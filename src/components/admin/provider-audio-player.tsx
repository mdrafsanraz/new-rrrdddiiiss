"use client";

import { SpeakerSlash } from "@phosphor-icons/react";
import { useState } from "react";

export function ProviderAudioPlayer({
  releaseId,
  trackId,
}: {
  releaseId: string;
  trackId: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <SpeakerSlash aria-hidden />
        Audio unavailable from LabelGrid
      </p>
    );
  }

  return (
    <audio
      controls
      preload="metadata"
      src={`/api/admin/releases/${releaseId}/tracks/${trackId}/audio`}
      onError={() => setFailed(true)}
      className="mt-3 w-full max-w-lg"
    />
  );
}
