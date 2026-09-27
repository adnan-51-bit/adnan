// Tagesbericht + Tageslisten der Master-Zentrale (27.09.2026). Reine Funktion: bekommt echte Daten,
// erfindet nichts. Was die Quelle nicht liefert, steht als "nicht verfügbar" im Bericht.

export const tagBerlin = d => { const t = new Date(d); return isNaN(t) ? null : t.toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" }); };
const eur = c => (c / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const PRIO = { Hoch: 0, Mittel: 1, Niedrig: 2 };

// Automatisierungs-Laeufe liegen im Audit-Log (action "automation.lauf"), s. lib/automation-log.js.
export const istLauf = e => e?.action === "automation.lauf";

// eingaben: { jetzt, audit, tasks, finance, einnahmequellen, w24 (liveStatus.data | null), systems, benutzeraktionen }
export function erstelleTagesbericht(eingaben) {
  const { jetzt = new Date(), audit = [], tasks = [], finance = [], einnahmequellen = [], w24 = null, systems = [] } = eingaben;
  const heute = tagBerlin(jetzt);
  const vonHeute = e => tagBerlin(e.created_at || e.occurred_at || e.updated_at) === heute;
  const laeufe = audit.filter(e => istLauf(e) && vonHeute(e));
  const automatischGeloest = laeufe.filter(e => e.details?.ergebnis === "ok");
  const lauffehler = laeufe.filter(e => e.details?.ergebnis !== "ok");
  const getestet = laeufe.filter(e => ["systempruefung", "werknetz24-systempruefung", "test-status", "quality-gate"].includes(e.details?.aktion));
  const erledigt = tasks.filter(t => t.status === "Erledigt" && tagBerlin(t.updated_at) === heute);
  const offen = tasks.filter(t => t.status !== "Erledigt").sort((a, b) => (PRIO[a.priority] ?? 3) - (PRIO[b.priority] ?? 3));
  const buchungen = finance.filter(e => e.status === "confirmed" && tagBerlin(e.occurred_at) === heute);
  const cent = e => Math.round((Number(e.amount) || 0) * 100);
  const einnahmenHeute = buchungen.filter(e => e.kind === "income").reduce((a, e) => a + cent(e), 0);
  const kostenHeute = buchungen.filter(e => e.kind === "expense").reduce((a, e) => a + cent(e), 0);

  // Benutzeraktion = alles, was nur Adnan erledigen kann: nicht gruene Systeme mit naechstem Schritt
  // und blockierte Aufgaben. Keine Vermutungen.
  const benutzeraktionen = [
    ...systems.filter(s => (s.status === "🔴" || s.status === "🟡") && s.next_action).map(s => ({ text: `${s.name}: ${s.next_action}`, ziel: "alerts" })),
    ...offen.filter(t => t.status === "Blockiert").map(t => ({ text: `Aufgabe blockiert: ${t.title}`, ziel: "tasks" })),
  ];
  const fehler = [
    ...systems.filter(s => s.status === "🔴").map(s => ({ text: `${s.name}: ${s.note || "kritisch"}`, ziel: "alerts" })),
    ...(w24?.technischeProbleme?.offeneIncidents ? [{ text: `Werknetz24: ${w24.technischeProbleme.offeneIncidents} offene Störung(en)`, ziel: "/werknetz24" }] : []),
    ...lauffehler.map(e => ({ text: `Automatisierung „${e.details?.name || e.details?.aktion}“: ${e.details?.fehler || "fehlgeschlagen"}`, ziel: "automation" })),
  ];
  const naechsteSchritte = [...benutzeraktionen.slice(0, 2), ...offen.filter(t => t.status !== "Blockiert").slice(0, 2).map(t => ({ text: `${t.title} (${t.priority || "ohne Priorität"})`, ziel: "tasks" }))];
  const eqTest = einnahmequellen.filter(q => q.status === "TEST").map(q => q.name);

  return {
    datum: heute,
    heuteErledigt: [...erledigt.map(t => ({ text: t.title, ziel: "tasks" })), ...automatischGeloest.map(e => ({ text: `${e.details?.name}: ${e.details?.zusammenfassung || "ok"}`, ziel: "automation" }))],
    jetztZuTun: offen.filter(t => t.status !== "Blockiert").map(t => ({ text: `${t.title} · ${t.priority || "—"}`, ziel: "tasks" })),
    automatischGeloest: automatischGeloest.map(e => ({ text: `${e.details?.name}: ${e.details?.zusammenfassung || "ok"}`, ziel: "automation" })),
    benutzeraktionen, fehler, naechsteSchritte,
    bericht: [
      ["Was wurde automatisch erledigt?", automatischGeloest.length ? automatischGeloest.map(e => e.details?.name).join(", ") : "Heute noch nichts."],
      ["Was wurde getestet?", [getestet.length ? getestet.map(e => `${e.details?.name} (${e.details?.ergebnis})`).join(", ") : "Heute noch keine Prüfung gelaufen.", eqTest.length ? `Einnahmequellen im Test: ${eqTest.join(", ")}` : "Keine Einnahmequelle im Test."].join(" · ")],
      ["Welche Leads wurden gefunden?", w24 ? (typeof w24.leads?.heute === "number" ? `${w24.leads.heute} neue Werknetz24-Leads heute (gesamt ${w24.leads.gesamt})` : `Tageswert nicht verfügbar (gesamt ${w24.leads.gesamt})`) : "Werknetz24 nicht verfügbar"],
      ["Welche Kunden wurden gewonnen?", w24 ? (typeof w24.kunden?.heute === "number" ? `${w24.kunden.heute} neue Werknetz24-Kunden heute` : "Tageswert nicht verfügbar") : "Werknetz24 nicht verfügbar"],
      ["Welche Einnahmen wurden tatsächlich erfasst?", `${eur(einnahmenHeute)} (bestätigte Buchungen heute)`],
      ["Welche Kosten sind tatsächlich entstanden?", `${eur(kostenHeute)} (bestätigte Buchungen heute)`],
      ["Welche Fehler gibt es?", fehler.length ? fehler.map(f => f.text).join(" · ") : "Keine."],
      ["Welche Benutzeraktionen fehlen?", benutzeraktionen.length ? benutzeraktionen.map(b => b.text).join(" · ") : "Keine."],
      ["Was ist der nächste sinnvolle Schritt?", naechsteSchritte[0]?.text || "Nichts offen."],
    ],
  };
}
