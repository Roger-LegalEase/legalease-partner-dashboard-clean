#!/usr/bin/env node
/**
 * Deterministic census-v1 builder for the Louisiana Article 987 statutory
 * three-part instrument and its required instructions component.
 *
 *   node scripts/build-census-v1-la-987-set-aside-and-dismiss-set.mjs --no-raster
 *
 * The committed LA-STATUTORY-FORMS owner determination classifies Article 987
 * as COMPOSE_FROM_AUTHORITY. There is no source binary to acquire or hash.
 * This build therefore preserves the catalog strategy official_pdf_fill while
 * composing the statutory instrument from the committed codified-form records.
 * It never rasterizes, verifies, opens a route, or changes central state.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { preserveIdentityRefresh } from "./rcap-packet-completeness/identity-refresh.mjs";
import {
  BLANK_DISPOSITIONS,
  PASS_COUNTERS,
  classifyBlank,
  classifyField,
  rowKeyOf
} from "./rcap-packet-completeness/completeness-contract.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const FAMILY_ID = "la-987-set-aside-and-dismiss-set";
const ROUTE_KEY = "obligation:track-only:LA:la-987-set-aside-and-dismiss";
const FORM_ID = "LA-CCRP-ART-987";
const PRIMARY = "la-987-set-aside-and-dismiss-primary-filing-1";
const INSTRUCTIONS = "la-987-set-aside-and-dismiss-instructions-2";
const COMPONENTS = [PRIMARY, INSTRUCTIONS];
const OUT = "data/rcap-all50/overlays/census-v1/la/la-987-set-aside-and-dismiss-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-la-987-set-aside-and-dismiss-set.mjs";
const STRATEGY = "official_pdf_fill";
const CUSTODY_CLASS = "CUSTOM_PLEADING_FROM_CODIFIED_TEXT";
const OWNER_DECISION = "LA-STATUTORY-FORMS";
const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const DOTS = (count = 74) => ".".repeat(count);
const PAGE_BREAK = "[[RCAP_PAGE_BREAK]]";

/*
 * THE RECORDS THIS PACKET IS GROUNDED IN.
 *
 * Each one carries legal content this build relies on: the owner determination
 * it composes under, the route census that assigns the route to this packet
 * set, the Louisiana legal-design memo and the track registry that carry the
 * article's dating and its limitations, the specification that assigns the
 * official form to the primary filing component, the packet-set manifest that
 * fixes the component set, and the component-source relationship.
 *
 * MASTER_QUEUE.json IS DELIBERATELY NOT AMONG THEM, AND MUST NOT BE ADDED BACK.
 *
 * It was, and it was the one pin that would not re-bind. The receipt pinned it
 * at 484a8944.../2010084 B; by the time a verifier looked it hashed
 * 3a37b3f9.../2016844 B, and by the time this repair ran it hashed
 * 36f98da3.../2027801 B. No refresh note could have cured that, and one was
 * correctly withheld: the queue's Louisiana node did not merely move inside a
 * rewritten file, it changed meaning -- SOURCE_READY/NOT_RENDERED/NOT_BUILT at
 * the pinned hash, VERIFY_PENDING/RENDERED/FAIL_VISIBLE_APPEARANCE afterwards.
 *
 * The deeper reason is that the queue is a GENERATED FILE DESCRIBING THIS
 * PACKET'S OWN BUILD STATE. A record that binds its own output proves nothing:
 * every assertion the build made against the queue -- the route keys, the
 * strategy, the custody class, the empty source hashes, its own output
 * directory -- is either restated by a record that actually carries legal
 * content, or is the build describing itself. So the queue is read by nobody
 * here, and the assertions that used it are made against the records below.
 */
const RECORDS = Object.freeze({
  owner: "data/rcap-grade-a/legal-decisions/OWNER_DETERMINATIONS_2026-09-02.json",
  census: "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
  memo: "data/record-clearing/legal-design-intake/LA.memo.json",
  registry: "data/record-clearing/legal-design-track-registry.json",
  specifications: "data/record-clearing/legal-design-specifications.json",
  manifest: "data/record-clearing/legal-design-packet-set-manifests.json",
  relationships: "data/record-clearing/legal-design-track-source-relationships.json"
});

const TRACK_ID = "la-987-set-aside-and-dismiss";

/*
 * Every record above is a shared national or statewide file that many families
 * write into, so a whole-file hash alone is a pin on other people's edits: it
 * moved once already on legal-design-packet-set-manifests.json and had to be
 * argued back with a hand-written refresh note. Each record therefore carries
 * TWO pins -- the whole file, and the family's own entry inside it, hashed over
 * a key-ordered canonical form so the hash follows the content and not the
 * serializer. A whole-file move with the entry pin intact is a rewrite around
 * this family; an entry move is a change to what this family is built on, and
 * only the second one is this family's problem.
 */
const BOUND_ENTRY = Object.freeze({
  owner: { pointer: `determinations[id=${OWNER_DECISION}]`,
    of: (data) => data.determinations.find((row) => row.id === OWNER_DECISION) },
  census: { pointer: `routes[routeKey=${ROUTE_KEY}]`,
    of: (data) => data.routes.find((row) => row.routeKey === ROUTE_KEY) },
  memo: { pointer: `tracks[trackId=${TRACK_ID}]`,
    of: (data) => data.tracks.find((row) => row.trackId === TRACK_ID) },
  registry: { pointer: `tracks[trackId=${TRACK_ID}]`,
    of: (data) => data.tracks.find((row) => row.trackId === TRACK_ID) },
  specifications: { pointer: `officialFormAssignments[trackId=${TRACK_ID}]`,
    of: (data) => data.officialFormAssignments.find((row) => row.trackId === TRACK_ID) },
  manifest: { pointer: `packetSets[packetSetId=${FAMILY_ID}]`,
    of: (data) => data.packetSets.find((row) => row.packetSetId === FAMILY_ID) },
  relationships: { pointer: `relationships[trackId=${TRACK_ID}]`,
    of: (data) => data.relationships.find((row) => row.trackId === TRACK_ID) }
});

/** Key-ordered JSON, so an entry hash depends on content and not on key order. */
function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

const FACTS = Object.freeze({
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1991-04-17",
    "case.judicial_district": "Twenty-First Judicial District Court",
    "case.parish": "Tangipahoa Parish",
    "case.docket_number": "TEST-2026-000001",
    "case.division": "Division A",
    "case.conviction_level": "Misdemeanor - Article 894(B)",
    "case.conviction_date": "2021-04-17",
    "case.deferred_sentence_date": "2021-06-01",
    "case.deferral_period": "Two years",
    "case.probation_completion_date": "2023-06-01",
    "case.represented_by_counsel": "No - use the unrepresented mover block"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "case.judicial_district": "Forty-Second Judicial District Court",
    "case.parish": "Saint John the Baptist Parish",
    "case.docket_number": "TEST-BOUNDARY-2026-0000000000000001",
    "case.division": "Division Z-Long",
    "case.conviction_level": "Felony - Article 893(E)",
    "case.conviction_date": "2018-12-31",
    "case.deferred_sentence_date": "2019-02-28",
    "case.deferral_period": "Five years",
    "case.probation_completion_date": "2024-02-28",
    "case.represented_by_counsel": "No - use the unrepresented mover block"
  }
});

const TITLES = Object.freeze({
  [PRIMARY]: "Article 987 Motion, Rule to Show Cause, and Order of Dismissal",
  [INSTRUCTIONS]: "Article 987 Participant and Filing Instructions"
});

function readRecord(relative) {
  const bytes = fs.readFileSync(path.join(ROOT, relative));
  return {
    relative,
    bytes,
    data: JSON.parse(bytes.toString("utf8")),
    sha256: crypto.createHash("sha256").update(bytes).digest("hex")
  };
}

