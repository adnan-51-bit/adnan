"use client";

// Master-Zentrale: Einnahmequellen (27.09.2026). Getrennt von Werknetz24 und E-Commerce.
// Erst pruefen (Markt, Nachfrage, Konkurrenz, Kosten, Recht, kostenloser Test, Quellen), dann testen,
// dann Technik. Zahlen nur echt - Einnahmen/Kosten starten bei 0, nichts wird geschaetzt.
import { useEffect, useState } from "react";
import { adminFetch, anmeldeUrl } from "../../lib/admin-fetch.js";
import { EQ_STATUS, EQ_LABEL, pruefstand, gewinnCent } from "../../lib/einnahmequellen-regeln.js";

const eur = c => ((c || 0) / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const GRUPPEN = [
  ["Aktive Einnahmequellen", ["AKTIV", "ERSTER_KUNDE"]],
  ["Im kostenlosen Test", ["TEST"]],
  ["Ideen zur Prüfung", ["IDEE", "PRUEFUNG"]],
  ["Pause", ["PAUSE"]],
];
const FELDER = [
  ["name", "Einnahmequelle", 1], ["kategorie", "Kategorie", 1], ["zielgruppe", "Zielgruppe", 2], ["angebot", "Konkretes Angebot", 3],
  ["preis", "Möglicher Preis (mit Quelle)", 2], ["startkosten_cent", "Startkosten (€)", "euro"], ["werkzeuge", "Benötigte Werkzeuge", 2], ["aufwand", "Aufwand", 2],
  ["rechtliches", "Rechtliche Voraussetzungen", 3], ["markt", "1. Markt", 3], ["nachfrage", "2. Nachfrage", 3], ["konkurrenz", "3. Konkurrenz", 3],
  ["kosten_pruefung", "4. Kosten", 3], ["kostenloser_test", "6. Kostenloser Test (wie?)", 3], ["test_status", "Teststatus", 2], ["quellen", "Quellen (Links + Datum)", 4],
  ["erste_kunden", "Erste Kunden (Anzahl)", "zahl"], ["einnahmen_cent", "Einnahmen bisher (€)", "euro"], ["kosten_cent", "Kosten bisher (€)", "euro"], ["verweis", "Link zum Bereich (optional)", 1], ["notiz", "Notiz", 2],
];

export function Einnahmequellen() {
  const [daten, setDaten] = useState(null);
  const [gesperrt, setGesperrt] = useState(false);
  const [edit, setEdit] = useState(null);
  const [meldung, setMeldung] = useState("");
  const laden = () => adminFetch("/api/master/businesses?einnahmequellen=1").then(async r => { if (r.status === 401) { setGesperrt(true); setDaten({ einnahmequellen: [] }); return; } setDaten(await r.json()); }).catch(() => setDaten({ einnahmequellen: [], fehler: true }));
  useEffect(() => { laden(); }, []);

  async function senden(body, erfolg) {
    setMeldung("");
    const r = await adminFetch("/api/master/businesses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setMeldung("❌ " + (j.error || "Fehler " + r.status)); return false; }
    setMeldung("✅ " + erfolg); laden(); return true;
  }

  const liste = daten?.einnahmequellen || [];
  const u = daten?.uebersicht || { aktiv: 0, test: 0, pruefung: 0, pause: 0, kosten_cent: 0, einnahmen_cent: 0, gewinn_cent: 0 };
  return <div className="eq">
    <div className="pageTitle"><div><span>UNTERNEHMEN</span><h2>Einnahmequellen</h2></div><div className="quick"><button className="primaryLink" onClick={() => setEdit({})} disabled={gesperrt}>+ Einnahmequelle</button></div></div>
    <p className="note">Getrennt von Werknetz24 und E-Commerce. Regel: erst prüfen (Markt, Nachfrage, Konkurrenz, Kosten, Recht, kostenloser Test – mit Quellen), dann testen, erst bei nachgewiesener Nachfrage Technik bauen. Keine kostenpflichtigen Dienste ohne Adnans Freigabe.</p>
    {gesperrt && <div className="panel">Einnahmequellen sind nur mit Anmeldung sichtbar. <a href={anmeldeUrl()}>⎆ Anmelden</a></div>}
    {meldung && <div className="panel eqMeldung">{meldung}</div>}
    <div className="kpis eqKpis">
      {[["Aktive Einnahmequellen", u.aktiv], ["Im kostenlosen Test", u.test], ["Ideen zur Prüfung", u.pruefung], ["Pause", u.pause], ["Kosten", eur(u.kosten_cent)], ["Einnahmen", eur(u.einnahmen_cent)], ["Gewinn", eur(u.gewinn_cent)]].map(([l, v]) =>
        <div className="kpi" key={l}><span>{l}</span><strong>{daten ? v : "…"}</strong></div>)}
    </div>
    {GRUPPEN.map(([titel, st]) => { const g = liste.filter(q => st.includes(q.status)); return <section className="panel" key={titel}><h3>{titel} ({g.length})</h3>
      {!g.length && <p className="muted">— keine —</p>}
      {g.map(q => { const ps = pruefstand(q); const ok = ps.filter(x => x.ok).length; return <article className="eqKarte" key={q.id}>
        <div className="eqKopf"><div><strong>{q.name}</strong><small>{q.kategorie}{q.zielgruppe ? " · " + q.zielgruppe : ""}</small></div><b className={"eqSt eq" + q.status}>{EQ_LABEL[q.status]}</b></div>
        {q.angebot && <p>{q.angebot}</p>}
        <div className="eqZeile"><span>Preis: {q.preis || "—"}</span><span>Startkosten: {q.startkosten_cent === null || q.startkosten_cent === undefined ? "—" : eur(q.startkosten_cent)}</span><span>Aufwand: {q.aufwand || "—"}</span></div>
        <div className="eqZeile"><span>Einnahmen {eur(q.einnahmen_cent)}</span><span>Kosten {eur(q.kosten_cent)}</span><span>Gewinn <b>{eur(gewinnCent(q))}</b></span><span>Erste Kunden: {q.erste_kunden || 0}</span></div>
        <div className="eqPruef">Prüfstand {ok}/{ps.length}: {ps.map(x => <i key={x.id} className={x.ok ? "ja" : "nein"} title={x.text}>{x.ok ? "✓" : "✗"} {x.text}</i>)}</div>
        {q.rechtliches && <p className="eqRecht">⚖️ {q.rechtliches}</p>}
        <div className="eqAktionen"><button className="editMini" onClick={() => setEdit(q)}>Bearbeiten</button>
          <select defaultValue="" onChange={async e => { const z = e.target.value; e.target.value = ""; if (z) await senden({ action: "einnahmequelle-status", id: q.id, status: z }, `Status „${EQ_LABEL[z]}“`); }}>
            <option value="">Status ändern …</option>{EQ_STATUS.filter(s => s !== q.status).map(s => <option key={s} value={s}>{EQ_LABEL[s]}</option>)}</select>
          {q.verweis && <a href={q.verweis}>Zum Bereich →</a>}</div>
      </article>; })}
    </section>; })}
    {edit && <EqFormular q={edit} onClose={() => setEdit(null)} onSave={async werte => { if (await senden(edit.id ? { action: "einnahmequelle-aendern", id: edit.id, ...werte } : { action: "einnahmequelle-anlegen", ...werte }, edit.id ? "Gespeichert" : "Angelegt")) setEdit(null); }} />}
    <style dangerouslySetInnerHTML={{ __html: EQ_CSS }} />
  </div>;
}

function EqFormular({ q, onClose, onSave }) {
  const start = Object.fromEntries(FELDER.map(([k, , t]) => [k, t === "euro" ? (Number.isInteger(q[k]) ? (q[k] / 100).toFixed(2).replace(".", ",") : "") : t === "zahl" ? String(q[k] ?? 0) : (q[k] ?? "")]));
  const [f, setF] = useState(start);
  const werte = () => Object.fromEntries(FELDER.map(([k, , t]) => [k, t === "euro" ? (f[k] === "" ? (k === "startkosten_cent" ? null : 0) : Math.round(Number(String(f[k]).replace(",", ".")) * 100)) : t === "zahl" ? parseInt(f[k] || "0", 10) : f[k]]));
  return <div className="modalBack"><div className="modal eqModal"><div className="modalHead"><h3>{q.id ? "Einnahmequelle bearbeiten" : "Neue Einnahmequelle"}</h3><button onClick={onClose}>×</button></div>
    <p className="note">Nur echte, überprüfbare Angaben. Unbekanntes leer lassen. Der Status wird separat geändert – ein Test erst, wenn alle Prüfschritte ausgefüllt sind.</p>
    {FELDER.map(([k, l, t]) => <label key={k}>{l}{typeof t === "number" && t > 1 ? <textarea rows={t} value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} /> : <input inputMode={t === "euro" ? "decimal" : t === "zahl" ? "numeric" : undefined} value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} />}</label>)}
    <div className="modalActions"><button onClick={onClose}>Abbrechen</button><button className="primary" disabled={!String(f.name).trim()} onClick={() => onSave(werte())}>Speichern</button></div>
  </div></div>;
}

