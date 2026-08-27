"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialogShell, DialogRow } from "./confirm-dialog";
import { deliveryStateLabel } from "@/lib/labelgrid/state-labels";

export function TakedownReleaseDialog({
  releaseId,
  title,
  artist,
  upc,
  currentState,
  open,
  onOpenChange,
}: {
  releaseId: string;
  title: string;
  artist: string | null;
  upc: string | null;
  currentState: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [needsContractHoldConfirm, setNeedsContractHoldConfirm] =
    useState(false);

  function reset(next: boolean) {
    if (busy) return;
    onOpenChange(next);
    if (!next) {
      setNeedsContractHoldConfirm(false);
      setError("");
      setMessage("");
    }
  }

  async function submit(confirmContractHold?: boolean) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(
        `/api/releases/${releaseId}/labelgrid-takedown`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: message.trim() || undefined,
            confirmContractHold,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        if (data.contractHoldConfirmRequired) {
          setNeedsContractHoldConfirm(true);
          setError(data.error ?? "Confirm to proceed.");
          setBusy(false);
          return;
        }
        setError(data.error ?? "Could not request the takedown.");
        setBusy(false);
        return;
      }
      setBusy(false);
      reset(false);
      router.refresh();
    } catch {
      setError("Network error.");
      setBusy(false);
    }
  }

  return (
    <ConfirmDialogShell open={open} onOpenChange={reset}>
      <AlertDialog.Title className="text-base font-semibold">
        Request takedown
      </AlertDialog.Title>
      <AlertDialog.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
        This issues a managed takedown from every store this release was
        delivered to. It is not deleted from your catalog and can be
        redistributed later without re-approval.
      </AlertDialog.Description>

      <dl className="mt-4 space-y-1.5 border border-border bg-muted/40 p-3 text-sm">
        <DialogRow label="Release" value={title} />
        {artist ? <DialogRow label="Artist" value={artist} /> : null}
        {upc ? <DialogRow label="UPC" value={upc} /> : null}
        <DialogRow label="Current state" value={deliveryStateLabel(currentState)} />
      </dl>

      <label
        className="mt-4 block text-sm font-medium"
        htmlFor="takedown-message"
      >
        Reason <span className="font-normal text-muted-foreground">(optional)</span>
      </label>
      <textarea
        id="takedown-message"
        value={message}
        maxLength={255}
        rows={3}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Optional note for your records"
        className="mt-1.5 w-full resize-none border border-border bg-background p-2.5 text-sm outline-none focus:border-primary"
      />

      {needsContractHoldConfirm ? (
        <p className="mt-3 border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs leading-relaxed text-amber-900 dark:text-amber-400">
          {error}
        </p>
      ) : error ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-9 px-4"
          disabled={busy}
          onClick={() => reset(false)}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="destructive"
          className="h-9 px-4"
          loading={busy}
          onClick={() => submit(needsContractHoldConfirm ? true : undefined)}
        >
          {needsContractHoldConfirm
            ? "Confirm & Request Takedown"
            : "Request Takedown"}
        </Button>
      </div>
    </ConfirmDialogShell>
  );
}
