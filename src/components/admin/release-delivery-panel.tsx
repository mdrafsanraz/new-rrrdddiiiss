"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type OutletRow = {
  outlet?: string;
  state?: string;
  operation?: string;
  customer_state?: string;
};

export function ReleaseDeliveryPanel({
  releaseId,
  deliveryState,
  delivery,
  canSync,
}: {
  releaseId: string;
  deliveryState: string | null;
  delivery: Record<string, unknown> | null;
  canSync: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const outlets = Array.isArray(delivery?.outlets)
    ? (delivery.outlets as OutletRow[])
    : [];
  const currentlyLive = Boolean(delivery?.currently_live);
  const overall =
    (delivery?.state as string | undefined) ?? deliveryState ?? "not_submitted";

  const delivered = outlets.filter((o) => o.state === "delivered").length;

  async function sync() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/releases/${releaseId}/sync`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Sync failed");
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

  return (
    <section className="border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div>
          <h2 className="text-sm font-semibold">Delivery</h2>
          <p className="text-[11px] text-muted-foreground">
            LabelGrid delivery status. Delivered and live are separate states.
          </p>
        </div>
        {canSync ? (
          <Button
            type="button"
            variant="outline"
            className="h-7 px-2.5 text-xs"
            disabled={busy}
            onClick={sync}
          >
            {busy ? "Syncing..." : "Refresh status"}
          </Button>
        ) : null}
      </div>
      <div className="px-4 py-3">
        <dl className="grid gap-2 text-xs sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Overall</dt>
            <dd className="font-medium capitalize">
              {overall.replace(/_/g, " ")}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Outlets</dt>
            <dd className="font-medium tabular-nums">
              {outlets.length
                ? `${delivered} of ${outlets.length} delivered`
                : "Not available"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Currently live</dt>
            <dd className="font-medium">{currentlyLive ? "Yes" : "No"}</dd>
          </div>
        </dl>

        {outlets.length > 0 ? (
          <ul className="mt-4 divide-y divide-border text-sm">
            {outlets.map((o, i) => (
              <li
                key={`${o.outlet ?? i}`}
                className="flex items-center justify-between gap-3 py-2"
              >
                <span className="font-medium">{o.outlet ?? "Outlet"}</span>
                <span className="text-xs capitalize text-muted-foreground">
                  {o.state?.replace(/_/g, " ") ?? "Not available"}
                  {o.operation ? ` / ${o.operation}` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No delivery data cached yet. Available after LabelGrid distribution
            begins.
          </p>
        )}
        {error ? (
          <p className="mt-3 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
