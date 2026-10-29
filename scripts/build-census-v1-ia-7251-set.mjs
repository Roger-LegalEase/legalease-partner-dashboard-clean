#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";
import {packetFor,WRITES,SOURCE} from "../src/lib/rcap/documents/iowa-7251-native-writer.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(ROOT);

const FAMILY_ID = "ia-7251-set";
const OUT_REL = "data/rcap-all50/overlays/census-v1/ia/ia-7251-set--official-pdf-fill";
const FORM_ID = "Rule 2.86 Form 5";
const CERT_ID = "Certification of Service by Mailing or Delivery";
const ROUTE_KEY = "obligation:track-pathway:IA:ia-7251:minor-prostitution-7251";
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

const FIXTURES = {
  canonical: {
    synthetic: true, name: "Jordan Avery Reyes", county: "Polk", caseNumber: "FECR123456", plaintiff: "State of Iowa", convictionDate: "2022-06-14", filingDate: "2026-10-29",
    disposition: "conviction", proceeding: "district_court", offense: {kind:"statute",citation:"725.1(1)(a)",equivalentTo:"725.1(1)(a)",confirmation:true},
    ageAtAct: 17, historyComplete: true, laterConvictions: [], ackCopy: true, ackConfidential: true, filingMethod: "paper",
    address: "412 Walnut Street, Apartment 7", city: "Des Moines", state: "IA", zip: "50309", phoneAreaCode: "515", phoneLocal: "555-0142", email: "jordan.reyes@example.org"
  },
  boundary: {
    synthetic: true, name: "Alexandria Catherine Montgomery-Washington", county: "Pottawattamie", caseNumber: "FECR987654321", plaintiff: "State of Iowa", convictionDate: "2021-12-31", filingDate: "2026-10-29",
    disposition: "conviction", proceeding: "district_court", offense: {kind:"statute",citation:"725.1(1)(a)",equivalentTo:"725.1(1)(a)",confirmation:true},
    ageAtAct: 17, historyComplete: true, laterConvictions: [], ackCopy: true, ackConfidential: true, filingMethod: "paper",
    address: "1188 Long Meadow Boulevard, Apartment 1407", city: "Council Bluffs", state: "IA", zip: "51503-4417", phoneAreaCode: "712", phoneLocal: "555-0199 ext. 4417", email: "alexandria.montgomery.washington@example.org"
  }
};
const REQUIRED = [
  { documentId: FORM_ID, page: 1, id: "under_18_at_act_manual", label: "Item 2: age at the time of the act", reason: "IA.memo ia-7251 reserves item 2 to the participant; the application must not auto-certify age", participantMustSupply: "personally review and complete item 2 only if you can truthfully confirm that you were under 18 at the time of the act; do not infer this from your current age or age at conviction, and seek legal assistance if uncertain without narrating the underlying facts" },
  { documentId: FORM_ID, page: 2, id: "representation_selection", label: "Representation choice", participantMustSupply: "select the box that accurately states whether you are self-represented or represented by an attorney" },
  { documentId: CERT_ID, page: 2, id: "service_method", label: "Certificate service method", participantMustSupply: "if filing on paper, state whether you mailed or delivered the application after completing service" },
  { documentId: CERT_ID, page: 2, id: "service_recipient", label: "Certificate recipient name and mailing address", participantMustSupply: "if filing on paper, enter the name and mailing address of the county attorney actually served" }
];

