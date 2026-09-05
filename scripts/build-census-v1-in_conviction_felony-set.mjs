#!/usr/bin/env node
/**
 * Deterministic census-v1 builder for `in_conviction_felony-set`.
 *
 *   node scripts/build-census-v1-in_conviction_felony-set.mjs --no-raster
 *   node scripts/build-census-v1-in_conviction_felony-set.mjs --check
 *
 * WHAT THIS FAMILY IS
 *
 * The Indiana packet for a felony conviction not covered by Sections 2 or 3,
 * I.C. 35-38-9-4, filed as case type XP in a circuit or superior court in the
 * county of conviction. The grant on this section is DISCRETIONARY, and the
 * effect is Section 7 rather than Section 6: court and public records stay
 * public and are clearly and visibly marked expunged. Both facts are printed on
 * the packet, because a participant who reads Section 6 sealing into a Section 7
 * order has been misled by the packet.
 *
 * TWO TREATMENTS IN ONE PACKET, AND WHY
 *
 * The committed source reconciliation on the queue row fixes both halves in one
 * sentence: "Compose the petition and proposed order from Indiana authority;
 * retain the separately bound statewide supporting forms." The Captain source
 * identity determination says the same thing about the two candidates that were
 * once thought to be official forms: "Neither candidate is an official published
 * form. ACQUIRE_EXACT_SOURCE -> COMPOSE_FROM_AUTHORITY."
 *
 * So the petition and the proposed order are COMPOSED here, and the four
 * statewide supporting forms are RETAINED -- delivered into the packet exactly
 * as their issuer published them, byte for byte, with nothing written on them.
 *
 * WHAT THIS BUILD DOES NOT CLAIM, STATED HERE RATHER THAN DISCOVERED LATER
 *
 * It does not field-map the retained official forms. Those four documents carry
 * around one hundred and ninety AcroForm widgets between them, and the printed
 * captions harvested at their own positions are fragments -- "b", "but the",
 * "_______ e" -- on a form whose second and third pages are the court's findings
 * and order rather than the participant's to complete. Classifying that from
 * captions would produce a field map that reads as authoritative and is not one.
 * A field-level map for those documents belongs to the official_pdf_fill
 * treatment and is owed; it is recorded as owed in build-findings.json and in
 * approval-request.json rather than approximated here.
 *
 * Nothing is hidden by that decision. Every widget on every retained page is
 * enumerated with its page, its rectangle, the caption harvested at its own
 * measured position and the basis of that harvest, in
 * reports/retained-official-form-widgets.json, and the participant instructions
 * say plainly that those forms arrive blank and are completed by hand.
 *
 * The nine completeness counters therefore measure the two documents this build
 * authored. That is what they measure, and the report says so.
 *
 * PAGE SELECTION IS PROVED, NOT ASSERTED
 *
 * Three of the four retained forms are pages inside one fifteen-page published
 * bundle. Each selected page is verified at build time against the form number
 * the issuer printed in that page's own footer before it is copied, so the slice
 * is evidence rather than a claim about page numbers.
 *
 * SOURCES ARE RESOLVED BY CONTENT HASH, NEVER BY DECLARED PATH.
 * EVERY RECORD IS PINNED TWICE -- whole file, and this family's own entry.
 *
 * This build never rasterises, never verifies itself, opens no route and changes
 * no central state.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines, captureWidgetContext } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { PASS_COUNTERS, BLANK_DISPOSITIONS, classifyBlank, classifyField, rowKeyOf }
  from "./rcap-packet-completeness/completeness-contract.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

/* ---------------------------------------------------------------- identity */

const FAMILY_ID = "in_conviction_felony-set";
const TRACK_ID = "in_conviction_felony";
const JURISDICTION = "IN";
const STRATEGY = "custom_pleading";
const CUSTODY_CLASS = "SOURCE_BOUND_BY_HELD_BYTES";
const STATUTE = "I.C. 35-38-9-4";
const OUT = "data/rcap-all50/overlays/census-v1/in/in-conviction-felony-set--custom-pleading";
const BUILD_SCRIPT = "scripts/build-census-v1-in_conviction_felony-set.mjs";
const IDENTITY_DETERMINATION = "DET-IN-CCA-CANDIDATES-ARE-NOT-OFFICIAL-in_conviction_felony-set";
const INSERT_FORM = "CCA-XP-0220-7010";

const PETITION = "IN-CONVICTION-EXPUNGEMENT-PETITION";
const ORDER = "IN-CONVICTION-EXPUNGEMENT-ORDER";

const COMPONENT = Object.freeze({
  petition: "in_conviction_felony-primary-filing-1",
  order: "in_conviction_felony-proposed-order-2",
  insert: "in_conviction_felony-attachment-3",
  appearance: "in_conviction_felony-attachment-4",
  accessNotice: "in_conviction_felony-attachment-5",
  confidential: "in_conviction_felony-attachment-6"
});

const COMPOSED_COMPONENTS = [COMPONENT.petition, COMPONENT.order];
const RETAINED_COMPONENTS = [COMPONENT.insert, COMPONENT.appearance, COMPONENT.accessNotice, COMPONENT.confidential];
const ALL_COMPONENTS = [...COMPOSED_COMPONENTS, ...RETAINED_COMPONENTS];

const TITLES = Object.freeze({
  [COMPONENT.petition]: "Verified Petition for Expungement of Conviction Records",
  [COMPONENT.order]: "Order on the Verified Petition for Expungement of Conviction Records",
  [COMPONENT.insert]: "Conviction Expungement Insert",
  [COMPONENT.appearance]: "Appearance by Unrepresented Person in Expungement Matter",
  [COMPONENT.accessNotice]: "Notice of Exclusion of Confidential Information from Public Access",
  [COMPONENT.confidential]: "Confidential Information Form"
});

/**
 * The retained official documents, and the evidence that fixes each slice.
 *
 * `marker` is the string the issuer printed on every selected page. It is read
 * from the page before the page is copied, so a bundle that is re-paginated
 * stops this build instead of silently shipping the wrong sheet.
 */
const RETAINED = Object.freeze([
  {
    componentId: COMPONENT.insert,
    documentId: INSERT_FORM,
    sourceId: `official-form:${INSERT_FORM}`,
    pages: [1, 2, 3],
    marker: INSERT_FORM,
    issuer: "Indiana Coalition for Court Access",
    whatItIs: "the conviction insert for this section, carrying the facts, findings and exhibit pages that the petition and the order both call for"
  },
  {
    componentId: COMPONENT.appearance,
    documentId: "CCA-GF-0120-3016",
    sourceId: "official-form:CCA-GF-0120-3016",
    pages: [1, 2],
    marker: "CCA-GF-0120-3016",
    issuer: "Indiana Coalition for Court Access",
    whatItIs: "the Appearance by Unrepresented Person in Expungement Matter, which also carries the certificate of service to the county prosecutor"
  },
  {
    componentId: COMPONENT.accessNotice,
    documentId: "CCA-XP-0120-7002 Form ACR",
    sourceId: "official-form:CCA-XP-0120-7002 Form ACR",
    pages: [7],
    marker: "CCA-XP-0120-7002",
    issuer: "Indiana Coalition for Court Access",
    whatItIs: "Form ACR, the Notice of Exclusion of Confidential Information from Public Access"
  },
  {
    componentId: COMPONENT.confidential,
    documentId: "Confidential Information Form",
    sourceId: "official-form:Confidential Information Form",
    pages: [8],
    marker: "CONFIDENTIAL INFORMATION FORM",
    issuer: "Indiana Coalition for Court Access",
    whatItIs: "the Confidential Information Form, which carries the full Social Security number and is filed as a confidential document"
  }
]);

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const DOTS = (count) => ".".repeat(count);

/* ----------------------------------------------------------- the records */

const RECORDS = Object.freeze({
  identity: "data/rcap-grade-a/source-wave-integration/CAPTAIN_SOURCE_IDENTITY_DETERMINATIONS.json",
  queue: "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json",
  census: "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
  memo: "data/record-clearing/legal-design-intake/IN.memo.json",
  registry: "data/record-clearing/legal-design-track-registry.json",
  manifest: "data/record-clearing/legal-design-packet-set-manifests.json",
  relationships: "data/record-clearing/legal-design-track-source-relationships.json"
});

const stable = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
};
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const entryDigest = (value) => sha256(Buffer.from(stable(value), "utf8"));

function readRecord(relative) {
  const bytes = fs.readFileSync(path.join(ROOT, relative));
  return { path: relative, bytes, data: JSON.parse(bytes.toString("utf8")), sha256: sha256(bytes), byteLength: bytes.length };
}

