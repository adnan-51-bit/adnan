// Anmeldung der Master-Zentrale (26.09.2026): Anmeldeseite statt Browser-Fenster. Ein falsch gespeicherter
// Code darf nicht haengenbleiben (Adnan hatte den Werknetz24-Code gespeichert und kam nicht mehr rein).
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { adminFetch, logoutMaster, hasStoredSecret, speichereSecret, sicheresZiel, anmeldeUrl } from "../lib/admin-fetch.js";

function memoryStorage() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) };
}

let requests, weiterleitung, prompts;
beforeEach(() => {
  requests = []; weiterleitung = null; prompts = 0;
  globalThis.localStorage = memoryStorage();
  globalThis.sessionStorage = memoryStorage();
  globalThis.window = { prompt: () => { prompts++; return null; }, location: { pathname: "/e-commerce", search: "?tab=produkte", assign: u => { weiterleitung = u; } } };
  globalThis.fetch = async (url, opts) => { requests.push(opts.headers.Authorization || null); return new Response("{}", { status: opts.headers.Authorization === "Bearer richtig" ? 200 : 401 }); };
});

test("nie mehr ein Browser-Fenster (window.prompt)", async () => {
  await adminFetch("/x");
  await adminFetch("/x", { method: "POST" });
  assert.equal(prompts, 0);
});

test("Lesen ohne Anmeldung: kein Secret gesendet, keine Weiterleitung", async () => {
  const r = await adminFetch("/x");
  assert.equal(r.status, 401);
  assert.deepEqual(requests, [null]);
  assert.equal(weiterleitung, null);
});

test("Schreiben ohne Anmeldung: Weiterleitung zur Anmeldeseite mit Rücksprung", async () => {
  await adminFetch("/x", { method: "POST" });
  assert.equal(weiterleitung, "/anmelden?zurueck=" + encodeURIComponent("/e-commerce?tab=produkte"));
});

test("richtiger gespeicherter Code wird mitgeschickt", async () => {
  speichereSecret("richtig");
  assert.equal((await adminFetch("/x")).status, 200);
  assert.equal(requests.at(-1), "Bearer richtig");
  assert.equal(hasStoredSecret(), true);
});

test("falscher gespeicherter Code (z. B. Werknetz24-Code) wird nach 401 entfernt – kein Hängenbleiben", async () => {
  speichereSecret("werknetz24code");
  assert.equal((await adminFetch("/x")).status, 401);
  assert.equal(hasStoredSecret(), false);
  await adminFetch("/x");
  assert.equal(requests.at(-1), null, "danach wird kein falscher Code mehr geschickt");
});

test("Abmelden entfernt den Code und die alte 'abgelehnt'-Markierung", () => {
  speichereSecret("richtig"); sessionStorage.setItem("master_api_secret_declined", "1");
  logoutMaster();
  assert.equal(hasStoredSecret(), false);
  assert.equal(sessionStorage.getItem("master_api_secret_declined"), null);
});

test("Rücksprung nur auf interne Pfade (kein offener Redirect)", () => {
  assert.equal(sicheresZiel("/e-commerce?tab=x"), "/e-commerce?tab=x");
  assert.equal(sicheresZiel("https://boese.example"), "/master");
  assert.equal(sicheresZiel("//boese.example"), "/master");
  assert.equal(sicheresZiel("/\\boese.example"), "/master");
  assert.match(anmeldeUrl(), /^\/anmelden\?zurueck=/);
});
