import { z } from "zod";
import { saveGenericUpload } from "@/lib/uploads/store";
import { isS3Configured } from "@/lib/uploads/s3";

const allowed = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
export async function readSupportRequest(request: Request) {
  if (!request.headers.get("content-type")?.includes("multipart/form-data")) {
    return { fields: await request.json(), files: [] as File[] };
  }
  const form = await request.formData();
  const files = form.getAll("attachments").filter((entry): entry is File => entry instanceof File && entry.size > 0);
  const valid = files.length <= 3 && files.every(file => allowed.has(file.type) && file.size <= 10 * 1024 * 1024);
  if (!valid) throw new z.ZodError([{ code: "custom", path: ["attachments"], message: "Attach up to 3 PDF, Word, JPG, PNG, or WebP files, each under 10 MB." }]);
  const fields = Object.fromEntries([...form.entries()].filter(([key, value]) => key !== "attachments" && typeof value === "string"));
  return { fields, files };
}

export async function saveSupportAttachments(userId: string, files: File[]) {
  if (files.length && process.env.NODE_ENV === "production" && !isS3Configured() && !process.env.RAILWAY_VOLUME_MOUNT_PATH) {
    throw new Error("Support file storage requires an S3 bucket or mounted persistent volume.");
  }
  const attachments = [];
  for (const file of files) {
    const stored = await saveGenericUpload(userId, file, "support");
    attachments.push({ url: stored.publicUrl, name: file.name, size: file.size });
  }
  return JSON.stringify(attachments);
}
