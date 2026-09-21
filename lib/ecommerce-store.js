// E-Commerce-Datenschicht (Phase 3, 20.09.2026). Exakt gleiches Muster wie lib/master-store.js:
// Supabase, wenn konfiguriert, sonst ein Prozess-lokaler Fallback-Speicher - nie erfundene Daten.
// Kunden/Bestellungen/Retouren starten IMMER leer (keine Fake-Kunden/-Bestellungen). Lieferanten/
// Produkte werden einmalig mit der bereits vorher in app/lieferanten und app/produkt-pipeline
// hinterlegten, echten Recherche geseedet (Quellen mit URL dokumentiert) - keine neuen,
// erfundenen Lieferanten oder Produkte.
import { writeAudit } from "./audit.js";

// Diese gesamte Datenschicht gehört ausschließlich zum Geschäftsbereich "ecommerce" (s.
// lib/master-store.js BUSINESS_IDS). Jeder erzeugte Datensatz trägt explizit business_id, damit
// eine Vermischung mit Werknetz24 (vollständig externes System, s. werknetz24-connector.js) oder
// künftigen weiteren Betrieben technisch nachprüfbar ausgeschlossen ist, nicht nur behauptet wird.
export const BUSINESS_ID = "ecommerce";

export const PRODUCT_PIPELINE_STATES = [
  "IDEA", "RESEARCH", "SUPPLIER_CHECK", "PRODUCT_CHECK", "LEGAL_CHECK",
  "MARGIN_CHECK", "IMAGE_CHECK", "COPY_CHECK", "QUALITY_GATE", "READY", "PUBLISHED",
];
export const SUPPLIER_STATUS = ["recherchiert", "geprueft", "verifiziert", "abgelehnt"];
export const ORDER_STATUS = [
  "payment_pending", "paid", "validated", "supplier_pending", "supplier_ordered",
  "fulfilled", "tracking_available", "delivered", "cancelled", "blocked",
];
export const RETURN_STATUS = ["angefragt", "genehmigt", "abgelehnt", "erhalten", "erstattet"];

const memory = globalThis.__ECOMMERCE_STORE__ || {
  products: new Map(),
  suppliers: new Map(),
  customers: new Map(),
  orders: new Map(),
  returns: new Map(),
  seeded: false,
};
globalThis.__ECOMMERCE_STORE__ = memory;

// Echte Recherche aus app/lieferanten/page.jsx (vor Phase 3 dort hartcodiert) - Quellen-URLs wie
// dort dokumentiert, keine neuen Angaben erfunden.
const seedSuppliers = [
  { id: "sup_clp", name: "CLP", region: "Deutschland", categories: "Wohnen, Garten, Sport, Wellness", modell: "Direktversand", neutral: true, risiko: "niedrig", quelle_url: "https://www.clp.de/haendler", notiz: "Lagert, verpackt und versendet direkt an Endkunden im Namen des Händlers.", status: "recherchiert" },
  { id: "sup_tm_textil", name: "T.M. Textil", region: "Deutschland", categories: "Heimtextilien", modell: "Blind Shipping", neutral: true, risiko: "niedrig", quelle_url: "https://www.tm-textil.de/en/dropshipping.html", notiz: "900+ SKUs im deutschen Lager, 24/48h Versand laut Anbieter, kein MOQ.", status: "recherchiert" },
  { id: "sup_chilitec", name: "ChiliTec", region: "Deutschland", categories: "Haushalt, Technik, Zubehör", modell: "Neutralversand", neutral: true, risiko: "mittel", quelle_url: "https://www.chilitec.de/versand-und-zahlung/dropshipping/", notiz: "Direktversand an Kunden; Mindestbestellwert 10 € netto und 7,50 € Versandpauschale innerhalb Deutschlands laut Anbieter.", status: "recherchiert" },
  { id: "sup_krempl", name: "Hans Krempl", region: "Deutschland", categories: "Haustechnik", modell: "Direktversand", neutral: true, risiko: "mittel", quelle_url: "https://www.krempl.de/en/dropshipping/", notiz: "Versand direkt aus dem Lager an Kunden; neutraler Versand in eigenem Namen laut Anbieter.", status: "recherchiert" },
  { id: "sup_dropply", name: "Dropply", region: "EU", categories: "Nahrungsergänzung", modell: "Dropshipping", neutral: true, risiko: "hoch", quelle_url: "https://www.dropply.eu/de", notiz: "Nur B2B; EU-USt-IdNr. erforderlich. Für den Start bewusst nicht priorisiert.", status: "recherchiert" },
  { id: "sup_bigbuy", name: "BigBuy", region: "EU", categories: "Gemischtes Sortiment", modell: "Dropshipping", neutral: true, risiko: "mittel", quelle_url: "https://www.bigbuy.eu/", notiz: "Breites Sortiment und Multi-Channel-Ausrichtung; Preise, Gebühren und konkrete Produktmargen separat prüfen.", status: "recherchiert" },
];

