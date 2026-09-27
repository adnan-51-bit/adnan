// Gesamtstatus der Master-Zentrale (27.09.2026). Reine Rechenfunktion ohne Netzwerk - bekommt die
// bereits geladenen Daten der einzelnen Bereiche und rechnet daraus die Startseiten-Kennzahlen.
// Grundsatz: nur echte Werte. Fehlt eine Quelle (nicht angemeldet, nicht erreichbar), wird die
// Kennzahl als "unvollständig" markiert statt geschaetzt. Jede Zahl bringt ihren Rechenweg mit.

const PLATZHALTER = new Set(["future"]); // vorbereitete, noch nicht existierende Betriebe
const PAUSIERT = new Set(["PAUSIERT", "PAUSE"]);
const EQ_AKTIV = new Set(["AKTIV", "ERSTER_KUNDE", "SKALIEREN"]);
const cent = euro => Math.round((Number(euro) || 0) * 100);
const eur = c => (c / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });

function summe(teile) {
  const vollstaendig = teile.every(t => typeof t.cent === "number");
  const wert = teile.reduce((a, t) => a + (typeof t.cent === "number" ? t.cent : 0), 0);
  return { cent: wert, vollstaendig, rechenweg: teile.map(t => `${t.quelle}: ${typeof t.cent === "number" ? eur(t.cent) : "nicht verfügbar"}`) };
}

