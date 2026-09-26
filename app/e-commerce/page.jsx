"use client";

// Phase 2 (Multi-Business-Struktur, E-Commerce-Dashboard, 21.09.2026): eigenständiges Dashboard
// für den Geschäftsbereich "ecommerce" (business_id, s. lib/master-store.js BUSINESS_IDS). Fasst
// die vorher auf einzelne Seiten verteilten Bereiche (Produkt-Pipeline, Lieferanten, Kunden,
// Bestellungen, Retouren, Automation) zu EINEM Dashboard mit eigener Navigation zusammen - keine
// Funktion wurde dabei entfernt, nur konsolidiert (die alten Routen leiten hierher weiter, s.
// docs/MULTI-BUSINESS-ARCHITECTURE.md). Bezieht ausschließlich echte, bereits bestehende APIs
// (/api/orders, /api/master/finance?business_id=ecommerce, /api/master/systems,
// /api/master/quality-gate, /api/providers, /api/automation) - keine neue Route, keine Fake-Daten.
// Werknetz24 wird hier an keiner Stelle referenziert oder geladen (vollständig getrennt, s.
// tests/ecommerce-dashboard.test.js).

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { adminFetch } from "../../lib/admin-fetch.js";

const BUSINESS_ID = "ecommerce";

const PIPELINE_LABELS = {
  IDEA: "Idee", RESEARCH: "Recherche", SUPPLIER_CHECK: "Lieferant prüfen", PRODUCT_CHECK: "Produkt prüfen",
  LEGAL_CHECK: "Rechtsprüfung", MARGIN_CHECK: "Marge prüfen", IMAGE_CHECK: "Bilder prüfen",
  COPY_CHECK: "Texte prüfen", QUALITY_GATE: "Quality Gate", READY: "Bereit", PUBLISHED: "Veröffentlicht",
};
const PIPELINE_ORDER = Object.keys(PIPELINE_LABELS);
const SUPPLIER_STATUS_LABEL = { recherchiert: "🟡 Recherchiert", geprueft: "🟡 Geprüft", verifiziert: "🟢 Verifiziert", abgelehnt: "🔴 Abgelehnt" };
const ORDER_STATUS_LABEL = {
  payment_pending: "Zahlung offen", paid: "Bezahlt", validated: "Geprüft", supplier_pending: "Lieferant offen",
  supplier_ordered: "Bei Lieferant bestellt", fulfilled: "Ausgeliefert", tracking_available: "Tracking vorhanden",
  delivered: "Zugestellt", cancelled: "Storniert", blocked: "🔴 Blockiert",
};
const RETURN_STATUS_LABEL = { angefragt: "Angefragt", genehmigt: "Genehmigt", abgelehnt: "Abgelehnt", erhalten: "Erhalten", erstattet: "Erstattet" };

const TABS = [
  ["overview", "◈", "Übersicht"],
  ["produkte", "▦", "Produkte"],
  ["pipeline", "↗", "Produkt-Pipeline"],
  ["lieferanten", "▣", "Lieferanten"],
  ["bestellungen", "▤", "Bestellungen"],
  ["kunden", "◍", "Kunden"],
  ["zahlungen", "◇", "Zahlungen"],
  ["retouren", "↺", "Retouren"],
  ["finanzen", "€", "Finanzen"],
  ["automation", "↻", "Automationen"],
  ["systeme", "◉", "Systeme"],
  ["quality-gate", "✓", "Quality Gate"],
  ["einstellungen", "⚙", "Einstellungen"],
];
const VALID_TABS = new Set(TABS.map(([id]) => id));

function centsToEUR(cents) {
  return cents === null || cents === undefined ? "offen" : (cents / 100).toFixed(2) + " €";
}
function formatEUR(n) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
}

export default function ECommercePage() {
  return <Suspense fallback={<main className="app"><div className="notice">E-Commerce-Dashboard wird geladen…</div><style jsx>{styles}</style></main>}>
    <ECommerceDashboard />
  </Suspense>;
}

