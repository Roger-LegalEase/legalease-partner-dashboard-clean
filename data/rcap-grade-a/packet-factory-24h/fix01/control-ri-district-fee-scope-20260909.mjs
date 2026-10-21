#!/usr/bin/env node
/*
 * CONTROL for the FEE_AND_WAIVER repair on the two Rhode Island DISTRICT COURT
 * families (ri_first_offender_misdemeanor-set, ri_multiple_misdemeanors-set).
 *
 * It fires (exit 1) when the family's own committed records bind the Rhode
 * Island SUPERIOR COURT expungement-FAQ no-fee answer as THIS DISTRICT route's
 * filing-fee authority, or leave that fee grounding record without the RI-B-07
 * District scope limit.
 *
 * It measures the fee grounding record itself, not merely the file, so a scope
 * limit sitting elsewhere in the receipt does not satisfy it. It is deliberately
 * blind to the participant-facing prose, which an independent reader already
 * read at 300 dpi and passed.
 */
import fs from "node:fs";

const FAMILIES = [
  ["ri_first_offender_misdemeanor-set",
   "data/rcap-all50/overlays/census-v1/ri/ri-first-offender-misdemeanor-set--official-pdf-fill"],
  ["ri_multiple_misdemeanors-set",
   "data/rcap-all50/overlays/census-v1/ri/ri-multiple-misdemeanors-set--official-pdf-fill"]
];

const BINDS_AS_THIS_FAMILYS_FEE_AUTHORITY =
  /the fee source for this packet|the only fee authority this family binds/i;
const NAMES_DISTRICT = /district court/i;
const NAMES_RI_B_07 = /RI-B-07/;
const MENTIONS_100 = /\$\s?100\b/;
// A refusal of the repealed charge is not a revival of it. Fire only where $100
// appears WITHOUT a refusal in the same string.
const REFUSES_THE_100 = /do not reintroduce|not reintroduced|does not revive|repealed/i;

let fired = 0;
const report = [];
const fire = (m) => { fired += 1; report.push(`FIRED ${m}`); };

for (const [familyId, dir] of FAMILIES) {
  const receipt = JSON.parse(fs.readFileSync(`${dir}/source-receipt.json`, "utf8"));
  const approval = JSON.parse(fs.readFileSync(`${dir}/approval-request.json`, "utf8"));

  // 1. The fee grounding record must not bind the Superior answer as this family's authority,
  //    and must itself carry the District scope limit and RI-B-07.
  const feeRecords = (receipt.groundingRecords ?? []).filter((r) =>
    /FOUR-HOLDS/.test(r.recordId ?? "") || /expungement FAQ/i.test(JSON.stringify(r)));
  if (feeRecords.length === 0) fire(`${familyId} source-receipt.json: no fee grounding record found to measure`);
  for (const r of feeRecords) {
    const text = JSON.stringify(r);
    if (BINDS_AS_THIS_FAMILYS_FEE_AUTHORITY.test(text))
      fire(`${familyId} source-receipt.json groundingRecord ${r.recordId}: binds the Superior FAQ as this District family's fee authority`);
    if (!NAMES_DISTRICT.test(text) || !NAMES_RI_B_07.test(text))
      fire(`${familyId} source-receipt.json groundingRecord ${r.recordId}: fee grounding carries no RI-B-07 District scope limit`);
    for (const [k, v] of Object.entries(r)) {
      if (typeof v === "string" && MENTIONS_100.test(v) && !REFUSES_THE_100.test(v))
        fire(`${familyId} source-receipt.json groundingRecord ${r.recordId}.${k}: revives the repealed $100 charge`);
    }
  }

  // 2. The counsel question must not ask counsel to confirm the Superior answer FOR this District route.
  for (const q of (approval.counselQuestionsRaised ?? [])) {
    if (!/expungement FAQ/i.test(q)) continue;
    if (/Confirm that answer for this route/i.test(q))
      fire(`${familyId} approval-request.json counselQuestionsRaised: asks counsel to confirm the Superior no-fee answer for this District route`);
    if (!NAMES_RI_B_07.test(q))
      fire(`${familyId} approval-request.json counselQuestionsRaised: fee question does not name RI-B-07`);
  }
}

for (const line of report) console.log(line);
console.log(fired === 0
  ? "CONTROL PASSES: neither District family binds the Superior no-fee answer as its own fee authority; the RI-B-07 District scope limit is carried on the fee grounding itself."
  : `CONTROL FIRES: ${fired} finding(s).`);
process.exit(fired === 0 ? 0 : 1);
