// Vertriebsprozess je Lead (29.09.2026, Adnans Vorgabe): LEAD → geprüft → kontaktierbar → Kontakt vorbereitet →
// Kontakt erfolgt → Antwort → Interesse → Termin → Angebot → Kunde → Zahlung → Einnahme.
// Reine Ableitung aus gespeicherten Daten. "Kunde" nur nach echter Zusage (Auftrag erteilt), "Zahlung" = offene
// Buchung, "Einnahme" nur bei bestaetigter Buchung (Zahlungseingang mit Nachweis). Nichts wird erfunden.
import { ladenlokal, besuchsRang, einmalBausteine } from "./google-profil.js";

export const VERTRIEBS_STUFEN = [["LEAD", "Lead"], ["GEPRUEFT", "Geprüft"], ["KONTAKTIERBAR", "Kontaktierbar"], ["KONTAKT_VORBEREITET", "Kontakt vorbereitet"], ["KONTAKT_ERFOLGT", "Kontakt erfolgt"], ["ANTWORT", "Antwort"], ["INTERESSE", "Interesse"], ["TERMIN", "Termin"], ["ANGEBOT", "Angebot"], ["KUNDE", "Kunde"], ["ZAHLUNG", "Zahlung offen"], ["EINNAHME", "Einnahme"]];
const AUS = ["GESPERRT", "VERLOREN"];

// Kontaktierbar = geprueft, Ladenlokal (oder unbekannt), erkennbarer Bedarf, nicht ausgeschieden.
export const kontaktierbar = l => Boolean(l?.profil_analyse) && !AUS.includes(l.status) && ladenlokal(l).laden !== false && l.profil_analyse.punkte < 75;

export function vertriebsStufe(l, finance = []) {
  const crm = l.pilot_crm || {};
  const buchungen = finance.filter(e => e.kind === "income" && !e.ist_test && String(e.lead_id || "") === String(l.id));
  if (buchungen.some(e => e.status === "confirmed")) return "EINNAHME";
  if (buchungen.some(e => e.status === "pending")) return "ZAHLUNG";
  if (l.status === "KUNDE" || l.vertrag) return "KUNDE";
  if (l.status === "ANGEBOT" || l.angebot?.status === "gesendet") return "ANGEBOT";
  if (crm.termin) return "TERMIN";
  if (l.status === "INTERESSENT") return "INTERESSE";
  if ((crm.antworten || []).length) return "ANTWORT";
  if (crm.kontakt_erfolgt_am || l.status === "KONTAKT") return "KONTAKT_ERFOLGT";
  if (crm.kontakt_freigegeben) return "KONTAKT_VORBEREITET";
  if (!l.profil_analyse) return "LEAD";
  return kontaktierbar(l) ? "KONTAKTIERBAR" : "GEPRUEFT";
}
export const stufenLabel = k => (VERTRIEBS_STUFEN.find(([s]) => s === k) || [k, k])[1];
export const ausgeschieden = l => AUS.includes(l.status) ? (l.status === "GESPERRT" ? "kein Interesse – nicht mehr kontaktieren" : "kein Interesse") : null;

// Gespraechseinstieg: gespeicherter Text (von Claude geschrieben) oder Vorlage aus den festgestellten Luecken.
export function gespraechseinstieg(l) {
  if (l.pilot_crm?.einstieg) return l.pilot_crm.einstieg;
  const a = l.profil_analyse; if (!a) return "Erst das Google-Profil prüfen.";
  const w = a.werte || {}, n = String(a.notiz || ""), bew = (n.match(/(\d[\d.]*) (?:Bewertungen|Rezensionen)/) || [])[1];
  const brief = l.pilot_crm?.brief_am ? "ich habe Ihnen einen Brief zu Ihrem Google-Profil eingeworfen. " : "";
  if (w.kategorie === "nein" && w.kontakt === "nein") return `Guten Tag, ${brief}ich habe Sie bei Google Maps gesucht, aber keinen Eintrag gefunden. Darf ich Ihnen zeigen, wie Sie in einer Stunde kostenlos sichtbar werden?`;
  if (/nicht (vom inhaber )?beansprucht|als inhaber eintragen/i.test(n)) return `Guten Tag, ${brief}bei Google steht bei Ihnen „Als Inhaber eintragen“ – Ihr Profil gehört also noch niemandem. Darf ich Ihnen zeigen, wie Sie es kostenlos bestätigen?`;
  if (w.bewertungen_antworten === "nein") return `Guten Tag, ${brief}${bew ? bew + " Bewertungen – " : ""}Ihre Gäste und Kunden sind begeistert. Kommen Sie selbst dazu, darauf zu antworten?`;
  if (w.beschreibung === "nein") return `Guten Tag, ${brief}in Ihrem Google-Eintrag steht noch keine Beschreibung. Darf ich Ihnen zeigen, was Kunden dort sehen?`;
  return `Guten Tag, ${brief}mir sind in Ihrem Google-Profil ${einmalBausteine(a).length} Punkte aufgefallen, die schnell zu verbessern sind. Darf ich sie Ihnen kurz zeigen?`;
}

