// Reine Regeln der Einnahmequellen (ohne Server-Abhaengigkeit) - fuer Oberflaeche und Server (27.09.2026).
export const EQ_STATUS = ["IDEE", "PRUEFUNG", "TEST", "ERSTER_KUNDE", "AKTIV", "PAUSE"];
export const EQ_LABEL = { IDEE: "Idee", PRUEFUNG: "Prüfung", TEST: "Kostenloser Test", ERSTER_KUNDE: "Erster Kunde", AKTIV: "Aktiv", PAUSE: "Pause" };
export const TEXT = ["name", "kategorie", "zielgruppe", "angebot", "preis", "werkzeuge", "aufwand", "rechtliches", "markt", "nachfrage", "konkurrenz", "kosten_pruefung", "quellen", "kostenloser_test", "test_status", "verweis", "notiz"];
export const ZAHL = ["startkosten_cent", "erste_kunden", "einnahmen_cent", "kosten_cent"];

// Die 6 Pruefschritte vor einem Test (Adnans Vorgabe) + Quellen.
export const PRUEFSCHRITTE = [
  ["markt", "Markt geprüft"], ["nachfrage", "Nachfrage geprüft"], ["konkurrenz", "Konkurrenz geprüft"],
  ["kosten_pruefung", "Kosten geprüft"], ["rechtliches", "Rechtliche Voraussetzungen markiert"], ["kostenloser_test", "Kostenloser Test definiert"], ["quellen", "Quellen dokumentiert"],
];
export const pruefstand = q => PRUEFSCHRITTE.map(([k, text]) => ({ id: k, text, ok: Boolean(String(q?.[k] || "").trim()) }));
export const gewinnCent = q => (q?.einnahmen_cent || 0) - (q?.kosten_cent || 0);

// Welche Voraussetzung ein Statuswechsel braucht (nichts wird automatisch "aktiv").
export function statusPruefung(q, ziel) {
  if (!EQ_STATUS.includes(ziel)) return "Unbekannter Status";
  if (ziel === "TEST") { const fehlt = pruefstand(q).filter(x => !x.ok).map(x => x.text); return fehlt.length ? "Vor dem Test fehlt: " + fehlt.join(", ") : null; }
  if (ziel === "ERSTER_KUNDE" && !(q.erste_kunden >= 1)) return "„Erster Kunde“ erst mit mindestens einem echten Kunden (Feld „erste Kunden“)";
  if (ziel === "AKTIV" && !(q.einnahmen_cent > 0)) return "„Aktiv“ erst mit echten Einnahmen";
  return null;
}

