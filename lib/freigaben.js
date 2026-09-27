// "Wartet auf Freigabe" (27.09.2026, Teil 4A): EINE zentrale Liste fuer alles, was Adnans persoenliche
// Entscheidung braucht - Veroeffentlichungen, Kosten, kostenpflichtige Werkzeuge, Automatisierungen mit Freigabe.
// Eine Freigabe loest nie selbst Kosten oder Veroeffentlichungen aus; sie wird nur protokolliert und gibt den
// naechsten Schritt frei (z. B. darf ein Content danach als "veroeffentlicht" eingetragen werden).
import { tabelle, neueId } from "./tabelle.js";
import { writeAudit } from "./audit.js";

export const FREIGABE_ARTEN = { VEROEFFENTLICHUNG: "Veröffentlichung", KOSTEN: "Kosten", WERKZEUG: "Werkzeug aktivieren", AUTOMATISIERUNG: "Automatisierung", RECHT: "Rechtliche Entscheidung" };
const T = tabelle("master_freigaben");
export const resetFreigabenFuerTests = () => T.leeren();

// Kostenpflichtige oder genehmigungspflichtige Werkzeuge: standardmaessig AUS. Keine Preisangaben ohne Quelle.
export const WERKZEUGE = [
  { id: "vorlagen", name: "Vorlagen-Generator (eingebaut)", zweck: "Recherche-Links, Ideen, Skripte, Titel, Beschreibungen, Plattform-Varianten", kosten: "0 €", kostenlos: true, standard: "aktiv" },
  { id: "ki-texte", name: "KI-Texte (Sprachmodell, z. B. über Vercel AI Gateway)", zweck: "Bessere, individuelle Skripte und Texte statt Vorlagen", kosten: "nutzungsabhängig pro Anfrage – aktuelle Preise vor der Freigabe beim Anbieter prüfen", kostenlos: false, standard: "aus" },
  { id: "tiktok-api", name: "TikTok-Schnittstelle (automatisch veröffentlichen/Statistik lesen)", zweck: "Posten und Kennzahlen ohne Handarbeit", kosten: "Voraussetzungen (Entwickler-Konto, App-Prüfung durch TikTok) vor Nutzung prüfen", kostenlos: false, standard: "aus" },
  { id: "bezahlte-werbung", name: "Bezahlte Werbung (TikTok/Meta Ads)", zweck: "Reichweite kaufen", kosten: "Werbebudget – nur nach Gewerbe-Klärung", kostenlos: false, standard: "aus" },
];

export async function listFreigaben() { return (await T.liste()).sort((a, b) => (a.status === "OFFEN" ? 0 : 1) - (b.status === "OFFEN" ? 0 : 1) || String(b.erstellt_am).localeCompare(String(a.erstellt_am))); }

// Legt eine offene Freigabe an - aber nie doppelt fuer denselben Bezug.
export async function freigabeAnfordern({ art, titel, beschreibung = "", kosten = "", bereich = "", bezug_typ = null, bezug_id = null }) {
  if (!FREIGABE_ARTEN[art]) throw new Error("Freigabe-Art ungültig");
  if (!String(titel || "").trim()) throw new Error("Titel der Freigabe fehlt");
  const offen = (await T.liste()).find(f => f.status === "OFFEN" && f.art === art && f.bezug_typ === bezug_typ && f.bezug_id === bezug_id && bezug_id);
  if (offen) return offen;
  const f = await T.neu({ id: neueId("fg"), art, titel: String(titel).slice(0, 300), beschreibung: String(beschreibung).slice(0, 2000), kosten: String(kosten).slice(0, 300), bereich, bezug_typ, bezug_id, status: "OFFEN", entscheidung_notiz: "", entschieden_am: null, erstellt_am: new Date().toISOString() });
  await writeAudit({ action: "freigabe.angefordert", entityType: "freigabe", entityId: f.id, details: { art, titel: f.titel, bezug_typ, bezug_id } });
  return f;
}