function ECommerceDashboard() {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const [tab, setTab] = useState(VALID_TABS.has(requestedTab) ? requestedTab : "overview");

  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [returns, setReturns] = useState([]);
  const [coreLoading, setCoreLoading] = useState(true);

  const [providers, setProviders] = useState(null);
  const [providersLoading, setProvidersLoading] = useState(true);

  const [systems, setSystems] = useState([]);
  const [systemsLoading, setSystemsLoading] = useState(true);

  const [qualityGate, setQualityGate] = useState(null);
  const [qualityGateLoading, setQualityGateLoading] = useState(true);

  const [finance, setFinance] = useState([]);
  const [financeLoading, setFinanceLoading] = useState(true);

  const [notice, setNotice] = useState("");

  async function reloadCore() {
    setCoreLoading(true);
    const [p, s, c, o, r] = await Promise.all([
      fetch("/api/orders?type=products").then(res => res.json()),
      fetch("/api/orders?type=suppliers").then(res => res.json()),
      adminFetch("/api/orders?type=customers").then(res => res.json()),
      adminFetch("/api/orders?type=orders").then(res => res.json()),
      adminFetch("/api/orders?type=returns").then(res => res.json()),
    ]);
    setProducts(p.products || []); setSuppliers(s.suppliers || []); setCustomers(c.customers || []);
    setOrders(o.orders || []); setReturns(r.returns || []);
    // Seit Supabase-Persistenz nur mit Admin-Secret lesbar - ohne Anmeldung ehrlich sagen, dass
    // die Zahlen unvollständig sind, statt stillschweigend "0 Kunden" zu zeigen.
    if (!c.ok || !o.ok || !r.ok) setNotice("Kunden, Bestellungen und Retouren sind nur mit Admin-Secret sichtbar – die Anzeige hier ist ohne Anmeldung unvollständig.");
    setCoreLoading(false);
  }
  async function reloadFinance() {
    setFinanceLoading(true);
    const data = await adminFetch("/api/master/finance?business_id=" + BUSINESS_ID).then(r => r.json());
    setFinance(data.entries || []);
    if (!data.ok) setNotice("Finanzbuchungen sind nur mit Admin-Secret sichtbar – ohne Anmeldung unvollständig.");
    setFinanceLoading(false);
  }

  useEffect(() => { reloadCore(); }, []);
  useEffect(() => { fetch("/api/providers").then(r => r.json()).then(setProviders).finally(() => setProvidersLoading(false)); }, []);
  useEffect(() => { fetch("/api/master/systems").then(r => r.json()).then(d => setSystems(d.systems || [])).finally(() => setSystemsLoading(false)); }, []);
  useEffect(() => { fetch("/api/master/quality-gate").then(r => r.json()).then(setQualityGate).catch(e => setQualityGate({ ok: false, error: e.message })).finally(() => setQualityGateLoading(false)); }, []);
  useEffect(() => { reloadFinance(); }, []);

  // Nur die für E-Commerce relevanten Systeme (Zahlungsanbieter + Datenbank) - vollständige
  // Verwaltung aller Systeme bleibt bewusst in der Master-Zentrale (/master → Systeme), um keine
  // zweite, abweichende Bearbeitungsoberfläche für dieselben Datensätze zu schaffen.
  const relevantSystems = useMemo(() => systems.filter(s => ["supabase", "stripe", "paypal", "shopify"].includes(s.id)), [systems]);

  const supplierName = id => suppliers.find(s => s.id === id)?.name || "—";
  const productName = id => products.find(p => p.id === id)?.name || id;
  const published = products.filter(p => p.pipeline_status === "PUBLISHED").length;
  const verifiziert = suppliers.filter(s => s.status === "verifiziert").length;
  const openOrders = orders.filter(o => !["delivered", "cancelled"].includes(o.status)).length;
  const openReturns = returns.filter(r => !["erstattet", "abgelehnt"].includes(r.status)).length;
  const financeTotals = finance.reduce((a, e) => { if (e.status === "cancelled") return a; const n = Number(e.amount) || 0; if (e.kind === "income") a.income += n; else a.expense += n; a.net = a.income - a.expense; return a; }, { income: 0, expense: 0, net: 0 });

  async function advanceProduct(id) {
    const res = await adminFetch("/api/orders?type=products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "advance", id }) });
    const data = await res.json();
    if (!res.ok) { setNotice("Fehler: " + data.error); return; }
    setNotice(`„${data.product.name}“ ist jetzt bei „${PIPELINE_LABELS[data.product.pipeline_status]}“.`);
    reloadCore();
  }
  async function createProduct(form) {
    const res = await adminFetch("/api/orders?type=products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setNotice("Fehler: " + data.error); return false; }
    setNotice("Neues Produkt angelegt."); reloadCore(); return true;
  }
  async function setSupplierStatus(id, status) {
    const res = await adminFetch("/api/orders?type=suppliers", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    const data = await res.json();
    if (!res.ok) { setNotice("Fehler: " + data.error); return; }
    setNotice(`Status von „${data.supplier.name}“ auf „${SUPPLIER_STATUS_LABEL[data.supplier.status]}“ gesetzt.`);
    reloadCore();
  }
  async function createSupplier(form) {
    const res = await adminFetch("/api/orders?type=suppliers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setNotice("Fehler: " + data.error); return false; }
    setNotice("Neuer Lieferant angelegt."); reloadCore(); return true;
  }
  async function createCustomer(form) {
    const res = await adminFetch("/api/orders?type=customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setNotice("Fehler: " + data.error); return false; }
    setNotice("Kunde angelegt."); reloadCore(); return true;
  }
  async function fireOrderEvent(order, type) {
    const res = await adminFetch("/api/orders?type=orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: order.id, type }) });
    const data = await res.json();
    if (!res.ok) { setNotice("Fehler: " + data.error); return; }
    if (data.order.status === "blocked") setNotice(`Bestellung ${order.id} wurde blockiert: ${data.gate.blockers.join(", ")}`);
    else setNotice(`Bestellung ${order.id} → ${ORDER_STATUS_LABEL[data.order.status]}`);
    reloadCore();
  }
  async function setReturnStatus(id, status) {
    const res = await adminFetch("/api/orders?type=returns", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    const data = await res.json();
    if (!res.ok) { setNotice("Fehler: " + data.error); return; }
    setNotice(`Retoure ${id} → ${RETURN_STATUS_LABEL[data.return.status]}`);
    reloadCore();
  }
  async function createFinanceEntry(form) {
    const res = await adminFetch("/api/master/finance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, business_id: BUSINESS_ID }) });
    const data = await res.json();
    if (!res.ok) { setNotice("Fehler: " + data.error); return false; }
    setNotice("Finanzbuchung gespeichert."); reloadFinance(); return true;
  }

  return <main className="app">
    <header className="topbar">
      <div><span className="eyebrow">MASTER-ZENTRALE · E-COMMERCE</span><h1>E-Commerce Dashboard</h1><p>Produkte, Lieferanten, Bestellungen, Kunden, Zahlungen und Finanzen des Geschäftsbereichs „E-Commerce" — eigenständig, getrennt von Werknetz24.</p></div>
      <div className="topActions"><span className="live"><i />business_id: {BUSINESS_ID}</span><a href="/master">← Master-Zentrale</a></div>
    </header>
    <div className="layout">
      <aside className="sidebar">
        {TABS.map(([id, icon, label]) => <button key={id} className={tab === id ? "selected" : ""} onClick={() => setTab(id)}><b>{icon}</b>{label}</button>)}
        <div className="sideBottom"><a href="/shop">Shop-Kalkulation (Test)</a></div>
      </aside>
      <section className="content">
        {notice && <div className="notice">{notice}<button onClick={() => setNotice("")}>×</button></div>}
        {tab === "overview" && <Overview {...{ coreLoading, products, suppliers, customers, orders, returns, published, verifiziert, openOrders, openReturns, financeTotals, financeLoading }} />}
        {tab === "produkte" && <Produkte {...{ products, suppliers, coreLoading, supplierName, onCreate: createProduct, setTab }} />}
        {tab === "pipeline" && <Pipeline {...{ products, suppliers, coreLoading, supplierName, onAdvance: advanceProduct }} />}
        {tab === "lieferanten" && <Lieferanten {...{ suppliers, coreLoading, onSetStatus: setSupplierStatus, onCreate: createSupplier }} />}
        {tab === "bestellungen" && <Bestellungen {...{ orders, coreLoading, productName, onFireEvent: fireOrderEvent }} />}
        {tab === "kunden" && <Kunden {...{ customers, coreLoading, onCreate: createCustomer }} />}
        {tab === "zahlungen" && <Zahlungen {...{ providers, providersLoading, systems: relevantSystems }} />}
        {tab === "retouren" && <Retouren {...{ returns, coreLoading, onSetStatus: setReturnStatus }} />}
        {tab === "finanzen" && <Finanzen {...{ finance, financeLoading, onCreate: createFinanceEntry }} />}
        {tab === "automation" && <Automation />}
        {tab === "systeme" && <Systeme systems={relevantSystems} loading={systemsLoading} />}
        {tab === "quality-gate" && <QualityGate gate={qualityGate} loading={qualityGateLoading} />}
        {tab === "einstellungen" && <Einstellungen />}
      </section>
    </div>
    <footer>E-Commerce-Dashboard · eigenständiger Geschäftsbereich (business_id: {BUSINESS_ID}) · keine Vermischung mit Werknetz24-Daten · keine Bestellung, Zahlung oder kostenpflichtige Integration wird durch dieses Dashboard automatisch ausgelöst.</footer>
    <style jsx>{styles}</style>
  </main>;
}

function Kpi({ label, value, note }) { return <div className="kpi"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>; }
function Panel({ title, action, children }) { return <section className="panel"><div className="panelTitle"><h3>{title}</h3>{action}</div>{children}</section>; }

function Overview({ coreLoading, products, suppliers, customers, orders, returns, published, verifiziert, openOrders, openReturns, financeTotals, financeLoading }) {
  return <>
    <div className="pageTitle"><div><span>CONTROL CENTER</span><h2>E-Commerce auf einen Blick</h2></div></div>
    <div className="kpis">
      <Kpi label="Produkte" value={coreLoading ? "…" : products.length} note={coreLoading ? "" : `${published} veröffentlicht`} />
      <Kpi label="Lieferanten" value={coreLoading ? "…" : suppliers.length} note={coreLoading ? "" : `${verifiziert} verifiziert`} />
      <Kpi label="Bestellungen offen" value={coreLoading ? "…" : openOrders} note={coreLoading ? "" : `${orders.length} gesamt`} />
      <Kpi label="Umsatz (Finanzen)" value={financeLoading ? "…" : formatEUR(financeTotals.income)} note="keine erfundenen Umsätze" />
    </div>
    <div className="columns">
      <Panel title="Kunden & Retouren">
        <div className="row"><div><strong>Kunden</strong><small>{coreLoading ? "…" : customers.length === 0 ? "noch kein echter Kunde" : customers.length + " Kunde(n)"}</small></div></div>
        <div className="row"><div><strong>Retouren offen</strong><small>{coreLoading ? "…" : openReturns + " von " + returns.length}</small></div></div>
      </Panel>
      <Panel title="Nächste Phase">
        {[["01", "Konkrete Lieferantenpreise", "EK, Versand und Händlerkonditionen verifizieren."],
          ["02", "Produktfreigabe", "Nur Produkte mit vollständigem Quality Gate freigeben."],
          ["03", "Shop", "Produktseiten, Checkout und Bestellprozess fertigstellen."],
          ["04", "Bestellung", "Zahlung → Lieferant → Tracking → Kunde abbilden."],
          ["05", "Finanzen", "Umsatz, Kosten, Marge, Gebühren und Retouren sauber erfassen."]].map(([n, t, d]) => <div className="taskMini" key={n}><span>{n}</span><div><strong>{t}</strong><small>{d}</small></div></div>)}
      </Panel>
    </div>
    <Panel title="Recherche-Regel">
      <p className="note">ChiliTec bestätigt neutralen Direktversand in Deutschland und nennt 7,50 € Versand je Paket sowie 10 € netto Mindestbestellwert. T.M. Textil nennt 900+ Heimtextil-SKUs, neutralen Versand und Live-Produktdaten. CLP bestätigt Versand im Namen des Händlers für sein Home-&-Living-Sortiment. Diese Anbieterinformationen (s. Tab „Lieferanten") sind Grundlage für weitere Prüfungen; Händler-EK und konkrete Produktmargen müssen separat verifiziert werden.</p>
    </Panel>
  </>;
}

function Produkte({ products, suppliers, coreLoading, supplierName, onCreate, setTab }) {
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const visible = products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.kategorie.toLowerCase().includes(search.toLowerCase()));
  return <>
    <div className="pageTitle"><div><span>KATALOG</span><h2>Produkte</h2></div><div className="quick"><input className="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Suchen…" /><button className="primaryLink" onClick={() => setCreating(true)}>+ Produkt</button></div></div>
    {coreLoading ? <Panel title="Produkte"><p>Daten werden geladen…</p></Panel> : <div className="taskTable">
      <div className="taskRow head"><div><strong>Produkt</strong></div><i className="businessBadge">Lieferant</i><span>Preis</span><em>Status</em><span></span></div>
      {visible.map(p => <div className="taskRow" key={p.id}>
        <div><strong>{p.name}</strong><small>{p.kategorie}</small></div>
        <i className="businessBadge">{supplierName(p.supplier_id)}</i>
        <span>{centsToEUR(p.verkaufspreis_cent)}</span>
        <em>{PIPELINE_LABELS[p.pipeline_status]}</em>
        <button className="editMini" onClick={() => setTab("pipeline")}>Zur Pipeline →</button>
      </div>)}
      {!visible.length && <p className="muted" style={{ padding: 16 }}>Keine Produkte gefunden.</p>}
    </div>}
    {creating && <ProductModal suppliers={suppliers} onClose={() => setCreating(false)} onSave={async form => { if (await onCreate(form)) setCreating(false); }} />}
  </>;
}
function ProductModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: "", kategorie: "", verkaufspreis_cent: "" });
  return <div className="modalBack"><div className="modal"><div className="modalHead"><h3>Neues Produkt</h3><button onClick={onClose}>×</button></div>
    <label>Name<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
    <label>Kategorie<input value={form.kategorie} onChange={e => setForm({ ...form, kategorie: e.target.value })} /></label>
    <label>Verkaufspreis (€)<input type="number" min="0" step="0.01" value={form.verkaufspreis_cent} onChange={e => setForm({ ...form, verkaufspreis_cent: e.target.value })} /></label>
    <div className="modalActions"><button onClick={onClose}>Abbrechen</button><button className="primary" disabled={!form.name || !form.kategorie || !form.verkaufspreis_cent} onClick={() => onSave({ name: form.name, kategorie: form.kategorie, verkaufspreis_cent: Math.round(Number(form.verkaufspreis_cent) * 100) })}>Anlegen</button></div>
  </div></div>;
}

function Pipeline({ products, suppliers, coreLoading, supplierName, onAdvance }) {
  const [category, setCategory] = useState("Alle");
  const categories = ["Alle", ...new Set(products.map(p => p.kategorie))];
  const visible = products.filter(p => category === "Alle" || p.kategorie === category);
  return <>
    <div className="pageTitle"><div><span>PRODUCT × SUPPLIER</span><h2>Produkt-Pipeline</h2></div><select className="search" value={category} onChange={e => setCategory(e.target.value)}>{categories.map(c => <option key={c}>{c}</option>)}</select></div>
    <div className="kpis">
      <Kpi label="Produkte gesamt" value={products.length} />
      <Kpi label="Veröffentlicht" value={products.filter(p => p.pipeline_status === "PUBLISHED").length} />
      <Kpi label="In Prüfung" value={products.filter(p => p.pipeline_status !== "PUBLISHED" && p.pipeline_status !== "IDEA").length} />
      <Kpi label="Nur Idee" value={products.filter(p => p.pipeline_status === "IDEA").length} />
    </div>
    {coreLoading ? <Panel title="Pipeline"><p>Daten werden geladen…</p></Panel> : <div className="taskTable">
      {visible.map(p => <div className="taskRow" key={p.id}>
        <div><strong>{p.name}</strong><small>{supplierName(p.supplier_id)} · EK {centsToEUR(p.einkaufspreis_cent)} · Versand {centsToEUR(p.versandkosten_cent)}</small></div>
        <em>{PIPELINE_LABELS[p.pipeline_status]}</em>
        <button className="editMini" disabled={p.pipeline_status === "PUBLISHED"} onClick={() => onAdvance(p.id)}>{p.pipeline_status === "PUBLISHED" ? "fertig" : "weiter →"}</button>
      </div>)}
      {!visible.length && <p className="muted" style={{ padding: 16 }}>Keine Produkte in dieser Kategorie.</p>}
    </div>}
    <Panel title="Pipeline-Schritte">
      <div className="pipelineSteps">{PIPELINE_ORDER.map((s, i) => <div key={s}><b>{String(i + 1).padStart(2, "0")}</b>{PIPELINE_LABELS[s]}</div>)}</div>
      <p className="note">Ein Produkt wird erst veröffentlicht, wenn alle vorherigen Schritte einzeln durchlaufen wurden. Kein Schritt kann übersprungen werden — auch nicht automatisiert.</p>
    </Panel>
  </>;
}

function Lieferanten({ suppliers, coreLoading, onSetStatus, onCreate }) {
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState(null);
  return <>
    <div className="pageTitle"><div><span>DROPSHIPPING CONTROL</span><h2>Lieferanten</h2></div><button className="primaryLink" onClick={() => setCreating(true)}>+ Lieferant</button></div>
    {coreLoading ? <Panel title="Lieferanten"><p>Daten werden geladen…</p></Panel> : <div className="taskTable">
      {suppliers.map((s, i) => <div className="taskRow" key={s.id} onClick={() => setSelected(selected === i ? null : i)} style={{ cursor: "pointer" }}>
        <div><strong>{s.name}</strong><small>{s.region} · {s.modell}</small></div>
        <em>{SUPPLIER_STATUS_LABEL[s.status]}</em>
      </div>)}
    </div>}
    {selected !== null && suppliers[selected] && <Panel title={suppliers[selected].name}>
      <p className="note">{suppliers[selected].notiz}</p>
      <div className="quick">{["recherchiert", "geprueft", "verifiziert", "abgelehnt"].map(st => <button key={st} className="editMini" disabled={suppliers[selected].status === st} onClick={() => onSetStatus(suppliers[selected].id, st)}>{SUPPLIER_STATUS_LABEL[st]}</button>)}</div>
      {suppliers[selected].quelle_url && <p className="note"><a href={suppliers[selected].quelle_url} target="_blank" rel="noreferrer">Quelle öffnen →</a></p>}
    </Panel>}
    <Panel title="Freigabe-Regel"><p className="note">Ein Lieferant gilt erst als „verifiziert", wenn Vertrag, Preise, Versand, Retouren und Tracking real geprüft wurden — nicht schon nach der ersten Recherche. Keine kostenpflichtige Lieferanten-/App-Anbindung ohne ausdrückliche Freigabe.</p></Panel>
    {creating && <SupplierModal onClose={() => setCreating(false)} onSave={async form => { if (await onCreate(form)) setCreating(false); }} />}
  </>;
}
function SupplierModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: "", region: "Deutschland", categories: "", quelle_url: "" });
  return <div className="modalBack"><div className="modal"><div className="modalHead"><h3>Neuer Lieferant</h3><button onClick={onClose}>×</button></div>
    <label>Name<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
    <label>Region<select value={form.region} onChange={e => setForm({ ...form, region: e.target.value })}><option>Deutschland</option><option>EU</option></select></label>
    <label>Kategorien<input value={form.categories} onChange={e => setForm({ ...form, categories: e.target.value })} /></label>
    <label>Quelle (URL, optional)<input value={form.quelle_url} onChange={e => setForm({ ...form, quelle_url: e.target.value })} /></label>
    <div className="modalActions"><button onClick={onClose}>Abbrechen</button><button className="primary" disabled={!form.name} onClick={() => onSave(form)}>Anlegen</button></div>
  </div></div>;
}

function Bestellungen({ orders, coreLoading, productName, onFireEvent }) {
  return <>
    <div className="pageTitle"><div><span>ZAHLUNG → LIEFERUNG</span><h2>Bestellungen</h2></div></div>
    {coreLoading ? <Panel title="Bestellungen"><p>Daten werden geladen…</p></Panel> : orders.length === 0 ? <Panel title="Bestellungen"><p className="muted">Noch keine einzige echte Bestellung — es wurde noch nichts verkauft. Kein erfundener Bestand.</p></Panel> : <div className="taskTable">
      {orders.map(o => <div className="taskRow" key={o.id}>
        <div><strong>{o.id}</strong><small>{o.positionen.map(p => `${p.menge}× ${productName(p.produkt_id)}`).join(", ")}</small></div>
        <em className={o.status === "blocked" ? "blocked" : ""}>{ORDER_STATUS_LABEL[o.status]}</em>
        <span className="quick">
          {o.status === "payment_pending" && <button className="editMini" onClick={() => onFireEvent(o, "payment.confirmed")}>Zahlung bestätigen</button>}
          {o.status === "paid" && <button className="editMini" onClick={() => onFireEvent(o, "order.created")}>Prüfen</button>}
          {o.status === "validated" && <button className="editMini" onClick={() => onFireEvent(o, "order.validated")}>An Lieferanten</button>}
        </span>
      </div>)}
    </div>}
    <Panel title="Automation-Gate"><p className="note">Jeder Schritt wird nur ausgeführt, wenn zum Zeitpunkt der Bestellung wirklich ein veröffentlichtes Produkt, ein verifizierter Lieferant und eine positive Marge in der Datenbank stehen. Fehlt eine Voraussetzung, wird die Bestellung ehrlich als „🔴 Blockiert" markiert statt sie stillschweigend durchlaufen zu lassen.</p></Panel>
  </>;
}

function Kunden({ customers, coreLoading, onCreate }) {
  const [creating, setCreating] = useState(false);
  return <>
    <div className="pageTitle"><div><span>KUNDEN</span><h2>{coreLoading ? "Kunden" : customers.length + " Kunde" + (customers.length === 1 ? "" : "n")}</h2></div><button className="primaryLink" onClick={() => setCreating(true)}>+ Kunde</button></div>
    {coreLoading ? <Panel title="Kunden"><p>Daten werden geladen…</p></Panel> : customers.length === 0 ? <Panel title="Kunden"><p className="muted">Noch kein einziger echter Kunde vorhanden — es wurde noch nichts verkauft. Kein erfundener Bestand.</p></Panel> : <div className="taskTable">
      {customers.map(c => <div className="taskRow" key={c.id}><div><strong>{c.name}</strong><small>{c.email}</small></div><em>{new Date(c.erstellt_am).toLocaleDateString("de-DE")}</em></div>)}
    </div>}
    {creating && <CustomerModal onClose={() => setCreating(false)} onSave={async form => { if (await onCreate(form)) setCreating(false); }} />}
  </>;
}
function CustomerModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: "", email: "", adresse: "" });
  return <div className="modalBack"><div className="modal"><div className="modalHead"><h3>Neuer Kunde</h3><button onClick={onClose}>×</button></div>
    <label>Name<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
    <label>E-Mail<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
    <label>Adresse (optional)<input value={form.adresse} onChange={e => setForm({ ...form, adresse: e.target.value })} /></label>
    <div className="modalActions"><button onClick={onClose}>Abbrechen</button><button className="primary" disabled={!form.name || !form.email.includes("@")} onClick={() => onSave(form)}>Anlegen</button></div>
  </div></div>;
}

