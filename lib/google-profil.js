// Pilot "Pflege Google-Unternehmensprofil" (27.09.2026, Teil 5) - reine Regeln + Vorlagen (kostenlos).
// Die Analyse wird von Hand aus dem OEFFENTLICHEN Google-Maps-Profil ausgefuellt (keine kostenpflichtige API).
// Punkte/Bewertung sind eine eigene Arbeits-Checkliste - keine Aussage von Google und keine Ranking-Garantie.

// Kriterien der Profil-Analyse. Antwort: "ja" | "teilweise" | "nein" | "unbekannt".
export const KRITERIEN = [
  { id: "kategorie", frage: "Passende Hauptkategorie gewählt?", tipp: "Hauptkategorie so wählen, dass sie die Kernleistung trifft." },
  { id: "kontakt", frage: "Adresse/Einzugsgebiet, Telefon und Website korrekt?", tipp: "Kontaktdaten prüfen und vervollständigen." },
  { id: "oeffnungszeiten", frage: "Öffnungszeiten vollständig (inkl. Feiertage)?", tipp: "Öffnungszeiten und Sonderöffnungszeiten eintragen." },
  { id: "beschreibung", frage: "Aussagekräftige Unternehmensbeschreibung vorhanden?", tipp: "Beschreibung mit Leistungen und Einzugsgebiet ergänzen." },
  { id: "leistungen", frage: "Leistungen/Produkte eingetragen?", tipp: "Leistungen bzw. Produkte mit kurzen Texten anlegen." },
  { id: "fotos", frage: "Aktuelle eigene Fotos (Team, Arbeiten, Räume)?", tipp: "Regelmäßig eigene, aktuelle Fotos hochladen (nur mit Rechten)." },
  { id: "beitraege", frage: "Beiträge in den letzten 3 Monaten?", tipp: "Monatlich einen Beitrag (Angebot, Neuigkeit, Arbeitsbeispiel)." },
  { id: "bewertungen_antworten", frage: "Werden Bewertungen beantwortet?", tipp: "Auf jede Bewertung freundlich antworten – auch auf kritische." },
  { id: "bewertungen_aktuell", frage: "Gibt es aktuelle Bewertungen (letzte 3 Monate)?", tipp: "Zufriedene Kunden um eine ehrliche Bewertung bitten (keine gekauften/gefälschten Bewertungen)." },
  { id: "fragen", frage: "Fragen & Antworten gepflegt?", tipp: "Häufige Fragen beantworten." },
];
export const ANTWORTEN = { ja: "ja", teilweise: "teilweise", nein: "nein", unbekannt: "nicht prüfbar" };
const PUNKTE = { ja: 1, teilweise: 0.5, nein: 0 };

// Analyse pruefen + auswerten. Quelle (Profil-Link) und Datum sind Pflicht.
export function pruefeAnalyse(x) {
  const quelle = String(x?.quelle || "").trim(), datum = String(x?.datum || "").trim();
  if (!/^https?:\/\/\S+$/.test(quelle)) throw new Error("Analyse: Link zum öffentlichen Google-Profil ist Pflicht");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) throw new Error("Analyse: Datum (JJJJ-MM-TT) ist Pflicht");
  const werte = {};
  for (const k of KRITERIEN) { const v = x?.werte?.[k.id] ?? "unbekannt"; if (!ANTWORTEN[v]) throw new Error(`Analyse: Antwort für „${k.frage}“ ungültig`); werte[k.id] = v; }
  const bewertbar = KRITERIEN.filter(k => werte[k.id] !== "unbekannt");
  if (bewertbar.length < 5) throw new Error("Analyse: mindestens 5 Punkte prüfen (sonst nicht aussagekräftig)");
  const punkte = Math.round(bewertbar.reduce((a, k) => a + PUNKTE[werte[k.id]], 0) / bewertbar.length * 100);
  const verbesserungen = KRITERIEN.filter(k => ["nein", "teilweise"].includes(werte[k.id])).map(k => ({ id: k.id, text: k.tipp, dringend: werte[k.id] === "nein" }));
  return { quelle, datum, werte, punkte, verbesserungen, notiz: String(x?.notiz || "").trim().slice(0, 2000) };
}

