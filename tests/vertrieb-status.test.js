// Sales-Automat B2/B3 (28.09.2026): Vertriebsstatus im Morgenbericht, "WARTET AUF MICH", Selbstpruefung.
import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("data:text/javascript," + encodeURIComponent(
  'export async function resolve(s, c, n) { const fix = (s === "next/server" || (s.startsWith(".") && !/\\.[cm]?js$/.test(s))) ? s + ".js" : s; return n(fix, c); }'
));
delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SECRET_KEY;
const { vertriebStatus } = await import("../lib/vertrieb-status.js");
const { erstelleTagesbericht } = await import("../lib/tagesbericht.js");

const JETZT = new Date("2026-09-28T10:00:00+02:00");
const vor = tage => new Date(+JETZT - tage * 86400000).toISOString();
const ana = punkte => ({ punkte, werte: { kategorie: "ja", kontakt: "ja" }, verbesserungen: [{ id: "x", text: "t", dringend: true }] });
const lauf = (aktion, t = JETZT) => ({ action: "automation.lauf", created_at: new Date(t).toISOString(), details: { aktion, ergebnis: "ok" } });

function daten() {
  const leads = [
    { id: "neu", firma: "Neu GmbH", ort: "Monheim", status: "NEU", erstellt_am: JETZT.toISOString() },
    { id: "alt", firma: "Alt KG", ort: "Monheim", status: "NEU", erstellt_am: vor(5) },
    { id: "g1", firma: "Café Eins", ort: "Monheim", status: "NEU", erstellt_am: vor(9), profil_analyse: ana(30) },
    { id: "g2", firma: "Salon Zwei", ort: "Monheim", status: "NEU", erstellt_am: vor(9), profil_analyse: ana(80) },
    { id: "f1", firma: "Frei Alt", ort: "Monheim", status: "NEU", erstellt_am: vor(9), profil_analyse: ana(40), pilot_crm: { kontakt_freigegeben: true, kontakt_freigabe_am: vor(4) } },
    { id: "f2", firma: "Frei Neu", ort: "Monheim", status: "NEU", erstellt_am: vor(9), profil_analyse: ana(40), pilot_crm: { kontakt_freigegeben: true, kontakt_freigabe_am: vor(1), brief_am: vor(1) } },
    { id: "i1", firma: "Interessent AG", ort: "Monheim", status: "INTERESSENT", erstellt_am: vor(9), profil_analyse: ana(40), einwilligung: true,
      pilot_crm: { kontakt_freigegeben: true, brief_am: vor(3), antworten: [{ wahl: "gespraech", datum: vor(0.2), name: "Frau A", telefon: "0171 1", wunsch: "Di" }] } },
    { id: "s1", firma: "Nein Danke", ort: "Monheim", status: "GESPERRT", erstellt_am: vor(9), profil_analyse: ana(40), pilot_crm: { antworten: [{ wahl: "kein-interesse", datum: vor(0.5) }] } },
  ];
  const tasks = [
    { id: 1, title: "📞 Interessent meldet sich: Interessent AG – Frau A zurückrufen", status: "Wartet auf Benutzer", quelle: "lead:i1", due_at: vor(-1), naechste_aktion: "Tel. 0171 1" },
    { id: 2, title: "Brief einwerfen: Frei Neu", status: "Offen", quelle: "lead:f2", due_at: vor(-2) },
  ];
  const freigaben = [
    { status: "OFFEN", bezug_typ: "lead-kontakt", bezug_id: "g1", titel: "Kontakt zu „Café Eins“ freigeben?" },
    { status: "OFFEN", bezug_typ: "lead-kontakt", bezug_id: "g2", titel: "Kontakt zu „Salon Zwei“ freigeben?" },
    { status: "OFFEN", bezug_typ: "angebot", bezug_id: "i1", titel: "Angebot für „Interessent AG“ freigeben?" },
  ];
  return { leads, tasks, freigaben, audit: [lauf("lead-recherche")], jetzt: JETZT };
}

test("Zahlen und neue Antworten stammen nur aus den gespeicherten Daten", () => {
  const v = vertriebStatus(daten());
  assert.equal(v.zahlen.leads, 8); assert.equal(v.zahlen.neuHeute, 1); assert.equal(v.zahlen.ohneAnalyse, 2);
  assert.equal(v.zahlen.kontaktFreigegeben, 2); assert.equal(v.zahlen.briefe, 2); assert.equal(v.zahlen.antworten, 2);
  assert.equal(v.zahlen.interessenten, 1); assert.equal(v.zahlen.kunden, 0); assert.equal(v.zahlen.keinInteresse, 1);
  assert.equal(v.neueAntworten.length, 2);
  assert.match(v.neueAntworten.join(), /Interessent AG: möchte ein Gespräch – Frau A, Tel\. 0171 1 \(Di\)/);
  assert.match(v.neueAntworten.join(), /Nein Danke: kein Interesse/);
  assert.match(v.zeile, /8 Leads \(1 neu heute, 2 ohne Analyse\).*1 Interessenten.*0 Kunden/);
});