// Entscheidung: FREIGEGEBEN oder ABGELEHNT. Nebenwirkungen nur innerhalb der Zentrale (kein Geld, kein Posting).
export async function freigabeEntscheiden(id, entscheidung, notiz = "") {
  if (!["FREIGEGEBEN", "ABGELEHNT"].includes(entscheidung)) throw new Error("Entscheidung muss FREIGEGEBEN oder ABGELEHNT sein");
  const f = await T.hole(id); if (!f) throw new Error("Freigabe nicht gefunden");
  if (f.status !== "OFFEN") throw new Error("Bereits entschieden (" + f.status + ")");
  const r = await T.aendere(id, { status: entscheidung, entscheidung_notiz: String(notiz).slice(0, 1000), entschieden_am: new Date().toISOString() });
  if (f.bezug_typ === "content") { const { setzeContentFreigabe } = await import("./content.js"); await setzeContentFreigabe(f.bezug_id, entscheidung === "FREIGEGEBEN"); }
  if (f.bezug_typ === "eq-plan") { const [eqId, idx] = String(f.bezug_id).split(":"); const { setzePlanStatus } = await import("./einnahmequellen.js"); await setzePlanStatus(eqId, Number(idx), entscheidung === "FREIGEGEBEN" ? "freigegeben (noch nicht eingerichtet)" : "abgelehnt"); }
  await writeAudit({ action: "freigabe.entschieden", entityType: "freigabe", entityId: id, details: { art: f.art, titel: f.titel, entscheidung, bezug_typ: f.bezug_typ, bezug_id: f.bezug_id } });
  return r;
}

// Werkzeug-Status ergibt sich aus den Entscheidungen (freigegeben heisst: Einrichtung darf erfolgen - nicht: laeuft schon).
export async function werkzeugStatus() {
  const alle = await T.liste();
  return WERKZEUGE.map(w => {
    const f = alle.filter(x => x.bezug_typ === "werkzeug" && x.bezug_id === w.id).sort((a, b) => String(b.erstellt_am).localeCompare(String(a.erstellt_am)))[0];
    const status = w.kostenlos ? "aktiv" : !f ? "aus" : f.status === "OFFEN" ? "wartet auf Freigabe" : f.status === "FREIGEGEBEN" ? "freigegeben – Einrichtung ausstehend" : "abgelehnt";
    return { ...w, status };
  });
}
export async function werkzeugAnfragen(id) {
  const w = WERKZEUGE.find(x => x.id === id); if (!w) throw new Error("Werkzeug unbekannt");
  if (w.kostenlos) throw new Error("Kostenloses Werkzeug ist bereits aktiv");
  return freigabeAnfordern({ art: w.id === "bezahlte-werbung" ? "KOSTEN" : "WERKZEUG", titel: "Werkzeug aktivieren: " + w.name, beschreibung: w.zweck, kosten: w.kosten, bereich: "content", bezug_typ: "werkzeug", bezug_id: w.id });
}

// Automatisierungsvorschlaege der Einnahmequellen mit "Freigabe noetig" landen automatisch hier (einmalig je Vorschlag).
export async function syncPlanFreigaben(einnahmequellen) {
  const alle = await T.liste();
  for (const q of einnahmequellen) for (const [i, p] of (Array.isArray(q.automatisierungsplan) ? q.automatisierungsplan : []).entries()) {
    if (!p.freigabe || p.status !== "vorgeschlagen") continue;
    const bezug = `${q.id}:${i}`;
    if (alle.some(f => f.bezug_typ === "eq-plan" && f.bezug_id === bezug)) continue;
    alle.push({ bezug_typ: "eq-plan", bezug_id: bezug }); // gegen Doppelte innerhalb dieses Laufs
    await freigabeAnfordern({ art: "AUTOMATISIERUNG", titel: `Automatisierung für „${q.name}“: ${p.was}`, beschreibung: `Daten: ${p.daten} · Tool: ${p.tool} · Risiko: ${p.risiko}`, kosten: p.kosten, bereich: "einnahmequellen", bezug_typ: "eq-plan", bezug_id: bezug });
  }
}
