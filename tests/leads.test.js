// Teil 4B (27.09.2026): E-Mail & Leads, Angebote, Einnahmen/Kosten je Einnahmequelle, Einnahme-Ablauf.
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("data:text/javascript," + encodeURIComponent(
  'export async function resolve(s, c, n) { const fix = (s === "next/server" || (s.startsWith(".") && !/\\.[cm]?js$/.test(s))) ? s + ".js" : s; return n(fix, c); }'
));
delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SECRET_KEY;
process.env.MASTER_API_SECRET = "test-secret";
const R = await import("../lib/leads-regeln.js");
const L = await import("../lib/leads.js");
const eq = await import("../lib/einnahmequellen.js");
const fin = await import("../lib/master-finance.js");
const tasks = await import("../lib/master-tasks.js");
const route = await import("../app/api/master/businesses/route.js");
const auth = await import("../lib/auth.js");
beforeEach(() => { L.resetLeadsFuerTests(); eq.resetEinnahmequellenFuerTests(); auth.resetLoginSperreFuerTests(); });

test("Informationen strukturieren: E-Mail, Telefon, Name, Firma aus eingefügtem Text", () => {
  const r = R.strukturiere("Hallo,\nwir suchen Hilfe bei unseren Anfragen.\nName: Petra Muster\nFirma: Muster Bau GmbH\nTel. 0171 2345678\npetra@muster-bau.test");
  assert.equal(r.email, "petra@muster-bau.test"); assert.equal(r.name, "Petra Muster"); assert.equal(r.firma, "Muster Bau GmbH"); assert.match(r.telefon, /0171 2345678/);
  assert.deepEqual(R.strukturiere(""), { name: "", firma: "", email: "", telefon: "" });
});

test("Antworten kategorisieren; Widerspruch hat Vorrang; nie automatisch 'Kunde'", () => {
  assert.equal(R.kategorisiereAntwort("Bitte keine weiteren E-Mails, danke. Interesse habe ich nicht."), "WIDERSPRUCH");
  assert.equal(R.kategorisiereAntwort("Nein danke, kein Interesse."), "ABSAGE");
  assert.equal(R.kategorisiereAntwort("Passt Donnerstag 10:00 Uhr für ein Telefonat?"), "TERMIN");
  assert.equal(R.kategorisiereAntwort("Klingt gut, was kostet das?"), "INTERESSE");
  assert.equal(R.kategorisiereAntwort("Wie lange dauert das?"), "FRAGE");
  assert.equal(R.kategorisiereAntwort("Danke für die Info."), "SONSTIGES");
  assert.equal(R.statusNachAntwort({ status: "KONTAKT" }, "ANGEBOT_ANGENOMMEN"), "KONTAKT");
  assert.equal(R.statusNachAntwort({ status: "NEU" }, "INTERESSE"), "INTERESSENT");
});

test("Kontakt nur mit Einwilligung oder eigener Anfrage (UWG § 7); Senden ohne Erlaubnis gesperrt", async () => {
  const { lead: kalt } = await L.leadAnlegen({ name: "Kalt GmbH", email: "info@kalt.test", einwilligung: false });
  assert.equal(R.kontaktErlaubt(kalt).erlaubt, false);
  const e = await L.emailEntwurfErstellen(kalt.id, "erstantwort");
  assert.equal(e.nachrichten[0].senden_erlaubt, false);
  await assert.rejects(() => L.alsGesendet(kalt.id, 0), /UWG § 7/);
  await assert.rejects(() => L.leadAnlegen({ name: "X" }), /Einwilligung/);
  await assert.rejects(() => L.leadAnlegen({ name: "Y", einwilligung: true, email: "kaputt" }), /E-Mail-Adresse ungültig/);
  await assert.rejects(() => L.leadAnlegen({ name: "Kalt 2", email: "INFO@kalt.test", einwilligung: true }), /gibt es schon/);
});

