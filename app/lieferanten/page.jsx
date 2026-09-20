"use client";

import { useMemo, useState } from "react";

const suppliers = [
  { name:"CLP", region:"Deutschland", categories:"Wohnen, Garten, Sport, Wellness", model:"Direktversand", neutral:true, automation:"Shop-/Marktplatz-Anbindung prüfen", risk:"niedrig", source:"https://www.clp.de/haendler", note:"Lagert, verpackt und versendet direkt an Endkunden im Namen des Händlers." },
  { name:"T.M. Textil", region:"Deutschland", categories:"Heimtextilien", model:"Blind Shipping", neutral:true, automation:"CSV/XML + Shopsysteme", risk:"niedrig", source:"https://www.tm-textil.de/en/dropshipping.html", note:"900+ SKUs im deutschen Lager, 24/48h Versand laut Anbieter, kein MOQ." },
  { name:"ChiliTec", region:"Deutschland", categories:"Haushalt, Technik, Zubehör", model:"Neutralversand", neutral:true, automation:"Bestellung per Shop/E-Mail", risk:"mittel", source:"https://www.chilitec.de/versand-und-zahlung/dropshipping/", note:"Direktversand an Kunden; Mindestbestellwert 10 € netto und 7,50 € Versandpauschale innerhalb Deutschlands laut Anbieter." },
  { name:"Hans Krempl", region:"Deutschland", categories:"Haustechnik", model:"Direktversand", neutral:true, automation:"manuell oder automatisch", risk:"mittel", source:"https://www.krempl.de/en/dropshipping/", note:"Versand direkt aus dem Lager an Kunden; neutraler Versand in eigenem Namen laut Anbieter." },
  { name:"Dropply", region:"EU", categories:"Nahrungsergänzung", model:"Dropshipping", neutral:true, automation:"API / CSV / Portal", risk:"hoch", source:"https://www.dropply.eu/de", note:"Nur B2B; EU-USt-IdNr. erforderlich. Diese Kategorie wird für den Start bewusst nicht priorisiert." },
  { name:"BigBuy", region:"EU", categories:"Gemischtes Sortiment", model:"Dropshipping", neutral:true, automation:"API / CSV / Plugins", risk:"mittel", source:"https://www.bigbuy.eu/", note:"Breites Sortiment und Multi-Channel-Ausrichtung; Preise, Gebühren und konkrete Produktmargen separat prüfen." }
];

const candidates = [
  ["Kofferraum-Organizer","Auto & Ordnung","direkter Versand noch zu prüfen","🟡"],
  ["Schubladen-Organizer","Haushalt","direkter Versand noch zu prüfen","🟡"],
  ["Hunde-Reisezubehör","Tierbedarf","Lieferant/Preis noch zu prüfen","🟡"],
  ["Kabel-Organizer","Ordnung & Zubehör","Lieferant/Preis noch zu prüfen","🟡"],
  ["Heimtextilien","Wohnen","deutsches Dropshipping-Angebot vorhanden","🟡"],
  ["Garten-Organizer/Zubehör","Garten","Lieferant/Produkt einzeln prüfen","⚪"]
];

export default function LieferantenZentrale() {
  const [filter,setFilter] = useState("alle");
  const [selected,setSelected] = useState(null);
  const visible = useMemo(()=> filter==="alle" ? suppliers : suppliers.filter(s=>s.region===filter),[filter]);

  return <main className="shell">
    <header className="hero">
      <div>
        <div className="eyebrow">E-COMMERCE · DROPSHIPPING CONTROL</div>
        <h1>Lieferanten statt Lagerbestand.</h1>
        <p>Produkte auswählen, Direktversand prüfen, Marge berechnen und erst danach freigeben.</p>
      </div>
      <div className="gate">🟡 RECHERCHE / QUALITY GATE</div>
    </header>

    <nav>
      <a href="/zentral">← Master-Zentrale</a>
      <a href="/shop">Produktkalkulation</a>
      <a href="/">Anfragen</a>
    </nav>

    <section className="rules">
      <div><b>Unser Ziel</b><span>Kein Lagerbestand, wenn ein geeigneter Lieferant direkt an den Kunden versenden kann.</span></div>
      <div><b>Freigabe</b><span>Lieferant + Produkt + Versand + Gebühren + Retouren + Produktdaten müssen geprüft sein.</span></div>
      <div><b>Kosten</b><span>Keine kostenpflichtige Lieferanten-/App-Anbindung ohne ausdrückliche Freigabe.</span></div>
    </section>

    <section className="panel">
      <div className="head"><div><span className="label">LIEFERANTEN</span><h2>Direktversand-Kandidaten</h2></div>
        <select value={filter} onChange={e=>setFilter(e.target.value)}><option value="alle">Alle</option><option value="Deutschland">Deutschland</option><option value="EU">EU</option></select>
      </div>
      <div className="table">
        <div className="tr th"><span>Lieferant</span><span>Region</span><span>Modell</span><span>Neutral</span><span>Automatisierung</span><span>Status</span></div>
        {visible.map((s,i)=><button className="tr row" key={s.name} onClick={()=>setSelected(i)}>
          <strong>{s.name}</strong><span>{s.region}</span><span>{s.model}</span><span>{s.neutral?"Ja":"Prüfen"}</span><span>{s.automation}</span><span>🟡</span>
        </button>)}
      </div>
      {selected!==null && <div className="detail">
        <div><b>{visible[selected].name}</b><p>{visible[selected].note}</p><small>Kategorien: {visible[selected].categories}</small></div>
        <a href={visible[selected].source} target="_blank" rel="noreferrer">Quelle öffnen →</a>
      </div>}
    </section>

    <section className="panel">
      <div className="head"><div><span className="label">PRODUKT-PIPELINE</span><h2>Was wir als Nächstes prüfen</h2></div></div>
      <div className="cards">{candidates.map(([p,c,d,s])=><article key={p}><span>{s}</span><h3>{p}</h3><small>{c}</small><p>{d}</p><button>Quality Gate öffnen</button></article>)}</div>
    </section>

    <section className="panel">
      <span className="label">AUTOMATISIERUNGSLOGIK</span>
      <h2>Vom Verkauf bis zum Tracking</h2>
      <div className="flow">{["Shop-Bestellung","Produkt prüfen","Lieferant auswählen","Bestellung weiterleiten","Direktversand","Tracking übernehmen","Kunde informieren","Marge buchen"].map((x,i)=><div key={x}><b>{String(i+1).padStart(2,"0")}</b><span>{x}</span></div>)}</div>
      <p className="note">Die Oberfläche ist jetzt vorbereitet. Die eigentliche API-/Shop-Anbindung wird erst nach Auswahl eines konkreten Lieferanten und nach Kosten-/Rechtsprüfung implementiert.</p>
    </section>

    <footer>Keine Bestellung, kein Warenbestand und keine kostenpflichtige Integration wurde durch diese Seite ausgelöst.</footer>

    <style jsx>{styles}</style>
  </main>
}

