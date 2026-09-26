// Reparaturphase Werknetz24 (26.09.2026): keine Schein-Steuerung auf /werknetz24.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../app/werknetz24/page.jsx", import.meta.url), "utf8");

test("'+ Termin' ist nur aktiv, wenn der Kalender wirklich erreichbar ist", () => {
  assert.match(src, /const kalenderBereit = !loading && kalender\?\.configured && kalender\?\.ok;/);
  assert.match(src, /<button[^\n]*disabled=\{!kalenderBereit\}[^\n]*>\+ Termin<\/button>/);
});

test("invalid_grant wird als offene Konfiguration mit echtem Weg zur Neuverbindung erklaert", () => {
  assert.match(src, /invalid_grant/);
  assert.match(src, /KONFIGURATION OFFEN/);
  assert.match(src, /werknetz24\.de\/admin-zentrale#einstellungen/);
});

test("Verbindung-Tab behauptet Termin-Anlegen nicht mehr pauschal", () => {
  assert.doesNotMatch(src, /Kalender ansehen und neue Termine anlegen/);
  assert.match(src, /nur wenn der Kalender erreichbar ist/);
});

test("Finanzen: Werknetz24 wird live und nur lesend getrennt gezeigt, nicht in Master-Summen gerechnet", () => {
  const master = readFileSync(new URL("../app/master/page.jsx", import.meta.url), "utf8");
  assert.match(master, /function Werknetz24Finanzen\(\{business\}\)/);
  assert.match(master, /nur lesend, nicht in den Summen oben enthalten/);
  // Die Master-Summen werden ausschliesslich aus den eigenen Buchungen (entries) gebildet.
  assert.match(master, /const totals=entries\.reduce\(/);
});

test("Werknetz24-Seite zeigt Kunden/Leads nur als Zahlen aus dem Status", () => {
  assert.match(src, /label="Kunden" value=\{status\.data\.kunden\.gesamt\}/);
  assert.match(src, /label="Leads" value=\{status\.data\.leads\.gesamt\}/);
});

test("fehlende Anmeldung wird nicht als 'Werknetz24 nicht erreichbar' angezeigt", () => {
  assert.match(readFileSync("app/api/master/businesses/route.js", "utf8"), /authRequired: true, error: "Anmeldung erforderlich/);
  for (const f of ["app/master/page.jsx", "app/werknetz24/page.jsx"]) assert.match(readFileSync(f, "utf8"), /status\.authRequired \? "🔒 Werknetz24-Live-Daten: "/);
});
