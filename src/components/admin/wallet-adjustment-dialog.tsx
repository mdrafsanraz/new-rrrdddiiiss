"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleNotch, Plus, X } from "@phosphor-icons/react";

export function WalletAdjustmentDialog({ userId }: { userId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function close() {
    if (busy) return;
    setOpen(false);
    setError("");
  }

  async function submit(form: FormData) {
    setBusy(true);
    setError("");
    const direction = form.get("direction") === "debit" ? -1 : 1;
    const magnitude = Number(form.get("amount"));
    const response = await fetch(`/api/admin/users/${userId}/wallet-adjustment`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        amount: direction * magnitude,
        reason: form.get("reason"),
      }),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? "Could not add adjustment.");
      setBusy(false);
      return;
    }
    setBusy(false);
    setOpen(false);
    router.refresh();
  }

  const input =
    "h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-foreground";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-muted"
      >
        <Plus className="size-3.5" />
        Adjust wallet
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Manual wallet adjustment"
          onClick={close}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-lg border border-border bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">Manual wallet adjustment</h2>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="grid size-7 place-items-center rounded-full hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>
            <form action={(form) => void submit(form)} className="grid gap-3 p-4">
              <p className="text-xs text-muted-foreground">
                Directly credits or debits this user&apos;s available balance. Use for
                corrections that don&apos;t come from a royalty period or withdrawal.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5 text-xs font-medium">
                  Direction
                  <select name="direction" className={input} defaultValue="credit">
                    <option value="credit">Credit (add)</option>
                    <option value="debit">Debit (subtract)</option>
                  </select>
                </label>
                <label className="grid gap-1.5 text-xs font-medium">
                  Amount (USD)
                  <input
                    required
                    name="amount"
                    inputMode="decimal"
                    pattern="\d+(\.\d{1,12})?"
                    placeholder="0.00"
                    className={input}
                  />
                </label>
              </div>
              <label className="grid gap-1.5 text-xs font-medium">
                Reason
                <input required name="reason" minLength={3} className={input} />
              </label>
              {error ? <p className="text-xs text-red-600">{error}</p> : null}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={close}
                  disabled={busy}
                  className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-xs font-semibold hover:bg-muted disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  disabled={busy}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-foreground px-3 text-xs font-semibold text-background disabled:opacity-60"
                >
                  {busy ? <CircleNotch className="size-3.5 animate-spin" /> : null}
                  Apply adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
