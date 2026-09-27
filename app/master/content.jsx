"use client";

// Content & Werbung (27.09.2026, Teil 4A). Ablauf Idee -> Recherche -> Skript -> Content erstellen -> Pruefung ->
// Veroeffentlichung -> Reichweite -> Leads -> Einnahmen. Kostenlose Automatik aus Vorlagen; veroeffentlicht wird
// nie automatisch (Freigabe durch Adnan, danach postet er selbst und traegt den Link ein). Kennzahlen nur echt.
import { useEffect, useState } from "react";
import { adminFetch, anmeldeUrl } from "../../lib/admin-fetch.js";
import { C_STATUS, C_LABEL, C_ABLAUF, C_TYPEN, PLATTFORMEN, KENNZAHLEN, cNaechsteStufe, kennzahlSumme, C_HINWEIS } from "../../lib/content-regeln.js";
import { ContentZentraleKarte } from "./zentralen.jsx";

const heute = () => new Date().toISOString().slice(0, 10);
const zeit = t => t ? new Date(t).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" }) : "—";
const pz = x => x == null ? "—" : (x * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 }) + " %";
const kopieren = t => navigator.clipboard?.writeText(t);

export function ContentWerbung() {
  const [d, setD] = useState(null);
  const [eqs, setEqs] = useState([]);
  const [meldung, setMeldung] = useState("");
  const [dialog, setDialog] = useState(null);
  const [offen, setOffen] = useState({});
  const laden = () => adminFetch("/api/master/businesses?content=1").then(async r => setD(r.status === 401 ? { gesperrt: true } : await r.json())).catch(() => setD({ fehler: true }));
  useEffect(() => { laden(); adminFetch("/api/master/businesses?einnahmequellen=1").then(r => r.ok ? r.json() : null).then(j => setEqs(j?.einnahmequellen || [])).catch(() => {}); }, []);
  async function senden(body, erfolg) {
    setMeldung("");
    const r = await adminFetch("/api/master/businesses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setMeldung("❌ " + (j.error || "Fehler " + r.status)); return null; }
    setMeldung("✅ " + erfolg + (j.gefuellt ? (j.gefuellt.length ? ` (${j.gefuellt.length} Felder ergänzt)` : " (alles war schon ausgefüllt)") : "")); laden();
    if (body.id && offen[body.id]) ladeVerlauf(body.id);
    return j;
  }
  const ladeVerlauf = id => adminFetch("/api/master/businesses?content=1&id=" + encodeURIComponent(id)).then(r => r.json()).then(j => setOffen(o => ({ ...o, [id]: j.verlauf || [] })));
  const umschalten = id => offen[id] ? setOffen(o => { const n = { ...o }; delete n[id]; return n; }) : ladeVerlauf(id);
  const liste = d?.content || [];
  const eqName = id => eqs.find(q => q.id === id)?.name;
  return <div className="ct">
    <div className="pageTitle"><div><span>GESCHÄFTSBEREICHE</span><h2>Content & Werbung</h2></div>
      <div className="quick"><button className="editMini" disabled={d?.gesperrt} onClick={() => setDialog({ art: "ideen" })}>💡 Ideen erzeugen</button><button className="primaryLink" disabled={d?.gesperrt} onClick={() => setDialog({ art: "edit", c: {} })}>+ Content</button></div></div>
    <p className="note">Ablauf: {C_ABLAUF.map(s => C_LABEL[s]).join(" → ")}. Die Automatik arbeitet kostenlos mit Vorlagen (ohne KI). <b>Nichts wird automatisch veröffentlicht</b> – vor der Veröffentlichung entscheidest du unter „Wartet auf Freigabe“. Kennzahlen nur aus der echten Plattform-Statistik. Keine bezahlte Werbung, keine Massen-Nachrichten.</p>
    {d?.gesperrt && <div className="panel">Nur mit Anmeldung sichtbar. <a href={anmeldeUrl()}>⎆ Anmelden</a></div>}
    {meldung && <div className="panel ctMeldung">{meldung}</div>}
    <div className="ctKpis">{C_STATUS.map(s => <div key={s}><span>{C_LABEL[s]}</span><b>{d?.nachStatus ? d.nachStatus[s] : "…"}</b></div>)}</div>
    <ContentZentraleKarte z={d?.zentrale} />
    <div className="ctZwei">
      <section className="panel"><h3>Erfolgreiche Inhalte</h3>{!d?.auswertung ? <p className="muted">…</p> : !d.auswertung.genug ? <p className="muted">{d.auswertung.hinweis}</p> :
        <>{d.auswertung.top.map(x => <p key={x.id} className="ctTop">⭐ <b>{x.titel}</b> <small>Interaktionsrate {pz(x.rate)} · {x.aufrufe.toLocaleString("de-DE")} Aufrufe · {x.leads} Leads</small></p>)}<p className="muted">{d.auswertung.hinweis} Eigener Median: {pz(d.auswertung.median)}.</p></>}</section>
      <section className="panel"><h3>Werkzeuge</h3>{(d?.werkzeuge || []).map(w => <div key={w.id} className="ctWz"><div><b>{w.name}</b><small>{w.zweck} · Kosten: {w.kosten}</small></div><span className={"ctWzSt " + (w.status === "aktiv" ? "an" : "")}>{w.status}</span>
        {!w.kostenlos && w.status === "aus" && <button className="editMini" onClick={() => senden({ action: "werkzeug-anfragen", id: w.id }, "Freigabe angefragt – steht unter „Wartet auf Freigabe“")}>Freigabe anfragen</button>}</div>)}</section>
    </div>
    {C_STATUS.map(s => { const g = liste.filter(c => c.status === s); return !g.length ? null : <section className="panel" key={s}><h3>{C_LABEL[s]} ({g.length})</h3>
      {g.map(c => <Karte key={c.id} c={c} eqName={eqName(c.einnahmequelle_id)} verlauf={offen[c.id]} onVerlauf={() => umschalten(c.id)} senden={senden} setDialog={setDialog} />)}</section>; })}
    {d && !d.gesperrt && !liste.length && <section className="panel"><p className="muted">Noch kein Content. „💡 Ideen erzeugen“ schlägt Themen vor – kostenlos.</p></section>}
    {dialog?.art === "edit" && <Editor c={dialog.c} eqs={eqs} onClose={() => setDialog(null)} onSave={async daten => { if (await senden(dialog.c.id ? { action: "content-aendern", id: dialog.c.id, daten } : { action: "content-anlegen", daten }, dialog.c.id ? "Gespeichert" : "Angelegt")) setDialog(null); }} />}
    {dialog?.art === "ideen" && <IdeenDialog eqs={eqs} senden={senden} onClose={() => setDialog(null)} />}
    {dialog?.art === "quelle" && <Formular titel="Quelle hinzufügen" felder={[["quelle", "Quelle"], ["url", "URL"], ["datum", "Datum der Recherche", "date"], ["aussage", "Welche Aussage belegt sie?", "area"]]} start={{ datum: heute() }} onClose={() => setDialog(null)} onSave={async f => { if (await senden({ action: "content-quelle", id: dialog.c.id, quelle: f }, "Quelle gespeichert")) setDialog(null); }} />}
    {dialog?.art === "bild" && <Formular titel="Bild hinzufügen" hinweis="Nur eigene Fotos oder Bilder mit Lizenz. Ohne Rechte-Angabe keine Prüfung." felder={[["beschreibung", "Was zeigt das Bild?"], ["url", "Link (optional)"], ["rechte", "Rechte (z. B. „eigenes Foto“ oder Lizenz + Urheber)"]]} onClose={() => setDialog(null)} onSave={async f => { if (await senden({ action: "content-bild", id: dialog.c.id, bild: f }, "Bild gespeichert")) setDialog(null); }} />}
    {dialog?.art === "veroeff" && <Formular titel="Veröffentlichung eintragen" hinweis="Du hast selbst gepostet – hier nur Plattform, Link und Datum eintragen." felder={[["plattform", "Plattform", "plattform"], ["url", "Link zum Beitrag"], ["datum", "Datum", "date"]]} start={{ plattform: dialog.c.plattformen?.[0] || "tiktok", datum: heute() }} onClose={() => setDialog(null)} onSave={async f => { if (await senden({ action: "content-veroeffentlichung", id: dialog.c.id, veroeffentlichung: f }, "Veröffentlichung eingetragen")) setDialog(null); }} />}
    {dialog?.art === "kennzahl" && <Formular titel="Kennzahlen eintragen" hinweis="Nur Zahlen aus der Statistik der Plattform (z. B. TikTok → Analysen). Nichts schätzen." felder={[["plattform", "Plattform", "plattform"], ["datum", "Stand vom", "date"], ["quelle", "Quelle (z. B. „TikTok-Analysen“)"], ...KENNZAHLEN.map(([k, l]) => [k, l, "zahl"])]} start={{ plattform: dialog.c.plattformen?.[0] || "tiktok", datum: heute(), quelle: "" }} onClose={() => setDialog(null)} onSave={async f => { const k = { ...f }; for (const [x] of KENNZAHLEN) k[x] = parseInt(f[x] || "0", 10); if (await senden({ action: "content-kennzahl", id: dialog.c.id, kennzahl: k }, "Kennzahlen gespeichert")) setDialog(null); }} />}
    <style dangerouslySetInnerHTML={{ __html: CT_CSS }} />
  </div>;
}

function Karte({ c, eqName, verlauf, onVerlauf, senden, setDialog }) {
  const i = C_ABLAUF.indexOf(c.status);
  const n = cNaechsteStufe(c);
  const aufrufe = kennzahlSumme(c, "aufrufe");
  return <article className="ctKarte">
    <div className="ctKopf"><div><strong>{c.titel}</strong><small>{C_TYPEN[c.typ]} · {(c.plattformen || []).map(p => PLATTFORMEN[p]).join(", ") || "keine Plattform"}{eqName ? " · ↗ " + eqName : ""}{c.werbung ? " · Werbung" : ""}</small></div>
      <b className={"ctSt ct" + c.status}>{C_LABEL[c.status]}{c.status === "PRUEFUNG" ? (c.freigegeben ? " · freigegeben" : " · wartet auf Freigabe") : ""}</b></div>
    <ol className="ctAblauf">{C_ABLAUF.map((s, k) => <li key={s} className={k < i ? "fertig" : k === i ? "jetzt" : ""}>{C_LABEL[s]}</li>)}</ol>
    {c.thema && <p className="ctZeile">Thema: {c.thema}</p>}
    {(c.veroeffentlichung || []).length > 0 && <p className="ctZeile">Veröffentlicht: {c.veroeffentlichung.map((v, k) => <a key={k} href={v.url} target="_blank" rel="noreferrer">{PLATTFORMEN[v.plattform]} ({v.datum})</a>)}</p>}
    {(c.kennzahlen || []).length > 0 && <p className="ctZeile">Kennzahlen: {aufrufe.toLocaleString("de-DE")} Aufrufe · {kennzahlSumme(c, "leads")} Leads · {(kennzahlSumme(c, "einnahmen_cent") / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</p>}
    <div className="ctAktionen">
      <button className="editMini" onClick={() => setDialog({ art: "edit", c })}>Bearbeiten</button>
      <button className="editMini ctAuto" onClick={() => senden({ action: "content-vorbereiten", id: c.id }, "Automatisch vorbereitet")}>⚙ Automatisch vorbereiten</button>
      {n && <button className="editMini" onClick={() => senden({ action: "content-status", id: c.id, status: n }, `Status „${C_LABEL[n]}“`)}>Weiter: {C_LABEL[n]}</button>}
      <button className="editMini" onClick={() => setDialog({ art: "quelle", c })}>Quelle</button>
      <button className="editMini" onClick={() => setDialog({ art: "bild", c })}>Bild</button>
      {c.freigegeben && <button className="editMini" onClick={() => setDialog({ art: "veroeff", c })}>Veröffentlichung eintragen</button>}
      {(c.veroeffentlichung || []).length > 0 && <button className="editMini" onClick={() => setDialog({ art: "kennzahl", c })}>Kennzahlen eintragen</button>}
      <select defaultValue="" aria-label="Status ändern" onChange={e => { const z = e.target.value; e.target.value = ""; if (z) senden({ action: "content-status", id: c.id, status: z }, `Status „${C_LABEL[z]}“`); }}><option value="">Status …</option>{C_STATUS.filter(s => s !== c.status).map(s => <option key={s} value={s}>{C_LABEL[s]}</option>)}</select>
      <button className="editMini" onClick={onVerlauf}>{verlauf ? "Details schließen" : "Details & Texte"}</button>
    </div>
    {verlauf && <div className="ctDetails">
      <p className="muted">{C_HINWEIS}</p>
      {[["Recherche", c.recherche], ["Skript", c.skript], ["Beschreibung", c.beschreibung], ["Produkt-/Angebotsinfo", c.angebot_info], ["Werbetext", c.werbetext], ["Ergebnis", c.ergebnis]].filter(([, v]) => v).map(([l, v]) => <Block key={l} l={l} t={v} />)}
      {(c.titel_varianten || []).length > 0 && <Block l="Titel-Varianten" t={c.titel_varianten.map((x, k) => `${k + 1}. ${x}`).join("\n")} />}
      {Object.entries(c.varianten || {}).map(([p, t]) => <Block key={p} l={"Variante " + PLATTFORMEN[p]} t={t} />)}
      {(c.social_posts || []).length > 0 && <Block l="Social-Media-Beiträge" t={c.social_posts.map(x => `${x.nr}) ${x.text}`).join("\n")} />}
      {(c.bilder || []).length > 0 && <div><h4>Bilder</h4>{c.bilder.map((b, k) => <p key={k}>• {b.beschreibung} <small>Rechte: {b.rechte || "⚠ fehlt"}{b.url ? " · " : ""}{b.url && <a href={b.url} target="_blank" rel="noreferrer">Link</a>}</small></p>)}</div>}
      {(c.quellen_liste || []).length > 0 && <div><h4>Quellen</h4>{c.quellen_liste.map((x, k) => <p key={k}>• <a href={x.url} target="_blank" rel="noreferrer">{x.quelle}</a> <small>({x.datum}) – {x.aussage}</small></p>)}</div>}
      {(c.kennzahlen || []).length > 0 && <div><h4>Kennzahlen</h4>{c.kennzahlen.map((k, x) => <p key={x}><small>{k.datum} · {PLATTFORMEN[k.plattform]} · {k.quelle}:</small> {KENNZAHLEN.filter(([f]) => k[f]).map(([f, l]) => `${l} ${k[f]}`).join(" · ") || "alles 0"}</p>)}</div>}
      <div><h4>Verlauf</h4>{!verlauf.length ? <p className="muted">—</p> : verlauf.map(v => <p key={v.id}><small>{zeit(v.created_at)}</small> {v.action.replace("content.", "")}{v.details?.titel ? ": " + v.details.titel : ""}{v.details?.von ? `: ${C_LABEL[v.details.von]} → ${C_LABEL[v.details.nach]}` : ""}</p>)}</div>
    </div>}
  </article>;
}
const Block = ({ l, t }) => <div className="ctBlock"><h4>{l} <button className="editMini" onClick={() => kopieren(t)}>Kopieren</button></h4><pre>{t}</pre></div>;

function Editor({ c, eqs, onClose, onSave }) {
  const [f, setF] = useState({ titel: c.titel || "", typ: c.typ || "VIDEO", plattformen: c.plattformen || ["tiktok"], thema: c.thema || "", einnahmequelle_id: c.einnahmequelle_id || "", angebot_info: c.angebot_info || "", werbung: Boolean(c.werbung), recherche: c.recherche || "", skript: c.skript || "", beschreibung: c.beschreibung || "", werbetext: c.werbetext || "", ergebnis: c.ergebnis || "", notiz: c.notiz || "" });
  const s = k => e => setF({ ...f, [k]: e.target.value });
  const ta = (k, l, r = 3) => <label key={k}>{l}<textarea rows={r} value={f[k]} onChange={s(k)} /></label>;
  return <div className="modalBack"><div className="modal ctModal"><div className="modalHead"><h3>{c.id ? "Content bearbeiten" : "Neuer Content"}</h3><button onClick={onClose}>×</button></div>
    <label>Titel<input value={f.titel} onChange={s("titel")} /></label>
    <label>Typ<select value={f.typ} onChange={s("typ")}>{Object.entries(C_TYPEN).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
    <fieldset><legend>Plattformen</legend>{Object.entries(PLATTFORMEN).map(([k, l]) => <label key={k} className="ctCheck"><input type="checkbox" checked={f.plattformen.includes(k)} onChange={e => setF({ ...f, plattformen: e.target.checked ? [...f.plattformen, k] : f.plattformen.filter(x => x !== k) })} /> {l}</label>)}</fieldset>
    <label>Thema<input value={f.thema} onChange={s("thema")} /></label>
    <label>Gehört zur Einnahmequelle<select value={f.einnahmequelle_id} onChange={s("einnahmequelle_id")}><option value="">— keine —</option>{eqs.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}</select></label>
    <label className="ctCheck"><input type="checkbox" checked={f.werbung} onChange={e => setF({ ...f, werbung: e.target.checked })} /> Enthält Werbung / Partnerlink (wird gekennzeichnet)</label>
    {ta("angebot_info", "Produkt-/Angebotsinformationen (nur echte Angaben)", 2)}{ta("recherche", "Recherche-Notizen", 3)}{ta("skript", "Skript", 5)}{ta("beschreibung", "Beschreibung", 3)}{ta("werbetext", "Werbetext", 3)}{ta("ergebnis", "Ergebnis (nur Tatsachen)", 2)}{ta("notiz", "Notiz", 2)}
    <div className="modalActions"><button onClick={onClose}>Abbrechen</button><button className="primary" disabled={!f.titel.trim()} onClick={() => onSave(f)}>Speichern</button></div>
  </div></div>;
}

function IdeenDialog({ eqs, senden, onClose }) {
  const [f, setF] = useState({ thema: "", zielgruppe: "", einnahmequelle_id: "" });
  const [ideen, setIdeen] = useState(null);
  const eq = eqs.find(q => q.id === f.einnahmequelle_id);
  return <div className="modalBack"><div className="modal ctModal"><div className="modalHead"><h3>💡 Ideen erzeugen</h3><button onClick={onClose}>×</button></div>
    <p className="note">Kostenlos aus Vorlagen. Übernimm nur, was zu dir passt – übernommene Ideen starten als „Idee“.</p>
    <label>Einnahmequelle (optional)<select value={f.einnahmequelle_id} onChange={e => { const q = eqs.find(x => x.id === e.target.value); setF({ ...f, einnahmequelle_id: e.target.value, thema: f.thema || q?.angebot || "", zielgruppe: f.zielgruppe || q?.zielgruppe || "" }); }}><option value="">— keine —</option>{eqs.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}</select></label>
    <label>Thema<input value={f.thema} onChange={e => setF({ ...f, thema: e.target.value })} /></label>
    <label>Zielgruppe<input value={f.zielgruppe} onChange={e => setF({ ...f, zielgruppe: e.target.value })} /></label>
    <div className="modalActions"><button className="primary" disabled={!f.thema.trim()} onClick={async () => { const j = await senden({ action: "content-ideen", ...f }, "Ideen erzeugt"); if (j) setIdeen(j.ideen); }}>Ideen erzeugen</button></div>
    {ideen && ideen.map((x, k) => <div key={k} className="ctIdee"><span>{x}</span><button className="editMini" onClick={async () => { if (await senden({ action: "content-anlegen", daten: { titel: x, thema: f.thema, einnahmequelle_id: f.einnahmequelle_id || null, plattformen: ["tiktok"] } }, "Idee übernommen")) setIdeen(ideen.filter((_, i) => i !== k)); }}>Übernehmen</button></div>)}
    {eq && <p className="muted">Zielgruppe aus „{eq.name}“ vorbelegt.</p>}
  </div></div>;
}

function Formular({ titel, hinweis, felder, start = {}, onClose, onSave }) {
  const [f, setF] = useState(Object.fromEntries(felder.map(([k, , t]) => [k, start[k] ?? (t === "zahl" ? "0" : "")])));
  return <div className="modalBack"><div className="modal ctModal"><div className="modalHead"><h3>{titel}</h3><button onClick={onClose}>×</button></div>
    {hinweis && <p className="note">{hinweis}</p>}
    {felder.map(([k, l, t]) => <label key={k}>{l}{t === "area" ? <textarea rows={3} value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} /> : t === "plattform" ? <select value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })}>{Object.entries(PLATTFORMEN).map(([p, n]) => <option key={p} value={p}>{n}</option>)}</select> : <input type={t === "date" ? "date" : "text"} inputMode={t === "zahl" ? "numeric" : undefined} value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} />}</label>)}
    <div className="modalActions"><button onClick={onClose}>Abbrechen</button><button className="primary" onClick={() => onSave(f)}>Speichern</button></div>
  </div></div>;
}

