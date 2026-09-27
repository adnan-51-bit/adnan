// Taeglicher Optimierungslauf (27.09.2026): nur echte Daten, Fokus bis zur ersten Einnahme, Pausieren nur vorschlagen.
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("data:text/javascript," + encodeURIComponent(
  'export async function resolve(s, c, n) { const fix = (s === "next/server" || (s.startsWith(".") && !/\\.[cm]?js$/.test(s))) ? s + ".js" : s; return n(fix, c); }'
));
delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SECRET_KEY;
process.env.MASTER_API_SECRET = "test-secret";
const { optimierung, STOCKT_AB_TAGEN, PAUSE_VORSCHLAG_AB_TAGEN } = await import("../lib/optimierung.js");
const eq = await import("../lib/einnahmequellen.js");
const F = await import("../lib/freigaben.js");
const L = await import("../lib/leads.js");
const { fuehreAktionAus } = await import("../lib/aktion-ausfuehren.js");
beforeEach(() => { eq.resetEinnahmequellenFuerTests(); F.resetFreigabenFuerTests(); L.resetLeadsFuerTests(); });

const jetzt = new Date("2026-10-30T12:00:00Z");
const vor = tage => new Date(jetzt - tage * 86400000).toISOString();

test("Zustand je Einnahmequelle nur aus echten Daten: funktioniert / in Arbeit / stockt; Pausieren nur als Vorschlag ab 30 Tagen", () => {
  const eqs = [
    { id: "a", name: "Mit Einnahme", status: "EINNAHMEN", aktualisiert_am: vor(40) },
    { id: "b", name: "Aktiv", status: "PRUEFUNG", kategorie: "C", aktualisiert_am: vor(2) },
    { id: "c", name: "Stockt", status: "TEST", aktualisiert_am: vor(STOCKT_AB_TAGEN + 1) },
    { id: "d", name: "Lange still", status: "PRUEFUNG", aktualisiert_am: vor(PAUSE_VORSCHLAG_AB_TAGEN + 5) },
    { id: "e", name: "Pausiert", status: "PAUSE", aktualisiert_am: vor(100) },
  ];
  const finance = [{ einnahmequelle_id: "a", kind: "income", status: "confirmed", amount: 49 }, { einnahmequelle_id: "c", kind: "income", status: "confirmed", amount: 999, ist_test: true }, { einnahmequelle_id: "b", kind: "income", status: "pending", amount: 49 }];
  const leads = [{ einnahmequelle_id: "b", aktualisiert_am: vor(1), status: "NEU" }];
  const tasks = [{ einnahmequelle_id: "b", status: "Offen", due_at: vor(3), updated_at: vor(1) }];
  const o = optimierung({ eqs, leads, tasks, finance, jetzt });
  const z = Object.fromEntries(o.auswertung.map(a => [a.id, a]));
  assert.equal(z.a.zustand, "FUNKTIONIERT"); assert.equal(z.a.einnahmen_cent, 4900);
  assert.equal(z.b.zustand, "IN_ARBEIT"); assert.equal(z.b.einnahmen_cent, 0, "offene Einnahme zählt nicht");
  assert.deepEqual(z.b.befunde, ["1 Leads noch nicht analysiert", "1 Aufgabe(n) überfällig"]);
  assert.equal(z.c.zustand, "STOCKT"); assert.equal(z.c.einnahmen_cent, 0, "Testbuchung zählt nicht"); assert.equal(z.c.pausenVorschlag, false);
  assert.equal(z.d.pausenVorschlag, true); assert.ok(!z.e, "Pausierte werden nicht ausgewertet");
  assert.match(o.empfehlung, /Erste Einnahme erreicht/);
});

test("Fokus-Regel: vor der ersten Einnahme keine neue Einnahmequelle nebenbei; erst wenn nichts in Bewegung ist, die nächste Idee testen", () => {
  const eqs = [{ id: "p", name: "Pilot", status: "PRUEFUNG", startkosten_cent: 0, schnell_testbar: true, direkte_kunden: true, aktualisiert_am: vor(1) }, { id: "i", name: "Idee", status: "IDEE", startkosten_cent: 0, wiederholbar: true, aktualisiert_am: vor(1) }];
  let o = optimierung({ eqs, leads: [{ einnahmequelle_id: "p", aktualisiert_am: vor(1) }], jetzt });
  assert.match(o.empfehlung, /Fokus: „Pilot“ bis zur ersten echten Einnahme/); assert.equal(o.neueTesten, null);
  o = optimierung({ eqs, leads: [], jetzt });
  assert.equal(o.neueTesten.id, "p", "niedrigste Arbeitspriorität zuerst (P1 vor P2)");
});

test("Täglicher Lauf: Pausieren landet als Entscheidung unter 'Wartet auf mich' (einmalig); Freigabe pausiert wirklich", async () => {
  const q = await eq.createEinnahmequelle({ name: "Still" });
  await eq.setzeEqStatus(q.id, "PRUEFUNG");
  const alt = new Date(Date.now() - (PAUSE_VORSCHLAG_AB_TAGEN + 3) * 86400000).toISOString();
  await eq.setzeFinanzSpiegel(q.id, 0, 0); // aktualisiert_am jetzt -> fuer den Test zuruecksetzen:
  (await eq.listEinnahmequellen())[0].aktualisiert_am = alt;
  const r = await fuehreAktionAus("optimierung");
  assert.equal(r.ok, true); assert.match(r.zusammenfassung, /Still: STOCKT/);
  await fuehreAktionAus("optimierung");
  const fg = (await F.listFreigaben()).filter(f => f.bezug_typ === "eq-pausieren");
  assert.equal(fg.length, 1, "keine Doppelten"); assert.match(fg[0].titel, /„Still“ pausieren\?/);
  await F.freigabeEntscheiden(fg[0].id, "FREIGEGEBEN", "ja");
  assert.equal((await eq.listEinnahmequellen())[0].status, "PAUSE");
});
