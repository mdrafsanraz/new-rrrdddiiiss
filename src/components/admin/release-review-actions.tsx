"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/site/field";

export function ReleaseReviewActions({ releaseId }: { releaseId: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "approving" | "rejecting">(
    "idle"
  );
  const [error, setError] = useState("");

  async function act(action: "approve" | "reject") {
    setError("");
    setStatus(action === "approve" ? "approving" : "rejecting");
    try {
      const res = await fetch(`/api/admin/releases/${releaseId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `${action} failed`);
        setStatus("idle");
        return;
      }
      router.refresh();
      setStatus("idle");
    } catch {
      setError("Network error");
      setStatus("idle");
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold">Admin decision</h2>
      <Field
        id="reviewNotes"
        label="Notes (required to reject)"
        as="textarea"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        helper="Shown to the user. On approve, optional internal note."
      />
      {error ? (
        <p className="text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          className="h-10 px-5"
          disabled={status !== "idle"}
          onClick={() => act("approve")}
        >
          {status === "approving"
            ? "Submitting to LabelGrid…"
            : "Approve → submit for LabelGrid review"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 px-5 text-red-800"
          disabled={status !== "idle"}
          onClick={() => act("reject")}
        >
          {status === "rejecting" ? "Rejecting…" : "Reject"}
        </Button>
      </div>
    </div>
  );
}
