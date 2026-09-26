"use client";

import { useEffect, useMemo, useState } from "react";
import { adminFetch } from "../../lib/admin-fetch.js";
import { Fehlerzentrale, AgentenZentrale, Werknetz24Systeme } from "./control-center.jsx";

// Direkt adressierbare Bereiche (Full-System-Audit Phase 2, 26.09.2026): /master?tab=alerts öffnet
// sofort die Fehlerzentrale usw. - keine Zwischenseite, Links von außen möglich.
const TABS=[["overview","◈","Übersicht"],["businesses","▣","Betriebe"],["agents","◎","Agenten-Zentrale"],["alerts","⚠","Fehlerzentrale"],["tasks","✓","Aufgaben"],["systems","◉","Systemmonitoring"],["finance","€","Finanzen"],["automation","↻","Automationen"],["audit","▤","Audit-Log"],["settings","⚙","Einstellungen"]];
const VALID_TABS=new Set(TABS.map(([id])=>id));

const initialBusinesses = [
  { id:"werknetz24", name:"Werknetz24", type:"Bestehender Betrieb", status:"EXTERNAL", health:"🟡", revenue:"—", link:"/werknetz24", modules:["Lisa / Telefon","Kunden","Leads","Aufträge","Rechnungen","Finanzen","Integrationen"] },
  { id:"ecommerce", name:"E-Commerce", type:"Geschäftsbereich", status:"CODE EXISTS", health:"🟡", revenue:"0 €", link:"/e-commerce", modules:["Produkte","Lieferanten","Bestellungen","Shop","Marketing","Retouren","Finanzen"] },
  { id:"future", name:"Weiterer Betrieb", type:"Vorbereitet", status:"OPEN", health:"⚪", revenue:"—", link:"#", modules:["Kunden","Aufgaben","Finanzen","Reports"] }
];

const initialTasks = [
  {id:1, title:"Persistenz fertigstellen", area:"System", business_id:"master", status:"In Arbeit", priority:"Hoch"},
  {id:2, title:"Stripe sicher anbinden", area:"Zahlungen", business_id:"ecommerce", status:"Blockiert", priority:"Hoch"},
  {id:3, title:"Lieferanten-Connector vorbereiten", area:"E-Commerce", business_id:"ecommerce", status:"Offen", priority:"Mittel"},
  {id:4, title:"Master-Zentrale Quality Gate", area:"Master", business_id:"master", status:"In Arbeit", priority:"Hoch"}
];

const systems = [
  ["GitHub","🟢","Code & Dokumentation"],
  ["Vercel","🟢","Deployment"],
  ["Famulor","🟡","Werknetz24 Telefon (nicht bestätigt)"],
  ["Easybell","🟡","Telefonie / Weiterleitung"],
  ["Stripe","🔴","Produktiv noch gesperrt"],
  ["Shopify","🟡","Webhook-Schicht vorhanden"],
  ["Datenbank","🟡","Adapter vorhanden, noch nicht persistent"],
  ["E-Mail","🟡","Connector offen"],
  ["Slack","🟡","Connector offen"]
];

