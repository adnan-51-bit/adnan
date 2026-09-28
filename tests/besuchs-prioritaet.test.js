// Lead-Prioritaet fuer den persoenlichen Kontakt (28.09.2026): 1. Ladenlokal, 2. Bedarf, 3. Kontaktdaten.
import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("data:text/javascript," + encodeURIComponent(
  'export async function resolve(s, c, n) { const fix = (s === "next/server" || (s.startsWith(".") && !/\\.[cm]?js$/.test(s))) ? s + ".js" : s; return n(fix, c); }'
));
const G = await import("../lib/google-profil.js");
const { top5 } = await import("../lib/umsatz-pipeline.js");

const ana = (punkte, notiz = "") => ({ punkte, notiz, werte: { kategorie: "ja", kontakt: "ja", beschreibung: "nein", fotos: "nein", beitraege: "nein" }, verbesserungen: [{ id: "beschreibung", text: "t", dringend: true }] });
const lead = (id, branche, punkte, extra = {}) => ({ id, firma: id, branche, ort: "Monheim am Rhein", status: "NEU", telefon: "02173 1", notiz: "Adresse laut Verzeichnis: Turmstr. 1, 40789 Monheim am Rhein.", profil_analyse: ana(punkte), ...extra });

test("Ladenlokal: geprüfte Angabe gilt, sonst Einschätzung aus Branche/Analyse", () => {
  assert.equal(G.ladenlokal(lead("a", "Cafe", 50)).laden, true);
  assert.equal(G.ladenlokal(lead("b", "Handwerk & Bau", 50)).laden, false);
  assert.equal(G.ladenlokal(lead("c", "Fotografie", 50)).laden, false);
  assert.equal(G.ladenlokal(lead("d", "Sonstiges", 50)).laden, null);
  assert.equal(G.ladenlokal(lead("e", "Cafe", 50, { pilot_crm: { ladenlokal: false } })).text, "kein Ladenlokal / keine öffentliche Adresse (geprüft)");
  assert.equal(G.ladenlokal(lead("f", "Fotografie", 50, { pilot_crm: { ladenlokal: true } })).laden, true);
  assert.equal(G.ladenlokal({ ...lead("g", "Sonstiges", 50), profil_analyse: ana(50, "Nur Servicegebiet, keine Adresse.") }).laden, false);
});

test("Reihenfolge: Ladenlokal vor Bedarf vor Kontaktdaten; ohne Ladenlokal nach hinten", () => {
  const fotograf = lead("Fotograf viele Lücken", "Fotografie", 20);
  const cafeWenig = lead("Café wenig Lücken", "Cafe", 70);
  const cafeViel = lead("Café viele Lücken", "Cafe", 30);
  const cafeOhneKontakt = lead("Café ohne Kontakt", "Cafe", 30, { telefon: "", notiz: "" });
  const unbekannt = lead("Unbekannt", "Sonstiges", 20);
  const sortiert = [fotograf, cafeWenig, unbekannt, cafeOhneKontakt, cafeViel].sort((a, b) => G.besuchsRang(a) - G.besuchsRang(b)).map(l => l.id);
  assert.deepEqual(sortiert, ["Café viele Lücken", "Café ohne Kontakt", "Café wenig Lücken", "Unbekannt", "Fotograf viele Lücken"]);
  assert.equal(G.prioritaet(fotograf).stufe, "NIEDRIG"); assert.match(G.prioritaet(fotograf).text, /persönlicher Kontakt kaum sinnvoll/);
  assert.equal(G.prioritaet(cafeViel).stufe, "HOCH");
  assert.deepEqual(top5([fotograf, cafeWenig, cafeViel]).map(t => t.name), ["Café viele Lücken", "Café wenig Lücken", "Fotograf viele Lücken"]);
  assert.equal(G.naechstePilotAktion([fotograf, cafeWenig]).lead_id, "Café wenig Lücken");
});

test("Einmal-Paket erkennt unbeanspruchte Profile auch an „nicht beansprucht“ / „Als Inhaber eintragen“", () => {
  const u = G.EINMAL_PAKET.bausteine.unbeansprucht;
  for (const notiz of ["Profil ist NICHT vom Inhaber beansprucht.", "Profil ist nicht beansprucht (Hinweis „Als Inhaber eintragen“).", "Google zeigt „Als Inhaber eintragen“."]) assert.ok(G.einmalBausteine({ ...ana(30), notiz }).includes(u), notiz);
  assert.ok(!G.einmalBausteine({ ...ana(30), notiz: "Profil beansprucht und gepflegt." }).includes(u));
});
