import assert from "node:assert/strict";
import fs from "node:fs";
import { ny16059GuidanceCondition, NY_16059_HELD_SOURCES } from "./lib/ny-16059-participant-guidance.mjs";
import { ny16059InstructionsForReview } from "./build-census-v1-nj_arrest_no_conviction-set.mjs";
const directory = "data/rcap-all50/overlays/census-v1/ny/ny-160-59-petition-set--official-pdf-fill";
const map = JSON.parse(fs.readFileSync(`${directory}/production-field-map.json`, "utf8"));
const receipt = JSON.parse(fs.readFileSync(`${directory}/source-receipt.json`, "utf8"));
const before = JSON.stringify(map), guide = ny16059InstructionsForReview(map);
let checks = 0;
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++; };
const matches = (actual, expected, message) => { assert.match(actual, expected, message); checks++; };
equal(guide, fs.readFileSync(`${directory}/participant-instructions.md`, "utf8"));
equal(JSON.stringify(map), before, "guidance never changes source geometry, fact mappings or field decisions");
// NY-SOURCE-CURRENT-02: retained source custody is not filing or delivery approval.
equal(guide.includes("The new binary and field mapping are retained for internal review; source-currency review and qualified approvals remain pending."),true,"held current source status");
equal(guide.includes("The new binary, field mapping, source-currency review and qualified approvals remain pending."),false,"no stale missing-source claim");
equal(Object.fromEntries(receipt.documents.map(row => [row.documentId, row.sha256])), NY_16059_HELD_SOURCES);
// Independent source clauses: current (08/2026) packet itemized instructions
// 2/3, statement item13 and service instructions; held July2024 COD form
// p2's 'any ... if known'. These do not approve missing source binaries.
for (const [document, field, condition] of [
  ["APPLICATION", "Applicant_AKA", /retained six-page form asks for any AKA/], ["PRO-SE-PACKET", "AKAs", /only if used/],
  ["APPLICATION", "NYSID", /retained six-page instruction does not say if known/], ["PRO-SE-PACKET", "NYSID", /if known/],
  ["APPLICATION", "Motorist_ID", /VTL crimes/],
  ["APPLICATION", "Release_Date_1", /only when.*incarceration/], ["APPLICATION", "Release_Date_2", /only when.*incarceration/],
  ["APPLICATION", "Court_Name", /future.*only if/], ["PRO-SE-PACKET", "Case Number 3", /only if.*later/],
  ["APPLICATION", "Court_Name_2", /second row only/], ["PRO-SE-PACKET", "Court Name 2", /only for an additional case/],
  ["COD-REQUEST", "DMVIDNumber", /any case identifiers if known/], ["COD-REQUEST", "NYSIDNumber", /Every listed identifier is not required/],
  ["COD-REQUEST", "ArrestDateRangeEnd", /range end applies only/], ["COD-REQUEST", "CourtAddress", /actual court address, not your home/],
  ["PRO-SE-PACKET", "Keep copies for your records", /after filing.*not.*purchase prerequisite/],
  ["PRO-SE-PACKET", "Complete the affidavit of service", /only when stamped in-person proof does not/],
  ["PRO-SE-PACKET", "Server Name", /person who actually serves/],
  ["PRO-SE-PACKET", "Service Date", /after service/],
  ["APPLICATION", "Date_of_Service", /actual server/],
  ["APPLICATION", "County_of", /actual venue.*Do not substitute/],
  ["APPLICATION", "Address_of_DA_2", /second printed line does not establish a second prosecutor/],
  ["COD-REQUEST", "AKA(s)", /record fact, not a signature/],
  ["PRO-SE-PACKET", "Serve the prosecutor", /actual server.*prosecutor is the recipient/],
]) matches(ny16059GuidanceCondition(`NY-CPL-160.59-${document}`, field), condition, field);
for (const doc of map.documents) for (const field of doc.fields.filter(row => ny16059GuidanceCondition(doc.documentId, row.field) !== null)) {
  const condition = ny16059GuidanceCondition(doc.documentId, field.field);
  equal(typeof condition,"string",`${field.field}: requirement remains owned`);
  equal(guide.includes(condition),true,`${field.field}: condition reaches actual guide`);
}
for (const field of ["Document 3","Document 10"]) matches(ny16059GuidanceCondition("NY-CPL-160.59-PRO-SE-PACKET",field),/only when actually included/);
for (const field of ["Attachment_4","Attachment_10"]) matches(ny16059GuidanceCondition("NY-CPL-160.59-APPLICATION",field),/Optional supporting evidence/);
for (const phrase of ["August 2026", "requires your own reasons", "written explanation", "45-day", "case is eligible and opposed", "$5 outside New York City", "$10 in the five boroughs", "actual server", "new binary", "source-currency review", "post-order", "Reuse an existing certificate", "denied or remains pending", "defendant provides photo ID", "written authorization", "pickup delivery preference", "permit combined proof unless service occurred on different dates or by different people"]) equal(guide.includes(phrase),true,phrase);
for (const old of ["Your application must be notarized", "If they oppose, the court holds a hearing", "no fee waiver is needed", "Nor is service", "The fee is no longer among them"]) equal(guide.includes(old),false,old);
matches(guide,/older forms use notarized affidavits/);
matches(guide,/August 2026 packet uses signed, dated affirmations/);
matches(guide,/server is "over 18 years of age"/);
matches(guide,/No signature, service event, notarization, certified-copy acquisition or upload becomes an intake or purchase gate/);
// Removing a legacy required flag cannot erase its source condition.
const noFlags=structuredClone(map); for(const doc of noFlags.documents) for(const field of doc.fields) delete field.blankTreatment;
equal(ny16059InstructionsForReview(noFlags),guide);
for (const mutate of [
  m=>{m.familyId="ny_mrta_marijuana-set";}, m=>{m.commercialAuthority=true;}, m=>{m.runtimeSelectable=true;},
  m=>{m.documents.pop();}, m=>{m.documents[0].fields.pop();}, m=>{m.documents[0].fields[0].field=m.documents[0].fields[1].field;},
  m=>{m.documents[0].fields.find(row=>row.field==="Applicant_AKA").field="unreviewed-required-field";},
]) { const changed=structuredClone(map);mutate(changed);assert.throws(()=>ny16059InstructionsForReview(changed));checks++; }
equal(ny16059GuidanceCondition("NJ-CN-10557","NYSID"),null,"no sibling source assumption");
console.log(JSON.stringify({status:"PASS",checks,scope:"guide/source conditions only; typed completeness, current form bytes and qualified acceptance pending"}));
