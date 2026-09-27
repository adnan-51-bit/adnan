// Teil 5 (27.09.2026): Pilot "Pflege Google-Unternehmensprofil".
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("data:text/javascript," + encodeURIComponent(
  'export async function resolve(s, c, n) { const fix = (s === "next/server" || (s.startsWith(".") && !/\\.[cm]?js$/.test(s))) ? s + ".js" : s; return n(fix, c); }'
));
delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SECRET_KEY;
process.env.MASTER_API_SECRET = "test-secret";
const G = await import("../lib/google-profil.js");
const P = await import("../lib/pilot.js");
const L = await import("../lib/leads.js");
const eq = await import("../lib/einnahmequellen.js");
const F = await import("../lib/freigaben.js");
const fin = await import("../lib/master-finance.js");
const tasks = await import("../lib/master-tasks.js");
const route = await import("../app/api/master/businesses/route.js");
const auth = await import("../lib/auth.js");
beforeEach(() => { L.resetLeadsFuerTests(); eq.resetEinnahmequellenFuerTests(); F.resetFreigabenFuerTests(); auth.resetLoginSperreFuerTests(); });

const ALLE = v => Object.fromEntries(G.KRITERIEN.map(k => [k.id, v]));
const ANALYSE = { quelle: "https://maps.google.com/?cid=1", datum: "2026-09-27", werte: { ...ALLE("ja"), beitraege: "nein", bewertungen_antworten: "teilweise", fragen: "unbekannt" } };
async function pilotEq() { const q = await eq.createEinnahmequelle({ name: "Pflege Google-Unternehmensprofil", kategorie: "C" }); return q; }
async function kunde(q) {
  const { lead } = await L.leadAnlegen({ name: "Bäckerei Test", firma: "Bäckerei Test", einnahmequelle_id: q.id, selbst_angefragt: true, einwilligung: false });
  await L.angebotErstellen(lead.id, { text: "Pflege", betrag_cent: 4900 });
  await L.angebotEntscheidung(lead.id, true);
  return lead;
}

test("Analyse: Link + Datum Pflicht, ≥ 5 Punkte, Punkte/Verbesserungen aus der Checkliste; Bericht verspricht nichts", () => {
  assert.throws(() => G.pruefeAnalyse({ ...ANALYSE, quelle: "maps" }), /Link/);
  assert.throws(() => G.pruefeAnalyse({ ...ANALYSE, werte: { kategorie: "ja" } }), /mindestens 5/);
  assert.throws(() => G.pruefeAnalyse({ ...ANALYSE, werte: { ...ANALYSE.werte, fotos: "super" } }), /ungültig/);
  const a = G.pruefeAnalyse(ANALYSE);
  assert.equal(a.punkte, Math.round((7 + 0.5) / 9 * 100));
  assert.deepEqual(a.verbesserungen.map(v => [v.id, v.dringend]), [["beitraege", true], ["bewertungen_antworten", false]]);
  const b = G.berichtText({ firma: "Test" }, a);
  assert.match(b, /keine Google-Bewertung/); assert.match(b, /verspreche keine bestimmten Platzierungen/);
  assert.match(G.angebotText({ firma: "Test" }, null), /\[Monatspreis – noch festzulegen\]/);
  assert.match(G.angebotText({ firma: "Test" }, 4900), /49,00\s€ pro Monat/);
});

