import { NextResponse } from "next/server";
import { verifyHmac } from "../../../../lib/webhook-security";
import { isDuplicate } from "../../../../lib/idempotency";

export const runtime = "nodejs";

export async function POST(request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-shopify-hmac-sha256");
  const webhookId = request.headers.get("x-shopify-webhook-id");
  const topic = request.headers.get("x-shopify-topic") || "unknown";
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json({ ok: false, error: "SHOPIFY_WEBHOOK_SECRET not configured" }, { status: 503 });
  }

  if (!verifyHmac(rawBody, signature, secret)) {
    return NextResponse.json({ ok: false, error: "invalid webhook signature" }, { status: 401 });
  }

  if (webhookId && isDuplicate("shopify:" + webhookId)) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  let payload = {};
  try { payload = JSON.parse(rawBody); } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    accepted: true,
    topic,
    webhookId,
    orderId: payload.id ?? payload.order?.id ?? null,
    persistence: "not_configured",
    next: "route event to persistent order/event store"
  });
}
