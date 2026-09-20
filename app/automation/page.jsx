"use client";

const flows=[
["Neue Bestellung","Zahlung bestätigt → Bestellung erfassen → Produkt/Lieferant prüfen → Lieferauftrag vorbereiten → Tracking speichern → Kunde informieren","🟡"],
["Lieferantenprüfung","Produktdaten → EK → Versand → Lieferzeit → Retouren → Compliance → Marge → Quality Gate","🟢"],
["Kundengewinnung","Produkt freigegeben → Produktseite → organische Veröffentlichung → Klicks messen → Warenkorb → Kauf → Conversion","🟡"],
["Finanzen","Bestellung → Umsatz → Gebühren → Lieferkosten → Marketing → Retourenreserve → Deckungsbeitrag","🟡"],
["Fehlerwache","Fehler in Zahlung/Bestellung/Versand → Aufgabe erzeugen → Status rot → keine weitere automatische Bestellung","🟡"]
];

export default function Automation(){
return <main className="shell"><header><div className="eyebrow">E-COMMERCE · AUTOMATION</div><h1>Automations-Zentrale</h1><p>So weit wie möglich automatisch. Kritische Schritte werden gesperrt, wenn echte Daten, Freigaben oder externe Konten fehlen.</p></header>
<nav><a href="/zentral">Master-Zentrale</a><a href="/e-commerce">E-Commerce</a><a href="/produkt-pipeline">Produkt-Pipeline</a><a href="/start">Start</a></nav>
<section className="hero"><b>Automatik-Regel</b><p>Das System darf wiederholbare Abläufe automatisieren. Es darf aber keine Händlerkonten eröffnen, Identitäten bestätigen, rechtliche Erklärungen abgeben, Geld ausgeben oder eine Produktfreigabe erfinden.</p></section>
<section className="panel">{flows.map(([t,d,s])=><div className="row" key={t}><div><span>{s}</span><b>{t}</b><p>{d}</p></div></div>)}</section>
<section className="panel"><span className="eyebrow">AUTOMATISIERBAR</span><h2>🟢</h2><ul><li>Produktstatus und Quality-Gates</li><li>Kosten- und Margenberechnung</li><li>Bestellstatus und Tracking</li><li>Aufgaben und Fehlerstatus</li><li>Benachrichtigungen</li><li>Reporting und Tagesübersicht</li><li>Technische Build-/CI-Prüfung</li></ul></section>
<section className="panel"><span className="eyebrow">FREIGABE ERFORDERLICH</span><h2>🔴</h2><ul><li>Lieferantenvertrag/Händlerkonto</li><li>Zahlungsanbieter und Bank</li><li>Gewerbe-/Steuerangaben</li><li>erste echte Bestellung</li><li>Werbebudget</li><li>rechtliche Endfreigabe</li></ul></section>
<style jsx>{styles}</style></main>
}
const styles=`
*{box-sizing:border-box}.shell{min-height:100vh;background:#f6f7f9;color:#101828;font-family:Inter,system-ui,sans-serif;padding:38px 24px}header,nav,.hero,.panel{max-width:1120px;margin:auto}header{padding:12px 0 24px}.eyebrow{font-size:11px;font-weight:800;letter-spacing:.12em;color:#667085}h1{font-size:clamp(38px,5vw,60px);line-height:1;letter-spacing:-.05em;margin:8px 0 13px}header p{font-size:17px;color:#667085;max-width:800px;line-height:1.5}nav{display:flex;gap:8px;flex-wrap:wrap;border-bottom:1px solid #e4e7ec;padding-bottom:18px}nav a{background:#fff;border:1px solid #d0d5dd;border-radius:8px;padding:9px 12px;text-decoration:none;color:#344054;font-size:13px}.hero{margin-top:18px;background:#101828;color:#fff;border-radius:14px;padding:22px}.hero b{font-size:21px}.hero p{color:#d0d5dd;line-height:1.55}.panel{background:#fff;border:1px solid #e4e7ec;border-radius:14px;padding:22px;margin-top:14px}.row{padding:16px 0;border-bottom:1px solid #eaecf0}.row:last-child{border:0}.row span{font-size:20px;margin-right:10px}.row b{font-size:15px}.row p{color:#667085;font-size:13px;line-height:1.55;margin-left:31px}.panel h2{font-size:20px}.panel li{padding:6px 0;color:#344054}`;