test("Analyse speichern → Interessent: Aufgabe 'Bericht persönlich zeigen'; Kunde: eine Aufgabe je Verbesserung", async () => {
  const q = await pilotEq();
  const { lead } = await L.leadAnlegen({ name: "Friseur X", einnahmequelle_id: q.id, einwilligung: false });
  const r = await P.analyseSpeichern(lead.id, ANALYSE);
  assert.equal(r.lead.profil_analyse.punkte, r.analyse.punkte); assert.match(r.bericht, /PROFIL-CHECK/);
  assert.ok((await tasks.listTasks()).some(t => t.title === "Profil-Check-Bericht persönlich zeigen: Friseur X" && /keine Werbe-Mail/.test(t.naechste_aktion)));
  const k = await kunde(q);
  await P.analyseSpeichern(k.id, ANALYSE);
  const eig = (await tasks.listTasks()).filter(t => t.quelle === "lead:" + k.id && t.title.startsWith("Bäckerei Test:"));
  assert.equal(eig.length, 2); assert.equal(eig.find(t => /Beitrag/.test(t.title)).priority, "Hoch");
  await assert.rejects(() => P.analyseSpeichern("gibt-es-nicht", ANALYSE), /nicht gefunden/);
});

test("Monatliche Leistung: nur für Kunden; Monatslauf legt einmal pro Monat Aufgaben + OFFENE Rechnung an (idempotent)", async () => {
  const q = await pilotEq();
  const { lead: kein } = await L.leadAnlegen({ name: "Kein Kunde", einnahmequelle_id: q.id, einwilligung: true });
  await assert.rejects(() => P.vertragStarten(kein.id, { monatspreis_cent: 4900, start: "2026-09-01" }), /erst für Kunden/);
  const k = await kunde(q);
  await assert.rejects(() => P.vertragStarten(k.id, { start: "2026-09-01" }), /Monatspreis/);
  const r = await P.vertragStarten(k.id, { monatspreis_cent: 4900, start: "2026-09-01" });
  assert.equal(r.lead.vertrag.aktiv, true); assert.equal(r.lauf.neu, 1);
  assert.ok((await tasks.listTasks()).some(t => /Kundenzugang: Bäckerei Test/.test(t.title) && t.status === "Wartet auf Benutzer"), "Kundenzugang wartet auf Adnan");
  const monat = (await tasks.listTasks()).filter(t => t.title.includes("· Bäckerei Test:"));
  assert.equal(monat.length, G.MONATS_AUFGABEN.length);
  assert.equal((await P.monatsLauf()).neu, 0, "zweiter Lauf im selben Monat legt nichts an");
  const naechster = new Date(); naechster.setMonth(naechster.getMonth() + 1, 5);
  assert.equal((await P.monatsLauf(naechster)).neu, 1, "neuer Monat → neue Monatsleistung");
  const f = fin.eqFinanzen(await fin.listFinance(), q.id);
  assert.equal(f.einnahmen_cent, 0, "Monatsrechnung ist offen, keine Einnahme"); assert.equal(f.offen_cent, 4900 * 3, "Angebot + 2 Monatsrechnungen offen");
  await assert.rejects(() => P.vertragStarten(k.id, { monatspreis_cent: 4900, start: "2026-09-01" }), /läuft bereits/);
  await P.vertragBeenden(k.id);
  const uebernaechster = new Date(); uebernaechster.setMonth(uebernaechster.getMonth() + 2, 5);
  assert.equal((await P.monatsLauf(uebernaechster)).neu, 0, "beendet → nichts mehr");
});

test("Wartet auf mich: Preis + Gewerbe als persönliche Entscheidungen; Preis setzen schließt die Entscheidung; Gewerbe-Freigabe wird vermerkt", async () => {
  const q = await pilotEq();
  let d = await P.pilotDaten();
  const arten = d.wartetAufMich.map(f => f.art).sort(); assert.deepEqual(arten, ["ENTSCHEIDUNG", "RECHT"]);
  assert.deepEqual(d.gate.filter(g => g.typ === "benutzer" && !g.ok).map(g => g.id).sort(), ["gewerbe", "preis"]);
  await P.pilotDaten(); assert.equal((await F.listFreigaben()).length, 2, "keine Doppelten");
  await assert.rejects(() => P.preisFestlegen(0), /Monatspreis/);
  await P.preisFestlegen(4900);
  d = await P.pilotDaten();
  assert.equal(d.wartetAufMich.length, 1); assert.equal(d.gate.find(g => g.id === "preis").ok, true);
  const gew = d.wartetAufMich[0]; await F.freigabeEntscheiden(gew.id, "FREIGEGEBEN", "mit Schuldnerberatung geklärt");
  d = await P.pilotDaten();
  assert.equal(d.gate.find(g => g.id === "gewerbe").ok, true); assert.equal(d.wartetAufMich.length, 0);
  assert.equal(d.eq.pilot.monatspreis_cent, 4900);
});