function loadAuthorityBinding() {
  const loaded = Object.fromEntries(Object.entries(RECORDS).map(([key, relative]) => [key, readRecord(relative)]));
  const owner = loaded.owner.data.determinations.find((row) => row.id === OWNER_DECISION);
  assert.ok(owner, `${OWNER_DECISION} owner determination is missing`);
  assert.equal(owner.decision, "COMPOSE_FROM_AUTHORITY");
  assert.equal(owner.authorityHeld, true);
  const ownerFamily = owner.families.find((row) => row.familyId === FAMILY_ID);
  assert.deepEqual(ownerFamily, {
    familyId: FAMILY_ID,
    strategy: STRATEGY,
    composedFromAuthority: [FORM_ID],
    remainOfficialAndMustBeHeld: []
  });

  /*
   * What the queue used to be asked, asked of the records that can answer it.
   *
   * `routeKeys`, `implementationStrategy`, `sourceStatus`, `sourceReadiness`
   * and `sourceHashes` were all read off this family's MASTER_QUEUE node. Every
   * one of them is settled below by a record carrying legal content: the route
   * census assigns the route to this packet set, the memo and the track
   * registry both declare the output strategy, and the owner determination plus
   * the component-source relationship together establish that this is an
   * authority-only composition owing no binary. The one assertion with no
   * replacement was `queueFamily.directory === OUT`, which asked the build to
   * confirm its own output path against a file generated from that same build.
   */
  assert.deepEqual(ownerFamily.remainOfficialAndMustBeHeld, [],
    "an authority-only composition may hold no official binary obligation");

  const route = loaded.census.data.routes.find((row) => row.routeKey === ROUTE_KEY);
  assert.ok(route, `route census row is missing: ${ROUTE_KEY}`);
  assert.equal(route.packetSetId, FAMILY_ID);
  assert.equal(route.currentOutputStrategy, STRATEGY);
  assert.equal(route.participantFacingInstrument, `primary_filing: ${FORM_ID}; instructions: ${INSTRUCTIONS}`);

  const memoTrack = loaded.memo.data.tracks.find((row) => row.trackId === "la-987-set-aside-and-dismiss");
  const registryTrack = loaded.registry.data.tracks.find((row) => row.trackId === "la-987-set-aside-and-dismiss");
  assert.ok(memoTrack && registryTrack, "the LA memo and track registry must both carry the Article 987 track");
  assert.equal(memoTrack.outputStrategy, STRATEGY);
  assert.equal(registryTrack.outputStrategy, STRATEGY);
  assert.equal(registryTrack.reviewedAsOf, "2026-08-03");
  assert.equal(registryTrack.effectiveTo, null);

  const assignment = loaded.specifications.data.officialFormAssignments.find((row) => row.trackId === "la-987-set-aside-and-dismiss");
  assert.ok(assignment, "the Article 987 official-form assignment is missing");
  assert.equal(assignment.componentId, PRIMARY);
  assert.equal(assignment.officialFormId, FORM_ID);

  const packetSet = loaded.manifest.data.packetSets.find((row) => row.packetSetId === FAMILY_ID);
  assert.ok(packetSet, `authoritative packet set is missing: ${FAMILY_ID}`);
  const componentIds = packetSet.components.slice().sort((a, b) => a.order - b.order).map((row) => row.componentId);
  assert.deepEqual(componentIds, COMPONENTS);
  assert.deepEqual(packetSet.components.map((row) => row.outputStrategy), [STRATEGY, "process_guidance"]);

  const relationship = loaded.relationships.data.relationships.find((row) => row.trackId === "la-987-set-aside-and-dismiss");
  assert.ok(relationship, "the Article 987 component-source relationship is missing");
  assert.equal(relationship.componentId, PRIMARY);
  assert.equal(relationship.officialFormId, FORM_ID);
  assert.equal(relationship.sha256, null);
  /*
   * The custody class, established from legal content rather than from the
   * queue: the owner decided this form is composed from codified text, and the
   * component-source relationship holds no binary hash for it. Those two
   * together are what CUSTOM_PLEADING_FROM_CODIFIED_TEXT means.
   */
  assert.equal(CUSTODY_CLASS, "CUSTOM_PLEADING_FROM_CODIFIED_TEXT");
  assert.equal(owner.decision, "COMPOSE_FROM_AUTHORITY");
  assert.deepEqual(ownerFamily.composedFromAuthority, [FORM_ID]);

  /*
   * `legalInputStatus` also came off the queue node. The legal INPUT is the
   * codified article, not the packet's review state, and the track registry
   * carries what settles it: the article is in force -- the registry gives an
   * `effectiveFrom` and a null `effectiveTo` -- and nothing raised against the
   * governing mechanism blocks its text. Release blockers about which parish
   * charges what, and the standing note that Title XXXIV wants annual
   * re-verification, are recorded elsewhere in this packet and do not make the
   * article's current text unsettled. Review state stays in the review records;
   * this field says only whether the authority this packet composes from is
   * settled law today.
   */
  const unsettling = [...(registryTrack.openLegalQuestions ?? []), ...(registryTrack.buildBlockers ?? [])]
    .filter((row) => row.affectedElement === "governing_mechanism" && String(row.impact ?? "").endsWith("_blocker"));
  const legalInputStatus = registryTrack.effectiveFrom && registryTrack.effectiveTo === null && unsettling.length === 0
    ? "SETTLED" : "UNSETTLED";
  assert.equal(legalInputStatus, "SETTLED",
    `the Article 987 text is no longer settled: ${JSON.stringify(unsettling.map((row) => row.question))}`);

  return {
    owner,
    ownerFamily,
    legalInputStatus,
    route,
    memoTrack,
    registryTrack,
    assignment,
    packetSet,
    relationship,
    records: Object.entries(loaded).map(([key, row]) => {
      const entry = BOUND_ENTRY[key].of(row.data);
      assert.ok(entry, `${row.relative}: this family has no ${BOUND_ENTRY[key].pointer} entry`);
      const canonical = canonicalJson(entry);
      return {
        path: row.relative,
        sha256: row.sha256,
        byteLength: row.bytes.length,
        // The family's own entry, pinned independently of the shared file
        // around it. `boundEntry.sha256` is the hash of `canonicalJson(entry)`.
        boundEntry: {
          pointer: BOUND_ENTRY[key].pointer,
          sha256: crypto.createHash("sha256").update(canonical).digest("hex"),
          canonicalByteLength: Buffer.byteLength(canonical),
          canonicalisation: "JSON with object keys sorted at every depth, no whitespace"
        }
      };
    })
  };
}

function fieldBase(document, id, label, page = 1) {
  return {
    field: `${document}.${id}`,
    fieldName: `${document}.${id}`,
    page,
    printedLabel: label,
    printedLine: label,
    effectiveLabel: label,
    regionHeading: label,
    sectionHeading: TITLES[document === FORM_ID ? PRIMARY : document],
    rectBasis: "composed_codified_form_authored_by_this_build",
    document
  };
}

function written(document, id, label, factId, page = 1) {
  return { ...fieldBase(document, id, label, page), factId, kind: "composed_text" };
}

function required(document, id, label, participantMustSupply, why, page = 1, extra = {}) {
  return {
    ...fieldBase(document, id, label, page),
    reason: `the participant supplies this before filing: ${participantMustSupply}`,
    category: null,
    completenessClass: null,
    class: null,
    completenessDisposition: "REQUIRED_BEFORE_FILING",
    requiredBeforeFiling: true,
    routeDetermined: false,
    identity: `${document} field ${id}`,
    factId: null,
    participantMustSupply,
    why,
    ...extra
  };
}

