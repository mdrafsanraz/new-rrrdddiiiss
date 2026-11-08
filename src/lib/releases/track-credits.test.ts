import assert from "node:assert/strict";
import test from "node:test";
import { copyCreditsFromFirstTrack, getTrackCredits, trackPublishingMetadata, updateTrackCredits } from "./track-credits";
import { validateTrackCreditDraft } from "./track-credit-validation";
import { validateReleaseForSubmit } from "./submit-validate";
import { wizardStateFromRelease } from "./wizard-from-release";
import { newContributor, newTrack, newWriterSplit, type TrackCreditsDraft, type WizardState } from "./wizard-types";

function credits(writerId: number, instrumental = false): TrackCreditsDraft {
  return {
    contributors: [{ ...newContributor(), writerId, firstName: "Test", lastName: "Person", roles: ["Artist", "Composer", "Producer"] }],
    writerSplits: [{ ...newWriterSplit(100), writerId, firstName: "Test", lastName: "Person", roles: instrumental ? ["Composer"] : ["Composer", "Lyricist"] }],
    publisherSplits: [], selfPublished: true,
  };
}

function fixture() {
  const first = credits(1);
  const second = credits(3, true);
  first.writerSplits[0].share = 50;
  first.writerSplits.push({ ...first.writerSplits[0], id: "writer-two", writerId: 2, share: 50 });
  return {
    id: "release", title: "Album", contentType: "Album", artistId: "artist", artist: {}, releaseDate: new Date("2026-01-01"), storesJson: "{}", territoriesJson: "{}",
    metadataJson: JSON.stringify({ recordingCountry: "BD", primaryGenreId: 1, clineName: "Owner", plineName: "Owner", clineYear: 2026, plineYear: 2026, writerSplits: [], selfPublished: false }),
    tracks: [first, second].map((item, index) => ({ id: `track-${index}`, title: `Track ${index + 1}`, trackNumber: index + 1, metadataJson: JSON.stringify({ ...item, audioLanguage: index ? "zxx" : "en", recordingCountry: "BD" }) })),
  } as unknown as Parameters<typeof validateReleaseForSubmit>[0];
}

test("copying from track one replaces only target credits and deep-copies editable rows", () => {
  const source = credits(1);
  source.selfPublished = false;
  source.publisherSplits = [{ id: "publisher", publisherId: 8, name: "Test Publisher", share: 100 }];
  const state = { ...credits(9), tracks: [
    newTrack({ clientId: "one", credits: source }),
    newTrack({ clientId: "two", credits: credits(2), audioLanguage: "zxx", lyrics: "Keep this text" }),
    newTrack({ clientId: "three", credits: credits(3) }),
  ] } as WizardState;
  const next = copyCreditsFromFirstTrack(state, "two");
  const copied = next.tracks[1].credits!;
  assert.equal(copied.writerSplits[0].writerId, 1);
  assert.equal(copied.writerSplits[0].share, 100);
  assert.equal(copied.publisherSplits[0].publisherId, 8);
  assert.equal(copied.selfPublished, false);
  assert.notEqual(copied.contributors[0].id, source.contributors[0].id);
  assert.notEqual(copied.writerSplits[0].id, source.writerSplits[0].id);
  assert.notEqual(copied.publisherSplits[0].id, source.publisherSplits[0].id);
  assert.notEqual(copied.contributors[0].roles, source.contributors[0].roles);
  copied.writerSplits[0].roles.push("Test role");
  assert.ok(!source.writerSplits[0].roles.includes("Test role"));
  assert.equal(next.tracks[0], state.tracks[0]);
  assert.equal(next.tracks[2], state.tracks[2]);
  assert.equal(next.tracks[1].audioLanguage, "zxx");
  assert.equal(next.tracks[1].lyrics, "Keep this text");
  assert.equal(state.tracks[1].credits?.writerSplits[0].writerId, 2);
  assert.equal(copyCreditsFromFirstTrack(state, "one"), state);
  assert.equal(copyCreditsFromFirstTrack(state, "missing"), state);
});

test("copy also works for older tracks using release-level credit defaults", () => {
  const state = { ...credits(9), tracks: [newTrack({ clientId: "one" }), newTrack({ clientId: "two" })] } as WizardState;
  const next = copyCreditsFromFirstTrack(state, "two");
  assert.equal(next.tracks[1].credits?.writerSplits[0].writerId, 9);
  assert.notEqual(next.tracks[1].credits?.writerSplits, state.writerSplits);
});

