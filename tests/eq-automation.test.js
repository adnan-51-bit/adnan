// Teil 3A (27.09.2026): kostenlose Automatisierungen der Einnahmequellen - Entwuerfe aus Vorlagen,
// Lead-Erfassung mit Nachfass-Aufgabe, Aufgaben aus Schritten, wiederkehrende Pruefungen, Cron.
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("data:text/javascript," + encodeURIComponent(
  'export async function resolve(s, c, n) { const fix = (s === "next/server" || (s.startsWith(".") && !/\\.[cm]?js$/.test(s))) ? s + ".js" : s; return n(fix, c); }'
));
delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SECRET_KEY; delete process.env.CRON_SECRET;
process.env.MASTER_API_SECRET = "test-secret";
const A = await import("../lib/eq-automation.js");
const eq = await import("../lib/einnahmequellen.js");
const tasks = await import("../lib/master-tasks.js");
const { fuehreAktionAus } = await import("../lib/aktion-ausfuehren.js");
const route = await import("../app/api/master/businesses/route.js");
const auth = await import("../lib/auth.js");
beforeEach(() => { eq.resetEinnahmequellenFuerTests(); auth.resetLoginSperreFuerTests(); });

const Q = { id: "eq_x", name: "Anfragen-Service", zielgruppe: "kleine Betriebe", angebot: "Anfragen sortieren", status: "PRUEFUNG", markt: "noch zu prüfen", schritte: "- Checkliste schreiben\n2. Muster testen\n\n• Feedback holen", werkzeuge: "Tabelle" };

test("Entwürfe entstehen nur aus gespeicherten Daten; Unbekanntes bleibt Platzhalter; Hinweis 'Entwurf'", () => {
  for (const art of Object.keys(A.ENTWURF_ARTEN)) {
    const e = A.erzeugeEntwurf(art, Q, []);
    assert.equal(e.art, art); assert.ok(e.titel.includes(Q.name)); assert.match(e.hinweis, /ohne KI/); assert.ok(e.text.length > 20);
    assert.doesNotMatch(e.text, /\d+\s?(%|Prozent)|garantiert|sicher(e|er)? Einnahmen/i, art + ": keine erfundenen Zahlen/Versprechen");
  }
  const texte = A.texte(Q).text;
  assert.match(texte, /\[Preis – noch zu prüfen\]/, "Preis ohne Quelle bleibt offen");
  assert.match(A.emailEntwuerfe(Q).text, /UWG § 7/, "Warnhinweis gegen Werbe-Mails");
  const r = A.rechercheCheckliste(Q).text;
  assert.match(r, /Gibt es Anbieter/, "Markt „noch zu prüfen“ erzeugt Rechercheauftrag");
  assert.match(r, /https:\/\/www\.google\.com\/search\?q=/);
  assert.throws(() => A.erzeugeEntwurf("werbung", Q), /Unbekannte Entwurfsart/);
});

test("Schritte → Aufgaben: Aufzählungszeichen entfernt, Leerzeilen ignoriert; Fälligkeit/Report aus echten Daten", () => {
  assert.deepEqual(A.schritteAlsAufgaben(Q), ["Checkliste schreiben", "Muster testen", "Feedback holen"]);
  const jetzt = new Date("2026-09-27T12:00:00Z");
  const t = [{ title: "alt", status: "Offen", due_at: "2026-09-20T00:00:00Z" }, { title: "fertig", status: "Erledigt", due_at: "2026-09-20T00:00:00Z" }, { title: "später", status: "Offen", due_at: "2026-10-20T00:00:00Z" }, { title: "ohne", status: "Offen" }];
  assert.deepEqual(A.faelligkeit(t, jetzt).map(x => x.title), ["alt"]);
  const rep = A.eqReport([{ ...Q, einnahmen_cent: 0, kosten_cent: 0 }], t, jetzt).text;
  assert.match(rep, /1 Einnahmequellen: 1 × Prüfung/); assert.match(rep, /Überfällige Aufgaben: 1/); assert.match(rep, /Einnahmen 0,00\s€/);
});