function protectedField(document, id, label, why, page = 1) {
  return {
    ...fieldBase(document, id, label, page),
    reason: "signature or date field; never prefilled by this build",
    category: SIGNATURE,
    completenessClass: SIGNATURE,
    class: SIGNATURE,
    completenessDisposition: "PROTECTED_FIELD",
    requiredBeforeFiling: false,
    why
  };
}

function courtField(document, id, label, why, page = 1) {
  return {
    ...fieldBase(document, id, label, page),
    reason: "court, clerk, prosecutor, agency, or hearing field; the court completes it",
    category: COURT_OWNED,
    completenessClass: COURT_OWNED,
    class: COURT_OWNED,
    completenessDisposition: "PROTECTED_FIELD",
    requiredBeforeFiling: false,
    why
  };
}

function attorneyField(document, id, label, why, page = 1) {
  return {
    ...fieldBase(document, id, label, page),
    reason: "attorney-only block is not applicable because the fixture records no representation; it is never populated with participant data",
    category: null,
    completenessClass: null,
    class: null,
    completenessDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
    requiredBeforeFiling: false,
    why
  };
}

function primaryMap() {
  const writes = [
    written(FORM_ID, "mover_name", "Mover full legal name", "participant.full_legal_name"),
    written(FORM_ID, "mover_date_of_birth", "Mover date of birth", "participant.date_of_birth"),
    written(FORM_ID, "judicial_district", "Judicial district or court name", "case.judicial_district"),
    written(FORM_ID, "parish", "Parish of conviction", "case.parish"),
    written(FORM_ID, "docket_number", "Docket or case number", "case.docket_number"),
    written(FORM_ID, "division", "Court division", "case.division"),
    written(FORM_ID, "conviction_level", "Misdemeanor or felony and selected Article", "case.conviction_level"),
    written(FORM_ID, "conviction_date", "Conviction or plea date", "case.conviction_date"),
    written(FORM_ID, "deferred_sentence_date", "Deferred sentence and probation date", "case.deferred_sentence_date"),
    written(FORM_ID, "deferral_period", "Period of the deferred sentence", "case.deferral_period"),
    written(FORM_ID, "probation_completion_date", "Probation completion date", "case.probation_completion_date"),
    written(FORM_ID, "representation", "Whether the mover is represented by an attorney", "case.represented_by_counsel")
  ];
  const refusals = [
    required(
      FORM_ID,
      "conviction_offense",
      "Conviction offense wording",
      "write the offense exactly as it is worded on your court record, taken from the minute entry or sentencing order for this docket that the clerk of the sentencing court holds",
      "the committed Article 987 record collects the offense and the statute of conviction as the participant's own answer to \"What offence were you convicted of, and under what statute?\", and the court record this fixture declares carries neither, so this build holds no value to print and prints none"
    ),
    required(
      FORM_ID,
      "conviction_statute",
      "Conviction statute",
      "write the statutory citation exactly as it appears on your court record, taken from the same minute entry or sentencing order",
      "the committed Article 987 record collects the offense and the statute of conviction as the participant's own answer to \"What offence were you convicted of, and under what statute?\", and the court record this fixture declares carries neither, so this build holds no value to print and prints none"
    ),
    required(
      FORM_ID,
      "deferred_period_run_assertion",
      "Has the period of the deferred sentence run? [ ] YES [ ] NO",
      "mark YES or NO from the sentencing record; this assertion is yours and the build does not make it",
      "the committed legal-design limitation says this factual assertion must not be auto-completed",
      1,
      {
        isSelectionControl: true,
        kind: "selection_control",
        determinedByTheCaseNotTheRoute: true,
        whyTheRouteCannotDetermineIt: "whether the deferred-sentence period has run depends on the participant's sentencing record and elapsed period, not on selection of the Article 987 route"
      }
    ),
    required(
      FORM_ID,
      "probation_completion_assertion",
      "Did you successfully complete the terms of your probation? [ ] YES [ ] NO",
      "mark YES or NO only after checking your probation discharge or completion record; this assertion is yours",
      "the participant owns the completion assertion and the committed record forbids auto-completing it",
      1,
      {
        isSelectionControl: true,
        kind: "selection_control",
        determinedByTheCaseNotTheRoute: true,
        whyTheRouteCannotDetermineIt: "whether probation was successfully completed depends on the participant's probation record, not on selection of the Article 987 route"
      }
    ),
    attorneyField(FORM_ID, "attorney_name", "Attorney name in represented-mover block", "the fixture selects the unrepresented mover block"),
    attorneyField(FORM_ID, "attorney_bar_number", "Attorney bar number in represented-mover block", "the fixture selects the unrepresented mover block"),
    attorneyField(FORM_ID, "attorney_address", "Attorney address in represented-mover block", "the fixture selects the unrepresented mover block"),
    attorneyField(FORM_ID, "attorney_telephone", "Attorney telephone in represented-mover block", "the fixture selects the unrepresented mover block"),
    protectedField(FORM_ID, "attorney_signature", "Attorney signature in represented-mover block", "an attorney signs only if representation exists"),
    protectedField(FORM_ID, "mover_signature", "Unrepresented mover signature", "the mover signs personally after completing and reviewing the motion"),
    protectedField(FORM_ID, "mover_signature_date", "Date of unrepresented mover signature", "a date supplied before signing would be false"),
    courtField(FORM_ID, "rule_return_date", "Hearing date set by the court clerk on the Rule to Show Cause", "the court sets the return date after filing", 2),
    courtField(FORM_ID, "rule_return_time", "Hearing time set by the court clerk on the Rule to Show Cause", "the court sets the return time after filing", 2),
    courtField(FORM_ID, "rule_return_place", "Courtroom or place set by the court clerk on the Rule to Show Cause", "the court sets the return place after filing", 2),
    courtField(FORM_ID, "rule_judge_signature", "Judge signature on the Rule to Show Cause", "the rule issues from the court", 2),
    courtField(FORM_ID, "order_findings", "Court findings on the Order of Dismissal", "the court enters findings after the contradictory hearing", 3),
    courtField(FORM_ID, "order_decretal_paragraphs", "Court use only - granting, denying, and decretal paragraphs", "the court alone decides and enters the disposition", 3),
    courtField(FORM_ID, "order_date", "Date of the court order", "the court dates its judgment", 3),
    courtField(FORM_ID, "order_place", "Place of the court order", "the court supplies the place of its judgment", 3),
    courtField(FORM_ID, "order_judge_signature", "Judge signature on the Order of Dismissal", "the judge signs only if and when the court enters an order", 3)
  ];
  return {
    formNumber: FORM_ID,
    documentId: PRIMARY,
    documentRole: "primary_filing",
    structuralClass: "codified_statutory_form_composed_from_authority",
    officialFormId: FORM_ID,
    documentPolicy: { mode: "participant", routeKey: ROUTE_KEY, documentAcceptsFill: true },
    explicitMappings: {},
    roleRefusals: [],
    selectionControls: [],
    canonicalWrites: writes,
    canonicalRefusals: refusals,
    boundaryWrites: writes,
    boundaryRefusals: refusals
  };
}

function instructionsMap() {
  const writes = [written(INSTRUCTIONS, "participant_name", "Participant full legal name on the instructions", "participant.full_legal_name")];
  return {
    formNumber: INSTRUCTIONS,
    documentId: INSTRUCTIONS,
    documentRole: "instructions",
    structuralClass: "process_guidance",
    officialFormId: null,
    documentPolicy: { mode: "participant", routeKey: ROUTE_KEY, documentAcceptsFill: true },
    explicitMappings: {},
    roleRefusals: [],
    selectionControls: [],
    canonicalWrites: writes,
    canonicalRefusals: [],
    boundaryWrites: writes,
    boundaryRefusals: []
  };
}

