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
import NumberFlow from "@number-flow/react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/site/field";
import {
  ARTWORK_AI_USAGE,
  COMMERCIAL_SAMPLES,
  COMPOSITION_TYPES,
  LOCALES,
  parseJsonObject,
  PRIMARY_GENRES,
  type TrackMetadata,
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
/** display_value is what gets sent as the role label — must be the exact
 * live LabelGrid catalog string, never a hardcoded guess. */
type ContributorRole = { display_value: string; category: string | null };

type SaveStatus = "idle" | "saving" | "saved" | "error" | "sync-error";

/** Mirrors the server's /labelgrid-snapshot response — live, not cached. */
type LiveReleaseSnapshot = {
  id: number;
  title: string | null;
  artist: string | null;
  primary_genre: string | null;
  content_type: string | null;
  release_date: string | null;
  barcode_number: string | null;
  cover_url: string | null;
  review_status: string | null;
  store_count: number | null;
  all_stores: boolean;
  tracks: Array<{
    id: number;
    track_num: number | null;
    title: string | null;
    mix_version: string | null;
    default_display_artist: string | null;
  }>;
};

type SaveDraftResult = {
  /** The local save request itself succeeded. */
  ok: boolean;
  /**
   * When syncToLabelGrid was requested: true only if LabelGrid confirmed
   * (release id present / every track landed with no processing failure).
   * When sync wasn't requested, mirrors `ok`.
   */
  labelgridOk: boolean;
  error?: string;
};

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

const REQUIRED_ARTWORK_SIZE = 3000;

/** Read a File's pixel dimensions in the browser (no upload needed). */
async function readImageFileDimensions(
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
    transferFromDistributor: "",
    tracks: [newTrack()],
    contributors: [newContributor()],
    clineYear: String(currentYear),
    clineName: artistName,
    plineYear: String(currentYear),
    plineName: artistName,
    hasSamples: false,
    isRemix: false,
    allStores: true,
    selectedOutletKeys: [],
    worldwide: true,
    territoryCodes: [],
    rightsConfirmed: false,
  };
}

