// Vertriebsstatus + Selbstpruefung (28.09.2026, Sales-Automat B2/B3). Reine Funktion aus gespeicherten Daten -
// erfindet nichts. Wird im Tagesbericht (jeden Morgen, Cron 07:00) und in der Umsatz-Pipeline angezeigt.
// "WARTET AUF MICH" = nur Schritte, die Adnan selbst tun muss (rechtlich oder als Geschaeftsentscheidung).
import { kundenStufe, prioritaet, besuchsRang, ladenlokal } from "./google-profil.js";
import { bewerteLead } from "./lead-bewertung.js";
import { istOffen } from "./aufgaben-status.js";

const TAG = 86400000;
const alt = (t, jetzt, tage) => t && jetzt - Date.parse(t) > tage * TAG;
const name = l => l.firma || l.name;
const norm = s => String(s || "").toLowerCase().replace(/[^a-z0-9äöüß]/g, "");
const PRIO_RANG = { HOCH: 0, MITTEL: 1, OFFEN: 2, NIEDRIG: 3 };

// leads: nur die Leads der Pilot-Einnahmequelle. audit: Automatisierungs-Laeufe (fuer "Recherche heute gelaufen?").
export function vertriebStatus({ leads = [], tasks = [], freigaben = [], audit = [], einnahmen_cent = 0, monatspreis_cent = null, jetzt = new Date() } = {}) {
  const now = +new Date(jetzt);
  const heute = new Date(jetzt).toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" });
  const tagVon = t => t ? new Date(t).toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" }) : "";
  const offen = tasks.filter(t => istOffen(t.status));
  const offeneVon = l => offen.filter(t => t.quelle === "lead:" + l.id);
  const mitStufe = leads.map(l => ({ l, stufe: kundenStufe(l) }));
  const inStufe = (...s) => mitStufe.filter(x => s.includes(x.stufe)).map(x => x.l);
  const antworten = leads.flatMap(l => (l.pilot_crm?.antworten || []).map(a => ({ ...a, lead: l })));
  const aktiv = l => !["GESPERRT", "VERLOREN"].includes(l.status);

  const zahlen = {
    leads: leads.length,
    neuHeute: leads.filter(l => tagVon(l.erstellt_am) === heute).length,
    ohneAnalyse: leads.filter(l => !l.profil_analyse && aktiv(l)).length,
    mitBedarf: leads.filter(l => l.profil_analyse && aktiv(l) && (bewerteLead(l).kriterien.find(k => k.id === "bedarf")?.punkte ?? 0) > 0).length,
    kontaktFreigegeben: inStufe("KONTAKT_FREIGEGEBEN").length,
    briefe: leads.filter(l => l.pilot_crm?.brief_am).length,
    antworten: antworten.length,
    interessenten: inStufe("INTERESSE").length,
    gespraeche: inStufe("GESPRAECH").length,
    angebote: inStufe("ANGEBOT").length,
    kunden: inStufe("KUNDE", "LAUFEND").length,
    keinInteresse: leads.filter(l => ["GESPERRT", "VERLOREN"].includes(l.status)).length,
    einnahmen_cent,
  };
  const neueAntworten = antworten.filter(a => now - Date.parse(a.datum) <= TAG).map(a => a.wahl === "gespraech"
    ? `${name(a.lead)}: möchte ein Gespräch – ${a.name}${a.telefon ? ", Tel. " + a.telefon : ""}${a.email ? ", " + a.email : ""}${a.wunsch ? " (" + a.wunsch + ")" : ""}`
    : `${name(a.lead)}: kein Interesse – wird nicht mehr kontaktiert`);

  // WARTET AUF MICH - in der Reihenfolge, die am schnellsten zu Geld fuehrt.
  const w = [];
  for (const t of offen.filter(t => /^📞 Interessent meldet sich/.test(t.title))) w.push(`WARTET AUF MICH: ${t.title.replace(/^📞 /, "")}${t.naechste_aktion ? " – " + t.naechste_aktion : ""}`);
  const angebotFg = freigaben.filter(f => f.status === "OFFEN" && f.bezug_typ === "angebot");
  if (angebotFg.length && !monatspreis_cent) w.push("WARTET AUF MICH: Preis festlegen – ein Interessent wartet auf ein Angebot");
  for (const f of angebotFg) w.push("WARTET AUF MICH: " + f.titel);
  // Ohne Ladenlokal (Privatadresse/Porto) nach hinten - nur als Anzahl genannt (28.09.2026).
  const freiOhneBrief = inStufe("KONTAKT_FREIGEGEBEN").filter(l => !l.pilot_crm?.brief_am && !l.pilot_crm?.zusammen_mit).sort((a, b) => besuchsRang(a) - besuchsRang(b));
  const druckbereit = freiOhneBrief.filter(l => ladenlokal(l).laden !== false), ohneLaden = freiOhneBrief.length - druckbereit.length;
  if (druckbereit.length) w.push(`WARTET AUF MICH: ${druckbereit.length} Brief(e) drucken (Pilot → „✉ Briefe mit Antwort-Link drucken“): ${druckbereit.map(name).join(", ")}${ohneLaden ? ` (${ohneLaden} weitere ohne Ladenlokal zurückgestellt)` : ""}`);
  const einwerfen = offen.filter(t => /^Brief einwerfen:/.test(t.title));
  if (einwerfen.length) w.push(`WARTET AUF MICH: ${einwerfen.length} Brief(e) einwerfen: ${einwerfen.map(t => t.title.replace(/^Brief einwerfen: /, "")).join(", ")}`);
  const kontaktFg = freigaben.filter(f => f.status === "OFFEN" && f.bezug_typ === "lead-kontakt");
  if (kontaktFg.length) {
    const top = kontaktFg.map(f => leads.find(l => l.id === f.bezug_id)).filter(Boolean)
      .sort((a, b) => (besuchsRang(a) - besuchsRang(b)) || (PRIO_RANG[prioritaet(a).stufe] - PRIO_RANG[prioritaet(b).stufe]) || (bewerteLead(b).summe - bewerteLead(a).summe)).slice(0, 3).map(name);
    w.push(`WARTET AUF MICH: ${kontaktFg.length} Kontakt-Freigabe(n) („Wartet auf mich“)${top.length ? " – zuerst: " + top.join(", ") : ""}`);
  }
  for (const t of offen.filter(t => /^Keine Antwort auf Brief/.test(t.title) && t.due_at && Date.parse(t.due_at) <= now)) w.push("WARTET AUF MICH: " + t.title);

  // Selbstpruefung: "fehler" = Widerspruch in den Daten (soll nie vorkommen), "hinweis" = etwas stockt.
  const befunde = [];
  for (const a of antworten.filter(a => a.wahl === "gespraech")) {
    const hatRueckruf = tasks.some(t => t.quelle === "lead:" + a.lead.id && /Interessent meldet sich/.test(t.title));
    if (!hatRueckruf) befunde.push({ art: "fehler", text: `${name(a.lead)}: Antwort „Gespräch“ ohne Rückruf-Aufgabe` });
  }
  for (const l of leads.filter(l => l.status === "GESPERRT" && offeneVon(l).length)) befunde.push({ art: "fehler", text: `${name(l)}: gesperrt (kein Kontakt gewünscht), aber ${offeneVon(l).length} offene Aufgabe(n)` });
  const gesehen = new Map();
  for (const l of leads) { const k = norm(name(l)) + "|" + norm(l.ort); if (gesehen.has(k)) befunde.push({ art: "fehler", text: `Doppelter Lead: ${name(l)} (${l.ort || "ohne Ort"})` }); else gesehen.set(k, l); }
  const stundeBerlin = Number(new Date(jetzt).toLocaleString("en-GB", { timeZone: "Europe/Berlin", hour: "2-digit", hour12: false }));
  const rechercheHeute = audit.some(e => e?.action === "automation.lauf" && e.details?.aktion === "lead-recherche" && tagVon(e.created_at) === heute);
  if (stundeBerlin >= 9 && !rechercheHeute) befunde.push({ art: "fehler", text: "Lead-Recherche ist heute nicht gelaufen (täglich 07:00)" });
  for (const l of inStufe("KONTAKT_FREIGEGEBEN").filter(l => !l.pilot_crm?.brief_am && alt(l.pilot_crm?.kontakt_freigabe_am, now, 3))) befunde.push({ art: "hinweis", text: `${name(l)}: seit über 3 Tagen freigegeben, aber noch kein Brief` });
  for (const l of leads.filter(l => !l.profil_analyse && aktiv(l) && alt(l.erstellt_am, now, 3))) befunde.push({ art: "hinweis", text: `${name(l)}: seit über 3 Tagen ohne Profil-Analyse` });
  for (const t of offen.filter(t => /Interessent meldet sich/.test(t.title) && t.due_at && Date.parse(t.due_at) < now)) befunde.push({ art: "hinweis", text: `Rückruf überfällig: ${t.title.replace(/^📞 Interessent meldet sich: /, "")}` });

  const zeile = `${zahlen.leads} Leads (${zahlen.neuHeute} neu heute, ${zahlen.ohneAnalyse} ohne Analyse) · ${zahlen.kontaktFreigegeben} freigegeben · ${zahlen.briefe} Briefe · ${zahlen.antworten} Antworten · ${zahlen.interessenten} Interessenten · ${zahlen.angebote} Angebote · ${zahlen.kunden} Kunden · Einnahmen ${(einnahmen_cent / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" })}`;
  return { zahlen, zeile, neueAntworten, wartetAufMich: w, befunde };
}
