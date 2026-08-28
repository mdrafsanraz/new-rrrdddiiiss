"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleNotch, MagnifyingGlass } from "@phosphor-icons/react";

type TrackResult = {
  id: string;
  title: string;
  isrc: string | null;
  release: {
    title: string;
    upc: string | null;
    user: { name: string; email: string };
  };
};

export function RoyaltyManualMatch({
  transactionId,
  initialQuery,
}: {
  transactionId: string;
  initialQuery: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<TrackResult[]>([]);
  const [selected, setSelected] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function search() {
    setBusy(true);
    const response = await fetch(
      `/api/admin/royalties/tracks?q=${encodeURIComponent(query)}`,
    );
    const body = await response.json();
    setResults(body.tracks ?? []);
    setBusy(false);
  }
  async function assign() {
    setBusy(true);
    setError("");
    const response = await fetch(
      `/api/admin/royalties/transactions/${transactionId}/match`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ trackId: selected, note }),
      },
    );
    const body = await response.json();
    if (!response.ok) setError(body.error ?? "Match failed.");
    else router.refresh();
    setBusy(false);
  }
  if (!open)
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          void search();
        }}
        className="mt-2 text-[10px] font-semibold text-foreground underline underline-offset-2"
      >
        Resolve match
      </button>
    );
  return (
    <div className="mt-3 w-72 rounded-lg border border-border bg-background p-3 shadow-lg">
      <div className="flex gap-1">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-8 min-w-0 flex-1 rounded-md border border-border px-2 text-xs"
        />
        <button
          type="button"
          onClick={() => void search()}
          className="grid size-8 place-items-center rounded-md border border-border"
        >
          {busy ? (
            <CircleNotch className="animate-spin" />
          ) : (
            <MagnifyingGlass />
          )}
        </button>
      </div>
      <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
        {results.map((track) => (
          <label
            key={track.id}
            className={`block cursor-pointer rounded-md border p-2 text-[10px] ${selected === track.id ? "border-foreground bg-muted" : "border-border"}`}
          >
            <input
              type="radio"
              className="sr-only"
              checked={selected === track.id}
              onChange={() => setSelected(track.id)}
            />
            <b>{track.title}</b>
            <span className="mt-0.5 block text-muted-foreground">
              {track.isrc || "No ISRC"} · {track.release.title}
            </span>
            <span className="block text-muted-foreground">
              Owner: {track.release.user.name}
            </span>
          </label>
        ))}
      </div>
      <input
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Reason / note"
        className="mt-2 h-8 w-full rounded-md border border-border px-2 text-xs"
      />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => void assign()}
          disabled={!selected || busy}
          className="inline-flex h-7 items-center gap-1 rounded-md bg-foreground px-2 text-[10px] font-semibold text-background disabled:opacity-40"
        >
          <Check />
          Assign
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[10px] text-muted-foreground"
        >
          Cancel
        </button>
      </div>
      {error ? <p className="mt-2 text-[10px] text-red-600">{error}</p> : null}
    </div>
  );
}
