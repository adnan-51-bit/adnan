"use client";

import { useEffect, useState } from "react";

const STATUS_LABEL = {
  payment_pending: "Zahlung offen", paid: "Bezahlt", validated: "Geprüft", supplier_pending: "Lieferant offen",
  supplier_ordered: "Bei Lieferant bestellt", fulfilled: "Ausgeliefert", tracking_available: "Tracking vorhanden",
  delivered: "Zugestellt", cancelled: "Storniert", blocked: "🔴 Blockiert",
};

export default function BestellungenPage() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  async function reload() {
    const [oRes, pRes] = await Promise.all([
      fetch("/api/orders?type=orders").then(r => r.json()),
      fetch("/api/orders?type=products").then(r => r.json()),
    ]);
    setOrders(oRes.orders || []);
    setProducts(pRes.products || []);
    setLoading(false);
  }
  useEffect(() => { reload(); }, []);

  const productName = id => products.find(p => p.id === id)?.name || id;

  // Feuert das naechste im automation-Flow bekannte Event fuer diese Bestellung ab - der Server
  // (nicht diese Seite) entscheidet anhand echter Produkt-/Lieferantendaten, ob der Schritt
  // tatsaechlich ausgefuehrt wird oder die Bestellung stattdessen "blocked" wird.
  async function fireEvent(order, type) {
    const res = await fetch("/api/orders?type=orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: order.id, type }) });
    const data = await res.json();
    if (!res.ok) { setNotice("Fehler: " + data.error); return; }
    if (data.order.status === "blocked") {
      setNotice(`Bestellung ${order.id} wurde blockiert: ${data.gate.blockers.join(", ")}`);
    } else {
      setNotice(`Bestellung ${order.id} → ${STATUS_LABEL[data.order.status]}`);
    }
    reload();
  }

  return <main className="shell">
    <header><div className="eyebrow">E-COMMERCE · BESTELLUNGEN</div><h1>Bestellungen</h1><p>Zahlung → Prüfung → Lieferant → Versand → Tracking → Lieferung. Kein Schritt wird automatisch übersprungen.</p></header>
    <nav><a href="/e-commerce">← E-Commerce</a><a href="/kunden">Kunden</a><a href="/retouren">Retouren</a></nav>
    {notice && <div className="notice">{notice}<button onClick={() => setNotice("")}>×</button></div>}
    <section className="panel">
      <div className="head"><span className="eyebrow">LISTE</span><h2>{orders.length} Bestellung{orders.length === 1 ? "" : "en"}</h2></div>
      {loading ? <p className="muted">Lade…</p> : orders.length === 0 ? <p className="muted">Noch keine einzige echte Bestellung — es wurde noch nichts verkauft. Kein erfundener Bestand.</p> : <div className="table">
        <div className="row head"><span>ID</span><span>Positionen</span><span>Status</span><span></span></div>
        {orders.map(o => <div className="row" key={o.id}>
          <strong>{o.id}</strong>
          <span>{o.positionen.map(p => `${p.menge}× ${productName(p.produkt_id)}`).join(", ")}</span>
          <span className={o.status === "blocked" ? "blocked" : ""}>{STATUS_LABEL[o.status]}</span>
          <span className="actions">
            {o.status === "payment_pending" && <button onClick={() => fireEvent(o, "payment.confirmed")}>Zahlung bestätigen</button>}
            {o.status === "paid" && <button onClick={() => fireEvent(o, "order.created")}>Prüfen</button>}
            {o.status === "validated" && <button onClick={() => fireEvent(o, "order.validated")}>An Lieferanten</button>}
          </span>
        </div>)}
      </div>}
    </section>
    <section className="panel">
      <span className="eyebrow">SICHERHEITSREGEL</span><h2>Automation-Gate</h2>
      <p className="note">Jeder Schritt wird nur ausgeführt, wenn zum Zeitpunkt der Bestellung wirklich ein veröffentlichtes Produkt, ein verifizierter Lieferant und eine positive Marge in der Datenbank stehen — das wird bei jedem Klick neu geprüft, nie nur einmalig behauptet. Fehlt eine Voraussetzung, wird die Bestellung ehrlich als „🔴 Blockiert“ markiert statt sie stillschweigend durchlaufen zu lassen.</p>
    </section>
    <style jsx>{styles}</style>
  </main>;
}

const styles = `
*{box-sizing:border-box}.shell{min-height:100vh;background:#f6f7f9;color:#101828;font-family:Inter,system-ui,sans-serif;padding:35px 24px}header,nav,.panel{max-width:1240px;margin:auto}header{padding:10px 0 24px}.eyebrow{font-size:11px;font-weight:800;letter-spacing:.12em;color:#667085}h1{font-size:clamp(36px,5vw,54px);line-height:1;letter-spacing:-.04em;margin:8px 0 13px}header p{color:#667085;font-size:16px}nav{display:flex;gap:8px;border-bottom:1px solid #e4e7ec;padding-bottom:18px}nav a{padding:9px 12px;border:1px solid #d0d5dd;background:#fff;border-radius:8px;text-decoration:none;color:#344054;font-size:13px}.notice{max-width:1240px;margin:14px auto 0;background:#ecfdf3;border:1px solid #abefc6;color:#067647;padding:10px 12px;border-radius:8px;font-size:12px;display:flex;justify-content:space-between}.notice button{border:0;background:transparent;cursor:pointer}.muted{color:#667085;padding:16px 0}.panel{background:#fff;border:1px solid #e4e7ec;border-radius:14px;padding:20px;margin-top:14px}.head h2{margin:5px 0 0;font-size:20px}.table{margin-top:15px;border:1px solid #eaecf0;border-radius:10px;overflow:auto}.row{display:grid;grid-template-columns:.8fr 2fr 1fr 1.2fr;gap:10px;align-items:center;padding:13px 14px;border-top:1px solid #eaecf0;font-size:13px;min-width:700px}.row.head{border-top:0;background:#f9fafb;color:#667085;font-size:11px;font-weight:800}.row .blocked{color:#b42318;font-weight:700}.actions{display:flex;gap:6px}.actions button{border:1px solid #d0d5dd;background:#fff;border-radius:7px;padding:6px 9px;font-size:11px;cursor:pointer}.note{color:#667085;font-size:13px;line-height:1.5}@media(max-width:600px){.shell{padding:22px 14px}}`;
