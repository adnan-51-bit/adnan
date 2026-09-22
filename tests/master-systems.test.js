import { test } from "node:test";
import assert from "node:assert/strict";
import { listSystems, updateSystem } from "../lib/master-systems.js";

// Echtes Systemmonitoring (22.09.2026, "Kommandozentrale"-Folgeauftrag Teil B): fuer Systeme mit
// einem echten, kostenlosen Signal (Env-Var-Konfiguration, GitHub-API, "der Server antwortet
// gerade") wird der Status bei jedem listSystems()-Aufruf live neu berechnet statt eine
// womoeglich veraltete manuelle Notiz zu zeigen. global.fetch wird gemockt, damit Tests nie einen
// echten GitHub-API-Aufruf ausloesen (kein Netzwerk, keine Rate-Limit-Abhaengigkeit in CI).

function clearAutoEnv() {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.SHOPIFY_WEBHOOK_SECRET;
  delete process.env.RESEND_API_KEY;
  delete process.env.SLACK_WEBHOOK_URL;
}

function githubSuccessFetch() {
  return async (url) => {
    if (String(url).includes("api.github.com")) {
      return { ok: true, json: async () => ({ state: "success" }) };
    }
    throw new Error("Unerwarteter Fetch-Aufruf im Test: " + url);
  };
}

test("listSystems: ohne jedes konfigurierte Secret sind auto-geprüfte Systeme ehrlich rot/offen/blau, nie erfunden grün", async (t) => {
  clearAutoEnv();
  t.mock.method(global, "fetch", githubSuccessFetch());
  const { systems } = await listSystems();
  const byId = Object.fromEntries(systems.map(s => [s.id, s]));
  assert.equal(byId.stripe.status, "🔴");
  assert.equal(byId.shopify.status, "⚪");
  assert.equal(byId.email.status, "⚪");
  assert.equal(byId.slack.status, "⚪");
  assert.equal(byId.supabase.status, "🔵");
  assert.equal(byId.vercel.status, "🟢");
  assert.equal(byId.vercel.source, "auto");
});

test("listSystems: gesetztes STRIPE_WEBHOOK_SECRET macht Stripe live gelb statt rot", async (t) => {
  clearAutoEnv();
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  t.mock.method(global, "fetch", githubSuccessFetch());
  const { systems } = await listSystems();
  const stripe = systems.find(s => s.id === "stripe");
  assert.equal(stripe.status, "🟡");
  assert.match(stripe.note, /STRIPE_WEBHOOK_SECRET gesetzt/);
  delete process.env.STRIPE_WEBHOOK_SECRET;
});

test("listSystems: gesetzte SUPABASE_URL/SUPABASE_SECRET_KEY machen Supabase gelb statt blau, aber NICHT automatisch grün (echter Verbindungstest steht noch aus)", async (t) => {
  clearAutoEnv();
  process.env.SUPABASE_URL = "https://fake.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "fake-key";
  // Bei konfiguriertem Supabase liest listSystems() die Betriebs-Datensaetze selbst aus Supabase
  // statt aus dem lokalen Seed - Mock liefert einen realistischen Datensatz (Supabase-Zeile fuer
  // "supabase"), damit applyAutoOverlay() ihn ueberhaupt finden/ueberschreiben kann.
  t.mock.method(global, "fetch", async (url) => {
    if (String(url).includes("api.github.com")) return { ok: true, json: async () => ({ state: "success" }) };
    return { ok: true, status: 200, json: async () => [{ id: "supabase", name: "Supabase", status: "🟡", note: "alt", next_action: "alt", last_checked_at: null, source: "manual" }] };
  });
  const { systems } = await listSystems();
  const supabase = systems.find(s => s.id === "supabase");
  assert.equal(supabase.status, "🟡");
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SECRET_KEY;
});

test("listSystems: manuelle Systeme (Famulor/Easybell/PayPal) bleiben unverändert, kein erfundener Live-Status", async (t) => {
  clearAutoEnv();
  t.mock.method(global, "fetch", githubSuccessFetch());
  const { systems } = await listSystems();
  const famulor = systems.find(s => s.id === "famulor");
  assert.equal(famulor.source, "manual");
  assert.equal(famulor.status, "🟢"); // unveränderter Seed-Wert, keine Überschreibung
});

test("listSystems: GitHub-CI-Fehlschlag wird ehrlich als rot gemeldet", async (t) => {
  clearAutoEnv();
  t.mock.method(global, "fetch", async () => ({ ok: true, json: async () => ({ state: "failure" }) }));
  const { systems } = await listSystems();
  const github = systems.find(s => s.id === "github");
  assert.equal(github.status, "🔴");
});

test("listSystems: nicht erreichbares GitHub wird als Warnung (gelb) gemeldet, nicht als Erfolg vorgetäuscht", async (t) => {
  clearAutoEnv();
  t.mock.method(global, "fetch", async () => { throw new Error("network unreachable"); });
  const { systems } = await listSystems();
  const github = systems.find(s => s.id === "github");
  assert.equal(github.status, "🟡");
  assert.match(github.note, /nicht erreichbar/);
});

test("updateSystem: manuelle Bearbeitung eines automatisch geprüften Systems (z.B. github) wird klar abgelehnt statt eine wirkungslose Speicherung vorzutäuschen", async (t) => {
  clearAutoEnv();
  t.mock.method(global, "fetch", githubSuccessFetch());
  await assert.rejects(() => updateSystem("github", { status: "🟢" }), /automatisch geprüft/);
});

test("updateSystem: manuelle Bearbeitung eines echten manuellen Systems (z.B. famulor) funktioniert weiterhin", async (t) => {
  clearAutoEnv();
  t.mock.method(global, "fetch", githubSuccessFetch());
  const { system } = await updateSystem("famulor", { status: "🔴", note: "Testfall" });
  assert.equal(system.status, "🔴");
  assert.equal(system.note, "Testfall");
});
