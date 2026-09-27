// Teil 5 (27.09.2026): Engine, Phasen/GESTOPPT, Finanz-Monitor + Nachweispflicht, Aufgaben-/E-Mail-/Content-Zentrale.
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
const { pipelineStand, pipelineAufgabe, PIPELINE } = await import("../lib/eq-pipeline.js");
const fin = await import("../lib/master-finance.js");
const tasks = await import("../lib/master-tasks.js");
const Z = await import("../lib/zentralen.js");
const L = await import("../lib/leads.js");
const F = await import("../lib/freigaben.js");
const { fuehreAktionAus } = await import("../lib/aktion-ausfuehren.js");
beforeEach(() => { eq.resetEinnahmequellenFuerTests(); L.resetLeadsFuerTests(); F.resetFreigabenFuerTests(); });

test("Phasen: IDEEN/RECHERCHE/TEST/AKTIV/PAUSE/ERFOLGREICH/GESTOPPT aus dem genauen Status", () => {
  assert.deepEqual(R.PHASEN, ["IDEEN", "RECHERCHE", "TEST", "AKTIV", "PAUSE", "ERFOLGREICH", "GESTOPPT"]);
  const p = s => R.phase({ status: s });
  assert.deepEqual(["IDEE", "PRUEFUNG", "LEADS_KUNDEN", "EINNAHMEN", "PAUSE", "SKALIEREN", "GESTOPPT"].map(p), ["IDEEN", "RECHERCHE", "TEST", "AKTIV", "PAUSE", "ERFOLGREICH", "GESTOPPT"]);
  assert.ok(!R.EQ_ABLAUF.includes("GESTOPPT")); assert.ok(R.ruht({ status: "GESTOPPT" }));
});

test("GESTOPPT: Daten bleiben, vorheriger Status gemerkt, wieder startbar", async () => {
  const q = await eq.createEinnahmequelle({ name: "Stopp-Test" });
  await eq.setzeEqStatus(q.id, "PRUEFUNG");
  const s = await eq.setzeEqStatus(q.id, "GESTOPPT");
  assert.equal(s.status, "GESTOPPT"); assert.equal(s.status_vor_pause, "PRUEFUNG"); assert.equal(s.name, "Stopp-Test");
  assert.equal((await eq.starteEinnahmequelle(q.id)).status, "PRUEFUNG");
});

test("Engine: 10 Schritte nur aus echten Daten; erster offener Schritt wird Aufgabe; Kontakt/Geld = Wartet auf Benutzer", () => {
  assert.equal(PIPELINE.length, 10);
  assert.deepEqual(PIPELINE.filter(s => !s.frei).map(s => s.id), ["kontakt", "interessent", "kunde", "einnahme", "optimierung"]);
  const q = { id: "q", name: "Q", status: "PRUEFUNG", quellen_liste: [{}], angebot: "x", zielgruppe: "y", entwuerfe: [{}] };
  let st = pipelineStand(q, { leads: [] });
  assert.equal(st.aktuell.id, "lead"); assert.equal(st.erledigt, 3);
  let a = pipelineAufgabe(q, {});
  assert.equal(a.status, "Offen"); assert.match(a.title, /^\[Engine\] Q: 4\/10 Lead/);
  const leads = [{ id: "l1", einnahmequelle_id: "q", status: "NEU" }];
  a = pipelineAufgabe(q, { leads });
  assert.equal(a.status, "Wartet auf Benutzer"); assert.match(a.beschreibung, /WARTET AUF FREIGABE/);
  assert.equal(pipelineAufgabe(q, { leads, freigaben: [{ status: "OFFEN", bezug_id: "l1" }] }), null, "schon als Entscheidung offen → kein Doppel");
  assert.equal(pipelineAufgabe(q, { leads, tasks: [{ einnahmequelle_id: "q", title: "[Engine] Q: alt", status: "Offen" }] }), null, "höchstens eine offene Engine-Aufgabe");
  assert.equal(pipelineAufgabe({ ...q, status: "GESTOPPT" }, {}), null);
  const bezahlt = [{ einnahmequelle_id: "q", kind: "income", status: "confirmed", amount: 10 }, { einnahmequelle_id: "q", kind: "income", status: "confirmed", amount: 99, ist_test: true }];
  st = pipelineStand(q, { leads: [{ ...leads[0], status: "KUNDE" }], finance: bezahlt });
  assert.equal(st.aktuell.id, "auswertung");
  assert.equal(pipelineStand(q, { leads: [{ ...leads[0], status: "KUNDE" }], finance: [bezahlt[1]] }).aktuell.id, "einnahme", "Testbuchung zählt nie");
});

