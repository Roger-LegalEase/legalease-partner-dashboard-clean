#!/usr/bin/env node

import path from "node:path";

import { loadFactoryPlan, loadJob } from "./lib/rcap-factory/index.mjs";
import {
  generateOfficialPdfImplementationProof
} from "./lib/rcap-factory/official-pdf-proof.mjs";

const jobId = process.argv.slice(2).find((argument) => argument !== "--");

try {
  if (!jobId) {
    throw new Error(
      "Usage: node scripts/rcap-factory-generate-official-pdf-proof.mjs <jobId>"
    );
  }
  const rootDir = path.resolve(process.cwd());
  const plan = await loadFactoryPlan({ rootDir, root: rootDir });
  const loaded = await loadJob(jobId, { rootDir, root: rootDir });
  const job = loaded?.job ?? loaded;
  if (!job) throw new Error(`Unknown factory job: ${jobId}`);
  const result = generateOfficialPdfImplementationProof(job, {
    rootDir,
    authorityEdition: plan.authorityEdition,
    write: true
  });
  console.log(`RCAP official-PDF proof generated: ${result.proofPath}`);
  console.log(
    `Rendered fixtures: ${result.proof.totals.positiveRenderedFixtures}; ` +
      `pages: ${result.proof.totals.renderedPages}; ` +
      `expected no-document branches: ${result.proof.totals.expectedNoDocumentBranches}`
  );
} catch (error) {
  console.error(`RCAP official-PDF proof generation failed: ${error.message}`);
  process.exitCode = 1;
}
