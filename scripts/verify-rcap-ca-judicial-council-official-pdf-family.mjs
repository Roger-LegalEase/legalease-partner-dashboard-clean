#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import { verifyOfficialPdfFamilyScaffold } from "./lib/rcap-official-pdf-family-scaffold.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const result = verifyOfficialPdfFamilyScaffold({
  root: ROOT,
  specPath:
    "data/record-clearing/production-factory/official-pdf-families/CA/scaffold-spec.json",
  requireMaterialized: process.argv.includes("--require-materialized")
});

console.log(
  [
    "CA Judicial Council official-PDF family verification passed.",
    `tracks=${result.tracks}`,
    `documents=${result.documents}`,
    `materialized=${result.ready.length}`,
    `pending=${result.pending.length}`
  ].join(" ")
);
