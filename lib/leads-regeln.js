// E-Mail & Leads (27.09.2026, Teil 4B) - reine Regeln, kostenlos (Stichwort-Regeln + Vorlagen, ohne KI-Dienst).
// Rechtsrahmen: Werbung per E-Mail nur mit Einwilligung (UWG § 7 Abs. 2 Nr. 2). Antworten auf eine Anfrage des Leads
// sind erlaubt. Die Zentrale versendet NICHTS selbst - Adnan sendet aus seinem eigenen Postfach und markiert "gesendet".

export const LEAD_STATUS = ["NEU", "INTERESSENT", "KONTAKT", "ANGEBOT", "KUNDE", "VERLOREN", "GESPERRT"];
export const LEAD_LABEL = { NEU: "Neu", INTERESSENT: "Interessent", KONTAKT: "In Kontakt", ANGEBOT: "Angebot gesendet", KUNDE: "Kunde", VERLOREN: "Verloren", GESPERRT: "Gesperrt (Widerspruch)" };
// Spiegel fuer die aeltere Lead-Liste in der Einnahmequelle (Teil 3A).
export const ZU_EQ = { NEU: "neu", INTERESSENT: "interessiert", KONTAKT: "kontaktiert", ANGEBOT: "kontaktiert", KUNDE: "kunde", VERLOREN: "verloren", GESPERRT: "verloren" };
export const VON_EQ = { neu: "NEU", interessiert: "INTERESSENT", kontaktiert: "KONTAKT", kunde: "KUNDE", verloren: "VERLOREN" };

// Darf man diesem Lead eine E-Mail schreiben?
export function kontaktErlaubt(l) {
  if (l?.status === "GESPERRT") return { erlaubt: false, grund: "Widerspruch – keine Nachrichten mehr senden" };
  if (l?.selbst_angefragt) return { erlaubt: true, grund: "Lead hat selbst angefragt – Antworten sind erlaubt" };
  if (l?.einwilligung) return { erlaubt: true, grund: "Einwilligung liegt vor" };
  return { erlaubt: false, grund: "Keine Einwilligung und keine eigene Anfrage – Werbe-E-Mail wäre unzulässig (UWG § 7). Nur reagieren, wenn der Lead sich meldet." };
}

// Informationen strukturieren: aus eingefuegtem Text (Anfrage, Kommentar, Visitenkarte) E-Mail, Telefon, Name, Firma ziehen.
export function strukturiere(text) {
  const t = String(text || "");
  const email = (t.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [""])[0];
  const telefon = ((t.match(/(?:\+49|0049|0)[\s/-]?\d{2,5}[\s/-]?\d{3,}(?:[\s/-]?\d+)*/) || [""])[0]).replace(/\s+/g, " ").trim();
  const feld = re => (t.match(re) || [, ""])[1].trim();
  const name = feld(/(?:^|\n)\s*(?:name|von|ansprechpartner(?:in)?)\s*[:\-]\s*([^\n,;]{2,60})/i) || feld(/(?:grüße|gruß|gruss)[,!]?\s*\n?\s*([A-ZÄÖÜ][^\n,;]{1,40})/i);
  const firma = feld(/(?:^|\n)\s*(?:firma|unternehmen|betrieb)\s*[:\-]\s*([^\n;]{2,80})/i) || feld(/\b([A-ZÄÖÜ][\wÄÖÜäöüß&.\- ]{1,40}\s(?:GmbH|UG|KG|OHG|e\.K\.|GbR|AG))\b/);
  return { name, firma, email, telefon };
}

// Antworten kategorisieren (Stichwort-Regeln, bitte pruefen). Widerspruch hat Vorrang.
const KATEGORIEN = [
  ["WIDERSPRUCH", /(abmelden|keine (weiteren )?(e-?mails|nachrichten)|nicht mehr (kontaktieren|schreiben)|widerspr|austragen|datenschutz.*löschen|löschen sie)/i],
  ["ABSAGE", /(kein interesse|nein,? danke|nicht interessiert|brauchen wir nicht|haben schon|absage|leider nicht)/i],
  ["TERMIN", /(termin|telefonat|anrufen|\b\d{1,2}[.:]\d{2}\s?uhr|montag|dienstag|mittwoch|donnerstag|freitag|morgen|nächste woche)/i],
  ["ANGEBOT_ANGENOMMEN", /(angebot (passt|angenommen|nehmen wir)|machen wir|auftrag|bitte starten|einverstanden|zusage)/i],
  ["INTERESSE", /(interesse|gerne|klingt gut|mehr (infos|informationen)|was kostet|preis|wie funktioniert)/i],
  ["FRAGE", /\?/],
];
export const ANTWORT_LABEL = { WIDERSPRUCH: "Widerspruch", ABSAGE: "Absage", TERMIN: "Terminwunsch", ANGEBOT_ANGENOMMEN: "Angebot angenommen", INTERESSE: "Interesse", FRAGE: "Frage", SONSTIGES: "Sonstiges" };
export function kategorisiereAntwort(text) { const t = String(text || ""); for (const [k, re] of KATEGORIEN) if (re.test(t)) return k; return "SONSTIGES"; }
// Welcher Status folgt aus einer Antwort (nie automatisch "Kunde" ohne Angebot)?
export function statusNachAntwort(lead, kategorie) {
  if (kategorie === "WIDERSPRUCH") return "GESPERRT";
  if (kategorie === "ABSAGE") return "VERLOREN";
  if (["INTERESSE", "TERMIN", "FRAGE"].includes(kategorie) && ["NEU", "KONTAKT"].includes(lead.status)) return "INTERESSENT";
  return lead.status;
}

