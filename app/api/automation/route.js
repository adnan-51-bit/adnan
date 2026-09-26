import { NextResponse } from "next/server";
import { EVENT_TYPES, ORDER_STATES, createOrderEvent, evaluateOrderAutomation, nextOrderState } from "../../../lib/automation";
import { storageMode } from "../../../lib/ecommerce-store.js";

export async function GET() {
  return NextResponse.json({
    ok: true,
    mode: "provider-independent-scaffold",
    orderStates: ORDER_STATES,
    eventTypes: EVENT_TYPES,
    // Vorher fest "not_configured" - seit Supabase (26.09.2026) der echte Speicherort.
    persistence: storageMode(),
    note: "No external order is created or sent by this endpoint."
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (body.action === "evaluate") {
      return NextResponse.json({ ok: true, action: "evaluate", result: evaluateOrderAutomation(body) });
    }
    if (body.action === "transition") {
      const event = createOrderEvent(body);
      const nextState = nextOrderState(body.currentState, event.type);
      return NextResponse.json({ ok: true, event, currentState: body.currentState, nextState });
    }
    return NextResponse.json({ ok: false, error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}
