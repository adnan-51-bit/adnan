// Umsatz-Pipeline (27.09.2026): NEUE LEADS -> ANALYSIERT -> KONTAKT VORBEREITET -> WARTET AUF FREIGABE -> INTERESSE -> ANGEBOT -> AUFTRAG -> BEZAHLT.
// Nur aus gespeicherten Leads, Aufgaben und Buchungen. "Bezahlt" nur mit bestaetigter, nicht-Test-Buchung.
import { finanzMonitor } from "./master-finance.js";
import { istOffen } from "./aufgaben-status.js";
import { bewerteLead } from "./lead-bewertung.js";

const KONTAKTIERT = ["KONTAKT", "INTERESSENT", "ANGEBOT", "KUNDE"], INTERESSE = ["INTERESSENT", "ANGEBOT", "KUNDE"];
export const STUFEN = [["leads", "Neue Leads"], ["analysiert", "Analysiert"], ["vorbereitet", "Kontakt vorbereitet"], ["wartet", "Wartet auf Freigabe"], ["interesse", "Interesse"], ["angebot", "Angebot"], ["auftrag", "Auftrag"], ["bezahlt", "Bezahlt"]];
// "Kontakt vorbereitet": analysiert und eine Gesprächsunterlage ist sinnvoll (Profil nicht schon gut gepflegt).
const sinnvoll = l => l.profil_analyse && l.profil_analyse.punkte < 75;
// Nachvollziehbare Bewertung fuer die Top-5: Luecken (100 - Punkte), +20 wenn das Profil nicht vom Inhaber beansprucht ist,
// -40 wenn gar kein Google-Profil gefunden wurde (Inhaber muss es erst selbst anlegen). Nur noch nicht kontaktierte Betriebe.
export function leadBewertung(l) {
  const a = l.profil_analyse; if (!a) return null;
  const unbeansprucht = /nicht vom inhaber beansprucht/i.test(a.notiz || ""), keinProfil = a.werte?.kategorie === "nein" && a.werte?.kontakt === "nein";
  const gruende = [`${a.punkte}/100 Punkte (${a.verbesserungen?.length || 0} Verbesserungen)`];
  if (unbeansprucht) gruende.push("Google-Profil nicht vom Inhaber beansprucht");
  if (keinProfil) gruende.push("kein Google-Profil gefunden – Inhaber müsste es erst anlegen");
  const top = (a.verbesserungen || []).filter(v => v.dringend).slice(0, 2).map(v => v.text.replace(/.$/, ""));
  if (top.length) gruende.push("wichtigste Lücken: " + top.join("; "));
  return { wert: 100 - a.punkte + (unbeansprucht ? 20 : 0) - (keinProfil ? 40 : 0), gruende };
}
export function top5(leads = []) {
  return leads.filter(l => l.profil_analyse && !["VERLOREN", "GESPERRT", "KONTAKT", "INTERESSENT", "ANGEBOT", "KUNDE"].includes(l.status) && sinnvoll(l))
    .map(l => { const b = bewerteLead(l), alt = leadBewertung(l); return { id: l.id, name: l.firma || l.name, ort: l.ort || "", branche: l.branche || "", quelle: String(l.quelle || "").split(" ")[0], neu_seit: l.erstellt_am,
      wert: alt.wert, bewertung: b, gruende: [`Bewertung ${b.summe}/10`, ...b.kriterien.map(k => `${k.name}: ${k.punkte}/2 (${k.begruendung})`), ...alt.gruende.filter(g => /beansprucht|kein Google-Profil/.test(g))] }; })
    .sort((a, b) => b.bewertung.summe - a.bewertung.summe || b.wert - a.wert || String(b.neu_seit).localeCompare(String(a.neu_seit))).slice(0, 5);
}
const NACHFASS = /^(Nachfassen|Angebot übergeben|Profil-Check-Bericht persönlich zeigen|Lead nachfassen|Angebot nachfassen|Antwort abwarten)/;

// extra (optional): aktuellerLead, claudeErledigt (heute automatisch), duMusst (offene Entscheidungen/Aufgaben).
export function umsatzPipeline({ leads = [], tasks = [], finance = [], naechsterSchritt = null, aktuellerLead = null, claudeErledigt = [], duMusst = [] } = {}) {
  const aktiv = leads.filter(l => !["VERLOREN", "GESPERRT"].includes(l.status));
  const bezahltIds = new Set(finance.filter(e => e.kind === "income" && e.status === "confirmed" && !e.ist_test && e.lead_id).map(e => String(e.lead_id)));
  const hatAngebot = l => ["ANGEBOT", "KUNDE"].includes(l.status) || ["freigegeben", "gesendet", "angenommen"].includes(l.angebot?.status);
  const zahl = { leads: aktiv.length, analysiert: aktiv.filter(l => l.profil_analyse).length,
    vorbereitet: aktiv.filter(sinnvoll).length, wartet: aktiv.filter(l => sinnvoll(l) && !l.pilot_crm?.kontakt_freigegeben && !KONTAKTIERT.includes(l.status)).length,
    gespraech: aktiv.filter(l => KONTAKTIERT.includes(l.status)).length,
    kontaktiert: aktiv.filter(l => KONTAKTIERT.includes(l.status)).length, interesse: aktiv.filter(l => INTERESSE.includes(l.status)).length,
    angebot: aktiv.filter(hatAngebot).length, auftrag: aktiv.filter(l => l.status === "KUNDE").length, bezahlt: leads.filter(l => bezahltIds.has(String(l.id))).length };
  const m = finanzMonitor(finance);
  return {
    stufen: STUFEN.map(([id, name]) => ({ id, name, anzahl: zahl[id] })),
    kennzahlen: { leads: zahl.leads, interessenten: zahl.interesse, offeneNachfassungen: tasks.filter(t => istOffen(t.status) && String(t.quelle || "").startsWith("lead:") && NACHFASS.test(t.title || "")).length,
      angebote: aktiv.filter(l => l.angebot && l.angebot.status !== "abgelehnt").length, auftraege: zahl.auftrag, einnahmen_cent: m.einnahmen_cent, kosten_cent: m.kosten_cent, gewinn_cent: m.gewinn_cent, offen_cent: m.offen_cent },
    naechsterSchritt, aktuellerLead, claudeErledigt, duMusst, top5: top5(leads),
  };
}
