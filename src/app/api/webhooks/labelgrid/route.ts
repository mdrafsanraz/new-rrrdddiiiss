import { createHmac, timingSafeEqual } from "node:crypto";
import { after, NextResponse } from "next/server";
import { markReleaseAcrPending } from "@/lib/acrcloud/release-scan";
import { notifyReleaseStatusChanged } from "@/lib/email";
import { prisma } from "@/lib/db";
import {
  applyLabelGridDeliveryStatusWebhook,
  applyLabelGridReviewStatusWebhook,
} from "@/lib/labelgrid/status-sync";
import {
  getUserFacingStatusDescription,
  getUserFacingStatusLabel,
} from "@/lib/releases/status";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 1024 * 1024;
const MAX_TIMESTAMP_AGE_MS = 5 * 60 * 1000;
type LabelGridWebhook = {
  event?: unknown;
  timestamp?: unknown;
  webhook_id?: unknown;
  data?: {
    release_id?: unknown;
    previous_status?: unknown;
    new_status?: unknown;
    review_issues?: unknown;
    release_title?: unknown;
    delivery_status?: unknown;
    track_id?: unknown;
    status?: unknown;
    status_message?: unknown;
    files?: unknown;
  };
};

function validSignature(rawBody: string, signature: string, secret: string) {
  if (!/^[a-f\d]{64}$/i.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  const received = Buffer.from(signature, "hex");
  return (
    received.length === expected.length && timingSafeEqual(received, expected)
  );
}

type SupportedEvent =
  | "review_status"
  | "delivery_completed"
  | "release_distributed"
  | "takedown_completed"
  | "transcode_completed";

function supportedEvent(event: string): SupportedEvent | null {
  const normalized = event.toLowerCase().replaceAll(/[^a-z]/g, "");
  if (normalized === "releasereviewstatuschanged") return "review_status";
  if (normalized === "deliverycompleted") return "delivery_completed";
  if (normalized === "releasedistributed") return "release_distributed";
  if (normalized === "takedowncompleted") return "takedown_completed";
  if (
    normalized === "transcodecompleted" ||
    normalized === "tracktranscodecompleted" ||
    normalized === "trackaudiotranscodecompleted"
  ) {
    return "transcode_completed";
  }
  return null;
}

async function processWebhook(
  payload: LabelGridWebhook,
  rawBody: string,
  event: string,
  eventKind: SupportedEvent,
  releaseId: string | number
) {
  let eventRecordId: string | null = null;
  try {
    const eventRecord = await prisma.providerWebhookEvent.create({
      data: {
        provider: "labelgrid",
        eventType: event,
        providerReleaseId: String(releaseId),
        payloadJson: rawBody,
      },
    });
    eventRecordId = eventRecord.id;

    if (eventKind === "transcode_completed") {
      const trackId = payload.data?.track_id as string | number;
      const release = await prisma.release.findFirst({
        where: { labelgridId: String(releaseId) },
        select: {
          id: true,
          tracks: { select: { labelgridId: true } },
        },
      });
      const mappedTrack = release?.tracks.some(
        (track) => track.labelgridId === String(trackId)
      );
      if (
        !release ||
        (!mappedTrack && release.tracks.some((track) => track.labelgridId))
      ) {
        await prisma.providerWebhookEvent.update({
          where: { id: eventRecord.id },
          data: {
            processed: true,
            processedAt: new Date(),
            error: release
              ? "LabelGrid track is not mapped"
              : "LabelGrid release is not mapped",
          },
        });
        return;
      }

      const acrQueued = await markReleaseAcrPending(release.id);
      await prisma.providerWebhookEvent.update({
        where: { id: eventRecord.id },
        data: {
          releaseId: release.id,
          processed: true,
          processedAt: new Date(),
          error: acrQueued ? null : "ACRCloud is not configured",
        },
      });
      return;
    }

    const result =
      eventKind === "review_status"
        ? await applyLabelGridReviewStatusWebhook({
            release_id: releaseId,
            previous_status:
              typeof payload.data?.previous_status === "string"
                ? payload.data.previous_status
                : null,
            new_status: payload.data?.new_status as string,
            review_issues: payload.data?.review_issues,
            release_title:
              typeof payload.data?.release_title === "string"
                ? payload.data.release_title
                : null,
          })
        : await applyLabelGridDeliveryStatusWebhook({
            release_id: releaseId,
            delivery_status:
              typeof payload.data?.delivery_status === "string"
                ? payload.data.delivery_status
                : null,
          });

    if (!result.ok) {
      await prisma.providerWebhookEvent.update({
        where: { id: eventRecord.id },
        data: { processed: true, processedAt: new Date(), error: result.error },
      });
      return;
    }

    if (result.userStatusChanged) {
      await notifyReleaseStatusChanged({
        to: result.release.user.email,
        name: result.release.user.name,
        releaseId: result.release.id,
        releaseTitle: result.release.title,
        statusLabel: getUserFacingStatusLabel(result.status),
        statusDescription: getUserFacingStatusDescription(result.status),
      });
    }

    await prisma.providerWebhookEvent.update({
      where: { id: eventRecord.id },
      data: {
        releaseId: result.release.id,
        processed: true,
        processedAt: new Date(),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook processing failed";
    if (eventRecordId) {
      try {
        await prisma.providerWebhookEvent.update({
          where: { id: eventRecordId },
          data: { error: message.slice(0, 2000) },
        });
      } catch (updateError) {
        console.error("[labelgrid-webhook] Failed to record error", updateError);
      }
    }
    console.error("[labelgrid-webhook] Processing failed", error);
  }
}

export async function POST(request: Request) {
  const secret = process.env.LABELGRID_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error("[labelgrid-webhook] LABELGRID_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const signature = request.headers.get("x-webhook-signature") ?? "";
  if (!validSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: LabelGridWebhook;
  try {
    payload = JSON.parse(rawBody) as LabelGridWebhook;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const timestamp =
    typeof payload.timestamp === "string" ? Date.parse(payload.timestamp) : NaN;
  if (
    !Number.isFinite(timestamp) ||
    Math.abs(Date.now() - timestamp) > MAX_TIMESTAMP_AGE_MS
  ) {
    return NextResponse.json({ error: "Stale timestamp" }, { status: 401 });
  }

  const event = typeof payload.event === "string" ? payload.event : "";
  if (event === "test") return NextResponse.json({ received: true, test: true });
  const eventKind = supportedEvent(event);
  if (!eventKind) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const releaseId = payload.data?.release_id;
  const newStatus = payload.data?.new_status;
  const trackId = payload.data?.track_id;
  const transcodeStatus = payload.data?.status;
  const transcodeStatusMessage = payload.data?.status_message;
  if (
    (typeof releaseId !== "string" && typeof releaseId !== "number") ||
    (eventKind === "review_status" && typeof newStatus !== "string") ||
    (eventKind === "transcode_completed" &&
      ((typeof trackId !== "string" && typeof trackId !== "number") ||
        transcodeStatus !== "complete" ||
        transcodeStatusMessage !== "transcode_complete"))
  ) {
    return NextResponse.json(
      { error: "Invalid LabelGrid webhook payload" },
      { status: 400 }
    );
  }

  after(() => processWebhook(payload, rawBody, event, eventKind, releaseId));
  return NextResponse.json({ received: true, queued: true });
}
