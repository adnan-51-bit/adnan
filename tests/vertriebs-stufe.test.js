// Vertriebsprozess je Lead (29.09.2026): 12 Stufen, HEUTE BEARBEITEN, Kontakt erfolgt, Termin.
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("data:text/javascript," + encodeURIComponent(
  'export async function resolve(s, c, n) { const fix = (s === "next/server" || (s.startsWith(".") && !/\\.[cm]?js$/.test(s))) ? s + ".js" : s; return n(fix, c); }'
));
delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SECRET_KEY;
const V = await import("../lib/vertriebs-stufe.js");
const G = await import("../lib/google-profil.js");
const P = await import("../lib/pilot.js");
const L = await import("../lib/leads.js");
const A = await import("../lib/antwort-link.js");
const eq = await import("../lib/einnahmequellen.js");
const F = await import("../lib/freigaben.js");
const tasks = await import("../lib/master-tasks.js");
beforeEach(() => { L.resetLeadsFuerTests(); eq.resetEinnahmequellenFuerTests(); F.resetFreigabenFuerTests(); });

const ana = (punkte, notiz = "") => ({ punkte, notiz, datum: "2026-09-28", werte: { kategorie: "ja", kontakt: "ja", beschreibung: "nein", bewertungen_antworten: "nein" }, verbesserungen: [] });
const basis = extra => ({ id: "x", firma: "Café X", branche: "Cafe", status: "NEU", notiz: "Adresse laut Verzeichnis: Turmstr. 1, 40789 Monheim am Rhein.", ...extra });

test("Stufen: jede Stufe nur aus echten Daten; Kunde nur nach Zusage, Einnahme nur mit bestätigter Buchung", () => {
  const s = (l, f = []) => V.vertriebsStufe(basis(l), f);
  assert.equal(s({}), "LEAD");
  assert.equal(s({ profil_analyse: ana(90) }), "GEPRUEFT", "kaum Bedarf");
  assert.equal(s({ branche: "Fotografie", profil_analyse: ana(30) }), "GEPRUEFT", "kein Ladenlokal");
  assert.equal(s({ profil_analyse: ana(30) }), "KONTAKTIERBAR");
  assert.equal(s({ profil_analyse: ana(30), pilot_crm: { kontakt_freigegeben: true } }), "KONTAKT_VORBEREITET");
  assert.equal(s({ profil_analyse: ana(30), pilot_crm: { kontakt_freigegeben: true, kontakt_erfolgt_am: "2026-09-29" } }), "KONTAKT_ERFOLGT");
  assert.equal(s({ profil_analyse: ana(30), pilot_crm: { antworten: [{ wahl: "gespraech" }] } }), "ANTWORT");
  assert.equal(s({ status: "INTERESSENT", profil_analyse: ana(30) }), "INTERESSE");
  assert.equal(s({ status: "INTERESSENT", profil_analyse: ana(30), pilot_crm: { termin: { datum: "2026-10-01T10:00" } } }), "TERMIN");
  assert.equal(s({ status: "ANGEBOT", profil_analyse: ana(30) }), "ANGEBOT");
  assert.equal(s({ status: "KUNDE", profil_analyse: ana(30) }), "KUNDE");
  const f = st => [{ kind: "income", lead_id: "x", status: st }];
  assert.equal(s({ status: "KUNDE", profil_analyse: ana(30) }, f("pending")), "ZAHLUNG");
  assert.equal(s({ status: "KUNDE", profil_analyse: ana(30) }, f("confirmed")), "EINNAHME");
  assert.equal(s({ status: "KUNDE", profil_analyse: ana(30) }, [{ kind: "income", lead_id: "x", status: "confirmed", ist_test: true }]), "KUNDE", "Testbuchung zählt nicht");
  assert.equal(V.VERTRIEBS_STUFEN.length, 12);
});

test("Gesprächseinstieg und zulässiger Kontaktweg", () => {
  assert.match(V.gespraechseinstieg(basis({ profil_analyse: ana(30, "Google zeigt „Als Inhaber eintragen“.") })), /gehört also noch niemandem/);
  assert.match(V.gespraechseinstieg(basis({ profil_analyse: ana(60, "436 Bewertungen") })), /436 Bewertungen – .*antworten\?/);
  assert.equal(V.gespraechseinstieg(basis({ profil_analyse: ana(30), pilot_crm: { einstieg: "Eigener Text" } })), "Eigener Text");
  assert.match(V.kontaktweg(basis({ profil_analyse: ana(30) })), /^Brief einwerfen oder persönlich vorbeigehen: Turmstr\. 1.*keine Werbe-Mail, kein Werbeanruf$/);
  assert.match(V.kontaktweg(basis({ profil_analyse: ana(30), pilot_crm: { antworten: [{ wahl: "gespraech", datum: "2026-09-29T10:00:00Z", telefon: "0171 1" }] } })), /^Rückruf erlaubt \(Einwilligung vom 29\.9\.2026\): Tel\. 0171 1$/);
});

