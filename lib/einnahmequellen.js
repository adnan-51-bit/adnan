// Einnahmequellen der Master-Zentrale (27.09.2026). Getrennt von Werknetz24 und E-Commerce (eigene Tabelle).
// Grundsatz: Erst pruefen, dann testen, dann Technik. Keine erfundenen Maerkte, Preise oder Einnahmen -
// Felder starten leer bzw. 0 und werden nur mit Quelle befuellt. Jede Aenderung landet im Aktivitaetsverlauf
// (Audit-Log, entity_type "einnahmequelle").
import { writeAudit, listAuditFuer } from "./audit.js";
import { createTask, listTasks } from "./master-tasks.js";
import { erzeugeEntwurf, schritteAlsAufgaben } from "./eq-automation.js";

import { EQ_STATUS, EQ_LABEL, EQ_GRUPPE, TEXT, ZAHL, ENUMS, BOOL, BOOL_NULL, PRUEFSCHRITTE, pruefstand, gewinnCent, statusPruefung, kundenAnzahl, pruefeQuelle, pruefePlanEintrag } from "./einnahmequellen-regeln.js";
export { EQ_STATUS, EQ_LABEL, PRUEFSCHRITTE, pruefstand, gewinnCent, statusPruefung };

function bereinige(input, { neu = false } = {}) {
  const out = {};
  for (const k of TEXT) if (k in input) { const v = input[k] == null ? "" : String(input[k]).trim(); if (v.length > 4000) throw new Error(k + " zu lang"); out[k] = k === "verweis" ? (v || null) : v; }
  for (const k of ZAHL) if (k in input) { const v = input[k] === "" || input[k] == null ? (k === "startkosten_cent" ? null : 0) : input[k]; if (v !== null && !(Number.isInteger(v) && v >= 0)) throw new Error(k + " muss eine ganze Zahl ≥ 0 sein"); out[k] = v; }
  for (const [k, werte] of Object.entries(ENUMS)) if (k in input) { if (!werte.includes(input[k])) throw new Error(k + " ungültig (erlaubt: " + werte.join(", ") + ")"); out[k] = input[k]; }
  for (const k of BOOL) if (k in input) { if (typeof input[k] !== "boolean") throw new Error(k + " muss ja/nein sein"); out[k] = input[k]; }
  for (const k of BOOL_NULL) if (k in input) { if (input[k] !== null && typeof input[k] !== "boolean") throw new Error(k + " muss ja, nein oder offen sein"); out[k] = input[k]; }
  if ("automatisierungsgrad" in out && out.automatisierungsgrad > 100) throw new Error("automatisierungsgrad muss zwischen 0 und 100 liegen");
  if (neu && !out.name) throw new Error("Name der Einnahmequelle fehlt");
  if ("name" in out && !out.name) throw new Error("Name darf nicht leer sein");
  return out;
}

const memory = new Map();
const supabaseAktiv = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
async function sb(pfad, options = {}) {
  const r = await fetch(process.env.SUPABASE_URL + "/rest/v1/" + pfad, { ...options, headers: { apikey: process.env.SUPABASE_SECRET_KEY, Authorization: "Bearer " + process.env.SUPABASE_SECRET_KEY, "Content-Type": "application/json", Prefer: "return=representation", ...(options.headers || {}) } });
  if (!r.ok) throw new Error("Einnahmequellen-Speicher: HTTP " + r.status + " " + (await r.text()).slice(0, 200));
  return r.status === 204 ? null : r.json();
}
export function resetEinnahmequellenFuerTests() { memory.clear(); }

export async function listEinnahmequellen() {
  if (!supabaseAktiv()) return [...memory.values()];
  return sb("master_einnahmequellen?select=*&order=erstellt_am.asc");
}
async function hole(id) { const q = (await listEinnahmequellen()).find(x => x.id === id); if (!q) throw new Error("Einnahmequelle nicht gefunden"); return q; }
async function speichere(id, patch) {
  const neu = { ...patch, aktualisiert_am: new Date().toISOString() };
  if (supabaseAktiv()) { const rows = await sb("master_einnahmequellen?id=eq." + encodeURIComponent(id), { method: "PATCH", body: JSON.stringify(neu) }); if (!rows?.[0]) throw new Error("Einnahmequelle nicht gefunden"); return rows[0]; }
  const alt = memory.get(id); if (!alt) throw new Error("Einnahmequelle nicht gefunden");
  const q = { ...alt, ...neu }; memory.set(id, q); return q;
}
const protokoll = (id, action, details) => writeAudit({ action: "einnahmequelle." + action, entityType: "einnahmequelle", entityId: id, details });

