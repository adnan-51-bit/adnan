"use client";

import { useMemo, useState } from "react";

const businesses = [
  {
    id: "werknetz24",
    name: "Werknetz24",
    type: "Bestehender Betrieb",
    status: "EXTERNAL",
    color: "blue",
    description: "Telefonassistent, Kunden, Leads, Aufträge und Finanzen.",
    modules: ["Lisa / Telefon", "Kunden", "Leads", "Aufträge", "Angebote", "Rechnungen", "Finanzen", "Integrationen"],
    link: "https://werknetz24.de/admin-zentrale"
  },
  {
    id: "ecommerce",
    name: "E-Commerce",
    type: "Neuer Geschäftsbereich",
    status: "CODE EXISTS",
    color: "green",
    description: "Produkte, Lieferanten, Kalkulation, Shop und Gewinnkontrolle.",
    modules: ["Produkte", "Lieferanten", "Recherche", "Bestellungen", "Shop", "Marketing", "Retouren", "Finanzen"],
    link: "/shop"
  },
  {
    id: "future",
    name: "Weiterer Betrieb",
    type: "Vorbereitet",
    status: "OPEN",
    color: "gray",
    description: "Kann später ohne neue Zentrale ergänzt werden.",
    modules: ["Dashboard", "Kunden", "Aufgaben", "Finanzen", "Reports"],
    link: "#"
  }
];

const tools = [
  ["GitHub", "Code, Versionen, Issues, Dokumentation", "🟢"],
  ["Claude", "Entwicklung, Tests und Umsetzung", "🟢"],
  ["ChatGPT", "Führung, Recherche und Quality Gate", "🟢"],
  ["Linear", "Aufgaben und Projektsteuerung", "🟢"],
  ["Slack", "Meldungen und Betriebsinformationen", "🟢"],
  ["Context7", "Aktuelle technische Dokumentation", "🟢"],
  ["Notion / Obsidian", "Wissen und Entscheidungen", "🟢"],
  ["Canva", "Marketing und Design bei Bedarf", "🟢"]
];

