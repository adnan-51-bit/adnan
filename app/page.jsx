"use client";

import { useMemo, useState } from "react";

const initialLeads = [
  {
    id: 1,
    company: "Demo Betrieb GmbH",
    contact: "Max Mustermann",
    email: "test@example.com",
    subject: "Angebotsanfrage",
    source: "Website",
    category: "Angebot",
    priority: "Hoch",
    status: "Neu",
    followUp: "2026-09-21",
    notes: "Künstliche Testdaten."
  },
  {
    id: 2,
    company: "Beispiel Service",
    contact: "Erika Beispiel",
    email: "demo@example.com",
    subject: "Terminwunsch",
    source: "E-Mail",
    category: "Termin",
    priority: "Mittel",
    status: "Offen",
    followUp: "2026-09-22",
    notes: "Künstliche Testdaten."
  },
  {
    id: 3,
    company: "Muster & Partner",
    contact: "Testkontakt",
    email: "test2@example.com",
    subject: "Rückfrage",
    source: "Formular",
    category: "Rückfrage",
    priority: "Niedrig",
    status: "Erledigt",
    followUp: "",
    notes: "Künstliche Testdaten."
  }
];

const statuses = ["Neu", "Offen", "Erledigt"];
const priorities = ["Hoch", "Mittel", "Niedrig"];
const categories = ["Angebot", "Termin", "Rückfrage", "Sonstiges"];

