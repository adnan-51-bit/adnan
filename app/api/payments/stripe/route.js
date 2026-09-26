import { NextResponse } from "next/server";
import { pruefeStripeSignatur, verbucheZahlung } from "../../../../lib/shop.js";
import { claimWebhookReceipt } from "../../../../lib/ecommerce-store.js";

export const runtime = "nodejs";

// Zahlungsbestaetigung fuer den eigenen Shop (26.09.2026). Vorher lehnte diese Route bewusst alles
// ab, bis Signaturpruefung + dauerhafter Webhook-Speicher existieren - beides ist jetzt da:
// - ohne STRIPE_WEBHOOK_SECRET weiterhin 503 (fail-closed)
// - falsche/fehlende/zu alte Signatur -> 400, nichts wird verarbeitet
// - jedes Stripe-Ereignis wird nur einmal verarbeitet (ecommerce_webhook_receipts)
// - nur checkout.session.completed mit payment_status "paid" und business_id "ecommerce" bucht eine
//   Zahlung; alles andere wird quittiert (200), aber ignoriert.
export async function POST(request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "STRIPE_WEBHOOK_SECRET nicht gesetzt - Zahlungsbestätigung gesperrt." }, { status: 503 });
  const rawBody = await request.text();
  if (!pruefeStripeSignatur(rawBody, request.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ ok: false, error: "Ungültige Signatur" }, { status: 400 });
  }
  let event;
  try { event = JSON.parse(rawBody); } catch { return NextResponse.json({ ok: false, error: "Ungültiger Inhalt" }, { status: 400 }); }
  if (!(await claimWebhookReceipt("stripe:" + event.id, "stripe"))) return NextResponse.json({ ok: true, duplicate: true });

  const session = event?.data?.object || {};
  if (event.type !== "checkout.session.completed" || session.payment_status !== "paid" || session.metadata?.business_id !== "ecommerce" || !session.metadata?.order_id) {
    return NextResponse.json({ ok: true, ignoriert: true });
  }
  const ergebnis = await verbucheZahlung(session.metadata.order_id, { stripe_event: event.id, stripe_session: session.id, betrag_cent: session.amount_total, waehrung: session.currency });
  if (!ergebnis.ok) return NextResponse.json({ ok: false, error: ergebnis.grund }, { status: 404 });
  return NextResponse.json({ ok: true, duplicate: ergebnis.duplicate, status: ergebnis.order?.status });
}
