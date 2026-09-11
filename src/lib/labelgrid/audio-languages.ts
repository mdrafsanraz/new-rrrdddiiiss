export type LanguageOption = { value: string; label: string };

/** Audio-only value explicitly documented in TrackCreateData. */
export function withInstrumentalLanguage(languages: LanguageOption[]): LanguageOption[] {
  return [...languages.filter((language) => language.value !== "zxx"),
    { value: "zxx", label: "No linguistic content (zxx)" }];
}

export function supportedAudioLanguage(value: string | undefined, languages: LanguageOption[]): string {
  const match = languages.find((language) => language.value.toLowerCase() === value?.trim().toLowerCase());
  if (!match) throw new Error(value?.trim()
    ? `Audio language "${value}" is unsupported. Edit the track and select a supported audio language.`
    : "Select an audio language for this track (or No linguistic content for audio without words).");
  return match.value;
}
