"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  CaretDown,
  Check,
  Disc,
  ImageSquare,
  MusicNotes,
  PencilSimple,
  Plus,
  Trash,
  UploadSimple,
  WarningCircle,
  Waveform,
  X,
} from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/site/field";
import {
  ARTWORK_AI_USAGE,
  COMMERCIAL_SAMPLES,
  COMPOSITION_TYPES,
  CONTRIBUTOR_ROLE_KEYS,
  LOCALES,
  PRIMARY_GENRES,
} from "@/lib/releases/constants";
import {
  WIZARD_STEPS,
  newContributor,
  newTrack,
  type WizardState,
  type WizardTrack,
} from "@/lib/releases/wizard-types";
import { cn } from "@/lib/utils";

type ArtistOption = { id: string; name: string; locked: boolean };

type Outlet = { id: number; name: string; key: string };

type SaveStatus = "idle" | "saving" | "saved" | "error";

const currentYear = new Date().getFullYear();

const COMMON_COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "NL", name: "Netherlands" },
  { code: "SE", name: "Sweden" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "IN", name: "India" },
  { code: "BD", name: "Bangladesh" },
  { code: "NG", name: "Nigeria" },
] as const;

const EXPLICIT_FRIENDLY = [
  { value: "off" as const, label: "No" },
  { value: "on" as const, label: "Yes" },
  { value: "edited" as const, label: "Clean" },
];

const CONTENT_TYPE_OPTIONS = ["Single", "EP", "Album"] as const;

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(sec: number | null) {
  if (sec == null || !Number.isFinite(sec)) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function initialState(
  artists: ArtistOption[],
  defaultArtistId?: string
): WizardState {
  const artistId =
    defaultArtistId && artists.some((a) => a.id === defaultArtistId)
      ? defaultArtistId
      : (artists[0]?.id ?? "");
  const artistName = artists.find((a) => a.id === artistId)?.name ?? "";
  return {
    releaseId: null,
    step: 0,
    artworkFile: null,
    artworkUrl: null,
    artworkPreview: null,
    title: "",
    artistId,
    contentType: "Single",
    primaryGenre: "Pop",
    secondaryGenre: "",
    releaseDate: "",
    upc: "",
    mixVersion: "",
    preferredLocalization: "en",
    artworkAiUsage: "none",
    explicit: "off",
    tracks: [newTrack()],
    contributors: [newContributor()],
    clineYear: String(currentYear),
    clineName: artistName,
    plineYear: String(currentYear),
    plineName: artistName,
    hasSamples: false,
    isRemix: false,
    allStores: true,
    selectedOutletIds: [],
    worldwide: true,
    territoryCodes: [],
    rightsConfirmed: false,
  };
}

function MediaDropzone({
  id,
  label,
  accept,
  file,
  onFile,
  kind,
  previewUrl,
  helper,
  audioUrl,
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
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const playUrl =
    kind === "audio"
      ? file
        ? previewUrl
        : audioUrl
      : previewUrl;

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
          "relative overflow-hidden border border-dashed transition-colors duration-200",
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
                  ? "JPEG, PNG, or WebP · square preferred"
                  : "WAV, FLAC, or MP3"}
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
      {helper ? (
        <p className="text-xs text-muted-foreground">{helper}</p>
      ) : null}
    </div>
  );
}

function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border border-border bg-card p-5 sm:p-6", className)}>
      {children}
    </div>
  );
}

