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
const FIXTURE_GENERATION_DATE = "2026-09-11";

const HELD_AUTHORITIES = Object.freeze([
  {
    sourceId: "official-authority:LA-CCRP-ART-986",
    title: "Article 986. Forms for the expungement of records",
    issuingAuthority: "Louisiana Legislature",
    officialUrl: "https://legis.la.gov/legis/LawPrint.aspx?d=919679",
    heldCorpusPath: "private/source-imports/user-upload-20260911/fd66fa19bf5fbfb1953d629a9e703dd2e56920758b903afef9f4c1549a286968.pdf",
    sha256: "fd66fa19bf5fbfb1953d629a9e703dd2e56920758b903afef9f4c1549a286968",
    byteLength: 51556
  },
  {
    sourceId: "official-authority:LA-CCRP-ART-978.1",
    title: "Article 978.1. Requirements for submitting motion to expunge arrest information",
    issuingAuthority: "Louisiana Legislature",
    officialUrl: "https://www.legis.la.gov/legis/LawPrint.aspx?d=1484240",
    heldCorpusPath: "private/source-imports/user-upload-20260911/141be4863d1789aa5c85cbd1e13d7fc753b8c1b513dd5562bf352820f8e9247a.pdf",
    sha256: "141be4863d1789aa5c85cbd1e13d7fc753b8c1b513dd5562bf352820f8e9247a",
    byteLength: 52904
  },
  {
    sourceId: "official-authority:LA-CCRP-ART-987",
    title: "Article 987. Motion to set aside conviction and dismiss prosecution; rule to show cause; order of dismissal forms to be used",
    issuingAuthority: "Louisiana Legislature",
    officialUrl: "https://www.legis.la.gov/legis/Law.aspx?d=919680",
    heldCorpusPath: "reference/louisiana/LA-CCRP-Art-987-20260911.html",
    sha256: "6f1498a70bc0cbc7f88e721ea24a9d08ab37d757d0c884feeb6db615844fd850",
    byteLength: 44421
  }
]);

