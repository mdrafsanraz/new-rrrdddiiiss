"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/site/field";

const REASONS = [
  { value: "user_requested", label: "User requested" },
  { value: "compliance", label: "Compliance" },
  { value: "copyright", label: "Copyright" },
  { value: "fraud", label: "Fraud" },
  { value: "dsp_request", label: "DSP request" },
  { value: "administrative", label: "Administrative" },
] as const;

export function TakedownForm({
  releases,
}: {
  releases: Array<{ id: string; label: string }>;
}) {
  const router = useRouter();
  const [releaseId, setReleaseId] = useState(releases[0]?.id ?? "");
  const [reason, setReason] = useState<string>(REASONS[0].value);
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmHold, setConfirmHold] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    if (!releaseId) {
      setError("Select a release.");
      return;
    }
    const ok = window.confirm(
      "Request a full-outlet takedown for this release via LabelGrid? This queues Delete/Purge to delivered stores."
    );
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch("/api/admin/takedowns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          releaseId,
          reason,
          message: message.trim() || undefined,
          internalNotes: notes.trim() || undefined,
          confirmContractHold: confirmHold,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Takedown failed");
        setBusy(false);
        return;
      }
      router.refresh();
      setBusy(false);
    } catch {
      setError("Network error");
      setBusy(false);
    }
  }

  if (!releases.length) {
    return (
      <p className="mt-2 text-sm text-muted-foreground">
        No live/delivering releases with a LabelGrid ID.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      <label className="block text-xs font-medium">
        Release
        <select
          className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
          value={releaseId}
          onChange={(e) => setReleaseId(e.target.value)}
        >
          {releases.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium">
        Reason
        <select
          className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        >
          {REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
      <Field
        id="tdMsg"
        label="Message to LabelGrid (optional)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <Field
        id="tdNotes"
        label="Internal notes"
        as="textarea"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={confirmHold}
          onChange={(e) => setConfirmHold(e.target.checked)}
        />
        Confirm contract hold if LabelGrid requires it
      </label>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        className="h-9"
        disabled={busy}
        onClick={submit}
      >
        {busy ? "Submitting…" : "Request takedown (all stores)"}
      </Button>
    </div>
  );
}
