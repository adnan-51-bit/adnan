import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchWerknetz24Status, werknetz24ConnectorConfigured } from "../lib/werknetz24-connector.js";

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