test("WARTET AUF MICH: Rückruf zuerst, dann Preis/Angebot, Briefe, Freigaben (höchste Priorität zuerst)", () => {
  const w = vertriebStatus(daten()).wartetAufMich;
  assert.ok(w.every(t => t.startsWith("WARTET AUF MICH: ")));
  assert.match(w[0], /Interessent AG – Frau A zurückrufen – Tel\. 0171 1/);
  assert.match(w[1], /Preis festlegen/); assert.match(w[2], /Angebot für „Interessent AG“/);
  assert.match(w[3], /1 Brief\(e\) drucken.*Frei Alt/); assert.match(w[4], /1 Brief\(e\) einwerfen: Frei Neu/);
  assert.match(w[5], /2 Kontakt-Freigabe\(n\).*zuerst: Café Eins, Salon Zwei/);
  const oL = daten(); oL.leads.push({ id: "f3", firma: "Foto Privat", branche: "Fotografie", ort: "Monheim", status: "NEU", erstellt_am: vor(9), profil_analyse: ana(20), pilot_crm: { kontakt_freigegeben: true, kontakt_freigabe_am: vor(1), ladenlokal: false } });
  assert.match(vertriebStatus(oL).wartetAufMich.find(t => /drucken/.test(t)), /1 Brief\(e\) drucken.*: Frei Alt \(1 weitere ohne Ladenlokal zurückgestellt\)$/);
  const mitPreis = vertriebStatus({ ...daten(), monatspreis_cent: 4900 }).wartetAufMich;
  assert.ok(!mitPreis.some(t => /Preis festlegen/.test(t)));
});

test("Selbstprüfung: Widersprüche sind Fehler, Stockendes sind Hinweise", () => {
  const d = daten();
  let b = vertriebStatus(d).befunde.map(x => x.art + ": " + x.text);
  assert.deepEqual(b.filter(x => x.startsWith("fehler")), [], "Normalfall ohne Fehler");
  assert.ok(b.includes("hinweis: Frei Alt: seit über 3 Tagen freigegeben, aber noch kein Brief"));
  assert.ok(b.includes("hinweis: Alt KG: seit über 3 Tagen ohne Profil-Analyse"));
  assert.ok(!b.some(x => /Neu GmbH|Frei Neu/.test(x)));
  // Fehlerfälle
  d.tasks = [{ id: 9, title: "Brief einwerfen: Nein Danke", status: "Offen", quelle: "lead:s1" }];
  d.leads.push({ id: "dup", firma: "Café  Eins", ort: "Monheim", status: "NEU", erstellt_am: vor(1) });
  d.audit = [];
  b = vertriebStatus(d).befunde.filter(x => x.art === "fehler").map(x => x.text);
  assert.ok(b.includes("Interessent AG: Antwort „Gespräch“ ohne Rückruf-Aufgabe"));
  assert.ok(b.includes("Nein Danke: gesperrt (kein Kontakt gewünscht), aber 1 offene Aufgabe(n)"));
  assert.ok(b.some(x => /Doppelter Lead: Café {2}Eins/.test(x)));
  assert.ok(b.includes("Lead-Recherche ist heute nicht gelaufen (täglich 07:00)"));
  assert.ok(!vertriebStatus({ ...d, jetzt: new Date("2026-09-28T07:30:00+02:00") }).befunde.some(x => /Recherche/.test(x.text)), "vor 9 Uhr noch kein Befund");
  // überfälliger Rückruf
  const o = daten(); o.tasks[0].due_at = vor(1);
  assert.ok(vertriebStatus(o).befunde.some(x => x.art === "hinweis" && /Rückruf überfällig: Interessent AG/.test(x.text)));
});

test("Tagesbericht: Vertrieb steht zuerst, Fehler der Selbstprüfung zählen als Fehler", () => {
  const d = daten(); d.audit = [];
  const vertrieb = vertriebStatus(d);
  const b = erstelleTagesbericht({ jetzt: JETZT, vertrieb, tasks: d.tasks });
  assert.deepEqual(b.bericht.slice(0, 4).map(z => z[0]), ["Vertriebsstatus", "Neue Antworten (letzte 24 Stunden)", "WARTET AUF MICH (Vertrieb)", "Vertrieb – Selbstprüfung"]);
  assert.match(b.bericht[2][1], /^Interessent meldet sich: Interessent AG – Frau A zurückrufen/);
  assert.ok(b.fehler.some(f => f.text === "Vertrieb: Lead-Recherche ist heute nicht gelaufen (täglich 07:00)" && f.ziel === "pilot"));
  assert.ok(!b.fehler.some(f => /ohne Profil-Analyse/.test(f.text)), "Hinweise sind keine Fehler");
  const ohne = erstelleTagesbericht({ jetzt: JETZT });
  assert.equal(ohne.bericht[0][0], "Neue Aufgaben heute", "ohne Pilot bleibt der Bericht wie bisher");
});
