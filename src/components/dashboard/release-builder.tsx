"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
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
  Check,
  Disc,
  ImageSquare,
  MicrophoneStage,
  MusicNotes,
  Plus,
  Trash,
  UploadSimple,
  User,
  WarningCircle,
  Waveform,
  X,
} from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/site/field";
import {
  ARTISTIC_ROLES,
  ARTWORK_AI_USAGE,
  COMMERCIAL_SAMPLES,
  COMPOSITION_TYPES,
  CONTENT_TYPES,
  CONTRIBUTOR_ROLE_KEYS,
  EXPLICIT_OPTIONS,
  LOCALES,
  PRIMARY_GENRES,
  RECORDING_COUNTRIES,
  type ContributorDraft,
} from "@/lib/releases/constants";
import { cn } from "@/lib/utils";

type ArtistOption = { id: string; name: string; locked: boolean };

const STEPS = [
  {
    id: "artist",
    label: "Artist",
    title: "Who is releasing?",
    hint: "Pick the primary artist and their role on this release.",
    icon: User,
  },
  {
    id: "release",
    label: "Release",
    title: "Release details",
    hint: "Title, genre, date, and rights. Catalog number is assigned on submit.",
    icon: Disc,
  },
  {
    id: "artwork",
    label: "Artwork",
    title: "Cover art",
    hint: "Square cover, at least 1400×1400. JPEG, PNG, or WebP.",
    icon: ImageSquare,
  },
  {
    id: "track",
    label: "Track",
    title: "Track & audio",
    hint: "Metadata for the first track, plus the stereo master.",
    icon: MusicNotes,
  },
  {
    id: "credits",
    label: "Credits",
    title: "Writers & credits",
    hint: "Add everyone who wrote or contributed to the composition.",
    icon: MicrophoneStage,
  },
  {
    id: "review",
    label: "Review",
    title: "Review & submit",
    hint: "Confirm everything, then send it to admin review.",
    icon: Check,
  },
] as const;

const currentYear = new Date().getFullYear();

