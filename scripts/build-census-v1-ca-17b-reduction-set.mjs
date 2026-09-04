#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runWestFamilyCli } from "./build-census-v1-az_marijuana_expungement_arrest_no_charges-set.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIELD_MAP = path.join(ROOT,
  "data/rcap-all50/overlays/census-v1/ca/ca-17b-reduction-set--official-pdf-fill/production-field-map.json");

function disambiguateCaseDependentReductionRows() {
  const fieldMap = JSON.parse(fs.readFileSync(FIELD_MAP, "utf8"));
  const repaired = [];
  for (const refusal of fieldMap.refusals ?? []) {
    const field = refusal.fieldName ?? refusal.field ?? refusal.fieldId ?? "";
    const match = /ConvTable\[0\]\.Row([2-5])\[0\]\.(?:Reduce|Offense)\1\[0\]$/.exec(field);
    if (!match || refusal.determinedByTheCaseNotTheRoute !== true) continue;
    const suffix = ` — row ${match[1]} of the conviction table`;
    if (!String(refusal.effectiveLabel ?? "").endsWith(suffix)) refusal.effectiveLabel += suffix;
    repaired.push(field);
  }
  if (repaired.length !== 8) {
    throw new Error(`CA 17(b) row-label repair matched ${repaired.length}/8 fields`);
  }
  fs.writeFileSync(FIELD_MAP, `${JSON.stringify(fieldMap, null, 2)}\n`);
}

if (!process.argv.includes("--repair-field-map-only")) await runWestFamilyCli("ca-17b-reduction-set");
disambiguateCaseDependentReductionRows();
