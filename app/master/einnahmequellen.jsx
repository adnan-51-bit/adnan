"use client";

// Master-Zentrale: Einnahmequellen (27.09.2026). Getrennt von Werknetz24 und E-Commerce.
// Katalog nach Kategorien A-F, Arbeitsprioritaet (P1-P4, keine Erfolgsaussage), Quellen mit Datum + belegter
// Aussage, Automatisierungsplan (nur Vorschlaege), Ablauf Idee -> ... -> Skalieren mit echten Nachweisen
// (Regeln in lib/einnahmequellen-regeln.js, serverseitig erzwungen). Nichts wird geschaetzt.
import { useEffect, useState } from "react";
import { adminFetch, anmeldeUrl } from "../../lib/admin-fetch.js";
import { EQ_STATUS, EQ_LABEL, EQ_ABLAUF, EQ_GRUPPE, KATEGORIEN, kategorieName, NACHFRAGE, POTENZIAL, AUTO_STUFEN, PLAN_FELDER, pruefstand, gewinnCent, kundenAnzahl, leadsAnzahl, naechsteStufe, arbeitsPrioritaet } from "../../lib/einnahmequellen-regeln.js";
import { ENTWURF_ARTEN } from "../../lib/eq-automation.js";
const LEAD_STATUS = ["neu", "kontaktiert", "interessiert", "kunde", "verloren"];

