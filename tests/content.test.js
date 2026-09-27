// Teil 4A (27.09.2026): Content & Werbung + "Wartet auf Freigabe".
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("data:text/javascript," + encodeURIComponent(
  'export async function resolve(s, c, n) { const fix = (s === "next/server" || (s.startsWith(".") && !/\\.[cm]?js$/.test(s))) ? s + ".js" : s; return n(fix, c); }'
));
delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SECRET_KEY;
process.env.MASTER_API_SECRET = "test-secret";
const R = await import("../lib/content-regeln.js");
const C = await import("../lib/content.js");
const F = await import("../lib/freigaben.js");
const eq = await import("../lib/einnahmequellen.js");
const { erstelleTagesbericht } = await import("../lib/tagesbericht.js");
const route = await import("../app/api/master/businesses/route.js");
const auth = await import("../lib/auth.js");
beforeEach(() => { C.resetContentFuerTests(); F.resetFreigabenFuerTests(); eq.resetEinnahmequellenFuerTests(); auth.resetLoginSperreFuerTests(); });

const QUELLE = { quelle: "Test", url: "https://example.test/a", datum: "2026-09-27", aussage: "belegt X" };
async function bisPruefung(extra = {}) {
  const c = await C.createContent({ titel: "Kaffee im LKW", thema: "Kaffee unterwegs", plattformen: ["tiktok"], ...extra });
  await C.setzeContentStatus(c.id, "RECHERCHE");
  await C.contentVorbereiten(c.id);
  await C.setzeContentStatus(c.id, "SKRIPT");
  await C.setzeContentStatus(c.id, "ERSTELLT");
  return c;
}

test("Ablauf wie vorgegeben; jede Stufe braucht ihren Nachweis", async () => {
  assert.deepEqual(R.C_ABLAUF, ["IDEE", "RECHERCHE", "SKRIPT", "ERSTELLT", "PRUEFUNG", "VEROEFFENTLICHT", "REICHWEITE", "LEADS", "EINNAHMEN"]);
  const c = await C.createContent({ titel: "Ohne Thema" });
  await assert.rejects(() => C.setzeContentStatus(c.id, "RECHERCHE"), /mit Thema/);
  await assert.rejects(() => C.setzeContentStatus(c.id, "EINNAHMEN"), /mit Thema/, "keine Stufe überspringbar");
  await C.updateContent(c.id, { thema: "Test" });
  await assert.rejects(() => C.setzeContentStatus(c.id, "SKRIPT"), /Rechercheergebnis/);
  await C.contentQuelle(c.id, QUELLE);
  assert.equal((await C.setzeContentStatus(c.id, "SKRIPT")).status, "SKRIPT");
  await assert.rejects(() => C.setzeContentStatus(c.id, "ERSTELLT"), /Skript/);
});

