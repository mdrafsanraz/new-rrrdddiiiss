"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function WithdrawalStatusForm({
  id,
  current,
  reference,
  amount,
  currency,
}: {
  id: string;
  current: string;
  reference: string;
  amount: string;
  currency: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payoutReference, setPayoutReference] = useState(reference);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [payoutAmount, setPayoutAmount] = useState(amount);
  const [taxWithholding, setTaxWithholding] = useState("0");
  const [fee, setFee] = useState("0");
  const [error, setError] = useState("");

  const netPaid = (
    Number(payoutAmount || 0) - Number(taxWithholding || 0) - Number(fee || 0)
  );

  async function update(
    status: "processing" | "paid" | "declined",
    body: Record<string, string | undefined> = {},
  ) {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/admin/royalties/withdrawals/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        status,
        reference: payoutReference.trim() || undefined,
        note: note.trim() || undefined,
        reason: reason.trim() || undefined,
        ...body,
      }),
    });
    const responseBody = await response.json();
    if (!response.ok) {
      setError(responseBody.error ?? "Update failed.");
    } else {
      setExpanded(false);
      setPaying(false);
      router.refresh();
    }
    setBusy(false);
  }

  if (["paid", "declined", "reversed"].includes(current))
    return (
      <span className="text-xs font-semibold capitalize text-muted-foreground">
        {current}
      </span>
    );

  return (
    <div className="min-w-52">
      <div className="flex flex-wrap justify-end gap-2">
        {current === "pending" ? (
          <button
            type="button"
            onClick={() => void update("processing")}
            disabled={busy}
            className="h-8 rounded-md bg-foreground px-3 text-[11px] font-semibold text-background disabled:opacity-50"
          >
            Start processing
          </button>
        ) : null}
        {current === "processing" ? (
          <button
            type="button"
            onClick={() => {
              setPaying(true);
              setExpanded(false);
            }}
            disabled={busy}
            className="h-8 rounded-md bg-emerald-700 px-3 text-[11px] font-semibold text-white disabled:opacity-50"
          >
            Mark paid
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setExpanded((value) => !value);
            setPaying(false);
          }}
          className="h-8 rounded-md border border-border px-3 text-[11px] font-semibold hover:bg-muted"
        >
          {expanded ? "Close" : "Review"}
        </button>
      </div>

      {paying ? (
        <div className="mt-3 space-y-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-left dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Settlement breakdown
          </p>
          <div className="grid grid-cols-3 gap-2">
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Payout amount
              <input
                inputMode="decimal"
                value={payoutAmount}
                onChange={(event) => setPayoutAmount(event.target.value)}
                className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-xs normal-case tracking-normal text-foreground"
              />
            </label>
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Tax holding
              <input
                inputMode="decimal"
                value={taxWithholding}
                onChange={(event) => setTaxWithholding(event.target.value)}
                className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-xs normal-case tracking-normal text-foreground"
              />
            </label>
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Fee
              <input
                inputMode="decimal"
                value={fee}
                onChange={(event) => setFee(event.target.value)}
                className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-xs normal-case tracking-normal text-foreground"
              />
            </label>
          </div>
          <p className="text-xs font-semibold">
            Net amount to pay:{" "}
            <span className={netPaid < 0 ? "text-red-700" : "text-emerald-800"}>
              {netPaid.toFixed(2)} {currency}
            </span>
          </p>
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Payout or reference ID
            <input
              value={payoutReference}
              onChange={(event) => setPayoutReference(event.target.value)}
              maxLength={100}
              className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-xs normal-case tracking-normal text-foreground"
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                void update("paid", { payoutAmount, taxWithholding, fee })
              }
              disabled={busy || netPaid < 0}
              className="h-8 rounded-md bg-emerald-700 px-3 text-[11px] font-semibold text-white disabled:opacity-40"
            >
              Confirm paid
            </button>
            <button
              type="button"
              onClick={() => setPaying(false)}
              disabled={busy}
              className="h-8 rounded-md border border-border px-3 text-[11px] font-semibold hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {expanded ? (
        <div className="mt-3 space-y-2 rounded-lg border border-border bg-background p-3 text-left">
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Payout or reference ID
            <input
              value={payoutReference}
              onChange={(event) => setPayoutReference(event.target.value)}
              maxLength={100}
              className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-xs normal-case tracking-normal text-foreground"
            />
          </label>
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Internal audit note
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={1000}
              rows={2}
              className="mt-1 w-full rounded-md border border-border bg-background p-2 text-xs normal-case tracking-normal text-foreground"
            />
          </label>
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Decline reason
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              rows={2}
              className="mt-1 w-full rounded-md border border-border bg-background p-2 text-xs normal-case tracking-normal text-foreground"
            />
          </label>
          <button
            type="button"
            onClick={() => void update("declined")}
            disabled={busy || !reason.trim()}
            className="h-8 rounded-md border border-red-300 px-3 text-[11px] font-semibold text-red-700 disabled:opacity-40"
          >
            Decline request
          </button>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-[10px] text-red-600">{error}</p> : null}
    </div>
  );
}