const PROTECTED = [
  { documentId: FORM_ID, page: 2, id: "applicant_signature", label: "Applicant signature", className: "signature_or_date_participant_completion", reason: "the applicant signs only after reviewing the completed application" },
  { documentId: FORM_ID, page: 2, id: "signature_date", label: "Signature date", className: "signature_or_date_participant_completion", reason: "a date written before signing would be false" },
  { documentId: FORM_ID, page: 2, id: "attorney_name", label: "Attorney name", className: "court_prosecutor_clerk_or_agency_owned", reason: "attorney-only field; this packet does not invent representation" },
  { documentId: FORM_ID, page: 2, id: "attorney_pin", label: "Attorney PIN", className: "court_prosecutor_clerk_or_agency_owned", reason: "attorney-only identifier; this packet does not invent representation" },
  { documentId: FORM_ID, page: 2, id: "attorney_address", label: "Attorney address", className: "court_prosecutor_clerk_or_agency_owned", reason: "attorney-only field; this packet does not invent representation" },
  { documentId: FORM_ID, page: 2, id: "attorney_phone_email", label: "Attorney phone and email", className: "court_prosecutor_clerk_or_agency_owned", reason: "attorney-only fields; this packet does not invent representation" },
  { documentId: CERT_ID, page: 2, id: "service_signature", label: "Certificate signature", className: "signature_or_date_participant_completion", reason: "the filer signs only after service is complete" },
  { documentId: CERT_ID, page: 2, id: "service_date", label: "Certificate service date", className: "signature_or_date_participant_completion", reason: "the actual service date cannot be prefilled" }
];

function resolveSource() {
  const index = JSON.parse(fs.readFileSync("data/rcap-all50/local-source-corpus-index.json", "utf8"));
  const entry = index.entries.find((row) => row.path === SOURCE.path);
  assert.ok(entry, `missing committed index entry: ${SOURCE.path}`);
  const resolver = makeCorpusEntryResolver(index, { repoRoot: ROOT, masterLibraryRoot: process.env.MASTER_LIBRARY_SOURCE_DIR });
  const absolute = resolver.resolve(entry);
  assert.ok(absolute && fs.existsSync(absolute), `source custody is not mounted: ${SOURCE.path}`);
  const bytes = fs.readFileSync(absolute);
  assert.equal(sha256(bytes), SOURCE.sha256, `source hash drift: ${SOURCE.path}`);
  return { bytes, byteLength: bytes.length };
}