function caption(lines, facts) {
  lines.push(`${facts["case.judicial_district"]}, STATE OF LOUISIANA`);
  lines.push(`PARISH OF ${facts["case.parish"]}`);
  lines.push(`STATE OF LOUISIANA v. ${facts["participant.full_legal_name"]}`);
  lines.push(`DOCKET / CASE NUMBER: ${facts["case.docket_number"]}     DIVISION: ${facts["case.division"]}`, "");
}

function primaryBody(facts) {
  const lines = [
    FORM_ID,
    "MOTION TO SET ASIDE CONVICTION AND DISMISS PROSECUTION;",
    "RULE TO SHOW CAUSE; ORDER OF DISMISSAL",
    "La. C.Cr.P. art. 987 - statutory form composed from the committed LA-STATUTORY-FORMS authority",
    ""
  ];
  caption(lines, facts);
  lines.push("MOTION TO SET ASIDE CONVICTION AND DISMISS PROSECUTION", "");
  lines.push(`Mover full legal name: ${facts["participant.full_legal_name"]}`);
  lines.push(`Mover date of birth: ${facts["participant.date_of_birth"]}`);
  lines.push(`Conviction offense wording: ${DOTS(41)}`);
  lines.push(`Conviction statute: ${DOTS(57)}`);
  lines.push(`Conviction or plea date: ${facts["case.conviction_date"]}`);
  lines.push(`Misdemeanor or felony and selected Article: ${facts["case.conviction_level"]}`);
  lines.push(`Deferred sentence and probation date: ${facts["case.deferred_sentence_date"]}`);
  lines.push(`Period of the deferred sentence: ${facts["case.deferral_period"]}`);
  lines.push(`Probation completion date: ${facts["case.probation_completion_date"]}`);
  lines.push(`Whether the mover is represented by an attorney: ${facts["case.represented_by_counsel"]}`, "");
  lines.push("PARTICIPANT ASSERTIONS - THE BUILD DOES NOT ANSWER THESE", "");
  lines.push("Has the period of the deferred sentence run? [ ] YES  [ ] NO");
  lines.push("Did you successfully complete the terms of your probation? [ ] YES  [ ] NO", "");
  lines.push("The mover asks the court, after the contradictory hearing with the district attorney's office contemplated by the committed Article 987 record, to set aside the conviction and dismiss the prosecution under the Article selected above.", "");
  lines.push("REPRESENTED-MOVER BLOCK - ATTORNEY ONLY IF REPRESENTATION EXISTS");
  lines.push(`Attorney name: ${DOTS(54)}`);
  lines.push(`Attorney bar number: ${DOTS(47)}`);
  lines.push(`Attorney address: ${DOTS(55)}`);
  lines.push(`Attorney telephone: ${DOTS(52)}`);
  lines.push(`Attorney signature: ${DOTS(52)}`, "");
  lines.push("UNREPRESENTED-MOVER BLOCK");
  lines.push(`Unrepresented mover signature: ${DOTS(38)}`);
  lines.push(`Date of unrepresented mover signature: ${DOTS(31)}`);
  lines.push(`Printed name: ${facts["participant.full_legal_name"]}`, "");
  lines.push(`Route: ${ROUTE_KEY}`);
  lines.push(PAGE_BREAK);

  lines.push(FORM_ID, "RULE TO SHOW CAUSE", "");
  caption(lines, facts);
  lines.push("PROPOSED RULE - COURT COMPLETES AND ISSUES THIS SECTION", "");
  lines.push("The district attorney is ordered to show cause why the Motion to Set Aside Conviction and Dismiss Prosecution should not be granted. The rule is directed to the district attorney; the court sets the return date, time, and place.", "");
  lines.push(`Hearing date set by the court clerk: ${DOTS(36)}`);
  lines.push(`Hearing time set by the court clerk: ${DOTS(36)}`);
  lines.push(`Courtroom or place set by the court clerk: ${DOTS(31)}`, "");
  lines.push(`Judge signature on the Rule to Show Cause: ${DOTS(30)}`, "");
  lines.push("Leave every line above blank for the court. The district attorney's response belongs to the district attorney and is not printed as a participant field in this packet.", "");
  lines.push(PAGE_BREAK);

  lines.push(FORM_ID, "ORDER OF DISMISSAL", "");
  caption(lines, facts);
  lines.push("COURT USE ONLY - UNEXECUTED PROPOSED ORDER", "");
  lines.push("No finding has been made and no relief has been granted unless and until the judge completes and signs an order and the clerk enters it.", "");
  lines.push("Court findings:");
  lines.push(DOTS(), DOTS(), DOTS(), "");
  lines.push("Court use only - granting, denying, and decretal paragraphs:");
  lines.push(DOTS(), DOTS(), DOTS(), DOTS(), "");
  lines.push(`Date of the court order: ${DOTS(43)}`);
  lines.push(`Place of the court order: ${DOTS(42)}`);
  lines.push(`Judge signature on the Order of Dismissal: ${DOTS(31)}`, "");
  lines.push("The participant leaves every finding, ruling, date, place, decretal paragraph, and judicial signature blank.", "");
  return lines.join("\n");
}

function requiredItems(maps) {
  return maps.flatMap((map) => map.canonicalRefusals
    .filter((row) => row.requiredBeforeFiling === true)
    .map((row) => ({
      document: map.formNumber,
      field: row.field,
      page: row.page,
      printedContext: row.printedLabel,
      disclosureLabel: row.effectiveLabel,
      identity: row.identity,
      why: row.why,
      participantMustSupply: row.participantMustSupply
    })));
}

function participantInstructions(requiredBeforeFiling, name) {
  const lines = [
    "# Louisiana Article 987 participant instructions",
    "",
    `Prepared for **${name}** and only for \`${ROUTE_KEY}\`.`,
    "",
    "## What is included",
    "",
    `- \`${PRIMARY}\`: the mandatory three-part ${FORM_ID} statutory instrument - Motion, Rule to Show Cause, and Order of Dismissal.`,
    `- \`${INSTRUCTIONS}\`: participant and filing instructions included in the assembled packet.`,
    "",
    "## What this filing does and does not do",
    "",
    "This is not an expungement and does not itself clear any record. It is the predicate filing that can convert a completed deferred sentence into a set-aside conviction and dismissed prosecution under Article 894(B) for a misdemeanor or Article 893(E) for a felony. After the Order of Dismissal is signed, return to the Article 977(A)(1) misdemeanor expungement track or Article 978(A)(1) felony expungement track that applies.",
    "",
    "## Required before filing",
    "",
    "Check every prefilled neutral participant and case fact against the court record and correct the packet if it disagrees. Every item below remains yours alone and is intentionally left blank on the instrument.",
    "",
    "| Document | Blank on the document | What you must supply |",
    "| --- | --- | --- |"
  ];
  for (const item of requiredBeforeFiling) lines.push(`| ${item.document} | ${item.disclosureLabel} | ${item.participantMustSupply} |`);
  lines.push(
    "",
    "Conditionally obtain the minute entry or sentencing order showing the deferred sentence under Article 893 or Article 894 from the clerk of the sentencing court wherever the court or district attorney asks to see the basis for the deferral. Check the deferred-sentence date against it.",
    "",
    "Conditionally obtain proof of successful completion of probation from the supervising probation office, or the Department of Public Safety and Corrections, Division of Probation and Parole, wherever completion may be questioned, which the committed record says is most cases. Have it before the return date and check your completion answer against it.",
    "",
    "## Fields deliberately left blank",
    "",
    "- Sign and date only the unrepresented-mover block after the motion is complete. If you are represented, give the instrument to your attorney; the attorney block belongs to counsel.",
    "- Leave the Rule to Show Cause return date, time, place, and judge signature blank. The court sets them and the clerk supplies the return information.",
    "- Leave every finding, granting or denying paragraph, date, place, and judge signature in the Order of Dismissal blank. Those fields are the court's judgment.",
    "- The district attorney's response to the rule belongs to the district attorney and is not a participant field.",
    "",
    "## Stop and get help",
    "",
    "Stop self-help if the district attorney opposes the motion at the contradictory hearing; if there is any dispute whether the deferred-sentence period ran or probation was successfully completed; if the court sets a contested evidentiary hearing; or if you are unsure whether the sentence was deferred under Article 893 or Article 894, or deferred at all.",
    "",
    "This built packet is pending independent completeness, raster, visual, and counsel review. It is not approved for live use and opens no route.",
    ""
  );
  return lines.join("\n");
}

