#!/usr/bin/env node
/**
 * Arkansas felony-conviction sealing packet under Act 1460 of 2013.
 *
 * This is a packet-build worker. It binds the exact ACIC petition and order,
 * fills deterministic canonical and boundary fixtures, flattens their form
 * appearances, and emits review evidence. It does not raster, independently
 * verify, open a route, or grant production authority.
 *
 *   node scripts/build-census-v1-ar-felony-seal-set.mjs --no-raster
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { preserveIdentityRefresh, carryForwardIdentityRefresh } from "./rcap-packet-completeness/identity-refresh.mjs";
import { carryForwardGovernance, assertGovernancePreserved } from "./rcap-packet-completeness/governance-preservation.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDict, PDFDocument, PDFName, PDFTextField, PDFCheckBox, StandardFonts, decodePDFRawStream } = require("pdf-lib");

const FAMILY_ID = "ar-felony-seal-set";
const WORKER_ID = "CODEX-CS2-WORKER-B";
const BRANCH = "codex/cs2-worker-b-ar-felony-seal";
const BASE_SHA = "3faaa1b8364505b1a511021f4c18c1eb1e992489";
const BUILD_SCRIPT = "scripts/build-census-v1-ar-felony-seal-set.mjs";
const OUT = "data/rcap-all50/overlays/census-v1/ar/ar-felony-seal-set--official-pdf-fill";
const ROWS = "data/rcap-grade-a/packet-factory-24h/pf13/rows.json";
const ROUTE_KEY = "obligation:track-pathway:AR:ar-felony-seal:situation-c-felony-convictions";
const ROUTE = "situation-c-felony-convictions";
const D_ROOT = path.resolve(ROOT, process.env.RCAP_D_SOURCE_DIR
  ?? "private/source-imports/rcap-d-source-packs-2026-08-12");

const COMPONENTS = Object.freeze({
  petition: "ar-felony-seal-primary-filing-1",
  order: "ar-felony-seal-proposed-order-2"
});

const SOURCES = Object.freeze([
  {
    key: "petition",
    componentId: COMPONENTS.petition,
    sourceId: "official-form:ACIC-UNIFORM-PETITION-TO-SEAL",
    documentId: "ACIC-UNIFORM-PETITION-TO-SEAL",
    officialTitle: "Petition to Seal Felony Under Act 1460 of 2013",
    revision: "2021-07-21",
    role: "primary_filing",
    sha256: "6065fe0248e9022c866ac2506c02df35b533439f6d15fc40843b709eea375d9b",
    byteLength: 178947,
    pageCount: 4,
    pathInPack: "D1/STATES/AR/05_SOURCE_GATED/AR__SOURCE-GATED__AR-ACIC-PETITION-TO-SEAL-FELONY-UNDER-ACT-1460__petition-to-seal-felony-under-act-1460-of-2013__REV-2021-07-21__EN.pdf"
  },
  {
    key: "order",
    componentId: COMPONENTS.order,
    sourceId: "official-form:ACIC-UNIFORM-ORDER-TO-SEAL",
    documentId: "ACIC-UNIFORM-ORDER-TO-SEAL",
    officialTitle: "Order to Seal Felony Under Act 1460 of 2013",
    revision: "2021-08-16",
    role: "proposed_order",
    sha256: "dcb87ba9ff3b64f5db9231f2f3b9d16b86264ac75cbdf81d706921ab3592f4cc",
    byteLength: 240203,
    pageCount: 3,
    pathInPack: "D1/STATES/AR/05_SOURCE_GATED/AR__SOURCE-GATED__AR-ACIC-ORDER-TO-SEAL-FELONY-UNDER-ACT-1460__order-to-seal-felony-under-act-1460-of-2013__REV-2021-08-16__EN.pdf"
  }
]);

const LEGAL_RECORDS = Object.freeze([
  {
    recordId: "packet-set-manifest:ar-felony-seal-set",
    path: "data/record-clearing/legal-design-packet-set-manifests.json",
    mustContain: [
      "ar-felony-seal-primary-filing-1",
      "ar-felony-seal-proposed-order-2",
      "File the ACIC uniform petition and order pair in the circuit court in the county where the offense was committed and the person was convicted.",
      "Serve the prosecuting attorney within three days of filing."
    ]
  },
  {
    recordId: "compiled-profile:AR-arkansas",
    path: "src/lib/rcap-engine/compiled/profiles/AR-arkansas.json",
    mustContain: [
      "Situation C — Felony convictions (§§ 16-90-1406, 1407)",
      "Act 1460 eliminated sealing filing fees",
      "Pull the ACIC criminal history and the court docket / Judgment and Commitment Order"
    ]
  }
]);

const FIXTURES = Object.freeze({
  canonical: Object.freeze({
    "matter.court_type": "CIRCUIT",
    "matter.court_county": "PULASKI COUNTY",
    "matter.court_county_name": "PULASKI",
    "matter.court_county_suffix": "COUNTY",
    "matter.division": "CRIMINAL",
    "matter.case_number": "60CR-19-1184",
    "participant.full_legal_name": "Jordan Avery Reyes",
    "matter.arrest_day": "14",
    "matter.arrest_month": "MARCH",
    "matter.arrest_year": "2019",
    "matter.charged_offense": "THEFT OF PROPERTY",
    "matter.charged_offense_continuation": "COUNT 1",
    "matter.conviction_offense": "THEFT OF PROPERTY",
    "matter.conviction_offense_continuation": "COUNT 1",
    "matter.offense_class": "D",
    "matter.statute_section": "5-36-103",
    "participant.street_address": "42 LARKSPUR STREET",
    "participant.address_line_2": "APARTMENT 4B",
    "participant.city": "LITTLE ROCK",
    "participant.state": "AR",
    "participant.zip": "72201",
    "participant.race": "WHITE",
    "participant.sex": "F",
    "participant.date_of_birth": "04/17/1991"
  }),
  boundary: Object.freeze({
    "matter.court_type": "CIRCUIT",
    "matter.court_county": "MISSISSIPPI COUNTY",
    "matter.court_county_name": "MISSISSIPPI",
    "matter.court_county_suffix": "COUNTY",
    "matter.division": "CRIMINAL",
    "matter.case_number": "47BCR-2026-000123",
    "participant.full_legal_name": "Alexandrina-Katharine Montgomery-Vandenberg",
    "matter.arrest_day": "31",
    "matter.arrest_month": "DECEMBER",
    "matter.arrest_year": "2020",
    "matter.charged_offense": "FRAUDULENT USE OF A CREDIT OR DEBIT CARD",
    "matter.charged_offense_continuation": "COUNT 1",
    "matter.conviction_offense": "FRAUDULENT USE OF A CREDIT OR DEBIT CARD",
    "matter.conviction_offense_continuation": "COUNT 1",
    "matter.offense_class": "D",
    "matter.statute_section": "5-37-207",
    "participant.street_address": "12345 SOUTHWEST GRANDVIEW BOULEVARD",
    "participant.address_line_2": "BUILDING 7, APARTMENT 4321-B",
    "participant.city": "UNINCORPORATED LONG HOLLOW",
    "participant.state": "AR",
    "participant.zip": "72001-9999",
    "participant.race": "ASIAN",
    "participant.sex": "F",
    "participant.date_of_birth": "12/31/1968"
  })
});

const TEXT_MAPPINGS = Object.freeze({
  petition: Object.freeze({
    "IN THE CIRCUIT COURT OF": ["matter.court_county", "County of the circuit court"],
    "DIVISION": ["matter.division", "Court division"],
    "Case No": ["matter.case_number", "Case number"],
    "First Middle and Last name": ["participant.full_legal_name", "Defendant full legal name in caption"],
    "1 The Defendant was arrested on the": ["matter.arrest_day", "Arrest date day"],
    "day of": ["matter.arrest_month", "Arrest date month"],
    "and charged with the offenses of": ["matter.arrest_year", "Arrest date year"],
    "1": ["matter.charged_offense", "Charged offense description line 1"],
    "2": ["matter.charged_offense_continuation", "Charged offense description line 2"],
    "A Class 1": ["matter.offense_class", "Charged offense class"],
    "A Class 2": ["matter.statute_section", "Charged offense Arkansas Code section"],
    "offenses of 1": ["matter.conviction_offense", "Conviction offense description line 1"],
    "offenses of 2": ["matter.conviction_offense_continuation", "Conviction offense description line 2"],
    "A Class 1_2": ["matter.offense_class", "Conviction offense class"],
    "A Class 2_2": ["matter.statute_section", "Conviction offense Arkansas Code section"],
    "prays this Court enter an Order Sealing the above referenced felony convictions": ["participant.full_legal_name", "Defendant full legal name in WHEREFORE clause"],
    "1_2": ["participant.street_address", "Defendant street address line 1"],
    "2_2": ["participant.address_line_2", "Defendant street address line 2"],
    "State": ["participant.city", "Defendant city"],
    "Defendants Address": ["participant.state", "Defendant state"],
    "Zip code": ["participant.zip", "Defendant ZIP code"],
    "Comes the Petitioner": ["participant.full_legal_name", "Petitioner full legal name in verification statement"],
    "Race": ["participant.race", "Defendant race in identification block"],
    "Sex": ["participant.sex", "Defendant sex in identification block"],
    "DOB": ["participant.date_of_birth", "Defendant date of birth in identification block"]
  }),
  order: Object.freeze({
    "IN THE": ["matter.court_type", "Type of court"],
    "COURT OF": ["matter.court_county_name", "County of filing court, name"],
    "ARKANSAS": ["matter.court_county_suffix", "County of filing court, suffix"],
    "DIVISION": ["matter.division", "Court division"],
    "Case No": ["matter.case_number", "Case number"],
    "FirstMiddleandLastname": ["participant.full_legal_name", "Defendant full legal name in caption"],
    "Defendant": ["participant.full_legal_name", "Defendant full legal name in decree"],
    "Race": ["participant.race", "Defendant race in identification block"],
    "Sex": ["participant.sex", "Defendant sex in identification block"],
    "DOB": ["participant.date_of_birth", "Defendant date of birth in identification block"]
  })
});

const PETITION_SELECTION_LABELS = Object.freeze({
  "felony": "Paragraph 1 charged offense level — felony",
  "misdemeanor in violation of A C A": "Paragraph 1 charged offense level — misdemeanor",
  "felony_2": "Paragraph 2 conviction offense level — felony",
  "misdemeanor in violation of A C A_2": "Paragraph 2 conviction offense level — misdemeanor",
  "8": "Paragraph 8 first eligibility statement — eligible nonviolent Class C or D felony and sentence complete",
  "undefined": "Paragraph 8 second eligibility statement — other offense and five years complete",
  "undefined_2": "Paragraph 8 third eligibility statement — one year after a prior denial",
  "9": "Paragraph 9 — no pending felony matters",
  "undefined_3": "Paragraph 9 — one or more pending felony matters",
  "IS or": "Paragraph 10 — is required to register as a sex offender",
  "IS NOT required to register as a sex offender under the": "Paragraph 10 — is not required to register as a sex offender"
});

/*
 * WHAT THE PACKET MAY MARK ON A SWORN PETITION.
 *
 * Delivered page 3 is a VERIFICATION taken under oath before a notary, so every
 * numbered paragraph of this petition is a statement the participant swears to.
 * The packet may therefore pre-mark an election ONLY where the route or the
 * official form family already settles it:
 *
 *   felony / felony_2 - paragraph 1 and 2 offence level. The route key
 *     situation-c-felony-convictions binds the FELONY form family, so choosing
 *     the felony form settles both.
 *   8 - paragraph 8 first eligibility statement. sentenceComplete is a collected
 *     generationRequirement and the track's packetInstructions say in terms
 *     "Fill paragraph 8 per the approved convention."
 *
 * PARAGRAPHS 9 AND 10 ARE NOT MARKED, and this is deliberate.  The track's six
 * generationRequirements are convictionDetails, convictionDate, sentenceComplete,
 * violenceQuestion, sameEpisodeCount and interestsOfJusticeFacts.  NONE asks
 * whether the participant has pending felony charges and NONE asks whether they
 * are required to register as a sex offender, so the platform holds neither fact
 * and no committed record authorises either election.  A fixture value is not
 * authority: marking a sworn paragraph from a fixture fact swears the
 * participant to something the route never determined.  Both branches of each
 * are left blank for the participant and both printed statements are disclosed
 * verbatim in participant-instructions.md.  See PARTICIPANT_ELECTED_PARAGRAPHS.
 */
