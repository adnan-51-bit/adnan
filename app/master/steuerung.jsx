"use client";

// Steuerung der Master-Zentrale (27.09.2026): Startseite (Statusleiste, Geschaeftsbereiche, Jetzt zu tun),
// Seite "Heute & Bericht" und Seite "Automatisierungen" (Aktionen 🟢/🟡/🔴 + Log). Jede Seite zeigt nur,
// was zusammengehoert. Zahlen kommen aus lib/gesamtstatus.js bzw. dem Tagesbericht (nur echte Daten).
import { useEffect, useState } from "react";
import { adminFetch } from "../../lib/admin-fetch.js";
import { berechneGesamtstatus, bereichsStatus } from "../../lib/gesamtstatus.js";
import { KATEGORIE_LABEL } from "../../lib/aktionen.js";
import { ErsteEinnahmeKarte, EqDashboardTabelle } from "./erste-einnahme.jsx";
import { UmsatzPipeline } from "./zentralen.jsx";

const eur = c => (c / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const zeit = t => t ? new Date(t).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" }) : "—";
const jsonOderNull = r => r.ok ? r.json() : null;

function useDaten(url) {
  const [d, setD] = useState(undefined);
  const laden = () => adminFetch(url).then(jsonOderNull).then(setD).catch(() => setD(null));
  useEffect(() => { laden(); }, [url]);
  return [d, laden];
}

function Liste({ titel, eintraege, leer, goTo, max = 5, klasse = "" }) {
  const oeffne = z => z?.startsWith("/") ? window.location.assign(z) : goTo?.(z);
  return <section className={"stListe " + klasse}><h3>{titel} <small>({eintraege?.length ?? "…"})</small></h3>
    {eintraege === undefined ? <p className="stLeer">wird geladen…</p> : !eintraege?.length ? <p className="stLeer">{leer}</p> :
      eintraege.slice(0, max).map((e, i) => <button type="button" key={i} onClick={() => oeffne(e.ziel)}>{e.text}</button>)}
    {eintraege?.length > max && <p className="stLeer">+ {eintraege.length - max} weitere</p>}
  </section>;
}

// ---------- Startseite ----------
export function Startseite({ businesses, tasks, tasksLocked, systems, finance, qualityGate, goTo }) {
  const [eq] = useDaten("/api/master/businesses?einnahmequellen=1");
  const [kunden] = useDaten("/api/orders?type=customers");
  const [steuerung] = useDaten("/api/master/businesses?aktionen=1");
  const [agenten] = useDaten("/api/master/businesses?werknetz24Agenten=1");
  const [bericht] = useDaten("/api/master/businesses?tagesbericht=1");
  const [eqLeads] = useDaten("/api/master/businesses?leads=1");
  const g = berechneGesamtstatus({ businesses, tasks, tasksLocked, systems, finance, qualityGate, einnahmequellen: eq?.einnahmequellen ?? null, ecKunden: kunden?.customers ?? null });
  const bereiche = bereichsStatus({ businesses, einnahmequellen: eq?.einnahmequellen ?? null });
  const serverAktionen = steuerung?.aktionen?.filter(a => a.ausfuehrung === "server").length;
  const letzterLauf = steuerung?.laeufe?.[0];
  const w24Agenten = agenten?.agenten?.ok ? agenten.agenten.agenten.length : null;
  const b = bericht?.bericht;
  const dash = eq?.dashboard || [];
  const tests = dash.filter(z => ["TEST", "RECHERCHE"].includes(z.phase));
  const offeneTasks = tasks.filter(t => !["Erledigt", "Gestoppt"].includes(t.status));
  const az = b?.aufgabenZentrale;
  const eqL = eqLeads?.leads;
  // Teil 5: auf der Startseite nur das Wichtigste (12 Kennzahlen). Alles andere steht unter "Weitere Kennzahlen".
  const chips = [
    ["Aktive Einnahmequellen", eq?.uebersicht ? eq.uebersicht.aktiv : "—", "einnahmequellen", ["Einnahmequellen mit echten Einnahmen (Phase AKTIV/ERFOLGREICH)"]],
    ["Tests", eq ? tests.length : "—", "einnahmequellen", tests.length ? tests.map(z => `${z.name}: ${z.phase}`) : ["Keine Einnahmequelle in Recherche/Test"]],
    ["Leads", eqL ? eqL.length : "—", "leads", ["Alle Leads der Einnahmequellen (Werknetz24 ist pausiert und separat)"]],
    ["Interessenten", eqLeads?.uebersicht ? eqLeads.uebersicht.interessenten : "—", "leads", ["Leads mit Status „Interessent“"]],
    ["Kunden", eqLeads?.uebersicht ? eqLeads.uebersicht.kunden : "—", "leads", ["Kunden der Einnahmequellen"]],
    ["Einnahmen", eur(g.einnahmen.cent), "finance", g.einnahmen.rechenweg, g.einnahmen.vollstaendig],
    ["Kosten", eur(g.kosten.cent), "finance", g.kosten.rechenweg, g.kosten.vollstaendig],
    ["Gewinn", eur(g.gewinn.cent), "finance", g.gewinn.rechenweg, g.gewinn.vollstaendig],
    ["Offene Aufgaben", tasksLocked ? "—" : offeneTasks.length, "tasks", ["Offene Aufgaben der Master-Zentrale (ohne pausierte Bereiche)"]],
    ["Wartet auf mich", az ? az.wartetAufMich.length : "—", "freigaben", ["Offene Entscheidungen + Aufgaben, die nur du erledigen kannst"]],
    ["Fehler", b ? b.fehler.length : "—", "alerts", b?.fehler?.length ? b.fehler.map(f => f.text) : ["Keine Fehler (pausierte Bereiche ausgenommen)"]],
    ["Automatisierungen", serverAktionen ?? "—", "automation", [`${serverAktionen ?? "?"} automatische Aktionen`, `letzter Lauf: ${letzterLauf ? zeit(letzterLauf.created_at) + " " + letzterLauf.details?.name : "noch keiner"}`]],
  ];
  const weitere = [
    ["System", g.system.ampel, "alerts", g.system.rechenweg],
    ["Geschäftsbereiche", [["🟢", "aktiv"], ["🟡", "Test"], ["🔴", "Fehler"], ["⚪", "Pause"]].map(([amp, t]) => [bereiche.filter(x => x.ampel === amp).length, t]).filter(([n]) => n).map(([n, t]) => n + " " + t).join(" · "), "bereiche", bereiche.map(x => `${x.name}: ${x.label}`)],
    ["Werknetz24/E-Commerce-Kunden", g.kunden.wert, "/werknetz24", g.kunden.rechenweg, g.kunden.vollstaendig],
    ["Werknetz24-Leads", g.leads.wert ?? "—", "/werknetz24", g.leads.rechenweg, g.leads.vollstaendig],
    ["Agenten", w24Agenten === null ? "—" : w24Agenten + 2, "agents", [`Werknetz24: ${w24Agenten ?? "nicht verfügbar"}`, "Master: 2 (Systemmonitor, E-Commerce-Engine)"], w24Agenten !== null],
  ];
  const oeffne = z => z.startsWith("/") ? window.location.assign(z) : goTo?.(z);
  return <>
    <div className="pageTitle"><div><span>MASTER-ZENTRALE</span><h2>Überblick</h2></div><div className="quick"><button className="primaryLink" onClick={() => goTo?.("heute")}>Heute & Bericht →</button></div></div>
    <UmsatzPipeline u={eqLeads?.umsatz} goTo={goTo} />
    <div className="stLeiste" aria-label="Statusleiste">{chips.map(([l, v, z, rw, voll]) =>
      <button type="button" key={l} className="stChip" onClick={() => oeffne(z)} title={rw.join("\n")}><span>{l}</span><b>{v}</b>{voll === false && <em>unvollständig</em>}</button>)}
    </div>
    <details className="stRechenweg"><summary>Rechenwege & weitere Kennzahlen</summary>{chips.map(([l, , , rw]) => <p key={l}><b>{l}:</b> {rw.join(" · ")}</p>)}
      <div className="stLeiste">{weitere.map(([l, v, z, rw, voll]) => <button type="button" key={l} className="stChip" onClick={() => oeffne(z)} title={rw.join("\n")}><span>{l}</span><b>{v}</b>{voll === false && <em>unvollständig</em>}</button>)}</div>
      {weitere.map(([l, , , rw]) => <p key={l}><b>{l}:</b> {rw.join(" · ")}</p>)}</details>
    {b?.ersteEinnahme && <ErsteEinnahmeKarte daten={b.ersteEinnahme} />}
    <h3 className="stH">Geschäftsbereiche</h3>
    <div className="stBereiche">{bereiche.map(x => <article key={x.id} className="stBereich">
      <a href={x.link} onClick={e => { if (x.tab) { e.preventDefault(); goTo?.(x.tab); } }}><span className="stAmpel">{x.ampel}</span><div><strong>{x.name}</strong><small>{x.label} · {x.grund}</small></div><i>→</i></a>
      {x.id === "werknetz24" && <nav><a href="https://werknetz24.de/admin-zentrale#kunden" target="_blank" rel="noreferrer">Kunden ↗</a><a href="https://werknetz24.de/admin-zentrale#leads" target="_blank" rel="noreferrer">Leads ↗</a><a href="/werknetz24?tab=rechnungen">Rechnungen</a><a href="https://werknetz24.de" target="_blank" rel="noreferrer">Internetseite ↗</a></nav>}
      {x.id === "ecommerce" && <nav><a href="/e-commerce?tab=kunden">Kunden</a><a href="/e-commerce?tab=bestellungen">Bestellungen</a><a href="/e-commerce?tab=produkte">Produkte</a><a href="/laden" target="_blank" rel="noreferrer">Shop ↗</a></nav>}
    </article>)}</div>
    <div className="stSpalten">
      <Liste titel="Jetzt zu tun" eintraege={b?.jetztZuTun ?? (b === null ? [] : undefined)} leer="Keine offenen Aufgaben." goTo={goTo} />
      <Liste titel="Benutzeraktion erforderlich" klasse="stWichtig" eintraege={b?.benutzeraktionen ?? (b === null ? [] : undefined)} leer="Nichts – alles, was nur du tun kannst, ist erledigt." goTo={goTo} />
      <Liste titel="Nächste Schritte" eintraege={b?.naechsteSchritte ?? (b === null ? [] : undefined)} leer="Nichts offen." goTo={goTo} />
    </div>
    {b === null && <p className="stLeer">Listen nur mit Anmeldung sichtbar.</p>}
    <style dangerouslySetInnerHTML={{ __html: ST_CSS }} />
  </>;
}

// ---------- Heute & Bericht ----------
export function HeuteSeite({ goTo }) {
  const [d, laden] = useDaten("/api/master/businesses?tagesbericht=1");
  const [busy, setBusy] = useState(false);
  const [erstellt, setErstellt] = useState(null);
  const b = d?.bericht;
  // "Tagesbericht erstellen": echte Aktion (steht im Automatisierungs-Log), danach frisch aus den gespeicherten Daten laden.
  async function erstellen() { setBusy(true); await adminFetch("/api/master/businesses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "aktion-ausfuehren", id: "tagesbericht" }) }); await laden(); setErstellt(new Date()); setBusy(false); }
  const L = (titel, eintraege, leer, extra = {}) => <Liste titel={titel} eintraege={b ? eintraege : (d === null ? [] : undefined)} leer={leer} goTo={goTo} max={6} {...extra} />;
  return <>
    <div className="pageTitle"><div><span>TAGESZENTRALE {b?.datum ? "· " + new Date(b.datum).toLocaleDateString("de-DE") : ""}</span><h2>Heute</h2></div><div className="quick"><button className="primaryLink" disabled={busy || d === null} onClick={erstellen}>{busy ? "wird erstellt…" : "Tagesbericht erstellen"}</button></div></div>
    {d === null && <div className="panel">Nur mit Anmeldung sichtbar.</div>}
    <section className="stWichtigste" aria-label="Wichtigste Aufgabe">{b?.wichtigsteNaechsteAktion && <><span>Wichtigste nächste Aktion</span><button type="button" className="stBenutzer" onClick={() => goTo?.(b.wichtigsteNaechsteAktion.ziel)}>👉 {b.wichtigsteNaechsteAktion.text}</button></>}<span>Wichtigste Aufgabe</span>
      {b?.wichtigsteAufgabe ? <button type="button" onClick={() => goTo?.("tasks")}>{b.wichtigsteAufgabe.text}</button> : <p className="stLeer">{d === undefined ? "wird geladen…" : "Keine offene Aufgabe."}</p>}
      <span>Nächste Benutzeraktion</span>
      {b?.naechsteBenutzeraktion ? <button type="button" className="stBenutzer" onClick={() => { const z = b.naechsteBenutzeraktion.ziel; z?.startsWith("/") ? window.location.assign(z) : goTo?.(z); }}>👤 {b.naechsteBenutzeraktion.text}</button> : <p className="stLeer">{d === undefined ? "…" : "Keine – nichts wartet auf dich."}</p>}
    </section>
    {b?.ersteEinnahme && <ErsteEinnahmeKarte daten={b.ersteEinnahme} />}
    <div className="stSpalten">
      {L("Offene Aufgaben", b?.jetztZuTun, "Keine offenen Aufgaben.")}
      {L("Wartende Aufgaben (auf dich)", b?.wartendeAufgaben, "Keine Aufgabe wartet auf dich.", { klasse: "stWichtig" })}
      {L("Aktive Einnahmequellen", b?.aktiveEinnahmequellen, `Noch keine aktive Einnahmequelle (echte Kunden + Einnahmen nötig).${b?.laufendeEinnahmequellen?.length ? " In Arbeit: " + b.laufendeEinnahmequellen.map(x => x.text).join(", ") : ""}`)}
      {L("Erkannte Probleme", b?.fehler, "Keine Probleme erkannt.", { klasse: "stFehler" })}
      {L("Heute erledigt", b?.heuteErledigt, "Heute noch nichts erledigt.")}
      {L("Letzte Aktivitäten", b?.letzteAktivitaeten, "Noch keine Aktivitäten.")}
    </div>
    <section className="panel"><h3>Tagesbericht {erstellt ? <small className="stLeer">erstellt {erstellt.toLocaleTimeString("de-DE")}</small> : null}</h3>{!b ? <p className="stLeer">{d === undefined ? "wird geladen…" : "—"}</p> :
      <dl className="stBericht">{b.bericht.map(([f, a]) => <div key={f}><dt>{f}</dt><dd>{a}</dd></div>)}</dl>}
      <p className="stLeer">Aus den tatsächlich gespeicherten Daten erzeugt. Tageswerte, die eine Quelle nicht liefert, stehen als „nicht verfügbar“ da – nichts wird geschätzt.</p></section>
    <style dangerouslySetInnerHTML={{ __html: ST_CSS }} />
  </>;
}

// ---------- Automatisierungen ----------
export function AutomatisierungenSeite() {
  const [d, laden] = useDaten("/api/master/businesses?aktionen=1");
  const [busy, setBusy] = useState("");
  const [meldung, setMeldung] = useState("");
  const [freigabe, setFreigabe] = useState(null);
  async function ausfuehren(a, fg) {
    setBusy(a.id); setMeldung("");
    const r = await adminFetch("/api/master/businesses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "aktion-ausfuehren", id: a.id, ...(fg ? { freigabe: fg } : {}) }) });
    const j = await r.json().catch(() => ({}));
    setMeldung((r.ok ? "✅ " + a.name + ": " + (j.zusammenfassung || "ok") : "❌ " + a.name + ": " + (j.fehler || j.error || "HTTP " + r.status)));
    setBusy(""); setFreigabe(null); laden();
  }
  const gruppen = ["AUTOMATISCH", "FREIGABE", "NICHT_MOEGLICH"];
  return <>
    <div className="pageTitle"><div><span>STEUERUNG</span><h2>Automatisierungen</h2></div></div>
    <p className="note">🟢 läuft sicher ohne dich · 🟡 nur nach deiner Freigabe (kostet Geld oder veröffentlicht etwas) · 🔴 nicht möglich (keine Schnittstelle oder bewusst verboten). Jeder Lauf steht unten im Log – auch abgelehnte.</p>
    {d === null && <div className="panel">Nur mit Anmeldung sichtbar.</div>}
    {meldung && <div className="panel">{meldung}</div>}
    {gruppen.map(k => <section className="panel" key={k}><h3>{KATEGORIE_LABEL[k]}</h3>
      {(d?.aktionen || []).filter(a => a.kategorie === k).map(a => <div className="stAktion" key={a.id}>
        <div><strong>{a.name}</strong><small>{a.zweck || a.grund} · Bereich: {a.bereich}{a.agent ? " · " + a.agent : ""}</small>
          {a.ausfuehrung === "claude" && <small className="stHinweis">Wird von Claude in der Arbeitssitzung erledigt – kein Knopf.</small>}
          {a.gesperrt && <small className="stHinweis">⛔ {a.gesperrt}</small>}</div>
        <div className="stKnoepfe">
          {k === "AUTOMATISCH" && a.ausfuehrung === "server" && <button disabled={Boolean(busy)} onClick={() => ausfuehren(a)}>{busy === a.id ? "läuft…" : "Jetzt ausführen"}</button>}
          {k === "FREIGABE" && <button onClick={() => setFreigabe(a)}>Kosten & Freigabe…</button>}
          {a.ziel && <a href={a.ziel} target={a.ziel.startsWith("http") ? "_blank" : undefined} rel="noreferrer">Zur richtigen Stelle →</a>}
        </div>
      </div>)}
    </section>)}
    <section className="panel"><h3>Automatisierungs-Log</h3>
      {!d?.laeufe?.length ? <p className="stLeer">Noch keine Läufe protokolliert.</p> :
        <div className="stTabelle"><table><thead><tr><th>Zeit</th><th>Agent</th><th>Bereich</th><th>Aktion</th><th>Ergebnis</th><th>Fehler</th><th>Kosten</th><th>Quelle</th></tr></thead>
          <tbody>{d.laeufe.map(l => <tr key={l.id}><td>{zeit(l.created_at)}</td><td>{l.details?.agent}</td><td>{l.details?.bereich}</td><td>{l.details?.name}</td><td>{l.details?.ergebnis === "ok" ? "✅ " + (l.details?.zusammenfassung || "") : l.details?.ergebnis === "abgelehnt" ? "⛔ abgelehnt" : "❌"}</td><td>{l.details?.fehler || "—"}</td><td>{eur(l.details?.kosten_cent || 0)}</td><td>{l.details?.quelle || "—"}</td></tr>)}</tbody></table></div>}
    </section>
    {freigabe && <div className="modalBack"><div className="modal"><div className="modalHead"><h3>Freigabe: {freigabe.name}</h3><button onClick={() => setFreigabe(null)}>×</button></div>
      <dl className="stBericht">{[["Was?", freigabe.kosten?.was], ["Warum?", freigabe.kosten?.warum], ["Kosten?", freigabe.kosten?.betrag], ["Einmalig oder wiederkehrend?", freigabe.kosten?.rhythmus], ["Welcher Geschäftsbereich?", freigabe.bereich], ["Welche erwartete Leistung?", freigabe.kosten?.leistung]].map(([f, a]) => <div key={f}><dt>{f}</dt><dd>{a || "—"}</dd></div>)}</dl>
      <p className="note">Die Zentrale führt Geld-Aktionen nie selbst aus. Deine Freigabe wird protokolliert; ausführen musst du beim Anbieter selbst.</p>
      <div className="modalActions"><button onClick={() => setFreigabe(null)}>Abbrechen</button><button className="primary" onClick={() => ausfuehren(freigabe, { aktion: freigabe.id, bestaetigt: true })}>Ich bestätige – protokollieren</button></div>
    </div></div>}
    <style dangerouslySetInnerHTML={{ __html: ST_CSS }} />
  </>;
}

const ST_CSS = `.stLeiste{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:8px}
.stChip{background:#fff;border:1px solid #eaecf0;border-radius:10px;padding:8px 10px;text-align:left;cursor:pointer;font:inherit;color:inherit;display:flex;flex-direction:column;gap:2px;min-width:0}
.stChip:hover{border-color:#98a2b3}.stChip span{font-size:11px;color:#667085;font-weight:700;text-transform:uppercase;letter-spacing:.03em}.stChip b{font-size:16px;overflow-wrap:anywhere}.stChip em{font-style:normal;font-size:10px;color:#b54708}
.stRechenweg{margin:8px 0 4px;font-size:12px;color:#475467}.stRechenweg summary{cursor:pointer;color:#344054}.stRechenweg p{margin:4px 0}
.stH{margin:18px 0 8px;font-size:15px}.stBereiche{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px}
.stBereich{background:#fff;border:1px solid #eaecf0;border-radius:12px;overflow:hidden}.stBereich>a{display:flex;gap:10px;align-items:center;padding:12px;color:inherit;text-decoration:none}.stBereich>a:hover{background:#f9fafb}
.stBereich small{display:block;color:#667085;font-size:12px}.stBereich i{margin-left:auto;font-style:normal;color:#98a2b3}.stAmpel{font-size:20px}
.stBereich nav{display:flex;flex-wrap:wrap;gap:6px;padding:0 12px 12px}.stBereich nav a{font-size:12px;padding:4px 8px;border:1px solid #eaecf0;border-radius:999px;color:#344054;text-decoration:none}
.stSpalten{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;margin-top:14px}
.stListe{background:#fff;border:1px solid #eaecf0;border-radius:12px;padding:12px;min-width:0}.stListe h3{margin:0 0 6px;font-size:14px}.stListe h3 small{color:#98a2b3;font-weight:400}
.stListe button{display:block;width:100%;text-align:left;border:0;border-top:1px solid #f2f4f7;background:none;padding:7px 2px;font:inherit;font-size:13px;cursor:pointer;overflow-wrap:anywhere}.stListe button:hover{background:#f9fafb}
.stWichtig{border-color:#fedf89;background:#fffcf5}.stFehler button{color:#b42318}.stLeer{color:#98a2b3;font-size:13px;margin:4px 0}
.stBericht{margin:0}.stBericht div{display:grid;grid-template-columns:minmax(140px,260px) 1fr;gap:10px;padding:7px 0;border-top:1px solid #f2f4f7}.stBericht dt{font-weight:700;font-size:13px}.stBericht dd{margin:0;font-size:13px;overflow-wrap:anywhere}
.stAktion{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:10px 0;border-top:1px solid #f2f4f7}.stAktion small{display:block;color:#667085;font-size:12px}.stHinweis{color:#b54708!important}
.stKnoepfe{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.stKnoepfe button{padding:7px 12px;border-radius:8px;border:1px solid #d0d5dd;background:#fff;cursor:pointer;font:inherit;font-size:13px}.stKnoepfe a{font-size:13px}
.stTabelle{overflow-x:auto}.stTabelle table{border-collapse:collapse;width:100%;font-size:12px}.stTabelle th,.stTabelle td{padding:6px;border-top:1px solid #f2f4f7;text-align:left;vertical-align:top}
.stWichtigste{background:#fff;border:1px solid #eaecf0;border-radius:12px;padding:12px;display:grid;gap:4px;margin-bottom:4px}.stWichtigste>span{font-size:11px;font-weight:800;color:#667085;text-transform:uppercase;letter-spacing:.05em;margin-top:4px}.stWichtigste button{text-align:left;border:0;background:#f9fafb;border-radius:8px;padding:9px 10px;font:inherit;font-weight:700;cursor:pointer;overflow-wrap:anywhere}.stWichtigste .stBenutzer{background:#fffcf5;border:1px solid #fedf89}
@media(max-width:560px){.stBericht div{grid-template-columns:1fr;gap:2px}}`;