test("Kompletter Ablauf: Lead → Kontakt → Angebot → Kunde → offene Einnahme → bezahlt → Einnahmequelle aktualisiert", async () => {
  const q = await eq.createEinnahmequelle({ name: "Pilot" });
  const { lead, task } = await L.leadAnlegen({ rohtext: "Name: Hans Beispiel\nhans@beispiel.test\nIch hätte gern ein Angebot.", selbst_angefragt: true, einwilligung: false, quelle: "Anfrage per E-Mail", einnahmequelle_id: q.id });
  assert.equal(lead.name, "Hans Beispiel"); assert.equal(lead.email, "hans@beispiel.test"); assert.match(task.title, /Lead nachfassen/);
  assert.equal((await eq.listEinnahmequellen())[0].leads[0].lead_id, lead.id, "Spiegel in der Einnahmequelle");
  let l = await L.emailEntwurfErstellen(lead.id, "erstantwort");
  assert.match(l.nachrichten[0].text, /Hallo Hans Beispiel/); assert.equal(l.nachrichten[0].senden_erlaubt, true);
  l = await L.alsGesendet(lead.id, 0); assert.equal(l.status, "KONTAKT"); assert.equal(l.nachrichten[0].typ, "gesendet");
  const { lead: l2, kategorie } = await L.antwortErfassen(lead.id, "Klingt gut, was kostet das?");
  assert.equal(kategorie, "INTERESSE"); assert.equal(l2.status, "INTERESSENT"); assert.match(l2.naechster_schritt, /Antwort \(Interesse\) beantworten/);
  await L.antwortErledigt(lead.id, 1);
  await assert.rejects(() => L.angebotErstellen(lead.id, { text: "x", betrag_cent: 12.5 }), /ganze Zahl/);
  await L.angebotErstellen(lead.id, { text: "Anfragen-Service 1 Monat", betrag_cent: 9900 });
  l = await L.emailEntwurfErstellen(lead.id, "angebot"); assert.match(l.nachrichten[2].text, /99,00\s€/);
  l = await L.alsGesendet(lead.id, 2); assert.equal(l.status, "ANGEBOT"); assert.equal(l.angebot.status, "gesendet");
  const { lead: kunde, buchung } = await L.angebotEntscheidung(lead.id, true);
  assert.equal(kunde.status, "KUNDE"); assert.equal(buchung.status, "pending"); assert.equal(buchung.einnahmequelle_id, q.id); assert.equal(Number(buchung.amount), 99);
  let f = fin.eqFinanzen(await fin.listFinance(), q.id);
  assert.equal(f.einnahmen_cent, 0, "offen ≠ Einnahme"); assert.equal(f.offen_cent, 9900);
  assert.equal((await eq.listEinnahmequellen())[0].kunden.length, 1, "Kunde in der Einnahmequelle");
  await L.zahlungEingegangen(buchung.id, "2026-10-01");
  await assert.rejects(() => L.zahlungEingegangen(buchung.id), /Nur offene Einnahmen/);
  await L.kostenErfassen(q.id, { betrag_cent: 1500, beschreibung: "Domain", quelle: "Rechnung 1", datum: "2026-10-01" });
  f = fin.eqFinanzen(await fin.listFinance(), q.id);
  assert.deepEqual([f.einnahmen_cent, f.kosten_cent, f.gewinn_cent, f.offen_cent], [9900, 1500, 8400, 0]);
  const aktuell = (await eq.listEinnahmequellen())[0];
  assert.equal(aktuell.einnahmen_cent, 9900); assert.equal(aktuell.kosten_cent, 1500);
  const stand = R.ablaufStand(aktuell, { leads: await L.listLeads(), finanzen: f });
  for (const s of ["LEAD", "KONTAKT", "ANGEBOT", "KUNDE", "EINNAHME"]) assert.equal(stand.erreicht[s], true, s);
  assert.equal(stand.erreicht.REPORT, false, "Report erst nach einem Lauf nach der Einnahme");
});