const SELECTED_PETITION_CONTROLS = new Set([
  "felony",
  "felony_2",
  "8"
]);

/* The paragraph 9 and 10 controls: neither branch is route-determined and
 * neither branch is marked.  Their unselected reason must not claim to be the
 * complement of an option the fixture established, because no branch was. */
const PARTICIPANT_ELECTED_PARAGRAPHS = new Set([
  "9",
  "undefined_3",
  "IS or",
  "IS NOT required to register as a sex offender under the"
]);

/*
 * The selection groups the ROUTE settles, listed as groups so requiredOptionsMissing
 * can be counted rather than asserted.  Paragraph 1 and paragraph 2 offence level are
 * settled by the bound felony route key; paragraph 8 is settled by sentenceComplete
 * plus the track's own packetInstruction "Fill paragraph 8 per the approved
 * convention."  Paragraph 9 and paragraph 10 are ABSENT ON PURPOSE and must stay
 * absent: the track collects neither fact, so an unelected paragraph 9 is the correct
 * output, and listing it here would turn the counter into pressure to tick a sworn box.
 */
const ROUTE_DETERMINED_SELECTION_GROUPS = Object.freeze([
  Object.freeze(["felony", "misdemeanor in violation of A C A"]),
  Object.freeze(["felony_2", "misdemeanor in violation of A C A_2"]),
  Object.freeze(["8", "undefined", "undefined_2"])
]);

/* Printed verbatim from the pinned ACIC petition, page 2, for disclosure in
 * participant-instructions.md.  Each branch is quoted as the form prints it and
 * carries only what the form itself says follows from choosing it. */
/*
 * THE ROUTE RECORD'S OWN STOP CONDITIONS.
 *
 * data/record-clearing/legal-design-track-registry.json, track ar-felony-seal,
 * declares exactly these six selfHelpStopConditions.  They are quoted here so
 * the delivered guidance carries the record's own words, and verifyStopConditions()
 * re-reads the committed registry on every build and fails if the list has moved.
 * The registry is deliberately NOT added to LEGAL_RECORDS: a whole-file digest on
 * a record that moves several times a week manufactures a stale pin, and a
 * content anchor on the exact six strings is the stronger check for this use.
 * The verification is recorded in source-receipt.json under contentAnchoredRecords.
 *
 * `plainly` says, in ordinary words, what the participant should do when the
 * condition is live.  It states no legal consequence the record does not carry;
 * where the packet has nothing to say, it says that the packet has nothing to say.
 */
const TRACK_REGISTRY_PATH = "data/record-clearing/legal-design-track-registry.json";
const TRACK_ID = "ar-felony-seal";
const SELF_HELP_STOP_CONDITIONS = Object.freeze([
  { condition: "The prosecuting attorney objects within the 30-day window.",
    plainly: "The prosecuting attorney has 30 days after service to object. If an objection is filed, stop here and get a lawyer; this packet does not answer an objection." },
  { condition: "The court sets a contested hearing.",
    plainly: "If the court sets a contested hearing, stop here and get a lawyer. Nothing in this packet prepares you to argue one." },
  { condition: "Immigration, licensing or firearm consequences are in play.",
    plainly: "If anything about your immigration status, a professional or occupational licence, or your right to possess a firearm turns on this record, stop and talk to a lawyer before you file. This packet does not tell you what sealing does or does not do for any of the three." },
  { condition: "The violence determination is unclear.",
    plainly: "Paragraph 6 of the petition swears that your conviction was not a felony involving violence under §5-4-501(d)(2), among other things. This service asks whether the offence involved violence but does not decide it, and the committed route record forbids deciding it for you. If you are not certain, stop and get a lawyer before you swear to paragraph 6." },
  { condition: "The same-episode count is unclear.",
    plainly: "This service asks how many offences arose from the same criminal episode, and the committed route record forbids deciding that count for you. If you are not certain how many offences your case counts as, stop and get a lawyer before filing." },
  { condition: "The interests-of-justice showing needs individualized argument.",
    plainly: "Paragraph 11 asks the court to find that you have been rehabilitated, and A.C.A. § 16-90-1415(b) is the interests-of-justice standard the court applies. This packet deliberately writes no argument for you. If your case needs that showing made, a lawyer has to make it — this packet's help stops at the printed form." }
]);

function verifyStopConditions() {
  const registry = readJson(TRACK_REGISTRY_PATH);
  const track = registry.tracks.find((entry) => entry.trackId === TRACK_ID);
  assert.ok(track, `${TRACK_REGISTRY_PATH}: track ${TRACK_ID} is absent`);
  assert.deepEqual(track.selfHelpStopConditions, SELF_HELP_STOP_CONDITIONS.map((row) => row.condition),
    `${TRACK_ID}: the committed selfHelpStopConditions no longer match the six this packet delivers`);
  return { recordId: `track-registry:${TRACK_ID}`, path: TRACK_REGISTRY_PATH,
    anchorKind: "content_anchor_no_whole_file_pin",
    anchorStatementsVerified: SELF_HELP_STOP_CONDITIONS.length,
    anchors: SELF_HELP_STOP_CONDITIONS.map((row) => row.condition),
    whyNoWholeFilePin: "This record moves several times a week and this build binds only these six strings. "
      + "A whole-file digest here would go stale without the bound content moving; the content anchor fails the build if it does." };
}

const PARTICIPANT_ELECTED_PARAGRAPH_TEXT = Object.freeze([
  {
    paragraph: "9",
    branches: [
      { control: "9",
        printed: "Defendant has no pending felony charges in any state or federal court",
        consequence: "Choosing this leaves the two lines under paragraph 9 blank." },
      { control: "undefined_3",
        printed: "Defendant has one or more pending felony charges in state or federal court and the status of that/those charges is/are as follows:",
        consequence: "Choosing this requires writing the status of each pending charge on the two lines printed under paragraph 9." }
    ]
  },
  {
    paragraph: "10",
    branches: [
      { control: "IS or",
        printed: "Defendant IS required to register as a sex offender under the Sex Offender Registration Act of 1997 (A.C.A.§ 12-12-901, Et. Seq.)",
        consequence: null },
      { control: "IS NOT required to register as a sex offender under the",
        printed: "Defendant IS NOT required to register as a sex offender under the Sex Offender Registration Act of 1997 (A.C.A.§ 12-12-901, Et. Seq.)",
        consequence: null }
    ]
  }
]);

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

/*
 * THE WIPE DEFEATED BOTH PRESERVATION MODULES, SILENTLY.
 *
 * runFamily() removes OUT wholesale (fs.rmSync, recursive) before it rebuilds.
 * Both preserveIdentityRefresh() and preserveGovernanceState() decide what to
 * carry forward by READING THE COMMITTED FILE AT THE WRITE PATH -- and by then
 * that file is gone. preserveIdentityRefresh is fail-safe on a missing file, so
 * it returned the builder's document untouched and every hand-written
 * identityRefresh annotation was erased regardless of whether its source had
 * moved. product-wiring.json never went through the governance module at all,
 * so a rebuild at base, changing nothing, deleted the committed `binding` whole
 * -- a hash-bound RASTER_PASS acceptance receipt, the last independent verdict,
 * and the paymentEligible / sponsorshipEligible / whyPaymentIsClosed commercial
 * guards. That is the defect recorded in
 * data/rcap-grade-a/packet-factory-24h/REBUILD_ERASES_GOVERNANCE_STATE.json,
 * reached here by a different route: not a builder that forgot to preserve, but
 * a builder that deleted the evidence before asking.
 *
 * The committed documents are snapshotted BEFORE the wipe and the preservation
 * reads the snapshot.
 */
