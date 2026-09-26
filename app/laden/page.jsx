"use client";

// Oeffentliche Shop-Seite (26.09.2026). Zeigt nur, was /api/orders?type=shop freigibt: solange die
// Start-Checkliste nicht komplett ist, "oeffnet bald" und keine Bestellmoeglichkeit.
import { useEffect, useMemo, useState } from "react";
import { SHOP_NAME } from "../../lib/shop-marke.js";
import { LADEN_CSS } from "../../lib/laden-stil.js";

const euro = c => (c / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });

export default function Laden() {
  const [daten, setDaten] = useState(null);
  const [fehler, setFehler] = useState("");
  const [korb, setKorb] = useState({});
  const [kunde, setKunde] = useState({ name: "", email: "", strasse: "", plz: "", ort: "" });
  const [sendet, setSendet] = useState(false);
  const [abgebrochen, setAbgebrochen] = useState(false);

  useEffect(() => {
    setAbgebrochen(new URLSearchParams(window.location.search).has("abgebrochen"));
    fetch("/api/orders?type=shop").then(r => r.json()).then(setDaten).catch(() => setFehler("Der Shop ist gerade nicht erreichbar."));
  }, []);

  const produkte = daten?.produkte || [];
  const positionen = Object.entries(korb).filter(([, m]) => m > 0).map(([produkt_id, menge]) => ({ produkt_id, menge }));
  const summe = useMemo(() => positionen.reduce((s, p) => s + (produkte.find(x => x.id === p.produkt_id)?.preis_cent || 0) * p.menge, 0), [positionen, produkte]);

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

  return <main className="laden">
    <header><h1>{SHOP_NAME}</h1></header>
    {!daten && !fehler && <p>Lädt …</p>}
    {daten && !daten.offen && <section className="karte"><h2>Der Shop öffnet bald.</h2><p>Hier kann noch nichts bestellt werden. Schauen Sie bald wieder vorbei.</p></section>}
    {daten?.offen && <>
      {abgebrochen && <p className="hinweis">Die Bezahlung wurde abgebrochen – es wurde nichts berechnet.</p>}
      <section className="raster">{produkte.map(p => <article className="karte" key={p.id}>
        <h2>{p.name}</h2>{p.kategorie && <small>{p.kategorie}</small>}<strong>{euro(p.preis_cent)}</strong>
        <label>Menge <input type="number" min="0" max="20" value={korb[p.id] || 0} onChange={e => setKorb({ ...korb, [p.id]: Math.max(0, Math.min(20, parseInt(e.target.value || "0", 10))) })} /></label>
      </article>)}</section>
      {positionen.length > 0 && <form className="karte" onSubmit={bestellen}>
        <h2>Bestellung – {euro(summe)}</h2>
        <p><small>Endpreis. Die Bezahlung erfolgt sicher über Stripe.</small></p>
        {[["name", "Name"], ["email", "E-Mail"], ["strasse", "Straße und Hausnummer"], ["plz", "PLZ"], ["ort", "Ort"]].map(([k, l]) =>
          <label key={k}>{l}<input required type={k === "email" ? "email" : "text"} value={kunde[k]} onChange={e => setKunde({ ...kunde, [k]: e.target.value })} /></label>)}
        <p><small>Mit der Bestellung akzeptieren Sie unsere <a href="/laden/agb">AGB</a> und haben die <a href="/laden/widerruf">Widerrufsbelehrung</a> und <a href="/laden/datenschutz">Datenschutzerklärung</a> gelesen.</small></p>
        <button disabled={sendet}>{sendet ? "Weiter zur Bezahlung …" : "Zahlungspflichtig bestellen"}</button>
      </form>}
    </>}
    {fehler && <p className="fehler">{fehler}</p>}
    <footer><a href="/laden/impressum">Impressum</a><a href="/laden/datenschutz">Datenschutz</a><a href="/laden/agb">AGB</a><a href="/laden/widerruf">Widerruf</a></footer>
    <style dangerouslySetInnerHTML={{ __html: LADEN_CSS }} />
  </main>;
}
