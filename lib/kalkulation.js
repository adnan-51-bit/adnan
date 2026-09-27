// Sortiert24-Produktkalkulation und Pruefliste (27.09.2026). Reine Rechenfunktionen ohne Server-Abhaengigkeit,
// damit Admin-Oberflaeche und Server exakt gleich rechnen.
//
//   EK netto + Versand + sonstige nachweisbare Kosten = Einstandskosten
//   VK netto - Einstandskosten                        = Rohmarge
//   Rohmarge / VK netto x 100                         = Rohmargenquote
//
// VK netto wird aus dem gespeicherten Endpreis (brutto) mit dem Umsatzsteuersatz aus lib/shop-marke.js
// berechnet. Alle Betraege in Cent.
import { UMSATZSTEUER_SATZ } from "./shop-marke.js";

export const KATALOG_STATUS = ["RECHERCHIEREN", "GEPRUEFT", "BEREIT", "GESPERRT"];
export const KATALOG_LABEL = { RECHERCHIEREN: "Recherchieren", GEPRUEFT: "Geprüft", BEREIT: "Bereit", GESPERRT: "Gesperrt" };
export const BILDRECHTE = { ungeklaert: "ungeklärt", haendlerfreigabe: "Händlerfreigabe des Lieferanten", eigene: "eigene Fotos", lizenz: "Lizenz vorhanden" };

const int = v => (Number.isInteger(v) ? v : null);

export function kalkuliere(p, ustSatz = UMSATZSTEUER_SATZ) {
  const ek = int(p?.einkaufspreis_cent), versand = int(p?.versandkosten_cent), sonstige = int(p?.sonstige_kosten_cent) ?? 0;
  const vkBrutto = int(p?.verkaufspreis_cent);
  const vkNetto = vkBrutto === null ? null : Math.round(vkBrutto / (1 + ustSatz / 100));
  const einstand = ek === null || versand === null ? null : ek + versand + sonstige;
  const rohmarge = einstand === null || vkNetto === null ? null : vkNetto - einstand;
  const quote = rohmarge === null || !vkNetto ? null : Math.round((rohmarge / vkNetto) * 1000) / 10;
  return { ek, versand, sonstige, einstand, vkBrutto, vkNetto, rohmarge, quote, ustSatz };
}

export const BILDART = { produktfoto: "echtes Produktfoto", symbolbild: "Symbolbild" };
// Anzeige: ein Bild wird gezeigt, sobald es vorhanden und das Nutzungsrecht geklaert ist (auch ein Symbolbild).
export const bildFehlt = p => !(Array.isArray(p?.bilder) && p.bilder.length) || !p?.bildrechte || p.bildrechte === "ungeklaert";
export const istSymbolbild = p => p?.bildart === "symbolbild";

// Pruefliste fuer "Produkt pruefen": jeder Punkt braucht eine Zahl UND ihre Quelle.
export function pruefpunkte(p, suppliers = []) {
  const k = kalkuliere(p);
  const lief = suppliers.find(s => s.id === p?.supplier_id);
  return [
    { id: "lieferant", ok: Boolean(lief && lief.status === "verifiziert"), text: "Lieferant zugeordnet und verifiziert" + (lief ? ` (${lief.name}: ${lief.status})` : "") },
    { id: "ek", ok: k.ek !== null && Boolean(p?.ek_quelle?.trim()), text: "Einkaufspreis netto mit Quelle + Datum" },
    { id: "versand", ok: k.versand !== null && Boolean(p?.versand_quelle?.trim()), text: "Versandkosten mit Quelle" },
    { id: "sonstige", ok: int(p?.sonstige_kosten_cent) === null || Boolean(p?.sonstige_kosten_quelle?.trim()), text: "Sonstige Kosten nur mit Nachweis" },
    { id: "bilder", ok: !bildFehlt(p) && Boolean(p?.bildquelle?.trim()) && p?.bildart === "produktfoto", text: "Echtes Produktfoto mit geklärtem Nutzungsrecht und Bildquelle (ein Symbolbild reicht für die Freigabe nicht)" },
    { id: "hersteller", ok: Boolean(p?.hersteller?.trim()), text: "Hersteller angegeben (Produktsicherheit/GPSR)" },
    { id: "texte", ok: Boolean(p?.kurzbeschreibung?.trim()) && Boolean(p?.beschreibung?.trim()), text: "Kurz- und ausführliche Beschreibung" },
    { id: "lieferzeit", ok: Boolean(p?.lieferzeit?.trim()), text: "Lieferzeit (Angabe des Lieferanten)" },
    { id: "marge", ok: k.rohmarge !== null && k.rohmarge > 0, text: "Verkaufspreis kalkuliert, Rohmarge positiv" + (k.quote !== null ? ` (${k.quote} %)` : "") },
  ];
}

export const pruefungBestanden = (p, suppliers) => pruefpunkte(p, suppliers).every(x => x.ok);

// EAN-8/EAN-13 mit Pruefziffer.
export function eanGueltig(ean) {
  if (!/^(\d{8}|\d{13})$/.test(ean)) return false;
  const z = ean.split("").map(Number), pruef = z.pop();
  const summe = z.reverse().reduce((s, d, i) => s + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (summe % 10)) % 10 === pruef;
}
