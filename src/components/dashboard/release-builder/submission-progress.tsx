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
  Check,
  CircleNotch,
  WarningCircle,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  if (status === "completed") {
    return <Check size={14} weight="bold" className="text-emerald-600 dark:text-emerald-400" aria-hidden />;
  }
  if (status === "failed") {
    return <WarningCircle size={14} weight="fill" className="text-destructive" aria-hidden />;
  }
  if (status === "processing") {
    return <CircleNotch size={14} weight="bold" className="animate-spin text-primary" aria-hidden />;
  }
  return <span className="size-2.5 rounded-full border border-border" aria-hidden />;
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
    <div className="flex items-center gap-3 py-1.5">
      <StatusIcon status={status} />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm",
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
        <span className="tabular-nums text-xs font-medium text-muted-foreground">
          {Math.round(pct)}%
        </span>
      ) : null}
    </div>
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

  async function runSubmission() {
    if (running) return;
    setRunning(true);
    setPendingFile(null);
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
      const releaseAlreadyCreated = Boolean(statusData.release?.hasLabelGridId);
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
          createStatus: s.hasLabelGridId ? "completed" : t.createStatus,
          audioStatus: s.hasAudioUrl
            ? "completed"
            : processingFailed
              ? "waiting"
              : t.audioStatus,
          processStatus: s.hasAudioUrl
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

      // ---- Stage 2: Create Release ----
      let lgReleaseCreated = releaseAlreadyCreated;
      if (releaseAlreadyCreated) {
        setReleaseStatus("completed");
      } else {
        setReleaseStatus("processing");
        const res = await fetch(`/api/releases/${releaseId}/submit/release`, {
          method: "POST",
        });
        const data = await res.json();
        if (stale()) return;
        if (!res.ok) {
          setReleaseStatus("failed");
          setReleaseError(data.error ?? "Could not create the release on LabelGrid.");
          return;
        }
        setReleaseStatus("completed");
        lgReleaseCreated = true;
      }
      if (!lgReleaseCreated) return;

      // ---- Stage 3: Upload Artwork ----
      if (artworkAlreadyDone) {
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

      // ---- Stage 4: Create Tracks ----
      for (const t of tracksRef.current) {
        if (stale()) return;
        if (t.createStatus === "completed") continue;
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

  if (succeeded) {
    return (
      <div className="space-y-6 border border-border bg-card p-8 text-center">
        <div className="mx-auto flex size-12 items-center justify-center border border-emerald-600/30 bg-emerald-600/10 text-emerald-600 dark:text-emerald-400">
          <Check size={22} weight="bold" aria-hidden />
        </div>
        <div>
          <p className="text-lg font-semibold">Release submitted successfully</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your release has been submitted to RDISTRO for review.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            className="h-10 px-5"
            onClick={() => router.push(`/dashboard/releases/${releaseId}`)}
          >
            View Release
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 px-5"
            onClick={() => router.push("/dashboard/releases")}
          >
            Back to My Releases
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 border border-border bg-card p-6" role="status" aria-live="polite">
      <div>
        <p className="text-base font-semibold">Submitting your release</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Please keep this page open while we prepare “{title || "your release"}”.
        </p>
      </div>

      <div className="divide-y divide-border border border-border">
        <div className="px-4 py-1">
          <StageRow
            status={validateStatus}
            label="Preparing release"
            detail={validateErrors[0] ?? null}
          />
        </div>
        <div className="px-4 py-1">
          <StageRow status={releaseStatus} label="Creating release" detail={releaseError} />
        </div>
        <div className="px-4 py-1">
          <StageRow
            status={artworkStatus}
            label="Uploading artwork"
            detail={artworkError}
            pct={artworkPct}
          />
        </div>
        <div className="px-4 py-2">
          <StageRow status={trackStageStatus("createStatus")} label="Creating tracks" />
          {tracksState.length > 1 || trackStageStatus("createStatus") !== "waiting" ? (
            <div className="mt-1 ml-6 space-y-1">
              {tracksState.map((t) => (
                <StageRow
                  key={t.id}
                  status={t.createStatus}
                  label={t.title || "Untitled track"}
                  detail={t.createError}
                />
              ))}
            </div>
          ) : null}
        </div>
        <div className="px-4 py-2">
          <StageRow status={trackStageStatus("audioStatus")} label="Uploading audio" />
          <div className="mt-1 ml-6 space-y-1">
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
        <div className="px-4 py-2">
          <StageRow status={trackStageStatus("processStatus")} label="Processing audio" />
          <div className="mt-1 ml-6 space-y-1">
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
        <div className="px-4 py-1">
          <StageRow status={trackStageStatus("creditsStatus")} label="Adding credits & rights" />
        </div>
        <div className="px-4 py-1">
          <StageRow status={finalizeStatus} label="Finalizing" detail={finalizeError} />
        </div>
      </div>

      {pendingFile ? (
        <div className="border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-400">
            {pendingFile.kind === "artwork"
              ? "We need your artwork again — it was not kept in memory (likely after a page refresh)."
              : `We need the audio for "${pendingFile.title}" again — it was not kept in memory (likely after a page refresh).`}
          </p>
          <input
            type="file"
            accept={pendingFile.kind === "artwork" ? "image/jpeg,image/png,image/webp" : "audio/wav,audio/flac,.wav,.flac"}
            className="mt-2 block text-sm"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              if (!file) return;
              if (pendingFile.kind === "artwork") {
                artworkFileRef.current = file;
              } else {
                patchTrack(pendingFile.trackId, { audioFile: file });
              }
              setPendingFile(null);
              void runSubmission();
            }}
          />
        </div>
      ) : null}

      {anyFailed && !pendingFile ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
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
    </div>
  );
}
