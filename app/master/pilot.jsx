"use client";

// Pilot "Pflege Google-Unternehmensprofil" (27.09.2026, Teil 5). Alles an einem Ort: Quality Gate, "Wartet auf mich",
// Betriebe (Leads), Profil-Analyse, Bericht, Angebot, monatliche Leistung, Einnahmen, Aufgaben, Dokumentation.
// 0 € bis zur ersten Einnahme: keine API, keine Werbung - die Analyse erfolgt von Hand am oeffentlichen Profil.
import { useEffect, useState } from "react";
import { adminFetch, anmeldeUrl } from "../../lib/admin-fetch.js";
import { ANTWORTEN } from "../../lib/google-profil.js";
import { LEAD_LABEL } from "../../lib/leads-regeln.js";

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
    <div className="pageTitle"><div><span>PILOT · 0 € BIS ZUR ERSTEN EINNAHME</span><h2>Pilot: Google-Unternehmensprofil</h2></div><div className="quick"><button className="primaryLink" disabled={!d} onClick={() => setDialog({ art: "betrieb" })}>+ Betrieb erfassen</button></div></div>
    {meldung && <div className="panel plMeldung">{meldung}</div>}
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

    <section className="panel"><h3>Betriebe ({d?.leads?.length ?? "…"})</h3>
      {d && !d.leads.length && <p className="muted">Noch kein Betrieb erfasst. Starte mit 3 Übungs-Checks an öffentlichen Profilen aus deiner Umgebung.</p>}
      {(d?.leads || []).map(l => <article key={l.id} className="plBetrieb">
        <div className="plKopf"><div><strong>{l.firma || l.name}</strong><small>{LEAD_LABEL[l.status]} · Quelle: {l.quelle || "—"} · seit {tag(l.erstellt_am)}</small></div>
          <b className="plScore">{l.profil_analyse ? `${l.profil_analyse.punkte}/100` : "nicht analysiert"}</b></div>
        {l.vertrag && <p className="plZeile">Monatliche Leistung: {eur(l.vertrag.monatspreis_cent)}/Monat seit {tag(l.vertrag.start)} · {l.vertrag.aktiv ? `läuft (zuletzt ${l.vertrag.letzte_periode || "—"})` : "beendet"}</p>}
        <div className="plAktionen">
          <button className="editMini" onClick={() => setDialog({ art: "analyse", l })}>{l.profil_analyse ? "Analyse aktualisieren" : "Profil-Analyse"}</button>
          {l.bericht && <button className="editMini" onClick={() => setDialog({ art: "text", titel: "Profil-Check-Bericht", text: l.bericht })}>Bericht</button>}
          <button className="editMini" onClick={() => setDialog({ art: "text", titel: "Angebot (Vorlage)", text: l.angebotVorlage, hinweis: "Formell anlegen unter „E-Mail & Leads“ → Angebot erstellen." })}>Angebot-Vorlage</button>
          {l.status === "KUNDE" && !l.vertrag?.aktiv && <button className="editMini plJa" onClick={() => setDialog({ art: "vertrag", l })}>Monatliche Leistung starten</button>}
          {l.vertrag?.aktiv && <button className="editMini" onClick={() => senden({ action: "pilot-vertrag-ende", id: l.id }, "Monatliche Leistung beendet")}>Leistung beenden</button>}
          <a className="editMini" href="/master?tab=leads">In „E-Mail & Leads“ →</a>
        </div>
      </article>)}
    </section>

    <section className="panel"><h3>Einnahmen (nur echte Buchungen)</h3>
      {d && <div className="plFin"><span>Einnahmen <b>{eur(d.finanzen.einnahmen_cent)}</b></span><span>Offen <b>{eur(d.finanzen.offen_cent)}</b></span><span>Kosten <b>{eur(d.finanzen.kosten_cent)}</b></span><span>Gewinn <b>{eur(d.finanzen.gewinn_cent)}</b></span></div>}
      {(d?.finanzen?.buchungen || []).map(b => <p key={b.id} className="plZeile">{tag(b.datum)} · {b.art} {eur(b.betrag_cent)} · {b.status} · {b.beschreibung}</p>)}
      <a href="/master?tab=leads">„Geld ist da“ unter E-Mail & Leads →</a></section>

    <section className="panel"><h3>Aufgaben ({d?.aufgaben?.length ?? "…"})</h3>
      {(d?.aufgaben || []).slice(0, 12).map(t => <p key={t.id} className="plZeile">• {t.title} <small>({t.status} · {t.priority}{t.due_at ? " · fällig " + tag(t.due_at) : ""})</small></p>)}
      <a href="/master?tab=tasks">Alle Aufgaben →</a></section>

    <section className="panel"><h3>Dokumentation & Quellen</h3>
      <h4>Quellen</h4>{(d?.eq?.quellen_liste || []).map((q, i) => <p key={i} className="plZeile">• <a href={q.url} target="_blank" rel="noreferrer">{q.quelle}</a> <small>({q.datum}) – {q.aussage}</small></p>)}
      <h4>Monatliche Leistung (Standard)</h4>{(d?.monatsAufgaben || []).map(t => <p key={t} className="plZeile">• {t}</p>)}
      <h4>Vor dem ersten Kunden abhaken</h4>{(d?.vertragCheckliste || []).map(t => <p key={t} className="plZeile">☐ {t}</p>)}
      <p className="muted">Keine Rechtsberatung – offene Fragen mit der Beratung klären.</p></section>

    {dialog?.art === "betrieb" && <BetriebDialog onClose={() => setDialog(null)} onSave={async f => { if (await senden({ action: "lead-anlegen", lead: { ...f, name: f.name || f.firma, einnahmequelle_id: eqId } }, "Betrieb erfasst – jetzt Profil-Analyse")) setDialog(null); }} />}
    {dialog?.art === "analyse" && <AnalyseDialog l={dialog.l} kriterien={d.kriterien} onClose={() => setDialog(null)} onSave={async analyse => { const j = await senden({ action: "pilot-analyse", id: dialog.l.id, analyse }, "Analyse gespeichert – Bericht und Aufgabe erstellt"); if (j) setDialog({ art: "text", titel: "Profil-Check-Bericht", text: j.bericht }); }} />}
    {dialog?.art === "vertrag" && <VertragDialog l={dialog.l} preis={d.eq.pilot?.monatspreis_cent} onClose={() => setDialog(null)} onSave={async v => { if (await senden({ action: "pilot-vertrag", id: dialog.l.id, vertrag: v }, "Monatliche Leistung gestartet – Aufgaben + offene Monatsrechnung angelegt")) setDialog(null); }} />}
    {dialog?.art === "text" && <div className="modalBack"><div className="modal plModal"><div className="modalHead"><h3>{dialog.titel}</h3><button onClick={() => setDialog(null)}>×</button></div>{dialog.hinweis && <p className="note">{dialog.hinweis}</p>}<pre className="plText">{dialog.text}</pre><div className="modalActions"><button onClick={() => navigator.clipboard?.writeText(dialog.text)}>Kopieren</button><button className="primary" onClick={() => setDialog(null)}>Schließen</button></div></div></div>}
    <style dangerouslySetInnerHTML={{ __html: PL_CSS }} />
  </div>;
}

