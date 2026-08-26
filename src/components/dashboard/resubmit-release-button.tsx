"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Resubmit after admin marked changes_required. */
export function ResubmitReleaseButton({ releaseId }: { releaseId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");

  return (
    <div className="text-right">
      <Button
        className="h-10 px-5"
        disabled={status === "loading"}
        onClick={async () => {
          if (
            !confirm(
              "Resubmit this release for admin review after your corrections?"
            )
          ) {
            return;
          }
          setError("");
          setStatus("loading");
          try {
            const res = await fetch(`/api/releases/${releaseId}/resubmit`, {
              method: "POST",
            });
            const data = await res.json();
            if (!res.ok) {
              setError(data.error ?? "Resubmit failed");
              setStatus("idle");
              return;
            }
            router.refresh();
          } catch {
            setError("Network error");
            setStatus("idle");
          }
        }}
      >
        {status === "loading" ? "Resubmitting…" : "Resubmit for review"}
      </Button>
      {error ? (
        <p className="mt-2 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
