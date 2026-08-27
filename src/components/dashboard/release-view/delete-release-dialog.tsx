"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialogShell } from "./confirm-dialog";

export function DeleteReleaseDialog({
  releaseId,
  open,
  onOpenChange,
}: {
  releaseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirmDelete() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/releases/${releaseId}/labelgrid-delete`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not delete this release.");
        setBusy(false);
        return;
      }
      router.push("/dashboard/releases");
      router.refresh();
    } catch {
      setError("Network error.");
      setBusy(false);
    }
  }

  return (
    <ConfirmDialogShell
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next);
      }}
    >
      <AlertDialog.Title className="text-base font-semibold">
        Delete this draft?
      </AlertDialog.Title>
      <AlertDialog.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
        This will permanently delete the draft release from LabelGrid. This
        action cannot be undone.
      </AlertDialog.Description>
      {error ? (
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
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="destructive"
          className="h-9 px-4"
          loading={busy}
          onClick={confirmDelete}
        >
          Delete Release
        </Button>
      </div>
    </ConfirmDialogShell>
  );
}
