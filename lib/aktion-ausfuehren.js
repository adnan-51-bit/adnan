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
import { eqReport, faelligkeit } from "./eq-automation.js";
import { listFreigaben } from "./freigaben.js";
import { listLeads } from "./leads.js";

const REPOS = ["adnan-51-bit/adnan", "adnan-51-bit/werknetz24-landing"];
// werknetz24-landing ist privat: ohne GITHUB_TOKEN (optional, nur Lesezugriff) antwortet GitHub 404.
// Das wird ehrlich als "nicht prüfbar (privat)" gemeldet statt als Erfolg oder als Absturz der ganzen Prüfung.
async function github(pfad, fetchImpl) {
  const headers = { accept: "application/vnd.github+json", "user-agent": "master-zentrale", ...(process.env.GITHUB_TOKEN ? { authorization: "Bearer " + process.env.GITHUB_TOKEN } : {}) };
  const r = await fetchImpl("https://api.github.com/repos/" + pfad, { headers, cache: "no-store" });
  if (r.status === 404 && !process.env.GITHUB_TOKEN) return null;
  if (!r.ok) throw new Error("GitHub HTTP " + r.status);
  return r.json();
}
const NICHT_PRUEFBAR = "nicht prüfbar (privat, kein Lese-Token)";

export async function ladeOptimierung({ jetzt = new Date() } = {}) {
  const { optimierung } = await import("./optimierung.js");
  const { listLeads } = await import("./leads.js");
  const [eqs, leads, tasks, finance] = await Promise.all([listEinnahmequellen(), listLeads(), listTasks(), listFinance().catch(() => [])]);
  return optimierung({ eqs, leads, tasks, finance, jetzt });
}

export async function ladeTagesbericht({ jetzt = new Date() } = {}) {
  const [audit, tasks, finance, eq, w24, sys, freigaben, leads] = await Promise.all([
    listAudit(200), listTasks(), listFinance().catch(() => []), listEinnahmequellen().catch(() => []), fetchWerknetz24Status().catch(() => null), listSystems().then(s => s.systems).catch(() => []), listFreigaben().catch(() => []), listLeads().catch(() => []),
  ]);
  // Naechste Pilot-Aktion (Google-Profil) - nur wenn die Pilot-Einnahmequelle existiert.
  const pilotEqRow = (eq || []).find(q => q.kategorie === "C");
  const { naechstePilotAktion } = await import("./google-profil.js");
  const pilotAktion = pilotEqRow ? naechstePilotAktion((leads || []).filter(l => l.einnahmequelle_id === pilotEqRow.id)) : null;
  const opt = await ladeOptimierung({ jetzt }).catch(() => null);
  const { ersteEinnahmeCheckliste } = await import("./erste-einnahme.js");
  const ersteEinnahme = pilotEqRow ? ersteEinnahmeCheckliste({ eq: pilotEqRow, leads, tasks, finance, freigaben }) : null;
  const { listBusinesses } = await import("./master-store.js");
  const { pausierteBereichIds } = await import("./gesamtstatus.js");
  const pausiert = pausierteBereichIds(await listBusinesses().catch(() => []));
  return erstelleTagesbericht({ jetzt, audit, tasks, finance, einnahmequellen: eq, w24: w24?.ok ? w24.data : null, systems: sys, freigaben, leads, pilotAktion, optimierung: opt, ersteEinnahme, pausiert });
}

