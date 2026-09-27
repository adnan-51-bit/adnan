"use client";

// Master-Zentrale: Einnahmequellen (27.09.2026). Getrennt von Werknetz24 und E-Commerce.
// Ablauf: Idee -> Pruefung -> kostenloser Test -> Interesse -> erster Kunde -> Einnahme -> Wiederholbar ->
// Automatisiert -> Skalieren. Jede Stufe braucht einen echten Nachweis (Regeln in lib/einnahmequellen-regeln.js,
// serverseitig erzwungen). Zahlen nur echt - nichts wird geschaetzt. Jede Aktion steht im Aktivitaetsverlauf.
import { useEffect, useState } from "react";
import { adminFetch, anmeldeUrl } from "../../lib/admin-fetch.js";
import { EQ_STATUS, EQ_LABEL, EQ_ABLAUF, EQ_GRUPPE, pruefstand, gewinnCent, kundenAnzahl, naechsteStufe } from "../../lib/einnahmequellen-regeln.js";

const eur = c => ((c || 0) / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const zeit = t => t ? new Date(t).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" }) : "—";
const GRUPPEN = [["Aktive Einnahmequellen", EQ_GRUPPE.aktiv], ["Im kostenlosen Test", EQ_GRUPPE.test], ["Ideen zur Prüfung", EQ_GRUPPE.pruefung], ["Pause", EQ_GRUPPE.pause]];
const FELDER = [
  ["Grunddaten", [["name", "Einnahmequelle", 1], ["kategorie", "Kategorie", 1], ["beschreibung", "Beschreibung", 3], ["zielgruppe", "Zielgruppe", 2], ["angebot", "Konkretes Angebot", 3], ["verweis", "Link zum Bereich (optional)", 1]]],
  ["Steuerung", [["schritte", "Benötigte Schritte", 4], ["naechste_aufgabe", "Nächste Aufgabe", 2], ["verantwortlich", "Verantwortlich / Agent", 1], ["benutzeraktion", "Benötigte Benutzeraktion (nur was Adnan selbst tun muss)", 2], ["risiken", "Risiken", 3]]],
  ["Prüfung (mit Quellen)", [["markt", "1. Markt", 3], ["nachfrage", "2. Nachfrage", 3], ["konkurrenz", "3. Konkurrenz", 3], ["kosten_pruefung", "4. Kosten", 3], ["rechtliches", "5. Rechtliche Voraussetzungen", 3], ["kostenloser_test", "6. Kostenloser Test (wie?)", 3], ["quellen", "Quellen (Links + Datum)", 4]]],
  ["Test & Interesse", [["test_status", "Teststatus", 2], ["interesse_nachweis", "Interesse-Nachweis (wer/was/wann – nur echte Belege)", 3]]],
  ["Geld (nur echte Werte)", [["preis", "Möglicher Preis (mit Quelle)", 2], ["moegliche_einnahmen", "Mögliche Einnahmen (nur mit Quelle/Rechenweg)", 2], ["startkosten_cent", "Startkosten (€)", "euro"], ["einnahmen_cent", "Einnahmen bisher (€)", "euro"], ["kosten_cent", "Kosten bisher (€)", "euro"], ["erste_kunden", "Kunden (Anzahl, falls nicht über „Kunde zuordnen“)", "zahl"]]],
  ["Automatisierung", [["automatisierungsgrad", "Automatisierungsgrad (0–100 %)", "zahl"], ["automatisierung", "Was läuft automatisch?", 3], ["werkzeuge", "Benötigte Werkzeuge", 2], ["aufwand", "Aufwand", 2]]],
  ["Notizen", [["notiz", "Notizen", 3]]],
];
const ALLE_FELDER = FELDER.flatMap(([, f]) => f);

export function Einnahmequellen() {
  const [daten, setDaten] = useState(null);
  const [gesperrt, setGesperrt] = useState(false);
  const [edit, setEdit] = useState(null);
  const [dialog, setDialog] = useState(null); // { art: "aufgabe"|"kunde", q }
  const [offen, setOffen] = useState({});
  const [meldung, setMeldung] = useState("");
  const laden = () => adminFetch("/api/master/businesses?einnahmequellen=1").then(async r => { if (r.status === 401) { setGesperrt(true); setDaten({ einnahmequellen: [] }); return; } setDaten(await r.json()); }).catch(() => setDaten({ einnahmequellen: [], fehler: true }));
  useEffect(() => { laden(); }, []);

  async function senden(body, erfolg) {
    setMeldung("");
    const r = await adminFetch("/api/master/businesses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setMeldung("❌ " + (j.error || "Fehler " + r.status)); return false; }
    setMeldung("✅ " + erfolg); laden(); if (body.id && offen[body.id]) ladeDetails(body.id); return true;
  }
  async function ladeDetails(id) {
    const r = await adminFetch("/api/master/businesses?einnahmequellen=1&id=" + encodeURIComponent(id));
    const j = r.ok ? await r.json() : { aufgaben: [], verlauf: [], fehler: true };
    setOffen(o => ({ ...o, [id]: j }));
  }
  const umschalten = id => offen[id] ? setOffen(o => { const n = { ...o }; delete n[id]; return n; }) : ladeDetails(id);

  const liste = daten?.einnahmequellen || [];
  const u = daten?.uebersicht || { aktiv: 0, test: 0, pruefung: 0, pause: 0, kosten_cent: 0, einnahmen_cent: 0, gewinn_cent: 0 };
  return <div className="eq">
    <div className="pageTitle"><div><span>UNTERNEHMEN</span><h2>Einnahmequellen</h2></div><div className="quick"><button className="primaryLink" onClick={() => setEdit({})} disabled={gesperrt}>+ Einnahmequelle</button></div></div>
    <p className="note">Getrennt von Werknetz24 und E-Commerce. Ablauf: {EQ_ABLAUF.map(s => EQ_LABEL[s]).join(" → ")}. Jede Stufe braucht einen echten Nachweis – nichts wird geschätzt. Keine kostenpflichtigen Dienste ohne Adnans Freigabe.</p>
    {gesperrt && <div className="panel">Einnahmequellen sind nur mit Anmeldung sichtbar. <a href={anmeldeUrl()}>⎆ Anmelden</a></div>}
    {meldung && <div className="panel eqMeldung">{meldung}</div>}
    <div className="kpis eqKpis">
      {[["Aktive Einnahmequellen", u.aktiv], ["Im kostenlosen Test", u.test], ["Ideen zur Prüfung", u.pruefung], ["Pause", u.pause], ["Kosten", eur(u.kosten_cent)], ["Einnahmen", eur(u.einnahmen_cent)], ["Gewinn", eur(u.gewinn_cent)]].map(([l, v]) =>
        <div className="kpi" key={l}><span>{l}</span><strong>{daten ? v : "…"}</strong></div>)}
    </div>
    {GRUPPEN.map(([titel, st]) => { const g = liste.filter(q => st.includes(q.status)); return <section className="panel" key={titel}><h3>{titel} ({g.length})</h3>
      {!g.length && <p className="muted">— keine —</p>}
      {g.map(q => <Karte key={q.id} q={q} details={offen[q.id]} onDetails={() => umschalten(q.id)} onEdit={() => setEdit(q)} onDialog={art => setDialog({ art, q })} senden={senden} />)}
    </section>; })}
    {edit && <EqFormular q={edit} onClose={() => setEdit(null)} onSave={async werte => { if (await senden(edit.id ? { action: "einnahmequelle-aendern", id: edit.id, ...werte } : { action: "einnahmequelle-anlegen", ...werte }, edit.id ? "Gespeichert" : "Angelegt")) setEdit(null); }} />}
    {dialog?.art === "aufgabe" && <AufgabeDialog q={dialog.q} onClose={() => setDialog(null)} onSave={async a => { if (await senden({ action: "einnahmequelle-aufgabe", id: dialog.q.id, ...a }, "Aufgabe erzeugt – steht auch in der zentralen Aufgabenliste")) setDialog(null); }} />}
    {dialog?.art === "kunde" && <KundeDialog q={dialog.q} onClose={() => setDialog(null)} onSave={async k => { if (await senden({ action: "einnahmequelle-kunde", id: dialog.q.id, kunde: k }, "Kunde zugeordnet")) setDialog(null); }} />}
    <style dangerouslySetInnerHTML={{ __html: EQ_CSS }} />
  </div>;
}

function Karte({ q, details, onDetails, onEdit, onDialog, senden }) {
  const ps = pruefstand(q); const ok = ps.filter(x => x.ok).length;
  const pausiert = q.status === "PAUSE";
  const stufe = EQ_ABLAUF.indexOf(pausiert ? q.status_vor_pause : q.status);
  const naechste = naechsteStufe(q);
  return <article className="eqKarte">
    <div className="eqKopf"><div><strong>{q.name}</strong><small>{q.kategorie}{q.zielgruppe ? " · " + q.zielgruppe : ""}</small></div><b className={"eqSt eq" + q.status}>{EQ_LABEL[q.status]}</b></div>
    <ol className="eqAblauf" aria-label="Ablauf">{EQ_ABLAUF.map((s, i) => <li key={s} className={i < stufe ? "fertig" : i === stufe ? "jetzt" : ""}>{EQ_LABEL[s]}</li>)}</ol>
    {(q.beschreibung || q.angebot) && <p>{q.beschreibung || q.angebot}</p>}
    <div className="eqZeile"><span>Verantwortlich: {q.verantwortlich || "—"}</span><span>Automatisierung: {q.automatisierungsgrad || 0} %</span><span>Kunden: {kundenAnzahl(q)}</span><span>Nächste Aufgabe: {q.naechste_aufgabe || "—"}</span></div>
    <div className="eqZeile"><span>Mögliche Einnahmen: {q.moegliche_einnahmen || "—"}</span><span>Einnahmen {eur(q.einnahmen_cent)}</span><span>Kosten {eur(q.kosten_cent)}</span><span>Gewinn <b>{eur(gewinnCent(q))}</b></span></div>
    <div className="eqPruef">Prüfstand {ok}/{ps.length}: {ps.map(x => <i key={x.id} className={x.ok ? "ja" : "nein"} title={x.text}>{x.ok ? "✓" : "✗"} {x.text}</i>)}</div>
    {q.benutzeraktion && <p className="eqAktion">👤 Benutzeraktion: {q.benutzeraktion}</p>}
    {q.risiken && <p className="eqRecht">⚠️ Risiken: {q.risiken}</p>}
    {q.rechtliches && <p className="eqRecht">⚖️ {q.rechtliches}</p>}
    <div className="eqAktionen">
      <button className="editMini" onClick={onEdit}>Bearbeiten</button>
      <button className="editMini" onClick={() => onDialog("aufgabe")}>Aufgabe erzeugen</button>
      <button className="editMini" onClick={() => onDialog("kunde")}>Kunde zuordnen</button>
      <button className="editMini" onClick={() => senden({ action: "einnahmequelle-status", id: q.id, status: "AUTOMATISIERT" }, "Status „Automatisiert“")} disabled={pausiert}>Automatisieren</button>
      <button className="editMini" onClick={() => senden({ action: "einnahmequelle-status", id: q.id, status: "SKALIEREN" }, "Status „Skalieren“")} disabled={pausiert}>Skalieren</button>
      {pausiert ? <button className="editMini eqStart" onClick={() => senden({ action: "einnahmequelle-start", id: q.id }, "Gestartet")}>▶ Start</button>
        : <button className="editMini" onClick={() => senden({ action: "einnahmequelle-stop", id: q.id }, "Gestoppt (Pause)")}>■ Stop</button>}
      {naechste && !pausiert && <button className="editMini" onClick={() => senden({ action: "einnahmequelle-status", id: q.id, status: naechste }, `Status „${EQ_LABEL[naechste]}“`)}>Weiter: {EQ_LABEL[naechste]}</button>}
      <select defaultValue="" aria-label="Status ändern" onChange={async e => { const z = e.target.value; e.target.value = ""; if (z) await senden({ action: "einnahmequelle-status", id: q.id, status: z }, `Status „${EQ_LABEL[z]}“`); }}>
        <option value="">Status ändern …</option>{EQ_STATUS.filter(s => s !== q.status).map(s => <option key={s} value={s}>{EQ_LABEL[s]}</option>)}</select>
      <button className="editMini" onClick={onDetails}>{details ? "Verlauf schließen" : "Aufgaben & Verlauf"}</button>
      {q.verweis && <a href={q.verweis}>Zum Bereich →</a>}
    </div>
    {details && <div className="eqDetails">
      <div><h4>Aufgaben ({details.aufgaben?.length || 0}) <a href="/master?tab=tasks">zentrale Liste →</a></h4>{!details.aufgaben?.length ? <p className="muted">Noch keine Aufgabe erzeugt.</p> : details.aufgaben.map(t => <p key={t.id}>• {t.title} <small>({t.status} · {t.priority})</small></p>)}</div>
      {Array.isArray(q.kunden) && q.kunden.length > 0 && <div><h4>Kunden ({q.kunden.length})</h4>{q.kunden.map((k, i) => <p key={i}>• {k.name} <small>seit {k.seit}{k.notiz ? " · " + k.notiz : ""}</small></p>)}</div>}
      {q.schritte && <div><h4>Benötigte Schritte</h4><p className="eqPre">{q.schritte}</p></div>}
      <div><h4>Aktivitätsverlauf</h4>{!details.verlauf?.length ? <p className="muted">Noch keine Einträge.</p> : details.verlauf.map(v => <p key={v.id}><small>{zeit(v.created_at)}</small> {verlaufText(v)}</p>)}</div>
    </div>}
  </article>;
}

function verlaufText(v) {
  const d = v.details || {};
  switch (v.action) {
    case "einnahmequelle.created": return "Angelegt";
    case "einnahmequelle.updated": return "Bearbeitet: " + (d.felder || (Array.isArray(d) ? d : [])).join(", ");
    case "einnahmequelle.status": return `Status ${EQ_LABEL[d.von] || d.von} → ${EQ_LABEL[d.nach] || d.nach}`;
    case "einnahmequelle.kunde": return `Kunde zugeordnet: ${d.kunde} (jetzt ${d.anzahl})`;
    case "einnahmequelle.aufgabe": return `Aufgabe erzeugt: ${d.aufgabe}`;
    default: return v.action;
  }
}

function AufgabeDialog({ q, onClose, onSave }) {
  const [f, setF] = useState({ title: q.naechste_aufgabe || "", priority: "Mittel" });
  return <div className="modalBack"><div className="modal eqModal"><div className="modalHead"><h3>Aufgabe erzeugen – {q.name}</h3><button onClick={onClose}>×</button></div>
    <p className="note">Die Aufgabe erscheint in der zentralen Aufgabenliste (Seite „Aufgaben“) und im Verlauf dieser Einnahmequelle.</p>
    <label>Aufgabe<input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} /></label>
    <label>Priorität<select value={f.priority} onChange={e => setF({ ...f, priority: e.target.value })}>{["Hoch", "Mittel", "Niedrig"].map(p => <option key={p}>{p}</option>)}</select></label>
    <div className="modalActions"><button onClick={onClose}>Abbrechen</button><button className="primary" disabled={!f.title.trim()} onClick={() => onSave(f)}>Erzeugen</button></div>
  </div></div>;
}

function KundeDialog({ q, onClose, onSave }) {
  const [f, setF] = useState({ name: "", kontakt: "", seit: new Date().toISOString().slice(0, 10), notiz: "" });
  return <div className="modalBack"><div className="modal eqModal"><div className="modalHead"><h3>Kunde zuordnen – {q.name}</h3><button onClick={onClose}>×</button></div>
    <p className="note">Nur echte Kunden eintragen. Diese Liste gehört nur zu dieser Einnahmequelle – getrennt von Werknetz24- und E-Commerce-Kunden.</p>
    <label>Name / Firma<input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></label>
    <label>Kontakt (optional)<input value={f.kontakt} onChange={e => setF({ ...f, kontakt: e.target.value })} /></label>
    <label>Kunde seit<input type="date" value={f.seit} onChange={e => setF({ ...f, seit: e.target.value })} /></label>
    <label>Notiz (optional)<textarea rows={2} value={f.notiz} onChange={e => setF({ ...f, notiz: e.target.value })} /></label>
    <div className="modalActions"><button onClick={onClose}>Abbrechen</button><button className="primary" disabled={!f.name.trim()} onClick={() => onSave(f)}>Zuordnen</button></div>
  </div></div>;
}

function EqFormular({ q, onClose, onSave }) {
  const start = Object.fromEntries(ALLE_FELDER.map(([k, , t]) => [k, t === "euro" ? (Number.isInteger(q[k]) ? (q[k] / 100).toFixed(2).replace(".", ",") : "") : t === "zahl" ? String(q[k] ?? 0) : (q[k] ?? "")]));
  const [f, setF] = useState(start);
  const werte = () => Object.fromEntries(ALLE_FELDER.map(([k, , t]) => [k, t === "euro" ? (f[k] === "" ? (k === "startkosten_cent" ? null : 0) : Math.round(Number(String(f[k]).replace(",", ".")) * 100)) : t === "zahl" ? parseInt(f[k] || "0", 10) : f[k]]));
  return <div className="modalBack"><div className="modal eqModal"><div className="modalHead"><h3>{q.id ? "Einnahmequelle bearbeiten" : "Neue Einnahmequelle"}</h3><button onClick={onClose}>×</button></div>
    <p className="note">Nur echte, überprüfbare Angaben. Unbekanntes leer lassen. Der Status wird separat geändert – jede Stufe prüft ihre Voraussetzungen.</p>
    {FELDER.map(([gruppe, felder]) => <fieldset key={gruppe}><legend>{gruppe}</legend>
      {felder.map(([k, l, t]) => <label key={k}>{l}{typeof t === "number" && t > 1 ? <textarea rows={t} value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} /> : <input inputMode={t === "euro" ? "decimal" : t === "zahl" ? "numeric" : undefined} value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} />}</label>)}
    </fieldset>)}
    <div className="modalActions"><button onClick={onClose}>Abbrechen</button><button className="primary" disabled={!String(f.name).trim()} onClick={() => onSave(werte())}>Speichern</button></div>
  </div></div>;
}

