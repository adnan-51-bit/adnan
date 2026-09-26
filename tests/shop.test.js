// Eigener Shop (26.09.2026): Start-Checkliste, serverseitige Preise, Stripe-Signatur, Zahlungsbuchung.
// Kein echter Netzwerkaufruf - Stripe wird nachgebildet.
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { register } from "node:module";

register("data:text/javascript," + encodeURIComponent(
  'export async function resolve(s, c, n) { const fix = (s === "next/server" || (s.startsWith(".") && !/\\.[cm]?js$/.test(s))) ? s + ".js" : s; return n(fix, c); }'
));
delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SECRET_KEY;
for (const k of ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "SHOP_LIVE", "SHOP_RECHTSTEXTE_FREIGEGEBEN"]) delete process.env[k];
process.env.MASTER_API_SECRET = "test-secret";
const shop = await import("../lib/shop.js");
const store = await import("../lib/ecommerce-store.js");
const orders = await import("../app/api/orders/route.js");
const stripeRoute = await import("../app/api/payments/stripe/route.js");

const P = { id: "p1", name: "Testprodukt", kategorie: "Haushalt", pipeline_status: "READY", verkaufspreis_cent: 1990, einkaufspreis_cent: 800, versandkosten_cent: 400 };
const TEXTE = Object.fromEntries(shop.RECHTSTEXT_SEITEN.map(k => [k, "Echter Text ".repeat(30)]));
const ALLES = { STRIPE_SECRET_KEY: "sk_test_x", STRIPE_WEBHOOK_SECRET: "whsec_x", SHOP_LIVE: "true", SHOP_RECHTSTEXTE_FREIGEGEBEN: "true" };

test("Start-Checkliste: standardmäßig geschlossen, jeder Punkt einzeln nötig", () => {
  assert.equal(shop.shopStartGate({ env: {}, products: [P], storage: "supabase" }).offen, false);
  assert.equal(shop.shopStartGate({ env: ALLES, products: [P], storage: "supabase", texte: TEXTE, versandCent: 0 }).offen, true);
  for (const k of Object.keys(ALLES)) {
    const env = { ...ALLES }; delete env[k];
    assert.equal(shop.shopStartGate({ env, products: [P], storage: "supabase", texte: TEXTE, versandCent: 0 }).offen, false, k);
  }
  assert.equal(shop.shopStartGate({ env: ALLES, products: [], storage: "supabase", texte: TEXTE, versandCent: 0 }).offen, false, "ohne Produkt");
  assert.equal(shop.shopStartGate({ env: ALLES, products: [P], storage: "supabase", texte: TEXTE, versandCent: null }).offen, false, "ohne festgelegte Versandkosten");
  assert.equal(shop.shopStartGate({ env: ALLES, products: [P], storage: "memory", texte: TEXTE, versandCent: 0 }).offen, false, "ohne Datenbank");
  assert.equal(shop.shopStartGate({ env: ALLES, products: [P], storage: "supabase", texte: { ...TEXTE, agb: TEXTE.agb + " [Firmenname]" }, versandCent: 0 }).offen, false, "Platzhalter im Rechtstext");
});

test("Echte Rechtstexte im Repo sind leer -> Shop bleibt zu, auch wenn alles andere gesetzt ist", () => {
  assert.equal(shop.rechtstexteVollstaendig(), false);
  assert.equal(shop.shopStartGate({ env: ALLES, products: [P], storage: "supabase" }).offen, false);
});

