import { notFound } from "next/navigation";
import { RECHTSTEXTE } from "../../../lib/shop-rechtstexte.js";
import { RECHTSTEXT_SEITEN, rechtstexteVollstaendig } from "../../../lib/shop.js";
import { SHOP_NAME } from "../../../lib/shop-marke.js";

// Rechtstexte des Shops. Es wird NUR ein von Adnan freigegebener Text gezeigt (lib/shop-rechtstexte.js,
// vollstaendig und ohne [Platzhalter]) - sonst ehrlich "noch nicht veroeffentlicht". Kein erfundener Text.
const TITEL = { impressum: "Impressum", datenschutz: "Datenschutzerklärung", agb: "Allgemeine Geschäftsbedingungen", widerruf: "Widerrufsbelehrung" };

export function generateStaticParams() { return RECHTSTEXT_SEITEN.map(seite => ({ seite })); }
export const dynamicParams = false;

export default async function Rechtstext({ params }) {
  const { seite } = await params;
  if (!RECHTSTEXT_SEITEN.includes(seite)) notFound();
  const text = rechtstexteVollstaendig() ? RECHTSTEXTE[seite] : null;
  return <main style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px", fontFamily: "Inter,ui-sans-serif,system-ui,sans-serif", color: "#101828", background: "#fff", minHeight: "100vh" }}>
    <p><a href="/laden" style={{ color: "#175cd3" }}>← {SHOP_NAME}</a></p>
    <h1>{TITEL[seite]}</h1>
    {text ? <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{text}</div> : <p>Dieser Text wird vor der Eröffnung des Shops veröffentlicht.</p>}
  </main>;
}