const PRIOR_DOCUMENTS = new Map();
function snapshotPriorDocuments() {
  PRIOR_DOCUMENTS.clear();
  for (const rel of [`${OUT}/source-receipt.json`, `${OUT}/product-wiring.json`]) {
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) continue;
    try { PRIOR_DOCUMENTS.set(rel, JSON.parse(fs.readFileSync(file, "utf8"))); }
    catch (error) {
      throw new Error(`${rel} exists and does not parse as JSON (${error.message}). `
        + "Rebuilding over it would erase whatever governance or identity state it holds.");
    }
  }
}

const writeJson = (rel, value) => {
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  /* A hand-written identityRefresh on a source pin this build did not move
   * survives the rebuild; one whose source moved again does not. See
   * scripts/rcap-packet-completeness/identity-refresh.mjs. */
  const prior = PRIOR_DOCUMENTS.get(rel) ?? null;
  const document = prior
    ? carryForwardIdentityRefresh(prior, value).document
    : preserveIdentityRefresh(fs, file, value);
  fs.writeFileSync(file, `${JSON.stringify(document, null, 2)}\n`);
};

function verifyLegalRecords() {
  return LEGAL_RECORDS.map((record) => {
    const bytes = fs.readFileSync(path.join(ROOT, record.path));
    const text = bytes.toString("utf8");
    for (const anchor of record.mustContain) {
      assert.ok(text.includes(anchor), `${record.recordId}: missing settled legal anchor ${JSON.stringify(anchor)}`);
    }
    return { recordId: record.recordId, path: record.path, sha256: sha256(bytes), byteLength: bytes.length,
      anchorStatementsVerified: record.mustContain.length };
  });
}

function verifySources() {
  return SOURCES.map((source) => {
    const file = path.join(D_ROOT, source.pathInPack);
    assert.ok(fs.existsSync(file), `BLOCKED_SOURCE absent: ${file}`);
    const bytes = fs.readFileSync(file);
    assert.equal(bytes.length, source.byteLength, `BLOCKED_SOURCE byte length mismatch: ${source.sourceId}`);
    assert.equal(sha256(bytes), source.sha256, `BLOCKED_SOURCE SHA-256 mismatch: ${source.sourceId}`);
    return { source, file, bytes };
  });
}

function fieldType(field) {
  if (field instanceof PDFTextField) return "text";
  if (field instanceof PDFCheckBox) return "checkbox";
  return field.constructor.name.replace(/^PDF/, "").toLowerCase();
}

async function census(source, bytes) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = pdf.getPages();
  assert.equal(pages.length, source.pageCount, `${source.documentId}: page count changed`);
  return pdf.getForm().getFields().map((field) => {
    const widgets = field.acroField.getWidgets().map((widget) => {
      const rect = widget.getRectangle();
      const pageRef = widget.P?.();
      let page = 1;
      pages.forEach((candidate, index) => { if (candidate.ref === pageRef) page = index + 1; });
      return { page, rect: { x: +rect.x.toFixed(2), y: +rect.y.toFixed(2),
        width: +rect.width.toFixed(2), height: +rect.height.toFixed(2) } };
    });
    return { name: field.getName(), type: fieldType(field), widgets };
  });
}

function pageOf(fields, fieldName) {
  return fields.find((field) => field.name === fieldName)?.widgets?.[0]?.page ?? null;
}

function protectedRow(source, fields, field, label, reason, category) {
  return {
    field, fieldName: field, effectiveLabel: label, printedLabel: label,
    page: pageOf(fields, field), document: source.componentId,
    reason, why: reason, category, class: category, completenessClass: category,
    requiredBeforeFiling: false, routeDetermined: false
  };
}

function rbfRow(source, fields, field, label, participantMustSupply) {
  const reason = `the participant supplies this before filing: ${participantMustSupply}`;
  return {
    field, fieldName: field, effectiveLabel: label, printedLabel: label,
    page: pageOf(fields, field), document: source.componentId,
    reason, why: reason, category: null, class: null, completenessClass: null,
    completenessDisposition: "REQUIRED_BEFORE_FILING", disposition: "REQUIRED_BEFORE_FILING",
    requiredBeforeFiling: true, routeDetermined: false, factId: null,
    identity: `${source.componentId} field ${field}`, participantMustSupply
  };
}

function optionalRow(source, fields, field, label, why) {
  const reason = `optional participant-authored content; ${why}; the platform does not invent it.`;
  return {
    field, fieldName: field, effectiveLabel: label, printedLabel: label,
    page: pageOf(fields, field), document: source.componentId,
    reason, why: reason, category: null, class: null, completenessClass: null,
    requiredBeforeFiling: false, routeDetermined: false
  };
}

function refusalFor(source, fields, field) {
  if (source.key === "petition") {
    if (field === "Arrest Tracking Number") return rbfRow(source, fields, field,
      "Arrest Tracking Number required for identification",
      "copy the arrest tracking number from the ACIC criminal history or arrest record");
    if (field === "SID No") return rbfRow(source, fields, field,
      "SID No. required for identification",
      "copy the state identification number from the ACIC criminal history or arrest record");
    if (field === "FBI No If known") return optionalRow(source, fields, field,
      "FBI number (if known)", "the official form expressly qualifies the FBI number as if known");

    const signatureOrService = new Set([
      "Defendants Signature", "Date", "Petitioner",
      "copy of the foregoing Petition has been provided to the Prosecuting",
      "Defendant or Defendants Attorney", "Date_2"
    ]);
    if (signatureOrService.has(field)) return protectedRow(source, fields, field,
      field === "Date" ? "Participant signature date"
        : field === "Date_2" ? "Certificate of service signature date"
          : field === "copy of the foregoing Petition has been provided to the Prosecuting"
            ? "Certificate of service attestation completed after service"
            : `${field} — participant signature or service attestation`,
      "signature or date field; never prefilled, and a certificate-of-service attestation is completed only after service occurs",
      "signature_or_date_participant_completion");

    const notaryFields = new Set([
      "COUNTY OF", "Subscribed and sworn to before me on this", "undefined_4",
      "20", "Notary Public", "MyCommissionexpires"
    ]);
    if (notaryFields.has(field)) return protectedRow(source, fields, field,
      `Notary jurat field — ${field}`,
      "court, clerk, prosecutor, agency, or hearing field: this jurat item is completed by the notary when the oath is administered",
      "court_prosecutor_clerk_or_agency_owned");

    if (field === "federal court and the status of thatthose charges isare as follows"
      || field === "Defendant") return protectedRow(source, fields, field,
      `Conditional paragraph 9 narrative ${field === "Defendant" ? "line 2" : "line 1"}`,
      "a sworn assertion or legal election the route does not determine; this narrative belongs to the second branch of paragraph 9, and the packet marks neither branch of paragraph 9",
      "participant_sworn_narrative_or_legal_election");

    assert.fail(`${source.documentId}: no refusal classification for ${field}`);
  }

  if (field === "Arrest Tracking Number") return rbfRow(source, fields, field,
    "Arrest Tracking Number required for identification",
    "copy the arrest tracking number from the ACIC criminal history or arrest record onto the proposed order");
  if (field === "undefined_3") return rbfRow(source, fields, field,
    "SID No. required for identification",
    "copy the state identification number from the ACIC criminal history or arrest record onto the proposed order");
  if (field === "FBI No if known") return optionalRow(source, fields, field,
    "FBI number (if known)", "the official form expressly qualifies the FBI number as if known");

  return protectedRow(source, fields, field,
    field === "Judge" ? "Judge signature"
      : field === "Date" ? "Judge signature date"
        : `Court-owned finding or order field — ${field}`,
    "court, clerk, prosecutor, agency, or hearing field: below-caption findings, elections, dates, decree details, and judicial signature remain blank for the court",
    "court_prosecutor_clerk_or_agency_owned");
}

function mapFor(source, fields) {
  const writes = [];
  const refusals = [];
  const selectionControls = [];
  const mapped = TEXT_MAPPINGS[source.key];
  for (const field of fields) {
    const binding = mapped[field.name];
    if (binding) {
      writes.push({
        field: field.name, fieldName: field.name, factId: binding[0],
        effectiveLabel: binding[1], printedLabel: binding[1], page: field.widgets[0]?.page ?? null,
        document: source.componentId, pdfType: field.type, widgets: field.widgets
      });
      continue;
    }
    if (source.key === "petition" && Object.hasOwn(PETITION_SELECTION_LABELS, field.name)) {
      const selected = SELECTED_PETITION_CONTROLS.has(field.name);
      selectionControls.push({
        selectionId: field.name, field: PETITION_SELECTION_LABELS[field.name],
        actualFieldName: field.name, page: field.widgets[0]?.page ?? null,
        document: source.componentId, pdfType: field.type, widgets: field.widgets,
        disposition: selected ? "selected_by_route_and_fixture_facts" : "PARTICIPANT_ELECTION_GENUINE",
        selected, kind: "selection_control",
        reason: selected
          ? "selected from the bound felony route and the fixture's settled case facts"
          : PARTICIPANT_ELECTED_PARAGRAPHS.has(field.name)
            ? "a sworn assertion the route does not determine and the track does not collect: no generationRequirement asks about pending felony charges or sex-offender registration, so neither branch of this paragraph is marked and the participant elects it on the printed form"
            : "a sworn assertion or legal election the route does not determine; this is the unselected complement to the option established by the fixture",
        category: selected ? null : "participant_sworn_narrative_or_legal_election",
        class: selected ? null : "participant_sworn_narrative_or_legal_election",
        completenessClass: selected ? null : "participant_sworn_narrative_or_legal_election",
        requiredBeforeFiling: false, routeDetermined: false
      });
      continue;
    }
    refusals.push(refusalFor(source, fields, field.name));
  }

  const decided = new Set([
    ...writes.map((row) => row.field),
    ...refusals.map((row) => row.field),
    ...selectionControls.map((row) => row.actualFieldName)
  ]);
  assert.equal(decided.size, fields.length, `${source.documentId}: every field must have exactly one terminal decision`);
  assert.deepEqual([...decided].sort(), fields.map((field) => field.name).sort(),
    `${source.documentId}: field map must cover the form exactly`);

  return {
    formNumber: source.componentId,
    documentId: source.documentId,
    documentRole: source.componentId,
    instrumentKind: source.role,
    documentPolicy: { mode: source.key === "petition" ? "participant" : "court_order",
      captionOnly: source.key === "order", routeKey: ROUTE_KEY },
    structuralClass: "official_acroform_fill_then_flatten",
    officialSource: { sourceId: source.sourceId, sha256: source.sha256 },
    canonicalWrites: writes, canonicalRefusals: refusals,
    boundaryWrites: writes, boundaryRefusals: refusals,
    roleRefusals: [], selectionControls
  };
}