export default function Home() {
  const [leads, setLeads] = useState(initialLeads);
  const [filterStatus, setFilterStatus] = useState("Alle");
  const [filterPriority, setFilterPriority] = useState("Alle");
  const [selectedId, setSelectedId] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const visible = useMemo(() => {
    return leads.filter((lead) => {
      const statusOk = filterStatus === "Alle" || lead.status === filterStatus;
      const priorityOk = filterPriority === "Alle" || lead.priority === filterPriority;
      return statusOk && priorityOk;
    });
  }, [leads, filterStatus, filterPriority]);

  const selected = leads.find((lead) => lead.id === selectedId) ?? null;

  function updateLead(id, patch) {
    setLeads((current) =>
      current.map((lead) => (lead.id === id ? { ...lead, ...patch } : lead))
    );
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
          <p className="eyebrow">ONLINE-ANFRAGEN-AUTOMATION · MVP</p>
          <h1>Anfragen-Zentrale</h1>
          <p className="muted">Demo-Dashboard. Alle angezeigten Kontakte sind künstliche Testdaten.</p>
        </div>
        <button className="primary" onClick={() => setShowNew(true)}>+ Neue Anfrage</button>
      </header>

      <section className="stats">
        <Metric title="Gesamt" value={leads.length} />
        <Metric title="Offen" value={leads.filter((l) => l.status !== "Erledigt").length} />
        <Metric title="Hohe Priorität" value={leads.filter((l) => l.priority === "Hoch" && l.status !== "Erledigt").length} />
        <Metric title="Erledigt" value={leads.filter((l) => l.status === "Erledigt").length} />
      </section>

      <section className="toolbar">
        <div>
          <label>Status </label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option>Alle</option>
            {statuses.map((s) => <option key={s}>{s}</option>)}
          </select>
          <label> Priorität </label>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
            <option>Alle</option>
            {priorities.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
      </section>

      <section className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Unternehmen</th>
              <th>Anfrage</th>
              <th>Quelle</th>
              <th>Kategorie</th>
              <th>Priorität</th>
              <th>Status</th>
              <th>Follow-up</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((lead) => (
              <tr key={lead.id}>
                <td><b>{lead.company}</b><small>{lead.contact}</small></td>
                <td><b>{lead.subject}</b><small>{lead.email}</small></td>
                <td>{lead.source}</td>
                <td>{lead.category}</td>
                <td><span className={"priority " + lead.priority.toLowerCase()}>{lead.priority}</span></td>
                <td>
                  <select value={lead.status} onChange={(e) => updateLead(lead.id, { status: e.target.value })}>
                    {statuses.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td>{lead.followUp || "—"}</td>
                <td><button onClick={() => setSelectedId(lead.id)}>Öffnen</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {selected && (
        <section className="panel">
          <div className="panelHead">
            <div><h2>{selected.company}</h2><p className="muted">{selected.subject}</p></div>
            <button onClick={() => setSelectedId(null)}>Schließen</button>
          </div>
          <div className="detailGrid">
            <label>Kontakt<input value={selected.contact} onChange={(e) => updateLead(selected.id, { contact: e.target.value })} /></label>
            <label>E-Mail<input value={selected.email} onChange={(e) => updateLead(selected.id, { email: e.target.value })} /></label>
            <label>Quelle<select value={selected.source} onChange={(e) => updateLead(selected.id, { source: e.target.value })}><option>Website</option><option>E-Mail</option><option>Formular</option><option>Sonstiges</option></select></label>
            <label>Kategorie<select value={selected.category} onChange={(e) => updateLead(selected.id, { category: e.target.value })}>{categories.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label>Priorität<select value={selected.priority} onChange={(e) => updateLead(selected.id, { priority: e.target.value })}>{priorities.map((p) => <option key={p}>{p}</option>)}</select></label>
            <label>Follow-up<input type="date" value={selected.followUp} onChange={(e) => updateLead(selected.id, { followUp: e.target.value })} /></label>
          </div>
          <label className="notes">Notizen<textarea value={selected.notes} onChange={(e) => updateLead(selected.id, { notes: e.target.value })} /></label>
        </section>
      )}

      {showNew && (
        <section className="panel">
          <div className="panelHead"><h2>Neue Anfrage</h2><button onClick={() => setShowNew(false)}>Abbrechen</button></div>
          <form onSubmit={createLead} className="detailGrid">
            <label>Unternehmen<input name="company" required /></label>
            <label>Ansprechpartner<input name="contact" required /></label>
            <label>E-Mail<input name="email" type="email" required /></label>
            <label>Anfrage<input name="subject" required /></label>
            <label>Quelle<select name="source"><option>Website</option><option>E-Mail</option><option>Formular</option><option>Sonstiges</option></select></label>
            <label>Kategorie<select name="category">{categories.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label>Priorität<select name="priority">{priorities.map((p) => <option key={p}>{p}</option>)}</select></label>
            <label>Follow-up<input name="followUp" type="date" /></label>
            <label className="notes">Notizen<textarea name="notes" /></label>
            <div><button className="primary" type="submit">Anfrage speichern</button></div>
          </form>
        </section>
      )}

      <footer>Nächste Phase: persistente Speicherung, echte Eingangskanäle, Benachrichtigungen und Follow-up-Automation.</footer>

      <style jsx>{`
        .page{max-width:1200px;margin:0 auto;padding:40px 24px;font-family:Arial,sans-serif;color:#15171a}
        .header,.toolbar,.panelHead{display:flex;justify-content:space-between;align-items:center;gap:20px}
        .eyebrow{font-size:12px;letter-spacing:.12em;font-weight:700;color:#667085}
        h1{font-size:36px;margin:6px 0}.muted,small,footer{color:#667085}
        small{display:block;margin-top:4px}
        button,select,input,textarea{font:inherit}
        button{border:1px solid #d0d5dd;background:#fff;border-radius:8px;padding:8px 12px;cursor:pointer}
        .primary{background:#15171a;color:#fff;border-color:#15171a}
        .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:28px 0}
        .stats div,.panel{background:#fff;border:1px solid #e4e7ec;border-radius:12px;padding:18px}
        .stats span{display:block;color:#667085;font-size:13px}.stats strong{display:block;font-size:28px;margin-top:8px}
        .tableWrap{background:#fff;border:1px solid #e4e7ec;border-radius:12px;overflow:auto}
        table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:14px;border-bottom:1px solid #eaecf0;font-size:14px}th{font-size:12px;color:#667085;text-transform:uppercase}
        .priority{padding:5px 9px;border-radius:999px;font-size:12px;font-weight:700}.priority.hoch{background:#fee4e2;color:#b42318}.priority.mittel{background:#fef0c7;color:#b54708}.priority.niedrig{background:#d1fadf;color:#027a48}
        .panel{margin-top:20px}.detailGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}.detailGrid label,.notes{display:flex;flex-direction:column;gap:6px;font-size:13px;color:#475467}.detailGrid input,.detailGrid select,.notes textarea{border:1px solid #d0d5dd;border-radius:8px;padding:9px;background:#fff;color:#15171a}.notes{grid-column:1/-1}.notes textarea{min-height:90px;resize:vertical}
        footer{margin-top:20px;font-size:13px}
        @media(max-width:800px){.stats{grid-template-columns:repeat(2,1fr)}.header,.toolbar,.panelHead{display:block}.detailGrid{grid-template-columns:1fr}}
      `}
      </style>
    </main>
  );
}

function Metric({ title, value }) {
  return <div><span>{title}</span><strong>{value}</strong></div>;
}
