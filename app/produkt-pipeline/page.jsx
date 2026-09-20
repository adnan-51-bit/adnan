"use client";

import { useMemo, useState } from "react";

const products = [
  {id:"auto-organizer",product:"Kofferraum-Organizer",category:"Auto & Ordnung",supplier:"Laprinta / weitere prüfen",supplierCost:null,shipping:"offen",sale:24.99,drop:"offen",status:"🟡",next:"Direktversand-Partner und Gesamtkosten prüfen"},
  {id:"drawer",product:"Schubladen-Organizer",category:"Haushalt",supplier:"Salzmann / Lieferantenmarkt",supplierCost:1.21,shipping:"offen",sale:18.90,drop:"offen",status:"🟡",next:"Dropshipping-Lieferant mit kleiner MOQ finden"},
  {id:"dog-bottle",product:"Hunde-Reisetrinkflasche",category:"Tierbedarf",supplier:"B2B-Anbieter",supplierCost:null,shipping:"offen",sale:19.90,drop:"offen",status:"🟡",next:"Direktversand + EK verifizieren"},
  {id:"cable",product:"Kabel-Organizer 5er",category:"Ordnung & Zubehör",supplier:"ChiliTec · Art. 22713",supplierCost:null,shipping:"7,50 € / Paket DE",sale:19.90,drop:"ja",status:"🟡",next:"Händler-EK nach Login + Retourenprozess prüfen"},
  {id:"textile",product:"Heimtextilien",category:"Wohnen",supplier:"T.M. Textil · 900+ SKUs",supplierCost:null,shipping:"offen",sale:29.90,drop:"ja",status:"🟡",next:"Händlerkonto + konkretes Produkt + EK prüfen"},
  {id:"garden",product:"Garten-Organizer/Zubehör",category:"Garten",supplier:"EU/DE Dropshipping",supplierCost:null,shipping:"offen",sale:29.90,drop:"offen",status:"⚪",next:"Produktrecherche starten"}
];

export default function ProduktPipeline(){
 const [category,setCategory]=useState("Alle");
 const [show,setShow]=useState("Alle");
 const visible=useMemo(()=>products.filter(p=>(category==="Alle"||p.category===category)&&(show==="Alle"||p.drop===show)),[category,show]);
 return <main className="shell">
  <header><div className="eyebrow">E-COMMERCE · PRODUCT × SUPPLIER</div><h1>Produkt-Pipeline</h1><p>Mehrere Produkte, mehrere Lieferanten, ein Quality Gate. Noch kein Produkt ist freigegeben.</p></header>
  <nav><a href="/lieferanten">Lieferanten</a><a href="/shop">Kalkulation</a><a href="/zentral">Master-Zentrale</a></nav>
  <section className="stats"><div><b>{products.length}</b><span>Kandidaten</span></div><div><b>{products.filter(p=>p.drop==="ja").length}</b><span>Produkte mit bestätigtem Direktversand</span></div><div><b>0</b><span>Produkte freigegeben</span></div><div><b>0 €</b><span>ausgegeben</span></div></section>
  <section className="panel">
   <div className="filters"><select value={category} onChange={e=>setCategory(e.target.value)}><option>Alle</option>{[...new Set(products.map(p=>p.category))].map(x=><option key={x}>{x}</option>)}</select><select value={show} onChange={e=>setShow(e.target.value)}><option>Alle</option><option>ja</option><option>nein</option><option>offen</option></select></div>
   <div className="table"><div className="row head"><span>Produkt</span><span>Lieferant</span><span>EK</span><span>Versand</span><span>Verkauf</span><span>Direktversand</span><span>Status</span></div>
   {visible.map(p=><div className="row" key={p.id}><strong>{p.product}<small>{p.category}</small></strong><span>{p.supplier}</span><span>{p.supplierCost===null?"offen":p.supplierCost.toFixed(2)+" €"}</span><span>{p.shipping}</span><span>{p.sale.toFixed(2)} €</span><span>{p.drop}</span><span>{p.status}</span></div>)}</div>
  </section>
  <section className="panel"><span className="eyebrow">NÄCHSTE SCHRITTE</span><h2>Automatische Prüfmatrix</h2><div className="checks">{["Lieferant bestätigt","Direktversand","Einkauf + Versand","Lieferzeit","Retouren","GPSR/Produktdaten","Gebühren","Marketingkosten","Deckungsbeitrag","Testbestellung"].map((x,i)=><div key={x}><b>{String(i+1).padStart(2,"0")}</b>{x}</div>)}</div><p className="note">Ein Produkt wird erst 🟢, wenn die für den Verkauf notwendigen Daten belastbar geprüft sind. Unbekannte Werte bleiben offen und werden nicht als Gewinn dargestellt.</p></section>
  <style jsx>{styles}</style>
 </main>
}
const styles=`
*{box-sizing:border-box}.shell{min-height:100vh;background:#f6f7f9;color:#101828;font-family:Inter,system-ui,sans-serif;padding:35px 24px}header,nav,.stats,.panel{max-width:1240px;margin:auto}header{padding:10px 0 24px}.eyebrow{font-size:11px;font-weight:800;letter-spacing:.12em;color:#667085}h1{font-size:clamp(36px,5vw,60px);line-height:1;letter-spacing:-.045em;margin:8px 0 13px}header p{color:#667085;font-size:17px}nav{display:flex;gap:8px;border-bottom:1px solid #e4e7ec;padding-bottom:18px}nav a{padding:9px 12px;border:1px solid #d0d5dd;background:#fff;border-radius:8px;text-decoration:none;color:#344054;font-size:13px}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:14px}.stats div{background:#101828;color:#fff;border-radius:12px;padding:18px}.stats b{display:block;font-size:28px}.stats span{font-size:12px;color:#d0d5dd}.panel{background:#fff;border:1px solid #e4e7ec;border-radius:14px;padding:20px;margin-top:14px}.filters{display:flex;gap:8px;margin-bottom:15px}.filters select{padding:9px;border:1px solid #d0d5dd;border-radius:8px}.table{border:1px solid #eaecf0;border-radius:10px;overflow:auto}.row{display:grid;grid-template-columns:1.3fr 1.3fr .55fr .8fr .65fr .8fr .5fr;gap:10px;align-items:center;padding:13px 14px;border-top:1px solid #eaecf0;font-size:12px;min-width:900px}.row.head{border-top:0;background:#f9fafb;color:#667085;font-size:11px;font-weight:800}.row strong{color:#101828}.row small{display:block;color:#98a2b3;font-weight:400;margin-top:3px}.checks{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:17px}.checks div{border:1px solid #eaecf0;border-radius:9px;background:#f9fafb;padding:12px;font-size:12px}.checks b{display:block;color:#667085;margin-bottom:6px}.note{color:#667085;font-size:13px;line-height:1.5}@media(max-width:800px){.stats{grid-template-columns:1fr 1fr}.checks{grid-template-columns:1fr 1fr}}@media(max-width:500px){.stats{grid-template-columns:1fr}.shell{padding:22px 14px}}`;
