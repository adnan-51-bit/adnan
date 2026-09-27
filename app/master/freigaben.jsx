"use client";

// "Wartet auf Freigabe" (27.09.2026, Teil 4A): nur Dinge, die Adnans persoenliche Entscheidung brauchen.
// Eine Freigabe loest nie selbst Kosten oder Veroeffentlichungen aus - sie wird protokolliert und gibt den
// naechsten Schritt frei. Alles andere laeuft automatisch.
import { useEffect, useState } from "react";
import { adminFetch, anmeldeUrl } from "../../lib/admin-fetch.js";

const ARTEN = { ENTSCHEIDUNG: "👤 Entscheidung", VEROEFFENTLICHUNG: "📣 Veröffentlichung", KOSTEN: "💶 Kosten", WERKZEUG: "🧰 Werkzeug aktivieren", AUTOMATISIERUNG: "⚙ Automatisierung", RECHT: "⚖️ Rechtliches" };
const ZIEL = { pilot: "/master?tab=pilot", content: "/master?tab=content", werkzeug: "/master?tab=content", "eq-plan": "/master?tab=einnahmequellen" };
const zeit = t => t ? new Date(t).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" }) : "—";

export function Freigaben() {
  const [d, setD] = useState(null);
  const [notiz, setNotiz] = useState({});
  const [meldung, setMeldung] = useState("");
  const laden = () => adminFetch("/api/master/businesses?freigaben=1").then(async r => setD(r.status === 401 ? { gesperrt: true } : await r.json())).catch(() => setD({ fehler: true }));
  useEffect(() => { laden(); }, []);
  async function entscheiden(f, entscheidung) {
    const r = await adminFetch("/api/master/businesses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "freigabe-entscheiden", id: f.id, entscheidung, notiz: notiz[f.id] || "" }) });
    const j = await r.json().catch(() => ({}));
    setMeldung(r.ok ? `✅ „${f.titel}“: ${entscheidung === "FREIGEGEBEN" ? "freigegeben" : "abgelehnt"} – protokolliert.` : "❌ " + (j.error || r.status)); laden();
  }
  const offen = (d?.freigaben || []).filter(f => f.status === "OFFEN");
  const erledigt = (d?.freigaben || []).filter(f => f.status !== "OFFEN").slice(0, 20);
  return <div className="fg">
    <div className="pageTitle"><div><span>ÜBERBLICK</span><h2>Wartet auf mich</h2></div></div>
    <p className="note">Hier landet nur, was <b>deine persönliche Entscheidung</b> braucht: Veröffentlichungen, Kosten, kostenpflichtige Werkzeuge, Automatisierungen mit Risiko. Eine Freigabe löst nichts automatisch aus – kein Geld, kein Posting. Sie wird protokolliert und gibt den nächsten Schritt frei.</p>
    {d?.gesperrt && <div className="panel">Nur mit Anmeldung sichtbar. <a href={anmeldeUrl()}>⎆ Anmelden</a></div>}
    {meldung && <div className="panel">{meldung}</div>}
    <section className="panel"><h3>Offen ({d ? offen.length : "…"})</h3>
      {d && !offen.length && <p className="muted">Nichts wartet auf dich. 👍</p>}
      {offen.map(f => <article key={f.id} className="fgKarte">
        <div className="fgKopf"><b>{ARTEN[f.art] || f.art}</b><small>{zeit(f.erstellt_am)}</small></div>
        <strong>{f.titel}</strong>
        {f.beschreibung && <p>{f.beschreibung}</p>}
        {f.kosten && <p className="fgKosten">Kosten: {f.kosten}</p>}
        <input placeholder="Notiz zur Entscheidung (optional)" value={notiz[f.id] || ""} onChange={e => setNotiz({ ...notiz, [f.id]: e.target.value })} />
        <div className="fgKnoepfe"><button className="fgJa" onClick={() => entscheiden(f, "FREIGEGEBEN")}>✓ Freigeben</button><button className="fgNein" onClick={() => entscheiden(f, "ABGELEHNT")}>✗ Ablehnen</button>{ZIEL[f.bezug_typ] && <a href={ZIEL[f.bezug_typ]}>Ansehen →</a>}</div>
      </article>)}
    </section>
    {(d?.wartendeAufgaben || []).length > 0 && <section className="panel"><h3>Zur Info: Aufgaben, die nur du erledigen kannst ({d.wartendeAufgaben.length})</h3>
      {d.wartendeAufgaben.map(t => <p key={t.id} className="fgZeile">• {t.title}{t.naechste_aktion ? <small> – {t.naechste_aktion}</small> : null}</p>)}<a href="/master?tab=tasks">Zur Aufgabenliste →</a></section>}
    <section className="panel"><h3>Werkzeuge</h3>{(d?.werkzeuge || []).map(w => <p key={w.id} className="fgZeile">• <b>{w.name}</b> – {w.status} <small>(Kosten: {w.kosten})</small></p>)}</section>
    {erledigt.length > 0 && <section className="panel"><h3>Zuletzt entschieden</h3>{erledigt.map(f => <p key={f.id} className="fgZeile">{f.status === "FREIGEGEBEN" ? "✓" : "✗"} {f.titel} <small>{zeit(f.entschieden_am)}{f.entscheidung_notiz ? " – " + f.entscheidung_notiz : ""}</small></p>)}</section>}
    <style dangerouslySetInnerHTML={{ __html: FG_CSS }} />
  </div>;
}

const FG_CSS = `.fgKarte{border:1px solid #fedf89;background:#fffcf5;border-radius:12px;padding:12px;margin-top:10px;display:flex;flex-direction:column;gap:6px;min-width:0}.fgKarte p{margin:0;font-size:13px;overflow-wrap:anywhere}
.fgKopf{display:flex;justify-content:space-between;gap:8px;font-size:12px}.fgKopf small{color:#667085}.fgKosten{color:#b54708;font-weight:700}
.fgKarte input{padding:8px;border:1px solid #d0d5dd;border-radius:7px;font:inherit}.fgKnoepfe{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.fgKnoepfe button{padding:8px 14px;border-radius:8px;border:1px solid #d0d5dd;background:#fff;font:inherit;cursor:pointer;font-weight:700}
.fgJa{background:#ecfdf3!important;border-color:#abefc6!important;color:#067647}.fgNein{color:#b42318}.fgZeile{font-size:13px;margin:4px 0;overflow-wrap:anywhere}.fgZeile small{color:#667085}.fg .muted{color:#98a2b3;font-size:13px}`;
