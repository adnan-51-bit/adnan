// Erste-Einnahme-Modus, Einnahmequellen-Dashboard, pausierte Bereiche (27.09.2026) - nur echte Daten.
import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("data:text/javascript," + encodeURIComponent(
  'export async function resolve(s, c, n) { const fix = (s === "next/server" || (s.startsWith(".") && !/\.[cm]?js$/.test(s))) ? s + ".js" : s; return n(fix, c); }'
));
delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SECRET_KEY;
const { ersteEinnahmeCheckliste, eqDashboard } = await import("../lib/erste-einnahme.js");
const { berechneGesamtstatus } = await import("../lib/gesamtstatus.js");
const { erstelleTagesbericht } = await import("../lib/tagesbericht.js");
const { optimierung } = await import("../lib/optimierung.js");

const eq = { id: "p", name: "Google-Profil", kategorie: "C", status: "PRUEFUNG", quellen_liste: [1, 2, 3], pilot: {} };
const lead = (firma, extra = {}) => ({ einnahmequelle_id: "p", firma, status: "NEU", quelle: "https://maps.example/" + firma, ...extra });

test("Checkliste: jeder Schritt aus echten Daten, nächster offener Schritt, Testbuchung zählt nie als Einnahme", () => {
  const leads = [lead("a", { profil_analyse: { punkte: 33 } }), lead("b"), lead("c")];
  let c = ersteEinnahmeCheckliste({ eq, leads });
  assert.deepEqual(c.schritte.filter(s => s.ok).map(s => s.nr), [1, 2, 3]);
  assert.equal(c.naechster.nr, 4); assert.equal(c.naechster.wer, "du"); assert.equal(c.erreicht, false);
  const finance = [{ einnahmequelle_id: "p", kind: "income", status: "confirmed", amount: 49, ist_test: true }];
  c = ersteEinnahmeCheckliste({ eq, leads, finance });
  assert.equal(c.erreicht, false, "Testbuchung ist keine Einnahme");
  const bezahlt = [{ einnahmequelle_id: "p", kind: "income", status: "confirmed", amount: 49 }];
  c = ersteEinnahmeCheckliste({ eq, leads, finance: bezahlt });
  assert.equal(c.erreicht, true); assert.equal(c.schritte.at(-1).ok, true);
  assert.equal(ersteEinnahmeCheckliste({ eq: null }).schritte.length, 0);
});

test("Dashboard: Kennzahlen je Quelle + Automation-Engine-Felder; pausierte Quellen ohne Intervall", () => {
  const jetzt = new Date();
  const eqs = [{ ...eq, aufwand: "gering", startkosten_cent: 0, aktualisiert_am: jetzt.toISOString() }, { id: "x", name: "Shop", status: "PAUSE", startkosten_cent: null }];
  const leads = [lead("a", { status: "INTERESSENT" }), lead("b", { status: "KUNDE" })];
  const tasks = [{ einnahmequelle_id: "p", title: "Bericht zeigen", status: "Offen", due_at: new Date(jetzt - 86400000).toISOString() }];
  const finance = [{ einnahmequelle_id: "p", kind: "income", status: "pending", amount: 49 }];
  const opt = optimierung({ eqs, leads, tasks, finance, jetzt });
  const [p, x] = eqDashboard({ eqs, leads, tasks, finance, optimierung: opt });
  assert.equal(p.leads, 2); assert.equal(p.interessenten, 1); assert.equal(p.kunden, 1);
  assert.equal(p.einnahmen_cent, 0, "offen ist keine Einnahme"); assert.equal(p.offen_cent, 4900);
  assert.equal(p.naechste_aufgabe, "Bericht zeigen"); assert.match(p.engine.intervall, /täglich/);
  assert.equal(p.engine.fehler, "1 Aufgabe(n) überfällig");
  assert.equal(x.kosten_geplant, "noch zu prüfen"); assert.match(x.engine.intervall, /pausiert/); assert.match(x.engine.vorschlag, /pausiert/);
});

test("Pausierte Bereiche: keine Warnungen/Benutzeraktionen aus ihren Systemen – Daten bleiben", () => {
  const systems = [{ id: "famulor", name: "Famulor", status: "🔴", note: "x", next_action: "Guthaben" }, { id: "stripe", name: "Stripe", status: "🔴", note: "y", next_action: "Secret" }, { id: "github", name: "GitHub", status: "🔴", note: "z", next_action: "prüfen" }];
  const businesses = [{ id: "werknetz24", status: "PAUSIERT", liveStatus: { ok: false } }, { id: "ecommerce", status: "PAUSIERT" }];
  const g = berechneGesamtstatus({ businesses, systems, einnahmequellen: [] });
  assert.deepEqual(g.warnungen.map(w => w.text), ["GitHub: z"]);
  assert.equal(g.projektePausiert.wert, 2);
  const b = erstelleTagesbericht({ jetzt: new Date(), systems, pausiert: new Set(["werknetz24", "ecommerce"]) });
  assert.deepEqual(b.benutzeraktionen.map(x => x.text), ["GitHub: prüfen"]);
  assert.equal(systems.length, 3, "nichts gelöscht");
});

test("Tagesbericht beantwortet die Pflichtfragen und nennt den nächsten Schritt zur ersten Einnahme", () => {
  const c = ersteEinnahmeCheckliste({ eq, leads: [lead("a"), lead("b"), lead("c")] });
  const b = erstelleTagesbericht({ jetzt: new Date(), ersteEinnahme: c, einnahmequellen: [{ ...eq, erstellt_am: new Date().toISOString() }], freigaben: [{ status: "OFFEN", titel: "Monatspreis?" }] });
  const t = Object.fromEntries(b.bericht);
  for (const k of ["Was wurde erledigt?", "Welche neuen Möglichkeiten gibt es?", "Welche Tests laufen?", "Welche Einnahmen wurden tatsächlich erfasst?", "Welche Kosten sind tatsächlich entstanden?", "Was braucht meine Freigabe?", "Wichtigste nächste Aktion", "Was fehlt bis zur ersten echten Einnahme?"]) assert.ok(t[k], k);
  assert.equal(t["Was braucht meine Freigabe?"], "Monatspreis?");
  assert.match(t["Wichtigste nächste Aktion"], /Schritt 3: Profil-Analysen/);
  assert.match(t["Welche neuen Möglichkeiten gibt es?"], /Google-Profil/);
});
