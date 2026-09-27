// Automatisierungs-Engine je Einnahmequelle (Teil 5, 27.09.2026):
// Recherche -> Vorbereitung -> Content/Aktion -> Lead -> Kontakt -> Interessent -> Kunde -> Einnahme -> Auswertung -> Optimierung.
// Jeder Schritt wird nur aus echten Daten als erledigt erkannt. Der erste offene Schritt wird als Aufgabe gespeichert.
// Schritte mit Geld, Vertrag oder persoenlichem Kontakt macht nie die Automatik: sie werden "Wartet auf Benutzer".
import { eqFinanzen } from "./master-finance.js";

const gefuellt = v => Boolean(String(v ?? "").trim());
const hatStatus = (leads, st) => leads.some(l => st.includes(l.status));

// frei = darf die Zentrale selbst vorbereiten; sonst Entscheidung/Handlung von Adnan (Wartet auf Freigabe).
export const PIPELINE = [
  { id: "recherche", text: "Recherche", frei: true, aufgabe: "Mindestens eine Quelle mit Datum und belegter Aussage eintragen",
    ok: ({ q }) => (q.quellen_liste || []).length > 0 },
  { id: "vorbereitung", text: "Vorbereitung", frei: true, aufgabe: "Angebot und Zielkunden beschreiben (ohne Preisversprechen)",
    ok: ({ q }) => gefuellt(q.angebot) && gefuellt(q.zielgruppe) },
  { id: "aktion", text: "Content/Aktion", frei: true, aufgabe: "Ersten Content-Entwurf oder eine Profil-Analyse vorbereiten (nichts veröffentlichen)",
    ok: ({ q, eig, content }) => (q.entwuerfe || []).length > 0 || content.some(c => c.einnahmequelle_id === q.id) || eig.some(l => l.profil_analyse) },
  { id: "lead", text: "Lead", frei: true, aufgabe: "Ersten echten Lead mit Quelle erfassen (keine gekauften Listen, kein Spam)",
    ok: ({ eig }) => eig.length > 0 },
  { id: "kontakt", text: "Kontakt", frei: false, aufgabe: "Entscheiden, ob du einen Lead persönlich kontaktierst – die Zentrale sendet nichts automatisch",
    ok: ({ eig }) => hatStatus(eig, ["KONTAKT", "INTERESSENT", "ANGEBOT", "KUNDE"]) || eig.some(l => l.pilot_crm?.kontakt_freigegeben) },
  { id: "interessent", text: "Interessent", frei: false, aufgabe: "Gespräch führen und echtes Interesse dokumentieren",
    ok: ({ eig }) => hatStatus(eig, ["INTERESSENT", "ANGEBOT", "KUNDE"]) },
  { id: "kunde", text: "Kunde", frei: false, aufgabe: "Angebot/Preis festlegen und Zustimmung des Kunden einholen (nur du – rechtlich bindend)",
    ok: ({ eig }) => hatStatus(eig, ["KUNDE"]) },
  { id: "einnahme", text: "Einnahme", frei: false, aufgabe: "Zahlung mit Nachweis erfassen (Kontoauszug) – vorher gilt nichts als verdient",
    ok: ({ f }) => f.einnahmen_cent > 0 },
  { id: "auswertung", text: "Auswertung", frei: true, aufgabe: "Ergebnisse dokumentieren: Aufwand, Einnahmen, Kosten, was hat funktioniert",
    ok: ({ q, f }) => f.einnahmen_cent > 0 && gefuellt(q.ergebnisse) },
  { id: "optimierung", text: "Optimierung", frei: false, aufgabe: "Entscheiden: wiederholen, automatisieren oder skalieren (Kosten nur nach Freigabe)",
    ok: ({ q }) => q.status === "SKALIEREN" },
];
export const PIPELINE_PREFIX = "[Engine] ";

export function pipelineStand(q, { leads = [], content = [], finance = [] } = {}) {
  const ctx = { q, eig: leads.filter(l => l.einnahmequelle_id === q.id), content, f: eqFinanzen(finance, q.id) };
  const schritte = PIPELINE.map((s, i) => ({ nr: i + 1, id: s.id, text: s.text, frei: s.frei, ok: Boolean(s.ok(ctx)) }));
  const offen = schritte.find(s => !s.ok) || null;
  return { schritte, erledigt: schritte.filter(s => s.ok).length, aktuell: offen, text: offen ? `${offen.nr}/10 ${offen.text}` : "10/10 abgeschlossen" };
}

// Welche Aufgabe die Engine fuer eine Einnahmequelle anlegen wuerde (rein, ohne Speichern). null = nichts zu tun.
// Regeln: ruhende Quellen nie; hoechstens EINE offene Engine-Aufgabe je Quelle; kein Doppel, wenn der gleiche
// Schritt schon als Entscheidung unter "Wartet auf mich" liegt.
export function pipelineAufgabe(q, { leads = [], content = [], finance = [], tasks = [], freigaben = [] } = {}) {
  if (["PAUSE", "GESTOPPT"].includes(q.status)) return null;
  const st = pipelineStand(q, { leads, content, finance });
  if (!st.aktuell) return null;
  const offenEngine = tasks.some(t => t.einnahmequelle_id === q.id && String(t.title || "").startsWith(PIPELINE_PREFIX) && !["Erledigt", "Gestoppt"].includes(t.status));
  if (offenEngine) return null;
  const s = PIPELINE[st.aktuell.nr - 1];
  const eigeneLeadIds = new Set(leads.filter(l => l.einnahmequelle_id === q.id).map(l => l.id));
  const schonEntscheidung = !s.frei && freigaben.some(f => f.status === "OFFEN" && (f.bezug_id === q.id || eigeneLeadIds.has(f.bezug_id)));
  if (schonEntscheidung) return null;
  return {
    title: `${PIPELINE_PREFIX}${q.name}: ${st.aktuell.nr}/10 ${s.text} – ${s.aufgabe}`,
    status: s.frei ? "Offen" : "Wartet auf Benutzer", priority: s.frei ? "Mittel" : "Hoch", area: "Automatisierungs-Engine", business_id: "master",
    owner: s.frei ? "Claude / Zentrale" : "Adnan", einnahmequelle_id: q.id,
    beschreibung: s.frei ? "Automatisch aus der Engine: kostenlos vorbereitbar, nichts wird veröffentlicht oder gesendet." : "WARTET AUF FREIGABE: Dieser Schritt betrifft Kontakt, Geld oder eine bindende Zusage – die Automatik führt ihn nie aus.",
    naechste_aktion: s.aufgabe,
  };
}
