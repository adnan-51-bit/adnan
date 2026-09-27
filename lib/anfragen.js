// Pilot Anfragen-Service (27.09.2026): Anfrage-Eingang, automatischer Ablauf, Entwuerfe, Kunden-Bereich, Angebots-Modul.
// Grundsaetze: 0 € (Vorlagen statt KI), nichts wird gesendet, keine Preise/Vertraege, Testfaelle als TEST markiert und
// nach dem Test ARCHIVIERT (nie geloescht, nie mit echten Daten vermischt).
import { tabelle, neueId } from "./tabelle.js";
import { writeAudit } from "./audit.js";
import { listEinnahmequellen, setzePilot } from "./einnahmequellen.js";
import { createTask, listTasks, updateTask } from "./master-tasks.js";
import { listLeads } from "./leads.js";
import { listFinance, eqFinanzen } from "./master-finance.js";
import { freigabeAnfordern, listFreigaben } from "./freigaben.js";
import { analysiere, entwuerfe, kundenStufe, KUNDEN_STUFEN, pruefeAngebotsentwurf, A_KATEGORIEN } from "./anfragen-regeln.js";
import { istOffen } from "./aufgaben-status.js";

const T = tabelle("master_anfragen");
export const resetAnfragenFuerTests = () => T.leeren();
export const listAnfragen = () => T.liste();

export async function anfragenEq() {
  const eq = (await listEinnahmequellen()).find(q => q.kategorie === "A" && /Anfragen-Service/i.test(q.name));
  if (!eq) throw new Error("Einnahmequelle „Anfragen-Service“ fehlt");
  return eq;
}
const schritt = (verlauf, text) => [...(verlauf || []), { zeit: new Date().toISOString(), text }];

// Neue Anfrage -> analysieren -> Kategorie -> Dringlichkeit -> Entwuerfe -> Aufgabe -> Status speichern.
export async function anfrageErfassen(input) {
  const eq = await anfragenEq();
  const ist_test = input.ist_test === true;
  const quelle = String(input.quelle || "").trim(), unternehmen = String(input.unternehmen || "").trim(), text = String(input.text || "").trim();
  if (!quelle) throw new Error("Quelle der Anfrage ist Pflicht (z. B. „Kontaktformular Website Betrieb X, weitergeleitet am …“) – keine erfundenen Anfragen");
  if (!unternehmen) throw new Error("Unternehmen (für wen die Anfrage bearbeitet wird) ist Pflicht");
  if (!ist_test && !input.kunde_lead_id) throw new Error("Echte Anfragen nur für einen echten Kunden (kunde_lead_id) – bis dahin nur Testfälle (ist_test)");
  if (input.datum && isNaN(Date.parse(input.datum))) throw new Error("Datum ungültig");
  const id = neueId("an"); const jetzt = new Date().toISOString();
  let a = await T.neu({ id, einnahmequelle_id: eq.id, kunde_lead_id: input.kunde_lead_id || null, datum: input.datum ? new Date(input.datum).toISOString() : jetzt, quelle: quelle.slice(0, 300),
    unternehmen: unternehmen.slice(0, 200), text: text.slice(0, 6000), status: "NEU", prioritaet: "Mittel", naechste_aktion: "", kategorie: "", dringlichkeit: "", analyse: {}, entwuerfe: {},
    task_id: null, ergebnis: "", verlauf: schritt([], "Anfrage erfasst"), ist_test, erstellt_am: jetzt, aktualisiert_am: jetzt });
  const analyse = analysiere(text);
  a = await T.aendere(id, { status: "ANALYSIERT", kategorie: analyse.kategorie, dringlichkeit: analyse.dringlichkeit, prioritaet: analyse.prioritaet, analyse,
    verlauf: schritt(a.verlauf, `Analysiert: ${analyse.kategorie_text}, Dringlichkeit ${analyse.dringlichkeit.toLowerCase()}`), aktualisiert_am: new Date().toISOString() });
  const e = entwuerfe(a, analyse);
  a = await T.aendere(id, { status: "ENTWURF", entwuerfe: e, naechste_aktion: e.naechste_aktion.text, verlauf: schritt(a.verlauf, "Entwürfe erstellt (Antwort, Rückfrage, Angebotstext, Zusammenfassung)"), aktualisiert_am: new Date().toISOString() });
  const task = await createTask({ title: `${ist_test ? "[TEST] " : ""}Anfrage beantworten: ${unternehmen} – ${A_KATEGORIEN[analyse.kategorie]}`, area: "Anfragen-Service", business_id: "master", priority: analyse.prioritaet,
    status: "Wartet auf Benutzer", owner: "Adnan", einnahmequelle_id: eq.id, quelle: "anfrage:" + id,
    beschreibung: `${ist_test ? "TESTFALL – nicht echt. " : ""}Entwurf prüfen und selbst senden (WARTET AUF FREIGABE – die Zentrale sendet nichts). ${e.zusammenfassung.text}`, naechste_aktion: e.naechste_aktion.text });
  a = await T.aendere(id, { status: "WARTET_AUF_FREIGABE", task_id: String(task.id), verlauf: schritt(a.verlauf, `Aufgabe #${task.id} erzeugt – wartet auf Freigabe (Senden nur durch den Menschen)`), aktualisiert_am: new Date().toISOString() });
  await writeAudit({ action: "anfrage.erfasst", entityType: "anfrage", entityId: id, details: { kategorie: analyse.kategorie, dringlichkeit: analyse.dringlichkeit, ist_test } });
  return a;
}

