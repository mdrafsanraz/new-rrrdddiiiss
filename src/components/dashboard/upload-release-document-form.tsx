"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  async function uploadFile(file: File) {
    setError("");
    setOk("");
    setFileName(file.name);
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
      setNote("");
      setStatus("idle");
      router.refresh();
    } catch {
      setError("Network error");
      setStatus("idle");
    }
  }

  return (
    <div className="mt-4 grid gap-3 border border-border bg-background p-4">
      <Field
        id={`doc-kind-${issueId ?? "release"}`}
        label="Document type"
        as="select"
        value={kind}
        disabled={status === "loading"}
        onChange={(e) => setKind(e.target.value)}
      >
        {KINDS.map((k) => (
          <option key={k.value} value={k.value}>
            {k.label}
          </option>
        ))}
      </Field>
      <Field
        id={`doc-note-${issueId ?? "release"}`}
        label="Note (optional)"
        as="textarea"
        value={note}
        disabled={status === "loading"}
        onChange={(e) => setNote(e.target.value)}
        helper="Set the type and note before choosing a file — it uploads as soon as you pick one."
      />
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
          disabled={status === "loading"}
          className="block w-full text-sm text-muted-foreground file:mr-3 file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground disabled:opacity-60"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void uploadFile(file);
          }}
        />
      </div>
      {status === "loading" ? (
        <p className="text-sm font-medium text-muted-foreground" role="status">
          Uploading {fileName}…
        </p>
      ) : null}
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
    </div>
  );
}
