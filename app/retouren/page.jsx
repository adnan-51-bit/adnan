"use client";

import { useEffect, useState } from "react";

const STATUS_LABEL = { angefragt: "Angefragt", genehmigt: "Genehmigt", abgelehnt: "Abgelehnt", erhalten: "Erhalten", erstattet: "Erstattet" };

export default function RetourenPage() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  async function reload() {
    const res = await fetch("/api/orders?type=returns").then(r => r.json());
    setReturns(res.returns || []);
    setLoading(false);
  }
  useEffect(() => { reload(); }, []);

  async function setStatus(id, status) {
    const res = await fetch("/api/orders?type=returns", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    const data = await res.json();
    if (!res.ok) { setNotice("Fehler: " + data.error); return; }
    setNotice(`Retoure ${id} → ${STATUS_LABEL[data.return.status]}`);
    reload();
  }

  return <main className="shell">
    <header><div className="eyebrow">E-COMMERCE · RETOUREN</div><h1>Retouren</h1><p>Angefragt → genehmigt/abgelehnt → erhalten → erstattet.</p></header>
    <nav><a href="/e-commerce">← E-Commerce</a><a href="/bestellungen">Bestellungen</a></nav>
    {notice && <div className="notice">{notice}<button onClick={() => setNotice("")}>×</button></div>}
    <section className="panel">
      <div className="head"><span className="eyebrow">LISTE</span><h2>{returns.length} Retoure{returns.length === 1 ? "" : "n"}</h2></div>
      {loading ? <p className="muted">Lade…</p> : returns.length === 0 ? <p className="muted">Noch keine einzige Retoure — es wurde noch nichts bestellt und zurückgeschickt. Kein erfundener Bestand.</p> : <div className="table">
        <div className="row head"><span>Bestellung</span><span>Grund</span><span>Status</span><span></span></div>
        {returns.map(r => <div className="row" key={r.id}>
          <strong>{r.bestellung_id}</strong><span>{r.grund}</span><span>{STATUS_LABEL[r.status]}</span>
          <span className="actions">{["genehmigt", "abgelehnt", "erhalten", "erstattet"].filter(s => s !== r.status).map(s => <button key={s} onClick={() => setStatus(r.id, s)}>{STATUS_LABEL[s]}</button>)}</span>
        </div>)}
      </div>}
    </section>
    <style jsx>{styles}</style>
  </main>;
}

const styles = `
*{box-sizing:border-box}.shell{min-height:100vh;background:#f6f7f9;color:#101828;font-family:Inter,system-ui,sans-serif;padding:35px 24px}header,nav,.panel{max-width:1240px;margin:auto}header{padding:10px 0 24px}.eyebrow{font-size:11px;font-weight:800;letter-spacing:.12em;color:#667085}h1{font-size:clamp(36px,5vw,54px);line-height:1;letter-spacing:-.04em;margin:8px 0 13px}header p{color:#667085;font-size:16px}nav{display:flex;gap:8px;border-bottom:1px solid #e4e7ec;padding-bottom:18px}nav a{padding:9px 12px;border:1px solid #d0d5dd;background:#fff;border-radius:8px;text-decoration:none;color:#344054;font-size:13px}.notice{max-width:1240px;margin:14px auto 0;background:#ecfdf3;border:1px solid #abefc6;color:#067647;padding:10px 12px;border-radius:8px;font-size:12px;display:flex;justify-content:space-between}.notice button{border:0;background:transparent;cursor:pointer}.muted{color:#667085;padding:16px 0}.panel{background:#fff;border:1px solid #e4e7ec;border-radius:14px;padding:20px;margin-top:14px}.head h2{margin:5px 0 0;font-size:20px}.table{margin-top:15px;border:1px solid #eaecf0;border-radius:10px;overflow:auto}.row{display:grid;grid-template-columns:1fr 1.6fr .8fr 1.6fr;gap:10px;align-items:center;padding:13px 14px;border-top:1px solid #eaecf0;font-size:13px;min-width:700px}.row.head{border-top:0;background:#f9fafb;color:#667085;font-size:11px;font-weight:800}.actions{display:flex;gap:6px;flex-wrap:wrap}.actions button{border:1px solid #d0d5dd;background:#fff;border-radius:7px;padding:6px 9px;font-size:11px;cursor:pointer}@media(max-width:600px){.shell{padding:22px 14px}}`;
