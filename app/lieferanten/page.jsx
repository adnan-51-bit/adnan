"use client";

import { useEffect, useMemo, useState } from "react";
import { adminFetch } from "../../lib/admin-fetch.js";

const STATUS_LABEL = { recherchiert: "🟡 Recherchiert", geprueft: "🟡 Geprüft", verifiziert: "🟢 Verifiziert", abgelehnt: "🔴 Abgelehnt" };

export default function LieferantenZentrale() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("alle");
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState("");
  const [creating, setCreating] = useState(false);

  async function reload() {
    const res = await fetch("/api/orders?type=suppliers").then(r => r.json());
    setSuppliers(res.suppliers || []);
    setLoading(false);
  }
  useEffect(() => { reload(); }, []);

  const visible = useMemo(() => filter === "alle" ? suppliers : suppliers.filter(s => s.region === filter), [filter, suppliers]);

  async function setStatus(id, status) {
    const res = await adminFetch("/api/orders?type=suppliers", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    const data = await res.json();
    if (!res.ok) { setNotice("Fehler: " + data.error); return; }
    setNotice(`Status von „${data.supplier.name}“ auf „${STATUS_LABEL[data.supplier.status]}“ gesetzt.`);
    reload();
  }

  async function createSupplier(form) {
    const res = await adminFetch("/api/orders?type=suppliers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setNotice("Fehler: " + data.error); return; }
    setCreating(false);
    setNotice("Neuer Lieferant angelegt.");
    reload();
  }

  return <main className="shell">
    <header className="hero">
      <div><div className="eyebrow">E-COMMERCE · DROPSHIPPING CONTROL</div><h1>Lieferanten statt Lagerbestand.</h1><p>Produkte auswählen, Direktversand prüfen, Marge berechnen und erst danach freigeben.</p></div>
      <div className="gate">🟡 RECHERCHE / QUALITY GATE</div>
    </header>
    <nav><a href="/e-commerce">← E-Commerce</a><a href="/produkt-pipeline">Produkt-Pipeline</a><a href="/shop">Produktkalkulation</a></nav>
    <section className="rules">
      <div><b>Unser Ziel</b><span>Kein Lagerbestand, wenn ein geeigneter Lieferant direkt an den Kunden versenden kann.</span></div>
      <div><b>Freigabe</b><span>Ein Lieferant gilt erst als „verifiziert“, wenn Vertrag, Preise, Versand, Retouren und Tracking real geprüft wurden — nicht schon nach der ersten Recherche.</span></div>
      <div><b>Kosten</b><span>Keine kostenpflichtige Lieferanten-/App-Anbindung ohne ausdrückliche Freigabe.</span></div>
    </section>
    {notice && <div className="notice">{notice}<button onClick={() => setNotice("")}>×</button></div>}
    <section className="panel">
      <div className="head">
        <div><span className="label">LIEFERANTEN</span><h2>{suppliers.length} recherchierte Direktversand-Kandidaten</h2></div>
        <div className="headActions"><select value={filter} onChange={e => setFilter(e.target.value)}><option value="alle">Alle</option><option value="Deutschland">Deutschland</option><option value="EU">EU</option></select><button className="primaryLink" onClick={() => setCreating(true)}>+ Lieferant</button></div>
      </div>
      {loading ? <p className="muted">Lade…</p> : <div className="table">
        <div className="tr th"><span>Lieferant</span><span>Region</span><span>Modell</span><span>Neutral</span><span>Risiko</span><span>Status</span></div>
        {visible.map((s, i) => <button className="tr row" key={s.id} onClick={() => setSelected(i)}>
          <strong>{s.name}</strong><span>{s.region}</span><span>{s.modell}</span><span>{s.neutral ? "Ja" : "Prüfen"}</span><span>{s.risiko}</span><span>{STATUS_LABEL[s.status]}</span>
        </button>)}
      </div>}
      {selected !== null && visible[selected] && <div className="detail">
        <div>
          <b>{visible[selected].name}</b><p>{visible[selected].notiz}</p><small>Kategorien: {visible[selected].categories}</small>
          <div className="statusActions">
            {["recherchiert", "geprueft", "verifiziert", "abgelehnt"].map(st => <button key={st} disabled={visible[selected].status === st} onClick={() => setStatus(visible[selected].id, st)}>{STATUS_LABEL[st]}</button>)}
          </div>
        </div>
        {visible[selected].quelle_url && <a href={visible[selected].quelle_url} target="_blank" rel="noreferrer">Quelle öffnen →</a>}
      </div>}
    </section>
    <section className="panel">
      <span className="label">AUTOMATISIERUNGSLOGIK</span>
      <h2>Vom Verkauf bis zum Tracking</h2>
      <div className="flow">{["Shop-Bestellung", "Produkt prüfen", "Lieferant auswählen", "Bestellung weiterleiten", "Direktversand", "Tracking übernehmen", "Kunde informieren", "Marge buchen"].map((x, i) => <div key={x}><b>{String(i + 1).padStart(2, "0")}</b><span>{x}</span></div>)}</div>
      <p className="note">Eine Bestellung wird nur automatisch weiterverarbeitet, wenn Produkt UND Lieferant zum Zeitpunkt der Bestellung tatsächlich als „veröffentlicht“ bzw. „verifiziert“ gespeichert sind — dieser Status wird bei jeder Bestellung frisch aus den echten Daten geprüft, nie nur behauptet.</p>
    </section>
    <footer>Keine Bestellung, kein Warenbestand und keine kostenpflichtige Integration wurde durch diese Seite ausgelöst.</footer>
    {creating && <NewSupplierModal onClose={() => setCreating(false)} onSave={createSupplier} />}
    <style jsx>{styles}</style>
  </main>;
}

function NewSupplierModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: "", region: "Deutschland", categories: "", quelle_url: "" });
  return <div className="modalBack"><div className="modal">
    <div className="modalHead"><h3>Neuer Lieferant</h3><button onClick={onClose}>×</button></div>
    <label>Name<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
    <label>Region<select value={form.region} onChange={e => setForm({ ...form, region: e.target.value })}><option>Deutschland</option><option>EU</option></select></label>
    <label>Kategorien<input value={form.categories} onChange={e => setForm({ ...form, categories: e.target.value })} /></label>
    <label>Quelle (URL, optional)<input value={form.quelle_url} onChange={e => setForm({ ...form, quelle_url: e.target.value })} /></label>
    <div className="modalActions"><button onClick={onClose}>Abbrechen</button><button className="primary" disabled={!form.name} onClick={() => onSave(form)}>Anlegen</button></div>
  </div></div>;
}

