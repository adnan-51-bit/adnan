// E-Mail & Leads (27.09.2026, Teil 4B): zentrale Lead-Liste der Einnahmequellen (Tabelle master_leads).
// Getrennt von Werknetz24-Leads und E-Commerce-Kunden. Die Zentrale versendet nichts selbst.
// Ablauf: Lead -> Kontakt -> Angebot -> Kunde -> (offene) Einnahme -> bezahlt. Jede Aenderung im Verlauf.
import { tabelle, neueId } from "./tabelle.js";
import { writeAudit, listAuditFuer } from "./audit.js";
import { createTask, listTasks, updateTask } from "./master-tasks.js";
import { createFinance, updateFinanceStatus, listFinance, eqFinanzen } from "./master-finance.js";
import { istOffen } from "./aufgaben-status.js";
import { LEAD_STATUS, ZU_EQ, kontaktErlaubt, strukturiere, kategorisiereAntwort, statusNachAntwort, naechsterSchritt, emailEntwurf, EMAIL_ARTEN, ANTWORT_LABEL } from "./leads-regeln.js";

const T = tabelle("master_leads");
export const resetLeadsFuerTests = () => T.leeren();
const plusTage = n => new Date(Date.now() + n * 86400000).toISOString();
const protokoll = (id, action, details) => writeAudit({ action: "lead." + action, entityType: "lead", entityId: id, details });
async function hole(id) { const l = await T.hole(id); if (!l) throw new Error("Lead nicht gefunden"); return l; }
const eqLib = () => import("./einnahmequellen.js");

// Speichert und haelt die kurze Lead-Liste der Einnahmequelle (Teil 3A) synchron.
async function speichere(id, patch) {
  const alt = await hole(id);
  const neu = { ...alt, ...patch };
  const r = await T.aendere(id, { ...patch, naechster_schritt: naechsterSchritt(neu), aktualisiert_am: new Date().toISOString() });
  if (r.einnahmequelle_id) await spiegel(r.einnahmequelle_id);
  return r;
}
async function spiegel(eqId) {
  const eigene = (await T.liste()).filter(l => l.einnahmequelle_id === eqId).sort((a, b) => String(a.erstellt_am).localeCompare(String(b.erstellt_am)));
  const { setzeLeadSpiegel } = await eqLib();
  await setzeLeadSpiegel(eqId, eigene.map(l => ({ lead_id: l.id, name: l.name, kontakt: l.email || l.telefon, quelle: l.quelle, einwilligung: l.einwilligung, notiz: l.notiz, status: ZU_EQ[l.status], erfasst_am: l.erstellt_am })));
}
async function aufgabe(l, title, tage, naechste_aktion, priority = "Mittel") {
  return createTask({ title, area: l.einnahmequelle_id ? "Einnahmequelle / Lead" : "Leads", business_id: "master", priority, owner: "Adnan", einnahmequelle_id: l.einnahmequelle_id || undefined, due_at: tage == null ? null : plusTage(tage), beschreibung: `Automatisch erzeugt für Lead „${l.name}“.`, naechste_aktion, quelle: "lead:" + l.id });
}
async function stoppeLeadAufgaben(l, grund) {
  for (const t of (await listTasks()).filter(t => t.quelle === "lead:" + l.id && istOffen(t.status))) await updateTask(t.id, { status: "Gestoppt", ergebnis: grund });
}

export async function listLeads() { return T.liste(); }