function loadAuthorityBinding() {
  const loaded = Object.fromEntries(Object.entries(RECORDS).map(([key, rel]) => [key, readRecord(rel)]));
  const pins = [];
  const pin = (key, pointer, entry) => {
    const record = loaded[key];
    pins.push({
      record: record.path,
      wholeFileSha256: record.sha256,
      byteLength: record.byteLength,
      thisFamilysEntry: pointer,
      thisFamilysEntrySha256: entryDigest(entry),
      whyBothPinsExist: "the whole-file pin detects any edit to a shared national record; the entry pin says whether the edit touched this family"
    });
    return entry;
  };

  const determination = loaded.identity.data.determinations.find((row) => row.id === IDENTITY_DETERMINATION);
  assert.ok(determination, `${IDENTITY_DETERMINATION} is missing`);
  assert.deepEqual(determination.families, [FAMILY_ID]);
  assert.match(determination.determination, /COMPOSE_FROM_AUTHORITY/);
  assert.deepEqual(determination.obligations, [
    "official-form:CCA conviction expungement petition",
    "official-form:CCA conviction expungement order"
  ], "the determination no longer names exactly the two obligations this build composes");
  pin("identity", `determinations[id=${IDENTITY_DETERMINATION}]`, determination);

  const queueFamily = loaded.queue.data.families.find((row) => row.familyId === FAMILY_ID);
  assert.ok(queueFamily, `MASTER_QUEUE carries no ${FAMILY_ID}`);
  assert.equal(queueFamily.implementationStrategy, STRATEGY);
  assert.equal(queueFamily.sourceStatus, CUSTODY_CLASS);
  assert.equal(queueFamily.sourceReadiness?.ready, true);
  assert.equal(queueFamily.directory, OUT);
  assert.equal(queueFamily.buildScript, BUILD_SCRIPT);
  assert.equal(queueFamily.sourceReconciliation?.exactNextAction,
    "Compose the petition and proposed order from Indiana authority; retain the separately bound statewide supporting forms.",
    "the committed next action for this family has changed; this build states the action it was written against");
  pin("queue", `families[familyId=${FAMILY_ID}]`, queueFamily);

  const routes = loaded.census.data.routes.filter((row) => row.packetSetId === FAMILY_ID);
  assert.equal(routes.length, queueFamily.routeKeys.length);
  pin("census", `routes[packetSetId=${FAMILY_ID}]`, routes);

  const memoTrack = loaded.memo.data.tracks.find((row) => row.trackId === TRACK_ID);
  assert.ok(memoTrack && Array.isArray(memoTrack.selfHelpStopConditions) && memoTrack.selfHelpStopConditions.length > 0);
  pin("memo", `tracks[trackId=${TRACK_ID}]`, memoTrack);

  const registryTrack = loaded.registry.data.tracks.find((row) => row.trackId === TRACK_ID);
  assert.ok(registryTrack?.destination?.name && registryTrack.destination.detail && registryTrack.venue);
  assert.ok(Array.isArray(registryTrack.packetSet?.participantActionRequired));
  assert.ok(Array.isArray(registryTrack.legalDesignLimitations) && registryTrack.legalDesignLimitations.length > 0);
  pin("registry", `tracks[trackId=${TRACK_ID}]`, registryTrack);

  const packetSet = loaded.manifest.data.packetSets.find((row) => row.packetSetId === FAMILY_ID);
  assert.ok(packetSet, `the packet-set manifest carries no ${FAMILY_ID}`);
  pin("manifest", `packetSets[packetSetId=${FAMILY_ID}]`, packetSet);

  const relationships = (loaded.relationships.data.relationships ?? []).filter((row) => row.trackId === TRACK_ID);
  pin("relationships", `relationships[trackId=${TRACK_ID}]`, relationships);

  const components = [...packetSet.components].sort((a, b) => a.order - b.order);
  assert.deepEqual(components.map((c) => c.componentId), ALL_COMPONENTS,
    "the authoritative component set has changed; this build states the set it was written against");
  const insertComponent = components.find((c) => c.componentId === COMPONENT.insert);
  assert.equal(insertComponent.officialFormId, INSERT_FORM, `the required insert for this family is no longer ${INSERT_FORM}`);
  const appearance = components.find((c) => c.componentId === COMPONENT.appearance);
  assert.equal(appearance.requirement, "conditional");
  assert.match(String(appearance.conditionDescription), /self-represented/i);

  return { determination, queueFamily, routes, memoTrack, registryTrack, packetSet, components, relationships, pins };
}

/* ------------------------------------------- sources, resolved by content */

const CORPUS_ROOTS = [
  process.env.MASTER_LIBRARY_SOURCE_DIR ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1",
  "private/human-source-returns"
];

function corpusByContentHash() {
  const index = new Map();
  const walk = (dir, custody) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full, custody); continue; }
      const digest = sha256(fs.readFileSync(full));
      if (!index.has(digest)) index.set(digest, { custody, path: path.relative(ROOT, full) });
    }
  };
  const mounted = [];
  for (const root of CORPUS_ROOTS) {
    const abs = path.resolve(ROOT, root);
    if (!fs.existsSync(abs)) continue;
    mounted.push(path.relative(ROOT, abs));
    walk(abs, path.basename(abs));
  }
  assert.ok(mounted.length > 0, `no source custody is mounted; tried ${CORPUS_ROOTS.join(", ")}`);
  return { index, mounted };
}

function resolveHeldSources(queueFamily) {
  const { index, mounted } = corpusByContentHash();
  const resolved = [];
  const absent = [];
  for (const declared of queueFamily.sourceHashes ?? []) {
    const hit = index.get(declared.sha256);
    if (!hit) { absent.push({ sourceId: declared.sourceId, sha256: declared.sha256, declaredPath: declared.path }); continue; }
    const bytes = fs.readFileSync(path.join(ROOT, hit.path));
    assert.equal(sha256(bytes), declared.sha256, `the content-hash index disagrees with the file at ${hit.path}`);
    resolved.push({
      sourceId: declared.sourceId,
      declaredPath: declared.path,
      resolvedPath: hit.path,
      resolvedCustody: hit.custody,
      resolvedBy: "content_hash_across_the_mounted_corpus",
      sha256: declared.sha256,
      byteLength: bytes.length,
      tier: declared.tier,
      sha256Exact: true,
      bytes
    });
  }
  return { resolved, absent, mounted };
}

/* ------------------------------------------------------------- fixtures */

const FIXTURES = Object.freeze({
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1991-04-17",
    "matter.court_name": "Marion Superior Court, Criminal Division",
    "matter.county": "County of Marion",
    "matter.cause_number": "49D01-1503-F6-011234",
    "matter.conviction_date": "2015-06-18",
    "matter.offense_description": "Offense as it appears on the canonical fixture court record",
    "matter.offense_level": "Level 5 felony not covered by I.C. 35-38-9-2 or 35-38-9-3",
    "matter.statutory_section": "I.C. 35-38-9-4",
    "matter.sentence_completion_date": "2016-06-18",
    "matter.financial_obligations": "All fines, fees and court costs are paid and no restitution was ordered",
    "matter.pending_charges": "No criminal charges are pending anywhere",
    "matter.convictions_within_period": "No conviction of any crime within the applicable period",
    "matter.prior_petition": "No petition under Sections 2 through 5 has been filed before",
    "matter.prosecutor_consent": "Not relied on; the full statutory period has elapsed"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "matter.court_name": "Lake Circuit Court sitting at Crown Point, Criminal Division",
    "matter.county": "County of Lake",
    "matter.cause_number": "45C01-0812-FB-00000000000123456",
    "matter.conviction_date": "2009-02-28",
    "matter.offense_description": "Offense exactly as it appears on the boundary fixture court record, including the full charging description carried by that record",
    "matter.offense_level": "Class B felony under the pre-2014 sentencing scheme, not covered by I.C. 35-38-9-2 or 35-38-9-3",
    "matter.statutory_section": "I.C. 35-38-9-4",
    "matter.sentence_completion_date": "2011-11-30",
    "matter.financial_obligations": "All fines, fees and court costs are paid and the restitution obligation recorded on the boundary fixture court record is satisfied in full",
    "matter.pending_charges": "No criminal charges are pending anywhere",
    "matter.convictions_within_period": "No conviction of any crime within the applicable period",
    "matter.prior_petition": "No petition under Sections 2 through 5 has been filed before",
    "matter.prosecutor_consent": "Not relied on; the full statutory period has elapsed"
  }
});

/* ------------------------------------------------------- field-map rows */

const base = (document, id, label, page) => ({
  field: `${document}.${id}`,
  fieldName: `${document}.${id}`,
  document,
  page,
  printedLabel: label,
  printedLine: label,
  effectiveLabel: label,
  regionHeading: null,
  rectBasis: "composed_pleading_authored_by_this_build_from_the_committed_Indiana_authority"
});

const write = (document, id, label, factId, page = 1) => ({ ...base(document, id, label, page), factId, kind: "composed_text" });

const supply = (document, id, label, participantMustSupply, why, page = 1, extra = {}) => ({
  ...base(document, id, label, page),
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
});

const protectedRow = (document, id, label, why, page = 1) => ({
  ...base(document, id, label, page),
  reason: "signature or date field; the person whose signature it is signs it",
  category: SIGNATURE,
  completenessClass: SIGNATURE,
  class: SIGNATURE,
  completenessDisposition: "PROTECTED_FIELD",
  requiredBeforeFiling: false,
  why
});

const courtRow = (document, id, label, why, page = 1) => ({
  ...base(document, id, label, page),
  reason: "court, clerk, prosecutor, or hearing field; the court completes it",
  category: COURT_OWNED,
  completenessClass: COURT_OWNED,
  class: COURT_OWNED,
  completenessDisposition: "PROTECTED_FIELD",
  requiredBeforeFiling: false,
  why
});

const CAPTION_WRITES = (document) => [
  write(document, "court_name", "Name of court in the county of conviction", "matter.court_name"),
  write(document, "county", "County of conviction", "matter.county"),
  write(document, "cause_number", "Cause number of the conviction", "matter.cause_number"),
  write(document, "petitioner_name", "Petitioner full legal name", "participant.full_legal_name")
];

const MATTER_WRITES = (document, page = 1) => [
  write(document, "conviction_date", "Date of conviction", "matter.conviction_date", page),
  write(document, "offense_description", "Offense as it appears on the court record", "matter.offense_description", page),
  write(document, "offense_level", "Offense level as it appears on the court record", "matter.offense_level", page),
  write(document, "statutory_section", "Statutory section this petition is brought under", "matter.statutory_section", page),
  write(document, "sentence_completion_date", "Date the sentence, including any probation or parole, was completed", "matter.sentence_completion_date", page)
];

