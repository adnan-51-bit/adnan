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
  await assert.rejects(() => eq.setzeEqStatus(q.id, "AKTIV"), /echten Einnahmen/);
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