test("Widerspruch sperrt den Lead und stoppt seine Follow-ups; keine Testbuchung zählt als Einnahme", async () => {
  const { lead } = await L.leadAnlegen({ name: "Widerspruch", email: "w@x.test", einwilligung: true });
  await L.emailEntwurfErstellen(lead.id, "erstantwort"); await L.alsGesendet(lead.id, 0);
  const { lead: l, kategorie } = await L.antwortErfassen(lead.id, "Bitte nicht mehr kontaktieren.");
  assert.equal(kategorie, "WIDERSPRUCH"); assert.equal(l.status, "GESPERRT"); assert.equal(l.einwilligung, false);
  const offen = (await tasks.listTasks()).filter(t => t.quelle === "lead:" + lead.id && t.status !== "Gestoppt");
  assert.equal(offen.length, 0, "alle Follow-ups gestoppt");
  await L.emailEntwurfErstellen(lead.id, "nachfassen");
  await assert.rejects(() => L.alsGesendet(lead.id, 2), /Widerspruch/);
  await assert.rejects(() => L.angebotErstellen(lead.id, { text: "x" }), /gesperrte/);
  await fin.createFinance({ kind: "income", amount: 1000, category: "Test", status: "confirmed", einnahmequelle_id: "eq-t", ist_test: true });
  assert.equal(fin.eqFinanzen(await fin.listFinance(), "eq-t").einnahmen_cent, 0);
  assert.equal(fin.financeTotals((await fin.listFinance()).filter(e => e.einnahmequelle_id === "eq-t")).income, 0);
});

test("Einnahmequelle: Lead erfassen + Lead-Status (Teil 3A) laufen über die zentrale Lead-Liste", async () => {
  const q = await eq.createEinnahmequelle({ name: "EQ-Spiegel" });
  const { task } = await eq.leadHinzufuegen(q.id, { name: "Kommentar", kontakt: "k@k.test", einwilligung: false });
  assert.match(task.naechste_aktion, /Keine Werbung senden/);
  const zentral = (await L.listLeads()).find(l => l.einnahmequelle_id === q.id);
  assert.equal(zentral.email, "k@k.test");
  const r = await eq.leadStatus(q.id, 0, "kunde");
  assert.equal(r.leads[0].status, "kunde"); assert.equal(r.kunden[0].name, "Kommentar");
  assert.equal((await L.listLeads()).find(l => l.id === zentral.id).status, "KUNDE");
});

test("Automatisierungsgrad: alle vier Stufen; Kostenpflichtiges immer 'Freigabe erforderlich'", () => {
  const grade = new Set(R.AUTOMATISIERUNGSGRAD.map(([, g]) => g));
  assert.deepEqual([...grade].sort(), ["AUTOMATISCH", "FREIGABE", "KI_VORBEREITET", "MANUELL"]);
  for (const [n, g] of R.AUTOMATISIERUNGSGRAD) if (/Werbung|Abo|KI \(Sprachmodell\)|E-Mail-Dienst/.test(n)) assert.equal(g, "FREIGABE", n);
  assert.equal(R.AUTOMATISIERUNGSGRAD.find(([n]) => n === "E-Mail senden")[1], "MANUELL");
});

const req = (method, query, body, token) => new Request("http://t/api/master/businesses" + query, { method, headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
test("API: Leads nur mit Anmeldung; speichern/lesen; Ablauf und Finanzen je Einnahmequelle", async () => {
  assert.equal((await route.GET(req("GET", "?leads=1"))).status, 401);
  for (const action of ["lead-anlegen", "lead-gesendet", "zahlung-eingegangen", "eq-kosten"]) assert.equal((await route.POST(req("POST", "", { action }))).status, 401, action);
  const q = await eq.createEinnahmequelle({ name: "API-EQ" });
  const a = await route.POST(req("POST", "", { action: "lead-anlegen", lead: { name: "API Lead", einwilligung: true, einnahmequelle_id: q.id } }, "test-secret"));
  assert.equal(a.status, 201); const id = (await a.json()).lead.id;
  assert.equal((await route.POST(req("POST", "", { action: "lead-status", id, status: "GEWONNEN" }, "test-secret"))).status, 400);
  assert.equal((await route.POST(req("POST", "", { action: "lead-antwort", id: "gibt-es-nicht", text: "x" }, "test-secret"))).status, 404);
  const s = await (await route.POST(req("POST", "", { action: "lead-strukturieren", text: "mail@firma.test" }, "test-secret"))).json(); assert.equal(s.erkannt.email, "mail@firma.test");
  const g = await (await route.GET(req("GET", "?leads=1", null, "test-secret"))).json();
  assert.equal(g.leads.length, 1); assert.equal(g.leads[0].kontakt.erlaubt, true); assert.equal(g.uebersicht.neu, 1);
  const e = g.einnahmequellen.find(x => x.id === q.id); assert.equal(e.ablauf.erreicht.LEAD, true); assert.equal(e.finanzen.einnahmen_cent, 0);
  assert.ok(g.automatisierungsgrad.length >= 10);
});
