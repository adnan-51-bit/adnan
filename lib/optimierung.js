// Taeglicher Optimierungslauf (27.09.2026, "Autonome Einnahmenmaschine") - reine Auswertung echter Daten.
// Beantwortet je Einnahmequelle: funktioniert sie, stockt sie, was ist offen/ueberfaellig - und leitet daraus
// Prioritaeten fuer heute ab. Geschaeftsentscheidungen (z. B. pausieren) werden nur VORGESCHLAGEN ("Wartet auf mich").
import { arbeitsPrioritaet } from "./einnahmequellen-regeln.js";
import { istOffen } from "./aufgaben-status.js";

const TAG = 86400000;
const tageSeit = (t, jetzt) => t ? Math.floor((jetzt - Date.parse(t)) / TAG) : null;
export const STOCKT_AB_TAGEN = 14, PAUSE_VORSCHLAG_AB_TAGEN = 30;

export function optimierung({ eqs = [], leads = [], tasks = [], finance = [], jetzt = new Date() }) {
  const t = jetzt.getTime();
  const auswertung = eqs.filter(q => !["PAUSE", "GESTOPPT"].includes(q.status)).map(q => {
    const eigeneLeads = leads.filter(l => l.einnahmequelle_id === q.id);
    const eigeneTasks = tasks.filter(x => x.einnahmequelle_id === q.id && istOffen(x.status));
    const ueberfaellig = eigeneTasks.filter(x => x.due_at && Date.parse(x.due_at) < t);
    const einnahmen = finance.filter(e => e.einnahmequelle_id === q.id && e.kind === "income" && e.status === "confirmed" && !e.ist_test).reduce((a, e) => a + Math.round(Number(e.amount) * 100), 0);
    const letzte = [q.aktualisiert_am, ...eigeneLeads.map(l => l.aktualisiert_am), ...tasks.filter(x => x.einnahmequelle_id === q.id).map(x => x.updated_at)].filter(Boolean).sort().pop();
    const ruhe = tageSeit(letzte, t);
    const kunden = eigeneLeads.filter(l => l.status === "KUNDE").length;
    const befunde = [];
    if (eigeneLeads.length && eigeneLeads.every(l => !l.profil_analyse && !l.nachrichten?.length) && q.kategorie === "C") befunde.push(`${eigeneLeads.length} Leads noch nicht analysiert`);
    if (ueberfaellig.length) befunde.push(`${ueberfaellig.length} Aufgabe(n) überfällig`);
    if (eigeneLeads.length >= 5 && !kunden) befunde.push(`${eigeneLeads.length} Leads, noch kein Kunde – Angebot/Ansprache prüfen`);
    if (!eigeneLeads.length && ["TEST", "AUTOMATISIERT", "VEROEFFENTLICHT", "LEADS_KUNDEN"].includes(q.status)) befunde.push("Im Test, aber noch keine Leads");
    const zustand = einnahmen > 0 ? "FUNKTIONIERT" : ruhe !== null && ruhe >= STOCKT_AB_TAGEN ? "STOCKT" : "IN_ARBEIT";
    return { id: q.id, name: q.name, status: q.status, prioritaet: arbeitsPrioritaet(q).stufe, zustand, ruhe_tage: ruhe, leads: eigeneLeads.length, kunden, einnahmen_cent: einnahmen, offene_aufgaben: eigeneTasks.length, ueberfaellig: ueberfaellig.length, befunde,
      pausenVorschlag: zustand === "STOCKT" && ruhe >= PAUSE_VORSCHLAG_AB_TAGEN };
  });
  const ersteEinnahme = auswertung.some(a => a.einnahmen_cent > 0);
  const aktivInArbeit = auswertung.filter(a => a.zustand !== "STOCKT" && a.leads > 0);
  // Fokus-Regel: bis zur ersten echten Einnahme EINE Einnahmequelle vorantreiben; eine neue erst testen, wenn nichts mehr in Bewegung ist.
  const kandidat = auswertung.filter(a => ["IDEE", "PRUEFUNG"].includes(a.status)).sort((a, b) => a.prioritaet - b.prioritaet)[0];
  const neueTesten = !ersteEinnahme && !aktivInArbeit.length && kandidat ? kandidat : null;
  const empfehlung = ersteEinnahme ? "Erste Einnahme erreicht – wiederkehrende Kunden gewinnen, dann weitere Einnahmequellen testen."
    : aktivInArbeit.length ? `Fokus: „${aktivInArbeit.sort((a, b) => b.leads - a.leads)[0].name}“ bis zur ersten echten Einnahme – keine neue Einnahmequelle nebenbei starten.`
      : neueTesten ? `Keine Einnahmequelle in Bewegung – nächste kostenlose Idee testen: „${neueTesten.name}“ (Arbeitspriorität P${neueTesten.prioritaet}).` : "Einnahmequellen prüfen – keine aktive Bewegung.";
  // Fokus-Einnahmequelle (fuer die Engine): vor der ersten Einnahme genau eine, danach null = alle aktiven.
  const fokus = ersteEinnahme ? null : aktivInArbeit.length ? aktivInArbeit.sort((a, b) => b.leads - a.leads)[0].id : neueTesten?.id || null;
  return { datum: jetzt.toISOString().slice(0, 10), auswertung, empfehlung, neueTesten, ersteEinnahme, fokus };
}
