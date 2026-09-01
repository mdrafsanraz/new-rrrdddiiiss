"use client";

/**
 * Step 5's "Submit Release" screen — replaces the review UI once the user
 * clicks Submit. Drives the entire LabelGrid sync (create release → upload
 * artwork → create tracks → upload audio → wait for processing → sync
 * credits → finalize) through the /api/releases/[id]/submit/* endpoints.
 *
 * `runSubmission` is safe to re-invoke at any point — every stage checks
 * real persisted state (via GET .../submit/status) before doing anything,
 * so calling it again (Retry, or after providing a re-selected file) only
 * ever resumes at the first incomplete stage. Nothing here fakes progress:
 * artwork/audio percentages come from real XMLHttpRequest upload events;
 * stages with no meaningful byte-progress (track creation, audio
 * processing, credits verification) show waiting/processing/completed
 * instead of an invented percentage.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  CircleNotch,
  Disc,
  MusicNotes,
  WarningCircle,
  Waveform,
} from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { cn } from "@/lib/utils";
import {
  convertAudioTo16BitWav,
  inspectAudioCompatibility,
} from "@/lib/audio/compatibility";

type ItemStatus = "waiting" | "processing" | "completed" | "failed";

type TrackRuntime = {
  id: string;
  clientId: string;
  title: string;
  audioFile: File | null;
  createStatus: ItemStatus;
  createError: string | null;
  audioStatus: ItemStatus;
  audioPct: number;
  audioError: string | null;
  processStatus: ItemStatus;
  processError: string | null;
  creditsStatus: ItemStatus;
  creditsError: string | null;
};

type SubmissionTrackInput = {
  id: string | null;
  clientId: string;
  title: string;
  audioFile: File | null;
};

type PendingFileRequest =
  | { kind: "artwork" }
  | { kind: "audio"; trackId: string; title: string };

function xhrRequest(
  method: string,
  url: string,
  body: FormData | Blob | string,
  opts: {
    headers?: Record<string, string>;
    onProgress?: (loaded: number, total: number) => void;
  } = {}
): Promise<{ ok: boolean; status: number; json: unknown }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    if (opts.headers) {
      for (const [k, v] of Object.entries(opts.headers)) xhr.setRequestHeader(k, v);
    }
    if (opts.onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) opts.onProgress!(e.loaded, e.total);
      };
    }
    xhr.onload = () => {
      let json: unknown = null;
      try {
        json = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        json = null;
      }
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, json });
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(body);
  });
}

function StatusIcon({ status }: { status: ItemStatus }) {
  return (
    <motion.span
      layout
      className={cn(
        "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border text-[0] transition-colors duration-500",
        status === "completed"
          ? "border-primary bg-primary text-primary-foreground"
          : status === "failed"
            ? "border-destructive/30 bg-destructive/10 text-destructive"
            : status === "processing"
              ? "border-primary/50 bg-primary/12 text-primary shadow-[0_0_0_5px_color-mix(in_oklch,var(--primary)_10%,transparent)]"
              : "border-border bg-card text-muted-foreground"
      )}
      aria-hidden
    >
      {status === "completed" ? (
        <Check size={12} weight="bold" />
      ) : status === "failed" ? (
        <WarningCircle size={12} weight="bold" />
      ) : status === "processing" ? (
        <CircleNotch size={14} weight="bold" className="animate-spin" />
      ) : (
        <span className="size-1.5 rounded-full bg-current opacity-40" />
      )}
    </motion.span>
  );
}

function StageRow({
  status,
  label,
  detail,
  pct,
}: {
  status: ItemStatus;
  label: string;
  detail?: string | null;
  pct?: number | null;
}) {
  return (
    <motion.div
      layout
      className={cn(
        "relative flex flex-col gap-2 rounded-xl px-3 py-2.5 transition-colors duration-500",
        status === "processing" && "bg-primary/[0.055]",
        status === "failed" && "bg-destructive/[0.045]"
      )}
    >
      <div className="flex items-center gap-3">
        <StatusIcon status={status} />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm transition-colors duration-500",
              status === "completed"
                ? "text-muted-foreground"
                : status === "failed"
                  ? "font-medium text-destructive"
                  : status === "processing"
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
            )}
          >
            {label}
          </p>
          {detail ? <p className="text-xs text-destructive">{detail}</p> : null}
        </div>
        {typeof pct === "number" && status === "processing" ? (
          <span className="font-mono text-xs font-semibold tabular-nums text-primary">
            {Math.round(pct)}%
          </span>
        ) : null}
      </div>
      {typeof pct === "number" && status === "processing" ? (
        <div className="ml-10 h-1.5 overflow-hidden rounded-full bg-primary/10">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={false}
            animate={{ width: `${Math.max(pct, 2)}%` }}
            transition={{ duration: 0.28, ease: "linear" }}
          />
        </div>
      ) : null}
    </motion.div>
  );
}

export function SubmissionProgress({
  releaseId,
  title,
  artworkFile,
  tracks: trackInputs,
  onCancel,
}: {
  releaseId: string;
  title: string;
  artworkFile: File | null;
  tracks: SubmissionTrackInput[];
  onCancel: () => void;
}) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const [validateStatus, setValidateStatus] = useState<ItemStatus>("waiting");
  const [validateErrors, setValidateErrors] = useState<string[]>([]);
  const [releaseStatus, setReleaseStatus] = useState<ItemStatus>("waiting");
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [artworkStatus, setArtworkStatus] = useState<ItemStatus>("waiting");
  const [artworkPct, setArtworkPct] = useState(0);
  const [artworkError, setArtworkError] = useState<string | null>(null);
  const [finalizeStatus, setFinalizeStatus] = useState<ItemStatus>("waiting");
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);
  const [running, setRunning] = useState(false);
  const [pendingFile, setPendingFile] = useState<PendingFileRequest | null>(null);
  const [pendingAudioError, setPendingAudioError] = useState<string | null>(null);
  const [pendingRejectedAudio, setPendingRejectedAudio] = useState<File | null>(null);
  const [convertingPendingAudio, setConvertingPendingAudio] = useState(false);

  const [tracksState, setTracksState] = useState<TrackRuntime[]>(() =>
    trackInputs.map((t) => ({
      id: t.id ?? "",
      clientId: t.clientId,
      title: t.title,
      audioFile: t.audioFile,
      createStatus: "waiting",
      createError: null,
      audioStatus: "waiting",
      audioPct: 0,
      audioError: null,
      processStatus: "waiting",
      processError: null,
      creditsStatus: "waiting",
      creditsError: null,
    }))
  );

  const artworkFileRef = useRef<File | null>(artworkFile);
  const runIdRef = useRef(0);
  // The mutable source of truth `runSubmission` reads/iterates while it's
  // executing — `tracksState` (React state) is for rendering only and
  // updates asynchronously, so a file set via patchTrack right before
  // re-invoking runSubmission() wouldn't be visible yet if the function
  // read from state directly (classic stale-closure trap).
  const tracksRef = useRef<TrackRuntime[]>(tracksState);

  function patchTrack(id: string, partial: Partial<TrackRuntime>) {
    tracksRef.current = tracksRef.current.map((t) =>
      t.id === id ? { ...t, ...partial } : t
    );
    setTracksState(tracksRef.current);
  }

  function resumeWithAudioFile(trackId: string, file: File) {
    patchTrack(trackId, { audioFile: file });
    setPendingAudioError(null);
    setPendingRejectedAudio(null);
    setPendingFile(null);
    void runSubmission();
  }

  async function selectPendingAudio(trackId: string, file: File) {
    setPendingAudioError(null);
    const compatibility = await inspectAudioCompatibility(file);
    if (!compatibility.compatible) {
      setPendingRejectedAudio(compatibility.canConvert ? file : null);
      setPendingAudioError(compatibility.error);
      return;
    }
    resumeWithAudioFile(trackId, file);
  }

  async function convertPendingAudio(trackId: string) {
    if (!pendingRejectedAudio) return;
    setConvertingPendingAudio(true);
    setPendingAudioError(null);
    try {
      const converted = await convertAudioTo16BitWav(pendingRejectedAudio);
      resumeWithAudioFile(trackId, converted);
    } catch (error) {
      setPendingAudioError(error instanceof Error ? error.message : "Audio conversion failed.");
    } finally {
      setConvertingPendingAudio(false);
    }
  }

  async function runSubmission() {
    if (running) return;
    setRunning(true);
    setPendingFile(null);
    setPendingAudioError(null);
    setPendingRejectedAudio(null);
    const myRun = ++runIdRef.current;
    const stale = () => myRun !== runIdRef.current;

    try {
      // Seed from authoritative persisted state so a reload/retry never
      // restarts a stage that already completed.
      const statusRes = await fetch(`/api/releases/${releaseId}/submit/status`);
      const statusData = await statusRes.json();
      if (stale()) return;
      if (!statusRes.ok) {
        setValidateStatus("failed");
        setValidateErrors([statusData.error ?? "Could not load submission status."]);
        return;
      }
      if (statusData.locked) {
        setValidateStatus("failed");
        setValidateErrors([
          "This release is already being submitted (in another tab, or a run is still finishing) — please wait a moment and try again.",
        ]);
        return;
      }

      type ServerTrackStatus = {
        id: string;
        hasLabelGridId: boolean;
        hasAudioUrl: boolean;
        audioProcessing: boolean;
        audioProcessingError: string | null;
        creditsSynced: boolean;
      };
      const artworkAlreadyDone = Boolean(statusData.release?.hasArtwork);
      const trackServerState = new Map<string, ServerTrackStatus>(
        (statusData.tracks ?? []).map(
          (t: ServerTrackStatus): [string, ServerTrackStatus] => [t.id, t]
        )
      );

      tracksRef.current = tracksRef.current.map((t) => {
        const s = trackServerState.get(t.id);
        if (!s) return t;
        // LabelGrid's own failure message says "re-upload to retry" — a
        // processing failure means the upload itself must run again, not
        // just be re-polled, so audioStatus resets to "waiting" too
        // (prompting a re-select if the file isn't still in memory).
        const processingFailed = !s.hasAudioUrl && Boolean(s.audioProcessingError);
        return {
          ...t,
          // Stage 4 is deliberately re-run even when the track already has
          // a LabelGrid id. The server uses that id to PATCH current track
          // metadata; it only POSTs for a genuinely new local track.
          createStatus: "waiting",
          audioStatus: t.audioFile
            ? "waiting"
            : s.hasAudioUrl
            ? "completed"
            : processingFailed
              ? "waiting"
              : t.audioStatus,
          processStatus: t.audioFile
            ? "waiting"
            : s.hasAudioUrl
            ? "completed"
            : processingFailed
              ? "waiting"
              : t.processStatus,
          processError: processingFailed ? null : t.processError,
          creditsStatus: s.creditsSynced ? "completed" : t.creditsStatus,
        };
      });
      setTracksState(tracksRef.current);

      // ---- Stage 1: Prepare & Validate ----
      setValidateStatus("processing");
      const validateRes = await fetch(`/api/releases/${releaseId}/submit/validate`, {
        method: "POST",
      });
      const validateData = await validateRes.json();
      if (stale()) return;
      if (!validateRes.ok || !validateData.ok) {
        setValidateStatus("failed");
        setValidateErrors(validateData.errors ?? [validateData.error ?? "Validation failed."]);
        return;
      }
      setValidateStatus("completed");

      // ---- Stage 2: Create or PATCH Release ----
      // Always invoke the idempotent server stage. When labelgridId exists,
      // ensureLabelGridReleaseForSubmit PATCHes that exact LabelGrid release;
      // it only creates a release when no mapping exists yet.
      setReleaseStatus("processing");
      setReleaseError(null);
      const releaseRes = await fetch(`/api/releases/${releaseId}/submit/release`, {
        method: "POST",
      });
      const releaseData = await releaseRes.json();
      if (stale()) return;
      if (!releaseRes.ok) {
        setReleaseStatus("failed");
        setReleaseError(
          releaseData.error ?? "Could not sync the release."
        );
        return;
      }
      setReleaseStatus("completed");

      // ---- Stage 3: Upload Artwork ----
      // Existing artwork is retained unless the editor selected a new file.
      if (artworkAlreadyDone && !artworkFileRef.current) {
        setArtworkStatus("completed");
        setArtworkPct(100);
      } else {
        const file = artworkFileRef.current;
        if (!file) {
          setPendingFile({ kind: "artwork" });
          return;
        }
        setArtworkStatus("processing");
        setArtworkPct(0);
        try {
          const fd = new FormData();
          fd.set("artwork", file);
          const res = await xhrRequest(
            "POST",
            `/api/releases/${releaseId}/submit/artwork`,
            fd,
            {
              onProgress: (loaded, total) =>
                setArtworkPct(Math.min(99, (loaded / total) * 100)),
            }
          );
          if (stale()) return;
          if (!res.ok) {
            setArtworkStatus("failed");
            const body = res.json as { error?: string } | null;
            setArtworkError(body?.error ?? "Could not upload artwork.");
            return;
          }
          setArtworkPct(100);
          setArtworkStatus("completed");
        } catch {
          if (stale()) return;
          setArtworkStatus("failed");
          setArtworkError("Network error while uploading artwork.");
          return;
        }
      }

      // ---- Stage 4: Create or PATCH Tracks ----
      for (const t of tracksRef.current) {
        if (stale()) return;
        patchTrack(t.id, { createStatus: "processing", createError: null });
        const res = await fetch(
          `/api/releases/${releaseId}/submit/tracks/${t.id}`,
          { method: "POST" }
        );
        const data = await res.json();
        if (stale()) return;
        if (!res.ok) {
          patchTrack(t.id, {
            createStatus: "failed",
            createError: data.error ?? "Could not create this track.",
          });
          return;
        }
        patchTrack(t.id, { createStatus: "completed" });
      }

      // ---- Stage 5: Upload Audio ----
      for (const t of tracksRef.current) {
        if (stale()) return;
        if (t.audioStatus === "completed") continue;
        if (!t.audioFile) {
          setPendingFile({ kind: "audio", trackId: t.id, title: t.title });
          return;
        }
        patchTrack(t.id, { audioStatus: "processing", audioPct: 0, audioError: null });
        try {
          const urlRes = await fetch(
            `/api/releases/${releaseId}/submit/tracks/${t.id}/audio-upload-url`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ filename: t.audioFile.name || "audio.wav" }),
            }
          );
          const urlData = await urlRes.json();
          if (stale()) return;
          if (!urlRes.ok) {
            patchTrack(t.id, {
              audioStatus: "failed",
              audioError: urlData.error ?? "Could not get an upload URL.",
            });
            return;
          }
          if (urlData.skipped) {
            patchTrack(t.id, { audioStatus: "completed", audioPct: 100 });
            continue;
          }

          const put = await xhrRequest("PUT", urlData.uploadUrl, t.audioFile, {
            headers: {
              "Content-Type": t.audioFile.type || "application/octet-stream",
            },
            onProgress: (loaded, total) =>
              patchTrack(t.id, { audioPct: Math.min(99, (loaded / total) * 100) }),
          });
          if (stale()) return;
          if (!put.ok) {
            patchTrack(t.id, {
              audioStatus: "failed",
              audioError: `Upload to distributor failed (${put.status}).`,
            });
            return;
          }

          const regRes = await fetch(
            `/api/releases/${releaseId}/submit/tracks/${t.id}/audio-register`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ key: urlData.key }),
            }
          );
          const regData = await regRes.json();
          if (stale()) return;
          if (!regRes.ok) {
            patchTrack(t.id, {
              audioStatus: "failed",
              audioError: regData.error ?? "Could not register the uploaded audio.",
            });
            return;
          }
          patchTrack(t.id, { audioStatus: "completed", audioPct: 100 });
        } catch {
          if (stale()) return;
          patchTrack(t.id, {
            audioStatus: "failed",
            audioError: "Network error while uploading audio.",
          });
          return;
        }
      }

      // ---- Stage 6: Process Audio (poll) ----
      for (const t of tracksRef.current) {
        if (stale()) return;
        if (t.processStatus === "completed") continue;
        patchTrack(t.id, { processStatus: "processing" });
        const deadline = Date.now() + 5 * 60_000;
        for (;;) {
          if (stale()) return;
          const res = await fetch(
            `/api/releases/${releaseId}/tracks/${t.id}/audio-status`,
            { method: "POST" }
          );
          const data = await res.json();
          if (stale()) return;
          if (!res.ok) {
            patchTrack(t.id, {
              processStatus: "failed",
              processError: data.error ?? "Could not check audio processing status.",
            });
            return;
          }
          if (data.status === "ready" || data.status === "none") {
            patchTrack(t.id, { processStatus: "completed" });
            break;
          }
          if (data.status === "failed") {
            patchTrack(t.id, {
              processStatus: "failed",
              processError: data.error ?? "Audio processing failed.",
            });
            return;
          }
          if (Date.now() > deadline) {
            patchTrack(t.id, {
              processStatus: "failed",
              processError: "Audio is taking longer than expected to process — try Retry shortly.",
            });
            return;
          }
          await new Promise((r) => setTimeout(r, 4000));
        }
      }

      // ---- Stage 7: Credits & Rights ----
      for (const t of tracksRef.current) {
        if (stale()) return;
        if (t.creditsStatus === "completed") continue;
        patchTrack(t.id, { creditsStatus: "processing", creditsError: null });
        const res = await fetch(
          `/api/releases/${releaseId}/submit/tracks/${t.id}/credits`,
          { method: "POST" }
        );
        const data = await res.json();
        if (stale()) return;
        if (!res.ok) {
          patchTrack(t.id, {
            creditsStatus: "failed",
            creditsError: data.error ?? "Could not sync credits.",
          });
          return;
        }
        patchTrack(t.id, { creditsStatus: "completed" });
      }

      // ---- Stage 8: Finalize ----
      setFinalizeStatus("processing");
      const finRes = await fetch(`/api/releases/${releaseId}/submit/finalize`, {
        method: "POST",
      });
      const finData = await finRes.json();
      if (stale()) return;
      if (!finRes.ok) {
        setFinalizeStatus("failed");
        setFinalizeError(finData.error ?? "Could not finalize your submission.");
        return;
      }
      setFinalizeStatus("completed");
      setSucceeded(true);
    } catch {
      if (myRun === runIdRef.current) {
        setFinalizeStatus((s) => (s === "processing" ? "failed" : s));
      }
    } finally {
      if (myRun === runIdRef.current) setRunning(false);
    }
  }

  useEffect(() => {
    // Deferred a tick so the run's setState calls don't fire synchronously
    // within the effect body. Auto-starts once on mount; every further
    // attempt is user-triggered (Retry / re-select file), matching
    // "resume, never restart".
    const t = setTimeout(() => void runSubmission(), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const anyFailed =
    validateStatus === "failed" ||
    releaseStatus === "failed" ||
    artworkStatus === "failed" ||
    finalizeStatus === "failed" ||
    tracksState.some(
      (t) =>
        t.createStatus === "failed" ||
        t.audioStatus === "failed" ||
        t.processStatus === "failed" ||
        t.creditsStatus === "failed"
    );

  const trackStageStatus = (
    key: "createStatus" | "audioStatus" | "processStatus" | "creditsStatus"
  ): ItemStatus => {
    if (tracksState.length === 0) return "waiting";
    if (tracksState.some((t) => t[key] === "failed")) return "failed";
    if (tracksState.every((t) => t[key] === "completed")) return "completed";
    if (tracksState.some((t) => t[key] === "processing")) return "processing";
    return "waiting";
  };

  const createTracksStatus = trackStageStatus("createStatus");
  const uploadAudioStatus = trackStageStatus("audioStatus");
  const processAudioStatus = trackStageStatus("processStatus");
  const creditsStatus = trackStageStatus("creditsStatus");
  const stageStatuses = [
    validateStatus,
    releaseStatus,
    artworkStatus,
    createTracksStatus,
    uploadAudioStatus,
    processAudioStatus,
    creditsStatus,
    finalizeStatus,
  ];
  const completedStages = stageStatuses.filter((status) => status === "completed").length;

  if (succeeded) {
    return (
      <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-foreground/70 p-4 backdrop-blur-md">
        <motion.div
          className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-card p-8 text-center shadow-[0_40px_120px_color-mix(in_oklch,var(--foreground)_38%,transparent)] sm:p-12"
          initial={reduceMotion ? false : { opacity: 0, transform: "scale(.94) translateY(16px)" }}
          animate={{ opacity: 1, transform: "scale(1) translateY(0)" }}
          transition={{ type: "spring", bounce: 0.18, visualDuration: 0.5 }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklch,var(--primary)_22%,transparent),transparent_68%)]" />
          <motion.div
            className="relative mx-auto flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_0_10px_color-mix(in_oklch,var(--primary)_10%,transparent)]"
            initial={reduceMotion ? false : { transform: "scale(.5)", opacity: 0 }}
            animate={{ transform: "scale(1)", opacity: 1 }}
            transition={{ delay: 0.12, type: "spring", bounce: 0.35, visualDuration: 0.55 }}
          >
            <Check size={28} weight="bold" aria-hidden />
          </motion.div>
          <p className="relative mt-7 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            Delivery initiated
          </p>
          <h2 className="relative mt-2 text-3xl font-semibold tracking-[-0.04em]">
            Your release is in motion
          </h2>
          <p className="relative mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
            “{title || "Your release"}” has been submitted to RDISTRO for review.
          </p>
          <div className="relative mt-8 flex flex-col justify-center gap-2 sm:flex-row">
            <Button type="button" className="h-11 px-6" onClick={() => router.push(`/dashboard/releases/${releaseId}`)}>
              View release <ArrowRight size={16} weight="bold" />
            </Button>
            <Button type="button" variant="outline" className="h-11 px-6" onClick={() => router.push("/dashboard/releases")}>
              My releases
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-foreground/70 p-3 backdrop-blur-md sm:p-6" role="status" aria-live="polite">
      <motion.div
        className="mx-auto my-2 grid min-h-[calc(100dvh-2.5rem)] w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-card shadow-[0_40px_120px_color-mix(in_oklch,var(--foreground)_42%,transparent)] lg:my-6 lg:min-h-0 lg:grid-cols-[0.78fr_1.22fr]"
        initial={reduceMotion ? false : { opacity: 0, transform: "scale(.97) translateY(18px)" }}
        animate={{ opacity: 1, transform: "scale(1) translateY(0)" }}
        transition={{ type: "spring", bounce: 0.12, visualDuration: 0.52 }}
      >
        <section className="relative isolate overflow-hidden bg-foreground p-6 text-background sm:p-9 lg:flex lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_5%_5%,color-mix(in_oklch,var(--primary)_48%,transparent),transparent_42%)]" />
          <div className="pointer-events-none absolute -right-20 bottom-12 -z-10 size-64 rounded-full border border-background/10" />
          <div>
            <div className="flex items-center justify-between">
              <span className="flex size-10 items-center justify-center rounded-xl border border-background/15 bg-background/8">
                <Disc size={21} weight="duotone" />
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-background/45">
                Step 5 of 5
              </span>
            </div>
            <p className="mt-10 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Release transfer</p>
            <h2 className="mt-3 max-w-sm text-3xl font-semibold leading-[1.05] tracking-[-0.045em] sm:text-4xl">
              Sending your music out into the world.
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-6 text-background/60">
              Keep this window open. Every completed stage is safely saved, so a retry always resumes where it stopped.
            </p>
          </div>
          <div className="mt-10 border-t border-background/12 pt-5">
            <p className="truncate text-sm font-medium">{title || "Untitled release"}</p>
            <div className="mt-2 flex items-center gap-2 text-xs text-background/45">
              <Waveform size={15} weight="bold" />
              <span>{tracksState.length} {tracksState.length === 1 ? "track" : "tracks"}</span>
              <span className="text-background/20">/</span>
              <span>{completedStages} of 8 stages complete</span>
            </div>
          </div>
        </section>

        <section className="flex min-h-0 flex-col bg-card">
          <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-5 sm:px-8 sm:py-6">
            <div>
              <p className="text-lg font-semibold tracking-tight">Submitting your release</p>
              <p className="mt-1 text-sm text-muted-foreground">Live status from RDISTRO distribution services</p>
            </div>
            <MusicNotes className="mt-0.5 size-5 text-primary" weight="duotone" />
          </header>

          <motion.div layout className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3 sm:px-5 sm:py-4">
          <div>
          <StageRow
            status={validateStatus}
            label="Preparing release"
            detail={validateErrors[0] ?? null}
          />
        </div>
        <div>
          <StageRow status={releaseStatus} label="Creating release" detail={releaseError} />
        </div>
        <div>
          <StageRow
            status={artworkStatus}
            label="Uploading artwork"
            detail={artworkError}
            pct={artworkPct}
          />
        </div>
        <div>
          <StageRow status={createTracksStatus} label="Creating tracks" />
          {tracksState.length > 1 || createTracksStatus !== "waiting" ? (
            <AnimatePresence initial={false}><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="ml-7 space-y-0.5 border-l border-border pl-3">
              {tracksState.map((t) => (
                <StageRow
                  key={t.id}
                  status={t.createStatus}
                  label={t.title || "Untitled track"}
                  detail={t.createError}
                />
              ))}
            </motion.div></AnimatePresence>
          ) : null}
        </div>
        <div>
          <StageRow status={uploadAudioStatus} label="Uploading audio" />
          <div className="ml-7 space-y-0.5 border-l border-border pl-3">
            {tracksState.map((t) => (
              <StageRow
                key={t.id}
                status={t.audioStatus}
                label={t.title || "Untitled track"}
                detail={t.audioError}
                pct={t.audioPct}
              />
            ))}
          </div>
        </div>
        <div>
          <StageRow status={processAudioStatus} label="Processing audio" />
          <div className="ml-7 space-y-0.5 border-l border-border pl-3">
            {tracksState.map((t) => (
              <StageRow
                key={t.id}
                status={t.processStatus}
                label={t.title || "Untitled track"}
                detail={t.processError}
              />
            ))}
          </div>
        </div>
        <div>
          <StageRow status={creditsStatus} label="Credits & rights" />
        </div>
        <div>
          <StageRow status={finalizeStatus} label="Finalizing" detail={finalizeError} />
        </div>
          </motion.div>

      {pendingFile ? (
        <div className="px-6 pb-6">
          <Callout tone="warning" icon={<WarningCircle size={18} weight="fill" aria-hidden />}>
            <p className="font-medium text-amber-900 dark:text-amber-200">
              {pendingFile.kind === "artwork"
                ? "We need your artwork again — it was not kept in memory (likely after a page refresh)."
                : `We need the audio for "${pendingFile.title}" again — it was not kept in memory (likely after a page refresh).`}
            </p>
            <input
              type="file"
              accept={pendingFile.kind === "artwork" ? "image/jpeg,image/png,image/webp" : "audio/wav,audio/flac,.wav,.flac"}
              className="mt-2.5 block text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                if (!file) return;
                if (pendingFile.kind === "artwork") {
                  artworkFileRef.current = file;
                  setPendingFile(null);
                  void runSubmission();
                } else {
                  void selectPendingAudio(pendingFile.trackId, file).catch(() => {
                    setPendingAudioError("Could not inspect this audio file. Select a valid WAV or FLAC file.");
                  });
                }
              }}
            />
            {pendingFile.kind === "audio" && pendingAudioError ? (
              <div className="mt-3 border-l-2 border-destructive pl-3">
                <p className="text-sm text-destructive">{pendingAudioError}</p>
                {pendingRejectedAudio ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 h-9 px-3"
                    disabled={convertingPendingAudio}
                    onClick={() => void convertPendingAudio(pendingFile.trackId)}
                  >
                    {convertingPendingAudio ? <CircleNotch size={16} className="animate-spin" aria-hidden /> : null}
                    {convertingPendingAudio ? "Converting audio..." : "Convert to 16-bit WAV"}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </Callout>
        </div>
      ) : null}

      {anyFailed && !pendingFile ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-5 sm:px-8">
          <p className="text-sm text-destructive">
            Something did not go through — already-completed steps will not be redone.
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-9 px-4" onClick={onCancel}>
              Back to Review
            </Button>
            <Button
              type="button"
              className="h-9 px-4"
              loading={running}
              onClick={() => void runSubmission()}
            >
              Retry
            </Button>
          </div>
        </div>
      ) : null}
        </section>
      </motion.div>
    </div>
  );
}
