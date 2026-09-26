import crypto from "crypto";
import { nextOrderState } from "./automation.js";
import { getOrderById, updateOrder, recordOrderEvent, finalizeOrderEvent, storageMode, listProducts, updateProduct } from "./ecommerce-store.js";
import { VERSANDKOSTEN_CENT } from "./shop-marke.js";
import { RECHTSTEXTE } from "./shop-rechtstexte.js";

// Eigener Shop (26.09.2026, Adnans Entscheidung: "Alles vorbereiten", "Eigener Shop, kostenlos").
// Der Shop ist fertig gebaut, nimmt aber erst Bestellungen an, wenn JEDER Punkt der Start-
// Checkliste erfuellt ist. Nichts davon wird hier erfunden: Rechtstexte, Stripe-Konto und
// Produktfreigabe kommen ausschliesslich von Adnan bzw. aus den echten Produktdaten.

export const VERKAUFBARE_STATUS = ["READY", "PUBLISHED"];
export const RECHTSTEXT_SEITEN = ["impressum", "datenschutz", "agb", "widerruf"];

// Ein Produkt ist nur verkaufbar, wenn es die Pipeline durchlaufen hat und die Marge mit ECHTEM
// Einkaufspreis positiv ist (Verkaufspreis - Einkauf - Versand an den Lieferanten).
export function margeCent(p) {
  if (!Number.isInteger(p?.verkaufspreis_cent) || !Number.isInteger(p?.einkaufspreis_cent)) return null;
  return p.verkaufspreis_cent - p.einkaufspreis_cent - (Number.isInteger(p.versandkosten_cent) ? p.versandkosten_cent : 0);
}

export function istVerkaufbar(p) {
  const m = margeCent(p);
  return VERKAUFBARE_STATUS.includes(p?.pipeline_status) && p.verkaufspreis_cent > 0 && m !== null && m > 0 && p.bestand !== 0;
}

// Nur die Felder, die ein Kunde sehen darf - keine Einkaufspreise, Lieferanten oder Notizen.
export function oeffentlichesProdukt(p) {
  return { id: p.id, name: p.name, kategorie: p.kategorie || null, preis_cent: p.verkaufspreis_cent,
    beschreibung: p.beschreibung || "", bilder: Array.isArray(p.bilder) ? p.bilder : [], lieferzeit: p.lieferzeit || null,
    bestand: Number.isInteger(p.bestand) ? p.bestand : null };
}

export function rechtstexteVollstaendig(texte = RECHTSTEXTE) {
  return RECHTSTEXT_SEITEN.every(k => typeof texte[k] === "string" && texte[k].trim().length > 200 && !/\[[^\]]*\]/.test(texte[k]));
}

