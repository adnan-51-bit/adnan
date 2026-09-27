// Content & Werbung (27.09.2026, Teil 4A): Speicher + Ablauf + kostenlose Automatik. Getrennt von Werknetz24
// und E-Commerce (eigene Tabelle). Veroeffentlicht wird nie automatisch: Pruefung -> Freigabe durch Adnan ->
// Adnan postet selbst -> traegt Link ein. Jede Aenderung im Verlauf (Audit-Log, entity_type "content").
import { tabelle, neueId } from "./tabelle.js";
import { writeAudit, listAuditFuer } from "./audit.js";
import { freigabeAnfordern } from "./freigaben.js";
import { pruefeQuelle } from "./einnahmequellen-regeln.js";
import { C_TEXT, C_TYPEN, PLATTFORMEN, cStatusPruefung, pruefeKennzahl, pruefeVeroeffentlichung, pruefeBild, vorbereiten, ideenAusThema, erfolgsAuswertung, C_LABEL } from "./content-regeln.js";

const T = tabelle("master_content");
export const resetContentFuerTests = () => T.leeren();
const protokoll = (id, action, details) => writeAudit({ action: "content." + action, entityType: "content", entityId: id, details });
async function hole(id) { const c = await T.hole(id); if (!c) throw new Error("Content nicht gefunden"); return c; }

function bereinige(input, { neu = false } = {}) {
  const out = {};
  for (const k of C_TEXT) if (k in input) { const v = input[k] == null ? "" : String(input[k]).trim(); if (v.length > 8000) throw new Error(k + " zu lang"); out[k] = k === "einnahmequelle_id" ? (v || null) : v; }
  if ("typ" in input) { if (!C_TYPEN[input.typ]) throw new Error("Typ ungültig"); out.typ = input.typ; }
  if ("plattformen" in input) { if (!Array.isArray(input.plattformen) || input.plattformen.some(p => !PLATTFORMEN[p])) throw new Error("Plattformen ungültig"); out.plattformen = [...new Set(input.plattformen)]; }
  if ("werbung" in input) { if (typeof input.werbung !== "boolean") throw new Error("werbung muss ja/nein sein"); out.werbung = input.werbung; }
  for (const k of ["titel_varianten"]) if (k in input) { if (!Array.isArray(input[k])) throw new Error(k + " ungültig"); out[k] = input[k].map(String).slice(0, 20); }
  if ("varianten" in input) { if (typeof input.varianten !== "object" || Array.isArray(input.varianten) || Object.keys(input.varianten || {}).some(p => !PLATTFORMEN[p])) throw new Error("varianten ungültig"); out.varianten = input.varianten; }
  if (neu && !out.titel) throw new Error("Titel fehlt");
  if ("titel" in out && !out.titel) throw new Error("Titel darf nicht leer sein");
  return out;
}

export async function listContent() { return T.liste(); }

export async function createContent(input) {
  const jetzt = new Date().toISOString();
  const c = { id: neueId("ct"), titel: "", einnahmequelle_id: null, typ: "VIDEO", plattformen: [], thema: "", recherche: "", quellen_liste: [], skript: "", titel_varianten: [], beschreibung: "", varianten: {}, bilder: [], angebot_info: "", werbetext: "", social_posts: [], werbung: false, veroeffentlichung: [], kennzahlen: [], ergebnis: "", notiz: "", status: "IDEE", freigegeben: false, erstellt_am: jetzt, aktualisiert_am: jetzt, ...bereinige(input, { neu: true }) };
  const r = await T.neu(c);
  await protokoll(c.id, "created", { titel: c.titel });
  return r;
}

// Inhalte aendern - nie Status/Freigabe. Wird ein bereits freigegebener Inhalt vor der Veroeffentlichung
// geaendert, verfaellt die Freigabe (Adnan soll genau das freigeben, was veroeffentlicht wird).
export async function updateContent(id, patch) {
  const alt = await hole(id);
  const clean = bereinige(patch);
  const inhaltlich = Object.keys(clean).some(k => !["notiz", "ergebnis"].includes(k));
  const zuruecksetzen = alt.freigegeben && inhaltlich && ["PRUEFUNG"].includes(alt.status);
  const r = await T.aendere(id, { ...clean, ...(zuruecksetzen ? { freigegeben: false } : {}), aktualisiert_am: new Date().toISOString() });
  await protokoll(id, "updated", { felder: Object.keys(clean), freigabe_verfallen: zuruecksetzen });
  if (zuruecksetzen) await freigabeAnfordern({ art: "VEROEFFENTLICHUNG", titel: "Veröffentlichung freigeben (geändert): " + r.titel, beschreibung: "Der Inhalt wurde nach deiner Freigabe geändert – bitte neu prüfen.", bereich: "content", bezug_typ: "content", bezug_id: id });
  return r;
}

