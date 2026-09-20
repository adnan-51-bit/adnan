import { NextResponse } from "next/server";
import { createOrderEvent, evaluateOrderAutomation, nextOrderState } from "../../../lib/automation.js";
import { saveEvent, storeStats } from "../../../lib/store.js";
import {
  listProducts, createProduct, advanceProductPipeline, updateProduct,
  listSuppliers, createSupplier, updateSupplier,
  listCustomers, createCustomer,
  listOrders, getOrderById, createOrder, updateOrder, deriveOrderGateInputs,
  listReturns, createReturn, updateReturn,
  storageMode,
} from "../../../lib/ecommerce-store.js";
import { checkAdminSecret } from "../../../lib/auth.js";

// Phase 3 (20.09.2026): dieser einzelne Route-Datei bedient jetzt den gesamten E-Commerce-
// Datenbereich (Produkte, Lieferanten, Kunden, Bestellungen, Retouren) ueber ?type= - genau wie
// api/master/* in diesem Repo bzw. api/customers.js in werknetz24-landing konsolidieren. Das
// Repo hatte mit 12 Routen bereits das Vercel-Hobby-Limit erreicht (Phase-1-Audit), eine 13.
// Datei war deshalb keine Option.

export async function GET(request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "orders";
  const id = url.searchParams.get("id");

  try {
    if (type === "products") return NextResponse.json({ ok: true, storage: storageMode(), products: await listProducts() });
    if (type === "suppliers") return NextResponse.json({ ok: true, storage: storageMode(), suppliers: await listSuppliers() });
    if (type === "customers") return NextResponse.json({ ok: true, storage: storageMode(), customers: await listCustomers() });
    if (type === "returns") return NextResponse.json({ ok: true, storage: storageMode(), returns: await listReturns() });
    if (type === "orders") {
      if (id) return NextResponse.json({ ok: true, order: await getOrderById(id) });
      return NextResponse.json({ ok: true, storage: storageMode(), orders: await listOrders(), stats: storeStats() });
    }
    return NextResponse.json({ ok: false, error: "Unbekannter type" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const authError = checkAdminSecret(request);
  if (authError) return NextResponse.json({ ok: false, error: authError.error }, { status: authError.status });
  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "orders";

  try {
    const body = await request.json();

    if (type === "products") {
      if (body.action === "advance") {
        if (!body.id) return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
        return NextResponse.json({ ok: true, product: await advanceProductPipeline(body.id, { note: body.note }) });
      }
      return NextResponse.json({ ok: true, product: await createProduct(body) });
    }

    if (type === "suppliers") return NextResponse.json({ ok: true, supplier: await createSupplier(body) });
    if (type === "customers") return NextResponse.json({ ok: true, customer: await createCustomer(body) });
    if (type === "returns") return NextResponse.json({ ok: true, return: await createReturn(body) });

    if (type === "orders") {
      // Neue Bestellung: nur kunde_id + positionen aus dem Body, KEINE Statusflags (die werden
      // nie vom Aufrufer diktiert). Fuer Statusuebergaenge s. type=orders&action=event unten.
      if (!body.action) {
        if (!body.id) return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
        // Kompatibilitaet mit dem alten Event-basierten Aufrufmuster (id + type + payload):
        // legt die Bestellung bei Bedarf an und wertet danach sofort den echten Gate-Status aus.
        let order = await getOrderById(body.id);
        if (!order) {
          order = await createOrder({ id: body.id, kunde_id: body.kunde_id || "kunde_unbekannt", positionen: body.positionen || body.payload?.positionen || [] }).catch(() => null);
        }
        if (!order) return NextResponse.json({ ok: false, error: "Bestellung konnte nicht angelegt werden (kunde_id/positionen fehlen)" }, { status: 400 });

        const derived = await deriveOrderGateInputs(order);
        const gate = evaluateOrderAutomation(derived);
        const eventType = body.type || "order.created";
        const event = createOrderEvent({ type: eventType, orderId: order.id, payload: body.payload || {} });
        const nextState = gate.canAutoFulfill ? nextOrderState(order.status, eventType) : "blocked";
        const updated = await updateOrder(order.id, { status: nextState });
        const stored = saveEvent(event, order.id + ":" + eventType);
        return NextResponse.json({ ok: true, order: updated, event: stored.event, duplicate: stored.duplicate, gate });
      }
      return NextResponse.json({ ok: false, error: "Unbekannte action" }, { status: 400 });
    }

    return NextResponse.json({ ok: false, error: "Unbekannter type" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}

export async function PATCH(request) {
  const authError = checkAdminSecret(request);
  if (authError) return NextResponse.json({ ok: false, error: authError.error }, { status: authError.status });
  const url = new URL(request.url);
  const type = url.searchParams.get("type");

  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
    const { id, ...patch } = body;

    if (type === "products") return NextResponse.json({ ok: true, product: await updateProduct(id, patch) });
    if (type === "suppliers") return NextResponse.json({ ok: true, supplier: await updateSupplier(id, patch) });
    if (type === "returns") return NextResponse.json({ ok: true, return: await updateReturn(id, patch) });

    if (type === "orders") {
      // Manuelle Statusaenderung (z.B. Tracking-Nummer eintragen) - Statusuebergaenge, die den
      // Automation-Gate beruehren, laufen weiterhin ausschliesslich ueber POST type=orders (dort
      // wird der Gate-Status immer NEU aus echten Daten abgeleitet, nie hier direkt gesetzt).
      if (patch.status) return NextResponse.json({ ok: false, error: "Statusaenderungen laufen ueber POST ?type=orders (Event), nicht ueber PATCH" }, { status: 400 });
      return NextResponse.json({ ok: true, order: await updateOrder(id, patch) });
    }

    return NextResponse.json({ ok: false, error: "Unbekannter type" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}