// Lead erfassen. Aus "rohtext" (eingefuegte Anfrage/Kommentar) werden fehlende Felder automatisch erkannt.
export async function leadAnlegen(input, { ohneAufgabe = false } = {}) {
  const erkannt = strukturiere(input.rohtext);
  const l = { id: neueId("ld"), einnahmequelle_id: input.einnahmequelle_id || null,
    name: String(input.name || erkannt.name || erkannt.firma || "").trim().slice(0, 200), firma: String(input.firma || erkannt.firma || "").trim().slice(0, 200),
    email: String(input.email || erkannt.email || "").trim().slice(0, 200), telefon: String(input.telefon || erkannt.telefon || "").trim().slice(0, 60),
    quelle: String(input.quelle || "").trim().slice(0, 300), ort: String(input.ort || "").trim().slice(0, 120), branche: String(input.branche || "").trim().slice(0, 120), website: String(input.website || "").trim().slice(0, 300), pilot_crm: {}, selbst_angefragt: Boolean(input.selbst_angefragt), einwilligung: input.einwilligung,
    status: "NEU", rohtext: String(input.rohtext || "").slice(0, 4000), notiz: String(input.notiz || "").trim().slice(0, 2000), nachrichten: [], angebot: null, naechster_schritt: "",
    erstellt_am: new Date().toISOString(), aktualisiert_am: new Date().toISOString() };
  if (!l.name) throw new Error("Name des Leads fehlt");
  if (typeof l.einwilligung !== "boolean") throw new Error("Angeben, ob eine Einwilligung zur Kontaktaufnahme vorliegt (ja/nein)");
  if (l.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(l.email)) throw new Error("E-Mail-Adresse ungültig");
  if (l.email && (await T.liste()).some(x => x.email.toLowerCase() === l.email.toLowerCase() && x.einnahmequelle_id === l.einnahmequelle_id)) throw new Error("Lead mit dieser E-Mail gibt es schon");
  l.naechster_schritt = naechsterSchritt(l);
  const r = await T.neu(l);
  const task = ohneAufgabe ? null : await aufgabe(r, "Lead nachfassen: " + r.name, 3, kontaktErlaubt(r).erlaubt ? "Kontakt aufnehmen (Einwilligung/Anfrage liegt vor)" : "Keine Werbung senden – nur antworten, wenn der Lead selbst angefragt hat (UWG § 7)");
  await protokoll(r.id, "created", { name: r.name, einnahmequelle_id: r.einnahmequelle_id, erkannt: Object.keys(erkannt).filter(k => erkannt[k] && !input[k]) });
  if (r.einnahmequelle_id) await spiegel(r.einnahmequelle_id);
  return { lead: r, task };
}

export async function leadAendern(id, patch) {
  const erlaubt = ["name", "firma", "email", "telefon", "quelle", "notiz", "ort", "branche", "website"];
  const clean = Object.fromEntries(Object.entries(patch || {}).filter(([k]) => erlaubt.includes(k)).map(([k, v]) => [k, String(v ?? "").trim().slice(0, 2000)]));
  for (const k of ["selbst_angefragt", "einwilligung"]) if (k in (patch || {})) { if (typeof patch[k] !== "boolean") throw new Error(k + " muss ja/nein sein"); clean[k] = patch[k]; }
  if ("name" in clean && !clean.name) throw new Error("Name darf nicht leer sein");
  const r = await speichere(id, clean);
  await protokoll(id, "updated", { felder: Object.keys(clean) });
  return r;
}

export async function leadStatusSetzen(id, status) {
  if (!LEAD_STATUS.includes(status)) throw new Error("Lead-Status ungültig");
  const l = await hole(id);
  const r = await speichere(id, { status, ...(status === "GESPERRT" ? { einwilligung: false } : {}) });
  await protokoll(id, "status", { von: l.status, nach: status });
  if (status === "KUNDE" && l.status !== "KUNDE" && l.einnahmequelle_id) { const { kundeZuordnen } = await eqLib(); await kundeZuordnen(l.einnahmequelle_id, { name: l.name, kontakt: l.email || l.telefon, notiz: "aus Lead übernommen" }); }
  if (["GESPERRT", "VERLOREN"].includes(status)) await stoppeLeadAufgaben(l, status === "GESPERRT" ? "Widerspruch – keine Kontaktaufnahme mehr" : "Lead verloren");
  return r;
}