function fittedFontSize(font, value, rect) {
  const max = Math.min(9, Math.max(5, rect.height - 5));
  for (let size = max; size >= 5; size -= 0.25) {
    if (font.widthOfTextAtSize(value, size) <= Math.max(4, rect.width - 4)) return size;
  }
  assert.fail(`value does not fit visibly at 5pt: ${JSON.stringify(value)} in ${JSON.stringify(rect)}`);
}

/*
 * FIX169, ARTIFACTS. WHAT THIS FAMILY PUBLISHED WAS NOT READ FROM ANY BYTE.
 *
 * reports/actual-writes.json carried `derivedFromArtifactBytes: true` over four
 * figures, and not one of them was derived from an artifact byte:
 *
 *   addedGlyphsReadFromOutputBytes                  the length of the string the
 *                                                   finalizer INTENDED to write
 *   flattenedWidgetAppearancesReadFromOutputBytes   the literal 0
 *   nonWhitespaceGlyphsOutsideMeasuredWriteBoxes    the literal 0
 *   refusedFieldsWithInk                            the literal []
 *
 * The second was not merely unmeasured, it was false: VF57 opened the delivered
 * fixtures and read 96 flattened appearance placements against a published 0.
 * A counter named "...ReadFromOutputBytes" that restates build intent, or that
 * is a constant, tells a reviewer the bytes were inspected when they were not.
 *
 * Everything below reads the SAVED bytes back. The approach is the one FIX166
 * proved on il-seal-3yr-set (Form XObject walk, appearance streams
 * decompressed) and the one FIX165 proved on the sibling ar-drug-court-set
 * (page-by-page drawn-text diff against the bound source), re-implemented here
 * against this family's own two components.
 */

/** Every flattened widget Form XObject in the delivered bytes, blank ones included. */
function countFlattenedWidgetXObjects(document) {
  let total = 0;
  for (const page of document.getPages()) {
    const xobjects = page.node.Resources()?.lookupMaybe(PDFName.of("XObject"), PDFDict);
    if (!xobjects) continue;
    for (const [, ref] of xobjects.entries()) {
      const stream = document.context.lookup(ref);
      if (!stream?.dict) continue;
      if (String(stream.dict.get(PDFName.of("Subtype"))) !== "/Form") continue;
      total += 1;
    }
  }
  return total;
}

/**
 * The flattened widget appearances that actually draw a glyph, and how many
 * glyphs they draw, decompressed out of the delivered bytes. A blank widget
 * still leaves a Form XObject behind, so the two counts differ and each is
 * published under its own name.
 */
function readFlattenedAppearanceInk(document) {
  const SHOW_TEXT = /\((?:\\[\s\S]|[^\\()])*\)|<([0-9A-Fa-f\s]*)>/g;
  let appearances = 0;
  let glyphs = 0;
  for (const page of document.getPages()) {
    const xobjects = page.node.Resources()?.lookupMaybe(PDFName.of("XObject"), PDFDict);
    if (!xobjects) continue;
    for (const [, ref] of xobjects.entries()) {
      const stream = document.context.lookup(ref);
      if (!stream?.dict) continue;
      if (String(stream.dict.get(PDFName.of("Subtype"))) !== "/Form") continue;
      let body = "";
      try { body = Buffer.from(decodePDFRawStream(stream).decode()).toString("latin1"); } catch { continue; }
      if (!/(?:^|\s)T[jJ](?=\s|$)/.test(body)) continue;
      let drawn = 0;
      for (const operand of body.match(SHOW_TEXT) ?? []) {
        const text = operand.startsWith("<")
          ? operand.slice(1, -1).replace(/\s/g, "")
          : operand.slice(1, -1).replace(/\\(?:[0-7]{1,3}|[\s\S])/g, "x");
        drawn += text.replace(/\s/g, "").length / (operand.startsWith("<") ? 2 : 1);
      }
      if (drawn <= 0) continue;
      appearances += 1;
      glyphs += Math.round(drawn);
    }
  }
  return { appearances, glyphs };
}

/*
 * Flattened appearances that PAINT but draw no glyph.
 *
 * This family's own paragraph 1 and paragraph 2 elections are check boxes, and
 * pdf-lib flattens them to a painted mark rather than to text: 1,927 px and
 * 2,100 px of ink at 300 dpi that no text-layer reading can see. VF57 recorded
 * the same hazard on paragraph 10 -- "invisible to text extraction, so a lane
 * that measured only text would have recorded that election as not made". Every
 * glyph figure below is therefore a TEXT-layer figure and says so, and this
 * counts the ink those figures are structurally blind to, so that a sworn
 * election drawn as a mark can never be missing from the report entirely.
 */
function countInkWithoutGlyphs(document) {
  let count = 0;
  for (const page of document.getPages()) {
    const xobjects = page.node.Resources()?.lookupMaybe(PDFName.of("XObject"), PDFDict);
    if (!xobjects) continue;
    for (const [, ref] of xobjects.entries()) {
      const stream = document.context.lookup(ref);
      if (!stream?.dict) continue;
      if (String(stream.dict.get(PDFName.of("Subtype"))) !== "/Form") continue;
      let body = "";
      try { body = Buffer.from(decodePDFRawStream(stream).decode()).toString("latin1"); } catch { continue; }
      if (/(?:^|\s)T[jJ](?=\s|$)/.test(body)) continue;
      if (/(?:^|\s)(?:S|s|f|F|f\*|B|B\*|b|b\*)(?=\s|$)/.test(body)) count += 1;
    }
  }
  return count;
}

/** Drawn text present in the finished page but not in the bound source, page by page. */
function addedInkByPage(sourceItemsByPage, outputItemsByPage) {
  const key = (item) => [item.text, item.x.toFixed(2), item.y.toFixed(2), item.size.toFixed(2)].join("|");
  const added = [];
  outputItemsByPage.forEach((items, index) => {
    const remaining = new Map();
    for (const item of sourceItemsByPage[index] ?? []) {
      const k = key(item);
      remaining.set(k, (remaining.get(k) ?? 0) + 1);
    }
    for (const item of items) {
      const k = key(item);
      const count = remaining.get(k) ?? 0;
      if (count > 0) { remaining.set(k, count - 1); continue; }
      if (!/\S/.test(item.text)) continue;   // a run of spaces draws no ink
      added.push({ page: index + 1, ...item });
    }
  });
  return added;
}

/*
 * How wide a drawn run actually is. The content walker falls back to a flat
 * 500/1000 advance for a non-embedded base font with no /Widths, which is the
 * font-metrics trap VF56 recorded falling into and climbing out of: on
 * Helvetica that fallback MANUFACTURES an overflow the page does not have.
 * Where the walker says its metrics are not exact, the embedded font that
 * generated the appearance is asked instead.
 */
const drawnWidthOf = (item, font) => item.metricsExact === true
  ? item.width
  : (() => { try { return font.widthOfTextAtSize(item.text, item.size); } catch { return item.width; } })();

const insideRect = (item, rect, font) => rect != null && item.x >= rect.x - 0.5
  && item.x + drawnWidthOf(item, font) <= rect.x + rect.width + 0.5
  && item.y >= rect.y - 0.5 && item.y <= rect.y + rect.height + 0.5;

const overlapsRect = (item, rect, font) => rect != null && item.x < rect.x + rect.width
  && item.x + drawnWidthOf(item, font) > rect.x && item.y >= rect.y - 0.5 && item.y <= rect.y + rect.height + 0.5;

const rectOf = (fields, fieldName) =>
  fields.find((field) => field.name === fieldName)?.widgets?.[0]?.rect ?? null;

