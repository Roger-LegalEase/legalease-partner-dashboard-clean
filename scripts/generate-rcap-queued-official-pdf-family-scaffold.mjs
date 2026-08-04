#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  writeQueuedOfficialPdfFamilyScaffold
} from "./lib/rcap-queued-official-pdf-family-scaffold.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const specIndex = process.argv.indexOf("--spec");

if (specIndex === -1 || !process.argv[specIndex + 1]) {
  throw new Error(
    "Usage: node scripts/generate-rcap-queued-official-pdf-family-scaffold.mjs --spec <repository-relative-spec.json>"
  );
}

const specPath = process.argv[specIndex + 1];
const unexpected = process.argv
  .slice(2)
  .filter(
    (argument, index, values) =>
      argument !== "--spec" &&
      values[index - 1] !== "--spec"
  );
if (unexpected.length > 0) {
  throw new Error(`Unsupported arguments: ${unexpected.join(", ")}`);
}

const result = writeQueuedOfficialPdfFamilyScaffold({
  root: ROOT,
  specPath
});
process.stdout.write(
  `Generated ${result.spec.familyId}: ${result.tracks.length} tracks, ${result.components.length} components, ${result.documents.length} documents.\n`
);
