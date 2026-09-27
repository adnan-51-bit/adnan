// Tagesbericht + Tageslisten der Master-Zentrale (27.09.2026). Reine Funktion: bekommt echte Daten,
// erfindet nichts. Was die Quelle nicht liefert, steht als "nicht verfügbar" im Bericht.

export const tagBerlin = d => { const t = new Date(d); return isNaN(t) ? null : t.toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" }); };
const eur = c => (c / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
import { istOffen, istWartend, sortiereAufgaben } from "./aufgaben-status.js";
import { EQ_GRUPPE, EQ_LABEL } from "./einnahmequellen-regeln.js";

// Automatisierungs-Laeufe liegen im Audit-Log (action "automation.lauf"), s. lib/automation-log.js.
export const istLauf = e => e?.action === "automation.lauf";

// eingaben: { jetzt, audit, tasks, finance, einnahmequellen, w24 (liveStatus.data | null), systems, benutzeraktionen }
export function erstelleTagesbericht(eingaben) {
  const { jetzt = new Date(), audit = [], tasks = [], finance = [], einnahmequellen = [], w24 = null, systems = [], freigaben = [], leads = [], pilotAktion = null } = eingaben;
  const offeneFreigaben = freigaben.filter(f => f.status === "OFFEN");
  const heute = tagBerlin(jetzt);
  const vonHeute = e => tagBerlin(e.created_at || e.occurred_at || e.updated_at) === heute;
  const laeufe = audit.filter(e => istLauf(e) && vonHeute(e));
  const automatischGeloest = laeufe.filter(e => e.details?.ergebnis === "ok");
  const lauffehler = laeufe.filter(e => e.details?.ergebnis !== "ok");
  const getestet = laeufe.filter(e => ["systempruefung", "werknetz24-systempruefung", "test-status", "quality-gate"].includes(e.details?.aktion));
  const erledigt = tasks.filter(t => t.status === "Erledigt" && tagBerlin(t.updated_at) === heute);
  const offen = sortiereAufgaben(tasks.filter(t => istOffen(t.status)));
  const wartend = offen.filter(t => istWartend(t.status));
  const zuTun = offen.filter(t => !istWartend(t.status));
  const buchungen = finance.filter(e => e.status === "confirmed" && !e.ist_test && tagBerlin(e.occurred_at) === heute);
  const offeneEinnahmen = finance.filter(e => e.kind === "income" && e.status === "pending" && !e.ist_test);
  const leadsHeute = leads.filter(l => tagBerlin(l.erstellt_am) === heute);
  const kundenHeute = leads.filter(l => l.status === "KUNDE" && tagBerlin(l.aktualisiert_am) === heute);
  const offeneAntworten = leads.filter(l => (l.nachrichten || []).some(n => n.richtung === "rein" && !n.bearbeitet));
  const cent = e => Math.round((Number(e.amount) || 0) * 100);
  const einnahmenHeute = buchungen.filter(e => e.kind === "income").reduce((a, e) => a + cent(e), 0);
  const kostenHeute = buchungen.filter(e => e.kind === "expense").reduce((a, e) => a + cent(e), 0);

  // Benutzeraktion = alles, was nur Adnan erledigen kann: nicht gruene Systeme mit naechstem Schritt
  // und blockierte Aufgaben. Keine Vermutungen.
  const benutzeraktionen = [
    // Offene Entscheidungen zuerst (Bereich "Wartet auf Freigabe").
    ...(offeneFreigaben.length ? [{ text: `${offeneFreigaben.length} Entscheidung(en) warten auf deine Freigabe`, ziel: "freigaben" }] : []),
    ...offeneAntworten.map(l => ({ text: `Antwort von ${l.name} beantworten`, ziel: "leads" })),
    ...(pilotAktion ? [{ text: "Pilot: " + pilotAktion.text, ziel: "pilot" }] : []),
    ...systems.filter(s => (s.status === "🔴" || s.status === "🟡") && s.next_action).map(s => ({ text: `${s.name}: ${s.next_action}`, ziel: "alerts" })),
    ...wartend.map(t => ({ text: `Wartet auf dich: ${t.title}${t.naechste_aktion ? " – " + t.naechste_aktion : ""}`, ziel: "tasks" })),
    // Einnahmequellen mit eingetragener Benutzeraktion (nicht pausiert)
    ...einnahmequellen.filter(q => q.status !== "PAUSE" && String(q.benutzeraktion || "").trim()).map(q => ({ text: `${q.name}: ${q.benutzeraktion}`, ziel: "einnahmequellen" })),
  ];
  const fehler = [
    ...systems.filter(s => s.status === "🔴").map(s => ({ text: `${s.name}: ${s.note || "kritisch"}`, ziel: "alerts" })),
    ...(w24?.technischeProbleme?.offeneIncidents ? [{ text: `Werknetz24: ${w24.technischeProbleme.offeneIncidents} offene Störung(en)`, ziel: "/werknetz24" }] : []),
    ...lauffehler.map(e => ({ text: `Automatisierung „${e.details?.name || e.details?.aktion}“: ${e.details?.fehler || "fehlgeschlagen"}`, ziel: "automation" })),
  ];
  const naechsteSchritte = [...benutzeraktionen.slice(0, 2), ...zuTun.slice(0, 2).map(t => ({ text: `${t.title} (${t.priority || "ohne Priorität"})`, ziel: "tasks" }))];
  const eqTest = einnahmequellen.filter(q => q.status === "TEST").map(q => q.name);

  return {
    datum: heute,
    heuteErledigt: [...erledigt.map(t => ({ text: t.title, ziel: "tasks" })), ...automatischGeloest.map(e => ({ text: `${e.details?.name}: ${e.details?.zusammenfassung || "ok"}`, ziel: "automation" }))],
    jetztZuTun: zuTun.map(t => ({ text: `${t.title} · ${t.priority || "—"}`, ziel: "tasks" })),
    // Tageszentrale (27.09.2026): alles aus gespeicherten Daten.
    wichtigsteAufgabe: zuTun[0] ? { text: `${zuTun[0].title} · ${zuTun[0].priority || "—"}${zuTun[0].naechste_aktion ? " – nächste Aktion: " + zuTun[0].naechste_aktion : ""}`, ziel: "tasks" } : null,
    wartendeAufgaben: wartend.map(t => ({ text: `${t.title}${t.naechste_aktion ? " – " + t.naechste_aktion : ""}`, ziel: "tasks" })),
    aktiveEinnahmequellen: einnahmequellen.filter(q => EQ_GRUPPE.aktiv.includes(q.status)).map(q => ({ text: `${q.name} · ${EQ_LABEL[q.status]}`, ziel: "einnahmequellen" })),
    laufendeEinnahmequellen: einnahmequellen.filter(q => q.status !== "PAUSE" && !EQ_GRUPPE.aktiv.includes(q.status)).map(q => ({ text: `${q.name} · ${EQ_LABEL[q.status]}`, ziel: "einnahmequellen" })),
    naechsteBenutzeraktion: benutzeraktionen[0] || null,
    offeneFreigaben: offeneFreigaben.map(f => ({ text: f.titel, ziel: "freigaben" })),
    letzteAktivitaeten: audit.slice(0, 8).map(e => ({ text: `${new Date(e.created_at).toLocaleString("de-DE", { timeZone: "Europe/Berlin", dateStyle: "short", timeStyle: "short" })} · ${aktivitaetText(e)}`, ziel: "audit" })),
    automatischGeloest: automatischGeloest.map(e => ({ text: `${e.details?.name}: ${e.details?.zusammenfassung || "ok"}`, ziel: "automation" })),
    benutzeraktionen, fehler, naechsteSchritte,
    bericht: [
      ["Was wurde automatisch erledigt?", automatischGeloest.length ? automatischGeloest.map(e => e.details?.name).join(", ") : "Heute noch nichts."],
      ["Was wurde getestet?", [getestet.length ? getestet.map(e => `${e.details?.name} (${e.details?.ergebnis})`).join(", ") : "Heute noch keine Prüfung gelaufen.", eqTest.length ? `Einnahmequellen im Test: ${eqTest.join(", ")}` : "Keine Einnahmequelle im Test."].join(" · ")],
      ["Welche Leads wurden gefunden?", (w24 ? (typeof w24.leads?.heute === "number" ? `${w24.leads.heute} neue Werknetz24-Leads heute (gesamt ${w24.leads.gesamt})` : `Werknetz24: Tageswert nicht verfügbar (gesamt ${w24.leads.gesamt})`) : "Werknetz24 nicht verfügbar") + ` · Einnahmequellen: ${leadsHeute.length} neue Leads heute${leadsHeute.length ? " (" + leadsHeute.map(l => l.name).join(", ") + ")" : ""}`],
      ["Welche Kunden wurden gewonnen?", (w24 ? (typeof w24.kunden?.heute === "number" ? `${w24.kunden.heute} neue Werknetz24-Kunden heute` : "Werknetz24: Tageswert nicht verfügbar") : "Werknetz24 nicht verfügbar") + ` · Einnahmequellen: ${kundenHeute.length} neue Kunden heute`],
      ["Welche Einnahmen wurden tatsächlich erfasst?", `${eur(einnahmenHeute)} (bestätigte Buchungen heute)`],
      ["Welche Kosten sind tatsächlich entstanden?", `${eur(kostenHeute)} (bestätigte Buchungen heute)`],
      ["Pilot Google-Profil", `${leads.filter(l => l.profil_analyse).length} Profil-Analysen · ${leads.filter(l => l.vertrag?.aktiv).length} laufende Monatsverträge`],
      ["Offene Einnahmen (Angebot angenommen, noch nicht bezahlt)", offeneEinnahmen.length ? `${eur(offeneEinnahmen.reduce((a, e) => a + cent(e), 0))} aus ${offeneEinnahmen.length} Buchung(en) – zählt erst nach Zahlungseingang` : "Keine."],
      ["Welche Fehler gibt es?", fehler.length ? fehler.map(f => f.text).join(" · ") : "Keine."],
      ["Welche Benutzeraktionen fehlen?", benutzeraktionen.length ? benutzeraktionen.map(b => b.text).join(" · ") : "Keine."],
      ["Was ist der nächste sinnvolle Schritt?", naechsteSchritte[0]?.text || "Nichts offen."],
    ],
  };
}

// Kurztext fuer "letzte Aktivitaeten" - nur aus dem gespeicherten Audit-Eintrag.
export function aktivitaetText(e) {
  const d = e?.details || {};
  if (e?.action === "automation.lauf") return `Automatisierung ${d.name || d.aktion}: ${d.ergebnis}`;
  if (e?.action?.startsWith("einnahmequelle.")) return `Einnahmequelle ${e.action.slice(15)}${d.name ? ": " + d.name : d.aufgabe ? ": " + d.aufgabe : d.kunde ? ": " + d.kunde : d.quelle ? ": " + d.quelle : ""}`;
  if (e?.action?.startsWith("task.")) return `Aufgabe ${e.action === "task.created" ? "angelegt" : "geändert"}${d.title ? ": " + d.title : ""}`;
  return e?.action || "—";
}
