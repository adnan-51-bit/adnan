"use client";

// Eigenständige Betriebsseite AUTO-INCOME (01.10.2026). Zeigt AUSSCHLIESSLICH Daten mit
// business_id "auto-income" (GET /api/master/businesses?autoIncome=1, nur mit Anmeldung) - nie
// Werknetz24- oder E-Commerce-Daten. Die Daten sind ein von Claude gepflegter Snapshot des privaten
// AUTO-INCOME-Projektordners (s. lib/auto-income-data.js); eine Live-Verbindung gibt es nicht.

import { useEffect, useState } from "react";
import { adminFetch } from "../../lib/admin-fetch.js";
import { AnmeldeKnopf } from "../_teile/anmelde-knopf.jsx";

// Bewusst NICHT aus lib/auto-income-data.js importiert: sonst laege der ganze Datensatz im
// oeffentlichen Browser-Code, obwohl die API ihn nur mit Anmeldung ausgibt.
const MESSSTUFEN = [[0, "Noch nicht getestet"], [1, "Test läuft"], [2, "Erste Daten vorhanden"], [3, "Messbares Ergebnis"], [4, "Wiederholbares Ergebnis"], [5, "Tatsächliche Einnahme"]];

const eur = c => typeof c === "number" ? (c / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" }) : "KEINE DATEN";
const wert = v => v === null || v === undefined || v === "" ? "—" : v;
const stand = t => t ? new Date(t).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" }) : "KEINE DATEN";

export default function AutoIncomeSeite() {
  const [d, setD] = useState(undefined);
  const [fehler, setFehler] = useState("");
  useEffect(() => {
    adminFetch("/api/master/businesses?autoIncome=1")
      .then(async r => { const j = await r.json().catch(() => null); if (r.status === 401) return setD(null); if (!r.ok || !j?.ok) throw new Error(j?.error || "HTTP " + r.status); setD(j); })
      .catch(e => { setFehler(e.message); setD(null); });
  }, []);

  return <main className="ai">
    <header className="aiTop">
      <div><span className="aiEyebrow">MASTER-ZENTRALE · BETRIEB</span><h1>AUTO-INCOME</h1><p>Eigener Betrieb, getrennt von Werknetz24 und E-Commerce. business_id: <code>auto-income</code></p></div>
      <nav className="aiNav"><a href="/master?tab=businesses">← Betriebe</a><AnmeldeKnopf /></nav>
    </header>
    {d === undefined && <p className="aiHinweis">Daten werden geladen…</p>}
    {d === null && !fehler && <p className="aiHinweis">Anmeldung erforderlich – die AUTO-INCOME-Daten sind nur mit Admin-Secret sichtbar.</p>}
    {fehler && <p className="aiHinweis aiFehler">Daten konnten nicht geladen werden: {fehler}</p>}
    {d && <Inhalt d={d} />}
    <style dangerouslySetInnerHTML={{ __html: CSS }} />
  </main>;
}

function Inhalt({ d }) {
  const t = d.tests.find(x => x.id === d.aktuellerTest);
  const offen = d.blocker.filter(b => b.wer === "Adnan");
  return <>
    {/* Schnell-Ergebnis: Was passiert gerade? Hat es Geld gebracht? Was fehlt? Was muss ich tun? */}
    <section className="aiSchnell" aria-label="Schnell-Ergebnis">
      <div className="aiKachel aiGross"><span>Aktueller Test</span><b>{t ? t.id : "KEINE DATEN"}</b><small>{t ? `${t.status} · Messstufe ${t.messstufe}: ${MESSSTUFEN[t.messstufe]?.[1]}` : ""}</small></div>
      <div className="aiKachel"><span>Messbare Daten</span><b>{t?.angeschrieben ?? "—"} / {t?.antworten ?? "—"}</b><small>angeschrieben / Antworten · Quote {wert(t?.quote)}</small></div>
      <div className="aiKachel"><span>Einnahmen</span><b>{eur(d.geld.einnahmen_cent)}</b><small>{d.geld.umsatzStatus}</small></div>
      <div className="aiKachel"><span>Kosten</span><b>{eur(d.geld.kosten_cent)}</b><small>Budget-Regel: 0 € ohne Freigabe</small></div>
      <div className="aiKachel aiBreit"><span>Nächster Schritt</span><b className="aiText">{t?.naechsterSchritt || "KEINE DATEN"}</b></div>
    </section>

    <section className="aiBlock"><h2>Betriebsstatus</h2>
      <dl className="aiDl">
        <dt>Status</dt><dd>{d.betrieb.ampel} {d.betrieb.status} <span className="aiLeise">({d.betrieb.grund})</span></dd>
        <dt>Letzter Systemcheck</dt><dd>{d.betrieb.letzterSystemcheck}</dd>
        <dt>Letzter Arbeitszyklus</dt><dd>{d.betrieb.letzterArbeitszyklus}</dd>
        <dt>Datenstand</dt><dd>{stand(d.stand)} · Live-Verbindung: {d.liveVerbindung}</dd>
      </dl>
    </section>

    <section className="aiBlock"><h2>Geld</h2>
      <div className="aiGeld">{[["Einnahmen", d.geld.einnahmen_cent], ["Kosten", d.geld.kosten_cent], ["Provisionen", d.geld.provisionen_cent], ["Auszahlungen", d.geld.auszahlungen_cent], ["Gewinn/Verlust", d.geld.gewinn_cent], ["Offene Auszahlungen", d.geld.offene_auszahlungen_cent]]
        .map(([l, c]) => <div key={l}><span>{l}</span><b>{eur(c)}</b></div>)}</div>
      <p className="aiLeise">{d.geld.umsatzStatus}. Aus 0 € wird kein Erfolg abgeleitet.</p>
    </section>

    <section className="aiBlock"><h2>Test-Center</h2>
      <div className="aiScroll"><table className="aiTab"><thead><tr>
        {["Test", "Status", "Ziel", "Start", "Kosten", "Einnahmen", "Angeschrieben", "Antworten", "Interessenten", "Quote", "Messstufe", "Ergebnis", "Blocker", "Nächster Schritt"].map(h => <th key={h}>{h}</th>)}
      </tr></thead><tbody>{d.tests.map(x => <tr key={x.id} className={x.id === d.aktuellerTest ? "aiAktiv" : ""}>
        <td><b>{x.id}</b></td><td>{x.status}</td><td>{x.ziel}</td><td>{x.start ? new Date(x.start).toLocaleDateString("de-DE") : "nicht gestartet"}</td>
        <td>{eur(x.kosten_cent)}</td><td>{eur(x.einnahmen_cent)}</td><td>{wert(x.angeschrieben)}</td><td>{wert(x.antworten)}</td><td>{wert(x.interessenten)}</td><td>{wert(x.quote)}</td>
        <td>{x.messstufe}</td><td>{x.ergebnis}</td><td>{x.blocker}</td><td>{x.naechsterSchritt}</td>
      </tr>)}</tbody></table></div>
      <p className="aiLeise">Messstufen: {MESSSTUFEN.map(([n, l]) => `${n} ${l}`).join(" · ")}. Eine Stufe wird nur anhand dokumentierter Daten gesetzt.</p>
    </section>

    <section className="aiBlock"><h2>Blocker <small>({offen.length} warten auf Adnan)</small></h2>
      <div className="aiBlocker">{d.blocker.map(b => <article key={b.id}>
        <h3>{b.ampel} {b.titel}</h3>
        <p><b>Warum:</b> {b.warum}</p>
        <p><b>Wer handelt:</b> {b.wer}</p>
        <p><b>Was genau:</b> {b.schritt}</p>
        <p><b>Danach automatisch (Claude):</b> {b.danach}</p>
        {b.betrifft.length > 0 && <p className="aiLeise">betrifft: {b.betrifft.join(", ")}</p>}
      </article>)}</div>
    </section>

    <section className="aiBlock"><h2>Arbeitsverlauf</h2>
      <div className="aiScroll"><table className="aiTab"><thead><tr>{["Datum", "Arbeitsauftrag", "Ergebnis", "Kosten", "Einnahmen", "Blocker", "Nächster Schritt"].map(h => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{d.verlauf.map((v, i) => <tr key={i}><td>{v.datum}</td><td>{v.auftrag}</td><td>{v.ergebnis}</td><td>{eur(v.kosten_cent)}</td><td>{eur(v.einnahmen_cent)}</td><td>{v.blocker}</td><td>{v.naechster}</td></tr>)}</tbody></table></div>
    </section>

    <section className="aiBlock"><h2>Agenten</h2>
      <div className="aiScroll"><table className="aiTab"><thead><tr>{["Agent", "Status", "Letzter Lauf", "Aktuelle Aufgabe", "Letztes Ergebnis", "Fehler"].map(h => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{d.agenten.map(a => <tr key={a.name}><td><b>{a.name}</b></td><td>{a.status}</td><td>{wert(a.letzterLauf)}</td><td>{wert(a.aufgabe)}</td><td>{wert(a.letztesErgebnis)}</td><td>{wert(a.fehler)}</td></tr>)}</tbody></table></div>
    </section>

    <section className="aiBlock"><h2>Automatisierung</h2>
      <dl className="aiDl">
        <dt>Letzter Lauf</dt><dd>{d.automatisierung.letzterLauf}</dd>
        <dt>Nächster Schritt</dt><dd>{d.automatisierung.naechsterSchritt}</dd>
        <dt>Erfolgreich</dt><dd>{d.automatisierung.erfolgreich.length ? d.automatisierung.erfolgreich.join(" · ") : "keine"}</dd>
        <dt>Fehlgeschlagen</dt><dd>{d.automatisierung.fehlgeschlagen.length ? d.automatisierung.fehlgeschlagen.join(" · ") : "keine dokumentiert"}</dd>
        <dt>Offene menschliche Handlungen</dt><dd>{d.automatisierung.offeneMenschlicheHandlungen.join(" · ")}</dd>
      </dl>
    </section>

    <section className="aiBlock"><h2>Dokumente</h2>
      <ul className="aiDocs">{d.dokumente.map(x => <li key={x.name}><code>{x.name}</code><span>{x.status}</span></li>)}</ul>
      <p className="aiLeise">Die Dokumente liegen im {d.dokumente[0]?.ort}. Sie enthalten persönliche Angaben und werden deshalb nicht in dieses öffentliche Repository kopiert. Private Statusseite (nur für Adnan): <a href={d.privateStatusseite} target="_blank" rel="noreferrer">AUTO-INCOME Leitstand ↗</a></p>
    </section>

    <p className="aiLeise aiQuelle">Quelle: {d.quelle}. Stand {stand(d.stand)}.</p>
  </>;
}

const CSS = `
.ai{--bg:#f4f6f9;--fl:#fff;--li:#d6dce5;--tx:#17202b;--mu:#5b6676;--ac:#1d4f91;--acs:#e3ecf8;--ge:#a86a00;--ges:#fbf0d9;
  min-height:100vh;background:var(--bg);color:var(--tx);font:16px/1.5 system-ui,"Segoe UI",sans-serif;padding:24px 16px 48px;max-width:1200px;margin:0 auto;display:grid;gap:24px}
@media (prefers-color-scheme:dark){.ai{--bg:#0f141b;--fl:#171e28;--li:#2b3544;--tx:#e6ebf2;--mu:#9aa6b6;--ac:#7fb0ef;--acs:#1c2c44;--ge:#e5b04a;--ges:#3a2d12}}
.aiTop{display:flex;flex-wrap:wrap;gap:12px 24px;justify-content:space-between;align-items:flex-end;border-bottom:2px solid var(--tx);padding-bottom:16px}
.aiTop h1{margin:2px 0 4px;font-size:2.2rem;line-height:1.1}.aiTop p{margin:0;color:var(--mu)}
.aiEyebrow{font-size:.75rem;letter-spacing:.12em;color:var(--mu)}
.aiNav{display:flex;gap:12px;align-items:center}.aiNav a{color:var(--ac)}
.aiHinweis{background:var(--fl);border:1px solid var(--li);padding:14px 16px}.aiFehler{border-color:#b3261e;color:#b3261e}
.aiSchnell{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.aiKachel{background:var(--fl);border:1px solid var(--li);padding:14px 16px;display:grid;gap:2px;min-width:0}
.aiKachel span{font-size:.75rem;letter-spacing:.08em;text-transform:uppercase;color:var(--mu)}
.aiKachel b{font-size:1.6rem;font-variant-numeric:tabular-nums}.aiKachel small{color:var(--mu)}
.aiGross{border-top:4px solid var(--ge)}.aiBreit{grid-column:1/-1;border-left:4px solid var(--ac)}.aiKachel b.aiText{font-size:1.1rem}
@media (max-width:760px){.aiSchnell{grid-template-columns:repeat(2,minmax(0,1fr))}}
.aiBlock{background:var(--fl);border:1px solid var(--li);padding:16px;min-width:0}.aiBlock h2{margin:0 0 12px;font-size:1.3rem}.aiBlock h2 small{color:var(--mu);font-weight:400}
.aiDl{display:grid;grid-template-columns:220px 1fr;gap:6px 16px;margin:0}.aiDl dt{color:var(--mu)}.aiDl dd{margin:0;min-width:0}
@media (max-width:640px){.aiDl{grid-template-columns:1fr}}
.aiGeld{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}.aiGeld div{border:1px solid var(--li);padding:10px 12px;display:grid}
.aiGeld span{font-size:.8rem;color:var(--mu)}.aiGeld b{font-size:1.25rem;font-variant-numeric:tabular-nums}
.aiScroll{overflow-x:auto}.aiTab{border-collapse:collapse;width:100%;font-size:.88rem}
.aiTab th,.aiTab td{border-bottom:1px solid var(--li);padding:7px 8px;text-align:left;vertical-align:top}
.aiTab th{font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;color:var(--mu);white-space:nowrap}
.aiAktiv td{background:var(--ges)}
.aiBlocker{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}
.aiBlocker article{border:1px solid var(--li);padding:12px 14px}.aiBlocker h3{margin:0 0 6px;font-size:1.05rem}.aiBlocker p{margin:4px 0}
.aiDocs{list-style:none;margin:0 0 8px;padding:0;display:grid;gap:4px}.aiDocs li{display:flex;flex-wrap:wrap;gap:8px 16px;justify-content:space-between;border-bottom:1px solid var(--li);padding:4px 0}
.aiDocs span{font-size:.8rem;color:var(--ge);font-weight:600}
.aiLeise{color:var(--mu);font-size:.9rem;margin:8px 0 0}.aiLeise a{color:var(--ac)}.aiQuelle{margin:0}
code{font-family:Consolas,monospace;font-size:.9em}
`;
