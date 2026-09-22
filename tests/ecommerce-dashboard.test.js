// Phase 2 (Multi-Business-Struktur, E-Commerce-Dashboard, 21.09.2026): beweist, dass das neue
// eigenständige E-Commerce-Dashboard alle geforderten Bereiche enthält, dass die alten Routen
// dorthin weiterleiten statt eine zweite, abweichende UI zu betreiben, dass Werknetz24 im
// E-Commerce-Dashboard an keiner Stelle geladen/verlinkt wird, und dass die Master-Zentrale und
// das E-Commerce-Dashboard bei den Betriebs-Links nicht auseinanderlaufen. Ergänzt (dupliziert
// nicht) tests/multi-business-separation.test.js und tests/ecommerce-store.test.js.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { createFinance, listFinance } from "../lib/master-finance.js";
import { resetEcommerceStoreForTests } from "../lib/ecommerce-store.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const read = (relPath) => readFileSync(join(repoRoot, relPath), "utf8");

beforeEach(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SECRET_KEY;
  resetEcommerceStoreForTests();
});

const REQUIRED_TABS = [
  "Übersicht", "Produkte", "Produkt-Pipeline", "Lieferanten", "Bestellungen", "Kunden",
  "Zahlungen", "Retouren", "Finanzen", "Automationen", "Systeme", "Quality Gate", "Einstellungen",
];

test("the E-Commerce dashboard defines every required section from the Phase 2 spec", () => {
  const source = read("app/e-commerce/page.jsx");
  for (const label of REQUIRED_TABS) {
    assert.ok(source.includes(`"${label}"`), `Tab-Label fehlt im E-Commerce-Dashboard: ${label}`);
  }
});

test("the E-Commerce dashboard never loads or links Werknetz24 directly - that stays exclusive to the Master-Zentrale", () => {
  const source = read("app/e-commerce/page.jsx");
  assert.doesNotMatch(source, /werknetz24\.de/i, "E-Commerce-Dashboard darf werknetz24.de nicht direkt referenzieren");
  assert.doesNotMatch(
    source,
    /^\s*import[^\n]*werknetz24-connector|require\(\s*["'][^"']*werknetz24-connector/m,
    "E-Commerce-Dashboard darf den Werknetz24-Connector nicht importieren"
  );
});

test("the E-Commerce dashboard never mutates the business registry itself - that stays exclusive to the Master-Zentrale", () => {
  const source = read("app/e-commerce/page.jsx");
  assert.doesNotMatch(source, /\/api\/master\/businesses/, "E-Commerce-Dashboard darf /api/master/businesses nicht selbst aufrufen (Betriebe werden nur in der Master-Zentrale verwaltet)");
});

const OLD_ROUTES = [
  ["app/produkt-pipeline/page.jsx", "pipeline"],
  ["app/lieferanten/page.jsx", "lieferanten"],
  ["app/kunden/page.jsx", "kunden"],
  ["app/bestellungen/page.jsx", "bestellungen"],
  ["app/retouren/page.jsx", "retouren"],
  ["app/automation/page.jsx", "automation"],
];

test("old standalone E-Commerce routes redirect into the unified dashboard instead of duplicating the UI", () => {
  for (const [path, tab] of OLD_ROUTES) {
    const source = read(path);
    assert.match(
      source,
      new RegExp(`/e-commerce\\?tab=${tab}\\b`),
      `${path} muss zu /e-commerce?tab=${tab} weiterleiten, nicht eine eigene Kopie der UI zeigen`
    );
  }
});

test("Werknetz24 and E-Commerce dashboard links never diverge between the server registry and the client fallback", () => {
  const storeSource = read("lib/master-store.js");
  const pageSource = read("app/master/page.jsx");

  const extractLinks = (source) => {
    const links = {};
    const re = /id:"(werknetz24|ecommerce|future)"[^}]*?link:"([^"]*)"/g;
    let m;
    while ((m = re.exec(source))) links[m[1]] = m[2];
    return links;
  };

  const serverLinks = extractLinks(storeSource);
  const clientLinks = extractLinks(pageSource);

  assert.deepEqual(serverLinks, clientLinks, "Server-Registry (lib/master-store.js) und Client-Fallback (app/master/page.jsx) dürfen bei den Betriebs-Links nicht auseinanderlaufen");
  // Seit 22.09.2026: eigene, dedizierte Seite in diesem Repo statt direktem externem Link (s.
  // multi-business-separation.test.js für die volle Begründung).
  assert.equal(serverLinks.werknetz24, "/werknetz24");
  assert.equal(serverLinks.ecommerce, "/e-commerce");
});

test("a finance entry created exactly as the E-Commerce dashboard sends it (business_id forced to ecommerce) is isolated from other business_ids", async () => {
  const marker = "Phase2-Dashboard-Test-" + Date.now();
  const entry = await createFinance({ kind: "expense", amount: 9.99, category: marker, business_id: "ecommerce" });
  assert.equal(entry.business_id, "ecommerce");

  const ecomOnly = await listFinance({ business_id: "ecommerce" });
  assert.ok(ecomOnly.some(e => e.id === entry.id));

  const werknetzOnly = await listFinance({ business_id: "werknetz24" });
  assert.ok(!werknetzOnly.some(e => e.id === entry.id));

  const masterOnly = await listFinance({ business_id: "master" });
  assert.ok(!masterOnly.some(e => e.id === entry.id));
});