// E-Mail-Entwurf erstellen (Vorlage). Wird nur gespeichert, nie gesendet.
export async function emailEntwurfErstellen(id, art) {
  if (!EMAIL_ARTEN[art]) throw new Error("Unbekannte E-Mail-Art");
  const l = await hole(id);
  const eq = l.einnahmequelle_id ? (await (await eqLib()).listEinnahmequellen()).find(q => q.id === l.einnahmequelle_id) : {};
  const e = emailEntwurf(art, l, eq || {});
  const k = kontaktErlaubt(l);
  const n = { richtung: "raus", typ: "entwurf", art, betreff: e.betreff, text: e.text, datum: new Date().toISOString(), senden_erlaubt: k.erlaubt, hinweis: k.grund };
  const r = await speichere(id, { nachrichten: [...(l.nachrichten || []), n] });
  await protokoll(id, "entwurf", { art });
  return r;
}

// Adnan hat den Entwurf selbst gesendet -> markieren. Gesperrt, wenn Kontakt rechtlich nicht erlaubt ist.
export async function alsGesendet(id, index) {
  const l = await hole(id);
  const n = [...(l.nachrichten || [])];
  if (!n[index] || n[index].typ !== "entwurf") throw new Error("Entwurf nicht gefunden");
  const k = kontaktErlaubt(l); if (!k.erlaubt) throw new Error(k.grund);
  n[index] = { ...n[index], typ: "gesendet", gesendet_am: new Date().toISOString() };
  const istAngebot = n[index].art === "angebot";
  if (istAngebot && !l.angebot) throw new Error("Erst ein Angebot erstellen");
  const status = istAngebot ? "ANGEBOT" : ["NEU", "INTERESSENT"].includes(l.status) && n[index].art !== "danke" ? (l.status === "INTERESSENT" ? "INTERESSENT" : "KONTAKT") : l.status;
  const r = await speichere(id, { nachrichten: n, status, ...(istAngebot ? { angebot: { ...l.angebot, status: "gesendet", gesendet_am: new Date().toISOString() } } : {}) });
  await protokoll(id, "gesendet", { art: n[index].art, betreff: n[index].betreff });
  await aufgabe(r, (istAngebot ? "Angebot nachfassen: " : "Antwort abwarten / nachfassen: ") + r.name, istAngebot ? 7 : 5, istAngebot ? "Freundlich nach dem Angebot fragen" : "Wenn keine Antwort: einmal nachfassen (nur bei Einwilligung/Anfrage)");
  return r;
}

// Antwort erfassen (eingefuegt) -> automatisch kategorisieren, Status anpassen, Aufgabe erzeugen.
export async function antwortErfassen(id, text) {
  const inhalt = String(text || "").trim(); if (!inhalt) throw new Error("Antworttext fehlt");
  const l = await hole(id);
  const kategorie = kategorisiereAntwort(inhalt);
  const status = statusNachAntwort(l, kategorie);
  const n = { richtung: "rein", typ: "antwort", text: inhalt.slice(0, 4000), kategorie, datum: new Date().toISOString(), bearbeitet: false };
  const r = await speichere(id, { nachrichten: [...(l.nachrichten || []), n], status, ...(kategorie === "WIDERSPRUCH" ? { einwilligung: false } : {}),
    // Wer selbst schreibt (ohne Widerspruch), darf eine Antwort bekommen.
    ...(!["WIDERSPRUCH", "ABSAGE"].includes(kategorie) ? { selbst_angefragt: true } : {}) });
  await protokoll(id, "antwort", { kategorie, von: l.status, nach: status });
  if (["WIDERSPRUCH", "ABSAGE"].includes(kategorie)) await stoppeLeadAufgaben(l, "Antwort: " + ANTWORT_LABEL[kategorie]);
  else await aufgabe(r, `Antwort beantworten (${ANTWORT_LABEL[kategorie]}): ${r.name}`, 1, kategorie === "ANGEBOT_ANGENOMMEN" ? "Prüfen und Angebot als angenommen markieren" : "Antwort lesen und E-Mail-Entwurf nutzen", "Hoch");
  return { lead: r, kategorie };
}
export async function antwortErledigt(id, index) {
  const l = await hole(id); const n = [...(l.nachrichten || [])];
  if (!n[index] || n[index].richtung !== "rein") throw new Error("Antwort nicht gefunden");
  n[index] = { ...n[index], bearbeitet: true };
  return speichere(id, { nachrichten: n });
}