const EQ_CSS = `.eqKpis{grid-template-columns:repeat(auto-fit,minmax(140px,1fr))}.eqKarte{border:1px solid #eaecf0;border-radius:12px;padding:14px;margin-top:12px;display:flex;flex-direction:column;gap:8px}
.eqKopf{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}.eqKopf small{display:block;color:#667085;font-size:12px}.eqSt{font-size:12px;padding:3px 8px;border-radius:999px;background:#f2f4f7;height:fit-content}
.eqAKTIV,.eqERSTER_KUNDE{background:#ecfdf3;color:#067647}.eqTEST{background:#eff8ff;color:#175cd3}.eqIDEE,.eqPRUEFUNG{background:#fffaeb;color:#b54708}.eqPAUSE{background:#f2f4f7;color:#475467}
.eqZeile{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:13px;color:#344054}.eqPruef{font-size:12px;display:flex;flex-wrap:wrap;gap:4px 10px;color:#475467}.eqPruef i{font-style:normal}.eqPruef .ja{color:#067647}.eqPruef .nein{color:#b42318}
.eqRecht{font-size:12px;color:#b54708;margin:0}.eqAktionen{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.eqAktionen select{padding:6px;border:1px solid #d0d5dd;border-radius:7px}
.eqMeldung{font-size:14px}.eqModal{width:min(640px,100%);max-height:92vh;overflow:auto}.eqModal label{display:block;font-size:12px;font-weight:700;margin-top:10px}.eqModal input,.eqModal textarea{display:block;width:100%;margin-top:4px;padding:9px;border:1px solid #d0d5dd;border-radius:7px;font:inherit}
.eq .muted{color:#98a2b3;font-size:13px}`;
