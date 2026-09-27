// Einnahmequellen der Master-Zentrale (27.09.2026). Getrennt von Werknetz24 und E-Commerce (eigene Tabelle).
// Grundsatz: Erst pruefen, dann testen, dann Technik. Keine erfundenen Maerkte, Preise oder Einnahmen -
// Felder starten leer bzw. 0 und werden nur mit Quelle befuellt.
import { writeAudit } from "./audit.js";

import { EQ_STATUS, EQ_LABEL, TEXT, ZAHL, PRUEFSCHRITTE, pruefstand, gewinnCent, statusPruefung } from "./einnahmequellen-regeln.js";
export { EQ_STATUS, EQ_LABEL, PRUEFSCHRITTE, pruefstand, gewinnCent, statusPruefung };

function bereinige(input, { neu = false } = {}) {
  const out = {};
  for (const k of TEXT) if (k in input) { const v = input[k] == null ? "" : String(input[k]).trim(); if (v.length > 4000) throw new Error(k + " zu lang"); out[k] = k === "verweis" ? (v || null) : v; }
  for (const k of ZAHL) if (k in input) { const v = input[k] === "" || input[k] == null ? (k === "startkosten_cent" ? null : 0) : input[k]; if (v !== null && !(Number.isInteger(v) && v >= 0)) throw new Error(k + " muss eine ganze Zahl ≥ 0 sein"); out[k] = v; }
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

export async function createEinnahmequelle(input) {
  const jetzt = new Date().toISOString();
  const q = { id: "eq_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), name: "", kategorie: "", zielgruppe: "", angebot: "", preis: "", startkosten_cent: null, werkzeuge: "", aufwand: "", rechtliches: "", markt: "", nachfrage: "", konkurrenz: "", kosten_pruefung: "", quellen: "", kostenloser_test: "", test_status: "", erste_kunden: 0, einnahmen_cent: 0, kosten_cent: 0, status: "IDEE", verweis: null, notiz: "", erstellt_am: jetzt, aktualisiert_am: jetzt, ...bereinige(input, { neu: true }) };
  const gespeichert = supabaseAktiv() ? (await sb("master_einnahmequellen", { method: "POST", body: JSON.stringify(q) }))[0] : (memory.set(q.id, q), q);
  await writeAudit({ action: "einnahmequelle.created", entityType: "einnahmequelle", entityId: q.id, details: { name: q.name } });
  return gespeichert;
}

// Aendert Inhalte - aber NIE den Status (dafuer setzeEqStatus mit Pruefung).
export async function updateEinnahmequelle(id, patch) {
  const clean = bereinige(patch); clean.aktualisiert_am = new Date().toISOString();
  let q;
  if (supabaseAktiv()) { const rows = await sb("master_einnahmequellen?id=eq." + encodeURIComponent(id), { method: "PATCH", body: JSON.stringify(clean) }); q = rows?.[0]; }
  else { const alt = memory.get(id); if (alt) { q = { ...alt, ...clean }; memory.set(id, q); } }
  if (!q) throw new Error("Einnahmequelle nicht gefunden");
  await writeAudit({ action: "einnahmequelle.updated", entityType: "einnahmequelle", entityId: id, details: Object.keys(clean) });
  return q;
}

export async function setzeEqStatus(id, ziel) {
  const q = (await listEinnahmequellen()).find(x => x.id === id);
  if (!q) throw new Error("Einnahmequelle nicht gefunden");
  const fehler = statusPruefung(q, ziel); if (fehler) throw new Error(fehler);
  const neu = { status: ziel, aktualisiert_am: new Date().toISOString() };
  let r;
  if (supabaseAktiv()) r = (await sb("master_einnahmequellen?id=eq." + encodeURIComponent(id), { method: "PATCH", body: JSON.stringify(neu) }))[0];
  else { r = { ...q, ...neu }; memory.set(id, r); }
  await writeAudit({ action: "einnahmequelle.status", entityType: "einnahmequelle", entityId: id, details: { von: q.status, nach: ziel } });
  return r;
}

export function uebersicht(liste) {
  const zaehle = s => liste.filter(q => s.includes(q.status)).length;
  const kosten = liste.reduce((a, q) => a + (q.kosten_cent || 0), 0), einnahmen = liste.reduce((a, q) => a + (q.einnahmen_cent || 0), 0);
  return { aktiv: zaehle(["AKTIV", "ERSTER_KUNDE"]), test: zaehle(["TEST"]), pruefung: zaehle(["IDEE", "PRUEFUNG"]), pause: zaehle(["PAUSE"]), kosten_cent: kosten, einnahmen_cent: einnahmen, gewinn_cent: einnahmen - kosten };
}
