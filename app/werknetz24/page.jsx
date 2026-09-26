"use client";

// Eigenständige Werknetz24-Seite (22.09.2026, Adnans ausdrücklicher Wunsch "eigene Seite pro
// Betrieb, nichts vermischen" - vorher war ein Werknetz24-Kalender-Widget direkt in der
// gemeinsamen Master-Zentrale-Betriebsübersicht eingebettet, zusammen mit E-Commerce). Diese
// Seite zeigt AUSSCHLIESSLICH Werknetz24-Informationen, nie E-Commerce- oder andere
// Betriebs-Daten - spiegelt damit /e-commerce (bereits vorher eigenständig).
//
// Werknetz24 bleibt ein separates, bereits produktives System (adnan-51-bit/werknetz24-landing,
// eigenes Deployment, eigene Datenbank) - diese Seite dupliziert es NICHT, sondern zeigt nur das,
// was über die sichere, begrenzte Verbindung (lib/werknetz24-connector.js) tatsächlich verfügbar
// ist: Live-Status (read-only) und Kalender (lesen + Termin anlegen). Für alles andere (Lisa,
// Kunden, Leads, Rechnungen, Finanzen, Systeme) gibt es einen klaren, ehrlichen Link zur
// vollständigen, echten Verwaltung unter werknetz24.de/admin-zentrale - kein Vortäuschen von
// Funktionen, die hier nicht existieren.

import { useEffect, useState } from "react";
import { adminFetch } from "../../lib/admin-fetch.js";

const TABS = [
  ["overview", "◈", "Übersicht"],
  ["kalender", "📅", "Kalender"],
  ["aufgaben", "✓", "Aufgaben"],
  ["rechnungen", "€", "Rechnungen"],
  ["verbindung", "🔗", "Verbindung"],
];

const ADMIN_DEEP_LINKS = [
  ["fehler", "Fehlerzentrale"],
  ["systemstatus", "Systemstatus"],
  ["agenten", "Agenten"],
  ["lisa-nutzung", "Lisa / Telefonie"],
  ["kunden", "Kunden"],
  ["leads", "Leads"],
  ["buchhaltung", "Finanzen"],
  ["automation-hub", "Automationen"],
];

export default function Werknetz24Page() {
  const [tab, setTab] = useState("overview");
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch("/api/master/businesses?id=werknetz24")
      .then(r => r.json())
      .then(d => setBusiness(d.business))
      .finally(() => setLoading(false));
  }, []);

  return <main className="app">
    <header className="topbar">
      <div>
        <span className="eyebrow">MASTER-ZENTRALE · BETRIEB</span>
        <h1>Werknetz24</h1>
        <p>Bestehendes, produktives Kerngeschäft. Die vollständige Verwaltung bleibt in der eigenen Admin-Zentrale.</p>
      </div>
      <div className="topActions">
        <a href="/master">← Master-Zentrale</a>
        <a href="https://werknetz24.de/admin-zentrale" target="_blank" rel="noreferrer">Vollständige Verwaltung ↗</a>
      </div>
    </header>
    <div className="layout">
      <aside className="sidebar">
        {TABS.map(([id, icon, label]) => <button key={id} className={tab === id ? "selected" : ""} onClick={() => setTab(id)}><b>{icon}</b>{label}</button>)}
      </aside>
      <section className="content">
        {loading && <div className="notice">Lädt…</div>}
        {tab === "overview" && <Overview business={business} />}
        {tab === "kalender" && <WerknetzKalender />}
        {tab === "aufgaben" && <WerknetzAufgaben />}
        {tab === "rechnungen" && <WerknetzRechnungen />}
        {tab === "verbindung" && <Verbindung />}
      </section>
    </div>
    <footer>Werknetz24 ist ein separates, bereits produktives System — diese Seite zeigt nur, was über eine sichere, begrenzte Schnittstelle freigegeben ist.</footer>
    <style jsx>{styles}</style>
  </main>;
}

