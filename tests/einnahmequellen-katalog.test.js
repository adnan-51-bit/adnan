// Einnahmequellen-Katalog + echte Aufgaben + Tageszentrale (27.09.2026).
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("data:text/javascript," + encodeURIComponent(
  'export async function resolve(s, c, n) { const fix = (s === "next/server" || (s.startsWith(".") && !/\\.[cm]?js$/.test(s))) ? s + ".js" : s; return n(fix, c); }'
));
delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SECRET_KEY;
process.env.MASTER_API_SECRET = "test-secret";
const R = await import("../lib/einnahmequellen-regeln.js");
const eq = await import("../lib/einnahmequellen.js");
const tasks = await import("../lib/master-tasks.js");
const { erstelleTagesbericht, aktivitaetText } = await import("../lib/tagesbericht.js");
const route = await import("../app/api/master/businesses/route.js");
const auth = await import("../lib/auth.js");
beforeEach(() => { eq.resetEinnahmequellenFuerTests(); auth.resetLoginSperreFuerTests(); });

const QUELLE = { quelle: "UWG § 7", url: "https://www.gesetze-im-internet.de/uwg_2004/__7.html", datum: "2026-09-27", aussage: "E-Mail-Werbung ohne Einwilligung ist unzumutbare Belästigung" };

test("Kategorien A–F wie vorgegeben; F ist Werknetz24", () => {
  assert.deepEqual(R.KATEGORIEN.map(([c]) => c), ["A", "B", "C", "D", "E", "F"]);
  assert.equal(R.kategorieName("F"), "Werknetz24"); assert.equal(R.kategorieName("X"), null);
});

test("Quelle: Name, URL, Datum und belegte Aussage sind Pflicht", () => {
  assert.deepEqual(R.pruefeQuelle(QUELLE), QUELLE);
  assert.throws(() => R.pruefeQuelle({ ...QUELLE, aussage: "" }), /belegte Aussage/);
  assert.throws(() => R.pruefeQuelle({ ...QUELLE, url: "gesetze.de" }), /URL/);
  assert.throws(() => R.pruefeQuelle({ ...QUELLE, datum: "27.09.2026" }), /JJJJ-MM-TT/);
});

test("Automatisierungsvorschlag: nur vollständig; sobald Kosten entstehen, ist Freigabe Pflicht; nie aktiv", () => {
  const basis = { was: "Anfragen per Formular sammeln", daten: "Formulareingaben", tool: "Google Forms", kosten: "0 €", risiko: "Datenschutz", freigabe: false };
  assert.deepEqual(R.pruefePlanEintrag(basis), { ...basis, status: "vorgeschlagen" });
  assert.equal(R.pruefePlanEintrag({ ...basis, kosten: "12 € / Monat", freigabe: false }).freigabe, true, "Kosten erzwingen Freigabe");
  assert.throws(() => R.pruefePlanEintrag({ ...basis, tool: "" }), /Welches Tool/);
  assert.throws(() => R.pruefePlanEintrag({ ...basis, freigabe: undefined }), /Benutzerfreigabe/);
});

test("Arbeitspriorität P1–P4 nach Vorgabe (interne Reihenfolge)", () => {
  const null0 = { startkosten_cent: 0 };
  assert.equal(R.arbeitsPrioritaet({ ...null0, schnell_testbar: true, direkte_kunden: true }).stufe, 1);
  assert.equal(R.arbeitsPrioritaet({ ...null0, wiederholbar: true }).stufe, 2);
  assert.equal(R.arbeitsPrioritaet({ ...null0, automatisierungspotenzial: "HOCH", skalierungspotenzial: "MITTEL" }).stufe, 3);
  assert.equal(R.arbeitsPrioritaet({ ...null0, schnell_testbar: true, direkte_kunden: true, komplex: true }).stufe, 4, "komplex schlägt alles");
  assert.equal(R.arbeitsPrioritaet({ startkosten_cent: 0, laufende_kosten_cent: 900, schnell_testbar: true, direkte_kunden: true }).stufe, 4, "laufende Kosten = kostenpflichtig");
  assert.deepEqual(R.arbeitsPrioritaet({ startkosten_cent: null }), { stufe: 4, gruende: ["Startkosten noch unbekannt"] });
});

test("Nachfrage „belegt“ nur mit Quelle; neue Felder validiert; Standard = unbekannt/noch nicht bewertet", async () => {
  const q = await eq.createEinnahmequelle({ name: "Katalog", kategorie: "B" });
  assert.equal(q.nachfrage_status, "UNBEKANNT"); assert.equal(q.rechtspruefung, null); assert.equal(q.laufende_kosten_cent, null); assert.equal(q.automatisierungsstufe, "MANUELL");
  await assert.rejects(() => eq.updateEinnahmequelle(q.id, { nachfrage_status: "BELEGT" }), /nur mit mindestens einer Quelle/);
  await assert.rejects(() => eq.createEinnahmequelle({ name: "x", nachfrage_status: "BELEGT" }), /nur mit mindestens einer Quelle/);
  await assert.rejects(() => eq.updateEinnahmequelle(q.id, { nachfrage_status: "SICHER" }), /ungültig/);
  await assert.rejects(() => eq.updateEinnahmequelle(q.id, { schnell_testbar: "ja" }), /ja\/nein/);
  await assert.rejects(() => eq.updateEinnahmequelle(q.id, { rechtspruefung: "vielleicht" }), /offen/);
  const r = await eq.quelleHinzufuegen(q.id, QUELLE);
  assert.equal(r.quellen_liste.length, 1);
  assert.equal((await eq.updateEinnahmequelle(q.id, { nachfrage_status: "BELEGT", rechtspruefung: true, gewerbepruefung: null, laufende_kosten_cent: 0 })).nachfrage_status, "BELEGT");
  assert.ok(R.pruefstand(r).find(x => x.id === "quellen").ok, "Quellenliste zählt als Prüfschritt");
});