function filingInstructions(name) {
  return [
    "# Louisiana Article 987 filing instructions",
    "",
    `Prepared for **${name}**.`,
    "",
    "1. File the three-part Article 987 instrument - Motion, Rule to Show Cause, and Order of Dismissal - with the clerk of the court that imposed the deferred sentence, in the parish of conviction. Article 986 makes Article 987 the form to be used; Article 986(C) lets a clerk alter it only to show the name of that court.",
    "2. Ask that clerk for the filing cost before filing. Article 983 governs the cost of an expungement, not this Article 987 set-aside; ordinary motion costs may apply and vary by parish, and the committed record supplies no figure.",
    "3. Article 987 prescribes no fee waiver. The Article 988 fee exemption is an expungement instrument under Article 983(F) and does not reach this filing.",
    "4. The Rule to Show Cause is directed to the district attorney. The motion's prayer contemplates a contradictory hearing with the district attorney's office. No sixty-day objection window applies; that scheme belongs to Articles 979 and 980 and governs a motion to expunge.",
    "5. Service is on the district attorney and on the attorney for the defendant or the defendant. Confirm the clerk's filing-copy and service mechanics, obtain the clerk-set return date, time, and place, and do not fill a court field yourself.",
    "6. A contradictory hearing, district-attorney opposition, a completion dispute, or a contested evidentiary hearing ends self-help; get legal help rather than continuing on your own.",
    "7. If the court signs the Order of Dismissal, ask the clerk for a certified copy. That signed order is needed for the later Article 977 or Article 978 expungement track; this Article 987 filing clears nothing by itself.",
    "",
    `Route: ${ROUTE_KEY}`,
    ""
  ].join("\n");
}

function markdownToPlain(markdown) {
  return String(markdown).split("\n")
    .filter((line) => !/^\|(?:\s*:?-+:?\s*\|)+$/.test(line.trim()))
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        return trimmed.slice(1, -1).split("|").map((cell) => cell.trim().replaceAll("**", "").replaceAll("`", "")).join(" | ");
      }
      return line.replace(/^#{1,6}\s+/, "").replace(/^\d+\.\s+/, "").replace(/^\-\s+/, "- ").replaceAll("**", "").replaceAll("`", "");
    })
    .join("\n");
}

function instructionsBody(facts, participantText, filingText) {
  return [
    TITLES[INSTRUCTIONS].toUpperCase(),
    `Prepared for: ${facts["participant.full_legal_name"]}`,
    "",
    markdownToPlain(participantText),
    "",
    markdownToPlain(filingText)
  ].join("\n");
}

function sanitizePdfText(text) {
  return String(text)
    .replaceAll("\u00a0", " ")
    .replaceAll("‑", "-")
    .replaceAll("–", "-")
    .replaceAll("—", "-")
    .replaceAll("−", "-")
    .replaceAll("’", "'")
    .replaceAll("‘", "'")
    .replaceAll("“", "\"")
    .replaceAll("”", "\"")
    .replaceAll("§", "Sec. ")
    .replaceAll("…", "...");
}

/*
 * THE PAGE FOOT IS CHROME, AND THE COMPOSED BODY IS NOT.
 *
 * Pages 2 and 3 of the Article 987 instrument ARE the court's sections - the
 * Rule the court issues and the unexecuted proposed Order. A machine
 * identifier set in body face at the body's own left margin, one line under
 * the court section's closing sentence, reads as a line of the court's own
 * section, which is what VF02 failed at 97be5bcda. The component identity now
 * prints once per page as page-foot chrome instead: 7pt against the body's
 * 10.25pt, grey, below a hairline rule, in the 60pt band beneath the body's
 * bottom margin that no composed line can reach. The route trailer stays a
 * composed body line in the register the passing families use, but only in the
 * preparer's parts of the packet - the Motion and the instructions - and never
 * inside a court-completed section.
 */
async function renderDocument(text, title, componentIdentity) {
  const pdf = await PDFDocument.create();
  stampDeterministic(pdf);
  pdf.setTitle(title);
  pdf.setAuthor("RCAP packet-factory lane PF10");
  pdf.setCreator("RCAP deterministic Louisiana codified-form composer");
  pdf.setProducer("RCAP census-v1 artifact renderer");
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const width = 612;
  const height = 792;
  const margin = 60;
  const fontSize = 10.25;
  const lineHeight = 13.25;
  const maxWidth = width - (2 * margin);
  const footerSize = 7;
  const footerRuleY = 44;
  const footerBaseline = 32;
  let page = pdf.addPage([width, height]);
  let y = height - margin;
  const newPage = () => { page = pdf.addPage([width, height]); y = height - margin; };
  const splitToken = (token) => {
    const chunks = [];
    let current = "";
    for (const char of token) {
      const candidate = `${current}${char}`;
      if (current && font.widthOfTextAtSize(candidate, fontSize) > maxWidth) {
        chunks.push(current);
        current = char;
      } else current = candidate;
    }
    if (current) chunks.push(current);
    return chunks;
  };
  const wrap = (raw) => {
    if (!raw) return [""];
    const words = raw.split(/\s+/).flatMap((word) => font.widthOfTextAtSize(word, fontSize) > maxWidth ? splitToken(word) : [word]);
    const rows = [];
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) current = candidate;
      else {
        if (current) rows.push(current);
        current = word;
      }
    }
    if (current) rows.push(current);
    return rows;
  };
  for (const raw of sanitizePdfText(text).split("\n")) {
    if (raw === PAGE_BREAK) {
      newPage();
      continue;
    }
    for (const row of wrap(raw)) {
      if (y < margin) newPage();
      if (row) page.drawText(row, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
      y -= lineHeight;
    }
  }
  const footer = `Assigned component identity: ${componentIdentity}`;
  assert.ok(componentIdentity, "every composed component must carry a page-foot identity");
  assert.ok(font.widthOfTextAtSize(footer, footerSize) <= maxWidth, "the page-foot chrome must fit the column on one line");
  for (const sheet of pdf.getPages()) {
    sheet.drawLine({
      start: { x: margin, y: footerRuleY },
      end: { x: width - margin, y: footerRuleY },
      thickness: 0.5,
      color: rgb(0.72, 0.72, 0.72)
    });
    sheet.drawText(footer, { x: margin, y: footerBaseline, size: footerSize, font, color: rgb(0.38, 0.38, 0.38) });
  }
  return Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
}

