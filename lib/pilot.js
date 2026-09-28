// Pilot "Pflege Google-Unternehmensprofil" (27.09.2026, Teil 5): nutzt die bestehende Einnahmequelle (Kategorie C),
// die zentrale Lead-Liste, Aufgaben, Finanzen und Freigaben. Neu: Profil-Analyse je Betrieb, monatliche Leistung
// (Vertrag) mit automatischen Monatsaufgaben + offener Monatsrechnung, Quality Gate, "Wartet auf mich".
import { listEinnahmequellen, setzePilot } from "./einnahmequellen.js";
import { ersteEinnahmeCheckliste } from "./erste-einnahme.js";
import { bewerteLead } from "./lead-bewertung.js";
import { listLeads, leadFeldSetzen } from "./leads.js";
import { createTask, listTasks } from "./master-tasks.js";
import { createFinance, listFinance, eqFinanzen } from "./master-finance.js";
import { freigabeAnfordern, listFreigaben, freigabeEntscheiden, werkzeugStatus } from "./freigaben.js";
import { writeAudit } from "./audit.js";
import { istOffen } from "./aufgaben-status.js";
import { pruefeAnalyse, pruefeVertrag, berichtText, angebotText, monatsberichtText, rechnungEntwurf, MONATS_AUFGABEN, VERTRAG_CHECKLISTE, KRITERIEN, periode, pilotQualityGate, naechstePilotAktion, kundenStufe, prioritaet, ladenlokal, besuchsRang, KUNDEN_STUFEN, GOOGLE_REGELN, pruefeZustimmung, pruefeAenderung, plusArbeitstage } from "./google-profil.js";
import { leadStatusSetzen } from "./leads.js";
import { updateTask } from "./master-tasks.js";
import { leadAnlegen } from "./leads.js";

const plusTage = n => new Date(Date.now() + n * 86400000).toISOString();
export async function pilotEq() {
  const eq = (await listEinnahmequellen()).find(q => q.kategorie === "C");
  if (!eq) throw new Error("Einnahmequelle „Google-Unternehmensprofil“ (Kategorie C) fehlt");
  return eq;
}
const aufgabe = (eq, title, extra = {}) => createTask({ title, area: "Pilot Google-Profil", business_id: "master", priority: "Mittel", owner: "Adnan", einnahmequelle_id: eq.id, ...extra });

// "Wartet auf mich": die zwei persoenlichen Entscheidungen des Piloten (einmalig, solange offen).
export async function syncPilotFreigaben(eq) {
  const alle = await listFreigaben();
  const gibt = id => alle.some(f => f.bezug_typ === "pilot" && f.bezug_id === id);
  if (!eq.pilot?.monatspreis_cent && !gibt("preis:" + eq.id)) await freigabeAnfordern({ art: "ENTSCHEIDUNG", titel: "Pilot Google-Profil: Monatspreis festlegen", beschreibung: "Den Preis bestimmst du. Zum Vergleich (keine Zusage): ein Anbieter nennt 49 € netto/Monat (Gründungspreis), Listenpreis 99 € netto – Quelle in der Einnahmequelle. Eintragen auf der Seite „Pilot: Google-Profil“.", bereich: "einnahmequellen", bezug_typ: "pilot", bezug_id: "preis:" + eq.id });
  if (!eq.pilot?.gewerbe_geklaert && !gibt("gewerbe:" + eq.id)) await freigabeAnfordern({ art: "RECHT", titel: "Pilot Google-Profil: Gewerbe/Steuer vor der ersten Einnahme klären", beschreibung: "Kostenlos testen (Profil-Checks, Gespräche) geht vorher. Vor der ersten bezahlten Leistung mit der Schuldnerberatung klären (Termin 04.12.2026). „Freigeben“ erst, wenn es geklärt ist.", bereich: "einnahmequellen", bezug_typ: "pilot", bezug_id: "gewerbe:" + eq.id });
}