// Start-Checkliste. Nur Variablen-NAMEN und Ja/Nein - niemals Werte.
export function shopStartGate({ env = process.env, products = [], storage = storageMode(), texte = RECHTSTEXTE, versandCent = VERSANDKOSTEN_CENT } = {}) {
  const key = env.STRIPE_SECRET_KEY || "";
  const verkaufbar = products.filter(istVerkaufbar);
  const checks = [
    { id: "gewerbe-rechtstexte", ok: env.SHOP_RECHTSTEXTE_FREIGEGEBEN === "true" && rechtstexteVollstaendig(texte),
      titel: "Gewerbe angemeldet + Rechtstexte freigegeben",
      hinweis: "Impressum, Datenschutz, AGB und Widerruf mit echten Daten eingetragen (lib/shop-rechtstexte.js), anwaltlich geprüft, dann SHOP_RECHTSTEXTE_FREIGEGEBEN=true" },
    { id: "stripe-konto", ok: /^sk_(live|test)_/.test(key), titel: "Stripe-Konto für den Shop",
      hinweis: key.startsWith("sk_test_") ? "Testmodus-Schlüssel gesetzt - echte Zahlungen erst mit Live-Schlüssel" : "STRIPE_SECRET_KEY im Vercel-Projekt adnan (eigenes Stripe-Konto für E-Commerce, nicht das von Werknetz24)",
      modus: key.startsWith("sk_live_") ? "live" : key.startsWith("sk_test_") ? "test" : null },
    { id: "stripe-webhook", ok: Boolean(env.STRIPE_WEBHOOK_SECRET), titel: "Zahlungsbestätigung (Stripe-Webhook)",
      hinweis: "Webhook in Stripe auf https://adnan-sandy.vercel.app/api/payments/stripe (Ereignis checkout.session.completed), Signing-Secret als STRIPE_WEBHOOK_SECRET" },
    { id: "produkt", ok: verkaufbar.length > 0, titel: "Mindestens ein freigegebenes Produkt",
      hinweis: verkaufbar.length ? `${verkaufbar.length} verkaufbar` : "Pipeline-Status READY/PUBLISHED und echter Einkaufspreis mit positiver Marge nötig", anzahl: verkaufbar.length },
    { id: "versand", ok: Number.isInteger(versandCent) && versandCent >= 0, titel: "Versandkosten festgelegt",
      hinweis: Number.isInteger(versandCent) ? (versandCent === 0 ? "kostenloser Versand" : (versandCent / 100).toFixed(2).replace(".", ",") + " € pro Bestellung") : "VERSANDKOSTEN_CENT in lib/shop-marke.js nach echten Lieferantenkonditionen festlegen" },
    { id: "datenbank", ok: storage === "supabase", titel: "Dauerhafte Datenbank", hinweis: storage === "supabase" ? "Supabase aktiv" : "nur Zwischenspeicher" },
    { id: "freischaltung", ok: env.SHOP_LIVE === "true", titel: "Shop freigeschaltet (letzter Schalter)", hinweis: "SHOP_LIVE=true erst setzen, wenn alles oben erfüllt ist" },
  ];
  return { offen: checks.every(c => c.ok), checks, verkaufbar };
}

// Preise IMMER serverseitig aus den gespeicherten Produktdaten - nie aus dem Browser.
export function berechneWarenkorb(positionen, products, versandCent = VERSANDKOSTEN_CENT) {
  if (!Array.isArray(positionen) || positionen.length === 0 || positionen.length > 20) throw new Error("Warenkorb leer oder zu groß");
  const zeilen = positionen.map(pos => {
    const p = products.find(x => x.id === pos?.produkt_id);
    if (!p || !istVerkaufbar(p)) throw new Error("Produkt nicht verfügbar");
    if (!Number.isInteger(pos.menge) || pos.menge < 1 || pos.menge > 20) throw new Error("Ungültige Menge");
    if (Number.isInteger(p.bestand) && pos.menge > p.bestand) throw new Error(`Von "${p.name}" sind nur noch ${p.bestand} Stück verfügbar`);
    return { produkt_id: p.id, name: p.name, menge: pos.menge, einzelpreis_cent: p.verkaufspreis_cent, summe_cent: p.verkaufspreis_cent * pos.menge };
  });
  if (new Set(zeilen.map(z => z.produkt_id)).size !== zeilen.length) throw new Error("Produkt doppelt im Warenkorb");
  const waren_cent = zeilen.reduce((s, z) => s + z.summe_cent, 0);
  const versand_cent = Number.isInteger(versandCent) ? versandCent : 0;
  return { zeilen, waren_cent, versand_cent, summe_cent: waren_cent + versand_cent };
}

export function pruefeKundendaten(k) {
  const name = String(k?.name || "").trim(), email = String(k?.email || "").trim();
  const a = k?.adresse || {};
  const adresse = { strasse: String(a.strasse || "").trim(), plz: String(a.plz || "").trim(), ort: String(a.ort || "").trim(), land: "DE" };
  if (name.length < 2 || name.length > 120) throw new Error("Name fehlt");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new Error("Ungültige E-Mail-Adresse");
  if (adresse.strasse.length < 3 || !/^\d{5}$/.test(adresse.plz) || adresse.ort.length < 2) throw new Error("Lieferadresse unvollständig (Straße, 5-stellige PLZ, Ort)");
  return { name, email, adresse };
}