function petitionMap() {
  const writes = [
    ...CAPTION_WRITES(PETITION),
    write(PETITION, "petitioner_date_of_birth", "Petitioner date of birth", "participant.date_of_birth"),
    ...MATTER_WRITES(PETITION),
    write(PETITION, "financial_obligations", "Whether all fines, fees and court costs are paid and any restitution satisfied", "matter.financial_obligations"),
    write(PETITION, "pending_charges", "Whether any criminal charges are pending anywhere", "matter.pending_charges"),
    write(PETITION, "convictions_within_period", "Whether the petitioner has been convicted of any crime within the applicable period", "matter.convictions_within_period"),
    write(PETITION, "prior_petition", "Whether a petition under Sections 2 through 5 has been filed before", "matter.prior_petition"),
    write(PETITION, "prosecutor_consent", "Whether the prosecuting attorney has given written consent", "matter.prosecutor_consent")
  ];
  const blanks = [
    supply(PETITION, "mailing_address", "Petitioner mailing address",
      "your current mailing address, written by hand, so the court and the prosecuting attorney can reach you",
      "the platform holds no address for this fixture and does not invent one"),
    supply(PETITION, "telephone_and_email", "Petitioner telephone number and email address",
      "the telephone number and email address you want the court to use",
      "the platform holds no contact details for this fixture and does not invent them"),
    supply(PETITION, "ssn_last_four", "Last four digits of the Social Security number",
      "the last four digits of your Social Security number, and only the last four - the full number goes on the Confidential Information Form",
      "the committed packet instruction is that only the last four digits appear on the petition and that the full number is never persisted, so the platform holds no value to write"),
    supply(PETITION, "all_indiana_convictions", "Every Indiana conviction in any county, and whether each is eligible yet",
      "the full list from your certified limited criminal history, county by county, with the eligibility date of each",
      "one petition per lifetime under I.C. 35-38-9-9(i) makes this list decisive, and only the certified limited criminal history the participant orders establishes it"),
    supply(PETITION, "serious_bodily_injury", "Whether the offense involved serious bodily injury",
      "the answer, taken from your own court record and from legal advice if it is not obvious",
      "the committed record classifies this as a legal judgment rather than a fact the platform holds, and lists it as a manual completion item"),
    supply(PETITION, "additional_information", "Additional information the petitioner wants the court to know",
      "anything else you want the court to know, in your own words",
      "the committed record says this is participant-authored and that LegalEase formats the participant's own facts rather than composing an argument"),
    protectedRow(PETITION, "verification_signature", "Verification and signature of the petitioner",
      "the petition is verified; the petitioner signs it personally", 2),
    protectedRow(PETITION, "verification_signature_date", "Date of the petitioner's signature",
      "a date written before signing would be false", 2),
    courtRow(PETITION, "xp_cause_number", "Expungement cause number assigned by the clerk",
      "the clerk opens the XP cause and assigns its number when the petition is filed", 2),
    courtRow(PETITION, "filing_stamp", "Filed on stamp applied by the clerk",
      "the clerk stamps the petition when it is filed", 2)
  ];
  return {
    formNumber: PETITION,
    documentId: PETITION,
    componentId: COMPONENT.petition,
    documentRole: "primary_filing",
    structuralClass: "verified_pleading_composed_from_authority",
    officialFormId: "CCA conviction expungement petition",
    officialFormIdentityDetermination: IDENTITY_DETERMINATION,
    documentPolicy: { mode: "participant", packetSetId: FAMILY_ID, documentAcceptsFill: true },
    explicitMappings: {},
    roleRefusals: [],
    selectionControls: [],
    canonicalWrites: writes,
    canonicalRefusals: blanks,
    boundaryWrites: writes,
    boundaryRefusals: blanks
  };
}

function orderMap() {
  const writes = [...CAPTION_WRITES(ORDER), ...MATTER_WRITES(ORDER)];
  const blanks = [
    courtRow(ORDER, "findings", "Findings of the court on the verified petition",
      "the findings are the court's, made by a preponderance on the statutory conditions"),
    courtRow(ORDER, "granted_or_denied", "Whether the petition is granted or denied",
      "granting or denying the petition is the court's decision and this build makes none of it"),
    courtRow(ORDER, "decretal_paragraphs", "Ordered, adjudged and decreed paragraphs",
      "the decretal paragraphs are the court's judgment"),
    courtRow(ORDER, "sealing_directives", "Entities the court directs to seal or restrict records",
      "the sealing directives are the court's, and the related arrest records are ordered expunged by the same order under I.C. 35-38-9-6(g) and 35-38-9-7(e)"),
    courtRow(ORDER, "order_date", "Date of the court order",
      "the court dates its own order"),
    courtRow(ORDER, "judge_signature", "Signature of the judge on the order",
      "the judge signs if and when the court enters the order"),
    courtRow(ORDER, "distribution", "Distribution list completed by the clerk",
      "distribution of a signed order is the clerk's act")
  ];
  return {
    formNumber: ORDER,
    documentId: ORDER,
    componentId: COMPONENT.order,
    documentRole: "proposed_order",
    structuralClass: "proposed_order_composed_from_authority",
    officialFormId: "CCA conviction expungement order",
    officialFormIdentityDetermination: IDENTITY_DETERMINATION,
    documentPolicy: { mode: "court_issued_order_accepts_caption_facts_only", packetSetId: FAMILY_ID, documentAcceptsFill: true },
    explicitMappings: {},
    roleRefusals: [],
    selectionControls: [],
    canonicalWrites: writes,
    canonicalRefusals: blanks,
    boundaryWrites: writes,
    boundaryRefusals: blanks
  };
}

const requiredBeforeFilingFields = (maps) => maps.flatMap((map) => map.canonicalRefusals
  .filter((row) => row.requiredBeforeFiling === true)
  .map((row) => ({
    document: map.formNumber,
    component: map.componentId,
    field: row.field,
    page: row.page,
    disclosureLabel: row.effectiveLabel,
    identity: row.identity,
    why: row.why,
    participantMustSupply: row.participantMustSupply
  })));

/* --------------------------------------------------------- text hygiene */

const REPLACEMENTS = Object.freeze([
  [" ", " "], ["‑", "-"], ["‒", "-"], ["–", "-"], ["—", " - "], ["−", "-"],
  ["‘", "'"], ["’", "'"], ["‚", "'"], ["“", '"'], ["”", '"'], ["„", '"'],
  ["…", "..."], ["§", "Sec. "], ["¶", "para. "], ["•", "- "], ["­", ""],
  ["é", "e"], ["è", "e"], ["ü", "u"], ["ñ", "n"], ["á", "a"], ["í", "i"],
  ["ó", "o"], ["ú", "u"], ["ç", "c"], ["⁄", "/"], ["½", "1/2"], ["″", '"']
]);

function sanitize(text) {
  let out = String(text ?? "");
  for (const [from, to] of REPLACEMENTS) out = out.split(from).join(to);
  const bad = [...out].filter((ch) => ch !== "\n" && (ch.codePointAt(0) < 0x20 || ch.codePointAt(0) > 0x7e));
  assert.equal(bad.length, 0,
    `unmapped characters in composed text: ${[...new Set(bad)].map((c) => `U+${c.codePointAt(0).toString(16).padStart(4, "0")}`).join(", ")}`);
  return out;
}

/* ---------------------------------------------------------- the bodies */

const block = (...lines) => ({ lines: lines.flat().filter((line) => line !== undefined) });

function captionBlock(facts, documentId, componentId, heading) {
  return block(
    documentId,
    heading.toUpperCase(),
    `Assigned component identity: ${componentId}`,
    "",
    "STATE OF INDIANA",
    `County of conviction: ${facts["matter.county"]}`,
    `Name of court in the county of conviction: ${facts["matter.court_name"]}`,
    `Cause number of the conviction: ${facts["matter.cause_number"]}`,
    `IN RE THE PETITION FOR EXPUNGEMENT OF THE RECORDS OF`,
    `Petitioner full legal name: ${facts["participant.full_legal_name"]}`,
    ""
  );
}

function matterBlock(facts) {
  return block(
    "THE CONVICTION THIS PETITION ADDRESSES",
    `Date of conviction: ${facts["matter.conviction_date"]}`,
    `Offense as it appears on the court record: ${facts["matter.offense_description"]}`,
    `Offense level as it appears on the court record: ${facts["matter.offense_level"]}`,
    `Statutory section this petition is brought under: ${facts["matter.statutory_section"]}`,
    `Date the sentence, including any probation or parole, was completed: ${facts["matter.sentence_completion_date"]}`,
    ""
  );
}

function petitionBody(facts) {
  return [
    captionBlock(facts, PETITION, COMPONENT.petition, TITLES[COMPONENT.petition]),
    block(
      "VERIFIED PETITION FOR EXPUNGEMENT OF CONVICTION RECORDS",
      `Brought under ${STATUTE}, with the petition's contents fixed by I.C. 35-38-9-8 and the court's decision governed by I.C. 35-38-9-9. On this section the grant is discretionary rather than mandatory.`,
      "",
      "In Indiana, expungement means the records are sealed or restricted under I.C. 35-38-9-1(k). It does not mean they are destroyed, and the Office of Judicial Administration states that court records are not deleted or destroyed under I.C. 35-38-9.",
      "",
      "On this section the effect is the Section 7 effect and not the Section 6 effect: the court records and the public records stay public, and are clearly and visibly marked as expunged. A grant under this section is also discretionary rather than mandatory.",
      ""
    ),
    block(
      "THE PETITIONER",
      `Petitioner full legal name: ${facts["participant.full_legal_name"]}`,
      `Petitioner date of birth: ${facts["participant.date_of_birth"]}`,
      `Petitioner mailing address: ${DOTS(43)}`,
      `Petitioner telephone number and email address: ${DOTS(27)}`,
      `Last four digits of the Social Security number: ${DOTS(24)}`,
      "",
      "Only the last four digits belong on this petition. The full number goes on the Confidential Information Form in this packet, which is filed as a confidential document with the Notice of Exclusion of Confidential Information from Public Access.",
      ""
    ),
    matterBlock(facts),
    block(
      `Whether the offense involved serious bodily injury: ${DOTS(21)}`,
      "",
      "Which section of I.C. 35-38-9 a conviction falls under, and whether an offense involved serious bodily injury, are legal judgments. This packet is built for the section named above; if that classification is not clear on your own record, stop and get legal help before filing.",
      ""
    ),
    block(
      "THE STATUTORY CONDITIONS",
      `Whether all fines, fees and court costs are paid and any restitution satisfied: ${facts["matter.financial_obligations"]}`,
      `Whether any criminal charges are pending anywhere: ${facts["matter.pending_charges"]}`,
      `Whether the petitioner has been convicted of any crime within the applicable period: ${facts["matter.convictions_within_period"]}`,
      `Whether a petition under Sections 2 through 5 has been filed before: ${facts["matter.prior_petition"]}`,
      `Whether the prosecuting attorney has given written consent: ${facts["matter.prosecutor_consent"]}`,
      ""
    ),
    block(
      "EVERY INDIANA CONVICTION, IN EVERY COUNTY",
      `Every Indiana conviction in any county, and whether each is eligible yet: ${DOTS(10)}`,
      DOTS(74), DOTS(74), DOTS(74),
      "",
      "One petition per lifetime is allowed under I.C. 35-38-9-9(i). Petitions filed in separate counties count as one petition only where they fall inside a single 365-day window. List every conviction from your certified limited criminal history before you file.",
      ""
    ),
    block(
      "ADDITIONAL INFORMATION",
      `Additional information the petitioner wants the court to know: ${DOTS(11)}`,
      DOTS(74), DOTS(74), DOTS(74),
      ""
    ),
    block(
      "VERIFICATION AND SIGNATURE",
      `${PETITION}, assigned component identity ${COMPONENT.petition}`,
      "",
      "VERIFICATION",
      "I affirm, under the penalties for perjury, that the foregoing representations are true.",
      "",
      `Verification and signature of the petitioner: ${DOTS(27)}`,
      `Date of the petitioner's signature: ${DOTS(37)}`,
      `Printed name: ${facts["participant.full_legal_name"]}`,
      ""
    ),
    block(
      "FOR THE CLERK - LEAVE BLANK",
      `Expungement cause number assigned by the clerk: ${DOTS(25)}`,
      `Filed on stamp applied by the clerk: ${DOTS(35)}`,
      "",
      "The expungement case is opened as case type XP under Administrative Rule 8(B)(3), and the clerk assigns its cause number at filing.",
      ""
    ),
    block(
      "WHAT ACCOMPANIES THIS PETITION",
      `The conviction insert ${INSERT_FORM}, the Appearance by Unrepresented Person in Expungement Matter, Form ACR - the Notice of Exclusion of Confidential Information from Public Access - and the Confidential Information Form are delivered with this petition exactly as their issuer published them. They arrive blank and you complete them by hand.`,
      "",
      "The expungement case file is public until the order is granted.",
      ""
    )
  ];
}