// Echte Recherche aus app/produkt-pipeline/page.jsx - EK/Versand bleiben null ("offen"), wo sie
// vorher schon als offen/unbekannt gekennzeichnet waren, statt erfundener Zahlen.
const seedProducts = [
  { id: "prod_auto_organizer", name: "Kofferraum-Organizer", kategorie: "Auto & Ordnung", supplier_id: null, einkaufspreis_cent: null, versandkosten_cent: null, verkaufspreis_cent: 2499, pipeline_status: "RESEARCH", notiz: "Direktversand-Partner und Gesamtkosten prüfen." },
  { id: "prod_drawer", name: "Schubladen-Organizer", kategorie: "Haushalt", supplier_id: null, einkaufspreis_cent: 121, versandkosten_cent: null, verkaufspreis_cent: 1890, pipeline_status: "RESEARCH", notiz: "Dropshipping-Lieferant mit kleiner MOQ finden." },
  { id: "prod_dog_bottle", name: "Hunde-Reisetrinkflasche", kategorie: "Tierbedarf", supplier_id: null, einkaufspreis_cent: null, versandkosten_cent: null, verkaufspreis_cent: 1990, pipeline_status: "IDEA", notiz: "Direktversand + EK verifizieren." },
  { id: "prod_cable", name: "Kabel-Organizer 5er", kategorie: "Ordnung & Zubehör", supplier_id: "sup_chilitec", einkaufspreis_cent: null, versandkosten_cent: 750, verkaufspreis_cent: 1990, pipeline_status: "SUPPLIER_CHECK", notiz: "Händler-EK nach Login + Retourenprozess prüfen." },
  { id: "prod_textile", name: "Heimtextilien", kategorie: "Wohnen", supplier_id: "sup_tm_textil", einkaufspreis_cent: null, versandkosten_cent: null, verkaufspreis_cent: 2990, pipeline_status: "SUPPLIER_CHECK", notiz: "Händlerkonto + konkretes Produkt + EK prüfen." },
  { id: "prod_garden", name: "Garten-Organizer/Zubehör", kategorie: "Garten", supplier_id: null, einkaufspreis_cent: null, versandkosten_cent: null, verkaufspreis_cent: 2990, pipeline_status: "IDEA", notiz: "Produktrecherche starten." },
];

function seedOnce() {
  if (memory.seeded) return;
  const jetzt = new Date().toISOString();
  for (const s of seedSuppliers) if (!memory.suppliers.has(s.id)) memory.suppliers.set(s.id, { ...s, business_id: BUSINESS_ID, erstellt_am: jetzt });
  for (const p of seedProducts) if (!memory.products.has(p.id)) memory.products.set(p.id, { ...p, business_id: BUSINESS_ID, erstellt_am: jetzt, aktualisiert_am: jetzt });
  memory.seeded = true;
}
seedOnce();

function supabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

