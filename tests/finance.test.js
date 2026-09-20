import test from "node:test";
import assert from "node:assert/strict";
import { createFinance, financeTotals } from "../lib/master-finance.js";

test("finance totals calculate income, expense and net", () => {
  const totals=financeTotals([
    {kind:"income",amount:"100",status:"confirmed"},
    {kind:"expense",amount:25,status:"confirmed"},
    {kind:"income",amount:50,status:"pending"},
    {kind:"expense",amount:10,status:"cancelled"}
  ]);
  assert.deepEqual(totals,{income:150,expense:25,net:125});
});

test("finance totals ignore cancelled entries", () => {
  const totals=financeTotals([{kind:"income",amount:999,status:"cancelled"}]);
  assert.deepEqual(totals,{income:0,expense:0,net:0});
});

test("finance creation rejects invalid status", async () => {
  await assert.rejects(
    () => createFinance({kind:"expense",amount:10,category:"test",status:"invalid"}),
    /invalid finance status/
  );
});

test("finance creation rejects negative amounts", async () => {
  await assert.rejects(
    () => createFinance({kind:"expense",amount:-1,category:"test"}),
    /kind, amount and category are required/
  );
});