export async function pilotDaten({ jetzt = new Date() } = {}) {
  const eq = await pilotEq();
  await syncPilotFreigaben(eq);
  const { listeLaeufe } = await import("./aktion-ausfuehren.js");
  const [leads, tasks, finance, laeufe, werkzeuge, freigaben] = await Promise.all([listLeads(), listTasks(), listFinance(), listeLaeufe(200), werkzeugStatus(), listFreigaben()]);
  const eigeneLeads = leads.filter(l => l.einnahmequelle_id === eq.id);
  const aufgaben = tasks.filter(t => t.einnahmequelle_id === eq.id && istOffen(t.status));
  const finanzen = eqFinanzen(finance, eq.id);
  const erledigteAufgaben = tasks.filter(t => t.einnahmequelle_id === eq.id && t.status === "Erledigt");
  const gate = pilotQualityGate({ eq, leads: eigeneLeads, aufgaben, erledigteAufgaben, laeufe, werkzeuge, finanzen, jetzt });
  return { eq, googleRegeln: GOOGLE_REGELN, leads: eigeneLeads.map(l => ({ ...l, stufe: kundenStufe(l), prioritaet: prioritaet(l), bewertung: bewerteLead(l), laden: ladenlokal(l), rang: besuchsRang(l) })).sort((a, b) => a.rang - b.rang), naechsteAktion: naechstePilotAktion(eigeneLeads), stufen: KUNDEN_STUFEN, aufgaben, finanzen, gate, kriterien: KRITERIEN, monatsAufgaben: MONATS_AUFGABEN, vertragCheckliste: VERTRAG_CHECKLISTE,
    wartetAufMich: freigaben.filter(f => f.status === "OFFEN" && (f.bezug_typ === "pilot" || f.bereich === "einnahmequellen")),
    ersteEinnahme: ersteEinnahmeCheckliste({ eq, leads, tasks, finance, freigaben }) };
}

// Profil-Analyse speichern -> automatische Aufgaben (Interessent: Bericht persoenlich zeigen; Kunde: Verbesserungen umsetzen).
export async function analyseSpeichern(leadId, input) {
  const eq = await pilotEq();
  const lead = (await listLeads()).find(l => l.id === leadId);
  if (!lead) throw new Error("Lead nicht gefunden");
  const a = { ...pruefeAnalyse(input), erstellt_am: new Date().toISOString() };
  const r = await leadFeldSetzen(leadId, { profil_analyse: a });
  // Die zugehoerige Aufgabe "Profil-Analyse: ..." ist damit erledigt (sonst bliebe sie faelschlich offen).
  await schliesseAufgaben(leadId, /^Profil-Analyse:/, `Analyse gespeichert: ${a.punkte}/100`);
  if (lead.status === "KUNDE") for (const v of a.verbesserungen) await aufgabe(eq, `${lead.firma || lead.name}: ${v.text}`, { priority: v.dringend ? "Hoch" : "Mittel", quelle: "lead:" + leadId, beschreibung: "Automatisch aus der Profil-Analyse." });
  else if (!lead.pilot_crm?.kontakt_freigegeben) await freigabeAnfordern({ art: "ENTSCHEIDUNG", titel: `Kontakt zu „${lead.firma || lead.name}“ freigeben?`, beschreibung: `Potentieller Lead – menschliche Prüfung erforderlich. Profil-Check: ${a.punkte}/100, ${a.verbesserungen.length} Verbesserungen. Bei Freigabe kannst du im Pilot den Brief mit Antwort-Link drucken (oder persönlich vorbeigehen) – es wird nichts automatisch gesendet.`, bereich: "einnahmequellen", bezug_typ: "lead-kontakt", bezug_id: leadId });
  await writeAudit({ action: "pilot.analyse", entityType: "lead", entityId: leadId, details: { punkte: a.punkte, verbesserungen: a.verbesserungen.length } });
  return { lead: r, analyse: a, bericht: berichtText(lead, a) };
}

