import test from "node:test";
import assert from "node:assert/strict";
import { readSupportRequest } from "./support-attachments";

function request(files: File[]) {
  const form = new FormData();
  form.set("body", "Please help with my release");
  for (const file of files) form.append("attachments", file);
  return new Request("https://rdistro.net/api/support", { method: "POST", body: form });
}
test("accepts multipart attachments and retains message fields", async () => {
  const result = await readSupportRequest(request([new File(["pdf"], "proof.pdf", { type: "application/pdf" })]));
  assert.equal(result.files.length, 1);
  assert.equal(result.fields.body, "Please help with my release");
  assert.equal(result.fields.attachments, undefined);
});
test("rejects unsafe types, excess count and oversize files", async () => {
  const pdf = new File(["pdf"], "proof.pdf", { type: "application/pdf" });
  for (const files of [[new File(["html"], "page.html", { type: "text/html" })], [pdf, pdf, pdf, pdf],
    [new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.pdf", { type: "application/pdf" })]]) {
    await assert.rejects(readSupportRequest(request(files)), /Attach up to 3/);
  }
});
test("existing JSON clients remain supported", async () => {
  const result = await readSupportRequest(new Request("https://rdistro.net/api/support", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: "hello" }),
  }));
  assert.deepEqual(result, { fields: { body: "hello" }, files: [] });
});