test("Quality Gate: technische Punkte je nach echter Lage; Kosten/Werkzeug/Cron werden wirklich geprüft", () => {
  const jetzt = new Date("2026-09-27T12:00:00Z");
  const eqX = { name: "P", quellen_liste: [1, 2, 3].map(i => ({ url: "https://x.test/" + i, datum: "2026-09-27", aussage: "a" })), pilot: {} };
  const lauf = (aktion, stunden) => ({ details: { aktion, ergebnis: "ok" }, created_at: new Date(jetzt - stunden * 3600000).toISOString() });
  const basis = { eq: eqX, leads: [1, 2, 3].map(i => ({ quelle: "https://verzeichnis.test/" + i + " (abgerufen 2026-09-27)" })), aufgaben: [{}], laeufe: [lauf("wiederkehrende-pruefungen", 5), lauf("tagesbericht", 5)], werkzeuge: [{ kostenlos: false, status: "aus" }], finanzen: { einnahmen_cent: 0, kosten_cent: 0, offen_cent: 0 }, jetzt };
  const tech = g => g.filter(x => x.typ === "technisch");
  assert.ok(tech(G.pilotQualityGate(basis)).every(x => x.ok), "alles technisch erfüllt");
  const f = (patch, id) => tech(G.pilotQualityGate({ ...basis, ...patch })).find(x => x.id === id).ok;
  assert.equal(f({ finanzen: { ...basis.finanzen, kosten_cent: 100 } }, "kosten"), false);
  assert.equal(f({ werkzeuge: [{ kostenlos: false, status: "freigegeben – Einrichtung ausstehend", name: "KI" }] }, "kosten"), false);
  assert.equal(f({ laeufe: [lauf("wiederkehrende-pruefungen", 30)] }, "cron"), false);
  assert.equal(f({ eq: { ...eqX, quellen_liste: eqX.quellen_liste.slice(0, 2) } }, "quellen"), false);
});