export async function createEinnahmequelle(input) {
  const jetzt = new Date().toISOString();
  const leer = Object.fromEntries(TEXT.map(k => [k, k === "verweis" ? null : ""]));
  const q = { id: "eq_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), ...leer, startkosten_cent: null, erste_kunden: 0, einnahmen_cent: 0, kosten_cent: 0, automatisierungsgrad: 0, kunden: [], status_vor_pause: null, laufende_kosten_cent: null, nachfrage_status: "UNBEKANNT", rechtspruefung: null, gewerbepruefung: null, schnell_testbar: false, direkte_kunden: false, wiederholbar: false, komplex: false, automatisierungspotenzial: "UNBEKANNT", skalierungspotenzial: "UNBEKANNT", automatisierungsstufe: "MANUELL", automatisierungsplan: [], quellen_liste: [], leads: [], entwuerfe: [], status: "IDEE", erstellt_am: jetzt, aktualisiert_am: jetzt, ...bereinige(input, { neu: true }) };
  pruefeBeleg(q);
  const gespeichert = supabaseAktiv() ? (await sb("master_einnahmequellen", { method: "POST", body: JSON.stringify(q) }))[0] : (memory.set(q.id, q), q);
  await protokoll(q.id, "created", { name: q.name });
  return gespeichert;
}

// Aendert Inhalte - aber NIE den Status (dafuer setzeEqStatus mit Pruefung).
function pruefeBeleg(q) { if (q.nachfrage_status === "BELEGT" && !(Array.isArray(q.quellen_liste) && q.quellen_liste.length)) throw new Error("Nachfrage „belegt“ nur mit mindestens einer Quelle (Knopf „Quelle hinzufügen“)"); }

export async function updateEinnahmequelle(id, patch) {
  const clean = bereinige(patch);
  if ("nachfrage_status" in clean) pruefeBeleg({ ...(await hole(id)), ...clean });
  const q = await speichere(id, clean);
  await protokoll(id, "updated", { felder: Object.keys(clean) });
  return q;
}

export async function setzeEqStatus(id, ziel) {
  const q = await hole(id);
  const fehler = statusPruefung(q, ziel); if (fehler) throw new Error(fehler);
  const r = await speichere(id, { status: ziel, ...(ziel === "PAUSE" && q.status !== "PAUSE" ? { status_vor_pause: q.status } : {}) });
  await protokoll(id, "status", { von: q.status, nach: ziel });
  return r;
}

// Start/Stop: Stop = Pause (merkt sich die Stufe), Start = zurueck auf die gemerkte Stufe (Regeln gelten erneut).
export async function stoppeEinnahmequelle(id) { return setzeEqStatus(id, "PAUSE"); }
export async function starteEinnahmequelle(id) {
  const q = await hole(id);
  if (q.status !== "PAUSE") throw new Error("Läuft bereits (Status „" + EQ_LABEL[q.status] + "“)");
  return setzeEqStatus(id, q.status_vor_pause && q.status_vor_pause !== "PAUSE" ? q.status_vor_pause : "IDEE");
}

// Kunde zuordnen: nur echte, von Adnan eingegebene Kunden. Getrennt von Werknetz24-/E-Commerce-Kunden.
export async function kundeZuordnen(id, kunde) {
  const q = await hole(id);
  const name = String(kunde?.name || "").trim();
  if (!name) throw new Error("Name des Kunden fehlt");
  const eintrag = { name: name.slice(0, 200), kontakt: String(kunde.kontakt || "").trim().slice(0, 200), notiz: String(kunde.notiz || "").trim().slice(0, 1000), seit: String(kunde.seit || new Date().toISOString().slice(0, 10)).slice(0, 10) };
  const kunden = [...(Array.isArray(q.kunden) ? q.kunden : []), eintrag];
  const r = await speichere(id, { kunden, erste_kunden: Math.max(kunden.length, q.erste_kunden || 0) });
  await protokoll(id, "kunde", { kunde: eintrag.name, anzahl: kunden.length });
  return r;
}

// Aufgabe erzeugen: landet in der zentralen Aufgabenliste (master_tasks_v2) mit Bezug zur Einnahmequelle.
export async function aufgabeErzeugen(id, { title, priority = "Mittel", beschreibung = "", naechste_aktion = "", quelle = "", due_at = null } = {}) {
  const q = await hole(id);
  const titel = String(title || q.naechste_aufgabe || "").trim();
  if (!titel) throw new Error("Titel der Aufgabe fehlt (oder Feld „Nächste Aufgabe“ ausfüllen)");
  if (!["Hoch", "Mittel", "Niedrig"].includes(priority)) throw new Error("Priorität muss Hoch, Mittel oder Niedrig sein");
  const task = await createTask({ title: titel.slice(0, 300), area: "Einnahmequelle: " + q.name, business_id: "master", priority, owner: q.verantwortlich || "Adnan", einnahmequelle_id: id, beschreibung, naechste_aktion, quelle, due_at: due_at || null });
  await protokoll(id, "aufgabe", { aufgabe: titel, task_id: task.id });
  return task;
}

// Quelle hinzufuegen (Vorgabe 7): Quelle, URL, Datum, belegte Aussage.
export async function quelleHinzufuegen(id, quelle) {
  const q = await hole(id); const eintrag = pruefeQuelle(quelle);
  const r = await speichere(id, { quellen_liste: [...(Array.isArray(q.quellen_liste) ? q.quellen_liste : []), eintrag] });
  await protokoll(id, "quelle", { quelle: eintrag.quelle, url: eintrag.url });
  return r;
}
// Automatisierungsvorschlag (Vorgabe 4): wird nur gespeichert, nie aktiviert.
export async function planHinzufuegen(id, vorschlag) {
  const q = await hole(id); const eintrag = { ...pruefePlanEintrag(vorschlag), erstellt_am: new Date().toISOString() };
  const r = await speichere(id, { automatisierungsplan: [...(Array.isArray(q.automatisierungsplan) ? q.automatisierungsplan : []), eintrag] });
  await protokoll(id, "plan", { was: eintrag.was, kosten: eintrag.kosten, freigabe: eintrag.freigabe });
  return r;
}

// ---------- Automatisierungen Teil 3A (27.09.2026, kostenlos, vorlagenbasiert) ----------
export const LEAD_STATUS = ["neu", "kontaktiert", "interessiert", "kunde", "verloren"];
const plusTage = (n, jetzt = new Date()) => new Date(jetzt.getTime() + n * 86400000).toISOString();

// Entwurf erzeugen (Recherche-Checkliste, Content-Ideen, Texte, E-Mail-Entwuerfe, Statusmeldung) und speichern.
export async function entwurfErzeugen(id, art) {
  const q = await hole(id);
  const aufgaben = art === "status" ? await aufgabenVon(id) : [];
  const e = { ...erzeugeEntwurf(art, q, aufgaben), erstellt_am: new Date().toISOString() };
  const entwuerfe = [e, ...(Array.isArray(q.entwuerfe) ? q.entwuerfe : [])].slice(0, 20);
  await speichere(id, { entwuerfe });
  await protokoll(id, "entwurf", { art, titel: e.titel });
  return e;
}

// Lead erfassen: nur echte Kontakte. Legt automatisch eine Nachfass-Aufgabe (in 3 Tagen) in der zentralen Liste an.
export async function leadHinzufuegen(id, lead) {
  const q = await hole(id);
  const name = String(lead?.name || "").trim();
  if (!name) throw new Error("Name des Leads fehlt");
  if (typeof lead.einwilligung !== "boolean") throw new Error("Angeben, ob eine Einwilligung zur Kontaktaufnahme vorliegt (ja/nein)");
  const eintrag = { name: name.slice(0, 200), kontakt: String(lead.kontakt || "").trim().slice(0, 200), quelle: String(lead.quelle || "").trim().slice(0, 300), einwilligung: lead.einwilligung, notiz: String(lead.notiz || "").trim().slice(0, 1000), status: "neu", erfasst_am: new Date().toISOString() };
  const leads = [...(Array.isArray(q.leads) ? q.leads : []), eintrag];
  const r = await speichere(id, { leads });
  const task = await createTask({ title: "Lead nachfassen: " + eintrag.name, area: "Einnahmequelle: " + q.name, business_id: "master", priority: "Mittel", owner: q.verantwortlich || "Adnan", einnahmequelle_id: id, due_at: plusTage(3),
    beschreibung: "Automatisch beim Erfassen des Leads angelegt.", naechste_aktion: eintrag.einwilligung ? "Kontakt aufnehmen (Einwilligung liegt vor)" : "Keine Werbung senden – nur antworten, wenn der Lead selbst angefragt hat (UWG § 7)", quelle: eintrag.quelle });
  await protokoll(id, "lead", { lead: eintrag.name, anzahl: leads.length, task_id: task.id });
  return { einnahmequelle: r, task };
}

// Lead-Status aendern; "kunde" uebernimmt den Lead als echten Kunden.
export async function leadStatus(id, index, status) {
  if (!LEAD_STATUS.includes(status)) throw new Error("Lead-Status ungültig (erlaubt: " + LEAD_STATUS.join(", ") + ")");
  const q = await hole(id);
  const leads = Array.isArray(q.leads) ? [...q.leads] : [];
  if (!Number.isInteger(index) || !leads[index]) throw new Error("Lead nicht gefunden");
  const alt = leads[index].status; leads[index] = { ...leads[index], status };
  let r = await speichere(id, { leads });
  await protokoll(id, "lead_status", { lead: leads[index].name, von: alt, nach: status });
  if (status === "kunde" && alt !== "kunde") r = await kundeZuordnen(id, { name: leads[index].name, kontakt: leads[index].kontakt, notiz: "aus Lead übernommen" });
  return r;
}

// Aufgaben aus "Benoetigte Schritte" erzeugen (ohne Doppelte zur selben Einnahmequelle).
export async function aufgabenAusSchritten(id) {
  const q = await hole(id);
  const schritte = schritteAlsAufgaben(q);
  if (!schritte.length) throw new Error("Feld „Benötigte Schritte“ ist leer (eine Zeile = ein Schritt)");
  const vorhanden = new Set((await aufgabenVon(id)).map(t => t.title));
  const neu = [];
  for (const title of schritte) if (!vorhanden.has(title)) neu.push(await createTask({ title, area: "Einnahmequelle: " + q.name, business_id: "master", priority: "Mittel", owner: q.verantwortlich || "Adnan", einnahmequelle_id: id, beschreibung: "Automatisch aus „Benötigte Schritte“ erzeugt." }));
  await protokoll(id, "aufgaben_aus_schritten", { neu: neu.length, uebersprungen: schritte.length - neu.length });
  return { neu, uebersprungen: schritte.length - neu.length };
}

export async function aufgabenVon(id) { return (await listTasks()).filter(t => t.einnahmequelle_id === id); }
export async function verlaufVon(id) { return listAuditFuer("einnahmequelle", id, 100); }

export function uebersicht(liste) {
  const zaehle = s => liste.filter(q => s.includes(q.status)).length;
  const kosten = liste.reduce((a, q) => a + (q.kosten_cent || 0), 0), einnahmen = liste.reduce((a, q) => a + (q.einnahmen_cent || 0), 0);
  return { aktiv: zaehle(EQ_GRUPPE.aktiv), test: zaehle(EQ_GRUPPE.test), pruefung: zaehle(EQ_GRUPPE.pruefung), pause: zaehle(EQ_GRUPPE.pause), kosten_cent: kosten, einnahmen_cent: einnahmen, gewinn_cent: einnahmen - kosten };
}
export { kundenAnzahl };