// Angebot erstellen (Betrag optional - nur was Adnan eintraegt).
export async function angebotErstellen(id, { text, betrag_cent = null }) {
  if (!String(text || "").trim()) throw new Error("Angebotstext fehlt");
  if (betrag_cent !== null && !(Number.isInteger(betrag_cent) && betrag_cent > 0)) throw new Error("Betrag muss eine ganze Zahl in Cent > 0 sein (oder leer)");
  const l = await hole(id);
  if (["GESPERRT", "VERLOREN"].includes(l.status)) throw new Error("Kein Angebot an gesperrte/verlorene Leads");
  const r = await speichere(id, { angebot: { text: String(text).trim().slice(0, 4000), betrag_cent, status: "entwurf", datum: new Date().toISOString() } });
  await protokoll(id, "angebot", { betrag_cent });
  return r;
}

// Angebot angenommen -> Kunde + offene Einnahme (echte Zahlung erst mit "bezahlt"). Abgelehnt -> verloren.
export async function angebotEntscheidung(id, angenommen) {
  const l = await hole(id);
  if (!l.angebot) throw new Error("Kein Angebot vorhanden");
  if (typeof angenommen !== "boolean") throw new Error("angenommen muss ja/nein sein");
  await speichere(id, { angebot: { ...l.angebot, status: angenommen ? "angenommen" : "abgelehnt", entschieden_am: new Date().toISOString() } });
  let buchung = null;
  if (angenommen && l.angebot.betrag_cent) buchung = await createFinance({ kind: "income", amount: l.angebot.betrag_cent / 100, category: "Einnahmequelle", description: `Angebot angenommen: ${l.name}`, status: "pending", source: "Angebot (Lead " + l.name + ")", einnahmequelle_id: l.einnahmequelle_id || undefined, lead_id: l.id });
  const r = await leadStatusSetzen(id, angenommen ? "KUNDE" : "VERLOREN");
  await protokoll(id, "angebot_entscheidung", { angenommen, offene_einnahme: buchung?.id || null });
  return { lead: r, buchung };
}

