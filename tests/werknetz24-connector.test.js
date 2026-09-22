import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchWerknetz24Status, werknetz24ConnectorConfigured, fetchWerknetz24Kalender, createWerknetz24KalenderTermin, werknetz24WriteConfigured } from "../lib/werknetz24-connector.js";

test("werknetz24ConnectorConfigured is false without WERKNETZ24_STATUS_SECRET", () => {
  delete process.env.WERKNETZ24_STATUS_SECRET;
  assert.equal(werknetz24ConnectorConfigured(), false);
});

test("fetchWerknetz24Status returns configured:false honestly, never fakes data, when secret is missing", async () => {
  delete process.env.WERKNETZ24_STATUS_SECRET;
  const result = await fetchWerknetz24Status(async () => { throw new Error("must not fetch when not configured"); });
  assert.equal(result.configured, false);
  assert.equal(result.data, undefined);
});

test("fetchWerknetz24Status sends the secret as a Bearer token and returns the aggregated data on success", async () => {
  process.env.WERKNETZ24_STATUS_SECRET = "test-secret";
  let capturedHeaders = null;
  const fakeFetch = async (url, options) => {
    capturedHeaders = options.headers;
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true, systemStatus: { gesamtstatus: "gruen" } }),
    };
  };
  const result = await fetchWerknetz24Status(fakeFetch);
  assert.equal(result.configured, true);
  assert.equal(result.ok, true);
  assert.equal(result.data.systemStatus.gesamtstatus, "gruen");
  assert.equal(capturedHeaders.Authorization, "Bearer test-secret");
  delete process.env.WERKNETZ24_STATUS_SECRET;
});

test("fetchWerknetz24Status reports ok:false with the server error, not a fabricated status, on a 401/503", async () => {
  process.env.WERKNETZ24_STATUS_SECRET = "test-secret";
  const fakeFetch = async () => ({
    ok: false,
    status: 503,
    json: async () => ({ ok: false, error: "MASTER_ZENTRALE_SECRET nicht konfiguriert - Verbindung noch nicht aktiviert." }),
  });
  const result = await fetchWerknetz24Status(fakeFetch);
  assert.equal(result.configured, true);
  assert.equal(result.ok, false);
  assert.match(result.error, /nicht konfiguriert/);
  delete process.env.WERKNETZ24_STATUS_SECRET;
});

test("fetchWerknetz24Status reports a network error honestly instead of throwing or faking success", async () => {
  process.env.WERKNETZ24_STATUS_SECRET = "test-secret";
  const fakeFetch = async () => { throw new Error("network unreachable"); };
  const result = await fetchWerknetz24Status(fakeFetch);
  assert.equal(result.configured, true);
  assert.equal(result.ok, false);
  assert.equal(result.error, "network unreachable");
  delete process.env.WERKNETZ24_STATUS_SECRET;
});

// ─── Kalender (22.09.2026, "Kommandozentrale"-Folgeauftrag) ───

test("werknetz24WriteConfigured is false without WERKNETZ24_WRITE_SECRET", () => {
  delete process.env.WERKNETZ24_WRITE_SECRET;
  assert.equal(werknetz24WriteConfigured(), false);
});

test("fetchWerknetz24Kalender returns configured:false honestly when WERKNETZ24_STATUS_SECRET is missing, never fakes appointments", async () => {
  delete process.env.WERKNETZ24_STATUS_SECRET;
  const result = await fetchWerknetz24Kalender(async () => { throw new Error("must not fetch when not configured"); });
  assert.equal(result.configured, false);
  assert.equal(result.termine, undefined);
});

test("fetchWerknetz24Kalender sends WERKNETZ24_STATUS_SECRET (the read secret, not the write secret) and returns real termine", async () => {
  process.env.WERKNETZ24_STATUS_SECRET = "read-secret";
  let capturedHeaders = null, capturedUrl = null;
  const fakeFetch = async (url, options) => {
    capturedUrl = url; capturedHeaders = options.headers;
    return { ok: true, status: 200, json: async () => ({ ok: true, termine: [{ id: "e1", titel: "Kundentermin", start: "2027-01-01T10:00:00.000Z" }] }) };
  };
  const result = await fetchWerknetz24Kalender(fakeFetch);
  assert.equal(result.configured, true);
  assert.equal(result.ok, true);
  assert.equal(result.termine.length, 1);
  assert.equal(result.termine[0].titel, "Kundentermin");
  assert.equal(capturedHeaders.Authorization, "Bearer read-secret");
  assert.match(capturedUrl, /type=master-zentrale-kalender/);
  delete process.env.WERKNETZ24_STATUS_SECRET;
});

test("createWerknetz24KalenderTermin returns configured:false honestly when WERKNETZ24_WRITE_SECRET is missing, never fakes a created event", async () => {
  delete process.env.WERKNETZ24_WRITE_SECRET;
  const result = await createWerknetz24KalenderTermin({ summary: "Test" }, async () => { throw new Error("must not fetch when not configured"); });
  assert.equal(result.configured, false);
  assert.equal(result.termin, undefined);
});

test("createWerknetz24KalenderTermin sends the separate WERKNETZ24_WRITE_SECRET, not the read secret, and returns the created termin", async () => {
  process.env.WERKNETZ24_STATUS_SECRET = "read-secret";
  process.env.WERKNETZ24_WRITE_SECRET = "write-secret";
  let capturedHeaders = null, capturedBody = null;
  const fakeFetch = async (url, options) => {
    capturedHeaders = options.headers; capturedBody = JSON.parse(options.body);
    return { ok: true, status: 201, json: async () => ({ ok: true, termin: { id: "e2", titel: "Neuer Termin" } }) };
  };
  const result = await createWerknetz24KalenderTermin({ summary: "Neuer Termin", startISO: "2027-01-01T10:00:00.000Z", endISO: "2027-01-01T10:30:00.000Z" }, fakeFetch);
  assert.equal(result.configured, true);
  assert.equal(result.ok, true);
  assert.equal(result.termin.titel, "Neuer Termin");
  assert.equal(capturedHeaders.Authorization, "Bearer write-secret");
  assert.equal(capturedBody.summary, "Neuer Termin");
  delete process.env.WERKNETZ24_STATUS_SECRET;
  delete process.env.WERKNETZ24_WRITE_SECRET;
});

test("createWerknetz24KalenderTermin reports a server-side rejection (e.g. validation) honestly, not a fabricated success", async () => {
  process.env.WERKNETZ24_WRITE_SECRET = "write-secret";
  const fakeFetch = async () => ({ ok: false, status: 400, json: async () => ({ ok: false, error: "summary fehlt oder ist zu lang (max. 200 Zeichen)" }) });
  const result = await createWerknetz24KalenderTermin({ summary: "" }, fakeFetch);
  assert.equal(result.ok, false);
  assert.match(result.error, /summary/);
  delete process.env.WERKNETZ24_WRITE_SECRET;
});
