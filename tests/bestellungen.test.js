// Reparaturphase E-Commerce (26.09.2026): die drei live reproduzierten Fehler im Bestellweg.
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("data:text/javascript," + encodeURIComponent(
  'export async function resolve(s, c, n) { const fix = (s === "next/server" || (s.startsWith(".") && !/\\.[cm]?js$/.test(s))) ? s + ".js" : s; return n(fix, c); }'
));
delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SECRET_KEY;
process.env.MASTER_API_SECRET = "test-secret";
const { POST, GET } = await import("../app/api/orders/route.js");
const store = await import("../lib/ecommerce-store.js");

const call = async (method, query, body) => {
  const r = await (method === "POST" ? POST : GET)(new Request("http://t/api/orders?" + query, { method, headers: { authorization: "Bearer test-secret" }, ...(body ? { body: JSON.stringify(body) } : {}) }));
  return { status: r.status, json: await r.json() };
};

let kunde;
beforeEach(async () => {
  store.resetEcommerceStoreForTests();
  kunde = await store.createCustomer({ name: "Test Kunde", email: "k@example.invalid" });
});

test("Bestellung erfassen nur mit echtem Kunden und echten Produkten", async () => {
  assert.equal((await call("POST", "type=orders", { action: "create", kunde_id: "gibt_es_nicht", positionen: [{ produkt_id: "prod_cable", menge: 1 }] })).status, 400);
  assert.equal((await call("POST", "type=orders", { action: "create", kunde_id: kunde.id, positionen: [{ produkt_id: "erfunden", menge: 1 }] })).status, 400);
  const ok = await call("POST", "type=orders", { action: "create", kunde_id: kunde.id, positionen: [{ produkt_id: "prod_cable", menge: 2 }] });
  assert.equal(ok.status, 201);
  assert.equal(ok.json.order.status, "payment_pending");
});

test("Fehler 1: 'Zahlung bestaetigen' fuehrt zu 'bezahlt', nicht zu 'blockiert'", async () => {
  const order = await store.createOrder({ kunde_id: kunde.id, positionen: [{ produkt_id: "prod_cable", menge: 1 }] });
  const r = await call("POST", "type=orders", { id: order.id, type: "payment.confirmed" });
  assert.equal(r.status, 200);
  assert.equal(r.json.order.status, "paid");
  assert.equal(r.json.gate, null);
});

test("Gate greift weiterhin beim Schritt Richtung Lieferung (Produkt nicht freigegeben -> blockiert)", async () => {
  const order = await store.createOrder({ kunde_id: kunde.id, positionen: [{ produkt_id: "prod_cable", menge: 1 }] });
  await call("POST", "type=orders", { id: order.id, type: "payment.confirmed" });
  const r = await call("POST", "type=orders", { id: order.id, type: "order.created" });
  assert.equal(r.json.order.status, "blocked");
  assert.ok(r.json.gate.blockers.includes("product_not_approved"));
  assert.ok(!r.json.gate.blockers.includes("payment_not_confirmed"));
});

test("Fehler 2: doppeltes Ereignis wirkt nur einmal und wird dauerhaft protokolliert", async () => {
  const order = await store.createOrder({ kunde_id: kunde.id, positionen: [{ produkt_id: "prod_cable", menge: 1 }] });
  const erst = await call("POST", "type=orders", { id: order.id, type: "payment.confirmed" });
  const zweit = await call("POST", "type=orders", { id: order.id, type: "payment.confirmed" });
  assert.equal(erst.json.duplicate, false);
  assert.equal(zweit.json.duplicate, true);
  assert.equal(zweit.json.order.status, "paid");
  const events = await store.listOrderEvents(order.id);
  assert.equal(events.length, 1);
  assert.equal(events[0].from_status, "payment_pending");
  assert.equal(events[0].to_status, "paid");
});

test("Fehler 3: unbekannte Bestell-ID -> 404, es wird KEINE Bestellung angelegt", async () => {
  const vorher = (await store.listOrders()).length;
  const r = await call("POST", "type=orders", { id: "gibt_es_nicht", type: "payment.confirmed", kunde_id: kunde.id, positionen: [{ produkt_id: "prod_cable", menge: 1 }] });
  assert.equal(r.status, 404);
  assert.equal((await store.listOrders()).length, vorher);
});

test("Webhook-Beleg: erster Eingang wird verarbeitet, Wiederholung nicht", async () => {
  assert.equal(await store.claimWebhookReceipt("shopify:123", "shopify"), true);
  assert.equal(await store.claimWebhookReceipt("shopify:123", "shopify"), false);
});

test("Bestell-Statistik meldet den echten Speicherort statt eines festen Werts", async () => {
  const r = await call("GET", "type=orders");
  assert.equal(r.json.stats.persistence, "memory");
});
