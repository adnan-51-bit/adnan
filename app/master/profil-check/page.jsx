"use client";

// Druckbare Gespraechsunterlage "Profil-Check" (27.09.2026) fuer den persoenlichen Besuch eines Betriebs.
// Nur mit Anmeldung. Inhalt nur aus der gespeicherten Analyse des oeffentlichen Profils - kein Preis, keine Zusagen.
// Absender wird von Hand eingetragen (die Zentrale erfindet keine Firmendaten).
import { useEffect, useState } from "react";
import { adminFetch, anmeldeUrl } from "../../../lib/admin-fetch.js";
import { KRITERIEN, ANTWORTEN, MONATS_AUFGABEN } from "../../../lib/google-profil.js";

// Fuer das Blatt beim Betrieb: nur Beobachtungen am Profil - interne Arbeitshinweise (Bedarf, Besuchsrunde,
// andere Betriebe, Vermutungen) bleiben in der Zentrale und werden nicht gedruckt.
const INTERN = /(Bedarf|Besuchsrunde|Vor einem Kontakt|vermutlich|Zusammenhang nicht geprüft|Friseur Haargenau|Verzeichnis)/i;
const beobachtungen = notiz => String(notiz || "").replace(/WICHTIG: /g, "").split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ„])/).filter(s => s.trim() && !INTERN.test(s)).join(" ");

const ZEICHEN ={ ja: "✓", teilweise: "◐", nein: "✗", unbekannt: "–" };

// Empfaengeradresse nur aus der gespeicherten Verzeichnis-Angabe ("Adresse laut Verzeichnis: ...").
const adresseAus = notiz => (String(notiz || "").match(/Adresse laut Verzeichnis: (.+?)\.(?:\s|$)/) || [])[1] || "";

export default function ProfilCheck() {
  const [d, setD] = useState(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const ids = (q.get("ids") || q.get("id") || "").split(",").filter(Boolean);
    const brief = q.get("brief") === "1";
    adminFetch("/api/master/businesses?pilot=1").then(async r => {
      if (r.status === 401) return setD({ gesperrt: true });
      const j = await r.json();
      const leads = ids.map(id => (j.leads || []).find(x => x.id === id)).filter(l => l?.profil_analyse);
      if (!leads.length) return setD({ fehlt: true });
      if (!brief) return setD({ leads });
      // Brief: Antwort-Link je Betrieb (nur nach Kontakt-Freigabe; einmalig, mehrfaches Drucken legt nichts doppelt an).
      const QR = (await import("qrcode")).default;
      const briefe = [], fehler = [];
      for (const l of leads) {
        const b = await adminFetch("/api/master/businesses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "pilot-brief", id: l.id }) }).then(x => x.json()).catch(() => ({ ok: false, error: "Keine Verbindung" }));
        if (!b.ok) { fehler.push((l.firma || l.name) + ": " + b.error); continue; }
        const link = window.location.origin + "/r/" + b.token;
        briefe.push({ l, link, qr: await QR.toString(link, { type: "svg", margin: 0, errorCorrectionLevel: "M" }) });
      }
      setD({ leads: briefe.map(b => b.l), briefe, fehler });
    }).catch(() => setD({ fehlt: true }));
  }, []);
  if (!d) return <main className="pc"><p>Wird geladen…</p><style>{CSS}</style></main>;
  if (d.gesperrt) return <main className="pc"><p>Nur mit Anmeldung. <a href={anmeldeUrl()}>Anmelden</a></p><style>{CSS}</style></main>;
  if (d.fehlt) return <main className="pc"><p>Für diesen Betrieb gibt es noch keine gespeicherte Profil-Analyse.</p><a href="/master?tab=pilot">Zurück zum Pilot</a><style>{CSS}</style></main>;
  return <main className="pc">
    <div className="pcLeiste"><a href="/master?tab=pilot">← Zurück</a><button type="button" onClick={() => window.print()}>🖨 Drucken</button></div>
    {d.fehler?.length > 0 && <p className="pcFehler">Nicht vorbereitet: {d.fehler.join(" · ")}</p>}
    {d.briefe?.length > 0 && <p className="pcHinweis">{d.briefe.length} Brief(e) mit persönlichem Antwort-Link. Ausdrucken, unterschreiben, selbst in den Briefkasten des Betriebs werfen – die Antwort kommt automatisch in die Zentrale.</p>}
    {d.leads.map((l, i) => <div key={l.id}>
      {d.briefe && <Brief {...d.briefe[i]} />}
      <Blatt l={l} />
    </div>)}
    <style>{CSS}</style>
  </main>;
}