function orderBody(facts) {
  return [
    captionBlock(facts, ORDER, COMPONENT.order, TITLES[COMPONENT.order]),
    block(
      "ORDER ON THE VERIFIED PETITION FOR EXPUNGEMENT OF CONVICTION RECORDS",
      `Tendered under ${STATUTE} and I.C. 35-38-9-9.`,
      "",
      "COURT USE ONLY - UNEXECUTED PROPOSED ORDER. Nothing on this page has been decided. The petitioner supplies the caption and the identifiers of the conviction and nothing else.",
      ""
    ),
    matterBlock(facts),
    block(
      "Findings of the court on the verified petition:",
      DOTS(74), DOTS(74), DOTS(74),
      ""
    ),
    block(
      `Whether the petition is granted or denied: ${DOTS(30)}`,
      "",
      "Ordered, adjudged and decreed paragraphs:",
      DOTS(74), DOTS(74), DOTS(74), DOTS(74),
      ""
    ),
    block(
      "Entities the court directs to seal or restrict records:",
      DOTS(74), DOTS(74),
      "",
      "On granting a conviction expungement the court shall also order the related arrest records expunged under I.C. 35-38-9-6(g) and 35-38-9-7(e). The petitioner does not file separately for those.",
      ""
    ),
    block(
      `Date of the court order: ${DOTS(48)}`,
      `Signature of the judge on the order: ${DOTS(35)}`,
      `Distribution list completed by the clerk: ${DOTS(30)}`,
      ""
    )
  ];
}

/* ------------------------------------------------ participant guidance */

const bullet = (text) => `- ${text}`;

function participantInstructions(binding, rbf, retainedSummary, name) {
  const { registryTrack, memoTrack, packetSet, components, queueFamily } = binding;
  const rules = registryTrack.rules ?? {};
  const actions = registryTrack.packetSet?.participantActionRequired ?? [];
  const stops = memoTrack.selfHelpStopConditions ?? [];
  const limitations = registryTrack.legalDesignLimitations ?? [];
  const gates = limitations.filter((row) => row.classification === "scope_restriction");
  assert.ok(gates.length > 0, "the committed record no longer carries the scope restrictions this packet prints first");

  const lines = [
    `# ${registryTrack.legalName}`,
    "",
    "## READ THIS FIRST",
    ""
  ];
  for (const gate of gates) lines.push(bullet(gate.statement));
  lines.push(
    "",
    `Prepared for **${name}**. Packet set \`${FAMILY_ID}\`, version ${packetSet.version}.`,
    "",
    `This packet set serves ${queueFamily.routeKeys.length} route(s):`,
    "",
    ...queueFamily.routeKeys.map((key) => bullet(`\`${key}\``)),
    "",
    "## What relief this section gives, and what it does not",
    "",
    bullet("The grant on this section is discretionary. The court may grant the petition; it is not required to, even where every statutory condition is met."),
    bullet("The effect is the Section 7 effect. The court records and the public records stay public and are clearly and visibly marked as expunged. This is not the Section 6 sealing that applies to a misdemeanour or a Class D or Level 6 felony."),
    "",
    "## What is in this packet",
    ""
  );
  for (const componentId of COMPOSED_COMPONENTS) {
    const row = components.find((c) => c.componentId === componentId);
    lines.push(bullet(`\`${componentId}\` - ${TITLES[componentId]} (${row.role}, ${row.requirement}). Composed for you from Indiana authority and prefilled with the facts you gave.`));
  }
  for (const retained of retainedSummary) {
    const row = components.find((c) => c.componentId === retained.componentId);
    lines.push(bullet(`\`${retained.componentId}\` - ${retained.documentId}, ${retained.whatItIs} (${row.role}, ${row.requirement}). Delivered exactly as ${retained.issuer} published it, ${retained.pageCount} page(s), SHA-256 ${retained.sourceSha256}. It arrives blank.`));
  }
  lines.push(
    "",
    "## The blank official forms, and what this packet does not do to them",
    "",
    "The four supporting forms above are the issuer's own documents. This packet delivers them unchanged and writes nothing on them, so every blank on them is yours to complete by hand. This packet does not carry a field-by-field map of those four forms, and it does not tell you what each individual box on them means; work through them against the form's own printed instructions, and stop and get legal help wherever a box is not clear. The two documents this packet does prefill are the petition and the proposed order, and every blank left on those two is listed below.",
    "",
    "## What you must supply before filing",
    "",
    "Check every prefilled fact against your own court record and your certified limited criminal history, and correct the packet where they disagree. The blanks below are deliberately empty and are yours to complete.",
    "",
    "| Document | Blank on the document | What you must supply |",
    "| --- | --- | --- |"
  );
  for (const item of rbf) lines.push(`| ${item.document} | ${item.disclosureLabel} | ${item.participantMustSupply} |`);

  lines.push("", `## What you must obtain or confirm before filing (${actions.length} item(s) held by the committed track registry)`, "");
  for (const action of actions) {
    const qualifier = action.requirement === "conditional" && action.conditionDescription ? ` Condition: ${action.conditionDescription}` : "";
    const from = action.obtainedFrom ? ` Obtained from: ${action.obtainedFrom}.` : "";
    lines.push(bullet(`**${action.kind}** (${action.requirement}${action.requiredBeforeFiling ? ", required before filing" : ""}): ${action.description}${from}${qualifier}`));
  }

  lines.push(
    "", "## Where this is filed", "",
    bullet(`Venue: ${registryTrack.venue}`),
    bullet(`Destination (${registryTrack.destination.kind}): ${registryTrack.destination.name}`),
    bullet(registryTrack.destination.detail),
    bullet(`Filing: ${rules.filing ?? "the committed record states no filing rule for this track."}`),
    "", "## What it costs", "",
    bullet(`Fees: ${rules.fees ?? "the committed record states no fee for this track."}`),
    bullet(`Fee waiver: ${rules.feeWaiver ?? "the committed record states no fee waiver for this track."}`),
    bullet("The record held here does not state the amount, whether it is charged per county, or whether an indigency waiver exists. This packet does not guess at any of the three. Ask the clerk of the court you are filing in for the current civil filing fee and for whatever waiver that court accepts."),
    "", "## Notice, objection and service", "",
    bullet(`Notice: ${rules.notice ?? "the committed record states no notice rule for this track."}`),
    bullet(`Service: ${rules.service ?? "the committed record states no service rule for this track."}`),
    bullet("The record held here does not state a deadline for the prosecuting attorney's response or a number of days between service and any hearing, so this packet states none."),
    "", "## Signing", "",
    bullet(`Signature: ${rules.participantSignature ?? "the committed record states no signature rule for this track."}`),
    bullet(`Notarization: ${rules.notarization ?? "the committed record states no notarization rule for this track."}`),
    "", `## What the committed record requires this packet to say (${limitations.length} instruction(s))`, ""
  );
  for (const row of limitations) lines.push(bullet(`[${row.classification}] ${row.statement}`));

  lines.push("", "## Fields deliberately left blank", "",
    bullet("Sign and date the verification on the petition yourself, after reading it. The petition is verified, and signing it is an affirmation under the penalties for perjury."),
    bullet("Leave every finding, granted-or-denied election, decretal paragraph, sealing directive, date and judge's signature on the proposed order blank. Those are the court's."),
    bullet("Leave the XP cause number and the filed-on stamp blank. The clerk supplies both when the petition is filed."),
    "", `## Stop self-help and get legal help (all ${stops.length} stop conditions the record holds)`, "");
  stops.forEach((stop, index) => lines.push(bullet(`Stop ${index + 1} of ${stops.length}: ${stop}`)));

  const exclusions = memoTrack.exclusions ?? [];
  lines.push("", `## Hard eligibility boundaries the record states (${exclusions.length} exclusion(s))`, "");
  for (const exclusion of exclusions) lines.push(bullet(exclusion));
  lines.push("", "Waiting periods:", "");
  for (const period of memoTrack.waitingPeriods ?? []) lines.push(bullet(`${period.condition}: ${period.duration}`));

  const unresolved = memoTrack.unresolvedQuestions ?? [];
  lines.push("", `## What the record does not settle (${unresolved.length} open question(s))`, "");
  for (const row of unresolved) lines.push(bullet(`${row.question} (impact: ${row.impact}; affects: ${row.affectedElement})`));

  lines.push(
    "",
    "## What this packet is not",
    "",
    "This built packet is review evidence. It is pending independent completeness verification, raster acceptance, visual review and counsel review. It is not approved for live use, it opens no route, and it is not legal advice.",
    ""
  );
  return lines.join("\n");
}