// Abschluss: Ergebnis dokumentieren, Aufgabe schliessen.
export async function anfrageAbschliessen(id, ergebnis) {
  const a = await T.hole(id); if (!a) throw new Error("Anfrage nicht gefunden");
  const text = String(ergebnis || "").trim(); if (text.length < 3) throw new Error("Ergebnis dokumentieren (z. B. „Antwort gesendet am …“)");
  if (a.task_id) await updateTask(a.task_id, { status: "Erledigt", ergebnis: text }).catch(() => null);
  const r = await T.aendere(id, { status: "ERLEDIGT", ergebnis: text, verlauf: schritt(a.verlauf, "Abgeschlossen: " + text), aktualisiert_am: new Date().toISOString() });
  await writeAudit({ action: "anfrage.erledigt", entityType: "anfrage", entityId: id, details: { ist_test: a.ist_test } });
  return r;
}

// Archivieren (z. B. Testfaelle nach dem Test) - nichts wird geloescht; offene Aufgabe wird gestoppt.
export async function anfrageArchivieren(id, grund = "archiviert") {
  const a = await T.hole(id); if (!a) throw new Error("Anfrage nicht gefunden");
  if (a.task_id) { const t = (await listTasks()).find(x => String(x.id) === String(a.task_id)); if (t && istOffen(t.status)) await updateTask(t.id, { status: "Gestoppt", ergebnis: "Anfrage archiviert: " + grund }); }
  const r = await T.aendere(id, { status: "ARCHIVIERT", verlauf: schritt(a.verlauf, "Archiviert: " + grund), aktualisiert_am: new Date().toISOString() });
  await writeAudit({ action: "anfrage.archiviert", entityType: "anfrage", entityId: id, details: { grund, ist_test: a.ist_test } });
  return r;
}

export async function angebotsentwurfSpeichern(input) {
  const eq = await anfragenEq();
  const e = { ...pruefeAngebotsentwurf(input), aktualisiert_am: new Date().toISOString() };
  await setzePilot(eq.id, { angebotsentwurf: e });
  return e;
}

// Rechtliche Voraussetzung vor echten Kundendaten (Art. 28 DSGVO) - einmalig unter "Wartet auf mich".
async function syncFreigaben(eq) {
  const alle = await listFreigaben();
  if (!alle.some(f => f.bezug_typ === "eq-avv" && f.bezug_id === eq.id))
    await freigabeAnfordern({ art: "RECHT", titel: "Anfragen-Service: Auftragsverarbeitung (AVV) vor echten Kundendaten klären", beschreibung: "Wer Anfragen fremder Kunden bearbeitet, verarbeitet personenbezogene Daten im Auftrag (Art. 28 DSGVO, Quelle: https://dsgvo-gesetz.de/art-28-dsgvo/). Vor dem ersten echten Pilotkunden: AVV-Vorlage prüfen lassen, Datenschutzhinweis, Gewerbe/Steuer (Schuldnerberatung 04.12.2026). Bis dahin nur Testfälle.", bereich: "einnahmequellen", bezug_typ: "eq-avv", bezug_id: eq.id });
}

export async function anfragenDaten() {
  const eq = await anfragenEq();
  await syncFreigaben(eq);
  const [anfragen, leads, tasks, finance, freigaben] = await Promise.all([T.liste(), listLeads(), listTasks(), listFinance().catch(() => []), listFreigaben()]);
  const eigene = anfragen.filter(a => a.einnahmequelle_id === eq.id).sort((x, y) => String(y.datum).localeCompare(String(x.datum)));
  const echte = eigene.filter(a => !a.ist_test);
  const kundenLeads = leads.filter(l => l.einnahmequelle_id === eq.id);
  const kunden = KUNDEN_STUFEN.map(([id, name]) => ({ id, name, liste: kundenLeads.filter(l => kundenStufe(l) === id).map(l => ({ id: l.id, name: l.firma || l.name, status: l.status })) }));
  return { eq: { id: eq.id, name: eq.name, status: eq.status, angebot: eq.angebot, zielgruppe: eq.zielgruppe, erloesart: eq.erloesart },
    anfragen: eigene.filter(a => a.status !== "ARCHIVIERT"), archiv: eigene.filter(a => a.status === "ARCHIVIERT"),
    zahlen: { echt: echte.length, test: eigene.length - echte.length, offen: echte.filter(a => !["ERLEDIGT", "ARCHIVIERT"].includes(a.status)).length, erledigt: echte.filter(a => a.status === "ERLEDIGT").length },
    kunden, angebotsentwurf: eq.pilot?.angebotsentwurf || null, finanzen: eqFinanzen(finance, eq.id),
    offeneAufgaben: tasks.filter(t => t.einnahmequelle_id === eq.id && istOffen(t.status)).map(t => ({ id: t.id, title: t.title, status: t.status })),
    wartetAufMich: freigaben.filter(f => f.status === "OFFEN" && (f.bezug_id === eq.id || f.titel.includes(eq.name))) };
}
