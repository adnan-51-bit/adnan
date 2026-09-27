// Einnahmequellen (27.09.2026): erst pruefen, dann testen; nichts wird automatisch "aktiv"; nur mit Anmeldung.
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("data:text/javascript," + encodeURIComponent(
  'export async function resolve(s, c, n) { const fix = (s === "next/server" || (s.startsWith(".") && !/\\.[cm]?js$/.test(s))) ? s + ".js" : s; return n(fix, c); }'
));
delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SECRET_KEY;
process.env.MASTER_API_SECRET = "test-secret";
const eq = await import("../lib/einnahmequellen.js");
const route = await import("../app/api/master/businesses/route.js");
const auth = await import("../lib/auth.js");

beforeEach(() => { eq.resetEinnahmequellenFuerTests(); auth.resetLoginSperreFuerTests(); });
const GEPRUEFT = { markt: "M", nachfrage: "N", konkurrenz: "K", kosten_pruefung: "0 €", rechtliches: "Gewerbe nötig", kostenloser_test: "10 Videos", quellen: "https://quelle.test (27.09.2026)" };

test("neue Idee startet als IDEE mit 0 Einnahmen/Kosten; Name Pflicht", async () => {
  const q = await eq.createEinnahmequelle({ name: "Affiliate" });
  assert.equal(q.status, "IDEE"); assert.equal(q.einnahmen_cent, 0); assert.equal(q.kosten_cent, 0); assert.equal(q.startkosten_cent, null);
  await assert.rejects(() => eq.createEinnahmequelle({ zielgruppe: "x" }), /Name/);
});

test("TEST erst nach allen Prüfschritten mit Quellen", async () => {
  const q = await eq.createEinnahmequelle({ name: "Idee" });
  await assert.rejects(() => eq.setzeEqStatus(q.id, "TEST"), /Vor dem Test fehlt: Markt geprüft/);
  await eq.updateEinnahmequelle(q.id, { ...GEPRUEFT, quellen: "" });
  await assert.rejects(() => eq.setzeEqStatus(q.id, "TEST"), /Quellen dokumentiert/);
  await eq.updateEinnahmequelle(q.id, GEPRUEFT);
  assert.equal((await eq.setzeEqStatus(q.id, "TEST")).status, "TEST");
});

test("ERSTER_KUNDE nur mit echtem Kunden, AKTIV nur mit echten Einnahmen; PAUSE/PRUEFUNG jederzeit", async () => {
  const q = await eq.createEinnahmequelle({ name: "Service", ...GEPRUEFT });
  await assert.rejects(() => eq.setzeEqStatus(q.id, "ERSTER_KUNDE"), /echten Kunden/);
  // Seit dem Workflow (27.09.2026) bauen die Stufen aufeinander auf: "Aktiv" braucht zuerst einen Kunden.
  await assert.rejects(() => eq.setzeEqStatus(q.id, "AKTIV"), /echten Kunden/);
  await eq.updateEinnahmequelle(q.id, { erste_kunden: 1 });
  await assert.rejects(() => eq.setzeEqStatus(q.id, "AKTIV"), /echten Einnahmen/);
  await eq.updateEinnahmequelle(q.id, { erste_kunden: 0 });
  assert.equal((await eq.setzeEqStatus(q.id, "PAUSE")).status, "PAUSE");
  assert.equal((await eq.setzeEqStatus(q.id, "PRUEFUNG")).status, "PRUEFUNG");
  await eq.updateEinnahmequelle(q.id, { erste_kunden: 1, einnahmen_cent: 4900 });
  assert.equal((await eq.setzeEqStatus(q.id, "ERSTER_KUNDE")).status, "ERSTER_KUNDE");
  assert.equal((await eq.setzeEqStatus(q.id, "AKTIV")).status, "AKTIV");
});

test("Bearbeiten ändert nie den Status; ungültige Zahlen abgelehnt", async () => {
  const q = await eq.createEinnahmequelle({ name: "X" });
  const r = await eq.updateEinnahmequelle(q.id, { status: "AKTIV", angebot: "neu" });
  assert.equal(r.status, "IDEE"); assert.equal(r.angebot, "neu");
  await assert.rejects(() => eq.updateEinnahmequelle(q.id, { kosten_cent: -5 }));
  await assert.rejects(() => eq.updateEinnahmequelle("gibt-es-nicht", { angebot: "x" }), /nicht gefunden/);
});