function filingInstructions(binding, retainedSummary, name) {
  const { registryTrack } = binding;
  const rules = registryTrack.rules ?? {};
  const actions = registryTrack.packetSet?.participantActionRequired ?? [];
  const pick = (kind) => actions.find((a) => a.kind === kind)?.description ?? null;
  const lines = [
    `# Filing instructions - ${registryTrack.legalName}`,
    "",
    `Prepared for **${name}**.`,
    "",
    bullet(`Filing: ${rules.filing ?? "the committed record states no filing rule."}`),
    bullet(`Where: ${registryTrack.destination.name}. ${registryTrack.destination.detail}`),
    bullet(`Venue: ${registryTrack.venue}`),
    bullet(`What the registry says about filing: ${pick("file") ?? "the committed record holds no filing action for this track."}`),
    bullet(`What it costs: ${pick("pay_fee") ?? "the committed record holds no fee action for this track."}`),
    bullet(`Fee waiver: ${pick("apply_fee_waiver") ?? "the committed record holds no fee-waiver action for this track."}`),
    bullet(`Service: ${pick("serve_party") ?? "the committed record holds no service action for this track."}`),
    "",
    "What you file, in order:",
    ""
  ];
  for (const componentId of COMPOSED_COMPONENTS) lines.push(bullet(`${TITLES[componentId]} (${componentId}), from this packet, completed and signed.`));
  for (const retained of retainedSummary) lines.push(bullet(`${retained.documentId} (${retained.componentId}), ${retained.pageCount} page(s), completed by hand.`));
  lines.push(
    "",
    "The expungement case file is public until the order is granted. Where the prosecuting attorney does not object or waives objection, the court may grant without a hearing under I.C. 35-38-9-9(a); a victim may submit an oral or written statement in support or opposition.",
    "",
    `Packet set: ${FAMILY_ID}`,
    ""
  );
  return lines.join("\n");
}

function guidanceBlocks(participantText, filingText) {
  const plainLine = (line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      return trimmed.slice(1, -1).split("|").map((cell) => cell.trim().replaceAll("**", "").replaceAll("`", "")).join("  |  ");
    }
    return line.replace(/^#{1,6}\s+/, "").replaceAll("**", "").replaceAll("`", "");
  };
  const blocks = [];
  let heading = null;
  let paragraph = [];
  const emit = (lines) => { const carried = heading ? [heading, ""] : []; heading = null; blocks.push(block(...carried, ...lines, "")); };
  const flush = () => { if (paragraph.length) { const lines = paragraph; paragraph = []; emit(lines); } };
  for (const raw of `${participantText}\n\n${filingText}`.split("\n")) {
    const trimmed = raw.trim();
    if (trimmed === "") { flush(); continue; }
    if (/^\|(?:\s*:?-+:?\s*\|)+$/.test(trimmed)) continue;
    if (/^#{1,6}\s+/.test(trimmed)) { flush(); heading = plainLine(raw); continue; }
    if (trimmed.startsWith("- ") || trimmed.startsWith("|")) { flush(); emit([plainLine(raw)]); continue; }
    paragraph.push(plainLine(raw));
  }
  flush();
  if (heading) emit([]);
  return blocks;
}

/* ------------------------------------------- the retained official forms */

/**
 * Load the retained documents, prove each selected page, and enumerate every
 * widget on it.
 *
 * Nothing is written to these pages. They are copied verbatim so the participant
 * receives the issuer's own form, and the marker check means a re-paginated
 * bundle stops the build rather than shipping the wrong sheet under the right
 * component id.
 */
async function loadRetainedDocuments(resolved) {
  const byId = new Map(resolved.map((row) => [row.sourceId, row]));
  const out = [];
  for (const spec of RETAINED) {
    const source = byId.get(spec.sourceId);
    assert.ok(source, `no held source resolved for ${spec.sourceId}`);
    const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false });
    const pages = doc.getPages();
    const pageRef = new Map(pages.map((page, index) => [page.ref, index + 1]));

    const widgetsByPage = new Map();
    for (const field of doc.getForm().getFields()) {
      const kind = field.constructor.name;
      for (const widget of field.acroField.getWidgets()) {
        const pageNumber = pageRef.get(widget.P());
        if (!pageNumber) continue;
        const rect = widget.getRectangle();
        if (!widgetsByPage.has(pageNumber)) widgetsByPage.set(pageNumber, []);
        widgetsByPage.get(pageNumber).push({
          name: field.getName(),
          kind,
          rect: {
            x: Number(rect.x.toFixed(2)), y: Number(rect.y.toFixed(2)),
            width: Number(rect.width.toFixed(2)), height: Number(rect.height.toFixed(2))
          }
        });
      }
    }

    const selected = [];
    for (const pageNumber of spec.pages) {
      const page = pages[pageNumber - 1];
      assert.ok(page, `${spec.documentId}: the resolved source has no page ${pageNumber}`);
      const lines = groupIntoLines(extractTextItems(page)).map((line) => line.text.trim()).filter(Boolean);
      const text = lines.join(" ");
      assert.ok(text.toUpperCase().includes(spec.marker.toUpperCase()),
        `${spec.documentId}: page ${pageNumber} of ${source.resolvedPath} does not carry the issuer's own marker "${spec.marker}", so the page selection is not proved`);

      const isolated = await PDFDocument.create();
      stampDeterministic(isolated);
      const [copied] = await isolated.copyPages(doc, [pageNumber - 1]);
      isolated.addPage(copied);
      const isolatedBytes = Buffer.from(await isolated.save({ useObjectStreams: false, updateMetadata: false }));

      const widgets = widgetsByPage.get(pageNumber) ?? [];
      const context = captureWidgetContext(page, widgets, { isFirstPage: pageNumber === 1 });
      selected.push({
        sourcePage: pageNumber,
        pageIsolatedSha256: sha256(isolatedBytes),
        markerFoundOnThePage: spec.marker,
        printedFirstLine: lines[0] ?? null,
        widgets: widgets.map((widget, index) => ({
          name: widget.name,
          kind: widget.kind.replace(/^PDF/, ""),
          rect: widget.rect,
          harvestedCaption: context[index].effectiveLabel,
          harvestedCaptionBasis: context[index].labelBasis,
          printedSectionHeading: context[index].regionHeading
        }))
      });
    }
    out.push({ spec, doc, source, selected, widgetCount: selected.reduce((sum, page) => sum + page.widgets.length, 0) });
  }
  return out;
}

/* ------------------------------------------------------------ rendering */

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 60;
const FONT_SIZE = 10.25;
const LINE_HEIGHT = 13.25;
const MAX_WIDTH = PAGE_WIDTH - (2 * MARGIN);

/** Blocks are atomic: a signature or contact block is drawn whole or moved whole. */
async function renderComposedDocument(blocks, title, componentId) {
  const pdf = await PDFDocument.create();
  stampDeterministic(pdf);
  pdf.setTitle(title);
  pdf.setAuthor("RCAP packet factory, packet-build lane");
  pdf.setCreator("RCAP deterministic Indiana pleading composer");
  pdf.setProducer("RCAP census-v1 artifact renderer");
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const top = PAGE_HEIGHT - MARGIN;
  const capacity = Math.floor((top - MARGIN) / LINE_HEIGHT) + 1;

  let hardSplits = 0;
  const splitToken = (token) => {
    const pieces = String(token).split(/(?<=[:/.\-_])/);
    const chunks = [];
    let current = "";
    for (const piece of pieces) {
      const candidate = `${current}${piece}`;
      if (current && font.widthOfTextAtSize(candidate, FONT_SIZE) > MAX_WIDTH) { chunks.push(current); current = piece; }
      else current = candidate;
    }
    if (current) chunks.push(current);
    const out = [];
    for (const chunk of chunks) {
      if (font.widthOfTextAtSize(chunk, FONT_SIZE) <= MAX_WIDTH) { out.push(chunk); continue; }
      hardSplits += 1;
      let acc = "";
      for (const char of chunk) {
        const candidate = `${acc}${char}`;
        if (acc && font.widthOfTextAtSize(candidate, FONT_SIZE) > MAX_WIDTH) { out.push(acc); acc = char; }
        else acc = candidate;
      }
      if (acc) out.push(acc);
    }
    return out;
  };
  const wrap = (raw) => {
    if (!raw) return [""];
    const words = String(raw).split(/\s+/)
      .flatMap((word) => font.widthOfTextAtSize(word, FONT_SIZE) > MAX_WIDTH ? splitToken(word) : [word]);
    const rows = [];
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, FONT_SIZE) <= MAX_WIDTH) current = candidate;
      else { if (current) rows.push(current); current = word; }
    }
    if (current) rows.push(current);
    return rows.length ? rows : [""];
  };

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = top;
  const drawn = [];
  const newPage = () => { page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]); y = top; };

  for (const item of blocks) {
    const rows = item.lines.flatMap((line) => wrap(sanitize(line)));
    assert.ok(rows.length <= capacity,
      `${componentId}: a block of ${rows.length} lines cannot fit on one page (capacity ${capacity}); first line "${String(item.lines[0]).slice(0, 70)}"`);
    const used = Math.round((top - y) / LINE_HEIGHT);
    if (used + rows.length > capacity) newPage();
    for (const row of rows) {
      assert.ok(y >= MARGIN, `${componentId}: a line would be drawn at y=${y}, below the ${MARGIN}pt bottom margin`);
      if (row) {
        const width = font.widthOfTextAtSize(row, FONT_SIZE);
        assert.ok(width <= MAX_WIDTH + 0.01, `${componentId}: a line is ${width.toFixed(1)}pt wide, past the ${MAX_WIDTH}pt text box`);
        page.drawText(row, { x: MARGIN, y, size: FONT_SIZE, font, color: rgb(0, 0, 0) });
        drawn.push({ page: pdf.getPageCount(), x: MARGIN, baseline: y, width, text: row });
      }
      y -= LINE_HEIGHT;
    }
  }
  assert.equal(hardSplits, 0, `${componentId}: ${hardSplits} token(s) had to be broken mid-word to fit the text box`);
  const bytes = Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
  return { bytes, pageCount: pdf.getPageCount(), drawn };
}

function measureInk(drawn) {
  const descent = FONT_SIZE * 0.25;
  const ascent = FONT_SIZE * 0.9;
  let outside = 0;
  for (const row of drawn) {
    const insideX = row.x >= MARGIN - 0.01 && row.x + row.width <= PAGE_WIDTH - MARGIN + 0.01;
    const insideY = row.baseline - descent >= 0 && row.baseline + ascent <= PAGE_HEIGHT;
    if (!insideX || !insideY) outside += row.text.replace(/\s+/g, "").length;
  }
  return outside;
}