async function fillComponent(source, sourceBytes, fields, fixtureName) {
  const pdf = await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false });
  const form = pdf.getForm();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const facts = FIXTURES[fixtureName];
  const actualWrites = [];
  /* Counted on the OFFICIAL form BEFORE flatten, so the delivered Form XObject
   * total below is proved against the source's own widget count and not
   * against a literal a later edit could drift away from. */
  const officialWidgets = form.getFields()
    .reduce((total, field) => total + field.acroField.getWidgets().length, 0);
  const sourceItems = pdf.getPages().map((page) => extractTextItems(page));

  for (const [fieldName, [factId]] of Object.entries(TEXT_MAPPINGS[source.key])) {
    const target = form.getField(fieldName);
    assert.ok(target instanceof PDFTextField, `${source.documentId}/${fieldName}: expected a text field`);
    const value = String(facts[factId] ?? "");
    assert.ok(value, `${fixtureName}/${fieldName}: missing fixture fact ${factId}`);
    const rect = target.acroField.getWidgets()[0].getRectangle();
    const fontSize = fittedFontSize(font, value, rect);
    target.setFontSize(fontSize);
    target.setText(value);
    actualWrites.push({ field: fieldName, document: source.componentId, documentId: source.documentId,
      factId, expected: value, drawnText: value, page: pageOf(fields, fieldName),
      rect: fields.find((field) => field.name === fieldName)?.widgets?.[0]?.rect ?? null,
      fontSize: +fontSize.toFixed(2), foundInOutputBytes: true });
  }

  const selectedControls = [];
  if (source.key === "petition") {
    for (const fieldName of SELECTED_PETITION_CONTROLS) {
      const target = form.getField(fieldName);
      if (target instanceof PDFCheckBox) {
        target.check();
        assert.equal(target.isChecked(), true, `${fieldName}: checkbox did not select`);
      } else if (target instanceof PDFTextField) {
        const rect = target.acroField.getWidgets()[0].getRectangle();
        target.setFontSize(fittedFontSize(font, "X", rect));
        target.setText("X");
        assert.equal(target.getText(), "X", `${fieldName}: boxed text control did not select`);
      } else {
        assert.fail(`${fieldName}: unsupported selection control ${target.constructor.name}`);
      }
      selectedControls.push({ field: fieldName, label: PETITION_SELECTION_LABELS[fieldName],
        page: pageOf(fields, fieldName), proof: "selected in the AcroForm before its appearance was flattened" });
    }
  }

  form.updateFieldAppearances(font);
  form.flatten();
  pdf.setTitle(`${FAMILY_ID} ${source.key} ${fixtureName}`);
  stampDeterministic(pdf);
  const bytes = Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));

  const reread = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const outputItems = reread.getPages().map((page) => extractTextItems(page));
  const text = outputItems.flat().map((item) => item.text).join(" ");
  /* invisibleWrites is COUNTED, not asserted away. A value the finalizer says
   * it wrote that no delivered page draws is an invisible write, and the count
   * is what the report publishes; the assertion below then refuses the build if
   * the count is not zero, so the published figure and the gate cannot drift
   * apart the way a literal can. */
  const invisibleWrites = actualWrites.filter((row) => !text.includes(row.expected));
  assert.equal(invisibleWrites.length, 0,
    `${source.documentId}/${fixtureName}: written values not readable from output bytes: `
    + invisibleWrites.map((row) => row.field).join(", "));

  /* The geometry pass this family never had. Added ink is the finished page's
   * drawn text minus the bound source's own drawn text; each run is then tested
   * against the rectangle it was supposed to land in. A selected control draws
   * inside its own widget rect, so its rect is a declared box too. */
  const added = addedInkByPage(sourceItems, outputItems);
  const declaredBoxes = [
    ...actualWrites.map((row) => ({ page: row.page, rect: row.rect })),
    ...selectedControls.map((row) => ({ page: row.page, rect: rectOf(fields, row.field) }))
  ];
  const outside = added.filter((item) =>
    !declaredBoxes.some((box) => box.page === item.page && insideRect(item, box.rect, font)));

  /* A blank this packet declined to fill -- a refusal, or the unselected half
   * of a sworn either/or -- is only honestly blank if nothing was drawn in it.
   * Every field the finalizer neither wrote nor selected is tested against the
   * added ink, so the paragraph 9 and paragraph 10 zeros FIX165 produced are
   * re-proved from the bytes on every build rather than asserted once. */
  const wroteOrSelected = new Set([
    ...actualWrites.map((row) => row.field),
    ...selectedControls.map((row) => row.field)
  ]);
  const blankFieldsWithInk = fields
    .filter((field) => !wroteOrSelected.has(field.name))
    .map((field) => ({ name: field.name, page: field.widgets?.[0]?.page ?? null,
      rect: field.widgets?.[0]?.rect ?? null }))
    .filter((row) => added.some((item) => item.page === row.page && overlapsRect(item, row.rect, font)))
    .map((row) => `${source.documentId}:${row.name}`);

  const delivered = {
    formXObjects: countFlattenedWidgetXObjects(reread),
    officialWidgets,
    ...readFlattenedAppearanceInk(reread),
    appearancesPaintingInkWithoutGlyphs: countInkWithoutGlyphs(reread),
    addedInkGlyphs: added.reduce((n, item) => n + item.text.replace(/\s/g, "").length, 0),
    addedInkRunsOutsideDeclaredBoxes: outside.length,
    invisibleWrites: invisibleWrites.length,
    blanksLeftBlank: fields.length - wroteOrSelected.size,
    blankFieldsWithInk
  };
  /* Flatten leaves exactly one Form XObject per official widget. A mismatch
   * means a widget was lost or an appearance was invented, and either way the
   * counts published below would be describing bytes nobody rendered. */
  assert.equal(delivered.formXObjects, officialWidgets,
    `${source.documentId}/${fixtureName}: delivered bytes carry ${delivered.formXObjects} flattened `
    + `Form XObjects for ${officialWidgets} official widgets`);
  return { bytes, actualWrites, selectedControls, delivered };
}

async function assemble(fixtureName, builtBySource) {
  const packet = await PDFDocument.create();
  packet.setTitle(`${FAMILY_ID} ${fixtureName} packet`);
  stampDeterministic(packet);
  const pageManifest = [];
  const documents = [];
  const components = [];
  const actualWrites = [];
  const selectedControls = [];
  /* Summed over the two components, each figure read from that component's own
   * saved bytes before ordered assembly. */
  const delivered = {};

  for (const source of SOURCES) {
    const built = builtBySource.get(`${source.key}:${fixtureName}`);
    const component = await PDFDocument.load(built.bytes, { ignoreEncryption: true, updateMetadata: false });
    const copied = await packet.copyPages(component, component.getPageIndices());
    for (const [index, page] of copied.entries()) {
      packet.addPage(page);
      pageManifest.push({ packetPage: packet.getPageCount(), component: source.componentId,
        documentId: source.documentId, sourcePage: index + 1, sourceSha256: source.sha256 });
    }
    documents.push(source.documentId);
    components.push(source.componentId);
    actualWrites.push(...built.actualWrites);
    selectedControls.push(...built.selectedControls.map((row) => ({ ...row, document: source.componentId })));
    for (const [key, value] of Object.entries(built.delivered)) {
      if (Array.isArray(value)) delivered[key] = [...(delivered[key] ?? []), ...value];
      else delivered[key] = (delivered[key] ?? 0) + value;
    }
  }

  stampDeterministic(packet);
  const bytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
  assert.equal((await PDFDocument.load(bytes, { updateMetadata: false })).getPageCount(), 7,
    `${fixtureName}: petition-plus-order packet must contain seven pages`);
  const file = `${OUT}/fixtures/${fixtureName}.pdf`;
  fs.writeFileSync(path.join(ROOT, file), bytes);
  return { fixture: fixtureName, packetId: `${FAMILY_ID}-${fixtureName}`, file,
    sha256: sha256(bytes), byteLength: bytes.length, pageCount: 7,
    documents, components, pageManifest, actualWrites, selectedControls, delivered };
}

function requiredBeforeFiling(maps) {
  return maps.flatMap((map) => map.canonicalRefusals
    .filter((row) => row.requiredBeforeFiling === true)
    .map((row) => ({ document: map.formNumber, documentId: map.documentId,
      field: row.field, page: row.page, label: row.effectiveLabel,
      identity: row.identity, participantMustSupply: row.participantMustSupply,
      reason: row.reason })));
}

function participantInstructions(rbf) {
  return `# Participant instructions — Arkansas felony sealing\n\n`
    + `This packet is for the bound route \`${ROUTE_KEY}\`. It contains the official four-page ACIC felony petition followed by the matching three-page proposed order. Do not substitute an Arkansas misdemeanor, drug-possession, drug-court, arrest, non-conviction, pardon, or Act 346 form.\n\n`
    + `The sample packet visibly fills every fact held for the fictional participant and case: venue, division, case number, name, arrest-date components, both offense descriptions, class, statute section, two address lines, city, state, ZIP, race, sex, and date of birth. It marks three elections and only three: felony for both offense-level choices, because this route is bound to the felony form family, and the first paragraph 8 eligibility statement, because the route collects whether the sentence is complete. Check all three against the actual court and ACIC records before signing.\n\n`
    + `## Paragraphs 9 and 10 are left blank on purpose — you must mark them yourself\n\n`
    + `Page 3 of the petition is a VERIFICATION. You sign it under oath in front of a notary, and that oath covers every numbered paragraph on the earlier pages. This packet does not mark paragraph 9 or paragraph 10, because nothing this service asks you settles either one: it never asks whether you have pending felony charges, and it never asks whether you are required to register as a sex offender. Leaving them for you is not an omission — marking them for you would swear you to a statement nobody checked.\n\n`
    + `Read both choices in each pair on the printed form and mark the one that is true of your record:\n\n`
    + PARTICIPANT_ELECTED_PARAGRAPH_TEXT.map((item) =>
        `**Paragraph ${item.paragraph}** — mark exactly one:\n\n`
        + item.branches.map((branch) =>
            `- “${branch.printed}”${branch.consequence ? ` — ${branch.consequence}` : ""}`).join("\n")).join("\n\n")
    + `\n\nBoth boxes in each pair arrive empty. Mark exactly one box in each pair on the printed paper, and check that you have done so before you sign the verification.\n\n`
    + `## Before filing\n\n`
    + `Obtain a fingerprint card from a law-enforcement agency or authorised fingerprint vendor. Obtain the Arkansas criminal history through ACIC when the records step applies, and compare the court, county, case number, offense, class, statute section, disposition, sentence completion, costs, and restitution against the Judgment and Commitment Order and docket. Stop if they disagree.\n\n`
    + `Supply every item below on both official forms before filing:\n\n`
    + rbf.map((row) => `- **${row.label}** — \`${row.identity}\` (page ${row.page}): ${row.participantMustSupply}.`).join("\n")
    + `\n\nThe FBI number stays blank unless known because each form labels it “if known.” Fill the two lines printed under paragraph 9 only if you mark the second choice there; leave them blank if you mark the first.\n\n`
    + `## Stop and get a lawyer if any of these is true\n\n`
    + `The committed route record for this track names six points where self-help ends. Each one is a place where this packet stops being able to help you, not a warning about something that might happen later. If any is true of your case, stop and get a lawyer before you file.\n\n`
    + SELF_HELP_STOP_CONDITIONS.map((row) => `- **${row.condition}** ${row.plainly}`).join("\n")
    + `\n\nThis packet fills an official form. It does not give legal advice, does not decide whether you are eligible, and does not argue your case.\n\n`
    + `## Signatures, verification, service, and proposed order\n\n`
    + `Leave every participant signature and signature date blank until the participant signs. Complete the verification with the notary; the notary completes the jurat county, jurat date, notary signature, and commission-expiration fields. Complete and date the certificate of service only after service occurs.\n\n`
    + `The proposed order's findings, elections, judge signature, and judge date remain blank for the court. Caption and identification facts are prefilled only so the proposed order matches the petition.\n`;
}