function ChipGroup({
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
            "cursor-pointer border px-3 py-2 text-sm font-medium transition-colors",
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

function YesNo({
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
              "cursor-pointer border px-4 py-2 text-sm font-medium transition-colors",
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

function StepRail({
  step,
  onJump,
}: {
  step: number;
  onJump: (i: number) => void;
}) {
  const progress = ((step + 1) / WIZARD_STEPS.length) * 100;
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
          <p className="font-mono text-xs tabular-nums text-muted-foreground">
            {Math.round(progress)}%
          </p>
        </div>
        <div className="mt-4 h-1 bg-muted">
          <div
            className="h-full bg-primary transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <ol className="mt-5 space-y-1">
          {WIZARD_STEPS.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                disabled={i > step}
                onClick={() => onJump(i)}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-3 px-2 py-2 text-left text-sm transition-colors",
                  i === step
                    ? "bg-primary/10 font-semibold text-foreground"
                    : i < step
                      ? "text-foreground hover:bg-muted"
                      : "cursor-not-allowed text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center border text-xs font-medium",
                    i < step
                      ? "border-primary bg-primary text-primary-foreground"
                      : i === step
                        ? "border-primary text-primary"
                        : "border-border text-muted-foreground"
                  )}
                >
                  {i < step ? <Check size={12} weight="bold" /> : i + 1}
                </span>
                {s.label}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}

function TrackAudioDropzone({
  track,
  onFile,
}: {
  track: WizardTrack;
  onFile: (file: File | null) => void;
}) {
  const localPreview = useMemo(() => {
    if (!track.audioFile) return null;
    return URL.createObjectURL(track.audioFile);
  }, [track.audioFile]);

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  return (
    <MediaDropzone
      id={`audio-${track.clientId}`}
      label="Audio"
      accept="audio/wav,audio/flac,audio/mpeg,audio/x-wav,.wav,.flac,.mp3"
      kind="audio"
      file={track.audioFile}
      audioUrl={track.audioUrl}
      previewUrl={localPreview}
      onFile={onFile}
    />
  );
}

function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-border py-3 last:border-0 sm:grid-cols-[140px_1fr] sm:gap-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{value || "—"}</dd>
    </div>
  );
}

function validateStep(state: WizardState, step: number): string | null {
  if (step === 0) {
    if (!state.artworkFile && !state.artworkUrl) {
      return "Please add cover artwork.";
    }
    if (!state.title.trim()) return "Please enter a release title.";
    if (!state.artistId) return "Please select an artist.";
    if (!state.primaryGenre) return "Please choose a primary genre.";
    if (!state.releaseDate) return "Please choose a release date.";
    return null;
  }
  if (step === 1) {
    if (!state.tracks.length) return "Please add at least one track.";
    for (let i = 0; i < state.tracks.length; i++) {
      const t = state.tracks[i];
      if (!t.title.trim()) {
        return `Please enter a title for track ${i + 1}.`;
      }
      if (!t.audioFile && !t.audioUrl) {
        return `Please upload audio for “${t.title.trim() || `track ${i + 1}`}”.`;
      }
    }
    return null;
  }
  if (step === 2) {
    const ok = state.contributors.some(
      (c) => c.firstName.trim() && c.lastName.trim() && c.roles.length > 0
    );
    if (!ok) return "Add at least one songwriter with a name and role.";
    if (!state.clineName.trim() || !state.plineName.trim()) {
      return "Please fill in © and ℗ credit names.";
    }
    if (!state.clineYear.trim() || !state.plineYear.trim()) {
      return "Please fill in © and ℗ years.";
    }
    return null;
  }
  if (step === 3) {
    if (!state.allStores && state.selectedOutletIds.length === 0) {
      return "Select all stores, or choose at least one store.";
    }
    if (!state.worldwide && state.territoryCodes.length === 0) {
      return "Choose worldwide, or select at least one territory.";
    }
    return null;
  }
  if (step === 4) {
    if (!state.rightsConfirmed) {
      return "Please confirm you have the rights to distribute this release.";
    }
    return null;
  }
  return null;
}

function buildPayload(state: WizardState) {
  const validContributors = state.contributors
    .filter((c) => c.firstName.trim() && c.lastName.trim() && c.roles.length)
    .map((c) => ({
      firstName: c.firstName.trim(),
      lastName: c.lastName.trim(),
      roles: c.roles,
    }));

  const tracks = state.tracks.map((t, i) => ({
    id: t.id,
    clientId: t.clientId,
    title: t.title.trim() || state.title.trim() || `Track ${i + 1}`,
    mixVersion: t.mixVersion,
    isrc: t.isrc,
    compositionType: t.compositionType,
    explicit: t.explicit,
    audioAiUsage: t.audioAiUsage,
    compositionAiUsage: t.compositionAiUsage,
    commercialSamples: t.commercialSamples,
    audioLanguage: t.audioLanguage || state.preferredLocalization || "en",
    featuredArtistNames: t.featuredArtistNames,
    hasMechanicalLicense: t.hasMechanicalLicense,
    lyrics: t.lyrics,
    contributors: validContributors,
  }));

  return {
    artistId: state.artistId,
    title: state.title.trim(),
    contentType: state.contentType,
    primaryGenre: state.primaryGenre,
    secondaryGenre: state.secondaryGenre,
    releaseDate: state.releaseDate || "",
    upc: state.upc,
    mixVersion: state.mixVersion,
    preferredLocalization: state.preferredLocalization,
    artworkAiUsage: state.artworkAiUsage,
    explicit: state.explicit,
    clineYear: state.clineYear,
    clineName: state.clineName,
    plineYear: state.plineYear,
    plineName: state.plineName,
    allStores: state.allStores,
    selectedOutletIds: state.selectedOutletIds,
    worldwide: state.worldwide,
    territoryCodes: state.territoryCodes,
    tracks,
    contributors: validContributors,
  };
}

export function ReleaseBuilder({
  artists,
  defaultArtistId,
}: {
  artists: ArtistOption[];
  defaultArtistId?: string;
}) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const errorRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<WizardState>(initialState(artists, defaultArtistId));
  const skipAutosave = useRef(true);
  const createInFlight = useRef<Promise<string | null> | null>(null);

  const [state, setState] = useState<WizardState>(() =>
    initialState(artists, defaultArtistId)
  );
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [storesManual, setStoresManual] = useState(false);
  const [territoriesOpen, setTerritoriesOpen] = useState(false);
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [audioAiUsed, setAudioAiUsed] = useState(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const patch = useCallback((partial: Partial<WizardState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const updateTrack = useCallback(
    (clientId: string, partial: Partial<WizardTrack>) => {
      setState((prev) => ({
        ...prev,
        tracks: prev.tracks.map((t) =>
          t.clientId === clientId ? { ...t, ...partial } : t
        ),
      }));
    },
    []
  );

  // Revoke artwork object URLs when the file changes
  useEffect(() => {
    const url = state.artworkPreview;
    return () => {
      if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
    };
  }, [state.artworkPreview]);

  // Load outlets
  useEffect(() => {
    let cancelled = false;
    fetch("/api/labelgrid/outlets")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data.outlets)) {
          setOutlets(
            data.outlets.map((o: Outlet) => ({
              id: o.id,
              name: o.name,
              key: o.key,
            }))
          );
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  async function createDraft(current: WizardState): Promise<string | null> {
    if (current.releaseId) return current.releaseId;
    if (createInFlight.current) return createInFlight.current;

    const run = (async () => {
      setSaveStatus("saving");
      try {
        const fd = new FormData();
        fd.set(
          "payload",
          JSON.stringify({
            artistId: current.artistId,
            title: current.title.trim(),
            contentType: current.contentType,
            primaryGenre: current.primaryGenre,
            releaseDate: current.releaseDate || "",
            upc: current.upc,
            mixVersion: current.mixVersion,
            preferredLocalization: current.preferredLocalization,
            artworkAiUsage: current.artworkAiUsage,
            explicit: current.explicit,
            secondaryGenre: current.secondaryGenre,
            clineYear: current.clineYear,
            clineName: current.clineName,
            plineYear: current.plineYear,
            plineName: current.plineName,
            allStores: current.allStores,
            selectedOutletIds: current.selectedOutletIds,
            worldwide: current.worldwide,
            territoryCodes: current.territoryCodes,
          })
        );
        if (current.artworkFile) fd.set("artwork", current.artworkFile);
        const res = await fetch("/api/releases/drafts", {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        if (!res.ok) {
          setSaveStatus("error");
          setError(data.error ?? "Could not create draft");
          return null;
        }
        const id = data.release.id as string;
        setState((prev) => ({
          ...prev,
          releaseId: id,
          artworkUrl: data.release.artworkUrl ?? prev.artworkUrl,
          artworkFile: null,
        }));
        setSaveStatus("saved");
        return id;
      } catch {
        setSaveStatus("error");
        setError("Network error while saving draft.");
        return null;
      } finally {
        createInFlight.current = null;
      }
    })();

    createInFlight.current = run;
    return run;
  }

  async function saveDraft(
    current: WizardState,
    opts?: { forceArtwork?: boolean }
  ): Promise<boolean> {
    let id = current.releaseId;
    if (!id) {
      id = await createDraft(current);
      if (!id) return false;
      current = { ...stateRef.current, releaseId: id };
    }

    setSaveStatus("saving");
    try {
      const fd = new FormData();
      fd.set("payload", JSON.stringify(buildPayload(current)));
      if (current.artworkFile) fd.set("artwork", current.artworkFile);
      for (const t of current.tracks) {
        if (t.audioFile) fd.set(`audio_${t.clientId}`, t.audioFile);
      }
      const res = await fetch(`/api/releases/${id}/draft`, {
        method: "PATCH",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveStatus("error");
        if (opts?.forceArtwork) setError(data.error ?? "Save failed");
        return false;
      }

      const release = data.release;
      setState((prev) => {
        const byClient = new Map(prev.tracks.map((t) => [t.clientId, t]));
        const nextTracks: WizardTrack[] =
          Array.isArray(release.tracks) && release.tracks.length
            ? release.tracks.map(
                (
                  rt: { id: string; title: string; audioUrl: string | null },
                  i: number
                ) => {
                  const existing =
                    prev.tracks[i] ??
                    [...byClient.values()].find(
                      (t) => t.title === rt.title
                    ) ??
                    newTrack();
                  return {
                    ...existing,
                    id: rt.id,
                    title: existing.title || rt.title,
                    audioUrl: rt.audioUrl ?? existing.audioUrl,
                    audioFile: null,
                  };
                }
              )
            : prev.tracks.map((t) => ({
                ...t,
                audioFile: t.audioFile ? null : t.audioFile,
              }));

        return {
          ...prev,
          releaseId: release.id,
          artworkUrl: release.artworkUrl ?? prev.artworkUrl,
          artworkFile: null,
          tracks: nextTracks,
        };
      });
      setSaveStatus("saved");
      return true;
    } catch {
      setSaveStatus("error");
      return false;
    }
  }

  // Debounced autosave after draft exists
  useEffect(() => {
    if (skipAutosave.current) {
      skipAutosave.current = false;
      return;
    }
    if (!state.releaseId) return;

    const t = window.setTimeout(() => {
      void saveDraft(stateRef.current);
    }, 1200);
    return () => window.clearTimeout(t);
    // Intentionally depend on serialized draft-relevant fields
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.releaseId,
    state.title,
    state.artistId,
    state.contentType,
    state.primaryGenre,
    state.secondaryGenre,
    state.releaseDate,
    state.upc,
    state.mixVersion,
    state.preferredLocalization,
    state.artworkAiUsage,
    state.explicit,
    state.clineYear,
    state.clineName,
    state.plineYear,
    state.plineName,
    state.allStores,
    state.selectedOutletIds,
    state.worldwide,
    state.territoryCodes,
    state.tracks,
    state.contributors,
    state.artworkFile,
    state.hasSamples,
    state.isRemix,
  ]);

  async function ensureDraftThenContinue() {
    setError("");
    const msg = validateStep(state, state.step);
    if (msg) {
      setError(msg);
      return;
    }

    if (state.step === 0 && !state.releaseId) {
      const id = await createDraft(stateRef.current);
      if (!id) return;
    } else if (state.releaseId) {
      await saveDraft(stateRef.current);
    }

    setState((prev) => {
      const nextStep = Math.min(prev.step + 1, WIZARD_STEPS.length - 1);
      if (prev.contentType === "Single") {
        const t0 = prev.tracks[0] ?? newTrack();
        return {
          ...prev,
          step: nextStep,
          tracks: [{ ...t0, title: t0.title || prev.title }],
        };
      }
      return { ...prev, step: nextStep };
    });
    if (state.step === 0) {
      setEditingTrackId((prev) => prev ?? state.tracks[0]?.clientId ?? null);
    }
  }

  async function saveAndExit() {
    setError("");
    const ok = state.releaseId
      ? await saveDraft(stateRef.current)
      : Boolean(await createDraft(stateRef.current));
    if (!ok && !stateRef.current.releaseId) return;
    if (state.releaseId || stateRef.current.releaseId) {
      await saveDraft(stateRef.current);
    }
    router.push("/dashboard/releases");
  }

  async function submitForReview() {
    setError("");
    const msg = validateStep(state, 4);
    if (msg) {
      setError(msg);
      return;
    }
    for (let s = 0; s <= 3; s++) {
      const early = validateStep(state, s);
      if (early) {
        setError(early);
        patch({ step: s });
        return;
      }
    }

    setSubmitting(true);
    try {
      const saved = await saveDraft(stateRef.current, { forceArtwork: true });
      if (!saved) {
        setSubmitting(false);
        return;
      }
      const id = stateRef.current.releaseId;
      if (!id) {
        setError("Draft missing — try Save & Exit, then reopen.");
        setSubmitting(false);
        return;
      }
      const res = await fetch(`/api/releases/${id}/submit-for-review`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Submit failed");
        setSubmitting(false);
        return;
      }
      router.push(`/dashboard/releases/${id}`);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setSubmitting(false);
    }
  }

  function applySamples(yes: boolean) {
    setState((prev) => ({
      ...prev,
      hasSamples: yes,
      tracks: prev.tracks.map((t) => ({
        ...t,
        commercialSamples: yes
          ? t.commercialSamples === "no"
            ? "exclusive"
            : t.commercialSamples
          : "no",
        hasMechanicalLicense:
          yes || t.compositionType === "cover_song"
            ? true
            : t.hasMechanicalLicense,
        licenseType: yes
          ? "sample"
          : t.compositionType === "cover_song"
            ? "cover"
            : null,
      })),
    }));
  }

  function applyRemix(yes: boolean) {
    setState((prev) => ({
      ...prev,
      isRemix: yes,
      tracks: prev.tracks.map((t) => ({
        ...t,
        compositionType: yes ? "cover_song" : t.compositionType,
        hasMechanicalLicense: yes ? true : t.hasMechanicalLicense,
        licenseType: yes
          ? "cover"
          : t.commercialSamples !== "no"
            ? "sample"
            : null,
      })),
    }));
  }

  function applyAudioAi(yes: boolean) {
    setAudioAiUsed(yes);
    setState((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => ({
        ...t,
        audioAiUsage: yes ? (t.audioAiUsage === "none" ? "some" : t.audioAiUsage) : "none",
        compositionAiUsage: yes
          ? t.compositionAiUsage === "none"
            ? "some"
            : t.compositionAiUsage
          : "none",
      })),
    }));
  }

  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const };

  const stepMeta = WIZARD_STEPS[state.step];
  const artist = artists.find((a) => a.id === state.artistId);

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
      <StepRail
        step={state.step}
        onJump={(i) => {
          if (i <= state.step) patch({ step: i });
        }}
      />

      <div className="mx-auto min-w-0 w-full max-w-3xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">
              {stepMeta.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {state.step === 0
                ? "Add the basic information listeners will see on music services."
                : state.step === 1
                  ? "Upload masters and fill in track details."
                  : state.step === 2
                    ? "Songwriters, copyright, and rights questions."
                    : state.step === 3
                      ? "Pick stores and territories for this release."
                      : "Confirm everything looks right before sending to review."}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {saveStatus === "saving" ? (
              <span className="font-medium text-foreground">Saving…</span>
            ) : saveStatus === "saved" ? (
              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                <Check size={12} weight="bold" aria-hidden />
                Saved
              </span>
            ) : saveStatus === "error" ? (
              <span className="text-destructive">Save failed</span>
            ) : null}
            <button
              type="button"
              onClick={() => void saveAndExit()}
              className="cursor-pointer font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Save & Exit
            </button>
          </div>
        </div>

        {error ? (
          <div
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="border border-destructive/40 bg-destructive/5 px-4 py-3 outline-none"
          >
            <div className="flex items-start gap-3">
              <WarningCircle
                size={20}
                weight="fill"
                className="mt-0.5 shrink-0 text-destructive"
                aria-hidden
              />
              <p className="text-sm text-destructive/90">{error}</p>
              <button
                type="button"
                className="ml-auto cursor-pointer p-1 text-destructive/70 hover:text-destructive"
                onClick={() => setError("")}
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ) : null}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={state.step}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
            transition={transition}
            className="space-y-5"
          >
            {state.step === 0 ? (
              <>
                <Panel>
                  <MediaDropzone
                    id="artwork"
                    label="Cover artwork"
                    accept="image/jpeg,image/png,image/webp"
                    kind="image"
                    file={state.artworkFile}
                    previewUrl={
                      state.artworkPreview ?? state.artworkUrl
                    }
                    onFile={(file) =>
                      patch({
                        artworkFile: file,
                        artworkPreview: file
                          ? URL.createObjectURL(file)
                          : null,
                        artworkUrl: file ? state.artworkUrl : null,
                      })
                    }
                    helper="Square cover recommended (min 1400×1400)."
                  />
                </Panel>

                <Panel className="space-y-5">
                  <Field
                    id="title"
                    label="Title"
                    required
                    value={state.title}
                    onChange={(e) => patch({ title: e.target.value })}
                    placeholder="Release title"
                  />

                  <div className="grid gap-2">
                    <p className="text-sm font-medium">Artist</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {artists.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() =>
                            patch({
                              artistId: a.id,
                              clineName: state.clineName || a.name,
                              plineName: state.plineName || a.name,
                            })
                          }
                          className={cn(
                            "flex cursor-pointer items-center gap-3 border px-4 py-3 text-left transition-colors",
                            state.artistId === a.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/40"
                          )}
                        >
                          <span className="flex size-9 items-center justify-center border border-border bg-muted text-primary">
                            <Disc size={18} weight="regular" aria-hidden />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">
                              {a.name}
                            </span>
                            {a.locked ? (
                              <span className="text-xs text-muted-foreground">
                                Locked after prior release
                              </span>
                            ) : null}
                          </span>
                          {state.artistId === a.id ? (
                            <Check
                              size={16}
                              weight="bold"
                              className="ml-auto shrink-0 text-primary"
                            />
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <p className="text-sm font-medium">Release type</p>
                    <ChipGroup
                      options={[...CONTENT_TYPE_OPTIONS]}
                      value={state.contentType}
                      onChange={(v) => {
                        const contentType = v as WizardState["contentType"];
                        setState((prev) => {
                          let tracks = prev.tracks;
                          if (contentType === "Single") {
                            const t0 = prev.tracks[0] ?? newTrack();
                            tracks = [
                              { ...t0, title: t0.title || prev.title },
                            ];
                            setEditingTrackId(tracks[0]?.clientId ?? null);
                          }
                          return { ...prev, contentType, tracks };
                        });
                      }}
                    />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field
                      id="primaryGenre"
                      label="Primary genre"
                      as="select"
                      required
                      value={state.primaryGenre}
                      onChange={(e) =>
                        patch({ primaryGenre: e.target.value })
                      }
                    >
                      {PRIMARY_GENRES.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </Field>
                    <Field
                      id="secondaryGenre"
                      label="Secondary genre"
                      as="select"
                      value={state.secondaryGenre}
                      onChange={(e) =>
                        patch({ secondaryGenre: e.target.value })
                      }
                      helper="Optional"
                    >
                      <option value="">None</option>
                      {PRIMARY_GENRES.filter(
                        (g) => g !== state.primaryGenre
                      ).map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </Field>
                  </div>

                  <Field
                    id="releaseDate"
                    label="Release date"
                    type="date"
                    required
                    value={state.releaseDate}
                    onChange={(e) => patch({ releaseDate: e.target.value })}
                  />

                  <Field
                    id="upc"
                    label="UPC"
                    value={state.upc}
                    maxLength={13}
                    onChange={(e) => patch({ upc: e.target.value })}
                    helper="Already have a UPC? Enter it here. Otherwise, we'll assign one."
                    placeholder="Optional"
                  />

                  <div className="border-t border-border pt-4">
                    <button
                      type="button"
                      onClick={() => setAdvancedOpen((o) => !o)}
                      className="flex w-full cursor-pointer items-center justify-between text-sm font-medium"
                    >
                      Advanced
                      <CaretDown
                        size={16}
                        className={cn(
                          "transition-transform",
                          advancedOpen && "rotate-180"
                        )}
                      />
                    </button>
                    {advancedOpen ? (
                      <div className="mt-4 grid gap-5 sm:grid-cols-2">
                        <Field
                          id="mixVersion"
                          label="Mix / version"
                          value={state.mixVersion}
                          onChange={(e) =>
                            patch({ mixVersion: e.target.value })
                          }
                          placeholder="e.g. Radio Edit"
                        />
                        <Field
                          id="language"
                          label="Language"
                          as="select"
                          value={state.preferredLocalization}
                          onChange={(e) =>
                            patch({
                              preferredLocalization: e.target.value,
                            })
                          }
                        >
                          {LOCALES.map((l) => (
                            <option key={l.value} value={l.value}>
                              {l.label}
                            </option>
                          ))}
                        </Field>
                        <Field
                          id="artworkAi"
                          label="Artwork AI usage"
                          as="select"
                          value={state.artworkAiUsage}
                          onChange={(e) =>
                            patch({
                              artworkAiUsage: e.target
                                .value as WizardState["artworkAiUsage"],
                            })
                          }
                        >
                          {ARTWORK_AI_USAGE.map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </Field>
                      </div>
                    ) : null}
                  </div>
                </Panel>
              </>
            ) : null}

            {state.step === 1 ? (
              <Panel className="space-y-4">
                <div className="space-y-2">
                  {state.tracks.map((t, i) => (
                    <div
                      key={t.clientId}
                      className="border border-border"
                    >
                      <div className="flex items-center gap-3 px-4 py-3">
                        <span className="flex size-8 shrink-0 items-center justify-center border border-border bg-muted text-xs font-semibold">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {t.title.trim() || "Untitled track"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDuration(t.audioDurationSec)}
                            {t.audioFile || t.audioUrl
                              ? " · Audio ready"
                              : " · No audio"}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 px-3"
                          onClick={() =>
                            setEditingTrackId(
                              editingTrackId === t.clientId
                                ? null
                                : t.clientId
                            )
                          }
                        >
                          <PencilSimple size={14} weight="bold" aria-hidden />
                          Edit
                        </Button>
                        {state.contentType !== "Single" &&
                        state.tracks.length > 1 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-9 px-2 text-destructive"
                            onClick={() =>
                              setState((prev) => ({
                                ...prev,
                                tracks: prev.tracks.filter(
                                  (x) => x.clientId !== t.clientId
                                ),
                              }))
                            }
                            aria-label="Remove track"
                          >
                            <Trash size={16} />
                          </Button>
                        ) : null}
                      </div>

                      {editingTrackId === t.clientId ? (
                        <div className="space-y-5 border-t border-border bg-muted/30 p-4 sm:p-5">
                          <TrackAudioDropzone
                            track={t}
                            onFile={(file) => {
                              if (!file) {
                                updateTrack(t.clientId, {
                                  audioFile: null,
                                  audioUrl: null,
                                  audioDurationSec: null,
                                });
                                return;
                              }
                              updateTrack(t.clientId, { audioFile: file });
                              const url = URL.createObjectURL(file);
                              const audio = new Audio(url);
                              audio.addEventListener("loadedmetadata", () => {
                                updateTrack(t.clientId, {
                                  audioDurationSec: Number.isFinite(
                                    audio.duration
                                  )
                                    ? audio.duration
                                    : null,
                                });
                                URL.revokeObjectURL(url);
                              });
                            }}
                          />

                          <Field
                            id={`track-title-${t.clientId}`}
                            label="Track title"
                            required
                            value={t.title}
                            onChange={(e) =>
                              updateTrack(t.clientId, {
                                title: e.target.value,
                              })
                            }
                          />

                          <Field
                            id={`isrc-${t.clientId}`}
                            label="ISRC"
                            value={t.isrc}
                            maxLength={15}
                            onChange={(e) =>
                              updateTrack(t.clientId, {
                                isrc: e.target.value,
                              })
                            }
                            helper="Already have an ISRC? Enter it here. Otherwise, we'll assign one."
                            placeholder="Optional"
                          />

                          <div className="grid gap-2">
                            <p className="text-sm font-medium">Explicit</p>
                            <ChipGroup
                              options={EXPLICIT_FRIENDLY}
                              value={t.explicit}
                              onChange={(v) =>
                                updateTrack(t.clientId, {
                                  explicit: v as WizardTrack["explicit"],
                                })
                              }
                            />
                          </div>

                          <div className="grid gap-2">
                            <p className="text-sm font-medium">Composition</p>
                            <ChipGroup
                              options={COMPOSITION_TYPES.map((c) => ({
                                value: c.value,
                                label: c.label
                                  .replace(" composition", "")
                                  .replace(" song", ""),
                              }))}
                              value={t.compositionType}
                              onChange={(v) =>
                                updateTrack(t.clientId, {
                                  compositionType:
                                    v as WizardTrack["compositionType"],
                                  hasMechanicalLicense:
                                    v === "cover_song" ||
                                    t.commercialSamples !== "no",
                                  licenseType:
                                    v === "cover_song"
                                      ? "cover"
                                      : t.commercialSamples !== "no"
                                        ? "sample"
                                        : null,
                                })
                              }
                            />
                          </div>

                          <Field
                            id={`version-${t.clientId}`}
                            label="Version"
                            value={t.mixVersion}
                            onChange={(e) =>
                              updateTrack(t.clientId, {
                                mixVersion: e.target.value,
                              })
                            }
                            placeholder="Optional"
                          />

                          <div className="grid gap-5 sm:grid-cols-2">
                            <Field
                              id={`audio-ai-${t.clientId}`}
                              label="Audio AI usage"
                              as="select"
                              value={t.audioAiUsage}
                              onChange={(e) =>
                                updateTrack(t.clientId, {
                                  audioAiUsage: e.target
                                    .value as WizardTrack["audioAiUsage"],
                                })
                              }
                            >
                              {ARTWORK_AI_USAGE.map((v) => (
                                <option key={v} value={v}>
                                  {v}
                                </option>
                              ))}
                            </Field>
                            <Field
                              id={`comp-ai-${t.clientId}`}
                              label="Composition AI usage"
                              as="select"
                              value={t.compositionAiUsage}
                              onChange={(e) =>
                                updateTrack(t.clientId, {
                                  compositionAiUsage: e.target
                                    .value as WizardTrack["compositionAiUsage"],
                                })
                              }
                            >
                              {ARTWORK_AI_USAGE.map((v) => (
                                <option key={v} value={v}>
                                  {v}
                                </option>
                              ))}
                            </Field>
                          </div>

                          <Field
                            id={`samples-${t.clientId}`}
                            label="Commercial samples"
                            as="select"
                            value={t.commercialSamples}
                            onChange={(e) => {
                              const v = e.target
                                .value as WizardTrack["commercialSamples"];
                              updateTrack(t.clientId, {
                                commercialSamples: v,
                                hasMechanicalLicense:
                                  v !== "no" ||
                                  t.compositionType === "cover_song",
                                licenseType:
                                  v !== "no"
                                    ? "sample"
                                    : t.compositionType === "cover_song"
                                      ? "cover"
                                      : null,
                              });
                            }}
                          >
                            {COMMERCIAL_SAMPLES.map((c) => (
                              <option key={c.value} value={c.value}>
                                {c.label}
                              </option>
                            ))}
                          </Field>

                          {t.compositionType === "cover_song" ||
                          t.commercialSamples !== "no" ? (
                            <div className="border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                              <p className="font-medium text-foreground">
                                License document
                              </p>
                              <p className="mt-1">
                                You&apos;ll be able to upload cover/sample
                                clearance docs from the release detail page
                                after submit. Keep your license file ready.
                              </p>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>

                {state.contentType !== "Single" ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-full sm:w-auto"
                    onClick={() => {
                      const t = newTrack();
                      setState((prev) => ({
                        ...prev,
                        tracks: [...prev.tracks, t],
                      }));
                      setEditingTrackId(t.clientId);
                    }}
                  >
                    <Plus size={16} weight="bold" aria-hidden />
                    Add another track
                  </Button>
                ) : null}
              </Panel>
            ) : null}

            {state.step === 2 ? (
              <div className="space-y-5">
                <Panel className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">Songwriters</p>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 px-3"
                      onClick={() =>
                        setState((prev) => ({
                          ...prev,
                          contributors: [
                            ...prev.contributors,
                            newContributor(),
                          ],
                        }))
                      }
                    >
                      <Plus size={14} weight="bold" aria-hidden />
                      Add
                    </Button>
                  </div>
                  {state.contributors.map((c) => (
                    <div
                      key={c.id}
                      className="space-y-4 border border-border p-4"
                    >
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                          id={`fn-${c.id}`}
                          label="First name"
                          value={c.firstName}
                          onChange={(e) =>
                            setState((prev) => ({
                              ...prev,
                              contributors: prev.contributors.map((x) =>
                                x.id === c.id
                                  ? { ...x, firstName: e.target.value }
                                  : x
                              ),
                            }))
                          }
                        />
                        <Field
                          id={`ln-${c.id}`}
                          label="Last name"
                          value={c.lastName}
                          onChange={(e) =>
                            setState((prev) => ({
                              ...prev,
                              contributors: prev.contributors.map((x) =>
                                x.id === c.id
                                  ? { ...x, lastName: e.target.value }
                                  : x
                              ),
                            }))
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <p className="text-sm font-medium">Roles</p>
                        <div className="flex flex-wrap gap-2">
                          {CONTRIBUTOR_ROLE_KEYS.map((role) => {
                            const on = c.roles.includes(role);
                            return (
                              <button
                                key={role}
                                type="button"
                                onClick={() =>
                                  setState((prev) => ({
                                    ...prev,
                                    contributors: prev.contributors.map(
                                      (x) => {
                                        if (x.id !== c.id) return x;
                                        const roles = on
                                          ? x.roles.filter((r) => r !== role)
                                          : [...x.roles, role];
                                        return { ...x, roles };
                                      }
                                    ),
                                  }))
                                }
                                className={cn(
                                  "cursor-pointer border px-3 py-1.5 text-xs font-medium",
                                  on
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border hover:border-primary/50"
                                )}
                              >
                                {role}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      {state.contributors.length > 1 ? (
                        <button
                          type="button"
                          className="cursor-pointer text-xs font-medium text-destructive"
                          onClick={() =>
                            setState((prev) => ({
                              ...prev,
                              contributors: prev.contributors.filter(
                                (x) => x.id !== c.id
                              ),
                            }))
                          }
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  ))}
                </Panel>

                <Panel className="space-y-5">
                  <p className="text-sm font-semibold">Copyright</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      id="clineYear"
                      label="© Year"
                      value={state.clineYear}
                      onChange={(e) => patch({ clineYear: e.target.value })}
                    />
                    <Field
                      id="clineName"
                      label="© Name"
                      value={state.clineName}
                      onChange={(e) => patch({ clineName: e.target.value })}
                    />
                    <Field
                      id="plineYear"
                      label="℗ Year"
                      value={state.plineYear}
                      onChange={(e) => patch({ plineYear: e.target.value })}
                    />
                    <Field
                      id="plineName"
                      label="℗ Name"
                      value={state.plineName}
                      onChange={(e) => patch({ plineName: e.target.value })}
                    />
                  </div>
                </Panel>

                <Panel className="space-y-5">
                  <p className="text-sm font-semibold">Rights</p>
                  <YesNo
                    label="Does this release use samples?"
                    value={state.hasSamples}
                    onChange={applySamples}
                  />
                  <YesNo
                    label="Is this a remix of someone else's recording?"
                    value={state.isRemix}
                    onChange={applyRemix}
                  />
                  <YesNo
                    label="Was AI used for the audio?"
                    value={audioAiUsed}
                    onChange={applyAudioAi}
                  />
                </Panel>
              </div>
            ) : null}

            {state.step === 3 ? (
              <div className="space-y-5">
                <Panel className="space-y-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 size-4 accent-primary"
                      checked={state.allStores}
                      onChange={(e) => {
                        const on = e.target.checked;
                        patch({
                          allStores: on,
                          selectedOutletIds: on
                            ? []
                            : state.selectedOutletIds,
                        });
                        if (on) setStoresManual(false);
                      }}
                    />
                    <span>
                      <span className="block text-sm font-semibold">
                        All available stores
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        Distribute to every outlet we currently support.
                      </span>
                    </span>
                  </label>

                  <div className="border-t border-border pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setStoresManual((o) => !o);
                        if (!storesManual) {
                          patch({ allStores: false });
                        }
                      }}
                      className="flex w-full cursor-pointer items-center justify-between text-sm font-medium"
                    >
                      Choose stores manually
                      <CaretDown
                        size={16}
                        className={cn(
                          "transition-transform",
                          storesManual && "rotate-180"
                        )}
                      />
                    </button>
                    {storesManual || !state.allStores ? (
                      <div className="mt-4 grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
                        {outlets.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Loading stores…
                          </p>
                        ) : (
                          outlets.map((o) => {
                            const on = state.selectedOutletIds.includes(o.id);
                            return (
                              <label
                                key={o.id}
                                className="flex cursor-pointer items-center gap-2 border border-border px-3 py-2 text-sm"
                              >
                                <input
                                  type="checkbox"
                                  className="size-4 accent-primary"
                                  checked={on}
                                  onChange={() => {
                                    patch({
                                      allStores: false,
                                      selectedOutletIds: on
                                        ? state.selectedOutletIds.filter(
                                            (id) => id !== o.id
                                          )
                                        : [
                                            ...state.selectedOutletIds,
                                            o.id,
                                          ],
                                    });
                                  }}
                                />
                                {o.name}
                              </label>
                            );
                          })
                        )}
                      </div>
                    ) : null}
                  </div>
                </Panel>

                <Panel className="space-y-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 size-4 accent-primary"
                      checked={state.worldwide}
                      onChange={(e) => {
                        const on = e.target.checked;
                        patch({
                          worldwide: on,
                          territoryCodes: on ? [] : state.territoryCodes,
                        });
                        if (on) setTerritoriesOpen(false);
                      }}
                    />
                    <span>
                      <span className="block text-sm font-semibold">
                        Worldwide
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        Default — release in all territories.
                      </span>
                    </span>
                  </label>

                  <div className="border-t border-border pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setTerritoriesOpen((o) => !o);
                        if (!territoriesOpen) {
                          patch({ worldwide: false });
                        }
                      }}
                      className="flex w-full cursor-pointer items-center justify-between text-sm font-medium"
                    >
                      Choose countries
                      <CaretDown
                        size={16}
                        className={cn(
                          "transition-transform",
                          territoriesOpen && "rotate-180"
                        )}
                      />
                    </button>
                    {territoriesOpen || !state.worldwide ? (
                      <div className="mt-4 grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2">
                        {COMMON_COUNTRIES.map((c) => {
                          const on = state.territoryCodes.includes(c.code);
                          return (
                            <label
                              key={c.code}
                              className="flex cursor-pointer items-center gap-2 border border-border px-3 py-2 text-sm"
                            >
                              <input
                                type="checkbox"
                                className="size-4 accent-primary"
                                checked={on}
                                onChange={() => {
                                  patch({
                                    worldwide: false,
                                    territoryCodes: on
                                      ? state.territoryCodes.filter(
                                          (x) => x !== c.code
                                        )
                                      : [...state.territoryCodes, c.code],
                                  });
                                }}
                              />
                              {c.name}
                            </label>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </Panel>
              </div>
            ) : null}

            {state.step === 4 ? (
              <div className="space-y-5">
                <Panel>
                  <div className="flex items-start gap-4">
                    <div className="size-24 shrink-0 overflow-hidden border border-border bg-muted">
                      {state.artworkPreview || state.artworkUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={
                            state.artworkPreview ?? state.artworkUrl ?? ""
                          }
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-muted-foreground">
                          <ImageSquare size={28} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg font-semibold tracking-tight">
                        {state.title || "Untitled"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {artist?.name} · {state.contentType} ·{" "}
                        {state.primaryGenre}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {state.releaseDate || "No date"}
                        {state.upc ? ` · UPC ${state.upc}` : ""}
                      </p>
                    </div>
                  </div>
                </Panel>

                <Panel>
                  <p className="mb-1 flex items-center gap-2 text-sm font-semibold">
                    <MusicNotes size={16} aria-hidden />
                    Tracks
                  </p>
                  <dl>
                    {state.tracks.map((t, i) => (
                      <SummaryRow
                        key={t.clientId}
                        label={`${i + 1}`}
                        value={`${t.title || "Untitled"} · ${formatDuration(t.audioDurationSec)} · ${t.explicit === "on" ? "Explicit" : t.explicit === "edited" ? "Clean" : "Not explicit"}`}
                      />
                    ))}
                  </dl>
                </Panel>

                <Panel>
                  <p className="mb-1 text-sm font-semibold">Credits</p>
                  <dl>
                    <SummaryRow
                      label="Writers"
                      value={state.contributors
                        .filter((c) => c.firstName || c.lastName)
                        .map(
                          (c) =>
                            `${c.firstName} ${c.lastName} (${c.roles.join(", ")})`
                        )
                        .join("; ")}
                    />
                    <SummaryRow
                      label="©"
                      value={`${state.clineYear} ${state.clineName}`}
                    />
                    <SummaryRow
                      label="℗"
                      value={`${state.plineYear} ${state.plineName}`}
                    />
                    <SummaryRow
                      label="Samples"
                      value={state.hasSamples ? "Yes" : "No"}
                    />
                    <SummaryRow
                      label="Remix"
                      value={state.isRemix ? "Yes" : "No"}
                    />
                    <SummaryRow
                      label="AI audio"
                      value={audioAiUsed ? "Yes" : "No"}
                    />
                  </dl>
                </Panel>

                <Panel>
                  <p className="mb-1 text-sm font-semibold">Distribution</p>
                  <dl>
                    <SummaryRow
                      label="Stores"
                      value={
                        state.allStores
                          ? "All available stores"
                          : outlets
                              .filter((o) =>
                                state.selectedOutletIds.includes(o.id)
                              )
                              .map((o) => o.name)
                              .join(", ") || "None selected"
                      }
                    />
                    <SummaryRow
                      label="Territories"
                      value={
                        state.worldwide
                          ? "Worldwide"
                          : state.territoryCodes.join(", ") || "None"
                      }
                    />
                  </dl>
                </Panel>

                <Panel>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 size-4 accent-primary"
                      checked={state.rightsConfirmed}
                      onChange={(e) =>
                        patch({ rightsConfirmed: e.target.checked })
                      }
                    />
                    <span className="text-sm leading-relaxed">
                      I confirm I own or control the rights needed to
                      distribute this release, including composition,
                      recording, artwork, and any samples or covers.
                    </span>
                  </label>
                </Panel>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>

        <div className="sticky bottom-0 z-10 -mx-1 border border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:mx-0">
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-11 px-4"
              disabled={state.step === 0 || submitting}
              onClick={() => patch({ step: Math.max(0, state.step - 1) })}
            >
              <ArrowLeft size={16} weight="bold" aria-hidden />
              Back
            </Button>
            {state.step < WIZARD_STEPS.length - 1 ? (
              <Button
                type="button"
                className="h-11 px-5"
                onClick={() => void ensureDraftThenContinue()}
              >
                Continue
                <ArrowRight size={16} weight="bold" aria-hidden />
              </Button>
            ) : (
              <Button
                type="button"
                className="h-11 px-5"
                disabled={submitting}
                onClick={() => void submitForReview()}
              >
                {submitting ? "Submitting…" : "Submit for Review"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** @deprecated Use ReleaseBuilder */
export const ReleaseSubmitForm = ReleaseBuilder;