test("Übersicht: Gruppen und Summen (Gewinn = Einnahmen − Kosten)", async () => {
  const a = await eq.createEinnahmequelle({ name: "A", einnahmen_cent: 10000, kosten_cent: 2500 });
  await eq.createEinnahmequelle({ name: "B", kosten_cent: 1000 });
  const p = await eq.createEinnahmequelle({ name: "C" }); await eq.setzeEqStatus(p.id, "PAUSE");
  await eq.updateEinnahmequelle(a.id, { erste_kunden: 2 }); await eq.setzeEqStatus(a.id, "AKTIV");
  const u = eq.uebersicht(await eq.listEinnahmequellen());
  assert.deepEqual(u, { aktiv: 1, test: 0, pruefung: 1, pause: 1, kosten_cent: 3500, einnahmen_cent: 10000, gewinn_cent: 6500 });
});

const req = (method, query, body, token) => new Request("http://t/api/master/businesses" + query, { method, headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });

test("API: Lesen/Schreiben nur mit Anmeldung; Statusregel greift auch über die API", async () => {
  assert.equal((await route.GET(req("GET", "?einnahmequellen=1"))).status, 401);
  assert.equal((await route.POST(req("POST", "", { action: "einnahmequelle-anlegen", name: "X" }))).status, 401);
  const r = await route.POST(req("POST", "", { action: "einnahmequelle-anlegen", name: "Über API" }, "test-secret"));
  assert.equal(r.status, 201); const id = (await r.json()).einnahmequelle.id;
  const s = await route.POST(req("POST", "", { action: "einnahmequelle-status", id, status: "TEST" }, "test-secret"));
  assert.equal(s.status, 400); assert.match((await s.json()).error, /Vor dem Test fehlt/);
  const g = await (await route.GET(req("GET", "?einnahmequellen=1", null, "test-secret"))).json();
  assert.equal(g.einnahmequellen.length, 1); assert.equal(g.uebersicht.pruefung, 1);
});

// ---------- Workflow Interesse -> Wiederholbar -> Automatisieren -> Skalieren (27.09.2026) ----------
const tasks = await import("../lib/master-tasks.js");
const { listAudit } = await import("../lib/audit.js");

test("Workflow: jede Stufe braucht ihren echten Nachweis, keine Stufe lässt sich überspringen", async () => {
  const q = await eq.createEinnahmequelle({ name: "Workflow", ...GEPRUEFT });
  await assert.rejects(() => eq.setzeEqStatus(q.id, "INTERESSE"), /Interesse-Nachweis/);
  await eq.updateEinnahmequelle(q.id, { interesse_nachweis: "3 echte Anfragen per Kommentar am 27.09.2026" });
  assert.equal((await eq.setzeEqStatus(q.id, "INTERESSE")).status, "INTERESSE");
  await assert.rejects(() => eq.setzeEqStatus(q.id, "SKALIEREN"), /echten Kunden/, "Skalieren prüft alle Stufen davor");
  await eq.kundeZuordnen(q.id, { name: "Kunde A" });
  await eq.updateEinnahmequelle(q.id, { einnahmen_cent: 5000 });
  assert.equal((await eq.setzeEqStatus(q.id, "AKTIV")).status, "AKTIV");
  await assert.rejects(() => eq.setzeEqStatus(q.id, "WIEDERHOLBAR"), /mindestens 2 echten Kunden/);
  await eq.kundeZuordnen(q.id, { name: "Kunde B" });
  assert.equal((await eq.setzeEqStatus(q.id, "WIEDERHOLBAR")).status, "WIEDERHOLBAR");
  await assert.rejects(() => eq.setzeEqStatus(q.id, "AUTOMATISIERT"), /was automatisch läuft/);
  await eq.updateEinnahmequelle(q.id, { automatisierung: "Rechnungen werden automatisch erstellt", automatisierungsgrad: 40 });
  assert.equal((await eq.setzeEqStatus(q.id, "AUTOMATISIERT")).status, "AUTOMATISIERT");
  await eq.updateEinnahmequelle(q.id, { kosten_cent: 6000 });
  await assert.rejects(() => eq.setzeEqStatus(q.id, "SKALIEREN"), /echtem Gewinn/);
  await eq.updateEinnahmequelle(q.id, { kosten_cent: 1000 });
  assert.equal((await eq.setzeEqStatus(q.id, "SKALIEREN")).status, "SKALIEREN");
  assert.equal(eq.uebersicht(await eq.listEinnahmequellen()).aktiv, 1, "Skalieren zählt als aktiv");
  await assert.rejects(() => eq.updateEinnahmequelle(q.id, { automatisierungsgrad: 150 }), /0 und 100/);
});

