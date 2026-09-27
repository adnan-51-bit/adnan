"use client";

// E-Mail & Leads (27.09.2026, Teil 4B): Leads, Interessenten, Kunden, Kontaktstatus, E-Mail-Entwuerfe, gesendete
// Nachrichten, Antworten, Angebote, Einnahmen/Kosten je Einnahmequelle und der gesamte Einnahme-Ablauf.
// Die Zentrale sendet NICHTS: "In E-Mail-Programm öffnen" oeffnet Adnans eigenes Postfach, danach "gesendet" markieren.
import { useEffect, useState } from "react";
import { adminFetch, anmeldeUrl } from "../../lib/admin-fetch.js";
import { LEAD_STATUS, LEAD_LABEL, EMAIL_ARTEN, ANTWORT_LABEL, EINNAHME_ABLAUF, EINNAHME_LABEL, GRAD } from "../../lib/leads-regeln.js";
import { EmailZentraleKarte, LeadTabelle } from "./zentralen.jsx";

const eur = c => ((c || 0) / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const tag = t => t ? new Date(t).toLocaleDateString("de-DE") : "—";
const zeit = t => t ? new Date(t).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" }) : "—";
const heute = () => new Date().toISOString().slice(0, 10);
const euroZuCent = v => { const s = String(v || "").trim(); if (!s) return null; const n = Math.round(Number(s.replace(/\./g, "").replace(",", ".")) * 100); return Number.isFinite(n) && n > 0 ? n : NaN; };

export function EmailLeads() {
  const [d, setD] = useState(null);
  const [meldung, setMeldung] = useState("");
  const [dialog, setDialog] = useState(null);
  const [offen, setOffen] = useState({});
  const [filter, setFilter] = useState({ status: "aktiv", eq: "alle" });
  const laden = () => adminFetch("/api/master/businesses?leads=1").then(async r => setD(r.status === 401 ? { gesperrt: true } : await r.json())).catch(() => setD({ fehler: true }));
  useEffect(() => { laden(); }, []);
  async function senden(body, erfolg) {
    setMeldung("");
    const r = await adminFetch("/api/master/businesses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setMeldung("❌ " + (j.error || "Fehler " + r.status)); return null; }
    // Erst neu laden, dann melden - sonst zeigt die Seite kurz den alten Stand.
    await laden();
    setMeldung("✅ " + erfolg + (j.kategorie ? ` – erkannt: ${ANTWORT_LABEL[j.kategorie]}` : ""));
    if (body.id && offen[body.id]) ladeVerlauf(body.id);
    return j;
  }
  const ladeVerlauf = id => adminFetch("/api/master/businesses?leads=1&id=" + encodeURIComponent(id)).then(r => r.json()).then(j => setOffen(o => ({ ...o, [id]: j.verlauf || [] })));
  const umschalten = id => offen[id] ? setOffen(o => { const n = { ...o }; delete n[id]; return n; }) : ladeVerlauf(id);
  const eqs = d?.einnahmequellen || [];
  const eqName = id => eqs.find(q => q.id === id)?.name;
  const sichtbar = (d?.leads || []).filter(l => (filter.status === "alle" || (filter.status === "aktiv" ? !["VERLOREN", "GESPERRT"].includes(l.status) : l.status === filter.status)) && (filter.eq === "alle" || l.einnahmequelle_id === filter.eq))
    .sort((a, b) => String(b.aktualisiert_am).localeCompare(String(a.aktualisiert_am)));
  const u = d?.uebersicht;
  return <div className="ld">
    <div className="pageTitle"><div><span>GESCHÄFTSBEREICHE</span><h2>E-Mail & Leads</h2></div><div className="quick"><button className="primaryLink" disabled={d?.gesperrt} onClick={() => setDialog({ art: "neu" })}>+ Lead erfassen</button></div></div>
    <p className="note">Nur echte Kontakte. <b>Keine Massen- oder Werbe-Mails ohne Einwilligung</b> (UWG § 7). Die Zentrale sendet nichts selbst: Entwurf prüfen → „In E-Mail-Programm öffnen“ → aus deinem Postfach senden → „Als gesendet markieren“. Einnahmen zählen erst, wenn das Geld wirklich da ist.</p>
    {d?.gesperrt && <div className="panel">Nur mit Anmeldung sichtbar. <a href={anmeldeUrl()}>⎆ Anmelden</a></div>}
    {meldung && <div className="panel ldMeldung">{meldung}</div>}
    <div className="ldKpis">{[["Neu", u?.neu], ["Interessenten", u?.interessenten], ["In Kontakt", u?.kontakt], ["Angebot", u?.angebot], ["Kunden", u?.kunden], ["Offene Antworten", u?.offeneAntworten]].map(([l, v]) => <div key={l}><span>{l}</span><b>{v ?? "…"}</b></div>)}</div>

    <EmailZentraleKarte e={d?.emailZentrale} />
    <LeadTabelle leads={d?.leads} />
    <section className="panel"><h3>Einnahme-Ablauf & Finanzen je Einnahmequelle</h3>
      <p className="muted">Ablauf: {EINNAHME_ABLAUF.map(s => EINNAHME_LABEL[s]).join(" → ")}. Der Stand ergibt sich nur aus echten Daten.</p>
      {eqs.map(q => <article key={q.id} className="ldEq">
        <div className="ldEqKopf"><strong>{q.name}</strong><small>{q.ablauf.naechste ? "Nächster Schritt: " + EINNAHME_LABEL[q.ablauf.naechste] : "Alle Schritte erreicht"}</small></div>
        <ol className="ldAblauf">{EINNAHME_ABLAUF.map(s => <li key={s} className={q.ablauf.erreicht[s] ? "fertig" : s === q.ablauf.naechste ? "jetzt" : ""}>{EINNAHME_LABEL[s]}</li>)}</ol>
        <div className="ldFin"><span>Einnahmen <b>{eur(q.finanzen.einnahmen_cent)}</b></span><span>Kosten <b>{eur(q.finanzen.kosten_cent)}</b></span><span>Gewinn <b>{eur(q.finanzen.gewinn_cent)}</b></span><span>Offen <b>{eur(q.finanzen.offen_cent)}</b></span>
          <button className="editMini" onClick={() => setDialog({ art: "kosten", eq: q })}>Kosten vorschlagen</button></div>
        {q.finanzen.buchungen.length > 0 && <table className="ldTab"><thead><tr><th>Datum</th><th>Art</th><th>Betrag</th><th>Status</th><th>Quelle</th><th></th></tr></thead><tbody>
          {q.finanzen.buchungen.map(b => <tr key={b.id}><td>{tag(b.datum)}</td><td>{b.art}</td><td>{eur(b.betrag_cent)}</td><td>{b.status}</td><td>{b.quelle}{b.beschreibung ? " – " + b.beschreibung : ""}</td>
            <td>{b.status === "offen" && <button className="editMini" onClick={() => setDialog({ art: "bezahlt", b })}>Geld ist da</button>}</td></tr>)}</tbody></table>}
      </article>)}
      {d && !d.gesperrt && !eqs.length && <p className="muted">Noch keine Einnahmequellen.</p>}
    </section>

    <section className="panel"><h3>Leads, Interessenten & Kunden ({sichtbar.length})</h3>
      <div className="ldFilter"><select aria-label="Status" value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })}><option value="aktiv">Alle aktiven</option><option value="alle">Alle</option>{LEAD_STATUS.map(s => <option key={s} value={s}>{LEAD_LABEL[s]}</option>)}</select>
        <select aria-label="Einnahmequelle" value={filter.eq} onChange={e => setFilter({ ...filter, eq: e.target.value })}><option value="alle">Alle Einnahmequellen</option>{eqs.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}</select></div>
      {d && !sichtbar.length && <p className="muted">Keine Leads für diesen Filter. Echte Leads entstehen z. B. aus Anfragen, Kommentaren oder Gesprächen.</p>}
      {sichtbar.map(l => <Karte key={l.id} l={l} eqName={eqName(l.einnahmequelle_id)} verlauf={offen[l.id]} onVerlauf={() => umschalten(l.id)} senden={senden} setDialog={setDialog} />)}
    </section>

    <section className="panel"><h3>Automatisierungsgrad</h3>
      <p className="muted">„KI vorbereitet“ arbeitet derzeit kostenlos mit Regeln und Vorlagen. Eine echte KI oder ein E-Mail-Dienst kommt nur nach deiner Freigabe.</p>
      <table className="ldTab"><tbody>{(d?.automatisierungsgrad || []).map(([n, g, i]) => <tr key={n}><td><b>{n}</b></td><td><span className={"ldGrad g" + g}>{GRAD[g]}</span></td><td>{i}</td></tr>)}</tbody></table>
    </section>

    {dialog?.art === "neu" && <NeuDialog eqs={eqs} senden={senden} onClose={() => setDialog(null)} />}
    {dialog?.art === "antwort" && <TextDialog titel={"Antwort erfassen – " + dialog.l.name} hinweis="Antwort hier einfügen. Die Zentrale erkennt automatisch Interesse, Frage, Termin, Absage oder Widerspruch (bitte prüfen)." feld="Antworttext" onClose={() => setDialog(null)} onSave={async text => { if (await senden({ action: "lead-antwort", id: dialog.l.id, text }, "Antwort erfasst")) setDialog(null); }} />}
    {dialog?.art === "angebot" && <AngebotDialog l={dialog.l} onClose={() => setDialog(null)} onSave={async (text, betrag_cent) => { if (await senden({ action: "lead-angebot", id: dialog.l.id, text, betrag_cent }, "Angebot gespeichert – jetzt E-Mail-Entwurf „Angebot“ erstellen")) setDialog(null); }} />}
    {dialog?.art === "kosten" && <KostenDialog eq={dialog.eq} onClose={() => setDialog(null)} onSave={async v => { if (await senden({ action: "eq-kosten-vorschlag", id: dialog.eq.id, vorschlag: v }, "Kostenvorschlag liegt unter „Wartet auf mich“")) setDialog(null); }} />}
    {dialog?.art === "bezahlt" && <BezahltDialog b={dialog.b} onClose={() => setDialog(null)} onSave={async (datum, nachweis) => { if (await senden({ action: "zahlung-eingegangen", id: dialog.b.id, datum, nachweis }, "Einnahme als bezahlt erfasst")) setDialog(null); }} />}
    <style dangerouslySetInnerHTML={{ __html: LD_CSS }} />
  </div>;
}

