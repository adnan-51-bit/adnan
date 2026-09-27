"use client";

// Erste-Einnahme-Modus + Einnahmequellen-Dashboard (27.09.2026). Nur Anzeige - alle Werte kommen aus
// lib/erste-einnahme.js (echte Daten). "du" = nur Adnan kann es tun, "Zentrale" = vorbereitet/automatisch.
const eur = c => ((c || 0) / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const datum = t => t ? new Date(t).toLocaleDateString("de-DE") : "—";

export function ErsteEinnahmeKarte({ daten, titel = "Was fehlt bis zur ersten echten Einnahme?" }) {
  if (!daten) return null;
  const offen = daten.schritte.filter(s => !s.ok).length;
  return <section className="panel eeKarte">
    <h3>💶 {titel}</h3>
    {daten.erreicht ? <p><b>✅ Erste echte Einnahme erreicht</b> (Zahlung mit Nachweis erfasst).</p>
      : <p className="muted">{daten.eq ? daten.eq + " · " : ""}{daten.schritte.length - offen} von {daten.schritte.length} Schritten erledigt.{daten.naechster ? <> Als Nächstes: <b>{daten.naechster.nr}. {daten.naechster.text}</b></> : null}</p>}
    <ol className="eeListe">{daten.schritte.map(s => <li key={s.nr} className={s.ok ? "ok" : daten.naechster?.nr === s.nr ? "jetzt" : ""}>
      <span>{s.ok ? "✅" : daten.naechster?.nr === s.nr ? "👉" : "⬜"}</span><span>{s.text}</span><small>{s.ok ? "erledigt" : s.wer === "du" ? "du" : "Zentrale"}</small>
    </li>)}</ol>
    {daten.offeneEntscheidungen > 0 && <p><a href="/master?tab=freigaben">{daten.offeneEntscheidungen} Entscheidung(en) warten auf dich →</a></p>}
    <style dangerouslySetInnerHTML={{ __html: EE_CSS }} />
  </section>;
}

export function EqDashboardTabelle({ zeilen }) {
  if (!zeilen?.length) return null;
  return <section className="panel"><h3>Dashboard je Einnahmequelle</h3>
    <p className="muted">Echte Werte aus Leads, Aufgaben und Buchungen. Einnahmen zählen erst nach Zahlung mit Nachweis. „Automation Engine“: täglicher Lauf um 07:00 (Prüfung, Fehler, Optimierungsvorschlag) – es wird nie Geld ausgegeben.</p>
    <div className="eeScroll"><table className="eeTab">
      <thead><tr><th>Einnahmequelle</th><th>Status</th><th>Aufwand</th><th>Kosten geplant</th><th>Leads</th><th>Interessenten</th><th>Kunden</th><th>Einnahmen</th><th>Kosten</th><th>Gewinn</th><th>Letzte Aktivität</th><th>Nächste Aufgabe</th><th>Intervall</th><th>Prüfung</th><th>Fehler</th><th>Ergebnis</th><th>Optimierung</th></tr></thead>
      <tbody>{zeilen.map(z => <tr key={z.id}>
        <td><b>{z.name}</b></td><td>{z.status}</td><td>{z.aufwand}</td><td>{z.kosten_geplant}</td><td>{z.leads}</td><td>{z.interessenten}</td><td>{z.kunden}</td>
        <td>{eur(z.einnahmen_cent)}{z.offen_cent ? <small> (+{eur(z.offen_cent)} offen)</small> : null}</td><td>{eur(z.kosten_cent)}</td><td>{eur(z.gewinn_cent)}</td>
        <td>{datum(z.letzte_aktivitaet)}</td><td>{z.naechste_aufgabe}</td><td>{z.engine.intervall}</td><td>{z.engine.pruefung}</td><td>{z.engine.fehler}</td><td>{z.engine.ergebnis}</td><td>{z.engine.vorschlag}</td>
      </tr>)}</tbody>
    </table></div>
    <style dangerouslySetInnerHTML={{ __html: EE_CSS }} />
  </section>;
}

const EE_CSS = `
.eeListe{list-style:none;padding:0;margin:8px 0;display:grid;gap:4px}
.eeListe li{display:grid;grid-template-columns:24px 1fr auto;gap:8px;align-items:center;padding:6px 8px;border-radius:8px;background:rgba(127,127,127,.06)}
.eeListe li.ok{opacity:.65}.eeListe li.jetzt{outline:2px solid #f59e0b;background:rgba(245,158,11,.1)}
.eeListe small{font-size:12px;opacity:.75;white-space:nowrap}
.eeScroll{overflow-x:auto;max-width:100%;-webkit-overflow-scrolling:touch}
.eeTab{border-collapse:collapse;font-size:13px;min-width:1400px}
.eeTab th,.eeTab td{border-bottom:1px solid rgba(127,127,127,.25);padding:6px 8px;text-align:left;vertical-align:top}
.eeTab th{font-size:12px;white-space:nowrap}
`;