export default function MasterZentrale() {
  const [selected, setSelected] = useState("all");
  const [tab, setTab] = useState("dashboard");
  const current = selected === "all" ? businesses : businesses.filter(b => b.id === selected);
  const connected = useMemo(() => businesses.filter(b => b.status === "CODE EXISTS").length, []);

  return (
    <main className="shell">
      <header className="hero">
        <div>
          <div className="eyebrow">MASTER-ZENTRALE · MULTI-BUSINESS CONTROL</div>
          <h1>Eine Zentrale für mehrere Betriebe.</h1>
          <p className="sub">Steuern, recherchieren, entwickeln und kontrollieren — ohne für jeden Betrieb ein neues System aufzubauen.</p>
        </div>
        <div className="status"><span /> TEST / PLANUNG</div>
      </header>

      <nav className="nav">
        {[
          ["dashboard","Übersicht"],["businesses","Betriebe"],["tools","Tools"],["plan","Arbeitsplan"]
        ].map(([id,label]) => <button key={id} className={tab===id ? "active":""} onClick={()=>setTab(id)}>{label}</button>)}
        <a href="/">Anfragen</a>
        <a href="/shop">E-Commerce</a>
        <a href="https://werknetz24.de/admin-zentrale">Werknetz24</a>
      </nav>

      <section className="selector">
        <div>
          <span className="label">AKTIVER BEREICH</span>
          <strong>{selected === "all" ? "Alle Betriebe" : businesses.find(b=>b.id===selected)?.name}</strong>
        </div>
        <select value={selected} onChange={e=>setSelected(e.target.value)}>
          <option value="all">Alle Betriebe</option>
          {businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </section>

      {tab === "dashboard" && <Dashboard current={current} connected={connected} />}
      {tab === "businesses" && <Businesses current={current} />}
      {tab === "tools" && <Tools />}
      {tab === "plan" && <Plan />}
      
      <style jsx>{styles}</style>
      <footer>
        <b>Wichtig:</b> Diese Zentrale zeigt nur Daten, die tatsächlich vorhanden oder technisch angebunden sind. EXTERNAL/OPEN bedeutet ausdrücklich: noch nicht verbunden bzw. noch nicht umgesetzt.
      </footer>
    </main>
  );
}

function Dashboard({current, connected}) {
  return <>
    <section className="metrics">
      <Card title="Betriebe" value={businesses.length} note="1 bestehend · 1 aktiv im Aufbau" />
      <Card title="Module geplant" value="25+" note="über mehrere Geschäftsbereiche" />
      <Card title="Geschäftsbereiche im Code" value={connected} note="aktuell im adnan-Projekt" />
      <Card title="Produktiv verbunden" value="0" note="keine Verbindung vortäuschen" />
    </section>
    <section className="grid">
      {current.map(b=><BusinessCard key={b.id} b={b}/>)}
    </section>
    <section className="panel">
      <div className="sectionHead"><div><span className="label">KONTROLLSYSTEM</span><h2>Unser Arbeitsfluss</h2></div><span className="pill">Kosten zuerst prüfen</span></div>
      <div className="flow">{["Recherche","Kosten-/Nutzenprüfung","Anforderung","Claude baut","Test","Quality Gate","Dokumentation","GitHub"].map((x,i)=><div key={x}><span>{i+1}</span>{x}</div>)}</div>
    </section>
  </>;
}

function Businesses({current}) {
  return <section className="grid">{current.map(b=><BusinessCard key={b.id} b={b} detailed/>)}</section>;
}

function BusinessCard({b,detailed}) {
  return <article className={"business " + b.color}>
    <div className="top"><div><span className="label">{b.type}</span><h2>{b.name}</h2></div><span className="badge">{b.status}</span></div>
    <p>{b.description}</p>
    <div className="modules">{b.modules.map(m=><span key={m}>{m}</span>)}</div>
    {detailed && b.link !== "#" && <a className="open" href={b.link}>Bereich öffnen →</a>}
    {b.id==="future" && <span className="muted">Noch nicht aktiviert</span>}
  </article>;
}

function Tools() {
  return <section className="panel">
    <div className="sectionHead"><div><span className="label">WERKZEUG-LANDSCHAFT</span><h2>Vorhandene Tools zuerst ausnutzen</h2></div></div>
    <div className="toolgrid">{tools.map(([name,desc,status])=><div className="tool" key={name}><div><b>{name}</b><p>{desc}</p></div><span>{status}</span></div>)}</div>
    <div className="warning"><b>Kostenregel</b><br/>Keine neuen kostenpflichtigen Dienste, APIs oder Werbebudgets ohne vorherige Kosten-/Nutzenprüfung und ausdrückliche Freigabe.</div>
  </section>;
}

function Plan() {
  return <section className="panel">
    <span className="label">AKTUELLER PLAN</span>
    <h2>Wir bauen nicht alles gleichzeitig.</h2>
    {[
      ["01","Master-Zentrale","Betriebsstruktur und Navigation sauber aufbauen.","🟡"],
      ["02","E-Commerce","Produkte, Lieferanten und reale Kosten prüfen.","🟡"],
      ["03","Persistenz","Zentrale Datenbank statt Browser-only Daten.","⚪"],
      ["04","Automationen","E-Mail, Reports, Benachrichtigungen und Follow-ups.","⚪"],
      ["05","Integrationen","Werknetz24 und weitere Systeme kontrolliert anbinden.","⚪"],
      ["06","Live-Betrieb","Erst nach Tests, Datenschutz- und Kostenprüfung.","⚪"]
    ].map(([n,t,d,s])=><div className="planrow" key={n}><span className="num">{n}</span><div><b>{t}</b><p>{d}</p></div><span>{s}</span></div>)}
  </section>;
}

function Card({title,value,note}) { return <div className="metric"><span>{title}</span><strong>{value}</strong><small>{note}</small></div>; }

const styles = `
  *{box-sizing:border-box}.shell{min-height:100vh;background:#f6f7f9;color:#101828;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:38px 28px}.hero,.nav,.selector,.metrics,.grid,.panel,footer{max-width:1240px;margin-left:auto;margin-right:auto}.hero{display:flex;justify-content:space-between;gap:28px;align-items:flex-start;padding:18px 0 26px}.eyebrow,.label{font-size:11px;font-weight:800;letter-spacing:.12em;color:#667085}.hero h1{font-size:clamp(32px,5vw,58px);letter-spacing:-.04em;line-height:1.02;margin:9px 0 14px;max-width:800px}.sub{font-size:17px;line-height:1.55;color:#667085;max-width:760px;margin:0}.status,.badge,.pill{border:1px solid #d0d5dd;background:#fff;border-radius:999px;padding:8px 12px;font-size:12px;font-weight:800;white-space:nowrap}.status span{display:inline-block;width:8px;height:8px;border-radius:50%;background:#f79009;margin-right:7px}.nav{display:flex;gap:7px;flex-wrap:wrap;border-bottom:1px solid #e4e7ec;padding-bottom:18px}.nav button,.nav a{border:1px solid #d0d5dd;background:#fff;color:#344054;border-radius:8px;padding:9px 12px;text-decoration:none;font:inherit;cursor:pointer}.nav .active{background:#101828;color:#fff;border-color:#101828}.selector{margin-top:22px;background:#101828;color:#fff;border-radius:14px;padding:18px 20px;display:flex;justify-content:space-between;align-items:center}.selector .label{color:#98a2b3;display:block}.selector strong{font-size:19px;display:block;margin-top:4px}.selector select{border-radius:8px;padding:10px 12px;border:0;background:#fff;color:#101828}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:14px}.metric,.business,.panel{background:#fff;border:1px solid #e4e7ec;border-radius:14px}.metric{padding:18px}.metric>span{color:#667085;font-size:12px}.metric strong{display:block;font-size:30px;margin:8px 0 4px;letter-spacing:-.03em}.metric small{color:#98a2b3}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:14px}.business{padding:20px}.business.blue{border-top:3px solid #175cd3}.business.green{border-top:3px solid #039855}.business.gray{border-top:3px solid #98a2b3}.top,.sectionHead{display:flex;justify-content:space-between;align-items:flex-start;gap:15px}.business h2,.panel h2{margin:6px 0 0;font-size:21px;letter-spacing:-.02em}.business p{color:#667085;line-height:1.5}.badge{font-size:10px;padding:6px 8px}.modules{display:flex;flex-wrap:wrap;gap:6px;margin-top:16px}.modules span{font-size:11px;border:1px solid #eaecf0;background:#f9fafb;padding:6px 8px;border-radius:7px}.open{display:inline-block;margin-top:18px;color:#175cd3;text-decoration:none;font-weight:700}.muted{color:#98a2b3}.panel{padding:22px;margin-top:14px}.pill{font-size:10px}.flow{display:grid;grid-template-columns:repeat(8,1fr);gap:8px;margin-top:20px}.flow div{border:1px solid #eaecf0;border-radius:9px;padding:11px;font-size:12px;background:#f9fafb}.flow span{display:block;font-weight:800;margin-bottom:8px}.toolgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:18px}.tool{display:flex;justify-content:space-between;gap:15px;border:1px solid #eaecf0;border-radius:10px;padding:13px}.tool p{margin:4px 0 0;color:#667085;font-size:13px}.warning{margin-top:14px;padding:14px;background:#fffaeb;border:1px solid #fedf89;border-radius:10px;font-size:13px;line-height:1.5}.planrow{display:grid;grid-template-columns:52px 1fr 30px;gap:14px;align-items:start;padding:15px 0;border-bottom:1px solid #eaecf0}.planrow:last-child{border-bottom:0}.num{font-weight:800;color:#667085}.planrow b{font-size:15px}.planrow p{margin:4px 0 0;color:#667085;font-size:13px}footer{padding:22px 0 5px;color:#667085;font-size:12px;line-height:1.5}@media(max-width:850px){.metrics,.grid{grid-template-columns:1fr 1fr}.flow{grid-template-columns:1fr 1fr}.hero,.selector{display:block}.status{display:inline-block;margin-top:16px}.selector select{margin-top:12px;width:100%}}@media(max-width:560px){.metrics,.grid,.toolgrid{grid-template-columns:1fr}.shell{padding:22px 15px}}
`;