test("Engine-Lauf: vor der ersten Einnahme nur die Fokus-Einnahmequelle, keine Doppel-Aufgaben", async () => {
  const a = await eq.createEinnahmequelle({ name: "Fokus", zielgruppe: "z", angebot: "a" });
  const b = await eq.createEinnahmequelle({ name: "Andere", zielgruppe: "z", angebot: "a" });
  await eq.setzeEqStatus(a.id, "PRUEFUNG"); await eq.setzeEqStatus(b.id, "PRUEFUNG");
  await L.leadAnlegen({ name: "Echter Lead", einnahmequelle_id: a.id, einwilligung: false, quelle: "https://beispiel.test" }, { ohneAufgabe: true });
  const r = await fuehreAktionAus("engine");
  assert.equal(r.ok, true);
  const eng = (await tasks.listTasks()).filter(t => t.title.startsWith("[Engine] "));
  assert.equal(eng.filter(t => t.einnahmequelle_id === b.id).length, 0, "keine Aufgabe für Nicht-Fokus");
  assert.equal(eng.filter(t => t.einnahmequelle_id === a.id).length, 1);
  await fuehreAktionAus("engine");
  assert.equal((await tasks.listTasks()).filter(t => t.title.startsWith("[Engine] ") && t.einnahmequelle_id === a.id).length, 1, "kein Doppel");
});

test("Finanzen: bestätigte Einnahme nur mit Nachweis; offen/Test zählen nie als Einnahme; Monitor je Monat/Quelle/Kostenquelle", async () => {
  await assert.rejects(() => fin.createFinance({ kind: "income", amount: 50, category: "Einnahmequelle", status: "confirmed" }), /Zahlungsnachweis/);
  await assert.rejects(() => fin.createFinance({ kind: "income", amount: 50, category: "Einnahmequelle", status: "confirmed", nachweis: "TAN 123456" }), /TAN/);
  const ok = await fin.createFinance({ kind: "income", amount: 50, category: "Einnahmequelle", status: "confirmed", nachweis: "Kontoauszug 01.10.", occurred_at: "2026-10-01T10:00:00Z", einnahmequelle_id: "q" });
  assert.match(ok.source, /Zahlungsnachweis: Kontoauszug/);
  await fin.createFinance({ kind: "income", amount: 20, category: "Einnahmequelle", status: "pending", occurred_at: "2026-10-02T10:00:00Z" });
  const m = fin.finanzMonitor([
    { kind: "income", amount: 50, status: "confirmed", occurred_at: "2026-10-01", einnahmequelle_id: "q" },
    { kind: "income", amount: 20, status: "pending", occurred_at: "2026-10-02", einnahmequelle_id: "q" },
    { kind: "expense", amount: 5, status: "confirmed", occurred_at: "2026-09-20", category: "Hosting" },
    { kind: "income", amount: 999, status: "confirmed", occurred_at: "2026-10-01", ist_test: true },
    { kind: "income", amount: 7, status: "cancelled", occurred_at: "2026-10-01" }], [{ id: "q", name: "Pilot" }]);
  assert.equal(m.einnahmen_cent, 5000); assert.equal(m.offen_cent, 2000); assert.equal(m.kosten_cent, 500); assert.equal(m.gewinn_cent, 4500); assert.equal(m.ausgeschlossen, 2);
  assert.deepEqual(m.monate.map(x => [x.monat, x.einnahmen_cent, x.kosten_cent, x.offen_cent]), [["2026-10", 5000, 0, 2000], ["2026-09", 0, 500, 0]]);
  assert.equal(m.jeEq.find(x => x.id === "q").name, "Pilot"); assert.deepEqual(m.kostenQuellen, [{ kategorie: "Hosting", kosten_cent: 500 }]);
});

