#!/usr/bin/env node
/**
 * Derive the artifact name for a single-URL official-source acquisition.
 *
 * The batch path gets its name from the planner. The single-URL path has no
 * planner, so it gets it here — from the same module — and writes it to
 * $GITHUB_OUTPUT so that the acquire step's RCAP_ARTIFACT_NAME and the upload
 * step's artifact name are one string rather than two expressions that happen
 * to look alike.
 *
 * A dispatch whose jurisdiction and form number cannot produce a valid name is
 * refused here, before anything is downloaded, rather than at upload time.
 */
import fs from "node:fs";
import { sourceArtifactName } from "./lib/rcap-source-artifact-name.mjs";

const jurisdiction = (process.env.RCAP_JURISDICTION ?? "").trim();
const formNumber = (process.env.RCAP_FORM_NUMBER ?? "").trim();

const fail = (m) => { console.error(`FAIL artifact-name derivation — ${m}`); process.exit(1); };

if (!/^[A-Z]{2}$/.test(jurisdiction)) fail(`jurisdiction ${JSON.stringify(jurisdiction)} is not a two-letter code`);
if (formNumber === "") fail("no form number supplied");

const name = sourceArtifactName(jurisdiction, formNumber);
if (name === null) {
  fail(`no valid artifact name can be derived from jurisdiction ${JSON.stringify(jurisdiction)} and form number ${JSON.stringify(formNumber)}`);
}

console.log(`artifact name: ${name}`);
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `artifact_name=${name}\n`);