const eur = c => ((c || 0) / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const eurOder = c => c === null || c === undefined ? "noch zu prüfen" : eur(c);
const zeit = t => t ? new Date(t).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" }) : "—";
const janein = v => v === true ? "ja" : v === false ? "nein" : "noch nicht bewertet";
const GRUPPEN = [["Aktive Einnahmequellen (echte Einnahmen)", EQ_GRUPPE.aktiv], ["Im Test / Aufbau", EQ_GRUPPE.test], ["Ideen zur Prüfung", EQ_GRUPPE.pruefung], ["Pause", EQ_GRUPPE.pause]];
const heute = () => new Date().toISOString().slice(0, 10);
// Feldtypen: Zahl > 1 = Textfeld mit Zeilen, "euro", "zahl", "kategorie", "enum:<Liste>", "bool", "boolnull"
const FELDER = [
  ["Grunddaten", [["name", "Name", 1], ["kategorie", "Kategorie", "kategorie"], ["beschreibung", "Beschreibung", 3], ["zielgruppe", "Zielkunden", 2], ["angebot", "Konkretes Angebot", 3], ["erloesart", "Mögliche Erlösart (z. B. Stundensatz, Pauschale, Provision)", 1], ["verweis", "Link zum Bereich (optional)", 1]]],
  ["Kosten & Aufwand (nur echte Werte, sonst leer = noch zu prüfen)", [["startkosten_cent", "Startkosten (€)", "euro"], ["laufende_kosten_cent", "Laufende Kosten pro Monat (€)", "euro"], ["werkzeuge", "Benötigte Werkzeuge", 2], ["faehigkeiten", "Benötigte Fähigkeiten", 2], ["aufwand", "Startaufwand", 2]]],
  ["Nachfrage & Prüfung", [["nachfrage_status", "Nachfrage", "enum:NACHFRAGE"], ["markt", "1. Markt", 3], ["nachfrage", "2. Nachfrage (Beleg)", 3], ["konkurrenz", "3. Konkurrenz", 3], ["kosten_pruefung", "4. Kosten", 3], ["rechtliches", "5. Rechtliche Voraussetzungen", 3], ["rechtspruefung", "Rechtliche Prüfung erforderlich?", "boolnull"], ["gewerbepruefung", "Gewerbe/steuerliche Prüfung erforderlich?", "boolnull"], ["kostenloser_test", "6. Kostenloser Test (wie?)", 3], ["quellen", "Weitere Quellen (Freitext; besser: Knopf „Quelle hinzufügen“)", 2]]],
  ["Arbeitspriorität (intern, keine Erfolgsaussage)", [["schnell_testbar", "Schnell testbar?", "bool"], ["direkte_kunden", "Direkte potenzielle Kunden ansprechbar?", "bool"], ["wiederholbar", "Wiederholbar (gleiche Leistung mehrfach verkaufbar)?", "bool"], ["komplex", "Rechtlich oder technisch komplex?", "bool"]]],
  ["Steuerung", [["naechste_aufgabe", "Nächste konkrete Aufgabe", 2], ["schritte", "Benötigte Schritte", 4], ["verantwortlich", "Verantwortlich / Agent", 1], ["benoetigte_konten", "Benötigte Konten (z. B. TikTok, Google – nur Namen, nie Passwörter)", 2], ["benutzeraktion", "Benötigte Benutzeraktion (nur was Adnan selbst tun muss)", 2], ["risiken", "Risiken", 3]]],
  ["Test, Veröffentlichung & Ergebnisse", [["test_status", "Teststatus", 2], ["interesse_nachweis", "Interesse-Nachweis (wer/was/wann – nur echte Belege)", 3], ["veroeffentlichung", "Veröffentlichung: wo und wann? (Nachweis für die Stufe „Veröffentlichung“)", 2], ["ergebnisse", "Ergebnisse (nur Tatsachen, z. B. Aufrufe laut App, Rückmeldungen)", 3]]],
  ["Geld (nur echte Werte – Einnahmen/Ausgaben kommen seit 27.09.2026 aus den Buchungen unter „E-Mail & Leads“)", [["preis", "Möglicher Preis (nur mit Quelle)", 2], ["moegliche_einnahmen", "Mögliche Einnahmen (nur mit Quelle, sonst „noch zu prüfen“)", 2], ["erste_kunden", "Kunden (Anzahl, falls nicht über „Kunde zuordnen“)", "zahl"]]],
  ["Automatisierung", [["automatisierungsstufe", "Aktueller Stand", "enum:AUTO_STUFEN"], ["automatisierungspotenzial", "Automatisierungspotenzial", "enum:POTENZIAL"], ["skalierungspotenzial", "Skalierungspotenzial", "enum:POTENZIAL"], ["automatisierungsgrad", "Automatisierungsgrad (0–100 %)", "zahl"], ["automatisierung", "Was läuft schon automatisch?", 3]]],
  ["Notizen", [["notiz", "Notizen", 3]]],
];
const ALLE_FELDER = FELDER.flatMap(([, f]) => f);
const ENUM_LISTEN = { NACHFRAGE, POTENZIAL, AUTO_STUFEN };
const NAV = [["/master?tab=tasks", "Aufgaben"], ["#eq-kunden", "Kunden"], ["/master?tab=audit", "Aktivitäten"], ["/master?tab=automation", "Automatisierungen"], ["/master?tab=heute", "Tagesbericht"], ["/werknetz24", "Werknetz24"], ["/e-commerce", "E-Commerce (pausiert)"]];

export function Einnahmequellen() {
  const [daten, setDaten] = useState(null);
  const [gesperrt, setGesperrt] = useState(false);
  const [edit, setEdit] = useState(null);
  const [dialog, setDialog] = useState(null); // { art: "aufgabe"|"kunde"|"quelle"|"plan", q }
  const [offen, setOffen] = useState({});
  const [meldung, setMeldung] = useState("");
  const [ansicht, setAnsicht] = useState("katalog");
  const laden = () => adminFetch("/api/master/businesses?einnahmequellen=1").then(async r => { if (r.status === 401) { setGesperrt(true); setDaten({ einnahmequellen: [] }); return; } setDaten(await r.json()); }).catch(() => setDaten({ einnahmequellen: [], fehler: true }));
  useEffect(() => { laden(); }, []);

  async function senden(body, erfolg) {
    setMeldung("");
    const r = await adminFetch("/api/master/businesses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setMeldung("❌ " + (j.error || "Fehler " + r.status)); return false; }
    setMeldung("✅ " + erfolg + (j.neu ? ` (${j.neu.length} neu, ${j.uebersprungen} schon vorhanden)` : "")); laden(); if (body.id && offen[body.id]) ladeDetails(body.id); return j;
  }
  async function ladeDetails(id) {
    const r = await adminFetch("/api/master/businesses?einnahmequellen=1&id=" + encodeURIComponent(id));
    const j = r.ok ? await r.json() : { aufgaben: [], verlauf: [], fehler: true };
    setOffen(o => ({ ...o, [id]: j }));
  }
  const umschalten = id => offen[id] ? setOffen(o => { const n = { ...o }; delete n[id]; return n; }) : ladeDetails(id);

  const liste = [...(daten?.einnahmequellen || [])].sort((a, b) => arbeitsPrioritaet(a).stufe - arbeitsPrioritaet(b).stufe);
  const u = daten?.uebersicht || { aktiv: 0, test: 0, pruefung: 0, pause: 0, kosten_cent: 0, einnahmen_cent: 0, gewinn_cent: 0 };
  const karte = q => <Karte key={q.id} q={q} details={offen[q.id]} onDetails={() => umschalten(q.id)} onEdit={() => setEdit(q)} onDialog={(art, extra) => setDialog({ art, q, extra })} senden={senden} />;
  const kunden = liste.flatMap(q => (Array.isArray(q.kunden) ? q.kunden : []).map(k => ({ ...k, eq: q.name })));
  return <div className="eq">
    <div className="pageTitle"><div><span>GESCHÄFTSBEREICHE</span><h2>Einnahmequellen</h2></div><div className="quick"><button className="editMini" disabled={gesperrt} onClick={async () => { const r = await adminFetch("/api/master/businesses?eqreport=1"); const j = r.ok ? await r.json() : null; if (j?.report) setDialog({ art: "report", extra: j.report }); }}>Report</button><button className="editMini" disabled={gesperrt} onClick={async () => { setMeldung("⏳ Wiederkehrende Prüfungen laufen …"); const r = await adminFetch("/api/master/businesses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "aktion-ausfuehren", id: "wiederkehrende-pruefungen" }) }); const j = await r.json().catch(() => ({})); setMeldung((r.ok ? "✅ " : "❌ ") + (j.zusammenfassung || j.fehler || j.error || "HTTP " + r.status) + " – Details unter Automatisierungen."); laden(); }}>Prüfungen jetzt ausführen</button><button className="primaryLink" onClick={() => setEdit({})} disabled={gesperrt}>+ Einnahmequelle</button></div></div>
    <nav className="eqNav" aria-label="Zentrale Steuerung">{NAV.map(([h, l]) => <a key={h} href={h}>{l}</a>)}</nav>
    <p className="note">Zuerst Einnahmequellen ohne neue Kosten. Markt, Nachfrage und mögliche Einnahmen gelten als <b>„noch zu prüfen“</b>, solange keine Quelle mit Datum vorliegt. Die Arbeitspriorität (P1–P4) ist nur unsere interne Reihenfolge – keine Aussage über Erfolgschancen.</p>
    {gesperrt && <div className="panel">Einnahmequellen sind nur mit Anmeldung sichtbar. <a href={anmeldeUrl()}>⎆ Anmelden</a></div>}
    {meldung && <div className="panel eqMeldung">{meldung}</div>}
    <div className="kpis eqKpis">
      {[["Aktive Einnahmequellen", u.aktiv], ["Im kostenlosen Test", u.test], ["Ideen zur Prüfung", u.pruefung], ["Pause", u.pause], ["Kosten", eur(u.kosten_cent)], ["Einnahmen", eur(u.einnahmen_cent)], ["Gewinn", eur(u.gewinn_cent)]].map(([l, v]) =>
        <div className="kpi" key={l}><span>{l}</span><strong>{daten ? v : "…"}</strong></div>)}
    </div>
    <div className="eqAnsicht" role="tablist">{[["katalog", "Katalog nach Kategorie"], ["status", "Nach Status"]].map(([k, l]) => <button key={k} role="tab" aria-selected={ansicht === k} className={ansicht === k ? "an" : ""} onClick={() => setAnsicht(k)}>{l}</button>)}</div>
    {ansicht === "katalog" ? <>
      {KATEGORIEN.map(([code, name]) => { const g = liste.filter(q => q.kategorie === code); return <section className="panel" key={code}><h3>{code}) {name} ({code === "F" ? "eigener Bereich" : g.length})</h3>
        {code === "F" ? <a className="eqF" href="/werknetz24"><strong>Werknetz24 → eigener Bereich</strong><small>Technisch getrennt von allen anderen Einnahmequellen. Lisa/Telefonassistent bleibt unverändert – hier nur der Sprung dorthin.</small></a>
          : !g.length ? <p className="muted">— noch keine Einnahmequelle in dieser Kategorie —</p> : g.map(karte)}
      </section>; })}
      {(() => { const rest = liste.filter(q => !kategorieName(q.kategorie)); return rest.length ? <section className="panel"><h3>Weitere ({rest.length})</h3>{rest.map(karte)}</section> : null; })()}
    </> : GRUPPEN.map(([titel, st]) => { const g = liste.filter(q => st.includes(q.status)); return <section className="panel" key={titel}><h3>{titel} ({g.length})</h3>
      {!g.length && <p className="muted">— keine —</p>}{g.map(karte)}
    </section>; })}
    <section className="panel" id="eq-kunden"><h3>Kunden der Einnahmequellen ({kunden.length})</h3>
      {!kunden.length ? <p className="muted">Noch keine echten Kunden zugeordnet. (Werknetz24- und E-Commerce-Kunden stehen getrennt in ihren eigenen Bereichen.)</p>
        : kunden.map((k, i) => <p key={i} className="eqKunde">• <b>{k.name}</b> <small>{k.eq} · seit {k.seit}{k.kontakt ? " · " + k.kontakt : ""}</small></p>)}
    </section>
    {edit && <EqFormular q={edit} onClose={() => setEdit(null)} onSave={async werte => { if (await senden(edit.id ? { action: "einnahmequelle-aendern", id: edit.id, ...werte } : { action: "einnahmequelle-anlegen", ...werte }, edit.id ? "Gespeichert" : "Angelegt")) setEdit(null); }} />}
    {dialog?.art === "aufgabe" && <AufgabeDialog q={dialog.q} onClose={() => setDialog(null)} onSave={async a => { if (await senden({ action: "einnahmequelle-aufgabe", id: dialog.q.id, ...a }, "Aufgabe erzeugt – steht auch in der zentralen Aufgabenliste")) setDialog(null); }} />}
    {dialog?.art === "kunde" && <KundeDialog q={dialog.q} onClose={() => setDialog(null)} onSave={async k => { if (await senden({ action: "einnahmequelle-kunde", id: dialog.q.id, kunde: k }, "Kunde zugeordnet")) setDialog(null); }} />}
    {dialog?.art === "lead" && <LeadDialog q={dialog.q} onClose={() => setDialog(null)} onSave={async l => { if (await senden({ action: "einnahmequelle-lead", id: dialog.q.id, lead: l }, "Lead erfasst – Nachfass-Aufgabe in 3 Tagen angelegt")) setDialog(null); }} />}
    {dialog?.art === "entwurf" && <TextDialog titel={dialog.extra.titel} hinweis={dialog.extra.hinweis} text={dialog.extra.text} onClose={() => setDialog(null)} />}
    {dialog?.art === "report" && <TextDialog titel={dialog.extra.titel} hinweis="Aus den gespeicherten Daten erzeugt – keine geschätzten Zahlen." text={dialog.extra.text} onClose={() => setDialog(null)} />}
    {dialog?.art === "quelle" && <QuelleDialog q={dialog.q} onClose={() => setDialog(null)} onSave={async x => { if (await senden({ action: "einnahmequelle-quelle", id: dialog.q.id, quelle: x }, "Quelle gespeichert")) setDialog(null); }} />}
    {dialog?.art === "plan" && <PlanDialog q={dialog.q} onClose={() => setDialog(null)} onSave={async x => { if (await senden({ action: "einnahmequelle-plan", id: dialog.q.id, vorschlag: x }, "Vorschlag gespeichert – nichts wurde aktiviert")) setDialog(null); }} />}
    <style dangerouslySetInnerHTML={{ __html: EQ_CSS }} />
  </div>;
}

function Karte({ q, details, onDetails, onEdit, onDialog, senden }) {
  const ps = pruefstand(q); const ok = ps.filter(x => x.ok).length;
  const pausiert = q.status === "PAUSE";
  const stufe = EQ_ABLAUF.indexOf(pausiert ? q.status_vor_pause : q.status);
  const naechste = naechsteStufe(q);
  const prio = arbeitsPrioritaet(q);
  const autoStufen = Object.keys(AUTO_STUFEN); const autoIdx = autoStufen.indexOf(q.automatisierungsstufe || "MANUELL");
  const quellen = Array.isArray(q.quellen_liste) ? q.quellen_liste : [];
  const plan = Array.isArray(q.automatisierungsplan) ? q.automatisierungsplan : [];
  return <article className="eqKarte">
    <div className="eqKopf"><div><strong>{q.name}</strong><small>{kategorieName(q.kategorie) ? q.kategorie + ") " + kategorieName(q.kategorie) : q.kategorie}{q.zielgruppe ? " · Zielkunden: " + q.zielgruppe : ""}</small></div>
      <div className="eqBadges"><b className={"eqPrio p" + prio.stufe} title={"Interne Arbeitspriorität, keine Erfolgsaussage: " + prio.gruende.join(", ")}>P{prio.stufe}</b><b className={"eqSt eq" + q.status}>{EQ_LABEL[q.status]}</b></div></div>
    <small className="eqPrioGrund">Arbeitspriorität P{prio.stufe}: {prio.gruende.join(", ") || "—"} (intern, keine Erfolgsaussage)</small>
    <ol className="eqAblauf" aria-label="Ablauf">{EQ_ABLAUF.map((s, i) => <li key={s} className={i < stufe ? "fertig" : i === stufe ? "jetzt" : ""}>{EQ_LABEL[s]}</li>)}</ol>
    {(q.beschreibung || q.angebot) && <p>{q.beschreibung || q.angebot}</p>}
    <dl className="eqDaten">
      <dt>Nachfrage</dt><dd className={q.nachfrage_status === "BELEGT" ? "ja" : "offen"}>{NACHFRAGE[q.nachfrage_status || "UNBEKANNT"]}{q.nachfrage_status !== "BELEGT" ? " – noch zu prüfen" : ""}</dd>
      <dt>Startkosten</dt><dd>{eurOder(q.startkosten_cent)}</dd><dt>Laufende Kosten</dt><dd>{eurOder(q.laufende_kosten_cent)}{q.laufende_kosten_cent != null ? " / Monat" : ""}</dd>
      <dt>Mögliche Erlösart</dt><dd>{q.erloesart || "noch zu prüfen"}</dd><dt>Mögliche Einnahmen</dt><dd>{q.moegliche_einnahmen || "noch zu prüfen"}</dd>
      <dt>Werkzeuge</dt><dd>{q.werkzeuge || "—"}</dd><dt>Fähigkeiten</dt><dd>{q.faehigkeiten || "—"}</dd><dt>Startaufwand</dt><dd>{q.aufwand || "—"}</dd>
      <dt>Rechtliche Prüfung nötig</dt><dd>{janein(q.rechtspruefung)}</dd><dt>Gewerbe/Steuer prüfen</dt><dd>{janein(q.gewerbepruefung)}</dd>
      <dt>Nächste Aufgabe</dt><dd><b>{q.naechste_aufgabe || "—"}</b></dd><dt>Verantwortlich</dt><dd>{q.verantwortlich || "—"}</dd>
      <dt>Benötigte Konten</dt><dd>{q.benoetigte_konten || "—"}</dd><dt>Veröffentlichung</dt><dd>{q.veroeffentlichung || "—"}</dd><dt>Ergebnisse</dt><dd>{q.ergebnisse || "—"}</dd>
      <dt>Quelle/Link</dt><dd>{(q.quellen_liste || []).length ? <a href={q.quellen_liste[0].url} target="_blank" rel="noreferrer">{q.quellen_liste[0].quelle}</a> : "—"}{(q.quellen_liste || []).length > 1 ? ` (+${q.quellen_liste.length - 1})` : ""}</dd>
      <dt>Zahlen (echt)</dt><dd>Leads {leadsAnzahl(q)} · Kunden {kundenAnzahl(q)} · Einnahmen {eur(q.einnahmen_cent)} · Ausgaben {eur(q.kosten_cent)} · Gewinn <b>{eur(gewinnCent(q))}</b></dd>
    </dl>
    <div className="eqAuto"><span>Automatisierung:</span><ol>{autoStufen.map((s, i) => <li key={s} className={i < autoIdx ? "fertig" : i === autoIdx ? "jetzt" : ""}>{AUTO_STUFEN[s]}</li>)}</ol><small>Potenzial: Automatisierung {POTENZIAL[q.automatisierungspotenzial || "UNBEKANNT"]} · Skalierung {POTENZIAL[q.skalierungspotenzial || "UNBEKANNT"]}</small></div>
    <div className="eqPruef">Prüfstand {ok}/{ps.length}: {ps.map(x => <i key={x.id} className={x.ok ? "ja" : "nein"} title={x.text}>{x.ok ? "✓" : "✗"} {x.text}</i>)}</div>
    {q.benutzeraktion && <p className="eqAktion">👤 Benutzeraktion: {q.benutzeraktion}</p>}
    {q.risiken && <p className="eqRecht">⚠️ Risiken: {q.risiken}</p>}
    {q.rechtliches && <p className="eqRecht">⚖️ {q.rechtliches}</p>}
    <div className="eqAktionen">
      <button className="editMini" onClick={onEdit}>Bearbeiten</button>
      <button className="editMini" onClick={() => onDialog("aufgabe")}>Aufgabe erzeugen</button>
      <button className="editMini" onClick={() => onDialog("lead")}>Lead erfassen</button>
      <button className="editMini" onClick={() => onDialog("kunde")}>Kunde zuordnen</button>
      <select defaultValue="" aria-label="Automatik" className="eqAuto2" onChange={async e => { const a = e.target.value; e.target.value = ""; if (!a) return; if (a === "schritte") { await senden({ action: "einnahmequelle-schritte", id: q.id }, "Aufgaben aus „Benötigte Schritte“ erzeugt"); return; } const r = await senden({ action: "einnahmequelle-entwurf", id: q.id, art: a }, ENTWURF_ARTEN[a] + " erzeugt"); if (r?.entwurf) onDialog("entwurf", r.entwurf); }}>
        <option value="">⚙ Automatik …</option>{Object.entries(ENTWURF_ARTEN).map(([k, l]) => <option key={k} value={k}>{l} erzeugen</option>)}<option value="schritte">Aufgaben aus „Benötigte Schritte“</option></select>
      <button className="editMini" onClick={() => onDialog("quelle")}>Quelle hinzufügen</button>
      <button className="editMini" onClick={() => onDialog("plan")}>Automatisierung vorschlagen</button>
      <button className="editMini" onClick={() => senden({ action: "einnahmequelle-status", id: q.id, status: "AUTOMATISIERT" }, "Status „Automatisiert“")} disabled={pausiert}>Automatisieren</button>
      <button className="editMini" onClick={() => senden({ action: "einnahmequelle-status", id: q.id, status: "SKALIEREN" }, "Status „Skalieren“")} disabled={pausiert}>Skalieren</button>
      {pausiert ? <button className="editMini eqStart" onClick={() => senden({ action: "einnahmequelle-start", id: q.id }, "Gestartet")}>▶ Start</button>
        : <button className="editMini" onClick={() => senden({ action: "einnahmequelle-stop", id: q.id }, "Gestoppt (Pause)")}>■ Stop</button>}
      {naechste && !pausiert && <button className="editMini" onClick={() => senden({ action: "einnahmequelle-status", id: q.id, status: naechste }, `Status „${EQ_LABEL[naechste]}“`)}>Weiter: {EQ_LABEL[naechste]}</button>}
      <select defaultValue="" aria-label="Status ändern" onChange={async e => { const z = e.target.value; e.target.value = ""; if (z) await senden({ action: "einnahmequelle-status", id: q.id, status: z }, `Status „${EQ_LABEL[z]}“`); }}>
        <option value="">Status ändern …</option>{EQ_STATUS.filter(s => s !== q.status).map(s => <option key={s} value={s}>{EQ_LABEL[s]}</option>)}</select>
      <button className="editMini" onClick={onDetails}>{details ? "Details schließen" : "Quellen, Aufgaben & Verlauf"}</button>
      {q.verweis && <a href={q.verweis}>Zum Bereich →</a>}
    </div>
    {details && <div className="eqDetails">
      <div><h4>Quellen ({quellen.length})</h4>{!quellen.length ? <p className="muted">Noch keine Quelle mit Datum – Aussagen gelten als „noch zu prüfen“.</p> : quellen.map((x, i) => <p key={i}>• <a href={x.url} target="_blank" rel="noreferrer">{x.quelle}</a> <small>({x.datum})</small> – belegt: {x.aussage}</p>)}</div>
      <div><h4>Automatisierungsplan ({plan.length})</h4>{!plan.length ? <p className="muted">Noch kein Vorschlag. Vorschläge werden nie automatisch aktiviert.</p> : plan.map((x, i) => <div key={i} className="eqPlan"><b>{x.was}</b><small>Daten: {x.daten} · Tool: {x.tool} · Kosten: {x.kosten} · Risiko: {x.risiko} · Freigabe nötig: {x.freigabe ? "ja" : "nein"} · Status: {x.status}</small></div>)}</div>
      <div><h4>Aufgaben ({details.aufgaben?.length || 0}) <a href="/master?tab=tasks">zentrale Liste →</a></h4>{!details.aufgaben?.length ? <p className="muted">Noch keine Aufgabe erzeugt.</p> : details.aufgaben.map(t => <p key={t.id}>• {t.title} <small>({t.status} · {t.priority}{t.naechste_aktion ? " · nächste Aktion: " + t.naechste_aktion : ""})</small></p>)}</div>
      <div><h4>Leads ({leadsAnzahl(q)})</h4>{!leadsAnzahl(q) ? <p className="muted">Noch keine Leads. „Lead erfassen“ legt automatisch eine Nachfass-Aufgabe an.</p> : q.leads.map((l, i) => <p key={i} className="eqLead">• <b>{l.name}</b> <small>{l.kontakt || "—"} · Quelle: {l.quelle || "—"} · Einwilligung: {l.einwilligung ? "ja" : "nein"}</small>
        <select value={l.status} aria-label={"Status " + l.name} onChange={e => senden({ action: "einnahmequelle-lead-status", id: q.id, index: i, status: e.target.value }, "Lead-Status gespeichert")}>{LEAD_STATUS.map(x => <option key={x}>{x}</option>)}</select></p>)}</div>
      <div><h4>Entwürfe ({(q.entwuerfe || []).length})</h4>{!(q.entwuerfe || []).length ? <p className="muted">Noch keine. Über „⚙ Automatik“ erzeugen (kostenlos, Vorlagen).</p> : q.entwuerfe.map((x, i) => <details key={i} className="eqEntwurf"><summary>{x.titel} <small>{zeit(x.erstellt_am)}</small></summary><pre>{x.text}</pre><button className="editMini" onClick={() => navigator.clipboard?.writeText(x.text)}>Kopieren</button></details>)}</div>
      {Array.isArray(q.kunden) && q.kunden.length > 0 && <div><h4>Kunden ({q.kunden.length})</h4>{q.kunden.map((k, i) => <p key={i}>• {k.name} <small>seit {k.seit}{k.notiz ? " · " + k.notiz : ""}</small></p>)}</div>}
      {q.schritte && <div><h4>Benötigte Schritte</h4><p className="eqPre">{q.schritte}</p></div>}
      <div><h4>Aktivitätsverlauf</h4>{!details.verlauf?.length ? <p className="muted">Noch keine Einträge.</p> : details.verlauf.map(v => <p key={v.id}><small>{zeit(v.created_at)}</small> {verlaufText(v)}</p>)}</div>
    </div>}
  </article>;
}

function verlaufText(v) {
  const d = v.details || {};
  switch (v.action) {
    case "einnahmequelle.created": return "Angelegt";
    case "einnahmequelle.updated": return "Bearbeitet: " + (d.felder || (Array.isArray(d) ? d : [])).join(", ");
    case "einnahmequelle.status": return `Status ${EQ_LABEL[d.von] || d.von} → ${EQ_LABEL[d.nach] || d.nach}`;
    case "einnahmequelle.kunde": return `Kunde zugeordnet: ${d.kunde} (jetzt ${d.anzahl})`;
    case "einnahmequelle.aufgabe": return `Aufgabe erzeugt: ${d.aufgabe}`;
    case "einnahmequelle.quelle": return `Quelle hinzugefügt: ${d.quelle}`;
    case "einnahmequelle.lead": return `Lead erfasst: ${d.lead} (Nachfass-Aufgabe angelegt)`;
    case "einnahmequelle.lead_status": return `Lead ${d.lead}: ${d.von} → ${d.nach}`;
    case "einnahmequelle.entwurf": return `Entwurf erzeugt: ${d.titel}`;
    case "einnahmequelle.aufgaben_aus_schritten": return `Aufgaben aus Schritten: ${d.neu} neu`;
    case "einnahmequelle.plan": return `Automatisierung vorgeschlagen: ${d.was} (Kosten: ${d.kosten})`;
    default: return v.action;
  }
}

function Modal({ titel, hinweis, children, onClose, onSave, bereit, knopf }) {
  return <div className="modalBack"><div className="modal eqModal"><div className="modalHead"><h3>{titel}</h3><button onClick={onClose}>×</button></div>
    {hinweis && <p className="note">{hinweis}</p>}{children}
    <div className="modalActions"><button onClick={onClose}>Abbrechen</button><button className="primary" disabled={!bereit} onClick={onSave}>{knopf}</button></div>
  </div></div>;
}
const Feld = ({ l, v, on, rows, typ }) => <label>{l}{rows ? <textarea rows={rows} value={v} onChange={e => on(e.target.value)} /> : <input type={typ || "text"} value={v} onChange={e => on(e.target.value)} />}</label>;

function AufgabeDialog({ q, onClose, onSave }) {
  const [f, setF] = useState({ title: q.naechste_aufgabe || "", beschreibung: "", naechste_aktion: "", quelle: "", priority: "Mittel", due_at: "" });
  const s = k => v => setF({ ...f, [k]: v });
  return <Modal titel={"Aufgabe erzeugen – " + q.name} hinweis="Die Aufgabe erscheint in der zentralen Aufgabenliste und im Verlauf dieser Einnahmequelle." onClose={onClose} bereit={f.title.trim()} knopf="Erzeugen"
    onSave={() => onSave({ ...f, due_at: f.due_at ? new Date(f.due_at + "T12:00:00").toISOString() : null })}>
    <Feld l="Titel" v={f.title} on={s("title")} /><Feld l="Beschreibung" v={f.beschreibung} on={s("beschreibung")} rows={3} /><Feld l="Nächste Aktion" v={f.naechste_aktion} on={s("naechste_aktion")} rows={2} />
    <Feld l="Quelle (Link oder Beleg, optional)" v={f.quelle} on={s("quelle")} />
    <label>Priorität<select value={f.priority} onChange={e => s("priority")(e.target.value)}>{["Hoch", "Mittel", "Niedrig"].map(p => <option key={p}>{p}</option>)}</select></label>
    <Feld l="Fällig am (optional)" v={f.due_at} on={s("due_at")} typ="date" />
  </Modal>;
}

function KundeDialog({ q, onClose, onSave }) {
  const [f, setF] = useState({ name: "", kontakt: "", seit: heute(), notiz: "" });
  const s = k => v => setF({ ...f, [k]: v });
  return <Modal titel={"Kunde zuordnen – " + q.name} hinweis="Nur echte Kunden eintragen. Diese Liste gehört nur zu dieser Einnahmequelle – getrennt von Werknetz24- und E-Commerce-Kunden." onClose={onClose} bereit={f.name.trim()} knopf="Zuordnen" onSave={() => onSave(f)}>
    <Feld l="Name / Firma" v={f.name} on={s("name")} /><Feld l="Kontakt (optional)" v={f.kontakt} on={s("kontakt")} /><Feld l="Kunde seit" v={f.seit} on={s("seit")} typ="date" /><Feld l="Notiz (optional)" v={f.notiz} on={s("notiz")} rows={2} />
  </Modal>;
}

function LeadDialog({ q, onClose, onSave }) {
  const [f, setF] = useState({ name: "", kontakt: "", quelle: "", einwilligung: "", notiz: "" });
  const s = k => v => setF({ ...f, [k]: v });
  return <Modal titel={"Lead erfassen – " + q.name} hinweis="Nur echte Kontakte (z. B. jemand hat selbst angefragt oder kommentiert). Werbung darf nur mit Einwilligung geschickt werden (UWG § 7)." onClose={onClose} bereit={f.name.trim() && f.einwilligung !== ""} knopf="Erfassen" onSave={() => onSave({ ...f, einwilligung: f.einwilligung === "ja" })}>
    <Feld l="Name / Firma" v={f.name} on={s("name")} /><Feld l="Kontakt (optional)" v={f.kontakt} on={s("kontakt")} /><Feld l="Woher kommt der Lead? (z. B. Kommentar unter Video 3)" v={f.quelle} on={s("quelle")} />
    <label>Einwilligung zur Kontaktaufnahme?<select value={f.einwilligung} onChange={e => s("einwilligung")(e.target.value)}><option value="">— bitte wählen —</option><option value="ja">ja</option><option value="nein">nein</option></select></label>
    <Feld l="Notiz (optional)" v={f.notiz} on={s("notiz")} rows={2} />
  </Modal>;
}

function TextDialog({ titel, hinweis, text, onClose }) {
  return <div className="modalBack"><div className="modal eqModal"><div className="modalHead"><h3>{titel}</h3><button onClick={onClose}>×</button></div>
    {hinweis && <p className="note">{hinweis}</p>}<pre className="eqText">{text}</pre>
    <div className="modalActions"><button onClick={() => navigator.clipboard?.writeText(text)}>Kopieren</button><button className="primary" onClick={onClose}>Schließen</button></div>
  </div></div>;
}

function QuelleDialog({ q, onClose, onSave }) {
  const [f, setF] = useState({ quelle: "", url: "", datum: heute(), aussage: "" });
  const s = k => v => setF({ ...f, [k]: v });
  return <Modal titel={"Quelle hinzufügen – " + q.name} hinweis="Pflicht: Name der Quelle, Link, Datum der Recherche und welche Aussage sie konkret belegt. Keine erfundenen Zahlen." onClose={onClose}
    bereit={f.quelle.trim() && /^https?:\/\//.test(f.url) && f.aussage.trim()} knopf="Speichern" onSave={() => onSave(f)}>
    <Feld l="Quelle (z. B. Gesetz, Behörde, Anbieter)" v={f.quelle} on={s("quelle")} /><Feld l="URL" v={f.url} on={s("url")} /><Feld l="Datum der Recherche" v={f.datum} on={s("datum")} typ="date" /><Feld l="Welche Aussage belegt die Quelle?" v={f.aussage} on={s("aussage")} rows={3} />
  </Modal>;
}

function PlanDialog({ q, onClose, onSave }) {
  const [f, setF] = useState({ was: "", daten: "", tool: "", kosten: "", risiko: "", freigabe: "" });
  const s = k => v => setF({ ...f, [k]: v });
  return <Modal titel={"Automatisierung vorschlagen – " + q.name} hinweis="Nur ein Vorschlag – es wird nichts aktiviert. Kostet es Geld, ist deine Freigabe immer nötig." onClose={onClose}
    bereit={PLAN_FELDER.every(([k]) => f[k].trim()) && f.freigabe !== ""} knopf="Vorschlag speichern" onSave={() => onSave({ ...f, freigabe: f.freigabe === "ja" })}>
    {PLAN_FELDER.map(([k, l]) => <Feld key={k} l={l} v={f[k]} on={s(k)} rows={k === "was" || k === "risiko" ? 2 : 0} />)}
    <label>Benutzerfreigabe notwendig?<select value={f.freigabe} onChange={e => s("freigabe")(e.target.value)}><option value="">— bitte wählen —</option><option value="ja">ja</option><option value="nein">nein</option></select></label>
  </Modal>;
}

function EqFormular({ q, onClose, onSave }) {
  const start = Object.fromEntries(ALLE_FELDER.map(([k, , t]) => [k,
    t === "euro" ? (Number.isInteger(q[k]) ? (q[k] / 100).toFixed(2).replace(".", ",") : "")
      : t === "zahl" ? String(q[k] ?? 0) : t === "bool" ? (q[k] ? "ja" : "nein") : t === "boolnull" ? (q[k] === true ? "ja" : q[k] === false ? "nein" : "")
        : typeof t === "string" && t.startsWith("enum:") ? (q[k] || Object.keys(ENUM_LISTEN[t.slice(5)])[0]) : (q[k] ?? "")]));
  const [f, setF] = useState(start);
  const leerCent = k => k === "startkosten_cent" || k === "laufende_kosten_cent" ? null : 0;
  const werte = () => Object.fromEntries(ALLE_FELDER.map(([k, , t]) => [k,
    t === "euro" ? (f[k] === "" ? leerCent(k) : Math.round(Number(String(f[k]).replace(",", ".")) * 100))
      : t === "zahl" ? parseInt(f[k] || "0", 10) : t === "bool" ? f[k] === "ja" : t === "boolnull" ? (f[k] === "" ? null : f[k] === "ja") : f[k]]));
  const eingabe = (k, t) => {
    const set = v => setF({ ...f, [k]: v });
    if (typeof t === "number" && t > 1) return <textarea rows={t} value={f[k]} onChange={e => set(e.target.value)} />;
    if (t === "kategorie") return <select value={f[k]} onChange={e => set(e.target.value)}><option value="">— ohne —</option>{KATEGORIEN.filter(([c]) => c !== "F").map(([c, n]) => <option key={c} value={c}>{c}) {n}</option>)}{f[k] && !kategorieName(f[k]) && <option value={f[k]}>{f[k]}</option>}</select>;
    if (t === "bool") return <select value={f[k]} onChange={e => set(e.target.value)}><option value="nein">nein</option><option value="ja">ja</option></select>;
    if (t === "boolnull") return <select value={f[k]} onChange={e => set(e.target.value)}><option value="">noch nicht bewertet</option><option value="ja">ja</option><option value="nein">nein</option></select>;
    if (typeof t === "string" && t.startsWith("enum:")) { const l = ENUM_LISTEN[t.slice(5)]; return <select value={f[k]} onChange={e => set(e.target.value)}>{Object.entries(l).map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select>; }
    return <input inputMode={t === "euro" ? "decimal" : t === "zahl" ? "numeric" : undefined} value={f[k]} onChange={e => set(e.target.value)} />;
  };
  return <div className="modalBack"><div className="modal eqModal"><div className="modalHead"><h3>{q.id ? "Einnahmequelle bearbeiten" : "Neue Einnahmequelle"}</h3><button onClick={onClose}>×</button></div>
    <p className="note">Nur echte, überprüfbare Angaben. Unbekanntes leer lassen – es wird als „noch zu prüfen“ angezeigt. „Nachfrage: belegt“ geht nur mit gespeicherter Quelle. Der Status wird separat geändert.</p>
    {FELDER.map(([gruppe, felder]) => <fieldset key={gruppe}><legend>{gruppe}</legend>{felder.map(([k, l, t]) => <label key={k}>{l}{eingabe(k, t)}</label>)}</fieldset>)}
    <div className="modalActions"><button onClick={onClose}>Abbrechen</button><button className="primary" disabled={!String(f.name).trim()} onClick={() => onSave(werte())}>Speichern</button></div>
  </div></div>;
}

const EQ_CSS = `.eqKpis{grid-template-columns:repeat(auto-fit,minmax(140px,1fr))}.eqKarte{border:1px solid #eaecf0;border-radius:12px;padding:14px;margin-top:12px;display:flex;flex-direction:column;gap:8px;min-width:0}
.eqNav{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}.eqNav a{font-size:12px;padding:5px 10px;border:1px solid #eaecf0;border-radius:999px;background:#fff;color:#344054;text-decoration:none}.eqNav a:hover{border-color:#98a2b3}
.eqAnsicht{display:flex;gap:6px;margin:12px 0 0}.eqAnsicht button{border:1px solid #eaecf0;background:#fff;border-radius:8px;padding:7px 12px;font:inherit;font-size:13px;cursor:pointer}.eqAnsicht button.an{background:#101828;color:#fff}
.eqF{display:block;padding:12px;border:1px dashed #d0d5dd;border-radius:12px;color:inherit;text-decoration:none;margin-top:8px}.eqF small{display:block;color:#667085;font-size:12px;margin-top:2px}.eqF:hover{background:#f9fafb}
.eqKarte p{margin:0}.eqKopf{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}.eqKopf small{display:block;color:#667085;font-size:12px}.eqBadges{display:flex;gap:6px;align-items:flex-start}
.eqSt,.eqPrio{font-size:12px;padding:3px 8px;border-radius:999px;background:#f2f4f7;height:fit-content}.eqPrio{font-weight:800;cursor:help}.eqPrio.p1{background:#101828;color:#fff}.eqPrio.p2{background:#475467;color:#fff}.eqPrio.p3{background:#d0d5dd}.eqPrioGrund{color:#667085;font-size:11px}
.eqEINNAHMEN,.eqSKALIEREN{background:#ecfdf3;color:#067647}.eqTEST,.eqAUTOMATISIERT,.eqVEROEFFENTLICHT,.eqLEADS_KUNDEN{background:#eff8ff;color:#175cd3}
.eqEntwurf{border-top:1px solid #f2f4f7;padding:4px 0}.eqEntwurf summary{cursor:pointer;font-size:13px}.eqEntwurf pre,.eqText{white-space:pre-wrap;font:inherit;font-size:13px;background:#f9fafb;border-radius:8px;padding:10px;margin:6px 0;overflow-wrap:anywhere}
.eqLead{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.eqLead select{padding:4px;border:1px solid #d0d5dd;border-radius:6px;font-size:12px}.eqAuto2{font-weight:700}.eqIDEE,.eqPRUEFUNG{background:#fffaeb;color:#b54708}.eqPAUSE{background:#f2f4f7;color:#475467}
.eqAblauf,.eqAuto ol{display:flex;flex-wrap:wrap;gap:4px;list-style:none;padding:0;margin:0}.eqAblauf li,.eqAuto li{font-size:11px;padding:2px 7px;border-radius:999px;background:#f2f4f7;color:#98a2b3}.eqAblauf li.fertig,.eqAuto li.fertig{background:#ecfdf3;color:#067647}.eqAblauf li.jetzt,.eqAuto li.jetzt{background:#101828;color:#fff;font-weight:700}
.eqAuto{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12px}.eqAuto>span{font-weight:700;color:#344054}.eqAuto small{color:#667085}
.eqDaten{display:grid;grid-template-columns:max-content 1fr;gap:3px 12px;margin:0;font-size:13px}.eqDaten dt{color:#667085}.eqDaten dd{margin:0;overflow-wrap:anywhere}.eqDaten dd.offen{color:#b54708}.eqDaten dd.ja{color:#067647}
.eqPruef{font-size:12px;display:flex;flex-wrap:wrap;gap:4px 10px;color:#475467}.eqPruef i{font-style:normal}.eqPruef .ja{color:#067647}.eqPruef .nein{color:#b42318}
.eqRecht{font-size:12px;color:#b54708}.eqAktion{font-size:13px;background:#fffcf5;border:1px solid #fedf89;border-radius:8px;padding:6px 8px}
.eqAktionen{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.eqAktionen select{padding:6px;border:1px solid #d0d5dd;border-radius:7px}.eqAktionen button:disabled{opacity:.45}.eqStart{background:#ecfdf3!important}
.eqDetails{border-top:1px solid #eaecf0;padding-top:8px;display:grid;gap:10px}.eqDetails h4{margin:0 0 4px;font-size:13px}.eqDetails h4 a{font-weight:400;font-size:12px;margin-left:6px}.eqDetails p{font-size:13px;margin:2px 0;overflow-wrap:anywhere}.eqDetails small{color:#667085}.eqPre{white-space:pre-wrap}
.eqPlan{font-size:13px;padding:6px 0;border-top:1px solid #f2f4f7}.eqPlan small{display:block;color:#667085}.eqKunde{font-size:13px;margin:3px 0}.eqKunde small{color:#667085}
.eqMeldung{font-size:14px}.eqModal{width:min(680px,100%);max-height:92vh;overflow:auto}.eqModal fieldset{border:1px solid #eaecf0;border-radius:10px;margin:10px 0;padding:6px 10px 10px}.eqModal legend{font-size:12px;font-weight:800;color:#344054;padding:0 4px}
.eqModal label{display:block;font-size:12px;font-weight:700;margin-top:10px}.eqModal input,.eqModal textarea,.eqModal select{display:block;width:100%;margin-top:4px;padding:9px;border:1px solid #d0d5dd;border-radius:7px;font:inherit}
@media(max-width:560px){.eqDaten{grid-template-columns:1fr}.eqDaten dt{margin-top:4px}}
.eq .muted{color:#98a2b3;font-size:13px}`;
