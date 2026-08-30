"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleNotch, Trash } from "@phosphor-icons/react";

export function RoyaltyRuleDeleteButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (
      !window.confirm(
        `Delete "${name}"? It stops applying to future royalty calculations. Past published statements keep their applied rule and version.`,
      )
    )
      return;
    setBusy(true);
    const response = await fetch(`/api/admin/royalties/rules/${id}`, {
      method: "DELETE",
    });
    if (response.ok) {
      router.refresh();
    } else {
      const body = await response.json().catch(() => ({}));
      window.alert(body.error ?? "Could not delete rule.");
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void remove()}
      disabled={busy}
      className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700 hover:underline disabled:opacity-50"
    >
      {busy ? <CircleNotch className="size-3 animate-spin" /> : <Trash className="size-3" />}
      Delete
    </button>
  );
}
