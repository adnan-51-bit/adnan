"use client";

// Fehlerzentrale, Agenten-Zentrale und Werknetz24-Systemwächter der Master-Zentrale
// (Full-System-Audit Phase 2, 26.09.2026). Eigene Datei, damit app/master/page.jsx nicht weiter
// wächst. Grundregeln:
// - Jeder Eintrag stammt aus einer echten API-Antwort; wo nichts protokolliert ist, steht das so da.
// - Jeder Eintrag trägt seinen Geschäftsbereich (business_id werknetz24 / ecommerce / master) -
//   nichts wird zusammengemischt, die Bereiche sind nur nebeneinander sichtbar.
// - "🟢 behoben" erscheint NUR, wenn die letzte echte Prüfung grün ist; abschließen kann man einen
//   Werknetz24-Incident nur dann (Werknetz24 selbst verweigert es sonst mit 409).
// - Buttons nur für real existierende Aktionen. Wo eine Reparatur Adnans Handgriff braucht
//   (Secret, Login, Konto), steht die konkrete Anleitung statt eines Schein-Buttons.

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "../../lib/admin-fetch.js";

const W24_ADMIN = "https://werknetz24.de/admin-zentrale";
const VERCEL_LOGS = "https://vercel.com/adnan-adobot/adnan/logs";
const W24_VERCEL_LOGS = "https://vercel.com/adnan-adobot/werkbot24-landing/logs";
const AMPEL = { gruen: "🟢", gelb: "🟡", rot: "🔴", grau: "⚪" };
const BEREICH = { werknetz24: "Werknetz24", ecommerce: "E-Commerce", master: "Master-Zentrale" };

function fmt(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d) ? String(iso) : d.toLocaleString("de-DE");
}

async function readJson(response) {
  return response.json().catch(() => null);
}

// Lädt die Werknetz24-Incidents inkl. aktuellem Prüfzustand (auch für die Systeme-Ansicht genutzt).
export function useWerknetz24Incidents() {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const reload = useCallback(async () => {
    setState(s => ({ ...s, loading: true }));
    try {
      const r = await adminFetch("/api/master/businesses?werknetz24Incidents=1");
      const d = await readJson(r);
      if (!r.ok) return setState({ loading: false, data: null, error: d?.error || "HTTP " + r.status });
      const inc = d?.incidents;
      if (!inc?.configured) return setState({ loading: false, data: null, error: inc?.reason || "Werknetz24-Verbindung nicht konfiguriert" });
      if (!inc.ok) return setState({ loading: false, data: null, error: inc.error });
      setState({ loading: false, data: inc.data || inc, error: null });
    } catch (e) {
      setState({ loading: false, data: null, error: e.message });
    }
  }, []);
  useEffect(() => { reload(); }, [reload]);
  return { ...state, reload };
}

