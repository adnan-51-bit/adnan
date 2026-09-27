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

${a.verbesserungen.length ? "Verbesserungsmöglichkeiten:\n" + a.verbesserungen.map((v, i) => `${i + 1}. ${v.dringend ? "[wichtig] " : ""}${v.text}`).join("\n") : "Das Profil ist gut gepflegt – keine dringenden Punkte gefunden."}

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
Zugang: Sie laden mich in Ihrer Google-Profilverwaltung als Verwalter ein – ich brauche kein Passwort.
Keine Zusage bestimmter Platzierungen oder Anrufzahlen.`;
}
export function monatsberichtText(lead, periode, erledigt = []) {
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
export function pilotQualityGate({ eq, leads = [], aufgaben = [], laeufe = [], werkzeuge = [], finanzen = null, jetzt = new Date() }) {
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
    c("aufgaben", "Automatische Aufgaben vorhanden", aufgaben.length > 0, `${aufgaben.length} offene Pilot-Aufgaben`),
    c("cron", "Tägliche Prüfung lief in den letzten 26 h", vor26h(lauf("wiederkehrende-pruefungen")?.created_at), lauf("wiederkehrende-pruefungen")?.created_at || "noch nie"),
    c("bericht", "Tagesbericht in den letzten 26 h erstellt", vor26h(lauf("tagesbericht")?.created_at), lauf("tagesbericht")?.created_at || "noch nie"),
    c("zentrale", "Alles über die Master-Zentrale erreichbar", true, "Seite „Pilot: Google-Profil“"),
    c("potenzielle", "Potenzielle Kunden vorbereitet (≥ 3, mit Quelle)", leads.filter(l => /https?:\/\//.test(l.quelle || "")).length >= 3, leads.filter(l => /https?:\/\//.test(l.quelle || "")).length + " mit Quelle"),
    c("preis", "Monatspreis für den Pilot festgelegt", eq?.pilot?.monatspreis_cent > 0, eq?.pilot?.monatspreis_cent ? (eq.pilot.monatspreis_cent / 100) + " €" : "noch offen – deine Entscheidung", "benutzer"),
    c("gewerbe", "Gewerbe/Steuer vor der ersten Einnahme geklärt", eq?.pilot?.gewerbe_geklaert, eq?.pilot?.gewerbe_geklaert ? "geklärt" : "offen – Schuldnerberatung 04.12.2026", "benutzer"),
  ];
}

// ---------- Erster-Kunde-Modus: Stufen und naechste Aktion (aus echten Daten abgeleitet) ----------
export const KUNDEN_STUFEN = [["POTENZIELL", "Potenziell"], ["GESPRAECH", "Gespräch"], ["INTERESSE", "Interesse"], ["KUNDE", "Kunde"], ["LAUFEND", "Laufende Leistung"]];
export function kundenStufe(l) {
  if (l.vertrag?.aktiv) return "LAUFEND";
  if (l.status === "KUNDE") return "KUNDE";
  if (["INTERESSENT", "ANGEBOT"].includes(l.status)) return "INTERESSE";
  if (l.status === "KONTAKT") return "GESPRAECH";
  return "POTENZIELL";
}
// Genau EINE naechste Aktion fuer Adnan - Reihenfolge: Analyse vor Gespraech vor Nachfragen vor Angebot.
export function naechstePilotAktion(leads) {
  const aktiv = leads.filter(l => !["VERLOREN", "GESPERRT"].includes(l.status));
  const n = l => l.firma || l.name;
  const ohne = aktiv.find(l => !l.profil_analyse && l.status !== "KUNDE");
  if (ohne) return { lead_id: ohne.id, text: "Google-Profil von „" + n(ohne) + "“ öffnen und die Profil-Analyse ausfüllen" };
  const gespraech = aktiv.find(l => kundenStufe(l) === "POTENZIELL");
  if (gespraech) return { lead_id: gespraech.id, text: "Profil-Check-Bericht „" + n(gespraech) + "“ persönlich zeigen (Gespräch führen)" };
  const nachfragen = aktiv.find(l => kundenStufe(l) === "GESPRAECH");
  if (nachfragen) return { lead_id: nachfragen.id, text: "Bei „" + n(nachfragen) + "“ nachfragen, ob Interesse besteht" };
  const interesse = aktiv.find(l => kundenStufe(l) === "INTERESSE");
  if (interesse) return { lead_id: interesse.id, text: "Unverbindliches Angebot für „" + n(interesse) + "“ vorbereiten (Preis: deine Entscheidung)" };
  return { lead_id: null, text: "Neuen potenziellen Kunden erfassen (öffentliches Profil, mit Quelle)" };
}