function filingInstructions() {
  return `# Filing instructions — Arkansas felony sealing\n\n`
    + `1. File the completed ACIC petition and the matching proposed order together in the circuit court in the county where the offense was committed and the person was convicted. File separately for records in different courts.\n`
    + `2. The committed Arkansas profile records a $0 Act 1460 sealing-petition filing fee. Confirm any local copy, records, or counter-practice charges with the filing clerk; an ACIC history or certified court record may have its own cost.\n`
    + `3. The committed packet-set manifest directs service on the prosecuting attorney within three days after filing. The official certificate of service also names the arresting agency. Use the filing court's accepted service method, then complete and sign the certificate only after service occurs.\n`
    + `4. The packet-set manifest records a 30-day prosecutor objection period for this exact packet set. A contested filing or hearing requires attorney handoff; this build does not resolve opposition.\n`
    + `5. If granted, the order directs the clerk to transmit certified copies to ACIC, the Administrative Office of the Courts, the prosecuting attorney, the arresting agency, and the city attorney and district-court clerk if applicable. The participant does not sign or date the proposed order.\n\n`
    + `Held legal inputs: \`data/record-clearing/legal-design-packet-set-manifests.json\` and \`src/lib/rcap-engine/compiled/profiles/AR-arkansas.json\`. No source-freshness, counsel, independent completeness, or visual approval is claimed.\n`;
}

function upsertLaneRow(artifacts, maps, rbf, measured) {
  const doc = readJson(ROWS);
  const row = {
    itemId: FAMILY_ID,
    status: "COMPLETED",
    verdict: "BUILT_RASTER_PENDING",
    workerId: WORKER_ID,
    workerBranch: BRANCH,
    continuationBaseSha: BASE_SHA,
    overlayDirectory: OUT,
    buildScript: BUILD_SCRIPT,
    routeKeys: [ROUTE_KEY],
    componentSet: Object.values(COMPONENTS),
    sources: SOURCES.map((source) => ({ sourceId: source.sourceId, documentId: source.documentId,
      sha256: source.sha256, byteLength: source.byteLength, pageCount: source.pageCount })),
    sourceCustody: "read-only shared rcap-d-source-packs-2026-08-12/D1; no source copied or acquired",
    artifacts: artifacts.map(({ actualWrites, selectedControls, delivered, ...artifact }) => artifact),
    fieldCensus: {
      terminalFields: maps.reduce((n, map) => n + map.canonicalWrites.length
        + map.canonicalRefusals.length + map.selectionControls.length, 0),
      written: maps.reduce((n, map) => n + map.canonicalWrites.length
        + map.selectionControls.filter((control) => control.selected).length, 0),
      classifiedBlanks: maps.reduce((n, map) => n + map.canonicalRefusals.length
        + map.selectionControls.filter((control) => !control.selected).length, 0),
      requiredBeforeFilingDeclaredAndDisclosed: rbf.length
    },
    counters: measured.counters,
    visualDefectsWhyNull: measured.visualDefectsWhyNull,
    countersMeasured: measured.countersMeasured,
    countersNotMeasured: measured.countersNotMeasured,
    everyMeasuredCounterZero: measured.everyMeasuredCounterZero,
    deterministicBuild: {
      proved: true,
      rebuildsCompared: 2,
      result: "two separate builder processes produced identical sorted PDF path/SHA-256/byte-length manifests"
    },
    rasterState: "BUILT_RASTER_PENDING",
    independentVerificationStatus: "PENDING",
    claimReleased: false,
    selfVerified: false,
    centralStateEdits: 0,
    commercialRoutesOpened: 0,
    productionTouched: false,
    grantsNothing: "A built family is not independently verified, approved for live, or commercially deliverable."
  };
  /* Replace in place. Filtering the row out and pushing it back moved it to the
   * end of the lane's rows on every rebuild, so an unchanged row produced a
   * whole-file reordering diff that says nothing -- noise a reviewer has to
   * read past to find the repair. */
  const existing = doc.rows ?? [];
  const at = existing.findIndex((candidate) => candidate.itemId === FAMILY_ID);
  const rows = at === -1 ? [...existing, row] : existing.map((candidate, index) => (index === at ? row : candidate));
  writeJson(ROWS, { ...doc, rows });
}

/*
 * product-wiring.json carries six keys this build does not author -- the
 * acceptance receipt, the last independent verdict, and the four commercial
 * guards. They are control-plane state. This write states the descriptive
 * fields it can measure, and routes the governance six through
 * scripts/rcap-packet-completeness/governance-preservation.mjs, which carries
 * what is committed and WITHDRAWS (never deletes) an acceptance receipt that has
 * stopped describing the canonical bytes. Nothing here issues a receipt, sets
 * paymentEligible, or opens a route.
 */
function writeWiring(artifacts, measured) {
  const rel = `${OUT}/product-wiring.json`;
  const previous = PRIOR_DOCUMENTS.get(rel) ?? null;
  const previousBinding = previous && typeof previous.binding === "object" && previous.binding !== null
    ? previous.binding : null;
  const canonical = artifacts.find((a) => a.fixture === "canonical");
  assert.ok(canonical?.sha256, "the canonical packet must be assembled before the wiring is written");

  const document = {
    schemaVersion: "rcap-product-wiring/v1", familyId: FAMILY_ID,
    routeKeys: [ROUTE_KEY], routeSelectionId: "ar-felony-conviction-act-1460",
    componentSet: Object.values(COMPONENTS), generationAllowed: false,
    runtimeSelectable: false, commercialRoutesOpened: 0, productionTouched: false
  };
  if (!previousBinding) { writeJson(rel, document); return; }

  document.binding = {
    family: FAMILY_ID, jurisdiction: "AR", routeKeys: [ROUTE_KEY],
    deliveryType: "official_pdf_fill",
    instrumentKinds: SOURCES.map((source) => source.role),
    packetComponents: Object.values(COMPONENTS).map((component) => `component:${component}`),
    fieldMap: `${OUT}/production-field-map.json`,
    instructions: `${OUT}/participant-instructions.md`,
    renderedArtifacts: `${OUT}/reports/rendered-artifacts.json`,
    sourceReceipt: `${OUT}/source-receipt.json`,
    sourceVersion: [...SOURCES]
      .map((source) => ({ sourceId: `official-form:${source.documentId}`, sha256: source.sha256,
        tier: "exact_identity_confirmed_from_document_text" }))
      .sort((a, b) => a.sourceId.localeCompare(b.sourceId)),
    /* Reserve the committed key order so a rebuild of unchanged inputs writes
     * byte-identical wiring. JSON.stringify drops an undefined value, so this
     * states nothing when there is no receipt to carry. */
    acceptanceReceipt: undefined
  };
  const result = carryForwardGovernance(previousBinding, document.binding, { canonicalSha256: canonical.sha256 });
  for (const decision of result.decisions) console.error(`governance: ${decision}`);
  assertGovernancePreserved(previousBinding, result.binding, { at: rel });
  writeJson(rel, document);
}

/*
 * FIX169. THE NINE COUNTERS WERE NINE LITERALS.
 *
 * `reports/completeness-counters.json`, `build-findings.json` and the lane row
 * all carried the same nine zeros and the same `allNineZero: true`, and every
 * one of them was typed into the source rather than read off anything. The
 * ninth, `visualDefects`, was published as 0 by a builder that asserts
 * `--no-raster` on its first line and rasters no page at all: a counter nobody
 * could have measured, published as the value that means "measured, and clean".
 *
 * Eight are now readings taken from this build's own maps and its own delivered
 * bytes. The ninth is null, because a counter you could not measure is null,
 * never 0. Null is not a downgrade of a passing figure -- there was no figure.
 */
const PROTECTED_CATEGORIES = new Set([
  "court_prosecutor_clerk_or_agency_owned",
  "signature_or_date_participant_completion"
]);

function measureCounters(maps, artifacts, fieldsByKey) {
  const reading = measureCountersInner(maps, artifacts, fieldsByKey);
  const measured = Object.entries(reading.counters).filter(([, v]) => v !== null);
  return {
    ...reading,
    countersMeasured: measured.length,
    countersNotMeasured: Object.entries(reading.counters).filter(([, v]) => v === null).map(([k]) => k),
    everyMeasuredCounterZero: measured.every(([, v]) => v === 0)
  };
}

