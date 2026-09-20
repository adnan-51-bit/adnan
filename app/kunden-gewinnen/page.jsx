"use client";

const phases=[
["01","Produkt freigeben","Nur ein konkretes Produkt mit verifiziertem EK, Versand, Lieferzeit, Retouren und Produktunterlagen.","🟡"],
["02","Verkaufsseite","Nutzen, Bilder, Preis, Lieferzeit, Hersteller-/Sicherheitsinformationen und rechtliche Pflichtangaben vollständig.","⚪"],
["03","Bestellung testen","Eine eigene Testbestellung durchführen und Zahlungs-, Versand- und Trackingprozess prüfen.","⚪"],
["04","Kunden erreichen","Zuerst kostenlose/organische Kanäle: Google, relevante Communities, Social Content und Marktplatz-Listing nach Prüfung.","⚪"],
["05","Messen","Besucher → Produktansicht → Warenkorb → Kauf → Marge. Nur mit echten Zahlen optimieren.","⚪"]
];

const channels=[
["Eigener Shop","Langfristiger eigener Kundenkanal","🟡","Nach Produktfreigabe"],
["Marktplatz","Hohe bestehende Nachfrage, aber Gebühren und Regeln prüfen","🟡","Nach Produkt-/Gebührenprüfung"],
["Google/SEO","Kostenloser organischer Kanal, benötigt Zeit und gute Produktseiten","🟡","Produktseite zuerst"],
["Social Content","Kurze Produktdemonstrationen und Problemlösung","🟡","Ohne Werbebudget starten"],
["Bezahlte Werbung","Skalierbar, aber Verlustrisiko","⚪","Erst nach belastbarer Marge"]
];

export default function KundenGewinnen(){
return <main className="shell">
<header><div className="eyebrow">E-COMMERCE · GO-TO-MARKET</div><h1>Von der Produktprüfung zum ersten Kunden.</h1><p>Wir verkaufen erst, wenn Produkt, Kosten, Sicherheit, Versand und Checkout belastbar sind.</p></header>
<nav><a href="/e-commerce">← E-Commerce-Zentrale</a><a href="/produkt-pipeline">Produkt-Pipeline</a><a href="/shop">Kalkulation</a></nav>
<section className="hero"><div><span>MARKT</span><b>Der deutsche E-Commerce wächst 2026 weiter.</b><p>Im 2. Quartal 2026 stieg der Online-Warenumsatz laut BEVH um 5,1 % gegenüber dem Vorjahresquartal. Auto-/Motorradzubehör lag bei +7,6 %, DIY & Blumen bei +10,9 % und Hobby/Freizeit bei +7,5 %. Das sind Marktindikatoren, keine Garantie für ein einzelnes Produkt.</p></div><div className="number">+5,1%<small>Q2 2026 Onlinehandel</small></div></section>
<section className="panel"><div className="head"><div><span className="eyebrow">UNSER VERKAUFSPROZESS</span><h2>Fünf Phasen</h2></div></div>{phases.map(([n,t,d,s])=><div className="row" key={n}><strong>{n}</strong><div><b>{t}</b><p>{d}</p></div><span>{s}</span></div>)}</section>
<section className="panel"><span className="eyebrow">KUNDENGEWINNUNG</span><h2>Kanäle</h2><div className="channels">{channels.map(([n,d,s,t])=><div key={n}><b>{n}</b><span>{s}</span><p>{d}</p><small>{t}</small></div>)}</div></section>
<section className="panel"><span className="eyebrow">WICHTIG VOR DEM VERKAUF</span><h2>Produktsicherheit ist Teil des Verkaufsprozesses.</h2><p className="text">Bei Online-Angeboten müssen unter der GPSR unter anderem Herstellerangaben, gegebenenfalls Angaben zur verantwortlichen Person in der EU, Produktidentifikation sowie relevante Warn-/Sicherheitsinformationen sichtbar bzw. leicht zugänglich sein. Deshalb bleibt ein Produkt ohne belastbare Produktunterlagen gesperrt.</p></section>
<section className="panel start"><span className="eyebrow">START OHNE GROSSES BUDGET</span><h2>So beginnen wir praktisch</h2><ol><li>1–3 konkrete Produkte mit echten Händlerkonditionen prüfen.</li><li>Für genau ein Produkt eine vollständige Netto-Margenkalkulation erstellen.</li><li>Produktseite und Testbestellung fertigstellen.</li><li>Danach organische Kanäle und einen geeigneten Marktplatz prüfen.</li><li>Erst bei echten Verkäufen über bezahlte Werbung skalieren.</li></ol></section>
<style jsx>{styles}</style>
</main>
}
const styles=`
*{box-sizing:border-box}.shell{min-height:100vh;background:#f6f7f9;color:#101828;font-family:Inter,system-ui,sans-serif;padding:38px 24px}header,nav,.hero,.panel{max-width:1240px;margin:auto}header{padding:12px 0 24px}.eyebrow{font-size:11px;font-weight:800;letter-spacing:.12em;color:#667085}h1{font-size:clamp(36px,5vw,60px);line-height:1;letter-spacing:-.05em;margin:8px 0 13px;max-width:900px}header p{font-size:17px;color:#667085;max-width:780px}nav{display:flex;gap:8px;flex-wrap:wrap;border-bottom:1px solid #e4e7ec;padding-bottom:18px}nav a{background:#fff;border:1px solid #d0d5dd;border-radius:8px;padding:9px 12px;color:#344054;text-decoration:none;font-size:13px}.hero{margin-top:18px;background:#101828;color:#fff;border-radius:14px;padding:22px;display:flex;justify-content:space-between;gap:30px}.hero span{font-size:10px;color:#98a2b3;font-weight:800;letter-spacing:.12em}.hero b{display:block;font-size:21px;margin-top:6px}.hero p{color:#d0d5dd;line-height:1.55;max-width:850px}.number{font-size:42px;font-weight:800;white-space:nowrap}.number small{display:block;font-size:11px;color:#98a2b3;font-weight:500}.panel{background:#fff;border:1px solid #e4e7ec;border-radius:14px;padding:22px;margin-top:14px}.panel h2{font-size:21px;margin:6px 0 0}.row{display:grid;grid-template-columns:50px 1fr 30px;gap:14px;padding:15px 0;border-bottom:1px solid #eaecf0}.row:last-child{border:0}.row>strong{color:#667085}.row p,.text{color:#667085;line-height:1.55;font-size:13px}.row b{font-size:14px}.channels{display:grid;grid-template-columns:repeat(5,1fr);gap:9px;margin-top:18px}.channels>div{background:#f9fafb;border:1px solid #eaecf0;border-radius:10px;padding:14px}.channels b{display:block}.channels span{display:block;margin-top:7px;font-size:18px}.channels p{font-size:12px;color:#667085;line-height:1.45}.channels small{font-size:11px;color:#667085}.start li{padding:8px 0;color:#344054}.start ol{margin-top:12px;padding-left:22px}@media(max-width:850px){.channels{grid-template-columns:1fr 1fr}.hero{display:block}.number{margin-top:15px}}@media(max-width:520px){.channels{grid-template-columns:1fr}.shell{padding:22px 14px}}`;