// Zulaessiger Kontaktweg (UWG § 7): Brief/Besuch nur nach Freigabe; Telefon/E-Mail erst nach Einwilligung bzw. eigener Anfrage.
export function kontaktweg(l) {
  const adr = (String(l.notiz || "").match(/Adresse laut Verzeichnis: (.+?\d{5} [^.]+)/) || [])[1];
  const letzte = (l.pilot_crm?.antworten || []).filter(a => a.wahl === "gespraech").slice(-1)[0];
  if (letzte) return `Rückruf erlaubt (Einwilligung vom ${new Date(letzte.datum).toLocaleDateString("de-DE")}): ${[letzte.telefon && "Tel. " + letzte.telefon, letzte.email].filter(Boolean).join(" · ")}`;
  if (l.einwilligung || l.selbst_angefragt) return "Einwilligung liegt vor – Antwort per Telefon/E-Mail erlaubt";
  if (ladenlokal(l).laden === false) return "kein Ladenlokal – persönlicher Kontakt kaum sinnvoll (zurückgestellt)";
  return `Brief einwerfen oder persönlich vorbeigehen${adr ? ": " + adr : ""} – erst nach deiner Freigabe; keine Werbe-Mail, kein Werbeanruf`;
}

// HEUTE BEARBEITEN: die naechsten konkreten Schritte, die am schnellsten zu Kunden fuehren (hoechstens 7).
// wer: "Adnan" (persoenlich/rechtlich noetig) oder "Claude" (kostenlos automatisch in der naechsten Sitzung).
export function heuteBearbeiten({ leads = [], finance = [], jetzt = new Date(), max = 7 } = {}) {
  const now = +new Date(jetzt);
  const aktiv = leads.filter(l => !AUS.includes(l.status)).map(l => ({ l, s: vertriebsStufe(l, finance) }));
  const eintrag = (l, s, aktion, wer) => ({ lead_id: l.id, name: l.firma || l.name, stufe: s, stufe_label: stufenLabel(s), aktion, wer, einstieg: gespraechseinstieg(l), kontaktweg: kontaktweg(l) });
  const liste = [];
  const nimm = (filter, aktion, wer, sort = (a, b) => besuchsRang(a.l) - besuchsRang(b.l)) => { for (const x of aktiv.filter(filter).sort(sort)) if (liste.length < max && !liste.some(y => y.lead_id === x.l.id)) liste.push(eintrag(x.l, x.s, aktion(x.l), wer)); };
  const termin = l => l.pilot_crm?.termin?.datum ? Date.parse(l.pilot_crm.termin.datum) : Infinity;
  nimm(x => x.s === "TERMIN" && termin(x.l) - now < 2 * 86400000, l => `Termin ${new Date(l.pilot_crm.termin.datum).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })} wahrnehmen (Unterlage + Leitfaden im Pilot)`, "Adnan", (a, b) => termin(a.l) - termin(b.l));
  nimm(x => x.s === "INTERESSE" && !x.l.pilot_crm?.termin, () => "Zurückrufen und Termin vereinbaren (danach „Termin vereinbart“ eintragen)", "Adnan");
  nimm(x => x.s === "ANTWORT" && (x.l.pilot_crm?.antworten || []).some(a => a.wahl === "gespraech"), () => "Antwort auswerten und zurückrufen", "Adnan");
  nimm(x => x.s === "ANGEBOT", () => "Nach der Entscheidung zum Angebot fragen", "Adnan");
  nimm(x => x.s === "KONTAKT_VORBEREITET" && x.l.pilot_crm?.brief_am && !x.l.pilot_crm?.zusammen_mit, () => "Gedruckten Brief einwerfen (danach „Brief eingeworfen“)", "Adnan");
  nimm(x => x.s === "KONTAKT_VORBEREITET" && !x.l.pilot_crm?.brief_am && !x.l.pilot_crm?.zusammen_mit && ladenlokal(x.l).laden !== false, () => "Brief drucken, unterschreiben, einwerfen", "Adnan");
  nimm(x => x.s === "LEAD", () => "Google-Profil analysieren", "Claude", (a, b) => String(a.l.erstellt_am).localeCompare(String(b.l.erstellt_am)));
  nimm(x => x.s === "KONTAKTIERBAR", () => "Kontakt freigeben („Wartet auf mich“) – Brief ist vorbereitet", "Adnan");
  return liste;
}