// Monatspreis festlegen (Adnans Entscheidung) -> offene Entscheidung in "Wartet auf mich" wird geschlossen.
export async function preisFestlegen(monatspreis_cent) {
  if (!(Number.isInteger(monatspreis_cent) && monatspreis_cent > 0)) throw new Error("Monatspreis muss eine ganze Zahl in Cent > 0 sein");
  const eq = await pilotEq();
  const r = await setzePilot(eq.id, { monatspreis_cent, preis_gesetzt_am: new Date().toISOString() });
  const offen = (await listFreigaben()).find(f => f.status === "OFFEN" && f.bezug_typ === "pilot" && f.bezug_id === "preis:" + eq.id);
  if (offen) await freigabeEntscheiden(offen.id, "FREIGEGEBEN", `Monatspreis ${(monatspreis_cent / 100).toFixed(2).replace(".", ",")} € festgelegt`);
  return r;
}

// Monatliche Leistung starten (nur fuer echte Kunden). Kundenzugang braucht den Betrieb -> "wartet auf dich".
export async function vertragStarten(leadId, input) {
  const eq = await pilotEq();
  const lead = (await listLeads()).find(l => l.id === leadId);
  if (!lead) throw new Error("Lead nicht gefunden");
  if (lead.status !== "KUNDE") throw new Error("Monatliche Leistung erst für Kunden (Angebot angenommen)");
  if (lead.vertrag?.aktiv) throw new Error("Monatliche Leistung läuft bereits");
  const z = pruefeZustimmung(input?.zustimmung);
  const v = { ...pruefeVertrag({ monatspreis_cent: input?.monatspreis_cent ?? eq.pilot?.monatspreis_cent, start: input?.start }), bewertungen_antworten_erlaubt: z.bewertungen_antworten_erlaubt };
  await leadFeldSetzen(leadId, { vertrag: v, pilot_crm: { ...(lead.pilot_crm || {}), zustimmung: { ...z, erfasst_am: new Date().toISOString() } } });
  await aufgabe(eq, `Kundenzugang: ${lead.firma || lead.name} lädt dich in der Google-Profilverwaltung als Administrator ein`, { status: "Wartet auf Benutzer", priority: "Hoch", quelle: "lead:" + leadId, naechste_aktion: "Betrieb bleibt Inhaber und lädt dich über Google als Administrator ein – kein Passwort annehmen; danach „Google-Zugang bestätigt“" });
  await writeAudit({ action: "pilot.vertrag", entityType: "lead", entityId: leadId, details: { monatspreis_cent: v.monatspreis_cent, start: v.start } });
  const lauf = await monatsLauf();
  return { lead: (await listLeads()).find(l => l.id === leadId), lauf };
}
export async function vertragBeenden(leadId) {
  const lead = (await listLeads()).find(l => l.id === leadId);
  if (!lead?.vertrag?.aktiv) throw new Error("Keine laufende monatliche Leistung");
  const jetzt = new Date();
  const r = await leadFeldSetzen(leadId, { vertrag: { ...lead.vertrag, aktiv: false, beendet_am: jetzt.toISOString() } });
  const frist = plusArbeitstage(jetzt, 7);
  await aufgabe(await pilotEq(), `Google-Zugriff für „${lead.firma || lead.name}“ entfernen – spätestens ${frist.toLocaleDateString("de-DE")}`, { priority: "Hoch", quelle: "lead:" + leadId, due_at: frist.toISOString(), naechste_aktion: "In der Google-Profilverwaltung als Administrator austragen, danach „Zugriff entfernt“ klicken (Google-Regel: 7 Arbeitstage)" });
  await writeAudit({ action: "pilot.vertrag_ende", entityType: "lead", entityId: leadId, details: {} });
  return r;
}

