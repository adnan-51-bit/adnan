// Full-System-Audit 26.09.2026: die Werknetz24-Proxy-Zweige von /api/master/businesses waren ohne
// Anmeldung lesbar (echte Aufgaben/Rechnungen/Incidents/Termine). Dieser Test sichert ab, dass sie
// ohne MASTER_API_SECRET gesperrt sind und der liveStatus ohne Anmeldung nicht ausgeliefert wird.
import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

// Die Route importiert "next/server" und "../lib/master-store" ohne Dateiendung (Next-Bundler-
// Konvention). Reines Node-ESM braucht die Endung - nur fuer diesen Test per Resolve-Hook ergaenzt.
register("data:text/javascript," + encodeURIComponent(
  'export async function resolve(s, c, n) { const fix = (s === "next/server" || (s.startsWith(".") && !/\\.[cm]?js$/.test(s))) ? s + ".js" : s; return n(fix, c); }'
));
const { GET } = await import("../app/api/master/businesses/route.js");

const SECRET = "test-master-secret";

function req(query, token) {
  return new Request("https://example.test/api/master/businesses" + query, token ? { headers: { authorization: "Bearer " + token } } : {});
}

test("Werknetz24-Detail-Proxies sind ohne Secret gesperrt (401), ohne je Werknetz24 aufzurufen", async () => {
  process.env.MASTER_API_SECRET = SECRET;
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => { called = true; throw new Error("darf nicht aufgerufen werden"); };
  try {
    for (const key of ["werknetz24Kalender", "werknetz24Aufgaben", "werknetz24Rechnungen", "werknetz24Incidents"]) {
      const res = await GET(req(`?${key}=1`));
      assert.equal(res.status, 401, key);
      const res2 = await GET(req(`?${key}=1`, "falsch"));
      assert.equal(res2.status, 401, key + " mit falschem Token");
    }
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Werknetz24-Detail-Proxies ohne konfiguriertes MASTER_API_SECRET: fail-closed (503)", async () => {
  delete process.env.MASTER_API_SECRET;
  const res = await GET(req("?werknetz24Rechnungen=1", "irgendwas"));
  assert.equal(res.status, 503);
});

test("Betriebsliste bleibt ohne Secret lesbar, liefert aber keinen Werknetz24-liveStatus", async () => {
  process.env.MASTER_API_SECRET = SECRET;
  process.env.WERKNETZ24_STATUS_SECRET = "status-secret";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ ok: true, systemStatus: { gesamtstatus: "rot" }, finanzen: { offeneRechnungenSummeCent: 9400 } }), { status: 200 });
  try {
    const open = await (await GET(req(""))).json();
    const w = open.businesses.find(b => b.id === "werknetz24");
    assert.ok(w, "Werknetz24 bleibt in der Liste");
    assert.equal(w.liveStatus.ok, false);
    assert.equal(JSON.stringify(open).includes("9400"), false, "keine Finanzkennzahl ohne Anmeldung");

    const authed = await (await GET(req("", SECRET))).json();
    const w2 = authed.businesses.find(b => b.id === "werknetz24");
    assert.equal(w2.liveStatus.ok, true);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.WERKNETZ24_STATUS_SECRET;
  }
});

// Phase 2 (26.09.2026): Agenten-Zentrale + Fehlerzentrale-Aktionen.
const { POST } = await import("../app/api/master/businesses/route.js");

function post(body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.authorization = "Bearer " + token;
  return new Request("https://example.test/api/master/businesses", { method: "POST", headers, body: JSON.stringify(body) });
}

test("werknetz24Agenten ist ohne Secret gesperrt", async () => {
  process.env.MASTER_API_SECRET = SECRET;
  const res = await GET(req("?werknetz24Agenten=1"));
  assert.equal(res.status, 401);
});

test("Systemcheck/Incident-Abschluss: ohne MASTER_API_SECRET 401, ohne WERKNETZ24_WRITE_SECRET ehrlich 503", async () => {
  process.env.MASTER_API_SECRET = SECRET;
  delete process.env.WERKNETZ24_WRITE_SECRET;
  assert.equal((await POST(post({ action: "werknetz24-systemcheck" }))).status, 401);
  assert.equal((await POST(post({ action: "werknetz24-systemcheck" }, SECRET))).status, 503);
  assert.equal((await POST(post({ action: "werknetz24-incident-abschliessen", incidentId: "i1" }, SECRET))).status, 503);
  assert.equal((await POST(post({ action: "werknetz24-incident-abschliessen" }, SECRET))).status, 400);
});

test("Incident-Abschluss: 409 von Werknetz24 (Pruefung nicht gruen) wird unveraendert durchgereicht", async () => {
  process.env.MASTER_API_SECRET = SECRET;
  process.env.WERKNETZ24_WRITE_SECRET = "write-secret";
  const originalFetch = globalThis.fetch;
  let gesendet = null;
  globalThis.fetch = async (url, opts) => { gesendet = { url, opts }; return new Response(JSON.stringify({ ok: false, error: "nicht grün", aktueller_status: "rot" }), { status: 409 }); };
  try {
    const res = await POST(post({ action: "werknetz24-incident-abschliessen", incidentId: "i1" }, SECRET));
    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.aktueller_status, "rot");
    assert.match(gesendet.url, /master-zentrale-incident-abschliessen/);
    assert.equal(gesendet.opts.headers.Authorization, "Bearer write-secret");
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.WERKNETZ24_WRITE_SECRET;
  }
});

test("Systemcheck: echte Antwort von Werknetz24 wird weitergegeben", async () => {
  process.env.MASTER_API_SECRET = SECRET;
  process.env.WERKNETZ24_WRITE_SECRET = "write-secret";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ ok: true, geprueft: "2026-09-26T08:00:00.000Z", systeme: [{ key: "gmail", status: "rot" }], neueIncidents: 0 }), { status: 200 });
  try {
    const res = await POST(post({ action: "werknetz24-systemcheck" }, SECRET));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.systeme[0].key, "gmail");
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.WERKNETZ24_WRITE_SECRET;
  }
});