test("Kunde zuordnen: nur mit Namen, eigene Liste, Anzahl steigt; getrennt von Werknetz24/E-Commerce", async () => {
  const q = await eq.createEinnahmequelle({ name: "K" });
  await assert.rejects(() => eq.kundeZuordnen(q.id, { name: "  " }), /Name des Kunden fehlt/);
  const r = await eq.kundeZuordnen(q.id, { name: "Firma X", kontakt: "x@example.test", seit: "2026-09-27" });
  assert.equal(r.kunden.length, 1); assert.equal(r.erste_kunden, 1); assert.deepEqual(Object.keys(r.kunden[0]).sort(), ["kontakt", "name", "notiz", "seit"]);
  assert.equal((await eq.setzeEqStatus(q.id, "ERSTER_KUNDE")).status, "ERSTER_KUNDE");
});

test("Aufgabe erzeugen: landet in der zentralen Aufgabenliste mit Bezug; ohne Titel abgelehnt", async () => {
  const q = await eq.createEinnahmequelle({ name: "Aufgaben-EQ" });
  await assert.rejects(() => eq.aufgabeErzeugen(q.id, {}), /Titel der Aufgabe fehlt/);
  await eq.updateEinnahmequelle(q.id, { naechste_aufgabe: "Erste 3 Videos drehen", verantwortlich: "Adnan" });
  const t = await eq.aufgabeErzeugen(q.id, { priority: "Hoch" });
  assert.equal(t.title, "Erste 3 Videos drehen"); assert.equal(t.einnahmequelle_id, q.id); assert.equal(t.area, "Einnahmequelle: Aufgaben-EQ"); assert.equal(t.business_id, "master");
  assert.ok((await tasks.listTasks()).some(x => x.id === t.id), "zentral sichtbar");
  assert.deepEqual((await eq.aufgabenVon(q.id)).map(x => x.id), [t.id]);
  await assert.rejects(() => eq.aufgabeErzeugen(q.id, { title: "x", priority: "Sofort" }), /Priorität/);
});

test("Start/Stop merkt sich die Stufe; Verlauf protokolliert jede Aktivität", async () => {
  const q = await eq.createEinnahmequelle({ name: "StartStop" });
  await eq.setzeEqStatus(q.id, "PRUEFUNG");
  const p = await eq.stoppeEinnahmequelle(q.id); assert.equal(p.status, "PAUSE"); assert.equal(p.status_vor_pause, "PRUEFUNG");
  assert.equal((await eq.starteEinnahmequelle(q.id)).status, "PRUEFUNG");
  await assert.rejects(() => eq.starteEinnahmequelle(q.id), /Läuft bereits/);
  await eq.kundeZuordnen(q.id, { name: "Z" });
  const v = (await eq.verlaufVon(q.id)).map(e => e.action);
  assert.deepEqual(v, ["einnahmequelle.kunde", "einnahmequelle.status", "einnahmequelle.status", "einnahmequelle.status", "einnahmequelle.created"]);
  assert.ok((await listAudit(200)).every(e => e.entity_type !== "einnahmequelle" || e.entity_id), "jeder Eintrag hat Bezug");
});

test("API: Workflow-Aktionen nur mit Anmeldung; Details liefern Aufgaben + Verlauf", async () => {
  auth.resetLoginSperreFuerTests();
  for (const action of ["einnahmequelle-aufgabe", "einnahmequelle-kunde", "einnahmequelle-start", "einnahmequelle-stop"]) assert.equal((await route.POST(req("POST", "", { action, id: "x" }))).status, 401, action);
  const id = (await (await route.POST(req("POST", "", { action: "einnahmequelle-anlegen", name: "API-WF" }, "test-secret"))).json()).einnahmequelle.id;
  assert.equal((await route.POST(req("POST", "", { action: "einnahmequelle-aufgabe", id, title: "Test-Aufgabe" }, "test-secret"))).status, 201);
  assert.equal((await route.POST(req("POST", "", { action: "einnahmequelle-kunde", id, kunde: { name: "" } }, "test-secret"))).status, 400);
  assert.equal((await route.POST(req("POST", "", { action: "einnahmequelle-status", id, status: "SKALIEREN" }, "test-secret"))).status, 400);
  assert.equal((await route.POST(req("POST", "", { action: "einnahmequelle-stop", id }, "test-secret"))).status, 200);
  assert.equal((await route.POST(req("POST", "", { action: "einnahmequelle-aufgabe", id: "gibt-es-nicht", title: "x" }, "test-secret"))).status, 404);
  const d = await (await route.GET(req("GET", "?einnahmequellen=1&id=" + id, null, "test-secret"))).json();
  assert.equal(d.aufgaben.length, 1); assert.ok(d.verlauf.some(v => v.action === "einnahmequelle.aufgabe"));
  assert.equal((await route.GET(req("GET", "?einnahmequellen=1&id=" + id))).status, 401);
});
