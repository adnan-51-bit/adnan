"use client";

// Pilot "Pflege Google-Unternehmensprofil" (27.09.2026, Teil 5). Alles an einem Ort: Quality Gate, "Wartet auf mich",
// Betriebe (Leads), Profil-Analyse, Bericht, Angebot, monatliche Leistung, Einnahmen, Aufgaben, Dokumentation.
// 0 € bis zur ersten Einnahme: keine API, keine Werbung - die Analyse erfolgt von Hand am oeffentlichen Profil.
import { useEffect, useState } from "react";
import { adminFetch, anmeldeUrl } from "../../lib/admin-fetch.js";
import { ANTWORTEN, GESPRAECHSLEITFADEN, ENTSCHEIDUNGEN } from "../../lib/google-profil.js";
import { LEAD_LABEL } from "../../lib/leads-regeln.js";
import { ErsteEinnahmeKarte, EqDashboardTabelle } from "./erste-einnahme.jsx";
import { UmsatzPipeline } from "./zentralen.jsx";

const eur = c => ((c || 0) / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const heute = () => new Date().toISOString().slice(0, 10);
const tag = t => t ? new Date(t).toLocaleDateString("de-DE") : "—";
const euroZuCent = v => { const s = String(v || "").trim(); if (!s) return null; const n = Math.round(Number(s.replace(/\./g, "").replace(",", ".")) * 100); return Number.isFinite(n) && n > 0 ? n : NaN; };

export function PilotGoogleProfil() {
  const [d, setD] = useState(null);
  const [meldung, setMeldung] = useState("");
  const [dialog, setDialog] = useState(null);
  const [preis, setPreis] = useState("");
  const laden = () => adminFetch("/api/master/businesses?pilot=1").then(async r => setD(r.status === 401 ? { gesperrt: true } : r.ok ? await r.json() : { fehler: (await r.json().catch(() => ({}))).error || r.status })).catch(e => setD({ fehler: e.message }));
  useEffect(() => { laden(); }, []);
  async function senden(body, erfolg) {
    setMeldung("");
    const r = await adminFetch("/api/master/businesses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setMeldung("❌ " + (j.error || "Fehler " + r.status)); return null; }
    await laden(); setMeldung("✅ " + erfolg); return j;
  }
  if (d?.gesperrt) return <div className="panel">Nur mit Anmeldung sichtbar. <a href={anmeldeUrl()}>⎆ Anmelden</a></div>;
  if (d?.fehler) return <div className="panel">❌ {String(d.fehler)}</div>;
  const gate = d?.gate || [];
  const tech = gate.filter(g => g.typ === "technisch"), benutzer = gate.filter(g => g.typ === "benutzer");
  const eqId = d?.eq?.id;
  return <div className="pl">
    <div className="pageTitle"><div><span>PILOT · 0 € BIS ZUR ERSTEN EINNAHME</span><h2>Pilot: Google-Unternehmensprofil</h2></div><div className="quick"><button className="primaryLink" disabled={!d} onClick={() => setDialog({ art: "betrieb" })}>+ Potenziellen Kunden erfassen</button></div></div>
    {meldung && <div className="panel plMeldung">{meldung}</div>}
    {d?.naechsteAktion && <section className="plNaechste"><span>Deine nächste Aktion</span><b>{d.naechsteAktion.text}</b>
      {(() => { const l = d.leads.find(x => x.id === d.naechsteAktion.lead_id); return l && !l.profil_analyse ? <button className="primaryLink" onClick={() => setDialog({ art: "analyse", l })}>Analyse jetzt ausfüllen</button> : null; })()}</section>}
    <UmsatzPipeline laden />
    {d?.ersteEinnahme && <ErsteEinnahmeKarte daten={d.ersteEinnahme} />}
    <section className="panel"><h3>Quality Gate {d ? `– technisch ${tech.filter(g => g.ok).length}/${tech.length} ✓ · wartet auf dich: ${benutzer.filter(g => !g.ok).length}` : "…"}</h3>
      <div className="plGate">{gate.map(g => <div key={g.id} className={"plG " + (g.ok ? "ok" : g.typ === "benutzer" ? "du" : "fehlt")}><b>{g.ok ? "✓" : g.typ === "benutzer" ? "👤" : "✗"}</b><span>{g.titel}<small>{g.info}</small></span></div>)}</div></section>

    <section className="panel plDu"><h3>Wartet auf mich ({d?.wartetAufMich?.length ?? "…"})</h3>
      {(d?.wartetAufMich || []).map(f => <p key={f.id}>👤 <b>{f.titel}</b><small> – {f.beschreibung}</small></p>)}
      {d && !d.eq?.pilot?.monatspreis_cent && <div className="plPreis"><label>Monatspreis für den Pilot (€)<input inputMode="decimal" value={preis} onChange={e => setPreis(e.target.value)} placeholder="z. B. 49" /></label><button className="editMini" disabled={!euroZuCent(preis)} onClick={() => senden({ action: "pilot-preis", monatspreis_cent: euroZuCent(preis) }, "Monatspreis festgelegt")}>Festlegen</button></div>}
      {d?.eq?.pilot?.monatspreis_cent > 0 && <p>✓ Monatspreis: <b>{eur(d.eq.pilot.monatspreis_cent)}</b></p>}
      <a href="/master?tab=freigaben">Alle Entscheidungen („Wartet auf mich“) →</a></section>

    <section className="panel"><h3>So kommst du zum ersten Kunden</h3><ol className="plSchritte">
      <li>Betrieb erfassen (öffentliches Google-Profil, z. B. aus Google Maps) → <b>Profil-Analyse</b> ausfüllen.</li>
      <li>Den automatisch erzeugten <b>Profil-Check-Bericht</b> dem Betrieb <b>persönlich</b> zeigen (keine Werbe-Mail ohne Einwilligung).</li>
      <li>Wer Interesse hat: Status unter „E-Mail & Leads“ setzen, Angebot aus der Vorlage erstellen.</li>
      <li>Angebot angenommen → <b>Monatliche Leistung starten</b>: Monatsaufgaben + offene Monatsrechnung entstehen automatisch.</li>
      <li>Erst nach Gewerbe-Klärung abrechnen; wenn das Geld da ist: „Geld ist da“ → erste echte Einnahme.</li></ol></section>

    <section className="panel"><h3>Gesprächsleitfaden (persönlicher Besuch)</h3>
      <ol className="plLeitfaden">{GESPRAECHSLEITFADEN.map(g => <li key={g.schritt}><b>{g.schritt}</b><span>{g.text}</span></li>)}</ol>
      <p className="muted">Die Gesprächsunterlage zum Ausdrucken findest du bei jedem analysierten Betrieb („🖨 Gesprächsunterlage“). Ohne Kontakt-Freigabe nicht besuchen.</p></section>

    <section className="panel"><h3>Entscheidungsvorlage – was fehlt, warum, Kosten, kostenlose Alternative</h3>
      <div className="plEnt">{ENTSCHEIDUNGEN.map(e => <article key={e.id}><h4>👤 {e.titel}</h4><dl>
        <dt>Was fehlt?</dt><dd>{e.was_fehlt}</dd><dt>Warum?</dt><dd>{e.warum}</dd><dt>Kosten</dt><dd>{e.kosten}</dd><dt>Kostenlose Alternative</dt><dd>{e.alternative}</dd>
        <dt>Quellen</dt><dd>{e.quellen.map((q, i) => <a key={q} href={q} target="_blank" rel="noreferrer">{"[" + (i + 1) + "]"} </a>)}</dd></dl></article>)}</div>
      <p className="muted">Entschieden wird unter „Wartet auf mich“. Die Zentrale trifft keine dieser Entscheidungen selbst.</p></section>

    <section className="panel"><h3>Potenzielle Kunden ({d?.leads?.length ?? "…"})</h3>
      <p className="muted">Nur öffentlich belegte Angaben mit Quelle. Keine Werbe-Mails – Kontakt persönlich. Nichts ist verbindlich, bevor du es entscheidest.</p>
      {(() => { const briefe = (d?.leads || []).filter(l => l.stufe === "KONTAKT_FREIGEGEBEN" && !(l.pilot_crm?.antworten || []).length); return briefe.length > 0 && <p className="plZeile"><a className="editMini plJa" href={"/master/profil-check?brief=1&ids=" + briefe.map(l => encodeURIComponent(l.id)).join(",")} target="_blank" rel="noreferrer">✉ Briefe mit Antwort-Link drucken ({briefe.length})</a> <span className="muted">Nur freigegebene Betriebe. Ausdrucken, unterschreiben, selbst einwerfen – die Antwort (Interesse oder „bitte nicht mehr kontaktieren“) kommt automatisch hierher.</span></p>; })()}
      {d && !d.leads.length && <p className="muted">Noch kein Betrieb erfasst.</p>}
      {(d?.leads || []).map(l => { const q = String(l.quelle || "").match(/https?:\/\/\S+/)?.[0]; const i = (d.stufen || []).findIndex(([k]) => k === l.stufe); return <article key={l.id} className={"plBetrieb" + (d.naechsteAktion?.lead_id === l.id ? " plDran" : "")}>
        <div className="plKopf"><div><strong>{l.firma || l.name}</strong><small>{[l.branche, l.ort].filter(Boolean).join(" · ") || "—"} · {LEAD_LABEL[l.status]} · erfasst {tag(l.erstellt_am)}</small>
          <small>Quelle: {q ? <a href={q} target="_blank" rel="noreferrer">{String(l.quelle).replace(q, "").trim() || "Link"} ↗</a> : (l.quelle || "—")} · <a href={"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent([l.firma || l.name, l.ort].filter(Boolean).join(" "))} target="_blank" rel="noreferrer">Google-Profil suchen ↗</a>{l.profil_analyse ? <> · <a href={l.profil_analyse.quelle} target="_blank" rel="noreferrer">analysiertes Profil ↗</a></> : null}</small></div>
          <span className="plBadges"><b className="plScore">{l.profil_analyse ? `${l.profil_analyse.punkte}/100` : "nicht analysiert"}</b><b className={"plPrio p" + l.prioritaet?.stufe} title="Arbeitspriorität aus der eigenen Analyse – keine Erfolgsaussage">Priorität: {l.prioritaet?.text}</b></span></div>
        <p className="plZeile">Website: {l.website ? <a href={l.website} target="_blank" rel="noreferrer">{l.website}</a> : "keine verifizierte Website gefunden"}</p>
        <ol className="plStufen">{(d.stufen || []).map(([k, n], x) => <li key={k} className={x < i ? "fertig" : x === i ? "jetzt" : ""}>{n}</li>)}</ol>
        {l.profil_analyse?.verbesserungen?.length > 0 && <p className="plZeile">Erkennbare Verbesserungen: {l.profil_analyse.verbesserungen.map(v => (v.dringend ? "⚠ " : "") + v.text).join(" · ")}</p>}
        {l.laden && <p className="plZeile">Besuch: <b>{l.laden.text}</b> · <button className="editMini" onClick={() => senden({ action: "pilot-ladenlokal", id: l.id, ladenlokal: true }, "Ladenlokal: ja")}>Ladenlokal ja</button> <button className="editMini" onClick={() => senden({ action: "pilot-ladenlokal", id: l.id, ladenlokal: false }, "Ladenlokal: nein – nach hinten sortiert")}>nein</button></p>}
        {l.bewertung && <p className="plZeile">Bewertung <b>{l.bewertung.summe}/10</b>: {l.bewertung.kriterien.map(k => `${k.name} ${k.punkte}/2 (${k.begruendung})`).join(" · ")}</p>}
        <p className="plZeile">➜ Nächste Aufgabe: <b>{naechsteAufgabe(l)}</b></p>
        {l.pilot_crm?.zustimmung && <p className="plZeile">Zustimmung: {l.pilot_crm.zustimmung.form} am {tag(l.pilot_crm.zustimmung.datum)} ({l.pilot_crm.zustimmung.dokument}) · Bewertungen beantworten: {l.pilot_crm.zustimmung.bewertungen_antworten_erlaubt ? "erlaubt" : "nicht erlaubt"}{l.pilot_crm.google_zugang ? ` · Google-Zugang: ${l.pilot_crm.google_zugang.rolle} seit ${tag(l.pilot_crm.google_zugang.datum)}` : ""}</p>}
        {(l.pilot_crm?.brief_am || (l.pilot_crm?.antworten || []).length > 0) && <p className="plZeile">✉ Brief vorbereitet {tag(l.pilot_crm.brief_am)}{(l.pilot_crm.antworten || []).map((x, n) => <b key={n}> · Antwort {tag(x.datum)}: {x.wahl === "gespraech" ? `möchte Gespräch – ${x.name}${x.telefon ? ", Tel. " + x.telefon : ""}${x.email ? ", " + x.email : ""}${x.wunsch ? " (" + x.wunsch + ")" : ""}` : "kein Interesse – nicht mehr kontaktieren"}</b>)}{!(l.pilot_crm.antworten || []).length && " · noch keine Antwort"}</p>}
        {(l.pilot_crm?.aenderungen || []).length > 0 && <p className="plZeile">Änderungen: {l.pilot_crm.aenderungen.map(a => tag(a.datum) + " " + a.was).join(" · ")}</p>}
        {l.vertrag && <p className="plZeile">Monatliche Leistung: {eur(l.vertrag.monatspreis_cent)}/Monat seit {tag(l.vertrag.start)} · {l.vertrag.aktiv ? `läuft (zuletzt ${l.vertrag.letzte_periode || "—"})` : "beendet"}</p>}
        <div className="plAktionen">
          <button className="editMini" onClick={() => setDialog({ art: "analyse", l })}>{l.profil_analyse ? "Analyse aktualisieren" : "Profil-Analyse"}</button>
          {l.bericht && <button className="editMini" onClick={() => setDialog({ art: "text", titel: "Profil-Check-Bericht", text: l.bericht })}>Bericht</button>}
          {l.profil_analyse && <a className="editMini" href={"/master/profil-check?id=" + encodeURIComponent(l.id)} target="_blank" rel="noreferrer">🖨 Gesprächsunterlage</a>}
          {l.stufe === "GEPRUEFT" && <a className="editMini" href="/master?tab=freigaben">Kontakt freigeben („Wartet auf mich“) →</a>}
          {l.stufe === "KONTAKT_FREIGEGEBEN" && <a className="editMini" href={"/master/profil-check?brief=1&id=" + encodeURIComponent(l.id)} target="_blank" rel="noreferrer">✉ Brief mit Antwort-Link</a>}
          {l.stufe === "KONTAKT_FREIGEGEBEN" && <button className="editMini" onClick={() => senden({ action: "lead-status", id: l.id, status: "KONTAKT" }, "Gespräch vermerkt")}>Gespräch geführt</button>}
          {l.stufe === "INTERESSE" && l.angebot?.status === "entwurf" && <a className="editMini" href="/master?tab=freigaben">Angebot freigeben („Wartet auf mich“) →</a>}
          {l.stufe === "INTERESSE" && l.angebot?.status === "freigegeben" && <button className="editMini plJa" onClick={() => senden({ action: "lead-status", id: l.id, status: "ANGEBOT" }, "Angebot als übergeben vermerkt – Nachfass-Aufgabe in 7 Tagen angelegt")}>Angebot übergeben</button>}
          {l.stufe === "ANGEBOT" && <button className="editMini plJa" onClick={() => senden({ action: "lead-angebot-entscheidung", id: l.id, angenommen: true }, "Auftrag erteilt – jetzt Zustimmung dokumentieren und Leistung starten")}>Auftrag erteilt</button>}
          {l.stufe === "GESPRAECH" && <button className="editMini plJa" onClick={() => senden({ action: "lead-status", id: l.id, status: "INTERESSENT" }, "Interesse vermerkt")}>Hat Interesse</button>}
          {["LEAD", "GEPRUEFT", "KONTAKT_FREIGEGEBEN", "GESPRAECH", "INTERESSE", "ANGEBOT"].includes(l.stufe) && l.status !== "VERLOREN" && <button className="editMini" onClick={() => senden({ action: "lead-status", id: l.id, status: "VERLOREN" }, "Als „kein Interesse“ vermerkt")}>Kein Interesse</button>}
          {l.einmalAngebot && <button className="editMini" onClick={() => setDialog({ art: "text", titel: "Einmal-Paket (Vorlage)", text: l.einmalAngebot, hinweis: "Preis: noch festzulegen – nichts ist verbindlich. Keine Rechnung vor der Gewerbe-/Steuerklärung." })}>Einmal-Paket</button>}
          <button className="editMini" onClick={() => setDialog({ art: "text", titel: "Angebot (Vorlage)", text: l.angebotVorlage, hinweis: "Formell anlegen unter „E-Mail & Leads“ → Angebot erstellen." })}>Angebot-Vorlage</button>
          {l.stufe === "KUNDE" && <button className="editMini plJa" onClick={() => setDialog({ art: "vertrag", l })}>Zustimmung dokumentieren + Leistung starten</button>}
          {l.stufe === "LAUFEND" && !l.pilot_crm?.google_zugang && <button className="editMini plJa" onClick={() => setDialog({ art: "datum", l, action: "pilot-google-zugang", titel: "Google-Zugang als Administrator bestätigt", erfolg: "Google-Zugang bestätigt" })}>Google-Zugang bestätigt</button>}
          {l.stufe === "LAUFEND" && l.pilot_crm?.google_zugang && <button className="editMini" onClick={() => setDialog({ art: "aenderung", l })}>Änderung protokollieren</button>}
          {l.vertrag?.aktiv && <button className="editMini" onClick={() => senden({ action: "pilot-vertrag-ende", id: l.id }, "Leistung beendet – Aufgabe „Zugriff entfernen“ (7 Arbeitstage) angelegt")}>Leistung beenden</button>}
          {l.stufe === "BEENDET" && !l.pilot_crm?.zugriff_entfernt_am && <button className="editMini plJa" onClick={() => setDialog({ art: "datum", l, action: "pilot-zugriff-entfernt", titel: "Google-Zugriff entfernt", erfolg: "Zugriff entfernt vermerkt" })}>Zugriff entfernt</button>}
          <a className="editMini" href="/master?tab=leads">In „E-Mail & Leads“ →</a>
        </div>
      </article>; })}
    </section>

    <section className="panel"><h3>Einnahmen (nur echte Buchungen)</h3>
      {d && <div className="plFin"><span>Einnahmen <b>{eur(d.finanzen.einnahmen_cent)}</b></span><span>Offen <b>{eur(d.finanzen.offen_cent)}</b></span><span>Kosten <b>{eur(d.finanzen.kosten_cent)}</b></span><span>Gewinn <b>{eur(d.finanzen.gewinn_cent)}</b></span></div>}
      {(d?.finanzen?.buchungen || []).map(b => <p key={b.id} className="plZeile">{tag(b.datum)} · {b.art} {eur(b.betrag_cent)} · {b.status} · {b.beschreibung} {b.art === "Einnahme" && <button className="editMini" onClick={async () => { const j = await senden({ action: "pilot-rechnung", id: b.id }, "Rechnungsentwurf erstellt"); if (j) setDialog({ art: "text", titel: "Rechnung (Entwurf)", text: j.text, hinweis: "Nur ein Entwurf – nicht versenden, bevor Gewerbe/Steuer geklärt sind." }); }}>Rechnung vorbereiten</button>}</p>)}
      <a href="/master?tab=leads">„Geld ist da“ unter E-Mail & Leads →</a></section>

    <section className="panel"><h3>Aufgaben ({d?.aufgaben?.length ?? "…"})</h3>
      {(d?.aufgaben || []).slice(0, 12).map(t => <p key={t.id} className="plZeile">• {t.title} <small>({t.status} · {t.priority}{t.due_at ? " · fällig " + tag(t.due_at) : ""})</small></p>)}
      <a href="/master?tab=tasks">Alle Aufgaben →</a></section>

    <section className="panel"><h3>Dokumentation & Quellen</h3>
      <h4>Quellen</h4>{(d?.eq?.quellen_liste || []).map((q, i) => <p key={i} className="plZeile">• <a href={q.url} target="_blank" rel="noreferrer">{q.quelle}</a> <small>({q.datum}) – {q.aussage}</small></p>)}
      <h4>Monatliche Leistung (Standard)</h4>{(d?.monatsAufgaben || []).map(t => <p key={t} className="plZeile">• {t}</p>)}
      <h4>Google-Regeln für Drittanbieter</h4>{(d?.googleRegeln?.punkte || []).map(t => <p key={t} className="plZeile">• {t}</p>)}{d?.googleRegeln && <p className="plZeile"><small>Quelle: <a href={d.googleRegeln.quelle} target="_blank" rel="noreferrer">Google Unternehmensprofil – Richtlinien für Drittanbieter</a> (abgerufen {d.googleRegeln.datum})</small></p>}
      <h4>Vor dem ersten Kunden abhaken</h4>{(d?.vertragCheckliste || []).map(t => <p key={t} className="plZeile">☐ {t}</p>)}
      <p className="muted">Keine Rechtsberatung – offene Fragen mit der Beratung klären.</p></section>

    {dialog?.art === "betrieb" && <BetriebDialog onClose={() => setDialog(null)} onSave={async betrieb => { if (await senden({ action: "pilot-potenziell", betrieb }, "Potenzieller Kunde erfasst – Aufgabe „Profil-Analyse“ angelegt")) setDialog(null); }} />}
    {dialog?.art === "analyse" && <AnalyseDialog l={dialog.l} kriterien={d.kriterien} onClose={() => setDialog(null)} onSave={async analyse => { const j = await senden({ action: "pilot-analyse", id: dialog.l.id, analyse }, "Analyse gespeichert – Bericht und Aufgabe erstellt"); if (j) setDialog({ art: "text", titel: "Profil-Check-Bericht", text: j.bericht }); }} />}
    {dialog?.art === "vertrag" && <VertragDialog l={dialog.l} preis={d.eq.pilot?.monatspreis_cent} onClose={() => setDialog(null)} onSave={async v => { if (await senden({ action: "pilot-vertrag", id: dialog.l.id, vertrag: v }, "Monatliche Leistung gestartet – Aufgaben + offene Monatsrechnung angelegt")) setDialog(null); }} />}
    {dialog?.art === "datum" && <DatumDialog titel={dialog.titel + " – " + (dialog.l.firma || dialog.l.name)} onClose={() => setDialog(null)} onSave={async datum => { if (await senden({ action: dialog.action, id: dialog.l.id, zugang: { rolle: "Administrator", datum } }, dialog.erfolg)) setDialog(null); }} />}
    {dialog?.art === "aenderung" && <AenderungDialog l={dialog.l} onClose={() => setDialog(null)} onSave={async aenderung => { if (await senden({ action: "pilot-aenderung", id: dialog.l.id, aenderung }, "Änderung protokolliert – erscheint im Kundenbericht")) setDialog(null); }} />}
    {dialog?.art === "text" && <div className="modalBack"><div className="modal plModal"><div className="modalHead"><h3>{dialog.titel}</h3><button onClick={() => setDialog(null)}>×</button></div>{dialog.hinweis && <p className="note">{dialog.hinweis}</p>}<pre className="plText">{dialog.text}</pre><div className="modalActions"><button onClick={() => navigator.clipboard?.writeText(dialog.text)}>Kopieren</button><button className="primary" onClick={() => setDialog(null)}>Schließen</button></div></div></div>}
    <style dangerouslySetInnerHTML={{ __html: PL_CSS }} />
  </div>;
}

function BetriebDialog({ onClose, onSave }) {
  const [f, setF] = useState({ firma: "", ort: "Monheim am Rhein", branche: "", website: "", quelle_url: "", quelle_datum: heute(), notiz: "" });
  const s = k => e => setF({ ...f, [k]: e.target.value });
  return <div className="modalBack"><div className="modal plModal"><div className="modalHead"><h3>Potenziellen Kunden erfassen</h3><button onClick={onClose}>×</button></div>
    <p className="note">Nur öffentlich belegte Angaben (z. B. Branchenverzeichnis, eigene Website des Betriebs) – mit Link und Datum. Keine Kontaktaufnahme, keine Werbe-Mail.</p>
    {[["firma", "Name des Betriebs"], ["ort", "Ort"], ["branche", "Branche"], ["website", "Website (optional, nur wenn sicher zum Betrieb gehörig)"], ["quelle_url", "Quelle (Link, wo die Angaben stehen)"], ["quelle_datum", "Datum der Recherche", "date"], ["notiz", "Notiz (optional)"]].map(([k, l, t]) => <label key={k}>{l}<input type={t || "text"} value={f[k]} onChange={s(k)} /></label>)}
    <div className="modalActions"><button onClick={onClose}>Abbrechen</button><button className="primary" disabled={!f.firma.trim() || !f.ort.trim() || !f.branche.trim() || !/^https?:\/\//.test(f.quelle_url)} onClick={() => onSave(f)}>Speichern</button></div></div></div>;
}
// Naechste Aufgabe je Betrieb aus der Stufe (gleiche Logik wie "Deine naechste Aktion").
function naechsteAufgabe(l) {
  if (l.status === "VERLOREN") return "Keine – kein Interesse";
  if (l.stufe === "BEENDET") return l.pilot_crm?.zugriff_entfernt_am ? "Keine – beendet" : "Google-Zugriff innerhalb von 7 Arbeitstagen entfernen";
  if (l.stufe === "LAUFEND") return l.pilot_crm?.google_zugang ? "Monatsaufgaben erledigen, Änderungen protokollieren" : "Einladung als Administrator abwarten und bestätigen";
  if (l.stufe === "KUNDE") return "Schriftliche Zustimmung dokumentieren und Leistung starten – abrechnen erst nach Gewerbe-Klärung";
  if (l.stufe === "ANGEBOT") return "Rückmeldung zum Angebot abwarten bzw. nachfragen";
  if (l.stufe === "INTERESSE") return "Unverbindliches Angebot vorbereiten (Preis: deine Entscheidung)";
  if (l.stufe === "GESPRAECH") return "Nachfragen, ob Interesse besteht";
  if (l.stufe === "KONTAKT_FREIGEGEBEN") return "Bericht persönlich zeigen und Gespräch führen";
  if (l.stufe === "GEPRUEFT") return "Entscheiden: Kontakt freigeben? (Wartet auf mich)";
  return "Google-Profil öffnen und Analyse ausfüllen";
}

function AnalyseDialog({ l, kriterien, onClose, onSave }) {
  const a = l.profil_analyse;
  const [f, setF] = useState({ quelle: a?.quelle || (/^https?:/.test(l.quelle) ? l.quelle : ""), datum: heute(), werte: a?.werte || Object.fromEntries(kriterien.map(k => [k.id, "unbekannt"])), notiz: a?.notiz || "" });
  const geprueft = Object.values(f.werte).filter(v => v !== "unbekannt").length;
  return <div className="modalBack"><div className="modal plModal"><div className="modalHead"><h3>Profil-Analyse – {l.firma || l.name}</h3><button onClick={onClose}>×</button></div>
    <p className="note">Öffentliches Google-Profil öffnen und jeden Punkt ehrlich bewerten. Mindestens 5 Punkte prüfen. Eigene Checkliste – keine Google-Bewertung.</p>
    <label>Link zum Profil<input value={f.quelle} onChange={e => setF({ ...f, quelle: e.target.value })} /></label>
    <label>Datum<input type="date" value={f.datum} onChange={e => setF({ ...f, datum: e.target.value })} /></label>
    {kriterien.map(k => <label key={k.id}>{k.frage}<select value={f.werte[k.id]} onChange={e => setF({ ...f, werte: { ...f.werte, [k.id]: e.target.value } })}>{Object.entries(ANTWORTEN).map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select></label>)}
    <label>Notiz<textarea rows={2} value={f.notiz} onChange={e => setF({ ...f, notiz: e.target.value })} /></label>
    <div className="modalActions"><span className="muted">{geprueft}/{kriterien.length} geprüft</span><button onClick={onClose}>Abbrechen</button><button className="primary" disabled={geprueft < 5 || !/^https?:\/\//.test(f.quelle)} onClick={() => onSave(f)}>Speichern + Bericht</button></div></div></div>;
}
function DatumDialog({ titel, onClose, onSave }) {
  const [d, setD] = useState(heute());
  return <div className="modalBack"><div className="modal plModal"><div className="modalHead"><h3>{titel}</h3><button onClick={onClose}>×</button></div>
    <p className="note">Rolle immer „Administrator“ – der Kunde bleibt Inhaber. Nie ein Passwort annehmen oder speichern.</p>
    <label>Datum<input type="date" value={d} onChange={e => setD(e.target.value)} /></label>
    <div className="modalActions"><button onClick={onClose}>Abbrechen</button><button className="primary" onClick={() => onSave(d)}>Bestätigen</button></div></div></div>;
}
function AenderungDialog({ l, onClose, onSave }) {
  const [f, setF] = useState({ datum: heute(), was: "" });
  return <div className="modalBack"><div className="modal plModal"><div className="modalHead"><h3>Änderung protokollieren – {l.firma || l.name}</h3><button onClick={onClose}>×</button></div>
    <p className="note">Nur im vereinbarten Umfang ändern. Jede Änderung wird dem Kunden im Monatsbericht mitgeteilt (Google-Regel).</p>
    <label>Datum<input type="date" value={f.datum} onChange={e => setF({ ...f, datum: e.target.value })} /></label>
    <label>Was wurde geändert?<textarea rows={3} value={f.was} onChange={e => setF({ ...f, was: e.target.value })} /></label>
    <div className="modalActions"><button onClick={onClose}>Abbrechen</button><button className="primary" disabled={!f.was.trim()} onClick={() => onSave(f)}>Speichern</button></div></div></div>;
}
function VertragDialog({ l, preis, onClose, onSave }) {
  const [f, setF] = useState({ preis: preis ? String(preis / 100).replace(".", ",") : "", start: heute(), z_datum: heute(), form: "", dokument: "", gebuehren: false, inhaber: false, bewertungen: "" });
  const cent = euroZuCent(f.preis);
  return <div className="modalBack"><div className="modal plModal"><div className="modalHead"><h3>Monatliche Leistung – {l.firma || l.name}</h3><button onClick={onClose}>×</button></div>
    <p className="note">Nur mit schriftlicher oder digitaler Zustimmung des Inhabers (Google-Regel). Danach entstehen jeden Monat automatisch die Monatsaufgaben, ein Kundenbericht und eine OFFENE Monatsrechnung. Einnahme erst nach „Geld ist da“.</p>
    <label>Zustimmung vom<input type="date" value={f.z_datum} onChange={e => setF({ ...f, z_datum: e.target.value })} /></label>
    <label>Form der Zustimmung<select value={f.form} onChange={e => setF({ ...f, form: e.target.value })}><option value="">— bitte wählen —</option><option value="schriftlich">schriftlich (unterschrieben)</option><option value="digital">digital (z. B. E-Mail)</option></select></label>
    <label>Wo liegt der Nachweis? (z. B. „unterschriebenes Angebot, Ordner Kunden“)<input value={f.dokument} onChange={e => setF({ ...f, dokument: e.target.value })} /></label>
    <label className="plCheck"><input type="checkbox" checked={f.gebuehren} onChange={e => setF({ ...f, gebuehren: e.target.checked })} /> Gebühren wurden vorher schriftlich offengelegt</label>
    <label className="plCheck"><input type="checkbox" checked={f.inhaber} onChange={e => setF({ ...f, inhaber: e.target.checked })} /> Kunde bleibt Inhaber, ich werde nur Administrator</label>
    <label>Antworten auf Bewertungen ausdrücklich erlaubt?<select value={f.bewertungen} onChange={e => setF({ ...f, bewertungen: e.target.value })}><option value="">— bitte wählen —</option><option value="ja">ja</option><option value="nein">nein</option></select></label>
    <label>Monatspreis (€)<input inputMode="decimal" value={f.preis} onChange={e => setF({ ...f, preis: e.target.value })} /></label>
    <label>Start<input type="date" value={f.start} onChange={e => setF({ ...f, start: e.target.value })} /></label>
    <div className="modalActions"><button onClick={onClose}>Abbrechen</button><button className="primary" disabled={!cent || !f.form || !f.dokument.trim() || !f.gebuehren || !f.inhaber || !f.bewertungen} onClick={() => onSave({ monatspreis_cent: cent, start: f.start, zustimmung: { datum: f.z_datum, form: f.form, dokument: f.dokument, gebuehren_offengelegt: f.gebuehren, kunde_bleibt_inhaber: f.inhaber, bewertungen_antworten_erlaubt: f.bewertungen === "ja" } })}>Starten</button></div></div></div>;
}

const PL_CSS = `.plGate{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:6px}.plG{display:flex;gap:8px;padding:8px;border-radius:8px;border:1px solid #eaecf0;font-size:13px;min-width:0}.plG small{display:block;color:#667085;font-size:11px;overflow-wrap:anywhere}
.plG.ok{background:#f6fef9}.plG.ok b{color:#067647}.plG.du{background:#fffcf5;border-color:#fedf89}.plG.fehlt{background:#fef3f2;border-color:#fecdca}.plG.fehlt b{color:#b42318}
.plDu{border-color:#fedf89!important;background:#fffcf5!important}.plDu p{font-size:13px;margin:4px 0;overflow-wrap:anywhere}.plDu small{color:#667085}.plPreis{display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;margin:8px 0}.plPreis label{font-size:12px;font-weight:700}.plPreis input{display:block;margin-top:4px;padding:8px;border:1px solid #d0d5dd;border-radius:7px;width:140px}
.plBadges{display:flex;gap:6px;flex-wrap:wrap;height:fit-content}.plPrio{font-size:12px;padding:3px 8px;border-radius:999px;background:#f2f4f7}.plPrio.pHOCH{background:#fef3f2;color:#b42318}.plPrio.pMITTEL{background:#fffaeb;color:#b54708}.plCheck{display:flex!important;gap:8px;align-items:center;font-weight:400!important}.plCheck input{width:auto!important;display:inline!important;margin:0!important}
.plNaechste{display:flex;flex-direction:column;gap:6px;background:#101828;color:#fff;border-radius:12px;padding:14px;margin-bottom:12px}.plNaechste span{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#98a2b3;font-weight:800}.plNaechste b{font-size:16px}.plNaechste button{align-self:flex-start;background:#fff!important;color:#101828!important}
.plStufen{display:flex;flex-wrap:wrap;gap:4px;list-style:none;padding:0;margin:0}.plStufen li{font-size:11px;padding:2px 7px;border-radius:999px;background:#f2f4f7;color:#98a2b3}.plStufen li.fertig{background:#ecfdf3;color:#067647}.plStufen li.jetzt{background:#101828;color:#fff;font-weight:700}.plDran{border-color:#101828!important;box-shadow:0 0 0 1px #101828}
.plSchritte{margin:0;padding-left:20px;font-size:13px;display:grid;gap:4px}
.plBetrieb{border:1px solid #eaecf0;border-radius:12px;padding:12px;margin-top:10px;display:flex;flex-direction:column;gap:6px;min-width:0}.plKopf{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}.plKopf small{display:block;color:#667085;font-size:12px;overflow-wrap:anywhere}
.plScore{font-size:12px;padding:3px 8px;border-radius:999px;background:#eff8ff;color:#175cd3;height:fit-content}.plZeile{font-size:13px;margin:3px 0;overflow-wrap:anywhere}.plZeile small{color:#667085}
.plAktionen{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.plAktionen a.editMini{text-decoration:none}.plJa{background:#ecfdf3!important}.plFin{display:flex;gap:6px 16px;flex-wrap:wrap;font-size:13px;margin-bottom:6px}
.pl h4{margin:10px 0 4px;font-size:13px}.plText{white-space:pre-wrap;font:inherit;font-size:13px;background:#f9fafb;border-radius:8px;padding:10px;overflow-wrap:anywhere}
.plMeldung{font-size:14px}.plModal{width:min(620px,100%);max-height:92vh;overflow:auto}.plModal label{display:block;font-size:12px;font-weight:700;margin-top:10px}.plModal input,.plModal textarea,.plModal select{display:block;width:100%;margin-top:4px;padding:9px;border:1px solid #d0d5dd;border-radius:7px;font:inherit}.pl .muted{color:#98a2b3;font-size:13px}.plLeitfaden{margin:0;padding-left:20px;display:grid;gap:6px;font-size:14px}.plLeitfaden li b{display:block}.plLeitfaden li span{opacity:.85}
.plEnt{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}.plEnt article{border:1px solid rgba(127,127,127,.25);border-radius:10px;padding:10px;min-width:0}
.plEnt h4{margin:0 0 6px;font-size:14px}.plEnt dl{margin:0;display:grid;gap:2px;font-size:13px}.plEnt dt{font-weight:700;margin-top:6px}.plEnt dd{margin:0;overflow-wrap:anywhere}
`;
