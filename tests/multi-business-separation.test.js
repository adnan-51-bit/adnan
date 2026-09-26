// Phase 1 (Multi-Business-Struktur, 21.09.2026): beweist, dass Werknetz24 und E-Commerce
// technisch getrennt bleiben, jede relevante Datenstruktur eine business_id trägt und die
// Master-Zentrale beide Geschäftsbereiche erreichen kann - nicht nur behauptet, sondern getestet.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { listBusinesses, BUSINESS_IDS, isKnownBusinessId, getBusiness } from "../lib/master-store.js";
import { listTasks, createTask } from "../lib/master-tasks.js";
import { listFinance, createFinance } from "../lib/master-finance.js";
import {
  BUSINESS_ID as ECOMMERCE_BUSINESS_ID,
  listProducts, createProduct,
  listSuppliers, createSupplier,
  createCustomer, createOrder, createReturn,
  resetEcommerceStoreForTests,
} from "../lib/ecommerce-store.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

beforeEach(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SECRET_KEY;
  delete process.env.WERKNETZ24_STATUS_SECRET;
  resetEcommerceStoreForTests();
});

// ---- 1. Master-Zentrale erreicht beide Bereiche ----

test("listBusinesses exposes exactly the known businesses, each with its own dashboard link", async () => {
  const businesses = await listBusinesses();
  const ids = businesses.map(b => b.id).sort();
  assert.deepEqual(ids, [...BUSINESS_IDS].sort());

  const werknetz24 = businesses.find(b => b.id === "werknetz24");
  const ecommerce = businesses.find(b => b.id === "ecommerce");
  // Seit 22.09.2026 (Adnans Wunsch "eigene Seite pro Betrieb, nichts vermischen") verlinkt auch
  // Werknetz24 auf eine eigene, dedizierte Seite in diesem Repo (/werknetz24, zeigt nur
  // Werknetz24-Live-Status + Kalender über die sichere Bruecke) statt direkt auf die externe
  // werknetz24.de/admin-zentrale - von dort aus gibt es einen klaren Link zur vollständigen
  // externen Verwaltung.
  assert.equal(werknetz24.link, "/werknetz24", "Werknetz24 muss auf seine eigene, dedizierte Seite verlinken");
  assert.equal(ecommerce.link, "/e-commerce", "E-Commerce muss auf sein eigenes internes Dashboard verlinken");
  assert.notEqual(werknetz24.link, ecommerce.link, "Beide Betriebe müssen zu unterschiedlichen Dashboards führen");
});

test("getBusiness/isKnownBusinessId reflect the same registry listBusinesses uses", () => {
  assert.equal(isKnownBusinessId("werknetz24"), true);
  assert.equal(isKnownBusinessId("ecommerce"), true);
  assert.equal(isKnownBusinessId("erfundener-betrieb"), false);
  assert.equal(getBusiness("werknetz24").id, "werknetz24");
  assert.equal(getBusiness("nicht-vorhanden"), null);
});

// ---- 2. Werknetz24 funktioniert weiterhin (bleibt vollständig extern, unverändert) ----

test("Werknetz24 has no local, mutable business data - only the read-only liveStatus enrichment", async () => {
  const businesses = await listBusinesses();
  const werknetz24 = businesses.find(b => b.id === "werknetz24");
  assert.equal(werknetz24.status, "EXTERNAL");
  assert.ok("liveStatus" in werknetz24, "liveStatus wird weiterhin live abgefragt (s. werknetz24-connector.js)");
  assert.equal(werknetz24.liveStatus.configured, false, "ohne WERKNETZ24_STATUS_SECRET bleibt der Status ehrlich nicht konfiguriert, nie erfunden");
});

