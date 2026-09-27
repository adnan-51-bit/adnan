// Pilot Anfragen-Service (27.09.2026): Analyse, Entwuerfe, Ablauf, Test-Kennzeichnung, Archiv, Angebotsentwurf, Freigaben.
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("data:text/javascript," + encodeURIComponent(
  'export async function resolve(s, c, n) { const fix = (s === "next/server" || (s.startsWith(".") && !/\\.[cm]?js$/.test(s))) ? s + ".js" : s; return n(fix, c); }'
));
delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SECRET_KEY;
process.env.MASTER_API_SECRET = "test-secret";
const R = await import("../lib/anfragen-regeln.js");
const A = await import("../lib/anfragen.js");
const eq = await import("../lib/einnahmequellen.js");
const F = await import("../lib/freigaben.js");
const tasks = await import("../lib/master-tasks.js");
beforeEach(() => { eq.resetEinnahmequellenFuerTests(); F.resetFreigabenFuerTests(); A.resetAnfragenFuerTests(); });
const eqAnlegen = () => eq.createEinnahmequelle({ name: "Anfragen-Service für kleine Betriebe", kategorie: "A", angebot: "Anfragen-Postfach betreuen" });
const TEST = { quelle: "Interner Testfall (fiktiv)", unternehmen: "Testbetrieb (fiktiv)", ist_test: true,
  text: "Hallo, bei uns ist die Heizung kaputt und es ist dringend. Können Sie heute noch vorbeikommen?\nGrüße\nMax Test\nmax.test@example.com" };

test("Analyse: Kategorie, Dringlichkeit, Kontakt, fehlende Angaben – nur Regeln, als Vorschlag", () => {
  const a = R.analysiere(TEST.text);
  assert.equal(a.kategorie, "REKLAMATION"); assert.equal(a.dringlichkeit, "HOCH"); assert.equal(a.prioritaet, "Hoch");
  assert.equal(a.kontakt.email, "max.test@example.com"); assert.match(a.hinweis, /bitte prüfen/);
  const b = R.analysiere("Was kostet bei Ihnen eine Wartung der Heizung?");
  assert.equal(b.kategorie, "ANGEBOT"); assert.equal(b.dringlichkeit, "MITTEL"); assert.ok(b.fehlt.includes("Kontaktweg (E-Mail oder Telefon)")); assert.ok(b.fehlt.some(f => /Ort/.test(f)));
  assert.equal(R.analysiere("Wie lange haben Sie am Samstag geöffnet").kategorie, "TERMIN");
  assert.equal(R.analysiere("Ich habe eine allgemeine Frage zu Ihrem Service?").dringlichkeit, "NIEDRIG");
  assert.throws(() => R.analysiere("kurz"), /zu kurz/);
});

test("Entwürfe: Antwort, Rückfrage, Angebotstext, Zusammenfassung, nächste Aktion – ohne Preise, ohne Zusagen", () => {
  const a = R.analysiere("Was kostet eine Wartung? Bitte um Angebot.");
  const e = R.entwuerfe({ unternehmen: "Testbetrieb" }, a);
  for (const k of ["antwort", "rueckfrage", "angebotstext", "zusammenfassung", "naechste_aktion"]) assert.ok(e[k]?.text, k);
  assert.doesNotMatch(e.antwort.text + e.angebotstext.text, /\d+\s?(€|euro)/i, "keine erfundenen Preise");
  assert.match(e.angebotstext.text, /\[Preis – legt der Betrieb fest\]/); assert.match(e.angebotstext.text, /erst nach Ihrer Zusage verbindlich/);
  assert.match(e.erstellt_mit, /0 €/);
});

