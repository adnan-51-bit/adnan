// Sales-Automat (27.09.2026): Brief mit Antwort-Link - Antwort des Betriebs landet automatisch in der Zentrale.
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("data:text/javascript," + encodeURIComponent(
  'export async function resolve(s, c, n) { const fix = (s === "next/server" || (s.startsWith(".") && !/\\.[cm]?js$/.test(s))) ? s + ".js" : s; return n(fix, c); }'
));
delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SECRET_KEY;
process.env.MASTER_API_SECRET = "test-secret";
const A = await import("../lib/antwort-link.js");
const G = await import("../lib/google-profil.js");
const P = await import("../lib/pilot.js");
const L = await import("../lib/leads.js");
const eq = await import("../lib/einnahmequellen.js");
const F = await import("../lib/freigaben.js");
const tasks = await import("../lib/master-tasks.js");
const route = await import("../app/api/master/businesses/route.js");
beforeEach(() => { L.resetLeadsFuerTests(); eq.resetEinnahmequellenFuerTests(); F.resetFreigabenFuerTests(); });

async function betrieb(freigeben = true) {
  await eq.createEinnahmequelle({ name: "Pflege Google-Unternehmensprofil", kategorie: "C" });
  const l = await P.potenziellenKundenAnlegen({ firma: "Briefsalon", ort: "Monheim am Rhein", branche: "Friseur", telefon: "02173 123", quelle_url: "https://verzeichnis.test/b", quelle_datum: "2026-09-27", notiz: "Adresse laut Verzeichnis: Turmstr. 1, 40789 Monheim. Vermutlich Inhaberwechsel." });
  await P.analyseSpeichern(l.id, { quelle: "https://maps.google.com/?cid=7", datum: "2026-09-27", werte: Object.fromEntries(G.KRITERIEN.map(k => [k.id, k.id === "beschreibung" ? "nein" : "ja"])) });
  if (freigeben) await P.kontaktEntscheidung(l.id, true);
  return l;
}
const lead = async id => (await L.listLeads()).find(x => x.id === id);
const offeneAufgaben = async id => (await tasks.listTasks()).filter(t => t.quelle === "lead:" + id && !["Erledigt", "Gestoppt"].includes(t.status));

test("Brief nur nach Kontakt-Freigabe; Link einmalig; Aufgaben Einwerfen + Nachfassen", async () => {
  const ohne = await betrieb(false);
  await assert.rejects(() => A.briefVorbereiten(ohne.id), /Kontakt freigeben/);
  L.resetLeadsFuerTests(); eq.resetEinnahmequellenFuerTests();
  const l = await betrieb();
  const b1 = await A.briefVorbereiten(l.id), b2 = await A.briefVorbereiten(l.id);
  assert.match(b1.token, A.TOKEN_MUSTER); assert.equal(b2.token, b1.token); assert.equal(b2.neu, false);
  const offen = (await offeneAufgaben(l.id)).map(t => t.title);
  assert.equal(offen.filter(t => /^Brief einwerfen/.test(t)).length, 1, "nicht doppelt");
  assert.ok(offen.some(t => /^Keine Antwort auf Brief/.test(t)));
  assert.ok(!offen.some(t => /persönlich zeigen/.test(t)), "Besuchsaufgabe durch Brief ersetzt");
});

test("Öffentliche Seite zeigt nur den Profil-Check – keine Notizen, Telefonnummern oder Tokens", async () => {
  const l = await betrieb(); const { token } = await A.briefVorbereiten(l.id);
  const s = await A.antwortSeite(token);
  assert.equal(s.firma, "Briefsalon"); assert.ok(s.punkte >= 0); assert.ok(s.verbesserungen.length > 0);
  const json = JSON.stringify(s);
  assert.ok(!/Vermutlich|02173|verzeichnis\.test|maps\.google|antwort_token/.test(json), json);
  assert.equal(await A.antwortSeite("falsch"), null); assert.equal(await A.antwortSeite("AAAAAAAAAAAA"), null);
});