// Naechsten Schritt bestimmen (Vorschlag, aus gespeicherten Daten).
export function naechsterSchritt(l) {
  const n = Array.isArray(l?.nachrichten) ? l.nachrichten : [];
  const letzte = n[n.length - 1];
  if (l.status === "GESPERRT") return "Nichts mehr senden (Widerspruch). Kontaktdaten nur noch für die Sperre behalten.";
  if (l.status === "VERLOREN") return "Keine weitere Aktion.";
  if (l.status === "KUNDE") return l.angebot?.status === "angenommen" ? "Leistung erbringen und Zahlung als eingegangen markieren, sobald das Geld da ist." : "Leistung erbringen.";
  if (letzte?.richtung === "rein" && !letzte.bearbeitet) return `Antwort (${ANTWORT_LABEL[letzte.kategorie] || "neu"}) beantworten.`;
  if (l.status === "ANGEBOT") return "Auf Rückmeldung zum Angebot warten; nach 7 Tagen freundlich nachfragen.";
  if (!kontaktErlaubt(l).erlaubt) return "Nicht anschreiben (keine Einwilligung). Warten, bis sich der Lead selbst meldet.";
  if (!n.some(x => x.typ === "gesendet")) return "Ersten E-Mail-Entwurf prüfen und aus deinem Postfach senden.";
  if (l.status === "INTERESSENT") return "Angebot erstellen.";
  return "Auf Antwort warten; nach 5 Tagen einmal nachfassen.";
}

// E-Mail-Entwuerfe (Vorlagen). Unbekanntes bleibt [Platzhalter].
const p = (v, x) => String(v || "").trim() || `[${x}]`;
export const EMAIL_ARTEN = { erstantwort: "Antwort auf Anfrage", nachfassen: "Nachfassen", angebot: "Angebot", danke: "Danke / Auftragsbestätigung" };
export function emailEntwurf(art, l, eq = {}) {
  const anrede = `Hallo ${p(l.name, "Name")},`;
  const leistung = p(eq.angebot || eq.name, "Leistung");
  const gruss = "\n\nViele Grüße\nAdnan";
  const e = {
    erstantwort: [`Ihre Anfrage – ${leistung}`, `${anrede}\n\nvielen Dank für Ihre Nachricht. Gern erkläre ich Ihnen kurz, wie ${leistung} abläuft: [2–3 Sätze].\nPasst Ihnen ein kurzes Telefonat am [Tag/Uhrzeit]?${gruss}`],
    nachfassen: [`Kurze Rückfrage – ${leistung}`, `${anrede}\n\nich wollte kurz nachfragen, ob noch Fragen offen sind. Melden Sie sich gern, wenn es passt.${gruss}`],
    angebot: [`Ihr Angebot – ${leistung}`, `${anrede}\n\nwie besprochen biete ich Ihnen an:\n${p(l.angebot?.text, "Leistung und Umfang")}\nPreis: ${l.angebot?.betrag_cent ? (l.angebot.betrag_cent / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" }) : "[Preis – noch zu prüfen]"}\nStart: [Datum]\n\nGeben Sie mir einfach kurz Bescheid.${gruss}`],
    danke: [`Danke für Ihren Auftrag – ${leistung}`, `${anrede}\n\nvielen Dank für Ihre Zusage. Ich starte wie besprochen am [Datum].${gruss}`],
  }[art];
  if (!e) throw new Error("Unbekannte E-Mail-Art");
  return { betreff: e[0], text: e[1] };
}

