"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/site/field";

const DOC_KINDS = [
  "Master ownership",
  "Artist authorization",
  "Remix permission",
  "Sample clearance",
  "Cover license",
  "Previous distributor confirmation",
  "Other",
] as const;

export function ReleaseReviewActions({
  releaseId,
  canDecide,
  status,
  permanentlyLocked,
  hasLabelgridId,
}: {
  releaseId: string;
  canDecide: boolean;
  status: string;
  permanentlyLocked: boolean;
  hasLabelgridId: boolean;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [docKind, setDocKind] = useState<string>(DOC_KINDS[0]);
  const [holdReason, setHoldReason] = useState("");
  const [statusBusy, setStatusBusy] = useState<
    "idle" | "approving" | "changes" | "rejecting" | "hold" | "document"
  >("idle");
  const [error, setError] = useState("");
  const [panel, setPanel] = useState<"main" | "document" | "hold">("main");

  async function approve() {
    setError("");
    setStatusBusy("approving");
    try {
      const res = await fetch(`/api/admin/releases/${releaseId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Approve failed");
        setStatusBusy("idle");
        return;
      }
      router.refresh();
      setStatusBusy("idle");
    } catch {
      setError("Network error");
      setStatusBusy("idle");
    }
  }

  async function decide(outcome: "changes_required" | "rejected") {
    setError("");
    if (!notes.trim()) {
      setError("Notes are required for changes required or rejection.");
      return;
    }
    if (outcome === "rejected") {
      const ok = window.confirm(
        "Permanently reject this release? It cannot be edited or resubmitted. This is a final policy decision — not the same as Changes Required."
      );
      if (!ok) return;
    }
    setStatusBusy(outcome === "rejected" ? "rejecting" : "changes");
    try {
      const res = await fetch(`/api/admin/releases/${releaseId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, outcome }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Decision failed");
        setStatusBusy("idle");
        return;
      }
      router.refresh();
      setStatusBusy("idle");
    } catch {
      setError("Network error");
      setStatusBusy("idle");
    }
  }

  async function hold() {
    setError("");
    if (!holdReason.trim()) {
      setError("Hold requires an internal reason.");
      return;
    }
    setStatusBusy("hold");
    try {
      const res = await fetch(`/api/admin/releases/${releaseId}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "hold", reason: holdReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Hold failed");
        setStatusBusy("idle");
        return;
      }
      router.refresh();
      setStatusBusy("idle");
      setPanel("main");
    } catch {
      setError("Network error");
      setStatusBusy("idle");
    }
  }

  async function requestDocument() {
    setError("");
    if (!notes.trim()) {
      setError("Add a user-facing message for the document request.");
      return;
    }
    setStatusBusy("document");
    try {
      const res = await fetch(`/api/admin/releases/${releaseId}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request_document",
          notes,
          documentKind: docKind,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Request failed");
        setStatusBusy("idle");
        return;
      }
      router.refresh();
      setStatusBusy("idle");
      setPanel("main");
    } catch {
      setError("Network error");
      setStatusBusy("idle");
    }
  }

  if (permanentlyLocked) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-950">
        Permanently rejected — moderation actions are disabled.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-md border border-border bg-card p-4">
      <div>
        <h2 className="text-sm font-semibold">Internal moderation</h2>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Approve submits the existing LabelGrid draft for review. Changes
          Required is editable; Reject is final. Status: {status}
          {hasLabelgridId ? "" : " · LG draft not created yet"}
        </p>
      </div>

      {panel === "main" ? (
        <>
          <Field
            id="reviewNotes"
            label="Notes"
            as="textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            helper="Shown to the user for changes / reject / document request."
          />
          {error ? (
            <p className="text-sm font-medium text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-col gap-2">
            {canDecide ? (
              <Button
                type="button"
                className="h-9 w-full"
                disabled={statusBusy !== "idle"}
                onClick={approve}
              >
                {statusBusy === "approving"
                  ? "Submitting to LabelGrid…"
                  : "Approve → LabelGrid review"}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="h-9 w-full"
              disabled={statusBusy !== "idle"}
              onClick={() => decide("changes_required")}
            >
              {statusBusy === "changes" ? "Sending…" : "Request changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9 w-full"
              disabled={statusBusy !== "idle"}
              onClick={() => setPanel("document")}
            >
              Request document
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9 w-full"
              disabled={statusBusy !== "idle"}
              onClick={() => setPanel("hold")}
            >
              Hold
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9 w-full text-red-800"
              disabled={statusBusy !== "idle"}
              onClick={() => decide("rejected")}
            >
              {statusBusy === "rejecting"
                ? "Rejecting…"
                : "Reject internally (final)"}
            </Button>
          </div>
        </>
      ) : null}

      {panel === "document" ? (
        <div className="space-y-3">
          <label className="block text-xs font-medium">
            Document type
            <select
              className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
              value={docKind}
              onChange={(e) => setDocKind(e.target.value)}
            >
              {DOC_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <Field
            id="docNotes"
            label="User-facing message"
            as="textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button
              type="button"
              className="h-9 flex-1"
              disabled={statusBusy !== "idle"}
              onClick={requestDocument}
            >
              {statusBusy === "document" ? "Sending…" : "Send request"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9"
              onClick={() => setPanel("main")}
            >
              Back
            </Button>
          </div>
        </div>
      ) : null}

      {panel === "hold" ? (
        <div className="space-y-3">
          <Field
            id="holdReason"
            label="Internal hold reason"
            as="textarea"
            value={holdReason}
            onChange={(e) => setHoldReason(e.target.value)}
            helper="Not shown to the user."
          />
          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button
              type="button"
              className="h-9 flex-1"
              disabled={statusBusy !== "idle"}
              onClick={hold}
            >
              {statusBusy === "hold" ? "Holding…" : "Place on hold"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9"
              onClick={() => setPanel("main")}
            >
              Back
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
