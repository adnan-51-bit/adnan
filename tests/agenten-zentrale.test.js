// Reparaturphase "Agenten" (26.09.2026): Agenten-Zentrale strikt nach Geschaeftsbereich getrennt,
// keine Schein-Steuerung, Entwicklungs-Werkzeuge klar von Betriebs-Agenten getrennt.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const src = readFileSync(new URL("../app/master/control-center.jsx", import.meta.url), "utf8");

test("Agenten werden je Bereich getrennt dargestellt (werknetz24 / ecommerce / master)", () => {
  assert.match(src, /\{ id: "werknetz24", titel: "Werknetz24", agenten: w24\.agenten\.filter\(a => a\.business_id === "werknetz24"\),/);
  assert.match(src, /Nicht geladen – siehe Hinweis oben/, "Ladefehler darf nicht als 'Keine Agenten' erscheinen");
  assert.match(src, /\{ id: "ecommerce", titel: "E-Commerce", agenten: \[ecomEngine\] \}/);
  assert.match(src, /\{ id: "master", titel: "Master-Zentrale", agenten: \[masterMonitor\] \}/);
});

test("Pflichtspalten vorhanden: aktuelle Aufgabe, Verbindungen, Test/Reparatur, Logs", () => {
  for (const spalte of ["Aktuelle Aufgabe", "Letzte Aktivität", "Letzter Fehler", "Benötigte Verbindungen", "Test / Reparatur", "Steuerung", "Logs"]) {
    assert.ok(src.includes(`<th>${spalte}</th>`), "Spalte fehlt: " + spalte);
  }
});

test("Retry nur fuer echte Aktionen, sonst OPEN; Entwicklungs-Werkzeuge als solche gekennzeichnet", () => {
  assert.match(src, /s\.retry === "master-zentrale-systemcheck"/);
  assert.match(src, /retry: OPEN/);
  assert.match(src, /Entwicklungs-Werkzeuge \(keine Betriebs-Agenten\)/);
  assert.doesNotMatch(src, /name: "Marketing-Agent"|name: "QA-Agent"/);
});
