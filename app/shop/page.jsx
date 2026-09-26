"use client";

import { useMemo, useState } from "react";

const products = [
  {id:1,name:"Kofferraum-Organizer",category:"Auto",cost:7.5,shipping:3.9,price:24.99,market:"Testkandidat",risk:"Niedrig"},
  {id:2,name:"Kofferraum-Fixierung",category:"Auto",cost:5.2,shipping:3.5,price:19.99,market:"Testkandidat",risk:"Niedrig"},
  {id:3,name:"Rücksitz-Organizer",category:"Auto",cost:5.8,shipping:3.9,price:21.99,market:"Testkandidat",risk:"Niedrig"},
  {id:4,name:"Auto-Innenraum-Organizer",category:"Auto",cost:6.9,shipping:3.9,price:22.99,market:"Testkandidat",risk:"Niedrig"},
  {id:5,name:"Tierhaarentferner",category:"Haustier",cost:3.2,shipping:3.5,price:14.99,market:"Testkandidat",risk:"Niedrig"},
  {id:6,name:"Hunde-Reisedusche",category:"Haustier",cost:6.8,shipping:4.5,price:21.99,market:"Testkandidat",risk:"Mittel"},
  {id:7,name:"Fussel-/Tierhaarrolle",category:"Haustier",cost:2.2,shipping:3.5,price:12.99,market:"Testkandidat",risk:"Niedrig"},
  {id:8,name:"Schubladen-Organizer",category:"Haushalt",cost:4.9,shipping:4.2,price:19.99,market:"Testkandidat",risk:"Niedrig"},
  {id:9,name:"Kabel-Organizer",category:"Haushalt",cost:3.5,shipping:3.5,price:16.99,market:"Testkandidat",risk:"Niedrig"},
  {id:10,name:"Reise-Organizer-Set",category:"Reise",cost:5.5,shipping:4.5,price:24.99,market:"Testkandidat",risk:"Niedrig"},
  {id:11,name:"Aufbewahrungskorb",category:"Haushalt",cost:7.5,shipping:5.9,price:24.99,market:"Testkandidat",risk:"Mittel"},
  {id:12,name:"Garten-Bewässerungsset",category:"Garten",cost:10.5,shipping:5.5,price:34.99,market:"Testkandidat",risk:"Mittel"},
  {id:13,name:"Micro-Drip-Zubehör",category:"Garten",cost:5.5,shipping:4.2,price:19.99,market:"Testkandidat",risk:"Mittel"},
  {id:14,name:"Fahrrad-Handyhalterung",category:"Fahrrad",cost:5.9,shipping:3.9,price:19.99,market:"Testkandidat",risk:"Mittel"},
  {id:15,name:"Fahrrad-Zubehörset",category:"Fahrrad",cost:7.5,shipping:4.2,price:24.99,market:"Testkandidat",risk:"Mittel"},
  {id:16,name:"Brillen-Etui",category:"Reise",cost:4.5,shipping:3.5,price:19.99,market:"Testkandidat",risk:"Mittel"},
  {id:17,name:"Mikrofaser-Reinigungsset",category:"Haushalt",cost:4.8,shipping:4.0,price:19.99,market:"Testkandidat",risk:"Niedrig"},
  {id:18,name:"Textil-Reinigungsset",category:"Haushalt",cost:6.2,shipping:4.5,price:24.99,market:"Testkandidat",risk:"Mittel"},
  {id:19,name:"Hunde-Autozubehör",category:"Haustier",cost:9.5,shipping:5.5,price:34.99,market:"Testkandidat",risk:"Hoch"},
  {id:20,name:"Elektronik-Kabeltasche",category:"Haushalt",cost:4.5,shipping:3.9,price:21.99,market:"Testkandidat",risk:"Niedrig"}
];

const channels = { shop:0.029+0.35/25, ebay:0.13+0.45/25, amazon:0.13+0.99/25 };
function margin(p,channel,ads){ const fee=p.price*channels[channel]; return p.price-p.cost-p.shipping-fee-ads; }

