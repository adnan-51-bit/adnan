// Auftrags- und Umsatzmodus (27.09.2026): Lead-Recherche, naechster Schritt, Angebot erst nach Freigabe, Umsatz-Pipeline.
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("data:text/javascript," + encodeURIComponent(
  'export async function resolve(s, c, n) { const fix = (s === "next/server" || (s.startsWith(".") && !/\\.[cm]?js$/.test(s))) ? s + ".js" : s; return n(fix, c); }'
));
delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SECRET_KEY;
process.env.MASTER_API_SECRET = "test-secret";
const R = await import("../lib/lead-recherche.js");
const G = await import("../lib/google-profil.js");
const P = await import("../lib/pilot.js");
const L = await import("../lib/leads.js");
const eq = await import("../lib/einnahmequellen.js");
const F = await import("../lib/freigaben.js");
const fin = await import("../lib/master-finance.js");
const tasks = await import("../lib/master-tasks.js");
const { umsatzPipeline } = await import("../lib/umsatz-pipeline.js");
beforeEach(() => { L.resetLeadsFuerTests(); eq.resetEinnahmequellenFuerTests(); F.resetFreigabenFuerTests(); });

const seite = (name, branche, ort = "Monheim am Rhein") => `<title>${name} - ${branche} in ${ort}</title><script type="application/ld+json">${JSON.stringify({ "@type": "LocalBusiness", name, url: "https://" + name.toLowerCase().replace(/\W/g, "") + ".test" })}</script>`;
const SEITEN = { a: seite("Salon A", "Friseur"), b: seite("Allianz B", "Versicherung"), c: seite("Maler C", "Malerbetrieb"), d: seite("Bäckerei D", "Bäckerei"), e: seite("Kosmetik E", "Kosmetikstudio"), f: seite("Café F", "Café", "Langenfeld") };
const mockFetch = async url => url.endsWith("sitemap-vendors.xml")
  ? { ok: true, text: async () => Object.keys(SEITEN).map(k => `<url><loc>${R.VERZEICHNIS}/vendors/${k}</loc></url>`).join("") }
  : { ok: true, text: async () => SEITEN[url.split("/").pop()] || "" };

test("Recherche: Detailseite parsen, nur passende Branchen in Monheim, keine Versicherungen/Ketten", () => {
  assert.deepEqual(R.parseDetail(SEITEN.a), { firma: "Salon A", branche: "Friseur", ort: "Monheim am Rhein", website: "https://salona.test" });
  assert.equal(R.parseDetail(SEITEN.f), null, "nicht Monheim");
  assert.equal(R.passt(R.parseDetail(SEITEN.b)), false); assert.equal(R.passt(R.parseDetail(SEITEN.c)), true);
  assert.equal(R.parseDetail("<title>Blumen X - Blumen &amp; Floristik in Monheim am Rhein</title>").branche, "Blumen & Floristik");
  assert.equal(R.parseSitemap(`<loc>${R.VERZEICHNIS}/vendors/x</loc><loc>${R.VERZEICHNIS}/other</loc>`).length, 1);
});