test("Verkaufbar nur mit Freigabe-Status und positiver Marge aus echtem Einkaufspreis", () => {
  assert.equal(shop.istVerkaufbar(P), true);
  assert.equal(shop.istVerkaufbar({ ...P, pipeline_status: "RESEARCH" }), false);
  assert.equal(shop.istVerkaufbar({ ...P, einkaufspreis_cent: null }), false);
  assert.equal(shop.istVerkaufbar({ ...P, einkaufspreis_cent: 1700 }), false, "Marge negativ");
  const oe = shop.oeffentlichesProdukt({ ...P, notiz: "intern", supplier_id: "sup_x" });
  for (const k of ["einkaufspreis_cent", "versandkosten_cent", "supplier_id", "notiz", "pipeline_status"]) assert.equal(k in oe, false, k + " darf nicht öffentlich sein");
  assert.equal(shop.istVerkaufbar({ ...P, bestand: 0 }), false, "ausverkauft");
});

test("Warenkorb: Preis vom Server, ungültige Positionen abgelehnt", () => {
  const w = shop.berechneWarenkorb([{ produkt_id: "p1", menge: 2, preis_cent: 1 }], [P], 490);
  assert.equal(w.waren_cent, 3980); assert.equal(w.versand_cent, 490); assert.equal(w.summe_cent, 4470);
  assert.throws(() => shop.berechneWarenkorb([{ produkt_id: "p1", menge: 3 }], [{ ...P, bestand: 2 }]), /nur noch 2/);
  assert.throws(() => shop.berechneWarenkorb([{ produkt_id: "p1", menge: 1 }, { produkt_id: "p1", menge: 1 }], [P]), /doppelt/);
  assert.throws(() => shop.berechneWarenkorb([], [P]));
  assert.throws(() => shop.berechneWarenkorb([{ produkt_id: "p1", menge: 0 }], [P]));
  assert.throws(() => shop.berechneWarenkorb([{ produkt_id: "p1", menge: 1.5 }], [P]));
  assert.throws(() => shop.berechneWarenkorb([{ produkt_id: "gibts-nicht", menge: 1 }], [P]));
  assert.throws(() => shop.berechneWarenkorb([{ produkt_id: "p1", menge: 1 }], [{ ...P, pipeline_status: "IDEA" }]));
});

test("Kundendaten: Pflichtfelder und Formate", () => {
  const ok = shop.pruefeKundendaten({ name: "Max M", email: "max@example.de", adresse: { strasse: "Hauptstr. 1", plz: "40789", ort: "Monheim" } });
  assert.equal(ok.adresse.land, "DE");
  assert.throws(() => shop.pruefeKundendaten({ name: "Max", email: "kein-at", adresse: { strasse: "Hauptstr. 1", plz: "40789", ort: "Monheim" } }));
  assert.throws(() => shop.pruefeKundendaten({ name: "Max", email: "max@example.de", adresse: { strasse: "Hauptstr. 1", plz: "4078", ort: "Monheim" } }));
});

const signiere = (body, secret, ts = Math.floor(Date.now() / 1000)) => `t=${ts},v1=${crypto.createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex")}`;

test("Stripe-Signatur: gültig / falsches Secret / manipuliert / zu alt / fehlend", () => {
  const body = '{"id":"evt_1"}';
  assert.equal(shop.pruefeStripeSignatur(body, signiere(body, "s"), "s"), true);
  assert.equal(shop.pruefeStripeSignatur(body, signiere(body, "anders"), "s"), false);
  assert.equal(shop.pruefeStripeSignatur(body + " ", signiere(body, "s"), "s"), false);
  assert.equal(shop.pruefeStripeSignatur(body, signiere(body, "s", Math.floor(Date.now() / 1000) - 3600), "s"), false);
  assert.equal(shop.pruefeStripeSignatur(body, null, "s"), false);
});