export default function Shop(){
 const [filter,setFilter]=useState("Alle");
 const [channel,setChannel]=useState("shop");
 const [ads,setAds]=useState(3);
 const list=useMemo(()=>products.filter(p=>filter==="Alle"||p.category===filter),[filter]);
 const cats=["Alle",...new Set(products.map(p=>p.category))];
 return <main className="page">
  <header><div><p className="eyebrow">ONLINE-SHOP · TESTSYSTEM</p><h1>Produkt- & Gewinnzentrale</h1><p className="muted">Produkte, Verkaufspreise und Deckungsbeitrag auf einen Blick.</p></div><span className="badge">🟡 TESTDATEN</span></header>
  <nav><a href="/">Projektzentrale</a><a className="active" href="/shop">Shop & Produkte</a></nav>
  <section className="controls"><label>Vertrieb <select value={channel} onChange={e=>setChannel(e.target.value)}><option value="shop">Eigener Shop</option><option value="ebay">eBay</option><option value="amazon">Amazon</option></select></label><label>Werbekosten/Bestellung € <input type="number" min="0" step="0.10" value={ads} onChange={e=>setAds(Number(e.target.value))}/></label><label>Kategorie <select value={filter} onChange={e=>setFilter(e.target.value)}>{cats.map(c=><option key={c}>{c}</option>)}</select></label></section>
  <section className="cards"><div><span>Produkte</span><b>{products.length}</b></div><div><span>Ø Verkaufspreis</span><b>{(products.reduce((s,p)=>s+p.price,0)/products.length).toFixed(2)} €</b></div><div><span>Positive Testmarge</span><b>{products.filter(p=>margin(p,channel,ads)>0).length}/{products.length}</b></div><div><span>Hinweis</span><b>Keine echten Lieferanten</b></div></section>
  <section className="table"><table><thead><tr><th>Produkt</th><th>Einkauf</th><th>Versand</th><th>Verkauf</th><th>Marktplatzgebühr</th><th>Werbung</th><th>Deckungsbeitrag</th><th>Risiko</th></tr></thead><tbody>{list.map(p=>{const fee=p.price*channels[channel];const m=margin(p,channel,ads);return <tr key={p.id}><td><b>{p.name}</b><small>{p.category}</small></td><td>{p.cost.toFixed(2)} €</td><td>{p.shipping.toFixed(2)} €</td><td>{p.price.toFixed(2)} €</td><td>{fee.toFixed(2)} €</td><td>{ads.toFixed(2)} €</td><td className={m>0?"good":"bad"}>{m.toFixed(2)} €</td><td>{p.risk}</td></tr>})}</tbody></table></section>
  <div className="note"><b>Wichtig:</b> Einkauf, Versand und Verkaufspreise sind zunächst Modellannahmen zur Kalkulation. Vor einem echten Verkauf müssen Lieferant, EU-/DE-Versand, Produktkonformität, Retouren und tatsächliche Gebühren verifiziert werden.</div>
  <footer>Stand 20.09.2026 · Testsystem · keine echten Bestellungen</footer>
  <style jsx>{`
  .page{max-width:1250px;margin:auto;padding:40px 24px;font-family:Arial,sans-serif;color:#15171a}.eyebrow{font-size:12px;letter-spacing:.12em;font-weight:700;color:#667085}h1{font-size:34px;margin:6px 0}.muted,small,footer,.note{color:#667085}.badge{float:right;margin-top:-50px;padding:8px 12px;border-radius:999px;background:#fef0c7;color:#b54708;font-weight:700}nav{display:flex;gap:10px;margin:25px 0}nav a{padding:9px 13px;border:1px solid #d0d5dd;border-radius:8px;text-decoration:none;color:#15171a}nav .active{background:#15171a;color:white}.controls{display:flex;gap:18px;flex-wrap:wrap;background:#f8f9fb;border:1px solid #e4e7ec;padding:16px;border-radius:12px}.controls label{display:flex;gap:7px;align-items:center;font-size:14px;flex-wrap:wrap;max-width:100%}.controls input{max-width:100%}.controls select,.controls input{padding:8px;border:1px solid #d0d5dd;border-radius:8px}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:18px 0}.cards div{border:1px solid #e4e7ec;border-radius:12px;padding:18px;background:#fff}.cards span{display:block;color:#667085;font-size:13px}.cards b{display:block;font-size:22px;margin-top:8px}.table{border:1px solid #e4e7ec;border-radius:12px;overflow:auto}table{width:100%;border-collapse:collapse}th,td{padding:13px;border-bottom:1px solid #eaecf0;text-align:left;font-size:13px;white-space:nowrap}th{color:#667085;font-size:11px;text-transform:uppercase}.good{font-weight:700}.bad{font-weight:700}.note{margin-top:16px;padding:14px;background:#f8f9fb;border-radius:10px;font-size:13px}footer{margin-top:20px;font-size:12px}@media(max-width:800px){.cards{grid-template-columns:repeat(2,1fr)}}`}</style>
 </main>
}