// Profil-Check-Bericht fuer den Betrieb (persoenlich zeigen/uebergeben - keine Werbe-Mail).
export function berichtText(lead, a) {
  return `PROFIL-CHECK: ${lead.firma || lead.name}${lead.branche || lead.ort ? " (" + [lead.branche, lead.ort].filter(Boolean).join(", ") + ")" : ""}
Stand ${a.datum} · geprüft: öffentliches Google-Profil (${a.quelle})
Erfüllt: ${a.punkte} von 100 Punkten (eigene Checkliste, keine Google-Bewertung)
${a.notiz ? "Hinweis zur Prüfung: " + a.notiz + "\n" : ""}
${a.verbesserungen.length ? "Verbesserungsmöglichkeiten:\n" + a.verbesserungen.map((v, i) => `${i + 1}. ${v.dringend ? "[wichtig] " : ""}${v.text}`).join("\n") : "Das Profil ist gut gepflegt – keine dringenden Punkte gefunden."}

Unser Service (auf Wunsch, monatlich kündbar):
${MONATS_AUFGABEN.map(t => "- " + t).join("\n")}
Sie bleiben Inhaber Ihres Profils; ich arbeite nur mit Ihrer schriftlichen Zustimmung als Administrator.

Hinweis: Ich verspreche keine bestimmten Platzierungen oder Anrufzahlen. Die Punkte oben kann jeder Betrieb auch selbst umsetzen.`;
}

