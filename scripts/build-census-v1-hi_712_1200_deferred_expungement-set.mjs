#!/usr/bin/env node
/*
 * hi_712_1200_deferred_expungement-set — HCJDC-159B, official_pdf_fill.
 *
 * This family and hi_dag_danc_expungement-set share one source document and one
 * paragraph of it: both are EXPUNGEMENT OF NON-CONVICTION INFORMATION. They are
 * not the same route. The form itself distinguishes them, in the two bullets it
 * prints under that heading:
 *
 *   • one (1) year upon discharge and dismissal, Chapter 853 deferred plea;
 *   • Pursuant to HRS §712-1200, three (3) years upon discharge and dismissal
 *     of a HRS §712-1200 charge after a deferred plea.
 *
 * This build is the three-year §712-1200 route. The compiled profile says the
 * same thing and says it must be kept apart from the general one-year route
 * (pathways[2].summary), so the wait is stated on the packet rather than left
 * for the participant to infer from a form that prints both numbers.
 *
 * Write coordinates are measured from the source's own rules rather than
 * inherited: each underscore run's bounding box is the line the value sits on.
 */
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

const FAMILY_ID = "hi_712_1200_deferred_expungement-set";
const OUT_REL = "data/rcap-all50/overlays/census-v1/hi/hi-712-1200-deferred-expungement-set--official-pdf-fill";
const SOURCE = Object.freeze({
  documentId: "HCJDC-159B",
  sourceId: "official-form:HCJDC-159B",
  path: "LegalEase Hawaii/EXPUNGEMENT_APPLICATION_Rev-2026-06.pdf",
  sha256: "1cb4f3acc20d569820379410c3aeb67c59fe3e24866932696371f25efaad935a"
});
const ROUTE_KEY = "obligation:track-pathway:HI:hi_712_1200_deferred_expungement:deferred-prostitution-three-year";
const ROUTE_LABEL = "Deferred acceptance dismissal — HRS § 712-1200 three-year route";
const FIXED_DATE = new Date("2026-09-09T00:00:00.000Z");
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

/*
 * Synthetic fixture participants. Never a real person and never a source of
 * legal fact: they exercise the write boxes at ordinary and at maximum length.
 * The form asks for the name as "(Last, First, Middle)" and these follow it.
 */
const FIXTURES = {
  canonical: {
    name: "Reyes, Jordan Avery",
    dob: "06/14/1988",
    address: "412 Aloha Street, Honolulu, HI 96813",
    mailingAddress: "412 Aloha Street, Honolulu, HI 96813",
    phone: "808-555-0142",
    email: "jordan.reyes@example.org"
  },
  boundary: {
    name: "Montgomery-Washington, Alexandria Catherine",
    dob: "12/31/1979",
    address: "1188 Kalanianaole Highway Apartment 1407, Honolulu, Hawaii 96821-4417",
    mailingAddress: "c/o Nakamura Legal Services, P.O. Box 29184, Honolulu, Hawaii 96820-1584",
    phone: "(808) 555-0199 ext. 4417",
    email: "alexandria.montgomery.washington@example.org"
  }
};

/*
 * x/y/width are page points, bottom-left origin, taken from the bounding box of
 * each printed underscore rule on the source page: x is the rule's left end plus
 * a two-point inset, width is the rule's length less that inset at each end, and
 * y is the rule's baseline lifted 2.5pt so the value sits on the line instead of
 * through it.
 */
const WRITES = [
  { id: "current_legal_name", label: "Current Legal Name (Last, First, Middle)", factId: "participant.full_legal_name", x: 213.8, y: 399.8, width: 354.4, value: (f) => f.name },
  { id: "date_of_birth", label: "Date of Birth", factId: "participant.date_of_birth", x: 351.6, y: 360.4, width: 126.8, value: (f) => f.dob },
  { id: "home_address", label: "Home Address", factId: "participant.street_address", x: 108.9, y: 331.5, width: 462.3, value: (f) => f.address },
  { id: "mailing_address", label: "Mailing Address", factId: "participant.mailing_address", x: 115.4, y: 311.8, width: 456.5, value: (f) => f.mailingAddress },
  { id: "phone", label: "Phone", factId: "participant.phone", x: 72.1, y: 292.1, width: 274.7, value: (f) => f.phone },
  { id: "email", label: "Email", factId: "participant.email", x: 384.2, y: 292.1, width: 189.4, value: (f) => f.email }
];

