import assert from "node:assert/strict";
import test from "node:test";
import { getSubmittedAudioUrl } from "./submitted-audio";
import { LabelGridApiError } from "./client";

test("verifies stereo URL using the provider track ID", async () => {
  for (const payload of [{ url: "https://cdn.example/audio.wav" }, { data: { url: "https://cdn.example/audio.wav" } }]) {
    assert.equal(await getSubmittedAudioUrl("71036", async (id) => {
      assert.equal(id, "71036");
      return payload;
    }), "https://cdn.example/audio.wav");
  }
});

test("missing files cannot be marked complete", async () => {
  for (const payload of [null, {}, { data: null }, { filename: "audio.wav" }, { url: " " }]) {
    assert.equal(await getSubmittedAudioUrl("71036", async () => payload), null);
  }
  assert.equal(await getSubmittedAudioUrl("71036", async () => {
    throw new LabelGridApiError("missing", 404, {});
  }), null);
});

test("access and provider failures remain errors, not missing files", async () => {
  for (const status of [401, 403, 429, 500]) {
    await assert.rejects(getSubmittedAudioUrl("71036", async () => {
      throw new LabelGridApiError("unavailable", status, {});
    }), /unavailable/);
  }
});