/* --------------------------------------------------------- byte proof */

async function proveWritesFromBytes(packetBytes, pageManifest, maps, facts, fixture) {
  const pdf = await PDFDocument.load(packetBytes, { ignoreEncryption: true, updateMetadata: false });
  assert.equal(pdf.getPageCount(), pageManifest.length, "the page manifest must describe every packet page");
  const pageText = pdf.getPages().map((page) => groupIntoLines(extractTextItems(page)).map((l) => l.text).join(" ").replace(/\s+/g, " "));
  const byDocument = new Map();
  for (const [index, row] of pageManifest.entries()) {
    byDocument.set(row.documentId, `${byDocument.get(row.documentId) ?? ""} ${pageText[index]}`.replace(/\s+/g, " "));
  }
  const actualWrites = [];
  let glyphs = 0;
  for (const map of maps) {
    const haystack = byDocument.get(map.documentId) ?? "";
    for (const row of map.canonicalWrites) {
      const expected = sanitize(facts[row.factId]).replace(/\s+/g, " ").trim();
      assert.ok(expected, `${fixture}/${row.field}: the fixture holds no value for ${row.factId}`);
      assert.ok(haystack.includes(expected), `${fixture}/${row.field}: "${expected.slice(0, 60)}" is not readable from the finalized packet bytes`);
      glyphs += expected.replace(/\s+/g, "").length;
      actualWrites.push({
        field: row.field, document: map.documentId, factId: row.factId, expected,
        foundInOutputBytes: true,
        proof: "read back from the finalized packet bytes on the pages this document occupies"
      });
    }
  }
  /* Nothing was written on the retained official pages, and that is measured
   * rather than assumed: each carries the issuer's marker and no fixture value. */
  const retainedPages = pageManifest.filter((row) => row.retained === true);
  for (const row of retainedPages) {
    const text = pageText[row.packetPage - 1] ?? "";
    for (const [factId, value] of Object.entries(facts)) {
      const needle = sanitize(value).replace(/\s+/g, " ").trim();
      assert.ok(!text.includes(needle),
        `${fixture}: packet page ${row.packetPage} is a retained official page and carries the fixture value for ${factId}; nothing may be written on a retained page`);
    }
  }
  return { actualWrites, glyphs, retainedPagesProvedBlank: retainedPages.length };
}