const CT_CSS = `.ctKpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:6px;margin:10px 0}.ctKpis div{background:#fff;border:1px solid #eaecf0;border-radius:10px;padding:8px}.ctKpis span{display:block;font-size:11px;color:#667085}.ctKpis b{font-size:18px}
.ctZwei{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:10px}.ctZwei .panel{margin:0}.ctTop small{color:#667085}.ctWz{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:6px 0;border-top:1px solid #f2f4f7}.ctWz>div{flex:1;min-width:180px}.ctWz small{display:block;color:#667085;font-size:12px}
.ctWzSt{font-size:11px;padding:2px 8px;border-radius:999px;background:#f2f4f7}.ctWzSt.an{background:#ecfdf3;color:#067647}
.ctKarte{border:1px solid #eaecf0;border-radius:12px;padding:12px;margin-top:10px;display:flex;flex-direction:column;gap:6px;min-width:0}.ctKopf{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}.ctKopf small{display:block;color:#667085;font-size:12px}
.ctSt{font-size:12px;padding:3px 8px;border-radius:999px;background:#f2f4f7;height:fit-content}.ctPRUEFUNG{background:#fffaeb;color:#b54708}.ctVEROEFFENTLICHT,.ctREICHWEITE,.ctLEADS,.ctEINNAHMEN{background:#ecfdf3;color:#067647}.ctVERWORFEN{color:#98a2b3}
.ctAblauf{display:flex;flex-wrap:wrap;gap:4px;list-style:none;padding:0;margin:0}.ctAblauf li{font-size:11px;padding:2px 7px;border-radius:999px;background:#f2f4f7;color:#98a2b3}.ctAblauf li.fertig{background:#ecfdf3;color:#067647}.ctAblauf li.jetzt{background:#101828;color:#fff;font-weight:700}
.ctZeile{margin:0;font-size:13px;display:flex;gap:8px;flex-wrap:wrap}.ctAktionen{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.ctAktionen select{padding:6px;border:1px solid #d0d5dd;border-radius:7px}.ctAuto{font-weight:700}
.ctDetails{border-top:1px solid #eaecf0;padding-top:8px;display:grid;gap:8px}.ctDetails h4{margin:0 0 4px;font-size:13px;display:flex;gap:8px;align-items:center}.ctDetails p{margin:2px 0;font-size:13px;overflow-wrap:anywhere}.ctDetails small{color:#667085}
.ctBlock pre{white-space:pre-wrap;font:inherit;font-size:13px;background:#f9fafb;border-radius:8px;padding:8px;margin:0;overflow-wrap:anywhere}
.ctIdee{display:flex;justify-content:space-between;gap:8px;align-items:center;border-top:1px solid #f2f4f7;padding:6px 0;font-size:13px}
.ctMeldung{font-size:14px}.ctModal{width:min(640px,100%);max-height:92vh;overflow:auto}.ctModal label{display:block;font-size:12px;font-weight:700;margin-top:10px}.ctModal input:not([type=checkbox]),.ctModal textarea,.ctModal select{display:block;width:100%;margin-top:4px;padding:9px;border:1px solid #d0d5dd;border-radius:7px;font:inherit}
.ctModal fieldset{border:1px solid #eaecf0;border-radius:10px;margin-top:10px}.ctCheck{display:inline-flex!important;gap:6px;align-items:center;margin-right:12px;font-weight:400!important}.ct .muted{color:#98a2b3;font-size:13px}`;
