import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  listProducts, createProduct, advanceProductPipeline, updateProduct,
  listSuppliers, createSupplier, updateSupplier,
  listCustomers, createCustomer,
  listOrders, createOrder, deriveOrderGateInputs,
  listReturns, createReturn,
  resetEcommerceStoreForTests,
  PRODUCT_PIPELINE_STATES,
} from "../lib/ecommerce-store.js";

beforeEach(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SECRET_KEY;
  resetEcommerceStoreForTests();
});

test("listProducts returns the real, previously researched candidates - not an empty or fabricated list", async () => {
  const products = await listProducts();
  assert.equal(products.length, 6);
  assert.ok(products.some(p => p.name === "Kabel-Organizer 5er"));
});

test("listSuppliers returns the real, sourced suppliers from app/lieferanten research", async () => {
  const suppliers = await listSuppliers();
  assert.equal(suppliers.length, 6);
  assert.ok(suppliers.every(s => s.quelle_url && s.quelle_url.startsWith("https://")));
});

test("listCustomers starts empty - no fake customers seeded", async () => {
  assert.deepEqual(await listCustomers(), []);
});

test("listOrders starts empty - no fake orders seeded", async () => {
  assert.deepEqual(await listOrders(), []);
});

test("listReturns starts empty - no fake returns seeded", async () => {
  assert.deepEqual(await listReturns(), []);
});

test("createProduct rejects missing required fields", async () => {
  await assert.rejects(() => createProduct({ name: "Test" }));
  await assert.rejects(() => createProduct({ name: "Test", kategorie: "Haushalt", verkaufspreis_cent: -5 }));
});

test("createProduct starts a new product at IDEA, the first pipeline stage", async () => {
  const product = await createProduct({ name: "Testprodukt", kategorie: "Test", verkaufspreis_cent: 1999 });
  assert.equal(product.pipeline_status, "IDEA");
});

test("advanceProductPipeline moves exactly one stage forward, never skips", async () => {
  const product = await createProduct({ name: "Testprodukt", kategorie: "Test", verkaufspreis_cent: 1999 });
  assert.equal(product.pipeline_status, "IDEA");
  const step1 = await advanceProductPipeline(product.id);
  assert.equal(step1.pipeline_status, "RESEARCH");
  const step2 = await advanceProductPipeline(product.id);
  assert.equal(step2.pipeline_status, "SUPPLIER_CHECK");
});

test("advanceProductPipeline refuses to advance past the last stage (PUBLISHED)", async () => {
  const product = await createProduct({ name: "Testprodukt", kategorie: "Test", verkaufspreis_cent: 1999 });
  let current = product;
  for (let i = 0; i < PRODUCT_PIPELINE_STATES.length - 1; i++) current = await advanceProductPipeline(current.id);
  assert.equal(current.pipeline_status, "PUBLISHED");
  await assert.rejects(() => advanceProductPipeline(current.id));
});

test("createSupplier rejects missing required fields", async () => {
  await assert.rejects(() => createSupplier({ name: "Nur Name" }));
});

test("updateSupplier rejects an invalid status value", async () => {
  const supplier = await createSupplier({ name: "Testlieferant", region: "Deutschland" });
  await assert.rejects(() => updateSupplier(supplier.id, { status: "erfunden" }));
});

test("createOrder rejects missing kunde_id/positionen and invalid line items", async () => {
  await assert.rejects(() => createOrder({ kunde_id: "k1", positionen: [] }));
  await assert.rejects(() => createOrder({ kunde_id: "k1", positionen: [{ produkt_id: "p1", menge: 0 }] }));
});

test("createOrder starts as payment_pending, never pre-approved", async () => {
  const customer = await createCustomer({ name: "Test Kunde", email: "test@example.com" });
  const order = await createOrder({ kunde_id: customer.id, positionen: [{ produkt_id: "prod_cable", menge: 1 }] });
  assert.equal(order.status, "payment_pending");
});

test("createReturn rejects missing required fields", async () => {
  await assert.rejects(() => createReturn({ bestellung_id: "o1" }));
});