test("editing one track isolates its credits and preserves legacy defaults and other tracks", () => {
  const shared = credits(1);
  const state = { ...shared, tracks: [newTrack({ clientId: "one" }), newTrack({ clientId: "two" })] } as WizardState;
  const next = updateTrackCredits(state, "two", (before) => ({ ...before, writerSplits: credits(2).writerSplits }));
  assert.equal(getTrackCredits(next.tracks[0], next).writerSplits[0].writerId, 1);
  assert.equal(getTrackCredits(next.tracks[1], next).writerSplits[0].writerId, 2);
  assert.equal(next.writerSplits[0].writerId, 1);
  assert.equal(state.tracks[1].credits, undefined);
  assert.equal(updateTrackCredits(next, "one", (before) => before), next);
});

test("legacy publishing defaults are inherited, but explicit empty track splits never refill", () => {
  const defaults = { writerSplits: credits(1).writerSplits, selfPublished: true };
  assert.equal(trackPublishingMetadata({}, defaults).writerSplits, defaults.writerSplits);
  const explicit = trackPublishingMetadata({ writerSplits: [], publisherSplits: [], selfPublished: false }, defaults);
  assert.deepEqual(explicit.writerSplits, []);
  assert.equal(explicit.selfPublished, false);
});

test("a vocal and instrumental track can have different writers and independent 100% shares", () => {
  assert.equal(validateTrackCreditDraft(credits(1), { audioLanguage: "en" }), null);
  assert.equal(validateTrackCreditDraft(credits(2, true), { audioLanguage: "zxx" }), null);
  assert.deepEqual(validateReleaseForSubmit(fixture()), []);
});

test("invalid shares and missing credits identify only the affected track", () => {
  const release = fixture();
  const meta = JSON.parse(release.tracks[1].metadataJson!);
  meta.writerSplits[0].share = 60;
  release.tracks[1].metadataJson = JSON.stringify(meta);
  assert.deepEqual(validateReleaseForSubmit(release), ['"Track 2": Publishing splits must total exactly 100%.']);
  meta.writerSplits = [];
  release.tracks[1].metadataJson = JSON.stringify(meta);
  assert.ok(validateReleaseForSubmit(release).some((error) => error.includes('"Track 2"') && error.includes("Writers & Composition Splits")));
  const invalid = credits(2);
  invalid.writerSplits[0].share = 60;
  assert.match(validateTrackCreditDraft(invalid, { audioLanguage: "en" })!, /100%/);
});

test("reopening a release restores each track's own contributors, writers and shares", () => {
  const saved = fixture();
  const wizard = wizardStateFromRelease(saved);
  assert.deepEqual(wizard.tracks[0].credits?.writerSplits.map((row) => [row.writerId, row.share]), [[1, 50], [2, 50]]);
  assert.deepEqual(wizard.tracks[1].credits?.writerSplits.map((row) => [row.writerId, row.share]), [[3, 100]]);
  assert.equal(wizard.tracks[1].credits?.contributors[0].writerId, 3);
  assert.equal(wizard.tracks[1].credits?.selfPublished, true);
});

test("publisher shares and self-publishing are independent for each track", () => {
  const saved = fixture();
  const first = JSON.parse(saved.tracks[0].metadataJson!);
  first.selfPublished = false;
  first.publisherSplits = [{ publisherId: 7, name: "Test Publisher", share: 100 }];
  saved.tracks[0].metadataJson = JSON.stringify(first);
  assert.deepEqual(validateReleaseForSubmit(saved), []);
  const wizard = wizardStateFromRelease(saved);
  assert.equal(wizard.tracks[0].credits?.publisherSplits[0].publisherId, 7);
  assert.equal(wizard.tracks[0].credits?.selfPublished, false);
  assert.equal(wizard.tracks[1].credits?.selfPublished, true);
  first.publisherSplits[0].share = 90;
  saved.tracks[0].metadataJson = JSON.stringify(first);
  assert.deepEqual(validateReleaseForSubmit(saved), ['"Track 1": Publisher shares must total exactly 100%.']);
});

test("legacy saved releases continue to inherit shared composition splits", () => {
  const saved = fixture();
  saved.metadataJson = JSON.stringify({ ...JSON.parse(saved.metadataJson!), writerSplits: credits(9).writerSplits, selfPublished: true });
  for (const track of saved.tracks) {
    const meta = JSON.parse(track.metadataJson!);
    delete meta.writerSplits;
    delete meta.publisherSplits;
    delete meta.selfPublished;
    meta.audioLanguage = "en";
    track.metadataJson = JSON.stringify(meta);
  }
  assert.deepEqual(validateReleaseForSubmit(saved), []);
  const wizard = wizardStateFromRelease(saved);
  assert.ok(wizard.tracks.every((track) => track.credits?.writerSplits[0].writerId === 9));
});