function newContributor(): ContributorDraft {
  return {
    id: crypto.randomUUID(),
    firstName: "",
    lastName: "",
    roles: ["Composer", "Lyricist"],
  };
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function MediaDropzone({
  id,
  label,
  accept,
  file,
  onFile,
  kind,
  previewUrl,
}: {
  id: string;
  label: string;
  accept: string;
  file: File | null;
  onFile: (file: File | null) => void;
  kind: "image" | "audio";
  previewUrl?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function takeFiles(list: FileList | null) {
    const next = list?.[0] ?? null;
    onFile(next);
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
          kind === "image" ? "min-h-56" : "min-h-36"
        )}
      >
        {kind === "image" && previewUrl ? (
          <div className="grid gap-0 sm:grid-cols-[minmax(0,220px)_1fr]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Cover preview"
              className="aspect-square w-full object-cover bg-muted"
            />
            <div className="flex flex-col justify-between gap-4 p-5">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {file?.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {file ? formatBytes(file.size) : null}
                </p>
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
        ) : file && kind === "audio" ? (
          <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center border border-border bg-background text-primary">
                <Waveform size={22} weight="regular" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold">{file.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatBytes(file.size)}
                </p>
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
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <aside className="lg:sticky lg:top-6 lg:self-start">
      <div className="border border-border bg-card p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Step {step + 1} of {STEPS.length}
            </p>
            <p className="mt-1 text-sm font-semibold tracking-tight">
              {STEPS[step].label}
            </p>
          </div>
          <p className="font-mono text-xs tabular-nums text-muted-foreground">
            {Math.round(progress)}%
          </p>
        </div>
        <div
          className="mt-4 h-1 overflow-hidden bg-muted"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Release builder progress"
        >
          <div
            className="h-full bg-primary transition-[width] duration-300 ease-[var(--ease-rdistro)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        <ol className="mt-6 hidden space-y-1 lg:block">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < step;
            const active = i === step;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={i > step}
                  onClick={() => onJump(i)}
                  className={cn(
                    "group flex w-full cursor-pointer items-center gap-3 px-2.5 py-2.5 text-left transition-colors duration-200",
                    active && "bg-primary text-primary-foreground",
                    done && !active && "hover:bg-muted",
                    i > step && "cursor-not-allowed opacity-40"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center border text-xs",
                      active
                        ? "border-primary-foreground/30 bg-primary-foreground/10"
                        : done
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground"
                    )}
                  >
                    {done ? (
                      <Check size={14} weight="bold" aria-hidden />
                    ) : (
                      <Icon size={14} weight="regular" aria-hidden />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{s.label}</span>
                    <span
                      className={cn(
                        "mt-0.5 block truncate text-xs",
                        active
                          ? "text-primary-foreground/75"
                          : "text-muted-foreground"
                      )}
                    >
                      {s.title}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="mt-4 flex gap-1 overflow-x-auto pb-1 lg:hidden">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              disabled={i > step}
              onClick={() => onJump(i)}
              className={cn(
                "shrink-0 cursor-pointer px-3 py-1.5 text-xs font-medium transition-colors",
                i === step
                  ? "bg-primary text-primary-foreground"
                  : i < step
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {i + 1}. {s.label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

function Panel({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="border border-border bg-card">
      <header className="border-b border-border px-6 py-5">
        <h2 className="text-lg font-semibold tracking-tight text-balance">
          {title}
        </h2>
        {hint ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </header>
      <div className="grid gap-5 p-6">{children}</div>
    </section>
  );
}

function FlagToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "cursor-pointer border px-3.5 py-2.5 text-left text-sm font-medium transition-colors duration-200",
        checked
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
      )}
    >
      <span className="flex items-center gap-2">
        <span
          className={cn(
            "flex size-4 items-center justify-center border",
            checked
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border"
          )}
        >
          {checked ? <Check size={10} weight="bold" aria-hidden /> : null}
        </span>
        {label}
      </span>
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-border/70 py-3 last:border-0 sm:grid-cols-[140px_1fr] sm:gap-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm font-medium text-foreground break-words">
        {value || "—"}
      </dd>
    </div>
  );
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
  const [step, setStep] = useState(0);

  const [artistId, setArtistId] = useState(
    defaultArtistId && artists.some((a) => a.id === defaultArtistId)
      ? defaultArtistId
      : artists[0]?.id ?? ""
  );
  const [artisticRole, setArtisticRole] = useState("MainArtist");
  const selected = artists.find((a) => a.id === artistId);

  const [title, setTitle] = useState("");
  const [mixVersion, setMixVersion] = useState("");
  const [contentType, setContentType] = useState("Single");
  const [primaryGenre, setPrimaryGenre] = useState("Pop");
  const [preferredLocalization, setPreferredLocalization] = useState("en");
  const [releaseDate, setReleaseDate] = useState("");
  const [artworkAiUsage, setArtworkAiUsage] = useState("none");
  const [explicit, setExplicit] = useState("off");
  const [barcode, setBarcode] = useState("");
  const [clineYear, setClineYear] = useState(String(currentYear));
  const [clineName, setClineName] = useState("");
  const [plineYear, setPlineYear] = useState(String(currentYear));
  const [plineName, setPlineName] = useState("");

  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [artworkPreview, setArtworkPreview] = useState<string | null>(null);

  const [trackTitle, setTrackTitle] = useState("");
  const [trackMixVersion, setTrackMixVersion] = useState("");
  const [trackNumber, setTrackNumber] = useState("1");
  const [compositionType, setCompositionType] = useState("original_composition");
  const [audioAiUsage, setAudioAiUsage] = useState("none");
  const [compositionAiUsage, setCompositionAiUsage] = useState("none");
  const [commercialSamples, setCommercialSamples] = useState("no");
  const [audioLanguage, setAudioLanguage] = useState("en");
  const [recordingCountry, setRecordingCountry] = useState("");
  const [trackExplicit, setTrackExplicit] = useState("off");
  const [isrc, setIsrc] = useState("");
  const [iswc, setIswc] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [previewStart, setPreviewStart] = useState("");
  const [previewLength, setPreviewLength] = useState("");
  const [albumOnly, setAlbumOnly] = useState(false);
  const [freeDownload, setFreeDownload] = useState(false);
  const [instantGratification, setInstantGratification] = useState(false);
  const [hasMechanicalLicense, setHasMechanicalLicense] = useState(false);
  const [trackClineYear, setTrackClineYear] = useState(String(currentYear));
  const [trackClineName, setTrackClineName] = useState("");
  const [trackPlineYear, setTrackPlineYear] = useState(String(currentYear));
  const [trackPlineName, setTrackPlineName] = useState("");

  const [contributors, setContributors] = useState<ContributorDraft[]>([
    newContributor(),
  ]);

  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");

  useEffect(() => {
    if (!artworkFile) {
      setArtworkPreview(null);
      return;
    }
    const url = URL.createObjectURL(artworkFile);
    setArtworkPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [artworkFile]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const canNext = useMemo(() => {
    if (step === 0) return Boolean(artistId);
    if (step === 1) return Boolean(title.trim() && releaseDate && primaryGenre);
    if (step === 2) return Boolean(artworkFile);
    if (step === 3) return Boolean((trackTitle || title).trim() && audioFile);
    if (step === 4) {
      return contributors.some(
        (c) => c.firstName.trim() && c.lastName.trim() && c.roles.length > 0
      );
    }
    return true;
  }, [
    step,
    artistId,
    title,
    releaseDate,
    primaryGenre,
    artworkFile,
    trackTitle,
    audioFile,
    contributors,
  ]);

  function updateContributor(id: string, patch: Partial<ContributorDraft>) {
    setContributors((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );
  }

  function toggleRole(id: string, role: string) {
    setContributors((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const roles = c.roles.includes(role)
          ? c.roles.filter((r) => r !== role)
          : [...c.roles, role];
        return { ...c, roles };
      })
    );
  }

  async function submit() {
    setError("");
    setStatus("loading");
    try {
      const fd = new FormData();
      if (artworkFile) fd.set("artwork", artworkFile);
      if (audioFile) fd.set("audio", audioFile);

      const validContributors = contributors
        .filter((c) => c.firstName.trim() && c.lastName.trim() && c.roles.length)
        .map((c) => ({
          firstName: c.firstName.trim(),
          lastName: c.lastName.trim(),
          roles: c.roles,
        }));

      fd.set(
        "payload",
        JSON.stringify({
          artistId,
          artisticRole,
          title,
          mixVersion,
          contentType,
          primaryGenre,
          preferredLocalization,
          releaseDate,
          artworkAiUsage,
          explicit,
          barcode,
          clineYear,
          clineName,
          plineYear,
          plineName,
          track: {
            title: trackTitle || title,
            mixVersion: trackMixVersion,
            trackNumber,
            compositionType,
            audioAiUsage,
            compositionAiUsage,
            commercialSamples,
            audioLanguage,
            recordingCountry,
            explicit: trackExplicit,
            isrc,
            iswc,
            lyrics,
            previewStartTime: previewStart,
            previewLength,
            albumOnly,
            freeDownload,
            instantGratification,
            hasMechanicalLicense,
            clineYear: trackClineYear,
            clineName: trackClineName,
            plineYear: trackPlineYear,
            plineName: trackPlineName,
            contributors: validContributors,
          },
        })
      );

      const res = await fetch("/api/releases/submit", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Submit failed");
        setStatus("idle");
        return;
      }
      router.push(`/dashboard/releases/${data.release.id}`);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setStatus("idle");
    }
  }

  const current = STEPS[step];
  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const };

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
      <StepRail
        step={step}
        onJump={(i) => {
          if (i <= step) setStep(i);
        }}
      />

      <div className="min-w-0 space-y-5">
        {error ? (
          <div
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            aria-labelledby="release-builder-error-title"
            className="border border-destructive/40 bg-destructive/5 px-4 py-3 outline-none"
          >
            <div className="flex items-start gap-3">
              <WarningCircle
                size={20}
                weight="fill"
                className="mt-0.5 shrink-0 text-destructive"
                aria-hidden
              />
              <div>
                <h3
                  id="release-builder-error-title"
                  className="text-sm font-semibold text-destructive"
                >
                  Could not submit
                </h3>
                <p className="mt-1 text-sm text-destructive/90">{error}</p>
              </div>
              <button
                type="button"
                className="ml-auto cursor-pointer p-1 text-destructive/70 hover:text-destructive"
                onClick={() => setError("")}
                aria-label="Dismiss error"
              >
                <X size={16} weight="bold" aria-hidden />
              </button>
            </div>
          </div>
        ) : null}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current.id}
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
            transition={transition}
          >
            {step === 0 ? (
              <Panel title={current.title} hint={current.hint}>
                <div>
                  <p className="mb-3 text-sm font-medium">Artist</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {artists.map((a) => {
                      const active = a.id === artistId;
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => setArtistId(a.id)}
                          className={cn(
                            "cursor-pointer border px-4 py-3.5 text-left transition-colors duration-200",
                            active
                              ? "border-primary bg-primary/8 ring-1 ring-primary"
                              : "border-border bg-background hover:border-primary/40"
                          )}
                        >
                          <span className="flex items-start justify-between gap-3">
                            <span>
                              <span className="block text-sm font-semibold">
                                {a.name}
                              </span>
                              <span className="mt-1 block text-xs text-muted-foreground">
                                {a.locked
                                  ? "Locked after a previous submit"
                                  : "Available for this release"}
                              </span>
                            </span>
                            <span
                              className={cn(
                                "mt-0.5 flex size-5 shrink-0 items-center justify-center border",
                                active
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border"
                              )}
                            >
                              {active ? (
                                <Check size={12} weight="bold" aria-hidden />
                              ) : null}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Field
                  id="artisticRole"
                  label="Artistic role"
                  as="select"
                  required
                  value={artisticRole}
                  onChange={(e) => setArtisticRole(e.target.value)}
                >
                  {ARTISTIC_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Field>
                {selected?.locked ? (
                  <p className="border border-border bg-muted/60 px-3.5 py-2.5 text-xs text-muted-foreground">
                    This artist is already locked from a previous submission.
                  </p>
                ) : null}
              </Panel>
            ) : null}

            {step === 1 ? (
              <Panel title={current.title} hint={current.hint}>
                <Field
                  id="title"
                  label="Release title"
                  required
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (!trackTitle || trackTitle === title) {
                      setTrackTitle(e.target.value);
                    }
                  }}
                />
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    id="mixVersion"
                    label="Mix / subtitle (optional)"
                    value={mixVersion}
                    onChange={(e) => setMixVersion(e.target.value)}
                  />
                  <Field
                    id="contentType"
                    label="Content type"
                    as="select"
                    required
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value)}
                  >
                    {CONTENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Field>
                  <Field
                    id="primaryGenre"
                    label="Primary genre"
                    as="select"
                    required
                    value={primaryGenre}
                    onChange={(e) => setPrimaryGenre(e.target.value)}
                  >
                    {PRIMARY_GENRES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </Field>
                  <Field
                    id="releaseDate"
                    label="Original release date"
                    type="date"
                    required
                    value={releaseDate}
                    onChange={(e) => setReleaseDate(e.target.value)}
                    helper="Interpreted as midnight UTC"
                  />
                  <Field
                    id="preferredLocalization"
                    label="Preferred localization"
                    as="select"
                    required
                    value={preferredLocalization}
                    onChange={(e) => setPreferredLocalization(e.target.value)}
                    helper="Also used for the track"
                  >
                    {LOCALES.filter((l) => l.value !== "zxx").map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </Field>
                  <Field
                    id="barcode"
                    label="Barcode / UPC (optional)"
                    maxLength={13}
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    helper="Leave blank to auto-generate on LabelGrid"
                  />
                  <Field
                    id="artworkAiUsage"
                    label="Artwork AI usage"
                    as="select"
                    required
                    value={artworkAiUsage}
                    onChange={(e) => setArtworkAiUsage(e.target.value)}
                  >
                    {ARTWORK_AI_USAGE.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </Field>
                  <Field
                    id="explicit"
                    label="Explicit"
                    as="select"
                    required
                    value={explicit}
                    onChange={(e) => {
                      setExplicit(e.target.value);
                      setTrackExplicit(e.target.value);
                    }}
                  >
                    {EXPLICIT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Field>
                  <Field
                    id="clineYear"
                    label="© year"
                    type="number"
                    value={clineYear}
                    onChange={(e) => setClineYear(e.target.value)}
                  />
                  <Field
                    id="clineName"
                    label="© name"
                    value={clineName}
                    onChange={(e) => setClineName(e.target.value)}
                  />
                  <Field
                    id="plineYear"
                    label="℗ year"
                    type="number"
                    value={plineYear}
                    onChange={(e) => setPlineYear(e.target.value)}
                  />
                  <Field
                    id="plineName"
                    label="℗ name"
                    value={plineName}
                    onChange={(e) => setPlineName(e.target.value)}
                  />
                </div>
                <p className="border border-border bg-muted/50 px-3.5 py-2.5 text-xs text-muted-foreground">
                  Catalog number will be generated as{" "}
                  <span className="font-mono font-medium text-foreground">
                    RDISTROXXXXXX
                  </span>{" "}
                  when you submit.
                </p>
              </Panel>
            ) : null}

            {step === 2 ? (
              <Panel title={current.title} hint={current.hint}>
                <MediaDropzone
                  id="artwork"
                  label="Cover image"
                  kind="image"
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  file={artworkFile}
                  previewUrl={artworkPreview}
                  onFile={setArtworkFile}
                />
              </Panel>
            ) : null}

            {step === 3 ? (
              <Panel title={current.title} hint={current.hint}>
                <Field
                  id="trackTitle"
                  label="Track title"
                  required
                  value={trackTitle}
                  onChange={(e) => setTrackTitle(e.target.value)}
                />
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    id="trackMixVersion"
                    label="Mix / version (optional)"
                    value={trackMixVersion}
                    onChange={(e) => setTrackMixVersion(e.target.value)}
                  />
                  <Field
                    id="trackNumber"
                    label="Track number"
                    type="number"
                    required
                    value={trackNumber}
                    onChange={(e) => setTrackNumber(e.target.value)}
                  />
                  <Field
                    id="compositionType"
                    label="Composition type"
                    as="select"
                    required
                    value={compositionType}
                    onChange={(e) => setCompositionType(e.target.value)}
                  >
                    {COMPOSITION_TYPES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </Field>
                  <Field
                    id="commercialSamples"
                    label="Commercial samples"
                    as="select"
                    required
                    value={commercialSamples}
                    onChange={(e) => setCommercialSamples(e.target.value)}
                  >
                    {COMMERCIAL_SAMPLES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </Field>
                  <Field
                    id="audioAiUsage"
                    label="Audio AI usage"
                    as="select"
                    required
                    value={audioAiUsage}
                    onChange={(e) => setAudioAiUsage(e.target.value)}
                  >
                    {ARTWORK_AI_USAGE.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </Field>
                  <Field
                    id="compositionAiUsage"
                    label="Composition / lyrics AI"
                    as="select"
                    required
                    value={compositionAiUsage}
                    onChange={(e) => setCompositionAiUsage(e.target.value)}
                  >
                    {ARTWORK_AI_USAGE.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </Field>
                  <Field
                    id="audioLanguage"
                    label="Audio language"
                    as="select"
                    required
                    value={audioLanguage}
                    onChange={(e) => setAudioLanguage(e.target.value)}
                    helper="Use zxx if instrumental"
                  >
                    {LOCALES.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </Field>
                  <Field
                    id="recordingCountry"
                    label="Recording country"
                    as="select"
                    value={recordingCountry}
                    onChange={(e) => setRecordingCountry(e.target.value)}
                  >
                    {RECORDING_COUNTRIES.map((c) => (
                      <option key={c.value || "none"} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </Field>
                  <Field
                    id="trackExplicit"
                    label="Track explicit"
                    as="select"
                    value={trackExplicit}
                    onChange={(e) => setTrackExplicit(e.target.value)}
                  >
                    {EXPLICIT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Field>
                  <Field
                    id="isrc"
                    label="ISRC (optional)"
                    value={isrc}
                    onChange={(e) => setIsrc(e.target.value)}
                  />
                  <Field
                    id="iswc"
                    label="ISWC (optional)"
                    value={iswc}
                    onChange={(e) => setIswc(e.target.value)}
                  />
                  <Field
                    id="previewStart"
                    label="Preview start (seconds)"
                    type="number"
                    value={previewStart}
                    onChange={(e) => setPreviewStart(e.target.value)}
                  />
                  <Field
                    id="previewLength"
                    label="Preview length (seconds)"
                    type="number"
                    value={previewLength}
                    onChange={(e) => setPreviewLength(e.target.value)}
                  />
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium">Delivery flags</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <FlagToggle
                      checked={albumOnly}
                      onChange={setAlbumOnly}
                      label="Album only"
                    />
                    <FlagToggle
                      checked={freeDownload}
                      onChange={setFreeDownload}
                      label="Free download"
                    />
                    <FlagToggle
                      checked={instantGratification}
                      onChange={setInstantGratification}
                      label="Instant gratification"
                    />
                    <FlagToggle
                      checked={hasMechanicalLicense}
                      onChange={setHasMechanicalLicense}
                      label="Has mechanical license"
                    />
                  </div>
                </div>

                <Field
                  id="lyrics"
                  label="Lyrics (optional)"
                  as="textarea"
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                />

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    id="trackClineYear"
                    label="Track © year"
                    type="number"
                    value={trackClineYear}
                    onChange={(e) => setTrackClineYear(e.target.value)}
                  />
                  <Field
                    id="trackClineName"
                    label="Track © name"
                    value={trackClineName}
                    onChange={(e) => setTrackClineName(e.target.value)}
                  />
                  <Field
                    id="trackPlineYear"
                    label="Track ℗ year"
                    type="number"
                    value={trackPlineYear}
                    onChange={(e) => setTrackPlineYear(e.target.value)}
                  />
                  <Field
                    id="trackPlineName"
                    label="Track ℗ name"
                    value={trackPlineName}
                    onChange={(e) => setTrackPlineName(e.target.value)}
                  />
                </div>

                <MediaDropzone
                  id="audio"
                  label="Stereo audio file"
                  kind="audio"
                  accept="audio/wav,audio/x-wav,audio/flac,audio/mpeg,audio/mp3,.wav,.flac,.mp3"
                  file={audioFile}
                  onFile={setAudioFile}
                />
              </Panel>
            ) : null}

            {step === 4 ? (
              <Panel title={current.title} hint={current.hint}>
                <div className="space-y-4">
                  {contributors.map((c, index) => (
                    <div
                      key={c.id}
                      className="space-y-4 border border-border bg-background p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">
                          Contributor {index + 1}
                        </p>
                        {contributors.length > 1 ? (
                          <button
                            type="button"
                            className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-destructive hover:underline"
                            onClick={() =>
                              setContributors((prev) =>
                                prev.filter((x) => x.id !== c.id)
                              )
                            }
                          >
                            <Trash size={14} weight="regular" aria-hidden />
                            Remove
                          </button>
                        ) : null}
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                          id={`fn-${c.id}`}
                          label="First name"
                          required
                          value={c.firstName}
                          onChange={(e) =>
                            updateContributor(c.id, {
                              firstName: e.target.value,
                            })
                          }
                        />
                        <Field
                          id={`ln-${c.id}`}
                          label="Last name"
                          required
                          value={c.lastName}
                          onChange={(e) =>
                            updateContributor(c.id, {
                              lastName: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <p className="mb-2 text-sm font-medium">Roles</p>
                        <div className="flex flex-wrap gap-2">
                          {CONTRIBUTOR_ROLE_KEYS.map((role) => {
                            const on = c.roles.includes(role);
                            return (
                              <button
                                key={role}
                                type="button"
                                onClick={() => toggleRole(c.id, role)}
                                className={cn(
                                  "cursor-pointer border px-3 py-1.5 text-xs font-medium transition-colors duration-200",
                                  on
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                                )}
                              >
                                {role}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 px-4"
                  onClick={() =>
                    setContributors((prev) => [...prev, newContributor()])
                  }
                >
                  <Plus size={16} weight="bold" aria-hidden />
                  Add contributor
                </Button>
              </Panel>
            ) : null}

            {step === 5 ? (
              <Panel title={current.title} hint={current.hint}>
                <div className="grid gap-6 md:grid-cols-[180px_minmax(0,1fr)]">
                  <div className="border border-border bg-muted/40">
                    {artworkPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={artworkPreview}
                        alt=""
                        className="aspect-square w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-square items-center justify-center text-muted-foreground">
                        <ImageSquare size={32} weight="regular" aria-hidden />
                      </div>
                    )}
                  </div>
                  <dl>
                    <SummaryRow
                      label="Artist"
                      value={`${selected?.name ?? "—"} (${artisticRole})`}
                    />
                    <SummaryRow label="Title" value={title} />
                    <SummaryRow
                      label="Type"
                      value={`${contentType} · ${primaryGenre}`}
                    />
                    <SummaryRow label="Release date" value={releaseDate} />
                    <SummaryRow
                      label="Localization"
                      value={preferredLocalization}
                    />
                    <SummaryRow label="Track" value={trackTitle || title} />
                    <SummaryRow
                      label="Artwork"
                      value={artworkFile?.name ?? "—"}
                    />
                    <SummaryRow label="Audio" value={audioFile?.name ?? "—"} />
                    <SummaryRow
                      label="Credits"
                      value={
                        contributors
                          .filter((c) => c.firstName && c.lastName)
                          .map(
                            (c) =>
                              `${c.firstName} ${c.lastName} (${c.roles.join(", ")})`
                          )
                          .join("; ") || "—"
                      }
                    />
                    <SummaryRow label="Catalog" value="RDISTROXXXXXX (auto)" />
                  </dl>
                </div>
              </Panel>
            ) : null}
          </motion.div>
        </AnimatePresence>

        <div className="sticky bottom-0 z-10 -mx-1 border border-border bg-card/95 px-4 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-card/80">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              {step > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 px-4"
                  onClick={() => setStep((s) => s - 1)}
                  disabled={status === "loading"}
                >
                  <ArrowLeft size={16} weight="bold" aria-hidden />
                  Back
                </Button>
              ) : (
                <Link
                  href="/dashboard/releases"
                  className="inline-flex h-11 items-center px-2 text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
                >
                  Cancel
                </Link>
              )}
            </div>
            <div className="flex items-center gap-3">
              {!canNext && step < STEPS.length - 1 ? (
                <p className="hidden text-xs text-muted-foreground sm:block">
                  Complete required fields to continue
                </p>
              ) : null}
              {step < STEPS.length - 1 ? (
                <Button
                  type="button"
                  className="h-11 px-5"
                  disabled={!canNext}
                  onClick={() => setStep((s) => s + 1)}
                >
                  Continue
                  <ArrowRight size={16} weight="bold" aria-hidden />
                </Button>
              ) : (
                <Button
                  type="button"
                  className="h-11 px-5"
                  disabled={status === "loading" || !canNext}
                  onClick={submit}
                >
                  {status === "loading"
                    ? "Uploading…"
                    : "Submit for review"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** @deprecated Use ReleaseBuilder */
export const ReleaseSubmitForm = ReleaseBuilder;