// ---------- Gesamter Einnahme-Ablauf je Einnahmequelle (abgeleitet aus echten Daten, kein eigener Status) ----------
export const EINNAHME_ABLAUF = ["RECHERCHE", "TEST", "CONTENT", "VEROEFFENTLICHUNG", "LEAD", "KONTAKT", "ANGEBOT", "KUNDE", "EINNAHME", "REPORT", "SKALIEREN"];
export const EINNAHME_LABEL = { RECHERCHE: "Recherche", TEST: "Test", CONTENT: "Content", VEROEFFENTLICHUNG: "Veröffentlichung", LEAD: "Lead", KONTAKT: "Kontakt", ANGEBOT: "Angebot", KUNDE: "Kunde", EINNAHME: "Einnahme", REPORT: "Report", SKALIEREN: "Skalieren" };
const TEST_ODER_SPAETER = ["TEST", "AUTOMATISIERT", "VEROEFFENTLICHT", "LEADS_KUNDEN", "EINNAHMEN", "SKALIEREN"];
export function ablaufStand(eq, { content = [], leads = [], finanzen = null, reportNachEinnahme = false } = {}) {
  const eigeneC = content.filter(c => c.einnahmequelle_id === eq.id);
  const eigeneL = leads.filter(l => l.einnahmequelle_id === eq.id);
  const erreicht = {
    RECHERCHE: (eq.quellen_liste || []).length > 0,
    TEST: TEST_ODER_SPAETER.includes(["PAUSE", "GESTOPPT"].includes(eq.status) ? eq.status_vor_pause : eq.status),
    CONTENT: eigeneC.some(c => !["IDEE", "RECHERCHE", "SKRIPT", "VERWORFEN"].includes(c.status)),
    VEROEFFENTLICHUNG: eigeneC.some(c => (c.veroeffentlichung || []).length) || Boolean(String(eq.veroeffentlichung || "").trim()),
    LEAD: eigeneL.length > 0,
    KONTAKT: eigeneL.some(l => (l.nachrichten || []).some(n => n.typ === "gesendet" || n.richtung === "rein")),
    ANGEBOT: eigeneL.some(l => l.angebot),
    KUNDE: eigeneL.some(l => l.status === "KUNDE") || (eq.kunden || []).length > 0,
    EINNAHME: (finanzen?.einnahmen_cent || 0) > 0,
    REPORT: (finanzen?.einnahmen_cent || 0) > 0 && reportNachEinnahme,
    SKALIEREN: eq.status === "SKALIEREN",
  };
  // "Stand" = letzte erreichte Stufe; "naechste" = erste noch offene Stufe.
  const idx = EINNAHME_ABLAUF.reduce((a, s, i) => erreicht[s] ? i : a, -1);
  const naechste = EINNAHME_ABLAUF.find(s => !erreicht[s]) || null;
  return { erreicht, stand: idx >= 0 ? EINNAHME_ABLAUF[idx] : null, naechste };
}

// ---------- Automatisierungsgrad je Schritt (ehrlich: "KI vorbereitet" = derzeit Regeln/Vorlagen, kostenlos) ----------
export const GRAD = { MANUELL: "Manuell", KI_VORBEREITET: "KI vorbereitet", AUTOMATISCH: "Automatisch", FREIGABE: "Freigabe erforderlich" };
export const AUTOMATISIERUNGSGRAD = [
  ["Leads erfassen (aus eingefügtem Text)", "KI_VORBEREITET", "E-Mail, Telefon, Name, Firma werden erkannt – du bestätigst."],
  ["Informationen strukturieren", "AUTOMATISCH", "Felder werden beim Speichern geordnet."],
  ["Follow-up-Aufgaben", "AUTOMATISCH", "Nach Erfassen, Senden und Angebot automatisch in der Aufgabenliste."],
  ["E-Mail-Entwürfe", "KI_VORBEREITET", "Vorlagen mit deinen Daten – du prüfst."],
  ["E-Mail senden", "MANUELL", "Du sendest aus deinem eigenen Postfach (Knopf öffnet dein E-Mail-Programm). Werbung ohne Einwilligung ist gesperrt."],
  ["Antworten kategorisieren", "KI_VORBEREITET", "Stichwort-Erkennung (Interesse, Frage, Termin, Absage, Widerspruch) – du prüfst."],
  ["Nächste Aufgabe bestimmen", "AUTOMATISCH", "Aus Status und letzter Nachricht."],
  ["Angebot erstellen", "KI_VORBEREITET", "Vorlage – Preis nur, was du einträgst."],
  ["Einnahme erfassen", "MANUELL", "Erst wenn das Geld wirklich da ist („bezahlt“)."],
  ["Tagesbericht", "AUTOMATISCH", "Täglich 07:00 Uhr und per Knopf."],
  ["Automatischer E-Mail-Versand / E-Mail-Dienst", "FREIGABE", "Nur nach deiner Freigabe (eigenes Konto nötig, getrennt von Werknetz24)."],
  ["Echte KI (Sprachmodell) für Texte", "FREIGABE", "Kostet pro Nutzung – nur nach Freigabe."],
  ["Bezahlte Werbung / Abos", "FREIGABE", "Gesperrt bis zur ersten echten Einnahme und deiner Freigabe."],
];
