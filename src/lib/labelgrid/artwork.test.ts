import assert from "node:assert/strict";
import test from "node:test";
import { getSubmittedArtworkUrl } from "./artwork";

test("only confirms artwork attached to the provider release", async () => {
  for (const payload of [{}, { front_cover: null }, { front_cover: { filename: "cover.jpg" } }, { front_cover: { url: " " } }]) {
    assert.equal(await getSubmittedArtworkUrl("42", async () => ({ id: 42, ...payload })), null);
  }
  const cover = { id: 42, front_cover: { url: "https://cdn.example.com/cover.jpg" } };
  for (const payload of [cover, { data: cover }]) {
    assert.equal(await getSubmittedArtworkUrl("42", async (id) => {
      assert.equal(id, "42");
      return payload;
    }), cover.front_cover.url);
  }
});

test("provider access errors cannot mark artwork complete", async () => {
  await assert.rejects(getSubmittedArtworkUrl("42", async () => {
    throw new Error("403 unauthorized");
  }), /403 unauthorized/);
});
