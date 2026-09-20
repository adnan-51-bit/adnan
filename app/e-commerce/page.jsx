"use client";

import { useState } from "react";

const cards = [
  ["Produkte","20 Kandidaten","/shop"],
  ["Lieferanten","6 geprüft","/lieferanten"],
  ["Produkt-Pipeline","0 freigegeben","/produkt-pipeline"],
  ["Bestellungen","Noch nicht aktiv","#"],
  ["Retouren","Noch nicht aktiv","#"],
  ["Finanzen","Kalkulation vorhanden","/shop"]
];

const next = [
  ["01","Konkrete Lieferantenpreise","EK, Versand und Händlerkonditionen verifizieren.","🟡"],
  ["02","Produktfreigabe","Nur Produkte mit vollständigem Quality Gate freigeben.","⚪"],
  ["03","Shop","Produktseiten, Checkout und Bestellprozess fertigstellen.","⚪"],
  ["04","Bestellung","Zahlung → Lieferant → Tracking → Kunde abbilden.","⚪"],
  ["05","Finanzen","Umsatz, Kosten, Marge, Gebühren und Retouren sauber erfassen.","⚪"]
];

export default function Ecommerce() {
  const [filter,setFilter]=useState("alle");
  return <main className="shell">
    <header>
      <div className="eyebrow">MASTER-ZENTRALE · E-COMMERCE</div>
      <h1>E-Commerce-Zentrale</h1>
      <p>Produkte finden, Lieferanten prüfen, Kosten rechnen und erst danach verkaufen.</p>
    </header>
    <nav>
      <a href="/zentral">← Master-Zentrale</a><a className="active" href="/shop">Kalkulation</a>
      <a href="/lieferanten">Lieferanten</a><a href="/produkt-pipeline">Produkt-Pipeline</a><a href="/kunden-gewinnen">Kunden gewinnen</a>
    </nav>
    <section className="banner"><div><span>AKTUELLER STATUS</span><strong>🟡 Aufbau & Validierung</strong><p>Noch kein Produkt ist für den echten Verkauf freigegeben.</p></div><div className="rule">Keine Bestellung · keine Werbung · keine kostenpflichtige Integration ohne Freigabe</div></section>
    <section className="grid">
      {cards.map(([title,value,href])=><a className="card" href={href} key={title}><span>{title}</span><b>{value}</b><small>{href==="#"?"Bald verfügbar":"Bereich öffnen →"}</small></a>)}
    </section>
    <section className="panel">
      <div className="head"><div><span className="eyebrow">ARBEITSSTAND</span><h2>Was wir bereits haben</h2></div>
      <select value={filter} onChange={e=>setFilter(e.target.value)}><option value="alle">Alle</option><option value="offen">Offene Punkte</option></select></div>
      <div className="checks">
        <div><b>🟢 Lieferantenbasis</b><p>CLP, ChiliTec, T.M. Textil und weitere Anbieter sind dokumentiert.</p></div>
        <div><b>🟢 Produktrecherche</b><p>Kandidaten und erste Quellen sind dokumentiert.</p></div>
        <div><b>🟡 Kostenprüfung</b><p>Konkrete Händlerpreise und Versandkosten fehlen noch bei mehreren Produkten.</p></div>
        <div><b>🟡 Quality Gate</b><p>GPSR, Retouren, Gebühren und Testbestellung bleiben vor Freigabe offen.</p></div>
      </div>
    </section>
    <section className="panel">
      <span className="eyebrow">NÄCHSTE PHASE</span><h2>Vom Kandidaten zum echten Produkt</h2>
      {next.map(([n,t,d,s])=><div className="row" key={n}><strong>{n}</strong><div><b>{t}</b><p>{d}</p></div><span>{s}</span></div>)}
    </section>
    <section className="panel source"><span className="eyebrow">RECHERCHE-REGEL</span><h2>Direktversand ist möglich, aber nicht automatisch Produktfreigabe.</h2><p>ChiliTec bestätigt neutralen Direktversand in Deutschland und nennt 7,50 € Versand je Paket sowie 10 € netto Mindestbestellwert. T.M. Textil nennt 900+ Heimtextil-SKUs, neutralen Versand und Live-Produktdaten. CLP bestätigt Versand im Namen des Händlers für sein Home-&-Living-Sortiment. Diese Anbieterinformationen sind Grundlage für weitere Prüfungen; Händler-EK und konkrete Produktmargen müssen separat verifiziert werden.</p></section>
    <style jsx>{styles}</style>
  </main>
}
const styles=`
*{box-sizing:border-box}.shell{min-height:100vh;background:#f6f7f9;color:#101828;font-family:Inter,system-ui,sans-serif;padding:38px 24px}header,nav,.banner,.grid,.panel{max-width:1240px;margin:auto}header{padding:12px 0 24px}.eyebrow{font-size:11px;font-weight:800;letter-spacing:.12em;color:#667085}h1{font-size:clamp(38px,5vw,62px);line-height:1;letter-spacing:-.05em;margin:8px 0 13px}header p{color:#667085;font-size:17px}nav{display:flex;gap:8px;flex-wrap:wrap;border-bottom:1px solid #e4e7ec;padding-bottom:18px}nav a{padding:9px 12px;border:1px solid #d0d5dd;background:#fff;border-radius:8px;text-decoration:none;color:#344054;font-size:13px}nav .active{background:#101828;color:#fff}.banner{margin-top:18px;background:#101828;color:#fff;border-radius:14px;padding:20px;display:flex;justify-content:space-between;gap:20px;align-items:center}.banner span{display:block;color:#98a2b3;font-size:10px;font-weight:800;letter-spacing:.12em}.banner strong{display:block;font-size:21px;margin-top:5px}.banner p{color:#d0d5dd;margin:6px 0 0}.rule{max-width:390px;border:1px solid #344054;border-radius:10px;padding:12px;color:#d0d5dd;font-size:12px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:14px}.card{background:#fff;border:1px solid #e4e7ec;border-radius:14px;padding:19px;text-decoration:none;color:#101828}.card span{display:block;color:#667085;font-size:12px}.card b{display:block;font-size:21px;margin:8px 0}.card small{color:#175cd3}.panel{background:#fff;border:1px solid #e4e7ec;border-radius:14px;padding:21px;margin-top:14px}.head{display:flex;justify-content:space-between;align-items:start}.head h2,h2{margin:6px 0 0;font-size:21px}.head select{padding:9px;border:1px solid #d0d5dd;border-radius:8px}.checks{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-top:18px}.checks div{background:#f9fafb;border:1px solid #eaecf0;border-radius:10px;padding:14px}.checks b{font-size:13px}.checks p,.row p,.source p{color:#667085;font-size:13px;line-height:1.5}.row{display:grid;grid-template-columns:50px 1fr 30px;gap:14px;padding:15px 0;border-bottom:1px solid #eaecf0}.row:last-child{border:0}.row>strong{color:#667085}.row b{font-size:14px}.source p{max-width:900px}.source{margin-bottom:25px}@media(max-width:800px){.grid,.checks{grid-template-columns:1fr 1fr}.banner{display:block}.rule{margin-top:14px}}@media(max-width:520px){.grid,.checks{grid-template-columns:1fr}.shell{padding:22px 14px}}`;
