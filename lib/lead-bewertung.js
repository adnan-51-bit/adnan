// Lead-Bewertung nach 5 dokumentierten Kriterien (27.09.2026) - je 0 bis 2 Punkte, jeweils mit Begründung.
// Keine subjektive Einschätzung und keine Erfolgswahrscheinlichkeit: nur was gespeichert und öffentlich geprüft ist.
import { einmalBausteine } from "./google-profil.js";

const NAH = /monheim/i, UMGEBUNG = /(langenfeld|leverkusen|düsseldorf|duesseldorf|hilden|dormagen|solingen)/i;
export const KRITERIEN = [["bedarf", "Erkennbarer Bedarf"], ["kontakt", "Erreichbarer Kontaktweg"], ["angebot", "Passendes Angebot"], ["naehe", "Lokale Nähe"], ["info", "Vorhandene Informationen"]];

export function bewerteLead(l) {
  const a = l.profil_analyse;
  const k = {};
  if (!a) k.bedarf = [0, "noch nicht analysiert"];
  else k.bedarf = a.punkte < 50 ? [2, `deutliche Lücken (${a.punkte}/100)`] : a.punkte < 75 ? [1, `einige Lücken (${a.punkte}/100)`] : [0, `Profil gut gepflegt (${a.punkte}/100)`];
  const adresse = /Adresse|Standort:/i.test(l.notiz || "") || /d/.test(String(l.ort || "").replace(/d{5}/, ""));
  const wege = [l.telefon && "Telefon", l.website && "Website", adresse && "Adresse"].filter(Boolean);
  k.kontakt = wege.length >= 2 ? [2, "öffentlich: " + wege.join(", ")] : wege.length ? [1, "öffentlich nur: " + wege.join(", ")] : [0, "kein öffentlicher Kontaktweg gespeichert"];
  const b = einmalBausteine(a);
  const eingeschraenkt = /passt nur eingeschränkt/i.test(a?.notiz || "");
  k.angebot = eingeschraenkt ? [0, "passt laut Analyse nur eingeschränkt zum Angebot"] : b.length >= 3 ? [2, `${b.length} Bausteine des Einmal-Pakets passen`] : b.length ? [1, `${b.length} Baustein(e) passen`] : [0, a ? "kaum Ansatzpunkte" : "offen bis zur Analyse"];
  const ort = String(l.ort || "") + " " + String(l.notiz || "").slice(0, 400);
  k.naehe = NAH.test(l.ort || "") ? [2, "Monheim am Rhein"] : UMGEBUNG.test(ort) ? [1, "Umgebung"] : [0, "außerhalb der Umgebung / unbekannt"];
  const bewertbar = a ? Object.values(a.werte || {}).filter(v => v !== "unbekannt").length : 0;
  k.info = bewertbar >= 7 ? [2, `${bewertbar} von 10 Punkten geprüft`] : bewertbar >= 5 ? [1, `${bewertbar} von 10 Punkten geprüft`] : [0, a ? `nur ${bewertbar} Punkte prüfbar` : "keine Analyse"];
  const kriterien = KRITERIEN.map(([id, name]) => ({ id, name, punkte: k[id][0], begruendung: k[id][1] }));
  const summe = kriterien.reduce((s, x) => s + x.punkte, 0);
  return { summe, max: 10, stufe: summe >= 8 ? "HOCH" : summe >= 5 ? "MITTEL" : "NIEDRIG", kriterien };
}
