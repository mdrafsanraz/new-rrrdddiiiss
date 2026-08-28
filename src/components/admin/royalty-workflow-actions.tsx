"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, CircleNotch, FileCsv, UploadSimple } from "@phosphor-icons/react";

type Stage = "idle" | "uploading" | "parsing" | "matching" | "done" | "error";

export function RoyaltyImportButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [message, setMessage] = useState("");

  async function upload(file: File) {
    setStage("uploading");
    setMessage("Reading statement…");
    const form = new FormData();
    form.set("statement", file);
    setStage("parsing");
    setMessage("Validating columns and monetary values…");
    const response = await fetch("/api/admin/royalties/import", { method: "POST", body: form });
    const body = await response.json();
    if (!response.ok) {
      setStage("error");
      setMessage(body.error ?? "Import failed.");
      return;
    }
    setStage("matching");
    setMessage(`${body.rowCount.toLocaleString()} rows · ${body.matchedCount.toLocaleString()} matched · ${body.unmatchedCount.toLocaleString()} unmatched`);
    window.setTimeout(() => {
      setStage("done");
      router.push(`/admin/royalties/${body.periodId}`);
      router.refresh();
    }, 650);
  }

  const processing = !["idle", "done", "error"].includes(stage);
  return (
    <div>
      <input ref={inputRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
      <button type="button" onClick={() => inputRef.current?.click()} disabled={processing} className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-foreground px-4 text-sm font-semibold text-background transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-70">
        {processing ? <CircleNotch className="animate-spin" size={17} /> : <UploadSimple size={17} weight="bold" />} Import statement
      </button>
      {stage !== "idle" ? <div className={`mt-3 flex max-w-xl items-start gap-2 rounded-lg border px-3 py-2 text-xs ${stage === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-border bg-muted/50 text-muted-foreground"}`}>{stage === "done" ? <Check className="mt-0.5 shrink-0" /> : stage === "error" ? null : <CircleNotch className="mt-0.5 shrink-0 animate-spin" />}<span>{message}</span></div> : null}
    </div>
  );
}

export function RoyaltyPeriodActions({ periodId, status, unresolved }: { periodId: string; status: string; unresolved: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"calculate" | "publish" | null>(null);
  const [error, setError] = useState("");

  async function run(action: "calculate" | "publish") {
    if (action === "publish" && !window.confirm(`Publish this royalty period?${unresolved ? `\n\n${unresolved} unmatched rows will remain unallocated.` : ""}`)) return;
    setBusy(action);
    setError("");
    const response = await fetch(`/api/admin/royalties/periods/${periodId}/${action}`, { method: "POST", headers: { "content-type": "application/json" }, body: action === "publish" ? JSON.stringify({ approveUnresolved: unresolved > 0 }) : undefined });
    const body = await response.json();
    if (!response.ok) setError(body.error ?? `${action} failed.`);
    else router.refresh();
    setBusy(null);
  }

  return <div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void run("calculate")} disabled={busy !== null || status === "published"} className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-semibold transition hover:bg-muted active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50">{busy === "calculate" ? <CircleNotch className="animate-spin" /> : <FileCsv />}Calculate royalties</button><button type="button" onClick={() => void run("publish")} disabled={busy !== null || !["calculated", "ready_to_publish"].includes(status)} className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-foreground px-3 text-xs font-semibold text-background transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40">{busy === "publish" ? <CircleNotch className="animate-spin" /> : <ArrowRight />}Publish royalties</button></div>{error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}</div>;
}