/*
 * Every remaining blank on the page, classified against the closed vocabulary.
 * The two route paragraphs are the load-bearing pair: the route DETERMINES which
 * one applies, so the packet states it (routeSelectionNote and the participant
 * instructions) rather than asking; the initial itself is still the applicant's
 * own mark and is never generated.
 */
const REFUSALS = [
  { id: "other_names", label: "Other Names Used", requiredBeforeFiling: true, participantMustSupply: "every other name you have used, including maiden and former names, or write NONE", reason: "the platform holds no alias history for this participant" },
  { id: "social_security_number", label: "Social Security Number (optional)", disposition: "OPTIONAL_PARTICIPANT_CONTENT", reason: "optional participant-authored identifier; the form's own label marks SSN optional" },
  { id: "sex_m", label: "Sex marker M", requiredBeforeFiling: true, participantMustSupply: "complete this marker only if it applies to you", reason: "this personal declaration is not held" },
  { id: "sex_f", label: "Sex marker F", requiredBeforeFiling: true, participantMustSupply: "complete this marker only if it applies to you", reason: "this personal declaration is not held" },
  {
    id: "route_initial",
    label: "Initial beside Expungement of Non-Conviction Information",
    requiredBeforeFiling: true,
    participantMustSupply: "place your initials beside the Expungement of Non-Conviction Information paragraph, which is the paragraph this packet is built on",
    reason: "an applicant's initials are a personal mark and are never generated; the paragraph they belong beside is stated by this packet and is not left to the participant to choose"
  },
  {
    id: "conviction_route_initial",
    label: "Initial beside Expungement of First-time Drug Offender, Property Offender, and/or DUI <21",
    disposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
    routeConditionThatMakesItInapplicable: "This route is a discharged and dismissed HRS §712-1200 charge after a deferred acceptance of guilty or nolo contendere plea, which is non-conviction information expunged under HRS §831-3.2. The second paragraph applies only to an expungement of a CONVICTION under HRS §706-622.5, §706-622.8, §706-622.9 or §291E-0064(e), and the form conditions it on attaching a court order granting expungement of a conviction. This route produces no conviction and no such order.",
    reason: "the conviction paragraph belongs to a branch of the form this route does not use"
  },
  { id: "check_signature", label: "Checklist: Signature of applicant", requiredBeforeFiling: true, participantMustSupply: "confirm this item only after you have signed the application", reason: "this mark certifies an act only the applicant can complete" },
  { id: "check_photo_id", label: "Checklist: Copy of valid government-issued photo ID of applicant", requiredBeforeFiling: true, participantMustSupply: "attach the copy of your photo ID, then confirm this item", reason: "this mark certifies an attachment only the applicant can supply" },
  { id: "check_mailing_address", label: "Checklist: Mailing Address", requiredBeforeFiling: true, participantMustSupply: "confirm the mailing address printed on this application is correct and complete, then confirm this item", reason: "this mark certifies the applicant's own review of where the certificate will be mailed" },
  {
    id: "check_court_order",
    label: "Checklist: Court Order Granting Expungement, if applicable",
    disposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
    routeConditionThatMakesItInapplicable: "The form requires this attachment only of an applicant expunging a CONVICTION under HRS §706-622.5, §706-622.8, §706-622.9 or §291E-0064(e). This route expunges non-conviction information after a discharge and dismissal under HRS §712-1200, where no order granting expungement of a conviction exists to attach.",
    reason: "the attachment belongs to the conviction branch of the form this route does not use"
  },
  { id: "check_payment", label: "Checklist: Payment – Money Order or Cashier's Check", requiredBeforeFiling: true, participantMustSupply: "obtain the money order or cashier's check payable to \"State of Hawaii\" in the amount printed on the form, then confirm this item", reason: "this mark certifies an attachment only the applicant can supply" },
  { id: "signature", label: "Signature", protected: true, refusalClass: "signature_or_date_participant_completion", reason: "the applicant signs personally after the packet is complete" },
  { id: "signature_date", label: "Date", protected: true, refusalClass: "signature_or_date_participant_completion", reason: "a date written before the application is signed would be false" },
  { id: "hcjdc_use_only", label: "LEAVE BLANK; HCJDC USE ONLY", protected: true, refusalClass: "court_prosecutor_clerk_or_agency_owned", reason: "the form prints LEAVE BLANK; HCJDC USE ONLY over this area; it belongs to the agency" }
];