// Monatslauf (taeglich per Cron, idempotent): je laufendem Vertrag einmal pro Monat die Monatsaufgaben und eine
// OFFENE Monatsrechnung anlegen. Offen heisst: zaehlt erst nach "Geld ist da" als Einnahme.
export async function monatsLauf(jetzt = new Date()) {
  const eq = await pilotEq();
  const p = periode(jetzt);
  const heute = jetzt.toISOString().slice(0, 10);
  let neu = 0;
  for (const l of (await listLeads()).filter(x => x.einnahmequelle_id === eq.id && x.vertrag?.aktiv && x.vertrag.start <= heute && x.vertrag.letzte_periode !== p)) {
    for (const t of MONATS_AUFGABEN.filter(t => l.vertrag.bewertungen_antworten_erlaubt || !/Bewertungen/.test(t))) await aufgabe(eq, `${p} · ${l.firma || l.name}: ${t}`, { quelle: "lead:" + l.id, due_at: plusTage(21), beschreibung: t.startsWith("Kurzen Monatsbericht") ? monatsberichtText(l, p) : "Automatisch aus der monatlichen Leistung. Profil nur im vereinbarten Umfang ändern und jede Änderung protokollieren." });
    await createFinance({ kind: "income", amount: l.vertrag.monatspreis_cent / 100, category: "Einnahmequelle", description: `Monatsleistung ${p} – ${l.firma || l.name}`, status: "pending", source: "Vertrag (monatlich)", einnahmequelle_id: eq.id, lead_id: l.id });
    await leadFeldSetzen(l.id, { vertrag: { ...l.vertrag, letzte_periode: p } });
    neu++;
  }
  return { periode: p, neu };
}
export { berichtText, angebotText };

// Potenziellen Kunden erfassen: nur oeffentlich belegte Angaben mit Quelle (URL + Datum). Keine Kontaktaufnahme.
export async function potenziellenKundenAnlegen(x) {
  const eq = await pilotEq();
  const firma = String(x?.firma || "").trim(), ort = String(x?.ort || "").trim(), branche = String(x?.branche || "").trim();
  const quelleUrl = String(x?.quelle_url || "").trim(), datum = String(x?.quelle_datum || "").trim();
  if (!firma || !ort || !branche) throw new Error("Name, Ort und Branche sind Pflicht");
  if (!/^https?:\/\/\S+$/.test(quelleUrl)) throw new Error("Quelle (Link, woher die Angaben stammen) ist Pflicht");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) throw new Error("Datum der Recherche ist Pflicht");
  if ((await listLeads()).some(l => l.einnahmequelle_id === eq.id && String(l.firma).toLowerCase() === firma.toLowerCase() && String(l.ort || "").toLowerCase() === ort.toLowerCase())) throw new Error("Diesen Betrieb gibt es schon");
  const website = String(x?.website || "").trim();
  if (website && !/^https?:\/\/\S+$/.test(website)) throw new Error("Website: gültiger Link oder leer lassen");
  const telefon = String(x?.telefon || "").trim().slice(0, 40);
  const { lead } = await leadAnlegen({ name: firma, firma, ort, branche, website, telefon, einnahmequelle_id: eq.id, selbst_angefragt: false, einwilligung: false,
    quelle: quelleUrl + " (abgerufen " + datum + ")", notiz: String(x?.notiz || "").trim() }, { ohneAufgabe: true });
  await aufgabe(eq, "Profil-Analyse: " + firma + " (" + ort + ") – Google-Profil öffnen und 10 Punkte prüfen", { priority: "Hoch", owner: "Claude / Zentrale", quelle: "lead:" + lead.id, due_at: plusTage(3), naechste_aktion: "In Google Maps nach dem Betrieb suchen, Profil-Link kopieren, Analyse ausfüllen (Claude, sobald der Browser verbunden ist)" });
  await writeAudit({ action: "pilot.potenziell", entityType: "lead", entityId: lead.id, details: { firma, ort, branche, quelle: quelleUrl } });
  return lead;
}

