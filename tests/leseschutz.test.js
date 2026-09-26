// Supabase-Persistenz (26.09.2026): Kunden, Bestellungen, Retouren, Finanzbuchungen und Audit-Log
// sind echte Daten und nur mit MASTER_API_SECRET lesbar. Produkte/Lieferanten bleiben offen.
import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("data:text/javascript," + encodeURIComponent(
  'export async function resolve(s, c, n) { const fix = (s === "next/server" || (s.startsWith(".") && !/\\.[cm]?js$/.test(s))) ? s + ".js" : s; return n(fix, c); }'
));
delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SECRET_KEY;
const orders = await import("../app/api/orders/route.js");
const finance = await import("../app/api/master/finance/route.js");
const audit = await import("../app/api/master/audit/route.js");

const SECRET = "test-master-secret";
const req = (path, token) => new Request("https://example.test" + path, token ? { headers: { authorization: "Bearer " + token } } : {});

test("ohne Secret gesperrt: Kunden, Bestellungen, Retouren, Finanzen, Audit-Log", async () => {
  process.env.MASTER_API_SECRET = SECRET;
  for (const t of ["customers", "orders", "returns"]) assert.equal((await orders.GET(req("/api/orders?type=" + t))).status, 401, t);
  assert.equal((await orders.GET(req("/api/orders"))).status, 401, "Standard-type orders");
  assert.equal((await finance.GET(req("/api/master/finance?business_id=ecommerce"))).status, 401);
  assert.equal((await audit.GET(req("/api/master/audit"))).status, 401);
});

test("mit Secret lesbar", async () => {
  process.env.MASTER_API_SECRET = SECRET;
  assert.equal((await orders.GET(req("/api/orders?type=customers", SECRET))).status, 200);
  assert.equal((await finance.GET(req("/api/master/finance", SECRET))).status, 200);
  assert.equal((await audit.GET(req("/api/master/audit", SECRET))).status, 200);
});

test("Produkte und Lieferanten bleiben ohne Secret lesbar (keine Personendaten)", async () => {
  process.env.MASTER_API_SECRET = SECRET;
  assert.equal((await orders.GET(req("/api/orders?type=products"))).status, 200);
  assert.equal((await orders.GET(req("/api/orders?type=suppliers"))).status, 200);
});