const req = (method, query, body, token) => new Request("http://t/api/master/businesses" + query, { method, headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
test("API: Pilot nur mit Anmeldung; Aktionen mit Fehlerbehandlung", async () => {
  assert.equal((await route.GET(req("GET", "?pilot=1"))).status, 401);
  for (const action of ["pilot-analyse", "pilot-preis", "pilot-vertrag"]) assert.equal((await route.POST(req("POST", "", { action }))).status, 401, action);
  assert.equal((await route.GET(req("GET", "?pilot=1", null, "test-secret"))).status, 404, "ohne Einnahmequelle C");
  await pilotEq();
  const g = await (await route.GET(req("GET", "?pilot=1", null, "test-secret"))).json();
  assert.ok(g.gate.length >= 12); assert.equal(g.kriterien.length, G.KRITERIEN.length);
  assert.equal((await route.POST(req("POST", "", { action: "pilot-preis", monatspreis_cent: -1 }, "test-secret"))).status, 400);
  assert.equal((await route.POST(req("POST", "", { action: "pilot-analyse", id: "x", analyse: ANALYSE }, "test-secret"))).status, 404);
});

// ---------- Erster-Kunde-Modus (27.09.2026) ----------
const { erstelleTagesbericht } = await import("../lib/tagesbericht.js");
const BETRIEB = { firma: "Testbetrieb", ort: "Monheim am Rhein", branche: "Friseur", quelle_url: "https://verzeichnis.test/friseur", quelle_datum: "2026-09-27" };

test("Potenziellen Kunden erfassen: Name/Ort/Branche/Quelle Pflicht, keine Doppelten, Aufgabe 'Profil-Analyse' statt Werbe-Nachfassen", async () => {
  const q = await pilotEq();
  await assert.rejects(() => P.potenziellenKundenAnlegen({ ...BETRIEB, quelle_url: "" }), /Quelle/);
  await assert.rejects(() => P.potenziellenKundenAnlegen({ ...BETRIEB, branche: "" }), /Pflicht/);
  const l = await P.potenziellenKundenAnlegen(BETRIEB);
  assert.equal(l.ort, "Monheim am Rhein"); assert.equal(l.branche, "Friseur"); assert.match(l.quelle, /verzeichnis\.test\/friseur \(abgerufen 2026-09-27\)/);
  assert.equal(l.einwilligung, false); assert.equal(l.selbst_angefragt, false);
  await assert.rejects(() => P.potenziellenKundenAnlegen({ ...BETRIEB, firma: "TESTBETRIEB" }), /gibt es schon/);
  const eig = (await tasks.listTasks()).filter(t => t.quelle === "lead:" + l.id);
  assert.deepEqual(eig.map(t => t.title), ["Profil-Analyse: Testbetrieb (Monheim am Rhein) – Google-Profil öffnen und 10 Punkte prüfen"]);
  assert.equal(eig[0].priority, "Hoch");
  const d = await P.pilotDaten();
  assert.equal(d.leads[0].stufe, "POTENZIELL");
  assert.match(d.naechsteAktion.text, /Google-Profil von „Testbetrieb“ öffnen/);
  assert.match((await P.analyseSpeichern(l.id, ANALYSE)).bericht, /PROFIL-CHECK: Testbetrieb \(Friseur, Monheim am Rhein\)/);
  assert.ok(q);
});

test("Stufen Potenziell → Gespräch → Interesse → Kunde → Laufende Leistung und genau EINE nächste Aktion in fester Reihenfolge", () => {
  const S = G.kundenStufe;
  assert.equal(S({ status: "NEU" }), "POTENZIELL"); assert.equal(S({ status: "KONTAKT" }), "GESPRAECH"); assert.equal(S({ status: "INTERESSENT" }), "INTERESSE");
  assert.equal(S({ status: "ANGEBOT" }), "INTERESSE"); assert.equal(S({ status: "KUNDE" }), "KUNDE"); assert.equal(S({ status: "KUNDE", vertrag: { aktiv: true } }), "LAUFEND");
  const A = G.naechstePilotAktion;
  const L1 = { id: 1, firma: "A", status: "NEU" }, L2 = { id: 2, firma: "B", status: "NEU", profil_analyse: {} }, L3 = { id: 3, firma: "C", status: "KONTAKT", profil_analyse: {} }, L4 = { id: 4, firma: "D", status: "INTERESSENT", profil_analyse: {} };
  assert.equal(A([L4, L3, L2, L1]).lead_id, 1, "erst analysieren");
  assert.equal(A([L4, L3, L2]).lead_id, 2, "dann Bericht zeigen");
  assert.equal(A([L4, L3]).lead_id, 3, "dann nachfragen");
  assert.equal(A([L4]).lead_id, 4, "dann unverbindliches Angebot");
  assert.equal(A([{ ...L1, status: "VERLOREN" }]).lead_id, null, "verlorene zählen nicht");
});

test("Tagesbericht zeigt die nächste Pilot-Aktion als Benutzeraktion", () => {
  const b = erstelleTagesbericht({ pilotAktion: { lead_id: 1, text: "Google-Profil von „X“ öffnen" } });
  assert.deepEqual(b.benutzeraktionen.map(x => [x.text, x.ziel]), [["Pilot: Google-Profil von „X“ öffnen", "pilot"]]);
});
