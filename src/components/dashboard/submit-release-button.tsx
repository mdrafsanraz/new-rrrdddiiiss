"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SubmitReleaseButton({ releaseId }: { releaseId: string }) {
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
            !window.confirm(
              "Submit this release for review? This counts toward your monthly submission limit on Free."
            )
          ) {
            return;
          }
          setError("");
          setStatus("loading");
          const res = await fetch(`/api/releases/${releaseId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "submit" }),
          });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error ?? "Submit failed");
            setStatus("idle");
            return;
          }
          router.refresh();
        }}
      >
        {status === "loading" ? "Submitting…" : "Submit for review"}
      </Button>
      {error ? (
        <p className="mt-2 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
