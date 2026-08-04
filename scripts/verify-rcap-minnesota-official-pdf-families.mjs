#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import { runQueuedOfficialPdfFamilyVerifierCli } from "./lib/rcap-queued-official-pdf-family-verifier.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

await runQueuedOfficialPdfFamilyVerifierCli({
  root: ROOT,
  specPath: "data/record-clearing/production-factory/official-pdf-families/MN/scaffold-spec.json",
  argv: process.argv.slice(2)
});
