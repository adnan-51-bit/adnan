"use client";

const items=[
["🟢","Technische Basis","Master-Zentrale, E-Commerce-Zentrale, Lieferanten, Produkt-Pipeline und Kundengewinnung sind als Web-Oberflächen vorhanden.","System"],
["🟡","Lieferantenkonto","Für geschützte Händlerpreise müssen Händlerzugänge hergestellt werden.","Du"],
["🟡","Produkt","Mindestens ein Produkt vollständig kalkulieren und Quality Gate abschließen.","Gemeinsam"],
["🟡","Shop & Checkout","Produktseite, Zahlung, Versand, Widerruf, Datenschutz und Bestellprozess produktionsreif machen.","System + externe Konten"],
["🟡","Testbestellung","Ein echter End-to-End-Test vor Kundengewinnung.","Du"],
["⚪","Kundengewinnung","Erst organisch/marktplatzorientiert testen; Werbung erst nach belastbarer Marge.","Gemeinsam"],
["⚪","Skalierung","Nur Produkte/Kanäle mit echten positiven Kennzahlen ausbauen.","Gemeinsam"]
];

export default function Start(){
return <main className="shell">
<header><div className="eyebrow">MASTER-ZENTRALE · START</div><h1>So starten wir tatsächlich.</h1><p>Das System ist vorbereitet. Jetzt fehlen nur noch die externen Dinge, die niemand seriös im Hintergrund erledigen kann: Händlerfreischaltungen, Zahlungs-/Shopkonten und die finale rechtliche Prüfung.</p></header>
<nav><a href="/zentral">Master-Zentrale</a><a href="/e-commerce">E-Commerce</a><a href="/produkt-pipeline">Produkt-Pipeline</a><a href="/kunden-gewinnen">Kunden gewinnen</a></nav>
<section className="hero"><b>Unser Ziel: 1 funktionierender Verkauf statt 100 unfertiger Produkte.</b><p>Wir messen echte Kosten und echte Verkäufe. Umsatz oder Gewinn werden nicht behauptet, bevor sie tatsächlich entstehen.</p></section>
<section className="panel">{items.map(([s,t,d,w])=><div className="item" key={t}><span>{s}</span><div><b>{t}</b><p>{d}</p></div><small>{w}</small></div>)}</section>
<section className="panel"><span className="eyebrow">DEINE WENIGEN NOTWENDIGEN AKTIONEN</span><h2>Nur wenn ein externer Zugang erforderlich ist</h2><ol><li>Händlerkonto bei einem ausgewählten Lieferanten freischalten.</li><li>Erforderliche Unternehmens-/Zahlungsdaten für Shop und Zahlungsanbieter bereitstellen.</li><li>Erste Testbestellung nach ausdrücklicher Freigabe durchführen.</li><li>Rechtstexte und Produktdaten final prüfen/freigeben.</li></ol></section>
<section className="panel"><span className="eyebrow">WAS ICH ÜBERNEHME</span><h2>Der Rest wird von mir strukturiert vorbereitet.</h2><p className="text">Recherche, Produktvergleich, Kalkulationslogik, Quality Gates, Seitenstruktur, Dokumentation, technische Aufgaben und die Reihenfolge der nächsten Schritte werden im Projekt fortgeführt. Wo ein Dienst eine Anmeldung, Identitätsprüfung, Gewerbenachweis oder Zahlungsfreigabe verlangt, stoppt das System an diesem Punkt statt Zugangsdaten oder Tatsachen zu erfinden.</p></section>
<style jsx>{styles}</style>
</main>
}
const styles=`
*{box-sizing:border-box}.shell{min-height:100vh;background:#f6f7f9;color:#101828;font-family:Inter,system-ui,sans-serif;padding:38px 24px}header,nav,.hero,.panel{max-width:1120px;margin:auto}header{padding:12px 0 24px}.eyebrow{font-size:11px;font-weight:800;letter-spacing:.12em;color:#667085}h1{font-size:clamp(38px,5vw,60px);line-height:1;letter-spacing:-.05em;margin:8px 0 13px}header p{color:#667085;font-size:17px;line-height:1.55;max-width:850px}nav{display:flex;gap:8px;flex-wrap:wrap;border-bottom:1px solid #e4e7ec;padding-bottom:18px}nav a{background:#fff;border:1px solid #d0d5dd;border-radius:8px;padding:9px 12px;text-decoration:none;color:#344054;font-size:13px}.hero{margin-top:18px;background:#101828;color:#fff;border-radius:14px;padding:22px}.hero b{font-size:21px}.hero p{color:#d0d5dd;line-height:1.5}.panel{background:#fff;border:1px solid #e4e7ec;border-radius:14px;padding:22px;margin-top:14px}.item{display:grid;grid-template-columns:40px 1fr 100px;gap:14px;align-items:start;padding:16px 0;border-bottom:1px solid #eaecf0}.item:last-child{border:0}.item>span{font-size:20px}.item b{font-size:15px}.item p,.text{margin:5px 0 0;color:#667085;line-height:1.5;font-size:13px}.item small{color:#667085;text-align:right}.panel h2{font-size:21px;margin:6px 0 0}.panel li{padding:7px 0;color:#344054}@media(max-width:600px){.item{grid-template-columns:35px 1fr}.item small{grid-column:2;text-align:left}.shell{padding:22px 14px}}`;