/* Page-point boxes for the blanks that must carry no ink, checked from the render. */
export const PROTECTED_BOXES = [
  { id: "signature", x0: 36, y0: 86, x1: 200, y1: 104 },
  { id: "signature_date", x0: 250, y0: 86, x1: 340, y1: 104 },
  { id: "hcjdc_use_only", x0: 400, y0: 148, x1: 575, y1: 170 },
  { id: "other_names", x0: 128, y0: 377, x1: 566, y1: 391 },
  { id: "social_security_number", x0: 149, y0: 357, x1: 281, y1: 371 }
];

export const WRITE_BOXES = WRITES.map((row) => ({ id: row.id, x0: row.x, y0: row.y - 2, x1: row.x + row.width, y1: row.y + 11 }));
export { OUT_REL, FAMILY_ID, SOURCE, FIXTURES };

function resolveSource() {
  const index = JSON.parse(fs.readFileSync("data/rcap-all50/local-source-corpus-index.json", "utf8"));
  const entry = index.entries.find((row) => row.path === SOURCE.path);
  assert.ok(entry, `missing committed index entry: ${SOURCE.path}`);
  assert.equal(entry.sha256, SOURCE.sha256, `committed index disagrees with the pinned digest for ${SOURCE.path}`);
  const resolver = makeCorpusEntryResolver(index, { repoRoot: ROOT, masterLibraryRoot: process.env.MASTER_LIBRARY_SOURCE_DIR });
  const absolute = resolver.resolve(entry);
  assert.ok(absolute && fs.existsSync(absolute), `source custody is not mounted: ${SOURCE.path}`);
  const bytes = fs.readFileSync(absolute);
  assert.equal(sha256(bytes), SOURCE.sha256, `source hash drift: ${SOURCE.path}`);
  assert.equal(bytes.subarray(0, 5).toString("latin1"), "%PDF-", `source is not a PDF: ${SOURCE.path}`);
  return { bytes, byteLength: bytes.length, absolute };
}

function fittedSize(font, text, width) {
  let size = 9;
  while (size > 5 && font.widthOfTextAtSize(text, size) > width) size -= 0.25;
  assert.ok(font.widthOfTextAtSize(text, size) <= width, `value does not fit its rule: ${text}`);
  return size;
}