test("Ablauf: Anfrage → Analyse → Entwurf → Aufgabe (TEST, wartet auf Freigabe) → Abschluss → Archiv (nichts gelöscht)", async () => {
  await eqAnlegen();
  let a = await A.anfrageErfassen(TEST);
  assert.equal(a.status, "WARTET_AUF_FREIGABE"); assert.equal(a.ist_test, true); assert.equal(a.kategorie, "REKLAMATION");
  assert.deepEqual(a.verlauf.map(v => v.text.split(":")[0].split(" ")[0]), ["Anfrage", "Analysiert", "Entwürfe", "Aufgabe"]);
  const t = (await tasks.listTasks()).find(x => String(x.id) === a.task_id);
  assert.match(t.title, /^\[TEST\] Anfrage beantworten: Testbetrieb/); assert.equal(t.status, "Wartet auf Benutzer"); assert.match(t.beschreibung, /TESTFALL/);
  await assert.rejects(() => A.anfrageAbschliessen(a.id, ""), /Ergebnis/);
  a = await A.anfrageAbschliessen(a.id, "Testfall: Entwurf geprüft, nicht gesendet");
  assert.equal(a.status, "ERLEDIGT"); assert.equal((await tasks.listTasks()).find(x => String(x.id) === a.task_id).status, "Erledigt");
  a = await A.anfrageArchivieren(a.id, "Testfall nach dem Test archiviert");
  assert.equal(a.status, "ARCHIVIERT");
  const d = await A.anfragenDaten();
  assert.equal(d.anfragen.length, 0); assert.equal(d.archiv.length, 1, "archiviert, nicht gelöscht");
  assert.deepEqual(d.zahlen, { echt: 0, test: 1, offen: 0, erledigt: 0 }, "Testfälle zählen nie als echte Anfragen");
});

test("Keine erfundenen Anfragen: Quelle + Unternehmen Pflicht; echte Anfragen nur mit echtem Kunden", async () => {
  await eqAnlegen();
  await assert.rejects(() => A.anfrageErfassen({ ...TEST, quelle: "" }), /Quelle/);
  await assert.rejects(() => A.anfrageErfassen({ ...TEST, unternehmen: "" }), /Unternehmen/);
  await assert.rejects(() => A.anfrageErfassen({ ...TEST, ist_test: false }), /echten Kunden/);
});

test("Archivieren einer offenen Test-Anfrage stoppt ihre Aufgabe", async () => {
  await eqAnlegen();
  const a = await A.anfrageErfassen(TEST);
  await A.anfrageArchivieren(a.id, "Test beendet");
  const t = (await tasks.listTasks()).find(x => String(x.id) === a.task_id);
  assert.equal(t.status, "Gestoppt"); assert.match(t.ergebnis, /archiviert/);
});

test("Angebotsentwurf: nur Vorschlag, kein fester Preis; Zahl bei erwarteten Einnahmen nur mit Quelle", async () => {
  await eqAnlegen();
  await assert.rejects(() => A.angebotsentwurfSpeichern({ leistung: "Anfragen bearbeiten", erwartete_einnahmen: "500 € im Monat" }), /Quelle/);
  const e = await A.angebotsentwurfSpeichern({ leistung: "Eingehende Anfragen sortieren und Antwortentwürfe vorbereiten", rhythmus: "MONATLICH" });
  assert.equal(e.verbindlich, false); assert.equal(e.moeglicher_preis, "noch zu prüfen"); assert.equal(e.erwartete_einnahmen, "noch zu prüfen");
  assert.equal((await A.anfragenDaten()).angebotsentwurf.rhythmus, "MONATLICH");
});

test("Wartet auf mich: Auftragsverarbeitung (Art. 28 DSGVO) einmalig als RECHT-Freigabe; Kunden-Stufen nur aus echten Leads", async () => {
  await eqAnlegen();
  await A.anfragenDaten(); const d = await A.anfragenDaten();
  const avv = (await F.listFreigaben()).filter(f => f.bezug_typ === "eq-avv");
  assert.equal(avv.length, 1); assert.equal(avv[0].art, "RECHT"); assert.match(avv[0].beschreibung, /dsgvo-gesetz\.de\/art-28/);
  assert.equal(d.wartetAufMich.length, 1);
  assert.deepEqual(d.kunden.map(k => [k.id, k.liste.length]), [["INTERESSENT", 0], ["PILOTKUNDE", 0], ["AKTIV", 0], ["BEENDET", 0]]);
  assert.equal(R.kundenStufe({ status: "KUNDE", pilot_crm: { pilotkunde: true } }), "PILOTKUNDE");
  assert.equal(R.kundenStufe({ status: "KUNDE" }), "AKTIV"); assert.equal(R.kundenStufe({ status: "NEU" }), null);
});