const styles = `
*{box-sizing:border-box}.shell{min-height:100vh;background:#f6f7f9;color:#101828;font-family:Inter,system-ui,sans-serif;padding:34px 24px}.hero,nav,.rules,.panel,footer{max-width:1240px;margin:auto}.hero{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;padding:10px 0 24px}.eyebrow,.label{font-size:11px;font-weight:800;letter-spacing:.12em;color:#667085}.hero h1{font-size:clamp(34px,5vw,58px);line-height:1;letter-spacing:-.04em;margin:9px 0 13px}.hero p{color:#667085;font-size:17px;max-width:700px}.gate{border:1px solid #fedf89;background:#fffaeb;border-radius:999px;padding:9px 13px;font-size:11px;font-weight:800}nav{display:flex;gap:8px;border-bottom:1px solid #e4e7ec;padding-bottom:18px}nav a{background:#fff;border:1px solid #d0d5dd;border-radius:8px;padding:9px 12px;text-decoration:none;color:#344054;font-size:13px}.rules{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px}.rules div{background:#101828;color:#fff;border-radius:12px;padding:17px}.rules b{display:block;margin-bottom:7px}.rules span{color:#d0d5dd;font-size:13px;line-height:1.45}.panel{background:#fff;border:1px solid #e4e7ec;border-radius:14px;padding:20px;margin-top:14px}.head{display:flex;justify-content:space-between;align-items:flex-start;gap:15px}.head h2{margin:5px 0 0;font-size:22px}.head select{padding:9px;border:1px solid #d0d5dd;border-radius:8px}.table{margin-top:18px;border:1px solid #eaecf0;border-radius:10px;overflow:hidden}.tr{display:grid;grid-template-columns:1.1fr .7fr 1fr .6fr 1.7fr .5fr;gap:10px;align-items:center;padding:13px 14px;text-align:left;font:inherit}.th{background:#f9fafb;color:#667085;font-size:11px;font-weight:800}.row{width:100%;border:0;border-top:1px solid #eaecf0;background:#fff;cursor:pointer;color:#344054;font-size:12px}.row:hover{background:#f9fafb}.row strong{color:#101828}.detail{display:flex;justify-content:space-between;gap:20px;background:#f9fafb;border:1px solid #eaecf0;border-radius:10px;padding:15px;margin-top:12px}.detail p{color:#667085;margin:6px 0}.detail small{color:#667085}.detail a{color:#175cd3;text-decoration:none;font-weight:700;white-space:nowrap}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:18px}.cards article{border:1px solid #eaecf0;border-radius:10px;padding:15px}.cards article>span{float:right}.cards h3{margin:4px 0;font-size:16px}.cards small,.cards p{color:#667085}.cards p{font-size:12px;min-height:32px}.cards button{border:1px solid #d0d5dd;background:#fff;border-radius:7px;padding:7px 9px;font-weight:700;font-size:11px}.flow{display:grid;grid-template-columns:repeat(8,1fr);gap:8px;margin-top:18px}.flow div{border:1px solid #eaecf0;border-radius:9px;padding:11px;background:#f9fafb}.flow b{display:block;color:#667085;font-size:11px}.flow span{display:block;margin-top:7px;font-size:12px}.note{color:#667085;font-size:13px;line-height:1.5;margin-bottom:0}footer{padding:20px 0;color:#667085;font-size:12px}@media(max-width:900px){.hero{display:block}.rules,.cards{grid-template-columns:1fr 1fr}.flow{grid-template-columns:repeat(4,1fr)}.table{overflow:auto}.tr{min-width:850px}}@media(max-width:600px){.rules,.cards{grid-template-columns:1fr}.flow{grid-template-columns:1fr 1fr}.shell{padding:22px 14px}}`;
