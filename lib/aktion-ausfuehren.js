// Fuehrt 🟢-Aktionen der Master-Zentrale wirklich aus und protokolliert JEDEN Versuch im
// Automatisierungs-Log (Audit-Log, action "automation.lauf"): Zeit, Agent, Bereich, Aktion, Ergebnis,
// Fehler, Kosten (immer 0 - kostenpflichtige Aktionen laufen hier nie), Quelle. Keine versteckten Aktionen.
import { findeAktion, pruefeAusfuehrung } from "./aktionen.js";
import { writeAudit, listAudit } from "./audit.js";
import { listSystems } from "./master-systems.js";
import { runStaticQualityGate } from "./quality-gate.js";
import { fetchWerknetz24Status, runWerknetz24Systemcheck } from "./werknetz24-connector.js";
import { listTasks } from "./master-tasks.js";
import { listFinance } from "./master-finance.js";
import { listEinnahmequellen } from "./einnahmequellen.js";
import { erstelleTagesbericht, istLauf } from "./tagesbericht.js";

const REPOS = ["adnan-51-bit/adnan", "adnan-51-bit/werknetz24-landing"];
async function github(pfad, fetchImpl) {
  const r = await fetchImpl("https://api.github.com/repos/" + pfad, { headers: { accept: "application/vnd.github+json", "user-agent": "master-zentrale" }, cache: "no-store" });
  if (!r.ok) throw new Error("GitHub HTTP " + r.status);
  return r.json();
}

export async function ladeTagesbericht({ jetzt = new Date() } = {}) {
  const [audit, tasks, finance, eq, w24, sys] = await Promise.all([
    listAudit(200), listTasks(), listFinance().catch(() => []), listEinnahmequellen().catch(() => []), fetchWerknetz24Status().catch(() => null), listSystems().then(s => s.systems).catch(() => []),
  ]);
  return erstelleTagesbericht({ jetzt, audit, tasks, finance, einnahmequellen: eq, w24: w24?.ok ? w24.data : null, systems: sys });
}

const AUSFUEHRER = {
  async systempruefung() { const { systems } = await listSystems(); const rot = systems.filter(s => s.status === "🔴"); return { ok: true, zusammenfassung: `${systems.length} Systeme geprüft, ${rot.length} rot` + (rot.length ? ": " + rot.map(s => s.name).join(", ") : "") }; },
  async "werknetz24-systempruefung"() { const r = await runWerknetz24Systemcheck(); if (!r.configured) return { ok: false, fehler: r.reason }; if (!r.ok) return { ok: false, fehler: r.error }; return { ok: true, zusammenfassung: `${r.data?.geprueft ?? "?"} geprüft, ${r.data?.neueIncidents || 0} neue Störungen` }; },
  async "test-status"(f) {
    const teile = []; let allesOk = true;
    for (const repo of REPOS) { const d = await github(repo + "/actions/runs?per_page=1&branch=main", f); const run = d.workflow_runs?.[0]; if (!run) { teile.push(repo.split("/")[1] + ": kein Lauf"); continue; } const ok = run.conclusion === "success"; if (run.status === "completed" && !ok) allesOk = false; teile.push(`${repo.split("/")[1]}: ${run.status === "completed" ? (ok ? "✓ bestanden" : "✗ " + run.conclusion) : "läuft"} (${run.display_title?.slice(0, 50)})`); }
    return allesOk ? { ok: true, zusammenfassung: teile.join(" · ") } : { ok: false, fehler: teile.join(" · ") };
  },
  async "git-status"(f) { const teile = []; for (const repo of REPOS) { const c = (await github(repo + "/commits?per_page=1&sha=main", f))[0]; teile.push(`${repo.split("/")[1]}: ${c.sha.slice(0, 7)} ${c.commit.message.split("\n")[0].slice(0, 50)}`); } return { ok: true, zusammenfassung: teile.join(" · ") }; },
  async "quality-gate"() { const { storage, systems } = await listSystems(); const g = runStaticQualityGate({ storage, systems }); return { ok: true, zusammenfassung: g.productionReady ? "Produktion freigegeben" : "Zahlungen/Verkauf gesperrt: " + (g.blocking || []).map(b => b.id || b).join(", ") }; },
  async tagesbericht() { const b = await ladeTagesbericht(); return { ok: true, zusammenfassung: `${b.heuteErledigt.length} erledigt, ${b.fehler.length} Fehler, ${b.benutzeraktionen.length} Benutzeraktionen` }; },
};

export async function fuehreAktionAus(id, freigabe, { fetchImpl = fetch } = {}) {
  const pruefung = pruefeAusfuehrung(id, freigabe);
  const a = findeAktion(id);
  if (!pruefung.erlaubt) {
    // Auch abgelehnte Versuche fuer Geld-/Verbots-Aktionen protokollieren - nichts passiert heimlich.
    if (a) await protokolliere(a, { ok: false, fehler: pruefung.fehler, abgelehnt: true });
    return pruefung;
  }
  let ergebnis;
  try { ergebnis = await AUSFUEHRER[id](fetchImpl); } catch (e) { ergebnis = { ok: false, fehler: e.message }; }
  await protokolliere(a, ergebnis);
  return { erlaubt: true, status: 200, ...ergebnis };
}

async function protokolliere(a, erg) {
  await writeAudit({ actor: "automation", action: "automation.lauf", entityType: "aktion", entityId: a.id, details: {
    aktion: a.id, name: a.name, agent: a.agent || "—", bereich: a.bereich, kategorie: a.kategorie,
    ergebnis: erg.ok ? "ok" : erg.abgelehnt ? "abgelehnt" : "fehler", zusammenfassung: erg.zusammenfassung || null, fehler: erg.fehler || null,
    kosten_cent: 0, quelle: a.quelle || null,
  } });
}

export async function listeLaeufe(limit = 100) { return (await listAudit(200)).filter(istLauf).slice(0, limit); }
