// AUTO-INCOME als eigener Betrieb (01.10.2026): eigene business_id, eigene Seite, nur mit
// Anmeldung lesbar, keine Vermischung mit Werknetz24/E-Commerce, keine persönlichen Angaben im
// (öffentlichen) Repository, keine erfundenen Einnahmen.
import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { readFile } from "node:fs/promises";

register("data:text/javascript," + encodeURIComponent(
  'export async function resolve(s, c, n) { const fix = (s === "next/server" || (s.startsWith(".") && !/\\.[cm]?js$/.test(s))) ? s + ".js" : s; return n(fix, c); }'
));
delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SECRET_KEY;

const { AUTO_INCOME_ID, autoIncomeDaten, autoIncomeKurz } = await import("../lib/auto-income-data.js");
const { listBusinesses, isKnownBusinessId } = await import("../lib/master-store.js");
const { bereichsStatus } = await import("../lib/gesamtstatus.js");
const route = await import("../app/api/master/businesses/route.js");

const SECRET = "test-master-secret";
const req = (path, token) => new Request("https://example.test" + path, token ? { headers: { authorization: "Bearer " + token } } : {});
const datei = p => readFile(new URL(p, import.meta.url), "utf8");

test("eigene business_id, eigene Seite, in der Betriebsliste der Master-Zentrale", async () => {
  assert.equal(AUTO_INCOME_ID, "auto-income");
  assert.equal(isKnownBusinessId("auto-income"), true);
  const b = (await listBusinesses()).find(x => x.id === "auto-income");
  assert.ok(b, "AUTO-INCOME fehlt in der Betriebsliste");
  assert.equal(b.link, "/auto-income");
  assert.equal(b.revenue, "0 €");
});

test("jeder Datensatz trägt business_id auto-income", () => {
  const d = autoIncomeDaten();
  const gruppen = [[d], [d.betrieb], [d.geld], [d.automatisierung], d.tests, d.blocker, d.agenten, d.verlauf, d.dokumente];
  for (const g of gruppen) for (const x of g) assert.equal(x.business_id, "auto-income", JSON.stringify(x).slice(0, 80));
});

test("keine erfundenen Einnahmen: alle Geldwerte dokumentiert 0, kein Test über Messstufe 2", () => {
  const d = autoIncomeDaten();
  for (const [k, v] of Object.entries(d.geld)) if (k.endsWith("_cent")) assert.equal(v, 0, k);
  assert.equal(d.geld.umsatzStatus, "NOCH KEIN UMSATZ");
  for (const t of d.tests) { assert.equal(t.einnahmen_cent, 0, t.id); assert.ok(t.messstufe <= 2, t.id); }
  const t = d.tests.find(x => x.id === "TEST_002C");
  assert.equal(t.angeschrieben, 10); assert.equal(t.antworten, 3); assert.match(t.quote, /^30 %/);
  assert.equal(t.interessenten, "nicht bekannt");
});

test("Agenten nicht erfunden: ohne echten Agenten steht 'Nicht eingerichtet'", () => {
  const ag = autoIncomeDaten().agenten;
  assert.equal(ag.length, 6);
  assert.ok(ag.filter(a => a.status === "Nicht eingerichtet").length >= 5);
  assert.match(ag.find(a => a.name === "Test-Auswertung").status, /Kein Agent/);
});

test("öffentliches Repo: keine persönlichen Angaben in Daten, Seite und Startseiten-Kachel", async () => {
  const quellen = [JSON.stringify(autoIncomeDaten()), await datei("../lib/auto-income-data.js"), await datei("../app/auto-income/page.jsx")];
  for (const q of quellen) assert.doesNotMatch(q, /pfändung|pfaendung|insolvenz|schuldner|monheim|adnan-51@|steuer-?id/i);
});

test("API: ohne Anmeldung gesperrt, mit Anmeldung nur AUTO-INCOME-Daten", async () => {
  process.env.MASTER_API_SECRET = SECRET;
  assert.equal((await route.GET(req("/api/master/businesses?autoIncome=1"))).status, 401);
  assert.equal((await route.GET(req("/api/master/businesses?autoIncome=kurz"))).status, 401);
  const voll = await (await route.GET(req("/api/master/businesses?autoIncome=1", SECRET))).json();
  assert.equal(voll.ok, true); assert.equal(voll.business_id, "auto-income");
  // keine Datensätze anderer Betriebe und keine Werknetz24-Live-Daten (der Begriff darf als Text vorkommen)
  assert.doesNotMatch(JSON.stringify(voll), /"business_id":"(?!auto-income")/);
  assert.doesNotMatch(JSON.stringify(voll), /liveStatus|systemStatus|offeneRechnungen|kundennummer/);
  const kurz = await (await route.GET(req("/api/master/businesses?autoIncome=kurz", SECRET))).json();
  assert.deepEqual({ test: kurz.kurz.aktiverTest, ein: kurz.kurz.einnahmen_cent, kos: kurz.kurz.kosten_cent, stufe: kurz.kurz.messstufe }, { test: "TEST_002C", ein: 0, kos: 0, stufe: 2 });
  assert.deepEqual(autoIncomeKurz(), kurz.kurz);
});

test("Startseite: AUTO-INCOME zeigt 🟡 TEST statt 🟢 AKTIV", () => {
  const st = bereichsStatus({ businesses: [{ id: "auto-income", name: "AUTO-INCOME", link: "/auto-income", status: "TEST" }] });
  assert.equal(st[0].ampel, "🟡"); assert.equal(st[0].label, "TEST");
});

test("Trennung: AUTO-INCOME-Seite ruft keine Werknetz24-/E-Commerce-Daten ab, und umgekehrt", async () => {
  const ai = await datei("../app/auto-income/page.jsx");
  assert.doesNotMatch(ai, /werknetz24(Incidents|Agenten|Kalender|Aufgaben|Rechnungen)|\/api\/orders/);
  assert.doesNotMatch(ai, /from "..\/..\/lib\/auto-income-data/, "Datensatz darf nicht im Browser-Code landen");
  for (const p of ["../app/werknetz24/page.jsx", "../app/e-commerce/page.jsx"]) assert.doesNotMatch(await datei(p), /auto-?income/i, p);
});
