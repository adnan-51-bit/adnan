// Erste-Einnahme-Modus + Einnahmequellen-Dashboard (27.09.2026) - reine Auswertung echter Daten.
import { eqFinanzen } from "./master-finance.js";
import { istOffen } from "./aufgaben-status.js";
import { EQ_LABEL } from "./einnahmequellen-regeln.js";

// "Was fehlt bis zur ersten echten Einnahme?" - fuer die aktive Pilot-Einnahmequelle, Schritt fuer Schritt aus den Daten.
// wer: "du" = nur Adnan kann es tun; "zentrale" = laeuft automatisch/ist vorbereitet.
export function ersteEinnahmeCheckliste({ eq, leads = [], tasks = [], finance = [], freigaben = [] }) {
  if (!eq) return { erreicht: false, schritte: [], naechster: { text: "Pilot-Einnahmequelle fehlt", wer: "zentrale" } };
  const eig = leads.filter(l => l.einnahmequelle_id === eq.id);
  const f = eqFinanzen(finance, eq.id);
  const hat = st => eig.some(l => st.includes(l.status));
  const offeneRechnung = f.buchungen.some(b => b.art === "Einnahme");
  const monatsErledigt = tasks.some(t => t.einnahmequelle_id === eq.id && t.status === "Erledigt" && /^\d{4}-\d{2} · /.test(t.title));
  const schritte = [
    ["Einnahmequelle mit Quellen gewählt", (eq.quellen_liste || []).length >= 3, "zentrale"],
    ["Mindestens 3 potenzielle Kunden mit Quelle", eig.filter(l => /https?:\/\//.test(l.quelle || "")).length >= 3, "zentrale"],
    ["Profil-Analysen erstellt", eig.some(l => l.profil_analyse), "zentrale"],
    ["Kontakt zu mindestens einem Betrieb freigegeben (Wartet auf mich)", eig.some(l => l.pilot_crm?.kontakt_freigegeben || l.selbst_angefragt), "du"],
    ["Bericht persönlich gezeigt / Gespräch geführt", hat(["KONTAKT", "INTERESSENT", "ANGEBOT", "KUNDE"]), "du"],
    ["Ein Betrieb hat Interesse", hat(["INTERESSENT", "ANGEBOT", "KUNDE"]), "du"],
    ["Monatspreis festgelegt", eq.pilot?.monatspreis_cent > 0, "du"],
    ["Gewerbe/Steuer geklärt (Schuldnerberatung)", Boolean(eq.pilot?.gewerbe_geklaert), "du"],
    ["Angebot übergeben", hat(["ANGEBOT", "KUNDE"]) || eig.some(l => l.angebot), "du"],
    ["Kunde mit schriftlicher Zustimmung, Leistung gestartet", eig.some(l => l.vertrag?.aktiv || l.vertrag?.beendet_am), "du"],
    ["Leistung erbracht (Monatsaufgaben erledigt)", monatsErledigt, "du"],
    ["Rechnung gestellt (offene Einnahme)", offeneRechnung, "du"],
    ["Zahlung mit Nachweis erfasst = ERSTE EINNAHME", f.einnahmen_cent > 0, "du"],
  ].map(([text, ok, wer], i) => ({ nr: i + 1, text, ok: Boolean(ok), wer }));
  const naechster = schritte.find(s => !s.ok) || null;
  return { erreicht: f.einnahmen_cent > 0, schritte, naechster, offeneEntscheidungen: freigaben.filter(x => x.status === "OFFEN").length };
}

// Einnahmequellen-Dashboard inkl. "Automation Engine" je Quelle (Intervall, Pruefung, Fehlerstatus, Ergebnis, Vorschlag).
export function eqDashboard({ eqs = [], leads = [], tasks = [], finance = [], optimierung = null }) {
  const opt = Object.fromEntries((optimierung?.auswertung || []).map(a => [a.id, a]));
  return eqs.map(q => {
    const eig = leads.filter(l => l.einnahmequelle_id === q.id);
    const offen = tasks.filter(t => t.einnahmequelle_id === q.id && istOffen(t.status)).sort((a, b) => (a.due_at ? Date.parse(a.due_at) : Infinity) - (b.due_at ? Date.parse(b.due_at) : Infinity));
    const f = eqFinanzen(finance, q.id);
    const o = opt[q.id];
    const letzte = [q.aktualisiert_am, ...eig.map(l => l.aktualisiert_am), ...tasks.filter(t => t.einnahmequelle_id === q.id).map(t => t.updated_at)].filter(Boolean).sort().pop() || null;
    const vorschlag = q.status === "PAUSE" ? "pausiert – nichts zu tun" : !o ? "—" : o.pausenVorschlag ? "Pausieren oder verbessern (Entscheidung unter „Wartet auf mich“)" : o.befunde.length ? o.befunde[0] : o.zustand === "FUNKTIONIERT" ? "Wiederholbar machen, dann automatisieren" : "Nächste Aufgabe erledigen";
    return {
      id: q.id, name: q.name, status: EQ_LABEL[q.status] || q.status, aufwand: q.aufwand || "—",
      kosten_geplant: q.startkosten_cent == null ? "noch zu prüfen" : (q.startkosten_cent / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" }) + (q.laufende_kosten_cent ? " + " + (q.laufende_kosten_cent / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" }) + "/Monat" : ""),
      leads: eig.length, interessenten: eig.filter(l => ["INTERESSENT", "ANGEBOT"].includes(l.status)).length, kunden: eig.filter(l => l.status === "KUNDE").length,
      einnahmen_cent: f.einnahmen_cent, kosten_cent: f.kosten_cent, gewinn_cent: f.gewinn_cent, offen_cent: f.offen_cent,
      letzte_aktivitaet: letzte, naechste_aufgabe: offen[0]?.title || q.naechste_aufgabe || "—",
      engine: { intervall: q.status === "PAUSE" ? "ausgesetzt (pausiert)" : "täglich 07:00 (Vercel Cron)", pruefung: o ? { FUNKTIONIERT: "funktioniert", IN_ARBEIT: "in Arbeit", STOCKT: `stockt seit ${o.ruhe_tage} Tagen` }[o.zustand] : "—",
        fehler: o ? (o.ueberfaellig ? `${o.ueberfaellig} Aufgabe(n) überfällig` : "keine") : "—", ergebnis: o ? (o.befunde.join(", ") || "ohne Befund") : "—", vorschlag },
    };
  });
}
