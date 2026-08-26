import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import { isLabelGridLive } from "@/lib/labelgrid/config";
import { applyLabelGridReviewStatusWebhook } from "@/lib/labelgrid/status-sync";
import { reconcileLabelGridReleaseStatus } from "@/lib/labelgrid/status-sync";

export const runtime = "nodejs";

/**
 * LabelGrid outbound webhooks.
 *
 * OpenAPI documents event labels (e.g. "Release Review Status Changed") and
 * payload shapes (previous_status / new_status / review_issues), but does not
 * document the exact event `value` strings or HMAC header names.
 *
 * We accept:
 * - event type from body.event / body.type / body.event_type / header
 * - HMAC via LABELGRID_WEBHOOK_SECRET against common signature headers when set
 * - payload.data or top-level fields for review/delivery events
 */
function verifySignature(rawBody: string, request: Request): boolean {
  const secret = process.env.LABELGRID_WEBHOOK_SECRET?.trim();
  if (!secret) {
    // Sandbox without secret: accept but require LabelGrid to be configured.
    return isLabelGridLive();
  }

  const candidates = [
    request.headers.get("x-labelgrid-signature"),
    request.headers.get("x-webhook-signature"),
    request.headers.get("x-hub-signature-256"),
    request.headers.get("x-signature"),
  ].filter(Boolean) as string[];

  if (candidates.length === 0) return false;

  const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedVariants = [digest, `sha256=${digest}`];

  for (const header of candidates) {
    for (const expected of expectedVariants) {
      try {
        const a = Buffer.from(header);
        const b = Buffer.from(expected);
        if (a.length === b.length && timingSafeEqual(a, b)) return true;
      } catch {
        // continue
      }
    }
  }
  return false;
}

function unwrapPayload(body: Record<string, unknown>) {
  const data =
    body.data && typeof body.data === "object"
      ? (body.data as Record<string, unknown>)
      : body;
  const eventType = String(
    body.event ??
      body.type ??
      body.event_type ??
      body.eventType ??
      data.event ??
      "unknown"
  );
  return { eventType, data };
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!verifySignature(rawBody, request)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { eventType, data } = unwrapPayload(body);
  const providerReleaseId =
    data.release_id != null ? String(data.release_id) : null;

  const local = providerReleaseId
    ? await prisma.release.findFirst({
        where: { labelgridId: providerReleaseId },
        select: { id: true },
      })
    : null;

  const event = await prisma.providerWebhookEvent.create({
    data: {
      provider: "labelgrid",
      eventType,
      providerReleaseId,
      releaseId: local?.id ?? null,
      payloadJson: rawBody.slice(0, 100_000),
    },
  });

  try {
    const hasReviewTransition =
      data.new_status != null ||
      data.previous_status != null ||
      /review/i.test(eventType);

    const hasDeliverySignal =
      data.distro_queue_id != null ||
      /delivery|distributed|takedown|outlet/i.test(eventType);

    if (providerReleaseId && (hasReviewTransition || hasDeliverySignal)) {
      if (hasReviewTransition && data.release_id != null) {
        await applyLabelGridReviewStatusWebhook({
          release_id: data.release_id as number | string,
          previous_status: (data.previous_status as string) ?? null,
          new_status: (data.new_status as string) ?? null,
          review_issues: data.review_issues,
          release_title: (data.release_title as string) ?? null,
        });
      } else if (local?.id) {
        await reconcileLabelGridReleaseStatus(local.id, { deep: true });
      }
    }

    await prisma.providerWebhookEvent.update({
      where: { id: event.id },
      data: { processed: true, processedAt: new Date() },
    });

    return NextResponse.json({ received: true, id: event.id });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook processing failed";
    await prisma.providerWebhookEvent.update({
      where: { id: event.id },
      data: { error: message.slice(0, 2000) },
    });
    console.error("[labelgrid/webhook]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
