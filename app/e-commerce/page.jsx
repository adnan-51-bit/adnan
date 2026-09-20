"use client";

import { useEffect, useState } from "react";

const next = [
  ["01","Konkrete Lieferantenpreise","EK, Versand und Händlerkonditionen verifizieren.","🟡"],
  ["02","Produktfreigabe","Nur Produkte mit vollständigem Quality Gate freigeben.","⚪"],
  ["03","Shop","Produktseiten, Checkout und Bestellprozess fertigstellen.","⚪"],
  ["04","Bestellung","Zahlung → Lieferant → Tracking → Kunde abbilden.","⚪"],
  ["05","Finanzen","Umsatz, Kosten, Marge, Gebühren und Retouren sauber erfassen.","⚪"]
];

export default function Ecommerce() {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/orders?type=products").then(r => r.json()),
      fetch("/api/orders?type=suppliers").then(r => r.json()),
      fetch("/api/orders?type=customers").then(r => r.json()),
      fetch("/api/orders?type=orders").then(r => r.json()),
      fetch("/api/orders?type=returns").then(r => r.json()),
    ]).then(([p, s, c, o, r]) => {
      setProducts(p.products || []); setSuppliers(s.suppliers || []); setCustomers(c.customers || []);
      setOrders(o.orders || []); setReturns(r.returns || []);
      setLoading(false);
    });
  }, []);

  const published = products.filter(p => p.pipeline_status === "PUBLISHED").length;
  const verifiziert = suppliers.filter(s => s.status === "verifiziert").length;

  const cards = [
    ["Produkte", loading ? "…" : `${products.length} Kandidaten`, "/produkt-pipeline"],
    ["Lieferanten", loading ? "…" : `${suppliers.length} recherchiert · ${verifiziert} verifiziert`, "/lieferanten"],
    ["Produkt-Pipeline", loading ? "…" : `${published} veröffentlicht`, "/produkt-pipeline"],
    ["Kunden", loading ? "…" : `${customers.length}`, "/kunden"],
    ["Bestellungen", loading ? "…" : `${orders.length}`, "/bestellungen"],
    ["Retouren", loading ? "…" : `${returns.length}`, "/retouren"],
    ["Shop-Kalkulation", "Modellrechnung", "/shop"],
    ["Automationen", "Gate-Logik aktiv", "/automation"],
  ];

  return <main className="shell">
    <header>
      <div className="eyebrow">MASTER-ZENTRALE · E-COMMERCE</div>
      <h1>E-Commerce-Zentrale</h1>
      <p>Produkte finden, Lieferanten prüfen, Kosten rechnen und erst danach verkaufen.</p>
    </header>
    <nav>
      <a href="/zentral">← Master-Zentrale</a><a href="/shop">Kalkulation</a>
      <a href="/lieferanten">Lieferanten</a><a href="/produkt-pipeline">Produkt-Pipeline</a>
      <a href="/kunden">Kunden</a><a href="/bestellungen">Bestellungen</a><a href="/retouren">Retouren</a><a href="/automation">Automationen</a>
    </nav>
    <section className="banner"><div><span>AKTUELLER STATUS</span><strong>{loading ? "…" : published > 0 ? `🟢 ${published} Produkt(e) live` : "🟡 Aufbau & Validierung"}</strong><p>{loading ? "" : published > 0 ? "" : "Noch kein Produkt ist für den echten Verkauf freigegeben."}</p></div><div className="rule">Keine Bestellung · keine Werbung · keine kostenpflichtige Integration ohne Freigabe</div></section>
    <section className="grid">
      {cards.map(([title,value,href])=><a className="card" href={href} key={title}><span>{title}</span><b>{value}</b><small>Bereich öffnen →</small></a>)}
    </section>
    <section className="panel">
      <span className="eyebrow">NÄCHSTE PHASE</span><h2>Vom Kandidaten zum echten Produkt</h2>
      {next.map(([n,t,d,s])=><div className="row" key={n}><strong>{n}</strong><div><b>{t}</b><p>{d}</p></div><span>{s}</span></div>)}
    </section>
    <section className="panel source"><span className="eyebrow">RECHERCHE-REGEL</span><h2>Direktversand ist möglich, aber nicht automatisch Produktfreigabe.</h2><p>ChiliTec bestätigt neutralen Direktversand in Deutschland und nennt 7,50 € Versand je Paket sowie 10 € netto Mindestbestellwert. T.M. Textil nennt 900+ Heimtextil-SKUs, neutralen Versand und Live-Produktdaten. CLP bestätigt Versand im Namen des Händlers für sein Home-&-Living-Sortiment. Diese Anbieterinformationen (jetzt unter <a href="/lieferanten">Lieferanten</a> als echte, bearbeitbare Datensätze statt reinem Fließtext) sind Grundlage für weitere Prüfungen; Händler-EK und konkrete Produktmargen müssen separat verifiziert werden.</p></section>
    <style jsx>{styles}</style>
  </main>
}
const styles=`
*{box-sizing:border-box}.shell{min-height:100vh;background:#f6f7f9;color:#101828;font-family:Inter,system-ui,sans-serif;padding:38px 24px}header,nav,.banner,.grid,.panel{max-width:1240px;margin:auto}header{padding:12px 0 24px}.eyebrow{font-size:11px;font-weight:800;letter-spacing:.12em;color:#667085}h1{font-size:clamp(38px,5vw,62px);line-height:1;letter-spacing:-.05em;margin:8px 0 13px}header p{color:#667085;font-size:17px}nav{display:flex;gap:8px;flex-wrap:wrap;border-bottom:1px solid #e4e7ec;padding-bottom:18px}nav a{padding:9px 12px;border:1px solid #d0d5dd;background:#fff;border-radius:8px;text-decoration:none;color:#344054;font-size:13px}nav .active{background:#101828;color:#fff}.banner{margin-top:18px;background:#101828;color:#fff;border-radius:14px;padding:20px;display:flex;justify-content:space-between;gap:20px;align-items:center;flex-wrap:wrap}.banner span{display:block;color:#98a2b3;font-size:10px;font-weight:800;letter-spacing:.12em}.banner strong{display:block;font-size:21px;margin-top:5px}.banner p{color:#d0d5dd;margin:6px 0 0}.rule{max-width:390px;border:1px solid #344054;border-radius:10px;padding:12px;color:#d0d5dd;font-size:12px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:14px}.card{background:#fff;border:1px solid #e4e7ec;border-radius:14px;padding:19px;text-decoration:none;color:#101828}.card span{display:block;color:#667085;font-size:12px}.card b{display:block;font-size:19px;margin:8px 0}.card small{color:#175cd3}.panel{background:#fff;border:1px solid #e4e7ec;border-radius:14px;padding:21px;margin-top:14px}.panel h2{margin:6px 0 0;font-size:21px}.row{display:grid;grid-template-columns:50px 1fr 30px;gap:14px;padding:15px 0;border-bottom:1px solid #eaecf0}.row:last-child{border:0}.row>strong{color:#667085}.row b{font-size:14px}.row p{color:#667085;font-size:13px;line-height:1.5}.source p{max-width:900px;color:#667085;font-size:13px;line-height:1.5}.source p a{color:#175cd3}.source{margin-bottom:25px}@media(max-width:900px){.grid{grid-template-columns:1fr 1fr}.banner{display:block}.rule{margin-top:14px}}@media(max-width:520px){.grid{grid-template-columns:1fr}.shell{padding:22px 14px}}`;