test("Lead erfassen: Einwilligung Pflicht, automatische Nachfass-Aufgabe in 3 Tagen; ohne Einwilligung Werbeverbot-Hinweis", async () => {
  const q = await eq.createEinnahmequelle({ name: "Leads-EQ" });
  await assert.rejects(() => eq.leadHinzufuegen(q.id, { name: "A" }), /Einwilligung/);
  await assert.rejects(() => eq.leadHinzufuegen(q.id, { name: " ", einwilligung: true }), /Name des Leads/);
  const vorher = Date.now();
  const { einnahmequelle, task } = await eq.leadHinzufuegen(q.id, { name: "Kommentator", quelle: "Kommentar Video 1", einwilligung: false });
  assert.equal(einnahmequelle.leads.length, 1); assert.equal(einnahmequelle.leads[0].status, "neu");
  assert.equal(task.einnahmequelle_id, q.id); assert.match(task.title, /Lead nachfassen: Kommentator/); assert.match(task.naechste_aktion, /Keine Werbung senden/);
  const tage = (Date.parse(task.due_at) - vorher) / 86400000; assert.ok(tage > 2.9 && tage < 3.1, "fällig in 3 Tagen");
  await assert.rejects(() => eq.leadStatus(q.id, 0, "gewonnen"), /Lead-Status ungültig/);
  await assert.rejects(() => eq.leadStatus(q.id, 5, "kunde"), /Lead nicht gefunden/);
  const r = await eq.leadStatus(q.id, 0, "kunde");
  assert.equal(r.leads[0].status, "kunde"); assert.equal(r.kunden.length, 1); assert.equal(r.kunden[0].name, "Kommentator");
  const v = (await eq.verlaufVon(q.id)).map(e => e.action);
  assert.ok(v.includes("einnahmequelle.lead") && v.includes("einnahmequelle.lead_status") && v.includes("einnahmequelle.kunde"));
});

test("Aufgaben aus Schritten ohne Doppelte; Entwurf wird gespeichert (max. 20) und protokolliert", async () => {
  const q = await eq.createEinnahmequelle({ name: "Schritte-EQ", schritte: Q.schritte });
  const a = await eq.aufgabenAusSchritten(q.id); assert.equal(a.neu.length, 3); assert.equal(a.uebersprungen, 0);
  const b = await eq.aufgabenAusSchritten(q.id); assert.equal(b.neu.length, 0); assert.equal(b.uebersprungen, 3);
  assert.equal((await eq.aufgabenVon(q.id)).length, 3);
  const leer = await eq.createEinnahmequelle({ name: "leer" });
  await assert.rejects(() => eq.aufgabenAusSchritten(leer.id), /Benötigte Schritte/);
  for (let i = 0; i < 22; i++) await eq.entwurfErzeugen(q.id, "ideen");
  const gespeichert = (await eq.listEinnahmequellen()).find(x => x.id === q.id);
  assert.equal(gespeichert.entwuerfe.length, 20);
  assert.ok((await eq.verlaufVon(q.id)).some(e => e.action === "einnahmequelle.entwurf"));
});