export function Fehlerzentrale({ systems, tasks, qualityGate, onReloadSystems, goTo }) {
  const w24 = useWerknetz24Incidents();
  const [ecomApi, setEcomApi] = useState(null);
  const [busy, setBusy] = useState("");
  const [meldung, setMeldung] = useState("");
  const [filter, setFilter] = useState("alle");

  const pruefeEcommerceApi = useCallback(async () => {
    const pfade = ["/api/orders?type=products", "/api/orders?type=orders", "/api/providers", "/api/automation"];
    const ergebnisse = await Promise.all(pfade.map(async p => {
      try { const r = await fetch(p, { cache: "no-store" }); return { pfad: p, status: r.status, ok: r.ok }; }
      catch (e) { return { pfad: p, status: 0, ok: false, fehler: e.message }; }
    }));
    setEcomApi({ geprueft: new Date().toISOString(), ergebnisse });
  }, []);
  useEffect(() => { pruefeEcommerceApi(); }, [pruefeEcommerceApi]);

  async function systemcheck() {
    setBusy("systemcheck"); setMeldung("");
    try {
      const r = await adminFetch("/api/master/businesses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "werknetz24-systemcheck" }) });
      const d = await readJson(r);
      if (!r.ok) setMeldung("Werknetz24-Prüfung nicht ausgeführt: " + (d?.error || "HTTP " + r.status));
      else setMeldung(`Werknetz24-Prüfung ausgeführt (${fmt(d.geprueft)}): ${d.systeme?.length || 0} Systeme geprüft, ${d.neueIncidents || 0} neue Incidents.`);
      await w24.reload();
    } finally { setBusy(""); }
  }

  async function abschliessen(incident) {
    setBusy(incident.id); setMeldung("");
    try {
      const r = await adminFetch("/api/master/businesses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "werknetz24-incident-abschliessen", incidentId: incident.id }) });
      const d = await readJson(r);
      if (r.status === 409) setMeldung(`Nicht abgeschlossen: ${incident.system} ist laut letzter Prüfung weiterhin ${AMPEL[d?.aktueller_status] || "nicht grün"}.`);
      else if (!r.ok) setMeldung("Abschluss fehlgeschlagen: " + (d?.error || "HTTP " + r.status));
      else setMeldung(`🟢 ${incident.system}: als behoben abgeschlossen (Nachweis: ${d.abschluss?.nachweis || "Systemwächter-Prüfung grün"}).`);
      await w24.reload();
    } finally { setBusy(""); }
  }

  const fehler = [];
  // Werknetz24: Systemwächter-Incidents (echt, live aus Werknetz24)
  if (w24.error) {
    fehler.push({ key: "w24-verbindung", severity: "🔴", business_id: "werknetz24", bereich: "Verbindung", titel: "Werknetz24 nicht abrufbar", fehler: w24.error, open: "/werknetz24", logs: W24_VERCEL_LOGS, repair: { kind: "reload", label: "Erneut laden", run: w24.reload } });
  }
  for (const i of w24.data?.incidents || []) {
    const behoben = i.aktueller_status === "gruen";
    fehler.push({
      key: "w24-" + (i.id || i.system), severity: behoben ? "🟢" : (i.prioritaet === "Kritisch" || i.prioritaet === "Hoch" ? "🔴" : "🟡"),
      business_id: "werknetz24", bereich: "Systemwächter", titel: i.system || "unbekanntes System",
      fehler: i.fehlermeldung || "Keine Fehlermeldung protokolliert",
      detail: `Priorität ${i.prioritaet || "—"} · seit ${fmt(i.erste_erkennung)} · ${i.wiederholungen || 1}× erkannt · aktuelle Prüfung: ${AMPEL[i.aktueller_status] || "—"} (${fmt(i.aktuell_geprueft)})`,
      behoben, open: W24_ADMIN + "#fehler", logs: W24_ADMIN + "#fehler",
      repair: behoben
        ? { kind: "abschliessen", label: "Als behoben abschließen", run: () => abschliessen(i), busyKey: i.id }
        : { kind: "systemcheck", label: "Prüfung erneut ausführen", run: systemcheck, busyKey: "systemcheck" },
    });
  }
  // Master-Zentrale: Systeme mit 🔴/🟡 (automatische Checks laufen bei jedem Laden neu)
  for (const s of systems.filter(s => s.status === "🔴" || s.status === "🟡")) {
    const biz = ["stripe", "shopify", "paypal"].includes(s.id) ? "ecommerce" : ["famulor", "easybell"].includes(s.id) ? "werknetz24" : "master";
    fehler.push({
      key: "sys-" + s.id, severity: s.status, business_id: biz, bereich: "System", titel: s.name,
      fehler: s.note || "—", detail: `Quelle: ${s.source === "auto" ? "automatische Prüfung" : "manuell gepflegt"} · geprüft ${fmt(s.last_checked_at)}`,
      open: null, openTab: "systems", logs: VERCEL_LOGS,
      repair: s.source === "auto"
        ? { kind: "recheck", label: "Erneut prüfen", run: onReloadSystems }
        : { kind: "manual", label: "Manuelle Aktion nötig", text: s.next_action },
    });
  }
  // E-Commerce: eigene API (echte HTTP-Prüfung aus dem Browser)
  for (const e of (ecomApi?.ergebnisse || []).filter(e => !e.ok)) {
    fehler.push({ key: "ecom-" + e.pfad, severity: "🔴", business_id: "ecommerce", bereich: "E-Commerce API", titel: e.pfad, fehler: e.fehler || "HTTP " + e.status, open: "/e-commerce?tab=systeme", logs: VERCEL_LOGS, repair: { kind: "recheck", label: "Erneut prüfen", run: pruefeEcommerceApi } });
  }
  // E-Commerce: Quality-Gate-Blocker
  for (const c of (qualityGate?.checks || []).filter(c => c.status === "blocked" || c.status === "fail" || c.status === "warning")) {
    fehler.push({ key: "qg-" + c.id, severity: c.status === "warning" ? "🟡" : "🔴", business_id: "ecommerce", bereich: "Quality Gate", titel: c.id, fehler: c.message, open: "/e-commerce?tab=quality-gate", logs: null, repair: { kind: "manual", label: "Manuelle Aktion nötig", text: c.id === "persistence" ? "Supabase-Konto anlegen und SUPABASE_URL/SUPABASE_SECRET_KEY setzen (Adnans Entscheidung)" : c.id === "payments" ? "Zahlungen bleiben bis zur sicheren Stripe-Integration bewusst gesperrt" : "Siehe Quality Gate" } });
  }
  // Aufgaben: blockiert
  for (const t of tasks.filter(t => t.status === "Blockiert")) {
    fehler.push({ key: "task-" + t.id, severity: "🔴", business_id: t.business_id || "master", bereich: "Aufgabe", titel: t.title, fehler: "Aufgabe blockiert · " + (t.area || ""), open: null, openTab: "tasks", logs: null, repair: { kind: "manual", label: "In Aufgaben bearbeiten", text: "Blockade in der Aufgabe auflösen" } });
  }

  const reihenfolge = { "🔴": 0, "🟡": 1, "🟢": 2 };
  const sichtbar = fehler.filter(f => filter === "alle" || f.business_id === filter).sort((a, b) => reihenfolge[a.severity] - reihenfolge[b.severity]);
  const zaehler = { rot: fehler.filter(f => f.severity === "🔴").length, gelb: fehler.filter(f => f.severity === "🟡").length, gruen: fehler.filter(f => f.severity === "🟢").length };

  return <>
    <div className="pageTitle"><div><span>ATTENTION CENTER</span><h2>Fehlerzentrale</h2></div>
      <div className="quick">
        <select className="search" value={filter} onChange={e => setFilter(e.target.value)}><option value="alle">Alle Bereiche</option><option value="werknetz24">Werknetz24</option><option value="ecommerce">E-Commerce</option><option value="master">Master-Zentrale</option></select>
        <button className="ccBtn dark" disabled={busy === "systemcheck"} onClick={systemcheck}>{busy === "systemcheck" ? "Prüft…" : "Werknetz24 jetzt prüfen"}</button>
      </div>
    </div>
    <div className="kpis"><div className="kpi"><span>Kritisch</span><strong>{zaehler.rot}</strong><small>🔴 offen</small></div><div className="kpi"><span>Warnungen</span><strong>{zaehler.gelb}</strong><small>🟡 beobachten</small></div><div className="kpi"><span>Technisch behoben</span><strong>{zaehler.gruen}</strong><small>🟢 Prüfung grün, Abschluss offen</small></div><div className="kpi"><span>Werknetz24-Daten</span><strong>{w24.loading ? "…" : w24.error ? "—" : "live"}</strong><small>{w24.data?.abgerufen_am ? "abgerufen " + fmt(w24.data.abgerufen_am) : "Systemwächter"}</small></div></div>
    {meldung && <div className="ccNotice">{meldung}</div>}
    <section className="panel">
      {sichtbar.length === 0 ? <p>{w24.loading ? "Fehler werden geladen…" : "Keine offenen Fehler in diesem Bereich."}</p> : sichtbar.map(f => <article className={"ccRow sev" + (f.severity === "🔴" ? "Rot" : f.severity === "🟡" ? "Gelb" : "Gruen")} key={f.key}>
        <div className="ccMain">
          <span className="ccMeta">{f.severity} {BEREICH[f.business_id] || f.business_id} · {f.bereich}{f.behoben ? " · technisch behoben" : ""}</span>
          <strong>{f.titel}</strong>
          <p>{f.fehler}</p>
          {f.detail && <small>{f.detail}</small>}
          {f.repair.kind === "manual" && f.repair.text && <small className="ccHint">Nächster Schritt: {f.repair.text}</small>}
        </div>
        <div className="ccActions">
          {f.open ? <a className="ccBtn" href={f.open} target={f.open.startsWith("http") ? "_blank" : undefined} rel="noreferrer">Öffnen</a> : f.openTab ? <button className="ccBtn" onClick={() => goTo(f.openTab)}>Öffnen</button> : null}
          {f.logs && <a className="ccBtn" href={f.logs} target="_blank" rel="noreferrer">Logs</a>}
          {f.repair.run && <button className="ccBtn dark" disabled={busy && busy === f.repair.busyKey} onClick={f.repair.run}>{busy && busy === f.repair.busyKey ? "Läuft…" : f.repair.label}</button>}
        </div>
      </article>)}
    </section>
    <section className="panel"><h3>So funktioniert „Reparieren“</h3><p>„Prüfung erneut ausführen“ startet den echten Werknetz24-Systemwächter. Ist das betroffene System danach grün, erscheint 🟢 und der Fehler kann mit automatischem Nachweis abgeschlossen werden – vorher verweigert Werknetz24 den Abschluss. „Erneut prüfen“ wiederholt die automatischen Master-Checks. Wo eine Reparatur ein Konto, Login oder Secret braucht, steht die konkrete Anleitung statt eines Buttons.</p></section>
    <CcStyles/>
  </>;
}

const STATUS_LABEL = { aktiv: "🟢 aktiv", gestoert: "🔴 gestört", nicht_bestaetigt: "🟡 nicht bestätigt", nicht_protokolliert: "⚪ nicht protokolliert", geruest: "⚪ Gerüst" };

export function AgentenZentrale({ systems, onReloadSystems }) {
  const [w24, setW24] = useState({ loading: true, agenten: [], error: null, abgerufen: null });
  const [automation, setAutomation] = useState(null);
  const [orders, setOrders] = useState(null);
  const [busy, setBusy] = useState(false);
  const [meldung, setMeldung] = useState("");

  const ladeW24 = useCallback(async () => {
    setW24(s => ({ ...s, loading: true }));
    try {
      const r = await adminFetch("/api/master/businesses?werknetz24Agenten=1");
      const d = await readJson(r);
      const a = d?.agenten;
      if (!r.ok) return setW24({ loading: false, agenten: [], error: d?.error || "HTTP " + r.status });
      if (!a?.configured) return setW24({ loading: false, agenten: [], error: a?.reason || "nicht konfiguriert" });
      if (!a.ok) return setW24({ loading: false, agenten: [], error: a.error });
      setW24({ loading: false, agenten: a.agenten || [], error: null, abgerufen: a.fetchedAt });
    } catch (e) { setW24({ loading: false, agenten: [], error: e.message }); }
  }, []);
  useEffect(() => {
    ladeW24();
    fetch("/api/automation").then(r => r.json()).then(setAutomation).catch(() => setAutomation(null));
    fetch("/api/orders").then(r => r.json()).then(setOrders).catch(() => setOrders(null));
  }, [ladeW24]);

  async function retrySystemwaechter() {
    setBusy(true); setMeldung("");
    try {
      const r = await adminFetch("/api/master/businesses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "werknetz24-systemcheck" }) });
      const d = await readJson(r);
      setMeldung(r.ok ? `Systemwächter-Prüfung ausgeführt (${fmt(d.geprueft)}), ${d.neueIncidents || 0} neue Incidents.` : "Retry nicht ausgeführt: " + (d?.error || "HTTP " + r.status));
      await ladeW24();
    } finally { setBusy(false); }
  }

  const masterMonitor = {
    id: "master-systemmonitor", name: "Master-Systemmonitor", business_id: "master",
    aufgabe: "Prüft bei jedem Aufruf von /api/master/systems GitHub-Status, Vercel und die Konfiguration von Supabase/Stripe/Shopify/E-Mail/Slack.",
    ausloeser: "Jeder Aufruf der Systeme-Ansicht", status: systems.some(s => s.source === "auto") ? "aktiv" : "nicht_protokolliert",
    betrieb: `${systems.filter(s => s.source === "auto").length} automatische Prüfungen`,
    letzter_lauf: systems.find(s => s.source === "auto")?.last_checked_at || null,
    letzter_erfolg: systems.find(s => s.source === "auto")?.last_checked_at || null,
    letzter_fehler: systems.filter(s => s.source === "auto" && s.status === "🔴").map(s => s.name + ": " + s.note).join(" · ") || null,
    tools: ["GitHub API", "Vercel"], skills: [], logs: VERCEL_LOGS,
    steuerung: { start: "OPEN", stop: "OPEN", pause: "OPEN", neustart: "OPEN", retry: "reload" },
  };
  const ecomEngine = {
    id: "ecommerce-automation", name: "E-Commerce Automation Engine", business_id: "ecommerce",
    aufgabe: "Bestell-Zustandsautomat (Zahlung → Prüfung → Lieferant → Tracking); stoppt ohne bestätigte Zahlung.",
    ausloeser: "Zahlungs-/Shop-Webhooks (Stripe/Shopify, beide noch nicht verbunden)",
    status: "geruest", betrieb: automation?.mode === "provider-independent-scaffold" ? "Gerüst ohne verbundene Anbieter – verarbeitet noch keine echten Bestellungen" : (automation?.mode || "unbekannt"),
    letzter_lauf: null, letzter_erfolg: null, letzter_fehler: null,
    zusatz: orders?.stats ? `${orders.stats.events} Ereignisse, ${orders.stats.orders} Bestellungen (Speicher: ${orders.stats.persistence})` : null,
    tools: ["Stripe (nicht verbunden)", "Shopify (nicht verbunden)"], skills: [], logs: VERCEL_LOGS,
    steuerung: { start: "OPEN", stop: "OPEN", pause: "OPEN", neustart: "OPEN", retry: "OPEN" },
  };

  const alle = [...w24.agenten, ecomEngine, masterMonitor];
  return <>
    <div className="pageTitle"><div><span>AGENT CONTROL</span><h2>Agenten-Zentrale</h2></div><div className="quick"><a className="ccBtn" href={W24_ADMIN + "#agenten"} target="_blank" rel="noreferrer">Werknetz24-Agentenseite ↗</a></div></div>
    {meldung && <div className="ccNotice">{meldung}</div>}
    {w24.error && <div className="ccNotice warn">Werknetz24-Agenten nicht geladen: {w24.error}</div>}
    <section className="panel">
      {w24.loading && <p>Agenten werden geladen…</p>}
      <div className="ccTableWrap"><table className="ccTable">
        <thead><tr><th>Agent</th><th>Bereich</th><th>Status / Betrieb</th><th>Letzter Lauf</th><th>Letzter Erfolg</th><th>Letzter Fehler</th><th>Tools</th><th>Steuerung</th><th>Logs</th></tr></thead>
        <tbody>{alle.map(a => <tr key={a.id}>
          <td><strong>{a.name}</strong><small>{a.aufgabe}</small><small>Auslöser: {a.ausloeser}</small>{a.zusatz && <small>{a.zusatz}</small>}</td>
          <td>{BEREICH[a.business_id] || a.business_id}</td>
          <td>{STATUS_LABEL[a.status] || a.status}<small>{a.betrieb}</small></td>
          <td>{a.letzter_lauf ? fmt(a.letzter_lauf) : <em>nicht protokolliert</em>}</td>
          <td>{a.letzter_erfolg ? fmt(a.letzter_erfolg) : <em>—</em>}</td>
          <td>{a.letzter_fehler || <em>keiner protokolliert</em>}</td>
          <td><small>{(a.tools || []).join(", ")}</small><small>Skills: {(a.skills || []).length ? a.skills.join(", ") : "keine"}</small></td>
          <td>
            {["start", "stop", "pause", "neustart"].map(k => <span className="ccOpen" key={k}>{k}: OPEN</span>)}
            {a.steuerung?.retry === "master-zentrale-systemcheck" ? <button className="ccBtn dark" disabled={busy} onClick={retrySystemwaechter}>{busy ? "Läuft…" : "Retry"}</button>
              : a.steuerung?.retry === "reload" ? <button className="ccBtn dark" onClick={onReloadSystems}>Retry</button>
              : <span className="ccOpen">retry: OPEN</span>}
          </td>
          <td>{a.logs ? <a className="ccBtn" href={a.logs.startsWith("http") ? a.logs : "https://werknetz24.de/" + a.logs} target="_blank" rel="noreferrer">Logs</a> : "—"}</td>
        </tr>)}</tbody>
      </table></div>
    </section>
    <section className="panel"><h3>Warum überall „OPEN“ bei Start/Stop/Pause?</h3><p>Keiner dieser Agenten ist ein dauerhaft laufender Prozess – sie werden von Anrufen, Webhooks oder dem täglichen Cron ausgelöst. Ein echtes Start/Stop/Pause gibt es technisch nicht; es wird deshalb nicht vorgetäuscht. Echt steuerbar ist „Retry“ beim Systemwächter (startet die Werknetz24-Prüfung) und beim Master-Systemmonitor (wiederholt die automatischen Checks).</p></section>
    <CcStyles/>
  </>;
}

// Werknetz24-Systemwächter-Zustände für die Systeme-Ansicht (live, nur lesend).
export function Werknetz24Systeme() {
  const w24 = useWerknetz24Incidents();
  const systeme = w24.data?.systeme || [];
  return <section className="panel">
    <div className="panelTitle"><h3>Werknetz24 · Systemwächter (live)</h3><a className="ccBtn" href={W24_ADMIN + "#systemstatus"} target="_blank" rel="noreferrer">Systemstatus in Werknetz24 ↗</a></div>
    {w24.loading ? <p>Lädt…</p> : w24.error ? <p>🟡 Nicht abrufbar: {w24.error}</p> : systeme.length === 0 ? <p>Keine Prüfergebnisse protokolliert.</p> :
      <div className="ccGrid">{systeme.sort((a, b) => (a.status === "rot" ? -1 : 1) - (b.status === "rot" ? -1 : 1)).map(s => <div className="ccSys" key={s.key}><b>{AMPEL[s.status] || "⚪"} {s.key}</b><small>geprüft {fmt(s.letzte_pruefung)}</small><small>zuletzt grün {fmt(s.letzte_erfolgreiche_pruefung)}{s.fehlerserie ? ` · Fehlerserie ${s.fehlerserie}` : ""}</small></div>)}</div>}
    <CcStyles/>
  </section>;
}

// Bewusst KEIN <style jsx>: styled-jsx vergibt fuer Styles aus einer Variablen die ID "undefined" -
// dieselbe wie die der Seite (app/master/page.jsx), und ueberspringt diese Styles dann als
// "bereits eingefuegt" (live gefunden: Klassen "jsx-undefined", Fehlerzentrale ungestaltet).
// Ein normales <style>-Element mit festem, statischem Inhalt umgeht das.
function CcStyles() { return <style dangerouslySetInnerHTML={{ __html: ccStyles }} />; }

const ccStyles = `
.ccRow{display:flex;gap:14px;justify-content:space-between;align-items:flex-start;padding:14px;border:1px solid #eaecf0;border-left-width:4px;border-radius:10px;margin-bottom:10px;background:#fff}
.ccRow.sevRot{border-left-color:#d92d20}.ccRow.sevGelb{border-left-color:#f79009}.ccRow.sevGruen{border-left-color:#12b76a}
.ccMain{flex:1;min-width:0}.ccMain strong{display:block;margin:4px 0 2px}.ccMain p{margin:0;color:#475467;font-size:13px;overflow-wrap:anywhere}.ccMain small{display:block;color:#667085;font-size:12px;margin-top:4px}
.ccMeta{font-size:10px;font-weight:700;color:#667085;text-transform:uppercase;letter-spacing:.05em}.ccHint{color:#93370d !important}
.ccActions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
.ccBtn{display:inline-block;border:1px solid #d0d5dd;background:#fff;color:#344054;border-radius:7px;padding:7px 10px;font:inherit;font-size:12px;text-decoration:none;cursor:pointer;white-space:nowrap}
.ccBtn.dark{background:#101828;color:#fff;border-color:#101828}.ccBtn:disabled{opacity:.6;cursor:wait}
.ccNotice{background:#ecfdf3;border:1px solid #abefc6;color:#067647;padding:10px 12px;border-radius:8px;margin:12px 0;font-size:12px}.ccNotice.warn{background:#fffaeb;border-color:#fedf89;color:#93370d}
.ccTableWrap{overflow-x:auto}.ccTable{width:100%;border-collapse:collapse;font-size:12px}.ccTable th{text-align:left;color:#667085;font-weight:600;padding:8px;border-bottom:1px solid #eaecf0;white-space:nowrap}
.ccTable td{vertical-align:top;padding:10px 8px;border-bottom:1px solid #f2f4f7;min-width:90px}.ccTable td small{display:block;color:#667085;margin-top:3px}.ccTable em{color:#98a2b3}
.ccOpen{display:block;font-size:10px;color:#98a2b3;margin-bottom:2px}
.ccGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.ccSys{border:1px solid #eaecf0;border-radius:10px;padding:12px}.ccSys small{display:block;color:#667085;font-size:12px;margin-top:4px}
@media(max-width:700px){.ccRow{flex-direction:column}.ccActions{justify-content:flex-start}.ccGrid{grid-template-columns:1fr}}
`;