const ARTICLE_978_1_DOCUMENTS = Object.freeze([
  {
    id: "LA-978.1-1",
    document: "Criminal background check",
    acceptedKinds: ["Louisiana State Police criminal background check", "Sheriff criminal background check"],
    maximumAgeAtFilingDays: 60
  },
  {
    id: "LA-978.1-2",
    document: "District attorney certification",
    acceptedKinds: ["District attorney certification letter"],
    mustValidate: [
      "No convictions or pending applicable charges within Article 978 requisite period with that DA office",
      "Whether charges related to the arrest incident were refused"
    ]
  },
  {
    id: "LA-978.1-3",
    document: "Court minute entries showing final disposition",
    acceptedKinds: ["Court minute entries", "Charge disposition report", "Clerk letter stating no such records exist"]
  },
  {
    id: "LA-978.1-4",
    document: "Charging instrument",
    acceptedKinds: ["Bill of information", "Indictment", "Affidavit"]
  }
]);

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
  relationships: "data/record-clearing/legal-design-track-source-relationships.json",
  sourceAdoption: "data/rcap-grade-a/source-wave-integration/SOURCE_USER_UPLOAD_ADOPTION_2026-09-11.json"
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
    of: (data) => data.relationships.find((row) => row.trackId === TRACK_ID) },
  sourceAdoption: { pointer: `familyDeterminations[familyId=${FAMILY_ID}]`,
    of: (data) => data.familyDeterminations.find((row) => row.familyId === FAMILY_ID) }
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
    "case.article_selection": "Article 894(B) Misdemeanors",
    "case.charge": "Simple battery (La. R.S. 14:35)",
    "case.arrest_date": "2021-04-17",
    "case.arresting_agency": "Tangipahoa Parish Sheriff's Office",
    "case.arrest_city_or_parish": "Hammond, Tangipahoa Parish",
    "case.deferred_period_run_confirmed": true,
    "case.probation_terms_completed_confirmed": true,
    "case.represented_by_counsel": false,
    "participant.street_address": "1200 Test Avenue",
    "participant.city_state_zip": "Hammond, LA 70401",
    "participant.telephone": "985-555-0101",
    "case.planned_article_978_filing_date": "2026-09-11",
    "documents.article_978_1.background_check": { "provided": true, "kind": "Louisiana State Police criminal background check", "documentDate": "2026-08-20" },
    "documents.article_978_1.da_certification": { "provided": true, "kind": "District attorney certification letter" },
    "documents.article_978_1.final_disposition": { "provided": true, "kind": "Court minute entries" },
    "documents.article_978_1.charging_instrument": { "provided": true, "kind": "Bill of information" }
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "case.judicial_district": "Forty-Second Judicial District Court",
    "case.parish": "Saint John the Baptist Parish",
    "case.docket_number": "TEST-BOUNDARY-2026-0000000000000001",
    "case.division": "Division Z-Long",
    "case.article_selection": "Article 893(E) Felonies",
    "case.charge": "Possession of a controlled dangerous substance (La. R.S. 40:967)",
    "case.arrest_date": "2018-12-31",
    "case.arresting_agency": null,
    "case.arrest_city_or_parish": "Edgard, Saint John the Baptist Parish",
    "case.deferred_period_run_confirmed": true,
    "case.probation_terms_completed_confirmed": true,
    "case.represented_by_counsel": false,
    "participant.street_address": "9876 A Very Long Participant Address Boulevard, Apartment 1204",
    "participant.city_state_zip": "Reserve, Louisiana 70084-1234",
    "participant.telephone": "985-555-0199",
    "case.planned_article_978_filing_date": "2026-09-11",
    "documents.article_978_1.background_check": { "provided": true, "kind": "Sheriff criminal background check", "documentDate": "2026-06-01" },
    "documents.article_978_1.da_certification": { "provided": false },
    "documents.article_978_1.final_disposition": { "provided": true, "kind": "Clerk letter stating no such records exist" },
    "documents.article_978_1.charging_instrument": { "provided": false }
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

  const sourceAdoption = loaded.sourceAdoption.data.familyDeterminations
    .find((row) => row.familyId === FAMILY_ID);
  assert.ok(sourceAdoption, "the governed 2026-09-11 Louisiana source adoption is missing");
  assert.equal(sourceAdoption.disposition, "SOURCE_READY");
  assert.deepEqual(sourceAdoption.unresolvedObligations, []);
  assert.deepEqual(sourceAdoption.authorityBindings, HELD_AUTHORITIES);
  assert.deepEqual(sourceAdoption.participantDocumentRequirements.map((row) => row.id),
    ARTICLE_978_1_DOCUMENTS.map((row) => row.id));
  for (const authority of HELD_AUTHORITIES) {
    const bytes = fs.readFileSync(path.join(ROOT, authority.heldCorpusPath));
    assert.equal(bytes.length, authority.byteLength, `${authority.sourceId}: held byte length changed`);
    assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), authority.sha256,
      `${authority.sourceId}: held source hash changed`);
  }
  const article987Text = fs.readFileSync(path.join(ROOT,
    HELD_AUTHORITIES.find((row) => row.sourceId.endsWith("ART-987")).heldCorpusPath), "utf8")
    .replace(/<[^>]+>/g, "")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&quot;", "\"")
    .replace(/\s+/g, " ");
  for (const requiredText of [
    "MOTION TO SET ASIDE CONVICTION AND",
    "in the above numbered case be set aside and that the prosecution dismissed",
    "IT IS HEREBY ORDERED, that the District Attorney show cause",
    "Considering the Motion to Set Aside Conviction and Dismiss Prosecution",
    "IT IS ORDERED, ADJUDGED AND DECREED that this conviction is set aside",
    "PLEASE SERVE:"
  ]) assert.ok(article987Text.includes(requiredText), `Article 987 source no longer contains: ${requiredText}`);

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
    sourceAdoption,
    authoritySources: HELD_AUTHORITIES,
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
  const neutralFields = [
    ["mover_name", "Mover/Defendant name", "participant.full_legal_name"],
    ["judicial_district", "Judicial district or court name", "case.judicial_district"],
    ["parish", "Parish of conviction", "case.parish"],
    ["docket_number", "Docket number", "case.docket_number"],
    ["division", "Court division", "case.division"],
    ["article_selection", "Article 894(B) or Article 893(E) selection", "case.article_selection"],
    ["charge", "CHARGE", "case.charge"],
    ["date_of_arrest", "DATE OF ARREST", "case.arrest_date"],
    ["arresting_agency", "ARRESTING AGENCY", "case.arresting_agency"],
    ["city_or_parish_of_arrest", "CITY/PARISH OF ARREST", "case.arrest_city_or_parish"],
    ["mover_address", "Unrepresented Mover/Defendant address", "participant.street_address"],
    ["mover_city_state_zip", "Unrepresented Mover/Defendant city, state, ZIP code", "participant.city_state_zip"],
    ["mover_telephone", "Unrepresented Mover/Defendant telephone number", "participant.telephone"]
  ];
  const writesFor = (facts) => neutralFields
    .filter(([, , factId]) => typeof facts[factId] === "string" && facts[factId].trim())
    .map(([id, label, factId]) => written(FORM_ID, id, label, factId));
  const missingFor = (facts) => neutralFields
    .filter(([, , factId]) => !(typeof facts[factId] === "string" && facts[factId].trim()))
    .map(([id, label, factId]) => required(
      FORM_ID,
      id,
      label,
      `provide ${label.toLowerCase()} exactly from the court or arrest record before filing`,
      "Article 987 prints this field; the packet leaves it blank when the participant/case record does not provide it and never substitutes another date, agency, place, charge, or case",
      1,
      { factId }
    ));
  const protectedOrInapplicable = [
    attorneyField(FORM_ID, "attorney_name", "Attorney name in represented-mover block", "the fixture selects the unrepresented mover block"),
    attorneyField(FORM_ID, "attorney_bar_number", "Attorney bar number in represented-mover block", "the fixture selects the unrepresented mover block"),
    attorneyField(FORM_ID, "attorney_address", "Attorney address in represented-mover block", "the fixture selects the unrepresented mover block"),
    attorneyField(FORM_ID, "attorney_city_state_zip", "Attorney city, state, ZIP code in represented-mover block", "the fixture selects the unrepresented mover block"),
    attorneyField(FORM_ID, "attorney_telephone", "Attorney telephone in represented-mover block", "the fixture selects the unrepresented mover block"),
    protectedField(FORM_ID, "attorney_signature", "Attorney signature in represented-mover block", "an attorney signs only if representation exists"),
    protectedField(FORM_ID, "mover_signature", "Unrepresented mover signature", "the mover signs personally after completing and reviewing the motion"),
    courtField(FORM_ID, "rule_return_date", "Hearing date set by the court clerk on the Rule to Show Cause", "the court sets the return date after filing", 2),
    courtField(FORM_ID, "rule_return_time", "Hearing time set by the court clerk on the Rule to Show Cause", "the court sets the return time after filing", 2),
    courtField(FORM_ID, "rule_return_place", "Courtroom or place set by the court clerk on the Rule to Show Cause", "the court sets the return place after filing", 2),
    courtField(FORM_ID, "rule_judge_signature", "Judge signature on the Rule to Show Cause", "the rule issues from the court", 2),
    courtField(FORM_ID, "order_date", "Date of the court order", "the court dates its judgment", 3),
    courtField(FORM_ID, "order_place", "Place of the court order", "the court supplies the place of its judgment", 3),
    courtField(FORM_ID, "order_judge_signature", "Judge signature on the Order of Dismissal", "the judge signs only if and when the court enters an order", 3),
    courtField(FORM_ID, "rule_district_attorney_service", "District Attorney service recipient on the Rule to Show Cause", "the clerk completes the official service address", 2),
    courtField(FORM_ID, "order_district_attorney_service", "District Attorney service recipient on the Order of Dismissal", "the clerk completes the official service address", 3)
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
    canonicalWrites: writesFor(FACTS.canonical),
    canonicalRefusals: [...missingFor(FACTS.canonical), ...protectedOrInapplicable],
    boundaryWrites: writesFor(FACTS.boundary),
    boundaryRefusals: [...missingFor(FACTS.boundary), ...protectedOrInapplicable]
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
  lines.push("STATE OF LOUISIANA");
  lines.push(`${facts["case.judicial_district"]} FOR THE PARISH OF ${facts["case.parish"]}`);
  lines.push(`No.: ${facts["case.docket_number"]}     Division: ${facts["case.division"]}`);
  lines.push("State of Louisiana");
  lines.push("vs.");
  lines.push(facts["participant.full_legal_name"], "");
}