test("Stripe Checkout: Betrag und Metadaten vom Server, Idempotenz pro Bestellung", async () => {
  let gesendet;
  const r = await shop.erstelleStripeCheckout({ secretKey: "sk_test_x", order: { id: "order_1" }, warenkorb: shop.berechneWarenkorb([{ produkt_id: "p1", menge: 2 }], [P]),
    kunde: { email: "max@example.de" }, baseUrl: "https://shop.test",
    fetchImpl: async (url, o) => { gesendet = { url, o, f: new URLSearchParams(o.body) }; return { ok: true, json: async () => ({ id: "cs_1", url: "https://checkout.stripe.test/cs_1" }) }; } });
  assert.equal(r.url, "https://checkout.stripe.test/cs_1");
  assert.equal(gesendet.url, "https://api.stripe.com/v1/checkout/sessions");
  assert.equal(gesendet.f.get("line_items[0][price_data][unit_amount]"), "1990");
  assert.equal(gesendet.f.get("line_items[0][quantity]"), "2");
  assert.equal(gesendet.f.get("metadata[order_id]"), "order_1");
  assert.equal(gesendet.f.get("metadata[business_id]"), "ecommerce");
  assert.equal(gesendet.o.headers["Idempotency-Key"], "checkout-order_1");
  assert.equal(gesendet.f.get("shipping_address_collection[allowed_countries][0]"), "DE");
});