function Zahlungen({ providers, providersLoading, systems }) {
  return <>
    <div className="pageTitle"><div><span>PAYMENT GATE</span><h2>Zahlungen</h2></div></div>
    {providersLoading ? <Panel title="Zahlungsanbieter"><p>Daten werden geladen…</p></Panel> : <Panel title="Zahlungsanbieter">
      {["stripe", "shopify"].map(id => <div className="row" key={id}><div><strong>{id === "stripe" ? "Stripe" : "Shopify"}</strong><small>{providers?.capabilities?.[id]?.join(", ")}</small></div><span>{providers?.providers?.[id]?.configured ? "🟡 konfiguriert" : "⚪ nicht konfiguriert"} · {providers?.providers?.[id]?.productionReady ? "🟢 produktiv" : "🔴 nicht produktiv"}</span></div>)}
      <p className="note">{providers?.note}</p>
    </Panel>}
    {systems.filter(s => s.id === "paypal").map(s => <Panel title="PayPal" key={s.id}><p className="note">{s.status} {s.note}</p></Panel>)}
    <Panel title="Payment-Regel"><p className="note">Keine echte Zahlung wird verarbeitet, bevor Signaturprüfung, persistenter Webhook-Store und ein echtes Händlerkonto vollständig eingerichtet sind. Bis dahin bleibt jeder Zahlungsanbieter „nicht produktiv" — auch wenn technisch konfiguriert.</p></Panel>
  </>;
}