function Overview({ business }) {
  const status = business?.liveStatus;
  const [incidents, setIncidents] = useState(null);
  useEffect(() => {
    adminFetch("/api/master/businesses?werknetz24Incidents=1").then(r => r.json()).then(d => setIncidents(d.incidents)).catch(() => {});
  }, []);
  return <>
    <div className="pageTitle"><div><span>STATUS</span><h2>Werknetz24 auf einen Blick</h2></div></div>
    {!status ? <Panel title="Live-Status"><p>Lädt…</p></Panel>
      : !status.configured ? <Panel title="Live-Status"><p>🔵 Noch nicht konfiguriert ({status.reason})</p></Panel>
      : !status.ok ? <Panel title="Live-Status"><p>🟡 Werknetz24 nicht erreichbar: {status.error}</p></Panel>
      : <div className="kpis">
          <Kpi label="Systemstatus" value={{ gruen: "🟢", gelb: "🟡", rot: "🔴", unbekannt: "⚪" }[status.data.systemStatus?.gesamtstatus] || "⚪"} note={`${status.data.systemStatus.counts.gruen}🟢 ${status.data.systemStatus.counts.gelb}🟡 ${status.data.systemStatus.counts.rot}🔴`} />
          <Kpi label="Offene Probleme" value={status.data.technischeProbleme.offeneIncidents} note="Systemwächter-Incidents" />
          <Kpi label="Offene Aufgaben" value={status.data.aufgaben.offen} note="in Werknetz24" />
          <Kpi label="Offene Rechnungen" value={status.data.finanzen.offeneRechnungenAnzahl} note={new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format((status.data.finanzen.offeneRechnungenSummeCent || 0) / 100)} />
        </div>}
    {incidents?.ok && incidents.incidents.length > 0 && <Panel title="Was ist rot? (Systemwächter-Incidents)">{incidents.incidents.map((i, idx) => <div className="taskMini" key={idx}><div><strong>{i.system || "unbekanntes System"}</strong><small>{i.erste_erkennung ? new Date(i.erste_erkennung).toLocaleString("de-DE") : "—"}</small></div><span>{i.prioritaet || "—"}</span></div>)}</Panel>}
    <Panel title="Module"><div className="chips">{(business?.modules || []).map(m => <i key={m}>{m}</i>)}</div></Panel>
    {/* Direkt-Sprünge (Full-System-Audit 26.09.2026): nutzen den bereits vorhandenen Deep-Link
        "#<seite>" der Werknetz24-Admin-Zentrale (showPage), statt nur auf deren Startseite zu
        verlinken. Nur Seiten-IDs, die dort real existieren (page-<id>). */}
    <Panel title="Direkt in Werknetz24 öffnen"><div className="chips">{ADMIN_DEEP_LINKS.map(([id, label]) => <a key={id} href={`https://werknetz24.de/admin-zentrale#${id}`} target="_blank" rel="noreferrer">{label} ↗</a>)}</div></Panel>
  </>;
}