// Geld ist wirklich eingegangen -> Buchung "bezahlt"; Einnahmequelle wird aus den Finanzen nachgezogen.
export async function zahlungEingegangen(buchungId, datum) {
  const alle = await listFinance(); const b = alle.find(e => String(e.id) === String(buchungId));
  if (!b) throw new Error("Buchung nicht gefunden");
  if (b.kind !== "income" || b.status !== "pending") throw new Error("Nur offene Einnahmen können als bezahlt markiert werden");
  if (datum && !/^\d{4}-\d{2}-\d{2}$/.test(datum)) throw new Error("Datum im Format JJJJ-MM-TT");
  const r = await updateFinanceStatus(buchungId, "confirmed", datum ? new Date(datum + "T12:00:00Z").toISOString() : new Date().toISOString());
  if (b.einnahmequelle_id) await finanzSpiegel(b.einnahmequelle_id);
  return r;
}
// Kosten einer Einnahmequelle erfassen (nur echte, bezahlte Ausgaben).
// Kostenregel (27.09.2026): Bis zur ersten echten Einnahme 0-Euro-Modus. Danach Kosten nur VORSCHLAGEN (Freigabe
// unter "Wartet auf mich"); erfasst werden darf eine Ausgabe nur mit einer freigegebenen Kosten-Freigabe.
export async function kostenVorschlagen(eqId, { was, warum, betrag_cent, rhythmus }) {
  if (!String(was || "").trim() || !String(warum || "").trim()) throw new Error("Was und warum sind Pflicht");
  if (!(Number.isInteger(betrag_cent) && betrag_cent > 0)) throw new Error("Betrag muss eine ganze Zahl in Cent > 0 sein");
  if (!["einmalig", "monatlich", "jährlich"].includes(rhythmus)) throw new Error("Rhythmus: einmalig, monatlich oder jährlich");
  const f = eqFinanzen(await listFinance(), eqId);
  if (f.einnahmen_cent <= 0) throw new Error("0-Euro-Modus: vor der ersten echten Einnahme werden keine Kosten vorgeschlagen");
  const { freigabeAnfordern } = await import("./freigaben.js");
  return freigabeAnfordern({ art: "KOSTEN", titel: "Kosten: " + String(was).trim(), beschreibung: "Warum: " + String(warum).trim() + " · Rhythmus: " + rhythmus, kosten: (betrag_cent / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" }) + " " + rhythmus, bereich: "einnahmequellen", bezug_typ: "eq-kosten", bezug_id: eqId + ":" + neueId("k") });
}
export async function kostenErfassen(eqId, { betrag_cent, beschreibung, datum, quelle, freigabe_id }) {
  const { listFreigaben } = await import("./freigaben.js");
  const fg = (await listFreigaben()).find(x => x.id === freigabe_id);
  if (!fg || fg.art !== "KOSTEN" || fg.status !== "FREIGEGEBEN" || !String(fg.bezug_id).startsWith(eqId + ":")) throw new Error("Ausgaben nur mit freigegebener Kosten-Freigabe (unter „Wartet auf mich“)");
  if ((await listFinance()).some(e => String(e.source || "").includes("Freigabe " + freigabe_id))) throw new Error("Diese Freigabe wurde schon verbucht");
  if (!(Number.isInteger(betrag_cent) && betrag_cent > 0)) throw new Error("Betrag muss eine ganze Zahl in Cent > 0 sein");
  if (!String(beschreibung || "").trim()) throw new Error("Beschreibung fehlt");
  if (!String(quelle || "").trim()) throw new Error("Quelle/Beleg fehlt (z. B. Rechnung vom …)");
  if (datum && !/^\d{4}-\d{2}-\d{2}$/.test(datum)) throw new Error("Datum im Format JJJJ-MM-TT");
  const r = await createFinance({ kind: "expense", amount: betrag_cent / 100, category: "Einnahmequelle", description: String(beschreibung).trim(), status: "confirmed", source: String(quelle).trim() + " · Freigabe " + freigabe_id, einnahmequelle_id: eqId, occurred_at: datum ? new Date(datum + "T12:00:00Z").toISOString() : undefined });
  await finanzSpiegel(eqId);
  return r;
}
export async function finanzSpiegel(eqId) {
  const f = eqFinanzen(await listFinance(), eqId);
  const { setzeFinanzSpiegel } = await eqLib();
  await setzeFinanzSpiegel(eqId, f.einnahmen_cent, f.kosten_cent);
  return f;
}

export const leadVerlauf = id => listAuditFuer("lead", id, 100);
export function leadUebersicht(leads) {
  const n = s => leads.filter(l => l.status === s).length;
  return { neu: n("NEU"), interessenten: n("INTERESSENT"), kontakt: n("KONTAKT"), angebot: n("ANGEBOT"), kunden: n("KUNDE"), verloren: n("VERLOREN"), gesperrt: n("GESPERRT"),
    offeneAntworten: leads.filter(l => (l.nachrichten || []).some(x => x.richtung === "rein" && !x.bearbeitet)).length };
}

// Pilot (Teil 5): Profil-Analyse und monatliche Leistung am Lead speichern (nur diese beiden Felder).
export async function leadFeldSetzen(id, patch) {
  const clean = Object.fromEntries(Object.entries(patch || {}).filter(([k]) => ["profil_analyse", "vertrag", "pilot_crm"].includes(k)));
  if (!Object.keys(clean).length) throw new Error("Nichts zu speichern");
  return speichere(id, clean);
}
