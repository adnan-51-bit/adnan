import { test } from "node:test";
import assert from "node:assert/strict";
import { checkAdminSecret, timingSafeEqualString, resetLoginSperreFuerTests } from "../lib/auth.js";

function fakeRequest(authHeader, ip = "1.2.3.4") {
  return { headers: { get: name => (name.toLowerCase() === "authorization" ? authHeader : name.toLowerCase() === "x-forwarded-for" ? ip : null) } };
}

test("timingSafeEqualString: equal strings match", () => {
  assert.equal(timingSafeEqualString("secret", "secret"), true);
});

test("timingSafeEqualString: different strings (same length) do not match", () => {
  assert.equal(timingSafeEqualString("secretA", "secretB"), false);
});

test("timingSafeEqualString: different-length strings do not match and do not throw", () => {
  assert.doesNotThrow(() => timingSafeEqualString("short", "a-much-longer-secret-value"));
  assert.equal(timingSafeEqualString("short", "a-much-longer-secret-value"), false);
});

test("checkAdminSecret: without MASTER_API_SECRET configured, refuses with 503 (fail-closed, not fail-open)", async () => {
  delete process.env.MASTER_API_SECRET;
  const result = await checkAdminSecret(fakeRequest("Bearer anything"));
  assert.equal(result.status, 503);
});

test("checkAdminSecret: missing Authorization header is rejected with 401", async () => {
  process.env.MASTER_API_SECRET = "test-secret";
  const result = await checkAdminSecret(fakeRequest(""));
  assert.equal(result.status, 401);
  delete process.env.MASTER_API_SECRET;
});

test("checkAdminSecret: wrong secret is rejected with 401", async () => {
  process.env.MASTER_API_SECRET = "test-secret";
  const result = await checkAdminSecret(fakeRequest("Bearer wrong-secret"));
  assert.equal(result.status, 401);
  delete process.env.MASTER_API_SECRET;
});

test("checkAdminSecret: correct secret is accepted (returns null)", async () => {
  process.env.MASTER_API_SECRET = "test-secret";
  const result = await checkAdminSecret(fakeRequest("Bearer test-secret"));
  assert.equal(result, null);
  delete process.env.MASTER_API_SECRET;
});

test("Sperre: 5 falsche Codes -> 15 Minuten gesperrt (429), auch der richtige Code; danach wieder frei", async () => {
  delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SECRET_KEY; resetLoginSperreFuerTests();
  process.env.MASTER_API_SECRET = "richtiger-code";
  const t0 = 1_000_000;
  for (let i = 0; i < 5; i++) assert.equal((await checkAdminSecret(fakeRequest("Bearer falsch", "9.9.9.9"), { jetzt: t0 + i })).status, 401);
  assert.equal((await checkAdminSecret(fakeRequest("Bearer richtiger-code", "9.9.9.9"), { jetzt: t0 + 10 })).status, 429, "während der Sperre auch der richtige Code abgewiesen");
  assert.equal(await checkAdminSecret(fakeRequest("Bearer richtiger-code", "8.8.8.8"), { jetzt: t0 + 10 }), null, "andere IP nicht betroffen");
  assert.equal(await checkAdminSecret(fakeRequest("Bearer richtiger-code", "9.9.9.9"), { jetzt: t0 + 15 * 60 * 1000 + 1 }), null, "nach 15 Minuten wieder frei");
  delete process.env.MASTER_API_SECRET;
});

test("Sperre: ohne Code (öffentliche Ansicht) wird nicht gezählt; richtiger Code setzt Zähler zurück", async () => {
  resetLoginSperreFuerTests(); process.env.MASTER_API_SECRET = "richtiger-code";
  for (let i = 0; i < 10; i++) assert.equal((await checkAdminSecret(fakeRequest("", "7.7.7.7"))).status, 401);
  assert.equal(await checkAdminSecret(fakeRequest("Bearer richtiger-code", "7.7.7.7")), null);
  for (let i = 0; i < 4; i++) await checkAdminSecret(fakeRequest("Bearer falsch", "7.7.7.7"));
  assert.equal(await checkAdminSecret(fakeRequest("Bearer richtiger-code", "7.7.7.7")), null, "4 Fehler + Erfolg");
  for (let i = 0; i < 4; i++) await checkAdminSecret(fakeRequest("Bearer falsch", "7.7.7.7"));
  assert.equal(await checkAdminSecret(fakeRequest("Bearer richtiger-code", "7.7.7.7")), null, "Zähler war zurückgesetzt");
  delete process.env.MASTER_API_SECRET;
});
