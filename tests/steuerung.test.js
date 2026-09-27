// Steuerung der Master-Zentrale (27.09.2026): Aktionskategorien, Kostenschutz, Automatisierungs-Log,
// Berechtigungen, Fehlerbehandlung, Tagesbericht und Bereichsstatus.
import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("data:text/javascript," + encodeURIComponent(
  'export async function resolve(s, c, n) { const fix = (s === "next/server" || (s.startsWith(".") && !/\\.[cm]?js$/.test(s))) ? s + ".js" : s; return n(fix, c); }'
));
delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SECRET_KEY; delete process.env.WERKNETZ24_WRITE_SECRET;
process.env.MASTER_API_SECRET = "test-secret";
const { AKTIONEN, pruefeAusfuehrung } = await import("../lib/aktionen.js");
const { fuehreAktionAus, listeLaeufe } = await import("../lib/aktion-ausfuehren.js");
const { erstelleTagesbericht } = await import("../lib/tagesbericht.js");
const { bereichsStatus } = await import("../lib/gesamtstatus.js");
const route = await import("../app/api/master/businesses/route.js");
const auth = await import("../lib/auth.js");

test("jede Aktion hat genau eine Kategorie; Geld-Aktionen zeigen alle 6 Kostenangaben; Verbote haben einen Grund", () => {
  const ids = new Set();
  for (const a of AKTIONEN) {
    assert.ok(!ids.has(a.id), "doppelt: " + a.id); ids.add(a.id);
    assert.ok(["AUTOMATISCH", "FREIGABE", "NICHT_MOEGLICH"].includes(a.kategorie), a.id);
    if (a.kategorie === "FREIGABE") assert.ok(a.ziel, a.id + ": GELB braucht den Weg zu „Wartet auf mich“");
    if (a.kategorie === "FREIGABE") assert.ok(a.bereich, a.id + ": Bereich fehlt");
    if (a.kategorie === "NICHT_MOEGLICH") assert.ok(a.grund, a.id + ": Grund fehlt");
  }
  for (const id of ["secret-anzeigen", "passwort-anzeigen"]) assert.equal(AKTIONEN.find(a => a.id === id).kategorie, "NICHT_MOEGLICH");
  // Geld-Schutz (seit 27.09.2026): alles mit Kosten/Vertrag ist ROT = blockiert
  for (const id of ["kostenpflichtiger-dienst", "geld-ausgeben", "werbung-bezahlen", "zahlung-ausloesen", "vertrag-abschliessen", "produkt-veroeffentlichen", "famulor-testanruf"]) assert.equal(AKTIONEN.find(a => a.id === id).kategorie, "NICHT_MOEGLICH", id);
  for (const id of ["kontakt-freigeben", "preis-festlegen", "einnahmequelle-pausieren", "kosten-vorschlag"]) assert.equal(AKTIONEN.find(a => a.id === id).kategorie, "FREIGABE", id);
});

