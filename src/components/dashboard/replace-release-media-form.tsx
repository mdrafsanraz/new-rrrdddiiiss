"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type TrackOption = {
  id: string;
  title: string;
  trackNumber: number;
  hasAudioOnDisk: boolean;
};

export function ReplaceReleaseMediaForm({
  releaseId,
  tracks,
  artworkOnDisk,
  needsArtwork,
  needsAudio,
}: {
  releaseId: string;
  tracks: TrackOption[];
  artworkOnDisk: boolean;
  needsArtwork: boolean;
  needsAudio: boolean;
}) {
  const router = useRouter();
  const [artwork, setArtwork] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const [trackId, setTrackId] = useState(tracks[0]?.id ?? "");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    if (!artwork && !audio) {
      setError("Choose cover artwork and/or audio to upload.");
      return;
    }
    setStatus("loading");
    try {
      const fd = new FormData();
      if (artwork) fd.set("artwork", artwork);
      if (audio) {
        fd.set("audio", audio);
        if (trackId) fd.set("trackId", trackId);
      }
      const res = await fetch(`/api/releases/${releaseId}/media`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        setStatus("idle");
        return;
      }
      setOk(
        data.labelgrid?.uploaded
          ? "Uploaded. Staff can approve."
          : "Media saved. Staff can approve once the files are received."
      );
      setArtwork(null);
      setAudio(null);
      setStatus("idle");
      router.refresh();
    } catch {
      setError("Network error");
      setStatus("idle");
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 border border-amber-300 bg-amber-50 p-4 text-amber-950"
    >
      <div>
        <p className="text-sm font-semibold">Re-upload media</p>
        <p className="mt-1 text-xs text-amber-900/80">
          {needsArtwork || needsAudio
            ? "Cover art and/or audio are missing on this server. Upload again so Approve can proceed."
            : "Replace cover art or audio."}
        </p>
        <ul className="mt-2 list-inside list-disc text-xs">
          <li>
            Artwork:{" "}
            {artworkOnDisk ? "on server" : "missing — upload required"}
          </li>
          {tracks.map((t) => (
            <li key={t.id}>
              Track {t.trackNumber} ({t.title}):{" "}
              {t.hasAudioOnDisk ? "audio on server" : "audio missing"}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-2">
        <label htmlFor={`replace-art-${releaseId}`} className="text-sm font-medium">
          Cover artwork
        </label>
        <input
          id={`replace-art-${releaseId}`}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="block w-full text-sm file:mr-3 file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
          onChange={(e) => setArtwork(e.target.files?.[0] ?? null)}
        />
      </div>

      {tracks.length > 1 ? (
        <label className="grid gap-1 text-sm font-medium">
          Track for audio
          <select
            className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
            value={trackId}
            onChange={(e) => setTrackId(e.target.value)}
          >
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {String(t.trackNumber).padStart(2, "0")} — {t.title}
                {!t.hasAudioOnDisk ? " (missing)" : ""}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="grid gap-2">
        <label htmlFor={`replace-audio-${releaseId}`} className="text-sm font-medium">
          Audio
        </label>
        <input
          id={`replace-audio-${releaseId}`}
          type="file"
          accept="audio/wav,audio/flac,audio/mpeg,.wav,.flac,.mp3"
          className="block w-full text-sm file:mr-3 file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
          onChange={(e) => setAudio(e.target.files?.[0] ?? null)}
        />
      </div>

      {error ? (
        <p className="text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {ok ? (
        <p className="text-sm font-medium text-emerald-800" role="status">
          {ok}
        </p>
      ) : null}

      <Button
        type="submit"
        className="h-10 w-fit px-4"
        disabled={status === "loading"}
      >
        {status === "loading" ? "Uploading…" : "Save media"}
      </Button>
    </form>
  );
}
