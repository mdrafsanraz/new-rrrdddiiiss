"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialogShell } from "@/components/dashboard/release-view/confirm-dialog";
import { withdrawalStatuses, type WithdrawalStatus } from "@/lib/releases/withdraw-review";

export function WithdrawReviewDialog({ releaseId, open, onOpenChange }: {
  releaseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<WithdrawalStatus>("in_review");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function close(next: boolean) {
    if (busy) return;
    setError("");
    onOpenChange(next);
  }

  async function withdraw() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/releases/${releaseId}/withdraw-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not withdraw release from review.");
        return;
      }
      onOpenChange(false);
      router.refresh();
    } catch {
      setError("Could not confirm withdrawal. Refresh release data before retrying.");
    } finally {
      setBusy(false);
    }
  }

  return <ConfirmDialogShell open={open} onOpenChange={close}>
    <AlertDialog.Title className="text-base font-semibold">Withdraw from review</AlertDialog.Title>
    <AlertDialog.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
      Withdraw this release from LabelGrid review and choose its new RDISTRO status. Artwork and audio will be retained.
    </AlertDialog.Description>
    <fieldset className="mt-5 space-y-2" disabled={busy}>
      <legend className="mb-2 text-sm font-medium">New RDISTRO status</legend>
      {withdrawalStatuses.map(option => <label key={option.value} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm ${status === option.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"}`}>
        <input type="radio" name="withdrawal-status" value={option.value} checked={status === option.value} onChange={() => setStatus(option.value)} className="size-4 accent-primary" />
        <span>{option.label}</span>
      </label>)}
    </fieldset>
    {status === "taken_down" ? <p className="mt-3 text-xs text-muted-foreground">Taken down applies to RDISTRO only. This action does not request removal from stores.</p> : null}
    {status === "rejected" ? <p className="mt-3 text-xs text-muted-foreground">Rejected releases are permanently locked against editing and resubmission.</p> : null}
    {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
    <div className="mt-5 flex justify-end gap-2">
      <Button type="button" variant="outline" disabled={busy} onClick={() => close(false)}>Cancel</Button>
      <Button type="button" disabled={busy} onClick={withdraw}>{busy ? "Withdrawing..." : "Withdraw and update status"}</Button>
    </div>
  </ConfirmDialogShell>;
}