/* ------------------------------------------------------------ counters */

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
    isSelectionControl: row.isSelectionControl === true || row.kind === "selection_control"
      || /\[\s*\]/.test(String(row.effectiveLabel ?? "")),
    declared: {
      disposition: row.completenessDisposition ?? null,
      ...(Object.hasOwn(row, "requiredBeforeFiling") ? { requiredBeforeFiling: row.requiredBeforeFiling === true } : {}),
      routeDetermined: row.routeDetermined === true,
      determinedByTheCaseNotTheRoute: row.determinedByTheCaseNotTheRoute === true,
      whyTheRouteCannotDetermineIt: row.whyTheRouteCannotDetermineIt ?? null,
      identity: row.identity ?? row.field ?? null,
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
  const writtenInDocument = new Map();
  for (const row of writes) {
    if (!writtenInDocument.has(row.document)) writtenInDocument.set(row.document, new Set());
    for (const key of [normalize(row.label), normalize(row.name)]) if (key.length >= 4) writtenInDocument.get(row.document).add(key);
  }
  const ledger = [];
  for (const blank of blanks) {
    const beside = writtenInDocument.get(blank.document) ?? new Set();
    const declared = {
      ...blank.declared,
      factAvailable: (blank.declared.factId ? availableFacts.has(blank.declared.factId) : false)
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
    const needles = [blank.label, blank.id, blank.declared?.identity].map((v) => String(v ?? "").trim()).filter((v) => v.length >= 3);
    if (!needles.some((needle) => haystack.includes(needle.toLowerCase().slice(0, 60)))) {
      note("requiredFactsNotCollected", { field: blank.id, why: "declared required before filing and not named in participant-instructions.md" });
    }
  }
  const rows = new Map();
  for (const row of [...writes.map((v) => ({ ...v, written: true })), ...blanks.map((v) => ({ ...v, written: false }))]) {
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
  for (const row of writes) {
    if (classifyField(row.label, false).requirement === "PROTECTED") note("protectedWrites", { field: row.id, label: row.label });
  }
  for (const proof of proofs) {
    const visible = (proof.addedGlyphsReadFromOutputBytes ?? 0) + (proof.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if (proof.valuesReportedByFinalizer > 0 && visible === 0) note("invisibleWrites", { fixture: proof.fixture });
    if ((proof.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: proof.fixture });
    if ((proof.refusedFieldsWithInk ?? []).length > 0) note("protectedWrites", { fixture: proof.fixture });
  }
  return {
    counters, findings, ledger,
    totals: { terminalFields: writes.length + blanks.length, written: writes.length, blank: blanks.length, rowsInspected: rows.size }
  };
}

function writeJson(relative, value) {
  const target = path.join(ROOT, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
}

/* ------------------------------------------------------------- the run */

export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const noRaster = argv.includes("--no-raster");
  if (!checkOnly) {
    assert.equal(noRaster, true, "no browser resolves in this container; invoke with --no-raster and let the raster gate run centrally");
  }

  const binding = loadAuthorityBinding();
  const sources = resolveHeldSources(binding.queueFamily);
  assert.equal(sources.absent.length, 0,
    `held source bytes are absent by content hash across the mounted corpus: ${sources.absent.map((s) => `${s.sourceId} sha256=${s.sha256}`).join("; ")}`);

  const retained = await loadRetainedDocuments(sources.resolved);
  const retainedSummary = retained.map((row) => ({
    componentId: row.spec.componentId,
    documentId: row.spec.documentId,
    sourceId: row.spec.sourceId,
    issuer: row.spec.issuer,
    whatItIs: row.spec.whatItIs,
    sourceSha256: row.source.sha256,
    sourceResolvedPath: row.source.resolvedPath,
    sourcePages: row.spec.pages,
    pageCount: row.spec.pages.length,
    markerProvedOnEveryPage: row.spec.marker,
    widgetCount: row.widgetCount,
    filledByThisBuild: false,
    fieldMappedByThisBuild: false
  }));

  const maps = [petitionMap(), orderMap()];
  const rbf = requiredBeforeFilingFields(maps);

  if (checkOnly) {
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY",
      implementationStrategy: STRATEGY, custodyClass: CUSTODY_CLASS,
      identityDetermination: IDENTITY_DETERMINATION,
      componentsAuthoritative: binding.components.length,
      componentsComposed: COMPOSED_COMPONENTS.length,
      componentsRetained: retainedSummary.map((r) => `${r.componentId}:${r.documentId}:${r.pageCount}p:${r.widgetCount}w`),
      heldSourcesResolvedByContentHash: sources.resolved.length,
      mountedCustodies: sources.mounted,
      recordsPinned: binding.pins.length,
      writes: maps.reduce((sum, m) => sum + m.canonicalWrites.length, 0),
      blanks: maps.reduce((sum, m) => sum + m.canonicalRefusals.length, 0),
      requiredBeforeFiling: rbf.length
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  const artifacts = [];
  const proofs = [];
  const guidance = [];
  for (const fixture of ["canonical", "boundary"]) {
    const facts = FIXTURES[fixture];
    const participantText = participantInstructions(binding, rbf, retainedSummary, facts["participant.full_legal_name"]);
    const filingText = filingInstructions(binding, retainedSummary, facts["participant.full_legal_name"]);

    const packet = await PDFDocument.create();
    stampDeterministic(packet);
    packet.setTitle(`${binding.registryTrack.legalName} - ${fixture}`);
    packet.setAuthor("RCAP packet factory, packet-build lane");
    packet.setCreator("RCAP deterministic Indiana pleading composer");
    packet.setProducer("RCAP census-v1 artifact renderer");

    const pageManifest = [];
    let drawnRows = [];
    for (const body of [
      { componentId: COMPONENT.petition, documentId: PETITION, blocks: petitionBody(facts) },
      { componentId: COMPONENT.order, documentId: ORDER, blocks: orderBody(facts) }
    ]) {
      const rendered = await renderComposedDocument(body.blocks, TITLES[body.componentId], body.componentId);
      drawnRows = drawnRows.concat(rendered.drawn);
      const componentPdf = await PDFDocument.load(rendered.bytes, { ignoreEncryption: true, updateMetadata: false });
      const pages = await packet.copyPages(componentPdf, componentPdf.getPageIndices());
      pages.forEach((page, index) => {
        packet.addPage(page);
        pageManifest.push({
          packetPage: packet.getPageCount(),
          component: body.componentId,
          documentId: body.documentId,
          sourcePage: index + 1,
          sourceSha256: null,
          retained: false,
          sourceClass: "composed_from_the_committed_Indiana_authority"
        });
      });
    }
    for (const row of retained) {
      const indices = row.spec.pages.map((n) => n - 1);
      const pages = await packet.copyPages(row.doc, indices);
      pages.forEach((page, index) => {
        packet.addPage(page);
        pageManifest.push({
          packetPage: packet.getPageCount(),
          component: row.spec.componentId,
          documentId: row.spec.documentId,
          sourcePage: row.spec.pages[index],
          sourceSha256: row.source.sha256,
          pageIsolatedSha256: row.selected[index].pageIsolatedSha256,
          retained: true,
          sourceClass: "retained_official_form_delivered_verbatim_and_unfilled"
        });
      });
    }
    assert.deepEqual([...new Set(pageManifest.map((r) => r.component))], ALL_COMPONENTS);

    const packetBytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
    const file = `${OUT}/fixtures/${fixture}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), packetBytes);

    const proof = await proveWritesFromBytes(packetBytes, pageManifest, maps, facts, fixture);
    const outsideBoxes = measureInk(drawnRows);
    proofs.push({
      fixture,
      proofMethod: "every declared write read back from the finalized packet bytes on the pages its document occupies; every retained official page proved to carry no fixture value",
      valuesReportedByFinalizer: proof.actualWrites.length,
      addedGlyphsReadFromOutputBytes: proof.glyphs,
      flattenedWidgetAppearancesReadFromOutputBytes: 0,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: outsideBoxes,
      linesDrawn: drawnRows.length,
      retainedPagesProvedBlank: proof.retainedPagesProvedBlank,
      refusedFieldsWithInk: [],
      actualWrites: proof.actualWrites
    });

    const guide = await renderComposedDocument(
      guidanceBlocks(participantText, filingText),
      `Participant and filing instructions - ${fixture}`,
      "participant-guidance"
    );
    const guideFile = `${OUT}/fixtures/participant-guidance-${fixture}.pdf`;
    fs.writeFileSync(path.join(ROOT, guideFile), guide.bytes);
    guidance.push({ fixture, file: guideFile, sha256: sha256(guide.bytes), byteLength: guide.bytes.length, pageCount: guide.pageCount });

    artifacts.push({
      fixture, file,
      sha256: sha256(packetBytes),
      byteLength: packetBytes.length,
      pageCount: packet.getPageCount(),
      pageManifest,
      components: ALL_COMPONENTS,
      documents: [PETITION, ORDER, ...RETAINED.map((r) => r.documentId)]
    });
  }

  const canonicalName = FIXTURES.canonical["participant.full_legal_name"];
  const participantText = participantInstructions(binding, rbf, retainedSummary, canonicalName);
  const filingText = filingInstructions(binding, retainedSummary, canonicalName);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), participantText);
  fs.writeFileSync(path.join(ROOT, OUT, "filing-instructions.md"), filingText);

  const counted = countCompleteness(maps, proofs, participantText);
  const allNineZero = PASS_COUNTERS.every((counter) => counted.counters[counter] === 0);
  assert.equal(allNineZero, true,
    `the builder's own completeness count is not zero: ${JSON.stringify({ counters: counted.counters, findings: counted.findings }, null, 2)}`);

  writeJson(`${OUT}/packet-set-manifest.json`, {
    schemaVersion: "rcap-composed-packet-set/v1",
    familyId: FAMILY_ID,
    jurisdiction: JURISDICTION,
    trackId: TRACK_ID,
    packetSetVersion: binding.packetSet.version,
    routeKeys: binding.queueFamily.routeKeys,
    implementationStrategy: STRATEGY,
    custodyClass: CUSTODY_CLASS,
    statute: STATUTE,
    identityDetermination: {
      id: binding.determination.id,
      determination: binding.determination.determination,
      obligations: binding.determination.obligations,
      whatThisDoesNotEstablish: binding.determination.whatThisDoesNotEstablish
    },
    exactNextActionFollowed: binding.queueFamily.sourceReconciliation.exactNextAction,
    components: binding.components.map((row) => ({
      componentId: row.componentId,
      documentId: COMPOSED_COMPONENTS.includes(row.componentId)
        ? (row.componentId === COMPONENT.petition ? PETITION : ORDER)
        : RETAINED.find((r) => r.componentId === row.componentId).documentId,
      title: TITLES[row.componentId],
      role: row.role,
      requirement: row.requirement,
      conditionDescription: row.conditionDescription ?? null,
      outputStrategy: row.outputStrategy,
      officialFormId: row.officialFormId ?? null,
      order: row.order,
      treatment: COMPOSED_COMPONENTS.includes(row.componentId) ? "composed_from_authority" : "retained_official_form_delivered_verbatim",
      generated: true
    })),
    conditionalComponentsGenerated: [{
      componentId: COMPONENT.appearance,
      conditionTheRecordStates: binding.components.find((c) => c.componentId === COMPONENT.appearance).conditionDescription,
      whyItIsGenerated: "both fixtures are self-represented filers, which is the condition the record states, so the Appearance by Unrepresented Person is delivered"
    }],
    retainedOfficialDocuments: retainedSummary,
    participantInstructions: `${OUT}/participant-instructions.md`,
    filingInstructions: `${OUT}/filing-instructions.md`,
    participantGuidancePdfs: guidance
  });

  writeJson(`${OUT}/component-page-manifest.json`, {
    schemaVersion: "rcap-component-page-manifest/v1",
    familyId: FAMILY_ID,
    componentOrder: ALL_COMPONENTS,
    artifacts: artifacts.map((a) => ({
      fixture: a.fixture, file: a.file, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount, pages: a.pageManifest
    }))
  });

  writeJson(`${OUT}/reports/record-bindings.json`, {
    schemaVersion: "rcap-family-record-bindings/v1",
    familyId: FAMILY_ID,
    question: "Which committed records does this packet rest on, and did any of them move?",
    everyRecordPinnedTwice: true,
    whyTwice: "a whole-file pin on a shared national record goes stale whenever an unrelated jurisdiction is productised; the entry pin says whether the change touched this family",
    bindings: binding.pins
  });

  writeJson(`${OUT}/reports/retained-official-form-widgets.json`, {
    schemaVersion: "rcap-retained-official-form-widgets/v1",
    familyId: FAMILY_ID,
    question: "What is on the official forms this packet delivers without filling them?",
    whatThisIs: "every AcroForm widget on every retained page, with the caption harvested at that widget's own measured position and the basis of the harvest",
    whatThisIsNot: "a field map. No disposition is claimed for any widget below, and none of them is counted by the nine completeness counters, which measure the two documents this build authored.",
    whyNoFieldMapIsClaimed: "the harvested captions on these forms are fragments, and two of the insert's three pages are the court's findings and order rather than the participant's to complete; classifying that from captions would read as authoritative and would not be. A field-level map belongs to the official_pdf_fill treatment and is recorded as owed.",
    documents: retained.map((row) => ({
      componentId: row.spec.componentId,
      documentId: row.spec.documentId,
      issuer: row.spec.issuer,
      sourceSha256: row.source.sha256,
      sourceResolvedPath: row.source.resolvedPath,
      widgetCount: row.widgetCount,
      pages: row.selected
    }))
  });

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1",
    familyId: FAMILY_ID,
    worklistGroupId: FAMILY_ID,
    jurisdiction: JURISDICTION,
    trackId: TRACK_ID,
    routeKeys: binding.queueFamily.routeKeys,
    implementationStrategy: STRATEGY,
    custodyClass: CUSTODY_CLASS,
    sourceStatus: CUSTODY_CLASS,
    officialFormFamily: binding.queueFamily.officialFormFamily,
    acquisitionCommissioned: false,
    sourceAcquisitionAuthorized: false,
    sourceBinariesRequired: (binding.queueFamily.sourceHashes ?? []).length,
    sourceBinariesResolved: sources.resolved.length,
    allSourcesExact: sources.absent.length === 0,
    allSourcesExactNote: "every declared digest was resolved by content hash across the mounted corpus and re-hashed from the resolved bytes",
    resolutionRule: "sources are resolved by SHA-256 across the mounted corpus and never by declared path",
    mountedCustodies: sources.mounted,
    sources: sources.resolved.map((row) => ({
      sourceId: row.sourceId,
      declaredPath: row.declaredPath,
      resolvedPath: row.resolvedPath,
      resolvedCustody: row.resolvedCustody,
      resolvedBy: row.resolvedBy,
      sha256: row.sha256,
      sha256Exact: true,
      byteLength: row.byteLength,
      tier: row.tier,
      roleInThisPacket: RETAINED.some((r) => r.sourceId === row.sourceId)
        ? "retained official form delivered verbatim into the packet, unfilled"
        : "authority reference bound by digest"
    })),
    documents: [
      ...COMPOSED_COMPONENTS.map((componentId) => ({
        documentId: componentId === COMPONENT.petition ? PETITION : ORDER,
        componentId,
        composed: true,
        sha256: null,
        compositionTreatment: "COMPOSE_FROM_AUTHORITY",
        authority: IDENTITY_DETERMINATION
      })),
      ...retainedSummary.map((row) => ({
        documentId: row.documentId,
        componentId: row.componentId,
        composed: false,
        sha256: row.sourceSha256,
        pagesTaken: row.sourcePages,
        pageSelectionProvedBy: `the issuer's own marker "${row.markerProvedOnEveryPage}" read from each selected page before it was copied`,
        compositionTreatment: "RETAINED_OFFICIAL_FORM_DELIVERED_VERBATIM"
      }))
    ],
    authorityCurrentness: {
      reviewedAsOf: binding.registryTrack.reviewedAsOf,
      effectiveFrom: binding.registryTrack.effectiveFrom,
      effectiveTo: binding.registryTrack.effectiveTo,
      legalInputStatus: binding.queueFamily.legalInputStatus,
      legalStatus: binding.registryTrack.legalStatus
    },
    groundingRecords: binding.pins,
    composedComponentsAuthoredByThisBuild: COMPOSED_COMPONENTS,
    retainedComponentsDeliveredVerbatim: RETAINED_COMPONENTS,
    commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "independent verification, raster acceptance, visual acceptance, counsel approval, or approval for participant delivery",
      "a field-level map of the four retained official forms, which is owed to the official_pdf_fill treatment and is not produced here",
      "that this participant is eligible under I.C. 35-38-9-4, or that no exclusion applies",
      "the amount of the civil filing fee, whether it is charged per county, or whether an indigency waiver exists",
      "that any commercial route is open"
    ]
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1",
    familyId: FAMILY_ID,
    trackId: TRACK_ID,
    jurisdiction: JURISDICTION,
    routeKeys: binding.queueFamily.routeKeys,
    statute: STATUTE,
    legalName: binding.registryTrack.legalName,
    implementationStrategy: STRATEGY,
    renderStrategy: "petition_and_order_composed_from_authority_with_retained_official_forms_delivered_verbatim",
    sourceAuthority: IDENTITY_DETERMINATION,
    componentSet: ALL_COMPONENTS,
    pageOrder: ALL_COMPONENTS,
    mappedDocuments: [PETITION, ORDER],
    retainedOfficialDocuments: retainedSummary,
    whatIsNotMappedHere: "the four retained official forms. They are delivered verbatim and unfilled; every widget on them is enumerated in reports/retained-official-form-widgets.json, and no disposition is claimed for any of them.",
    routeSelectionNote: "This packet set serves the single census route for this family. The statutory section is fixed by the route and is written on the petition rather than left as an election; whether the offense involved serious bodily injury is a case fact the record classifies as a legal judgment and is left to the participant with a stop condition attached.",
    routeSelectionsMade: [{
      option: "INDIANA_CONVICTION_EXPUNGEMENT_SECTION_4",
      authority: STATUTE,
      routeDetermined: true
    }],
    dispositionVocabulary: [SIGNATURE, COURT_OWNED, "REQUIRED_BEFORE_FILING"],
    requiredBeforeFilingCount: rbf.length,
    requiredBeforeFiling: rbf,
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
    componentSet: ALL_COMPONENTS,
    documentSet: [PETITION, ORDER, ...RETAINED.map((r) => r.documentId)],
    retainedOfficialDocuments: retainedSummary,
    pdfs: artifacts.map((a) => ({
      file: a.file, documentId: "assembled_packet", role: "assembled_packet_of_composed_pleadings_and_retained_official_forms",
      fixture: a.fixture, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount
    })),
    participantGuidancePdfs: guidance,
    artifacts,
    packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents, components: a.components })),
    everyPageRastered: false,
    byteDerivedHashes: true,
    rasterEngine: null,
    rasterSkipped: true,
    rasterSkippedBecause: "no browser resolves in this container; the raster gate runs centrally against the exact bytes these hashes pin",
    rasterPages: [],
    rasterState: "BUILT_RASTER_PENDING",
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1",
    familyId: FAMILY_ID,
    derivedFromArtifactBytes: true,
    note: "Each declared fixture value was read back from the finalized packet bytes on the pages its document occupies, and every retained official page was proved to carry no fixture value.",
    documents: proofs,
    artifacts: proofs.map((p) => ({
      fixture: p.fixture,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      linesDrawn: p.linesDrawn,
      retainedPagesProvedBlank: p.retainedPagesProvedBlank,
      refusedFieldsWithInk: p.refusedFieldsWithInk
    })),
    blockingFindings: []
  });

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1",
    familyId: FAMILY_ID,
    requiredBeforeFiling: rbf,
    protectedBlanks: maps.flatMap((map) => map.canonicalRefusals
      .filter((row) => row.requiredBeforeFiling !== true)
      .map((row) => ({
        document: map.documentId, field: row.field, page: row.page, label: row.effectiveLabel,
        disposition: row.completenessDisposition, refusalClass: row.category, why: row.why
      }))),
    everyIntentionalBlankClassified: true,
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`,
    blanksOnRetainedOfficialForms: {
      documents: retainedSummary.map((row) => ({ documentId: row.documentId, widgetCount: row.widgetCount })),
      treatment: "delivered blank and completed by hand; enumerated in reports/retained-official-form-widgets.json and not classified here"
    },
    obtainOrConfirmBeforeFiling: (binding.registryTrack.packetSet?.participantActionRequired ?? [])
      .filter((a) => a.requiredBeforeFiling === true)
      .map((a) => ({ kind: a.kind, requirement: a.requirement, obtainedFrom: a.obtainedFrom ?? null, description: a.description })),
    selfHelpStopConditionsCarried: (binding.memoTrack.selfHelpStopConditions ?? []).length
  });

  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1",
    familyId: FAMILY_ID,
    whatThisIs: "the builder's own count using the repository completeness contract, over the two documents this build authored",
    whatThisIsNot: "independent verification, a raster verdict, a release verdict, or a measurement of the four retained official forms",
    counters: counted.counters,
    allNineZero,
    findings: counted.findings,
    totals: counted.totals,
    blankDispositions: counted.ledger.reduce((acc, row) => { acc[row.disposition] = (acc[row.disposition] ?? 0) + 1; return acc; }, {})
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
    grantsNothing: "A built packet is review evidence only. It opens no route and authorizes no fulfillment."
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1",
    familyId: FAMILY_ID,
    blocking: [],
    openObligations: [{
      obligation: "a field-level map of the four retained official forms",
      owedTo: "the official_pdf_fill treatment",
      whyItIsNotProducedHere: "the captions harvested at those widgets' own positions are fragments, and two of the three insert pages are the court's findings and order rather than the participant's to complete; a map built from those captions would read as authoritative and would not be",
      whatIsProducedInstead: "reports/retained-official-form-widgets.json enumerates every widget, its page, its rectangle, the caption harvested at its own position and the basis of the harvest",
      consequenceForTheNineCounters: "the counters measure the two documents this build authored, and reports/completeness-counters.json says so on its face"
    }],
    findings: [
      {
        finding: "The queue declares four held sources; three of them resolve to one published fifteen-page bundle and one to a standalone insert.",
        treatment: `All ${sources.resolved.length} digests resolved by content hash inside ${sources.mounted.join(" and ")}, and every selected page was proved against the form number the issuer printed in that page's own footer before it was copied.`
      },
      {
        finding: "The two candidates once treated as official published forms - the CCA conviction expungement petition and order - are not official published forms.",
        treatment: `${IDENTITY_DETERMINATION} sets the treatment to COMPOSE_FROM_AUTHORITY, and the queue row's exact next action says to compose those two and retain the supporting forms. That is what this build does, and both statements are asserted at build time.`
      },
      {
        finding: "The retained official forms are delivered into the packet unfilled.",
        treatment: "Every retained page was proved, from the finalized packet bytes, to carry no fixture value. Nothing this build wrote appears on any of them."
      },
      {
        finding: "The Appearance by Unrepresented Person is a conditional component.",
        treatment: "The condition the record states is a self-represented filer, both fixtures are self-represented, so the condition is met and the component is delivered. The condition and the reason are recorded in the packet set manifest."
      },
      {
        finding: "The committed record does not settle the civil filing fee, whether it is charged per county, or whether an indigency waiver exists.",
        treatment: "The packet quotes the record's own words, states plainly that the amount, the per-county question and the waiver are unsettled, and names the clerk of the filing court as the place to ask. It invents no figure."
      },
      {
        finding: "The committed record does not state a prosecutor response deadline or a number of days between service and any hearing.",
        treatment: "The packet says the record states none rather than supplying one."
      },
      {
        finding: `The registry holds ${(binding.registryTrack.legalDesignLimitations ?? []).length} packet instructions and scope restrictions for this track, including the one-petition-per-lifetime rule and the Chastain gate.`,
        treatment: "Every one is carried verbatim, and the two scope restrictions are printed under a READ THIS FIRST heading at the top of the participant instructions."
      },
      {
        finding: `The memo holds ${(binding.memoTrack.selfHelpStopConditions ?? []).length} self-help stop conditions and ${(binding.memoTrack.exclusions ?? []).length} exclusions for this track.`,
        treatment: "Every one is carried verbatim and numbered, with the count printed beside them so short carriage is visible."
      },
      {
        finding: "The full Social Security number must never be persisted, and only the last four digits belong on the petition.",
        treatment: "The petition leaves the last four digits blank as a required-before-filing item and says where the full number goes. This build holds and writes no Social Security number at all."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1",
    familyId: FAMILY_ID,
    requested: "independent completeness verification, central raster acceptance, visual review, and counsel review",
    buildStatus: "state_built",
    status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false,
    live: false,
    commercialRoutesOpened: 0,
    counselQuestionsRaised: [
      "Confirm that a verified petition composed from I.C. 35-38-9-8 and a proposed order composed from I.C. 35-38-9-9, delivered with the issuer's own blank supporting forms, is the right shape for the I.C. 35-38-9-4 route.",
      "Confirm that the four retained official forms may be delivered verbatim and unfilled while a field-level map for them remains owed, or say that the packet must wait for that map.",
      "Confirm that writing the statutory section the route fixes, while leaving the serious-bodily-injury question to the participant with a stop condition attached, is the right split of the classification the record calls a legal judgment.",
      "Confirm that the packet may state the fee is unsettled and name the clerk to ask, rather than waiting on the open question.",
      "Confirm that the discretionary grant and the Section 7 marked-but-public effect are stated plainly enough that a participant cannot read Section 6 sealing into this route."
    ],
    mattersForTheReviewersAttention: [
      "Every committed record is pinned twice: by whole-file SHA-256 and by the SHA-256 of this family's own entry inside it.",
      "Held sources were resolved by content hash across the mounted corpus, never by the declared path.",
      "Each retained page was proved against the issuer's own printed form number before it was copied.",
      "The build status is BUILT_RASTER_PENDING. No raster ran, no self-verification is claimed, and visualDefects records that nobody has looked."
    ]
  });

  return {
    familyId: FAMILY_ID,
    status: "BUILT_RASTER_PENDING",
    implementationStrategy: STRATEGY,
    custodyClass: CUSTODY_CLASS,
    routeKeys: binding.queueFamily.routeKeys,
    directory: OUT,
    componentsAuthoritative: binding.components.length,
    componentsComposed: COMPOSED_COMPONENTS,
    componentsRetained: retainedSummary.map((r) => ({ componentId: r.componentId, documentId: r.documentId, pages: r.pageCount, widgets: r.widgetCount, sha256: r.sourceSha256 })),
    heldSources: sources.resolved.map((row) => ({ sourceId: row.sourceId, sha256: row.sha256, resolvedPath: row.resolvedPath })),
    recordBindings: binding.pins.map((row) => ({ record: row.record, wholeFileSha256: row.wholeFileSha256, thisFamilysEntrySha256: row.thisFamilysEntrySha256 })),
    counters: counted.counters,
    nineCountersZero: allNineZero,
    writes: maps.reduce((sum, m) => sum + m.canonicalWrites.length, 0),
    blanks: maps.reduce((sum, m) => sum + m.canonicalRefusals.length, 0),
    requiredBeforeFiling: rbf.length,
    selfHelpStopConditionsCarried: (binding.memoTrack.selfHelpStopConditions ?? []).length,
    packetInstructionsCarried: (binding.registryTrack.legalDesignLimitations ?? []).length,
    artifactHashes: artifacts.map((a) => ({ fixture: a.fixture, packetSha256: a.sha256, byteLength: a.byteLength, pages: a.pageCount })),
    participantGuidanceHashes: guidance.map((g) => ({ fixture: g.fixture, sha256: g.sha256, pages: g.pageCount })),
    rasterPages: 0,
    rasterState: "BUILT_RASTER_PENDING",
    packetsSelfVerified: 0,
    commercialRoutesOpened: 0,
    productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => { console.error(error); process.exit(1); });
}
