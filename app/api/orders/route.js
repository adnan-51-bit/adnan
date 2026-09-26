import { NextResponse } from "next/server";
import { createOrderEvent, evaluateOrderAutomation, nextOrderState } from "../../../lib/automation.js";
import {
  listProducts, createProduct, advanceProductPipeline, updateProduct,
  listSuppliers, createSupplier, updateSupplier,
  listCustomers, createCustomer,
  listOrders, getOrderById, createOrder, updateOrder, deriveOrderGateInputs,
  listReturns, createReturn, updateReturn,
  recordOrderEvent, finalizeOrderEvent, listOrderEvents, orderStats,
  storageMode,
} from "../../../lib/ecommerce-store.js";

// Reparaturphase E-Commerce (26.09.2026, reproduzierte Fehler):
// 1) Das Freigabe-Gate (Produkt veroeffentlicht, Lieferant verifiziert, Marge positiv) lief bei
//    JEDEM Ereignis - "Zahlung bestaetigen" auf einer neuen Bestellung setzte sie deshalb auf
//    "blockiert" (Blocker: payment_not_confirmed). Es gilt jetzt nur fuer die Schritte, die Richtung
//    Lieferung fuehren.
// 2) Der Duplikatschutz griff erst NACH dem Statuswechsel. Jetzt wird das Ereignis zuerst dauerhaft
//    gespeichert (eindeutiger Schluessel in der DB); ein Duplikat bewirkt nichts.
// 3) Eine unbekannte Bestell-ID legte eine NEUE Bestellung mit anderer ID (und Platzhalter-Kunde)
//    an. Jetzt 404; neue Bestellungen nur ueber action "create" mit echtem Kunden + echten Produkten.
const GATED_EVENTS = new Set(["order.created", "order.validated", "supplier.order.requested"]);
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

  // Seit Supabase-Persistenz (26.09.2026): Kunden, Bestellungen und Retouren enthalten echte
  // Personen-/Bestelldaten und sind nur noch mit MASTER_API_SECRET lesbar. Produkte/Lieferanten
  // (oeffentliche Recherche, keine Personendaten) bleiben wie bisher offen lesbar.
  if (["customers", "orders", "returns"].includes(type)) {
    const authError = checkAdminSecret(request);
    if (authError) return NextResponse.json({ ok: false, error: authError.error }, { status: authError.status });
  }
  try {
    if (type === "products") return NextResponse.json({ ok: true, storage: storageMode(), products: await listProducts() });
    if (type === "suppliers") return NextResponse.json({ ok: true, storage: storageMode(), suppliers: await listSuppliers() });
    if (type === "customers") return NextResponse.json({ ok: true, storage: storageMode(), customers: await listCustomers() });
    if (type === "returns") return NextResponse.json({ ok: true, storage: storageMode(), returns: await listReturns() });
    if (type === "orders") {
      if (id) return NextResponse.json({ ok: true, order: await getOrderById(id), events: await listOrderEvents(id) });
      return NextResponse.json({ ok: true, storage: storageMode(), orders: await listOrders(), stats: await orderStats() });
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
      // Neue Bestellung: nur kunde_id + positionen, KEINE Statusflags (die werden nie vom Aufrufer
      // diktiert). Kunde und Produkte muessen real existieren - kein Platzhalter-Kunde.
      if (body.action === "create") {
        const kunden = await listCustomers();
        if (!kunden.some(k => k.id === body.kunde_id)) return NextResponse.json({ ok: false, error: "Kunde nicht gefunden" }, { status: 400 });
        const produkte = await listProducts();
        const unbekannt = (Array.isArray(body.positionen) ? body.positionen : []).filter(p => !produkte.some(x => x.id === p?.produkt_id));
        if (unbekannt.length) return NextResponse.json({ ok: false, error: "Unbekanntes Produkt in den Positionen" }, { status: 400 });
        return NextResponse.json({ ok: true, order: await createOrder({ kunde_id: body.kunde_id, positionen: body.positionen }) }, { status: 201 });
      }
      // Statusuebergang per Ereignis (id + type).
      if (!body.action) {
        if (!body.id) return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
        const order = await getOrderById(body.id);
        if (!order) return NextResponse.json({ ok: false, error: "Bestellung nicht gefunden - neue Bestellungen nur ueber action \"create\"" }, { status: 404 });
        const eventType = body.type || "order.created";
        const event = createOrderEvent({ type: eventType, orderId: order.id, payload: body.payload || {} });

        // Zuerst dauerhaft festhalten; ein Duplikat fuehrt zu keinem weiteren Statuswechsel.
        const stored = await recordOrderEvent({ id: event.id, orderId: order.id, type: eventType, fromStatus: order.status, payload: event.payload }, order.id + ":" + eventType);
        if (stored.duplicate) return NextResponse.json({ ok: true, duplicate: true, order, event: stored.event });

        let gate = null;
        let nextState = nextOrderState(order.status, eventType);
        if (GATED_EVENTS.has(eventType) && nextState !== order.status) {
          gate = evaluateOrderAutomation(await deriveOrderGateInputs(order));
          if (!gate.canAutoFulfill) nextState = "blocked";
        }
        const updated = nextState === order.status ? order : await updateOrder(order.id, { status: nextState });
        await finalizeOrderEvent(event.id, nextState);
        return NextResponse.json({ ok: true, duplicate: false, order: updated, event: { ...stored.event, to_status: nextState }, gate });
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
