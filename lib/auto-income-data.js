// AUTO-INCOME (01.10.2026): eigener Betrieb in der Master-Zentrale, vollständig getrennt von
// Werknetz24 und E-Commerce. Jeder Datensatz trägt business_id "auto-income".
//
// Datenquelle: Das AUTO-INCOME-Projekt liegt privat und lokal auf Adnans Rechner (eigener
// Projektordner mit eigenem Git). Eine Live-Verbindung von Vercel dorthin gibt es nicht, deshalb
// ist dies ein SNAPSHOT, den Claude nach jedem Arbeitszyklus aktualisiert (Feld "stand").
// Dieses Repository ist öffentlich: hier stehen nur Kennzahlen und Status, keine persönlichen
// Angaben und keine Projektdokumente.
// Konventionen: 0 = gemessen bzw. dokumentiert 0. "KEINE DATEN" = es gibt keine Angabe.
// "NICHT ANGESCHLOSSEN" = keine Datenquelle verbunden. Nichts wird geschätzt.

export const AUTO_INCOME_ID = "auto-income";
const B = AUTO_INCOME_ID;

export const MESSSTUFEN = [
  [0, "Noch nicht getestet"],
  [1, "Test läuft"],
  [2, "Erste Daten vorhanden"],
  [3, "Messbares Ergebnis"],
  [4, "Wiederholbares Ergebnis"],
  [5, "Tatsächliche Einnahme"],
];