function Retouren({ returns, coreLoading, onSetStatus }) {
  return <>
    <div className="pageTitle"><div><span>RETOUREN</span><h2>{coreLoading ? "Retouren" : returns.length + " Retoure" + (returns.length === 1 ? "" : "n")}</h2></div></div>
    {coreLoading ? <Panel title="Retouren"><p>Daten werden geladen…</p></Panel> : returns.length === 0 ? <Panel title="Retouren"><p className="muted">Noch keine einzige Retoure — es wurde noch nichts bestellt und zurückgeschickt.</p></Panel> : <div className="taskTable">
      {returns.map(r => <div className="taskRow" key={r.id}>
        <div><strong>{r.bestellung_id}</strong><small>{r.grund}</small></div>
        <em>{RETURN_STATUS_LABEL[r.status]}</em>
        <span className="quick">{["genehmigt", "abgelehnt", "erhalten", "erstattet"].filter(s => s !== r.status).map(s => <button className="editMini" key={s} onClick={() => onSetStatus(r.id, s)}>{RETURN_STATUS_LABEL[s]}</button>)}</span>
      </div>)}
    </div>}
  </>;
}

function Finanzen({ finance, financeLoading, onCreate }) {
  const [open, setOpen] = useState(false);
  const totals = finance.reduce((a, e) => { if (e.status === "cancelled") return a; const n = Number(e.amount) || 0; if (e.kind === "income") a.income += n; else a.expense += n; a.net = a.income - a.expense; return a; }, { income: 0, expense: 0, net: 0 });
  return <>
    <div className="pageTitle"><div><span>FINANCE CONTROL</span><h2>E-Commerce-Finanzen</h2></div><button className="primaryLink" onClick={() => setOpen(true)}>+ Buchung</button></div>
    <div className="kpis"><Kpi label="Einnahmen" value={formatEUR(totals.income)} /><Kpi label="Kosten" value={formatEUR(totals.expense)} /><Kpi label="Netto" value={formatEUR(totals.net)} /><Kpi label="Buchungen" value={financeLoading ? "…" : finance.length} /></div>
    <Panel title="Buchungen (business_id: ecommerce)">
      {financeLoading ? <p>Daten werden geladen…</p> : finance.length === 0 ? <p className="muted">Noch keine echten Finanzdaten für E-Commerce verbunden. Keine Zahlen erfunden.</p> : finance.map(e => <div className="taskMini" key={e.id}><span>{e.kind === "income" ? "Einnahme" : "Kosten"}</span><div><strong>{e.description || e.category}</strong><small>{e.category} · {new Date(e.occurred_at).toLocaleDateString("de-DE")}</small></div><b>{e.kind === "income" ? "+" : "−"} {formatEUR(Number(e.amount))}</b></div>)}
    </Panel>
    {open && <FinanceModal onClose={() => setOpen(false)} onSave={async form => { if (await onCreate(form)) setOpen(false); }} />}
  </>;
}
function FinanceModal({ onClose, onSave }) {
  const [form, setForm] = useState({ kind: "expense", amount: "", category: "", description: "", status: "confirmed", source: "manual", occurred_at: new Date().toISOString() });
  const change = (k, v) => setForm({ ...form, [k]: v });
  return <div className="modalBack"><div className="modal"><div className="modalHead"><h3>Finanzbuchung (E-Commerce)</h3><button onClick={onClose}>×</button></div>
    <label>Art<select value={form.kind} onChange={e => change("kind", e.target.value)}><option value="expense">Kosten</option><option value="income">Einnahme</option></select></label>
    <label>Betrag (EUR)<input type="number" min="0" step="0.01" value={form.amount} onChange={e => change("amount", e.target.value)} /></label>
    <label>Kategorie<input value={form.category} onChange={e => change("category", e.target.value)} placeholder="z. B. Versand" /></label>
    <label>Beschreibung<input value={form.description} onChange={e => change("description", e.target.value)} /></label>
    <div className="modalActions"><button onClick={onClose}>Abbrechen</button><button className="primary" disabled={!form.amount || !form.category} onClick={() => onSave(form)}>Speichern</button></div>
  </div></div>;
}