// eingaben: { businesses, tasks, tasksLocked, systems, finance, einnahmequellen (null = nicht geladen),
//             ecKunden (Array | null), qualityGate }
export function berechneGesamtstatus(eingaben) {
  const { businesses = [], tasks = [], tasksLocked = false, systems = [], finance = [], einnahmequellen = null, ecKunden = null, qualityGate = null } = eingaben;
  const w24 = businesses.find(b => b.id === "werknetz24")?.liveStatus;
  const w24d = w24?.ok ? w24.data : null;
  const eq = Array.isArray(einnahmequellen) ? einnahmequellen : null;

  // Projekte: echte Geschaeftsbereiche + Einnahmequellen. Eine Einnahmequelle, die auf einen
  // Geschaeftsbereich verweist (z. B. Sortiert24 -> /e-commerce), wird nicht doppelt gezaehlt.
  const bereiche = businesses.filter(b => !PLATZHALTER.has(b.id));
  const bereichLinks = new Set(bereiche.map(b => b.link).filter(Boolean));
  const eigeneEq = (eq || []).filter(q => !(q.verweis && bereichLinks.has(q.verweis)));
  const aktiveBereiche = bereiche.filter(b => !PAUSIERT.has(String(b.status).toUpperCase()));
  const pausierteBereiche = bereiche.filter(b => PAUSIERT.has(String(b.status).toUpperCase()));
  const aktiveEq = eigeneEq.filter(q => EQ_AKTIV.has(q.status));
  const pausierteEq = eigeneEq.filter(q => q.status === "PAUSE");

  const bestaetigt = finance.filter(e => e.status === "confirmed");
  const offenGebucht = finance.filter(e => e.status === "pending").length;
  const einnahmen = summe([
    { quelle: "Werknetz24 (bezahlte Rechnungen)", cent: w24d?.finanzen?.bezahltSummeCent },
    { quelle: "Master-Buchungen (bestätigt)", cent: bestaetigt.filter(e => e.kind === "income").reduce((a, e) => a + cent(e.amount), 0) },
    { quelle: "Einnahmequellen", cent: eq ? eq.reduce((a, q) => a + (q.einnahmen_cent || 0), 0) : undefined },
  ]);
  const kosten = summe([
    { quelle: "Werknetz24 (bezahlte Ausgaben)", cent: w24d?.finanzen?.bezahlteAusgabenSummeCent },
    { quelle: "Master-Buchungen (bestätigt)", cent: bestaetigt.filter(e => e.kind === "expense").reduce((a, e) => a + cent(e.amount), 0) },
    { quelle: "Einnahmequellen", cent: eq ? eq.reduce((a, q) => a + (q.kosten_cent || 0), 0) : undefined },
  ]);
  const gewinn = { cent: einnahmen.cent - kosten.cent, vollstaendig: einnahmen.vollstaendig && kosten.vollstaendig, rechenweg: [`Einnahmen ${eur(einnahmen.cent)} − Kosten ${eur(kosten.cent)}`] };
  if (offenGebucht) gewinn.rechenweg.push(`${offenGebucht} Buchung(en) noch „ausstehend“ – nicht mitgezählt`);

  const rot = systems.filter(s => s.status === "🔴");
  const w24Inc = w24d?.technischeProbleme?.offeneIncidents;
  const offeneTasks = tasks.filter(t => t.status !== "Erledigt");
  const blockiert = offeneTasks.filter(t => t.status === "Blockiert");

  const warnungen = [];
  for (const s of rot) warnungen.push({ stufe: "rot", text: `${s.name}: ${s.note || "kritisch"}`, ziel: "alerts" });
  if (w24d?.systemStatus?.counts?.rot) warnungen.push({ stufe: "rot", text: `Werknetz24: ${w24d.systemStatus.counts.rot} System(e) rot, ${w24Inc || 0} offene Störung(en)`, ziel: "/werknetz24" });
  for (const t of blockiert) warnungen.push({ stufe: "gelb", text: `Aufgabe blockiert: ${t.title}`, ziel: "tasks" });
  if (qualityGate && !qualityGate.productionReady) warnungen.push({ stufe: "gelb", text: "Zahlungen gesperrt (Quality Gate) – gewollt, solange E-Commerce pausiert ist", ziel: "alerts" });
  if (!w24?.ok) warnungen.push({ stufe: "gelb", text: "Werknetz24-Live-Daten nicht verfügbar – Zahlen unvollständig", ziel: "/werknetz24" });
  if (!eq) warnungen.push({ stufe: "gelb", text: "Einnahmequellen nicht geladen (Anmeldung?) – Zahlen unvollständig", ziel: "einnahmequellen" });
  if (w24d && typeof w24d.finanzen?.bezahlteAusgabenSummeCent !== "number") warnungen.push({ stufe: "gelb", text: "Werknetz24 liefert noch keine bezahlten Ausgaben – Kosten/Gewinn unvollständig", ziel: "finance" });

  const gelb = systems.filter(s => s.status === "🟡").length;
  const systemAmpel = rot.length || w24d?.systemStatus?.gesamtstatus === "rot" ? "🔴" : gelb || w24d?.systemStatus?.gesamtstatus === "gelb" ? "🟡" : systems.length ? "🟢" : "⚪";

  return {
    system: { ampel: systemAmpel, rechenweg: [`Master-Systeme: ${systems.length - rot.length - gelb} ok, ${gelb} gelb, ${rot.length} rot`, w24d ? `Werknetz24: ${w24d.systemStatus.counts.gruen} grün, ${w24d.systemStatus.counts.rot} rot` : "Werknetz24: nicht verfügbar"] },
    projekteAktiv: { wert: aktiveBereiche.length + aktiveEq.length, rechenweg: [...aktiveBereiche.map(b => b.name), ...aktiveEq.map(q => q.name + " (Einnahmequelle)")] },
    projektePausiert: { wert: pausierteBereiche.length + pausierteEq.length, rechenweg: [...pausierteBereiche.map(b => b.name), ...pausierteEq.map(q => q.name + " (Einnahmequelle)")] },
    fehler: { wert: rot.length + (w24Inc || 0), vollstaendig: typeof w24Inc === "number", rechenweg: [`Master-Systeme rot: ${rot.length}`, `Werknetz24 offene Störungen: ${typeof w24Inc === "number" ? w24Inc : "nicht verfügbar"}`] },
    aufgaben: { wert: tasksLocked ? null : offeneTasks.length + (w24d?.aufgaben?.offen || 0), vollstaendig: !tasksLocked && Boolean(w24d), rechenweg: [`Master-Zentrale: ${tasksLocked ? "Anmeldung nötig" : offeneTasks.length}`, `Werknetz24: ${w24d ? w24d.aufgaben.offen : "nicht verfügbar"}`] },
    automationen: { wert: null, rechenweg: ["Noch keine zentrale Erfassung laufender Automationen – kommt mit dem Bereich „Automatisierungen“"] },
    einnahmen, kosten, gewinn,
    kunden: { wert: (w24d?.kunden?.gesamt || 0) + (ecKunden?.length || 0), vollstaendig: Boolean(w24d) && Array.isArray(ecKunden), rechenweg: [`Werknetz24: ${w24d ? w24d.kunden.gesamt : "nicht verfügbar"}`, `E-Commerce: ${Array.isArray(ecKunden) ? ecKunden.length : "nicht verfügbar"}`] },
    leads: { wert: w24d?.leads?.gesamt ?? null, vollstaendig: Boolean(w24d), rechenweg: [`Werknetz24: ${w24d ? w24d.leads.gesamt + " (" + Object.entries(w24d.leads.nachStatus || {}).map(([k, v]) => v + " " + k).join(", ") + ")" : "nicht verfügbar"}`, "E-Commerce: keine Leads (nur Kunden/Bestellungen)"] },
    warnungen,
  };
}