async function supabaseRequest(path, options = {}) {
  const response = await fetch(process.env.SUPABASE_URL + "/rest/v1/" + path, {
    ...options,
    headers: {
      apikey: process.env.SUPABASE_SECRET_KEY,
      Authorization: "Bearer " + process.env.SUPABASE_SECRET_KEY,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  if (!response.ok) throw new Error("Supabase request failed: " + response.status + " " + text);
  return text ? JSON.parse(text) : null;
}

export function storageMode() {
  return supabaseConfigured() ? "supabase" : "memory";
}

function newId(prefix) {
  return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ============ PRODUKTE ============
export async function listProducts() {
  if (!supabaseConfigured()) return [...memory.products.values()];
  return supabaseRequest("ecommerce_products?select=*&order=name.asc");
}

export async function createProduct(input) {
  const { name, kategorie, verkaufspreis_cent } = input;
  if (!name || !kategorie || !Number.isInteger(verkaufspreis_cent) || verkaufspreis_cent <= 0) {
    throw new Error("createProduct: name, kategorie und ein positiver ganzzahliger verkaufspreis_cent sind Pflichtfelder");
  }
  const jetzt = new Date().toISOString();
  const product = {
    id: newId("prod"), business_id: BUSINESS_ID, name, kategorie,
    supplier_id: input.supplier_id || null,
    einkaufspreis_cent: Number.isInteger(input.einkaufspreis_cent) ? input.einkaufspreis_cent : null,
    versandkosten_cent: Number.isInteger(input.versandkosten_cent) ? input.versandkosten_cent : null,
    verkaufspreis_cent,
    pipeline_status: "IDEA",
    notiz: input.notiz || "",
    erstellt_am: jetzt, aktualisiert_am: jetzt,
  };
  if (!supabaseConfigured()) { memory.products.set(product.id, product); await writeAudit({ action: "product.created", entityType: "product", entityId: product.id, details: { name, kategorie } }); return product; }
  const rows = await supabaseRequest("ecommerce_products", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(product) });
  await writeAudit({ action: "product.created", entityType: "product", entityId: product.id, details: { name, kategorie } });
  return rows[0];
}

// Bewegt ein Produkt genau EINEN Schritt in der Pipeline weiter (nie ueberspringen) - erzwingt
// den in docs/DROPSHIPPING-SYSTEM.md dokumentierten Gate-Prozess, statt ihn nur zu behaupten.
export async function advanceProductPipeline(id, { note } = {}) {
  const products = await listProducts();
  const product = products.find(p => p.id === id);
  if (!product) throw new Error("Produkt nicht gefunden");
  const idx = PRODUCT_PIPELINE_STATES.indexOf(product.pipeline_status);
  if (idx === -1 || idx === PRODUCT_PIPELINE_STATES.length - 1) {
    throw new Error("Produkt ist bereits im letzten Pipeline-Schritt (" + product.pipeline_status + ")");
  }
  const nextStatus = PRODUCT_PIPELINE_STATES[idx + 1];
  return updateProduct(id, { pipeline_status: nextStatus, notiz: note || product.notiz });
}

export async function updateProduct(id, patch) {
  const allowed = ["name", "kategorie", "supplier_id", "einkaufspreis_cent", "versandkosten_cent", "verkaufspreis_cent", "pipeline_status", "notiz"];
  const clean = Object.fromEntries(Object.entries(patch).filter(([k]) => allowed.includes(k)));
  if (clean.pipeline_status && !PRODUCT_PIPELINE_STATES.includes(clean.pipeline_status)) {
    throw new Error("Ungültiger pipeline_status");
  }
  clean.aktualisiert_am = new Date().toISOString();
  if (!supabaseConfigured()) {
    const current = memory.products.get(id);
    if (!current) throw new Error("Produkt nicht gefunden");
    const updated = { ...current, ...clean };
    memory.products.set(id, updated);
    await writeAudit({ action: "product.updated", entityType: "product", entityId: id, details: clean });
    return updated;
  }
  const rows = await supabaseRequest("ecommerce_products?id=eq." + encodeURIComponent(id), { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(clean) });
  if (!rows?.[0]) throw new Error("Produkt nicht gefunden");
  await writeAudit({ action: "product.updated", entityType: "product", entityId: id, details: clean });
  return rows[0];
}

// ============ LIEFERANTEN ============
export async function listSuppliers() {
  if (!supabaseConfigured()) return [...memory.suppliers.values()];
  return supabaseRequest("ecommerce_suppliers?select=*&order=name.asc");
}

export async function createSupplier(input) {
  const { name, region } = input;
  if (!name || !region) throw new Error("createSupplier: name und region sind Pflichtfelder");
  const supplier = {
    id: newId("sup"), business_id: BUSINESS_ID, name, region,
    categories: input.categories || "", modell: input.modell || "", neutral: !!input.neutral,
    risiko: input.risiko || "unbekannt", quelle_url: input.quelle_url || null, notiz: input.notiz || "",
    status: "recherchiert", erstellt_am: new Date().toISOString(),
  };
  if (!supabaseConfigured()) { memory.suppliers.set(supplier.id, supplier); await writeAudit({ action: "supplier.created", entityType: "supplier", entityId: supplier.id, details: { name, region } }); return supplier; }
  const rows = await supabaseRequest("ecommerce_suppliers", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(supplier) });
  await writeAudit({ action: "supplier.created", entityType: "supplier", entityId: supplier.id, details: { name, region } });
  return rows[0];
}

export async function updateSupplier(id, patch) {
  const allowed = ["name", "region", "categories", "modell", "neutral", "risiko", "quelle_url", "notiz", "status"];
  const clean = Object.fromEntries(Object.entries(patch).filter(([k]) => allowed.includes(k)));
  if (clean.status && !SUPPLIER_STATUS.includes(clean.status)) throw new Error("Ungültiger Lieferantenstatus");
  if (!supabaseConfigured()) {
    const current = memory.suppliers.get(id);
    if (!current) throw new Error("Lieferant nicht gefunden");
    const updated = { ...current, ...clean };
    memory.suppliers.set(id, updated);
    await writeAudit({ action: "supplier.updated", entityType: "supplier", entityId: id, details: clean });
    return updated;
  }
  const rows = await supabaseRequest("ecommerce_suppliers?id=eq." + encodeURIComponent(id), { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(clean) });
  if (!rows?.[0]) throw new Error("Lieferant nicht gefunden");
  await writeAudit({ action: "supplier.updated", entityType: "supplier", entityId: id, details: clean });
  return rows[0];
}

// ============ KUNDEN (bewusst IMMER leer gestartet - keine Fake-Kunden) ============
export async function listCustomers() {
  if (!supabaseConfigured()) return [...memory.customers.values()];
  return supabaseRequest("ecommerce_customers?select=*&order=erstellt_am.desc");
}

export async function createCustomer(input) {
  const { name, email } = input;
  if (!name || !email || !email.includes("@")) throw new Error("createCustomer: name und eine gültige email sind Pflichtfelder");
  const customer = { id: newId("cust"), business_id: BUSINESS_ID, name, email, adresse: input.adresse || null, erstellt_am: new Date().toISOString() };
  if (!supabaseConfigured()) { memory.customers.set(customer.id, customer); await writeAudit({ action: "customer.created", entityType: "customer", entityId: customer.id, details: { name } }); return customer; }
  const rows = await supabaseRequest("ecommerce_customers", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(customer) });
  await writeAudit({ action: "customer.created", entityType: "customer", entityId: customer.id, details: { name } });
  return rows[0];
}

// ============ BESTELLUNGEN (bewusst IMMER leer gestartet - keine Fake-Bestellungen) ============
export async function listOrders() {
  if (!supabaseConfigured()) return [...memory.orders.values()];
  return supabaseRequest("ecommerce_orders?select=*&order=erstellt_am.desc");
}

export async function getOrderById(id) {
  const orders = await listOrders();
  return orders.find(o => o.id === id) || null;
}

export async function createOrder(input) {
  const { kunde_id, positionen } = input;
  if (!kunde_id || !Array.isArray(positionen) || positionen.length === 0) {
    throw new Error("createOrder: kunde_id und mindestens eine Position (produkt_id, menge) sind Pflichtfelder");
  }
  for (const pos of positionen) {
    if (!pos.produkt_id || !Number.isInteger(pos.menge) || pos.menge <= 0) {
      throw new Error("createOrder: jede Position braucht produkt_id und eine positive ganzzahlige menge");
    }
  }
  const order = {
    id: newId("order"), business_id: BUSINESS_ID, kunde_id, positionen,
    status: "payment_pending", tracking_nummer: null,
    erstellt_am: new Date().toISOString(), aktualisiert_am: new Date().toISOString(),
  };
  if (!supabaseConfigured()) { memory.orders.set(order.id, order); await writeAudit({ action: "order.created", entityType: "order", entityId: order.id, details: { kunde_id } }); return order; }
  const rows = await supabaseRequest("ecommerce_orders", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(order) });
  await writeAudit({ action: "order.created", entityType: "order", entityId: order.id, details: { kunde_id } });
  return rows[0];
}