test("Automatisch vorbereiten füllt nur leere Felder, erfindet keine Zahlen, markiert Werbung", async () => {
  const c = await C.createContent({ titel: "Kühlbox Test", thema: "Kühlbox im LKW", plattformen: ["tiktok", "youtube"], werbung: true, skript: "Mein eigenes Skript" });
  const { content: r, gefuellt } = await C.contentVorbereiten(c.id);
  assert.equal(r.skript, "Mein eigenes Skript", "vorhandener Text bleibt");
  assert.ok(gefuellt.includes("recherche") && gefuellt.includes("beschreibung") && gefuellt.includes("varianten") && !gefuellt.includes("skript"));
  assert.deepEqual(Object.keys(r.varianten).sort(), ["tiktok", "youtube"], "nur gewählte Plattformen");
  assert.match(r.beschreibung, /Werbung/); assert.match(r.varianten.tiktok, /\(Werbung\)/);
  assert.match(r.recherche, /trends\.google\.de/);
  assert.equal(r.titel_varianten.length, 5); assert.equal(r.social_posts.length, 3);
  const alles = JSON.stringify(r).replace(/https?:\/\/[^\s"\\]+/g, ""); // Links (URL-Kodierung %C3%BC) nicht mitprüfen
  assert.doesNotMatch(alles, /\d+\s?(%|Prozent)|garantiert|viral/i, "keine erfundenen Zahlen/Versprechen");
  assert.deepEqual((await C.contentVorbereiten(c.id)).gefuellt, [], "zweiter Lauf ändert nichts");
});

test("Prüfung → landet automatisch in 'Wartet auf Freigabe'; ohne Freigabe keine Veröffentlichung", async () => {
  const c = await bisPruefung();
  await C.setzeContentStatus(c.id, "PRUEFUNG");
  const offen = (await F.listFreigaben()).filter(f => f.status === "OFFEN");
  assert.equal(offen.length, 1); assert.equal(offen[0].art, "VEROEFFENTLICHUNG"); assert.equal(offen[0].bezug_id, c.id);
  await C.setzeContentStatus(c.id, "PRUEFUNG"); assert.equal((await F.listFreigaben()).length, 1, "keine doppelte Freigabe");
  await assert.rejects(() => C.contentVeroeffentlichung(c.id, { plattform: "tiktok", url: "https://tiktok.test/1", datum: "2026-09-28" }), /nach deiner Freigabe/);
  await assert.rejects(() => C.setzeContentStatus(c.id, "VEROEFFENTLICHT"), /nach deiner Freigabe/);
  await F.freigabeEntscheiden(offen[0].id, "FREIGEGEBEN", "passt");
  await assert.rejects(() => F.freigabeEntscheiden(offen[0].id, "ABGELEHNT"), /Bereits entschieden/);
  await assert.rejects(() => C.setzeContentStatus(c.id, "VEROEFFENTLICHT"), /Veröffentlichung eintragen/, "Zentrale postet nicht selbst");
  await C.contentVeroeffentlichung(c.id, { plattform: "tiktok", url: "https://tiktok.test/1", datum: "2026-09-28" });
  assert.equal((await C.setzeContentStatus(c.id, "VEROEFFENTLICHT")).status, "VEROEFFENTLICHT");
  await assert.rejects(() => C.setzeContentStatus(c.id, "REICHWEITE"), /echten Kennzahlen/);
  await C.contentKennzahl(c.id, { plattform: "tiktok", datum: "2026-09-29", quelle: "TikTok-Analysen", aufrufe: 500, likes: 20, leads: 1 });
  assert.equal((await C.setzeContentStatus(c.id, "REICHWEITE")).status, "REICHWEITE");
  assert.equal((await C.setzeContentStatus(c.id, "LEADS")).status, "LEADS");
  await assert.rejects(() => C.setzeContentStatus(c.id, "EINNAHMEN"), /echten Einnahmen/);
});

test("Änderung nach Freigabe → Freigabe verfällt und wird neu angefragt; Werbung muss gekennzeichnet sein; Bilder brauchen Rechte", async () => {
  const c = await bisPruefung({ werbung: true });
  await C.updateContent(c.id, { beschreibung: "ohne Kennzeichnung" });
  await assert.rejects(() => C.setzeContentStatus(c.id, "PRUEFUNG"), /als „Werbung“ oder „Anzeige“/);
  await C.updateContent(c.id, { beschreibung: "Werbung – mein Test" });
  await C.contentBild(c.id, { beschreibung: "Kühlbox", rechte: "" });
  await assert.rejects(() => C.setzeContentStatus(c.id, "PRUEFUNG"), /Rechte-Angabe/);
  assert.throws(() => R.pruefeBild({ beschreibung: "" }), /Beschreibung/);
  const c2 = await bisPruefung();
  await C.setzeContentStatus(c2.id, "PRUEFUNG");
  const f = (await F.listFreigaben()).find(x => x.bezug_id === c2.id);
  await F.freigabeEntscheiden(f.id, "FREIGEGEBEN");
  const r = await C.updateContent(c2.id, { skript: "geändert" });
  assert.equal(r.freigegeben, false);
  assert.equal((await F.listFreigaben()).filter(x => x.bezug_id === c2.id && x.status === "OFFEN").length, 1, "neu angefragt");
  const n = await C.updateContent(c2.id, { notiz: "nur Notiz" }); assert.equal(n.freigegeben, false);
});

test("Kennzahlen nur echt (Datum, Plattform, Quelle, ganze Zahlen); Erfolg erst ab 3 Inhalten, nur Eigenvergleich", async () => {
  assert.throws(() => R.pruefeKennzahl({ plattform: "tiktok", datum: "2026-09-27", aufrufe: 5 }), /Quelle ist Pflicht/);
  assert.throws(() => R.pruefeKennzahl({ plattform: "tiktok", datum: "2026-09-27", quelle: "x", aufrufe: -1 }), /ganze Zahl/);
  assert.throws(() => R.pruefeKennzahl({ plattform: "myspace", datum: "2026-09-27", quelle: "x" }), /Plattform/);
  const k = (a, l) => ({ kennzahlen: [{ aufrufe: a, likes: l }] });
  assert.equal(R.erfolgsAuswertung([{ id: 1, ...k(100, 10) }, { id: 2, ...k(100, 5) }]).genug, false);
  const e = R.erfolgsAuswertung([{ id: 1, titel: "A", ...k(100, 10) }, { id: 2, titel: "B", ...k(100, 5) }, { id: 3, titel: "C", ...k(100, 1) }, { id: 4, titel: "D", kennzahlen: [] }]);
  assert.equal(e.genug, true); assert.deepEqual(e.top.map(x => x.titel), ["A"]); assert.match(e.hinweis, /eigenen Inhalten/);
});

test("Werkzeuge: kostenpflichtige standardmäßig aus; Anfrage landet als Freigabe; Freigabe ≠ eingeschaltet", async () => {
  const w = await F.werkzeugStatus();
  assert.equal(w.find(x => x.id === "vorlagen").status, "aktiv");
  for (const id of ["ki-texte", "tiktok-api", "bezahlte-werbung"]) assert.equal(w.find(x => x.id === id).status, "aus");
  await assert.rejects(() => F.werkzeugAnfragen("vorlagen"), /bereits aktiv/);
  const f = await F.werkzeugAnfragen("bezahlte-werbung"); assert.equal(f.art, "KOSTEN");
  assert.equal((await F.werkzeugAnfragen("bezahlte-werbung")).id, f.id, "keine doppelte Anfrage");
  const k = await F.werkzeugAnfragen("ki-texte"); await F.freigabeEntscheiden(k.id, "FREIGEGEBEN");
  assert.equal((await F.werkzeugStatus()).find(x => x.id === "ki-texte").status, "freigegeben – Einrichtung ausstehend");
});

test("Automatisierungsvorschläge mit Freigabe landen einmalig in der Liste; Entscheidung wird am Vorschlag vermerkt", async () => {
  const q = await eq.createEinnahmequelle({ name: "EQ-Plan" });
  await eq.planHinzufuegen(q.id, { was: "Formular", daten: "x", tool: "y", kosten: "5 €", risiko: "z", freigabe: false });
  await eq.planHinzufuegen(q.id, { was: "Ohne Freigabe", daten: "x", tool: "y", kosten: "0 €", risiko: "z", freigabe: false });
  await F.syncPlanFreigaben(await eq.listEinnahmequellen()); await F.syncPlanFreigaben(await eq.listEinnahmequellen());
  const fg = await F.listFreigaben(); assert.equal(fg.length, 1); assert.equal(fg[0].art, "AUTOMATISIERUNG");
  await F.freigabeEntscheiden(fg[0].id, "ABGELEHNT", "zu teuer");
  assert.equal((await eq.listEinnahmequellen())[0].automatisierungsplan[0].status, "abgelehnt");
  await F.syncPlanFreigaben(await eq.listEinnahmequellen()); assert.equal((await F.listFreigaben()).length, 1, "entschiedene nicht erneut");
});

test("Tagesbericht: offene Freigaben sind die erste Benutzeraktion", () => {
  const b = erstelleTagesbericht({ freigaben: [{ status: "OFFEN", titel: "X" }, { status: "FREIGEGEBEN", titel: "Y" }] });
  assert.equal(b.naechsteBenutzeraktion.text, "1 Entscheidung(en) warten auf deine Freigabe"); assert.equal(b.naechsteBenutzeraktion.ziel, "freigaben");
});

const req = (method, query, body, token) => new Request("http://t/api/master/businesses" + query, { method, headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
test("API: Content und Freigaben nur mit Anmeldung; Fehler als 400/404", async () => {
  assert.equal((await route.GET(req("GET", "?content=1"))).status, 401);
  assert.equal((await route.GET(req("GET", "?freigaben=1"))).status, 401);
  for (const action of ["content-anlegen", "freigabe-entscheiden", "werkzeug-anfragen"]) assert.equal((await route.POST(req("POST", "", { action }))).status, 401, action);
  const a = await route.POST(req("POST", "", { action: "content-anlegen", daten: { titel: "API" } }, "test-secret")); assert.equal(a.status, 201);
  const id = (await a.json()).content.id;
  assert.equal((await route.POST(req("POST", "", { action: "content-status", id, status: "EINNAHMEN" }, "test-secret"))).status, 400);
  assert.equal((await route.POST(req("POST", "", { action: "content-vorbereiten", id: "gibt-es-nicht" }, "test-secret"))).status, 404);
  const i = await (await route.POST(req("POST", "", { action: "content-ideen", thema: "Kaffee" }, "test-secret"))).json(); assert.equal(i.ideen.length, 5);
  assert.equal((await route.POST(req("POST", "", { action: "freigabe-entscheiden", id: "x", entscheidung: "VIELLEICHT" }, "test-secret"))).status, 400);
  const g = await (await route.GET(req("GET", "?content=1", null, "test-secret"))).json(); assert.equal(g.content.length, 1); assert.ok(g.werkzeuge.length >= 4);
  const f = await (await route.GET(req("GET", "?freigaben=1", null, "test-secret"))).json(); assert.ok(Array.isArray(f.freigaben) && Array.isArray(f.wartendeAufgaben));
});