// Gleiche sichere, getrennte Secret-Architektur wie die zugrundeliegende Bruecke: Lesen läuft
// über das bereits etablierte WERKNETZ24_STATUS_SECRET, Schreiben (Termin anlegen) über das
// separate, engere WERKNETZ24_WRITE_SECRET - ein kompromittiertes Lese-Secret kann nie einen
// echten Termin anlegen.
function WerknetzKalender() {
  const [kalender, setKalender] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");

  function load() {
    setLoading(true);
    adminFetch("/api/master/businesses?werknetz24Kalender=1")
      .then(r => r.json())
      .then(d => setKalender(d.kalender))
      .catch(() => setKalender({ configured: false, reason: "Abruf fehlgeschlagen" }))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function createTermin(form) {
    try {
      const r = await adminFetch("/api/master/businesses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "werknetz24-kalender-termin", ...form }) });
      const d = await r.json();
      if (!r.ok || !d?.ok) throw new Error(d?.error || "Anlegen fehlgeschlagen");
      setNotice("Termin bei Werknetz24 angelegt.");
      setOpen(false);
      load();
    } catch (error) { setNotice("Termin konnte nicht angelegt werden: " + error.message); }
  }

  return <>
    <div className="pageTitle"><div><span>TERMINE</span><h2>Kalender</h2></div><button className="primaryLink" onClick={() => setOpen(true)}>+ Termin</button></div>
    {notice && <div className="notice">{notice}<button onClick={() => setNotice("")}>×</button></div>}
    <Panel title="Anstehende Termine">
      {loading ? <p>Lädt…</p>
        : !kalender?.configured ? <p>🔵 Noch nicht konfiguriert ({kalender?.reason})</p>
        : !kalender?.ok ? <p>🟡 {kalender.error}</p>
        : kalender.termine.length === 0 ? <p>Keine anstehenden Termine.</p>
        : kalender.termine.map(t => <div className="taskMini" key={t.id}><div><strong>{t.titel}</strong><small>{new Date(t.start).toLocaleString("de-DE")}</small></div></div>)}
    </Panel>
    {open && <KalenderTerminForm onClose={() => setOpen(false)} onSave={createTermin} />}
  </>;
}

function KalenderTerminForm({ onClose, onSave }) {
  const inHourStart = new Date(Date.now() + 60 * 60 * 1000);
  const inHourEnd = new Date(inHourStart.getTime() + 30 * 60 * 1000);
  const toLocal = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const [form, setForm] = useState({ summary: "", description: "", start: toLocal(inHourStart), end: toLocal(inHourEnd) });
  const change = (k, v) => setForm({ ...form, [k]: v });
  return <div className="modalBack"><div className="modal">
    <div className="modalHead"><h3>Werknetz24-Termin anlegen</h3><button onClick={onClose}>×</button></div>
    <label>Titel<input value={form.summary} onChange={e => change("summary", e.target.value)} placeholder="z. B. Kundentermin Müller" /></label>
    <label>Notiz<input value={form.description} onChange={e => change("description", e.target.value)} /></label>
    <label>Beginn<input type="datetime-local" value={form.start} onChange={e => change("start", e.target.value)} /></label>
    <label>Ende<input type="datetime-local" value={form.end} onChange={e => change("end", e.target.value)} /></label>
    <div className="modalActions"><button onClick={onClose}>Abbrechen</button><button className="primary" disabled={!form.summary || !form.start || !form.end} onClick={() => onSave({ summary: form.summary, description: form.description, startISO: new Date(form.start).toISOString(), endISO: new Date(form.end).toISOString() })}>Anlegen</button></div>
  </div></div>;
}

// Rein lesend, gleiches Secret wie der Live-Status/Kalender-Abruf. Aufgaben sind Adnans eigene
// interne Notizen (kein Kundenbezug im Feldschema) - unproblematisch zu zeigen. Rechnungen
// liefern serverseitig NIE kundennummer/kunde_id/positionen (s. api/customers.js im
// werknetz24-landing-Repo) - hier ausschließlich Nummer/Beträge/Status/Fälligkeit.
function WerknetzAufgaben() {
  const [aufgaben, setAufgaben] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    adminFetch("/api/master/businesses?werknetz24Aufgaben=1").then(r => r.json()).then(d => setAufgaben(d.aufgaben)).finally(() => setLoading(false));
  }, []);
  const offen = aufgaben?.ok ? aufgaben.aufgaben.filter(a => !a.erledigt) : [];
  const erledigt = aufgaben?.ok ? aufgaben.aufgaben.filter(a => a.erledigt) : [];
  return <>
    <div className="pageTitle"><div><span>WORK QUEUE</span><h2>Aufgaben</h2></div></div>
    {loading ? <Panel title="Aufgaben"><p>Lädt…</p></Panel>
      : !aufgaben?.configured ? <Panel title="Aufgaben"><p>🔵 Noch nicht konfiguriert ({aufgaben?.reason})</p></Panel>
      : !aufgaben?.ok ? <Panel title="Aufgaben"><p>🟡 {aufgaben.error}</p></Panel>
      : <>
          <Panel title={`Offen (${offen.length})`}>{offen.length === 0 ? <p>Keine offenen Aufgaben.</p> : offen.map(a => <div className="taskMini" key={a.id}><div><strong>{a.text}</strong>{a.kategorie && <small>{a.kategorie}</small>}</div></div>)}</Panel>
          <Panel title={`Erledigt (${erledigt.length})`}>{erledigt.length === 0 ? <p>—</p> : erledigt.map(a => <div className="taskMini" key={a.id}><div><strong>{a.text}</strong>{a.kategorie && <small>{a.kategorie}</small>}</div></div>)}</Panel>
        </>}
  </>;
}