test("Recherche-Lauf: höchstens 5 neu, nichts wenn genug Betriebe auf Analyse warten, keine Doppelten", async () => {
  const angelegt = [];
  const anlegen = async x => { angelegt.push(x); return { id: "id" + angelegt.length }; };
  let r = await R.rechercheLauf({ bekannt: new Set([R.VERZEICHNIS + "/vendors/a"]), wartend: 0, anlegen, fetchImpl: mockFetch, heute: "2026-09-28" });
  assert.equal(r.neu.length, 3); assert.ok(angelegt.every(x => /^https:\/\/www\.monheimer-lokalhelden\.de\/vendors\//.test(x.quelle_url) && x.quelle_datum === "2026-09-28"));
  assert.ok(!angelegt.some(x => x.firma === "Salon A" || x.firma === "Allianz B"), "bekannt bzw. ausgeschlossen");
  assert.ok(angelegt.every(x => !("telefon" in x) && !("email" in x)), "keine Kontaktdaten gespeichert");
  r = await R.rechercheLauf({ bekannt: new Set(), wartend: 5, anlegen, fetchImpl: mockFetch });
  assert.equal(r.neu.length, 0); assert.match(r.grund, /warten noch/);
  r = await R.rechercheLauf({ bekannt: new Set(), wartend: 4, anlegen: async () => ({ id: "x" }), fetchImpl: mockFetch });
  assert.equal(r.neu.length, 1, "Warteschlange wird nie größer als 5");
});

test("Nächster Schritt: weitester Betrieb zuerst; Betrieb ohne Google-Profil nachrangig", () => {
  const ana = (punkte, ohne = false) => ({ punkte, werte: ohne ? { kategorie: "nein", kontakt: "nein" } : { kategorie: "ja", kontakt: "ja" } });
  const lauck = { id: "l", firma: "Lauck", status: "NEU", profil_analyse: ana(0, true) }, haar = { id: "h", firma: "Haargenau", status: "NEU", profil_analyse: ana(33) };
  assert.match(G.prioritaet(lauck).text, /kein Google-Profil/);
  assert.equal(G.naechstePilotAktion([lauck, haar]).lead_id, "h");
  const haarFrei = { ...haar, pilot_crm: { kontakt_freigegeben: true } };
  const na = G.naechstePilotAktion([lauck, haarFrei, { id: "b", firma: "B", status: "NEU", profil_analyse: ana(10) }]);
  assert.equal(na.lead_id, "h"); assert.match(na.text, /persönlich zeigen/);
});

test("Angebot: Entwurf automatisch bei Interesse; Freigabe erst mit Monatspreis; übergeben → Nachfassen; Auftrag ohne Doppelbuchung", async () => {
  const q = await eq.createEinnahmequelle({ name: "Pflege Google-Unternehmensprofil", kategorie: "C" });
  const l = await P.potenziellenKundenAnlegen({ firma: "Testsalon", ort: "Monheim am Rhein", branche: "Friseur", quelle_url: "https://verzeichnis.test/t", quelle_datum: "2026-09-27" });
  await P.analyseSpeichern(l.id, { quelle: "https://maps.google.com/?cid=9", datum: "2026-09-27", werte: Object.fromEntries(G.KRITERIEN.map(k => [k.id, k.id === "beschreibung" ? "nein" : "ja"])) });
  await P.kontaktEntscheidung(l.id, true);
  await L.leadStatusSetzen(l.id, "KONTAKT"); await L.leadStatusSetzen(l.id, "INTERESSENT");
  let lead = (await L.listLeads()).find(x => x.id === l.id);
  assert.equal(lead.angebot.status, "entwurf"); assert.match(lead.angebot.text, /\[Monatspreis – noch festzulegen\]/);
  const fg = (await F.listFreigaben()).find(f => f.bezug_typ === "angebot" && f.bezug_id === l.id);
  assert.ok(fg); assert.match(fg.titel, /Angebot für „Testsalon“ freigeben/);
  await assert.rejects(() => F.freigabeEntscheiden(fg.id, "FREIGEGEBEN"), /Monatspreis/);
  assert.equal((await F.listFreigaben()).find(f => f.id === fg.id).status, "OFFEN", "bleibt offen ohne Preis");
  await P.preisFestlegen(4900);
  await F.freigabeEntscheiden(fg.id, "FREIGEGEBEN", "ok");
  lead = (await L.listLeads()).find(x => x.id === l.id);
  assert.equal(lead.angebot.status, "freigegeben"); assert.match(lead.angebot.text, /49,00\s€ pro Monat/); assert.equal(lead.angebot.betrag_cent, null);
  await L.leadStatusSetzen(l.id, "ANGEBOT");
  const t = (await tasks.listTasks()).filter(x => x.quelle === "lead:" + l.id);
  assert.equal(t.find(x => /^Angebot übergeben/.test(x.title)).status, "Erledigt"); assert.ok(t.find(x => /^Angebot nachfassen: Testsalon/.test(x.title)));
  const vorher = (await fin.listFinance()).length;
  const e = await L.angebotEntscheidung(l.id, true);
  assert.equal(e.lead.status, "KUNDE"); assert.equal(e.buchung, null, "keine Einnahmebuchung beim Auftrag – erst monatlich offen, bezahlt nur mit Nachweis");
  assert.equal((await fin.listFinance()).length, vorher);
  assert.equal((await tasks.listTasks()).find(x => /^Angebot nachfassen: Testsalon/.test(x.title)).status, "Erledigt");
  assert.equal(G.naechstePilotAktion((await L.listLeads()).filter(x => x.einnahmequelle_id === q.id)).stufe, "KUNDE");
});

test("Umsatz-Pipeline: Stufen nur aus echten Daten, bezahlt nur mit bestätigter Nicht-Test-Buchung", () => {
  const leads = [{ id: "1", status: "NEU" }, { id: "2", status: "KONTAKT" }, { id: "3", status: "INTERESSENT", angebot: { status: "entwurf" } }, { id: "4", status: "ANGEBOT", angebot: { status: "gesendet" } }, { id: "5", status: "KUNDE", angebot: { status: "angenommen" } }, { id: "6", status: "VERLOREN" }];
  const finance = [{ kind: "income", status: "confirmed", amount: 49, lead_id: "5" }, { kind: "income", status: "confirmed", amount: 99, lead_id: "4", ist_test: true }, { kind: "income", status: "pending", amount: 49, lead_id: "4" }];
  const tk = [{ title: "Nachfassen nach Gespräch: X", status: "Offen", quelle: "lead:2" }, { title: "Angebot nachfassen: Y", status: "Erledigt", quelle: "lead:4" }];
  const u = umsatzPipeline({ leads, tasks: tk, finance, naechsterSchritt: "X" });
  assert.deepEqual(u.stufen.map(s => [s.id, s.anzahl]), [["leads", 5], ["analysiert", 0], ["vorbereitet", 0], ["wartet", 0], ["interesse", 3], ["angebot", 2], ["auftrag", 1], ["bezahlt", 1]]);
  const v = umsatzPipeline({ leads: [{ id: "a", status: "NEU", profil_analyse: { punkte: 33 } }, { id: "b", status: "NEU", profil_analyse: { punkte: 60 }, pilot_crm: { kontakt_freigegeben: true } }], aktuellerLead: { name: "A" }, claudeErledigt: ["x"], duMusst: ["y"] });
  assert.deepEqual(v.stufen.slice(0, 4).map(s => s.anzahl), [2, 2, 2, 1]); assert.equal(v.aktuellerLead.name, "A"); assert.deepEqual([v.claudeErledigt, v.duMusst], [["x"], ["y"]]);
  assert.equal(u.kennzahlen.offeneNachfassungen, 1); assert.equal(u.kennzahlen.angebote, 3); assert.equal(u.kennzahlen.einnahmen_cent, 4900); assert.equal(u.kennzahlen.offen_cent, 4900);
  assert.equal(u.naechsterSchritt, "X");
});

test("Top-5: nachvollziehbar bewertet – Lücken, unbeanspruchtes Profil vorn, kein Profil/gut gepflegt/kontaktiert hinten bzw. raus", async () => {
  const { top5, leadBewertung } = await import("../lib/umsatz-pipeline.js");
  const a = (punkte, extra = {}) => ({ punkte, verbesserungen: [{ text: "Beschreibung ergänzen.", dringend: true }], werte: { kategorie: "ja", kontakt: "ja" }, notiz: "", ...extra });
  const L = [
    { id: "1", firma: "Haar", status: "NEU", profil_analyse: a(33), quelle: "https://q.test/1 (abgerufen 2026-09-27)" },
    { id: "2", firma: "Back", status: "NEU", profil_analyse: a(30, { notiz: "Profil ist NICHT vom Inhaber beansprucht" }) },
    { id: "3", firma: "Ohne", status: "NEU", profil_analyse: a(0, { werte: { kategorie: "nein", kontakt: "nein" } }) },
    { id: "4", firma: "Gut", status: "NEU", profil_analyse: a(86) },
    { id: "5", firma: "Schon", status: "KONTAKT", profil_analyse: a(10) },
    { id: "6", firma: "Neu", status: "NEU" },
  ];
  const t = top5(L);
  assert.deepEqual(t.map(x => x.name), ["Back", "Haar", "Ohne"]);
  assert.equal(t[1].quelle, "https://q.test/1"); assert.match(t[0].gruende.join(" "), /nicht vom Inhaber beansprucht/); assert.match(t[2].gruende.join(" "), /kein Google-Profil/);
  assert.equal(leadBewertung(L[5]), null);
});

test("Recherche merkt sich geprüfte Seiten 30 Tage – kein doppeltes Prüfen am selben Tag", async () => {
  const anlegen = async () => ({ id: "x" });
  const r1 = await R.rechercheLauf({ bekannt: new Set(), wartend: 4, anlegen, fetchImpl: mockFetch, heute: "2026-09-28" });
  assert.equal(r1.neu.length, 1); assert.ok(Object.keys(r1.gemerkt).length >= 1);
  const r2 = await R.rechercheLauf({ bekannt: new Set(), wartend: 0, anlegen, fetchImpl: mockFetch, heute: "2026-09-28", schonGeprueft: r1.gemerkt });
  assert.ok(!Object.keys(r1.gemerkt).some(u => r2.neu.some(n => u.endsWith(n.firma))), "gemerkte Seiten nicht erneut");
  assert.equal(r2.geprueft + Object.keys(r1.gemerkt).length, 6);
  const r3 = await R.rechercheLauf({ bekannt: new Set(), wartend: 0, anlegen, fetchImpl: mockFetch, heute: "2026-11-15", schonGeprueft: r1.gemerkt });
  assert.equal(r3.geprueft, 6, "nach 30 Tagen wieder prüfbar");
});