export async function updateOrder(id, patch) {
  const allowed = ["status", "tracking_nummer"];
  const clean = Object.fromEntries(Object.entries(patch).filter(([k]) => allowed.includes(k)));
  if (clean.status && !ORDER_STATUS.includes(clean.status)) throw new Error("Ungültiger Bestellstatus");
  clean.aktualisiert_am = new Date().toISOString();
  if (!supabaseConfigured()) {
    const current = memory.orders.get(id);
    if (!current) throw new Error("Bestellung nicht gefunden");
    const updated = { ...current, ...clean };
    memory.orders.set(id, updated);
    await writeAudit({ action: "order.updated", entityType: "order", entityId: id, details: clean });
    return updated;
  }
  const rows = await supabaseRequest("ecommerce_orders?id=eq." + encodeURIComponent(id), { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(clean) });
  if (!rows?.[0]) throw new Error("Bestellung nicht gefunden");
  await writeAudit({ action: "order.updated", entityType: "order", entityId: id, details: clean });
  return rows[0];
}

// Leitet die drei Sicherheitsflags aus ECHTEN, gespeicherten Daten ab, statt sie (wie vor
// Phase 3) direkt und ungeprueft aus dem POST-Body eines Aufrufers zu uebernehmen. Das ist die
// zentrale Integritaetskorrektur aus Abschnitt "Automationen duerfen niemals eine Bestellung
// ausloesen, wenn Pruefungen fehlen": vorher haette jeder Aufrufer von /api/orders per Payload
// einfach productApproved:true behaupten koennen.
export async function deriveOrderGateInputs(order) {
  const products = await listProducts();
  const suppliers = await listSuppliers();
  let productApproved = true;
  let supplierVerified = true;
  let marginApproved = true;
  const riskFlags = [];

  for (const pos of order.positionen) {
    const product = products.find(p => p.id === pos.produkt_id);
    if (!product) { productApproved = false; riskFlags.push("produkt_unbekannt:" + pos.produkt_id); continue; }
    if (product.pipeline_status !== "PUBLISHED") { productApproved = false; }
    if (product.supplier_id) {
      const supplier = suppliers.find(s => s.id === product.supplier_id);
      if (!supplier || supplier.status !== "verifiziert") supplierVerified = false;
    } else {
      supplierVerified = false;
    }
    if (!Number.isInteger(product.einkaufspreis_cent) || product.verkaufspreis_cent <= product.einkaufspreis_cent) {
      marginApproved = false;
    }
  }

  return { paymentConfirmed: order.status !== "payment_pending", productApproved, supplierVerified, marginApproved, riskFlags };
}