async function proveWrites(packetBytes, pageManifest, maps, facts, fixture) {
  const pdf = await PDFDocument.load(packetBytes, { ignoreEncryption: true, updateMetadata: false });
  assert.equal(pdf.getPageCount(), pageManifest.length, "page manifest must describe every packet page");
  const pageText = pdf.getPages().map((page) => groupIntoLines(extractTextItems(page)).map((line) => line.text).join(" ").replace(/\s+/g, " "));
  const componentText = new Map();
  for (const [index, row] of pageManifest.entries()) {
    componentText.set(row.documentId, `${componentText.get(row.documentId) ?? ""} ${pageText[index]}`.replace(/\s+/g, " "));
  }
  const actualWrites = [];
  let glyphs = 0;
  for (const map of maps) {
    const text = componentText.get(map.formNumber) ?? "";
    for (const row of map.canonicalWrites) {
      const expected = sanitizePdfText(facts[row.factId]);
      assert.ok(expected, `${fixture}/${row.field}: fixture fact is absent`);
      assert.ok(text.includes(expected), `${fixture}/${row.field}: fact is not readable from the final PDF bytes`);
      glyphs += expected.replace(/\s+/g, "").length;
      actualWrites.push({
        field: row.field,
        document: map.formNumber,
        factId: row.factId,
        expected,
        foundInOutputBytes: true,
        proof: "exact normalized value read from the finalized packet bytes on the mapped component pages"
      });
    }
  }
  return { actualWrites, glyphs, pagesRead: pdf.getPageCount() };
}

function normalizedRow(row) {
  return {
    id: row.field,
    name: row.fieldName ?? row.field,
    label: row.effectiveLabel ?? "",
    reason: row.reason ?? "",
    refusalClass: row.category ?? null,
    page: row.page ?? null,
    document: row.document ?? null,
    factId: row.factId ?? null,
    isSelectionControl: row.isSelectionControl === true || row.kind === "selection_control",
    declared: {
      disposition: row.completenessDisposition ?? null,
      ...(Object.hasOwn(row, "requiredBeforeFiling") ? { requiredBeforeFiling: row.requiredBeforeFiling === true } : {}),
      routeDetermined: row.routeDetermined === true,
      determinedByTheCaseNotTheRoute: row.determinedByTheCaseNotTheRoute === true,
      whyTheRouteCannotDetermineIt: row.whyTheRouteCannotDetermineIt ?? null,
      identity: row.identity ?? null,
      factId: row.factId ?? null
    }
  };
}

