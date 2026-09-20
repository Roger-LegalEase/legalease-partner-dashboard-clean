#!/usr/bin/env node
import assert from "node:assert/strict";
import { isoDateInPrintedOrder, PRINTED_DATE_ORDERS } from "./rcap-official-form-finalize.mjs";

assert.deepEqual(Object.keys(PRINTED_DATE_ORDERS).sort(), ["day_month_year", "month_day_year"]);
assert.equal(isoDateInPrintedOrder("1991-04-17", "day_month_year", "DoB"), "17/04/1991");
assert.equal(isoDateInPrintedOrder("1991-04-17", "month_day_year", "DOB"), "04/17/1991");
assert.throws(
  () => isoDateInPrintedOrder("17/04/1991", "day_month_year", "DoB"),
  /is not an ISO date/
);
assert.throws(
  () => isoDateInPrintedOrder("1991-04-17", "year_month_day", "DoB"),
  /unknown printed date order/
);

console.log("OK printed date orders — both governed orders render ISO facts exactly and invalid inputs are refused.");