function Karte({ l, eqName, verlauf, onVerlauf, senden, setDialog }) {
  const n = l.nachrichten || [];
  const offeneAntwort = n.findIndex(x => x.richtung === "rein" && !x.bearbeitet);
  return <article className={"ldKarte" + (offeneAntwort >= 0 ? " antwort" : "")}>
    <div className="ldKopf"><div><strong>{l.name}</strong><small>{[l.firma, l.email, l.telefon].filter(Boolean).join(" · ") || "keine Kontaktdaten"}{eqName ? " · ↗ " + eqName : ""} · Quelle: {l.quelle || "—"} · seit {tag(l.erstellt_am)}</small></div><b className={"ldSt s" + l.status}>{LEAD_LABEL[l.status]}</b></div>
    <p className={"ldKontakt " + (l.kontakt?.erlaubt ? "ja" : "nein")}>{l.kontakt?.erlaubt ? "✓ Kontakt erlaubt" : "⛔ Nicht anschreiben"} – {l.kontakt?.grund}</p>
    <p className="ldNaechst">➜ Nächste Aufgabe: <b>{l.naechster_schritt || "—"}</b></p>
    {l.angebot && <p className="ldZeile">Angebot: {l.angebot.betrag_cent ? eur(l.angebot.betrag_cent) : "ohne Betrag"} · {l.angebot.status}</p>}
    <div className="ldAktionen">
      <select defaultValue="" aria-label="E-Mail-Entwurf" onChange={e => { const a = e.target.value; e.target.value = ""; if (a) senden({ action: "lead-entwurf", id: l.id, art: a }, "E-Mail-Entwurf erstellt"); }}><option value="">✉ E-Mail-Entwurf …</option>{Object.entries(EMAIL_ARTEN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      <button className="editMini" onClick={() => setDialog({ art: "antwort", l })}>Antwort erfassen</button>
      {!["GESPERRT", "VERLOREN", "KUNDE"].includes(l.status) && <button className="editMini" onClick={() => setDialog({ art: "angebot", l })}>{l.angebot ? "Angebot ändern" : "Angebot erstellen"}</button>}
      {l.angebot && ["gesendet", "entwurf"].includes(l.angebot.status) && <><button className="editMini ldJa" onClick={() => senden({ action: "lead-angebot-entscheidung", id: l.id, angenommen: true }, "Angebot angenommen – Kunde + offene Einnahme angelegt")}>Angebot angenommen</button><button className="editMini" onClick={() => senden({ action: "lead-angebot-entscheidung", id: l.id, angenommen: false }, "Angebot abgelehnt")}>abgelehnt</button></>}
      <select defaultValue="" aria-label="Status ändern" onChange={e => { const s = e.target.value; e.target.value = ""; if (s) senden({ action: "lead-status", id: l.id, status: s }, `Status „${LEAD_LABEL[s]}“`); }}><option value="">Status …</option>{LEAD_STATUS.filter(s => s !== l.status).map(s => <option key={s} value={s}>{LEAD_LABEL[s]}</option>)}</select>
      <button className="editMini" onClick={onVerlauf}>{verlauf ? "Schließen" : `Nachrichten (${n.length}) & Verlauf`}</button>
    </div>
    {verlauf && <div className="ldDetails">
      {!n.length && <p className="muted">Noch keine Nachrichten.</p>}
      {n.map((x, i) => <div key={i} className={"ldNachricht " + x.richtung}>
        <small>{x.richtung === "rein" ? `⬅ Antwort · ${ANTWORT_LABEL[x.kategorie]}${x.bearbeitet ? " · erledigt" : ""}` : x.typ === "gesendet" ? `➡ Gesendet ${zeit(x.gesendet_am)}` : "✎ Entwurf (nicht gesendet)"} · {zeit(x.datum)}</small>
        {x.betreff && <b>{x.betreff}</b>}<pre>{x.text}</pre>
        {x.typ === "entwurf" && (x.senden_erlaubt && l.kontakt?.erlaubt ? <div className="ldAktionen">{l.email && <a className="editMini" href={`mailto:${l.email}?subject=${encodeURIComponent(x.betreff)}&body=${encodeURIComponent(x.text)}`}>In E-Mail-Programm öffnen</a>}<button className="editMini" onClick={() => navigator.clipboard?.writeText(x.text)}>Kopieren</button><button className="editMini ldJa" onClick={() => senden({ action: "lead-gesendet", id: l.id, index: i }, "Als gesendet markiert – Follow-up angelegt")}>Als gesendet markieren</button></div> : <p className="ldKontakt nein">⛔ Senden gesperrt: {x.hinweis}</p>)}
        {x.richtung === "rein" && !x.bearbeitet && <button className="editMini" onClick={() => senden({ action: "lead-antwort-erledigt", id: l.id, index: i }, "Antwort erledigt")}>Als erledigt markieren</button>}
      </div>)}
      {l.rohtext && <details><summary>Ursprünglicher Text</summary><pre>{l.rohtext}</pre></details>}
      <div><h4>Verlauf</h4>{verlauf.map(v => <p key={v.id}><small>{zeit(v.created_at)}</small> {v.action.replace("lead.", "")}{v.details?.kategorie ? ": " + ANTWORT_LABEL[v.details.kategorie] : ""}{v.details?.nach ? ` → ${LEAD_LABEL[v.details.nach] || v.details.nach}` : ""}</p>)}</div>
    </div>}
  </article>;
}

function NeuDialog({ eqs, senden, onClose }) {
  const [f, setF] = useState({ rohtext: "", name: "", firma: "", email: "", telefon: "", quelle: "", einnahmequelle_id: "", selbst_angefragt: "", einwilligung: "", notiz: "" });
  const s = k => e => setF({ ...f, [k]: e.target.value });
  async function erkennen() { const j = await senden({ action: "lead-strukturieren", text: f.rohtext }, "Angaben erkannt – bitte prüfen"); if (j?.erkannt) setF(x => ({ ...x, ...Object.fromEntries(Object.entries(j.erkannt).filter(([k, v]) => v && !x[k])) })); }
  const bereit = f.name.trim() && f.selbst_angefragt !== "" && f.einwilligung !== "";
  return <div className="modalBack"><div className="modal ldModal"><div className="modalHead"><h3>Lead erfassen</h3><button onClick={onClose}>×</button></div>
    <p className="note">Anfrage, Kommentar oder Visitenkarte einfügen → „Angaben erkennen“ füllt Name, Firma, E-Mail und Telefon vor. Nur echte Kontakte.</p>
    <label>Eingefügter Text (optional)<textarea rows={4} value={f.rohtext} onChange={s("rohtext")} /></label>
    <button className="editMini" disabled={!f.rohtext.trim()} onClick={erkennen}>Angaben erkennen</button>
    {[["name", "Name"], ["firma", "Firma"], ["email", "E-Mail"], ["telefon", "Telefon"], ["quelle", "Woher? (z. B. Anfrage per E-Mail, Kommentar unter Video 3)"]].map(([k, l]) => <label key={k}>{l}<input value={f[k]} onChange={s(k)} /></label>)}
    <label>Einnahmequelle<select value={f.einnahmequelle_id} onChange={s("einnahmequelle_id")}><option value="">— keine —</option>{eqs.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}</select></label>
    <label>Hat der Lead selbst angefragt?<select value={f.selbst_angefragt} onChange={s("selbst_angefragt")}><option value="">— bitte wählen —</option><option value="ja">ja</option><option value="nein">nein</option></select></label>
    <label>Liegt eine Einwilligung zu E-Mails vor?<select value={f.einwilligung} onChange={s("einwilligung")}><option value="">— bitte wählen —</option><option value="ja">ja</option><option value="nein">nein</option></select></label>
    <label>Notiz<textarea rows={2} value={f.notiz} onChange={s("notiz")} /></label>
    <div className="modalActions"><button onClick={onClose}>Abbrechen</button><button className="primary" disabled={!bereit} onClick={async () => { if (await senden({ action: "lead-anlegen", lead: { ...f, einnahmequelle_id: f.einnahmequelle_id || null, selbst_angefragt: f.selbst_angefragt === "ja", einwilligung: f.einwilligung === "ja" } }, "Lead erfasst – Follow-up-Aufgabe angelegt")) onClose(); }}>Speichern</button></div>
  </div></div>;
}
function TextDialog({ titel, hinweis, feld, start = "", einzeilig, onClose, onSave }) {
  const [t, setT] = useState(start);
  return <div className="modalBack"><div className="modal ldModal"><div className="modalHead"><h3>{titel}</h3><button onClick={onClose}>×</button></div>{hinweis && <p className="note">{hinweis}</p>}
    <label>{feld}{einzeilig ? <input value={t} onChange={e => setT(e.target.value)} /> : <textarea rows={6} value={t} onChange={e => setT(e.target.value)} />}</label>
    <div className="modalActions"><button onClick={onClose}>Abbrechen</button><button className="primary" disabled={!t.trim()} onClick={() => onSave(t)}>Speichern</button></div></div></div>;
}
function BezahltDialog({ b, onClose, onSave }) {
  const [f, setF] = useState({ datum: heute(), nachweis: "" });
  return <div className="modalBack"><div className="modal ldModal"><div className="modalHead"><h3>Zahlung eingegangen: {eur(b.betrag_cent)}</h3><button onClick={onClose}>×</button></div>
    <p className="note">Nur bestätigen, wenn das Geld wirklich auf dem Konto ist – mit Nachweis (z. B. Kontoauszug/Gutschrift). Nie PIN, TAN oder Passwörter eintragen.</p>
    <label>Eingangsdatum<input type="date" value={f.datum} onChange={e => setF({ ...f, datum: e.target.value })} /></label>
    <label>Zahlungsnachweis (z. B. „Kontoauszug 01.10., Verwendungszweck R-2026-001“)<input value={f.nachweis} onChange={e => setF({ ...f, nachweis: e.target.value })} /></label>
    <div className="modalActions"><button onClick={onClose}>Abbrechen</button><button className="primary" disabled={f.nachweis.trim().length < 5} onClick={() => onSave(f.datum, f.nachweis)}>Als bezahlt erfassen</button></div></div></div>;
}
function AngebotDialog({ l, onClose, onSave }) {
  const [f, setF] = useState({ text: l.angebot?.text || "", betrag: l.angebot?.betrag_cent ? String(l.angebot.betrag_cent / 100).replace(".", ",") : "" });
  const cent = euroZuCent(f.betrag);
  return <div className="modalBack"><div className="modal ldModal"><div className="modalHead"><h3>Angebot – {l.name}</h3><button onClick={onClose}>×</button></div>
    <p className="note">Nur echte Leistungen und einen Preis, den du wirklich anbieten willst. Ohne Betrag bleibt der Preis „noch zu prüfen“.</p>
    <label>Leistung und Umfang<textarea rows={4} value={f.text} onChange={e => setF({ ...f, text: e.target.value })} /></label>
    <label>Preis in € (optional)<input inputMode="decimal" value={f.betrag} onChange={e => setF({ ...f, betrag: e.target.value })} /></label>
    <div className="modalActions"><button onClick={onClose}>Abbrechen</button><button className="primary" disabled={!f.text.trim() || Number.isNaN(cent)} onClick={() => onSave(f.text, cent)}>Speichern</button></div></div></div>;
}
function KostenDialog({ eq, onClose, onSave }) {
  const [f, setF] = useState({ was: "", warum: "", betrag: "", rhythmus: "" });
  const cent = euroZuCent(f.betrag);
  return <div className="modalBack"><div className="modal ldModal"><div className="modalHead"><h3>Kosten vorschlagen – {eq.name}</h3><button onClick={onClose}>×</button></div>
    <p className="note">0-Euro-Modus bis zur ersten echten Einnahme. Danach werden Kosten nur vorgeschlagen – ausgegeben wird erst nach deiner Freigabe unter „Wartet auf mich“.</p>
    {[["was", "Was?"], ["warum", "Warum / welche Leistung wird erwartet?"], ["betrag", "Betrag in €"]].map(([k, l]) => <label key={k}>{l}<input value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} /></label>)}
    <label>Rhythmus<select value={f.rhythmus} onChange={e => setF({ ...f, rhythmus: e.target.value })}><option value="">— bitte wählen —</option><option>einmalig</option><option>monatlich</option><option>jährlich</option></select></label>
    <div className="modalActions"><button onClick={onClose}>Abbrechen</button><button className="primary" disabled={!cent || !f.was.trim() || !f.warum.trim() || !f.rhythmus} onClick={() => onSave({ was: f.was, warum: f.warum, betrag_cent: cent, rhythmus: f.rhythmus })}>Vorschlagen</button></div></div></div>;
}

const LD_CSS = `.ldKpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:6px;margin:10px 0}.ldKpis div{background:#fff;border:1px solid #eaecf0;border-radius:10px;padding:8px}.ldKpis span{display:block;font-size:11px;color:#667085}.ldKpis b{font-size:18px}
.ldEq{border-top:1px solid #f2f4f7;padding:10px 0;display:flex;flex-direction:column;gap:6px}.ldEqKopf{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}.ldEqKopf small{color:#667085}
.ldAblauf{display:flex;flex-wrap:wrap;gap:4px;list-style:none;padding:0;margin:0}.ldAblauf li{font-size:11px;padding:2px 7px;border-radius:999px;background:#f2f4f7;color:#98a2b3}.ldAblauf li.fertig{background:#ecfdf3;color:#067647}.ldAblauf li.jetzt{background:#101828;color:#fff;font-weight:700}
.ldFin{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:13px;align-items:center}.ldTab{width:100%;border-collapse:collapse;font-size:12px;display:block;overflow-x:auto}.ldTab th,.ldTab td{padding:5px 6px;border-top:1px solid #f2f4f7;text-align:left;vertical-align:top}
.ldFilter{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px}.ldFilter select{padding:7px;border:1px solid #d0d5dd;border-radius:8px;flex:1 1 150px;min-width:0;max-width:100%}.ldAktionen select{max-width:100%}
.ldKarte{border:1px solid #eaecf0;border-radius:12px;padding:12px;margin-top:10px;display:flex;flex-direction:column;gap:6px;min-width:0}.ldKarte.antwort{border-color:#fedf89;background:#fffcf5}
.ldKopf{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}.ldKopf small{display:block;color:#667085;font-size:12px;overflow-wrap:anywhere}.ldSt{font-size:12px;padding:3px 8px;border-radius:999px;background:#f2f4f7;height:fit-content}.ldSt.sKUNDE{background:#ecfdf3;color:#067647}.ldSt.sGESPERRT,.ldSt.sVERLOREN{color:#98a2b3}.ldSt.sANGEBOT,.ldSt.sINTERESSENT{background:#eff8ff;color:#175cd3}
.ldKontakt{margin:0;font-size:12px}.ldKontakt.ja{color:#067647}.ldKontakt.nein{color:#b42318}.ldNaechst,.ldZeile{margin:0;font-size:13px}
.ldAktionen{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.ldAktionen select{padding:6px;border:1px solid #d0d5dd;border-radius:7px}.ldAktionen a.editMini{text-decoration:none}.ldJa{background:#ecfdf3!important}
.ldDetails{border-top:1px solid #eaecf0;padding-top:8px;display:grid;gap:8px}.ldDetails p{margin:2px 0;font-size:13px}.ldDetails small{color:#667085}.ldDetails h4{margin:4px 0;font-size:13px}
.ldNachricht{border-left:3px solid #d0d5dd;padding:4px 8px;display:flex;flex-direction:column;gap:4px}.ldNachricht.rein{border-color:#fdb022;background:#fffcf5}.ldNachricht pre,.ldDetails pre{white-space:pre-wrap;font:inherit;font-size:13px;margin:0;overflow-wrap:anywhere}
.ldGrad{font-size:11px;padding:2px 8px;border-radius:999px;white-space:nowrap}.gMANUELL{background:#f2f4f7}.gKI_VORBEREITET{background:#eff8ff;color:#175cd3}.gAUTOMATISCH{background:#ecfdf3;color:#067647}.gFREIGABE{background:#fffaeb;color:#b54708}
.ldMeldung{font-size:14px}.ldModal{width:min(620px,100%);max-height:92vh;overflow:auto}.ldModal label{display:block;font-size:12px;font-weight:700;margin-top:10px}.ldModal input,.ldModal textarea,.ldModal select{display:block;width:100%;margin-top:4px;padding:9px;border:1px solid #d0d5dd;border-radius:7px;font:inherit}.ld .muted{color:#98a2b3;font-size:13px}`;
