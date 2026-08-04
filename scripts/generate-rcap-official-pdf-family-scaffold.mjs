#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import { writeOfficialPdfFamilyScaffold } from "./lib/rcap-official-pdf-family-scaffold.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const specIndex = process.argv.indexOf("--spec");
if (specIndex === -1 || !process.argv[specIndex + 1]) {
  throw new Error(
    "Usage: node scripts/generate-rcap-official-pdf-family-scaffold.mjs --spec <repository-relative-spec.json>"
  );
}

const specPath = process.argv[specIndex + 1];
const result = writeOfficialPdfFamilyScaffold({ root: ROOT, specPath });
console.log(
  `Generated ${result.spec.familyId}: ${result.spec.trackIds.length} tracks, ${result.documents.length} exact sources.`
);
