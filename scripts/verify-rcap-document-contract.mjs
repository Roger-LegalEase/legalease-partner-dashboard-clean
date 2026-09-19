#!/usr/bin/env node
// The explicit document contract, enforced.
//
//   node scripts/verify-rcap-document-contract.mjs
//
// Four invariants, each mutation-tested in the same run so a green result is a
// statement about what the contract CATCHES and not only about what it permits:
//
//   1. a document the authority assigns to a court, prosecutor or agency cannot
//      be classed as a participant document;
//   2. a proposed order is signed by the judge, never the participant;
//   3. an official-form-controlled component cannot be classed as not-a-filing,
//      which is how a required form falls through to custom rendering;
//   4. a court-facing component with an unresolved required attribute is not
//      releasable, and the fulfillment boundary refuses to bind it.
//
// This adds no audit, no ledger and no inventory. It exercises the contract the
// specifications now carry, and nothing else.

import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contract = await import(path.join(rootDir, "src/lib/rcap/grade-a/document-contract.ts"));
const { documentContractFor, documentContractRefusals, specificationDocumentRefusals, UNRESOLVED } = contract;

const failures = [];
let checks = 0;
const check = (condition, message) => {
  checks += 1;
  if (!condition) failures.push(message);
};

const SPEC_DIR = path.join(rootDir, "data/record-clearing/packet-specifications");
const specs = fs.readdirSync(SPEC_DIR).filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(fs.readFileSync(path.join(SPEC_DIR, f), "utf8")));
check(specs.length >= 19, `expected at least 19 packet specifications, found ${specs.length}`);

// --- every specification carries a contract on every document ----------------

let documents = 0;
let courtFacing = 0;
let releasable = 0;
const unresolvedByAttribute = {};
for (const spec of specs) {
  for (const document of spec.documents ?? []) {
    documents += 1;
    check(
      document.documentContract !== undefined,
      `${spec.specificationId}/${document.documentId}: carries no document contract`
    );
    const resolved = documentContractFor(document);
    if (contract.isCourtFacing(resolved)) courtFacing += 1;
    const refusals = documentContractRefusals(document.documentId, resolved);
    if (refusals.length === 0) releasable += 1;
    for (const [attribute, value] of Object.entries(resolved)) {
      if (value === UNRESOLVED) {
        unresolvedByAttribute[attribute] = (unresolvedByAttribute[attribute] ?? 0) + 1;
        check(
          typeof resolved.unresolvedReasons?.[attribute] === "string",
          `${spec.specificationId}/${document.documentId}: ${attribute} is unresolved with no reason recorded`
        );
      }
    }
    // A signer is never silently the participant on an order.
    if (resolved.instrumentClass === "proposed_order") {
      check(
        resolved.signer === "judge",
        `${spec.specificationId}/${document.documentId}: proposed order signed by ${resolved.signer}`
      );
    }
  }
}
check(documents >= 70, `expected at least 70 documents across the specifications, found ${documents}`);
check(courtFacing > 0, "no court-facing component was classified; the contract is not being applied");

// --- the four invariants, each proven by a mutation --------------------------

const base = { documentId: "probe", role: "primary_filing", outputStrategy: "custom_pleading", requirement: "required" };
const complete = {
  instrumentClass: "participant_filing", preparedBy: "participant", signer: "participant",
  recipient: "court", formApplicability: "custom_document_permitted", caseMode: "existing_case",
  executionType: "verified", serviceTreatment: "participant_serves",
  orderTreatment: "no_proposed_order", privacyTreatment: "masked_on_public_filing", localVariant: null
};
check(
  documentContractRefusals("probe", documentContractFor({ ...base, documentContract: complete })).length === 0,
  "a fully specified participant filing must still be releasable"
);

// 1. another actor's document cannot be a participant document
for (const preparer of ["court", "prosecutor", "agency"]) {
  const refusals = documentContractRefusals("probe", documentContractFor({
    ...base, documentContract: { ...complete, preparedBy: preparer }
  }));
  check(
    refusals.some((r) => r.includes(`prepared by the ${preparer}`)),
    `a document prepared by the ${preparer} but classed participant_filing must refuse`
  );
}

// 2. a proposed order signed by anyone but the judge
for (const signer of ["participant", "clerk", "prosecutor"]) {
  const refusals = documentContractRefusals("probe", documentContractFor({
    ...base, role: "proposed_order", documentContract: { ...complete, instrumentClass: "proposed_order", signer }
  }));
  check(
    refusals.some((r) => r.includes("the judge signs it")),
    `a proposed order signed by the ${signer} must refuse`
  );
}

// 3. an official-form component must not be classed as not-a-filing
const formFallthrough = documentContractFor({
  ...base, outputStrategy: "official_pdf_fill", officialFormId: "JD-CR-202",
  documentContract: { ...complete, formApplicability: undefined }
});
check(
  formFallthrough.formApplicability === "official_form_required",
  "an official_pdf_fill component must derive official_form_required, not fall through to custom"
);

// 4. an unresolved required attribute is not releasable
for (const attribute of ["preparedBy", "signer", "recipient", "caseMode", "executionType", "privacyTreatment"]) {
  const refusals = documentContractRefusals("probe", documentContractFor({
    ...base,
    documentContract: { ...complete, [attribute]: UNRESOLVED, unresolvedReasons: { [attribute]: "probe" } }
  }));
  check(
    refusals.some((r) => r.includes(`${attribute} is unresolved`)),
    `an unresolved ${attribute} on a participant filing must refuse`
  );
}
// ...and guidance is exempt, because it is not filed.
check(
  documentContractRefusals("probe", documentContractFor({
    ...base, role: "filing_instructions",
    documentContract: { ...complete, instrumentClass: "participant_guidance", executionType: UNRESOLVED }
  })).length === 0,
  "a participant guidance page must not be refused for an unresolved execution type"
);

// --- the fulfillment boundary refuses an incomplete specification ------------

const incompleteSpec = {
  documents: [{ ...base, documentContract: { ...complete, executionType: UNRESOLVED, unresolvedReasons: { executionType: "probe" } } }]
};
check(
  specificationDocumentRefusals(incompleteSpec).length > 0,
  "a specification with an unresolved required attribute must not bind at the fulfillment boundary"
);
check(
  specificationDocumentRefusals({ documents: [{ ...base, documentContract: complete }] }).length === 0,
  "a fully specified specification must bind"
);

if (failures.length > 0) {
  console.error(`verify-rcap-document-contract FAILED: ${failures.length}/${checks} checks red`);
  for (const failure of failures.slice(0, 25)) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`verify-rcap-document-contract passed: ${checks} checks`);
console.log(`  documents ${documents}; court-facing ${courtFacing}; releasable now ${releasable}`);
console.log("  unresolved attributes awaiting per-route remediation:");
for (const [attribute, count] of Object.entries(unresolvedByAttribute).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${String(count).padStart(3)}  ${attribute}`);
}