const EQ_CSS = `.eqKpis{grid-template-columns:repeat(auto-fit,minmax(140px,1fr))}.eqKarte{border:1px solid #eaecf0;border-radius:12px;padding:14px;margin-top:12px;display:flex;flex-direction:column;gap:8px;min-width:0}
.eqKarte p{margin:0}.eqKopf{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}.eqKopf small{display:block;color:#667085;font-size:12px}.eqSt{font-size:12px;padding:3px 8px;border-radius:999px;background:#f2f4f7;height:fit-content}
.eqAKTIV,.eqERSTER_KUNDE,.eqWIEDERHOLBAR,.eqAUTOMATISIERT,.eqSKALIEREN{background:#ecfdf3;color:#067647}.eqTEST,.eqINTERESSE{background:#eff8ff;color:#175cd3}.eqIDEE,.eqPRUEFUNG{background:#fffaeb;color:#b54708}.eqPAUSE{background:#f2f4f7;color:#475467}
.eqAblauf{display:flex;flex-wrap:wrap;gap:4px;list-style:none;padding:0;margin:0}.eqAblauf li{font-size:11px;padding:2px 7px;border-radius:999px;background:#f2f4f7;color:#98a2b3}.eqAblauf li.fertig{background:#ecfdf3;color:#067647}.eqAblauf li.jetzt{background:#101828;color:#fff;font-weight:700}
.eqZeile{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:13px;color:#344054}.eqPruef{font-size:12px;display:flex;flex-wrap:wrap;gap:4px 10px;color:#475467}.eqPruef i{font-style:normal}.eqPruef .ja{color:#067647}.eqPruef .nein{color:#b42318}
.eqRecht{font-size:12px;color:#b54708}.eqAktion{font-size:13px;background:#fffcf5;border:1px solid #fedf89;border-radius:8px;padding:6px 8px}
.eqAktionen{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.eqAktionen select{padding:6px;border:1px solid #d0d5dd;border-radius:7px}.eqAktionen button:disabled{opacity:.45}.eqStart{background:#ecfdf3!important}
.eqDetails{border-top:1px solid #eaecf0;padding-top:8px;display:grid;gap:10px}.eqDetails h4{margin:0 0 4px;font-size:13px}.eqDetails h4 a{font-weight:400;font-size:12px;margin-left:6px}.eqDetails p{font-size:13px;margin:2px 0;overflow-wrap:anywhere}.eqDetails small{color:#667085}.eqPre{white-space:pre-wrap}
.eqMeldung{font-size:14px}.eqModal{width:min(680px,100%);max-height:92vh;overflow:auto}.eqModal fieldset{border:1px solid #eaecf0;border-radius:10px;margin:10px 0;padding:6px 10px 10px}.eqModal legend{font-size:12px;font-weight:800;color:#344054;padding:0 4px}
.eqModal label{display:block;font-size:12px;font-weight:700;margin-top:10px}.eqModal input,.eqModal textarea,.eqModal select{display:block;width:100%;margin-top:4px;padding:9px;border:1px solid #d0d5dd;border-radius:7px;font:inherit}
.eq .muted{color:#98a2b3;font-size:13px}`;
