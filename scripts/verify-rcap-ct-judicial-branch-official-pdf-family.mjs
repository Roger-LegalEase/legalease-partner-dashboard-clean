#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import { verifyOfficialPdfFamilyScaffold } from "./lib/rcap-official-pdf-family-scaffold.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const result = verifyOfficialPdfFamilyScaffold({
  root,
  specPath:
    "data/record-clearing/production-factory/official-pdf-families/CT/scaffold-spec.json",
  requireMaterialized: process.argv.includes("--require-materialized")
});

console.log(
  [
    "CT Judicial Branch official-PDF family verification passed.",
    `tracks=${result.tracks}`,
    `documents=${result.documents}`,
    `materialized=${result.ready.length}`,
    `pending=${result.pending.length}`
  ].join(" ")
);
