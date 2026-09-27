// Gesamtstatus der Startseite (27.09.2026): nur echte Werte, Rechenweg sichtbar, fehlende Quellen = "unvollständig".
import test from "node:test";
import assert from "node:assert/strict";
import { berechneGesamtstatus } from "../lib/gesamtstatus.js";

const w24 = (finanzen = {}) => ({ id: "werknetz24", name: "Werknetz24", status: "EXTERNAL", link: "/werknetz24", liveStatus: { ok: true, data: {
  kunden: { gesamt: 2 }, leads: { gesamt: 5, nachStatus: { neu: 5 } }, systemStatus: { gesamtstatus: "gruen", counts: { gruen: 3, rot: 0 } },
  technischeProbleme: { offeneIncidents: 1 }, aufgaben: { offen: 2 }, finanzen: { bezahltSummeCent: 10000, bezahlteAusgabenSummeCent: 3000, ...finanzen } } } });
const ec = { id: "ecommerce", name: "E-Commerce", status: "PAUSIERT", link: "/e-commerce" };
const future = { id: "future", name: "Weiterer Betrieb", status: "OPEN", link: "#" };

test("Summen über alle Bereiche mit Rechenweg; ausstehende und stornierte Buchungen zählen nicht", () => {
  const g = berechneGesamtstatus({
    businesses: [w24(), ec, future],
    tasks: [{ status: "Offen", title: "a" }, { status: "Erledigt", title: "b" }],
    systems: [{ name: "GitHub", status: "🟢" }],
    finance: [{ kind: "income", amount: 50, status: "confirmed" }, { kind: "expense", amount: 20.5, status: "confirmed" }, { kind: "income", amount: 999, status: "pending" }, { kind: "expense", amount: 999, status: "cancelled" }],
    einnahmequellen: [{ name: "Affiliate", status: "EINNAHMEN", einnahmen_cent: 700, kosten_cent: 100 }],
    ecKunden: [{}], qualityGate: { productionReady: true },
  });
  assert.equal(g.einnahmen.cent, 10000 + 5000 + 700); assert.equal(g.einnahmen.vollstaendig, true);
  assert.equal(g.kosten.cent, 3000 + 2050 + 100);
  assert.equal(g.gewinn.cent, 15700 - 5150); assert.match(g.gewinn.rechenweg.join(), /1 Buchung\(en\) noch „ausstehend“/);
  assert.equal(g.kunden.wert, 3); assert.equal(g.leads.wert, 5); assert.equal(g.aufgaben.wert, 1 + 2); assert.equal(g.fehler.wert, 1);
  assert.equal(g.projekteAktiv.wert, 2, "Werknetz24 + aktive Einnahmequelle, Platzhalter nicht"); assert.equal(g.projektePausiert.wert, 1);
  assert.equal(g.automationen.wert, null, "keine erfundene Zahl");
  assert.equal(g.system.ampel, "🟢");
});

test("Einnahmequelle mit Verweis auf einen Bereich wird nicht doppelt als Projekt gezählt", () => {
  const g = berechneGesamtstatus({ businesses: [w24(), ec], einnahmequellen: [{ name: "Sortiert24", status: "PAUSE", verweis: "/e-commerce" }] });
  assert.equal(g.projektePausiert.wert, 1);
});

test("Fehlende Quellen: unvollständig + Warnung statt Schätzung", () => {
  const g = berechneGesamtstatus({ businesses: [{ id: "werknetz24", link: "/werknetz24", liveStatus: { ok: false } }], tasksLocked: true, einnahmequellen: null, ecKunden: null });
  assert.equal(g.einnahmen.vollstaendig, false); assert.equal(g.gewinn.vollstaendig, false); assert.equal(g.kunden.vollstaendig, false);
  assert.equal(g.aufgaben.wert, null); assert.equal(g.leads.wert, null);
  assert.ok(g.warnungen.some(w => /Werknetz24-Live-Daten nicht verfügbar/.test(w.text)));
  assert.ok(g.warnungen.some(w => /Einnahmequellen nicht geladen/.test(w.text)));
});

test("Warnungen: rote Systeme, blockierte Aufgaben, gesperrte Zahlungen, fehlende Werknetz24-Ausgaben", () => {
  const g = berechneGesamtstatus({ businesses: [w24({ bezahlteAusgabenSummeCent: undefined })], einnahmequellen: [],
    systems: [{ name: "Stripe", status: "🔴", note: "gesperrt" }], tasks: [{ status: "Blockiert", title: "Stripe" }], qualityGate: { productionReady: false }, ecKunden: [] });
  const t = g.warnungen.map(w => w.text).join("|");
  assert.match(t, /Stripe: gesperrt/); assert.match(t, /Wartet auf dich: Stripe/); assert.match(t, /Zahlungen gesperrt/); assert.match(t, /keine bezahlten Ausgaben/);
  assert.equal(g.kosten.vollstaendig, false); assert.equal(g.system.ampel, "🔴");
});