test("ecommerce-store.js never imports the Werknetz24 connector - structural proof of separation", () => {
  const source = readFileSync(join(__dirname, "..", "lib", "ecommerce-store.js"), "utf8");
  // Prüft nur echte import/require-Anweisungen, nicht erklärende Kommentare, die den Connector
  // lediglich zur Einordnung erwähnen dürfen.
  assert.doesNotMatch(
    source,
    /^\s*import[^\n]*werknetz24-connector|require\(\s*["'][^"']*werknetz24-connector/m,
    "E-Commerce-Datenschicht darf den Werknetz24-Connector nicht importieren"
  );
});

// ---- 3. E-Commerce ist getrennt: jeder Datensatz trägt explizit business_id "ecommerce" ----

test("every seeded and newly created e-commerce record carries business_id ecommerce", async () => {
  assert.equal(ECOMMERCE_BUSINESS_ID, "ecommerce");

  const seededProducts = await listProducts();
  const seededSuppliers = await listSuppliers();
  assert.ok(seededProducts.length > 0 && seededSuppliers.length > 0);
  assert.ok(seededProducts.every(p => p.business_id === "ecommerce"));
  assert.ok(seededSuppliers.every(s => s.business_id === "ecommerce"));

  const product = await createProduct({ name: "Test-Produkt", kategorie: "Test", verkaufspreis_cent: 1999 });
  const supplier = await createSupplier({ name: "Test-Lieferant", region: "Deutschland" });
  const customer = await createCustomer({ name: "Test-Kunde", email: "test@example.com" });
  const order = await createOrder({ kunde_id: customer.id, positionen: [{ produkt_id: product.id, menge: 1 }] });
  const retoure = await createReturn({ bestellung_id: order.id, grund: "Test" });

  for (const record of [product, supplier, customer, order, retoure]) {
    assert.equal(record.business_id, "ecommerce");
  }
});

// ---- 4. Daten werden nicht zwischen den Bereichen vermischt (master-tasks) ----

test("createTask requires a known business_id or the cross-business 'master' scope", async () => {
  await assert.rejects(
    () => createTask({ title: "Ungültiger Betrieb", area: "Test", business_id: "erfundener-betrieb" }),
    /Unbekannte business_id/
  );
  const masterTask = await createTask({ title: "Phase1-Test-Master-" + Date.now(), area: "Test", business_id: "master" });
  assert.equal(masterTask.business_id, "master");
});

test("listTasks(business_id) filters strictly - no mixing between Werknetz24, E-Commerce and Master", async () => {
  const marker = Date.now();
  const ecomTask = await createTask({ title: "Phase1-Ecom-" + marker, area: "E-Commerce", business_id: "ecommerce" });
  const werknetzTask = await createTask({ title: "Phase1-Werknetz24-" + marker, area: "Werknetz24", business_id: "werknetz24" });
  const masterTask = await createTask({ title: "Phase1-Master-" + marker, area: "Master", business_id: "master" });

  const ecomOnly = await listTasks({ business_id: "ecommerce" });
  assert.ok(ecomOnly.some(t => t.id === ecomTask.id), "Der E-Commerce-Task muss im E-Commerce-Filter auftauchen");
  assert.ok(!ecomOnly.some(t => t.id === werknetzTask.id), "Der Werknetz24-Task darf NICHT im E-Commerce-Filter auftauchen");
  assert.ok(!ecomOnly.some(t => t.id === masterTask.id), "Der Master-Task darf NICHT im E-Commerce-Filter auftauchen");

  const werknetzOnly = await listTasks({ business_id: "werknetz24" });
  assert.ok(werknetzOnly.some(t => t.id === werknetzTask.id));
  assert.ok(!werknetzOnly.some(t => t.id === ecomTask.id));

  const seedEcomTask = (await listTasks({ business_id: "ecommerce" })).find(t => t.title === "Stripe sicher anbinden");
  assert.ok(seedEcomTask, "seed-Aufgabe 'Stripe sicher anbinden' muss korrekt als ecommerce getaggt sein");

  const all = await listTasks();
  assert.ok(all.length >= 3, "listTasks() ohne Filter liefert weiterhin alle Aufgaben, betriebsübergreifend");
});

// ---- 5. Master-Finanzen respektieren dieselbe Trennung ----

test("createFinance rejects an unknown business_id and listFinance(business_id) filters correctly", async () => {
  await assert.rejects(
    () => createFinance({ kind: "expense", amount: 5, category: "Test", business_id: "erfundener-betrieb" }),
    /Unbekannte business_id/
  );

  const marker = Date.now();
  const ecomEntry = await createFinance({ kind: "expense", amount: 12.5, category: "Phase1-Test-" + marker, business_id: "ecommerce" });
  const crossEntry = await createFinance({ kind: "expense", amount: 3, category: "Phase1-Test-" + marker, business_id: null });

  const ecomOnly = await listFinance({ business_id: "ecommerce" });
  assert.ok(ecomOnly.some(e => e.id === ecomEntry.id));
  assert.ok(!ecomOnly.some(e => e.id === crossEntry.id));
});

// Phase 2 (26.09.2026): Fehler- und Agenten-Zentrale ordnen jeden Eintrag einem Bereich zu und
// das E-Commerce-Dashboard bleibt frei von Werknetz24-Aufrufen.
test("Fehler-/Agenten-Zentrale fuehren business_id je Eintrag, E-Commerce ruft weiterhin keine Werknetz24-Daten ab", async () => {
  const { readFile } = await import("node:fs/promises");
  const cc = await readFile(new URL("../app/master/control-center.jsx", import.meta.url), "utf8");
  for (const biz of ['business_id: "werknetz24"', 'business_id: "ecommerce"', 'business_id: "master"']) {
    assert.ok(cc.includes(biz), "fehlt: " + biz);
  }
  const ecom = await readFile(new URL("../app/e-commerce/page.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(ecom, /werknetz24(Incidents|Agenten|Kalender|Aufgaben|Rechnungen)/);
});

test("Betriebe erscheinen in fester Reihenfolge (Werknetz24, E-Commerce, weitere) - auch aus der DB", async () => {
  const ids = (await listBusinesses()).map(b => b.id);
  assert.deepEqual(ids, ["werknetz24", "ecommerce", "future"]);
});
