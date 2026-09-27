"use client";

// Zentrale Sichten (Teil 5, 27.09.2026): Aufgaben-Manager, E-Mail-Zentrale, Lead-Manager, Content-Zentrale, Finanz-Monitor.
// Nur Anzeige - Werte kommen aus lib/zentralen.js bzw. lib/master-finance.js (echte Daten).
import { useEffect, useState } from "react";
import { adminFetch } from "../../lib/admin-fetch.js";

const eur = c => ((c || 0) / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const datum = t => t ? new Date(t).toLocaleDateString("de-DE") : "—";

// Eine Zeile je Eintrag; lange Angaben (Laufberichte, URLs) nur nach Klick auf „Details“. Nichts wird weggelassen.
function Zeile({ e, onZiel }) {
  const [auf, setAuf] = useState(false);
  const details = e.details || [];
  return <li className="zsZeile">
    <span className="zsPunkt" aria-hidden="true" />
    <div className="zsInhalt">
      <div className="zsKopfzeile">
        {onZiel && e.ziel ? <button type="button" className="zsText" title={e.text} onClick={() => onZiel(e.ziel)}>{e.text}</button> : <span className="zsText" title={e.text}>{e.text}</span>}
        {details.length > 0 && <button type="button" className="zsDetailKnopf" aria-expanded={auf} onClick={() => setAuf(!auf)}>{auf ? "weniger" : "Details"}</button>}
      </div>
      {auf && <ul className="zsDetails">{details.map((d, i) => <li key={i}>{String(d).split(/(https?:\/\/\S+)/).map((t, j) => /^https?:\/\//.test(t) ? <a key={j} href={t.replace(/[),.]+$/, "")} target="_blank" rel="noreferrer">{t}</a> : t)}</li>)}</ul>}
    </div>
  </li>;
}

function Spalte({ titel, eintraege, leer, klasse = "", onZiel, symbol = "" }) {
  const [alle, setAlle] = useState(false);
  const liste = eintraege || [];
  const sichtbar = alle ? liste : liste.slice(0, 8);
  return <div className={"zsSpalte " + klasse}>
    <h4><span>{symbol ? symbol + " " : ""}{titel}</span><b className="zsAnzahl">{eintraege?.length ?? "…"}</b></h4>
    {!eintraege ? <p className="zsLeer">…</p> : !liste.length ? <p className="zsLeer">{leer}</p> :
      <ul className="zsListe">{sichtbar.map((e, i) => <Zeile key={i} e={e} onZiel={onZiel} />)}</ul>}
    {liste.length > 8 && <button type="button" className="zsDetailKnopf zsMehr" onClick={() => setAlle(!alle)}>{alle ? "weniger anzeigen" : `alle ${liste.length} anzeigen`}</button>}
  </div>;
}

export function AufgabenZentraleKarte({ goTo }) {
  const [z, setZ] = useState(undefined);
  useEffect(() => { adminFetch("/api/master/businesses?tagesbericht=1").then(r => r.ok ? r.json() : null).then(j => setZ(j?.bericht?.aufgabenZentrale || null)).catch(() => setZ(null)); }, []);
  if (z === null) return null;
  const ziel = t => t?.startsWith("/") ? window.location.assign(t) : goTo?.(t);
  return <section className="panel zs"><h3>Aufgaben-Zentrale</h3>
    {z?.naechsteAktion && <div className="zsNaechste"><span className="zsNaechsteLabel">👉 Nächste Aktion</span><button type="button" onClick={() => ziel(z.naechsteAktion.ziel)}>{z.naechsteAktion.text}</button></div>}
    <div className="zsGitter">
      <Spalte titel="Heute" symbol="📅" eintraege={z?.heute} leer="Nichts fällig." klasse="zsHeute" onZiel={ziel} />
      <Spalte titel="Automatisch erledigt" symbol="⚙" eintraege={z?.automatischErledigt} leer="Heute noch nichts." klasse="zsAuto" onZiel={ziel} />
      <Spalte titel="Wartet auf mich" symbol="✋" eintraege={z?.wartetAufMich} leer="Nichts." klasse="zsWarten" onZiel={ziel} />
      <Spalte titel="Fehler" symbol="⚠" eintraege={z?.fehler} leer="Keine." klasse="zsFehler" onZiel={ziel} />
      <Spalte titel="Erfolgreich (heute erledigt)" symbol="✓" eintraege={z?.erfolgreich} leer="Heute noch nichts." klasse="zsErfolg" onZiel={ziel} />
    </div>
    <p className="zsLeer">Gleiche automatische Läufe sind zusammengefasst (×Anzahl); jeder einzelne Lauf steht unter „Details“. Erledigte Aufgaben ohne Notiz werden automatisch mit Datum dokumentiert.</p>
    <style dangerouslySetInnerHTML={{ __html: ZS_CSS }} />
  </section>;
}

export function EmailZentraleKarte({ e }) {
  if (!e) return null;
  return <section className="panel zs"><h3>E-Mail-Zentrale</h3>
    <p className="zsLeer">{e.versand}</p>
    <div className="zsKpis">{[["Eingang (unbearbeitet)", e.status.offeneAntworten], ["Entwürfe", e.status.entwuerfe], ["Gesendet (von dir)", e.status.gesendet], ["Follow-ups offen", e.followups.length], ["Kontakt gesperrt", e.status.kontaktGesperrt]].map(([l, v]) => <div key={l}><span>{l}</span><b>{v}</b></div>)}</div>
    <div className="zsGitter">
      <Spalte titel="Eingehende Anfragen" eintraege={e.eingang.map(n => ({ text: `${n.lead}: ${n.text}` }))} leer="Keine unbearbeiteten Nachrichten." />
      <Spalte titel="Antwort-Entwürfe (warten auf dich)" eintraege={e.entwuerfe.map(n => ({ text: `${n.lead}: ${n.art}${n.senden_erlaubt ? "" : " – nicht senden: " + n.hinweis}` }))} leer="Keine Entwürfe." klasse="zsWarten" />
      <Spalte titel="Follow-ups" eintraege={e.followups.map(f => ({ text: `${f.text}${f.faellig ? " · fällig " + datum(f.faellig) : ""}${f.ueberfaellig ? " · überfällig" : ""}` }))} leer="Keine." />
      <Spalte titel="Vorlagen" eintraege={e.vorlagen.map(v => ({ text: v.name }))} leer="—" />
    </div>
    <style dangerouslySetInnerHTML={{ __html: ZS_CSS }} />
  </section>;
}

export function LeadTabelle({ leads }) {
  if (!leads?.length) return null;
  return <section className="panel zs"><h3>Lead-Manager ({leads.length})</h3>
    <div className="zsScroll"><table className="zsTab"><thead><tr><th>Unternehmen/Person</th><th>Quelle</th><th>Kontaktmöglichkeit</th><th>Interesse</th><th>Status</th><th>Nächste Aktion</th><th>Notizen</th><th>Datum</th><th>Ergebnis</th></tr></thead>
      <tbody>{leads.map(l => { const z = l.zeile || {}; return <tr key={l.id}><td><b>{z.wer}</b></td><td>{z.quelle}</td><td>{z.kontakt}{z.kontakt_erlaubt ? "" : <small> (keine Werbung ohne Einwilligung)</small>}</td><td>{z.interesse}</td><td>{z.status}</td><td>{z.naechste_aktion}</td><td>{z.notiz}</td><td>{datum(z.datum)}</td><td>{z.ergebnis}</td></tr>; })}</tbody></table></div>
    <style dangerouslySetInnerHTML={{ __html: ZS_CSS }} />
  </section>;
}

export function ContentZentraleKarte({ z }) {
  if (!z) return null;
  const t = l => l.map(c => ({ text: c.titel || c }));
  return <section className="panel zs"><h3>Content-Zentrale</h3>
    <p className="zsLeer">{z.hinweis}</p>
    <div className="zsKpis">{[["Warten auf Freigabe", z.veroeffentlichung.wartetAufFreigabe], ["Freigegeben, noch nicht online", z.veroeffentlichung.freigegeben], ["Veröffentlicht", z.veroeffentlichung.veroeffentlicht]].map(([l, v]) => <div key={l}><span>{l}</span><b>{v}</b></div>)}</div>
    <div className="zsGitter">
      <Spalte titel="Content-Ideen" eintraege={t(z.ideen)} leer="Keine." />
      <Spalte titel="Video-Ideen" eintraege={t(z.videoIdeen)} leer="Keine." />
      <Spalte titel="Skripte" eintraege={t(z.skripte)} leer="Keine." />
      <Spalte titel="Fertige Texte" eintraege={t(z.fertigeTexte)} leer="Keine." />
      <Spalte titel="Titel" eintraege={z.titel.map(x => ({ text: x }))} leer="Keine." />
      <Spalte titel="Beschreibungen" eintraege={t(z.beschreibungen)} leer="Keine." />
      <Spalte titel="Affiliate-/Werbehinweise" eintraege={z.affiliate.map(c => ({ text: `${c.titel}: ${c.gekennzeichnet ? "✓ als Werbung gekennzeichnet" : "⚠ Kennzeichnung fehlt"}` }))} leer="Keine Werbeinhalte." />
      <Spalte titel="Ergebnisse (echte Kennzahlen)" eintraege={z.ergebnisse.map(c => ({ text: `${c.titel}: ${c.aufrufe} Aufrufe · ${c.klicks} Klicks · ${c.leads} Leads · ${eur(c.einnahmen_cent)}` }))} leer="Noch keine Kennzahlen eingetragen." />
    </div>
    <style dangerouslySetInnerHTML={{ __html: ZS_CSS }} />
  </section>;
}

export function FinanzMonitor({ m }) {
  if (!m) return null;
  return <section className="panel zs"><h3>Finanz-Monitor</h3>
    <p className="zsLeer">Einnahmen zählen erst mit Zahlungsnachweis. „Offen“ ist noch kein Geld. Test- und stornierte Buchungen sind ausgeschlossen ({m.ausgeschlossen}).</p>
    <div className="zsKpis">{[["Einnahmen", m.einnahmen_cent], ["Kosten", m.kosten_cent], ["Gewinn", m.gewinn_cent], ["Offene Einnahmen", m.offen_cent]].map(([l, v]) => <div key={l}><span>{l}</span><b>{eur(v)}</b></div>)}</div>
    <div className="zsScroll"><table className="zsTab"><thead><tr><th>Monat</th><th>Einnahmen</th><th>Kosten</th><th>Gewinn</th><th>Offen</th></tr></thead>
      <tbody>{!m.monate.length ? <tr><td colSpan={5}>Noch keine Buchungen.</td></tr> : m.monate.map(x => <tr key={x.monat}><td>{x.monat}</td><td>{eur(x.einnahmen_cent)}</td><td>{eur(x.kosten_cent)}</td><td>{eur(x.gewinn_cent)}</td><td>{eur(x.offen_cent)}</td></tr>)}</tbody></table></div>
    <div className="zsGitter">
      <Spalte titel="Je Einnahmequelle" eintraege={m.jeEq.map(x => ({ text: `${x.name}: ${eur(x.einnahmen_cent)} ein · ${eur(x.kosten_cent)} Kosten · ${eur(x.offen_cent)} offen` }))} leer="Keine Buchungen." />
      <Spalte titel="Kostenquellen" eintraege={m.kostenQuellen.map(x => ({ text: `${x.kategorie}: ${eur(x.kosten_cent)}` }))} leer="Keine Kosten – 0-€-Modus." />
    </div>
    <style dangerouslySetInnerHTML={{ __html: ZS_CSS }} />
  </section>;
}

// Umsatz-Pipeline (prominent): LEADS -> KONTAKTIERT -> INTERESSE -> ANGEBOT -> AUFTRAG -> BEZAHLT + Kennzahlen + naechster Schritt.
export function UmsatzPipeline({ u, laden = false, goTo }) {
  const [eigen, setEigen] = useState(null);
  useEffect(() => { if (laden) adminFetch("/api/master/businesses?leads=1").then(r => r.ok ? r.json() : null).then(j => setEigen(j?.umsatz || null)).catch(() => {}); }, [laden]);
  const d = u || eigen; if (!d) return null;
  const k = d.kennzahlen;
  return <section className="panel up" aria-label="Umsatz-Pipeline"><h3>Umsatz-Pipeline</h3>
    <ol className="upStufen">{d.stufen.map((s, i) => <li key={s.id} className={s.anzahl ? "an" : ""}><b>{s.anzahl}</b><span>{s.name}</span>{i < d.stufen.length - 1 && <i aria-hidden="true">→</i>}</li>)}</ol>
    <div className="zsKpis">{[["Leads", k.leads], ["Interessenten", k.interessenten], ["Offene Nachfassungen", k.offeneNachfassungen], ["Angebote", k.angebote], ["Gewonnene Aufträge", k.auftraege], ["Einnahmen", eur(k.einnahmen_cent)], ["Kosten", eur(k.kosten_cent)], ["Gewinn", eur(k.gewinn_cent)]].map(([l, v]) => <div key={l}><span>{l}</span><b>{v}</b></div>)}</div>
    {d.naechsterSchritt && <div className="zsNaechste"><span className="zsNaechsteLabel">👉 Nächster konkreter Schritt</span>{goTo ? <button type="button" onClick={() => goTo("pilot")}>{d.naechsterSchritt}</button> : <span>{d.naechsterSchritt}</span>}</div>}
    <p className="zsLeer">„Bezahlt“ zählt nur mit Zahlungsnachweis. {k.offen_cent ? `Offen (noch kein Geld): ${eur(k.offen_cent)}.` : ""}</p>
    <style dangerouslySetInnerHTML={{ __html: ZS_CSS }} />
  </section>;
}

const ZS_CSS = `
.upStufen{list-style:none;margin:6px 0 10px;padding:0;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px}
.upStufen li{position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;padding:10px 4px;border-radius:10px;background:rgba(127,127,127,.08);text-align:center;min-width:0}
.upStufen li.an{background:rgba(16,185,129,.14)}.upStufen b{font-size:22px}.upStufen span{font-size:11px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;overflow-wrap:anywhere}
.upStufen i{position:absolute;right:-6px;top:50%;transform:translateY(-50%);font-style:normal;opacity:.5;font-size:12px}
@media(max-width:560px){.upStufen{grid-template-columns:repeat(3,minmax(0,1fr))}.upStufen i{display:none}}
.zs h4{margin:0 0 8px;font-size:13px;display:flex;justify-content:space-between;align-items:center;gap:8px;padding-bottom:6px;border-bottom:1px solid rgba(127,127,127,.25)}
.zsAnzahl{min-width:24px;text-align:center;padding:1px 8px;border-radius:999px;background:rgba(127,127,127,.15);font-size:12px}
.zsGitter{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px;margin-top:10px}
.zsSpalte{background:rgba(127,127,127,.06);border-radius:10px;padding:10px 12px;min-width:0;border-top:3px solid rgba(127,127,127,.35)}
.zsHeute{border-top-color:#3b82f6}.zsAuto{border-top-color:#10b981}.zsWarten{border-top-color:#f59e0b;background:rgba(245,158,11,.07)}.zsFehler{border-top-color:#ef4444;background:rgba(239,68,68,.06)}.zsErfolg{border-top-color:#22c55e}
.zsListe,.zsSpalte>ul{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.zsZeile{display:grid;grid-template-columns:8px minmax(0,1fr);gap:8px;align-items:start;font-size:13px}
.zsPunkt{width:6px;height:6px;border-radius:50%;background:currentColor;opacity:.55;margin-top:7px}
.zsInhalt{min-width:0}
.zsKopfzeile{display:flex;align-items:baseline;gap:6px;min-width:0}
.zsText{flex:1 1 auto;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}
button.zsText{background:none;border:0;padding:0;color:inherit;text-align:left;cursor:pointer;font:inherit}
button.zsText:hover{text-decoration:underline}
.zsDetailKnopf{flex:0 0 auto;background:none;border:1px solid rgba(127,127,127,.4);border-radius:6px;padding:0 6px;font-size:11px;line-height:18px;color:inherit;cursor:pointer}
.zsMehr{margin-top:8px}
.zsDetails{list-style:disc;margin:6px 0 2px;padding-left:16px;font-size:12px;opacity:.9;display:grid;gap:3px}
.zsDetails li{overflow-wrap:anywhere;white-space:normal}
.zsNaechste{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;padding:10px 12px;border-radius:10px;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.5);margin:6px 0 4px}
.zsNaechsteLabel{font-weight:700;font-size:13px;white-space:nowrap}
.zsNaechste button{background:none;border:0;padding:0;color:inherit;text-align:left;cursor:pointer;font:inherit;text-decoration:underline;min-width:0;overflow-wrap:anywhere}
.zsLeer{font-size:12px;opacity:.7;margin:6px 0}
.zsKpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin:8px 0}
.zsKpis div{background:rgba(127,127,127,.06);border-radius:10px;padding:8px}.zsKpis span{display:block;font-size:12px;opacity:.75}.zsKpis b{font-size:18px}
.zsScroll{overflow-x:auto;max-width:100%}
.zsTab{border-collapse:collapse;font-size:13px;min-width:720px;width:100%}
.zsTab th,.zsTab td{border-bottom:1px solid rgba(127,127,127,.25);padding:6px 8px;text-align:left;vertical-align:top}
`;