export default function MasterDashboard(){
  const [tab,setTabState]=useState("overview");
  useEffect(()=>{ const t=new URLSearchParams(window.location.search).get("tab"); if(t&&VALID_TABS.has(t)) setTabState(t); },[]);
  const setTab=t=>{ setTabState(t); try{ const u=new URL(window.location.href); if(t==="overview") u.searchParams.delete("tab"); else u.searchParams.set("tab",t); window.history.replaceState(null,"",u); }catch{ /* reine Komfortfunktion */ } };
  const [businesses,setBusinesses]=useState(initialBusinesses);
  const [tasks,setTasks]=useState(initialTasks);
  const [editing,setEditing]=useState(null);
  const [notice,setNotice]=useState("");
  const [search,setSearch]=useState("");
  const [loading,setLoading]=useState(true);
  const [storage,setStorage]=useState("unbekannt");
  const [systemFilter,setSystemFilter]=useState("all");
  const [tasksLoading,setTasksLoading]=useState(true);
  const [finance,setFinance]=useState([]);
  const [financeLoading,setFinanceLoading]=useState(true);
  const [systems,setSystems]=useState([]);
  const [systemsLoading,setSystemsLoading]=useState(true);
  const [systemEditing,setSystemEditing]=useState(null);
  const [qualityGate,setQualityGate]=useState(null);
  const [qgLoading,setQgLoading]=useState(true);
  const [recentActivity,setRecentActivity]=useState([]);

  useEffect(()=>{ adminFetch("/api/master/businesses").then(r=>r.json()).then(data=>{ if(data?.businesses) setBusinesses(data.businesses); if(data?.storage) setStorage(data.storage); }).finally(()=>setLoading(false)); },[]);
  useEffect(()=>{ fetch("/api/master/tasks").then(r=>r.json()).then(data=>{ if(data?.tasks) setTasks(data.tasks); if(data?.storage) setStorage(data.storage); }).finally(()=>setTasksLoading(false)); },[]);
  useEffect(()=>{ adminFetch("/api/master/finance").then(r=>r.json()).then(data=>{ if(data?.entries) setFinance(data.entries); if(data?.storage) setStorage(data.storage); }).finally(()=>setFinanceLoading(false)); },[]);
  // Jeder Aufruf fuehrt die automatischen Checks in lib/master-systems.js neu aus - damit ist
  // "Erneut prüfen"/"Retry" in Fehler- und Agenten-Zentrale eine echte Wiederholung.
  const reloadSystems=()=>{ setSystemsLoading(true); return fetch("/api/master/systems",{cache:"no-store"}).then(r=>r.json()).then(data=>{ if(data?.systems) setSystems(data.systems); if(data?.storage) setStorage(data.storage); }).finally(()=>setSystemsLoading(false)); };
  useEffect(()=>{ reloadSystems(); },[]);
  // Quality Gate antwortet bewusst mit HTTP 503, solange die Produktion nicht freigegeben ist
  // (lib/quality-gate.js) - trotzdem ein normaler JSON-Body, .json() funktioniert ohne r.ok-Check.
  useEffect(()=>{ fetch("/api/master/quality-gate").then(r=>r.json()).then(data=>setQualityGate(data)).catch(()=>setQualityGate({ok:false,productionReady:false,error:"nicht erreichbar"})).finally(()=>setQgLoading(false)); },[]);
  useEffect(()=>{ adminFetch("/api/master/audit").then(r=>r.json()).then(d=>setRecentActivity((d.entries||[]).slice(0,5))).catch(()=>{}); },[]);

  const visibleBusinesses=useMemo(()=>businesses.filter(b=>
    !search || (b.name+" "+b.type+" "+b.status).toLowerCase().includes(search.toLowerCase())
  ),[businesses,search]);

  async function saveBusiness(updated){
    setBusinesses(prev=>prev.map(b=>b.id===updated.id?updated:b));
    setEditing(null);
    try{
      const response=await adminFetch("/api/master/businesses",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(updated)});
      const data=await response.json();
      if(!response.ok || !data?.business) throw new Error(data?.error || "Speichern fehlgeschlagen");
      setBusinesses(prev=>prev.map(b=>b.id===updated.id?data.business:b));
      setNotice(data.storage==="supabase" ? "Gespeichert in der Datenbank." : "Gespeichert im Fallback-Speicher. Für dauerhafte Speicherung fehlt noch die externe Datenbank-Konfiguration.");
    }catch(error){ setNotice("Speichern fehlgeschlagen: "+error.message); }
  }

  async function saveTask(updated){
    try{const response=await adminFetch("/api/master/tasks",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(updated)});const data=await response.json();if(!response.ok||!data?.task)throw new Error(data?.error||"Speichern fehlgeschlagen");setTasks(prev=>prev.map(t=>String(t.id)===String(updated.id)?data.task:t));setNotice(data.storage==="supabase"?"Aufgabe dauerhaft gespeichert.":"Aufgabe gespeichert; dauerhafte DB fehlt noch.");}catch(error){setNotice("Aufgabe konnte nicht gespeichert werden: "+error.message);}
  }
  async function saveSystem(updated){
    try{const response=await adminFetch("/api/master/systems",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(updated)});const data=await response.json();if(!response.ok||!data?.system)throw new Error(data?.error||"Speichern fehlgeschlagen");setSystems(prev=>prev.map(s=>s.id===updated.id?data.system:s));setSystemEditing(null);setNotice(data.storage==="supabase"?"Systemstatus dauerhaft gespeichert.":"Systemstatus im Fallback-Speicher gespeichert.");}catch(error){setNotice("Systemstatus konnte nicht gespeichert werden: "+error.message);}
  }

  async function createTask(form){
    try{const response=await adminFetch("/api/master/tasks",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});const data=await response.json();if(!response.ok||!data?.task)throw new Error(data?.error||"Anlegen fehlgeschlagen");setTasks(prev=>[data.task,...prev]);setNotice("Neue Aufgabe angelegt.");}catch(error){setNotice("Aufgabe konnte nicht angelegt werden: "+error.message);}
  }

  return <main className="app">
    <header className="topbar">
      <div><span className="eyebrow">WERKNETZ24 · MASTER-ZENTRALE</span><h1>Master Dashboard</h1><p>Alle Betriebe, Systeme, Aufgaben, Finanzen und Automationen an einem Ort.</p></div>
      <div className="topActions"><span className="live"><i/>Systemübersicht · {storage}</span><a href="/zentral">Alte Zentrale</a></div>
    </header>

    <div className="layout">
      <aside className="sidebar">
        <div className="sideAreas"><span>Geschäftsbereiche</span><a href="/werknetz24">▸ Werknetz24</a><a href="/e-commerce">▸ E-Commerce</a></div>
        {TABS.map(([id,icon,label])=><button key={id} className={tab===id?"selected":""} onClick={()=>setTab(id)}><b>{icon}</b>{label}</button>)}
        <div className="sideBottom"><a href="/e-commerce?tab=pipeline">↳ Produkt-Pipeline</a><a href="/e-commerce?tab=lieferanten">↳ Lieferanten</a><a href="/e-commerce?tab=automation">↳ Automationen</a><a href="https://werknetz24.de/admin-zentrale" target="_blank" rel="noreferrer">↳ Werknetz24-Verwaltung ↗</a></div>
      </aside>

      <section className="content">{loading && <div className="notice">Master-Daten werden geladen…</div>}
        {notice && <div className="notice">{notice}<button onClick={()=>setNotice("")}>×</button></div>}
        {tab==="overview" && <Overview businesses={businesses} tasks={tasks} systems={systems} qualityGate={qualityGate} qgLoading={qgLoading} recentActivity={recentActivity} goTo={setTab}/>}
        {tab==="businesses" && <Businesses businesses={visibleBusinesses} search={search} setSearch={setSearch} editing={editing} setEditing={setEditing} saveBusiness={saveBusiness}/>}
        {tab==="alerts" && <Fehlerzentrale systems={systems} tasks={tasks} qualityGate={qualityGate} onReloadSystems={reloadSystems} goTo={setTab}/>}
        {tab==="agents" && <AgentenZentrale systems={systems} onReloadSystems={reloadSystems}/>}
        {tab==="tasks" && <Tasks tasks={tasks} businesses={businesses} loading={tasksLoading} onSave={saveTask} onCreate={createTask}/>}
        {tab==="systems" && <><Systems systems={systems} loading={systemsLoading} filter={systemFilter} setFilter={setSystemFilter} editing={systemEditing} setEditing={setSystemEditing} onSave={saveSystem}/><Werknetz24Systeme/></>}
        {tab==="finance" && <Finance entries={finance} businesses={businesses} loading={financeLoading} onCreate={async form=>{const r=await adminFetch("/api/master/finance",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});const d=await r.json();if(!r.ok||!d?.entry)throw new Error(d?.error||"Speichern fehlgeschlagen");setFinance(prev=>[d.entry,...prev]);setNotice("Finanzbuchung gespeichert.");}}/>}
        {tab==="automation" && <Automation/>}
        {tab==="audit" && <Audit/>}
        {tab==="settings" && <Settings/>}
      </section>
    </div>
    <footer>Master-Zentrale · Statusänderungen werden über die zentrale API protokolliert. Keine externe Zahlung, Bestellung oder Vertragsänderung wird durch dieses Dashboard ausgelöst.</footer>
    <style jsx>{styles}</style>
  </main>
}

