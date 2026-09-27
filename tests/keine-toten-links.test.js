// Navigation (26.09.2026): jeder interne Link der Master-/Werknetz24-/E-Commerce-Seiten muss auf eine
// existierende Route und - bei ?tab= - auf einen existierenden Tab der Zielseite zeigen.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const seiten = ["app/master/page.jsx", "app/master/control-center.jsx", "app/master/steuerung.jsx", "app/master/einnahmequellen.jsx", "app/master/aufgaben.jsx", "app/master/content.jsx", "app/master/freigaben.jsx", "app/master/leads.jsx", "app/master/pilot.jsx", "app/werknetz24/page.jsx", "app/e-commerce/page.jsx"];
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

// Seit 27.09.2026 stehen die Direktlinks in der Karte des jeweiligen Geschaeftsbereichs (Startseite, steuerung.jsx).
test("Master-Direktnavigation enthält Kunden (beide Bereiche getrennt), Leads, Rechnungen", () => {
  const m = read("app/master/steuerung.jsx");
  assert.match(m, /href="\/e-commerce\?tab=kunden"/);
  assert.match(m, /admin-zentrale#kunden/);
  assert.match(m, /admin-zentrale#leads/);
  assert.match(m, /href="\/werknetz24\?tab=rechnungen"/);
});

test("Master: 'System' und 'Integrationen' sind direkt anklickbar und fuehren zu existierenden Tabs", () => {
  const m = read("app/master/page.jsx");
  // Seit 27.09.2026 ueber die gruppierte Seitenleiste (Gruppe "System") statt einer Kachelreihe.
  assert.match(m, /\["System",\["alerts","systems","integrations"/);
  assert.match(m, /\["integrations","⇄","Integrationen"\]/);
  assert.match(m, /tab==="integrations" && <IntegrationenZentrale/);
});

test("'Alle Bereiche' enthaelt jeden geforderten Bereich mit Lesen/Schreiben/Steuern/Status/Check/Fehler/Aktion", () => {
  const cc = read("app/master/control-center.jsx");
  for (const b of ["Master-Zentrale", "Werknetz24", "E-Commerce", "Agenten", "Finanzen", "Kunden (E-Commerce)", "Kunden (Werknetz24)", "Leads", "Rechnungen", "Lisa / Telefon", "Famulor", "Easybell", "Google Calendar", "Gmail", "Stripe (Werknetz24)", "Stripe (E-Commerce)", "PayPal (Werknetz24)", "WhatsApp", "Shopify / Shop-Anbindung", "SEO / Marketing", "Sicherheit", "Systemstatus", "Datenbank (Supabase)", "GitHub", "Vercel", "Dokumentation", "Obsidian"]) {
    assert.ok(cc.includes(`bereich: "${b}"`), "Bereich fehlt: " + b);
  }
  for (const spalte of ["Lesen", "Schreiben", "Steuern", "Status", "Letzter Check", "Letzter Fehler", "Aktion"]) assert.ok(cc.includes(`<th>${spalte}</th>`), spalte);
  const m = read("app/master/page.jsx");
  assert.match(m, /\["bereiche","▦","Alle Bereiche"\]/);
  assert.match(m, /\["Geschäftsbereiche",\["pilot","einnahmequellen","content","leads","bereiche"/);
});

test("Sprungziele in 'Alle Bereiche' zeigen nur auf existierende Tabs", () => {
  const cc = read("app/master/control-center.jsx");
  const tabs = zielTabs["/master"];
  for (const m of cc.matchAll(/ziel: \{ tab: "([a-z-]+)" \}/g)) assert.ok(tabs.has(m[1]), "Tab fehlt: " + m[1]);
});
