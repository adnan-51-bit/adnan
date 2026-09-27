"use client";

// Zentrale Sichten (Teil 5, 27.09.2026): Aufgaben-Manager, E-Mail-Zentrale, Lead-Manager, Content-Zentrale, Finanz-Monitor.
// Nur Anzeige - Werte kommen aus lib/zentralen.js bzw. lib/master-finance.js (echte Daten).
import { useEffect, useState } from "react";
import { adminFetch } from "../../lib/admin-fetch.js";

const eur = c => ((c || 0) / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const datum = t => t ? new Date(t).toLocaleDateString("de-DE") : "—";

function Spalte({ titel, eintraege, leer, klasse = "", onZiel }) {
  return <div className={"zsSpalte " + klasse}><h4>{titel} <b>{eintraege?.length ?? "…"}</b></h4>
    {!eintraege ? <p className="zsLeer">…</p> : !eintraege.length ? <p className="zsLeer">{leer}</p> :
      <ul>{eintraege.slice(0, 8).map((e, i) => <li key={i}>{onZiel && e.ziel ? <button type="button" onClick={() => onZiel(e.ziel)}>{e.text}</button> : e.text}</li>)}{eintraege.length > 8 && <li className="zsLeer">+ {eintraege.length - 8} weitere</li>}</ul>}
  </div>;
}

export function AufgabenZentraleKarte({ goTo }) {
  const [z, setZ] = useState(undefined);
  useEffect(() => { adminFetch("/api/master/businesses?tagesbericht=1").then(r => r.ok ? r.json() : null).then(j => setZ(j?.bericht?.aufgabenZentrale || null)).catch(() => setZ(null)); }, []);
  if (z === null) return null;
  const ziel = t => t?.startsWith("/") ? window.location.assign(t) : goTo?.(t);
  return <section className="panel zs"><h3>Aufgaben-Zentrale</h3>
    {z?.naechsteAktion && <p className="zsNaechste">👉 <b>Nächste Aktion:</b> <button type="button" onClick={() => ziel(z.naechsteAktion.ziel)}>{z.naechsteAktion.text}</button></p>}
    <div className="zsGitter">
      <Spalte titel="Heute" eintraege={z?.heute} leer="Nichts fällig." onZiel={ziel} />
      <Spalte titel="Automatisch erledigt" eintraege={z?.automatischErledigt} leer="Heute noch nichts." onZiel={ziel} />
      <Spalte titel="Wartet auf mich" eintraege={z?.wartetAufMich} leer="Nichts." klasse="zsWarten" onZiel={ziel} />
      <Spalte titel="Fehler" eintraege={z?.fehler} leer="Keine." klasse="zsFehler" onZiel={ziel} />
      <Spalte titel="Erfolgreich (heute erledigt)" eintraege={z?.erfolgreich} leer="Heute noch nichts." onZiel={ziel} />
    </div>
    <p className="zsLeer">Erledigte Aufgaben werden automatisch mit Datum dokumentiert (Feld „Ergebnis“), wenn keine Notiz eingetragen ist.</p>
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

const ZS_CSS = `
.zs h4{margin:0 0 6px;font-size:13px;display:flex;justify-content:space-between;gap:8px}
.zsGitter{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;margin-top:8px}
.zsSpalte{background:rgba(127,127,127,.06);border-radius:10px;padding:10px;min-width:0}
.zsSpalte ul{margin:0;padding-left:16px;display:grid;gap:4px;font-size:13px}
.zsSpalte li{overflow-wrap:anywhere}
.zsSpalte button,.zsNaechste button{background:none;border:0;padding:0;color:inherit;text-align:left;cursor:pointer;text-decoration:underline;font:inherit}
.zsWarten{outline:1px solid rgba(245,158,11,.5)}.zsFehler{outline:1px solid rgba(239,68,68,.45)}
.zsLeer{font-size:12px;opacity:.7;margin:4px 0}
.zsKpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin:8px 0}
.zsKpis div{background:rgba(127,127,127,.06);border-radius:10px;padding:8px}.zsKpis span{display:block;font-size:12px;opacity:.75}.zsKpis b{font-size:18px}
.zsScroll{overflow-x:auto;max-width:100%}
.zsTab{border-collapse:collapse;font-size:13px;min-width:720px;width:100%}
.zsTab th,.zsTab td{border-bottom:1px solid rgba(127,127,127,.25);padding:6px 8px;text-align:left;vertical-align:top}
`;
