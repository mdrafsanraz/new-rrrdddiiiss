"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/site/field";

const KINDS = [
  { value: "proof_of_rights", label: "Proof of rights" },
  { value: "remix_permission", label: "Remix permission" },
  { value: "artist_authorization", label: "Artist authorization" },
  {
    value: "previous_distributor_confirmation",
    label: "Previous distributor confirmation",
  },
  { value: "cover_license", label: "Cover license" },
  { value: "master_ownership", label: "Master ownership evidence" },
  { value: "other", label: "Other" },
] as const;

export function UploadReleaseDocumentForm({
  releaseId,
  issueId,
  trackId,
}: {
  releaseId: string;
  issueId?: string | null;
  trackId?: string | null;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<string>("proof_of_rights");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    setStatus("loading");
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("kind", kind);
      if (issueId) fd.set("issueId", issueId);
      if (trackId) fd.set("trackId", trackId);
      if (note.trim()) fd.set("note", note.trim());
      const res = await fetch(`/api/releases/${releaseId}/documents`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        setStatus("idle");
        return;
      }
      setOk("Document uploaded.");
      setFile(null);
      setNote("");
      setStatus("idle");
      router.refresh();
    } catch {
      setError("Network error");
      setStatus("idle");
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-3 border border-border bg-background p-4">
      <Field
        id={`doc-kind-${issueId ?? "release"}`}
        label="Document type"
        as="select"
        value={kind}
        onChange={(e) => setKind(e.target.value)}
      >
        {KINDS.map((k) => (
          <option key={k.value} value={k.value}>
            {k.label}
          </option>
        ))}
      </Field>
      <div className="grid gap-2">
        <label
          htmlFor={`doc-file-${issueId ?? "release"}`}
          className="text-sm font-medium"
        >
          File
        </label>
        <input
          id={`doc-file-${issueId ?? "release"}`}
          type="file"
          accept=".pdf,.doc,.docx,image/jpeg,image/png,image/webp"
          className="block w-full text-sm text-muted-foreground file:mr-3 file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>
      <Field
        id={`doc-note-${issueId ?? "release"}`}
        label="Note (optional)"
        as="textarea"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        helper="If this issue came from distribution review, a note may be posted with your upload."
      />
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
        {status === "loading" ? "Uploading…" : "Upload document"}
      </Button>
    </form>
  );
}
