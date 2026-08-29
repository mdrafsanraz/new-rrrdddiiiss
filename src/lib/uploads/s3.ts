import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

/**
 * Generic S3-compatible object storage — works with Railway's Bucket
 * service (MinIO-backed) as well as real AWS S3, R2, etc. Point these env
 * vars at whatever the provider gives you; Railway's Bucket "Connect"
 * panel has an endpoint, access key, secret key, and bucket name to copy
 * over. `forcePathStyle` is required for MinIO/most S3-compatible
 * providers (they don't support the AWS virtual-hosted-style bucket URLs).
 */
let client: S3Client | null = null;

export function isS3Configured() {
  return Boolean(
    process.env.S3_ENDPOINT?.trim() &&
      process.env.S3_BUCKET?.trim() &&
      process.env.S3_ACCESS_KEY_ID?.trim() &&
      process.env.S3_SECRET_ACCESS_KEY?.trim()
  );
}

function getClient(): S3Client {
  if (client) return client;
  client = new S3Client({
    endpoint: process.env.S3_ENDPOINT?.trim(),
    region: process.env.S3_REGION?.trim() || "auto",
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID?.trim() ?? "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY?.trim() ?? "",
    },
  });
  return client;
}

function bucket(): string {
  return process.env.S3_BUCKET?.trim() ?? "";
}

export async function putObject(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

export type FetchedObject = {
  buffer: Buffer;
  contentType: string | null;
};

/** Returns null when the key doesn't exist (or any other fetch failure). */
export async function getObject(key: string): Promise<FetchedObject | null> {
  try {
    const res = await getClient().send(
      new GetObjectCommand({ Bucket: bucket(), Key: key })
    );
    if (!res.Body) return null;
    const buffer = Buffer.from(await res.Body.transformToByteArray());
    return { buffer, contentType: res.ContentType ?? null };
  } catch {
    return null;
  }
}

export async function deleteObject(key: string): Promise<void> {
  try {
    await getClient().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
  } catch {
    // Best-effort — a stray orphaned object in the bucket isn't worth failing the caller over.
  }
}