function Overview({businesses,tasks,systems,qualityGate,qgLoading,recentActivity,goTo}){
  const openTasks=tasks.filter(t=>t.status!=="Erledigt").length;
  const blocked=systems.filter(s=>s.status==="🔴").length;
  const qgLabel=qgLoading?"…":qualityGate?.productionReady?"🟢 Bereit":"🔴 Gesperrt";
  const qgBlocking=qualityGate?.blocking?.length||0;
  return <>
    <div className="pageTitle"><div><span>CONTROL CENTER</span><h2>Was passiert gerade?</h2></div><div className="quick"><a href="/produkt-pipeline">Produkt prüfen</a><a href="/automation">Automation testen</a></div></div>
    <nav className="areaNav" aria-label="Direktnavigation"><a href="/werknetz24"><b>Werknetz24</b><small>eigener Bereich</small></a><a href="/e-commerce"><b>E-Commerce</b><small>eigener Bereich</small></a><button onClick={()=>goTo?.("agents")}><b>Agenten</b><small>Agenten-Zentrale</small></button><button onClick={()=>goTo?.("alerts")}><b>Fehler</b><small>Fehlerzentrale</small></button><button onClick={()=>goTo?.("systems")}><b>Systeme</b><small>Systemmonitoring</small></button><button onClick={()=>goTo?.("finance")}><b>Finanzen</b><small>Finanzbereich</small></button></nav>
    <div className="kpis">
      <Kpi label="Betriebe" value={businesses.length} note="zentral verwaltet"/>
      <Kpi label="Offene Aufgaben" value={openTasks} note="Priorisierung aktiv" onClick={()=>goTo?.("tasks")}/>
      <Kpi label="Systeme kritisch" value={blocked} note="müssen vor Live-Betrieb geprüft werden" onClick={()=>goTo?.("alerts")}/>
      <Kpi label="Quality Gate" value={qgLabel} note={qgBlocking?qgBlocking+" Blocker offen":"alle Checks bestanden"} onClick={()=>window.open("/e-commerce?tab=quality-gate","_self")}/>
    </div>
    <div className="columns">
      <Panel title="Betriebsübersicht" action="Betriebe →" onClick={()=>goTo?.("businesses")}>{businesses.map(b=><div className="row" key={b.id}><div><strong>{b.name}</strong><small>{b.type}</small></div><span>{b.health} {b.status}</span></div>)}</Panel>
      <Panel title="Nächste Aufgaben" action="Alle →" onClick={()=>goTo?.("tasks")}><>{tasks.filter(t=>t.status!=="Erledigt").slice(0,4).map(t=><div className="taskMini" key={t.id}><span className={t.priority==="Hoch"?"high":""}>{t.priority}</span><div><strong>{t.title}</strong><small>{t.area} · {t.status}</small></div></div>)}</></Panel>
    </div>
    <Panel title="System-Lage" action="Fehlerzentrale →" onClick={()=>goTo?.("alerts")}><div className="systemGrid">{systems.map(s=><div className="system" key={s.id}><b>{s.status} {s.name}</b><small>{s.note}</small></div>)}</div></Panel>
    <Panel title="Letzte Aktivitäten" action="Audit-Log →" onClick={()=>goTo?.("audit")}>{recentActivity.length===0?<p>Noch keine protokollierten Änderungen.</p>:recentActivity.map((e,i)=><div className="taskMini" key={e.id||i}><span>{e.action}</span><div><strong>{e.entity_type} {e.entity_id||""}</strong><small>{e.actor} · {e.created_at}</small></div></div>)}</Panel>
  </>
}

