// Pilot "Pflege Google-Unternehmensprofil" (27.09.2026, Teil 5): nutzt die bestehende Einnahmequelle (Kategorie C),
// die zentrale Lead-Liste, Aufgaben, Finanzen und Freigaben. Neu: Profil-Analyse je Betrieb, monatliche Leistung
// (Vertrag) mit automatischen Monatsaufgaben + offener Monatsrechnung, Quality Gate, "Wartet auf mich".
import { listEinnahmequellen, setzePilot } from "./einnahmequellen.js";
import { listLeads, leadFeldSetzen } from "./leads.js";
import { createTask, listTasks } from "./master-tasks.js";
import { createFinance, listFinance, eqFinanzen } from "./master-finance.js";
import { freigabeAnfordern, listFreigaben, freigabeEntscheiden, werkzeugStatus } from "./freigaben.js";
import { writeAudit } from "./audit.js";
import { istOffen } from "./aufgaben-status.js";
import { pruefeAnalyse, pruefeVertrag, berichtText, angebotText, MONATS_AUFGABEN, VERTRAG_CHECKLISTE, KRITERIEN, periode, pilotQualityGate } from "./google-profil.js";

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
  const gate = pilotQualityGate({ eq, leads: eigeneLeads, aufgaben, laeufe, werkzeuge, finanzen, jetzt });
  return { eq, leads: eigeneLeads, aufgaben, finanzen, gate, kriterien: KRITERIEN, monatsAufgaben: MONATS_AUFGABEN, vertragCheckliste: VERTRAG_CHECKLISTE,
    wartetAufMich: freigaben.filter(f => f.status === "OFFEN" && (f.bezug_typ === "pilot" || f.bereich === "einnahmequellen")) };
}

// Profil-Analyse speichern -> automatische Aufgaben (Interessent: Bericht persoenlich zeigen; Kunde: Verbesserungen umsetzen).
export async function analyseSpeichern(leadId, input) {
  const eq = await pilotEq();
  const lead = (await listLeads()).find(l => l.id === leadId);
  if (!lead) throw new Error("Lead nicht gefunden");
  const a = { ...pruefeAnalyse(input), erstellt_am: new Date().toISOString() };
  const r = await leadFeldSetzen(leadId, { profil_analyse: a });
  if (lead.status === "KUNDE") for (const v of a.verbesserungen) await aufgabe(eq, `${lead.firma || lead.name}: ${v.text}`, { priority: v.dringend ? "Hoch" : "Mittel", quelle: "lead:" + leadId, beschreibung: "Automatisch aus der Profil-Analyse." });
  else await aufgabe(eq, `Profil-Check-Bericht persönlich zeigen: ${lead.firma || lead.name}`, { quelle: "lead:" + leadId, due_at: plusTage(7), beschreibung: `Ergebnis ${a.punkte}/100, ${a.verbesserungen.length} Verbesserungen.`, naechste_aktion: "Bericht ausdrucken oder am Handy zeigen – keine Werbe-Mail ohne Einwilligung" });
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
  const v = pruefeVertrag({ monatspreis_cent: input?.monatspreis_cent ?? eq.pilot?.monatspreis_cent, start: input?.start });
  await leadFeldSetzen(leadId, { vertrag: v });
  await aufgabe(eq, `Kundenzugang: ${lead.firma || lead.name} lädt dich in der Google-Profilverwaltung als Verwalter ein`, { status: "Wartet auf Benutzer", priority: "Hoch", quelle: "lead:" + leadId, naechste_aktion: "Betrieb bitten, dich über Google als Verwalter einzuladen – kein Passwort annehmen" });
  await writeAudit({ action: "pilot.vertrag", entityType: "lead", entityId: leadId, details: { monatspreis_cent: v.monatspreis_cent, start: v.start } });
  const lauf = await monatsLauf();
  return { lead: (await listLeads()).find(l => l.id === leadId), lauf };
}
export async function vertragBeenden(leadId) {
  const lead = (await listLeads()).find(l => l.id === leadId);
  if (!lead?.vertrag?.aktiv) throw new Error("Keine laufende monatliche Leistung");
  const r = await leadFeldSetzen(leadId, { vertrag: { ...lead.vertrag, aktiv: false, beendet_am: new Date().toISOString() } });
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
    for (const t of MONATS_AUFGABEN) await aufgabe(eq, `${p} · ${l.firma || l.name}: ${t}`, { quelle: "lead:" + l.id, due_at: plusTage(21), beschreibung: "Automatisch aus der monatlichen Leistung." });
    await createFinance({ kind: "income", amount: l.vertrag.monatspreis_cent / 100, category: "Einnahmequelle", description: `Monatsleistung ${p} – ${l.firma || l.name}`, status: "pending", source: "Vertrag (monatlich)", einnahmequelle_id: eq.id, lead_id: l.id });
    await leadFeldSetzen(l.id, { vertrag: { ...l.vertrag, letzte_periode: p } });
    neu++;
  }
  return { periode: p, neu };
}
export { berichtText, angebotText };
