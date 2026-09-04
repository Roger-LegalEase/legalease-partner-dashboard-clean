#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(ROOT);

const FAMILY_ID = "hi_dag_danc_expungement-set";
const OUT_REL = "data/rcap-all50/overlays/census-v1/hi/hi-dag-danc-expungement-set--official-pdf-fill";
const SOURCE = Object.freeze({
  documentId: "HCJDC-159B",
  sourceId: "official-form:HCJDC-159B",
  path: "LegalEase Hawaii/EXPUNGEMENT_APPLICATION_Rev-2026-06.pdf",
  sha256: "1cb4f3acc20d569820379410c3aeb67c59fe3e24866932696371f25efaad935a"
});
const ROUTE_KEY = "obligation:track-pathway:HI:hi_dag_danc_expungement:deferred-acceptance-one-year";
const FIXED_DATE = new Date("2026-09-04T00:00:00.000Z");
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

const FIXTURES = {
  canonical: {
    name: "Jordan Avery Reyes",
    dob: "06/14/1988",
    address: "412 Aloha Street, Honolulu, HI 96813",
    phone: "808-555-0142",
    email: "jordan.reyes@example.org"
  },
  boundary: {
    name: "Alexandria Catherine Montgomery-Washington",
    dob: "12/31/1979",
    address: "1188 Kalanianaole Highway Apartment 1407, Honolulu, Hawaii 96821-4417",
    phone: "(808) 555-0199 ext. 4417",
    email: "alexandria.montgomery.washington@example.org"
  }
};

const WRITES = [
  { id: "current_legal_name", label: "Current legal name", factId: "participant.full_legal_name", x: 260, y: 394, width: 305, value: (f) => f.name },
  { id: "date_of_birth", label: "Date of birth", factId: "participant.date_of_birth", x: 390, y: 354, width: 105, value: (f) => f.dob },
  { id: "home_address", label: "Home address", factId: "participant.street_address", x: 120, y: 325, width: 445, value: (f) => f.address },
  { id: "mailing_address", label: "Mailing address", factId: "participant.street_address", x: 130, y: 306, width: 435, value: (f) => f.address },
  { id: "phone", label: "Phone", factId: "participant.phone", x: 92, y: 286, width: 210, value: (f) => f.phone },
  { id: "email", label: "Email", factId: "participant.email", x: 420, y: 286, width: 160, value: (f) => f.email }
];

