// Pilot Anfragen-Service (27.09.2026) - reine Regeln, kostenlos (Stichwort-Regeln + Textvorlagen, kein Sprachmodell).
// Ablauf: Neue Anfrage -> analysieren -> Kategorie -> Dringlichkeit -> Antwortentwurf -> Aufgabe -> Status -> Ergebnis.
// Die Erkennung ist ein Vorschlag ("bitte pruefen"); gesendet wird nie automatisch.
import { strukturiere } from "./leads-regeln.js";

export const A_STATUS = ["NEU", "ANALYSIERT", "ENTWURF", "WARTET_AUF_FREIGABE", "ERLEDIGT", "ARCHIVIERT"];
export const A_LABEL = { NEU: "Neu", ANALYSIERT: "Analysiert", ENTWURF: "Entwurf erstellt", WARTET_AUF_FREIGABE: "Wartet auf Freigabe", ERLEDIGT: "Erledigt", ARCHIVIERT: "Archiviert" };
export const A_KATEGORIEN = { REKLAMATION: "Reklamation / Problem", TERMIN: "Terminwunsch", ANGEBOT: "Preis- / Angebotsanfrage", RUECKRUF: "Rückrufbitte", AUFTRAG: "Auftrag / Bestellung", INFO: "Allgemeine Frage", SONSTIGES: "Sonstiges" };
// Reihenfolge = Vorrang (erste passende Regel gewinnt).
const REGELN = [
  ["REKLAMATION", /(reklamation|beschwerde|funktioniert nicht|kaputt|defekt|mangel|unzufrieden|schaden|fehler|geht nicht)/i],
  ["AUFTRAG", /(auftrag|bestell|buchen|beauftrag|wir nehmen|bitte (führen|machen) sie)/i],
  ["TERMIN", /(termin|wann (haben|hätten|können)|besichtigung|vorbeikommen|\b\d{1,2}[.:]\d{2}\s?uhr|nächste woche|montag|dienstag|mittwoch|donnerstag|freitag|samstag)/i],
  ["ANGEBOT", /(angebot|kosten|preis|was kostet|kostenvoranschlag|budget|€|euro)/i],
  ["RUECKRUF", /(rückruf|zurückrufen|ruf(en)? (sie )?(mich )?an|telefonisch)/i],
  ["INFO", /\?|(frage|information|wissen|möglich)/i],
];
const DRINGEND = /(dringend|sofort|notfall|asap|heute noch|so schnell wie möglich|eilt|wasserschaden|rohrbruch|stromausfall|ausgesperrt)/i;

export function analysiere(text) {
  const t = String(text || "").trim();
  if (t.length < 10) throw new Error("Anfrage-Text fehlt oder ist zu kurz (mindestens 10 Zeichen)");
  const kategorie = (REGELN.find(([, re]) => re.test(t)) || ["SONSTIGES"])[0];
  const dringlichkeit = DRINGEND.test(t) ? "HOCH" : ["REKLAMATION", "AUFTRAG"].includes(kategorie) ? "HOCH" : ["TERMIN", "ANGEBOT", "RUECKRUF"].includes(kategorie) ? "MITTEL" : "NIEDRIG";
  const kontakt = strukturiere(t);
  const fehlt = [!kontakt.email && !kontakt.telefon && "Kontaktweg (E-Mail oder Telefon)", !kontakt.name && "Name", kategorie === "TERMIN" && !/\d/.test(t) && "Wunschtermin", kategorie === "ANGEBOT" && !/(adresse|straße|str\.|ort|plz|\b\d{5}\b)/i.test(t) && "Ort/Adresse für das Angebot"].filter(Boolean);
  const satz = t.replace(/\s+/g, " ").split(/(?<=[.!?])\s/)[0];
  return { kategorie, kategorie_text: A_KATEGORIEN[kategorie], dringlichkeit, prioritaet: { HOCH: "Hoch", MITTEL: "Mittel", NIEDRIG: "Niedrig" }[dringlichkeit], kontakt, fehlt,
    zusammenfassung: (satz.length > 180 ? satz.slice(0, 177) + "…" : satz), hinweis: "Automatisch erkannt (Stichwort-Regeln) – bitte prüfen." };
}

const NAECHSTE = { REKLAMATION: "Heute persönlich melden und das Problem klären", AUFTRAG: "Auftrag prüfen und bestätigen (nur der Betrieb entscheidet)", TERMIN: "Terminvorschlag prüfen und zurückschreiben",
  ANGEBOT: "Fehlende Angaben erfragen, dann Angebot durch den Betrieb erstellen lassen", RUECKRUF: "Zurückrufen", INFO: "Frage beantworten", SONSTIGES: "Anfrage lesen und entscheiden" };

