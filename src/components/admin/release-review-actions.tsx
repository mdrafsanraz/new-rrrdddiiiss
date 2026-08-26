"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/site/field";

export function ReleaseReviewActions({ releaseId }: { releaseId: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<
    "idle" | "approving" | "changes" | "rejecting"
  >("idle");
  const [error, setError] = useState("");

  async function approve() {
    setError("");
    setStatus("approving");
    try {
      const res = await fetch(`/api/admin/releases/${releaseId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Approve failed");
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

  async function decide(outcome: "changes_required" | "rejected") {
    setError("");
    if (!notes.trim()) {
      setError("Notes are required for changes required or rejection.");
      return;
    }
    setStatus(outcome === "rejected" ? "rejecting" : "changes");
    try {
      const res = await fetch(`/api/admin/releases/${releaseId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, outcome }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Decision failed");
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
      <div>
        <h2 className="text-sm font-semibold">Admin decision</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          <strong>Changes required</strong> is not final — the release comes
          back editable; the user fixes flagged items and resubmits into review.{" "}
          <strong>Reject</strong> is reserved for serious policy problems and
          permanently locks the release against editing or resubmission.
        </p>
      </div>
      <Field
        id="reviewNotes"
        label="Notes (required for changes / reject)"
        as="textarea"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        helper="Shown to the user. On approve, optional."
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
          onClick={approve}
        >
          {status === "approving"
            ? "Submitting to LabelGrid…"
            : "Approve → LabelGrid review"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 px-5"
          disabled={status !== "idle"}
          onClick={() => decide("changes_required")}
        >
          {status === "changes" ? "Sending…" : "Changes required"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 px-5 text-red-800"
          disabled={status !== "idle"}
          onClick={() => {
            if (
              !confirm(
                "Permanently reject this release? It cannot be edited or resubmitted."
              )
            ) {
              return;
            }
            decide("rejected");
          }}
        >
          {status === "rejecting" ? "Rejecting…" : "Reject (final)"}
        </Button>
      </div>
    </div>
  );
}