function WerknetzRechnungen() {
  const [rechnungen, setRechnungen] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    adminFetch("/api/master/businesses?werknetz24Rechnungen=1").then(r => r.json()).then(d => setRechnungen(d.rechnungen)).finally(() => setLoading(false));
  }, []);
  const fmt = cents => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format((cents || 0) / 100);
  return <>
    <div className="pageTitle"><div><span>FINANCE</span><h2>Rechnungen</h2></div></div>
    {loading ? <Panel title="Rechnungen"><p>Lädt…</p></Panel>
      : !rechnungen?.configured ? <Panel title="Rechnungen"><p>🔵 Noch nicht konfiguriert ({rechnungen?.reason})</p></Panel>
      : !rechnungen?.ok ? <Panel title="Rechnungen"><p>🟡 {rechnungen.error}</p></Panel>
      : rechnungen.rechnungen.length === 0 ? <Panel title="Rechnungen"><p>Keine Rechnungen vorhanden.</p></Panel>
      : <Panel title={`Letzte ${rechnungen.rechnungen.length} Rechnungen`}>{rechnungen.rechnungen.map(r => <div className="taskMini" key={r.rechnungsnummer}><div><strong>{r.rechnungsnummer}</strong><small>Fällig: {r.faelligkeit ? new Date(r.faelligkeit).toLocaleDateString("de-DE") : "—"}</small></div><span>{r.status}</span><b>{fmt(r.betrag_cent)}</b></div>)}</Panel>}
  </>;
}

function Verbindung() {
  return <>
    <div className="pageTitle"><div><span>ARCHITEKTUR</span><h2>Was diese Seite kann — und was nicht</h2></div></div>
    <Panel title="✅ Über die Master-Zentrale verfügbar">
      <ul><li>Live-Systemstatus (Systeme/Probleme/Aufgaben/Rechnungen, aggregiert)</li><li>Kalender ansehen und neue Termine anlegen</li></ul>
    </Panel>
    <Panel title="🔗 Nur in der echten Werknetz24-Verwaltung">
      <ul><li>Lisa / Telefonassistent</li><li>Kunden, Leads, Anfragen</li><li>Rechnungen, Angebote, Buchhaltung</li><li>Systemwächter im Detail</li></ul>
      <a className="primaryLink" href="https://werknetz24.de/admin-zentrale" target="_blank" rel="noreferrer">Vollständige Verwaltung öffnen ↗</a>
    </Panel>
    <Panel title="Warum"><p>Werknetz24 ist ein separates, bereits produktives System mit echten Kundendaten und Zahlungen. Diese Seite verdoppelt es bewusst nicht, sondern verbindet sich nur über eine sichere, eng begrenzte Schnittstelle. Details: <code>docs/MASTER-CONTROL-ARCHITECTURE.md</code> im <code>werknetz24-landing</code>-Repo.</p></Panel>
  </>;
}

function Kpi({ label, value, note }) { return <div className="kpi"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>; }
function Panel({ title, children }) { return <section className="panel"><div className="panelTitle"><h3>{title}</h3></div>{children}</section>; }