// Kontakt-Freigabe entschieden (aus "Wartet auf mich"): ja -> Aufgabe "Bericht persoenlich zeigen"; nein -> kein Interesse.
export async function kontaktEntscheidung(leadId, ja, notiz = "") {
  const eq = await pilotEq();
  const lead = (await listLeads()).find(l => l.id === leadId); if (!lead) return;
  if (ja) {
    await leadFeldSetzen(leadId, { pilot_crm: { ...(lead.pilot_crm || {}), kontakt_freigegeben: true, kontakt_freigabe_am: new Date().toISOString() } });
    await aufgabe(eq, "Profil-Check-Bericht persönlich zeigen: " + (lead.firma || lead.name), { quelle: "lead:" + leadId, due_at: plusTage(7), naechste_aktion: "Bericht ausdrucken oder am Handy zeigen – keine Werbe-Mail; danach „Gespräch geführt“" });
  } else await leadStatusSetzen(leadId, "VERLOREN");
  await writeAudit({ action: "pilot.kontakt_entscheidung", entityType: "lead", entityId: leadId, details: { freigegeben: ja, notiz } });
}
async function crmSetzen(leadId, patch, aktion) {
  const lead = (await listLeads()).find(l => l.id === leadId); if (!lead) throw new Error("Lead nicht gefunden");
  const r = await leadFeldSetzen(leadId, { pilot_crm: { ...(lead.pilot_crm || {}), ...patch(lead) } });
  await writeAudit({ action: "pilot." + aktion, entityType: "lead", entityId: leadId, details: patch(lead) });
  return { lead, r };
}
async function schliesseAufgaben(leadId, muster, ergebnis) { for (const t of (await listTasks()).filter(t => t.quelle === "lead:" + leadId && istOffen(t.status) && muster.test(t.title))) await updateTask(t.id, { status: "Erledigt", ergebnis }); }
// Google-Zugang bestaetigt: nur Rolle Administrator (Kunde bleibt Inhaber).
export async function googleZugangBestaetigen(leadId, { rolle, datum }) {
  if (rolle !== "Administrator") throw new Error("Nur als Administrator – der Kunde bleibt Inhaber (Google-Regel)");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(datum || ""))) throw new Error("Datum ist Pflicht");
  const lead = (await listLeads()).find(l => l.id === leadId);
  if (!lead?.vertrag?.aktiv) throw new Error("Erst nach Start der monatlichen Leistung (mit Zustimmung)");
  const { r } = await crmSetzen(leadId, () => ({ google_zugang: { rolle, datum } }), "google_zugang");
  await schliesseAufgaben(leadId, /^Kundenzugang:/, "Als Administrator eingeladen am " + datum);
  return r;
}
// Aenderung am Kundenprofil protokollieren (Google-Regel: alle Aenderungen mitteilen - erscheinen im Kundenbericht).
export async function aenderungProtokollieren(leadId, aenderung) {
  const a = pruefeAenderung(aenderung);
  const lead = (await listLeads()).find(l => l.id === leadId);
  if (!lead?.pilot_crm?.google_zugang) throw new Error("Änderungen nur mit bestätigtem Google-Zugang (Administrator)");
  const { r } = await crmSetzen(leadId, l => ({ aenderungen: [...(l.pilot_crm?.aenderungen || []), { ...a, erfasst_am: new Date().toISOString() }] }), "aenderung");
  return r;
}
export async function zugriffEntfernt(leadId, { datum }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(datum || ""))) throw new Error("Datum ist Pflicht");
  const lead = (await listLeads()).find(l => l.id === leadId);
  if (!lead?.vertrag?.beendet_am) throw new Error("Erst nach Beenden der Leistung");
  const { r } = await crmSetzen(leadId, () => ({ zugriff_entfernt_am: datum }), "zugriff_entfernt");
  await schliesseAufgaben(leadId, /^Google-Zugriff für/, "Zugriff entfernt am " + datum);
  return r;
}
// Ladenlokal geprueft setzen (28.09.2026): true/false/null. Aendert nur die Reihenfolge fuer den persoenlichen Kontakt.
export async function ladenlokalSetzen(leadId, wert) {
  if (![true, false, null].includes(wert)) throw new Error("Ladenlokal: ja, nein oder unbekannt");
  const { r } = await crmSetzen(leadId, () => ({ ladenlokal: wert }), "ladenlokal");
  return r;
}
// Persoenlicher Brief-Absatz (28.09.2026): ersetzt im Druck die allgemeine Einleitung. Nur Text, keine Links.
export async function briefAbsatzSetzen(leadId, text) {
  const t = String(text ?? "").replace(/\s+/g, " ").trim();
  if (t && (t.length < 40 || t.length > 900)) throw new Error("Brief-Absatz: 40 bis 900 Zeichen (oder leer für den Standardtext)");
  if (/https?:\/\/|www\./i.test(t)) throw new Error("Brief-Absatz: bitte keine Links – der Antwort-Link steht automatisch im Brief");
  const { r } = await crmSetzen(leadId, () => ({ brief_absatz: t || null }), "brief_absatz");
  return r;
}
// Gleicher Inhaber (28.09.2026): Betrieb wird zusammen mit dem Hauptbetrieb angesprochen - ein Brief, beide Profil-Checks.
// Nur mit oeffentlichem Nachweis (z. B. Impressum) setzen. hauptId null = wieder getrennt.
export async function zusammenMit(leadId, hauptId, nachweis = "") {
  const alle = await listLeads();
  if (hauptId !== null) {
    const haupt = alle.find(l => l.id === hauptId);
    if (!haupt || hauptId === leadId) throw new Error("Hauptbetrieb nicht gefunden");
    if (haupt.pilot_crm?.zusammen_mit) throw new Error("Der Hauptbetrieb ist selbst schon zugeordnet");
    if (String(nachweis).trim().length < 10) throw new Error("Nachweis (z. B. Impressum mit Datum) ist Pflicht");
  }
  const { r } = await crmSetzen(leadId, () => ({ zusammen_mit: hauptId, zusammen_nachweis: hauptId ? String(nachweis).trim().slice(0, 300) : null }), "zusammen_mit");
  return r;
}
export async function rechnungVorbereiten(buchungId) {
  const eq = await pilotEq();
  const b = eqFinanzen(await listFinance(), eq.id).buchungen.find(x => String(x.id) === String(buchungId));
  if (!b || b.art !== "Einnahme") throw new Error("Buchung nicht gefunden");
  const lead = (await listLeads()).find(l => l.id === b.lead_id) || { firma: "[Kunde]" };
  return rechnungEntwurf(lead, b);
}

