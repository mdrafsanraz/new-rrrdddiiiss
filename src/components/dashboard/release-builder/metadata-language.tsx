"use client";

import { useEffect, useState } from "react";
import { Field } from "@/components/site/field";

export function MetadataLanguage({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [languages, setLanguages] = useState<Array<{ value: string; label: string }>>([]);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/labelgrid/languages", { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setLanguages(data.languages);
      }).catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      });
    return () => controller.abort();
  }, [attempt]);
  return <div>
    <Field id="language" label="Metadata language" as="select" required value={value}
      onChange={(event) => onChange(event.target.value)}
      helper={error || "Select the language of the written title. Audio language is set separately for each track."}>
      {!languages.some((language) => language.value === value) ? <option value={value} disabled>{value} — {languages.length ? "please select a supported language" : "loading languages…"}</option> : null}
      {languages.map((language) => <option key={language.value} value={language.value}>{language.label}</option>)}
    </Field>
    {error ? <button type="button" className="mt-2 text-sm underline" onClick={() => { setError(""); setAttempt((value) => value + 1); }}>Retry languages</button> : null}
  </div>;
}