// Entwuerfe (Vorlagen) - Platzhalter in [eckigen Klammern] fuellt der Betrieb selbst. Keine Preise, keine Zusagen.
export function entwuerfe(anfrage, a) {
  const betrieb = anfrage.unternehmen || "[Ihr Betrieb]";
  const anrede = a.kontakt.name ? `Guten Tag ${a.kontakt.name},` : "Guten Tag,";
  const dank = "vielen Dank für Ihre Anfrage.";
  const kern = { REKLAMATION: "Es tut uns leid, dass es Probleme gibt. Wir kümmern uns darum und melden uns so schnell wie möglich persönlich bei Ihnen.",
    AUFTRAG: "Wir haben Ihren Auftragswunsch erhalten und prüfen ihn. Sie erhalten von uns eine verbindliche Rückmeldung.",
    TERMIN: "Gern vereinbaren wir einen Termin. Passt Ihnen [Terminvorschlag]?",
    ANGEBOT: "Gern erstellen wir Ihnen ein Angebot. Damit es genau passt, benötigen wir noch ein paar Angaben (siehe unten).",
    RUECKRUF: "Wir rufen Sie gern zurück. Unter welcher Nummer und zu welcher Uhrzeit erreichen wir Sie am besten?",
    INFO: "[Antwort auf die Frage]", SONSTIGES: "Wir haben Ihre Nachricht erhalten und melden uns zeitnah." }[a.kategorie];
  const fragen = a.fehlt.length ? "\n\nDamit wir Ihnen schnell helfen können, bräuchten wir noch:\n" + a.fehlt.map(f => "– " + f).join("\n") : "";
  const gruss = `\n\nMit freundlichen Grüßen\n${betrieb}`;
  return {
    antwort: { betreff: `Ihre Anfrage – ${A_KATEGORIEN[a.kategorie]}`, text: `${anrede}\n\n${dank} ${kern}${fragen}${gruss}` },
    rueckfrage: { betreff: "Rückfrage zu Ihrer Anfrage", text: `${anrede}\n\n${dank} Damit wir Ihnen genau weiterhelfen können, haben wir noch eine Rückfrage:\n${(a.fehlt.length ? a.fehlt : ["[Ihre Rückfrage]"]).map(f => "– " + f).join("\n")}${gruss}` },
    angebotstext: { betreff: "Ihr Angebot", text: `${anrede}\n\n${dank} Gern bieten wir Ihnen an:\n\nLeistung: [Leistung beschreiben]\nPreis: [Preis – legt der Betrieb fest]\nGültig bis: [Datum]\n\nDas Angebot ist erst nach Ihrer Zusage verbindlich.${gruss}`, hinweis: "Nur Vorlage – Preise und Zusagen legt ausschließlich der Betrieb fest." },
    zusammenfassung: { text: `${A_KATEGORIEN[a.kategorie]} · Dringlichkeit ${a.dringlichkeit.toLowerCase()} · ${a.zusammenfassung}${a.fehlt.length ? " · Fehlt: " + a.fehlt.join(", ") : ""}` },
    naechste_aktion: { text: NAECHSTE[a.kategorie] },
    erstellt_mit: "Kostenlose Textvorlagen (kein Sprachmodell, 0 €)",
  };
}

// Kunden-Bereich (vorbereitet): Stufen aus echten Leads der Einnahmequelle - nichts wird erfunden.
export const KUNDEN_STUFEN = [["INTERESSENT", "Interessent"], ["PILOTKUNDE", "Pilotkunde"], ["AKTIV", "Aktiver Kunde"], ["BEENDET", "Beendet"]];
export function kundenStufe(l) {
  if (l.vertrag?.beendet_am || l.status === "VERLOREN") return "BEENDET";
  if (l.status === "KUNDE") return l.pilot_crm?.pilotkunde ? "PILOTKUNDE" : "AKTIV";
  if (["INTERESSENT", "KONTAKT", "ANGEBOT"].includes(l.status)) return "INTERESSENT";
  return null;
}

// Angebots-/Einnahmen-Modul: nur Vorschlaege. "moeglicher_preis" ist Text (z. B. "noch zu prüfen") - kein fester Preis.
export const RHYTHMUS = { EINMALIG: "einmalig", MONATLICH: "monatlich", OFFEN: "noch offen" };
export function pruefeAngebotsentwurf(x) {
  const e = { leistung: String(x?.leistung || "").trim().slice(0, 400), moeglicher_preis: String(x?.moeglicher_preis || "noch zu prüfen").trim().slice(0, 120),
    rhythmus: RHYTHMUS[x?.rhythmus] ? x.rhythmus : "OFFEN", kosten: String(x?.kosten || "0 € (nur kostenlose Werkzeuge)").trim().slice(0, 200),
    erwartete_einnahmen: String(x?.erwartete_einnahmen || "noch zu prüfen").trim().slice(0, 200), quelle: String(x?.quelle || "").trim().slice(0, 300) };
  if (e.leistung.length < 5) throw new Error("Leistung beschreiben (mindestens 5 Zeichen)");
  if (/\d/.test(e.erwartete_einnahmen) && !/^https?:\/\//.test(e.quelle)) throw new Error("Erwartete Einnahmen mit Zahl nur mit Quelle (URL) – sonst „noch zu prüfen“");
  return { ...e, verbindlich: false, hinweis: "Vorschlag – der Preis wird erst nach deiner Entscheidung festgelegt." };
}
