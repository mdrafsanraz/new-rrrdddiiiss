"use client";

/**
 * Shared primitives for the Release Builder. Catalog data (genres, outlets,
 * territories, contributor roles, writers, publishers) always comes from
 * live LabelGrid-backed proxies — nothing here hardcodes provider values.
 */

import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import {
  Check,
  Plus,
  Trash,
  UploadSimple,
  WarningCircle,
  Waveform,
  X,
} from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import NumberFlow from "@number-flow/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { WIZARD_STEPS } from "@/lib/releases/wizard-types";

// ---------------------------------------------------------------------------
// Formatting helpers

export const REQUIRED_ARTWORK_SIZE = 3000;

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDuration(sec: number | null) {
  if (sec == null || !Number.isFinite(sec)) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Read a File's pixel dimensions in the browser (no upload needed). */
export async function readImageFileDimensions(
  file: File
): Promise<{ width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const dims = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dims;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Live catalog fetching

export type Outlet = { id: number; name: string; key: string };
export type GenreOption = { id: number; name: string };
export type TerritoryOption = { code: string; name: string };
export type ContributorRole = {
  display_value: string;
  category: string | null;
  description: string | null;
  position: number | null;
};
export type WriterOption = { id: number; first_name: string; last_name: string };
export type PublisherOption = { id: number; name: string };

export type CatalogState<T> = {
  items: T[];
  loaded: boolean;
  error: string | null;
};

/**
 * One-shot fetch of a LabelGrid catalog proxy. `pick` extracts the list
 * from the response body; a non-OK response or network failure surfaces as
 * an error state instead of an eternal "Loading…".
 */
export function useCatalog<T>(
  url: string,
  pick: (data: Record<string, unknown>) => T[] | null
): CatalogState<T> {
  const [catalog, setCatalog] = useState<CatalogState<T>>({
    items: [],
    loaded: false,
    error: null,
  });
  const pickRef = useRef(pick);
  useEffect(() => {
    pickRef.current = pick;
  }, [pick]);

  useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then(async (r) => ({ ok: r.ok, data: await r.json() }))
      .then(({ ok, data }) => {
        if (cancelled) return;
        const items = ok ? pickRef.current(data) : null;
        if (items) {
          setCatalog({ items, loaded: true, error: null });
        } else {
          setCatalog({
            items: [],
            loaded: true,
            error: String(data?.error ?? "Could not load options."),
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCatalog({ items: [], loaded: true, error: "Network error." });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return catalog;
}

/** Standard loading/error/empty shell for catalog-driven option lists. */
export function CatalogStatus({
  catalog,
  emptyLabel,
}: {
  catalog: CatalogState<unknown>;
  emptyLabel: string;
}) {
  if (!catalog.loaded) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (catalog.error) {
    return <p className="text-sm text-destructive">{catalog.error}</p>;
  }
  if (catalog.items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Layout primitives

export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <Card className={cn("p-5 sm:p-6", className)}>{children}</Card>;
}

/** Animated show/hide for an in-flow block (e.g. a collapsible section). */
export function ExpandPanel({
  show,
  children,
}: {
  show: boolean;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {show ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** Animated fade/scale for a floating, absolutely-positioned dropdown panel. */
export function DropdownPanel({
  show,
  className,
  children,
}: {
  show: boolean;
  className?: string;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className={className}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function ChipGroup({
  options,
  value,
  onChange,
}: {
  options: readonly { value: string; label: string }[] | readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const items = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o
  );
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "cursor-pointer border px-3 py-2 text-sm font-medium transition-colors duration-200 ease-[var(--ease-rdistro)]",
            value === o.value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-foreground hover:border-primary/50"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function YesNo({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex gap-2">
        {([true, false] as const).map((v) => (
          <button
            key={String(v)}
            type="button"
            onClick={() => onChange(v)}
            className={cn(
              "cursor-pointer border px-4 py-2 text-sm font-medium transition-colors duration-200 ease-[var(--ease-rdistro)]",
              value === v
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:border-primary/50"
            )}
          >
            {v ? "Yes" : "No"}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-border/60 py-2 text-sm last:border-b-0">
      <dt className="shrink-0 font-medium text-muted-foreground">{label}</dt>
      <dd className="text-right">{value || "—"}</dd>
    </div>
  );
}

/** Inline audio processing status — mirrors LabelGrid's upload_attempt lifecycle. */
export function AudioStatusPill({ status }: { status: "processing" | "failed" }) {
  if (status === "processing") {
    return (
      <span className="inline-flex items-center gap-1.5 border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        <span
          className="size-1.5 animate-pulse rounded-full bg-amber-500"
          aria-hidden
        />
        Processing…
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
      <WarningCircle size={12} weight="fill" aria-hidden />
      Upload failed
    </span>
  );
}

// ---------------------------------------------------------------------------
// Media dropzone (artwork + audio)

export function MediaDropzone({
  id,
  label,
  accept,
  file,
  onFile,
  kind,
  previewUrl,
  helper,
  audioUrl,
  audioStatus,
}: {
  id: string;
  label: string;
  accept: string;
  file: File | null;
  onFile: (file: File | null) => void;
  kind: "image" | "audio";
  previewUrl?: string | null;
  helper?: string;
  audioUrl?: string | null;
  /** LabelGrid async processing state for the currently-stored audio file. */
  audioStatus?: "processing" | "failed" | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const playUrl = kind === "audio" ? (file ? previewUrl : audioUrl) : previewUrl;

  function takeFiles(list: FileList | null) {
    onFile(list?.[0] ?? null);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    takeFiles(e.dataTransfer.files);
  }

  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={onDrop}
        className={cn(
          "relative overflow-hidden border border-dashed transition-colors duration-200 ease-[var(--ease-rdistro)]",
          dragging
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/40 hover:border-primary/50 hover:bg-muted/70",
          kind === "image" ? "min-h-52" : "min-h-32"
        )}
      >
        {kind === "image" && playUrl ? (
          <div className="grid gap-0 sm:grid-cols-[minmax(0,200px)_1fr]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={playUrl}
              alt="Cover preview"
              className="aspect-square w-full bg-muted object-cover"
            />
            <div className="flex flex-col justify-between gap-4 p-5">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {file?.name ?? "Current artwork"}
                </p>
                {file ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatBytes(file.size)}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 px-4"
                  onClick={() => inputRef.current?.click()}
                >
                  Replace
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 px-3 text-destructive"
                  onClick={() => onFile(null)}
                >
                  <Trash size={16} weight="regular" aria-hidden />
                  Remove
                </Button>
              </div>
            </div>
          </div>
        ) : kind === "audio" && (file || audioUrl) ? (
          <div className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center border border-border bg-background text-primary">
                  <Waveform size={22} weight="regular" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold">
                    {file?.name ?? "Uploaded audio"}
                  </p>
                  {file ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatBytes(file.size)}
                    </p>
                  ) : audioStatus ? (
                    <div className="mt-1.5">
                      <AudioStatusPill status={audioStatus} />
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 px-4"
                  onClick={() => inputRef.current?.click()}
                >
                  Replace
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 px-3 text-destructive"
                  onClick={() => onFile(null)}
                >
                  <Trash size={16} weight="regular" aria-hidden />
                  Remove
                </Button>
              </div>
            </div>
            {playUrl ? (
              <audio controls src={playUrl} className="w-full" preload="metadata" />
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full cursor-pointer flex-col items-center justify-center gap-3 px-6 py-12 text-center"
          >
            <span className="flex size-12 items-center justify-center border border-border bg-background text-primary">
              <UploadSimple size={22} weight="regular" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Drop file here, or browse
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {kind === "image"
                  ? `JPEG, PNG, or WebP · exactly ${REQUIRED_ARTWORK_SIZE}×${REQUIRED_ARTWORK_SIZE}px`
                  : "WAV (16/24/32-bit) or FLAC (16-bit)"}
              </p>
            </div>
          </button>
        )}
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(e) => {
            takeFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step rail

export function StepRail({
  step,
  onJump,
}: {
  step: number;
  onJump: (i: number) => void;
}) {
  const reduceMotion = useReducedMotion();
  const progress = ((step + 1) / WIZARD_STEPS.length) * 100;
  const spring = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 380, damping: 32 };

  return (
    <aside className="lg:sticky lg:top-6 lg:self-start">
      <div className="border border-border bg-card p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Step {step + 1} of {WIZARD_STEPS.length}
            </p>
            <p className="mt-1 text-sm font-semibold tracking-tight">
              {WIZARD_STEPS[step].label}
            </p>
          </div>
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            <NumberFlow value={Math.round(progress)} suffix="%" />
          </span>
        </div>
        <div className="mt-4 h-1 overflow-hidden bg-muted">
          <motion.div
            className="h-full bg-primary"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={spring}
          />
        </div>
        <ol className="mt-5 space-y-0.5">
          {WIZARD_STEPS.map((s, i) => {
            const isDone = i < step;
            const isCurrent = i === step;
            return (
              <li key={s.id} className="relative">
                {isCurrent ? (
                  <motion.span
                    layoutId="step-rail-active"
                    transition={spring}
                    className="absolute inset-0 rounded-md bg-primary/10"
                  />
                ) : null}
                <button
                  type="button"
                  disabled={i > step}
                  onClick={() => onJump(i)}
                  aria-current={isCurrent ? "step" : undefined}
                  className={cn(
                    "relative flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors duration-150",
                    isCurrent
                      ? "font-semibold text-foreground"
                      : isDone
                        ? "text-foreground hover:bg-muted"
                        : "cursor-not-allowed text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition-colors duration-150",
                      isDone
                        ? "border-primary bg-primary text-primary-foreground"
                        : isCurrent
                          ? "border-primary text-primary"
                          : "border-border text-muted-foreground"
                    )}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {isDone ? (
                        <motion.span
                          key="check"
                          initial={
                            reduceMotion ? false : { scale: 0.4, opacity: 0 }
                          }
                          animate={{ scale: 1, opacity: 1 }}
                          transition={spring}
                          className="flex"
                        >
                          <Check size={12} weight="bold" />
                        </motion.span>
                      ) : (
                        <span key="num">{i + 1}</span>
                      )}
                    </AnimatePresence>
                  </span>
                  {s.label}
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Entity picker (writers / publishers) — LabelGrid-style search + create

type EntityFieldSpec =
  | { mode: "person" }
  | { mode: "name"; placeholder: string };

/**
 * Searchable select over a per-user LabelGrid entity mapping (writers or
 * publishers) with an inline "Create new" flow. Selecting hands back the
 * real LabelGrid id — the server never guess-matches by name.
 */
export function EntityPicker({
  endpoint,
  spec,
  selectedLabel,
  hasSelection,
  onSelect,
  onClear,
}: {
  /** Proxy base, e.g. "/api/labelgrid/writers". */
  endpoint: string;
  spec: EntityFieldSpec;
  selectedLabel: string;
  hasSelection: boolean;
  onSelect: (entity: { id: number; label: string; first?: string; last?: string }) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<
    Array<{ id: number; label: string; first?: string; last?: string }>
  >([]);
  const [creating, setCreating] = useState(false);
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [saving, setSaving] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      fetch(`${endpoint}?q=${encodeURIComponent(query.trim())}`)
        .then((r) => r.json())
        .then((data) => {
          if (cancelled) return;
          const list = Array.isArray(data.writers)
            ? data.writers.map(
                (w: { id: number; first_name: string; last_name: string }) => ({
                  id: w.id,
                  label: `${w.first_name} ${w.last_name}`.trim(),
                  first: w.first_name,
                  last: w.last_name,
                })
              )
            : Array.isArray(data.publishers)
              ? data.publishers.map((p: { id: number; name: string }) => ({
                  id: p.id,
                  label: p.name,
                }))
              : [];
          setOptions(list);
        })
        .catch(() => {});
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [open, query, endpoint]);

  async function createNew() {
    const isPerson = spec.mode === "person";
    if (isPerson && (!newFirst.trim() || !newLast.trim())) return;
    if (!isPerson && !newFirst.trim()) return;
    if (saving) return;
    setSaving(true);
    setPickerError(null);
    try {
      const body = isPerson
        ? { firstName: newFirst.trim(), lastName: newLast.trim() }
        : { name: newFirst.trim() };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setPickerError(data.error ?? "Could not create.");
        return;
      }
      const created = data.writer
        ? {
            id: data.writer.id as number,
            label: `${data.writer.first_name} ${data.writer.last_name}`.trim(),
            first: data.writer.first_name as string,
            last: data.writer.last_name as string,
          }
        : { id: data.publisher.id as number, label: data.publisher.name as string };
      onSelect(created);
      setOpen(false);
      setCreating(false);
      setNewFirst("");
      setNewLast("");
      setQuery("");
    } catch {
      setPickerError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  if (hasSelection) {
    return (
      <span className="inline-flex items-center gap-2 border border-border bg-muted px-3 py-2 text-sm font-medium">
        {selectedLabel}
        <button
          type="button"
          aria-label="Change selection"
          className="cursor-pointer text-muted-foreground hover:text-foreground"
          onClick={onClear}
        >
          <X size={14} weight="bold" />
        </button>
      </span>
    );
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        placeholder={spec.mode === "person" ? "Search writers" : spec.placeholder}
        className="h-10 w-full border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
      />
      <DropdownPanel
        show={open}
        className="absolute z-20 mt-1 w-full border border-border bg-card shadow-md"
      >
        {creating ? (
            <div className="space-y-2 p-3">
              {spec.mode === "person" ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    type="text"
                    value={newFirst}
                    placeholder="First name"
                    className="h-9 border border-border bg-background px-2 text-sm outline-none focus:border-primary"
                    onChange={(e) => setNewFirst(e.target.value)}
                  />
                  <input
                    type="text"
                    value={newLast}
                    placeholder="Last name"
                    className="h-9 border border-border bg-background px-2 text-sm outline-none focus:border-primary"
                    onChange={(e) => setNewLast(e.target.value)}
                  />
                </div>
              ) : (
                <input
                  type="text"
                  value={newFirst}
                  placeholder={spec.placeholder}
                  className="h-9 w-full border border-border bg-background px-2 text-sm outline-none focus:border-primary"
                  onChange={(e) => setNewFirst(e.target.value)}
                />
              )}
              {pickerError ? (
                <p className="text-xs text-destructive">{pickerError}</p>
              ) : null}
              <div className="flex gap-2">
                <Button
                  type="button"
                  className="h-8 px-3"
                  loading={saving}
                  onClick={() => void createNew()}
                >
                  Add
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 px-3"
                  onClick={() => setCreating(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <ul className="max-h-56 overflow-y-auto py-1 text-sm">
              <li>
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left font-medium text-primary hover:bg-muted"
                  onClick={() => {
                    setCreating(true);
                    if (spec.mode === "person") {
                      const parts = query.trim().split(/\s+/);
                      setNewFirst(parts[0] ?? "");
                      setNewLast(parts.slice(1).join(" "));
                    } else {
                      setNewFirst(query.trim());
                    }
                  }}
                >
                  <Plus size={14} weight="bold" aria-hidden />
                  Create new
                </button>
              </li>
              {options.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    className="w-full cursor-pointer px-3 py-2 text-left hover:bg-muted"
                    onClick={() => {
                      onSelect(o);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    {o.label}
                  </button>
                </li>
              ))}
              {options.length === 0 ? (
                <li className="px-3 py-2 text-muted-foreground">
                  Nothing found.
                </li>
              ) : null}
            </ul>
        )}
      </DropdownPanel>
    </div>
  );
}
