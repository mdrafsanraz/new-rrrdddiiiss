import assert from "node:assert/strict";
import test from "node:test";
import { validateArtwork } from "./store";

// Upload validation reads PNG dimensions from the IHDR header.
function artwork(width: number, height: number) {
  const header = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(header);
  header.write("IHDR", 12, "ascii");
  header.writeUInt32BE(width, 16);
  header.writeUInt32BE(height, 20);
  return new File([header], "cover.png", { type: "image/png" });
}

test("artwork accepts the minimum size and larger square images", async () => {
  for (const size of [3000, 3001, 4000, 6000]) {
    assert.equal((await validateArtwork(artwork(size, size))).filename, "cover.png");
  }
});

test("artwork rejects undersized and nonsquare images even when both sides exceed the minimum", async () => {
  for (const [width, height] of [[2999, 2999], [3000, 2999], [4000, 3000], [3000, 4000]]) {
    await assert.rejects(validateArtwork(artwork(width, height)), /square and at least 3000×3000px/);
  }
});