function Brief({ l, link, qr }) {
  const a = l.profil_analyse;
  const wichtig = a.verbesserungen.filter(v => v.dringend).slice(0, 3);
  const adresse = adresseAus(l.notiz);
  return <article className="pcBlatt pcBrief">
    <div className="pcAbs"><small>Absender</small><span className="pcLinie" /><span className="pcLinie" /></div>
    <div className="pcAn"><b>{l.firma || l.name}</b>{adresse ? adresse.split(", ").map(z => <span key={z}>{z}</span>) : <><span className="pcLinie" /><span className="pcLinie" /></>}</div>
    <p className="pcDatum">{new Date().toLocaleDateString("de-DE")}</p>
    <p><b>Kostenloser Check Ihres Google-Profils</b></p>
    <p>Guten Tag,</p>
    <p>ich habe mir das öffentlich sichtbare Google-Profil von {l.firma || l.name} angesehen. Dabei sind mir {a.verbesserungen.length} Punkte aufgefallen, mit denen Sie bei Google Maps mehr Kunden erreichen können. Die vollständige Auswertung liegt bei – kostenlos und unverbindlich.</p>
    {wichtig.length > 0 && <><p>Das Wichtigste:</p><ol>{wichtig.map(v => <li key={v.id}>{v.text}</li>)}</ol></>}
    <p>Wenn Sie möchten, gehen wir die Punkte in etwa einer Stunde gemeinsam bei Ihnen durch – direkt auf Ihrem Gerät. Sie bleiben Inhaber Ihres Profils, ich brauche kein Passwort.</p>
    <div className="pcQr"><div dangerouslySetInnerHTML={{ __html: qr }} /><p>Antworten Sie einfach über den QR-Code oder unter<br /><b>{link.replace(/^https?:\/\//, "")}</b><br />„Ja, gern ein Gespräch“ – oder „Nein danke“, dann melde ich mich nicht wieder.</p></div>
    <p>Freundliche Grüße</p>
    <span className="pcLinie pcUnterschrift" />
    <p className="pcKlein">Wir sind nicht Google und arbeiten nicht im Auftrag von Google. Grundlage ist nur das öffentlich sichtbare Profil (Stand {new Date(a.datum).toLocaleDateString("de-DE")}).</p>
  </article>;
}

function Blatt({ l }) {
  const a = l.profil_analyse;
  const wichtig = a.verbesserungen.filter(v => v.dringend).slice(0, 3);
  const weitere = a.verbesserungen.filter(v => !wichtig.includes(v));
  return <article className="pcBlatt">
      <header><small>KOSTENLOSER PROFIL-CHECK · unverbindlich</small><h1>{l.firma || l.name}</h1><p>{[l.branche, l.ort].filter(Boolean).join(" · ")}</p></header>
      <section className="pcPunkte"><b>{a.punkte}</b><span>von 100 Punkten<br /><small>eigene Checkliste, keine Bewertung durch Google · Stand {new Date(a.datum).toLocaleDateString("de-DE")}</small></span></section>
      {beobachtungen(a.notiz) && <><h2>Beobachtungen am öffentlichen Profil</h2><p className="pcKlein pcNotiz">{beobachtungen(a.notiz)}</p></>}
      <h2>Das Wichtigste zuerst</h2>
      {wichtig.length ? <ol>{wichtig.map(v => <li key={v.id}>{v.text}</li>)}</ol> : <p>Keine dringenden Punkte gefunden.</p>}
      <h2>Alle geprüften Punkte</h2>
      <table><tbody>{KRITERIEN.map(k => <tr key={k.id}><td className="pcZ">{ZEICHEN[a.werte[k.id]] || "–"}</td><td>{k.frage}</td><td className="pcA">{ANTWORTEN[a.werte[k.id]]}</td></tr>)}</tbody></table>
      {weitere.length > 0 && <><h2>Weitere Möglichkeiten</h2><ul>{weitere.map(v => <li key={v.id}>{v.text}</li>)}</ul></>}
      <h2>Was ich auf Wunsch übernehmen kann (monatlich kündbar)</h2>
      <ul>{MONATS_AUFGABEN.map(t => <li key={t}>{t}</li>)}</ul>
      <p className="pcKlein">Sie bleiben Inhaber Ihres Profils. Ich arbeite nur mit Ihrer schriftlichen Zustimmung und nur als Administrator über Google – ich brauche kein Passwort. Ich verspreche keine Platzierungen oder Anrufzahlen. Alle Punkte können Sie auch selbst umsetzen. Geprüft wurde nur das öffentlich sichtbare Profil; „nicht prüfbar“ heißt, es war von außen nicht sicher erkennbar.</p>
      <p className="pcKlein">Quelle: öffentliches Google-Profil, abgerufen am {new Date(a.datum).toLocaleDateString("de-DE")}.</p>
      <footer><div><small>Kontakt</small><span className="pcLinie" /><span className="pcLinie" /></div><div><small>Datum</small><span className="pcLinie" /></div></footer>
    </article>;
}

const CSS = `
.pc{max-width:820px;margin:0 auto;padding:16px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111;background:#fff}
.pcLeiste{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.pcLeiste button{padding:8px 14px;border-radius:8px;border:1px solid #111;background:#111;color:#fff;cursor:pointer;font:inherit}
.pcBlatt{border:1px solid #ddd;border-radius:12px;padding:24px}
.pcBlatt header small{letter-spacing:.08em;color:#555;font-size:11px}.pcBlatt h1{margin:4px 0;font-size:26px}.pcBlatt header p{margin:0;color:#555}
.pcPunkte{display:flex;align-items:center;gap:14px;margin:18px 0;padding:12px 16px;border-radius:10px;background:#f4f6f8}.pcPunkte b{font-size:44px;line-height:1}.pcPunkte small{color:#555}
.pcBlatt h2{font-size:16px;margin:20px 0 6px;border-bottom:1px solid #eee;padding-bottom:4px}
.pcBlatt table{width:100%;border-collapse:collapse;font-size:14px}.pcBlatt td{border-bottom:1px solid #eee;padding:6px 4px;vertical-align:top}.pcZ{width:28px;text-align:center;font-weight:700}.pcA{white-space:nowrap;color:#555;text-align:right}
.pcBlatt li{margin:3px 0}.pcKlein{font-size:12px;color:#444}.pcNotiz{font-size:13px;background:#f7f7f7;border-left:3px solid #999;padding:8px 10px;border-radius:4px}
.pcBlatt footer{display:grid;grid-template-columns:2fr 1fr;gap:20px;margin-top:28px}.pcBlatt footer small{color:#555}.pcLinie{display:block;border-bottom:1px solid #999;height:26px}
div+div>.pcBlatt,.pcBrief+.pcBlatt{margin-top:18px}
.pcBrief{font-size:15px;line-height:1.5}.pcAbs{max-width:260px}.pcAbs small{color:#555;font-size:11px}.pcAn{display:grid;margin:22px 0 10px}.pcDatum{text-align:right;color:#333}
.pcQr{display:flex;gap:16px;align-items:center;margin:14px 0;padding:10px;border:1px solid #ddd;border-radius:8px}.pcQr>div{width:110px;flex:none}.pcQr svg{width:110px;height:110px;display:block}.pcQr p{margin:0;font-size:14px}
.pcUnterschrift{max-width:240px;margin:8px 0 14px}.pcHinweis{background:#eef6ff;padding:8px 12px;border-radius:8px;font-size:14px}.pcFehler{background:#fff0f0;color:#900;padding:8px 12px;border-radius:8px;font-size:14px}
@media(max-width:560px){.pcBlatt{padding:14px}.pcBlatt h1{font-size:21px}.pcA{white-space:normal}.pcBlatt footer{grid-template-columns:1fr}}
@media print{.pcLeiste,.pcHinweis,.pcFehler{display:none}.pcBlatt{break-after:page}.pc{padding:0;max-width:none}.pcBlatt{border:0;padding:0}@page{margin:16mm}}
`;
