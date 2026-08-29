"use client";

import { ImageSquare } from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function ProviderArtwork({
  releaseId,
  alt = "",
  className,
}: {
  releaseId: string;
  alt?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={cn(
          "grid place-items-center border border-border bg-muted text-muted-foreground",
          className
        )}
        title="Artwork unavailable from LabelGrid"
      >
        <ImageSquare className="size-5" aria-hidden />
        <span className="sr-only">Artwork unavailable from LabelGrid</span>
      </div>
    );
  }

  return (
    // Provider artwork is intentionally served through the authenticated media gateway.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/admin/releases/${releaseId}/media/artwork`}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
