"use client";

// Zentrale Aufgabenliste (27.09.2026): alle Aufgaben aller Bereiche, auch die aus Einnahmequellen erzeugten.
// Status: Offen / In Arbeit / Wartet auf Benutzer / Erledigt / Gestoppt. Filter nach Status, Bereich, Einnahmequelle.
import { useEffect, useState } from "react";
import { adminFetch } from "../../lib/admin-fetch.js";
import { TASK_STATUS, TASK_PRIO, istOffen, istWartend, sortiereAufgaben } from "../../lib/aufgaben-status.js";

const datum = t => t ? new Date(t).toLocaleDateString("de-DE") : "—";
const bereichName = (id, businesses) => id === "master" || !id ? "Master-übergreifend" : businesses.find(b => b.id === id)?.name || id;

export function Aufgaben({ tasks, businesses, loading, onSave, onCreate }) {
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState({ status: "offen", bereich: "all", eq: "all", prio: "all" });
  const [eqs, setEqs] = useState([]);
  useEffect(() => { adminFetch("/api/master/businesses?einnahmequellen=1").then(r => r.ok ? r.json() : null).then(d => setEqs(d?.einnahmequellen || [])).catch(() => {}); }, []);
  const eqName = id => eqs.find(q => q.id === id)?.name || "Einnahmequelle";
  const sichtbar = sortiereAufgaben(tasks.filter(t =>
    (filter.status === "alle" || (filter.status === "offen" ? istOffen(t.status) : filter.status === "Wartet auf Benutzer" ? istWartend(t.status) : t.status === filter.status))
    && (filter.bereich === "all" || (t.business_id || "master") === filter.bereich)
    && (filter.eq === "all" || (filter.eq === "ohne" ? !t.einnahmequelle_id : t.einnahmequelle_id === filter.eq))
    && (filter.prio === "all" || t.priority === filter.prio)));
  const setF = (k, v) => setFilter(f => ({ ...f, [k]: v }));
  const zaehler = Object.fromEntries(TASK_STATUS.map(s => [s, tasks.filter(t => s === "Wartet auf Benutzer" ? istWartend(t.status) : t.status === s).length]));
  return <>
    <div className="pageTitle"><div><span>STEUERUNG</span><h2>Aufgaben</h2></div><div className="quick"><button className="primaryLink" onClick={() => setEditing({ title: "", area: "", business_id: "master", status: "Offen", priority: "Mittel", owner: "Adnan", due_at: "", beschreibung: "", naechste_aktion: "", quelle: "", ergebnis: "" })}>+ Aufgabe</button></div></div>
    <div className="afZaehler">{TASK_STATUS.map(s => <button key={s} className={filter.status === s ? "an" : ""} onClick={() => setF("status", filter.status === s ? "offen" : s)}>{s} <b>{zaehler[s]}</b></button>)}</div>
    <div className="afFilter">
      <select value={filter.status} onChange={e => setF("status", e.target.value)} aria-label="Status"><option value="offen">Alle offenen</option><option value="alle">Alle (auch erledigt/gestoppt)</option>{TASK_STATUS.map(s => <option key={s}>{s}</option>)}</select>
      <select value={filter.bereich} onChange={e => setF("bereich", e.target.value)} aria-label="Bereich"><option value="all">Alle Bereiche</option><option value="master">Master-übergreifend</option>{businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
      <select value={filter.eq} onChange={e => setF("eq", e.target.value)} aria-label="Einnahmequelle"><option value="all">Alle Einnahmequellen</option><option value="ohne">ohne Einnahmequelle</option>{eqs.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}</select>
      <select value={filter.prio} onChange={e => setF("prio", e.target.value)} aria-label="Priorität"><option value="all">Alle Prioritäten</option>{TASK_PRIO.map(p => <option key={p}>{p}</option>)}</select>
    </div>
    {loading ? <section className="panel"><p>Daten werden geladen…</p></section> : !sichtbar.length ? <section className="panel"><p className="afLeer">Keine Aufgaben für diesen Filter.</p></section> :
      <div className="afListe">{sichtbar.map(t => <article className={"afKarte" + (istWartend(t.status) ? " warten" : "")} key={t.id}>
        <div className="afKopf">
          <button title={t.status === "Erledigt" ? "wieder öffnen" : "als erledigt markieren"} onClick={() => onSave({ ...t, status: t.status === "Erledigt" ? "Offen" : "Erledigt" })} className={t.status === "Erledigt" ? "check done" : "check"}>✓</button>
          <div><strong>{t.title}</strong><small>{t.einnahmequelle_id ? "↗ " + eqName(t.einnahmequelle_id) : bereichName(t.business_id, businesses)} · {t.area} · {t.owner || "—"}</small></div>
          <span className={"afPrio p" + t.priority}>{t.priority}</span><em className="afSt">{t.status === "Blockiert" ? "Wartet auf Benutzer" : t.status}</em>
        </div>
        {t.beschreibung && <p>{t.beschreibung}</p>}
        <dl className="afDaten">
          {t.naechste_aktion && <><dt>Nächste Aktion</dt><dd>{t.naechste_aktion}</dd></>}
          {t.quelle && <><dt>Quelle</dt><dd>{/^https?:\/\//.test(t.quelle) ? <a href={t.quelle} target="_blank" rel="noreferrer">{t.quelle}</a> : t.quelle}</dd></>}
          {t.ergebnis && <><dt>Ergebnis</dt><dd>{t.ergebnis}</dd></>}
          <dt>Erstellt</dt><dd>{datum(t.created_at)}{t.due_at ? " · fällig " + datum(t.due_at) : ""}</dd>
        </dl>
        <div className="afAktionen"><select value={t.status === "Blockiert" ? "Wartet auf Benutzer" : t.status} onChange={e => onSave({ ...t, status: e.target.value })} aria-label="Status ändern">{TASK_STATUS.map(s => <option key={s}>{s}</option>)}</select><button className="editMini" onClick={() => setEditing(t)}>Bearbeiten</button></div>
      </article>)}</div>}
    {editing && <AufgabeEditor task={editing} businesses={businesses} onClose={() => setEditing(null)} onSave={async t => { await (t.id ? onSave(t) : onCreate(t)); setEditing(null); }} />}
    <style dangerouslySetInnerHTML={{ __html: AF_CSS }} />
  </>;
}

function AufgabeEditor({ task, businesses, onClose, onSave }) {
  const [f, setF] = useState({ ...task, status: task.status === "Blockiert" ? "Wartet auf Benutzer" : task.status });
  const ch = (k, v) => setF({ ...f, [k]: v });
  const text = (k, l, rows) => <label>{l}{rows ? <textarea rows={rows} value={f[k] || ""} onChange={e => ch(k, e.target.value)} /> : <input value={f[k] || ""} onChange={e => ch(k, e.target.value)} />}</label>;
  return <div className="modalBack"><div className="modal afModal"><div className="modalHead"><h3>{task.id ? "Aufgabe bearbeiten" : "Neue Aufgabe"}</h3><button onClick={onClose}>×</button></div>
    {text("title", "Titel")}{text("beschreibung", "Beschreibung", 3)}{text("area", "Bereich / Thema")}
    {!task.einnahmequelle_id && <label>Geschäftsbereich<select value={f.business_id || "master"} onChange={e => ch("business_id", e.target.value)}><option value="master">Master-übergreifend</option>{businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}
    <label>Status<select value={f.status || "Offen"} onChange={e => ch("status", e.target.value)}>{TASK_STATUS.map(s => <option key={s}>{s}</option>)}</select></label>
    <label>Priorität<select value={f.priority || "Mittel"} onChange={e => ch("priority", e.target.value)}>{TASK_PRIO.map(p => <option key={p}>{p}</option>)}</select></label>
    {text("naechste_aktion", "Nächste Aktion", 2)}{text("quelle", "Quelle (Link oder Beleg)")}{text("ergebnis", "Ergebnis / Notiz", 3)}{text("owner", "Verantwortlich")}
    <label>Fällig am (optional)<input type="date" value={f.due_at ? String(f.due_at).slice(0, 10) : ""} onChange={e => ch("due_at", e.target.value ? new Date(e.target.value + "T12:00:00").toISOString() : null)} /></label>
    <div className="modalActions"><button onClick={onClose}>Abbrechen</button><button className="primary" onClick={() => onSave(f)} disabled={!String(f.title || "").trim() || !String(f.area || "").trim()}>Speichern</button></div>
  </div></div>;
}

const AF_CSS = `.afZaehler{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}.afZaehler button{border:1px solid #eaecf0;background:#fff;border-radius:999px;padding:5px 10px;font:inherit;font-size:12px;cursor:pointer}.afZaehler button.an{background:#101828;color:#fff}
.afFilter{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;margin-bottom:12px}.afFilter select{padding:8px;border:1px solid #d0d5dd;border-radius:8px;font:inherit;background:#fff}
.afListe{display:grid;gap:8px}.afKarte{background:#fff;border:1px solid #eaecf0;border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:6px;min-width:0}.afKarte.warten{border-color:#fedf89;background:#fffcf5}
.afKarte p{margin:0;font-size:13px;color:#344054}.afKopf{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.afKopf>div{flex:1;min-width:180px}.afKopf small{display:block;color:#667085;font-size:12px;overflow-wrap:anywhere}
.afPrio{font-size:11px;padding:2px 8px;border-radius:999px;background:#f2f4f7}.afPrio.pHoch{background:#fef3f2;color:#b42318}.afSt{font-style:normal;font-size:12px;color:#475467}
.afDaten{display:grid;grid-template-columns:max-content 1fr;gap:2px 10px;margin:0;font-size:12px}.afDaten dt{color:#667085}.afDaten dd{margin:0;overflow-wrap:anywhere}
.afAktionen{display:flex;gap:8px;flex-wrap:wrap}.afAktionen select{padding:6px;border:1px solid #d0d5dd;border-radius:7px}.afLeer{color:#98a2b3}
.afModal{width:min(620px,100%);max-height:92vh;overflow:auto}.afModal label{display:block;font-size:12px;font-weight:700;margin-top:10px}.afModal input,.afModal textarea,.afModal select{display:block;width:100%;margin-top:4px;padding:9px;border:1px solid #d0d5dd;border-radius:7px;font:inherit}`;
