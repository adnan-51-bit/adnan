// Reine Regeln der Einnahmequellen (ohne Server-Abhaengigkeit) - fuer Oberflaeche und Server (27.09.2026).
// Workflow (Adnans Vorgabe): Idee -> Pruefung -> kostenloser Test -> Interesse -> erster Kunde -> Einnahme (Aktiv)
// -> Wiederholbar -> Automatisiert -> Skalieren; Pause jederzeit. Jede Stufe braucht einen echten Nachweis.
export const EQ_STATUS = ["IDEE", "PRUEFUNG", "TEST", "INTERESSE", "ERSTER_KUNDE", "AKTIV", "WIEDERHOLBAR", "AUTOMATISIERT", "SKALIEREN", "PAUSE"];
export const EQ_LABEL = { IDEE: "Idee", PRUEFUNG: "Prüfung", TEST: "Kostenloser Test", INTERESSE: "Interesse", ERSTER_KUNDE: "Erster Kunde", AKTIV: "Einnahme (aktiv)", WIEDERHOLBAR: "Wiederholbar", AUTOMATISIERT: "Automatisiert", SKALIEREN: "Skalieren", PAUSE: "Pause" };
export const EQ_ABLAUF = EQ_STATUS.filter(s => s !== "PAUSE");
export const EQ_GRUPPE = { aktiv: ["ERSTER_KUNDE", "AKTIV", "WIEDERHOLBAR", "AUTOMATISIERT", "SKALIEREN"], test: ["TEST", "INTERESSE"], pruefung: ["IDEE", "PRUEFUNG"], pause: ["PAUSE"] };
export const TEXT = ["name", "kategorie", "zielgruppe", "angebot", "beschreibung", "preis", "werkzeuge", "aufwand", "rechtliches", "markt", "nachfrage", "konkurrenz", "kosten_pruefung", "quellen", "kostenloser_test", "test_status", "interesse_nachweis", "schritte", "naechste_aufgabe", "verantwortlich", "automatisierung", "moegliche_einnahmen", "risiken", "benutzeraktion", "faehigkeiten", "erloesart", "verweis", "notiz"];
export const ZAHL = ["startkosten_cent", "laufende_kosten_cent", "erste_kunden", "einnahmen_cent", "kosten_cent", "automatisierungsgrad"];

// Die 6 Pruefschritte vor einem Test (Adnans Vorgabe) + Quellen.
export const PRUEFSCHRITTE = [
  ["markt", "Markt geprüft"], ["nachfrage", "Nachfrage geprüft"], ["konkurrenz", "Konkurrenz geprüft"],
  ["kosten_pruefung", "Kosten geprüft"], ["rechtliches", "Rechtliche Voraussetzungen markiert"], ["kostenloser_test", "Kostenloser Test definiert"], ["quellen", "Quellen dokumentiert"],
];
const gefuellt = v => Boolean(String(v || "").trim());
export const pruefstand = q => PRUEFSCHRITTE.map(([k, text]) => ({ id: k, text, ok: k === "quellen" ? gefuellt(q?.quellen) || (Array.isArray(q?.quellen_liste) && q.quellen_liste.length > 0) : gefuellt(q?.[k]) }));
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

// ---------- Katalog (27.09.2026) ----------
export const KATEGORIEN = [
  ["A", "Online-Anfragen für Unternehmen bearbeiten"], ["B", "Lead-Recherche / B2B-Datenaufbereitung"], ["C", "Lokale Unternehmen unterstützen"],
  ["D", "Content-/Produktrecherche"], ["E", "Affiliate-/Empfehlungsmodelle"], ["F", "Werknetz24"],
];
export const kategorieName = code => KATEGORIEN.find(([c]) => c === code)?.[1] || null;
export const NACHFRAGE = { UNBEKANNT: "unbekannt", ZU_PRUEFEN: "zu prüfen", BELEGT: "belegt" };
export const POTENZIAL = { UNBEKANNT: "unbekannt", NIEDRIG: "niedrig", MITTEL: "mittel", HOCH: "hoch" };
export const AUTO_STUFEN = { MANUELL: "Manuell", TEILWEISE: "Teilweise automatisiert", WEITGEHEND: "Weitgehend automatisiert" };
export const ENUMS = { nachfrage_status: Object.keys(NACHFRAGE), automatisierungspotenzial: Object.keys(POTENZIAL), skalierungspotenzial: Object.keys(POTENZIAL), automatisierungsstufe: Object.keys(AUTO_STUFEN) };
export const BOOL_NULL = ["rechtspruefung", "gewerbepruefung"]; // ja / nein / noch nicht bewertet (null)
export const BOOL = ["schnell_testbar", "direkte_kunden", "wiederholbar", "komplex"];

