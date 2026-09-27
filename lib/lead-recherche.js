// Taegliche Lead-Recherche (27.09.2026): neue passende lokale Betriebe aus dem oeffentlichen Verzeichnis
// "Monheimer Lokalhelden" (robots.txt: Allow /; Betriebs-Sitemap). Gespeichert wird nur: Firmenname, Branche, Ort,
// Quelle (Detailseite) und ggf. Website - keine Telefonnummern/E-Mails. Kontakt nimmt die Zentrale nie auf.
// Begrenzung: hoechstens 3 neue Betriebe pro Lauf, nur wenn weniger als 3 Betriebe auf eine Analyse warten,
// hoechstens 20 Seitenabrufe pro Lauf (schonend fuer das Verzeichnis).
export const VERZEICHNIS = "https://www.monheimer-lokalhelden.de";
export const MAX_NEU = 3, MAX_ABRUFE = 20, MAX_WARTEND = 3;
const UA = { "User-Agent": "Werknetz24-Master-Zentrale/1.0 (Lead-Recherche, 1x taeglich, oeffentliche Firmendaten)" };
// Passende Branchen: kleine lokale Betriebe, fuer die ein gepflegtes Google-Profil Kunden bringt.
export const PASSEND = /(friseur|barbier|barber|kosmetik|nagel|beauty|massage|fußpflege|fusspflege|elektr|maler|sanitär|heizung|dachdeck|schreiner|tischler|fliesen|garten|landschaftsbau|autowerkstatt|kfz|lackier|reifen|karosserie|blumen|florist|bäcker|konditor|café|cafe|fleischer|metzger|schneider|textilreinigung|reinigung|schlüssel|fahrschule|fotograf|hundesalon|goldschmied|uhrmacher|schuhmacher)/i;
// Nicht ansprechen: Ketten/Vertretungen, Heilberufe (Werberecht), Behoerden/Vereine/Bildung.
export const AUSSCHLUSS = /(versicherung|allianz|ergo|signal iduna|barmenia|gothaer|bank|sparkasse|apotheke|arzt|ärzt|praxis|zahn|klinik|hotel|stadt |stadtverwaltung|verein|kirche|gemeinde|schule(?!.*fahr)|kita|kindergarten|kinderbetreuung|partei|stiftung)/i;

// HTML-Entitaeten im Seitentitel (z. B. "&amp;") in normale Zeichen umwandeln.
export const entities = t => String(t).replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&quot;/g, "\"").replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

export function parseSitemap(xml) { return [...String(xml).matchAll(/<loc>([^<]*\/vendors\/[^<]+)<\/loc>/g)].map(m => m[1].trim()); }

// Detailseite -> { firma, branche, ort, website } oder null. Titelformat: "Name - Branche in Monheim am Rhein".
export function parseDetail(html) {
  const s = String(html);
  const titel = entities(((s.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "").replace(/\s+/g, " ").trim());
  const m = titel.match(/^(.+?) - (.+?) in (Monheim am Rhein.*)$/);
  let ld = null;
  for (const x of s.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { try { const j = JSON.parse(x[1]); if (j["@type"] === "LocalBusiness") { ld = j; break; } } catch { /* ungueltiges JSON ignorieren */ } }
  const firma = (ld?.name || m?.[1] || "").trim();
  const branche = (m?.[2] || "").trim();
  const ortText = [m?.[3], ld?.address?.addressLocality, typeof ld?.address === "string" ? ld.address : ""].filter(Boolean).join(" ");
  if (!firma || !branche || !/monheim/i.test(ortText)) return null;
  const web = [ld?.url, ...(Array.isArray(ld?.sameAs) ? ld.sameAs : [])].find(u => /^https?:\/\//.test(u || "") && !/monheimer-lokalhelden|facebook|instagram/i.test(u)) || "";
  return { firma: firma.slice(0, 200), branche: branche.slice(0, 120), ort: "Monheim am Rhein", website: web };
}
export const passt = d => Boolean(d) && PASSEND.test(d.branche + " " + d.firma) && !AUSSCHLUSS.test(d.branche + " " + d.firma);

// Ein Lauf. bekannt: Set bekannter Quellen-URLs/Firmennamen; anlegen: Funktion zum Speichern (potenziellenKundenAnlegen).
export async function rechercheLauf({ bekannt, wartend, anlegen, fetchImpl = fetch, heute = new Date().toISOString().slice(0, 10) }) {
  if (wartend >= MAX_WARTEND) return { neu: [], geprueft: 0, grund: `${wartend} Betriebe warten noch auf die Profil-Analyse – keine neue Recherche` };
  const r = await fetchImpl(VERZEICHNIS + "/sitemap-vendors.xml", { headers: UA });
  if (!r.ok) throw new Error("Verzeichnis-Sitemap nicht erreichbar (HTTP " + r.status + ")");
  const urls = parseSitemap(await r.text()).filter(u => !bekannt.has(u));
  // Taeglich andere Reihenfolge (deterministisch nach Datum), damit nicht immer dieselben Seiten geprueft werden.
  const seed = [...heute].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
  urls.sort((a, b) => ((hash(a) ^ seed) >>> 0) - ((hash(b) ^ seed) >>> 0));
  const neu = [], abgelehnt = []; let geprueft = 0;
  for (const url of urls) {
    if (neu.length >= MAX_NEU - wartend || geprueft >= MAX_ABRUFE) break;
    geprueft++;
    const d = await fetchImpl(url, { headers: UA }).then(x => x.ok ? x.text() : "").then(parseDetail).catch(() => null);
    if (!passt(d) || bekannt.has(d.firma.toLowerCase())) { abgelehnt.push(url.split("/").pop()); continue; }
    try { const l = await anlegen({ ...d, quelle_url: url, quelle_datum: heute, notiz: "Automatisch aus dem öffentlichen Verzeichnis Monheimer Lokalhelden (Branche laut Verzeichnis). Google-Profil noch nicht geprüft." }); neu.push({ id: l.id, firma: d.firma, branche: d.branche }); bekannt.add(d.firma.toLowerCase()); }
    catch (e) { abgelehnt.push(d.firma + ": " + e.message); }
  }
  return { neu, geprueft, abgelehnt: abgelehnt.length };
}
function hash(s) { let h = 0; for (const c of s) h = (h * 33 + c.charCodeAt(0)) >>> 0; return h; }
