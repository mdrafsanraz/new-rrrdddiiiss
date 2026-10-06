import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { recordingCountrySchema } from "./recording-country";
import { validateReleaseForSubmit } from "./submit-validate";

test("recording country is required and rejects invalid codes", () => {
  for (const value of [undefined, null, "", " ", "ZZ", "bd", "Bangladesh"]) {
    assert.equal(recordingCountrySchema.safeParse(value).success, false);
  }
  for (const value of ["BD", "US", "GB", "XK"]) {
    assert.equal(recordingCountrySchema.safeParse(value).success, true);
  }
});

test("accepted countries match the LabelGrid document", () => {
  const document = JSON.parse(readFileSync("document.json", "utf8"));
  const codes: string[] = document.components.schemas.TrackCreateData.properties.recording_country.enum;
  for (let a = 65; a <= 90; a++) for (let b = 65; b <= 90; b++) {
    const code = String.fromCharCode(a, b);
    assert.equal(recordingCountrySchema.safeParse(code).success, codes.includes(code), code);
  }
});

test("submission rejects missing or inconsistent persisted recording countries", () => {
  const fixture = (releaseCountry?: string, trackCountry?: string) => ({
    title: "Test", artistId: "artist", artist: {}, releaseDate: new Date(),
    storesJson: "{}", territoriesJson: "{}", contentType: "Single",
    metadataJson: JSON.stringify({ recordingCountry: releaseCountry }),
    tracks: [{ title: "Test", trackNumber: 1, metadataJson: JSON.stringify({ recordingCountry: trackCountry }) }],
  }) as unknown as Parameters<typeof validateReleaseForSubmit>[0];
  const errors = (releaseCountry?: string, trackCountry?: string) => validateReleaseForSubmit(fixture(releaseCountry, trackCountry)).filter((error) => /recording country/i.test(error));
  assert.ok(errors().length > 0);
  assert.ok(errors("BD").length > 0);
  assert.ok(errors("BD", "US").length > 0);
  assert.deepEqual(errors("BD", "BD"), []);
});