function BetriebDialog({ onClose, onSave }) {
  const [f, setF] = useState({ firma: "", name: "", quelle: "", telefon: "", email: "", selbst_angefragt: "", einwilligung: "" });
  const s = k => e => setF({ ...f, [k]: e.target.value });
  return <div className="modalBack"><div className="modal plModal"><div className="modalHead"><h3>Betrieb erfassen</h3><button onClick={onClose}>×</button></div>
    <p className="note">Nur öffentlich sichtbare Betriebsdaten. Werbe-Mails sind ohne Einwilligung nicht erlaubt – den Bericht persönlich zeigen.</p>
    {[["firma", "Betrieb / Firma"], ["name", "Ansprechpartner (optional)"], ["quelle", "Link zum Google-Profil (Maps)"], ["telefon", "Telefon (optional)"], ["email", "E-Mail (optional)"]].map(([k, l]) => <label key={k}>{l}<input value={f[k]} onChange={s(k)} /></label>)}
    <label>Hat der Betrieb selbst angefragt?<select value={f.selbst_angefragt} onChange={s("selbst_angefragt")}><option value="">— bitte wählen —</option><option value="ja">ja</option><option value="nein">nein</option></select></label>
    <label>Einwilligung zu E-Mails?<select value={f.einwilligung} onChange={s("einwilligung")}><option value="">— bitte wählen —</option><option value="ja">ja</option><option value="nein">nein</option></select></label>
    <div className="modalActions"><button onClick={onClose}>Abbrechen</button><button className="primary" disabled={!f.firma.trim() || f.selbst_angefragt === "" || f.einwilligung === ""} onClick={() => onSave({ ...f, selbst_angefragt: f.selbst_angefragt === "ja", einwilligung: f.einwilligung === "ja" })}>Speichern</button></div></div></div>;
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
function VertragDialog({ l, preis, onClose, onSave }) {
  const [f, setF] = useState({ preis: preis ? String(preis / 100).replace(".", ",") : "", start: heute() });
  const cent = euroZuCent(f.preis);
  return <div className="modalBack"><div className="modal plModal"><div className="modalHead"><h3>Monatliche Leistung – {l.firma || l.name}</h3><button onClick={onClose}>×</button></div>
    <p className="note">Jeden Monat entstehen automatisch die Monatsaufgaben und eine OFFENE Monatsrechnung. Einnahme erst nach „Geld ist da“. Kundenzugang (Google-Verwalter-Einladung) landet unter „Wartet auf mich“.</p>
    <label>Monatspreis (€)<input inputMode="decimal" value={f.preis} onChange={e => setF({ ...f, preis: e.target.value })} /></label>
    <label>Start<input type="date" value={f.start} onChange={e => setF({ ...f, start: e.target.value })} /></label>
    <div className="modalActions"><button onClick={onClose}>Abbrechen</button><button className="primary" disabled={!cent} onClick={() => onSave({ monatspreis_cent: cent, start: f.start })}>Starten</button></div></div></div>;
}

const PL_CSS = `.plGate{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:6px}.plG{display:flex;gap:8px;padding:8px;border-radius:8px;border:1px solid #eaecf0;font-size:13px;min-width:0}.plG small{display:block;color:#667085;font-size:11px;overflow-wrap:anywhere}
.plG.ok{background:#f6fef9}.plG.ok b{color:#067647}.plG.du{background:#fffcf5;border-color:#fedf89}.plG.fehlt{background:#fef3f2;border-color:#fecdca}.plG.fehlt b{color:#b42318}
.plDu{border-color:#fedf89!important;background:#fffcf5!important}.plDu p{font-size:13px;margin:4px 0;overflow-wrap:anywhere}.plDu small{color:#667085}.plPreis{display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;margin:8px 0}.plPreis label{font-size:12px;font-weight:700}.plPreis input{display:block;margin-top:4px;padding:8px;border:1px solid #d0d5dd;border-radius:7px;width:140px}
.plSchritte{margin:0;padding-left:20px;font-size:13px;display:grid;gap:4px}
.plBetrieb{border:1px solid #eaecf0;border-radius:12px;padding:12px;margin-top:10px;display:flex;flex-direction:column;gap:6px;min-width:0}.plKopf{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}.plKopf small{display:block;color:#667085;font-size:12px;overflow-wrap:anywhere}
.plScore{font-size:12px;padding:3px 8px;border-radius:999px;background:#eff8ff;color:#175cd3;height:fit-content}.plZeile{font-size:13px;margin:3px 0;overflow-wrap:anywhere}.plZeile small{color:#667085}
.plAktionen{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.plAktionen a.editMini{text-decoration:none}.plJa{background:#ecfdf3!important}.plFin{display:flex;gap:6px 16px;flex-wrap:wrap;font-size:13px;margin-bottom:6px}
.pl h4{margin:10px 0 4px;font-size:13px}.plText{white-space:pre-wrap;font:inherit;font-size:13px;background:#f9fafb;border-radius:8px;padding:10px;overflow-wrap:anywhere}
.plMeldung{font-size:14px}.plModal{width:min(620px,100%);max-height:92vh;overflow:auto}.plModal label{display:block;font-size:12px;font-weight:700;margin-top:10px}.plModal input,.plModal textarea,.plModal select{display:block;width:100%;margin-top:4px;padding:9px;border:1px solid #d0d5dd;border-radius:7px;font:inherit}.pl .muted{color:#98a2b3;font-size:13px}`;