/** Inline audio processing status — mirrors LabelGrid's upload_attempt lifecycle. */
function AudioStatusPill({ status }: { status: "processing" | "failed" }) {
  if (status === "processing") {
    return (
      <span className="inline-flex items-center gap-1.5 border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        <span className="size-1.5 animate-pulse rounded-full bg-amber-500" aria-hidden />
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
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-primary"
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
                          initial={reduceMotion ? false : { scale: 0.4, opacity: 0 }}
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
      audioStatus={
        track.audioProcessing
          ? "processing"
          : track.audioProcessingError
            ? "failed"
            : null
      }
      onFile={onFile}
    />
  );
}

/**
 * Progressive-disclosure license upload — shown only when the track is a
 * cover or contains commercial samples (LabelGrid POST /tracks/{id}/licenses,
 * type: cover|sample). File goes to server storage now and syncs to
 * LabelGrid on the next autosave / approve.
 */
function TrackLicenseUpload({
  track,
  onFile,
}: {
  track: WizardTrack;
  onFile: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const label =
    track.licenseType === "cover"
      ? "Cover license"
      : track.licenseType === "sample"
        ? "Sample clearance"
        : "License document";
  const hasFile = Boolean(track.licenseFile || track.licenseUrl);

  return (
    <div className="border border-border bg-background px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {track.licenseFile
              ? track.licenseFile.name
              : track.licenseUrl
                ? "Uploaded — will sync to your distributor."
                : `Required — ${track.licenseType === "cover" ? "proof you cleared this cover" : "proof the sample is cleared"}.`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-9 px-3"
            onClick={() => inputRef.current?.click()}
          >
            {hasFile ? "Replace" : "Upload"}
          </Button>
          {track.licenseFile ? (
            <Button
              type="button"
              variant="ghost"
              className="h-9 px-2 text-destructive"
              onClick={() => onFile(null)}
            >
              <Trash size={16} weight="regular" aria-hidden />
            </Button>
          ) : null}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,image/*"
        className="sr-only"
        onChange={(e) => {
          onFile(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
    </div>
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

/**
 * Wizard order: Release, Distribution, Tracks, Credits, Review — release
 * (and its distribution config) is posted to LabelGrid first, then tracks
 * upload against that release id.
 */
const STEP_RELEASE = 0;
const STEP_DISTRIBUTION = 1;
const STEP_TRACKS = 2;
const STEP_CREDITS = 3;
const STEP_REVIEW = 4;

function validateStep(state: WizardState, step: number): string | null {
  if (step === STEP_RELEASE) {
    if (!state.artworkFile && !state.artworkUrl) {
      return "Please add cover artwork.";
    }
    if (!state.title.trim()) return "Please enter a release title.";
    if (!state.artistId) return "Please select an artist.";
    if (!state.primaryGenre) return "Please choose a primary genre.";
    if (!state.releaseDate) return "Please choose a release date.";
    return null;
  }
  if (step === STEP_DISTRIBUTION) {
    if (!state.allStores && state.selectedOutletKeys.length === 0) {
      return "Select all stores, or choose at least one store.";
    }
    if (!state.worldwide && state.territoryCodes.length === 0) {
      return "Choose worldwide, or select at least one territory.";
    }
    return null;
  }
  if (step === STEP_TRACKS) {
    if (!state.tracks.length) return "Please add at least one track.";
    for (let i = 0; i < state.tracks.length; i++) {
      const t = state.tracks[i];
      if (!t.title.trim()) {
        return `Please enter a title for track ${i + 1}.`;
      }
      // Check the failure reason first: after a failed upload attempt the
      // pending file is cleared (see saveDraft's audioLanded logic), so
      // audioFile/audioUrl are both empty even though a real attempt was
      // made — "please upload" would misleadingly imply nothing happened.
      if (t.audioProcessingError) {
        return `Audio processing failed for “${t.title.trim() || `track ${i + 1}`}” — please re-upload it.`;
      }
      if (!t.audioFile && !t.audioUrl) {
        return `Please upload audio for “${t.title.trim() || `track ${i + 1}`}”.`;
      }
    }
    return null;
  }
  if (step === STEP_CREDITS) {
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
  if (step === STEP_REVIEW) {
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
    licenseType: t.licenseType,
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
    transferFromDistributor: state.transferFromDistributor,
    clineYear: state.clineYear,
    clineName: state.clineName,
    plineYear: state.plineYear,
    plineName: state.plineName,
    allStores: state.allStores,
    selectedOutletKeys: state.selectedOutletKeys,
    worldwide: state.worldwide,
    territoryCodes: state.territoryCodes,
    tracks,
    contributors: validContributors,
  };
}

export function ReleaseBuilder({
  artists,
  defaultArtistId,
  initialWizard,
}: {
  artists: ArtistOption[];
  defaultArtistId?: string;
  /** Pre-fill wizard when editing an existing release. */
  initialWizard?: WizardState;
}) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const errorRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<WizardState>(
    initialWizard ?? initialState(artists, defaultArtistId)
  );
  const createInFlight = useRef<Promise<{
    id: string | null;
    labelgridOk: boolean;
    error?: string;
  }> | null>(null);
  const saveInFlight = useRef<Promise<SaveDraftResult> | null>(null);
  const queuedSaveOpts = useRef<{
    forceArtwork?: boolean;
    syncToLabelGrid?: boolean;
  } | null>(null);

  const [state, setState] = useState<WizardState>(
    () => initialWizard ?? initialState(artists, defaultArtistId)
  );
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [storesManual, setStoresManual] = useState(false);
  const [territoriesOpen, setTerritoriesOpen] = useState(false);
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [outletsError, setOutletsError] = useState<string | null>(null);
  const [outletsLoaded, setOutletsLoaded] = useState(false);
  const [contributorRoles, setContributorRoles] = useState<ContributorRole[]>(
    []
  );
  const [contributorRolesError, setContributorRolesError] = useState<
    string | null
  >(null);
  const [contributorRolesLoaded, setContributorRolesLoaded] = useState(false);
  const [audioAiUsed, setAudioAiUsed] = useState(false);
  const [liveSnapshot, setLiveSnapshot] = useState<LiveReleaseSnapshot | null>(
    null
  );
  const [liveSnapshotError, setLiveSnapshotError] = useState<string | null>(
    null
  );

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
      .then(async (r) => ({ ok: r.ok, data: await r.json() }))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (ok && Array.isArray(data.outlets)) {
          setOutlets(
            data.outlets.map((o: Outlet) => ({
              id: o.id,
              name: o.name,
              key: o.key,
            }))
          );
        } else {
          setOutletsError(data.error ?? "Could not load stores.");
        }
        setOutletsLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setOutletsError("Network error while loading stores.");
        setOutletsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load contributor roles — never hardcode these, LabelGrid 422s on an
  // unrecognized roles.* key.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/labelgrid/contributor-roles")
      .then(async (r) => ({ ok: r.ok, data: await r.json() }))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (ok && Array.isArray(data.roles)) {
          setContributorRoles(
            data.roles.map((r: ContributorRole) => ({
              display_value: r.display_value,
              category: r.category ?? null,
            }))
          );
        } else {
          setContributorRolesError(data.error ?? "Could not load roles.");
        }
        setContributorRolesLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setContributorRolesError("Network error while loading roles.");
        setContributorRolesLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  /**
   * Checkpoint A (leaving Distribution): the ONLY moment Steps 1+2 combine
   * into the first LabelGrid Create Release call. Returns whether LabelGrid
   * actually confirmed a release id — the caller must not advance past
   * Distribution unless labelgridOk is true.
   */
  async function createDraft(
    current: WizardState
  ): Promise<{ id: string | null; labelgridOk: boolean; error?: string }> {
    if (current.releaseId) {
      return { id: current.releaseId, labelgridOk: true };
    }
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
            transferFromDistributor: current.transferFromDistributor,
            secondaryGenre: current.secondaryGenre,
            clineYear: current.clineYear,
            clineName: current.clineName,
            plineYear: current.plineYear,
            plineName: current.plineName,
            allStores: current.allStores,
            selectedOutletKeys: current.selectedOutletKeys,
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
          return { id: null, labelgridOk: false, error: data.error };
        }
        const id = data.release.id as string;
        const artworkLanded = Boolean(data.release.artworkUrl);
        const labelgridOk = Boolean(data.release.labelgridId);
        setState((prev) => ({
          ...prev,
          releaseId: id,
          artworkUrl: data.release.artworkUrl ?? prev.artworkUrl,
          artworkFile:
            current.artworkFile && !artworkLanded ? prev.artworkFile : null,
        }));
        if (!labelgridOk) {
          setSaveStatus("sync-error");
          setSyncErrorMessage(data.labelgrid?.error ?? null);
        } else {
          setSaveStatus("saved");
        }
        return { id, labelgridOk, error: data.labelgrid?.error };
      } catch {
        setSaveStatus("error");
        setError("Network error while saving draft.");
        return { id: null, labelgridOk: false, error: "Network error" };
      } finally {
        createInFlight.current = null;
      }
    })();

    createInFlight.current = run;
    return run;
  }

  /**
   * Serializes saveDraft calls. Without this, the debounced autosave and an
   * explicit save (e.g. clicking Continue right after dropping an audio
   * file) can overlap: both read the same pending File from state, both
   * PATCH it to LabelGrid, and whichever response resolves last wins —
   * which can be the stale one, silently reverting a file that had already
   * landed. A call that arrives while one is in flight is queued to run
   * once more (with the latest state) instead of firing concurrently.
   */

  async function saveDraft(
    current: WizardState,
    opts?: { forceArtwork?: boolean; syncToLabelGrid?: boolean }
  ): Promise<SaveDraftResult> {
    if (saveInFlight.current) {
      queuedSaveOpts.current = {
        forceArtwork: queuedSaveOpts.current?.forceArtwork || opts?.forceArtwork,
        syncToLabelGrid:
          queuedSaveOpts.current?.syncToLabelGrid || opts?.syncToLabelGrid,
      };
      return saveInFlight.current;
    }

    const run = performSaveDraft(current, opts).finally(() => {
      saveInFlight.current = null;
      if (queuedSaveOpts.current) {
        const nextOpts = queuedSaveOpts.current;
        queuedSaveOpts.current = null;
        void saveDraft(stateRef.current, nextOpts);
      }
    });
    saveInFlight.current = run;
    return run;
  }

  async function performSaveDraft(
    current: WizardState,
    opts?: { forceArtwork?: boolean; syncToLabelGrid?: boolean }
  ): Promise<SaveDraftResult> {
    let id = current.releaseId;
    if (!id) {
      const created = await createDraft(current);
      if (!created.id) {
        return { ok: false, labelgridOk: false, error: created.error };
      }
      id = created.id;
      current = { ...stateRef.current, releaseId: id };
    }

    setSaveStatus("saving");
    // LabelGrid is the only store for artwork/audio — if this save's upload
    // doesn't visibly land (no url, no processing, no recorded error), the
    // file must be kept in memory so the next autosave retries it instead
    // of silently losing the user's selection.
    const hadArtworkFile = Boolean(current.artworkFile);
    const pendingAudioClientIds = new Set(
      current.tracks.filter((t) => t.audioFile).map((t) => t.clientId)
    );
    try {
      const fd = new FormData();
      fd.set(
        "payload",
        JSON.stringify({
          ...buildPayload(current),
          syncToLabelGrid: opts?.syncToLabelGrid ?? false,
        })
      );
      if (current.artworkFile) fd.set("artwork", current.artworkFile);
      for (const t of current.tracks) {
        if (t.audioFile) fd.set(`audio_${t.clientId}`, t.audioFile);
        if (t.licenseFile) fd.set(`license_${t.clientId}`, t.licenseFile);
      }
      const res = await fetch(`/api/releases/${id}/draft`, {
        method: "PATCH",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveStatus("error");
        if (opts?.forceArtwork) setError(data.error ?? "Save failed");
        return { ok: false, labelgridOk: false, error: data.error };
      }

      const release = data.release;
      const labelgridError: string | undefined = data.labelgrid?.error;
      const anyTrackAudioFailed = (release.tracks ?? []).some(
        (rt: { metadataJson?: string }) =>
          Boolean(parseJsonObject<TrackMetadata>(rt.metadataJson).audioProcessingError)
      );
      const labelgridOk = opts?.syncToLabelGrid
        ? !labelgridError && !anyTrackAudioFailed
        : true;

      setState((prev) => {
        const byClient = new Map(prev.tracks.map((t) => [t.clientId, t]));
        const nextTracks: WizardTrack[] =
          Array.isArray(release.tracks) && release.tracks.length
            ? release.tracks.map(
                (
                  rt: {
                    id: string;
                    title: string;
                    audioUrl: string | null;
                    metadataJson?: string;
                  },
                  i: number
                ) => {
                  const existing =
                    prev.tracks[i] ??
                    [...byClient.values()].find(
                      (t) => t.title === rt.title
                    ) ??
                    newTrack();
                  const tMeta = parseJsonObject<TrackMetadata>(
                    rt.metadataJson
                  );
                  const audioLanded =
                    Boolean(rt.audioUrl) ||
                    Boolean(tMeta.audioProcessing) ||
                    Boolean(tMeta.audioProcessingError);
                  const wasPending = pendingAudioClientIds.has(
                    existing.clientId
                  );
                  return {
                    ...existing,
                    id: rt.id,
                    title: existing.title || rt.title,
                    audioUrl: rt.audioUrl ?? existing.audioUrl,
                    audioFile:
                      wasPending && !audioLanded ? existing.audioFile : null,
                    audioProcessing: tMeta.audioProcessing ?? false,
                    audioProcessingError: tMeta.audioProcessingError ?? null,
                    licenseFile: null,
                    licenseUrl: tMeta.licenseUrl ?? existing.licenseUrl,
                  };
                }
              )
            : prev.tracks.map((t) => ({
                ...t,
                audioFile: t.audioFile ? null : t.audioFile,
                licenseFile: t.licenseFile ? null : t.licenseFile,
              }));

        const artworkLanded = Boolean(release.artworkUrl);
        return {
          ...prev,
          releaseId: release.id,
          artworkUrl: release.artworkUrl ?? prev.artworkUrl,
          artworkFile:
            hadArtworkFile && !artworkLanded ? prev.artworkFile : null,
          tracks: nextTracks,
        };
      });

      if (!labelgridOk) {
        setSaveStatus("sync-error");
        setSyncErrorMessage(
          labelgridError ??
            "Audio processing failed for one or more tracks — check the Tracks step."
        );
      } else {
        setSaveStatus("saved");
        setSyncErrorMessage(null);
      }
      return { ok: true, labelgridOk, error: labelgridError };
    } catch {
      setSaveStatus("error");
      return { ok: false, labelgridOk: false, error: "Network error" };
    }
  }

  // No autosave: the wizard only talks to the server at two deliberate
  // checkpoints (leaving Distribution, leaving Credits) plus explicit
  // Save & Exit / Submit — see ensureDraftThenContinue.

  // Poll LabelGrid audio-processing status for any track still "Processing…"
  // (PUT stereo file returned 202 — GET file-upload-attempts/{id} resolves it).
  const processingTrackIds = state.tracks
    .filter((t) => t.audioProcessing && t.id)
    .map((t) => t.id!);
  const processingKey = processingTrackIds.join(",");

  useEffect(() => {
    if (!state.releaseId || !processingKey) return;
    let cancelled = false;

    const poll = async () => {
      for (const trackId of processingKey.split(",")) {
        try {
          const res = await fetch(
            `/api/releases/${state.releaseId}/tracks/${trackId}/audio-status`,
            { method: "POST" }
          );
          const data = await res.json();
          if (cancelled || !res.ok) continue;
          if (data.status === "processing") continue;
          setState((prev) => ({
            ...prev,
            tracks: prev.tracks.map((t) =>
              t.id === trackId
                ? {
                    ...t,
                    audioProcessing: false,
                    audioProcessingError:
                      data.status === "failed"
                        ? data.error || "Audio processing failed"
                        : null,
                  }
                : t
            ),
          }));
        } catch {
          // Network hiccup — next poll tick retries.
        }
      }
    };

    const interval = window.setInterval(poll, 5000);
    void poll();
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [state.releaseId, processingKey]);

  // Review must not trust the local cache — fetch what LabelGrid actually
  // has whenever the user lands on this step. Loading state is derived
  // (both results null) rather than tracked separately, so nothing is set
  // synchronously at the top of the effect.
  useEffect(() => {
    if (state.step !== STEP_REVIEW || !state.releaseId) return;
    let cancelled = false;
    const releaseId = state.releaseId;
    fetch(`/api/releases/${releaseId}/labelgrid-snapshot`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setLiveSnapshotError(data.error ?? "Could not verify LabelGrid.");
          setLiveSnapshot(null);
          return;
        }
        setLiveSnapshot(data.snapshot);
        setLiveSnapshotError(null);
      })
      .catch(() => {
        if (!cancelled) {
          setLiveSnapshot(null);
          setLiveSnapshotError("Network error while checking LabelGrid.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [state.step, state.releaseId]);

  /**
   * The wizard hits the network at exactly two checkpoints:
   *  - leaving Distribution: first (or updated) LabelGrid Create/Update
   *    Release, combining Steps 1+2. Blocks on labelgridOk.
   *  - leaving Credits: LabelGrid Create/Update Track + audio + credits for
   *    every track, combining Steps 3+4. Blocks on labelgridOk.
   * Every other transition (Release→Distribution, Tracks→Credits, and all
   * backward navigation) is a pure client-side step change.
   */
  async function ensureDraftThenContinue() {
    if (continuing) return;
    setError("");
    const msg = validateStep(state, state.step);
    if (msg) {
      setError(msg);
      return;
    }

    const leavingDistribution = state.step === STEP_DISTRIBUTION;
    const leavingCredits = state.step === STEP_CREDITS;

    setContinuing(true);
    try {
      if (leavingDistribution) {
        const result = state.releaseId
          ? await saveDraft(stateRef.current, {
              syncToLabelGrid: true,
              forceArtwork: true,
            })
          : await createDraft(stateRef.current);
        if (!result.labelgridOk) {
          setError(
            result.error ??
              "Could not create the release on LabelGrid. Please try again."
          );
          return;
        }
      } else if (leavingCredits) {
        const result = await saveDraft(stateRef.current, {
          syncToLabelGrid: true,
          forceArtwork: true,
        });
        if (!result.labelgridOk) {
          setError(
            result.error ??
              "Could not sync your tracks to LabelGrid. Please try again."
          );
          return;
        }
      }
      // Release, Tracks, and Credits steps otherwise change state locally
      // only — nothing is sent to the server until the next checkpoint.

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
      if (leavingDistribution) {
        setEditingTrackId((prev) => prev ?? state.tracks[0]?.clientId ?? null);
      }
    } finally {
      setContinuing(false);
    }
  }

  async function saveAndExit() {
    setError("");
    // Nothing has been pushed anywhere yet if Distribution was never
    // completed — there's no local row to save into.
    if (state.releaseId) {
      await saveDraft(stateRef.current, { syncToLabelGrid: false });
    }
    router.push("/dashboard/releases");
  }

  async function submitForReview() {
    if (submitting) return;
    setError("");
    const msg = validateStep(state, STEP_REVIEW);
    if (msg) {
      setError(msg);
      return;
    }
    for (let s = 0; s < WIZARD_STEPS.length - 1; s++) {
      const early = validateStep(state, s);
      if (early) {
        setError(early);
        patch({ step: s });
        return;
      }
    }
    if (state.tracks.some((t) => t.audioProcessing)) {
      setError(
        "Your audio is still processing on our distributor. This usually takes a moment — please try again shortly."
      );
      patch({ step: STEP_TRACKS });
      return;
    }

    setSubmitting(true);
    try {
      // Final defensive sync — ensures LabelGrid reflects the latest state
      // even if the user only advanced through checkpoints without editing.
      const saved = await saveDraft(stateRef.current, {
        forceArtwork: true,
        syncToLabelGrid: true,
      });
      if (!saved.labelgridOk) {
        setError(saved.error ?? "Could not sync to LabelGrid before submitting.");
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
              {state.step === STEP_RELEASE
                ? "Add the basic information listeners will see on music services."
                : state.step === STEP_DISTRIBUTION
                  ? "Pick stores and territories for this release."
                  : state.step === STEP_TRACKS
                    ? "Upload masters and fill in track details."
                    : state.step === STEP_CREDITS
                      ? "Songwriters, copyright, and rights questions."
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
            ) : saveStatus === "sync-error" ? (
              <span
                className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400"
                title={syncErrorMessage ?? undefined}
              >
                <WarningCircle size={12} weight="fill" aria-hidden />
                Saved — distributor sync pending
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
            {state.step === STEP_RELEASE ? (
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
                    onFile={async (file) => {
                      if (!file) {
                        patch({
                          artworkFile: null,
                          artworkPreview: null,
                          artworkUrl: null,
                        });
                        return;
                      }
                      setError("");
                      const dims = await readImageFileDimensions(file);
                      if (
                        !dims ||
                        dims.width !== REQUIRED_ARTWORK_SIZE ||
                        dims.height !== REQUIRED_ARTWORK_SIZE
                      ) {
                        setError(
                          dims
                            ? `Cover artwork must be exactly ${REQUIRED_ARTWORK_SIZE}×${REQUIRED_ARTWORK_SIZE}px — this file is ${dims.width}×${dims.height}px.`
                            : "Could not read this image. Try a different file."
                        );
                        return;
                      }
                      patch({
                        artworkFile: file,
                        artworkPreview: URL.createObjectURL(file),
                        artworkUrl: null,
                      });
                    }}
                    helper={`Exactly ${REQUIRED_ARTWORK_SIZE}×${REQUIRED_ARTWORK_SIZE}px required — square JPEG, PNG, or WebP.`}
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
                        <Field
                          id="transferFromDistributor"
                          label="Transferring from another distributor?"
                          value={state.transferFromDistributor}
                          onChange={(e) =>
                            patch({ transferFromDistributor: e.target.value })
                          }
                          helper="e.g. DistroKid — leave blank for a new release."
                          placeholder="Optional"
                        />
                      </div>
                    ) : null}
                  </div>
                </Panel>
              </>
            ) : null}

            {state.step === STEP_TRACKS ? (
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
                          {t.audioProcessing || t.audioProcessingError ? (
                            <div className="mt-1">
                              <AudioStatusPill
                                status={
                                  t.audioProcessingError ? "failed" : "processing"
                                }
                              />
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              {formatDuration(t.audioDurationSec)}
                              {t.audioFile || t.audioUrl
                                ? " · Audio ready"
                                : " · No audio"}
                            </p>
                          )}
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
                            <TrackLicenseUpload
                              track={t}
                              onFile={(file) =>
                                updateTrack(t.clientId, { licenseFile: file })
                              }
                            />
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

            {state.step === STEP_CREDITS ? (
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
                          {!contributorRolesLoaded ? (
                            <p className="text-sm text-muted-foreground">
                              Loading roles…
                            </p>
                          ) : contributorRolesError ? (
                            <p className="text-sm text-destructive">
                              {contributorRolesError}
                            </p>
                          ) : contributorRoles.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              No roles available right now.
                            </p>
                          ) : (
                          contributorRoles.map((r) => {
                            const role = r.display_value;
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
                          })
                          )}
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

            {state.step === STEP_DISTRIBUTION ? (
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
                          selectedOutletKeys: on
                            ? []
                            : state.selectedOutletKeys,
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
                        {!outletsLoaded ? (
                          <p className="text-sm text-muted-foreground">
                            Loading stores…
                          </p>
                        ) : outletsError ? (
                          <p className="text-sm text-destructive">
                            {outletsError}
                          </p>
                        ) : outlets.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No stores available right now.
                          </p>
                        ) : (
                          outlets.map((o) => {
                            const on = state.selectedOutletKeys.includes(
                              o.key
                            );
                            return (
                              <label
                                key={o.key}
                                className="flex cursor-pointer items-center gap-2 border border-border px-3 py-2 text-sm"
                              >
                                <input
                                  type="checkbox"
                                  className="size-4 accent-primary"
                                  checked={on}
                                  onChange={() => {
                                    patch({
                                      allStores: false,
                                      selectedOutletKeys: on
                                        ? state.selectedOutletKeys.filter(
                                            (key) => key !== o.key
                                          )
                                        : [
                                            ...state.selectedOutletKeys,
                                            o.key,
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

            {state.step === STEP_REVIEW ? (
              <div className="space-y-5">
                <div
                  className={cn(
                    "flex items-center gap-2 border px-3 py-2 text-xs font-medium",
                    liveSnapshot
                      ? "border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"
                      : liveSnapshotError
                        ? "border-amber-600/30 bg-amber-600/10 text-amber-700 dark:text-amber-400"
                        : "border-border bg-muted text-muted-foreground"
                  )}
                >
                  {!liveSnapshot && !liveSnapshotError ? (
                    <>
                      <span className="size-1.5 animate-pulse rounded-full bg-current" />
                      Checking LabelGrid…
                    </>
                  ) : liveSnapshot ? (
                    <>
                      <Check size={14} weight="bold" aria-hidden />
                      Confirmed on LabelGrid: {liveSnapshot.title ?? "Untitled"}
                      {liveSnapshot.artist ? ` · ${liveSnapshot.artist}` : ""}
                      {` · ${liveSnapshot.tracks.length} track${liveSnapshot.tracks.length === 1 ? "" : "s"}`}
                    </>
                  ) : (
                    <>
                      <WarningCircle size={14} weight="fill" aria-hidden />
                      {liveSnapshotError ??
                        "Could not verify this release on LabelGrid."}
                    </>
                  )}
                </div>

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
                                state.selectedOutletKeys.includes(o.key)
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
              disabled={state.step === STEP_RELEASE || submitting || continuing}
              onClick={() => patch({ step: Math.max(0, state.step - 1) })}
            >
              <ArrowLeft size={16} weight="bold" aria-hidden />
              Back
            </Button>
            {state.step < WIZARD_STEPS.length - 1 ? (
              <Button
                type="button"
                className="h-11 px-5"
                loading={continuing}
                onClick={() => void ensureDraftThenContinue()}
              >
                Continue
                {!continuing ? (
                  <ArrowRight size={16} weight="bold" aria-hidden />
                ) : null}
              </Button>
            ) : (
              <Button
                type="button"
                className="h-11 px-5"
                loading={submitting}
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
