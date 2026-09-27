// Reine Regeln der Einnahmequellen (ohne Server-Abhaengigkeit) - fuer Oberflaeche und Server (27.09.2026).
// Workflow (Adnans Vorgabe): Idee -> Pruefung -> kostenloser Test -> Interesse -> erster Kunde -> Einnahme (Aktiv)
// -> Wiederholbar -> Automatisiert -> Skalieren; Pause jederzeit. Jede Stufe braucht einen echten Nachweis.
export const EQ_STATUS = ["IDEE", "PRUEFUNG", "TEST", "INTERESSE", "ERSTER_KUNDE", "AKTIV", "WIEDERHOLBAR", "AUTOMATISIERT", "SKALIEREN", "PAUSE"];
export const EQ_LABEL = { IDEE: "Idee", PRUEFUNG: "Prüfung", TEST: "Kostenloser Test", INTERESSE: "Interesse", ERSTER_KUNDE: "Erster Kunde", AKTIV: "Einnahme (aktiv)", WIEDERHOLBAR: "Wiederholbar", AUTOMATISIERT: "Automatisiert", SKALIEREN: "Skalieren", PAUSE: "Pause" };
export const EQ_ABLAUF = EQ_STATUS.filter(s => s !== "PAUSE");
export const EQ_GRUPPE = { aktiv: ["ERSTER_KUNDE", "AKTIV", "WIEDERHOLBAR", "AUTOMATISIERT", "SKALIEREN"], test: ["TEST", "INTERESSE"], pruefung: ["IDEE", "PRUEFUNG"], pause: ["PAUSE"] };
export const TEXT = ["name", "kategorie", "zielgruppe", "angebot", "beschreibung", "preis", "werkzeuge", "aufwand", "rechtliches", "markt", "nachfrage", "konkurrenz", "kosten_pruefung", "quellen", "kostenloser_test", "test_status", "interesse_nachweis", "schritte", "naechste_aufgabe", "verantwortlich", "automatisierung", "moegliche_einnahmen", "risiken", "benutzeraktion", "verweis", "notiz"];
export const ZAHL = ["startkosten_cent", "erste_kunden", "einnahmen_cent", "kosten_cent", "automatisierungsgrad"];

// Die 6 Pruefschritte vor einem Test (Adnans Vorgabe) + Quellen.
export const PRUEFSCHRITTE = [
  ["markt", "Markt geprüft"], ["nachfrage", "Nachfrage geprüft"], ["konkurrenz", "Konkurrenz geprüft"],
  ["kosten_pruefung", "Kosten geprüft"], ["rechtliches", "Rechtliche Voraussetzungen markiert"], ["kostenloser_test", "Kostenloser Test definiert"], ["quellen", "Quellen dokumentiert"],
];
const gefuellt = v => Boolean(String(v || "").trim());
export const pruefstand = q => PRUEFSCHRITTE.map(([k, text]) => ({ id: k, text, ok: gefuellt(q?.[k]) }));
export const gewinnCent = q => (q?.einnahmen_cent || 0) - (q?.kosten_cent || 0);
export const kundenAnzahl = q => Math.max(Array.isArray(q?.kunden) ? q.kunden.length : 0, q?.erste_kunden || 0);

// Voraussetzungen je Stufe - jede Stufe setzt die vorherigen voraus (nichts wird uebersprungen oder erfunden).
const STUFEN = {
  TEST: q => { const fehlt = pruefstand(q).filter(x => !x.ok).map(x => x.text); return fehlt.length ? "Vor dem Test fehlt: " + fehlt.join(", ") : null; },
  INTERESSE: q => STUFEN.TEST(q) || (gefuellt(q.interesse_nachweis) ? null : "„Interesse“ erst mit Nachweis (Feld „Interesse-Nachweis“: wer/was/wann, z. B. echte Anfragen oder Kommentare)"),
  ERSTER_KUNDE: q => kundenAnzahl(q) >= 1 ? null : "„Erster Kunde“ erst mit mindestens einem echten Kunden (Knopf „Kunde zuordnen“)",
  AKTIV: q => STUFEN.ERSTER_KUNDE(q) || (q.einnahmen_cent > 0 ? null : "„Aktiv“ erst mit echten Einnahmen"),
  WIEDERHOLBAR: q => STUFEN.AKTIV(q) || (kundenAnzahl(q) >= 2 ? null : "„Wiederholbar“ erst mit mindestens 2 echten Kunden"),
  AUTOMATISIERT: q => STUFEN.WIEDERHOLBAR(q) || (q.automatisierungsgrad > 0 && gefuellt(q.automatisierung) ? null : "„Automatisiert“ erst, wenn beschrieben ist, was automatisch läuft (Feld „Automatisierung“ + Grad über 0 %)"),
  SKALIEREN: q => STUFEN.AUTOMATISIERT(q) || (gewinnCent(q) > 0 ? null : "„Skalieren“ erst mit echtem Gewinn (Einnahmen größer als Kosten)"),
};

// Welche Voraussetzung ein Statuswechsel braucht. IDEE, PRUEFUNG und PAUSE sind immer erlaubt.
export function statusPruefung(q, ziel) {
  if (!EQ_STATUS.includes(ziel)) return "Unbekannter Status";
  return STUFEN[ziel] ? STUFEN[ziel](q) : null;
}

// Naechste Stufe im Ablauf (fuer "Automatisieren"/"Skalieren"-Knoepfe und die Anzeige).
export const naechsteStufe = q => { const i = EQ_ABLAUF.indexOf(q?.status); return i >= 0 && i < EQ_ABLAUF.length - 1 ? EQ_ABLAUF[i + 1] : null; };