// ============ RETOUREN (bewusst IMMER leer gestartet) ============
export async function listReturns() {
  if (!supabaseConfigured()) return [...memory.returns.values()];
  return supabaseRequest("ecommerce_returns?select=*&order=erstellt_am.desc");
}

export async function createReturn(input) {
  const { bestellung_id, grund } = input;
  if (!bestellung_id || !grund) throw new Error("createReturn: bestellung_id und grund sind Pflichtfelder");
  const eintrag = { id: newId("ret"), business_id: BUSINESS_ID, bestellung_id, grund, status: "angefragt", erstellt_am: new Date().toISOString() };
  if (!supabaseConfigured()) { memory.returns.set(eintrag.id, eintrag); await writeAudit({ action: "return.created", entityType: "return", entityId: eintrag.id, details: { bestellung_id } }); return eintrag; }
  const rows = await supabaseRequest("ecommerce_returns", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(eintrag) });
  await writeAudit({ action: "return.created", entityType: "return", entityId: eintrag.id, details: { bestellung_id } });
  return rows[0];
}

export async function updateReturn(id, patch) {
  const allowed = ["status"];
  const clean = Object.fromEntries(Object.entries(patch).filter(([k]) => allowed.includes(k)));
  if (clean.status && !RETURN_STATUS.includes(clean.status)) throw new Error("Ungültiger Retourenstatus");
  if (!supabaseConfigured()) {
    const current = memory.returns.get(id);
    if (!current) throw new Error("Retoure nicht gefunden");
    const updated = { ...current, ...clean };
    memory.returns.set(id, updated);
    await writeAudit({ action: "return.updated", entityType: "return", entityId: id, details: clean });
    return updated;
  }
  const rows = await supabaseRequest("ecommerce_returns?id=eq." + encodeURIComponent(id), { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(clean) });
  if (!rows?.[0]) throw new Error("Retoure nicht gefunden");
  await writeAudit({ action: "return.updated", entityType: "return", entityId: id, details: clean });
  return rows[0];
}

export function resetEcommerceStoreForTests() {
  memory.products.clear();
  memory.suppliers.clear();
  memory.customers.clear();
  memory.orders.clear();
  memory.returns.clear();
  memory.seeded = false;
  seedOnce();
}