const SNAPSHOT = {
  business_id: B,
  stand: "2026-10-01T21:45:00+02:00",
  quelle: "Snapshot aus dem privaten AUTO-INCOME-Projektordner (MASTER_STATUS, RESULTS, PROJECT_STATUS), gepflegt durch Claude",
  liveVerbindung: "NICHT ANGESCHLOSSEN",

  betrieb: {
    business_id: B,
    ampel: "🟡",
    status: "Wartet auf Antworten",
    grund: "TEST_002C läuft bis 04.10.2026; 7 von 10 Angeschriebenen haben noch nicht geantwortet",
    letzterSystemcheck: "NICHT ANGESCHLOSSEN",
    letzterArbeitszyklus: "01.10.2026 – Arbeitsschritt 17 (Kennzahlen TEST_002C berechnet)",
  },

  // Geldwerte in Cent. Alle sind dokumentiert 0 (kein Test mit Monetarisierung lief).
  geld: {
    business_id: B,
    einnahmen_cent: 0,
    kosten_cent: 0,
    provisionen_cent: 0,
    auszahlungen_cent: 0,
    gewinn_cent: 0,
    offene_auszahlungen_cent: 0,
    umsatzStatus: "NOCH KEIN UMSATZ",
  },

  aktuellerTest: "TEST_002C",

  tests: [
    { business_id: B, id: "TEST_002C", status: "🟡 Läuft", ziel: "Interesse am Thema „Stromanbieter wechseln“ messen (anonyme Kurzumfrage per Einzelnachricht, ohne Verkauf, ohne Link)",
      start: "2026-10-01", ende: "2026-10-04", kosten_cent: 0, einnahmen_cent: 0, angeschrieben: 10, antworten: 3, interessenten: "nicht bekannt",
      quote: "30 % (3 / 10 × 100)", messstufe: 2,
      ergebnis: "3 Antworten in den Kategorien Ja / Nein / Vielleicht (je 1). Der Fragenbezug wurde nicht angegeben, deshalb ist Interesse nicht bekannt.",
      blocker: "keiner", naechsterSchritt: "Weitere Antworten bis 04.10.2026 an Claude geben (Kategorie genügt), danach Abschluss-Auswertung" },
    { business_id: B, id: "TEST_003", status: "⚪ Vorgeschlagen", ziel: "Erste echte Auszahlung über kleine Online-Aufträge (Crowdworking-Plattform)",
      start: null, ende: null, kosten_cent: 0, einnahmen_cent: 0, angeschrieben: null, antworten: null, interessenten: null, quote: null, messstufe: 0,
      ergebnis: "nicht gestartet", blocker: "Registrierung nur durch den Inhaber", naechsterSchritt: "Entscheidung, ob der Test starten soll" },
    { business_id: B, id: "TEST_002B", status: "🔴 Blockiert", ziel: "Nachfrage über einen informativen Pinterest-Pin ohne Affiliate-Link messen",
      start: null, ende: null, kosten_cent: 0, einnahmen_cent: 0, angeschrieben: null, antworten: null, interessenten: null, quote: null, messstufe: 0,
      ergebnis: "vorbereitet, nicht veröffentlicht", blocker: "Gewerbebeginn und Impressum ungeklärt", naechsterSchritt: "nach Klärung am selben Tag veröffentlichbar" },
    { business_id: B, id: "TEST_002", status: "⚪ Nicht durchgeführt", ziel: "Öffentliche Nachfrage-Testseite",
      start: null, ende: null, kosten_cent: 0, einnahmen_cent: 0, angeschrieben: null, antworten: null, interessenten: null, quote: null, messstufe: 0,
      ergebnis: "geprüft: ohne Impressum nicht zulässig", blocker: "Impressum", naechsterSchritt: "ersetzt durch TEST_002B/TEST_002C" },
    { business_id: B, id: "TEST_001", status: "⚪ Pausiert", ziel: "Strom-/Gas-Vergleich per Affiliate-Link auf Pinterest",
      start: null, ende: null, kosten_cent: 0, einnahmen_cent: 0, angeschrieben: null, antworten: null, interessenten: null, quote: null, messstufe: 0,
      ergebnis: "Pin-Bild und Texte vorbereitet, nicht veröffentlicht", blocker: "Gewerbebeginn, Impressum, Partner-Registrierung durch den Inhaber", naechsterSchritt: "erst nach Klärung" },
  ],

  blocker: [
    { business_id: B, id: "gewerbe", ampel: "🔴", titel: "Gewerbebeginn klären", warum: "Ob schon ein Test oder eine Partner-Registrierung als Gewerbebeginn gilt, kann nur das Gewerbeamt beantworten.",
      wer: "Adnan", schritt: "Die vorbereitete Anfrage ans Gewerbeamt senden.", danach: "Claude bereitet den passenden öffentlichen Test vor und stellt ihn live, sobald er zulässig ist.", betrifft: ["TEST_001", "TEST_002B", "TEST_003"] },
    { business_id: B, id: "impressum", ampel: "🔴", titel: "Impressum entscheiden", warum: "Jeder öffentliche Auftritt braucht Name und vollständige Anschrift. Ob das veröffentlicht wird, entscheidet nur der Inhaber.",
      wer: "Adnan", schritt: "Ja oder Nein zur Veröffentlichung von Name und Anschrift.", danach: "Bei Ja: Claude veröffentlicht TEST_002B und richtet die Messung ein.", betrifft: ["TEST_001", "TEST_002B"] },
    { business_id: B, id: "registrierung", ampel: "🟡", titel: "Registrierung Crowdworking-Plattform", warum: "Persönliche Registrierung mit eigenen Daten, darf Claude nicht übernehmen.",
      wer: "Adnan", schritt: "Entscheiden, ob TEST_003 starten soll, und sich dann selbst registrieren.", danach: "Claude erfasst Aufgaben, Vergütung und Auszahlung und wertet aus.", betrifft: ["TEST_003"] },
    { business_id: B, id: "persoenlich", ampel: "🟡", titel: "Persönliche Klärung vor der ersten Einnahme", warum: "Vor der ersten echten Einnahme ist ein persönlicher Punkt zu klären. Details stehen nur im privaten Projektordner.",
      wer: "Adnan", schritt: "Erst vor der ersten Einnahme nötig, nicht für die laufenden Tests.", danach: "Claude dokumentiert das Ergebnis im privaten Projektordner.", betrifft: [] },
  ],

  // Es laufen keine eigenständigen Agenten für AUTO-INCOME. Die Auswertung ist ein Skript, das
  // Claude im Arbeitszyklus startet - kein dauerhaft laufender Agent.
  agenten: [
    { business_id: B, name: "Research", status: "Nicht eingerichtet" },
    { business_id: B, name: "Test-Auswertung", status: "Kein Agent – Skript (tools/auswertung.py im Projektordner), von Claude gestartet", letzterLauf: "01.10.2026", aufgabe: "TEST_002C zählen und einordnen", letztesErgebnis: "10 angeschrieben, 3 Antworten, Quote 30 %", fehler: "keine" },
    { business_id: B, name: "Ergebnis-Analyse", status: "Nicht eingerichtet" },
    { business_id: B, name: "Dokumentation", status: "Nicht eingerichtet" },
    { business_id: B, name: "Status", status: "Nicht eingerichtet" },
    { business_id: B, name: "Automation", status: "Nicht eingerichtet" },
  ],

  automatisierung: {
    business_id: B,
    letzterLauf: "01.10.2026 – Auswertung TEST_002C",
    naechsterSchritt: "Neue Antworten auswerten, sobald sie vorliegen; Abschluss-Auswertung am 04.10.2026",
    erfolgreich: ["Auswertung TEST_002C (Zählung, Einordnung, Test-Stufe, Ergebnisdatei)", "Private Statusseite neu gebaut und live geprüft"],
    fehlgeschlagen: [],
    offeneMenschlicheHandlungen: ["Weitere Antworten von TEST_002C weitergeben", "Anfrage ans Gewerbeamt senden", "Ja/Nein zum Impressum", "Entscheidung zu TEST_003"],
  },

  verlauf: [
    { business_id: B, datum: "01.10.2026", auftrag: "Kennzahlen TEST_002C", ergebnis: "10 angeschrieben, 3 Antworten, 30 % Antwortquote", kosten_cent: 0, einnahmen_cent: 0, blocker: "keiner", naechster: "weitere Antworten bis 04.10.2026" },
    { business_id: B, datum: "01.10.2026", auftrag: "Auswertung automatisiert", ergebnis: "Skript zählt und ordnet Antworten ein, baut die private Statusseite", kosten_cent: 0, einnahmen_cent: 0, blocker: "keiner", naechster: "Versand TEST_002C" },
    { business_id: B, datum: "01.10.2026", auftrag: "TEST_002C vorbereitet", ergebnis: "Kurzumfrage für Einzelnachrichten", kosten_cent: 0, einnahmen_cent: 0, blocker: "Versand durch Inhaber", naechster: "Nachrichten senden" },
    { business_id: B, datum: "01.10.2026", auftrag: "First-Money-Scan", ergebnis: "5 Modelle verglichen, Vorschlag TEST_003", kosten_cent: 0, einnahmen_cent: 0, blocker: "Registrierung", naechster: "Entscheidung" },
    { business_id: B, datum: "01.10.2026", auftrag: "Rechtsfragen sortiert", ergebnis: "Fragenliste und Anfrage-Entwurf ans Gewerbeamt", kosten_cent: 0, einnahmen_cent: 0, blocker: "Gewerbe, Impressum", naechster: "Anfrage senden" },
    { business_id: B, datum: "01.10.2026", auftrag: "Markt- und Programmrecherche", ergebnis: "8 Modelle, Partnerprogramme, Google-Trends-Analyse", kosten_cent: 0, einnahmen_cent: 0, blocker: "keiner", naechster: "Testauswahl" },
    { business_id: B, datum: "01.10.2026", auftrag: "Projekt angelegt", ergebnis: "eigener Projektordner, getrennt von Werknetz24", kosten_cent: 0, einnahmen_cent: 0, blocker: "keiner", naechster: "Recherche" },
  ],

  // Die Dokumente enthalten persönliche Angaben und bleiben im privaten Projektordner.
  dokumente: ["MASTER_STATUS.md", "PROJECT_STATUS.md", "RESULTS.md", "DECISION_LOG.md", "AUTOMATION_PLAN.md", "MARKET_RESEARCH.md", "TEST_PLAN.md", "LEGAL_OPEN_POINTS.md", "AFFILIATE_PROGRAMS.md"]
    .map(name => ({ business_id: B, name, status: "NICHT ANGESCHLOSSEN", ort: "privater Projektordner AUTO-INCOME (lokal, eigenes Git)" })),
  privateStatusseite: "https://claude.ai/artifact/AYCuUxYgdj9fDCv61R9jBh",
};

export function autoIncomeDaten() {
  return structuredClone(SNAPSHOT);
}

// Kompakte Zeile für die Master-Zentrale-Startseite (Abschnitt 14 des Auftrags).
export function autoIncomeKurz() {
  const d = SNAPSHOT;
  const t = d.tests.find(x => x.id === d.aktuellerTest);
  return {
    business_id: B,
    ampel: d.betrieb.ampel,
    aktiverTest: d.aktuellerTest,
    einnahmen_cent: d.geld.einnahmen_cent,
    kosten_cent: d.geld.kosten_cent,
    messstufe: t ? t.messstufe : null,
    blocker: d.blocker.filter(b => b.ampel === "🔴").length,
    letzteAktivitaet: d.verlauf[0]?.datum || "KEINE DATEN",
    stand: d.stand,
  };
}
