#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runEastFamily } from "./build-census-v1-nj_arrest_no_conviction-set.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIELD_MAP = path.join(ROOT,
  "data/rcap-all50/overlays/census-v1/ny/ny-mrta-marijuana-set--official-pdf-fill/production-field-map.json");
const COURT_CONTROLS = new Map([
  ["Proper_ID", "1. Proper identification and notarization provided by applicant."],
  ["Charge_Sealed", "3. Eligible charge(s) is/are sealed in court case management system: ADBM, CRMS, CRIM, DCRIMS, SAMS, etc. pursuant to CPL 160.50(3)(k)."],
  ["Comment_Entered", "4. \"Application for Destruction Submitted\" comment entered in court case management system in appearance closest to date of signed application."],
]);

function protectCourtUseOnlyControls() {
  const fieldMap = JSON.parse(fs.readFileSync(FIELD_MAP, "utf8"));
  const repaired = [];
  const visit = (value) => {
    if (!value || typeof value !== "object") return;
    if (!Array.isArray(value) && COURT_CONTROLS.has(value.field)) {
      value.refusalClass = "court_prosecutor_clerk_or_agency_owned";
      value.blankTreatment = null;
      value.effectiveLabel = COURT_CONTROLS.get(value.field);
      value.reason = "This control is printed below the form's own COURT USE ONLY line and is completed by the court, not by the participant. Nothing is written into it and it is not a blank of this filing.";
      value.captionBasis = "read from the form's printed face: the control sits below the printed COURT USE ONLY rule";
      repaired.push(value.field);
    }
    for (const child of Object.values(value)) visit(child);
  };
  visit(fieldMap);
  if (repaired.length !== COURT_CONTROLS.size
      || repaired.some((field) => !COURT_CONTROLS.has(field))) {
    throw new Error(`NY MRTA court-use-only repair matched ${JSON.stringify(repaired)}`);
  }
  fs.writeFileSync(FIELD_MAP, `${JSON.stringify(fieldMap, null, 2)}\n`);
}

const argv = process.argv.slice(2);
if (!argv.includes("--repair-field-map-only")) await runEastFamily("ny_mrta_marijuana-set", argv);
protectCourtUseOnlyControls();