test("Automatisierungsvorschlag wird gespeichert und protokolliert, nicht aktiviert", async () => {
  const q = await eq.createEinnahmequelle({ name: "Plan" });
  const r = await eq.planHinzufuegen(q.id, { was: "Sortierung", daten: "Anfragen", tool: "Tabelle", kosten: "0 €", risiko: "Fehlsortierung", freigabe: true });
  assert.equal(r.automatisierungsplan[0].status, "vorgeschlagen"); assert.equal(r.automatisierungsstufe, "MANUELL", "Stand bleibt manuell");
  assert.ok((await eq.verlaufVon(q.id)).some(v => v.action === "einnahmequelle.plan"));
});

test("Aufgabe erzeugen: echte Aufgabe mit Beschreibung, nächster Aktion, Quelle, Fälligkeit; Statusliste erzwungen", async () => {
  const q = await eq.createEinnahmequelle({ name: "AufgabenKat" });
  const t = await eq.aufgabeErzeugen(q.id, { title: "Rechtslage prüfen", beschreibung: "UWG § 7 lesen", naechste_aktion: "Link öffnen", quelle: QUELLE.url, due_at: "2026-10-01T10:00:00.000Z", priority: "Hoch" });
  assert.equal(t.beschreibung, "UWG § 7 lesen"); assert.equal(t.naechste_aktion, "Link öffnen"); assert.equal(t.quelle, QUELLE.url); assert.equal(t.due_at, "2026-10-01T10:00:00.000Z"); assert.equal(t.status, "Offen"); assert.equal(t.ergebnis, ""); assert.ok(t.created_at);
  for (const s of ["In Arbeit", "Wartet auf Benutzer", "Erledigt", "Gestoppt"]) assert.equal((await tasks.updateTask(t.id, { status: s })).status, s);
  await assert.rejects(() => tasks.updateTask(t.id, { status: "Blockiert" }), /Status ungültig/);
  await assert.rejects(() => tasks.createTask({ title: "x", area: "y", status: "fertig" }), /Status ungültig/);
  assert.equal((await tasks.updateTask(t.id, { ergebnis: "Ergebnis notiert" })).ergebnis, "Ergebnis notiert");
});

test("Tageszentrale: wichtigste Aufgabe, wartende Aufgaben, aktive Einnahmequellen, nächste Benutzeraktion, letzte Aktivitäten", () => {
  const b = erstelleTagesbericht({
    tasks: [{ title: "Niedrig", status: "Offen", priority: "Niedrig" }, { title: "Wichtig", status: "In Arbeit", priority: "Hoch", naechste_aktion: "anrufen" }, { title: "Warte", status: "Wartet auf Benutzer", priority: "Hoch" }, { title: "Stop", status: "Gestoppt", priority: "Hoch" }],
    einnahmequellen: [{ name: "Aktiv", status: "AKTIV" }, { name: "Idee", status: "IDEE" }, { name: "Pause", status: "PAUSE" }],
    audit: [{ action: "einnahmequelle.quelle", created_at: "2026-09-27T08:00:00Z", details: { quelle: "UWG" } }],
  });
  assert.equal(b.wichtigsteAufgabe.text, "Wichtig · Hoch – nächste Aktion: anrufen");
  assert.deepEqual(b.wartendeAufgaben.map(x => x.text), ["Warte"]);
  assert.deepEqual(b.jetztZuTun.map(x => x.text), ["Wichtig · Hoch", "Niedrig · Niedrig"], "Gestoppt ist nicht offen");
  assert.deepEqual(b.aktiveEinnahmequellen.map(x => x.text), ["Aktiv · Einnahme (aktiv)"]);
  assert.deepEqual(b.laufendeEinnahmequellen.map(x => x.text), ["Idee · Idee"]);
  assert.equal(b.naechsteBenutzeraktion.text, "Wartet auf dich: Warte");
  assert.match(b.letzteAktivitaeten[0].text, /Einnahmequelle quelle: UWG/);
  assert.equal(aktivitaetText({ action: "task.created", details: { title: "T" } }), "Aufgabe angelegt: T");
});

const req = (method, query, body, token) => new Request("http://t/api/master/businesses" + query, { method, headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });

test("API: Quelle/Plan nur mit Anmeldung; unvollständige Angaben = 400", async () => {
  assert.equal((await route.POST(req("POST", "", { action: "einnahmequelle-quelle", id: "x", quelle: QUELLE }))).status, 401);
  const id = (await (await route.POST(req("POST", "", { action: "einnahmequelle-anlegen", name: "API-Kat" }, "test-secret"))).json()).einnahmequelle.id;
  assert.equal((await route.POST(req("POST", "", { action: "einnahmequelle-quelle", id, quelle: { ...QUELLE, url: "" } }, "test-secret"))).status, 400);
  assert.equal((await route.POST(req("POST", "", { action: "einnahmequelle-quelle", id, quelle: QUELLE }, "test-secret"))).status, 200);
  assert.equal((await route.POST(req("POST", "", { action: "einnahmequelle-plan", id, vorschlag: { was: "x" } }, "test-secret"))).status, 400);
  const t = await route.POST(req("POST", "", { action: "einnahmequelle-aufgabe", id, title: "A", beschreibung: "B", naechste_aktion: "C", quelle: "D" }, "test-secret"));
  assert.equal(t.status, 201); const tj = (await t.json()).task; assert.equal(tj.beschreibung, "B"); assert.equal(tj.naechste_aktion, "C");
});