// Quelle (Vorgabe 7): Quelle, URL, Datum der Recherche, welche Aussage sie belegt - alle Pflicht.
export function pruefeQuelle(x) {
  const q = { quelle: String(x?.quelle || "").trim(), url: String(x?.url || "").trim(), datum: String(x?.datum || "").trim(), aussage: String(x?.aussage || "").trim() };
  if (!q.quelle || !q.aussage) throw new Error("Quelle: Name und belegte Aussage sind Pflicht");
  if (!/^https?:\/\/\S+$/.test(q.url)) throw new Error("Quelle: gültige URL (http/https) ist Pflicht");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(q.datum)) throw new Error("Quelle: Datum der Recherche im Format JJJJ-MM-TT ist Pflicht");
  return q;
}

// Automatisierungsvorschlag (Vorgabe 4): nur vollstaendig beschrieben; wird NIE aktiviert.
export const PLAN_FELDER = [["was", "Was wird automatisiert?"], ["daten", "Welche Daten werden benötigt?"], ["tool", "Welches Tool?"], ["kosten", "Welche Kosten entstehen?"], ["risiko", "Welches Risiko besteht?"]];
export function pruefePlanEintrag(x) {
  const e = Object.fromEntries(PLAN_FELDER.map(([k]) => [k, String(x?.[k] || "").trim()]));
  const fehlt = PLAN_FELDER.filter(([k]) => !e[k]).map(([, l]) => l);
  if (fehlt.length) throw new Error("Vorschlag unvollständig: " + fehlt.join(", "));
  if (typeof x?.freigabe !== "boolean") throw new Error("Vorschlag: angeben, ob eine Benutzerfreigabe nötig ist");
  // Kosten ungleich "0 €" -> Freigabe zwingend (Kostenschutz).
  const kostenlos = /^(0|0,00|0 €|0,00 €|kostenlos|keine)$/i.test(e.kosten);
  return { ...e, freigabe: kostenlos ? x.freigabe : true, status: "vorgeschlagen" };
}

// Arbeitsprioritaet (Vorgabe 6) - interne Reihenfolge, KEINE Aussage ueber Erfolgschancen.
const pot = v => v === "MITTEL" || v === "HOCH";
export function arbeitsPrioritaet(q) {
  const gruende = [];
  const nullKosten = q?.startkosten_cent === 0 && !(q?.laufende_kosten_cent > 0);
  if (!nullKosten || q?.komplex) {
    if (q?.startkosten_cent == null) gruende.push("Startkosten noch unbekannt");
    if (q?.startkosten_cent > 0 || q?.laufende_kosten_cent > 0) gruende.push("kostenpflichtig");
    if (q?.komplex) gruende.push("rechtlich/technisch komplex");
    return { stufe: 4, gruende };
  }
  if (q.schnell_testbar && q.direkte_kunden) return { stufe: 1, gruende: ["0 € Startkosten", "schnell testbar", "direkte potenzielle Kunden"] };
  if (q.wiederholbar) return { stufe: 2, gruende: ["0 € Startkosten", "wiederholbar"] };
  if (pot(q.automatisierungspotenzial) && pot(q.skalierungspotenzial)) return { stufe: 3, gruende: ["automatisierbar", "skalierbar"] };
  return { stufe: 4, gruende: ["0 € Startkosten, aber keine weiteren Kriterien erfüllt"] };
}
