"use client";

// Pilot Anfragen-Service (27.09.2026): Anfrage-Eingang, automatischer Ablauf, Entwurfs-Arbeitsbereich,
// Kunden-Bereich und Angebots-/Einnahmen-Modul. 0 €: Stichwort-Regeln + Textvorlagen, kein Sprachmodell.
// Nichts wird gesendet, keine Preise, keine Vertraege. Testfaelle sind als TEST markiert und werden archiviert.
import { useEffect, useState } from "react";
import { adminFetch, anmeldeUrl } from "../../lib/admin-fetch.js";
import { A_LABEL, A_KATEGORIEN, RHYTHMUS } from "../../lib/anfragen-regeln.js";

const eur = c => ((c || 0) / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const zeit = t => t ? new Date(t).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" }) : "—";
const ABLAUF = [["NEU", "Anfrage"], ["ANALYSIERT", "Analyse + Kategorie + Dringlichkeit"], ["ENTWURF", "Antwortentwurf"], ["WARTET_AUF_FREIGABE", "Aufgabe · wartet auf Freigabe"], ["ERLEDIGT", "Ergebnis dokumentiert"]];
const ENTWURF_NAMEN = [["antwort", "Antwort-E-Mail"], ["rueckfrage", "Rückfrage"], ["angebotstext", "Angebotstext"], ["zusammenfassung", "Zusammenfassung"], ["naechste_aktion", "Nächste Aktion"]];

export function AnfragenService() {
  const [d, setD] = useState(null);
  const [meldung, setMeldung] = useState("");
  const [neu, setNeu] = useState(false);
  const [offen, setOffen] = useState({});
  const [archivAuf, setArchivAuf] = useState(false);
  const [angebotEdit, setAngebotEdit] = useState(false);
  const laden = () => adminFetch("/api/master/businesses?anfragen=1").then(async r => setD(r.status === 401 ? { gesperrt: true } : await r.json())).catch(() => setD({ fehler: true }));
  useEffect(() => { laden(); }, []);
  async function senden(body, erfolg) {
    setMeldung("");
    const r = await adminFetch("/api/master/businesses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setMeldung("❌ " + (j.error || "Fehler " + r.status)); return null; }
    await laden(); setMeldung("✅ " + erfolg); return j;
  }
  if (d?.gesperrt) return <div className="panel">Nur mit Anmeldung sichtbar. <a href={anmeldeUrl()}>⎆ Anmelden</a></div>;
  if (d?.ok === false || d?.fehler) return <div className="panel">❌ {d.error || "Daten nicht verfügbar"}</div>;
  const z = d?.zahlen, ae = d?.angebotsentwurf;
  return <div className="an">
    <div className="pageTitle"><div><span>PILOT · TEST · 0 €</span><h2>Anfragen-Service</h2></div><div className="quick"><button className="primaryLink" disabled={!d} onClick={() => setNeu(true)}>+ Anfrage erfassen</button></div></div>
    <p className="note"><b>Pilot im Testbetrieb.</b> Die Zentrale analysiert Anfragen und bereitet Entwürfe vor – <b>sie sendet nichts</b>, legt keine Preise fest und schließt keine Verträge. Echte Anfragen erst mit einem echten Pilotkunden und geklärter Auftragsverarbeitung (siehe „Wartet auf mich“). Werkzeuge: Stichwort-Regeln + Textvorlagen (kostenlos, kein Sprachmodell).</p>
    {meldung && <div className="panel anMeldung">{meldung}</div>}
    <div className="anKpis">{[["Echte Anfragen", z?.echt], ["davon offen", z?.offen], ["erledigt", z?.erledigt], ["Testfälle", z?.test], ["Einnahmen", d ? eur(d.finanzen.einnahmen_cent) : null], ["Kosten", d ? eur(d.finanzen.kosten_cent) : null]].map(([l, v]) => <div key={l}><span>{l}</span><b>{v ?? "…"}</b></div>)}</div>

    <section className="panel"><h3>Automatischer Ablauf</h3>
      <ol className="anAblauf">{ABLAUF.map(([k, t], i) => <li key={k}><b>{i + 1}</b><span>{t}</span></li>)}</ol>
      <p className="anKlein">Schritte 1–4 laufen automatisch beim Erfassen. Senden und Abschließen macht der Mensch (WARTET AUF FREIGABE).</p>
    </section>

    {d?.wartetAufMich?.length > 0 && <section className="panel anWarten"><h3>✋ Wartet auf mich ({d.wartetAufMich.length})</h3>
      {d.wartetAufMich.map(f => <p key={f.id}><b>{f.titel}</b><br /><small>{f.beschreibung}</small></p>)}<a href="/master?tab=freigaben">Zu „Wartet auf mich“ →</a></section>}

    <section className="panel"><h3>Anfrage-Eingang ({d?.anfragen?.length ?? "…"})</h3>
      {!d ? <p className="anKlein">wird geladen…</p> : !d.anfragen.length ? <p className="anKlein">Keine offenen Anfragen. Echte Anfragen kommen erst mit dem ersten Pilotkunden.</p> :
        <div className="anListe">{d.anfragen.map(a => <Anfrage key={a.id} a={a} auf={offen[a.id]} umschalten={() => setOffen(o => ({ ...o, [a.id]: !o[a.id] }))} senden={senden} />)}</div>}
      {d?.archiv?.length > 0 && <><button className="editMini" onClick={() => setArchivAuf(!archivAuf)}>{archivAuf ? "Archiv ausblenden" : `Archiv anzeigen (${d.archiv.length})`}</button>
        {archivAuf && <div className="anListe anArchiv">{d.archiv.map(a => <Anfrage key={a.id} a={a} auf={offen[a.id]} umschalten={() => setOffen(o => ({ ...o, [a.id]: !o[a.id] }))} senden={senden} />)}</div>}</>}
    </section>

    <section className="panel"><h3>Kunden-Bereich (vorbereitet)</h3>
      <div className="anKunden">{(d?.kunden || []).map(k => <div key={k.id}><h4>{k.name} <b>{k.liste.length}</b></h4>{k.liste.length ? k.liste.map(l => <p key={l.id}>• {l.name}</p>) : <p className="anKlein">—</p>}</div>)}</div>
      <dl className="anDaten"><dt>Leistung</dt><dd>{d?.eq?.angebot || "—"}</dd><dt>Zielkunden</dt><dd>{d?.eq?.zielgruppe || "—"}</dd><dt>Einnahmen (mit Nachweis)</dt><dd>{d ? eur(d.finanzen.einnahmen_cent) : "…"}{d?.finanzen?.offen_cent ? ` · offen ${eur(d.finanzen.offen_cent)}` : ""}</dd>
        <dt>Offene Aufgaben</dt><dd>{d?.offeneAufgaben?.length ? d.offeneAufgaben.map(t => t.title).join(" · ") : "keine"}</dd><dt>Ergebnisse</dt><dd>{z?.erledigt ? `${z.erledigt} echte Anfragen erledigt` : "noch keine echten Ergebnisse"}</dd></dl>
      <p className="anKlein">Kunden entstehen nur aus echten Leads dieser Einnahmequelle („E-Mail & Leads“). Nichts ist erfunden.</p>
    </section>

    <section className="panel"><h3>Angebot & Einnahmen (nur Vorschlag)</h3>
      {ae && !angebotEdit ? <dl className="anDaten"><dt>Leistung</dt><dd>{ae.leistung}</dd><dt>Möglicher Preis</dt><dd>{ae.moeglicher_preis} <small>(nicht verbindlich)</small></dd><dt>Abrechnung</dt><dd>{RHYTHMUS[ae.rhythmus]}</dd><dt>Kosten</dt><dd>{ae.kosten}</dd>
        <dt>Erwartete Einnahmen</dt><dd>{ae.erwartete_einnahmen}{ae.quelle ? <> · <a href={ae.quelle} target="_blank" rel="noreferrer">Quelle</a></> : null}</dd><dt>Tatsächliche Einnahmen</dt><dd>{eur(d.finanzen.einnahmen_cent)}</dd></dl>
        : angebotEdit || d ? (angebotEdit ? <AngebotForm start={ae} onClose={() => setAngebotEdit(false)} onSave={async e => { if (await senden({ action: "angebotsentwurf-speichern", entwurf: e }, "Angebotsentwurf gespeichert – nichts ist verbindlich")) setAngebotEdit(false); }} />
          : <p className="anKlein">Noch kein Angebotsentwurf. Tatsächliche Einnahmen: {eur(d.finanzen.einnahmen_cent)}.</p>) : null}
      {!angebotEdit && <button className="editMini" disabled={!d} onClick={() => setAngebotEdit(true)}>{ae ? "Entwurf bearbeiten" : "Angebotsentwurf anlegen"}</button>}
      <p className="anKlein">Ein fester Preis entsteht erst nach deiner Entscheidung. Erwartete Einnahmen mit Zahl nur mit Quelle.</p>
    </section>

    {neu && <NeuDialog onClose={() => setNeu(false)} onSave={async x => { if (await senden({ action: "anfrage-erfassen", anfrage: x }, "Anfrage erfasst, analysiert, Entwürfe erstellt, Aufgabe angelegt – wartet auf Freigabe")) setNeu(false); }} />}
    <style dangerouslySetInnerHTML={{ __html: AN_CSS }} />
  </div>;
}

function Anfrage({ a, auf, umschalten, senden }) {
  const [ergebnis, setErgebnis] = useState("");
  const [kopiert, setKopiert] = useState("");
  const kopieren = async (k, t) => { try { await navigator.clipboard.writeText(t); setKopiert(k); } catch { setKopiert(""); } };
  const fertig = ["ERLEDIGT", "ARCHIVIERT"].includes(a.status);
  return <article className={"anKarte" + (a.ist_test ? " test" : "")}>
    <button type="button" className="anKopf" onClick={umschalten} aria-expanded={Boolean(auf)}>
      {a.ist_test && <em className="anTest">TEST</em>}<span className={"anPrio p" + a.prioritaet}>{a.prioritaet}</span>
      <span className="anTitel">{a.unternehmen}: {a.analyse?.zusammenfassung || a.text}</span><span className="anSt">{A_LABEL[a.status]}</span>
    </button>
    <div className="anMeta">{zeit(a.datum)} · Quelle: {a.quelle} · {A_KATEGORIEN[a.kategorie] || "—"} · Nächste Aktion: {a.naechste_aktion || "—"}</div>
    {auf && <div className="anDetail">
      <h4>Anfrage</h4><p className="anText">{a.text}</p>
      <h4>Analyse</h4><p>{a.analyse?.kategorie_text} · Dringlichkeit {String(a.analyse?.dringlichkeit || "").toLowerCase()} · Kontakt: {[a.analyse?.kontakt?.name, a.analyse?.kontakt?.email, a.analyse?.kontakt?.telefon].filter(Boolean).join(", ") || "nicht erkannt"}{a.analyse?.fehlt?.length ? " · Fehlt: " + a.analyse.fehlt.join(", ") : ""} <small>({a.analyse?.hinweis})</small></p>
      <h4>Entwürfe <small>({a.entwuerfe?.erstellt_mit}) – nicht gesendet</small></h4>
      {ENTWURF_NAMEN.map(([k, n]) => a.entwuerfe?.[k] && <div key={k} className="anEntwurf"><div className="anEntwurfKopf"><b>{n}</b>{a.entwuerfe[k].betreff && <small>Betreff: {a.entwuerfe[k].betreff}</small>}
        <button type="button" className="editMini" onClick={() => kopieren(k, (a.entwuerfe[k].betreff ? "Betreff: " + a.entwuerfe[k].betreff + "\n\n" : "") + a.entwuerfe[k].text)}>{kopiert === k ? "✓ kopiert" : "Kopieren"}</button></div>
        <pre>{a.entwuerfe[k].text}</pre>{a.entwuerfe[k].hinweis && <small>{a.entwuerfe[k].hinweis}</small>}</div>)}
      <h4>Verlauf</h4><ul className="anVerlauf">{(a.verlauf || []).map((v, i) => <li key={i}>{zeit(v.zeit)} · {v.text}</li>)}</ul>
      {a.ergebnis && <p><b>Ergebnis:</b> {a.ergebnis}</p>}
      {!fertig && <div className="anAktionen"><input value={ergebnis} onChange={e => setErgebnis(e.target.value)} placeholder="Ergebnis, z. B. „Antwort selbst gesendet am …“" aria-label="Ergebnis" />
        <button className="editMini" disabled={ergebnis.trim().length < 3} onClick={() => senden({ action: "anfrage-abschliessen", id: a.id, ergebnis }, "Abgeschlossen und dokumentiert")}>Abschließen</button></div>}
      {a.status !== "ARCHIVIERT" && <button className="editMini" onClick={() => senden({ action: "anfrage-archivieren", id: a.id, grund: a.ist_test ? "Testfall nach dem Test archiviert" : "archiviert" }, "Archiviert – nichts gelöscht")}>Archivieren</button>}
    </div>}
  </article>;
}

function NeuDialog({ onClose, onSave }) {
  const [f, setF] = useState({ datum: new Date().toISOString().slice(0, 16), quelle: "", unternehmen: "", text: "", ist_test: true });
  const ch = (k, v) => setF({ ...f, [k]: v });
  return <div className="modalBack"><div className="modal"><div className="modalHead"><h3>Anfrage erfassen</h3><button onClick={onClose}>×</button></div>
    <p className="anKlein">Solange es keinen echten Pilotkunden gibt, sind nur <b>Testfälle</b> möglich (als TEST markiert, ohne echte Personendaten).</p>
    <label>Datum<input type="datetime-local" value={f.datum} onChange={e => ch("datum", e.target.value)} /></label>
    <label>Quelle<input value={f.quelle} onChange={e => ch("quelle", e.target.value)} placeholder="z. B. Kontaktformular der Website (Testfall)" /></label>
    <label>Unternehmen (für wen bearbeitet wird)<input value={f.unternehmen} onChange={e => ch("unternehmen", e.target.value)} placeholder="z. B. Testbetrieb (fiktiv)" /></label>
    <label>Anfrage<textarea rows={6} value={f.text} onChange={e => ch("text", e.target.value)} placeholder="Text der Anfrage" /></label>
    <label className="anCheck"><input type="checkbox" checked={f.ist_test} disabled readOnly /> Testfall (TEST) – echte Anfragen erst mit Pilotkunde</label>
    <div className="modalActions"><button onClick={onClose}>Abbrechen</button><button className="primary" disabled={!f.quelle.trim() || !f.unternehmen.trim() || f.text.trim().length < 10} onClick={() => onSave({ ...f, datum: new Date(f.datum).toISOString() })}>Erfassen & analysieren</button></div>
  </div></div>;
}

function AngebotForm({ start, onClose, onSave }) {
  const [f, setF] = useState({ leistung: start?.leistung || "", moeglicher_preis: start?.moeglicher_preis || "noch zu prüfen", rhythmus: start?.rhythmus || "OFFEN", kosten: start?.kosten || "0 € (nur kostenlose Werkzeuge)", erwartete_einnahmen: start?.erwartete_einnahmen || "noch zu prüfen", quelle: start?.quelle || "" });
  const ch = (k, v) => setF({ ...f, [k]: v });
  return <div className="anForm">
    <label>Leistung<textarea rows={2} value={f.leistung} onChange={e => ch("leistung", e.target.value)} /></label>
    <label>Möglicher Preis (Text, unverbindlich)<input value={f.moeglicher_preis} onChange={e => ch("moeglicher_preis", e.target.value)} /></label>
    <label>Abrechnung<select value={f.rhythmus} onChange={e => ch("rhythmus", e.target.value)}>{Object.entries(RHYTHMUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
    <label>Kosten<input value={f.kosten} onChange={e => ch("kosten", e.target.value)} /></label>
    <label>Erwartete Einnahmen<input value={f.erwartete_einnahmen} onChange={e => ch("erwartete_einnahmen", e.target.value)} /></label>
    <label>Quelle (URL, Pflicht bei Zahlen)<input value={f.quelle} onChange={e => ch("quelle", e.target.value)} /></label>
    <div className="modalActions"><button onClick={onClose}>Abbrechen</button><button className="primary" disabled={f.leistung.trim().length < 5} onClick={() => onSave(f)}>Speichern</button></div>
  </div>;
}

const AN_CSS = `
.an .note{margin-bottom:10px}
.anKpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;margin:10px 0}
.anKpis div{background:var(--panel,#fff);border:1px solid rgba(127,127,127,.2);border-radius:10px;padding:8px 10px}.anKpis span{display:block;font-size:12px;opacity:.75}.anKpis b{font-size:18px}
.anAblauf{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}
.anAblauf li{display:flex;gap:8px;align-items:center;background:rgba(127,127,127,.06);border-radius:8px;padding:8px;font-size:13px}.anAblauf b{min-width:22px;height:22px;border-radius:50%;background:#10b981;color:#fff;display:grid;place-items:center;font-size:12px}
.anKlein{font-size:12px;opacity:.75;margin:6px 0}
.anWarten{border-left:4px solid #f59e0b}
.anListe{display:grid;gap:8px;margin:8px 0}
.anKarte{border:1px solid rgba(127,127,127,.25);border-radius:10px;padding:8px 10px;min-width:0}.anKarte.test{border-style:dashed}
.anKopf{display:flex;align-items:center;gap:8px;width:100%;background:none;border:0;padding:0;color:inherit;font:inherit;text-align:left;cursor:pointer;min-width:0}
.anTitel{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600}
.anTest{font-style:normal;font-size:11px;font-weight:700;background:#7c3aed;color:#fff;border-radius:4px;padding:1px 6px}
.anPrio{font-size:11px;border-radius:4px;padding:1px 6px;background:rgba(127,127,127,.15)}.anPrio.pHoch{background:rgba(239,68,68,.18)}.anPrio.pMittel{background:rgba(245,158,11,.18)}
.anSt{font-size:12px;opacity:.8;white-space:nowrap}
.anMeta{font-size:12px;opacity:.75;margin-top:4px;overflow-wrap:anywhere}
.anDetail{margin-top:8px;border-top:1px solid rgba(127,127,127,.2);padding-top:8px}.anDetail h4{margin:10px 0 4px;font-size:13px}
.anText{white-space:pre-wrap;background:rgba(127,127,127,.06);padding:8px;border-radius:8px;overflow-wrap:anywhere}
.anEntwurf{border:1px solid rgba(127,127,127,.2);border-radius:8px;padding:8px;margin:6px 0}.anEntwurfKopf{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center}
.anEntwurf pre{white-space:pre-wrap;font-family:inherit;font-size:13px;margin:6px 0 0;overflow-wrap:anywhere}
.anVerlauf{margin:0;padding-left:18px;font-size:12px}
.anAktionen{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.anAktionen input{flex:1 1 200px;min-width:0}
.anKunden{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}.anKunden div{background:rgba(127,127,127,.06);border-radius:8px;padding:8px}.anKunden h4{margin:0 0 4px;font-size:13px;display:flex;justify-content:space-between}
.anDaten{display:grid;grid-template-columns:minmax(110px,max-content) 1fr;gap:4px 12px;font-size:13px;margin:10px 0}.anDaten dt{opacity:.7}.anDaten dd{margin:0;overflow-wrap:anywhere}
.anForm{display:grid;gap:8px}.anForm label{display:grid;gap:4px;font-size:13px}
.anCheck{display:flex!important;gap:6px;align-items:center}
@media(max-width:520px){.anDaten{grid-template-columns:1fr}.anDaten dt{margin-top:6px}}
`;
