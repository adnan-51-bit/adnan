// Full-System-Audit Phase 2 (26.09.2026): nach "Abbrechen" der Secret-Abfrage darf ein Lesezugriff
// nicht erneut fragen (live gemessen: 46 Abfragen bei einem Rundgang); Schreibaktionen fragen weiter.
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { adminFetch } from "../lib/admin-fetch.js";

function memoryStorage() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) };
}

let prompts, antwort, requests;
beforeEach(() => {
  prompts = 0; antwort = null; requests = [];
  globalThis.localStorage = memoryStorage();
  globalThis.sessionStorage = memoryStorage();
  globalThis.window = { prompt: () => { prompts++; return antwort; } };
  globalThis.fetch = async (url, opts) => { requests.push(opts.headers.Authorization || null); return new Response("{}", { status: opts.headers.Authorization === "Bearer richtig" ? 200 : 401 }); };
});

test("Abbruch: Lesezugriffe fragen danach nicht erneut", async () => {
  await adminFetch("/x");
  assert.equal(prompts, 1);
  await adminFetch("/x");
  await adminFetch("/y");
  assert.equal(prompts, 1);
  assert.deepEqual(requests, [null, null, null]);
});

test("Abbruch: Schreibaktion fragt trotzdem", async () => {
  await adminFetch("/x");
  antwort = "richtig";
  const r = await adminFetch("/x", { method: "POST" });
  assert.equal(r.status, 200);
  assert.equal(prompts, 2);
});

test("eingegebenes Secret wird gespeichert und danach ohne Abfrage verwendet", async () => {
  antwort = "richtig";
  assert.equal((await adminFetch("/x")).status, 200);
  assert.equal((await adminFetch("/y")).status, 200);
  assert.equal(prompts, 1);
});

test("falsches gespeichertes Secret: bei 401 wird genau einmal neu gefragt", async () => {
  localStorage.setItem("master_api_secret", "falsch");
  antwort = "richtig";
  const r = await adminFetch("/x");
  assert.equal(r.status, 200);
  assert.equal(prompts, 1);
  assert.deepEqual(requests, ["Bearer falsch", "Bearer richtig"]);
});
