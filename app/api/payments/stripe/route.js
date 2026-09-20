import { NextResponse } from "next/server";
import { verifyHmac } from "../../../../lib/webhook-security";
import { saveEvent } from "../../../../lib/store";
import { createOrderEvent } from "../../../../lib/automation";

export const runtime = "nodejs";

export async function POST(request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) return NextResponse.json({ ok: false, error: "STRIPE_WEBHOOK_SECRET not configured" }, { status: 503 });

  // Stripe uses a timestamped signature scheme; this endpoint intentionally
  // refuses to guess/implement it with the Shopify HMAC helper.
  if (!signature) return NextResponse.json({ ok: false, error: "missing stripe-signature" }, { status: 401 });

  let payload;
  try { payload = JSON.parse(rawBody); } catch { return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 }); }

  const event = createOrderEvent({
    type: payload.type === "checkout.session.completed" ? "payment.confirmed" : "system.error",
    orderId: payload.data?.object?.metadata?.orderId || payload.data?.object?.id || "unknown",
    payload: { provider: "stripe", eventType: payload.type }
  });
  const stored = saveEvent(event, "stripe:" + (payload.id || event.id));

  return NextResponse.json({ ok: true, accepted: true, duplicate: stored.duplicate, event: stored.event, note: "Stripe signature verification must be implemented with Stripe's official library before production." });
}