const AUSFUEHRER = {
  async systempruefung() { const { systems } = await listSystems(); const rot = systems.filter(s => s.status === "🔴"); return { ok: true, zusammenfassung: `${systems.length} Systeme geprüft, ${rot.length} rot` + (rot.length ? ": " + rot.map(s => s.name).join(", ") : "") }; },
  async "werknetz24-systempruefung"() { const r = await runWerknetz24Systemcheck(); if (!r.configured) return { ok: false, fehler: r.reason }; if (!r.ok) return { ok: false, fehler: r.error }; return { ok: true, zusammenfassung: `${r.data?.geprueft ?? "?"} geprüft, ${r.data?.neueIncidents || 0} neue Störungen` }; },
  async "test-status"(f) {
    const teile = []; let allesOk = true;
    for (const repo of REPOS) { const d = await github(repo + "/actions/runs?per_page=1&branch=main", f); if (!d) { teile.push(repo.split("/")[1] + ": " + NICHT_PRUEFBAR); continue; } const run = d.workflow_runs?.[0]; if (!run) { teile.push(repo.split("/")[1] + ": kein Lauf"); continue; } const ok = run.conclusion === "success"; if (run.status === "completed" && !ok) allesOk = false; teile.push(`${repo.split("/")[1]}: ${run.status === "completed" ? (ok ? "✓ bestanden" : "✗ " + run.conclusion) : "läuft"} (${run.display_title?.slice(0, 50)})`); }
    return allesOk ? { ok: true, zusammenfassung: teile.join(" · ") } : { ok: false, fehler: teile.join(" · ") };
  },
  async "git-status"(f) { const teile = []; for (const repo of REPOS) { const d = await github(repo + "/commits?per_page=1&sha=main", f); if (!d) { teile.push(repo.split("/")[1] + ": " + NICHT_PRUEFBAR); continue; } const c = d[0]; teile.push(`${repo.split("/")[1]}: ${c.sha.slice(0, 7)} ${c.commit.message.split("\n")[0].slice(0, 50)}`); } return { ok: true, zusammenfassung: teile.join(" · ") }; },
  async "quality-gate"() { const { storage, systems } = await listSystems(); const g = runStaticQualityGate({ storage, systems }); return { ok: true, zusammenfassung: g.productionReady ? "Produktion freigegeben" : "Zahlungen/Verkauf gesperrt: " + (g.blocking || []).map(b => b.id || b).join(", ") }; },
  // Nur eindeutig tote Links (404/410, Domain existiert nicht) sind ein Befund. Viele Seiten sperren Serverabrufe
  // (401/403/429), antworten Rechenzentren langsam oder mit 5xx - das heisst NICHT, dass der Link kaputt ist
  // (live 27.09.2026: gesetze-im-internet.de Zeitueberschreitung, lokalbesucher.de 403, im Browser beide 200).
  async "quellen-pruefung"(f) {
    const eqs = await listEinnahmequellen();
    const urls = [...new Map(eqs.flatMap(q => (Array.isArray(q.quellen_liste) ? q.quellen_liste : []).map(x => [x.url, q.name]))).entries()];
    if (!urls.length) return { ok: true, zusammenfassung: "Keine gespeicherten Quellen." };
    const kaputt = [], unklar = [];
    for (const [url, eq] of urls) {
      try {
        const r = await f(url, { method: "GET", redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (Master-Zentrale Quellen-Pruefung)" }, signal: AbortSignal.timeout(15000) });
        if (r.status === 404 || r.status === 410) kaputt.push(`${eq}: ${url} (HTTP ${r.status})`);
        else if (r.status >= 400) unklar.push(`${url} (HTTP ${r.status})`);
      } catch (e) {
        if (e?.cause?.code === "ENOTFOUND") kaputt.push(`${eq}: ${url} (Domain existiert nicht)`);
        else unklar.push(`${url} (${e.name === "TimeoutError" ? "Zeitüberschreitung" : "keine Antwort"})`);
      }
    }
    const zusatz = unklar.length ? ` · ${unklar.length} nicht automatisch prüfbar (Seite sperrt/verzögert Serverabrufe – im Browser prüfen): ${unklar.join(", ")}` : "";
    const erreichbar = urls.length - kaputt.length - unklar.length;
    return kaputt.length ? { ok: false, fehler: `${kaputt.length} von ${urls.length} Quellen tot: ${kaputt.join(" · ")}${zusatz}` } : { ok: true, zusammenfassung: `${erreichbar} von ${urls.length} Quellen erreichbar, keine toten Links${zusatz}` };
  },
  async faelligkeit() { const ue = faelligkeit(await listTasks()); return { ok: true, zusammenfassung: ue.length ? `${ue.length} überfällig: ${ue.map(t => t.title).join(", ")}` : "Keine überfällige Aufgabe" }; },
  async "eq-report"() { const r = eqReport(await listEinnahmequellen(), await listTasks()); return { ok: true, zusammenfassung: r.text.split("\n").slice(1, 4).join(" · "), bericht: r.text }; },
  async "wiederkehrende-pruefungen"(f) {
    const teile = [];
    for (const id of ["systempruefung", "quellen-pruefung", "faelligkeit", "pilot-monatslauf", "optimierung", "engine", "eq-report", "tagesbericht"]) { const r = await fuehreAktionAus(id, undefined, { fetchImpl: f }); teile.push(`${id}: ${r.ok ? "ok" : "Fehler"}`); }
    const fehler = teile.filter(x => x.endsWith("Fehler")).length;
    return { ok: true, zusammenfassung: `${teile.length} Prüfungen gelaufen, ${fehler} mit Befund – ${teile.join(" · ")}` };
  },
  async "pilot-monatslauf"() { const { monatsLauf } = await import("./pilot.js"); const r = await monatsLauf(); return { ok: true, zusammenfassung: r.neu ? `${r.neu} Vertrag/Verträge: Monatsaufgaben + offene Rechnung für ${r.periode} angelegt` : `Keine neuen Monatsleistungen für ${r.periode}` }; },
  async engine() {
    const { pipelineAufgabe } = await import("./eq-pipeline.js");
    const { listLeads } = await import("./leads.js");
    const { listContent } = await import("./content.js");
    const { createTask } = await import("./master-tasks.js");
    const [eqs, leads, content, finance, tasks, freigaben, opt] = await Promise.all([listEinnahmequellen(), listLeads(), listContent().catch(() => []), listFinance().catch(() => []), listTasks(), listFreigaben().catch(() => []), ladeOptimierung()]);
    const ziele = eqs.filter(q => opt.fokus === null ? opt.ersteEinnahme : q.id === opt.fokus);
    const neu = [];
    for (const q of ziele) { const a = pipelineAufgabe(q, { leads, content, finance, tasks, freigaben }); if (a) { await createTask(a); neu.push(a.title.replace(/^\[Engine\] /, "")); } }
    return { ok: true, zusammenfassung: neu.length ? `${neu.length} Aufgabe(n) angelegt: ${neu.join(" · ")}` : `Keine neue Aufgabe nötig (${ziele.map(q => q.name.slice(0, 30)).join(", ") || "keine Fokus-Einnahmequelle"}: nächster Schritt liegt schon als Aufgabe oder Entscheidung vor)` };
  },
  async optimierung() {
    const o = await ladeOptimierung();
    const { freigabeAnfordern, listFreigaben } = await import("./freigaben.js");
    const alle = await listFreigaben();
    for (const a of o.auswertung.filter(x => x.pausenVorschlag)) if (!alle.some(f => f.bezug_typ === "eq-pausieren" && f.bezug_id === a.id && f.status === "OFFEN"))
      await freigabeAnfordern({ art: "ENTSCHEIDUNG", titel: `Einnahmequelle „${a.name}“ pausieren?`, beschreibung: `Seit ${a.ruhe_tage} Tagen keine Aktivität, keine Einnahmen. Befunde: ${a.befunde.join(", ") || "—"}. Alternative: verbessern.`, bereich: "einnahmequellen", bezug_typ: "eq-pausieren", bezug_id: a.id });
    return { ok: true, zusammenfassung: o.auswertung.map(a => a.name.slice(0, 30) + ": " + a.zustand).join(" · ") + " – " + o.empfehlung };
  },
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