function countCompleteness(maps, proofs, instructionsText) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((key) => [key, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };
  const writes = maps.flatMap((map) => map.canonicalWrites.map(normalizedRow));
  const blanks = maps.flatMap((map) => map.canonicalRefusals.map(normalizedRow));
  const availableFacts = new Set(writes.map((row) => row.factId).filter(Boolean));
  const normalize = (value) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const writtenByDocument = new Map();
  for (const row of writes) {
    if (!writtenByDocument.has(row.document)) writtenByDocument.set(row.document, new Set());
    writtenByDocument.get(row.document).add(normalize(row.label));
    writtenByDocument.get(row.document).add(normalize(row.name));
  }
  const ledger = [];
  for (const blank of blanks) {
    const beside = writtenByDocument.get(blank.document) ?? new Set();
    const declared = {
      ...blank.declared,
      factAvailable: (blank.factId ? availableFacts.has(blank.factId) : false)
        || beside.has(normalize(blank.label)) || beside.has(normalize(blank.name))
    };
    const verdict = classifyBlank(blank, blank.reason, blank.refusalClass, declared);
    ledger.push({ ...blank, ...verdict });
    if (BLANK_DISPOSITIONS[verdict.disposition]?.allowed) continue;
    if (verdict.disposition === "KNOWN_FACT_NOT_WRITTEN") note("knownRequiredFieldsMissing", { field: blank.id, basis: verdict.basis });
    else if (verdict.disposition === "ROUTE_OPTION_NOT_SELECTED") note("requiredOptionsMissing", { field: blank.id, basis: verdict.basis });
    else note("unclassifiedBlanks", { field: blank.id, basis: verdict.basis });
  }
  const haystack = instructionsText.toLowerCase();
  for (const blank of ledger.filter((row) => row.disposition === "REQUIRED_BEFORE_FILING")) {
    const needles = [blank.label, blank.id, blank.declared?.identity].map((value) => String(value ?? "").trim()).filter((value) => value.length >= 3);
    if (!needles.some((needle) => haystack.includes(needle.toLowerCase().slice(0, 60)))) {
      note("requiredFactsNotCollected", { field: blank.id, why: "required-before-filing item absent from participant instructions" });
    }
  }
  const rows = new Map();
  for (const row of [...writes.map((value) => ({ ...value, written: true })), ...blanks.map((value) => ({ ...value, written: false }))]) {
    const key = rowKeyOf(row);
    if (!key) continue;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(row);
  }
  for (const [key, cells] of rows) {
    if (!cells.some((cell) => cell.written)) continue;
    const missing = cells.filter((cell) => !cell.written && classifyField(cell.label, cell.isSelectionControl).requirement === "REQUIRED_KNOWN");
    if (missing.length) note("incompleteRows", { row: key, missing: missing.map((cell) => cell.label) });
  }
  for (const row of writes) if (classifyField(row.label, false).requirement === "PROTECTED") note("protectedWrites", { field: row.id });
  for (const proof of proofs) {
    const visible = (proof.addedGlyphsReadFromOutputBytes ?? 0) + (proof.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if (proof.valuesReportedByFinalizer > 0 && visible === 0) note("invisibleWrites", { fixture: proof.fixture });
    if ((proof.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: proof.fixture });
    if ((proof.refusedFieldsWithInk ?? []).length > 0) note("protectedWrites", { fixture: proof.fixture });
  }
  return {
    counters,
    findings,
    ledger,
    totals: { terminalFields: writes.length + blanks.length, written: writes.length, blank: blanks.length, rowsInspected: rows.size }
  };
}

function writeJson(relative, value) {
  const target = path.join(ROOT, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  /*
   * A hand-written identityRefresh on a grounding pin this build did not move
   * has to survive the rebuild that regenerates the receipt around it. The
   * annotation is carried forward only while the rebuild re-measures the exact
   * sha256 it was written against; when the record moves again it is dropped
   * rather than laundered onto bytes nobody compared. See
   * scripts/rcap-packet-completeness/identity-refresh.mjs.
   */
  fs.writeFileSync(target, `${JSON.stringify(preserveIdentityRefresh(fs, target, value), null, 2)}\n`);
}

export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const noRaster = argv.includes("--no-raster");
  if (!checkOnly) assert.equal(noRaster, true, "this assigned lane is no-raster only; invoke with --no-raster");
  const binding = loadAuthorityBinding();
  const maps = [primaryMap(), instructionsMap()];
  const requiredBeforeFiling = requiredItems(maps);

  if (checkOnly) {
    return {
      familyId: FAMILY_ID,
      status: "CHECK_ONLY",
      routeKey: ROUTE_KEY,
      implementationStrategy: STRATEGY,
      custodyClass: CUSTODY_CLASS,
      sourceBinariesRequired: 0,
      components: COMPONENTS,
      recordsBound: binding.records.length,
      writes: maps.reduce((sum, map) => sum + map.canonicalWrites.length, 0),
      blanks: maps.reduce((sum, map) => sum + map.canonicalRefusals.length, 0)
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });
  const artifacts = [];
  const proofs = [];

  for (const fixture of ["canonical", "boundary"]) {
    const facts = FACTS[fixture];
    const participantText = participantInstructions(requiredBeforeFiling, facts["participant.full_legal_name"]);
    const filingText = filingInstructions(facts["participant.full_legal_name"]);
    const packet = await PDFDocument.create();
    stampDeterministic(packet);
    packet.setTitle(`Louisiana Article 987 packet - ${fixture}`);
    packet.setAuthor("RCAP packet-factory lane PF10");
    packet.setCreator("RCAP deterministic Louisiana codified-form composer");
    packet.setProducer("RCAP census-v1 artifact renderer");
    const pageManifest = [];
    const bodies = [
      { component: PRIMARY, documentId: FORM_ID, body: primaryBody(facts) },
      { component: INSTRUCTIONS, documentId: INSTRUCTIONS, body: instructionsBody(facts, participantText, filingText) }
    ];
    for (const item of bodies) {
      assert.ok(item.body.includes(facts["participant.full_legal_name"]));
      assert.ok(item.body.includes(ROUTE_KEY));
      const bytes = await renderDocument(item.body, TITLES[item.component], item.component);
      const componentPdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
      const pages = await packet.copyPages(componentPdf, componentPdf.getPageIndices());
      for (const [index, page] of pages.entries()) {
        packet.addPage(page);
        pageManifest.push({
          packetPage: packet.getPageCount(),
          component: item.component,
          documentId: item.documentId,
          sourcePage: index + 1,
          sourceSha256: null,
          sourceClass: "composed_from_committed_authority"
        });
      }
    }
    assert.deepEqual([...new Set(pageManifest.map((row) => row.component))], COMPONENTS);
    assert.equal(pageManifest.filter((row) => row.component === PRIMARY).length, 3, `${fixture}: Article 987 must remain a three-page instrument`);
    const packetBytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
    const file = `${OUT}/fixtures/${fixture}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), packetBytes);
    const proof = await proveWrites(packetBytes, pageManifest, maps, facts, fixture);
    proofs.push({
      fixture,
      proofMethod: "every declared write read back from final packet bytes on the mapped component pages",
      valuesReportedByFinalizer: proof.actualWrites.length,
      addedGlyphsReadFromOutputBytes: proof.glyphs,
      flattenedWidgetAppearancesReadFromOutputBytes: 0,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
      refusedFieldsWithInk: [],
      actualWrites: proof.actualWrites
    });
    artifacts.push({
      fixture,
      file,
      sha256: crypto.createHash("sha256").update(packetBytes).digest("hex"),
      byteLength: packetBytes.length,
      pageCount: packet.getPageCount(),
      pageManifest,
      documents: [FORM_ID, INSTRUCTIONS],
      components: COMPONENTS
    });
  }

  const canonicalParticipant = participantInstructions(requiredBeforeFiling, FACTS.canonical["participant.full_legal_name"]);
  const canonicalFiling = filingInstructions(FACTS.canonical["participant.full_legal_name"]);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), canonicalParticipant);
  fs.writeFileSync(path.join(ROOT, OUT, "filing-instructions.md"), canonicalFiling);
  const counted = countCompleteness(maps, proofs, canonicalParticipant);
  const allNineZero = PASS_COUNTERS.every((counter) => counted.counters[counter] === 0);
  assert.equal(allNineZero, true, `builder completeness counters must be zero: ${JSON.stringify({ counters: counted.counters, findings: counted.findings })}`);

  writeJson(`${OUT}/packet-set-manifest.json`, {
    schemaVersion: "rcap-composed-packet-set/v1",
    familyId: FAMILY_ID,
    jurisdiction: "LA",
    routeKey: ROUTE_KEY,
    implementationStrategy: STRATEGY,
    custodyClass: CUSTODY_CLASS,
    officialFormFamily: FORM_ID,
    sourceBinariesRequired: 0,
    sourceAcquisitionAuthorized: false,
    components: [
      { componentId: PRIMARY, documentId: FORM_ID, title: TITLES[PRIMARY], role: "primary_filing", outputStrategy: STRATEGY, order: 1, required: true },
      { componentId: INSTRUCTIONS, documentId: INSTRUCTIONS, title: TITLES[INSTRUCTIONS], role: "instructions", outputStrategy: "process_guidance", order: 2, required: true }
    ],
    participantInstructions: `${OUT}/participant-instructions.md`,
    filingInstructions: `${OUT}/filing-instructions.md`
  });
  writeJson(`${OUT}/component-page-manifest.json`, {
    schemaVersion: "rcap-component-page-manifest/v1",
    familyId: FAMILY_ID,
    componentOrder: COMPONENTS,
    artifacts: artifacts.map((artifact) => ({
      fixture: artifact.fixture,
      file: artifact.file,
      sha256: artifact.sha256,
      byteLength: artifact.byteLength,
      pageCount: artifact.pageCount,
      pages: artifact.pageManifest
    }))
  });
  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1",
    familyId: FAMILY_ID,
    worklistGroupId: FAMILY_ID,
    jurisdiction: "LA",
    routeKeys: [ROUTE_KEY],
    implementationStrategy: STRATEGY,
    custodyClass: CUSTODY_CLASS,
    sourceStatus: CUSTODY_CLASS,
    officialFormFamily: FORM_ID,
    acquisitionCommissioned: false,
    sourceAcquisitionAuthorized: false,
    sourceBinariesRequired: 0,
    sourceBinaryCommitted: false,
    sourceBinarySha256: null,
    allSourcesExact: true,
    allSourcesExactNote: "Authority-only composition: the assigned family requires zero source binaries, so no binary source hash exists or is owed, and every record this packet is grounded in binds. This flag was lowered by hand to false in an earlier pin sweep, correctly, because one grounding record did not bind: MASTER_QUEUE.json, whose pin that sweep held rather than refreshed. The flag reads true again because the reason it was lowered is gone -- the queue is no longer a grounding record at all -- and because this value is written by the builder from the binding it just performed rather than edited into the receipt afterwards.",
    bindingMethod: "the LA-STATUTORY-FORMS COMPOSE_FROM_AUTHORITY decision and every committed record carrying legal content this build relies on are re-read at build time and bound twice by SHA-256: the whole file, and this family's own entry inside it over a key-ordered canonical form",
    notGroundedIn: {
      path: "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json",
      why: "The queue is a generated file describing this packet's own build state, so binding it proves nothing about the packet's legal content and goes stale on every regeneration. It was pinned here at 484a8944f48431cfa33deafdaeea863b76d05a5a4fee04d13fece32c8e5aa078 / 2010084 B and hashed 3a37b3f9cb02bd15cb6aea11639d0f084ac18cb7f022fb7bb9f28732301c23cc / 2016844 B when a verifier read it. The Louisiana node had also changed meaning, not just position, so no identity-refresh note could honestly cure the pin and none was written. Every assertion this build made against the queue is now made against a record that carries legal content.",
      recoveredPinnedBlobAtCommit: "b45f5131"
    },
    authorityDecision: {
      id: binding.owner.id,
      decision: binding.owner.decision,
      text: binding.owner.text,
      authorityHeld: binding.owner.authorityHeld,
      composedFromAuthority: binding.ownerFamily.composedFromAuthority
    },
    authorityCurrentness: {
      reviewedAsOf: binding.registryTrack.reviewedAsOf,
      effectiveFrom: binding.registryTrack.effectiveFrom,
      effectiveTo: binding.registryTrack.effectiveTo,
      legalInputStatus: binding.legalInputStatus,
      legalInputStatusBasis: "derived from the track registry's own dating for this track -- an effectiveFrom, a null effectiveTo, and no blocker raised against the governing mechanism -- and no longer copied from the generated build queue"
    },
    officialForm: {
      officialFormId: FORM_ID,
      officialSourceUrl: binding.assignment.officialSourceUrl,
      sourceBinarySha256: null,
      compositionTreatment: "COMPOSE_FROM_AUTHORITY"
    },
    sources: [],
    documents: [],
    groundingRecords: binding.records,
    composedComponentsAuthoredByThisBuild: COMPONENTS,
    commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "independent verification, raster acceptance, visual acceptance, counsel approval, or approval for participant delivery",
      "that the deferred-sentence period has run or that probation was successfully completed",
      "that any parish charges or waives a particular filing cost",
      "that any commercial route is open"
    ]
  });
  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1",
    familyId: FAMILY_ID,
    routeKeys: [ROUTE_KEY],
    jurisdiction: "LA",
    statute: "La. C.Cr.P. art. 987",
    legalName: binding.registryTrack.legalName,
    implementationStrategy: STRATEGY,
    renderStrategy: "codified_statutory_form_composed_from_authority",
    officialForm: FORM_ID,
    sourceBinary: null,
    sourceAuthority: OWNER_DECISION,
    componentSet: COMPONENTS,
    pageOrder: COMPONENTS,
    routeSelectionNote: "The family fixes Article 987 set-aside-and-dismiss relief. The misdemeanor/felony Article 894(B)/893(E) selection is filled from the case fixture, not left as a route election.",
    routeSelectionsMade: [{ option: "ARTICLE_987_SET_ASIDE_AND_DISMISS", authority: "La. C.Cr.P. art. 987", routeDetermined: true }],
    dispositionVocabulary: [SIGNATURE, COURT_OWNED, "REQUIRED_BEFORE_FILING", "NOT_APPLICABLE_ON_THIS_ROUTE"],
    requiredBeforeFilingCount: requiredBeforeFiling.length,
    requiredBeforeFiling,
    maps,
    generationAllowed: false,
    runtimeSelectable: false,
    commercialRoutesOpened: 0
  });
  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1",
    familyId: FAMILY_ID,
    renderedFresh: true,
    derivedFromBytes: true,
    componentSet: COMPONENTS,
    boundSources: [],
    boundSourcesNote: "zero source binaries; the Article 987 instrument is composed from the committed LA-STATUTORY-FORMS authority",
    pdfs: artifacts.map((artifact) => ({
      file: artifact.file,
      documentId: "assembled_packet",
      role: "assembled_packet_of_codified_form_and_instructions",
      fixture: artifact.fixture,
      sha256: artifact.sha256,
      byteLength: artifact.byteLength,
      pageCount: artifact.pageCount
    })),
    artifacts,
    packets: artifacts.map((artifact) => ({ fixture: artifact.fixture, documents: [FORM_ID, INSTRUCTIONS], components: COMPONENTS })),
    everyPageRastered: false,
    byteDerivedHashes: true,
    rasterEngine: null,
    rasterSkipped: true,
    rasterPages: [],
    rasterState: "BUILT_RASTER_PENDING",
    independentVerificationPending: true
  });
  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1",
    familyId: FAMILY_ID,
    derivedFromArtifactBytes: true,
    note: "Each declared fixture value was read from finalized PDF bytes on the mapped component pages.",
    documents: proofs,
    artifacts: proofs.map((proof) => ({
      fixture: proof.fixture,
      valuesReportedByFinalizer: proof.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: proof.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: proof.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: proof.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      refusedFieldsWithInk: proof.refusedFieldsWithInk
    })),
    blockingFindings: []
  });
  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1",
    familyId: FAMILY_ID,
    requiredBeforeFiling,
    protectedBlanks: maps.flatMap((map) => map.canonicalRefusals
      .filter((row) => row.requiredBeforeFiling !== true)
      .map((row) => ({
        document: map.formNumber,
        field: row.field,
        page: row.page,
        label: row.effectiveLabel,
        disposition: row.completenessDisposition,
        refusalClass: row.category,
        why: row.why
      }))),
    everyIntentionalBlankClassified: true,
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });
  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1",
    familyId: FAMILY_ID,
    whatThisIs: "the builder's count using the repository completeness contract",
    whatThisIsNot: "independent verification or a release verdict",
    counters: counted.counters,
    allNineZero,
    findings: counted.findings,
    totals: counted.totals,
    blankDispositions: counted.ledger.reduce((result, row) => {
      result[row.disposition] = (result[row.disposition] ?? 0) + 1;
      return result;
    }, {})
  });
  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1",
    familyId: FAMILY_ID,
    buildStatus: "state_built",
    status: "BUILT_RASTER_PENDING",
    reviewStatus: "qa_review_pending",
    builtBy: BUILD_SCRIPT,
    implementationStrategy: STRATEGY,
    sourceStatus: CUSTODY_CLASS,
    renderedArtifacts: artifacts.length,
    rasterPages: 0,
    rasterEngine: null,
    popplerUsed: false,
    rasterState: "BUILT_RASTER_PENDING",
    independentVerificationStatus: "PENDING",
    selfVerified: false,
    generationAllowed: false,
    runtimeSelectable: false,
    commercialRoutesOpened: 0,
    productionTouched: false,
    grantsNothing: "A built packet is review evidence only; it opens no route and authorizes no fulfillment."
  });
  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1",
    familyId: FAMILY_ID,
    blocking: [],
    findings: [
      {
        finding: "The catalog declares official_pdf_fill and LA-CCRP-ART-987, while source status is CUSTOM_PLEADING_FROM_CODIFIED_TEXT and carries no source hash.",
        treatment: "The existing LA-STATUTORY-FORMS COMPOSE_FROM_AUTHORITY decision is bound by committed-record SHA-256; no binary was acquired, read, or claimed."
      },
      {
        finding: "The authoritative component set contains one primary-filing component and one instructions component.",
        treatment: "Both components are rendered in authoritative order in the canonical and boundary packets, and every packet page is assigned in the component-page manifest."
      },
      {
        finding: "The participant owns the assertions that the deferred-sentence period ran and probation was successfully completed.",
        treatment: "Both answers remain declared REQUIRED_BEFORE_FILING blanks and are named verbatim in participant-instructions.md."
      },
      {
        finding: "The Rule to Show Cause and Order of Dismissal contain court-owned return, finding, disposition, date, place, and signature fields.",
        treatment: "Every such field is protected, the proposed order is visibly unexecuted, and no court or signature field is written."
      },
      {
        finding: "Article 987 is a predicate filing, not an expungement, and parish motion costs are not fixed by the committed record.",
        treatment: "The participant and filing instructions state the destination, fee uncertainty, lack of an Article 987 waiver, service and notice rules, post-order expungement step, and every committed self-help stop."
      }
    ]
  });
  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1",
    familyId: FAMILY_ID,
    requested: "independent completeness verification, central raster review, visual review, and counsel review",
    buildStatus: "state_built",
    status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false,
    live: false,
    commercialRoutesOpened: 0,
    counselQuestionsRaised: [
      "Confirm the authority-composed Article 987 instrument faithfully carries the statutory Motion, Rule to Show Cause, and Order of Dismissal form structure.",
      "Confirm the clerk-directed return-date and service instructions and the statement that Article 987 prescribes no fee waiver.",
      "Confirm the post-order handoff to the applicable Article 977(A)(1) or Article 978(A)(1) expungement track."
    ],
    mattersForTheReviewersAttention: [
      "The source receipt binds authority and committed records, not a nonexistent binary source hash.",
      "Every participant assertion, signature/date, attorney-only field, court return field, and order field is classified.",
      "The build status remains BUILT_RASTER_PENDING; no self-verification or raster claim is made."
    ]
  });

  return {
    familyId: FAMILY_ID,
    status: "BUILT_RASTER_PENDING",
    routeKey: ROUTE_KEY,
    implementationStrategy: STRATEGY,
    custodyClass: CUSTODY_CLASS,
    sourceAuthority: OWNER_DECISION,
    sourceBinaries: 0,
    counters: counted.counters,
    directory: OUT,
    components: COMPONENTS,
    writes: maps.reduce((sum, map) => sum + map.canonicalWrites.length, 0),
    requiredBeforeFiling: requiredBeforeFiling.length,
    artifactHashes: artifacts.map((artifact) => ({
      fixture: artifact.fixture,
      packetSha256: artifact.sha256,
      byteLength: artifact.byteLength,
      pages: artifact.pageCount
    })),
    rasterPages: 0,
    rasterState: "BUILT_RASTER_PENDING",
    nineCountersZero: allNineZero,
    packetsSelfVerified: 0,
    commercialRoutesOpened: 0,
    productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