test("Erledigte Aufgaben werden automatisch dokumentiert – vorhandenes Ergebnis bleibt", async () => {
  const t = await tasks.createTask({ title: "Doku-Test", area: "Test", business_id: "master", priority: "Mittel" });
  assert.match((await tasks.updateTask(t.id, { status: "Erledigt" })).ergebnis, /^Erledigt am /);
  const u = await tasks.createTask({ title: "Mit Ergebnis", area: "Test", business_id: "master", priority: "Mittel", ergebnis: "Kunde angerufen" });
  assert.equal((await tasks.updateTask(u.id, { status: "Erledigt", ergebnis: "" })).ergebnis, "Kunde angerufen");
});

test("Aufgaben-Zentrale: Heute / automatisch erledigt / Wartet auf mich / Fehler / Erfolgreich / nächste Aktion", () => {
  const jetzt = new Date("2026-09-27T10:00:00Z");
  const z = Z.aufgabenZentrale({ jetzt,
    tasks: [{ id: 1, title: "Heute fällig", status: "Offen", priority: "Hoch", due_at: "2026-09-27T08:00:00Z" }, { id: 2, title: "Alt", status: "Offen", priority: "Mittel", due_at: "2026-09-20T08:00:00Z" },
      { id: 3, title: "Später", status: "Offen", priority: "Mittel", due_at: "2026-10-20T08:00:00Z" }, { id: 4, title: "Warte", status: "Wartet auf Benutzer", priority: "Hoch" },
      { id: 5, title: "Fertig", status: "Erledigt", updated_at: "2026-09-27T09:00:00Z", ergebnis: "ok", owner: "Claude / Zentrale" }],
    audit: [{ action: "automation.lauf", created_at: "2026-09-27T07:00:00Z", details: { name: "Engine", ergebnis: "ok", zusammenfassung: "1 Aufgabe" } }, { action: "automation.lauf", created_at: "2026-09-27T07:00:00Z", details: { name: "Quellen", ergebnis: "fehler", fehler: "404" } }],
    freigaben: [{ status: "OFFEN", titel: "Preis festlegen?" }] });
  assert.deepEqual(z.heute.map(x => x.text), ["Heute fällig", "Alt · überfällig"]);
  assert.deepEqual(z.wartetAufMich.map(x => x.text), ["Preis festlegen?", "Warte"]);
  assert.deepEqual(z.fehler.map(x => x.text), ["Quellen – fehlgeschlagen", "Überfällig: Alt"]);
  assert.match(z.fehler[0].details[0], /404/, "Fehlertext bleibt in den Details");
  assert.equal(z.automatischErledigt.length, 2); assert.deepEqual(z.erfolgreich.map(x => x.text), ["Fertig"]);
  assert.ok(z.erfolgreich[0].details.includes("Ergebnis: ok"));
  assert.match(z.naechsteAktion.text, /Preis festlegen/);
});