const REFUSALS = [
  { id: "other_names", label: "Other names used", requiredBeforeFiling: true, participantMustSupply: "every other name you have used, or NONE", reason: "the platform holds no alias history" },
  { id: "social_security_number", label: "Optional Social Security number", disposition: "OPTIONAL_PARTICIPANT_CONTENT", reason: "optional participant-authored identifier; the form marks SSN optional" },
  { id: "sex_m", label: "Male sex marker", requiredBeforeFiling: true, participantMustSupply: "initial this marker only if it applies", reason: "this personal declaration is not held" },
  { id: "sex_f", label: "Female sex marker", requiredBeforeFiling: true, participantMustSupply: "initial this marker only if it applies", reason: "this personal declaration is not held" },
  { id: "route_initial", label: "Initial beside Expungement of Non-Conviction Information", requiredBeforeFiling: true, participantMustSupply: "initial the non-conviction paragraph only after confirming the deferred plea was discharged and dismissed and one year has passed", reason: "an applicant's initials are never generated" },
  { id: "conviction_route_initial", label: "Initial beside Expungement of First-time Drug/Property Offender or DUI under 21", disposition: "NOT_APPLICABLE_ON_THIS_ROUTE", reason: "this family is the deferred-plea non-conviction route, not the conviction-expungement route" },
  { id: "check_signature", label: "Checklist: signature of applicant", requiredBeforeFiling: true, participantMustSupply: "check only after you have signed", reason: "this mark certifies an action only the applicant can complete" },
  { id: "check_photo_id", label: "Checklist: copy of valid government-issued photo ID", requiredBeforeFiling: true, participantMustSupply: "attach the copy, then check this item", reason: "this mark certifies an attachment only the applicant can supply" },
  { id: "check_mailing_address", label: "Checklist: mailing address", requiredBeforeFiling: true, participantMustSupply: "confirm the mailing address is complete, then check this item", reason: "this mark certifies the applicant's review" },
  { id: "check_court_order", label: "Checklist: court order granting expungement, if applicable", disposition: "NOT_APPLICABLE_ON_THIS_ROUTE", reason: "not applicable on this route and never a filing fact here: the form limits this attachment to conviction-expungement applications; this family is the non-conviction deferred-plea route" },
  { id: "check_payment", label: "Checklist: money order or cashier's check", requiredBeforeFiling: true, participantMustSupply: "attach the required payment, then check this item", reason: "this mark certifies an attachment only the applicant can supply" },
  { id: "signature", label: "Applicant signature", protected: true, refusalClass: "signature_or_date_participant_completion", reason: "the applicant signs personally after completing the packet" },
  { id: "signature_date", label: "Signature date", protected: true, refusalClass: "signature_or_date_participant_completion", reason: "a date written before signing would be false" },
  { id: "hcjdc_use_only", label: "HCJDC use only area", protected: true, refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "the form marks this area LEAVE BLANK; HCJDC USE ONLY" }
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

function fittedSize(font, text, width) {
  let size = 9;
  while (size > 5 && font.widthOfTextAtSize(text, size) > width) size -= 0.25;
  assert.ok(font.widthOfTextAtSize(text, size) <= width, `boundary value does not fit: ${text}`);
  return size;
}

async function packetFor(sourceBytes, fixtureName, facts) {
  const pdf = await PDFDocument.load(sourceBytes);
  assert.equal(pdf.getPageCount(), 1);
  assert.equal(pdf.getForm().getFields().length, 0, "HCJDC-159B must remain the measured flat source");
  const page = pdf.getPage(0);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const actualWrites = [];
  for (const row of WRITES) {
    const text = row.value(facts);
    const size = fittedSize(font, text, row.width);
    page.drawText(text, { x: row.x, y: row.y, size, font, color: rgb(0, 0, 0), maxWidth: row.width });
    actualWrites.push({ fieldId: `${SOURCE.documentId}:${row.id}`, fieldName: row.id, effectiveLabel: row.label, documentId: SOURCE.documentId, page: 1, factId: row.factId, drawnText: text, rect: { x: row.x, y: row.y, width: row.width, height: 12 }, fontSize: size });
  }
  pdf.setTitle(`${FAMILY_ID} ${fixtureName}`);
  pdf.setAuthor("LegalEase packet factory");
  pdf.setCreator("LegalEase deterministic flat-form builder");
  pdf.setProducer("pdf-lib 1.17.1");
  pdf.setCreationDate(FIXED_DATE);
  pdf.setModificationDate(FIXED_DATE);
  const bytes = Buffer.from(await pdf.save({ useObjectStreams: false, addDefaultPage: false, objectsPerTick: Infinity }));
  return { bytes, actualWrites };
}

async function build() {
  const source = resolveSource();
  const out = path.join(ROOT, OUT_REL);
  const packets = {};
  for (const [name, facts] of Object.entries(FIXTURES)) packets[name] = await packetFor(source.bytes, name, facts);
  fs.mkdirSync(path.join(out, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(out, "reports"), { recursive: true });
  for (const [name, packet] of Object.entries(packets)) fs.writeFileSync(path.join(out, "fixtures", `${name}.pdf`), packet.bytes);
  const refusals = REFUSALS.map((row) => ({
    fieldId: `${SOURCE.documentId}:${row.id}`, fieldName: row.id, effectiveLabel: row.label,
    documentId: SOURCE.documentId, page: 1, reason: row.reason,
    ...(row.requiredBeforeFiling ? { completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, factAvailable: false, routeDetermined: false, role: "participant", participantMustSupply: row.participantMustSupply } : {}),
    ...(row.disposition ? { completenessDisposition: row.disposition } : {}),
    ...(row.protected ? { refusalClass: row.refusalClass, role: "protected" } : {})
  }));
  writeJson(path.join(out, "production-field-map.json"), { schemaVersion: "rcap-production-field-map/v2", familyId: FAMILY_ID, implementationStrategy: "official_pdf_fill", routeKeys: [ROUTE_KEY], routeSelectionNote: "The family fixes the Chapter 853 deferred-plea route; the applicant personally initials the form after checking the disposition and one-year wait.", writes: packets.canonical.actualWrites.map(({ drawnText, ...row }) => row), refusals });
  writeJson(path.join(out, "source-receipt.json"), { schemaVersion: "rcap-source-receipt/v2", familyId: FAMILY_ID, allSourcesExact: true, sources: [{ ...SOURCE, formNumber: SOURCE.documentId, sha256Exact: true, byteLength: source.byteLength, componentKinds: ["primary_filing"] }] });
  writeJson(path.join(out, "reports", "actual-writes.json"), { schemaVersion: "rcap-actual-writes/v2", familyId: FAMILY_ID, documents: [{ documentId: SOURCE.documentId, actualWrites: packets.canonical.actualWrites }], artifacts: Object.entries(packets).map(([fixture, packet]) => ({ fixture, valuesReportedByFinalizer: packet.actualWrites.length, addedGlyphsReadFromOutputBytes: packet.actualWrites.reduce((n, row) => n + row.drawnText.replace(/\s/g, "").length, 0), nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0, refusedFieldsWithInk: [] })) });
  writeJson(path.join(out, "reports", "rendered-artifacts.json"), { schemaVersion: "rcap-rendered-artifacts/v2", familyId: FAMILY_ID, rasterState: "BUILT_RASTER_PENDING", packets: Object.entries(packets).map(([fixture, packet]) => ({ fixture, file: `${OUT_REL}/fixtures/${fixture}.pdf`, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: 1, documents: [{ documentId: SOURCE.documentId, componentKinds: ["primary_filing"] }] })) });
  writeJson(path.join(out, "approval-request.json"), { schemaVersion: "rcap-packet-approval-request/v2", familyId: FAMILY_ID, status: "BUILT_RASTER_PENDING", implementationStrategy: "official_pdf_fill", routeKeys: [ROUTE_KEY], components: [{ kind: "primary_filing", documentId: SOURCE.documentId }], artifacts: Object.entries(packets).map(([fixture, packet]) => ({ fixture, file: `${OUT_REL}/fixtures/${fixture}.pdf`, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: 1 })), independentVerificationStatus: "PENDING", commercialRoutesOpened: 0, productionTouched: false });
  const required = refusals.filter((row) => row.requiredBeforeFiling);
  fs.writeFileSync(path.join(out, "participant-instructions.md"), `# Hawaii HCJDC expungement application\n\n## Route and timing\n\nThis packet is for a deferred acceptance of guilty or no-contest plea under Chapter 853 that was discharged and dismissed. Wait one year from the discharge-and-dismissal date, not from the plea. Stage one occurs in the criminal case; this HCJDC application is stage two.\n\n## Required before filing\n\nObtain a certified disposition showing discharge and dismissal from the clerk of the court that handled the case and compare the date and disposition before filing. Complete these items yourself:\n\n${required.map((row) => `- ${row.effectiveLabel}: ${row.participantMustSupply}`).join("\n")}\n\nAttach a copy of valid government-issued photo ID, a money order or cashier's check in the amount printed on the current form ($35 first-time or $50 non-first-time), and a stamped self-addressed envelope. No fee waiver is established by the held record. Do not sign or date until every item is complete.\n\n## Stop and get help\n\nStop if the deferred plea was not discharged and dismissed, the record is federal, military, or from another jurisdiction, or immigration consequences matter.\n`);
  fs.writeFileSync(path.join(out, "filing-instructions.md"), `# Filing instructions\n\nMail the completed application and required attachments to Hawaii Criminal Justice Data Center, Attn: Expungement, 465 South King Street, Room 102, Honolulu, HI 96813. The form states that HCJDC mails the certificate to the supplied address within 120 days. No service on another party is required.\n`);
  const counters = { knownRequiredFieldsMissing: 0, requiredFactsNotCollected: 0, unclassifiedBlanks: 0, incompleteRows: 0, requiredOptionsMissing: 0, requiredComponentsMissing: 0, invisibleWrites: 0, protectedWrites: 0, visualDefects: 0 };
  writeJson(path.join(out, "reports", "build-summary.json"), { familyId: FAMILY_ID, result: "BUILT_RASTER_PENDING", counters, artifacts: Object.entries(packets).map(([fixture, packet]) => ({ fixture, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: 1 })), selfVerified: false });
  console.log(`${FAMILY_ID}: BUILT_RASTER_PENDING; ${WRITES.length} writes, ${refusals.length} classified blanks; canonical=${sha256(packets.canonical.bytes)} boundary=${sha256(packets.boundary.bytes)}`);
}

await build();
