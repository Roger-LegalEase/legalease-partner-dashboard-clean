#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import { writeOfficialPdfProductionQueue } from "./lib/rcap-official-pdf-production-queue.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const queue = writeOfficialPdfProductionQueue(root);

console.log(
  [
    "Generated official-PDF production queue:",
    `${queue.scope.jurisdictionCount} jurisdictions,`,
    `${queue.scope.trackCount} tracks,`,
    `${queue.scope.officialPdfComponentCount} components,`,
    `${queue.scope.distinctJurisdictionDocumentCount} document identities.`
  ].join(" ")
);