test("E-Mail-Zentrale + Lead-Zeile: Entwürfe/Eingang/Follow-ups, nie automatischer Versand; alle Lead-Felder", () => {
  const leads = [{ id: "a", name: "Anna", firma: "Salon A", email: "a@x.de", quelle: "Anfrage Formular", status: "INTERESSENT", selbst_angefragt: true, einwilligung: true, erstellt_am: "2026-09-27", naechster_schritt: "Angebot",
    nachrichten: [{ richtung: "rein", typ: "antwort", text: "Was kostet das?", kategorie: "FRAGE", bearbeitet: false, datum: "2026-09-27" }, { richtung: "raus", typ: "entwurf", art: "erstantwort", betreff: "Re", senden_erlaubt: true }] },
    { id: "b", name: "Betrieb B", status: "NEU", selbst_angefragt: false, einwilligung: false, nachrichten: [] }];
  const e = Z.emailZentrale({ leads, tasks: [{ id: 1, title: "Lead nachfassen: Anna", status: "Offen", due_at: "2026-09-01" }], jetzt: new Date("2026-09-27") });
  assert.equal(e.vorlagen.length, 4); assert.equal(e.eingang.length, 1); assert.equal(e.entwuerfe[0].art, "Antwort auf Anfrage");
  assert.equal(e.followups[0].ueberfaellig, true); assert.equal(e.status.kontaktGesperrt, 1); assert.match(e.versand, /Kein automatischer Versand/);
  const z = Z.leadZeile(leads[0]);
  for (const k of ["wer", "quelle", "kontakt", "interesse", "status", "naechste_aktion", "notiz", "datum", "ergebnis"]) assert.ok(k in z, k);
  assert.equal(z.wer, "Salon A"); assert.equal(z.interesse, "FRAGE"); assert.equal(z.status, "Interessent");
});

test("Content-Zentrale: Ideen, Video-Ideen, Skripte, Texte, Titel, Affiliate-Kennzeichnung, Status, Ergebnisse", () => {
  const c = Z.contentZentrale([
    { id: 1, titel: "Idee", status: "IDEE", typ: "BEITRAG" }, { id: 2, titel: "Video", status: "SKRIPT", typ: "VIDEO", skript: "Szene 1" },
    { id: 3, titel: "Werbung", status: "PRUEFUNG", typ: "WERBETEXT", werbetext: "x", werbung: true, beschreibung: "Anzeige: …" },
    { id: 4, titel: "Online", status: "REICHWEITE", typ: "VIDEO", veroeffentlichung: [{}], kennzahlen: [{ aufrufe: 120, klicks: 3, leads: 0, einnahmen_cent: 0 }] },
    { id: 5, titel: "Weg", status: "VERWORFEN" }]);
  assert.deepEqual(c.ideen.map(x => x.id), [1]); assert.deepEqual(c.videoIdeen.map(x => x.id), [2]); assert.deepEqual(c.skripte.map(x => x.id), [2]);
  assert.deepEqual(c.fertigeTexte.map(x => x.id), [3]); assert.equal(c.affiliate[0].gekennzeichnet, true);
  assert.deepEqual(c.veroeffentlichung, { wartetAufFreigabe: 1, freigegeben: 0, veroeffentlicht: 1 });
  assert.equal(c.ergebnisse[0].aufrufe, 120); assert.ok(!c.titel.includes("Weg"));
});

test("Aufgaben-Zentrale kompakt: gleiche Läufe zusammengefasst (×n), jeder Lauf bleibt in den Details", () => {
  const jetzt = new Date("2026-09-27T10:00:00Z");
  const lauf = (h, z) => ({ action: "automation.lauf", created_at: `2026-09-27T0${h}:00:00Z`, details: { name: "Tagesbericht erstellen", ergebnis: "ok", zusammenfassung: z } });
  const z = Z.aufgabenZentrale({ jetzt, audit: [lauf(5, "A"), lauf(6, "B"), lauf(7, "https://sehr-lange-url.test/…")] });
  assert.deepEqual(z.automatischErledigt.map(x => [x.text, x.anzahl]), [["Tagesbericht erstellen ×3", 3]]);
  assert.equal(z.automatischErledigt[0].details.length, 3); assert.match(z.automatischErledigt[0].details[2], /sehr-lange-url/);
});