function Automation() {
  const [test, setTest] = useState(null);
  async function runSelfTest() {
    setTest("running");
    try {
      const res = await fetch("/api/automation", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "transition", orderId: "self-test", currentState: "payment_pending", type: "payment.confirmed" }) });
      setTest(await res.json());
    } catch (e) { setTest({ ok: false, error: e.message }); }
  }
  const flows = [
    ["Neue Bestellung", "Zahlung bestätigt → Bestellung erfassen → Produkt/Lieferant prüfen → Lieferauftrag vorbereiten → Tracking speichern → Kunde informieren", "🟡"],
    ["Lieferantenprüfung", "Produktdaten → EK → Versand → Lieferzeit → Retouren → Compliance → Marge → Quality Gate", "🟢"],
    ["Finanzen", "Bestellung → Umsatz → Gebühren → Lieferkosten → Marketing → Retourenreserve → Deckungsbeitrag", "🟡"],
    ["Fehlerwache", "Fehler in Zahlung/Bestellung/Versand → Aufgabe erzeugen → Status rot → keine weitere automatische Bestellung", "🟡"],
  ];
  return <>
    <div className="pageTitle"><div><span>AUTOMATION CONTROL</span><h2>Automationen</h2></div></div>
    <Panel title="Automatik-Regel"><p className="note">Das System darf wiederholbare Abläufe automatisieren. Es darf aber keine Händlerkonten eröffnen, Identitäten bestätigen, rechtliche Erklärungen abgeben, Geld ausgeben oder eine Produktfreigabe erfinden.</p></Panel>
    <Panel title="Flows">{flows.map(([t, d, s]) => <div className="row" key={t}><div><strong>{s} {t}</strong><small>{d}</small></div></div>)}</Panel>
    <Panel title="Self-Test"><button className="primaryLink" onClick={runSelfTest}>Self-Test starten</button>{test && <pre>{typeof test === "string" ? test : JSON.stringify(test, null, 2)}</pre>}</Panel>
  </>;
}

