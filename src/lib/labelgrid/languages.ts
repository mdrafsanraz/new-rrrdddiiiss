import { labelgridFetch } from "./client";

/** LanguageData from document.json GET /languages. */
export async function metadataLanguages() {
  const raw = await labelgridFetch<Array<{ iso_code: string | null; name: string }>>("/languages");
  return raw.filter((row) => row.iso_code && row.iso_code !== "zxx")
    .map((row) => ({ value: row.iso_code!, label: `${row.name} (${row.iso_code})` }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export async function validateMetadataLanguage(value: string) {
  const languages = await metadataLanguages();
  const match = languages.find((language) => language.value.toLowerCase() === value.trim().toLowerCase());
  if (!match) throw new Error(`Metadata language "${value}" is unavailable. Edit the release and select a supported metadata language before submitting.`);
  return match.value;
}
