"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "online-anfragen-leads-v1";

const initialLeads = [
  { id: 1, company: "Demo Betrieb GmbH", contact: "Max Mustermann", email: "test@example.com", subject: "Angebotsanfrage", source: "Website", category: "Angebot", priority: "Hoch", status: "Neu", followUp: "2026-09-21", notes: "Künstliche Testdaten." },
  { id: 2, company: "Beispiel Service", contact: "Erika Beispiel", email: "demo@example.com", subject: "Terminwunsch", source: "E-Mail", category: "Termin", priority: "Mittel", status: "Offen", followUp: "2026-09-22", notes: "Künstliche Testdaten." },
  { id: 3, company: "Muster & Partner", contact: "Testkontakt", email: "test2@example.com", subject: "Rückfrage", source: "Formular", category: "Rückfrage", priority: "Niedrig", status: "Erledigt", followUp: "", notes: "Künstliche Testdaten." }
];

const statuses = ["Neu", "Offen", "Erledigt"];
const priorities = ["Hoch", "Mittel", "Niedrig"];
const categories = ["Angebot", "Termin", "Rückfrage", "Sonstiges"];

export default function Home() {
  const [view, setView] = useState("projekt");
  const [leads, setLeads] = useState(initialLeads);
  const [filterStatus, setFilterStatus] = useState("Alle");
  const [filterPriority, setFilterPriority] = useState("Alle");
  const [selectedId, setSelectedId] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setLeads(JSON.parse(saved));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  }, [leads, loaded]);

  const visible = useMemo(() => leads.filter((lead) => {
    const statusOk = filterStatus === "Alle" || lead.status === filterStatus;
    const priorityOk = filterPriority === "Alle" || lead.priority === filterPriority;
    return statusOk && priorityOk;
  }), [leads, filterStatus, filterPriority]);

  const selected = leads.find((lead) => lead.id === selectedId) ?? null;
  const openCount = leads.filter((l) => l.status !== "Erledigt").length;
  const highCount = leads.filter((l) => l.priority === "Hoch" && l.status !== "Erledigt").length;
  const doneCount = leads.filter((l) => l.status === "Erledigt").length;

  function updateLead(id, patch) {
    setLeads((current) => current.map((lead) => lead.id === id ? { ...lead, ...patch } : lead));
  }

  function createLead(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const lead = {
      id: Date.now(),
      company: String(form.get("company")),
      contact: String(form.get("contact")),
      email: String(form.get("email")),
      subject: String(form.get("subject")),
      source: String(form.get("source")),
      category: String(form.get("category")),
      priority: String(form.get("priority")),
      status: "Neu",
      followUp: String(form.get("followUp") || ""),
      notes: String(form.get("notes") || "")
    };
    setLeads((current) => [lead, ...current]);
    setShowNew(false);
    setSelectedId(lead.id);
  }

  return (
    <main className="page">
      <header className="header">
        <div>
          <p className="eyebrow">ONLINE-ANFRAGEN-AUTOMATION</p>
          <h1>Projektzentrale</h1>
          <p className="muted">Kontrollzentrum für Projektstand, Leads und nächste Schritte.</p>
        </div>
        <span className="badge">🟡 TESTPHASE</span>
      </header>

      <nav className="nav">
        <button className={view === "projekt" ? "navActive" : ""} onClick={() => setView("projekt")}>Projektzentrale</button>
        <button className={view === "leads" ? "navActive" : ""} onClick={() => setView("leads")}>Anfragen</button>
        <a className="navLink" href="/shop">Shop & Gewinn</a>
      </nav>

      {view === "projekt" ? (
        <ProjectOverview leads={leads} onLeads={() => setView("leads")} />
      ) : (
        <>
          <section className="stats">
            <Metric title="Gesamt" value={leads.length} />
            <Metric title="Offen" value={openCount} />
            <Metric title="Hohe Priorität" value={highCount} />
            <Metric title="Erledigt" value={doneCount} />
          </section>

          <section className="toolbar">
            <div>
              <label>Status </label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option>Alle</option>{statuses.map((s) => <option key={s}>{s}</option>)}
              </select>
              <label> Priorität </label>
              <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
                <option>Alle</option>{priorities.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <button className="primary" onClick={() => setShowNew(true)}>+ Neue Anfrage</button>
          </section>

          <section className="tableWrap">
            <table>
              <thead><tr><th>Unternehmen</th><th>Anfrage</th><th>Quelle</th><th>Kategorie</th><th>Priorität</th><th>Status</th><th>Follow-up</th><th></th></tr></thead>
              <tbody>{visible.map((lead) => (
                <tr key={lead.id}>
                  <td><b>{lead.company}</b><small>{lead.contact}</small></td>
                  <td><b>{lead.subject}</b><small>{lead.email}</small></td>
                  <td>{lead.source}</td><td>{lead.category}</td>
                  <td><span className={"priority " + lead.priority.toLowerCase()}>{lead.priority}</span></td>
                  <td><select value={lead.status} onChange={(e) => updateLead(lead.id, { status: e.target.value })}>{statuses.map((s) => <option key={s}>{s}</option>)}</select></td>
                  <td>{lead.followUp || "—"}</td>
                  <td><button onClick={() => setSelectedId(lead.id)}>Öffnen</button></td>
                </tr>
              ))}</tbody>
            </table>
          </section>

          {selected && <LeadDetail lead={selected} updateLead={updateLead} close={() => setSelectedId(null)} />}
          {showNew && <NewLeadForm createLead={createLead} close={() => setShowNew(false)} />}
          <p className="notice">Hinweis: Leads werden derzeit lokal im Browser gespeichert. Noch keine zentrale Produktiv-Datenbank.</p>
        </>
      )}

      <footer>Stand: 20.09.2026 · Demo/Testdaten · Produktivbetrieb noch nicht aktiviert</footer>

      <style jsx>{`
        .page{max-width:1200px;margin:0 auto;padding:40px 24px;font-family:Arial,sans-serif;color:#15171a}.header{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}.eyebrow{font-size:12px;letter-spacing:.12em;font-weight:700;color:#667085}h1{font-size:36px;margin:6px 0}.muted,.notice,footer,small{color:#667085}.badge{padding:8px 12px;border-radius:999px;background:#fef0c7;color:#b54708;font-weight:700}.nav{display:flex;gap:8px;margin:24px 0}.nav button{border:1px solid #d0d5dd;background:#fff;border-radius:8px;padding:9px 13px;cursor:pointer}.navActive{background:#15171a!important;color:#fff}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:20px 0}.stats>div,.panel,.projectCard{background:#fff;border:1px solid #e4e7ec;border-radius:12px;padding:18px}.stats span{display:block;color:#667085;font-size:13px}.stats strong{display:block;font-size:28px;margin-top:8px}.toolbar,.panelHead,.phaseHead{display:flex;justify-content:space-between;align-items:center;gap:16px}.toolbar{margin:14px 0}.toolbar select,.toolbar label{margin-right:6px}.tableWrap{background:#fff;border:1px solid #e4e7ec;border-radius:12px;overflow:auto}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:14px;border-bottom:1px solid #eaecf0;font-size:14px}th{font-size:12px;color:#667085;text-transform:uppercase}small{display:block;margin-top:4px}button,select,input,textarea{font:inherit}button{border:1px solid #d0d5dd;background:#fff;border-radius:8px;padding:8px 12px;cursor:pointer}.primary{background:#15171a;color:#fff;border-color:#15171a}.priority{padding:5px 9px;border-radius:999px;font-size:12px;font-weight:700}.priority.hoch{background:#fee4e2;color:#b42318}.priority.mittel{background:#fef0c7;color:#b54708}.priority.niedrig{background:#d1fadf;color:#027a48}.panel{margin-top:20px}.detailGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}.detailGrid label,.notes{display:flex;flex-direction:column;gap:6px;font-size:13px;color:#475467}.detailGrid input,.detailGrid select,.notes textarea{border:1px solid #d0d5dd;border-radius:8px;padding:9px}.notes{grid-column:1/-1}.notes textarea{min-height:90px}.projectGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.projectCard strong{display:block;font-size:24px;margin-top:8px}.phase{margin-top:20px}.progress{height:10px;background:#eaecf0;border-radius:99px;overflow:hidden}.progress>div{height:100%;width:55%;background:#667085}.checklist{margin-top:14px}.check{padding:10px 0;border-bottom:1px solid #eaecf0}.green{color:#027a48}.yellow{color:#b54708}.gray{color:#667085}.links a{display:block;margin:9px 0;color:#175cd3}.notice{font-size:13px;margin-top:18px}footer{font-size:13px;margin-top:22px}@media(max-width:800px){.stats,.projectGrid{grid-template-columns:repeat(2,1fr)}.header,.toolbar,.panelHead,.phaseHead{display:block}.detailGrid{grid-template-columns:1fr}}
      `} .navLink{border:1px solid #d0d5dd;background:#fff;border-radius:8px;padding:9px 13px;cursor:pointer;text-decoration:none;color:#15171a;display:inline-block}.navLink:hover{background:#f8f9fb}</style>
    </main>
  );
}

function ProjectOverview({ leads, onLeads }) {
  const done = 8;
  const total = 15;
  const percent = Math.round((done / total) * 100);
  return <section>
    <div className="projectGrid">
      <Metric title="Projektphase" value="1 / 5" />
      <Metric title="Lead-System" value="🟡 MVP" />
      <Metric title="Datenbank" value="⚪ Offen" />
      <Metric title="Produktiv" value="🔴 Nein" />
    </div>
    <div className="panel phase">
      <div className="phaseHead"><div><h2>Gesamtfortschritt</h2><p className="muted">{done} von {total} geplanten Kernpunkten erledigt</p></div><strong>{percent}%</strong></div>
      <div className="progress"><div style={{width: percent + "%"}} /></div>
    </div>
    <div className="panel">
      <h2>Aktueller Stand</h2>
      {[
        ["green","✓","Dashboard vorhanden"],["green","✓","Neue Anfrage anlegen"],["green","✓","Lead bearbeiten"],["green","✓","Status / Priorität / Kategorie"],["green","✓","Follow-up und Notizen"],["green","✓","Browser-Speicherung vorhanden"],["yellow","!","Persistente zentrale Datenbank fehlt"],["gray","○","E-Mail- und Formular-Eingang"],["gray","○","Automatische Klassifizierung"],["gray","○","Follow-up-Automation"],["gray","○","Kundengewinnung"]
      ].map(([cls,icon,text]) => <div className={"check " + cls} key={text}>{icon} &nbsp; {text}</div>)}
    </div>
    <div className="panel">
      <h2>Nächster Schritt</h2>
      <p>Eine zentrale Datenbank anschließen, damit Leads nicht nur auf einem einzelnen Browser gespeichert werden.</p>
      <button className="primary" onClick={onLeads}>Anfragen öffnen</button>
    </div>
    <div className="panel links">
      <h2>Dokumentation</h2>
      <a href="https://github.com/adnan-51-bit/adnan/blob/main/docs/STATUS.md">STATUS.md</a>
      <a href="https://github.com/adnan-51-bit/adnan/blob/main/docs/ROADMAP.md">ROADMAP.md</a>
      <a href="https://github.com/adnan-51-bit/adnan/blob/main/docs/CHANGELOG.md">CHANGELOG.md</a>
      <a href="https://github.com/adnan-51-bit/adnan/blob/main/docs/DECISIONS.md">DECISIONS.md</a>
    </div>
  </section>;
}

function LeadDetail({ lead, updateLead, close }) {
  return <section className="panel">
    <div className="panelHead"><div><h2>{lead.company}</h2><p className="muted">{lead.subject}</p></div><button onClick={close}>Schließen</button></div>
    <div className="detailGrid">
      <label>Kontakt<input value={lead.contact} onChange={(e) => updateLead(lead.id, {contact:e.target.value})}/></label>
      <label>E-Mail<input value={lead.email} onChange={(e) => updateLead(lead.id, {email:e.target.value})}/></label>
      <label>Quelle<select value={lead.source} onChange={(e) => updateLead(lead.id, {source:e.target.value})}><option>Website</option><option>E-Mail</option><option>Formular</option><option>Sonstiges</option></select></label>
      <label>Kategorie<select value={lead.category} onChange={(e) => updateLead(lead.id, {category:e.target.value})}>{categories.map((c)=><option key={c}>{c}</option>)}</select></label>
      <label>Priorität<select value={lead.priority} onChange={(e) => updateLead(lead.id, {priority:e.target.value})}>{priorities.map((p)=><option key={p}>{p}</option>)}</select></label>
      <label>Status<select value={lead.status} onChange={(e) => updateLead(lead.id, {status:e.target.value})}>{statuses.map((s)=><option key={s}>{s}</option>)}</select></label>
      <label>Follow-up<input type="date" value={lead.followUp} onChange={(e) => updateLead(lead.id, {followUp:e.target.value})}/></label>
      <label className="notes">Notizen<textarea value={lead.notes} onChange={(e) => updateLead(lead.id, {notes:e.target.value})}/></label>
    </div>
  </section>;
}

function NewLeadForm({ createLead, close }) {
  return <section className="panel">
    <div className="panelHead"><h2>Neue Anfrage</h2><button onClick={close}>Abbrechen</button></div>
    <form onSubmit={createLead} className="detailGrid">
      <label>Unternehmen<input name="company" required/></label><label>Ansprechpartner<input name="contact" required/></label><label>E-Mail<input name="email" type="email" required/></label><label>Anfrage<input name="subject" required/></label>
      <label>Quelle<select name="source"><option>Website</option><option>E-Mail</option><option>Formular</option><option>Sonstiges</option></select></label>
      <label>Kategorie<select name="category">{categories.map((c)=><option key={c}>{c}</option>)}</select></label>
      <label>Priorität<select name="priority">{priorities.map((p)=><option key={p}>{p}</option>)}</select></label><label>Follow-up<input name="followUp" type="date"/></label>
      <label className="notes">Notizen<textarea name="notes"/></label>
      <div><button className="primary" type="submit">Anfrage speichern</button></div>
    </form>
  </section>;
}

function Metric({ title, value }) {
  return <div><span>{title}</span><strong>{value}</strong></div>;
}
