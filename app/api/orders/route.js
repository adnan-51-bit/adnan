import { NextResponse } from "next/server";
import { createOrderEvent, evaluateOrderAutomation, nextOrderState } from "../../../lib/automation";
import { saveEvent, saveOrder, getOrder, storeStats } from "../../../lib/store";

export async function GET(request) {
  const id = new URL(request.url).searchParams.get("id");
  if (id) return NextResponse.json({ ok: true, order: getOrder(id) });
  return NextResponse.json({ ok: true, stats: storeStats() });
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
    const gate = evaluateOrderAutomation(body);
    const currentState = body.currentState || "payment_pending";
    const type = body.type || "order.created";
    const event = createOrderEvent({ type, orderId: body.id, payload: body.payload || {} });
    const nextState = gate.canAutoFulfill ? nextOrderState(currentState, type) : "blocked";
    const order = saveOrder({ id: body.id, state: nextState, blockers: gate.blockers, updatedAt: new Date().toISOString() });
    const stored = saveEvent(event, body.id + ":" + type);
    return NextResponse.json({ ok: true, order, event: stored.event, duplicate: stored.duplicate, gate });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}