const req = (method, query, body, auth) => new Request("http://t/api/orders?" + query, { method, headers: { "content-type": "application/json", ...(auth ? { authorization: "Bearer test-secret" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });

test("API: Shop geschlossen -> keine Produkte, Bestellung 503; Checkliste nur mit Secret", async () => {
  const anonym = await (await orders.GET(req("GET", "type=shop"))).json();
  assert.equal(anonym.offen, false); assert.deepEqual(anonym.produkte, []); assert.equal(anonym.checkliste, undefined);
  const admin = await (await orders.GET(req("GET", "type=shop", null, true))).json();
  assert.equal(admin.checkliste.length, 7);
  const r = await orders.POST(req("POST", "type=shop-bestellung", { positionen: [{ produkt_id: "prod_cable", menge: 1 }], kunde: {} }));
  assert.equal(r.status, 503);
});

const webhook = (body, sig) => stripeRoute.POST(new Request("http://t/api/payments/stripe", { method: "POST", headers: sig ? { "stripe-signature": sig } : {}, body }));

test("Webhook: ohne Secret 503, falsche Signatur 400, bezahlt -> paid genau einmal, Fremdereignis ignoriert", async () => {
  assert.equal((await webhook("{}", null)).status, 503);
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  try {
    const kunde = await store.createCustomer({ name: "Webhook Test", email: "w@example.de" });
    const order = await store.createOrder({ kunde_id: kunde.id, positionen: [{ produkt_id: "prod_cable", menge: 1 }] });
    const ev = id => JSON.stringify({ id, type: "checkout.session.completed", data: { object: { id: "cs_1", payment_status: "paid", amount_total: 1990, currency: "eur", metadata: { business_id: "ecommerce", order_id: order.id } } } });
    assert.equal((await webhook(ev("evt_a"), signiere(ev("evt_a"), "falsch"))).status, 400);
    assert.equal((await store.getOrderById(order.id)).status, "payment_pending", "falsche Signatur ändert nichts");
    const r1 = await (await webhook(ev("evt_a"), signiere(ev("evt_a"), "whsec_test"))).json();
    assert.equal(r1.status, "paid");
    const r2 = await (await webhook(ev("evt_a"), signiere(ev("evt_a"), "whsec_test"))).json();
    assert.equal(r2.duplicate, true, "gleiches Stripe-Ereignis nur einmal");
    const r3 = await (await webhook(ev("evt_b"), signiere(ev("evt_b"), "whsec_test"))).json();
    assert.equal(r3.duplicate, true, "zweites Ereignis zur selben Zahlung bucht nicht erneut");
    const fremd = JSON.stringify({ id: "evt_c", type: "checkout.session.completed", data: { object: { payment_status: "paid", metadata: { business_id: "werknetz24", order_id: order.id } } } });
    assert.equal((await (await webhook(fremd, signiere(fremd, "whsec_test"))).json()).ignoriert, true, "Werknetz24-Zahlungen werden hier nie verbucht");
    assert.equal((await store.listOrderEvents(order.id)).filter(e => e.type === "payment.confirmed").length, 1);
  } finally { delete process.env.STRIPE_WEBHOOK_SECRET; }
});

test("Versand wird als eigene Position an Stripe übergeben", async () => {
  let f;
  await shop.erstelleStripeCheckout({ secretKey: "sk_test_x", order: { id: "o2" }, warenkorb: shop.berechneWarenkorb([{ produkt_id: "p1", menge: 1 }], [P], 490),
    kunde: { email: "a@b.de" }, baseUrl: "https://s.test", fetchImpl: async (u, o) => { f = new URLSearchParams(o.body); return { ok: true, json: async () => ({ id: "cs", url: "https://x" }) }; } });
  assert.equal(f.get("line_items[1][price_data][product_data][name]"), "Versand");
  assert.equal(f.get("line_items[1][price_data][unit_amount]"), "490");
});

test("Bezahlte Bestellung verringert gepflegten Bestand genau einmal, unbekannter Bestand bleibt unbekannt", async () => {
  const mit = await store.createProduct({ name: "Mit Bestand", kategorie: "Test", verkaufspreis_cent: 1000, bestand: 5 });
  const ohne = await store.createProduct({ name: "Ohne Bestand", kategorie: "Test", verkaufspreis_cent: 1000 });
  const k = await store.createCustomer({ name: "Bestand Test", email: "b@example.de" });
  const o = await store.createOrder({ kunde_id: k.id, positionen: [{ produkt_id: mit.id, menge: 2 }, { produkt_id: ohne.id, menge: 1 }] });
  await shop.verbucheZahlung(o.id, {});
  await shop.verbucheZahlung(o.id, {});
  const liste = await store.listProducts();
  assert.equal(liste.find(p => p.id === mit.id).bestand, 3);
  assert.equal(liste.find(p => p.id === ohne.id).bestand, null);
});

test("Produktfelder: nur https-Bilder, max. 8, Bestand ≥ 0", async () => {
  assert.throws(() => store.pruefeProduktZusatz({ bilder: ["http://unsicher.de/a.jpg"] }), /https/);
  assert.throws(() => store.pruefeProduktZusatz({ bilder: Array(9).fill("https://x.de/a.jpg") }), /8/);
  assert.throws(() => store.pruefeProduktZusatz({ bestand: -1 }));
  assert.deepEqual(store.pruefeProduktZusatz({ bestand: "", lieferzeit: "  " }), { bestand: null, lieferzeit: null });
  const p = await store.createProduct({ name: "Bildtest", kategorie: "Test", verkaufspreis_cent: 500 });
  const u = await store.updateProduct(p.id, { bilder: ["https://bilder.test/1.jpg"], beschreibung: "Echte Beschreibung", einkaufspreis_cent: 200 });
  assert.deepEqual(u.bilder, ["https://bilder.test/1.jpg"]);
  await assert.rejects(() => store.updateProduct(p.id, { verkaufspreis_cent: 0 }));
});

test("Admin: Pipeline-Status lässt sich per PATCH nicht überspringen", async () => {
  const p = await store.createProduct({ name: "Pipeline Test", kategorie: "Test", verkaufspreis_cent: 900 });
  const r = await orders.PATCH(new Request("http://t/api/orders?type=products", { method: "PATCH", headers: { "content-type": "application/json", authorization: "Bearer test-secret" }, body: JSON.stringify({ id: p.id, pipeline_status: "READY" }) }));
  assert.equal(r.status, 400);
  assert.equal((await store.listProducts()).find(x => x.id === p.id).pipeline_status, "IDEA");
  const ok = await orders.PATCH(new Request("http://t/api/orders?type=products", { method: "PATCH", headers: { "content-type": "application/json", authorization: "Bearer test-secret" }, body: JSON.stringify({ id: p.id, beschreibung: "Neu", bestand: 4 }) }));
  assert.equal(ok.status, 200);
});