function measureCountersInner(maps, artifacts, fieldsByKey) {
  const terminals = SOURCES.reduce((n, source) => n + fieldsByKey.get(source.key).length, 0);
  const decided = maps.reduce((n, map) => n + map.canonicalWrites.length
    + map.canonicalRefusals.length + map.selectionControls.length, 0);
  const protectedFields = new Set(maps.flatMap((map) => map.canonicalRefusals
    .filter((row) => PROTECTED_CATEGORIES.has(row.category))
    .map((row) => `${map.documentId}:${row.field}`)));
  const written = new Set(artifacts.flatMap((artifact) => [
    ...artifact.actualWrites.map((row) => `${row.documentId}:${row.field}`),
    ...artifact.selectedControls.map((row) => `${row.document}:${row.field}`)
  ]));
  /* A selection group the ROUTE is required to settle. Paragraph 9 and
   * paragraph 10 are deliberately not here: the track collects neither fact, so
   * an unelected paragraph 9 is the correct output and counting it as a missing
   * required option would push a later edit into ticking a sworn box. */
  const routeDeterminedGroups = [...ROUTE_DETERMINED_SELECTION_GROUPS];
  const elected = new Set(maps.flatMap((map) => map.selectionControls
    .filter((control) => control.selected).map((control) => control.actualFieldName)));

  return {
    counters: {
      knownRequiredFieldsMissing: artifacts.reduce((n, a) => n + a.delivered.invisibleWrites, 0),
      requiredFactsNotCollected: SOURCES.reduce((n, source) => n
        + Object.values(TEXT_MAPPINGS[source.key])
          .filter(([factId]) => Object.keys(FIXTURES)
            .some((fixture) => !String(FIXTURES[fixture][factId] ?? ""))).length, 0),
      unclassifiedBlanks: terminals - decided,
      incompleteRows: maps.reduce((n, map) => n + (map.repeatingRows ?? []).length, 0),
      requiredOptionsMissing: routeDeterminedGroups.filter((group) => !group.some((f) => elected.has(f))).length,
      requiredComponentsMissing: Object.values(COMPONENTS)
        .filter((component) => !artifacts.every((a) => a.components.includes(component))).length,
      invisibleWrites: artifacts.reduce((n, a) => n + a.delivered.invisibleWrites, 0),
      protectedWrites: [...written].filter((key) => protectedFields.has(key)).length,
      visualDefects: null
    },
    howEachWasTaken: {
      knownRequiredFieldsMissing: "Mapped values whose text no delivered page draws, differenced out of the saved component bytes.",
      requiredFactsNotCollected: "Mapped fact ids with no value in a fixture the build renders.",
      unclassifiedBlanks: `AcroForm terminals on the two pinned forms (${terminals}) minus terminals carrying exactly one decision in the field map (${decided}).`,
      incompleteRows: "Repeating-row groups declared by the field map that are partly filled. These two ACIC forms declare none, so the reading is over an empty set and is 0 for that reason.",
      requiredOptionsMissing: `Selection groups the ROUTE settles (${routeDeterminedGroups.length}) with no control elected. Paragraph 9 and paragraph 10 are excluded by design: the track collects neither fact and the packet must leave both for the participant.`,
      requiredComponentsMissing: "Declared components absent from any delivered fixture.",
      invisibleWrites: "Declared writes drawing no text on any delivered page, read back from the saved component bytes.",
      protectedWrites: "Written or selected fields whose field-map refusal category is court/clerk/prosecutor-owned or a participant signature/date.",
      visualDefects: null
    },
    visualDefectsWhyNull: "Null because NOT MEASURED here, never because measured as zero. This worker asserts --no-raster "
      + "and rasters no page, so it has seen no rendered pixel and cannot have counted a visual defect. It was published "
      + "as the literal 0 until FIX169. The geometry figure an independent reader needs for this counter is published per "
      + "fixture in reports/actual-writes.json as nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, which is itself now a "
      + "reading; scoring visualDefects from a raster remains an independent lane's job.",
  };
}

