"use client";

import { useEffect, useState } from "react";

export default function KundenPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState("");

  async function reload() {
    const res = await fetch("/api/orders?type=customers").then(r => r.json());
    setCustomers(res.customers || []);
    setLoading(false);
  }
  useEffect(() => { reload(); }, []);

  async function createCustomer(form) {
    const res = await fetch("/api/orders?type=customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setNotice("Fehler: " + data.error); return; }
    setCreating(false);
    setNotice("Kunde angelegt.");
    reload();
  }

  return <main className="shell">
    <header><div className="eyebrow">E-COMMERCE · KUNDEN</div><h1>Kunden</h1><p>Nur echte Kunden aus tatsächlichen Bestellungen — keine erfundenen Einträge.</p></header>
    <nav><a href="/e-commerce">← E-Commerce</a><a href="/bestellungen">Bestellungen</a></nav>
    {notice && <div className="notice">{notice}<button onClick={() => setNotice("")}>×</button></div>}
    <section className="panel">
      <div className="head"><div><span className="eyebrow">LISTE</span><h2>{customers.length} Kunde{customers.length === 1 ? "" : "n"}</h2></div><button className="primaryLink" onClick={() => setCreating(true)}>+ Kunde</button></div>
      {loading ? <p className="muted">Lade…</p> : customers.length === 0 ? <p className="muted">Noch kein einziger echter Kunde vorhanden — es wurde noch nichts verkauft. Kein erfundener Bestand.</p> : <div className="table">
        <div className="row head"><span>Name</span><span>E-Mail</span><span>Angelegt</span></div>
        {customers.map(c => <div className="row" key={c.id}><strong>{c.name}</strong><span>{c.email}</span><span>{new Date(c.erstellt_am).toLocaleDateString("de-DE")}</span></div>)}
      </div>}
    </section>
    {creating && <NewCustomerModal onClose={() => setCreating(false)} onSave={createCustomer} />}
    <style jsx>{styles}</style>
  </main>;
}

function NewCustomerModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: "", email: "", adresse: "" });
  return <div className="modalBack"><div className="modal">
    <div className="modalHead"><h3>Neuer Kunde</h3><button onClick={onClose}>×</button></div>
    <label>Name<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
    <label>E-Mail<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
    <label>Adresse (optional)<input value={form.adresse} onChange={e => setForm({ ...form, adresse: e.target.value })} /></label>
    <div className="modalActions"><button onClick={onClose}>Abbrechen</button><button className="primary" disabled={!form.name || !form.email.includes("@")} onClick={() => onSave(form)}>Anlegen</button></div>
  </div></div>;
}

const styles = `
*{box-sizing:border-box}.shell{min-height:100vh;background:#f6f7f9;color:#101828;font-family:Inter,system-ui,sans-serif;padding:35px 24px}header,nav,.panel{max-width:1240px;margin:auto}header{padding:10px 0 24px}.eyebrow{font-size:11px;font-weight:800;letter-spacing:.12em;color:#667085}h1{font-size:clamp(36px,5vw,54px);line-height:1;letter-spacing:-.04em;margin:8px 0 13px}header p{color:#667085;font-size:16px}nav{display:flex;gap:8px;border-bottom:1px solid #e4e7ec;padding-bottom:18px}nav a{padding:9px 12px;border:1px solid #d0d5dd;background:#fff;border-radius:8px;text-decoration:none;color:#344054;font-size:13px}.notice{max-width:1240px;margin:14px auto 0;background:#ecfdf3;border:1px solid #abefc6;color:#067647;padding:10px 12px;border-radius:8px;font-size:12px;display:flex;justify-content:space-between}.notice button{border:0;background:transparent;cursor:pointer}.muted{color:#667085;padding:16px 0}.panel{background:#fff;border:1px solid #e4e7ec;border-radius:14px;padding:20px;margin-top:14px}.head{display:flex;justify-content:space-between;align-items:flex-start}.head h2{margin:5px 0 0;font-size:20px}.primaryLink{padding:9px 12px;background:#101828;color:#fff;border:0;border-radius:8px;font-size:12px;cursor:pointer}.table{margin-top:15px;border:1px solid #eaecf0;border-radius:10px;overflow:hidden}.row{display:grid;grid-template-columns:1fr 1.4fr .8fr;gap:10px;padding:13px 14px;border-top:1px solid #eaecf0;font-size:13px}.row.head{border-top:0;background:#f9fafb;color:#667085;font-size:11px;font-weight:800}.modalBack{position:fixed;inset:0;background:rgba(16,24,40,.45);display:grid;place-items:center;padding:20px;z-index:20}.modal{background:#fff;border-radius:13px;width:min(420px,100%);padding:20px}.modalHead{display:flex;justify-content:space-between}.modalHead h3{margin:0 0 15px}.modalHead button{border:0;background:transparent;font-size:22px;cursor:pointer}.modal label{display:block;font-size:12px;font-weight:700;margin-top:12px}.modal input{display:block;width:100%;margin-top:5px;padding:10px;border:1px solid #d0d5dd;border-radius:7px}.modalActions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.modalActions button{padding:9px 12px;border:1px solid #d0d5dd;background:#fff;border-radius:7px;cursor:pointer}.modalActions .primary{background:#101828;color:#fff}@media(max-width:600px){.shell{padding:22px 14px}}`;