test("Antwort „Ja, Gespräch“: Einwilligung + eigene Anfrage, Interessent, Rückruf-Aufgabe, Angebotsentwurf", async () => {
  const l = await betrieb(); const { token } = await A.briefVorbereiten(l.id);
  await assert.rejects(() => A.briefAntwortErfassen(token, { wahl: "gespraech", name: "Frau Test", telefon: "0171 1234567" }), /kontaktieren dürfen/);
  await assert.rejects(() => A.briefAntwortErfassen(token, { wahl: "gespraech", name: "Frau Test", einwilligung: true }), /Telefon oder E-Mail/);
  await assert.rejects(() => A.briefAntwortErfassen(token, { wahl: "gespraech", name: "Bot", telefon: "0171 1234567", einwilligung: true, fax: "x" }), /Ungültig/);
  await A.briefAntwortErfassen(token, { wahl: "gespraech", name: "Frau Test", telefon: "0171 1234567", wunsch: "Dienstag vormittags", einwilligung: true });
  const x = await lead(l.id);
  assert.equal(x.status, "INTERESSENT"); assert.equal(x.einwilligung, true); assert.equal(x.selbst_angefragt, true);
  assert.equal(x.pilot_crm.antworten[0].name, "Frau Test"); assert.equal(G.kundenStufe(x), "INTERESSE");
  const offen = await offeneAufgaben(l.id);
  const rueckruf = offen.find(t => /Interessent meldet sich/.test(t.title));
  assert.ok(rueckruf); assert.equal(rueckruf.status, "Wartet auf Benutzer"); assert.match(rueckruf.naechste_aktion, /0171 1234567.*Dienstag/);
  assert.ok(!offen.some(t => /^(Brief einwerfen|Keine Antwort auf Brief)/.test(t.title)), "Brief-Aufgaben erledigt");
  assert.equal(x.angebot.status, "entwurf", "Angebotsentwurf automatisch (ohne Preis)");
  assert.ok((await F.listFreigaben()).some(f => f.bezug_typ === "angebot" && f.bezug_id === l.id));
});

test("Antwort „Kein Interesse“: gesperrt, alle Aufgaben gestoppt, höchstens 3 Antworten", async () => {
  const l = await betrieb(); const { token } = await A.briefVorbereiten(l.id);
  await A.briefAntwortErfassen(token, { wahl: "kein-interesse" });
  const x = await lead(l.id);
  assert.equal(x.status, "GESPERRT"); assert.equal((await offeneAufgaben(l.id)).length, 0);
  assert.equal((await A.antwortSeite(token)).gesperrt, true);
  await assert.rejects(() => A.briefVorbereiten(l.id), /keinen Kontakt/);
  await A.briefAntwortErfassen(token, { wahl: "kein-interesse" }); await A.briefAntwortErfassen(token, { wahl: "kein-interesse" });
  await assert.rejects(() => A.briefAntwortErfassen(token, { wahl: "kein-interesse" }), /bereits vor/);
});

test("Persönlicher Brief-Absatz: gespeichert ohne Kontakt, keine Links, leer = Standardtext", async () => {
  const l = await betrieb(false);
  await assert.rejects(() => P.briefAbsatzSetzen(l.id, "zu kurz"), /40 bis 900/);
  await assert.rejects(() => P.briefAbsatzSetzen(l.id, "ich habe mir Ihr Profil angesehen, mehr unter www.beispiel.de – bitte schauen Sie."), /keine Links/);
  await P.briefAbsatzSetzen(l.id, "ich habe mir das öffentliche Google-Profil angesehen –   71 Bewertungen mit 4,9 Sternen.");
  let x = await lead(l.id);
  assert.equal(x.pilot_crm.brief_absatz, "ich habe mir das öffentliche Google-Profil angesehen – 71 Bewertungen mit 4,9 Sternen.");
  assert.equal(x.pilot_crm.antwort_token, undefined, "kein Link, keine Brief-Aufgabe");
  assert.ok(!(await offeneAufgaben(l.id)).some(t => /Brief einwerfen/.test(t.title)));
  await P.briefAbsatzSetzen(l.id, ""); x = await lead(l.id); assert.equal(x.pilot_crm.brief_absatz, null);
});

test("Route: Antwort-Link ohne Anmeldung, Brief vorbereiten nur mit Anmeldung", async () => {
  const l = await betrieb();
  const ohne = await route.POST(new Request("http://x/api/master/businesses", { method: "POST", body: JSON.stringify({ action: "pilot-brief", id: l.id }) }));
  assert.equal(ohne.status, 401);
  const mit = await route.POST(new Request("http://x/api/master/businesses", { method: "POST", headers: { authorization: "Bearer test-secret" }, body: JSON.stringify({ action: "pilot-brief", id: l.id }) }));
  const { token } = await mit.json(); assert.match(token, A.TOKEN_MUSTER);
  const g = await route.GET(new Request("http://x/api/master/businesses?antwort=" + token));
  assert.equal(g.status, 200); assert.equal((await g.json()).seite.firma, "Briefsalon");
  assert.equal((await route.GET(new Request("http://x/api/master/businesses?antwort=nichtdaXXXXX"))).status, 404);
  const p = await route.POST(new Request("http://x/api/master/businesses?antwort=" + token, { method: "POST", body: JSON.stringify({ wahl: "gespraech", name: "Herr B", email: "b@beispiel.test", einwilligung: true }) }));
  assert.equal(p.status, 200); assert.equal((await lead(l.id)).status, "INTERESSENT");
});