// Angebot freigeben (Wartet auf mich): nur mit festgelegtem Monatspreis. Das Angebot wird mit Preis uebergabefertig.
// betrag_cent bleibt leer: die Einnahme entsteht erst monatlich als OFFENE Buchung nach gestarteter Leistung (keine Doppelbuchung).
export async function angebotFreigabePruefen(leadId) {
  const eq = await pilotEq();
  if (!(eq.pilot?.monatspreis_cent > 0)) throw new Error("Erst den Monatspreis festlegen (Pilot → Monatspreis) – dann das Angebot freigeben");
  const lead = (await listLeads()).find(l => l.id === leadId); if (!lead?.angebot) throw new Error("Kein Angebotsentwurf vorhanden");
}
export async function angebotFreigeben(leadId) {
  const eq = await pilotEq();
  const lead = (await listLeads()).find(l => l.id === leadId); if (!lead) return;
  await leadFeldSetzen(leadId, { angebot: { ...lead.angebot, text: angebotText(lead, eq.pilot.monatspreis_cent), monatspreis_cent: eq.pilot.monatspreis_cent, betrag_cent: null, status: "freigegeben", freigegeben_am: new Date().toISOString() } });
  await writeAudit({ action: "pilot.angebot_freigegeben", entityType: "lead", entityId: leadId, details: { monatspreis_cent: eq.pilot.monatspreis_cent } });
}