function Systeme({ systems, loading }) {
  return <>
    <div className="pageTitle"><div><span>INFRASTRUCTURE (E-COMMERCE)</span><h2>Systeme</h2></div></div>
    {loading ? <Panel title="Systeme"><p>Daten werden geladen…</p></Panel> : <div className="systemGrid">{systems.map(s => <div className="system" key={s.id}><b>{s.status} {s.name}</b><small>{s.note}</small></div>)}</div>}
    <Panel title="Hinweis"><p className="note">Nur die für E-Commerce relevanten Systeme (Datenbank, Stripe, PayPal, Shopify). Bearbeitung/vollständige Übersicht aller Systeme bleibt in der <a href="/master">Master-Zentrale → Systeme</a>.</p></Panel>
  </>;
}

function QualityGate({ gate, loading }) {
  return <>
    <div className="pageTitle"><div><span>QUALITY GATE</span><h2>Produktionsfreigabe</h2></div></div>
    {loading ? <Panel title="Quality Gate"><p>Daten werden geladen…</p></Panel> : <>
      <div className="kpis"><Kpi label="Status" value={gate?.productionReady ? "🟢 bereit" : "🔴 gesperrt"} /><Kpi label="Geprüft" value={gate?.checkedAt ? new Date(gate.checkedAt).toLocaleString("de-DE") : "—"} /></div>
      <Panel title="Checks">{(gate?.checks || []).map(c => <div className="row" key={c.id}><div><strong>{c.id}</strong><small>{c.message}</small></div><span>{c.status}</span></div>)}
        {!gate?.checks?.length && <p className="muted">{gate?.error || "Keine Check-Daten verfügbar."}</p>}
      </Panel>
    </>}
    <Panel title="Hinweis"><p className="note">Dies ist das zentrale, für die gesamte Master-Zentrale geltende Quality Gate (s. <a href="/master">Master-Zentrale → Systeme</a>) — es wirkt auch auf den E-Commerce-Bereich. Es gibt bewusst kein zweites, separates E-Commerce-Quality-Gate, um keine widersprüchlichen Freigabestände zu riskieren.</p></Panel>
  </>;
}

