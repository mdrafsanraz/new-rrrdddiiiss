"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PencilSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export function EditArtistNameForm({ artistId, initialName }: { artistId: string; initialName: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!editing) {
    return <Button type="button" variant="outline" className="h-8 px-3 text-xs" onClick={() => setEditing(true)}><PencilSimple size={13} /> Edit name</Button>;
  }

  return (
    <form className="flex min-w-56 flex-col items-end gap-2" onSubmit={async (event) => {
      event.preventDefault();
      setError("");
      setSaving(true);
      try {
        const response = await fetch(`/api/admin/artists/${artistId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Update failed");
        setEditing(false);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Update failed");
      } finally {
        setSaving(false);
      }
    }}>
      <div className="flex w-full gap-2">
        <input aria-label="Artist name" value={name} maxLength={64} required onChange={(event) => setName(event.target.value)} className="h-8 min-w-0 flex-1 rounded-md border border-border bg-background px-2.5 text-xs outline-none focus-visible:border-primary" autoFocus />
        <Button type="submit" className="h-8 px-3 text-xs" loading={saving}>Save</Button>
        <Button type="button" variant="ghost" className="h-8 px-2 text-xs" onClick={() => { setName(initialName); setEditing(false); setError(""); }}>Cancel</Button>
      </div>
      {error ? <p className="text-xs text-destructive" role="alert">{error}</p> : null}
    </form>
  );
}
