import test from "node:test";
import assert from "node:assert/strict";
import { runStaticQualityGate } from "../lib/quality-gate.js";

const systems = [
  "github", "vercel", "supabase", "famulor", "easybell", "stripe", "paypal", "shopify", "email", "slack"
].map(id => ({ id, status: id === "stripe" ? "🔴" : "🟢" }));

test("quality gate blocks production while persistence is only memory", () => {
  const gate = runStaticQualityGate({ storage: "memory", systems });
  assert.equal(gate.productionReady, false);
  assert.ok(gate.checks.some(c => c.id === "persistence" && c.status === "warning"));
});

test("quality gate detects missing system registry entries", () => {
  const gate = runStaticQualityGate({ storage: "supabase", systems: systems.slice(0, 3) });
  assert.equal(gate.productionReady, false);
  assert.ok(gate.checks.find(c => c.id === "system-registry")?.missing.length > 0);
});

test("quality gate keeps secret values out of output", () => {
  const gate = runStaticQualityGate({ storage: "supabase", systems, env: { STRIPE_SECRET_KEY: "do-not-expose" } });
  assert.equal(JSON.stringify(gate).includes("do-not-expose"), false);
  assert.equal(gate.checks.find(c => c.id === "secret-exposure")?.status, "pass");
});

test("quality gate fails admin-auth when MASTER_API_SECRET is not set (Phase 4 finding)", () => {
  const gate = runStaticQualityGate({ storage: "supabase", systems, env: {} });
  assert.equal(gate.checks.find(c => c.id === "admin-auth")?.status, "fail");
  assert.equal(gate.productionReady, false);
});

test("quality gate passes admin-auth once MASTER_API_SECRET is set", () => {
  const gate = runStaticQualityGate({ storage: "supabase", systems, env: { MASTER_API_SECRET: "set" } });
  assert.equal(gate.checks.find(c => c.id === "admin-auth")?.status, "pass");
});