function primaryBody(facts) {
  assert.equal(facts["case.deferred_period_run_confirmed"], true,
    "Article 987 allegation cannot be rendered until the participant confirms the deferred-sentence period has run");
  assert.equal(facts["case.probation_terms_completed_confirmed"], true,
    "Article 987 allegation cannot be rendered until the participant confirms successful probation completion");
  assert.ok(["Article 894(B) Misdemeanors", "Article 893(E) Felonies"].includes(facts["case.article_selection"]));
  assert.equal(facts["case.represented_by_counsel"], false,
    "these fixtures exercise the statutory unrepresented-mover branch only");
  const valueOrBlank = (factId, count = 42) => facts[factId] || DOTS(count);
  const misdemeanor = facts["case.article_selection"] === "Article 894(B) Misdemeanors";
  const lines = [];
  caption(lines, facts);
  lines.push("MOTION TO SET ASIDE CONVICTION AND DISMISS PROSECUTION", "");
  lines.push("NOW INTO HONORABLE COURT, comes", "");
  lines.push("[X] Defendant, OR");
  lines.push("[ ] Defendant through undersigned Counsel,", "");
  lines.push("who moves that the conviction pursuant to Louisiana Code of Criminal Procedure", "");
  lines.push(`${misdemeanor ? "[X]" : "[ ]"} Article 894(B) Misdemeanors, OR`);
  lines.push(`${misdemeanor ? "[ ]" : "[X]"} Article 893(E) Felonies`, "");
  lines.push("in the above numbered case be set aside and that the prosecution dismissed in accordance with the Code of Criminal Procedure in that the period of the deferred sentence has run and petitioner has successfully completed the terms of his probation.", "");
  lines.push("The mover is further identified below:", "");
  lines.push(`DOCKET NUMBER: ${facts["case.docket_number"]}`);
  lines.push(`CHARGE: ${valueOrBlank("case.charge")}`);
  lines.push(`DATE OF ARREST: ${valueOrBlank("case.arrest_date")}`);
  lines.push(`ARRESTING AGENCY: ${valueOrBlank("case.arresting_agency")}`);
  lines.push(`CITY/PARISH OF ARREST: ${valueOrBlank("case.arrest_city_or_parish")}`, "");
  lines.push("The Mover prays that, after a contradictory hearing with the District Attorney's Office, the Court order the above numbered case be set aside and that the prosecution dismissed in accordance with the Code of Criminal Procedure.", "");
  lines.push("Respectfully submitted,", "");
  lines.push(`${DOTS(44)}  Signature of Attorney for Mover/Defendant`);
  lines.push(`${DOTS(44)}  Attorney for Mover/Defendant Name`);
  lines.push(`${DOTS(44)}  Attorney's Bar Roll No.`);
  lines.push(`${DOTS(44)}  Address`);
  lines.push(`${DOTS(44)}  City, State, ZIP Code`);
  lines.push(`${DOTS(44)}  Telephone Number`, "");
  lines.push("If not represented by counsel:", "");
  lines.push(`${DOTS(44)}  Signature of Mover/Defendant`);
  lines.push(`${facts["participant.full_legal_name"]}  Mover/Defendant Name`);
  lines.push(`${facts["participant.street_address"]}  Address`);
  lines.push(`${facts["participant.city_state_zip"]}  City, State, ZIP Code`);
  lines.push(`${facts["participant.telephone"]}  Telephone Number`);
  lines.push(PAGE_BREAK);

  caption(lines, facts);
  lines.push("RULE TO SHOW CAUSE", "");
  lines.push("IT IS HEREBY ORDERED, that the District Attorney show cause on the _______ day of ______________________, 20 _____, at ______ o'clock __m why the foregoing motion should not be granted.", "");
  lines.push("THUS ORDERED AND SIGNED this ____ day of _________________, 20 ____ at ______________, Louisiana, ___________________________.", "");
  lines.push(DOTS(35));
  lines.push("JUDGE", "");
  lines.push("PLEASE SERVE:", "");
  lines.push(`1. District Attorney: ${DOTS(47)}`);
  lines.push(`2. Attorney for Defendant and/or Defendant: ${facts["participant.full_legal_name"]}`);
  lines.push(PAGE_BREAK);

  caption(lines, facts);
  lines.push("ORDER OF DISMISSAL", "");
  lines.push("Considering the Motion to Set Aside Conviction and Dismiss Prosecution, the hearing conducted on the representation of the State of Louisiana of its consent hereto, and that there is no opposition for any good cause appearing herein;", "");
  lines.push("IT IS ORDERED, ADJUDGED AND DECREED that this conviction is set aside and the prosecution dismissed for purposes of expungement.", "");
  lines.push("THUS ORDERED AND SIGNED this _____ day of _______________, 20 ____ at ________________, Louisiana.", "");
  lines.push(DOTS(35));
  lines.push("JUDGE", "");
  lines.push("PLEASE SERVE:", "");
  lines.push(`1. District Attorney: ${DOTS(47)}`);
  lines.push(`2. Attorney for Defendant and/or Defendant: ${facts["participant.full_legal_name"]}`);
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

function requiredItemsForFixture(maps, fixture) {
  if (fixture === "canonical") return requiredItems(maps);
  return requiredItems(maps.map((map) => ({ ...map, canonicalRefusals: map.boundaryRefusals })));
}

function parseIsoCalendarDate(value, label) {
  assert.match(String(value ?? ""), /^\d{4}-\d{2}-\d{2}$/, `${label} must be YYYY-MM-DD`);
  const [year, month, day] = value.split("-").map(Number);
  const millis = Date.UTC(year, month - 1, day);
  const parsed = new Date(millis);
  assert.equal(parsed.getUTCFullYear(), year, `${label} must be a real calendar date`);
  assert.equal(parsed.getUTCMonth(), month - 1, `${label} must be a real calendar date`);
  assert.equal(parsed.getUTCDate(), day, `${label} must be a real calendar date`);
  return millis;
}

function daysBetween(earlier, later) {
  return Math.floor((parseIsoCalendarDate(later, "planned filing date") - parseIsoCalendarDate(earlier, "document date")) / 86_400_000);
}

export function classifyArticle9781DocumentStatus(requirement, supplied, plannedFilingDate) {
  parseIsoCalendarDate(plannedFilingDate, "planned filing date");
  const kindAccepted = supplied.provided === true && requirement.acceptedKinds.includes(supplied.kind);
  let collectionStatus = supplied.provided === true ? "invalid" : "not_provided";
  let validationCode = supplied.provided === true ? "rejected_unrecognized_document_kind" : "awaiting_participant_upload_or_handoff";
  let participantStatus = supplied.provided === true ? "Reported provided — document type is not accepted" : "Not provided";
  let participantNextAction = supplied.provided === true
    ? "Select an accepted document type or obtain an accepted document before the later filing."
    : "Upload the document or hand it to authorized staff before the later filing.";
  let ageAtPlannedFilingDays = null;
  if (kindAccepted) {
    collectionStatus = "provided";
    validationCode = "provided_pending_human_content_review";
    participantStatus = "Reported provided — document still needs review";
    participantNextAction = "Make the actual document available for review before the later filing.";
  }
  if (kindAccepted && requirement.maximumAgeAtFilingDays) {
    try {
      assert.ok(supplied.documentDate, "document date is required");
      ageAtPlannedFilingDays = daysBetween(supplied.documentDate, plannedFilingDate);
      if (ageAtPlannedFilingDays < 0) {
        collectionStatus = "invalid";
        validationCode = "rejected_future_document_date";
        participantStatus = "Reported provided — document date is after the planned filing date";
        participantNextAction = "Correct the date or obtain a valid document before the later filing.";
      } else if (ageAtPlannedFilingDays > requirement.maximumAgeAtFilingDays) {
        collectionStatus = "stale";
        validationCode = "rejected_stale_at_planned_filing";
        participantStatus = `Reported provided — ${ageAtPlannedFilingDays} days old and stale at planned filing`;
        participantNextAction = "Obtain a current background check before the later filing.";
      }
    } catch {
      collectionStatus = "invalid";
      validationCode = "rejected_missing_or_invalid_document_date";
      participantStatus = "Reported provided — document date is missing or invalid";
      participantNextAction = "Correct the date or obtain a valid document before the later filing.";
    }
  }
  return { collectionStatus, validationCode, participantStatus, participantNextAction, ageAtPlannedFilingDays };
}

function article9781DocumentStatuses(facts, fixture) {
  const factIds = [
    "documents.article_978_1.background_check",
    "documents.article_978_1.da_certification",
    "documents.article_978_1.final_disposition",
    "documents.article_978_1.charging_instrument"
  ];
  const felonyLaterRoute = facts["case.article_selection"] === "Article 893(E) Felonies";
  const plannedFilingDate = facts["case.planned_article_978_filing_date"];
  parseIsoCalendarDate(plannedFilingDate, "planned filing date");
  return ARTICLE_978_1_DOCUMENTS.map((requirement, index) => {
    const supplied = facts[factIds[index]] ?? { provided: false };
    const classification = classifyArticle9781DocumentStatus(requirement, supplied, plannedFilingDate);
    return {
      ...requirement,
      type: "participant-case-document",
      statutoryRequirement: true,
      requiredFor: "a later Article 978 felony expungement motion submitted after Article 987 relief",
      requiredForCurrentArticle987Filing: false,
      requiredForThisFixtureLaterExpungement: felonyLaterRoute,
      fixture,
      fixtureInputOnly: true,
      actualDocumentFabricatedOrBundledByBuilder: false,
      collectionStatus: classification.collectionStatus,
      declaredKind: supplied.kind ?? null,
      documentDate: supplied.documentDate ?? null,
      plannedFilingDate,
      ageAtPlannedFilingDays: classification.ageAtPlannedFilingDays,
      validationCode: classification.validationCode,
      reviewStatus: classification.collectionStatus === "provided" ? "pending_human_content_review" : "blocked_before_review",
      participantStatus: classification.participantStatus,
      participantNextAction: classification.participantNextAction,
      mustCollectActualCaseDocument: true,
      participantUploadOrHandoff: classification.collectionStatus === "provided"
        ? "Make the actual document available by authenticated upload or authorized staff handoff for review."
        : "Participant must upload the actual private case document or hand it to authorized staff; the builder cannot create or presume it.",
      blocksArticle978PacketReady: felonyLaterRoute,
      selfHelpTreatment: classification.collectionStatus === "provided"
        ? "Do not treat metadata as proof of document contents; manual review remains required."
        : "Stop before Article 978 filing and obtain a current acceptable document."
    };
  });
}

function participantInstructions(requiredBeforeFiling, documentStatuses, name) {
  const lines = [
    "# Louisiana Article 987 participant instructions",
    "",
    `Prepared for **${name}**.`,
    "",
    "## What is included",
    "",
    "- The mandatory three-part Article 987 statutory instrument: Motion, Rule to Show Cause, and Order of Dismissal.",
    "- Participant and filing instructions included after the statutory instrument.",
    "",
    "## What this filing does and does not do",
    "",
    "This is not an expungement and does not itself clear any record. It is the predicate filing that can convert a completed deferred sentence into a set-aside conviction and dismissed prosecution under Article 894(B) for a misdemeanor or Article 893(E) for a felony. After the Order of Dismissal is signed, return to the Article 977(A)(1) misdemeanor expungement track or Article 978(A)(1) felony expungement track that applies.",
    "",
    "## Required before filing this Article 987 motion",
    "",
    "Check every prefilled neutral participant and case fact against the court record and correct the packet if it disagrees."
  ];
  if (requiredBeforeFiling.length) {
    lines.push(
      "",
      "The following missing item remains yours alone and is intentionally left blank on the instrument:",
      "",
      "| Blank on the document | What you must supply |",
      "| --- | --- |"
    );
    for (const item of requiredBeforeFiling) lines.push(`| ${item.disclosureLabel} | ${item.participantMustSupply} |`);
  } else {
    lines.push("", "Every neutral form field required by this fixture is present. Review those values against the actual case record before signing.");
  }
  lines.push(
    "",
    "Conditionally obtain the minute entry or sentencing order showing the deferred sentence under Article 893 or Article 894 from the clerk of the sentencing court wherever the court or district attorney asks to see the basis for the deferral. Check the deferred-sentence date against it.",
    "",
    "Conditionally obtain proof of successful completion of probation from the supervising probation office, or the Department of Public Safety and Corrections, Division of Probation and Parole, wherever completion may be questioned, which the committed record says is most cases. Have it before the return date and check your completion answer against it.",
    "",
    "## Article 978.1 documents for the later felony-expungement step",
    "",
    "Article 978.1 does not turn these documents into attachments to this Article 987 predicate motion. If the signed Article 987 order leads to a felony expungement under Article 978, the participant must submit all four actual case documents to the Bureau of Criminal Identification and Information with that later motion. LegalEase does not create them, infer them, or mark them received without a participant upload or an authorized handoff.",
    "",
    "| Article 978.1 document | Collection status | Validation and next action |",
    "| --- | --- | --- |"
  );
  for (const row of documentStatuses) {
    lines.push(`| ${row.document} | ${row.participantStatus} | ${row.participantNextAction} |`);
  }
  lines.push(
    "",
    "A background check is stale if it will be more than 60 days old when the later expungement motion is filed. The district attorney certification requires content review for both Article 978 statements. Court minutes may be replaced only by a charge disposition report or a clerk letter stating that no such records exist. A charging instrument must be a bill of information, indictment, or affidavit.",
    "",
    "Missing, stale, unrecognized, or unreviewed documents block a later Article 978 packet-ready decision. They do not become fabricated attachments and do not change the purpose of this Article 987 filing.",
    "",
    "## Fields deliberately left blank",
    "",
    "- Sign only the unrepresented-mover block after the motion is complete. If you are represented, give the instrument to your attorney; the attorney block belongs to counsel.",
    "- Leave the Rule to Show Cause return date, time, place, and judge signature blank. The court sets them and the clerk supplies the return information.",
    "- Leave the date, place, and judge signature in the Order of Dismissal blank. The statutory proposed-order language stays printed; it has no effect until the judge signs and the clerk enters the order.",
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
    "8. If the next track is Article 978 felony expungement, Article 978.1 requires four actual participant/case documents with that later motion: a Louisiana State Police or sheriff background check dated within sixty days of filing; the district attorney certification; court minutes showing final disposition or an allowed substitute; and the charging instrument. Missing, stale, or unreviewed documents stop that later packet from becoming ready.",
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

/* Internal component identity is useful on instructions, but the Article 987
 * pages reproduce a prescribed filed instrument. Those three pages carry no
 * route key, form-id banner, build note, or machine footer. Their identity
 * remains in the packet's component-page manifest instead. */
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
  if (componentIdentity) {
    const footer = `Assigned component identity: ${componentIdentity}`;
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
    const fixtureWrites = fixture === "boundary" ? map.boundaryWrites : map.canonicalWrites;
    for (const row of fixtureWrites) {
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
  const documentStatuses = Object.fromEntries(["canonical", "boundary"].map((fixture) => [
    fixture,
    article9781DocumentStatuses(FACTS[fixture], fixture)
  ]));

  for (const fixture of ["canonical", "boundary"]) {
    const body = primaryBody(FACTS[fixture]);
    for (const phrase of [
      "NOW INTO HONORABLE COURT, comes",
      "in the above numbered case be set aside and that the prosecution dismissed",
      "IT IS HEREBY ORDERED, that the District Attorney show cause",
      "Considering the Motion to Set Aside Conviction and Dismiss Prosecution",
      "IT IS ORDERED, ADJUDGED AND DECREED that this conviction is set aside",
      "PLEASE SERVE:"
    ]) assert.ok(body.includes(phrase), `${fixture}: prescribed Article 987 phrase missing: ${phrase}`);
    for (const forbidden of [FORM_ID, ROUTE_KEY, "PARTICIPANT ASSERTIONS", "COURT USE ONLY", "Conviction statute:"])
      assert.equal(body.includes(forbidden), false, `${fixture}: internal or substitute form text leaked: ${forbidden}`);
  }
  assert.deepEqual(documentStatuses.boundary.map((row) => row.collectionStatus),
    ["stale", "not_provided", "provided", "not_provided"]);
  assert.equal(documentStatuses.canonical.every((row) => row.collectionStatus === "provided"), true);

  if (checkOnly) {
    return {
      familyId: FAMILY_ID,
      status: "CHECK_ONLY",
      routeKey: ROUTE_KEY,
      implementationStrategy: STRATEGY,
      custodyClass: CUSTODY_CLASS,
      sourceBinariesRequired: 0,
      authoritySourceBytesHeld: binding.authoritySources.length,
      components: COMPONENTS,
      recordsBound: binding.records.length,
      writes: maps.reduce((sum, map) => sum + map.canonicalWrites.length, 0),
      blanks: maps.reduce((sum, map) => sum + map.canonicalRefusals.length, 0),
      article9781DocumentStatuses: documentStatuses
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });
  const artifacts = [];
  const proofs = [];

  for (const fixture of ["canonical", "boundary"]) {
    const facts = FACTS[fixture];
    const fixtureRequiredBeforeFiling = requiredItemsForFixture(maps, fixture);
    const participantText = participantInstructions(fixtureRequiredBeforeFiling, documentStatuses[fixture], facts["participant.full_legal_name"]);
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
      assert.equal(item.body.includes(ROUTE_KEY), false, `${fixture}: internal route key must not enter delivered pages`);
      assert.equal(item.body.includes(PRIMARY), false, `${fixture}: internal primary component id must not enter delivered pages`);
      assert.equal(item.body.includes(INSTRUCTIONS), false, `${fixture}: internal instructions component id must not enter delivered pages`);
      const bytes = await renderDocument(item.body, TITLES[item.component], null);
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

  const canonicalParticipant = participantInstructions(requiredBeforeFiling, documentStatuses.canonical, FACTS.canonical["participant.full_legal_name"]);
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
    authoritySourceBytesHeld: binding.authoritySources.length,
    sourceAcquisitionAuthorized: false,
    components: [
      { componentId: PRIMARY, documentId: FORM_ID, title: TITLES[PRIMARY], role: "primary_filing", outputStrategy: STRATEGY, order: 1, required: true },
      { componentId: INSTRUCTIONS, documentId: INSTRUCTIONS, title: TITLES[INSTRUCTIONS], role: "instructions", outputStrategy: "process_guidance", order: 2, required: true }
    ],
    participantInstructions: `${OUT}/participant-instructions.md`,
    filingInstructions: `${OUT}/filing-instructions.md`,
    participantDocumentStatus: `${OUT}/participant-document-status.json`
  });
  writeJson(`${OUT}/participant-document-status.json`, {
    schemaVersion: "rcap-participant-document-status/v1",
    familyId: FAMILY_ID,
    authority: "La. C.Cr.P. art. 978.1 (Acts 2026, No. 129, Sec. 1)",
    generatedAt: FIXTURE_GENERATION_DATE,
    freshnessBasis: "Each matter must supply the planned Article 978 filing date; background-check age is measured against that date, not generation or review time.",
    stageSeparation: {
      currentPacket: "Article 987 set-aside-and-dismiss predicate motion",
      documentRequirementStage: "later Article 978 felony expungement",
      documentsRequiredForCurrentArticle987Filing: false
    },
    truthRule: "A status comes only from participant/case input. The builder never creates a supporting document, treats fixture metadata as document bytes, or treats provided metadata as completed content review.",
    fixtures: documentStatuses,
    productionRequirements: ARTICLE_978_1_DOCUMENTS.map((row) => ({
      ...row,
      required: true,
      mustCollectActualCaseDocument: true,
      allowedCollectionMethods: ["authenticated participant private upload", "authorized staff handoff into participant-owned matter"],
      allowedStatuses: ["not_provided", "provided", "stale", "invalid"],
      providedIsNotValidated: true
    }))
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
    sourceStatus: "SOURCE_BOUND_BY_HELD_BYTES",
    officialFormFamily: FORM_ID,
    acquisitionCommissioned: false,
    sourceAcquisitionAuthorized: false,
    sourceBinariesRequired: 0,
    sourceBinaryCommitted: true,
    sourceBinarySha256: binding.authoritySources.find((row) => row.sourceId.endsWith("ART-987")).sha256,
    allSourcesExact: true,
    allSourcesExactNote: "The builder re-hashes the exact held Article 986, 978.1, and 987 authority bytes adopted on 2026-09-11 and refuses a mismatch. Article 987 remains composed from codified text rather than overlaid onto an issuer PDF.",
    bindingMethod: "the governed 2026-09-11 source-adoption family entry and all three held authority files are re-read and hash-checked at build time; committed legal-design records are also bound by whole-file and family-entry SHA-256",
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
      heldSourcePath: binding.authoritySources.find((row) => row.sourceId.endsWith("ART-987")).heldCorpusPath,
      sourceBinarySha256: binding.authoritySources.find((row) => row.sourceId.endsWith("ART-987")).sha256,
      compositionTreatment: "COMPOSE_FROM_AUTHORITY"
    },
    sources: binding.authoritySources,
    documents: binding.authoritySources.map((row) => ({
      sourceId: row.sourceId,
      path: row.heldCorpusPath,
      sha256: row.sha256,
      byteLength: row.byteLength,
      issuingAuthority: row.issuingAuthority,
      officialUrl: row.officialUrl
    })),
    groundingRecords: binding.records,
    composedComponentsAuthoredByThisBuild: COMPONENTS,
    commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "independent verification, raster acceptance, visual acceptance, counsel approval, or approval for participant delivery",
      "that any real participant's deferred-sentence period has run or that probation was successfully completed; fixture confirmations are synthetic",
      "that Article 978.1 participant documents exist or passed content review merely because fixture metadata says provided",
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
    requiredBeforeFilingByFixture: {
      canonical: requiredItemsForFixture(maps, "canonical"),
      boundary: requiredItemsForFixture(maps, "boundary")
    },
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
    boundSources: binding.authoritySources,
    boundSourcesNote: "The form is composed from the exact held Article 987 codified HTML; Article 986 and the 2026 Article 978.1 authority bytes are separately hash-bound.",
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
    requiredBeforeFilingByFixture: {
      canonical: requiredItemsForFixture(maps, "canonical"),
      boundary: requiredItemsForFixture(maps, "boundary")
    },
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
        finding: "The catalog declares official_pdf_fill while the Louisiana Legislature publishes Article 987 as codified text rather than an issuer fillable PDF.",
        treatment: "The existing LA-STATUTORY-FORMS COMPOSE_FROM_AUTHORITY decision is bound together with the governed source-adoption record and exact held Article 986, 978.1, and 987 hashes."
      },
      {
        finding: "The authoritative component set contains one primary-filing component and one instructions component.",
        treatment: "Both components are rendered in authoritative order in the canonical and boundary packets, and every packet page is assigned in the component-page manifest."
      },
      {
        finding: "The participant owns the assertions that the deferred-sentence period ran and probation was successfully completed.",
        treatment: "The renderer refuses to generate the prescribed allegation unless both case-specific confirmations are true; the fixture confirmations are explicitly synthetic and are not inferred from route selection."
      },
      {
        finding: "The Rule to Show Cause and Order of Dismissal contain court-owned return, date, place, service-address, and signature fields.",
        treatment: "Every such field remains protected. The prescribed proposed-order recitals and decretal sentence remain printed, while no judicial execution field is written."
      },
      {
        finding: "Article 978.1 requires four actual participant/case documents for a later Article 978 felony-expungement filing.",
        treatment: "A dedicated status record distinguishes required, provided, not provided, and stale inputs; validates the 60-day background-check rule and allowed document kinds; preserves the later-stage boundary; and requires private upload or authorized handoff instead of fabrication."
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
      "Confirm the post-order handoff to the applicable Article 977(A)(1) or Article 978(A)(1) expungement track.",
      "Confirm the Article 978.1 status model requires actual participant documents, treats a background check older than sixty days as stale, and never calls metadata a validated document."
    ],
    mattersForTheReviewersAttention: [
      "The source receipt binds the exact held Article 986, 978.1, and 987 bytes plus the governed adoption entry.",
      "Every missing participant fact, signature, attorney-only field, court return field, and order execution field is classified.",
      "Historical FAIL/BLOCKED evidence remains history and requires current-byte independent supersession.",
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