function Einstellungen() {
  return <>
    <div className="pageTitle"><div><span>E-COMMERCE SETTINGS</span><h2>Steuerung</h2></div></div>
    <Panel title="Grundregeln"><div className="rules"><b>🔒 Keine Secrets im GitHub-Repository</b><b>💶 Keine Kosten ohne Freigabe</b><b>🧪 Keine echte Bestellung ohne vollständiges Quality Gate</b><b>🛑 Kein Schritt wird in der Produkt-Pipeline übersprungen</b><b>📦 Kein Lagerbestand — nur geprüfte Direktversand-Lieferanten</b></div></Panel>
    <Panel title="Zugehörigkeit"><p className="note">Dieser gesamte Bereich gehört zum Geschäftsbereich <code>business_id: "ecommerce"</code> (s. <code>lib/master-store.js</code>). Werknetz24-Daten werden hier nie geladen oder angezeigt — für Werknetz24 s. die <a href="/master">Master-Zentrale</a>.</p></Panel>
  </>;
}

const styles = `
*{box-sizing:border-box}.app{min-height:100vh;background:#f5f7fa;color:#101828;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.topbar{background:#101828;color:#fff;padding:28px max(22px,calc((100vw - 1400px)/2));display:flex;justify-content:space-between;gap:30px}.eyebrow{font-size:10px;font-weight:800;letter-spacing:.14em;color:#98a2b3}.topbar h1{font-size:34px;letter-spacing:-.035em;margin:7px 0}.topbar p{margin:0;color:#c0c5d0;max-width:600px}.topActions{display:flex;gap:8px;align-items:flex-start}.topActions a,.live{padding:9px 11px;border:1px solid #344054;border-radius:8px;color:#fff;text-decoration:none;font-size:12px}.live{background:#1d2939}.live i{display:inline-block;width:7px;height:7px;border-radius:50%;background:#7f56d9;margin-right:6px}.layout{display:grid;grid-template-columns:220px minmax(0,1fr);max-width:1400px;margin:auto}.sidebar{background:#fff;border-right:1px solid #e4e7ec;min-height:calc(100vh - 116px);padding:18px 12px}.sidebar button,.sideBottom a{width:100%;display:flex;gap:10px;align-items:center;border:0;background:transparent;text-align:left;padding:11px 12px;border-radius:8px;color:#475467;text-decoration:none;font:inherit;cursor:pointer}.sidebar button:hover,.sidebar .selected{background:#f2f4f7;color:#101828}.sidebar button b{width:20px}.sideBottom{border-top:1px solid #eaecf0;margin-top:18px;padding-top:14px}.sideBottom a{font-size:12px}.content{padding:28px;min-width:0}.pageTitle{display:flex;justify-content:space-between;align-items:end;gap:15px;margin-bottom:18px;flex-wrap:wrap}.pageTitle>div>span{font-size:10px;font-weight:800;letter-spacing:.13em;color:#667085}.pageTitle h2{margin:5px 0 0;font-size:28px;letter-spacing:-.03em}.quick{display:flex;gap:8px;align-items:center}.primaryLink{padding:9px 11px;background:#101828;color:#fff;border:0;border-radius:8px;text-decoration:none;font-size:12px;cursor:pointer}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.kpi{background:#fff;border:1px solid #e4e7ec;border-radius:12px;padding:17px}.kpi span,.kpi small{display:block;color:#667085;font-size:12px}.kpi strong{display:block;font-size:26px;letter-spacing:-.03em;margin:8px 0 3px}.columns{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px}.panel{background:#fff;border:1px solid #e4e7ec;border-radius:12px;padding:19px;margin-top:14px}.panelTitle{display:flex;justify-content:space-between;margin-bottom:13px}.panel h3{margin:0;font-size:16px}.row,.taskMini,.taskRow{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #eaecf0}.row:last-child,.taskMini:last-child,.taskRow:last-child{border-bottom:0}.row>div,.taskMini>div,.taskRow>div{flex:1}.row strong,.taskMini strong,.taskRow strong{display:block}.row small,.taskMini small,.taskRow small{display:block;color:#667085;font-size:12px;margin-top:3px}.row>span{font-size:11px;color:#667085}.taskMini>span{font-size:10px;border-radius:999px;background:#f2f4f7;padding:5px 7px}.taskRow.head{font-size:11px;font-weight:800;color:#667085;background:#f9fafb}.taskRow>em,.taskRow>i.businessBadge{font-size:11px;font-style:normal;padding:6px 8px;background:#f2f4f7;border-radius:999px;white-space:nowrap}.taskRow>i.businessBadge{background:#eef2ff;color:#3538cd}.taskRow em.blocked{background:#fef3f2;color:#b42318}.taskTable{background:#fff;border:1px solid #e4e7ec;border-radius:12px;padding:0 18px}.editMini{border:1px solid #d0d5dd;background:#fff;border-radius:7px;padding:7px 9px;font-size:11px;cursor:pointer}.editMini:disabled{opacity:.5;cursor:default}.search{border:1px solid #d0d5dd;border-radius:8px;padding:9px 11px}.muted{color:#667085;padding:16px}.note{color:#667085;font-size:13px;line-height:1.5}.note a{color:#175cd3}.pipelineSteps{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:5px}.pipelineSteps div{border:1px solid #eaecf0;border-radius:9px;background:#f9fafb;padding:12px;font-size:12px}.pipelineSteps b{display:block;color:#667085;margin-bottom:6px}.systemGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.system{border:1px solid #eaecf0;border-radius:10px;padding:13px;background:#fff}.system small{display:block;color:#667085;font-size:12px;margin-top:5px}.rules{display:grid;gap:11px}.rules b{padding:12px;background:#f9fafb;border:1px solid #eaecf0;border-radius:8px;display:block;font-weight:600}.notice{background:#ecfdf3;border:1px solid #abefc6;color:#067647;padding:10px 12px;border-radius:8px;margin-bottom:14px;font-size:12px;display:flex;justify-content:space-between}.notice button{border:0;background:transparent;cursor:pointer}pre{margin-top:12px;background:#101828;color:#d0d5dd;padding:14px;border-radius:10px;overflow:auto;font-size:12px}.modalBack{position:fixed;inset:0;background:rgba(16,24,40,.45);display:grid;place-items:center;padding:20px;z-index:20}.modal{background:#fff;border-radius:13px;width:min(460px,100%);padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.2)}.modalHead{display:flex;justify-content:space-between}.modalHead h3{margin:0 0 15px}.modalHead button{border:0;background:transparent;font-size:22px;cursor:pointer}.modal label{display:block;font-size:12px;font-weight:700;margin-top:12px}.modal input,.modal select{display:block;width:100%;margin-top:5px;padding:10px;border:1px solid #d0d5dd;border-radius:7px}.modalActions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.modalActions button{padding:9px 12px;border:1px solid #d0d5dd;background:#fff;border-radius:7px;cursor:pointer}.modalActions .primary{background:#101828;color:#fff}footer{max-width:1400px;margin:auto;padding:18px 28px 30px;color:#667085;font-size:11px}@media(max-width:900px){.layout{grid-template-columns:1fr}.sidebar{min-height:auto;border-right:0;border-bottom:1px solid #e4e7ec;display:flex;overflow:auto}.sidebar button{min-width:max-content}.sideBottom{display:none}.kpis,.systemGrid,.pipelineSteps{grid-template-columns:1fr 1fr}.columns{grid-template-columns:1fr}}@media(max-width:600px){.topbar{display:block}.topActions{margin-top:15px}.content{padding:18px}.kpis,.systemGrid,.pipelineSteps{grid-template-columns:1fr}.pageTitle{display:block}.quick{margin-top:12px}}
`;