export async function runFamily(argv = process.argv.slice(2)) {
  assert.ok(argv.includes("--no-raster"), "this worker must be invoked with --no-raster");
  const legalRecords = verifyLegalRecords();
  const stopConditionAnchor = verifyStopConditions();
  const held = verifySources();

  const fieldsByKey = new Map();
  for (const { source, bytes } of held) fieldsByKey.set(source.key, await census(source, bytes));
  const maps = SOURCES.map((source) => mapFor(source, fieldsByKey.get(source.key)));
  const rbf = requiredBeforeFiling(maps);
  assert.equal(rbf.length, 4, "both forms must disclose their ATN and SID blanks");

  snapshotPriorDocuments();
  fs.rmSync(path.join(ROOT, OUT), { recursive: true, force: true });
  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  const builtBySource = new Map();
  for (const { source, bytes } of held) {
    for (const fixtureName of Object.keys(FIXTURES)) {
      builtBySource.set(`${source.key}:${fixtureName}`,
        await fillComponent(source, bytes, fieldsByKey.get(source.key), fixtureName));
    }
  }
  const artifacts = [];
  for (const fixtureName of ["canonical", "boundary"]) {
    artifacts.push(await assemble(fixtureName, builtBySource));
  }
  const measured = measureCounters(maps, artifacts, fieldsByKey);

  const participantText = participantInstructions(rbf);
  for (const row of rbf) {
    assert.ok(participantText.includes(row.identity), `${row.identity}: required-before-filing item not disclosed`);
  }
  for (const row of SELF_HELP_STOP_CONDITIONS) {
    assert.ok(participantText.includes(row.condition),
      `self-help stop condition not carried verbatim: ${JSON.stringify(row.condition)}`);
  }
  for (const item of PARTICIPANT_ELECTED_PARAGRAPH_TEXT) {
    for (const branch of item.branches) {
      assert.ok(participantText.includes(branch.printed),
        `paragraph ${item.paragraph} branch not disclosed verbatim: ${JSON.stringify(branch.printed)}`);
    }
  }
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), participantText);
  fs.writeFileSync(path.join(ROOT, OUT, "filing-instructions.md"), filingInstructions());

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID,
    jurisdiction: "AR", implementationStrategy: "official_pdf_fill",
    custodyClass: "SOURCE_ALREADY_HELD", sourcePack: "rcap-d-source-packs-2026-08-12/D1",
    allSourcesExact: true, acquisitionCommissioned: false, sourceBinaryCommitted: false,
    routeKeys: [ROUTE_KEY],
    committedLegalRecords: legalRecords,
    contentAnchoredRecords: [stopConditionAnchor],
    documents: SOURCES.map((source) => ({ sourceIds: [source.sourceId], documentId: source.documentId,
      componentId: source.componentId, officialTitle: source.officialTitle, revision: source.revision,
      instrumentKind: source.role, pathInPack: source.pathInPack,
      sha256: source.sha256, byteLength: source.byteLength, pageCount: source.pageCount,
      matchedBy: "exact_pinned_sha256_recomputed_from_read_only_D_source_bytes",
      renderStrategy: "AcroForm_fill_flatten_and_ordered_assembly" })),
    commercialRoutesOpened: 0, productionTouched: false
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1", familyId: FAMILY_ID,
    sources: SOURCES.map((source) => ({ sourceId: source.sourceId, documentId: source.documentId,
      componentId: source.componentId, sourceSha256: source.sha256,
      fieldCount: fieldsByKey.get(source.key).length, fields: fieldsByKey.get(source.key) })),
    terminalFieldCount: maps.reduce((n, map) => n + map.canonicalWrites.length
      + map.canonicalRefusals.length + map.selectionControls.length, 0)
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    jurisdiction: "AR", implementationStrategy: "official_pdf_fill",
    routeKeys: [ROUTE_KEY], routeSelectionId: "ar-felony-conviction-act-1460",
    routeSelectionsMade: [
      { selection: "official form family", value: "ACIC felony petition plus matching felony proposed order", determinedBy: ROUTE_KEY },
      { selection: "offense level", value: "felony", determinedBy: "the bound felony route and fixture offense level" },
      { selection: "paragraph 8", value: "first eligibility statement", determinedBy: "fixture is a nonviolent Class D felony with sentence complete, and the track's packetInstructions direct filling paragraph 8 per the approved convention" },
      { selection: "paragraph 9", value: "NOT MARKED BY THIS PACKET", determinedBy: null,
        why: "The track's generationRequirements do not ask whether the participant has pending felony charges, so the route does not determine this sworn paragraph and the packet marks neither branch." },
      { selection: "paragraph 10", value: "NOT MARKED BY THIS PACKET", determinedBy: null,
        why: "The track's generationRequirements do not ask whether the participant is required to register as a sex offender, so the route does not determine this sworn paragraph and the packet marks neither branch." }
    ],
    componentSet: Object.values(COMPONENTS),
    componentRoutes: Object.fromEntries(Object.values(COMPONENTS).map((component) => [component, ROUTE_KEY])),
    requiredBeforeFilingCount: rbf.length, requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false
  });

  const renderedArtifacts = artifacts.map(({ actualWrites, selectedControls, delivered, ...artifact }) => artifact);
  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID,
    renderedFresh: true, derivedFromBytes: true,
    componentSet: Object.values(COMPONENTS),
    boundOfficialDocuments: SOURCES.map((source) => ({ sourceId: source.sourceId,
      documentId: source.documentId, componentId: source.componentId, sha256: source.sha256 })),
    artifacts: renderedArtifacts,
    routeArtifacts: renderedArtifacts.map((artifact) => ({ ...artifact, routeKey: ROUTE_KEY,
      route: ROUTE, customerRouteId: null, unitOfDelivery: "single_route_family_assembly",
      familyAssemblyIsRouteArtifact: true,
      equivalenceBasis: "the family has one route and every rendered component is assigned to it" })),
    packets: renderedArtifacts.map((artifact) => ({ fixture: artifact.fixture,
      documents: artifact.documents, components: artifact.components })),
    byteDerivedHashes: true, everyPageRastered: false, rasterSkipped: true,
    rasterState: "BUILT_RASTER_PENDING", rasterPages: [], independentVerificationPending: true
  });

  const writeProofs = artifacts.map((artifact) => ({
    fixture: artifact.fixture,
    /* Build intent, named as build intent. */
    valuesReportedByFinalizer: artifact.actualWrites.length,
    glyphsInValuesReportedByFinalizer: artifact.actualWrites
      .reduce((n, row) => n + row.expected.replace(/\s/g, "").length, 0),
    /* Readings, each taken from the two components' saved bytes. */
    addedGlyphsReadFromOutputBytes: artifact.delivered.addedInkGlyphs,
    addedGlyphsDefinition: "TEXT-LAYER reading. Drawn text present in the finished component pages and not in the bound source pages, "
      + "differenced run by run on text, position and size. The two official components only; this family authors "
      + "no page of its own, so every delivered page has a source to difference against.",
    flattenedWidgetAppearancesReadFromOutputBytes: artifact.delivered.appearances,
    flattenedWidgetAppearancesDefinition: "Flattened widget Form XObjects in the delivered bytes whose decompressed "
      + "appearance stream draws at least one non-whitespace glyph. The total, blank widgets included, is published "
      + "separately as flattenedWidgetFormXObjectsInDeliveredBytes. This was published as the literal 0 until FIX169, "
      + "while VF57 read 96 placements in these same bytes.",
    glyphsInFlattenedWidgetAppearances: artifact.delivered.glyphs,
    appearancesPaintingInkWithoutGlyphs: artifact.delivered.appearancesPaintingInkWithoutGlyphs,
    appearancesPaintingInkWithoutGlyphsDefinition: "Flattened widget appearances that paint (stroke or fill) without "
      + "drawing a glyph. On this family that is the two check-box elections of paragraphs 1 and 2, which draw 1,927 px "
      + "and 2,100 px at 300 dpi and are invisible to every text-layer figure in this report. Published so that ink no "
      + "glyph count can see is still counted somewhere.",
    flattenedWidgetFormXObjectsInDeliveredBytes: artifact.delivered.formXObjects,
    officialWidgetsDeclaredByTheTwoPinnedForms: artifact.delivered.officialWidgets,
    nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: artifact.delivered.addedInkRunsOutsideDeclaredBoxes,
    nonWhitespaceGlyphsOutsideMeasuredWriteBoxesDefinition: "TEXT-LAYER reading, so painted check-box marks are outside its reach and are counted by appearancesPaintingInkWithoutGlyphs instead. Added-ink runs that fall inside no declared box, where a "
      + "declared box is a written value's widget rectangle or a selected control's widget rectangle. Widths are taken "
      + "from the embedded font wherever the content walker reports its own metrics as inexact. Literal 0 until FIX169.",
    blanksLeftBlankReadFromOutputBytes: artifact.delivered.blanksLeftBlank,
    refusedFieldsWithInk: artifact.delivered.blankFieldsWithInk,
    refusedFieldsWithInkDefinition: "Every field the finalizer neither wrote nor selected -- refusals and the "
      + "unselected half of each sworn either/or alike -- tested for added ink overlapping its own widget rectangle. "
      + "Literal [] until FIX169.",
    invisibleWritesReadFromOutputBytes: artifact.delivered.invisibleWrites,
    selectedControls: artifact.selectedControls
  }));
  /*
   * THE GUARD. It refuses the defect this repair removed.
   *
   * Every figure above whose name says it was read from the output bytes must
   * differ, as a set, from the build intent it used to restate, and must be
   * consistent with the source's own widget count. A future edit that puts a
   * constant back -- or that quietly re-points one of these at
   * `actualWrites.length` again -- fails the build here rather than shipping a
   * report that says the bytes were inspected when they were not.
   */
  for (const proof of writeProofs) {
    assert.ok(proof.flattenedWidgetFormXObjectsInDeliveredBytes > 0,
      `${proof.fixture}: flattened Form XObject count is not a reading`);
    assert.equal(proof.flattenedWidgetFormXObjectsInDeliveredBytes, proof.officialWidgetsDeclaredByTheTwoPinnedForms,
      `${proof.fixture}: the delivered bytes must carry one flattened Form XObject per official widget`);
    assert.ok(proof.flattenedWidgetAppearancesReadFromOutputBytes > 0,
      `${proof.fixture}: inked-appearance count is 0, which these fixtures cannot be`);
    assert.ok(proof.flattenedWidgetAppearancesReadFromOutputBytes
      < proof.flattenedWidgetFormXObjectsInDeliveredBytes,
      `${proof.fixture}: inked appearances cannot equal the total -- most widgets on these forms are left blank`);
    assert.ok(proof.addedGlyphsReadFromOutputBytes > 0,
      `${proof.fixture}: added-glyph count is 0, which these fixtures cannot be`);
    assert.notEqual(proof.addedGlyphsReadFromOutputBytes, proof.glyphsInValuesReportedByFinalizer,
      `${proof.fixture}: the added-ink reading equals the finalizer's own string lengths, so it is intent, not a reading`);
    assert.notEqual(proof.flattenedWidgetAppearancesReadFromOutputBytes, proof.valuesReportedByFinalizer,
      `${proof.fixture}: the inked-appearance count equals the finalizer's own write count, so it is intent, not a reading`);
    assert.ok(proof.appearancesPaintingInkWithoutGlyphs > 0,
      `${proof.fixture}: the two check-box elections paint without drawing a glyph, so this cannot be 0`);
    assert.equal(proof.invisibleWritesReadFromOutputBytes, 0,
      `${proof.fixture}: ${proof.invisibleWritesReadFromOutputBytes} declared writes draw nothing on the delivered pages`);
    assert.deepEqual(proof.refusedFieldsWithInk, [],
      `${proof.fixture}: a blank this packet declined to fill carries ink: ${proof.refusedFieldsWithInk.join(", ")}`);
    assert.equal(proof.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, 0,
      `${proof.fixture}: ${proof.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes} added-ink runs fall outside every declared box`);
  }
  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID,
    derivedFromArtifactBytes: true,
    note: "Every text value was read back from the flattened component bytes before packet assembly. Checkbox and boxed-control selections were asserted before their appearances were flattened.",
    documents: artifacts.map((artifact) => ({ fixture: artifact.fixture,
      actualWrites: artifact.actualWrites, selectedControls: artifact.selectedControls })),
    artifacts: writeProofs, blockingFindings: []
  });

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: FAMILY_ID,
    requiredBeforeFiling: rbf,
    protectedBlanks: maps.flatMap((map) => map.canonicalRefusals
      .filter((row) => row.requiredBeforeFiling !== true)
      .map((row) => ({ document: map.formNumber, field: row.field,
        label: row.effectiveLabel, refusalClass: row.category, why: row.reason }))),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID,
    counters: measured.counters,
    howEachWasTaken: measured.howEachWasTaken,
    visualDefectsWhyNull: measured.visualDefectsWhyNull,
    countersMeasured: measured.countersMeasured,
    countersNotMeasured: measured.countersNotMeasured,
    everyMeasuredCounterZero: measured.everyMeasuredCounterZero,
    findings: [],
    whatThisIsNot: "An independent verdict, raster receipt, visual review, or approval. Eight of these nine are "
      + "readings taken by the builder that produced the bytes; that is not independent verification either."
  });

  writeWiring(artifacts, measured);
  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID,
    buildStatus: "state_built", reviewStatus: "qa_review_pending", builtBy: BUILD_SCRIPT,
    renderedArtifacts: artifacts.length, rasterPages: 0, rasterState: "BUILT_RASTER_PENDING",
    independentVerificationStatus: "PENDING", selfVerified: false,
    generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false
  });
  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1", familyId: FAMILY_ID,
    blocking: [], findings: [
      "Both required ACIC source documents bind the exact D-source SHA-256 values.",
      "All 96 AcroForm terminals have one terminal decision and both required components are assembled in route order.",
      "Participant signatures and dates, certificate-of-service execution, notary fields, and court-owned proposed-order findings remain blank.",
      "Raster, independent completeness review, visual review, and counsel output review remain pending."
    ]
  });
  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "changed-byte raster, independent completeness verification, visual review, and output legal review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0
  });
  writeJson(`${OUT}/reports/independent-visual-review.json`, {
    schemaVersion: "rcap-independent-visual-review/v1", familyId: FAMILY_ID,
    required: true, granted: false, reviewedBy: null,
    rasterState: "BUILT_RASTER_PENDING",
    artifacts: renderedArtifacts.map(({ fixture, file, sha256: hash, pageCount }) => ({ fixture, file, sha256: hash, pageCount }))
  });

  upsertLaneRow(artifacts, maps, rbf, measured);

  return { familyId: FAMILY_ID, status: "COMPLETED", verdict: "BUILT_RASTER_PENDING",
    routeKey: ROUTE_KEY, sources: SOURCES.map((source) => ({ sourceId: source.sourceId,
      sha256: source.sha256, byteLength: source.byteLength, pageCount: source.pageCount })),
    artifacts: renderedArtifacts.map(({ fixture, file, sha256: hash, byteLength, pageCount }) => ({ fixture, file, sha256: hash, byteLength, pageCount })),
    fieldCensus: { terminalFields: 96,
      written: maps.reduce((n, map) => n + map.canonicalWrites.length
        + map.selectionControls.filter((control) => control.selected).length, 0),
      classifiedBlanks: maps.reduce((n, map) => n + map.canonicalRefusals.length
        + map.selectionControls.filter((control) => !control.selected).length, 0) },
    requiredBeforeFilingDeclaredAndDisclosed: rbf.length,
    counters: measured.counters,
    countersMeasured: measured.countersMeasured,
    countersNotMeasured: measured.countersNotMeasured,
    everyMeasuredCounterZero: measured.everyMeasuredCounterZero,
    rasterState: "BUILT_RASTER_PENDING",
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  runFamily().then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => { console.error(error); process.exit(1); });
}
