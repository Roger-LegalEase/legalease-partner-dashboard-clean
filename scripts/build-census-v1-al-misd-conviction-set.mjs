#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildAlabamaFamily, assertRepairInvariants } from "./build-census-v1-al-diversion-set.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(ROOT, "data/rcap-all50/overlays/census-v1/al/al-misd-conviction-set--official-pdf-fill");

if (process.argv.includes("--check")) {
  assertRepairInvariants(out);
  console.log("al-misd-conviction-set: repair invariants PASS");
} else {
  await buildAlabamaFamily("al-misd-conviction-set");
  assertRepairInvariants(out);
}