// Businesses-Karte zeigt bewusst nur Aggregat-Info (Status/Umsatz/Module) + Link zum jeweils
// eigenen, dedizierten Bereich - keine Detail-Widgets mehr hier (22.09.2026, Adnans ausdrücklicher
// Wunsch "nicht alles auf eine Seite, jeder Bereich soll seinen eigenen Bereich haben"). Vorher
// war hier ein Werknetz24-Kalender-Widget direkt eingebettet - das hat E-Commerce- und
// Werknetz24-Infos auf derselben Übersichtsseite vermischt. Jetzt: Klick auf "Öffnen" bei
// Werknetz24 führt zu /werknetz24 (eigene Seite, nur Werknetz24), bei E-Commerce zu /e-commerce
// (bereits vorher so, unverändert).
function Businesses({businesses,search,setSearch,editing,setEditing,saveBusiness}){
  return <><div className="pageTitle"><div><span>BUSINESS MANAGEMENT</span><h2>Betriebe verwalten</h2></div><input className="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Suchen…"/></div>
  <div className="businessGrid">{businesses.map(b=><article className="businessCard" key={b.id}><div className="cardHead"><div><span>{b.type}</span><h3>{b.name}</h3></div><em>{b.status}</em></div><p>{b.health} Systemstatus · Umsatz: {b.revenue}</p>{b.liveStatus&&<LiveStatus status={b.liveStatus}/>}<div className="chips">{b.modules.map(m=><i key={m}>{m}</i>)}</div><div className="cardActions">{b.link!="#"&&<a href={b.link}>Öffnen →</a>}<button onClick={()=>setEditing(b)}>Bearbeiten</button></div></article>)}</div>
  {editing&&<EditBusiness business={editing} onClose={()=>setEditing(null)} onSave={saveBusiness}/>}</>
}

// Rendert den echten, live abgefragten Werknetz24-Status (s. lib/werknetz24-connector.js).
// Zeigt ehrlich EXTERNAL/OPEN an, solange kein Secret konfiguriert ist - nie erfundene Werte.
function LiveStatus({status}){
  if(!status.configured) return <div className="liveStatusBox unconfigured">🔵 EXTERNAL — Werknetz24-Verbindung noch nicht konfiguriert ({status.reason})</div>;
  if(!status.ok) return <div className="liveStatusBox error">🟡 Werknetz24 nicht erreichbar: {status.error}</div>;
  const d=status.data;
  const ampel={gruen:"🟢",gelb:"🟡",rot:"🔴",unbekannt:"⚪"}[d.systemStatus?.gesamtstatus]||"⚪";
  return <div className="liveStatusBox ok">
    <strong>{ampel} Werknetz24 live</strong>
    <span>System: {d.systemStatus.counts.gruen}🟢 {d.systemStatus.counts.gelb}🟡 {d.systemStatus.counts.rot}🔴 · Probleme: {d.technischeProbleme.offeneIncidents} · Aufgaben offen: {d.aufgaben.offen} · Offene Rechnungen: {d.finanzen.offeneRechnungenAnzahl} ({formatEUR(d.finanzen.offeneRechnungenSummeCent/100)})</span>
    <small>Zuletzt geprüft: {new Date(status.fetchedAt).toLocaleString("de-DE")}</small>
  </div>;
}

function EditBusiness({business,onClose,onSave}){
 const [form,setForm]=useState(business);
 return <div className="modalBack"><div className="modal"><div className="modalHead"><h3>Betrieb bearbeiten</h3><button onClick={onClose}>×</button></div><label>Name<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Typ<input value={form.type} onChange={e=>setForm({...form,type:e.target.value})}/></label><label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>OPEN</option><option>CODE EXISTS</option><option>EXTERNAL</option><option>BLOCKED</option></select></label><label>Notiz / Umsatzanzeige<input value={form.revenue} onChange={e=>setForm({...form,revenue:e.target.value})}/></label><div className="modalActions"><button onClick={onClose}>Abbrechen</button><button className="primary" onClick={()=>onSave(form)}>Speichern</button></div></div></div>
}

