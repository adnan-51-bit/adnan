import { test } from "node:test";
import assert from "node:assert/strict";
import { checkAdminSecret, timingSafeEqualString } from "../lib/auth.js";

function fakeRequest(authHeader) {
  return { headers: { get: name => name.toLowerCase() === "authorization" ? authHeader : null } };
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

test("checkAdminSecret: without MASTER_API_SECRET configured, refuses with 503 (fail-closed, not fail-open)", () => {
  delete process.env.MASTER_API_SECRET;
  const result = checkAdminSecret(fakeRequest("Bearer anything"));
  assert.equal(result.status, 503);
});

test("checkAdminSecret: missing Authorization header is rejected with 401", () => {
  process.env.MASTER_API_SECRET = "test-secret";
  const result = checkAdminSecret(fakeRequest(""));
  assert.equal(result.status, 401);
  delete process.env.MASTER_API_SECRET;
});

test("checkAdminSecret: wrong secret is rejected with 401", () => {
  process.env.MASTER_API_SECRET = "test-secret";
  const result = checkAdminSecret(fakeRequest("Bearer wrong-secret"));
  assert.equal(result.status, 401);
  delete process.env.MASTER_API_SECRET;
});

test("checkAdminSecret: correct secret is accepted (returns null)", () => {
  process.env.MASTER_API_SECRET = "test-secret";
  const result = checkAdminSecret(fakeRequest("Bearer test-secret"));
  assert.equal(result, null);
  delete process.env.MASTER_API_SECRET;
});