const styles = `
*{box-sizing:border-box}.shell{min-height:100vh;background:#f6f7f9;color:#101828;font-family:Inter,system-ui,sans-serif;padding:34px 24px}.hero,nav,.rules,.panel,footer{max-width:1240px;margin:auto}.hero{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;padding:10px 0 24px}.eyebrow,.label{font-size:11px;font-weight:800;letter-spacing:.12em;color:#667085}.hero h1{font-size:clamp(34px,5vw,58px);line-height:1;letter-spacing:-.04em;margin:9px 0 13px}.hero p{color:#667085;font-size:17px;max-width:700px}.gate{border:1px solid #fedf89;background:#fffaeb;border-radius:999px;padding:9px 13px;font-size:11px;font-weight:800;height:max-content}nav{display:flex;gap:8px;flex-wrap:wrap;border-bottom:1px solid #e4e7ec;padding-bottom:18px}nav a{background:#fff;border:1px solid #d0d5dd;border-radius:8px;padding:9px 12px;text-decoration:none;color:#344054;font-size:13px}.rules{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px}.rules div{background:#101828;color:#fff;border-radius:12px;padding:17px}.rules b{display:block;margin-bottom:7px}.rules span{color:#d0d5dd;font-size:13px;line-height:1.45}.notice{margin-top:14px;background:#ecfdf3;border:1px solid #abefc6;color:#067647;padding:10px 12px;border-radius:8px;font-size:12px;display:flex;justify-content:space-between}.notice button{border:0;background:transparent;cursor:pointer}.muted{color:#667085}.panel{background:#fff;border:1px solid #e4e7ec;border-radius:14px;padding:20px;margin-top:14px}.head{display:flex;justify-content:space-between;align-items:flex-start;gap:15px;flex-wrap:wrap}.headActions{display:flex;gap:8px}.head h2{margin:5px 0 0;font-size:20px}.head select{padding:9px;border:1px solid #d0d5dd;border-radius:8px}.primaryLink{padding:9px 12px;background:#101828;color:#fff;border:0;border-radius:8px;font-size:12px;cursor:pointer}.table{margin-top:18px;border:1px solid #eaecf0;border-radius:10px;overflow:auto}.tr{display:grid;grid-template-columns:1.1fr .7fr 1fr .6fr .6fr 1.1fr;gap:10px;align-items:center;padding:13px 14px;text-align:left;font:inherit;min-width:750px}.th{background:#f9fafb;color:#667085;font-size:11px;font-weight:800}.row{width:100%;border:0;border-top:1px solid #eaecf0;background:#fff;cursor:pointer;color:#344054;font-size:12px}.row:hover{background:#f9fafb}.row strong{color:#101828}.detail{display:flex;justify-content:space-between;gap:20px;background:#f9fafb;border:1px solid #eaecf0;border-radius:10px;padding:15px;margin-top:12px;flex-wrap:wrap}.detail p{color:#667085;margin:6px 0}.detail small{color:#667085}.detail a{color:#175cd3;text-decoration:none;font-weight:700;white-space:nowrap}.statusActions{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.statusActions button{border:1px solid #d0d5dd;background:#fff;border-radius:7px;padding:6px 9px;font-size:11px;cursor:pointer}.statusActions button:disabled{opacity:.5;cursor:default}.flow{display:grid;grid-template-columns:repeat(8,1fr);gap:8px;margin-top:18px}.flow div{border:1px solid #eaecf0;border-radius:9px;padding:11px;background:#f9fafb}.flow b{display:block;color:#667085;font-size:11px}.flow span{display:block;margin-top:7px;font-size:12px}.note{color:#667085;font-size:13px;line-height:1.5;margin-bottom:0;margin-top:14px}footer{padding:20px 0;color:#667085;font-size:12px}.modalBack{position:fixed;inset:0;background:rgba(16,24,40,.45);display:grid;place-items:center;padding:20px;z-index:20}.modal{background:#fff;border-radius:13px;width:min(420px,100%);padding:20px}.modalHead{display:flex;justify-content:space-between}.modalHead h3{margin:0 0 15px}.modalHead button{border:0;background:transparent;font-size:22px;cursor:pointer}.modal label{display:block;font-size:12px;font-weight:700;margin-top:12px}.modal input,.modal select{display:block;width:100%;margin-top:5px;padding:10px;border:1px solid #d0d5dd;border-radius:7px}.modalActions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.modalActions button{padding:9px 12px;border:1px solid #d0d5dd;background:#fff;border-radius:7px;cursor:pointer}.modalActions .primary{background:#101828;color:#fff}@media(max-width:900px){.hero{display:block}.rules{grid-template-columns:1fr 1fr}.flow{grid-template-columns:repeat(4,1fr)}.table{overflow:auto}}@media(max-width:600px){.rules{grid-template-columns:1fr}.flow{grid-template-columns:1fr 1fr}.shell{padding:22px 14px}}`;
