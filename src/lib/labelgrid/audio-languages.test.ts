import assert from "node:assert/strict";
import test from "node:test";
import { supportedAudioLanguage, withInstrumentalLanguage } from "./audio-languages";

const metadata = [{ value: "en", label: "English" }, { value: "bn", label: "Bengali" }, { value: "ja-Jpan", label: "Japanese" }];
test("audio catalog preserves provider values and adds the documented instrumental option", () => {
  const options = withInstrumentalLanguage(metadata);
  assert.equal(supportedAudioLanguage("bn", options), "bn");
  assert.equal(supportedAudioLanguage("zxx", options), "zxx");
  assert.equal(supportedAudioLanguage(" JA-jpan ", options), "ja-Jpan");
  assert.equal(withInstrumentalLanguage(options).filter((option) => option.value === "zxx").length, 1);
  assert.equal(metadata.length, 3);
});
test("missing, display-name and unsupported codes never fall back to English", () => {
  const options = withInstrumentalLanguage(metadata);
  for (const value of [undefined, "", " ", "Bengali", "ja", "xx-invalid"]) {
    assert.throws(() => supportedAudioLanguage(value, options), /audio language/i);
  }
});