// ─── deriveOrderGateInputs: die zentrale Sicherheitskorrektur. Vor Phase 3 konnte jeder Aufrufer
// von /api/orders per POST-Body einfach productApproved:true/supplierVerified:true behaupten -
// diese Funktion leitet die drei Flags jetzt ausschliesslich aus echten, gespeicherten Daten ab.

test("deriveOrderGateInputs: an unpublished product blocks productApproved, regardless of any claim", async () => {
  // prod_cable ist im Seed auf SUPPLIER_CHECK, nicht PUBLISHED.
  const order = { status: "paid", positionen: [{ produkt_id: "prod_cable", menge: 1 }] };
  const derived = await deriveOrderGateInputs(order);
  assert.equal(derived.productApproved, false);
});

test("deriveOrderGateInputs: an unknown product id blocks productApproved and is flagged", async () => {
  const order = { status: "paid", positionen: [{ produkt_id: "prod_does_not_exist", menge: 1 }] };
  const derived = await deriveOrderGateInputs(order);
  assert.equal(derived.productApproved, false);
  assert.ok(derived.riskFlags.some(f => f.startsWith("produkt_unbekannt:")));
});

test("deriveOrderGateInputs: a product with an unverified supplier blocks supplierVerified", async () => {
  const product = await createProduct({ name: "Mit Lieferant", kategorie: "Test", verkaufspreis_cent: 2000 });
  const supplier = await createSupplier({ name: "Nicht verifiziert", region: "Deutschland" });
  await updateProduct(product.id, { supplier_id: supplier.id, pipeline_status: "PUBLISHED", einkaufspreis_cent: 500 });
  const order = { status: "paid", positionen: [{ produkt_id: product.id, menge: 1 }] };
  const derived = await deriveOrderGateInputs(order);
  assert.equal(derived.supplierVerified, false);
});

test("deriveOrderGateInputs: a product with no linked supplier at all blocks supplierVerified", async () => {
  const product = await createProduct({ name: "Ohne Lieferant", kategorie: "Test", verkaufspreis_cent: 2000 });
  await updateProduct(product.id, { pipeline_status: "PUBLISHED", einkaufspreis_cent: 500 });
  const order = { status: "paid", positionen: [{ produkt_id: product.id, menge: 1 }] };
  const derived = await deriveOrderGateInputs(order);
  assert.equal(derived.supplierVerified, false);
});

test("deriveOrderGateInputs: a negative or missing margin blocks marginApproved", async () => {
  const supplier = await createSupplier({ name: "Verifiziert", region: "Deutschland" });
  await updateSupplier(supplier.id, { status: "verifiziert" });
  const product = await createProduct({ name: "Schlechte Marge", kategorie: "Test", verkaufspreis_cent: 1000 });
  await updateProduct(product.id, { supplier_id: supplier.id, pipeline_status: "PUBLISHED", einkaufspreis_cent: 1500 });
  const order = { status: "paid", positionen: [{ produkt_id: product.id, menge: 1 }] };
  const derived = await deriveOrderGateInputs(order);
  assert.equal(derived.marginApproved, false);
});

test("deriveOrderGateInputs: only a fully verified product+supplier+margin chain passes all three gates", async () => {
  const supplier = await createSupplier({ name: "Voll verifiziert", region: "Deutschland" });
  await updateSupplier(supplier.id, { status: "verifiziert" });
  const product = await createProduct({ name: "Freigegeben", kategorie: "Test", verkaufspreis_cent: 2000 });
  await updateProduct(product.id, { supplier_id: supplier.id, pipeline_status: "PUBLISHED", einkaufspreis_cent: 500 });
  const order = { status: "paid", positionen: [{ produkt_id: product.id, menge: 1 }] };
  const derived = await deriveOrderGateInputs(order);
  assert.equal(derived.productApproved, true);
  assert.equal(derived.supplierVerified, true);
  assert.equal(derived.marginApproved, true);
});

test("deriveOrderGateInputs: paymentConfirmed is true only once the order has actually moved past payment_pending", async () => {
  const pending = await deriveOrderGateInputs({ status: "payment_pending", positionen: [] });
  assert.equal(pending.paymentConfirmed, false);
  const paid = await deriveOrderGateInputs({ status: "paid", positionen: [] });
  assert.equal(paid.paymentConfirmed, true);
});