// Monatliche Leistung (Standard-Umfang des Pilot-Angebots).
export const MONATS_AUFGABEN = [
  "Öffnungszeiten und Kontaktdaten prüfen",
  "Einen Beitrag veröffentlichen (mit Freigabe des Betriebs)",
  "Neue Fotos einstellen (nur mit Rechten, vom Betrieb geliefert)",
  "Neue Bewertungen beantworten (Text vorher mit dem Betrieb abstimmen)",
  "Kurzen Monatsbericht an den Betrieb schicken",
];
export function angebotText(lead, monatspreis_cent) {
  const preis = monatspreis_cent ? (monatspreis_cent / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" }) + " pro Monat" : "[Monatspreis – noch festzulegen]";
  return `Pflege Ihres Google-Unternehmensprofils für ${lead.firma || lead.name}
Leistungen pro Monat:
${MONATS_AUFGABEN.map(t => "- " + t).join("\n")}
Einmalig zu Beginn: Umsetzung der Punkte aus dem Profil-Check.
Preis: ${preis}
Laufzeit: monatlich kündbar
Zugang: Sie bleiben Inhaber und laden mich in Ihrer Google-Profilverwaltung als Administrator ein – ich brauche kein Passwort.
Bewertungen beantworte ich nur, wenn Sie das ausdrücklich erlauben.
Alle Änderungen teile ich Ihnen mit. Bei Kündigung gebe ich den Zugriff innerhalb von 7 Arbeitstagen ab.
Diese Gebühren sind hiermit vor Vertragsabschluss schriftlich offengelegt; auf Rechnungen werden sie separat ausgewiesen.
Keine Zusage bestimmter Platzierungen oder Anrufzahlen.`;
}
export function monatsberichtText(lead, periode, erledigt = (lead?.pilot_crm?.aenderungen || []).filter(a => String(a.datum).startsWith(periode)).map(a => a.datum + ": " + a.was)) {
  return `Monatsbericht ${periode} – ${lead.firma || lead.name}
Erledigt:
${erledigt.length ? erledigt.map(t => "- " + t).join("\n") : "- [erledigte Punkte eintragen]"}
Nächster Monat: [geplante Punkte]
Zahlen aus der Google-Profil-Statistik (nur echte Werte): [z. B. Aufrufe, Anrufe – aus dem Profil ablesen]`;
}
// Vor dem ersten Kunden abzuhaken (keine Rechtsberatung - offene Fragen an Beratung/Schuldnerberatung).
export const VERTRAG_CHECKLISTE = [
  "Leistungsumfang schriftlich (Angebotstext oben)",
  "Preis, Zahlungsweise, monatliche Kündigung",
  "Zugang nur über die Google-Nutzerverwaltung (Verwalter-Rolle), nie Passwörter",
  "Beiträge/Antworten nur nach Abstimmung mit dem Betrieb veröffentlichen",
  "Datenschutz: Bewertungen enthalten Namen – Vereinbarung zur Auftragsverarbeitung (Art. 28 DSGVO) prüfen",
  "Rechnung mit Pflichtangaben (erst nach Klärung Gewerbe/Steuer)",
];
export const periode = (d = new Date()) => new Date(d).toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" }).slice(0, 7);

// Vertrag (monatliche Leistung) pruefen.
export function pruefeVertrag(x) {
  const monatspreis_cent = x?.monatspreis_cent;
  if (!(Number.isInteger(monatspreis_cent) && monatspreis_cent > 0)) throw new Error("Monatspreis muss eine ganze Zahl in Cent > 0 sein");
  const start = String(x?.start || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) throw new Error("Startdatum (JJJJ-MM-TT) ist Pflicht");
  return { monatspreis_cent, start, aktiv: true, letzte_periode: null, erstellt_am: new Date().toISOString() };
}

// ---------- Quality Gate des Piloten ----------
// technisch = muss die Zentrale erfuellen; benutzer = braucht Adnans Entscheidung/Handlung ("Wartet auf mich").
export function pilotQualityGate({ eq, leads = [], aufgaben = [], erledigteAufgaben = [], laeufe = [], werkzeuge = [], finanzen = null, jetzt = new Date() }) {
  const vor26h = t => t && jetzt.getTime() - Date.parse(t) < 26 * 3600000;
  const lauf = id => laeufe.find(l => l.details?.aktion === id && l.details?.ergebnis === "ok");
  const c = (id, titel, ok, info, typ = "technisch") => ({ id, titel, ok: Boolean(ok), info, typ });
  const quellen = (eq?.quellen_liste || []).filter(q => q.url && q.datum && q.aussage);
  const bezahltAktiv = werkzeuge.filter(w => !w.kostenlos && !["aus", "abgelehnt"].includes(w.status));
  return [
    c("eq", "Einnahmequelle angelegt", eq, eq ? eq.name : "fehlt"),
    c("quellen", "Quellen mit Datum dokumentiert (≥ 3)", quellen.length >= 3, `${quellen.length} Quellen`),
    c("analyse", "Profil-Analyse (Checkliste mit " + KRITERIEN.length + " Punkten) verfügbar", KRITERIEN.length >= 8, "eingebaut"),
    c("leads", "Lead-Liste mit Kontaktregeln (UWG § 7)", true, `${leads.length} Leads`),
    c("angebot", "Angebot-Vorlage + Preisfeld vorhanden", true, "eingebaut"),
    c("monat", "Monatliche Leistung (Aufgaben + offene Monatsrechnung automatisch)", MONATS_AUFGABEN.length >= 3, `${MONATS_AUFGABEN.length} Monatsaufgaben`),
    c("einnahmen", "Einnahmen-Tracking (nur echte Buchungen, offen ≠ Einnahme)", finanzen && typeof finanzen.einnahmen_cent === "number", finanzen ? `Einnahmen ${finanzen.einnahmen_cent / 100} €, offen ${finanzen.offen_cent / 100} €` : "nicht geladen"),
    c("kosten", "0 € Kosten bis zur ersten Einnahme, kein kostenpflichtiges Werkzeug aktiv", finanzen && finanzen.kosten_cent === 0 && !bezahltAktiv.length, bezahltAktiv.length ? "aktiv: " + bezahltAktiv.map(w => w.name).join(", ") : `Kosten ${(finanzen?.kosten_cent || 0) / 100} €`),
    // Nachweis, dass die Automatik Aufgaben anlegt: offene ODER bereits erledigte Pilot-Aufgaben (erledigte zaehlen mit,
    // sonst wuerde das Abschliessen von Arbeit das Gate faelschlich rot machen).
    c("aufgaben", "Automatische Aufgaben vorhanden", aufgaben.length + erledigteAufgaben.length > 0, `${aufgaben.length} offen, ${erledigteAufgaben.length} erledigt`),
    c("cron", "Tägliche Prüfung lief in den letzten 26 h", vor26h(lauf("wiederkehrende-pruefungen")?.created_at), lauf("wiederkehrende-pruefungen")?.created_at || "noch nie"),
    c("bericht", "Tagesbericht in den letzten 26 h erstellt", vor26h(lauf("tagesbericht")?.created_at), lauf("tagesbericht")?.created_at || "noch nie"),
    c("zentrale", "Alles über die Master-Zentrale erreichbar", true, "Seite „Pilot: Google-Profil“"),
    c("potenzielle", "Potenzielle Kunden vorbereitet (≥ 3, mit Quelle)", leads.filter(l => /https?:\/\//.test(l.quelle || "")).length >= 3, leads.filter(l => /https?:\/\//.test(l.quelle || "")).length + " mit Quelle"),
    ...verkaufsGate(leads),
    c("preis", "Monatspreis für den Pilot festgelegt", eq?.pilot?.monatspreis_cent > 0, eq?.pilot?.monatspreis_cent ? (eq.pilot.monatspreis_cent / 100) + " €" : "noch offen – deine Entscheidung", "benutzer"),
    c("gewerbe", "Gewerbe/Steuer vor der ersten Einnahme geklärt", eq?.pilot?.gewerbe_geklaert, eq?.pilot?.gewerbe_geklaert ? "geklärt" : "offen – Schuldnerberatung 04.12.2026", "benutzer"),
  ];
}

// ---------- Verkaufsprozess (CRM), Prioritaet, Google-Regeln (27.09.2026) ----------
export const KUNDEN_STUFEN = [["LEAD", "Lead"], ["GEPRUEFT", "Geprüft"], ["KONTAKT_FREIGEGEBEN", "Kontakt freigegeben"], ["GESPRAECH", "Gespräch"], ["INTERESSE", "Interesse"], ["ANGEBOT", "Angebot"], ["KUNDE", "Kunde"], ["LAUFEND", "Laufende Leistung"], ["BEENDET", "Beendet"]];
export function kundenStufe(l) {
  const crm = l.pilot_crm || {};
  if (l.vertrag && !l.vertrag.aktiv && l.vertrag.beendet_am) return "BEENDET";
  if (l.vertrag?.aktiv) return "LAUFEND";
  if (l.status === "KUNDE") return "KUNDE";
  if (l.status === "ANGEBOT" || ["gesendet"].includes(l.angebot?.status)) return "ANGEBOT";
  if (l.status === "INTERESSENT") return "INTERESSE";
  if (l.status === "KONTAKT") return "GESPRAECH";
  if (crm.kontakt_freigegeben) return "KONTAKT_FREIGEGEBEN";
  if (l.profil_analyse) return "GEPRUEFT";
  return "LEAD";
}
// Arbeitsprioritaet aus der eigenen Analyse (viele Luecken = hoher Nutzen fuer den Betrieb). Keine Erfolgsaussage.
export function prioritaet(l) {
  const p = l.profil_analyse?.punkte;
  if (typeof p !== "number") return { stufe: "OFFEN", text: "offen (erst analysieren)" };
  return p < 50 ? { stufe: "HOCH", text: "hoch (viele Lücken)" } : p < 75 ? { stufe: "MITTEL", text: "mittel" } : { stufe: "NIEDRIG", text: "niedrig (Profil schon gut)" };
}
// Genau EINE naechste Aktion fuer Adnan - in der Reihenfolge des Verkaufsprozesses; hoehere Prioritaet zuerst.
const PRIO_RANG = { HOCH: 0, MITTEL: 1, OFFEN: 2, NIEDRIG: 3 };
export function naechstePilotAktion(leads) {
  const aktiv = leads.filter(l => !["VERLOREN", "GESPERRT"].includes(l.status)).sort((a, b) => PRIO_RANG[prioritaet(a).stufe] - PRIO_RANG[prioritaet(b).stufe]);
  const n = l => l.firma || l.name;
  const finde = st => aktiv.find(l => kundenStufe(l) === st);
  const schritte = [
    ["LEAD", l => "Google-Profil von „" + n(l) + "“ öffnen und die Profil-Analyse ausfüllen"],
    ["GEPRUEFT", l => "Entscheiden: Kontakt zu „" + n(l) + "“ freigeben? (unter „Wartet auf mich“)"],
    ["KONTAKT_FREIGEGEBEN", l => "Profil-Check-Bericht „" + n(l) + "“ persönlich zeigen (Gespräch führen)"],
    ["GESPRAECH", l => "Bei „" + n(l) + "“ nachfragen, ob Interesse besteht"],
    ["INTERESSE", l => "Unverbindliches Angebot für „" + n(l) + "“ vorbereiten (Preis: deine Entscheidung)"],
    ["ANGEBOT", l => "Rückmeldung von „" + n(l) + "“ zum Angebot abwarten bzw. nachfragen"],
    ["KUNDE", l => "Schriftliche Zustimmung von „" + n(l) + "“ dokumentieren und monatliche Leistung starten"],
  ];
  for (const [st, txt] of schritte) { const l = finde(st); if (l) return { lead_id: l.id, stufe: st, text: txt(l) }; }
  return { lead_id: null, stufe: null, text: "Neuen potenziellen Kunden erfassen (öffentliches Profil, mit Quelle)" };
}

// Google-Richtlinien fuer Drittanbieter (Quelle gespeichert, abgerufen 27.09.2026).
export const GOOGLE_REGELN = {
  quelle: "https://support.google.com/business/answer/7353941?hl=de", datum: "2026-09-27",
  punkte: [
    "Ausdrückliche Zustimmung des Inhabers – schriftlich oder digital, mündlich reicht nicht",
    "Für Antworten auf Bewertungen eine eigene, ausdrückliche Genehmigung",
    "Der Kunde bleibt Inhaber; wir nur Administrator",
    "Gebühren vor Vertragsabschluss schriftlich offenlegen und auf Rechnungen separat ausweisen",
    "Alle Profiländerungen dem Kunden mitteilen",
    "Keine falschen Versprechen zu Platzierungen, kein Druck",
    "Bei Kündigung Zugriff innerhalb von 7 Arbeitstagen abgeben",
  ],
};
const passwortVerdacht = v => /pass(wort|word)|kennwort|pwd/i.test(String(v || ""));
// Zustimmung des Kunden pruefen (Voraussetzung fuer die monatliche Leistung).
export function pruefeZustimmung(z) {
  const x = { datum: String(z?.datum || "").trim(), form: z?.form, dokument: String(z?.dokument || "").trim(), gebuehren_offengelegt: z?.gebuehren_offengelegt, kunde_bleibt_inhaber: z?.kunde_bleibt_inhaber, bewertungen_antworten_erlaubt: z?.bewertungen_antworten_erlaubt };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(x.datum)) throw new Error("Zustimmung: Datum ist Pflicht");
  if (!["schriftlich", "digital"].includes(x.form)) throw new Error("Zustimmung muss schriftlich oder digital vorliegen (Google-Regel – mündlich reicht nicht)");
  if (!x.dokument) throw new Error("Zustimmung: angeben, wo der Nachweis liegt (z. B. unterschriebenes Angebot, E-Mail vom …)");
  if (x.gebuehren_offengelegt !== true) throw new Error("Gebühren müssen vor Vertragsabschluss schriftlich offengelegt sein");
  if (x.kunde_bleibt_inhaber !== true) throw new Error("Der Kunde muss Inhaber des Profils bleiben");
  if (typeof x.bewertungen_antworten_erlaubt !== "boolean") throw new Error("Angeben, ob Antworten auf Bewertungen ausdrücklich erlaubt sind");
  if (passwortVerdacht(x.dokument)) throw new Error("Niemals Passwörter speichern");
  return x;
}
export function pruefeAenderung(a) {
  const x = { datum: String(a?.datum || "").trim(), was: String(a?.was || "").trim() };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(x.datum) || !x.was) throw new Error("Änderung: Datum und Beschreibung sind Pflicht");
  if (passwortVerdacht(x.was)) throw new Error("Niemals Passwörter speichern");
  return x;
}
// Arbeitstage (Mo-Fr) addieren - fuer die 7-Arbeitstage-Frist bei Kuendigung.
export function plusArbeitstage(d, n) { const t = new Date(d); let r = n; while (r > 0) { t.setDate(t.getDate() + 1); if (t.getDay() !== 0 && t.getDay() !== 6) r--; } return t; }

// Rechnungsentwurf (Platzhalter fuer Angaben, die erst nach der Gewerbe-/Steuerklaerung feststehen).
export const RECHNUNG_QUELLE = "https://www.gesetze-im-internet.de/ustg_1980/__14.html";
export function rechnungEntwurf(lead, buchung) {
  const betrag = (buchung.betrag_cent / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
  return `RECHNUNG – ENTWURF (nicht versenden, bevor Gewerbe/Steuer geklärt sind)
Rechnungsnummer: [fortlaufende Nummer]
Rechnungsdatum: [Datum]
Leistender: [dein Name / Firma, Anschrift] · Steuernummer/USt-IdNr.: [nach Klärung]
Empfänger: ${lead.firma || lead.name}${lead.ort ? ", " + lead.ort : ""} · [Anschrift]
Leistung: ${buchung.beschreibung}
Verwaltungsgebühr (separat ausgewiesen): ${betrag}
Umsatzsteuer: [nach Klärung – z. B. Hinweis Kleinunternehmer, falls zutreffend]
Zahlbar bis: [Datum] · Bankverbindung: [IBAN]

Pflichtangaben einer Rechnung: § 14 Abs. 4 UStG (${RECHNUNG_QUELLE}).`;
}

// Zusatz-Pruefungen des Quality Gates fuer den Verkaufsprozess ("vor jedem Live-Schritt").
export function verkaufsGate(leads) {
  const c = (id, titel, ok, info) => ({ id, titel, ok: Boolean(ok), info, typ: "technisch" });
  const ohneDaten = leads.filter(l => !l.ort || !l.branche || !/https?:\/\//.test(l.quelle || ""));
  const analysenOhneBeleg = leads.filter(l => l.profil_analyse && (!/^https?:\/\//.test(l.profil_analyse.quelle || "") || !l.profil_analyse.datum));
  const kontaktOhneFreigabe = leads.filter(l => ["KONTAKT", "INTERESSENT", "ANGEBOT"].includes(l.status) && !l.pilot_crm?.kontakt_freigegeben && !l.selbst_angefragt);
  const vertraegeOhneZustimmung = leads.filter(l => l.vertrag?.aktiv && !["schriftlich", "digital"].includes(l.pilot_crm?.zustimmung?.form));
  const personenDaten = leads.filter(l => !l.selbst_angefragt && !l.pilot_crm?.zustimmung && (l.email || l.telefon));
  const ueberfaellig = leads.filter(l => l.vertrag?.beendet_am && !l.pilot_crm?.zugriff_entfernt_am && plusArbeitstage(l.vertrag.beendet_am, 7) < new Date());
  return [
    c("daten", "Daten korrekt: jeder Betrieb mit Ort, Branche und Quelle", !ohneDaten.length, ohneDaten.length ? "fehlt bei: " + ohneDaten.map(l => l.firma).join(", ") : leads.length + " geprüft"),
    c("belege", "Keine erfundenen Angaben: jede Analyse mit Profil-Link und Datum", !analysenOhneBeleg.length, analysenOhneBeleg.length ? "ohne Beleg: " + analysenOhneBeleg.map(l => l.firma).join(", ") : "ok"),
    c("automatik", "Keine unzulässige Automatisierung: nichts wird automatisch gesendet, Kontakt nur nach Freigabe", !kontaktOhneFreigabe.length, kontaktOhneFreigabe.length ? "Kontakt ohne Freigabe: " + kontaktOhneFreigabe.map(l => l.firma).join(", ") : "ok"),
    c("google", "Google-Drittanbieterregeln: schriftliche Zustimmung, Kunde bleibt Inhaber, Zugriff nach Kündigung in 7 Arbeitstagen abgegeben", !vertraegeOhneZustimmung.length && !ueberfaellig.length, vertraegeOhneZustimmung.length || ueberfaellig.length ? [...vertraegeOhneZustimmung.map(l => l.firma + " ohne Zustimmung"), ...ueberfaellig.map(l => l.firma + ": Zugriff noch nicht entfernt")].join(", ") : "Regeln gespeichert (Quelle Google)"),
    c("datenschutz", "Datenschutz: bei Interessenten nur öffentliche Betriebsdaten, keine privaten Kontaktdaten ohne Anlass", !personenDaten.length, personenDaten.length ? "prüfen: " + personenDaten.map(l => l.firma).join(", ") : "ok"),
  ];
}

// ---------- Erstkunden-Paket (27.09.2026): Gespraechsleitfaden + Entscheidungsvorlage ----------
// Leitfaden fuer das persoenliche Gespraech (kein Verkaufsdruck, keine Versprechen, nichts unterschreiben lassen).
export const GESPRAECHSLEITFADEN = [
  { schritt: "Vorstellen", text: "Kurz sagen, wer du bist und dass du dir das öffentliche Google-Profil des Betriebs angesehen hast – kostenlos und unverbindlich." },
  { schritt: "Ergebnis zeigen", text: "Die ausgedruckte Unterlage zeigen: Punkte und die 2–3 wichtigsten Lücken. Nur sagen, was sichtbar war; „nicht prüfbar“ offen benennen." },
  { schritt: "Fragen", text: "„Kümmert sich schon jemand um Ihr Google-Profil?“ – „Wie finden neue Kunden Sie heute?“ – „Haben Sie Zeit, das selbst zu pflegen?“" },
  { schritt: "Angebot erklären (ohne Preis-Zusage)", text: "Monatliche Pflege laut Unterlage, jederzeit kündbar, der Betrieb bleibt Inhaber. Einen Preis nennst du erst, wenn er festgelegt ist (Wartet auf mich)." },
  { schritt: "Nicht versprechen", text: "Keine Platzierungen, keine Anrufzahlen, keine gekauften Bewertungen, keine Passwörter annehmen – Zugriff nur über Google als Administrator." },
  { schritt: "Abschluss", text: "Unterlage dalassen. Bei Interesse: „Ich melde mich mit einem schriftlichen Angebot.“ Nichts unterschreiben lassen, nichts kassieren." },
  { schritt: "Danach in der Zentrale", text: "Beim Betrieb „Gespräch geführt“ klicken und Ergebnis notieren (Interesse ja/nein, Einwände). Die Zentrale legt die nächsten Aufgaben an." },
];

// Entscheidungsvorlage: je offener Entscheidung - was fehlt, warum, Kosten, kostenlose Alternative, Quellen.
export const ENTSCHEIDUNGEN = [
  { id: "kontakt", titel: "Kontakt zu einem Betrieb freigeben", was_fehlt: "Deine Entscheidung, ob du einen der 3 analysierten Betriebe persönlich besuchst.",
    warum: "Ohne Gespräch kein Interessent – die Zentrale kontaktiert niemanden selbst (keine Werbung ohne Einwilligung, UWG § 7).", kosten: "0 € (eigene Anfahrt)",
    alternative: "Nur den nächstgelegenen Betrieb zuerst besuchen; die anderen bleiben unverändert gespeichert.", quellen: ["https://www.gesetze-im-internet.de/uwg_2004/__7.html"] },
  { id: "preis", titel: "Monatspreis festlegen", was_fehlt: "Ein Monatspreis für das schriftliche Angebot.",
    warum: "Google verlangt, Gebühren vorher schriftlich offenzulegen; ohne Preis kein Angebot.", kosten: "0 € – es ist nur eine Entscheidung.",
    alternative: "Kostenloser Pilotmonat als Referenz (bringt keine Einnahme, aber eine Referenz); Vergleichspreise der Quellen: 49 € (Gründungspreis) / 99 € (Liste) bei einem Anbieter, 150–600 € laut Agentur-Leitfaden – keine eigene Kalkulation.",
    quellen: ["https://support.google.com/business/answer/7353941?hl=de", "https://powerhandwerk.de/ratgeber/google-unternehmensprofil-kosten", "https://lokalbesucher.de/google-unternehmensprofil/"] },
  { id: "gewerbe", titel: "Gewerbe/Steuer vor der ersten Einnahme klären", was_fehlt: "Die Klärung, ob und wie du die Tätigkeit anmeldest und versteuerst.",
    warum: "Wer ein Gewerbe selbständig beginnt, muss es anzeigen (§ 14 GewO). Ob das für dich jetzt möglich ist, klärt die Schuldnerberatung (Termin 04.12.2026) – nicht die Zentrale.",
    kosten: "Gewerbeanmeldung in Monheim: 26 € (laut Stadt Monheim, Stand 27.09.2026). Der Termin bei der Schuldnerberatung steht bereits (04.12.2026).",
    alternative: "Bis zur Klärung ohne Einnahme arbeiten: Profil-Checks und Gespräche sind kostenlos möglich; die erste Rechnung erst nach der Klärung.",
    quellen: ["https://www.gesetze-im-internet.de/gewo/__14.html", "https://www.monheim.de/service-verwaltung/was-erledige-ich-wo/dienstleistung/gewerbe"] },
  { id: "avv", titel: "Anfragen-Service: Auftragsverarbeitung (AVV)", was_fehlt: "Ein AVV-Vertrag mit dem ersten echten Pilotkunden, bevor fremde Kundendaten bearbeitet werden.",
    warum: "Wer personenbezogene Daten im Auftrag verarbeitet, braucht einen Vertrag nach Art. 28 DSGVO.", kosten: "0 € mit einer amtlichen Formulierungshilfe; nur eine anwaltliche Prüfung würde Geld kosten (optional, vorher fragen).",
    alternative: "Kostenlose Formulierungshilfe der Datenschutzaufsicht (z. B. Bayern) verwenden; bis dahin nur Testfälle ohne echte Personendaten.",
    quellen: ["https://dsgvo-gesetz.de/art-28-dsgvo/", "https://www.lda.bayern.de/media/muster/formulierungshilfe_av.pdf"] },
];
