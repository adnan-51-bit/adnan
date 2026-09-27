"use client";

// Antwortseite fuer den Betrieb: eigener Profil-Check + "Ja, Gespraech" oder "Kein Interesse".
// Es wird nichts automatisch gesendet; die Antwort landet in der Master-Zentrale als Aufgabe fuer Adnan.
import { useEffect, useState } from "react";
import { KRITERIEN, ANTWORTEN } from "../../../lib/google-profil.js";

const ZEICHEN = { ja: "✓", teilweise: "◐", nein: "✗", unbekannt: "–" };

export default function Antwort({ token }) {
  const [s, setS] = useState(null);
  const [wahl, setWahl] = useState("");
  const [f, setF] = useState({ name: "", telefon: "", email: "", wunsch: "", einwilligung: false, fax: "" });
  const [fehler, setFehler] = useState("");
  const [fertig, setFertig] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const url = "/api/master/businesses?antwort=" + encodeURIComponent(token);
  useEffect(() => { fetch(url).then(r => r.json()).then(j => setS(j.ok ? j.seite : { fehlt: true })).catch(() => setS({ fehlt: true })); }, [url]);

  async function senden(w) {
    setFehler(""); setLaeuft(true);
    try {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, wahl: w }) });
      const j = await r.json();
      if (!j.ok) setFehler(j.error || "Das hat nicht geklappt. Bitte später erneut versuchen.");
      else setFertig(w);
    } catch { setFehler("Keine Verbindung. Bitte später erneut versuchen."); }
    setLaeuft(false);
  }

  if (!s) return <main className="ra"><p>Wird geladen…</p><style>{CSS}</style></main>;
  if (s.fehlt) return <main className="ra"><h1>Link nicht gefunden</h1><p>Bitte prüfen Sie die Adresse aus dem Brief.</p><style>{CSS}</style></main>;
  const wichtig = s.verbesserungen.filter(v => v.dringend).slice(0, 3);
  return <main className="ra">
    <header><small>KOSTENLOSER PROFIL-CHECK · unverbindlich</small><h1>{s.firma}</h1><p>{[s.branche, s.ort].filter(Boolean).join(" · ")}</p></header>
    <section className="raPunkte"><b>{s.punkte}</b><span>von 100 Punkten<br /><small>eigene Checkliste, keine Bewertung durch Google · Stand {new Date(s.datum).toLocaleDateString("de-DE")}</small></span></section>
    {wichtig.length > 0 && <><h2>Das Wichtigste zuerst</h2><ol>{wichtig.map(v => <li key={v.id}>{v.text}</li>)}</ol></>}
    <details><summary>Alle geprüften Punkte</summary><table><tbody>{KRITERIEN.map(k => <tr key={k.id}><td className="raZ">{ZEICHEN[s.werte[k.id]] || "–"}</td><td>{k.frage}</td><td className="raA">{ANTWORTEN[s.werte[k.id]]}</td></tr>)}</tbody></table></details>

    {fertig === "gespraech" && <section className="raOk"><h2>Vielen Dank!</h2><p>Wir melden uns in den nächsten Tagen auf dem Weg, den Sie angegeben haben, und stimmen einen Termin mit Ihnen ab.</p></section>}
    {fertig === "kein-interesse" && <section className="raOk"><h2>Verstanden.</h2><p>Wir kontaktieren Sie nicht mehr. Die Punkte oben können Sie jederzeit auch selbst umsetzen.</p></section>}
    {!fertig && s.gesperrt && <section className="raOk"><p>Sie haben uns mitgeteilt, dass Sie keinen Kontakt wünschen. Daran halten wir uns.</p></section>}
    {!fertig && !s.gesperrt && <section className="raWahl">
      <h2>Möchten Sie die Punkte gemeinsam durchgehen?</h2>
      <p>Etwa eine Stunde bei Ihnen vor Ort, direkt auf Ihrem Gerät. Sie bleiben Inhaber Ihres Profils, ich brauche kein Passwort. Das Gespräch ist kostenlos und unverbindlich.</p>
      <div className="raKnoepfe"><button type="button" className={wahl === "gespraech" ? "an" : ""} onClick={() => setWahl("gespraech")}>Ja, gern ein Gespräch</button><button type="button" className="raNein" onClick={() => senden("kein-interesse")} disabled={laeuft}>Nein danke – bitte nicht mehr kontaktieren</button></div>
      {wahl === "gespraech" && <form onSubmit={e => { e.preventDefault(); senden("gespraech"); }}>
        <label>Ihr Name<input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} maxLength={80} required autoComplete="name" /></label>
        <label>Telefon<input value={f.telefon} onChange={e => setF({ ...f, telefon: e.target.value })} maxLength={40} inputMode="tel" autoComplete="tel" /></label>
        <label>oder E-Mail<input value={f.email} onChange={e => setF({ ...f, email: e.target.value })} maxLength={120} type="email" autoComplete="email" /></label>
        <label>Wann passt es Ihnen? (optional)<textarea value={f.wunsch} onChange={e => setF({ ...f, wunsch: e.target.value })} maxLength={300} rows={2} placeholder="z. B. Dienstag vormittags" /></label>
        <input className="raHonig" tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.fax} onChange={e => setF({ ...f, fax: e.target.value })} />
        <label className="raCheck"><input type="checkbox" checked={f.einwilligung} onChange={e => setF({ ...f, einwilligung: e.target.checked })} required /> Ich möchte zu diesem Profil-Check über die angegebene Telefonnummer bzw. E-Mail-Adresse kontaktiert werden. Das kann ich jederzeit widerrufen.</label>
        <button type="submit" disabled={laeuft}>{laeuft ? "Wird gesendet…" : "Absenden"}</button>
      </form>}
      {fehler && <p className="raFehler" role="alert">{fehler}</p>}
    </section>}

    <footer><p>Wir sind nicht Google und arbeiten nicht im Auftrag von Google. Geprüft wurde nur das öffentlich sichtbare Profil. Ihre Angaben verwenden wir nur, um Sie zu diesem Profil-Check zu kontaktieren; sie werden nicht weitergegeben. Widerruf jederzeit formlos möglich.</p>
      <p><a href="https://werknetz24.de/impressum" target="_blank" rel="noreferrer">Impressum</a> · <a href="https://werknetz24.de/datenschutz" target="_blank" rel="noreferrer">Datenschutz</a></p></footer>
    <style>{CSS}</style>
  </main>;
}