const styles = `
*{box-sizing:border-box}.app{min-height:100vh;background:#f5f7fa;color:#101828;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.topbar{background:#101828;color:#fff;padding:28px max(22px,calc((100vw - 1400px)/2));display:flex;justify-content:space-between;gap:30px}.eyebrow{font-size:10px;font-weight:800;letter-spacing:.14em;color:#98a2b3}.topbar h1{font-size:34px;letter-spacing:-.035em;margin:7px 0}.topbar p{margin:0;color:#c0c5d0}.topActions{display:flex;gap:8px;align-items:flex-start}.topActions a{padding:9px 11px;border:1px solid #344054;border-radius:8px;color:#fff;text-decoration:none;font-size:12px}.layout{display:grid;grid-template-columns:220px minmax(0,1fr);max-width:1400px;margin:auto}.sidebar{background:#fff;border-right:1px solid #e4e7ec;min-height:calc(100vh - 116px);padding:18px 12px}.sidebar button{width:100%;display:flex;gap:10px;align-items:center;border:0;background:transparent;text-align:left;padding:11px 12px;border-radius:8px;color:#475467;text-decoration:none;font:inherit;cursor:pointer}.sidebar button:hover,.sidebar .selected{background:#f2f4f7;color:#101828}.sidebar button b{width:20px}.content{padding:28px;min-width:0}.pageTitle{display:flex;justify-content:space-between;align-items:end;gap:15px;margin-bottom:18px}.pageTitle>div>span{font-size:10px;font-weight:800;letter-spacing:.13em;color:#667085}.pageTitle h2{margin:5px 0 0;font-size:28px;letter-spacing:-.03em}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.kpi{background:#fff;border:1px solid #e4e7ec;border-radius:12px;padding:17px}.kpi span,.kpi small{display:block;color:#667085;font-size:12px}.kpi strong{display:block;font-size:30px;letter-spacing:-.03em;margin:8px 0 3px}.panel{background:#fff;border:1px solid #e4e7ec;border-radius:12px;padding:19px;margin-top:14px}.panelTitle{display:flex;justify-content:space-between;margin-bottom:13px}.panel h3{margin:0;font-size:16px}.panel ul{margin:0;padding-left:18px;color:#475467;line-height:1.7}.taskMini{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #eaecf0}.taskMini:last-child{border-bottom:0}.taskMini>div{flex:1}.taskMini strong{display:block}.taskMini small{display:block;color:#667085;font-size:12px;margin-top:3px}.taskMini>span{font-size:11px;padding:5px 8px;background:#f2f4f7;border-radius:999px}.chips{display:flex;gap:5px;flex-wrap:wrap}.chips i{font-style:normal;font-size:10px;border:1px solid #eaecf0;padding:5px 7px;border-radius:6px}.primaryLink{display:inline-block;padding:9px 11px;background:#101828;color:#fff;border-radius:8px;text-decoration:none;font-size:12px;border:0;cursor:pointer;margin-top:10px}.notice{background:#ecfdf3;border:1px solid #abefc6;color:#067647;padding:10px 12px;border-radius:8px;margin-bottom:14px;font-size:12px;display:flex;justify-content:space-between}.notice button{border:0;background:transparent;cursor:pointer}.modalBack{position:fixed;inset:0;background:rgba(16,24,40,.45);display:grid;place-items:center;padding:20px;z-index:20}.modal{background:#fff;border-radius:13px;width:min(460px,100%);padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.2)}.modalHead{display:flex;justify-content:space-between}.modalHead h3{margin:0 0 15px}.modalHead button{border:0;background:transparent;font-size:22px;cursor:pointer}.modal label{display:block;font-size:12px;font-weight:700;margin-top:12px}.modal input{display:block;width:100%;margin-top:5px;padding:10px;border:1px solid #d0d5dd;border-radius:7px}.modalActions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.modalActions button{padding:9px 12px;border:1px solid #d0d5dd;background:#fff;border-radius:7px;cursor:pointer}.modalActions .primary{background:#101828;color:#fff}footer{max-width:1400px;margin:auto;padding:18px 28px 30px;color:#667085;font-size:11px}code{background:#f2f4f7;padding:2px 5px;border-radius:4px;font-size:12px}@media(max-width:900px){.layout{grid-template-columns:1fr}.sidebar{min-height:auto;border-right:0;border-bottom:1px solid #e4e7ec;display:flex;overflow:auto}.sidebar button{min-width:max-content}.kpis{grid-template-columns:1fr 1fr}}@media(max-width:600px){.topbar{display:block}.topActions{margin-top:15px}.content{padding:18px}.kpis{grid-template-columns:1fr}.pageTitle{display:block}}
`;
