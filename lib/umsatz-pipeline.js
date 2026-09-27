// Umsatz-Pipeline (27.09.2026): LEADS -> ANALYSIERT -> KONTAKT VORBEREITET -> GESPRAECH -> INTERESSE -> ANGEBOT -> AUFTRAG -> BEZAHLT.
// Nur aus gespeicherten Leads, Aufgaben und Buchungen. "Bezahlt" nur mit bestaetigter, nicht-Test-Buchung.
import { finanzMonitor } from "./master-finance.js";
import { istOffen } from "./aufgaben-status.js";

const KONTAKTIERT = ["KONTAKT", "INTERESSENT", "ANGEBOT", "KUNDE"], INTERESSE = ["INTERESSENT", "ANGEBOT", "KUNDE"];
export const STUFEN = [["leads", "Leads"], ["analysiert", "Analysiert"], ["vorbereitet", "Kontakt vorbereitet"], ["gespraech", "Gespräch"], ["interesse", "Interesse"], ["angebot", "Angebot"], ["auftrag", "Auftrag"], ["bezahlt", "Bezahlt"]];
const NACHFASS = /^(Nachfassen|Angebot übergeben|Profil-Check-Bericht persönlich zeigen|Lead nachfassen|Angebot nachfassen|Antwort abwarten)/;

// extra (optional): aktuellerLead, claudeErledigt (heute automatisch), duMusst (offene Entscheidungen/Aufgaben).
export function umsatzPipeline({ leads = [], tasks = [], finance = [], naechsterSchritt = null, aktuellerLead = null, claudeErledigt = [], duMusst = [] } = {}) {
  const aktiv = leads.filter(l => !["VERLOREN", "GESPERRT"].includes(l.status));
  const bezahltIds = new Set(finance.filter(e => e.kind === "income" && e.status === "confirmed" && !e.ist_test && e.lead_id).map(e => String(e.lead_id)));
  const hatAngebot = l => ["ANGEBOT", "KUNDE"].includes(l.status) || ["freigegeben", "gesendet", "angenommen"].includes(l.angebot?.status);
  const zahl = { leads: aktiv.length, analysiert: aktiv.filter(l => l.profil_analyse).length,
    vorbereitet: aktiv.filter(l => l.pilot_crm?.kontakt_freigegeben || KONTAKTIERT.includes(l.status)).length, gespraech: aktiv.filter(l => KONTAKTIERT.includes(l.status)).length,
    kontaktiert: aktiv.filter(l => KONTAKTIERT.includes(l.status)).length, interesse: aktiv.filter(l => INTERESSE.includes(l.status)).length,
    angebot: aktiv.filter(hatAngebot).length, auftrag: aktiv.filter(l => l.status === "KUNDE").length, bezahlt: leads.filter(l => bezahltIds.has(String(l.id))).length };
  const m = finanzMonitor(finance);
  return {
    stufen: STUFEN.map(([id, name]) => ({ id, name, anzahl: zahl[id] })),
    kennzahlen: { leads: zahl.leads, interessenten: zahl.interesse, offeneNachfassungen: tasks.filter(t => istOffen(t.status) && String(t.quelle || "").startsWith("lead:") && NACHFASS.test(t.title || "")).length,
      angebote: aktiv.filter(l => l.angebot && l.angebot.status !== "abgelehnt").length, auftraege: zahl.auftrag, einnahmen_cent: m.einnahmen_cent, kosten_cent: m.kosten_cent, gewinn_cent: m.gewinn_cent, offen_cent: m.offen_cent },
    naechsterSchritt, aktuellerLead, claudeErledigt, duMusst,
  };
}