export async function setzeContentStatus(id, ziel) {
  const c = await hole(id);
  const fehler = cStatusPruefung(c, ziel); if (fehler) throw new Error(fehler);
  const r = await T.aendere(id, { status: ziel, aktualisiert_am: new Date().toISOString() });
  await protokoll(id, "status", { von: c.status, nach: ziel });
  // In die Pruefung = persoenliche Entscheidung noetig -> landet automatisch in "Wartet auf Freigabe".
  if (ziel === "PRUEFUNG" && !c.freigegeben) await freigabeAnfordern({ art: "VEROEFFENTLICHUNG", titel: "Veröffentlichung freigeben: " + c.titel, beschreibung: `${C_TYPEN[c.typ]} für ${(c.plattformen || []).map(p => PLATTFORMEN[p]).join(", ")}${c.werbung ? " – enthält Werbung (gekennzeichnet)" : ""}`, bereich: "content", bezug_typ: "content", bezug_id: id });
  return r;
}

export async function setzeContentFreigabe(id, ja) {
  const r = await T.aendere(id, { freigegeben: Boolean(ja), aktualisiert_am: new Date().toISOString() });
  await protokoll(id, ja ? "freigegeben" : "abgelehnt", {});
  return r;
}

// Kostenlose Automatik: fuellt nur LEERE Felder (Recherche-Links, Skript, Titel, Beschreibung, Varianten, Posts).
export async function contentVorbereiten(id) {
  const c = await hole(id);
  const neu = vorbereiten(c);
  if (!Object.keys(neu).length) return { content: c, gefuellt: [] };
  const r = await T.aendere(id, { ...neu, aktualisiert_am: new Date().toISOString() });
  await protokoll(id, "vorbereitet", { felder: Object.keys(neu) });
  return { content: r, gefuellt: Object.keys(neu) };
}

// Ideen erzeugen: nur Vorschlaege (werden nicht gespeichert, bis Adnan eine uebernimmt).
export function ideenVorschlaege({ thema, zielgruppe }) {
  if (!String(thema || "").trim()) throw new Error("Thema fehlt");
  return ideenAusThema(thema, zielgruppe);
}

async function anhaengen(id, feld, eintrag, action, details) {
  const c = await hole(id);
  const r = await T.aendere(id, { [feld]: [...(Array.isArray(c[feld]) ? c[feld] : []), eintrag], aktualisiert_am: new Date().toISOString() });
  await protokoll(id, action, details);
  return r;
}
export const contentQuelle = (id, q) => { const e = pruefeQuelle(q); return anhaengen(id, "quellen_liste", e, "quelle", { quelle: e.quelle }); };
export const contentBild = (id, b) => { const e = pruefeBild(b); return anhaengen(id, "bilder", e, "bild", { beschreibung: e.beschreibung }); };
export async function contentVeroeffentlichung(id, v) {
  const c = await hole(id);
  if (!c.freigegeben) throw new Error("Erst nach deiner Freigabe (Bereich „Wartet auf Freigabe“)");
  const e = pruefeVeroeffentlichung(v);
  return anhaengen(id, "veroeffentlichung", e, "veroeffentlicht", { plattform: e.plattform, url: e.url });
}
export const contentKennzahl = (id, k) => { const e = pruefeKennzahl(k); return anhaengen(id, "kennzahlen", e, "kennzahl", { plattform: e.plattform, datum: e.datum, aufrufe: e.aufrufe }); };
export const contentVerlauf = id => listAuditFuer("content", id, 100);
export async function contentUebersicht() {
  const liste = await listContent();
  const nachStatus = Object.fromEntries(Object.keys(C_LABEL).map(s => [s, liste.filter(c => c.status === s).length]));
  return { nachStatus, auswertung: erfolgsAuswertung(liste) };
}