test("Wiederkehrende Prüfungen: Quellen-Links werden wirklich geprüft; kaputte Links = Befund; alles im Log", async () => {
  const q = await eq.createEinnahmequelle({ name: "Quellen-EQ" });
  await eq.quelleHinzufuegen(q.id, { quelle: "gut", url: "https://gut.test/a", datum: "2026-09-27", aussage: "x" });
  await eq.quelleHinzufuegen(q.id, { quelle: "weg", url: "https://weg.test/b", datum: "2026-09-27", aussage: "y" });
  await eq.quelleHinzufuegen(q.id, { quelle: "gesperrt", url: "https://gesperrt.test/c", datum: "2026-09-27", aussage: "z" });
  await eq.quelleHinzufuegen(q.id, { quelle: "langsam", url: "https://langsam.test/d", datum: "2026-09-27", aussage: "z" });
  const f = async url => { if (url.includes("langsam")) { const e = new Error("timeout"); e.name = "TimeoutError"; throw e; } return { status: url.includes("weg") ? 404 : url.includes("gesperrt") ? 403 : 200 }; };
  const r = await fuehreAktionAus("quellen-pruefung", undefined, { fetchImpl: f });
  assert.equal(r.ok, false); assert.match(r.fehler, /1 von 4 Quellen tot: Quellen-EQ: https:\/\/weg\.test\/b \(HTTP 404\)/);
  assert.match(r.fehler, /2 nicht automatisch prüfbar .*gesperrt\.test\/c \(HTTP 403\).*langsam\.test\/d \(Zeitüberschreitung\)/, "403/Timeout sind kein Befund, aber sichtbar");
  const nurGesperrt = await fuehreAktionAus("quellen-pruefung", undefined, { fetchImpl: async url => ({ status: url.includes("gesperrt") ? 403 : 200 }) });
  assert.equal(nurGesperrt.ok, true, "gesperrte Seite allein ist kein Fehler"); assert.match(nurGesperrt.zusammenfassung, /3 von 4 Quellen erreichbar, keine toten Links/);
  const ok = await fuehreAktionAus("faelligkeit"); assert.equal(ok.ok, true); assert.match(ok.zusammenfassung, /Keine überfällige|überfällig/);
  const rep = await fuehreAktionAus("eq-report"); assert.equal(rep.ok, true); assert.match(rep.bericht, /EINNAHMEQUELLEN-REPORT/);
});

const req = (method, query, body, token, extra = {}) => new Request("http://t/api/master/businesses" + query, { method, headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}), ...extra }, ...(body ? { body: JSON.stringify(body) } : {}) });

test("API: Automatik-Aktionen nur mit Anmeldung; Report nur mit Anmeldung", async () => {
  for (const action of ["einnahmequelle-entwurf", "einnahmequelle-lead", "einnahmequelle-lead-status", "einnahmequelle-schritte"]) assert.equal((await route.POST(req("POST", "", { action, id: "x" }))).status, 401, action);
  assert.equal((await route.GET(req("GET", "?eqreport=1"))).status, 401);
  const id = (await (await route.POST(req("POST", "", { action: "einnahmequelle-anlegen", name: "API-3A" }, "test-secret"))).json()).einnahmequelle.id;
  const e = await route.POST(req("POST", "", { action: "einnahmequelle-entwurf", id, art: "emails" }, "test-secret"));
  assert.equal(e.status, 201); assert.match((await e.json()).entwurf.text, /UWG/);
  assert.equal((await route.POST(req("POST", "", { action: "einnahmequelle-entwurf", id, art: "spam" }, "test-secret"))).status, 400);
  assert.equal((await route.POST(req("POST", "", { action: "einnahmequelle-lead", id, lead: { name: "L", einwilligung: true } }, "test-secret"))).status, 201);
  assert.equal((await route.POST(req("POST", "", { action: "einnahmequelle-lead-status", id, index: 0, status: "kontaktiert" }, "test-secret"))).status, 200);
  assert.equal((await route.POST(req("POST", "", { action: "einnahmequelle-lead-status", id, index: 9, status: "kontaktiert" }, "test-secret"))).status, 400);
  const g = await (await route.GET(req("GET", "?eqreport=1", null, "test-secret"))).json(); assert.match(g.report.text, /API-3A/);
});

test("Cron: läuft ohne Anmeldung, aber höchstens einmal pro Stunde, verrät nichts; mit CRON_SECRET nur mit Schlüssel", async () => {
  const r1 = await route.GET(req("GET", "?cron=wiederkehrend"));
  assert.equal(r1.status, 200); const j1 = await r1.json(); assert.deepEqual(Object.keys(j1).sort(), ["gelaufen", "ok"], "nur Zählwerte, keine Inhalte");
  assert.equal((await route.GET(req("GET", "?cron=wiederkehrend"))).status, 429, "zweiter Lauf innerhalb einer Stunde gesperrt");
  process.env.CRON_SECRET = "cron-test";
  try { assert.equal((await route.GET(req("GET", "?cron=wiederkehrend"))).status, 401); }
  finally { delete process.env.CRON_SECRET; }
});
