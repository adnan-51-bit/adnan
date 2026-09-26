"use client";

// Sortiert24 - oeffentliche Shop-Seite (26.09.2026). Zeigt nur, was /api/orders?type=shop freigibt:
// solange die Start-Checkliste nicht komplett ist, "oeffnet bald" und keine Bestellmoeglichkeit.
// Warenkorb im Browser (localStorage, technisch notwendig, kein Tracking); Preise rechnet der Server neu.
import { useEffect, useMemo, useState } from "react";
import { SHOP_NAME } from "../../lib/shop-marke.js";
import { LADEN_CSS, LADEN_CSS_2 } from "../../lib/laden-stil.js";

const euro = c => (c / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const KORB_KEY = "sortiert24_warenkorb";
const leseKorb = () => { try { const k = JSON.parse(localStorage.getItem(KORB_KEY) || "{}"); return k && typeof k === "object" ? k : {}; } catch { return {}; } };
const schreibeKorb = k => { try { localStorage.setItem(KORB_KEY, JSON.stringify(k)); } catch { /* privater Modus: Korb nur fuer diese Seite */ } };

export default function Laden() {
  const [daten, setDaten] = useState(null);
  const [fehler, setFehler] = useState("");
  const [korb, setKorbState] = useState({});
  const [kategorie, setKategorie] = useState("Alle");
  const [detail, setDetail] = useState(null);
  const [kunde, setKunde] = useState({ name: "", email: "", strasse: "", plz: "", ort: "" });
  const [sendet, setSendet] = useState(false);
  const [abgebrochen, setAbgebrochen] = useState(false);

  useEffect(() => {
    setAbgebrochen(new URLSearchParams(window.location.search).has("abgebrochen"));
    setKorbState(leseKorb());
    fetch("/api/orders?type=shop").then(r => r.json()).then(setDaten).catch(() => setFehler("Der Shop ist gerade nicht erreichbar."));
  }, []);

  const produkte = daten?.produkte || [];
  const setKorb = k => { setKorbState(k); schreibeKorb(k); };
  const menge = (id, m) => { const p = produkte.find(x => x.id === id); const max = Number.isInteger(p?.bestand) ? Math.min(20, p.bestand) : 20; const n = Math.max(0, Math.min(max, m)); const k = { ...korb }; if (n) k[id] = n; else delete k[id]; setKorb(k); };
  // Nur Positionen fuer aktuell verkaufbare Produkte (ein alter Korb mit inzwischen entfernten Produkten wird bereinigt)
  const positionen = Object.entries(korb).filter(([id, m]) => m > 0 && produkte.some(p => p.id === id)).map(([produkt_id, m]) => ({ produkt_id, menge: m }));
  const waren = useMemo(() => positionen.reduce((s, p) => s + (produkte.find(x => x.id === p.produkt_id)?.preis_cent || 0) * p.menge, 0), [positionen, produkte]);
  const versand = Number.isInteger(daten?.versand_cent) ? daten.versand_cent : 0;
  const kategorien = ["Alle", ...new Set(produkte.map(p => p.kategorie).filter(Boolean))];
  const sichtbar = produkte.filter(p => kategorie === "Alle" || p.kategorie === kategorie);

  async function bestellen(e) {
    e.preventDefault(); setFehler(""); setSendet(true);
    try {
      const r = await fetch("/api/orders?type=shop-bestellung", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ positionen, kunde: { name: kunde.name, email: kunde.email, adresse: { strasse: kunde.strasse, plz: kunde.plz, ort: kunde.ort } } }) });
      const j = await r.json();
      if (!r.ok || !j.zahlung_url) throw new Error(j.error || "Bestellung fehlgeschlagen");
      window.location.href = j.zahlung_url;
    } catch (err) { setFehler(err.message); setSendet(false); }
  }

  const bestandText = p => (Number.isInteger(p.bestand) && p.bestand <= 5 ? `Nur noch ${p.bestand} verfügbar` : null);

  return <main className="laden">
    <header><h1>{SHOP_NAME}</h1>{daten?.offen && positionen.length > 0 && <a href="#kasse" className="korbLink">Warenkorb ({positionen.reduce((s, p) => s + p.menge, 0)})</a>}</header>
    {!daten && !fehler && <p>Lädt …</p>}
    {daten && !daten.offen && <section className="karte"><h2>{SHOP_NAME} öffnet bald.</h2><p>Hier kann noch nichts bestellt werden. Schauen Sie bald wieder vorbei.</p></section>}
    {daten?.offen && <>
      {abgebrochen && <p className="hinweis">Die Bezahlung wurde abgebrochen – es wurde nichts berechnet. Ihr Warenkorb ist noch da.</p>}
      {kategorien.length > 2 && <nav className="kategorien">{kategorien.map(k => <button type="button" key={k} className={k === kategorie ? "aktiv" : ""} onClick={() => setKategorie(k)}>{k}</button>)}</nav>}
      {!produkte.length && <p>Aktuell sind keine Produkte verfügbar.</p>}
      <section className="raster">{sichtbar.map(p => <article className="karte" key={p.id}>
        {p.bilder[0] && <img src={p.bilder[0]} alt={p.name} className="bild" loading="lazy" />}
        <h2>{p.name}</h2>{p.kategorie && <small>{p.kategorie}</small>}<strong>{euro(p.preis_cent)}</strong>
        {bestandText(p) && <small className="hinweis">{bestandText(p)}</small>}
        <div className="zeile"><button type="button" className="zweit" onClick={() => setDetail(p)}>Details</button>
          <button type="button" onClick={() => menge(p.id, (korb[p.id] || 0) + 1)}>{korb[p.id] ? `Im Korb: ${korb[p.id]}` : "In den Warenkorb"}</button></div>
      </article>)}</section>
      {positionen.length > 0 && <form id="kasse" className="karte" onSubmit={bestellen}>
        <h2>Warenkorb</h2>
        {positionen.map(pos => { const p = produkte.find(x => x.id === pos.produkt_id); return <div className="zeile posten" key={pos.produkt_id}>
          <span>{p.name}</span><input aria-label={"Menge " + p.name} type="number" min="0" max="20" value={pos.menge} onChange={e => menge(p.id, parseInt(e.target.value || "0", 10))} /><span>{euro(p.preis_cent * pos.menge)}</span></div>; })}
        <div className="zeile posten"><span>Versand</span><span>{versand ? euro(versand) : "kostenlos"}</span></div>
        <div className="zeile posten summe"><span>Gesamt (Endpreis)</span><strong>{euro(waren + versand)}</strong></div>
        <h2>Lieferadresse</h2>
        {[["name", "Name"], ["email", "E-Mail"], ["strasse", "Straße und Hausnummer"], ["plz", "PLZ"], ["ort", "Ort"]].map(([k, l]) =>
          <label key={k}>{l}<input required type={k === "email" ? "email" : "text"} inputMode={k === "plz" ? "numeric" : undefined} value={kunde[k]} onChange={e => setKunde({ ...kunde, [k]: e.target.value })} /></label>)}
        <p><small>Lieferung nur innerhalb Deutschlands. Mit der Bestellung akzeptieren Sie unsere <a href="/laden/agb">AGB</a> und haben die <a href="/laden/widerruf">Widerrufsbelehrung</a> und <a href="/laden/datenschutz">Datenschutzerklärung</a> zur Kenntnis genommen. Die Bezahlung erfolgt sicher über Stripe.</small></p>
        <button disabled={sendet}>{sendet ? "Weiter zur Bezahlung …" : "Zahlungspflichtig bestellen"}</button>
      </form>}
    </>}
    {detail && <div className="dialogHintergrund" onClick={() => setDetail(null)}><div className="karte dialog" onClick={e => e.stopPropagation()} role="dialog" aria-label={detail.name}>
      <button type="button" className="zweit schliessen" onClick={() => setDetail(null)}>×</button>
      <h2>{detail.name}</h2>
      {detail.bilder.length > 0 && <div className="galerie">{detail.bilder.map(b => <img key={b} src={b} alt={detail.name} loading="lazy" />)}</div>}
      <strong>{euro(detail.preis_cent)}</strong>
      {detail.beschreibung && <p className="beschreibung">{detail.beschreibung}</p>}
      {detail.lieferzeit && <p><small>Lieferzeit: {detail.lieferzeit}</small></p>}
      {bestandText(detail) && <p className="hinweis"><small>{bestandText(detail)}</small></p>}
      <button type="button" onClick={() => { menge(detail.id, (korb[detail.id] || 0) + 1); setDetail(null); }}>In den Warenkorb</button>
    </div></div>}
    {fehler && <p className="fehler">{fehler}</p>}
    <footer><a href="/laden/impressum">Impressum</a><a href="/laden/datenschutz">Datenschutz</a><a href="/laden/agb">AGB</a><a href="/laden/widerruf">Widerruf</a></footer>
    <style dangerouslySetInnerHTML={{ __html: LADEN_CSS + LADEN_CSS_2 }} />
  </main>;
}