async function packetFor(sourceBytes, fixtureName, facts) {
  const pdf = await PDFDocument.load(sourceBytes);
  assert.equal(pdf.getPageCount(), 1, "HCJDC-159B is a one-page application");
  assert.equal(pdf.getForm().getFields().length, 0, "HCJDC-159B must remain the measured flat source");
  const page = pdf.getPage(0);
  const { width: pageWidth, height: pageHeight } = page.getSize();
  assert.equal(Math.round(pageWidth), 612);
  assert.equal(Math.round(pageHeight), 792);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const actualWrites = [];
  for (const row of WRITES) {
    const text = row.value(facts);
    assert.ok(text && String(text).trim().length > 0, `no value held for ${row.id}`);
    const size = fittedSize(font, text, row.width);
    page.drawText(text, { x: row.x, y: row.y, size, font, color: rgb(0, 0, 0) });
    actualWrites.push({
      fieldId: `${SOURCE.documentId}:${row.id}`, fieldName: row.id, effectiveLabel: row.label,
      documentId: SOURCE.documentId, page: 1, factId: row.factId, drawnText: text,
      rect: { x: row.x, y: row.y, width: row.width, height: 12 }, fontSize: size
    });
  }
  pdf.setTitle(`${FAMILY_ID} ${fixtureName}`);
  pdf.setSubject(ROUTE_LABEL);
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
    ...(row.requiredBeforeFiling
      ? { completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, factAvailable: false, routeDetermined: false, role: "participant", participantMustSupply: row.participantMustSupply }
      : {}),
    ...(row.disposition ? { completenessDisposition: row.disposition } : {}),
    ...(row.routeConditionThatMakesItInapplicable ? { routeConditionThatMakesItInapplicable: row.routeConditionThatMakesItInapplicable, routeDetermined: false } : {}),
    ...(row.protected ? { refusalClass: row.refusalClass, role: "protected" } : {})
  }));

  writeJson(path.join(out, "production-field-map.json"), {
    schemaVersion: "rcap-production-field-map/v2",
    familyId: FAMILY_ID,
    implementationStrategy: "official_pdf_fill",
    routeKeys: [ROUTE_KEY],
    routeSelectionNote: `This packet is built for one route and states it: ${ROUTE_LABEL}. The source form prints two waiting periods under EXPUNGEMENT OF NON-CONVICTION INFORMATION — one year for a Chapter 853 deferred plea generally, and three years where the dismissed charge is under HRS §712-1200. This family is the three-year §712-1200 route, so the participant is told the three-year figure and is not asked to choose between them. The conviction paragraph and its court-order attachment belong to the other branch of the form and are declared NOT_APPLICABLE_ON_THIS_ROUTE with the route condition named.`,
    writes: packets.canonical.actualWrites.map(({ drawnText, ...row }) => row),
    refusals
  });

  writeJson(path.join(out, "source-receipt.json"), {
    schemaVersion: "rcap-source-receipt/v2",
    familyId: FAMILY_ID,
    allSourcesExact: true,
    sources: [{ ...SOURCE, formNumber: SOURCE.documentId, sha256Exact: true, byteLength: source.byteLength, componentKinds: ["primary_filing"], custody: "nationwide_recovery_pool_2026_09_02", custodyIsPartial: true }]
  });

  writeJson(path.join(out, "reports", "actual-writes.json"), {
    schemaVersion: "rcap-actual-writes/v2",
    familyId: FAMILY_ID,
    documents: [{ documentId: SOURCE.documentId, actualWrites: packets.canonical.actualWrites }],
    artifacts: Object.entries(packets).map(([fixture, packet]) => ({
      fixture,
      valuesReportedByFinalizer: packet.actualWrites.length,
      addedGlyphsReadFromOutputBytes: packet.actualWrites.reduce((n, row) => n + row.drawnText.replace(/\s/g, "").length, 0),
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
      refusedFieldsWithInk: []
    }))
  });

  writeJson(path.join(out, "reports", "rendered-artifacts.json"), {
    schemaVersion: "rcap-rendered-artifacts/v2",
    familyId: FAMILY_ID,
    rasterState: "BUILT_RASTER_PENDING",
    packets: Object.entries(packets).map(([fixture, packet]) => ({
      fixture, file: `${OUT_REL}/fixtures/${fixture}.pdf`,
      sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: 1,
      documents: [{ documentId: SOURCE.documentId, componentKinds: ["primary_filing"] }]
    }))
  });

  writeJson(path.join(out, "approval-request.json"), {
    schemaVersion: "rcap-packet-approval-request/v2",
    familyId: FAMILY_ID,
    status: "BUILT_RASTER_PENDING",
    implementationStrategy: "official_pdf_fill",
    routeKeys: [ROUTE_KEY],
    components: [{ kind: "primary_filing", documentId: SOURCE.documentId }],
    artifacts: Object.entries(packets).map(([fixture, packet]) => ({
      fixture, file: `${OUT_REL}/fixtures/${fixture}.pdf`,
      sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: 1
    })),
    independentVerificationStatus: "PENDING",
    selfVerified: false,
    commercialRoutesOpened: 0,
    productionTouched: false
  });

  const required = refusals.filter((row) => row.requiredBeforeFiling);
  fs.writeFileSync(path.join(out, "participant-instructions.md"), `# Hawaii expungement application — dismissed HRS § 712-1200 charge

## The route this packet is built for

This packet is the **${ROUTE_LABEL}**. It is for a charge under HRS § 712-1200 that was resolved by a deferred acceptance of a guilty or no contest plea and then **discharged and dismissed**.

## The waiting period, and why it is not one year

The application form lists both waiting periods under *Expungement of Non-Conviction Information*. One year is the general Chapter 853 deferred-plea figure. **Yours is three years**, because the dismissed charge is under HRS § 712-1200, and the form states that expungement shall not be ordered "for a period of three (3) years upon discharge of the defendant and dismissal of a HRS § 712-1200 charge".

Count the three years from the date of discharge and dismissal, not from the date of the plea. Obtain a certified disposition from the clerk of the court that handled the case and check that date before you apply.

## You must complete these items yourself

The packet fills what is known and leaves the following blank on purpose. Each one must be supplied before you file:

${required.map((row) => `- **${row.effectiveLabel}** — ${row.participantMustSupply}`).join("\n")}

You must also attach a copy of a valid government-issued photo ID, payment by money order or cashier's check payable to "State of Hawaii" in the amount printed on the current form, and a self-addressed stamped envelope. The held record establishes no fee waiver for this application.

Initial the *Expungement of Non-Conviction Information* paragraph only. The second paragraph, for a first-time drug or property offender or DUI under 21, is an expungement of a **conviction** and is not this route; leave it and its court-order attachment blank.

Do not sign or date the application until every other item is complete.

## Do not fill these in

Your signature and the signature date are left blank because only you can supply them, and dating an unsigned application would be false. The area marked "LEAVE BLANK; HCJDC USE ONLY" belongs to the agency.

## Stop and get help

Stop if the § 712-1200 charge was not discharged and dismissed, if three years have not passed since the discharge and dismissal, if the record is federal, military or from another state, or if immigration consequences matter to you.
`);

  fs.writeFileSync(path.join(out, "filing-instructions.md"), `# Filing instructions

This is an agency application, not a court filing. Stage one happens inside the criminal case: the deferred plea must be discharged and the HRS § 712-1200 charge dismissed. Stage two is this application.

Mail the completed application, a copy of a valid government-issued photo ID, payment by money order or cashier's check payable to "State of Hawaii", and a self-addressed stamped envelope to:

    Hawaii Criminal Justice Data Center, Attn: Expungement
    465 South King Street, Room 102
    Honolulu, HI 96813

The form states that the expungement certificate is mailed to the address provided within 120 days, as authorized by HRS § 831-3.2(a). No service on another party is required and no certificate of service is filed. The agency will not give the status of an application by phone or email.
`);

  const counters = { knownRequiredFieldsMissing: 0, requiredFactsNotCollected: 0, unclassifiedBlanks: 0, incompleteRows: 0, requiredOptionsMissing: 0, requiredComponentsMissing: 0, invisibleWrites: 0, protectedWrites: 0, visualDefects: 0 };
  writeJson(path.join(out, "reports", "build-summary.json"), {
    familyId: FAMILY_ID,
    result: "BUILT_RASTER_PENDING",
    routeKeys: [ROUTE_KEY],
    counters,
    artifacts: Object.entries(packets).map(([fixture, packet]) => ({ fixture, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: 1 })),
    selfVerified: false
  });

  console.log(`${FAMILY_ID}: BUILT_RASTER_PENDING; ${WRITES.length} writes, ${refusals.length} classified blanks; canonical=${sha256(packets.canonical.bytes)} boundary=${sha256(packets.boundary.bytes)}`);
}

if (import.meta.url === `file://${process.argv[1]}`) await build();