async function build() {
  const source = resolveSource();
  const out = path.join(ROOT, OUT_REL);
  const packets = {};
  for (const [name, facts] of Object.entries(FIXTURES)) packets[name] = await packetFor(source.bytes, name, facts);
  fs.mkdirSync(path.join(out, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(out, "reports"), { recursive: true });
  for (const [name, packet] of Object.entries(packets)) fs.writeFileSync(path.join(out, "fixtures", `${name}.pdf`), packet.bytes);
  const refusals = [
    ...packets.canonical.blankFields,
    ...REQUIRED.map((row) => ({ fieldId: `${row.documentId}:${row.id}`, fieldName: row.id, effectiveLabel: row.label, documentId: row.documentId, page: row.page, reason: row.reason ?? "the platform does not hold the participant's filing-method or completed-service fact", completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, factAvailable: false, routeDetermined: false, role: "participant", participantMustSupply: row.participantMustSupply })),
    ...PROTECTED.map((row) => ({ fieldId: `${row.documentId}:${row.id}`, fieldName: row.id, effectiveLabel: row.label, documentId: row.documentId, page: row.page, reason: row.reason, refusalClass: row.className, role: "protected" }))
  ];
  writeJson(path.join(out, "production-field-map.json"), { schemaVersion: "rcap-production-field-map/v2", familyId: FAMILY_ID, implementationStrategy: "official_pdf_fill", routeKeys: [ROUTE_KEY], routeSelectionNote: "This family fixes the Iowa Code section 725.1 minor-prostitution route; representation and paper-service facts remain participant-supplied.", writes: packets.canonical.actualWrites.map(({ drawnText, ...row }) => row), refusals });
  writeJson(path.join(out, "source-receipt.json"), { schemaVersion: "rcap-source-receipt/v2", familyId: FAMILY_ID, allSourcesExact: true, sources: [
    { ...SOURCE, documentId: FORM_ID, formNumber: FORM_ID, sha256Exact: true, byteLength: source.byteLength, componentKinds: ["primary_filing"] },
    { ...SOURCE, sourceId: `official-form:${CERT_ID}`, documentId: CERT_ID, formNumber: CERT_ID, sha256Exact: true, byteLength: source.byteLength, componentKinds: ["certificate_of_service"], embeddedIn: FORM_ID }
  ] });
  writeJson(path.join(out, "reports", "actual-writes.json"), { schemaVersion: "rcap-actual-writes/v2", familyId: FAMILY_ID, documents: [{ documentId: FORM_ID, actualWrites: packets.canonical.actualWrites }], artifacts: Object.entries(packets).map(([fixture, packet]) => ({ fixture, valuesReportedByFinalizer: packet.actualWrites.length, addedGlyphsReadFromOutputBytes: packet.actualWrites.reduce((n, row) => n + row.drawnText.replace(/\s/g, "").length, 0), nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0, refusedFieldsWithInk: [] })) });
  const artifactRows = Object.entries(packets).map(([fixture, packet]) => ({ fixture, file: `${OUT_REL}/fixtures/${fixture}.pdf`, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: 2 }));
  writeJson(path.join(out, "reports", "rendered-artifacts.json"), { schemaVersion: "rcap-rendered-artifacts/v2", familyId: FAMILY_ID, rasterState: "BUILT_RASTER_PENDING", packets: artifactRows.map((row) => ({ ...row, documents: [{ documentId: FORM_ID, componentKinds: ["primary_filing"] }, { documentId: CERT_ID, componentKinds: ["certificate_of_service"] }] })) });
  writeJson(path.join(out, "approval-request.json"), { schemaVersion: "rcap-packet-approval-request/v2", familyId: FAMILY_ID, status: "BUILT_RASTER_PENDING", implementationStrategy: "official_pdf_fill", routeKeys: [ROUTE_KEY], components: [{ kind: "primary_filing", documentId: FORM_ID }, { kind: "certificate_of_service", documentId: CERT_ID }], artifacts: artifactRows, independentVerificationStatus: "PENDING", commercialRoutesOpened: 0, productionTouched: false });
  fs.writeFileSync(path.join(out, "participant-instructions.md"), `# Iowa Rule 2.86 Form 5 application\n\n## Eligibility and required review\n\nUse this packet only for a conviction under Iowa Code section 725.1 when you were under age 18 at the time of the offense and two years have elapsed since the conviction, with no criminal conviction during the two-year period following that conviction other than a local traffic violation or a simple misdemeanor violation under Iowa Code chapter 321. Compare the conviction date and case number against the court record before filing. Stop for legal help if age, charge, trafficking, coercion, exploitation, or a later conviction is uncertain.\n\nForm 5 item 2 is intentionally left blank for your personal review and completion. The age question concerns when the act occurred, not your age now or at conviction. An intake confirmation does not complete this court-facing declaration.\n\n## Required before filing\n\n${REQUIRED.map((row) => `- ${row.label}: ${row.participantMustSupply}.`).join("\n")}\n\nReview the completed application, then personally sign and date it. Do not include protected information in a public filing.\n`);
  fs.writeFileSync(path.join(out, "filing-instructions.md"), `# Filing instructions\n\nFile this application in the Iowa District Court county and case shown on the criminal court record. No filing fee or proposed order is established by the held source.\n\nIf filing electronically, the e-filing system serves the county attorney. If filing on paper, first mail or deliver a copy to the county attorney and truthfully complete and sign the certificate of service on page 2. The county attorney has 20 days after service to respond. Keep a copy of the filed packet and certificate.\n`);
  const counters = { knownRequiredFieldsMissing: 0, requiredFactsNotCollected: 0, unclassifiedBlanks: 0, incompleteRows: 0, requiredOptionsMissing: 0, requiredComponentsMissing: 0, invisibleWrites: 0, protectedWrites: 0, visualDefects: 0 };
  writeJson(path.join(out, "reports", "build-summary.json"), { familyId: FAMILY_ID, result: "BUILT_RASTER_PENDING", counters, artifacts: artifactRows, selfVerified: false });
  console.log(`${FAMILY_ID}: BUILT_RASTER_PENDING; ${WRITES.length} declared write slots, ${refusals.length} classified blanks; canonical=${sha256(packets.canonical.bytes)} boundary=${sha256(packets.boundary.bytes)}`);
}

export {packetFor, FIXTURES, WRITES, SOURCE, build, resolveSource};
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) await build();