// Stripe Checkout Session ohne SDK (keine neue Abhängigkeit). Metadaten kommen vom Server.
export async function erstelleStripeCheckout({ secretKey, order, warenkorb, kunde, baseUrl, fetchImpl = fetch }) {
  const f = new URLSearchParams();
  f.set("mode", "payment"); f.set("locale", "de");
  f.set("success_url", baseUrl + "/laden/danke?bestellung=" + encodeURIComponent(order.id));
  f.set("cancel_url", baseUrl + "/laden?abgebrochen=1");
  f.set("customer_email", kunde.email);
  f.set("client_reference_id", order.id);
  f.set("metadata[order_id]", order.id); f.set("metadata[business_id]", "ecommerce");
  f.set("payment_intent_data[metadata][order_id]", order.id);
  warenkorb.zeilen.forEach((z, i) => {
    f.set(`line_items[${i}][quantity]`, String(z.menge));
    f.set(`line_items[${i}][price_data][currency]`, "eur");
    f.set(`line_items[${i}][price_data][unit_amount]`, String(z.einzelpreis_cent));
    f.set(`line_items[${i}][price_data][product_data][name]`, z.name);
  });
  if (warenkorb.versand_cent > 0) {
    const i = warenkorb.zeilen.length;
    f.set(`line_items[${i}][quantity]`, "1"); f.set(`line_items[${i}][price_data][currency]`, "eur");
    f.set(`line_items[${i}][price_data][unit_amount]`, String(warenkorb.versand_cent));
    f.set(`line_items[${i}][price_data][product_data][name]`, "Versand");
  }
  f.set("shipping_address_collection[allowed_countries][0]", "DE");
  const r = await fetchImpl("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST", headers: { Authorization: "Bearer " + secretKey, "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": "checkout-" + order.id }, body: f.toString(),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.url) throw new Error("Stripe-Checkout konnte nicht erstellt werden" + (j?.error?.message ? ": " + j.error.message : ""));
  return { url: j.url, session_id: j.id };
}

// Offizielles Stripe-Signaturschema (Header "t=<ts>,v1=<hmac>"), HMAC-SHA256 ueber "<ts>.<rohkoerper>".
export function pruefeStripeSignatur(rawBody, header, secret, { toleranzSek = 300, jetzt = Math.floor(Date.now() / 1000) } = {}) {
  if (!rawBody || !header || !secret) return false;
  const teile = Object.fromEntries(String(header).split(",").map(x => x.split("=")).filter(x => x.length === 2).map(([k, v]) => [k.trim(), v.trim()]));
  const ts = Number(teile.t);
  const signaturen = String(header).split(",").map(x => x.trim()).filter(x => x.startsWith("v1=")).map(x => x.slice(3));
  if (!Number.isFinite(ts) || !signaturen.length || Math.abs(jetzt - ts) > toleranzSek) return false;
  const erwartet = crypto.createHmac("sha256", secret).update(`${ts}.${rawBody}`, "utf8").digest("hex");
  return signaturen.some(s => { try { return s.length === erwartet.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(erwartet)); } catch { return false; } });
}

// Bestaetigte Zahlung verbuchen: gleicher Weg wie ein Ereignis ueber /api/orders (Ereignis zuerst
// dauerhaft speichern - Duplikat bewirkt nichts - dann Statusuebergang).
export async function verbucheZahlung(orderId, payload = {}) {
  const order = await getOrderById(orderId);
  if (!order) return { ok: false, grund: "Bestellung nicht gefunden" };
  const stored = await recordOrderEvent({ id: "evt_" + crypto.randomBytes(8).toString("hex"), orderId, type: "payment.confirmed", fromStatus: order.status, payload }, orderId + ":payment.confirmed");
  if (stored.duplicate) return { ok: true, duplicate: true, order };
  const next = nextOrderState(order.status, "payment.confirmed");
  const updated = next === order.status ? order : await updateOrder(orderId, { status: next });
  await finalizeOrderEvent(stored.event.id, next);
  // Bestand nur beim ersten (nicht doppelten) Zahlungseingang verringern; unbekannter Bestand bleibt unbekannt.
  const produkte = await listProducts();
  for (const pos of order.positionen || []) {
    const p = produkte.find(x => x.id === pos.produkt_id);
    if (p && Number.isInteger(p.bestand)) await updateProduct(p.id, { bestand: Math.max(0, p.bestand - pos.menge) });
  }
  return { ok: true, duplicate: false, order: updated };
}