const CSS = `
body{margin:0;background:#f4f6f8}
.ra{max-width:640px;margin:0 auto;padding:20px 16px 40px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111;background:#fff;min-height:100vh;box-sizing:border-box}
.ra header small{letter-spacing:.08em;color:#555;font-size:11px}.ra h1{margin:4px 0;font-size:26px}.ra header p{margin:0;color:#555}
.raPunkte{display:flex;align-items:center;gap:14px;margin:18px 0;padding:12px 16px;border-radius:10px;background:#f4f6f8}.raPunkte b{font-size:44px;line-height:1}.raPunkte small{color:#555}
.ra h2{font-size:17px;margin:22px 0 8px}.ra li{margin:4px 0}
.ra details{margin:12px 0;font-size:14px}.ra summary{cursor:pointer;color:#333}.ra table{width:100%;border-collapse:collapse;margin-top:8px}.ra td{border-bottom:1px solid #eee;padding:6px 4px;vertical-align:top}.raZ{width:26px;text-align:center;font-weight:700}.raA{color:#555;text-align:right}
.raWahl{margin-top:24px;padding:16px;border:1px solid #ddd;border-radius:12px}
.raKnoepfe{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0}.ra button{font:inherit;padding:11px 16px;border-radius:10px;border:1px solid #111;background:#111;color:#fff;cursor:pointer}.ra button.an{background:#0a7a3b;border-color:#0a7a3b}.ra .raNein{background:#fff;color:#333;border-color:#bbb}
.ra form{display:grid;gap:10px;margin-top:8px}.ra label{display:grid;gap:4px;font-size:14px}.ra input,.ra textarea{font:inherit;padding:9px 10px;border:1px solid #bbb;border-radius:8px}
.raCheck{display:flex!important;gap:8px;align-items:flex-start}.raCheck input{margin-top:3px}
.raHonig{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}
.raFehler{color:#a40000;font-weight:600}.raOk{margin-top:22px;padding:14px 16px;border-radius:10px;background:#eaf6ee}
.ra footer{margin-top:30px;font-size:12px;color:#555}.ra footer a{color:#333}
`;