// business_id ordnet jede Aufgabe eindeutig einem Geschäftsbereich zu (oder "master" für
// betriebsübergreifende Aufgaben) - verhindert, dass Werknetz24- und E-Commerce-Aufgaben in der
// Liste unbeabsichtigt vermischt werden, und macht die Zuordnung im Filter/Badge sichtbar.
function businessLabel(id,businesses){
  if(id==="master"||!id) return "Master-übergreifend";
  return businesses.find(b=>b.id===id)?.name || id;
}
function Tasks({tasks,businesses,loading,onSave,onCreate}){
  const [editing,setEditing]=useState(null);const [creating,setCreating]=useState(false);
  const [businessFilter,setBusinessFilter]=useState("all");
  const visible=businessFilter==="all"?tasks:tasks.filter(t=>(t.business_id||"master")===businessFilter);
  return <><div className="pageTitle"><div><span>WORK QUEUE</span><h2>Aufgaben & Quality Gates</h2></div><div className="quick"><select className="search" value={businessFilter} onChange={e=>setBusinessFilter(e.target.value)}><option value="all">Alle Geschäftsbereiche</option><option value="master">Master-übergreifend</option>{businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select><button className="primaryLink" onClick={()=>setCreating(true)}>+ Aufgabe</button></div></div>{loading?<Panel title="Aufgaben"><p>Daten werden geladen…</p></Panel>:<div className="taskTable">{visible.map(t=><div className="taskRow" key={t.id}><button onClick={()=>onSave({...t,status:t.status==="Erledigt"?"Offen":"Erledigt"})} className={t.status==="Erledigt"?"check done":"check"}>✓</button><div><strong>{t.title}</strong><small>{t.area} · {t.owner||"system"}{t.due_at?" · "+new Date(t.due_at).toLocaleDateString("de-DE"):""}</small></div><i className="businessBadge">{businessLabel(t.business_id,businesses)}</i><span>{t.priority}</span><em>{t.status}</em><button className="editMini" onClick={()=>setEditing(t)}>Bearbeiten</button></div>)}</div>}{editing&&<TaskEditor task={editing} businesses={businesses} onClose={()=>setEditing(null)} onSave={async t=>{await onSave(t);setEditing(null)}}/>}{creating&&<TaskEditor task={{title:"",area:"",business_id:"master",status:"Offen",priority:"Mittel",owner:"system",due_at:""}} businesses={businesses} onClose={()=>setCreating(false)} onSave={async t=>{await onCreate(t);setCreating(false)}}/>}</>}
function TaskEditor({task,businesses,onClose,onSave}){const [form,setForm]=useState(task);const change=(k,v)=>setForm({...form,[k]:v});return <div className="modalBack"><div className="modal"><div className="modalHead"><h3>{task.id?"Aufgabe bearbeiten":"Neue Aufgabe"}</h3><button onClick={onClose}>×</button></div><label>Titel<input value={form.title||""} onChange={e=>change("title",e.target.value)}/></label><label>Bereich<input value={form.area||""} onChange={e=>change("area",e.target.value)}/></label><label>Geschäftsbereich<select value={form.business_id||"master"} onChange={e=>change("business_id",e.target.value)}><option value="master">Master-übergreifend</option>{businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label><label>Status<select value={form.status||"Offen"} onChange={e=>change("status",e.target.value)}><option>Offen</option><option>In Arbeit</option><option>Blockiert</option><option>Erledigt</option></select></label><label>Priorität<select value={form.priority||"Mittel"} onChange={e=>change("priority",e.target.value)}><option>Niedrig</option><option>Mittel</option><option>Hoch</option></select></label><label>Verantwortlich<input value={form.owner||"system"} onChange={e=>change("owner",e.target.value)}/></label><label>Fällig am<input type="datetime-local" value={form.due_at?String(form.due_at).slice(0,16):""} onChange={e=>change("due_at",e.target.value?new Date(e.target.value).toISOString():"")}/></label><div className="modalActions"><button onClick={onClose}>Abbrechen</button><button className="primary" onClick={()=>onSave(form)} disabled={!form.title||!form.area}>Speichern</button></div></div></div>}


function Systems({systems,loading,filter,setFilter,editing,setEditing,onSave}){const filtered=filter==="all"?systems:systems.filter(s=>s.status===filter);return <><div className="pageTitle"><div><span>INFRASTRUCTURE</span><h2>Systeme & Integrationen</h2></div><select className="search" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Alle Status</option><option value="🟢">🟢 Grün</option><option value="🟡">🟡 Prüfung</option><option value="🔴">🔴 Kritisch</option><option value="⚪">⚪ Offen</option></select></div>{loading?<Panel title="Systeme"><p>Daten werden geladen…</p></Panel>:<div className="systemGrid big">{filtered.map(s=><article className="system" key={s.id}><strong>{s.status} {s.name}</strong>{s.source==="auto"&&<i className="autoBadge">🤖 automatisch geprüft</i>}<p>{s.note}</p><small>Letzte Prüfung: {s.last_checked_at?new Date(s.last_checked_at).toLocaleString("de-DE"):"noch nicht dokumentiert"}</small><small>Nächster Schritt: {s.next_action||"—"}</small>{s.source==="auto"?<small className="autoHint">Wird bei jedem Laden live neu geprüft - keine manuelle Bearbeitung möglich.</small>:<button onClick={()=>setEditing(s)}>Prüfung bearbeiten</button>}</article>)}</div>}{editing&&<SystemEditor system={editing} onClose={()=>setEditing(null)} onSave={onSave}/>}</>}

function SystemEditor({system,onClose,onSave}){const [form,setForm]=useState(system);const change=(k,v)=>setForm({...form,[k]:v});return <div className="modalBack"><div className="modal"><div className="modalHead"><h3>Systemstatus bearbeiten</h3><button onClick={onClose}>×</button></div><label>Status<select value={form.status} onChange={e=>change("status",e.target.value)}><option>🟢</option><option>🟡</option><option>🔴</option><option>⚪</option></select></label><label>Notiz<input value={form.note||""} onChange={e=>change("note",e.target.value)}/></label><label>Nächste Aktion<input value={form.next_action||""} onChange={e=>change("next_action",e.target.value)}/></label><label>Quelle<input value={form.source||"manual"} onChange={e=>change("source",e.target.value)}/></label><div className="modalActions"><button onClick={onClose}>Abbrechen</button><button className="primary" onClick={()=>onSave({...form,last_checked_at:new Date().toISOString()})}>Prüfung speichern</button></div></div></div>}

function Finance({entries,businesses,loading,onCreate}){const [open,setOpen]=useState(false);const totals=entries.reduce((a,e)=>{if(e.status==="cancelled")return a;const n=Number(e.amount)||0;if(e.kind==="income")a.income+=n;else a.expense+=n;a.net=a.income-a.expense;return a},{income:0,expense:0,net:0});return <><div className="pageTitle"><div><span>FINANCE CONTROL</span><h2>Finanzzentrale</h2></div><button className="primaryLink" onClick={()=>setOpen(true)}>+ Buchung</button></div><div className="kpis"><Kpi label="Einnahmen" value={formatEUR(totals.income)} note="erfasste bestätigte/pending Buchungen"/><Kpi label="Kosten" value={formatEUR(totals.expense)} note="erfasste Kosten"/><Kpi label="Netto" value={formatEUR(totals.net)} note="Einnahmen minus Kosten"/><Kpi label="Buchungen" value={entries.length} note={loading?"Laden…":"Ledger-Einträge"}/></div><Panel title="Finanzbuchungen">{loading?<p>Daten werden geladen…</p>:entries.length===0?<p>Noch keine echten Finanzdaten verbunden. Keine Zahlen erfunden.</p>:entries.map(e=><div className="taskMini" key={e.id}><span>{e.kind==="income"?"Einnahme":"Kosten"}</span><div><strong>{e.description||e.category}</strong><small>{e.category} · {e.source} · {new Date(e.occurred_at).toLocaleDateString("de-DE")}</small></div><i className="businessBadge">{businessLabel(e.business_id,businesses)}</i><b>{e.kind==="income"?"+":"−"} {formatEUR(Number(e.amount))}</b></div>)}</Panel><Panel title="Finanzregeln"><ul><li>Keine erfundenen Einnahmen oder Kosten.</li><li>Stripe/PayPal erst nach sicherer Integration.</li><li>Bankdaten nur nach expliziter Verbindung.</li><li>Jede reale Zahlung muss nachvollziehbar verbucht werden.</li></ul></Panel>{open&&<FinanceEditor businesses={businesses} onClose={()=>setOpen(false)} onSave={async form=>{await onCreate(form);setOpen(false)}}/>}</>}
function formatEUR(n){return new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(n)}
function FinanceEditor({businesses,onClose,onSave}){const [form,setForm]=useState({kind:"expense",amount:"",category:"",description:"",business_id:"",status:"confirmed",source:"manual",occurred_at:new Date().toISOString()});const change=(k,v)=>setForm({...form,[k]:v});return <div className="modalBack"><div className="modal"><div className="modalHead"><h3>Finanzbuchung</h3><button onClick={onClose}>×</button></div><label>Art<select value={form.kind} onChange={e=>change("kind",e.target.value)}><option value="expense">Kosten</option><option value="income">Einnahme</option></select></label><label>Betrag (EUR)<input type="number" min="0" step="0.01" value={form.amount} onChange={e=>change("amount",e.target.value)}/></label><label>Kategorie<input value={form.category} onChange={e=>change("category",e.target.value)} placeholder="z. B. Hosting"/></label><label>Beschreibung<input value={form.description} onChange={e=>change("description",e.target.value)}/></label><label>Geschäftsbereich<select value={form.business_id} onChange={e=>change("business_id",e.target.value)}><option value="">Betriebsübergreifend / nicht zugeordnet</option>{businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label><label>Status<select value={form.status} onChange={e=>change("status",e.target.value)}><option value="confirmed">Bestätigt</option><option value="pending">Offen</option><option value="cancelled">Storniert</option></select></label><div className="modalActions"><button onClick={onClose}>Abbrechen</button><button className="primary" disabled={!form.amount||!form.category} onClick={()=>onSave(form)}>Speichern</button></div></div></div>}


function Automation(){return <><div className="pageTitle"><div><span>AUTOMATION CONTROL</span><h2>Automationen</h2></div><a className="primaryLink" href="/automation">Engine öffnen →</a></div><div className="automationGrid">{["Bestellung → Lieferant → Tracking","Produktprüfung → Quality Gate","Kundengewinnung → Conversion","Finanzen → Deckungsbeitrag","Fehler → Task → Stop"].map((x,i)=><article key={x}><span>0{i+1}</span><h3>{x}</h3><p>{i===4?"Fehler müssen automatisch sichtbar werden; keine stille Weiterverarbeitung.":"Workflow vorbereitet; externe Ausführung bleibt bis zum Connector-Gate deaktiviert."}</p></article>)}</div></>}

function Settings(){return <><div className="pageTitle"><div><span>MASTER SETTINGS</span><h2>Steuerung</h2></div></div><Panel title="Grundregeln"><div className="rules"><b>🔒 Keine Secrets im GitHub-Repository</b><b>💶 Keine Kosten ohne Freigabe</b><b>🧪 Keine echten Bestellungen ohne Test/Quality Gate</b><b>📚 Dokumentation bleibt Teil des Systems</b><b>🛑 Kritische Fehler stoppen automatische Folgeprozesse</b></div></Panel><Panel title="Datenhaltung"><p>Der aktuelle Master läuft ohne persistente Produktionsdatenbank. Der Datenbank-Adapter ist vorbereitet; eine echte Datenbank wird erst nach Konfiguration und Smoke-Test als produktiv markiert.</p><a href="/start">Start- und Produktionscheck öffnen →</a></Panel></>}

function Audit(){
  const [entries,setEntries]=useState([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{adminFetch("/api/master/audit").then(r=>r.json()).then(d=>setEntries(d.entries||[])).finally(()=>setLoading(false))},[]);
  return <><div className="pageTitle"><div><span>SECURITY & TRACEABILITY</span><h2>Audit-Log</h2></div></div><Panel title="Letzte Änderungen">{loading?<p>Daten werden geladen…</p>:entries.length===0?<p>Noch keine protokollierten Änderungen.</p>:entries.map((e,i)=><div className="taskMini" key={e.id||i}><span>{e.action}</span><div><strong>{e.entity_type} {e.entity_id||""}</strong><small>{e.actor} · {e.created_at}</small></div></div>)}</Panel></>
}

function Kpi({label,value,note,onClick}){return <div className={"kpi"+(onClick?" clickable":"")} onClick={onClick} role={onClick?"button":undefined}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>}
function Panel({title,children,action,onClick}){return <section className="panel"><div className="panelTitle"><h3>{title}</h3>{action&&<button className="panelAction" onClick={onClick}>{action}</button>}</div>{children}</section>}

const styles=`
*{box-sizing:border-box}.app{min-height:100vh;background:#f5f7fa;color:#101828;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.topbar{background:#101828;color:#fff;padding:28px max(22px,calc((100vw - 1400px)/2));display:flex;justify-content:space-between;gap:30px}.eyebrow{font-size:10px;font-weight:800;letter-spacing:.14em;color:#98a2b3}.topbar h1{font-size:34px;letter-spacing:-.035em;margin:7px 0}.topbar p{margin:0;color:#c0c5d0}.topActions{display:flex;gap:8px;align-items:flex-start}.topActions a,.live{padding:9px 11px;border:1px solid #344054;border-radius:8px;color:#fff;text-decoration:none;font-size:12px}.live{background:#1d2939}.live i{display:inline-block;width:7px;height:7px;border-radius:50%;background:#12b76a;margin-right:6px}.layout{display:grid;grid-template-columns:220px minmax(0,1fr);max-width:1400px;margin:auto}.sidebar{background:#fff;border-right:1px solid #e4e7ec;min-height:calc(100vh - 116px);padding:18px 12px}.sidebar button,.sideBottom a{width:100%;display:flex;gap:10px;align-items:center;border:0;background:transparent;text-align:left;padding:11px 12px;border-radius:8px;color:#475467;text-decoration:none;font:inherit;cursor:pointer}.sidebar button:hover,.sidebar .selected{background:#f2f4f7;color:#101828}.sidebar button b{width:20px}.sideBottom{border-top:1px solid #eaecf0;margin-top:18px;padding-top:14px}.sideAreas{border-bottom:1px solid #eaecf0;margin-bottom:10px;padding-bottom:10px}.sideAreas span{display:block;font-size:10px;font-weight:800;letter-spacing:.12em;color:#98a2b3;text-transform:uppercase;padding:4px 12px}.sideAreas a{display:block;padding:9px 12px;border-radius:8px;color:#101828;text-decoration:none;font-weight:600}.sideAreas a:hover{background:#f2f4f7}.sideBottom a{font-size:12px}.content{padding:28px;min-width:0}.pageTitle{display:flex;justify-content:space-between;align-items:end;gap:15px;margin-bottom:18px}.pageTitle>div>span{font-size:10px;font-weight:800;letter-spacing:.13em;color:#667085}.pageTitle h2{margin:5px 0 0;font-size:28px;letter-spacing:-.03em}.quick{display:flex;gap:8px}.quick a,.primaryLink{padding:9px 11px;background:#101828;color:#fff;border-radius:8px;text-decoration:none;font-size:12px}.areaNav{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:14px}.areaNav a,.areaNav button{display:block;text-align:left;background:#fff;border:1px solid #e4e7ec;border-radius:12px;padding:14px;color:#101828;text-decoration:none;font:inherit;cursor:pointer}.areaNav a:hover,.areaNav button:hover{border-color:#101828}.areaNav b{display:block;font-size:15px}.areaNav small{display:block;color:#667085;font-size:11px;margin-top:3px}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.kpi{background:#fff;border:1px solid #e4e7ec;border-radius:12px;padding:17px}.kpi span,.kpi small{display:block;color:#667085;font-size:12px}.kpi strong{display:block;font-size:30px;letter-spacing:-.03em;margin:8px 0 3px}.columns{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px}.panel{background:#fff;border:1px solid #e4e7ec;border-radius:12px;padding:19px;margin-top:14px}.panelTitle{display:flex;justify-content:space-between;margin-bottom:13px}.panel h3{margin:0;font-size:16px}.row,.taskMini,.taskRow{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #eaecf0}.row:last-child,.taskMini:last-child{border-bottom:0}.row>div,.taskMini>div,.taskRow>div{flex:1}.row strong,.taskMini strong,.taskRow strong{display:block}.row small,.taskMini small,.taskRow small{display:block;color:#667085;font-size:12px;margin-top:3px}.row>span{font-size:11px;color:#667085}.taskMini>span{font-size:10px;border-radius:999px;background:#f2f4f7;padding:5px 7px}.taskMini>i.businessBadge{font-style:normal;font-size:10px;border-radius:999px;background:#eef2ff;color:#3538cd;padding:5px 7px;white-space:nowrap}.taskMini .high{background:#fef3f2;color:#b42318}.systemGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.system{border:1px solid #eaecf0;border-radius:10px;padding:13px}.system small,.system p{display:block;color:#667085;font-size:12px;margin:5px 0 0;line-height:1.4}.system button{margin-top:9px;border:1px solid #d0d5dd;background:#fff;border-radius:7px;padding:7px 9px;cursor:pointer}.businessGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:13px}.businessCard{background:#fff;border:1px solid #e4e7ec;border-radius:12px;padding:18px}.cardHead{display:flex;justify-content:space-between;gap:10px}.cardHead span{font-size:10px;color:#667085}.cardHead h3{margin:5px 0;font-size:20px}.cardHead em{font-size:10px;font-style:normal;background:#f2f4f7;padding:6px 8px;border-radius:999px;height:max-content}.businessCard p{color:#667085;font-size:13px}.liveStatusBox{margin-top:10px;padding:10px 12px;border-radius:9px;font-size:12px;display:flex;flex-direction:column;gap:3px}.liveStatusBox.unconfigured{background:#f2f4f7;color:#475467;border:1px dashed #d0d5dd}.liveStatusBox.error{background:#fffaeb;color:#93370d;border:1px solid #fedf89}.liveStatusBox.ok{background:#ecfdf3;color:#067647;border:1px solid #abefc6}.liveStatusBox strong{font-size:12px}.liveStatusBox small{color:#667085}.chips{display:flex;gap:5px;flex-wrap:wrap}.chips i{font-style:normal;font-size:10px;border:1px solid #eaecf0;padding:5px 7px;border-radius:6px}.cardActions{display:flex;gap:8px;margin-top:16px}.cardActions a,.cardActions button{border:1px solid #d0d5dd;background:#fff;color:#344054;border-radius:7px;padding:8px 10px;text-decoration:none;font:inherit;font-size:12px;cursor:pointer}.cardActions a{background:#101828;color:#fff}.search{border:1px solid #d0d5dd;border-radius:8px;padding:9px 11px;width:190px}.taskTable{background:#fff;border:1px solid #e4e7ec;border-radius:12px;padding:0 18px}.taskRow>span,.taskRow>em,.taskRow>i.businessBadge{font-size:11px;font-style:normal;padding:6px 8px;background:#f2f4f7;border-radius:999px}.taskRow>i.businessBadge{background:#eef2ff;color:#3538cd}.editMini{border:1px solid #d0d5dd;background:#fff;border-radius:7px;padding:7px 9px;font-size:11px;cursor:pointer}.check{width:27px;height:27px;border-radius:7px;border:1px solid #d0d5dd;background:#fff;cursor:pointer}.check.done{background:#12b76a;color:#fff;border-color:#12b76a}.big{margin-top:0}.big .system{min-height:125px}.automationGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:13px}.automationGrid article{background:#fff;border:1px solid #e4e7ec;border-radius:12px;padding:18px}.automationGrid span{font-size:10px;color:#667085}.automationGrid h3{margin:8px 0}.automationGrid p{color:#667085;font-size:13px;line-height:1.5}.rules{display:grid;gap:11px}.rules b{padding:12px;background:#f9fafb;border:1px solid #eaecf0;border-radius:8px}.notice{background:#ecfdf3;border:1px solid #abefc6;color:#067647;padding:10px 12px;border-radius:8px;margin-bottom:14px;font-size:12px;display:flex;justify-content:space-between}.notice button{border:0;background:transparent;cursor:pointer}.modalBack{position:fixed;inset:0;background:rgba(16,24,40,.45);display:grid;place-items:center;padding:20px;z-index:20}.modal{background:#fff;border-radius:13px;width:min(460px,100%);padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.2)}.modalHead{display:flex;justify-content:space-between}.modalHead h3{margin:0 0 15px}.modalHead button{border:0;background:transparent;font-size:22px;cursor:pointer}.modal label{display:block;font-size:12px;font-weight:700;margin-top:12px}.modal input,.modal select{display:block;width:100%;margin-top:5px;padding:10px;border:1px solid #d0d5dd;border-radius:7px}.modalActions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.modalActions button{padding:9px 12px;border:1px solid #d0d5dd;background:#fff;border-radius:7px;cursor:pointer}.modalActions .primary{background:#101828;color:#fff}.primaryLink{display:inline-block}.kpi.clickable{cursor:pointer}.kpi.clickable:hover{border-color:#98a2b3}.panelAction{border:0;background:transparent;color:#475467;font-size:12px;cursor:pointer;text-decoration:underline}.alertList{display:grid;gap:10px}.alertCard{background:#fff;border:1px solid #fedf89;background:#fffaeb;border-radius:10px;padding:14px}.alertCard span{font-size:10px;font-weight:700;color:#93370d}.alertCard strong{display:block;margin:5px 0 3px}.alertCard p{margin:0;color:#667085;font-size:13px}.autoBadge{display:inline-block;font-style:normal;font-size:10px;background:#eef2ff;color:#3538cd;padding:3px 7px;border-radius:999px;margin-left:8px;vertical-align:middle}.autoHint{color:#98a2b3;font-style:italic}footer{max-width:1400px;margin:auto;padding:18px 28px 30px;color:#667085;font-size:11px}@media(max-width:900px){.areaNav{grid-template-columns:repeat(3,1fr)}.layout{grid-template-columns:1fr}.sidebar{min-height:auto;border-right:0;border-bottom:1px solid #e4e7ec;display:flex;overflow:auto}.sidebar button{min-width:max-content}.sideBottom{display:none}.sideAreas{display:flex;border-bottom:0;margin:0;padding:0}.sideAreas span{display:none}.sideAreas a{min-width:max-content}.kpis,.systemGrid{grid-template-columns:1fr 1fr}.columns,.businessGrid,.automationGrid{grid-template-columns:1fr}}@media(max-width:600px){.topbar{display:block}.topActions{margin-top:15px}.content{padding:18px}.kpis,.systemGrid{grid-template-columns:1fr}.pageTitle{display:block}.quick{margin-top:12px}.search{width:100%;margin-top:12px}}
`;
