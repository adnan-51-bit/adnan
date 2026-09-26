// Navigation (26.09.2026): jeder interne Link der Master-/Werknetz24-/E-Commerce-Seiten muss auf eine
// existierende Route und - bei ?tab= - auf einen existierenden Tab der Zielseite zeigen.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const seiten = ["app/master/page.jsx", "app/master/control-center.jsx", "app/werknetz24/page.jsx", "app/e-commerce/page.jsx"];
const tabsVon = src => {
  const ids = new Set();
  for (const m of src.matchAll(/\[\s*"([a-z0-9-]+)",\s*"[^"]*",\s*"[^"]*"\s*\]/g)) ids.add(m[1]);
  return ids;
};
const zielTabs = {
  "/master": tabsVon(read("app/master/page.jsx")),
  "/werknetz24": tabsVon(read("app/werknetz24/page.jsx")),
  "/e-commerce": tabsVon(read("app/e-commerce/page.jsx")),
};

test("alle internen Links zeigen auf existierende Routen und Tabs", () => {
  const fehler = [];
  let geprueft = 0;
  for (const s of seiten) {
    for (const m of read(s).matchAll(/href="(\/[^"#]*)"/g)) {
      const [pfad, query] = m[1].split("?");
      geprueft++;
      const route = pfad === "/" ? "app/page.jsx" : `app${pfad}/page.jsx`;
      if (!existsSync(new URL("../" + route, import.meta.url))) { fehler.push(`${s}: Route fehlt ${m[1]}`); continue; }
      const tab = new URLSearchParams(query || "").get("tab");
      if (tab && zielTabs[pfad] && !zielTabs[pfad].has(tab)) fehler.push(`${s}: Tab "${tab}" existiert nicht auf ${pfad}`);
    }
  }
  assert.ok(geprueft > 10, "zu wenige Links gefunden - Parser defekt?");
  assert.deepEqual(fehler, []);
});

test("Master-Direktnavigation enthält Kunden (beide Bereiche getrennt), Leads, Rechnungen", () => {
  const m = read("app/master/page.jsx");
  assert.match(m, /href="\/e-commerce\?tab=kunden"/);
  assert.match(m, /admin-zentrale#kunden/);
  assert.match(m, /admin-zentrale#leads/);
  assert.match(m, /href="\/werknetz24\?tab=rechnungen"/);
});

test("Master: 'System' und 'Integrationen' sind direkt anklickbar und fuehren zu existierenden Tabs", () => {
  const m = read("app/master/page.jsx");
  assert.match(m, /goTo\?\.\("systems"\)\}><b>System<\/b>/);
  assert.match(m, /goTo\?\.\("integrations"\)\}><b>Integrationen<\/b>/);
  assert.match(m, /\["integrations","⇄","Integrationen"\]/);
  assert.match(m, /tab==="integrations" && <IntegrationenZentrale/);
});
