// Erstkunden-Paket (27.09.2026): Leitfaden, Entscheidungsvorlage (mit Quellen), Gesprächsunterlage ohne Preis/Absender-Erfindung.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const G = await import("../lib/google-profil.js");

test("Entscheidungsvorlage: jede offene Entscheidung beantwortet Was fehlt / Warum / Kosten / kostenlose Alternative – mit Quelle", () => {
  assert.deepEqual(G.ENTSCHEIDUNGEN.map(e => e.id), ["kontakt", "preis", "gewerbe", "avv"]);
  for (const e of G.ENTSCHEIDUNGEN) {
    for (const k of ["titel", "was_fehlt", "warum", "kosten", "alternative"]) assert.ok(String(e[k]).length > 5, `${e.id}.${k}`);
    assert.ok(e.quellen.length && e.quellen.every(q => /^https:\/\//.test(q)), e.id + ": Quelle fehlt");
  }
  const gw = G.ENTSCHEIDUNGEN.find(e => e.id === "gewerbe");
  assert.match(gw.kosten, /26 €/); assert.ok(gw.quellen.some(q => q.includes("monheim.de")), "Gebühr nur mit Quelle der Stadt");
  assert.match(gw.warum, /Schuldnerberatung/, "keine eigene Aussage, ob Gewerbe erlaubt ist");
});

test("Gesprächsleitfaden: keine Versprechen, nichts unterschreiben/kassieren, danach in der Zentrale dokumentieren", () => {
  const t = G.GESPRAECHSLEITFADEN.map(g => g.text).join(" ");
  assert.match(t, /Keine Platzierungen/); assert.match(t, /Nichts unterschreiben lassen, nichts kassieren/); assert.match(t, /keine Passwörter annehmen/);
  assert.match(G.GESPRAECHSLEITFADEN.at(-1).schritt, /Zentrale/);
});

test("Gesprächsunterlage: nur mit Anmeldung, nur aus gespeicherter Analyse, kein Preis, Absender von Hand", () => {
  const src = readFileSync(new URL("../app/master/profil-check/page.jsx", import.meta.url), "utf8");
  assert.match(src, /adminFetch\("\/api\/master\/businesses\?pilot=1"\)/); assert.match(src, /status === 401/);
  assert.match(src, /noch keine gespeicherte Profil-Analyse/);
  assert.doesNotMatch(src, /monatspreis|€/i, "kein Preis auf der Unterlage");
  assert.match(src, /pcLinie/); assert.match(src, /kein Passwort/);
});

test("Gesprächsunterlage: Beobachtungen ohne interne Arbeitshinweise (Bedarf, Besuchsrunde, andere Betriebe)", () => {
  const src = readFileSync(new URL("../app/master/profil-check/page.jsx", import.meta.url), "utf8");
  const m = src.match(/const INTERN = (\/.*\/i);/); assert.ok(m);
  const INTERN = eval(m[1]);
  const n = "Profil „X“ (Tierfriseur), 4,9 Sterne. WICHTIG: Google zeigt „Als Inhaber eintragen“. Liegt ca. 60 m von Friseur Haargenau entfernt (gleiche Besuchsrunde). Profil gut gepflegt – geringer Bedarf.";
  const s = n.replace(/WICHTIG: /g, "").split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ„])/).filter(x => x.trim() && !INTERN.test(x)).join(" ");
  assert.match(s, /Als Inhaber eintragen/); assert.doesNotMatch(s, /Haargenau|Besuchsrunde|Bedarf|WICHTIG/);
});

test("Einmal-Paket: Bausteine nur aus festgestellten Lücken, Preis 'noch festzulegen', kein Zugang/Passwort", () => {
  const a = { datum: "2026-09-27", punkte: 30, notiz: "Google zeigt „Als Inhaber eintragen“ – das Profil ist NICHT vom Inhaber beansprucht.", werte: { kategorie: "ja", kontakt: "teilweise", beschreibung: "nein", fotos: "nein", bewertungen_antworten: "nein", leistungen: "ja" } };
  const b = G.einmalBausteine(a);
  assert.equal(b[0], G.EINMAL_PAKET.bausteine.unbeansprucht);
  assert.ok(b.includes(G.EINMAL_PAKET.bausteine.kontakt) && !b.includes(G.EINMAL_PAKET.bausteine.leistungen), "nur echte Lücken");
  assert.deepEqual(G.einmalBausteine({ werte: { kategorie: "nein", kontakt: "nein" } })[0], G.EINMAL_PAKET.bausteine.keinProfil);
  const t = G.einmalAngebotText({ firma: "Test" }, a);
  assert.match(t, /Preis: noch festzulegen/); assert.match(t, /kein Passwort und keinen Zugang/); assert.doesNotMatch(t, /d+s?(€|Euro)/, "kein erfundener Preis");
  assert.deepEqual(G.einmalBausteine(null), []);
});