test("HEUTE BEARBEITEN: Termin und Rückruf vor Briefen, Analyse durch Claude, höchstens 7", () => {
  const jetzt = new Date("2026-09-29T09:00:00+02:00");
  const leads = [
    basis({ id: "k", profil_analyse: ana(30) }),
    basis({ id: "i", status: "INTERESSENT", profil_analyse: ana(30) }),
    basis({ id: "t", status: "INTERESSENT", profil_analyse: ana(30), pilot_crm: { termin: { datum: "2026-09-30T10:00" } } }),
    basis({ id: "v", profil_analyse: ana(30), pilot_crm: { kontakt_freigegeben: true } }),
    basis({ id: "n" }),
    basis({ id: "g", status: "GESPERRT", profil_analyse: ana(30) }),
  ];
  const h = V.heuteBearbeiten({ leads, jetzt });
  assert.deepEqual(h.map(x => x.lead_id), ["t", "i", "v", "n", "k"]);
  assert.deepEqual(h.map(x => x.wer), ["Adnan", "Adnan", "Adnan", "Claude", "Adnan"]);
  assert.ok(h.every(x => x.einstieg && x.kontaktweg && x.stufe_label));
  assert.equal(V.heuteBearbeiten({ leads: Array.from({ length: 12 }, (_, i) => basis({ id: "k" + i, profil_analyse: ana(30) })), jetzt }).length, 7);
});

test("Brief eingeworfen und Termin vereinbart: nur mit Grundlage, Aufgaben werden fortgeschrieben", async () => {
  await eq.createEinnahmequelle({ name: "Pflege Google-Unternehmensprofil", kategorie: "C" });
  const l = await P.potenziellenKundenAnlegen({ firma: "Salon Termin", ort: "Monheim am Rhein", branche: "Friseur", quelle_url: "https://verzeichnis.test/t", quelle_datum: "2026-09-29" });
  await P.analyseSpeichern(l.id, { quelle: "https://maps.google.com/?cid=3", datum: "2026-09-29", werte: Object.fromEntries(G.KRITERIEN.map(k => [k.id, k.id === "beschreibung" ? "nein" : "ja"])) });
  await assert.rejects(() => P.kontaktErfolgt(l.id, { datum: "2026-09-29" }), /Kontakt freigeben/);
  await P.kontaktEntscheidung(l.id, true);
  const { token } = await A.briefVorbereiten(l.id);
  await assert.rejects(() => P.terminVereinbaren(l.id, { datum: "2026-10-01T10:00" }), /erst nach Interesse/);
  await P.kontaktErfolgt(l.id, { datum: "2026-09-29" });
  let t = await tasks.listTasks(); const quelle = x => x.quelle === "lead:" + l.id;
  assert.equal(t.find(x => quelle(x) && /^Brief einwerfen/.test(x.title)).status, "Erledigt");
  let x = (await L.listLeads()).find(y => y.id === l.id); assert.equal(V.vertriebsStufe(x), "KONTAKT_ERFOLGT");
  await A.briefAntwortErfassen(token, { wahl: "gespraech", name: "Frau T", telefon: "0171 22", einwilligung: true });
  await assert.rejects(() => P.terminVereinbaren(l.id, { datum: "morgen" }), /Datum und Uhrzeit/);
  await P.terminVereinbaren(l.id, { datum: "2026-10-01T10:00", notiz: "im Salon" });
  x = (await L.listLeads()).find(y => y.id === l.id); assert.equal(V.vertriebsStufe(x), "TERMIN");
  t = await tasks.listTasks();
  assert.equal(t.find(y => quelle(y) && /Interessent meldet sich/.test(y.title)).status, "Erledigt");
  assert.ok(t.some(y => quelle(y) && /^Termin: Salon Termin am 01\.10\.26, 10:00$/.test(y.title) && y.status === "Offen"));
});