test("Geld-Schutz: Geld-Aktionen sind blockiert – auch mit Freigabe; GELB nur mit Entscheidung; Claude-Aktionen kein Knopf", () => {
  for (const fg of [undefined, { aktion: "geld-ausgeben", bestaetigt: true }]) assert.equal(pruefeAusfuehrung("geld-ausgeben", fg).status, 403);
  assert.match(pruefeAusfuehrung("kostenpflichtiger-dienst").fehler, /Blockiert \(Geld-Schutz/);
  assert.equal(pruefeAusfuehrung("preis-festlegen").status, 409, "GELB ohne Entscheidung");
  assert.equal(pruefeAusfuehrung("preis-festlegen", { aktion: "preis-festlegen", bestaetigt: true }).status, 501, "auch entschieden: keine automatische Ausführung");
  assert.equal(pruefeAusfuehrung("secret-anzeigen", { aktion: "secret-anzeigen", bestaetigt: true }).status, 403);
  assert.match(pruefeAusfuehrung("server-recherche").fehler, /OFFEN/);
  assert.equal(pruefeAusfuehrung("dokument-aktualisieren").status, 501);
  assert.equal(pruefeAusfuehrung("gibt-es-nicht").status, 404);
  assert.equal(pruefeAusfuehrung("test-status").erlaubt, true);
});

const githubMock = (conclusion = "success") => async url => ({ ok: true, json: async () => url.includes("/actions/runs") ? { workflow_runs: [{ status: "completed", conclusion, display_title: "commit" }] } : [{ sha: "abcdef1234", commit: { message: "feat: x\nmehr" } }] });

test("Automatische Aktion läuft wirklich und landet mit Kosten 0 im Log; Fehler werden als Fehler protokolliert", async () => {
  const ok = await fuehreAktionAus("test-status", undefined, { fetchImpl: githubMock() });
  assert.equal(ok.ok, true); assert.match(ok.zusammenfassung, /adnan: ✓ bestanden/);
  const rot = await fuehreAktionAus("test-status", undefined, { fetchImpl: githubMock("failure") });
  assert.equal(rot.ok, false); assert.match(rot.fehler, /✗ failure/);
  const kaputt = await fuehreAktionAus("git-status", undefined, { fetchImpl: async () => ({ ok: false, status: 503 }) });
  assert.equal(kaputt.ok, false); assert.match(kaputt.fehler, /GitHub HTTP 503/);
  const log = await listeLaeufe();
  const letzte = log.slice(0, 3).map(l => l.details);
  assert.deepEqual(letzte.map(d => d.ergebnis), ["fehler", "fehler", "ok"]);
  for (const d of letzte) { assert.equal(d.kosten_cent, 0); assert.ok(d.agent && d.bereich && d.quelle && d.name); }
});

const req = (method, query, body, token) => new Request("http://t/api/master/businesses" + query, { method, headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });

test("API: Steuerung nur mit Anmeldung; Geld-/Verbots-Aktionen abgelehnt und protokolliert; fehlende Werknetz24-Verbindung = Fehler statt Erfolg", async () => {
  auth.resetLoginSperreFuerTests();
  assert.equal((await route.GET(req("GET", "?aktionen=1"))).status, 401);
  assert.equal((await route.GET(req("GET", "?tagesbericht=1"))).status, 401);
  assert.equal((await route.POST(req("POST", "", { action: "aktion-ausfuehren", id: "test-status" }))).status, 401);
  const geld = await route.POST(req("POST", "", { action: "aktion-ausfuehren", id: "kostenpflichtiger-dienst" }, "test-secret"));
  assert.equal(geld.status, 403); const gj = await geld.json(); assert.equal(gj.ok, false); assert.match(gj.fehler, /Geld-Schutz/);
  assert.equal((await route.POST(req("POST", "", { action: "aktion-ausfuehren", id: "passwort-anzeigen" }, "test-secret"))).status, 403);
  const w24 = await route.POST(req("POST", "", { action: "aktion-ausfuehren", id: "werknetz24-systempruefung" }, "test-secret"));
  assert.equal(w24.status, 502); assert.equal((await w24.json()).ok, false);
  const g = await (await route.GET(req("GET", "?aktionen=1", null, "test-secret"))).json();
  assert.ok(g.aktionen.length >= 10);
  const [w, pw, dienst] = g.laeufe.slice(0, 3).map(l => l.details);
  assert.equal(w.ergebnis, "fehler"); assert.equal(pw.ergebnis, "abgelehnt"); assert.equal(dienst.ergebnis, "abgelehnt");
  assert.doesNotMatch(JSON.stringify(g), /test-secret/, "kein Secret in der Antwort");
});

test("Tagesbericht: nur heutige, echte Werte; fehlende Tageswerte = nicht verfügbar; Benutzeraktionen aus Systemen/Blockaden", () => {
  const jetzt = new Date("2026-09-27T10:00:00Z");
  const b = erstelleTagesbericht({ jetzt,
    audit: [{ action: "automation.lauf", created_at: "2026-09-27T08:00:00Z", details: { aktion: "test-status", name: "Tests & Build prüfen", ergebnis: "ok", zusammenfassung: "bestanden" } },
            { action: "automation.lauf", created_at: "2026-09-26T08:00:00Z", details: { aktion: "systempruefung", name: "Alt", ergebnis: "ok" } }],
    tasks: [{ title: "Stripe", status: "Blockiert", priority: "Hoch" }, { title: "Doku", status: "Offen", priority: "Mittel" }, { title: "Fertig", status: "Erledigt", updated_at: "2026-09-27T07:00:00Z" }],
    finance: [{ kind: "income", amount: 10, status: "confirmed", occurred_at: "2026-09-27T09:00:00Z" }, { kind: "income", amount: 99, status: "pending", occurred_at: "2026-09-27T09:00:00Z" }, { kind: "expense", amount: 5, status: "confirmed", occurred_at: "2026-09-20T09:00:00Z" }],
    w24: { leads: { gesamt: 9 }, kunden: { gesamt: 1 }, technischeProbleme: { offeneIncidents: 0 } },
    systems: [{ name: "Stripe", status: "🔴", note: "Secret fehlt", next_action: "STRIPE_WEBHOOK_SECRET in Vercel setzen" }, { name: "GitHub", status: "🟢" }] });
  const text = Object.fromEntries(b.bericht);
  assert.equal(b.datum, "2026-09-27");
  assert.deepEqual(b.automatischGeloest.map(x => x.text), ["Tests & Build prüfen: bestanden"]);
  assert.match(text["Welche Einnahmen wurden tatsächlich erfasst?"], /^10,00\s€/);
  assert.match(text["Welche Kosten sind tatsächlich entstanden?"], /^0,00\s€/);
  assert.match(text["Welche Leads wurden gefunden?"], /Tageswert nicht verfügbar \(gesamt 9\)/);
  assert.deepEqual(b.benutzeraktionen.map(x => x.text), ["Stripe: STRIPE_WEBHOOK_SECRET in Vercel setzen", "Wartet auf dich: Stripe"]);
  assert.deepEqual(b.jetztZuTun.map(x => x.text), ["Doku · Mittel"]);
  assert.ok(b.heuteErledigt.some(x => x.text === "Fertig"));
  assert.equal(text["Wichtigste nächste Aktion"], "Stripe: STRIPE_WEBHOOK_SECRET in Vercel setzen");
  assert.equal(text["Was fehlt bis zur ersten echten Einnahme?"], "nicht verfügbar");
});

test("Geschäfts-Control-Center: 🟢 AKTIV / 🟡 TEST / ⚪ PAUSE / 🔴 FEHLER mit Grund und Ziel", () => {
  const st = bereichsStatus({ businesses: [
    { id: "werknetz24", name: "Werknetz24", link: "/werknetz24", status: "EXTERNAL", liveStatus: { ok: true, data: { systemStatus: { gesamtstatus: "rot", counts: { rot: 3 } } } } },
    { id: "ecommerce", name: "E-Commerce", link: "/e-commerce", status: "PAUSIERT" }, { id: "future", name: "x", link: "#" } ],
    einnahmequellen: [{ name: "Affiliate", status: "PRUEFUNG" }, { name: "Sortiert24", status: "PAUSE", verweis: "/e-commerce" }] });
  assert.deepEqual(st.map(x => [x.id, x.ampel, x.label]), [["werknetz24", "🔴", "FEHLER"], ["ecommerce", "⚪", "PAUSE"], ["einnahmequellen", "🟡", "TEST"]]);
  assert.equal(st[0].grund, "3 System(e) rot"); assert.equal(st[2].tab, "einnahmequellen");
  assert.equal(bereichsStatus({ businesses: [], einnahmequellen: [{ status: "EINNAHMEN" }] })[0].ampel, "🟢");
});

test("privates Repository (GitHub 404 ohne Token) wird ehrlich als 'nicht prüfbar' gemeldet, nicht als bestanden", async () => {
  delete process.env.GITHUB_TOKEN;
  const privat = async url => url.includes("werknetz24-landing") ? { ok: false, status: 404 } : githubMock()(url);
  const r = await fuehreAktionAus("test-status", undefined, { fetchImpl: privat });
  assert.equal(r.ok, true);
  assert.match(r.zusammenfassung, /adnan: ✓ bestanden/);
  assert.match(r.zusammenfassung, /werknetz24-landing: nicht prüfbar \(privat, kein Lese-Token\)/);
  const g = await fuehreAktionAus("git-status", undefined, { fetchImpl: privat });
  assert.match(g.zusammenfassung, /adnan: abcdef1 feat: x · werknetz24-landing: nicht prüfbar/);
});

test("Tagesbericht: Benutzeraktion einer Einnahmequelle erscheint (nicht bei Pause)", () => {
  const b = erstelleTagesbericht({ einnahmequellen: [{ name: "Affiliate", status: "PRUEFUNG", benutzeraktion: "Arbeitgeber fragen, ob Filmen im LKW erlaubt ist" }, { name: "Shop", status: "PAUSE", benutzeraktion: "Gewerbe" }] });
  assert.deepEqual(b.benutzeraktionen.map(x => x.text), ["Affiliate: Arbeitgeber fragen, ob Filmen im LKW erlaubt ist"]);
  assert.equal(b.benutzeraktionen[0].ziel, "einnahmequellen");
});
