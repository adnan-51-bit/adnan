"use client";

import { useEffect, useMemo, useState } from "react";

const PIPELINE_LABELS = {
  IDEA: "Idee", RESEARCH: "Recherche", SUPPLIER_CHECK: "Lieferant prüfen", PRODUCT_CHECK: "Produkt prüfen",
  LEGAL_CHECK: "Rechtsprüfung", MARGIN_CHECK: "Marge prüfen", IMAGE_CHECK: "Bilder prüfen",
  COPY_CHECK: "Texte prüfen", QUALITY_GATE: "Quality Gate", READY: "Bereit", PUBLISHED: "Veröffentlicht",
};
const PIPELINE_ORDER = Object.keys(PIPELINE_LABELS);

function centsToEUR(cents) {
  return cents === null || cents === undefined ? "offen" : (cents / 100).toFixed(2) + " €";
}

export default function ProduktPipeline() {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("Alle");
  const [notice, setNotice] = useState("");
  const [creating, setCreating] = useState(false);

  async function reload() {
    const [pRes, sRes] = await Promise.all([
      fetch("/api/orders?type=products").then(r => r.json()),
      fetch("/api/orders?type=suppliers").then(r => r.json()),
    ]);
    setProducts(pRes.products || []);
    setSuppliers(sRes.suppliers || []);
    setLoading(false);
  }
  useEffect(() => { reload(); }, []);

  const visible = useMemo(() => products.filter(p => category === "Alle" || p.kategorie === category), [products, category]);
  const categories = ["Alle", ...new Set(products.map(p => p.kategorie))];
  const supplierName = id => suppliers.find(s => s.id === id)?.name || "—";

  async function advance(id) {
    const res = await fetch("/api/orders?type=products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "advance", id }) });
    const data = await res.json();
    if (!res.ok) { setNotice("Fehler: " + data.error); return; }
    setNotice(`„${data.product.name}“ ist jetzt bei „${PIPELINE_LABELS[data.product.pipeline_status]}“.`);
    reload();
  }

  async function createProduct(form) {
    const res = await fetch("/api/orders?type=products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setNotice("Fehler: " + data.error); return; }
    setCreating(false);
    setNotice("Neues Produkt angelegt.");
    reload();
  }

  return <main className="shell">
    <header><div className="eyebrow">E-COMMERCE · PRODUCT × SUPPLIER</div><h1>Produkt-Pipeline</h1><p>Jedes Produkt durchläuft dieselben Schritte, bis zur Veröffentlichung. Kein Schritt wird übersprungen.</p></header>
    <nav><a href="/e-commerce">← E-Commerce</a><a href="/lieferanten">Lieferanten</a><a href="/shop">Kalkulation</a><a href="/zentral">Master-Zentrale</a></nav>
    {notice && <div className="notice">{notice}<button onClick={() => setNotice("")}>×</button></div>}
    <section className="stats">
      <div><b>{products.length}</b><span>Produkte gesamt</span></div>
      <div><b>{products.filter(p => p.pipeline_status === "PUBLISHED").length}</b><span>veröffentlicht</span></div>
      <div><b>{products.filter(p => p.pipeline_status !== "PUBLISHED" && p.pipeline_status !== "IDEA").length}</b><span>in Prüfung</span></div>
      <div><b>{products.filter(p => p.pipeline_status === "IDEA").length}</b><span>nur Idee</span></div>
    </section>
    <section className="panel">
      <div className="head">
        <div><span className="eyebrow">PIPELINE</span><h2>Alle Produkte</h2></div>
        <div className="headActions"><select value={category} onChange={e => setCategory(e.target.value)}>{categories.map(c => <option key={c}>{c}</option>)}</select><button className="primaryLink" onClick={() => setCreating(true)}>+ Produkt</button></div>
      </div>
      {loading ? <p className="muted">Lade…</p> : <div className="table">
        <div className="row head"><span>Produkt</span><span>Lieferant</span><span>EK</span><span>Versand</span><span>Verkauf</span><span>Pipeline-Status</span><span></span></div>
        {visible.map(p => <div className="row" key={p.id}>
          <strong>{p.name}<small>{p.kategorie}</small></strong>
          <span>{supplierName(p.supplier_id)}</span>
          <span>{centsToEUR(p.einkaufspreis_cent)}</span>
          <span>{centsToEUR(p.versandkosten_cent)}</span>
          <span>{centsToEUR(p.verkaufspreis_cent)}</span>
          <span className="stage">{PIPELINE_LABELS[p.pipeline_status]}</span>
          <button disabled={p.pipeline_status === "PUBLISHED"} onClick={() => advance(p.id)}>{p.pipeline_status === "PUBLISHED" ? "fertig" : "weiter →"}</button>
        </div>)}
        {!visible.length && <p className="muted" style={{ padding: 16 }}>Keine Produkte in dieser Kategorie.</p>}
      </div>}
    </section>
    <section className="panel">
      <span className="eyebrow">PIPELINE-SCHRITTE</span><h2>Vom Kandidaten zur Veröffentlichung</h2>
      <div className="checks">{PIPELINE_ORDER.map((s, i) => <div key={s}><b>{String(i + 1).padStart(2, "0")}</b>{PIPELINE_LABELS[s]}</div>)}</div>
      <p className="note">Ein Produkt wird erst veröffentlicht, wenn alle vorherigen Schritte einzeln durchlaufen wurden. Kein Schritt kann übersprungen werden — auch nicht automatisiert. Erst ein veröffentlichtes Produkt mit einem verifizierten Lieferanten kann automatisch eine Bestellung durchlaufen (s. Automationen).</p>
    </section>
    {creating && <NewProductModal onClose={() => setCreating(false)} onSave={createProduct} categories={categories.filter(c => c !== "Alle")} />}
    <style jsx>{styles}</style>
  </main>;
}

function NewProductModal({ onClose, onSave, categories }) {
  const [form, setForm] = useState({ name: "", kategorie: categories[0] || "", verkaufspreis_cent: "" });
  return <div className="modalBack"><div className="modal">
    <div className="modalHead"><h3>Neues Produkt</h3><button onClick={onClose}>×</button></div>
    <label>Name<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
    <label>Kategorie<input value={form.kategorie} onChange={e => setForm({ ...form, kategorie: e.target.value })} /></label>
    <label>Verkaufspreis (€)<input type="number" min="0" step="0.01" value={form.verkaufspreis_cent} onChange={e => setForm({ ...form, verkaufspreis_cent: e.target.value })} /></label>
    <div className="modalActions"><button onClick={onClose}>Abbrechen</button><button className="primary" disabled={!form.name || !form.kategorie || !form.verkaufspreis_cent} onClick={() => onSave({ name: form.name, kategorie: form.kategorie, verkaufspreis_cent: Math.round(Number(form.verkaufspreis_cent) * 100) })}>Anlegen</button></div>
  </div></div>;
}

const styles = `
*{box-sizing:border-box}.shell{min-height:100vh;background:#f6f7f9;color:#101828;font-family:Inter,system-ui,sans-serif;padding:35px 24px}header,nav,.stats,.panel{max-width:1240px;margin:auto}header{padding:10px 0 24px}.eyebrow{font-size:11px;font-weight:800;letter-spacing:.12em;color:#667085}h1{font-size:clamp(36px,5vw,60px);line-height:1;letter-spacing:-.045em;margin:8px 0 13px}header p{color:#667085;font-size:17px}nav{display:flex;gap:8px;flex-wrap:wrap;border-bottom:1px solid #e4e7ec;padding-bottom:18px}nav a{padding:9px 12px;border:1px solid #d0d5dd;background:#fff;border-radius:8px;text-decoration:none;color:#344054;font-size:13px}.notice{max-width:1240px;margin:14px auto 0;background:#ecfdf3;border:1px solid #abefc6;color:#067647;padding:10px 12px;border-radius:8px;font-size:12px;display:flex;justify-content:space-between}.notice button{border:0;background:transparent;cursor:pointer}.muted{color:#667085}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:14px}.stats div{background:#101828;color:#fff;border-radius:12px;padding:18px}.stats b{display:block;font-size:28px}.stats span{font-size:12px;color:#d0d5dd}.panel{background:#fff;border:1px solid #e4e7ec;border-radius:14px;padding:20px;margin-top:14px}.head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}.headActions{display:flex;gap:8px}.head select{padding:9px;border:1px solid #d0d5dd;border-radius:8px}.primaryLink{padding:9px 12px;background:#101828;color:#fff;border:0;border-radius:8px;font-size:12px;cursor:pointer}.table{border:1px solid #eaecf0;border-radius:10px;overflow:auto;margin-top:15px}.row{display:grid;grid-template-columns:1.3fr 1fr .8fr .8fr .8fr 1fr .9fr;gap:10px;align-items:center;padding:13px 14px;border-top:1px solid #eaecf0;font-size:12px;min-width:900px}.row.head{border-top:0;background:#f9fafb;color:#667085;font-size:11px;font-weight:800}.row strong{color:#101828}.row small{display:block;color:#98a2b3;font-weight:400;margin-top:3px}.row .stage{font-weight:600}.row button{border:1px solid #d0d5dd;background:#fff;border-radius:7px;padding:7px 9px;font-size:11px;cursor:pointer}.row button:disabled{opacity:.5;cursor:default}.checks{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:17px}.checks div{border:1px solid #eaecf0;border-radius:9px;background:#f9fafb;padding:12px;font-size:12px}.checks b{display:block;color:#667085;margin-bottom:6px}.note{color:#667085;font-size:13px;line-height:1.5;margin-top:16px}.modalBack{position:fixed;inset:0;background:rgba(16,24,40,.45);display:grid;place-items:center;padding:20px;z-index:20}.modal{background:#fff;border-radius:13px;width:min(420px,100%);padding:20px}.modalHead{display:flex;justify-content:space-between}.modalHead h3{margin:0 0 15px}.modalHead button{border:0;background:transparent;font-size:22px;cursor:pointer}.modal label{display:block;font-size:12px;font-weight:700;margin-top:12px}.modal input{display:block;width:100%;margin-top:5px;padding:10px;border:1px solid #d0d5dd;border-radius:7px}.modalActions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.modalActions button{padding:9px 12px;border:1px solid #d0d5dd;background:#fff;border-radius:7px;cursor:pointer}.modalActions .primary{background:#101828;color:#fff}@media(max-width:800px){.stats,.checks{grid-template-columns:1fr 1fr}}@media(max-width:500px){.stats,.checks{grid-template-columns:1fr}.shell{padding:22px 14px}}`;
