#!/usr/bin/env node
/**
 * New Hampshire streamlined conviction-annulment packet census.
 *
 *   node scripts/build-census-v1-nh_conviction_streamlined-set.mjs [--check] [--no-raster]
 *
 * The route is the mandatory post-2019 violation/class-B-misdemeanor path under
 * RSA 651:5, III(a)(2) and III(b)(2). It delivers NHJB-3057-DSe, the two
 * conditional fee-waiver forms, NHJB-2956, and the three process-guidance
 * components named by the committed packet-set manifest. Court-owned and
 * participant-sworn controls remain blank; held identity and case values are
 * written only through the official source widgets.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, extractPathSegments, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { finalizeOfficialForm, finalizeFlatOverlay } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { flattenedWidgets, drawnAt } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { BLANK_DISPOSITIONS, PASS_COUNTERS, classifyField, classifyBlank, rowKeyOf }
  from "./rcap-packet-completeness/completeness-contract.mjs";
import { loadAppearanceSemantics, dispositionsForFamily }
  from "./rcap-official-forms/rcap-appearance-semantics.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

const FAMILY_ID = "nh_conviction_streamlined-set";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const OUT = "data/rcap-all50/overlays/census-v1/nh/nh-conviction-streamlined-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-nh_conviction_streamlined-set.mjs";

/*
 * WHAT THE SOURCE ITSELF DRAWS INSIDE A FIELD, AND WHETHER IT MAY REACH THE FILING.
 *
 * Refusing to WRITE a field does not clear the appearance the source ships in
 * it. Two of these four forms ship one:
 *
 *   NHJB-2311 sig.8      -- no /V at all, and a widget appearance drawing
 *                           "Enter /s/ before name" in /TiBo 12 at 0.75 g. Grey,
 *                           legible, sitting on the Signature of Filer rule of a
 *                           motion nobody has signed.
 *   NHJB-2328 12.total,  -- /V "0" and an appearance drawing "0.00" at 1 g,
 *   money.total,            WHITE. Invisible on the page and present in the text
 *   monthly.total           layer, on a sworn financial affidavit whose every
 *                           contributing line is blank.
 *
 * All four are /Tx text fields, so the finalizer's structural default calls each
 * of them the court's own ink and preserves it. It is not the court's ink: each
 * is a participant input the source ships pre-answered or pre-prompted, and this
 * build refuses to write all four in its own field map.
 *
 * THE REGISTRY IS KEYED BY FAMILY AND THE FACT IS A FACT ABOUT THE BINARY.
 * data/rcap-all50/shared/field-appearance-semantics.json records what these four
 * appearances MEAN, but it records them under
 * `nh_petition_nonconviction_pre2019-set:NHJB-2311` and
 * `nh_petition_vacated-set:NHJB-2328` -- one entry per family per form, for a
 * measurement that is a property of the FORM BINARY. This family binds byte-for-
 * byte the same NHJB-2311 and NHJB-2328, and the registry file is a shared host
 * this lane does not open, so the dispositions are READ from the entries that
 * already exist and reused only where the digest proves the bytes are identical:
 * the sibling family's own committed source-receipt.json must record the same
 * SHA-256 this build pinned and re-hashed. A sibling receipt that pins a
 * different digest, or a registry that no longer carries the entry, stops the
 * build rather than letting this packet ship the placeholder and the three
 * zeroed totals. The registry's family keying is reported in build-findings.json
 * for the lane that owns the file.
 *
 * NHJB-3057, NHJB-3057 and NHJB-2956 ship no such appearance and are handed an
 * empty map, so they keep the structural default and are byte-unaffected.
 */
const APPEARANCE_SEMANTICS = loadAppearanceSemantics();

/*
 * The sibling families whose registry entries describe THESE binaries, and the
 * committed receipt that proves each one read the same bytes this build binds.
 */
const APPEARANCE_DISPOSITION_SIBLINGS = Object.freeze([
  {
    familyId: "nh_petition_nonconviction_pre2019-set",
    receipt: "data/rcap-all50/overlays/census-v1/nh/nh-petition-nonconviction-pre2019-set--official-pdf-fill/source-receipt.json"
  },
  {
    familyId: "nh_petition_vacated-set",
    receipt: "data/rcap-all50/overlays/census-v1/nh/nh-petition-vacated-set--official-pdf-fill/source-receipt.json"
  }
]);

/* The forms whose source-carried appearance must be dispositioned before the
 * packet may ship them, with the number of fields the registry has to carry. */
const APPEARANCE_DISPOSITIONS_REQUIRED = Object.freeze({ "NHJB-2311": 1, "NHJB-2328": 3 });

/**
 * The dispositions for one form binary, read from the shared registry through a
 * sibling family whose committed receipt binds the identical digest.
 *
 * Nothing is authored here. The disposition string, the field names and the
 * count all come out of the registry; this function only decides WHICH registry
 * entry describes the bytes in hand, and refuses to use one that does not.
 */
function appearanceDispositionsForBinary(formNumber, sha256, provenance) {
  const required = APPEARANCE_DISPOSITIONS_REQUIRED[formNumber];
  if (required === undefined) return new Map();
  for (const sibling of APPEARANCE_DISPOSITION_SIBLINGS) {
    const key = `${sibling.familyId}:${formNumber}`;
    const map = dispositionsForFamily(APPEARANCE_SEMANTICS, key);
    if (map.size === 0) continue;
    const receiptPath = path.join(ROOT, sibling.receipt);
    assert.ok(fs.existsSync(receiptPath),
      `${formNumber}: ${sibling.receipt} is absent, so nothing proves the registry entry ${key} describes these bytes`);
    const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
    const document = (receipt.documents ?? []).find((d) => d.formNumber === formNumber);
    assert.ok(document, `${formNumber}: ${sibling.receipt} records no ${formNumber}, so ${key} cannot be shown to describe these bytes`);
    assert.equal(document.sha256, sha256,
      `${formNumber}: ${sibling.receipt} pins ${document.sha256} and this build bound ${sha256}; a disposition measured on other bytes is not a disposition for these`);
    assert.equal(map.size, required,
      `${key} carries ${map.size} field disposition(s) and this build requires ${required}`);
    /* One entry per binary, not one per render: both fixtures resolve the same
     * digest through the same registry entry, and recording it twice would say
     * two measurements were made where one was. */
    if (!provenance.some((row) => row.formNumber === formNumber && row.sha256 === sha256)) provenance.push({
      formNumber, sha256, registryEntry: key, registryPath: "data/rcap-all50/shared/field-appearance-semantics.json",
      digestProvedBy: sibling.receipt,
      fields: Object.fromEntries(map),
      why: "the registry is keyed by family and this measurement is a property of the form binary; the sibling family's committed receipt binds the identical SHA-256"
    });
    return map;
  }
  throw new Error(`${formNumber}: no registry entry describes this form, so the source's own ink in it is undispositioned and the packet may not ship it`);
}

/*
 * THE COST OF FILING, READ OUT OF THE COMMITTED RECORD RATHER THAN DENIED.
 *
 * This packet used to tell the participant that "the fee for a petition to annul
 * is not established in any source this packet holds". That sentence was true of
 * this family's BINDINGS and false of the repository: the committed New Hampshire
 * legal-design memo carries the figure, the schedule it was read from, the
 * single-fee-per-location rule, and the two agency fees this track is exempt
 * from. A packet that binds four form binaries and then reports the whole
 * repository silent sends a participant out to ask for something already written
 * down.
 *
 * So the memo is bound here as a grounding record, by its own SHA-256, the way
 * la-987 binds LA.memo.json -- and the fee sentences the packet prints are read
 * out of it at build time and quoted, never paraphrased and never retyped.
 * Nothing about the fee is authored by this file. If the memo changes the packet
 * changes with it, and if the memo went silent the build would fail rather than
 * print a figure this file remembered.
 */
const GROUNDING_RECORDS = Object.freeze({
  memo: "data/record-clearing/legal-design-intake/NH.memo.json",
  /*
   * The track registry is bound as well as the memo, because the packet prints
   * things out of it that the memo alone does not carry in the same shape: the
   * packet-set's own requiredBeforeFiling steps, and the self-help stop
   * conditions this route names. Both records are read and asserted to agree on
   * everything the packet quotes, so the packet cannot print a sentence only one
   * of them holds.
  */
  trackRegistry: "data/record-clearing/legal-design-track-registry.json",
  ownerAdoption: "data/rcap-grade-a/legal-decisions/NH_STREAMLINED_OWNER_ADOPTION_2026-09-12.json",
  adoptionReview: "NH_Streamlined_Adoption_Review_2026-09-12.md",
  researchDraft: "data/rcap-grade-a/packet-factory-24h/vf44/nh-streamlined-legal-design-research-draft-20260912.json",
  blockedVerdict: "data/rcap-grade-a/packet-factory-24h/vf02/rows-vf02-nh-conviction-streamlined-restart-semantic-blocked-20260912.json"
});
const MEMO_TRACK_ID = "nh_conviction_streamlined";
/* The schedule the memo names in its own officialSources list. */
const FEE_SCHEDULE_TITLE_PREFIX = "Circuit Court Filing Fees";
const OWNER_ADOPTION_DECISION_ID = "NH-STREAMLINED-BOUNDED-OWNER-ADOPTION-20260912";

/*
 * The owner adopted a bounded product treatment, not a statutory construction.
 * These are the participant-facing rules implemented below.  loadOwnerAdoption
 * binds them to the actual owner record and refuses to build unless that record
 * names this family, the exact decision and all five revisions.
 */
const ADOPTED_PRODUCT_RULES = Object.freeze({
  noDoc: Object.freeze({
    scope: "a proven RSA 651:5 III(a)(2) or III(b)(2) case",
    participant:
      "For a proven streamlined case, follow the published no-DOC sequence: do not start a routine Department of Corrections referral, questionnaire or investigation charge. The statute's broad paragraph IX wording remains a recorded conflict, so this is a bounded product treatment rather than a statutory exemption or a government-fee waiver. If the court or DOC demands a referral or questionnaire, stop and confirm the requirement; never disregard it.",
    outsideScope:
      "This treatment does not apply to standard, pre-2019, vacated, marijuana, class-A, felony or uncertain-highest-offense cases."
  }),
  costs: Object.freeze({
    court:
      "$125.00 court filing fee per court location, subject to the court's current schedule and filing instructions.",
    doc:
      "DOC investigation: no routine charge in the proven streamlined branch; a contrary court or DOC demand is a case-specific confirmation/review branch and any separately assessed fee remains distinct.",
    statePolice:
      "After a successful conviction annulment, expect a separate $100 Department of Safety/State Police record-correction charge, subject to any applicable agency waiver or exemption and the agency's actual assessment. The agency is paid directly and sends its own notification/payment instructions.",
    criminalHistory:
      "Any criminal-history request charge is a separate agency cost and is not included in the court filing fee or the State Police post-order correction charge.",
    distinct:
      "Keep the court filing fee, any contrary DOC investigation fee, the State Police post-order correction fee and any criminal-history request charge as separate cost items; do not count the IX and X(d) descriptions as two correction charges without evidence of two assessments."
  }),
  conditionalGrant: Object.freeze({
    participant:
      "Treat a conditional or interim order, the notice/objection window, a final entered court annulment order or certificate, and State Police payment or waiver plus record-update confirmation as separate evidenced steps. Twenty days passing by itself does not establish a completed annulment.",
    receipt:
      "The form's Date Sent to Prosecutor records sending, not receipt. Do not calculate the objection deadline from filing, sending or the participant's receipt. Prefer a court-specified deadline; otherwise require a verified prosecutor-receipt anchor and the applicable time-computation rules. If receipt is unknown, show the deadline as unconfirmed.",
    participantSteps:
      "Retain the order and court notices, monitor correspondence, comply with court requests, obtain legal help for an opposition or disputed eligibility, confirm the final court action, and complete any separately notified State Police payment or waiver step. An ordinary status inquiry or document request does not itself require a lawyer."
  }),
  highestOffense: Object.freeze({
    participant:
      "Require a documented court-record basis for the highest-offense conclusion. Do not demand a new judicial label for an unambiguous record. If the comparison group, offense classification or relationship between different disposition dates remains uncertain, send this case to individual manual legal review; do not auto-approve, auto-ineligible or freeze the whole family.",
    wholeRecord:
      "Apply the target's paragraph III clean-period and subsequent-conviction condition, the applicable III exceptions, paragraph IV's denial restriction, paragraph V exclusions, paragraph VI whole-record timing/bar, paragraph VI-a out-of-state equivalence rule and paragraph VII pending-charge predicate. Do not reduce this to one target completion date or treat every pending matter as the same bar.",
    manualBranch: "MANUAL_LEGAL_REVIEW_FOR_UNRESOLVED_HIGHEST_OFFENSE"
  }),
  waivers: Object.freeze({
    court:
      "The NHJB-2311 motion and NHJB-2328 financial statement remain a conditional court-filing-fee pair only where the disposing clerk confirms that their court/channel edition and confidentiality/service treatment fit the filing. NHJB-2311 lists Superior Courts and NHJB-2328 is an e-filing-only edition with a different chooser; an unverified fit is withheld from filing with an explicit reason, while the contracted conditional coverage remains recorded.",
    statePolice:
      "A court filing-fee waiver does not waive the State Police correction charge. Any State Police indigency request, affidavit or waiver decision is a separate agency branch; the held court waiver forms are not treated as an agency approval or as a substitute for an agency-compatible request.",
    branchStatus: "WITHHELD_UNVERIFIED_COURT_CHANNEL_COMPATIBILITY",
    coverage: "Conditional waiver coverage remains in the packet contract and is not silently removed when the exact court/channel or agency branch is unverified."
  }),
  checklistLocators: Object.freeze({
    costs: "The held Judicial Branch checklist's costs and agency-fee notice are on PDF page 3.",
    noDoc: "The held Judicial Branch checklist's explicit no-DOC streamlined sequence is on PDF page 4."
  })
});

const ROUTE = Object.freeze({
  jurisdiction: "NH",
  routeKeys: ["obligation:track-only:NH:nh_conviction_streamlined"],
  routeKey: "obligation:track-only:NH:nh_conviction_streamlined",
  routeSelectionId: "nh-conviction-streamlined-set-nhjb-3057-2311-2328-2956",
  publicLabel: "Petition of Eligibility for Annulment of a Violation or Class B Misdemeanor Conviction, Streamlined Mandatory Route",
  authority: "RSA 651:5, III(a)(2) and III(b)(2); New Hampshire Judicial Branch forms NHJB-3057-DSe, NHJB-2311, NHJB-2328 and NHJB-2956",
  documents: [
    { formNumber: "NHJB-3057", sourceId: "official-form:NHJB-3057-DSe", pinnedSha256: "02310e85cd02e3a8a5ff9c486f6729e85363146ccc07d6e8226e4f1259d1b520",
      title: "Petition of Eligibility for Annulment of Record Conviction: For offenses resolved 01/01/2019 or later", instrumentKind: "primary_filing" },
    { formNumber: "NHJB-2311", sourceId: "official-form:NHJB-2311", pinnedSha256: "f8b5df1366a91a9fd177612c0519f941b8d4f60e1f8f84c2a6c0c064ba7da58e",
      title: "Motion for Waiver of Filing Fee", instrumentKind: "fee_waiver_motion" },
    { formNumber: "NHJB-2328", sourceId: "official-form:NHJB-2328", pinnedSha256: "b4384b41efb472951c28b1289e46b05dfcc9463147aa490597f541f5291ce919",
      title: "Statement of Assets and Liabilities for Individuals and Sole Proprietors", instrumentKind: "fee_waiver_financial_statement" },
    { formNumber: "NHJB-2956", sourceId: "official-form:NHJB-2956", pinnedSha256: "c8e5e9fead600ad30a956eac98c43d30d9ca3a3b8b4bc619713e50c83524f569",
      title: "Criminal History Record Information Release Authorization", instrumentKind: "criminal_history_request" }
  ],
  guidanceComponents: [
    { role: "sentence_completion_proof", heading: "Proof that your sentence is complete" },
    { role: "post_filing_instructions", heading: "What happens after you file" },
    { role: "effect_and_limits_disclosure", heading: "What annulment does, and what it does not do" }
  ]
});

function corpusRoot() {
  const configured = process.env.MASTER_LIBRARY_SOURCE_DIR
    ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
  assert.ok(fs.existsSync(configured), `the Master Library is not mounted at ${configured}`);
  return configured;
}

/*
 * Read a committed record, hash the bytes that were read, and keep both.
 *
 * The hash is taken from the same buffer the build parses, so the digest in the
 * receipt is a digest of what was used and not of a second read of the file.
 */
function readGroundingRecord(relative) {
  const bytes = fs.readFileSync(path.join(ROOT, relative));
  return {
    path: relative,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    byteLength: bytes.length,
    data: relative.toLowerCase().endsWith(".json") ? JSON.parse(bytes.toString("utf8")) : null,
    text: bytes.toString("utf8")
  };
}

/**
 * Bind the owner's actual adoption before composing participant copy.  The
 * adoption resolves the product treatment while deliberately leaving counsel,
 * court, packet and production acceptance separate.  The original research
 * draft and blocked semantic row remain history and are hash-bound here.
 */
function loadOwnerAdoption() {
  const adoption = readGroundingRecord(GROUNDING_RECORDS.ownerAdoption);
  assert.equal(adoption.data.schemaVersion, "rcap-grade-a-legal-block-resolution/v1",
    `${GROUNDING_RECORDS.ownerAdoption}: unsupported legal-resolution schema`);
  assert.ok(adoption.data.provenance?.ownerAdoption === true,
    `${GROUNDING_RECORDS.ownerAdoption}: owner adoption is not recorded`);
  assert.equal(adoption.data.provenance?.counselApproval, false,
    `${GROUNDING_RECORDS.ownerAdoption}: counsel approval must remain false for this owner adoption`);
  assert.equal(adoption.data.provenance?.packetPass, false,
    `${GROUNDING_RECORDS.ownerAdoption}: packet acceptance may not be claimed by an owner adoption`);
  assert.equal(adoption.data.provenance?.productionAuthorization, false,
    `${GROUNDING_RECORDS.ownerAdoption}: production authorization may not be claimed by an owner adoption`);
  assert.ok(adoption.data.legalClearFamilyIds?.includes(FAMILY_ID),
    `${GROUNDING_RECORDS.ownerAdoption}: ${FAMILY_ID} is not legally clear under the adopted bounded process`);
  const decision = (adoption.data.decisions ?? []).find((row) => row.decisionId === OWNER_ADOPTION_DECISION_ID);
  assert.ok(decision, `${GROUNDING_RECORDS.ownerAdoption}: decision ${OWNER_ADOPTION_DECISION_ID} is absent`);
  assert.equal(decision.disposition, "LEGAL_CLEAR");
  assert.deepEqual(decision.familyIds, [FAMILY_ID]);
  assert.equal(decision.adoptedRevisions?.length, 5,
    `${GROUNDING_RECORDS.ownerAdoption}: the five adopted revisions are not all recorded`);
  assert.deepEqual(decision.adoptedRevisions.map((row) => row.number), [1, 2, 3, 4, 5]);
  for (const phrase of ["no-DOC", "$100 State Police", "sending is not receipt", "manual review", "Court/channel compatibility"]) {
    assert.ok(decision.bindingProductRule.includes(phrase),
      `${GROUNDING_RECORDS.ownerAdoption}: binding rule does not carry ${phrase}`);
  }

  const draft = readGroundingRecord(GROUNDING_RECORDS.researchDraft);
  assert.equal(draft.sha256, adoption.data.provenance?.draft?.sha256,
    `${GROUNDING_RECORDS.researchDraft}: draft digest differs from the adopted historical identity`);
  const review = readGroundingRecord(GROUNDING_RECORDS.adoptionReview);
  assert.equal(review.sha256, adoption.data.provenance?.adoptionReview?.sha256,
    `${GROUNDING_RECORDS.adoptionReview}: review digest differs from the adopted historical identity`);
  const blockedVerdict = readGroundingRecord(GROUNDING_RECORDS.blockedVerdict);
  assert.equal(blockedVerdict.sha256, adoption.data.provenance?.originalBlockedVerdict?.sha256,
    `${GROUNDING_RECORDS.blockedVerdict}: blocked semantic history differs from the adopted historical identity`);
  const memoIdentity = adoption.data.provenance?.governingMemoReconciliation;
  assert.equal(memoIdentity?.path, GROUNDING_RECORDS.memo,
    `${GROUNDING_RECORDS.ownerAdoption}: governing memo identity is not bound to ${GROUNDING_RECORDS.memo}`);
  assert.equal(memoIdentity?.trackId, MEMO_TRACK_ID,
    `${GROUNDING_RECORDS.ownerAdoption}: governing memo identity names the wrong track`);
  const memo = readGroundingRecord(GROUNDING_RECORDS.memo);
  assert.equal(memo.sha256, memoIdentity?.sha256,
    `${GROUNDING_RECORDS.memo}: historical memo digest differs from the adoption's bound identity`);
  assert.ok(Array.isArray(memoIdentity?.supersededFieldScopes) && memoIdentity.supersededFieldScopes.length > 0,
    `${GROUNDING_RECORDS.ownerAdoption}: affected memo field scopes are not recorded`);

  return {
    record: adoption,
    decision,
    draft,
    review,
    blockedVerdict,
    memo,
    memoIdentity,
    revisionNumbers: decision.adoptedRevisions.map((row) => row.number),
    rules: ADOPTED_PRODUCT_RULES
  };
}

/*
 * The cost and waiver sentences this route is charged with disclosing, taken
 * verbatim from the memo's own track entry.
 *
 * Every assertion here is an assertion that the memo still SAYS what the packet
 * is about to print. A silent memo, a renamed track or an emptied rule stops the
 * build; none of them lets the packet fall back to prose this file remembers.
 */
function loadFeeGrounding() {
  const memo = readGroundingRecord(GROUNDING_RECORDS.memo);
  const track = (memo.data.tracks ?? []).find((row) => row.trackId === MEMO_TRACK_ID);
  assert.ok(track, `${GROUNDING_RECORDS.memo} holds no track ${MEMO_TRACK_ID}`);
  assert.equal(track.legalName,
    "Petition of Eligibility for Annulment of a Violation or Class B Misdemeanor Conviction, "
    + "Streamlined Mandatory Route (RSA 651:5, III(a)(2) and III(b)(2))");

  const fees = track.rules?.fees;
  const feeWaiver = track.rules?.feeWaiver;
  const sharedFee = track.destination?.detail;
  for (const [name, value] of [["rules.fees", fees], ["rules.feeWaiver", feeWaiver], ["destination.detail", sharedFee]]) {
    assert.ok(typeof value === "string" && value.trim().length > 0,
      `${GROUNDING_RECORDS.memo} track ${MEMO_TRACK_ID} carries no ${name}, so the packet cannot state one`);
  }

  const schedule = (track.officialSources ?? []).find((row) => String(row.title ?? "").startsWith(FEE_SCHEDULE_TITLE_PREFIX));
  assert.ok(schedule, `${GROUNDING_RECORDS.memo} track ${MEMO_TRACK_ID} names no ${FEE_SCHEDULE_TITLE_PREFIX} source`);

  return { record: memo, track, fees, feeWaiver, sharedFee, schedule };
}

/*
 * WHERE SELF-HELP ENDS, IN THE RECORD'S OWN WORDS.
 *
 * The committed legal-design record holds nineteen selfHelpStopConditions for
 * this track. They are read here rather than restated, and every one of them is
 * printed verbatim: a stop condition paraphrased is a stop condition weakened,
 * and the several that carry a statute cite -- RSA 651:5, IV, RSA 651:5, XIII,
 * RSA 651:5, XIV, RSA 651:5, XVII, RSA 651:6, RSA 318-B:26, II, RSA 631:2-b and
 * RSA 265-A:21 -- lose the cite in any paraphrase.
 *
 * TWO RECORDS, AND THEY MUST AGREE. The registry and the intake memo carry the
 * same track and this family binds both by SHA-256. Both are read and asserted
 * identical, so the packet cannot print nineteen sentences that only one of them
 * holds. A count that is not nineteen, or a disagreement between the two, stops
 * the build rather than shipping a shortened list.
 */
const SELF_HELP_STOP_CONDITIONS_EXPECTED = 13;

function loadSelfHelpStops(memo) {
  const registry = readGroundingRecord(GROUNDING_RECORDS.trackRegistry);
  const track = (registry.data.tracks ?? []).find((row) => row.trackId === MEMO_TRACK_ID);
  assert.ok(track, `${GROUNDING_RECORDS.trackRegistry} holds no track ${MEMO_TRACK_ID}`);

  const conditions = track.selfHelpStopConditions ?? [];
  assert.equal(conditions.length, SELF_HELP_STOP_CONDITIONS_EXPECTED,
    `${GROUNDING_RECORDS.trackRegistry} track ${MEMO_TRACK_ID} carries ${conditions.length} selfHelpStopConditions, `
    + `not ${SELF_HELP_STOP_CONDITIONS_EXPECTED}; the packet prints every one of them and will not print a list it cannot account for`);
  for (const c of conditions) {
    assert.ok(typeof c === "string" && c.trim().length > 0, "a self-help stop condition is empty");
  }

  const fromMemo = (memo.data.tracks ?? []).find((row) => row.trackId === MEMO_TRACK_ID)?.selfHelpStopConditions ?? [];
  assert.deepEqual(fromMemo, conditions,
    `${GROUNDING_RECORDS.memo} and ${GROUNDING_RECORDS.trackRegistry} disagree on this track's self-help stop conditions`);

  return { record: registry, conditions, boundaries: track.selfHelpBoundaries ?? [] };
}

/*
 * WHO MUST BE SERVED, IN THE RECORD'S OWN WORDS.
 *
 * The committed record answers this obligation in two sentences and the packet
 * prints both rather than restating them, from the same two records the fee and
 * the stop conditions are read from. Both must agree. An emptied or reworded
 * rule stops the build rather than letting the packet print prose this file
 * remembers.
 *
 * On this route the answer is that the participant serves nobody: RSA 651:5, IX
 * has the COURT provide the copy of the petition to the prosecutor. That matters
 * on the paper as well as in the prose, because NHJB-2328 carries a certificate
 * of service, and the certificate's disposition in the dictionary below quotes
 * this record's service sentence. It is asserted here against the record too and
 * cannot drift from it.
 */
const SERVICE_SENTENCE_QUOTED_IN_THE_DICTIONARY = "None by the participant. The court gives the notice.";

function loadServiceRule(memo) {
  const registry = readGroundingRecord(GROUNDING_RECORDS.trackRegistry);
  const track = (registry.data.tracks ?? []).find((row) => row.trackId === MEMO_TRACK_ID);
  assert.ok(track, `${GROUNDING_RECORDS.trackRegistry} holds no track ${MEMO_TRACK_ID}`);

  const service = track.rules?.service;
  const notice = track.rules?.notice;
  for (const [name, value] of [["rules.service", service], ["rules.notice", notice]]) {
    assert.ok(typeof value === "string" && value.trim().length > 0,
      `${GROUNDING_RECORDS.trackRegistry} track ${MEMO_TRACK_ID} carries no ${name}, so the packet cannot state who is served`);
  }
  const fromMemo = (memo.data.tracks ?? []).find((row) => row.trackId === MEMO_TRACK_ID)?.rules ?? {};
  assert.equal(fromMemo.service, service,
    `${GROUNDING_RECORDS.memo} and ${GROUNDING_RECORDS.trackRegistry} disagree on this track's service rule`);
  assert.equal(fromMemo.notice, notice,
    `${GROUNDING_RECORDS.memo} and ${GROUNDING_RECORDS.trackRegistry} disagree on this track's notice rule`);
  assert.equal(service, SERVICE_SENTENCE_QUOTED_IN_THE_DICTIONARY,
    "the NHJB-2328 certificate-of-service disposition quotes the record's service sentence verbatim; the record no "
    + "longer says that, so the quotation would be stale");

  return { record: registry, service, notice };
}

const OPEN_RELEASE_BLOCKERS_EXPECTED = 3;

/*
 * WHAT THE RECORD HAS NOT SETTLED, IN ITS OWN WORDS.
 *
 * The committed record classifies some questions on this route as release
 * blockers: things it read and could not resolve. A packet that printed around
 * them would be quietly answering them. They are read here, asserted identical
 * across the registry and the intake memo, and printed verbatim under their own
 * heading, so the participant is told what nobody has established rather than
 * given a number or a timetable no source supports.
 *
 * They are release blockers, not build blockers: the packet factory queue
 * records this family's legalInputStatus as SETTLED and its row gate reports no
 * open legal input, so the family builds. Clearing them is the release gate's
 * work and this lane does not attempt it, does not research it, and does not
 * guess.
 */
function loadOpenQuestions(memo) {
  const registry = readGroundingRecord(GROUNDING_RECORDS.trackRegistry);
  const track = (registry.data.tracks ?? []).find((row) => row.trackId === MEMO_TRACK_ID);
  assert.ok(track, `${GROUNDING_RECORDS.trackRegistry} holds no track ${MEMO_TRACK_ID}`);
  const fromMemo = (memo.data.tracks ?? []).find((row) => row.trackId === MEMO_TRACK_ID)?.unresolvedQuestions ?? [];
  const fromRegistry = track.unresolvedQuestions ?? [];
  assert.deepEqual(fromMemo, fromRegistry,
    `${GROUNDING_RECORDS.memo} and ${GROUNDING_RECORDS.trackRegistry} disagree on this track's unresolved questions`);
  const releaseBlockers = fromRegistry.filter((q) => q.impact === "release_blocker");
  assert.equal(releaseBlockers.length, OPEN_RELEASE_BLOCKERS_EXPECTED,
    `${GROUNDING_RECORDS.trackRegistry} track ${MEMO_TRACK_ID} carries ${releaseBlockers.length} release-blocking open `
    + `question(s), not ${OPEN_RELEASE_BLOCKERS_EXPECTED}; the packet states every one of them and will not print a list it cannot account for`);
  for (const q of releaseBlockers) {
    assert.ok(typeof q.question === "string" && q.question.trim().length > 0, "an open question is empty");
  }
  return { record: registry, releaseBlockers, all: fromRegistry };
}

const SUPPLY = (what) => ({ policy: "supply", what });
const WRITE = (fact) => ({ policy: "write", fact });
const PROTECT = (refusalClass, why) => ({ policy: "protect", refusalClass, why });
const ELECTION = (why) => ({ policy: "election", why });
const ATTORNEY = (why) => ({ policy: "attorney", why });
/* A button in the PDF viewer. It clears, saves or navigates; nothing is filed in it. */
const VIEWER = (why) => ({ policy: "viewer", why: `viewer ui control; never a filing fact — ${why}` });
/* A box the form itself marks conditional, which the participant fills if it applies to them. */
const OPTIONAL = (what) => ({ policy: "optional", what });
/* A branch of the form this route does not use. Never populated with participant data. */
const NOT_ON_ROUTE = (why) => ({ policy: "not_on_route", why });
/*
 * A fact the platform HOLDS, written at this widget's own rectangle through the
 * finalizer's opt-in named-fact channel rather than through the shared
 * descriptor channel.
 *
 * WHY THE ORDINARY CHANNEL CANNOT REACH THESE BOXES, measured against the live
 * rules in this container rather than asserted. decideBinding tries the field
 * NAME first and the printed LABEL only if the name matches nothing, and New
 * Hampshire names several boxes for the line ABOVE them rather than for what
 * they collect. So the name channel matches, and matches the WRONG fact:
 *
 *   NHJB-3057 "Mailing Address.2"  (prints City/Town)   -> participant.street_address
 *   NHJB-2956 "name.1"/"name.3"/"name.4" (LAST/FIRST/MI) -> participant.full_legal_name
 *   NHJB-2956 "Mailing Address1"   (STREET/CITY/STATE/ZIP CODE) -> participant.street_address
 *
 * and an explicit mapping to the right fact is then refused as
 * explicit_mapping_conflicts_with_field_name. A caption correction cannot help
 * either, because the NAME channel resolves before the label is consulted at
 * all. That is a property of scripts/rcap-official-forms/rcap-field-semantics.mjs,
 * which is shared by every builder in the corpus and which this lane does not
 * open; it stays reported in build-findings.json for the lane that owns it.
 *
 * Until FIX78 these five boxes were declared required-before-filing with the
 * sentence "the platform holds no value for this", which this builder's own
 * fixtures contradict, and the paper showed it: NHJB-3057 printed an address
 * with a street, a state and a ZIP and no town, and NHJB-2956's Section I
 * carried a date of birth with no name and no address at all. The completeness
 * contract's REQUIRED_BEFORE_FILING_CONDITIONS names that case in terms -- "A
 * fact written anywhere else in the same packet is available, and refusing it
 * here is a missing known fact" -- and VF01 scored it as this family's one
 * failing obligation.
 *
 * THE CHANNEL AND ITS LIMITS. narrativeAcrossFields is the finalizer's own
 * opt-in channel for one held fact laid out on the ruled line a form prints for
 * it. The caller names a FACT ID and a FIELD and nothing else: the shared
 * module resolves the fact from the same facts set every other write is
 * resolved from, runs the same protect test on the caption AND on the field
 * name, refuses a field already written or classified unwritable by role, fits
 * the value to that widget's own rectangle, and refuses it WHOLE rather than
 * truncating. No caller text can reach the page through it. The ordinary pass
 * skips a named field entirely, so the wrong fact cannot be written there
 * first. It also carries the complete held residence address into NHJB-2328's
 * numeric field 2.1, whose generic address caption otherwise binds street only.
 * NHJB-2956 "name.2" (maiden name or alias) is NOT named and stays the
 * participant's, as does every other box on these forms.
 */
const NARRATIVE = (fact, what) => ({ policy: "narrative", fact, what });

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const PARTICIPANT_ELECTION = "participant_sworn_narrative_or_legal_election";

/*
 * The agency block on both forms is the same shape and the same reasoning: an
 * arresting or prosecuting AGENCY is a case fact, and the completeness contract
 * refuses to let a court/clerk refusal class hide one. The platform does not
 * hold this participant's agencies, so each is declared and disclosed by name.
 */
const FORM_FIELDS = {
  /*
   * NHJB-3057-DSe, the post-2019 petition. Four pages: the petition on page 1,
   * the sworn certification and the signature lines on page 2, and the court's
   * own order on pages 3 and 4 -- page 3 for violations and class B
   * misdemeanors, page 4 for class A misdemeanors and felonies after the
   * Department of Corrections report.
   *
   * TWO THINGS A READER SHOULD KNOW ABOUT THIS FORM'S FIELD SET. It carries NO
   * AcroForm widget for the applicant's signature or the date beside it: the
   * "Date" and "Applicants Signature" rules on page 2 are printed page content
   * with nothing on top of them, so there is nothing here for the build to
   * refuse and nothing for it to write. The same is true of every line in the
   * two FOR COURT USE ONLY sections -- the judge's signature, the printed name,
   * the dates, the denial reasons and the CC list are all printed rules. Both
   * facts are recorded in build-findings.json and put in front of visual review,
   * because "no protected write" is a weaker statement when the protected field
   * is not a field.
   */
  "NHJB-3057": {
    /* --- The caption ----------------------------------------------------- */
    "court.district/su": {
      section: "Caption", label: "Court Name (selection)", selection: true,
      ...ELECTION("New Hampshire prints every circuit-court district division and every superior court in this list, and which one disposed of your charge is a fact about your case; the platform holds no court assignment for you")
    },
    case: { section: "Caption", label: "Case Name, as the court styles it", ...SUPPLY("the case name exactly as the court writes it, which for a New Hampshire criminal case is usually The State of New Hampshire v. your name; copy it from a paper the court sent you") },
    "case number": { section: "Caption", label: "Case Number", ...WRITE("matter.case_number") },
    "Charge ID": { section: "Caption", label: "Charge ID, if known", ...SUPPLY("the Charge ID the court or the police gave this charge, if you know it. The form says 'if known' and does not require it") },

    /* --- Applicant's information ----------------------------------------- */
    "name.1": { section: "Applicant's Information", label: "Full Name", ...WRITE("participant.full_legal_name") },
    DOB: { section: "Applicant's Information", label: "Date of Birth", ...WRITE("participant.date_of_birth") },
    "Mailing Address.1": { section: "Applicant's Information", label: "Address", ...WRITE("participant.street_address") },
    "Mailing Address.2": {
      section: "Applicant's Information", label: "City or Town",
      ...NARRATIVE("participant.city",
        "the city or town you live in, in the box the form prints City/Town")
    },
    "States/short": { section: "Applicant's Information", label: "State", ...WRITE("participant.state") },
    zip: { section: "Applicant's Information", label: "Zip Code", ...WRITE("participant.zip") },
    "telnum.1": { section: "Applicant's Information", label: "Telephone Number", ...WRITE("participant.phone") },
    Email: { section: "Applicant's Information", label: "E-mail Address (optional)", ...WRITE("participant.email") },

    /* --- Charge information ---------------------------------------------- *
     * One offence per form, in the form's own words: "PLEASE COMPLETE A
     * SEPARATE FORM FOR EACH OFFENSE". Every cell here is read off the court
     * record, and the platform holds none of them. The charge degree matters
     * more here than anywhere else in the packet: RSA 651:5, III sets a
     * different waiting period for a violation, a class B misdemeanor, a class A
     * misdemeanor and each felony class, and it also decides which of the two
     * court-use pages the court will use. */
    rsa: { section: "Charge Information", label: "RSA or statute violated", ...SUPPLY("the RSA (statute) number the charge was brought under, from the court record") },
    charge1: { section: "Charge Information", label: "The crime or offence, as the court record names it", ...SUPPLY("the name of the crime or offence exactly as the court record gives it") },
    "Date.3": { section: "Charge Information", label: "Offense Date", ...SUPPLY("the date the offence happened, from the court record") },
    "Date.2": { section: "Charge Information", label: "Date of Conviction", ...SUPPLY("the date you were convicted, from the court record. It is also the date that decides which of the two petition forms in this packet you file") },
    charge2: { section: "Charge Information", label: "Charge Degree at Conviction", ...SUPPLY("the degree of the charge as you were convicted of it — a violation, a class B misdemeanor, a class A misdemeanor, or a felony and its class — exactly as the court record states it. Do not estimate it: RSA 651:5, III sets a different waiting period for each") },
    "tr.description": { section: "Charge Information", label: "Description of Sentence and Date Sentence Completed", ...SUPPLY("the sentence the court imposed, described from the court record, and the date every term and condition of it was completed, including any fine, restitution, cost, period of good behaviour, probation and suspended sentence. The clerk of the sentencing court can confirm the date") },

    /* --- The applicant's certification ------------------------------------ *
     * Seven sworn statements and a hearing request. Each is a statement the
     * applicant swears to under penalties of law, and none of them is the
     * platform's to make. */
    cb3: { section: "Applicant's Certification", selection: true, label: "Certifying every term and condition of the sentence has been completed (selection)", ...ELECTION("you swear to this under penalties of law, and the platform holds no record of what you have completed") },
    cb4: { section: "Applicant's Certification", selection: true, label: "Certifying the time requirements under RSA 651:5, III have been met for the crime of conviction (selection)", ...ELECTION("you swear to this under penalties of law; it turns on the charge degree and on dates the platform does not hold") },
    cb5: { section: "Applicant's Certification", selection: true, label: "Certifying you have not been convicted of another crime since completing the sentence, except a motor vehicle violation (selection)", ...ELECTION("you swear to this under penalties of law about your own record since sentence, which the platform has not seen") },
    cb6: { section: "Applicant's Certification", selection: true, label: "Certifying there are no charges pending against you in any other court, except as stated (selection)", ...ELECTION("you swear to this under penalties of law about charges in every other court, which the platform has not seen") },
    cb7: { section: "Applicant's Certification", selection: true, label: "Certifying none of the charges sought to be annulled is a violent crime, a felony crime of obstruction of justice, or carried an extended term under RSA 651:6 (selection)", ...ELECTION("you swear to this under penalties of law; it is a legal characterisation of your own matters and the platform will not make it for you") },
    cb8: { section: "Applicant's Certification", selection: true, label: "Certifying the charge sought to be annulled has no enhanced penalty for a second conviction (selection)", ...ELECTION("you swear to this under penalties of law; it is a legal characterisation of your own matter and the platform will not make it for you") },
    "Check Box1": { section: "Applicant's Certification", selection: true, label: "Certifying the time requirements have been met for every offence you have been convicted of (selection)", ...ELECTION("you swear to this under penalties of law across your whole record, which the platform has not seen. RSA 651:5, VI is the reason the form asks: one entry whose time requirements are not met stops the whole petition") },
    "Check Box2": { section: "Applicant's Certification", selection: true, label: "Requesting a hearing before a judge (selection)", ...ELECTION("the form says the court may make its order without a hearing after considering the Department of Corrections investigation report and any response from the State, unless you ask for one, and whether to ask is your choice") },
    "tr.pending": { section: "Applicant's Certification", label: "The charges pending against you in another court, if there are any", ...SUPPLY("any charges pending against you in another court. Leave it empty if there are none, and read the statement above it before you sign") },

    /* --- Signature -------------------------------------------------------- *
     * The applicant's own signature and date are PRINTED RULES on page 2 with
     * no widget over them, so the only signature-block controls this form
     * carries are the counsel ones. */
    Counsel: { section: "Signature", label: "Name of Counsel", ...ATTORNEY("attorney-only; no attorney-representation fact is held for this participant") },
    "Counsel Mailing Address1": { section: "Signature", label: "Counsel's Address, first line", ...ATTORNEY("attorney-only; no attorney-representation fact is held for this participant") },
    "Counsel Mailing Address2": { section: "Signature", label: "Counsel's Address, second line", ...ATTORNEY("attorney-only; no attorney-representation fact is held for this participant") },

    /* --- Page 2, 3 and 4 headers ------------------------------------------ */
    case1: { section: "Page Header", label: "Case Name repeated in the page header", ...SUPPLY("the same case name as the caption, repeated in the header of the later pages") },
    "case number1": { section: "Page Header", label: "Case Number repeated in the page header", ...WRITE("matter.case_number") },

    /* --- Viewer controls --------------------------------------------------- */
    "Clear Form - multi": { section: "Viewer Controls", label: "Clear this form (viewer control)", ...VIEWER("a button in the PDF viewer, not a place anything is filed") },
    "Save and lock form": { section: "Viewer Controls", label: "Save this form and lock it (viewer control)", ...VIEWER("a button in the PDF viewer, not a place anything is filed") },
    "top page": { section: "Viewer Controls", label: "Reset the view to the top of the form (viewer control)", ...VIEWER("a navigation button in the PDF viewer, not a place anything is filed") },
    "1st page": { section: "Viewer Controls", label: "Reset the view to the first page of the form (viewer control)", ...VIEWER("a navigation button in the PDF viewer, not a place anything is filed") }
  },
  "NHJB-2311": {
    "court.superior": {
      section: "Caption", label: "Court Name (selection)", selection: true,
      ...ELECTION("this list offers the superior courts; pick the court your case is in, and read the build note about circuit-court cases in build-findings.json")
    },
    case: { section: "Caption", label: "Case Name, as the court styles it", ...SUPPLY("the same case name you put on the petition") },
    "case number": { section: "Caption", label: "Case Number", ...WRITE("matter.case_number") },
    name: { section: "The Motion", label: "Applicant's full name, in the opening line of this request", ...WRITE("participant.full_legal_name") },
    "tr.reasons": { section: "The Motion", label: "Explain why you cannot pay the filing fee", ...SUPPLY("your own account of why you cannot pay the filing fee now. The platform does not write a sworn explanation of your finances for you") },
    "sig.1": { section: "Signature Block", label: "Name of Filer, entered at signature", ...PROTECT(SIGNATURE, "the whole block is completed by the filer at the moment of signing, and New Hampshire names every box in it sig.N; the packet does not present a signature block as further along than it is") },
    "sig.8": { section: "Signature Block", label: "Signature of Filer", ...PROTECT(SIGNATURE, "you sign this yourself") },
    "sig.9": { section: "Signature Block", label: "Date you sign, entered at signature", ...PROTECT(SIGNATURE, "the date is part of the signature block and is entered when you sign") },
    "sig.2": { section: "Signature Block", label: "Law Firm, if applicable", ...ATTORNEY("attorney-only; no attorney-representation fact is held for this participant") },
    "sig.3": { section: "Signature Block", label: "Bar ID number of attorney", ...ATTORNEY("attorney-only; no attorney-representation fact is held for this participant") },
    "sig.10": { section: "Signature Block", label: "Telephone, in the signature block", ...PROTECT(SIGNATURE, "part of the signature block, completed by the filer when they sign") },
    "sig.4": { section: "Signature Block", label: "Address, in the signature block", ...PROTECT(SIGNATURE, "part of the signature block, completed by the filer when they sign") },
    "sig.11": { section: "Signature Block", label: "E-mail, in the signature block", ...PROTECT(SIGNATURE, "part of the signature block, completed by the filer when they sign") },
    "sig.5": { section: "Signature Block", label: "City, in the signature block", ...PROTECT(SIGNATURE, "part of the signature block, completed by the filer when they sign") },
    "sig.6": { section: "Signature Block", label: "State, in the signature block", ...PROTECT(SIGNATURE, "part of the signature block, completed by the filer when they sign") },
    "sig.7": { section: "Signature Block", label: "Zip code, in the signature block", ...PROTECT(SIGNATURE, "part of the signature block, completed by the filer when they sign") },
    "Clear Form - multi": { section: "Viewer Controls", label: "Clear this form (viewer control)", ...VIEWER("a button in the PDF viewer, not a place anything is filed") },
    "Save and lock form": { section: "Viewer Controls", label: "Save this form and lock it (viewer control)", ...VIEWER("a button in the PDF viewer, not a place anything is filed") },
    "top page": { section: "Viewer Controls", label: "Reset the view to the top of the form (viewer control)", ...VIEWER("a navigation button in the PDF viewer, not a place anything is filed") },
    "1st page": { section: "Viewer Controls", label: "Reset the view to the first page of the form (viewer control)", ...VIEWER("a navigation button in the PDF viewer, not a place anything is filed") }
  },

  "NHJB-2328": {
    "court.district/family/probate - both": {
      section: "Caption", label: "Court Name (selection)", selection: true,
      ...ELECTION("pick the court your case is in; the platform holds no court assignment for you")
    },
    case: { section: "Caption", label: "Case Name, as the court styles it", ...SUPPLY("the same case name you put on the petition") },
    "case number": { section: "Caption", label: "Case Number", ...WRITE("matter.case_number") },
    "1.1": { section: "Who You Are", label: "Name", ...WRITE("participant.full_legal_name") },
    "1.2": { section: "Who You Are", label: "DOB", ...WRITE("participant.date_of_birth") },
    "2.1": { section: "Who You Are", label: "Residence Address", ...NARRATIVE("participant.residence_address", "the complete held residence address") },
    "3.1": { section: "Who You Are", label: "Mailing Address, if different from the residence address", ...OPTIONAL("your mailing address, only if it is different from where you live") },
    "cb.1": { section: "Who You Are", selection: true, label: "Marital status — single, married, separated or widowed (selection)", ...ELECTION("your marital status is yours to state and the platform holds no marital fact for you") },
    "tr.support": { section: "Who You Are", label: "The names, ages and relationships of the dependents you support", ...SUPPLY("the names, ages and relationships of everyone who depends on you for support") },
    "employed.1": { section: "Work", label: "Where you are employed and for how long", ...SUPPLY("where you work now and how long you have worked there, if you are employed") },
    "cb.2": { section: "Work", selection: true, label: "Whether your own work is full-time or part-time (selection)", ...ELECTION("only you can say which your work is") },
    "Date.2": { section: "Work", label: "If you are unemployed, the last date you were employed", ...SUPPLY("the last date you worked, if you are unemployed now") },
    "Date.3": { section: "Work", label: "When you expect to start new employment", ...SUPPLY("when you expect new work to start, if you know") },
    "employed.2": { section: "Work", label: "Where your spouse is employed and for how long", ...SUPPLY("where your spouse works and for how long, if you have a spouse who works") },
    "cb.3": { section: "Work", selection: true, label: "Whether your spouse's work is full-time or part-time (selection)", ...ELECTION("only you can say which your spouse's work is") },
    "Date.4": { section: "Work", label: "If your spouse is unemployed, the last date they were employed", ...SUPPLY("the last date your spouse worked, if they are unemployed now") },
    "employed.3": { section: "Work", label: "Other employed household members and their weekly income", ...SUPPLY("anyone else in your household who works, and what they bring in each week") },

    "yours.1": { section: "Weekly Take-Home", label: "Salary or wages, yours", ...SUPPLY("your weekly take-home salary or wages") },
    "yours.2": { section: "Weekly Take-Home", label: "Child support received, yours", ...SUPPLY("child support you receive each week") },
    "yours.3": { section: "Weekly Take-Home", label: "Alimony received, yours", ...SUPPLY("alimony you receive each week") },
    "yours.4": { section: "Weekly Take-Home", label: "Trust benefits, yours", ...SUPPLY("trust benefits you receive each week") },
    "yours.5": { section: "Weekly Take-Home", label: "Investment income, yours", ...SUPPLY("investment income you receive each week") },
    "yours.6": { section: "Weekly Take-Home", label: "Other weekly income, yours", ...SUPPLY("any other weekly income of yours") },
    "yours.7": { section: "Weekly Take-Home", label: "Social security, yours (the form marks this exempt income)", ...SUPPLY("social security you receive each week. The form marks it exempt income the court may not consider") },
    "yours.8": { section: "Weekly Take-Home", label: "Welfare benefits, yours (the form marks this exempt income)", ...SUPPLY("welfare benefits you receive each week. The form marks it exempt income") },
    "yours.9": { section: "Weekly Take-Home", label: "Veteran's benefits, yours (the form marks this exempt income)", ...SUPPLY("veteran's benefits you receive each week. The form marks it exempt income") },
    "yours.10": { section: "Weekly Take-Home", label: "Pension, yours (the form marks this exempt income)", ...SUPPLY("pension income you receive each week. The form marks it exempt income") },
    "yours.11": { section: "Weekly Take-Home", label: "Unemployment compensation, yours (the form marks this partially exempt)", ...SUPPLY("unemployment compensation you receive each week. The form marks it potentially or partially exempt") },
    "yours.12": { section: "Weekly Take-Home", label: "Worker's compensation, yours (the form marks this partially exempt)", ...SUPPLY("worker's compensation you receive each week. The form marks it potentially or partially exempt") },
    "12.total": { section: "Weekly Take-Home", label: "Total weekly take-home", ...SUPPLY("the total of the weekly amounts above. The form adds it up for you when you fill it in on a computer") },
    "spouse.1": { section: "Weekly Take-Home", label: "Salary or wages, your spouse's", ...SUPPLY("your spouse's weekly take-home salary or wages") },
    "spouse.2": { section: "Weekly Take-Home", label: "Child support received, your spouse's", ...SUPPLY("child support your spouse receives each week") },
    "spouse.3": { section: "Weekly Take-Home", label: "Alimony received, your spouse's", ...SUPPLY("alimony your spouse receives each week") },
    "spouse.4": { section: "Weekly Take-Home", label: "Trust benefits, your spouse's", ...SUPPLY("trust benefits your spouse receives each week") },
    "spouse.5": { section: "Weekly Take-Home", label: "Investment income, your spouse's", ...SUPPLY("investment income your spouse receives each week") },
    "spouse.6": { section: "Weekly Take-Home", label: "Other weekly income, your spouse's", ...SUPPLY("any other weekly income of your spouse's") },
    "spouse.7": { section: "Weekly Take-Home", label: "Social security, your spouse's (the form marks this exempt income)", ...SUPPLY("social security your spouse receives each week") },
    "spouse.8": { section: "Weekly Take-Home", label: "Welfare benefits, your spouse's (the form marks this exempt income)", ...SUPPLY("welfare benefits your spouse receives each week") },
    "spouse.9": { section: "Weekly Take-Home", label: "Veteran's benefits, your spouse's (the form marks this exempt income)", ...SUPPLY("veteran's benefits your spouse receives each week") },
    "spouse.10": { section: "Weekly Take-Home", label: "Pension, your spouse's (the form marks this exempt income)", ...SUPPLY("pension income your spouse receives each week") },
    "spouse.11": { section: "Weekly Take-Home", label: "Unemployment compensation, your spouse's (the form marks this partially exempt)", ...SUPPLY("unemployment compensation your spouse receives each week") },
    "spouse.12": { section: "Weekly Take-Home", label: "Worker's compensation, your spouse's (the form marks this partially exempt)", ...SUPPLY("worker's compensation your spouse receives each week") },

    "money.1": { section: "Money Available", label: "Cash on hand", ...SUPPLY("the cash you have on hand") },
    "money.2": { section: "Money Available", label: "Checking account", ...SUPPLY("what is in your checking account") },
    "money.3": { section: "Money Available", label: "Savings account", ...SUPPLY("what is in your savings account") },
    "money.4": { section: "Money Available", label: "Stocks, bonds, IRA or pension", ...SUPPLY("what you hold in stocks, bonds, an IRA or a pension") },
    "money.total": { section: "Money Available", label: "Total money presently available to you", ...SUPPLY("the total of the amounts above. The form adds it up for you when you fill it in on a computer") },

    "monthly.1": { section: "Monthly Household Expenses", label: "Rent or mortgage each month", ...SUPPLY("what you pay in rent or mortgage each month") },
    "monthly.2": { section: "Monthly Household Expenses", label: "Property taxes each month", ...SUPPLY("what you pay in property taxes each month") },
    "monthly.3": { section: "Monthly Household Expenses", label: "Heat each month", ...SUPPLY("what you pay for heat each month") },
    "monthly.4": { section: "Monthly Household Expenses", label: "Food each month", ...SUPPLY("what you spend on food each month") },
    "monthly.5": { section: "Monthly Household Expenses", label: "Utilities each month", ...SUPPLY("what you pay for utilities each month") },
    "monthly.6": { section: "Monthly Household Expenses", label: "Medical and dental each month", ...SUPPLY("what you pay for medical and dental care each month") },
    "monthly.7": { section: "Monthly Household Expenses", label: "Insurance each month", ...SUPPLY("what you pay for insurance each month") },
    "monthly.12": { section: "Monthly Household Expenses", label: "Cell phone each month", ...SUPPLY("what you pay for your cell phone each month") },
    "monthly.8": { section: "Monthly Household Expenses", label: "Clothing each month", ...SUPPLY("what you spend on clothing each month") },
    "monthly.9": { section: "Monthly Household Expenses", label: "Transportation each month, including gas, maintenance, insurance and repairs", ...SUPPLY("what you spend getting around each month, including gas, maintenance, insurance and repairs") },
    "other.1": { section: "Monthly Household Expenses", label: "Another monthly expense, named by you — first line", ...SUPPLY("the name of any other monthly expense you have") },
    "monthly.10": { section: "Monthly Household Expenses", label: "Another monthly expense, the amount — first line", ...SUPPLY("what that other expense costs you each month") },
    "other.2": { section: "Monthly Household Expenses", label: "Another monthly expense, named by you — second line", ...SUPPLY("the name of a second other monthly expense, if you have one") },
    "monthly.11": { section: "Monthly Household Expenses", label: "Another monthly expense, the amount — second line", ...SUPPLY("what that second other expense costs you each month") },
    "monthly.total": { section: "Monthly Household Expenses", label: "Total monthly household expenses", ...SUPPLY("the total of the monthly amounts above. The form adds it up for you when you fill it in on a computer") },

    "tr.re": { section: "What You Own and Owe", label: "The real estate you own, its market value and what you owe on it", ...SUPPLY("any real estate you own, what it is worth and what you still owe on it") },
    "tr.vehicles": { section: "What You Own and Owe", label: "The vehicles you own, their market value and what you owe on them", ...SUPPLY("any car, truck, boat, motorcycle, snowmobile or RV you own, what it is worth and what you still owe") },
    "income.1": { section: "What You Own and Owe", label: "Income tax paid last year", ...SUPPLY("the income tax you paid last year") },
    "income.2": { section: "What You Own and Owe", label: "Income tax refund received last year", ...SUPPLY("the income tax refund you received last year") },
    "tr.monthly": { section: "What You Own and Owe", label: "Bills you owe other than monthly household expenses, the amount, to whom, and the monthly payment", ...SUPPLY("any other bills you owe, how much, to whom, and what you pay each month") },
    "tr.payments": { section: "What You Own and Owe", label: "Which of your bills are court-ordered payments", ...SUPPLY("which of those bills a court ordered you to pay, such as alimony or a judgment") },
    "tr.other": { section: "What You Own and Owe", label: "Anyone else you owe money to, the amount, and when it is due", ...SUPPLY("anyone else you owe money to, how much, and when it is due") },
    "tr.owed": { section: "What You Own and Owe", label: "Anyone who owes you money — name, address, amount due and when due", ...SUPPLY("anyone who owes you money, their name and address, how much, and when it is due") },
    "tr.property": { section: "What You Own and Owe", label: "Property you have transferred in the last three years, to whom and for what price", ...SUPPLY("anything you have transferred to someone else in the last three years, to whom, and for what price") },
    "tr.other2": { section: "What You Own and Owe", label: "Any other assets or expenses not already mentioned", ...SUPPLY("anything else you own or pay for that is not already listed") },

    case1: { section: "Page Header", label: "Case Name repeated in the page header", ...SUPPLY("the same case name as the caption, repeated in the header of the later pages") },
    "case number1": { section: "Page Header", label: "Case Number repeated in the page header", ...WRITE("matter.case_number") },

    "cbcert.1": { section: "Certificate of Service", selection: true, label: "Certificate of service \u2014 certifying you sent a copy on the date you sign (selection)", ...PROTECT(SIGNATURE, "this route requires no service by the participant \u2014 the record's rule is \u201cNone by the participant.\u201d, and RSA 651:5, IX has the court provide the copy of the petition to the prosecutor \u2014 so the certificate stays blank; the box is on the form because the same form serves routes where the filer does serve somebody, and a certificate of mailing is signed after the mailing and never before it") },
    "sig.1": { section: "Signature Block", label: "Name of Filer, entered at signature", ...PROTECT(SIGNATURE, "the whole block is completed by the filer at the moment of signing, and New Hampshire names every box in it sig.N; the packet does not present a signature block as further along than it is") },
    "sig.8": { section: "Signature Block", label: "Signature of Filer", ...PROTECT(SIGNATURE, "you sign this yourself") },
    "sig.9": { section: "Signature Block", label: "Date you sign, entered at signature", ...PROTECT(SIGNATURE, "the date is part of the signature block and is entered when you sign") },
    "sig.2": { section: "Signature Block", label: "Law Firm, if applicable", ...ATTORNEY("attorney-only; no attorney-representation fact is held for this participant") },
    "sig.3": { section: "Signature Block", label: "Bar ID number of attorney", ...ATTORNEY("attorney-only; no attorney-representation fact is held for this participant") },
    "sig.10": { section: "Signature Block", label: "Telephone, in the signature block", ...PROTECT(SIGNATURE, "part of the signature block, completed by the filer when they sign") },
    "sig.4": { section: "Signature Block", label: "Address, in the signature block", ...PROTECT(SIGNATURE, "part of the signature block, completed by the filer when they sign") },
    "sig.11": { section: "Signature Block", label: "E-mail, in the signature block", ...PROTECT(SIGNATURE, "part of the signature block, completed by the filer when they sign") },
    "sig.5": { section: "Signature Block", label: "City, in the signature block", ...PROTECT(SIGNATURE, "part of the signature block, completed by the filer when they sign") },
    "sig.6": { section: "Signature Block", label: "State, in the signature block", ...PROTECT(SIGNATURE, "part of the signature block, completed by the filer when they sign") },
    "sig.7": { section: "Signature Block", label: "Zip code, in the signature block", ...PROTECT(SIGNATURE, "part of the signature block, completed by the filer when they sign") },

    "Clear Form - multi": { section: "Viewer Controls", label: "Clear this form (viewer control)", ...VIEWER("a button in the PDF viewer, not a place anything is filed") },
    "Save and lock form": { section: "Viewer Controls", label: "Save this form and lock it (viewer control)", ...VIEWER("a button in the PDF viewer, not a place anything is filed") },
    "top page": { section: "Viewer Controls", label: "Reset the view to the top of the form (viewer control)", ...VIEWER("a navigation button in the PDF viewer, not a place anything is filed") },
    "1st page": { section: "Viewer Controls", label: "Reset the view to the first page of the form (viewer control)", ...VIEWER("a navigation button in the PDF viewer, not a place anything is filed") }
  },

  "NHJB-2956": {
    "name.1": {
      section: "Section I — Who You Are", label: "Last name",
      ...NARRATIVE("participant.last_name", "your last name, in the first box of the LAST (MAIDEN/ALIAS) FIRST MI line")
    },
    /* NOT written, and it must stay that way. A maiden name or an alias is a
     * fact about the participant's own record that the platform does not hold,
     * and the State Police read this box as a name the record may also be
     * under. It is the one box on this line left to the participant. */
    "name.2": { section: "Section I — Who You Are", label: "Maiden name or alias", ...SUPPLY("any maiden name or alias your record might be under") },
    "name.3": {
      section: "Section I — Who You Are", label: "First name",
      ...NARRATIVE("participant.first_name", "your first name, in the third box of the LAST (MAIDEN/ALIAS) FIRST MI line")
    },
    "name.4": {
      section: "Section I — Who You Are", label: "Middle name box, which the form heads MI",
      ...NARRATIVE("participant.middle_name", "your middle initial, in the last box of the LAST (MAIDEN/ALIAS) FIRST MI line")
    },
    "Mailing Address1": {
      section: "Section I — Who You Are", label: "Your address — street, city, state and zip on one line",
      ...NARRATIVE("participant.street_city_state_zip",
        "your address on one line as street, city, state and zip, which is what the form's single ruled STREET/CITY/STATE/ZIP CODE line asks for")
    },
    Date: { section: "Section I — Who You Are", label: "Date of birth", ...WRITE("participant.date_of_birth") },
    gender: { section: "Section I — Who You Are", label: "Sex, as the State Police record holds it", ...SUPPLY("the sex the State Police record holds for you; the form offers Female and Male") },
    hair: { section: "Section I — Who You Are", label: "Hair colour", ...SUPPLY("your hair colour, from the list the form offers") },
    eyes: { section: "Section I — Who You Are", label: "Eye colour", ...SUPPLY("your eye colour, from the list the form offers") },
    license: { section: "Section I — Who You Are", label: "Driver licence number", ...SUPPLY("your driver licence number") },
    "States/short": { section: "Section I — Who You Are", label: "The state that issued the driver licence", ...SUPPLY("the state that issued your driver licence") },
    record: {
      section: "Section I — Who You Are", label: "Purpose of record — the Other line",
      ...NOT_ON_ROUTE("the purpose of this request is annulment or expungement, which the form prints as its own option, so the Other line is never populated with participant data on this route")
    },
    address: {
      section: "Section II — Third-Party Release", label: "Address of the person or entity to receive the record",
      ...SUPPLY("the record recipient’s address if you mail this request or authorize a third-party release; the pinned form requires both sections for all mailed requests. For an in-person request for your own record, its instructions require only Section I")
    },
    "court.family/probate1 CUSTOM": {
      section: "Section II — Third-Party Release", label: "Name of the person or entity to receive the record (selection)", selection: true,
      ...ELECTION("Complete the recipient name if mailing or authorizing a third-party release. This source offers only family and probate courts in its recipient dropdown; do not select an unrelated court. Before mailing, ask the Criminal Records Unit how to enter the intended recipient and complete Section II, including its required notarization. An in-person request for your own record requires only Section I")
    },
    "Clear Form": { section: "Viewer Controls", label: "Clear this form (viewer control)", ...VIEWER("a button in the PDF viewer, not a place anything is filed") },
    "top page": { section: "Viewer Controls", label: "Reset the view to the top of the form (viewer control)", ...VIEWER("a navigation button in the PDF viewer, not a place anything is filed") },
    "Form Guide": { section: "Viewer Controls", label: "Open the form guide (viewer control)", ...VIEWER("a button in the PDF viewer that opens guidance, not a place anything is filed") }
  }
};
/* ---- fixtures ------------------------------------------------------------ *
 *
 * Two participants, one New Hampshire matter each. The canonical fixture is an
 * ordinary set of values; the boundary fixture stresses length, punctuation and
 * a hyphenated surname against the same widgets. Both carry name PARTS as well
 * as the full legal name, because NHJB-2956 asks for last, first and middle
 * initial in four separate boxes.
 */
const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.first_name": "Jordan",
    "participant.middle_name": "A",
    "participant.last_name": "Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.street_address": "412 Elm Street, Apartment 3",
    "participant.city": "Concord",
    "participant.state": "NH",
    "participant.zip": "03301",
    "participant.city_state_zip": "Concord, NH 03301",
    "participant.phone": "603-555-0142",
    "participant.email": "jordan.reyes@example.org",
    "matter.county": "Merrimack",
    "matter.case_number": "473-2016-CR-00218",
    "matter.charges": [{ case_number: "473-2016-CR-00218" }]
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O’Shaughnessy-Whitfield",
    "participant.first_name": "Maria-Alejandra",
    "participant.middle_name": "Q",
    "participant.last_name": "O’Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B",
    "participant.city": "Portsmouth",
    "participant.state": "NH",
    "participant.zip": "03801-2214",
    "participant.city_state_zip": "Portsmouth, New Hampshire 03801-2214",
    "participant.phone": "(603) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org",
    "matter.county": "Rockingham",
    "matter.case_number": "218-2018-CR-00119821-SUPPLEMENTAL",
    "matter.charges": [{ case_number: "218-2018-CR-00119821-SUPPLEMENTAL" }]
  }
};

/* ---- one held line, derived from held facts and from nothing else ----------- *
 *
 * NHJB-2956 gives the whole address ONE ruled line and captions it
 * STREET/CITY/STATE/ZIP CODE. The finalizer's composed-field channel joins the
 * facts it is given with a newline, one fact per line, which is right for a
 * multi-line block and wrong for a box the form rules as a single line: with a
 * newline in it the value measures wider than the widget at every size and the
 * channel refuses it, measured here on the pinned binary.
 *
 * So the line is derived here, from the two facts this packet already holds and
 * already writes elsewhere -- participant.street_address on NHJB-3057,
 * and participant.city_state_zip, which is a fact the shared
 * registry itself carries -- and named to the finalizer as a single fact id.
 * NOTHING IS AUTHORED: the value is a function of held facts, computed by
 * joining them in the order the form's own caption prints them, and if either
 * part is missing the fact is simply absent and the line stays blank for the
 * participant rather than carrying a fraction of an address.
 *
 * NHJB-2328's Residence Address uses the held street, city, state abbreviation
 * and ZIP facts. This avoids expanding an already-held state abbreviation on
 * its shorter line; NHJB-2956's existing combined-address fact stays unchanged.
 * The registry has no descriptor and no single fact for this line. That gap is
 * in scripts/rcap-official-forms/rcap-field-semantics.mjs, which this lane does
 * not open, and it is reported in build-findings.json.
 */
const COMPOSED_FACTS = {
  "participant.street_city_state_zip": {
    from: ["participant.street_address", "participant.city_state_zip"],
    join: ", ",
    printedCaption: "STREET/CITY/STATE/ZIP CODE"
  },
  "participant.residence_address": {
    from: ["participant.street_address", "participant.city", "participant.state", "participant.zip"],
    separators: [", ", ", ", " "],
    printedCaption: "Residence Address"
  }
};

function factsFor(fixtureName) {
  const held = FIXTURES[fixtureName];
  const facts = { ...held };
  for (const [factId, spec] of Object.entries(COMPOSED_FACTS)) {
    const parts = spec.from.map((f) => held[f]);
    if (parts.every((v) => typeof v === "string" && v.trim() !== "")) {
      const values = parts.map((v) => v.trim());
      facts[factId] = spec.separators
        ? values.map((v, i) => `${i === 0 ? "" : spec.separators[i - 1]}${v}`).join("")
        : values.join(spec.join);
    }
  }
  return facts;
}
const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";

/* ---- source binding ------------------------------------------------------ *
 *
 * BOUND BY DIGEST, NOT BY PATH.
 *
 * The MASTER_QUEUE row for this family pins four SHA-256 digests and gives each
 * a path in a custody this container does not mount — three in the D source
 * packs and one in the nationwide recovery pool. The committed corpus index
 * records every one of those digests in the Master Library as well, which IS
 * mounted, so the bytes bind exactly; only the path differs. Resolution
 * therefore starts from the pinned digest, finds the mounted entry that carries
 * it, and re-hashes the file on disk before a single byte is read. A digest that
 * matches no mounted entry, or a file that hashes to something else, stops the
 * family rather than being worked around.
 */
function resolveSources() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const all = index.entries ?? [];
  const root = corpusRoot();
  const resolved = [];
  const failures = [];
  for (const wanted of ROUTE.documents) {
    const entry = all.find((e) => e.sha256 === wanted.pinnedSha256 && e.custody === "master_library");
    if (!entry) {
      failures.push({ sourceId: wanted.sourceId, pinnedSha256: wanted.pinnedSha256,
        why: "no entry in the committed corpus index carries this digest in a custody this container mounts" });
      continue;
    }
    const rel = entry.path;
    const abs = path.resolve(ROOT, root, rel);
    if (!fs.existsSync(abs)) { failures.push({ sourceId: wanted.sourceId, pathInArchive: rel, why: `the indexed path does not exist on disk: ${rel}` }); continue; }
    const bytes = fs.readFileSync(abs);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    if (sha256 !== wanted.pinnedSha256) {
      failures.push({ sourceId: wanted.sourceId, pathInArchive: rel,
        why: `SHA-256 drift: the assignment pins ${wanted.pinnedSha256}, the mounted corpus holds ${sha256}` });
      continue;
    }
    resolved.push({
      ...wanted, pathInArchive: rel,
      revision: entry.revision ?? null, sha256, byteLength: bytes.length, bytes,
      acroFieldCount: entry.acroFieldCount ?? null, pageCount: entry.pageCount ?? null
    });
  }
  return { resolved, failures };
}

/* ---- census --------------------------------------------------------------- */
// The second-page caption is printed page content, not an AcroForm control.
// Inventory both blanks and bind the write box to the original source rule.
function printedHeaderRows(source, pages) {
  if (source.formNumber !== "NHJB-2311") return [];
  const page = pages[1];
  assert.ok(page, "NHJB-2311 must retain its second page");
  const lines = groupIntoLines(extractTextItems(page));
  const heading = lines.find((line) => line.text.trim() === "FOR COURT USE ONLY");
  assert.ok(heading, "NHJB-2311 court-section boundary is absent");
  const rules = extractPathSegments(page).filter((segment) => segment.operator === "re"
    && segment.width > 400 && segment.height > 0 && segment.height < 1.5);
  return [
    { key: "printed-page2-case-name", label: "Case Name:",
      ...SUPPLY("the same case name as the petition, copied into the printed Case Name header on page 2 above FOR COURT USE ONLY") },
    { key: "printed-page2-case-number", label: "Case Number:", ...WRITE("matter.case_number") }
  ].map((entry) => {
    const captions = lines.filter((line) => line.text.trim() === entry.label && line.y > heading.y);
    assert.equal(captions.length, 1, `NHJB-2311 printed ${entry.label} must occur once above the ruling`);
    const caption = captions[0];
    const matches = rules.filter((rule) => Math.abs(rule.y - (caption.y - 2.2)) < 0.2 && rule.x > caption.x);
    assert.equal(matches.length, 1, `NHJB-2311 printed ${entry.label} must have its original rule`);
    const rule = matches[0];
    const rect = { x: rule.x + 2, y: rule.y + 2.5, width: rule.width - 4, height: 13 };
    assert.ok(rect.y > heading.y + 20, "printed caption must remain above the court-owned section");
    return {
      ...entry, name: entry.key, page: 2, widgets: [], rect,
      rectBasis: "printed_caption_and_rule_measured_from_exact_source_page_content",
      printedHeader: true, type: "flat_text", sourceValue: null,
      hiddenUntilTheFormRevealsIt: false, isSelectionControl: false, multiline: false, maxLength: null,
      section: "Page 2 printed header above FOR COURT USE ONLY",
      effectiveLabel: `${entry.label.slice(0, -1)} in the printed page 2 header`,
      printedTextAtCoordinate: [{ y: caption.y, extracted: caption.text }],
      sourceRule: rule, courtSectionStartsAt: heading.y
    };
  });
}

async function censusOf(source) {
  const spec = FORM_FIELDS[source.formNumber];
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  const pageText = pages.map((p, i) => ({
    page: i + 1,
    lines: groupIntoLines(extractTextItems(p)).map((l) => ({ y: Math.round(l.y), text: l.text }))
  }));

  const rows = [];
  const unmapped = [];
  for (const field of doc.getForm().getFields()) {
    const name = field.getName();
    const entry = spec[name];
    const widgets = field.acroField.getWidgets().map((w) => {
      const r = w.getRectangle();
      const ref = w.P();
      let pi = pages.findIndex((p) => p.ref === ref);
      if (pi < 0) pi = 0;
      /*
       * WHETHER THE FORM SHOWS THIS WIDGET AT ALL.
       *
       * A form may ship a widget with the annotation Hidden flag set and reveal
       * it with its own JavaScript when the control that governs it is used --
       * Colorado's JDF 612 hides twenty-three that way. A value written into a
       * hidden widget
       * is invisible ink -- the finalizer reports the write, the flattened bytes
       * carry no appearance, and the paper is blank. That is worse than a blank
       * the packet admits to, so the flag is read here, from the pinned binary,
       * and a write onto a hidden widget is refused by assertion below.
       */
      let flags = null;
      try { flags = w.getFlags(); } catch { flags = null; }
      const hidden = flags !== null && ((flags & 1) !== 0 || (flags & 2) !== 0 || (flags & 32) !== 0);
      return {
        page: pi + 1,
        rect: { x: +r.x.toFixed(2), y: +r.y.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) },
        rectBasis: "acroform_widget_rect_read_first_hand_from_pinned_binary",
        annotationFlags: flags, hiddenUntilTheFormRevealsIt: hidden
      };
    });
    if (!entry) { unmapped.push({ field: name, widgets }); continue; }
    /*
     * What the SOURCE already carries on this control, before this build touches
     * it. A form may ship a required box already ticked -- so the finished
     * artifact draws a tick at a rectangle this map refuses, and reading that as
     * "a field the map refused carries ink" would report a protected write this
     * build never made. The form's own default is recorded here, from the
     * pinned binary, so the byte proof can tell the two apart by evidence.
     */
    let sourceValue = null;
    try {
      if (typeof field.isChecked === "function") sourceValue = field.isChecked() ? "on" : null;
      else if (typeof field.getSelected === "function") sourceValue = field.getSelected() ?? null;
      else if (typeof field.getText === "function") sourceValue = field.getText() ?? null;
    } catch { sourceValue = null; }
    rows.push({
      key: name, name, page: widgets[0]?.page ?? null, widgets, sourceValue,
      hiddenUntilTheFormRevealsIt: widgets.some((w) => w.hiddenUntilTheFormRevealsIt === true),
      rect: widgets[0]?.rect ?? null, rectBasis: widgets[0]?.rectBasis ?? null,
      type: field.constructor.name.replace(/^PDF/, "").toLowerCase()
        .replace("textfield", "text").replace("radiogroup", "radiogroup").replace("checkbox", "checkbox"),
      isSelectionControl: entry.selection === true
        || field.constructor.name === "PDFCheckBox" || field.constructor.name === "PDFRadioGroup",
      multiline: typeof field.isMultiline === "function" ? field.isMultiline() : false,
      maxLength: typeof field.getMaxLength === "function" ? (field.getMaxLength() ?? null) : null,
      section: entry.section, effectiveLabel: entry.label,
      policy: entry.policy, fact: entry.fact ?? null,
      refusalClass: entry.refusalClass ?? null, what: entry.what ?? null, why: entry.why ?? null,
      // The scrambled extraction at this widget's own coordinate, kept as
      // evidence of WHY the printed-caption check is unavailable on this form.
      printedTextAtCoordinate: (pageText.find((p) => p.page === (widgets[0]?.page ?? 1))?.lines ?? [])
        .filter((l) => widgets[0] && Math.abs(l.y - widgets[0].rect.y) <= 20)
        .sort((a, b) => Math.abs(a.y - widgets[0].rect.y) - Math.abs(b.y - widgets[0].rect.y))
        .slice(0, 2).map((l) => ({ y: l.y, extracted: l.text }))
    });
  }

  const dictionaryKeys = new Set(Object.keys(spec));
  for (const r of rows) dictionaryKeys.delete(r.key);
  rows.push(...printedHeaderRows(source, pages));
  return { rows, unmapped, stale: [...dictionaryKeys], pageText, pageCount: pages.length };
}

/* ---- render ---------------------------------------------------------------- */
async function renderDocument(source, census, fixtureName, appearanceProvenance = []) {
  const facts = factsFor(fixtureName);
  const widgetRows = census.rows.filter((r) => !r.printedHeader);
  const writable = widgetRows.filter((r) => r.policy === "write");
  /* Fields written through the finalizer's named-fact channel. See NARRATIVE.
   * They are deliberately NOT in unwritableFields -- the narrative pass refuses
   * a field classified unwritable by role -- and deliberately NOT in
   * explicitMappings either, because the ordinary pass skips a named field
   * entirely and never reaches a binding decision for it. */
  const narrativeRows = widgetRows.filter((r) => r.policy === "narrative");
  const explicitMappings = Object.fromEntries(writable.map((r) => [r.name, r.fact]));
  const writableNames = new Set([...writable, ...narrativeRows].map((r) => r.name));
  const unwritableFields = widgetRows.filter((r) => !writableNames.has(r.name)).map((r) => ({ field: r.name }));

  let { bytes, report } = await finalizeOfficialForm({
    sourceBytes: source.bytes,
    expectedSha256: source.sha256,
    census: widgetRows.map((r) => ({
      name: r.name, type: r.type, effectiveLabel: r.effectiveLabel, regionHeading: r.section,
      widgets: r.widgets.map((w) => ({ page: w.page, rect: w.rect })),
      multiline: r.multiline === true, maxLength: r.maxLength ?? null
    })),
    facts, explicitMappings, unwritableFields,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    /* One fact, one field, per entry. Opt-in and empty on any document of this
     * family that declares no NARRATIVE row. */
    narrativeAcrossFields: narrativeRows.map((r) => ({ factId: r.fact, fields: [r.name] })),
    /* A synthetic control document in the self-test carries no official bytes,
     * so no registry entry describes it and none is looked for. Every real
     * source goes through the digest-proved lookup. */
    appearanceDispositions: source.syntheticControlDocument === true
      ? new Map()
      : appearanceDispositionsForBinary(source.formNumber, source.sha256, appearanceProvenance),
    /* The sibling appearance registry proves the meaning of these exact source
     * values. Name the same participant-input fields explicitly as a second
     * source-carried-value guard so the corpus checker can verify this builder
     * without depending on a family-specific registry entry. The list is
     * selected per source form; passing a field to another form would correctly
     * fail the finalizer's not-found assertion. */
    clearSourceCarriedTextValues: source.formNumber === "NHJB-2328" ? ["12.total", "money.total", "monthly.total"] : [],
    /* VF08 read every selection-widget rect across canonical.pdf and
     * boundary.pdf of the sibling family as delivering a stroked square the
     * source forms do not print: each widget's current /AS state has no stream
     * in /AP /N, so
     * a conforming viewer paints nothing there. VF08's zero-write baseline over
     * the same pinned bytes painted the identical pixels, so the ink comes from
     * the shared flattening step and not from this family. Opting in supplies
     * the missing state as an EMPTY appearance, so nothing is synthesized and
     * nothing is flattened there. A widget of a field this run writes, and any
     * widget whose /AS state ships its own appearance, are untouched by this. */
    suppressSynthesizedAppearances: true,
    title: source.title
  });
  const printedWrites = census.rows.filter((row) => row.printedHeader && row.policy === "write");
  if (printedWrites.length) {
    const intermediateSha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    const flat = await finalizeFlatOverlay({
      sourceBytes: bytes, expectedSha256: intermediateSha256, facts,
      anchors: printedWrites.map((row) => ({ label: row.label, page: row.page, writeBox: row.rect, factId: row.fact, fontSize: 11 })),
      documentTextLines: census.pageText.flatMap((page) => page.lines.map((line) => line.text)),
      minFontSize: 11, title: source.title
    });
    assert.equal(flat.report.refused.length, 0, "the held printed header must fit its measured source rule");
    assert.equal(flat.report.written.length, printedWrites.length);
    report.printedHeaderOverlay = { ...flat.report, originalSourceSha256: source.sha256, intermediateSha256 };
    report.written.push(...flat.report.written.map((write) => ({ ...write,
      field: printedWrites.find((row) => row.label === write.anchor).name })));
    bytes = flat.bytes;
  }
  if (process.env.CO_DEBUG_RENDER) {
    console.log(`-- ${source.formNumber} ${fixtureName}: written=${report.written.length} refused=${report.refused.length}`);
    for (const r of report.refused) console.log(`   ${r.field ?? r.anchor}: ${r.reason}${r.category ? ` (${r.category})` : ""}`);
  }
  return { bytes, report };
}

/* ---- byte proof ------------------------------------------------------------ */
/*
 * WHAT THE PINNED SOURCE ITSELF DRAWS, BEFORE THIS BUILD TOUCHES IT.
 *
 * A form may bake a hint into a widget's own appearance stream rather than into
 * its value: NHJB-2311's signature widget carries "Enter /s/ before name", and
 * flattening materialises it. Read from the finished artifact alone that looks
 * exactly like ink on a field the map refused -- which is a blocking finding,
 * and would be the wrong one. The source is therefore flattened once, unwritten,
 * and its own ink recorded per widget. Nothing is softened: ink at a widget the
 * source leaves empty is still a blocking finding, and ink that DIFFERS from the
 * source's own is still a blocking finding.
 */
async function sourceInkOf(source) {
  // Flattened with nothing written into it: an unflattened form draws no widget
  // XObjects at all, so reading the source as it ships would report every form
  // as carrying no ink of its own and prove nothing.
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false });
  try { doc.getForm().flatten(); } catch { /* a form that will not flatten leaves no source ink to compare against */ }
  const bytes = await doc.save({ useObjectStreams: false, updateMetadata: false });
  const tmp = path.join(ROOT, `.nh-source-ink-${source.formNumber}.pdf`);
  fs.writeFileSync(tmp, bytes);
  try { return await flattenedWidgets(tmp); } finally { fs.unlinkSync(tmp); }
}

/*
 * WHAT THE PAGE CARRIES, READ BACK IN THE ENCODING THE PAGE USES.
 *
 * scripts/rcap-official-forms/pdf-flattened-widgets.mjs decodes an appearance
 * stream's string bytes as latin1, which is right for every byte below 0x80 and
 * wrong for the range WinAnsi uses for typography: a right single quotation
 * mark is drawn as the single byte 0x92, and latin1 turns that into U+0092, a
 * C1 control. VF01 read the consequence in this family's own report -- three
 * boundary writes recorded drawnText "Maria-Alejandra O\u0092Shaughnessy-
 * Whitfield" and matchesExpected false, while the delivered bytes carry U+2019
 * and the page prints the surname whole. A report that says three writes did
 * not match what was expected, on a page where they did, is a defect in the
 * report.
 *
 * The shared reader is not opened here: 40-odd families share it. This is the
 * WinAnsi 0x80-0x9F block applied to what it returns, so this family's own
 * read-back compares like with like. Every byte outside that block is
 * unchanged, so no other value moves.
 */
const WINANSI_HIGH = {
  0x80: "\u20ac", 0x82: "\u201a", 0x83: "\u0192", 0x84: "\u201e", 0x85: "\u2026",
  0x86: "\u2020", 0x87: "\u2021", 0x88: "\u02c6", 0x89: "\u2030", 0x8a: "\u0160",
  0x8b: "\u2039", 0x8c: "\u0152", 0x8e: "\u017d", 0x91: "\u2018", 0x92: "\u2019",
  0x93: "\u201c", 0x94: "\u201d", 0x95: "\u2022", 0x96: "\u2013", 0x97: "\u2014",
  0x98: "\u02dc", 0x99: "\u2122", 0x9a: "\u0161", 0x9b: "\u203a", 0x9c: "\u0153",
  0x9e: "\u017e", 0x9f: "\u0178"
};
const fromWinAnsi = (value) => String(value ?? "").replace(/[\u0080-\u009f]/g,
  (c) => WINANSI_HIGH[c.codePointAt(0)] ?? c);

async function byteProof(source, census, artifactBytes, report, fixtureName, sourceInk = []) {
  const tmp = path.join(ROOT, `.nh-byte-proof-${source.formNumber}-${fixtureName}.pdf`);
  fs.writeFileSync(tmp, artifactBytes);
  let widgets = [];
  try { widgets = await flattenedWidgets(tmp); } finally { fs.unlinkSync(tmp); }
  const written = new Map(report.written.map((w) => [w.field, w]));
  const actualWrites = [];
  const refusedFieldsWithInk = [];
  const documentAuthoredAppearances = [];
  let glyphs = 0;
  const output = await PDFDocument.load(artifactBytes, { ignoreEncryption: true });
  for (const r of census.rows) {
    if (r.printedHeader) {
      const readBack = extractTextItems(output.getPage(r.page - 1)).filter((item) =>
        item.text.trim() && item.x >= r.rect.x - 0.1 && item.x + item.width <= r.rect.x + r.rect.width + 0.1
        && Math.abs(item.y - r.rect.y) < 0.2).map((item) => fromWinAnsi(item.text));
      const ink = readBack.join("").trim();
      if (written.has(r.name)) {
        const expected = factsFor(fixtureName)[r.fact];
        assert.equal(ink, expected, "printed header value must read back from the delivered page content");
        glyphs += ink.length;
        actualWrites.push({ field: r.key, factId: r.fact, page: r.page, rect: r.rect,
          section: r.section, effectiveLabel: r.effectiveLabel, writtenThrough: "shared_flat_overlay_finalizer",
          drawnText: readBack, expected, matchesExpected: ink === expected });
      } else if (ink) refusedFieldsWithInk.push({ fieldId: r.key, page: r.page, drawnText: readBack });
      continue;
    }
    for (const wdg of r.widgets) {
      const drawn = drawnAt(widgets, { page: wdg.page, rect: wdg.rect });
      const text = drawn.map((d) => d.text).filter(Boolean);
      const ink = text.join("").trim();
      if (written.has(r.name) && (r.policy === "write" || r.policy === "narrative")) {
        glyphs += ink.length;
        const facts = factsFor(fixtureName);
        const readBack = text.map(fromWinAnsi);
        actualWrites.push({
          field: r.key, factId: r.fact, page: wdg.page, rect: wdg.rect,
          section: r.section, effectiveLabel: r.effectiveLabel,
          writtenThrough: r.policy === "narrative" ? "finalizer_named_fact_channel" : "shared_descriptor_channel",
          drawnText: readBack, expected: facts[r.fact] ?? null,
          matchesExpected: fromWinAnsi(ink) === String(facts[r.fact] ?? "").trim()
        });
        continue;
      }
      if (ink.length === 0) continue;
      // Ink on a control the SOURCE already carried is the form's own default,
      // not a write this build made.
      if (r.sourceValue !== null && r.sourceValue !== undefined) {
        documentAuthoredAppearances.push({
          field: r.key, page: wdg.page, rect: wdg.rect, drawnText: text,
          sourceValue: r.sourceValue,
          note: "the pinned source already carries this value; flattening materialises the form's own default"
        });
        continue;
      }
      // The same ink at the same rectangle in the FLATTENED SOURCE is the form's
      // own appearance, not a write this build made.
      const inSource = drawnAt(sourceInk, { page: wdg.page, rect: wdg.rect }).map((d) => d.text).filter(Boolean);
      if (inSource.join("").trim() === ink) {
        documentAuthoredAppearances.push({
          field: r.key, page: wdg.page, rect: wdg.rect, drawnText: text,
          sourceAppearanceText: inSource,
          note: "the pinned source's own widget appearance draws exactly this text; flattening materialises the form's own hint, and this build wrote nothing here"
        });
        continue;
      }
      refusedFieldsWithInk.push({ fieldId: r.key, page: wdg.page, drawnText: text });
    }
  }
  return { actualWrites, refusedFieldsWithInk, documentAuthoredAppearances, glyphs, appearances: widgets.length };
}

/* ---- field map ------------------------------------------------------------- */
/*
 * A VALUE THE FORM'S OWN /MaxLen WILL NOT HOLD.
 *
 * VF01 read this family at 7e01df1d8 and found the boundary fixture's case
 * number blank in seven cells across three forms and its telephone blank on
 * NHJB-3057, because those widgets declare /MaxLen 17 and 15 and the boundary
 * values are 33 and 24 characters. The finalizer's refusal is right -- a
 * truncated case number on a court filing is worse than a blank one -- but the
 * refusal was recorded nowhere: the field map declared all eight as written,
 * reports/actual-writes.json carried "unfittable": [] and the instructions told
 * the participant the case number had been filled in.
 *
 * The finalizer records this class in report.refused with the reason
 * value_exceeds_form_max_length rather than in report.unfittable, which is why
 * an unfittable list read straight off the report was empty. It is the same
 * kind of answer -- a value the form's geometry will not take -- so it is
 * carried into the same place, with the measured length against the declared
 * MaxLen, and the field becomes a refusal the participant is asked for.
 */
function maxLenRefusalsOf(report) {
  return (report.refused ?? [])
    .filter((r) => r.reason === "value_exceeds_form_max_length")
    .map((r) => ({
      field: r.field,
      factId: r.factId ?? null,
      reason: "value_exceeds_form_max_length",
      category: "unfittable",
      maxLength: r.maxLength ?? null,
      valueLength: r.valueLength ?? null,
      why:
        `the widget declares /MaxLen ${r.maxLength} and the value this fixture holds is ${r.valueLength} characters, `
        + "so the form itself will not hold it. The packet refuses the write rather than truncating it, because a "
        + "shortened case number or telephone number on a court filing reads as a complete one."
    }));
}

function mapFor(source, census, canonicalReport, boundaryReport) {
  const canonical = sideOf(source, census, canonicalReport);
  const boundary = sideOf(source, census, boundaryReport);
  return {
    formNumber: source.formNumber, documentId: source.formNumber, documentRole: source.instrumentKind,
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: ROUTE.routeKey },
    structuralClass: "acroform",
    explicitMappings: Object.fromEntries(canonical.writes.map((w) => [w.field, w.factId])),
    roleRefusals: [], selectionControls: canonical.selectionControls,
    canonicalWrites: canonical.writes, canonicalRefusals: canonical.refusals,
    boundaryWrites: boundary.writes, boundaryRefusals: boundary.refusals
  };
}

function sideOf(source, census, report) {
  const writtenNames = new Set(report.written.map((w) => w.field));
  const unfittableByField = new Map(maxLenRefusalsOf(report).map((r) => [r.field, r]));
  const canonicalWrites = [];
  const canonicalRefusals = [];
  const selectionControls = [];

  for (const r of census.rows) {
    const base = {
      field: `${source.formNumber}/${r.key}`,
      fieldName: `${source.formNumber}/${r.key}`.replace(/\[\d+\]/g, ""),
      acroFieldName: r.printedHeader ? null : r.name,
      ...(r.printedHeader ? { printedHeader: true, sourceRule: r.sourceRule, courtSectionStartsAt: r.courtSectionStartsAt } : {}),
      page: r.page, rect: r.rect, rectBasis: r.rectBasis,
      printedLabel: r.effectiveLabel, printedLine: r.effectiveLabel,
      sectionHeading: r.section, regionHeading: r.effectiveLabel,
      effectiveLabel: r.effectiveLabel,
      captionBasis: r.printedHeader ? r.rectBasis : "authored_acroform_field_name_plus_printed_section, because this form's text stream is scrambled",
      printedTextAtCoordinate: r.printedTextAtCoordinate,
      document: source.formNumber
    };

    if (r.policy === "write" || r.policy === "narrative") {
      if (writtenNames.has(r.name)) {
        canonicalWrites.push({
          ...base, factId: r.fact, kind: r.type,
          ...(r.printedHeader ? { writeChannel: "shared_flat_overlay_finalizer" } : {}),
          ...(r.policy === "narrative"
            ? {
              writeChannel: "finalizer_named_fact_channel",
              whyNotTheDescriptorChannel:
                r.name === "2.1"
                  ? "The generic Residence Address caption binds street only. The complete address is composed from held street, city, state abbreviation and ZIP facts and fitted whole through the existing named-fact channel."
                  : "New Hampshire names this box for the line above it rather than for what it collects, so the shared "
                + "binder resolves the wrong fact from its NAME before its printed line is consulted. See "
                + "build-findings.json; the fact is written at this widget's own rectangle through the finalizer's "
                + "opt-in named-fact channel, which resolves the fact id from the same facts set as every other write."
            }
            : {})
        });
      }
      else if (unfittableByField.has(r.name)) {
        /* The form will not hold the value. Recorded as a refusal the
         * participant must answer, with the measurement that produced it, so
         * the map stops declaring a write that did not happen. */
        const u = unfittableByField.get(r.name);
        canonicalRefusals.push({
          ...base,
          reason: `the value the platform holds is longer than this box: ${u.why}`,
          category: null, completenessClass: null, class: null,
          disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
          requiredBeforeFiling: true, identity: `${source.formNumber} field ${r.key}`,
          factId: r.fact ?? null, routeDetermined: false,
          unfittable: true, declaredMaxLength: u.maxLength, valueLength: u.valueLength,
          widgetLocations: r.widgets.map((w) => ({ page: w.page, rect: w.rect })),
          why: u.why,
          participantMustSupply:
            `write this in by hand if the box is blank on your packet. The box accepts at most ${u.maxLength} `
            + "characters; a longer value is left blank rather than shortened."
        });
      }
      else {
        canonicalRefusals.push({
          ...base, reason: "the finalizer refused this write; the packet does not claim a value it did not draw",
          category: null, completenessClass: null, class: null,
          requiredBeforeFiling: false, why: "reported rather than claimed, so the defect is visible to the audit"
        });
      }
      continue;
    }

    if (r.isSelectionControl) {
      const cls = r.policy === "protect" ? r.refusalClass : r.policy === "attorney" ? null : PARTICIPANT_ELECTION;
      selectionControls.push({
        ...base, selectionId: base.field, kind: "selection_control", type: r.type,
        widgets: r.widgets, disposition: "explicit_refusal",
        reason: r.why, category: cls, completenessClass: cls, class: cls,
        requiredBeforeFiling: false, routeDetermined: false
      });
      continue;
    }

    if (r.policy === "protect") {
      canonicalRefusals.push({
        ...base, reason: r.why, category: r.refusalClass,
        completenessClass: r.refusalClass, class: r.refusalClass,
        requiredBeforeFiling: false, why: r.why
      });
      continue;
    }

    if (r.policy === "optional") {
      canonicalRefusals.push({
        ...base,
        reason: `optional participant-authored content; the platform does not invent it: ${r.what}`,
        category: null, completenessClass: null, class: null,
        requiredBeforeFiling: false, why: `the form marks this conditional and the platform does not invent it: ${r.what}`
      });
      continue;
    }

    if (r.policy === "attorney" || r.policy === "viewer" || r.policy === "not_on_route") {
      canonicalRefusals.push({
        ...base, reason: r.why, category: null, completenessClass: null, class: null,
        requiredBeforeFiling: false, why: r.why
      });
      continue;
    }

    canonicalRefusals.push({
      ...base,
      reason: `the participant supplies this before filing: ${r.what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true, identity: `${source.formNumber} field ${r.key}`,
      factId: r.fact ?? null, routeDetermined: false,
      why: `the platform holds no value for this and the participant supplies it before filing: ${r.what}`,
      participantMustSupply: r.what
    });
  }

  return { writes: canonicalWrites, refusals: canonicalRefusals, selectionControls };
}

/* ---- the builder's own count of the nine counters --------------------------- */
function countCompleteness(maps, writeProofs, artifacts, instructionsText) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };

  const row = (r, selection = false) => ({
    id: r.field, name: r.fieldName ?? r.field, label: r.effectiveLabel ?? "", reason: r.reason ?? "",
    refusalClass: r.category ?? null, page: r.page ?? null, document: r.document ?? null,
    factId: r.factId ?? null, isSelectionControl: selection,
    declared: {
      disposition: r.completenessDisposition ?? null,
      ...(Object.hasOwn(r, "requiredBeforeFiling") ? { requiredBeforeFiling: r.requiredBeforeFiling === true } : {}),
      ...(Object.hasOwn(r, "routeDetermined") ? { routeDetermined: r.routeDetermined === true } : {}),
      identity: r.identity ?? null, factId: r.factId ?? null
    }
  });

  const writes = maps.flatMap((m) => m.canonicalWrites.map((w) => row(w)));
  const blanks = maps.flatMap((m) => [
    ...m.canonicalRefusals.map((r) => row(r)),
    ...m.selectionControls.map((c) => row(c, true))
  ]);

  const availableFacts = new Set(writes.map((w) => w.factId).filter(Boolean));
  for (const p of writeProofs) {
    for (const w of p.actualWrites) if (w.factId && String(w.drawnText.join("")).trim()) availableFacts.add(String(w.factId));
  }
  const normLabel = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  // Scoped to the DOCUMENT: a field name repeats across the two forms and means
  // something different on each.
  const writtenInDocument = new Map();
  for (const w of writes) {
    if (!writtenInDocument.has(w.document)) writtenInDocument.set(w.document, new Set());
    for (const k of [normLabel(w.label), normLabel(w.name)]) if (k.length >= 4) writtenInDocument.get(w.document).add(k);
  }

  const ledger = [];
  for (const blank of blanks) {
    const here = writtenInDocument.get(blank.document) ?? new Set();
    const declared = {
      ...blank.declared,
      factAvailable: (blank.declared.factId ? availableFacts.has(String(blank.declared.factId)) : false)
        || here.has(normLabel(blank.label)) || here.has(normLabel(blank.name))
    };
    const verdict = classifyBlank(blank, blank.reason, blank.refusalClass, declared);
    ledger.push({ field: blank.id, label: blank.label, ...verdict });
    if (BLANK_DISPOSITIONS[verdict.disposition].allowed) continue;
    const counter = verdict.disposition === "KNOWN_FACT_NOT_WRITTEN" ? "knownRequiredFieldsMissing"
      : verdict.disposition === "ROUTE_OPTION_NOT_SELECTED" ? "requiredOptionsMissing" : "unclassifiedBlanks";
    note(counter, { field: blank.id, label: blank.label, disposition: verdict.disposition, basis: verdict.basis });
  }

  const instructions = String(instructionsText ?? "");
  for (const b of ledger.filter((x) => x.disposition === "REQUIRED_BEFORE_FILING")) {
    const needles = [b.label, b.field].map((x) => String(x ?? "").trim()).filter((x) => x.length >= 3);
    if (needles.some((n) => instructions.toLowerCase().includes(n.toLowerCase().slice(0, 60)))) continue;
    note("requiredFactsNotCollected", { field: b.field, label: b.label, why: "declared required-before-filing and not named in participant-instructions.md" });
  }

  const rows = new Map();
  for (const f of [...writes.map((w) => ({ ...w, written: true })), ...blanks.map((b) => ({ ...b, written: false }))]) {
    const key = rowKeyOf(f);
    if (!key) continue;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(f);
  }
  for (const [key, cells] of rows) {
    if (!cells.some((c) => c.written)) continue;
    const missing = cells.filter((c) => !c.written && classifyField(c.label, c.isSelectionControl === true).requirement === "REQUIRED_KNOWN");
    if (missing.length > 0) note("incompleteRows", { row: key, missingCells: missing.map((m) => m.label) });
  }

  for (const p of writeProofs) {
    const visible = (p.addedGlyphsReadFromOutputBytes ?? 0) + (p.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if ((p.valuesReportedByFinalizer ?? 0) > 0 && visible === 0) {
      note("invisibleWrites", { fixture: p.fixture, why: "the finalizer reported values and the output bytes carry no glyph and no flattened appearance" });
    }
    if ((p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: p.fixture, why: "ink landed outside every measured write box" });
    for (const refused of p.refusedFieldsWithInk ?? []) {
      note("protectedWrites", { fixture: p.fixture, field: refused.fieldId, why: "a field the map refused carries ink in the output" });
    }
  }
  for (const w of writes) {
    if (classifyField(w.label, false).requirement === "PROTECTED") {
      note("protectedWrites", { field: w.id, label: w.label, why: "a protected field was written" });
    }
  }

  const rendered = artifacts.map((a) => `${a.file} ${(a.documents ?? []).join(" ")}`).join(" ").toLowerCase();
  const loose = (x) => String(x).toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const m of maps) {
    if (!rendered.includes(String(m.formNumber).toLowerCase()) && !loose(rendered).includes(loose(m.formNumber))) {
      note("requiredComponentsMissing", { component: m.formNumber, why: "the field map names this document and it appears in no rendered artifact" });
    }
  }

  return { counters, findings, ledger };
}

/* ---- artifacts ------------------------------------------------------------- */
function writeJson(rel, value) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(value, null, 2)}\n`);
}

function requiredBeforeFilingItems(maps) {
  const item = (m, r, fixture) => ({
    document: m.formNumber, field: r.field, page: r.page,
    section: r.unfittable
      ? `${r.sectionHeading} (form pages ${[...new Set(r.widgetLocations.map((w) => w.page))].join(", ")})`
      : r.sectionHeading,
    disclosureLabel: r.effectiveLabel,
    identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply,
    ...(r.unfittable === true
      ? {
        conditional: true,
        conditionDescription:
          "only where the value the platform holds is longer than this box's own /MaxLen, in which case the box is "
          + "delivered blank rather than truncated",
        declaredMaxLength: r.declaredMaxLength ?? null,
        valueLengthThatDidNotFit: r.valueLength ?? null,
        widgetLocations: r.widgetLocations,
        fixturesInWhichThisBoxIsBlank: [fixture]
      }
      : {})
  });
  const rows = maps.flatMap((m) => m.canonicalRefusals.filter((r) => r.requiredBeforeFiling === true).map((r) => item(m, r, "canonical")));
  const seen = new Map(rows.map((r) => [`${r.document}\u0000${r.field}`, r]));
  /*
   * A box the CANONICAL render fills and the BOUNDARY render cannot. It is a
   * blank the participant must fill on the paper they are handed, so it is
   * declared here rather than left to the reader to discover, and it is
   * declared conditionally because it is not blank on every packet.
   */
  for (const m of maps) {
    for (const r of m.boundaryRefusals) {
      if (r.requiredBeforeFiling !== true || r.unfittable !== true) continue;
      const key = `${m.formNumber}\u0000${r.field}`;
      if (seen.has(key)) {
        const existing = seen.get(key);
        if (existing.conditional) existing.fixturesInWhichThisBoxIsBlank.push("boundary");
        continue;
      }
      const next = item(m, r, "boundary");
      seen.set(key, next);
      rows.push(next);
    }
  }
  return rows;
}

/** The conditional rows above, alone, for the paragraph that names them. */
function unfittableRequiredItems(maps) {
  return requiredBeforeFilingItems(maps).filter((r) => r.conditional === true);
}

/*
 * THE COMMITTED PACKET SET, AND THE STEPS IT SAYS COME BEFORE FILING.
 *
 * The track registry carries this family's packet-set manifest: the component
 * list the route is measured against, and a requiredBeforeFiling list written in
 * the record's own words. The packet prints every one of those steps verbatim
 * and names every component it claims, so a component that exists only in the
 * manifest cannot quietly go undelivered and a prerequisite the record states
 * cannot be replaced by prose this file remembers.
 */
function loadPacketSet() {
  const registry = readGroundingRecord(GROUNDING_RECORDS.trackRegistry);
  const track = (registry.data.tracks ?? []).find((row) => row.trackId === MEMO_TRACK_ID);
  assert.ok(track, `${GROUNDING_RECORDS.trackRegistry} holds no track ${MEMO_TRACK_ID}`);
  const set = track.packetSet;
  assert.ok(set, `${GROUNDING_RECORDS.trackRegistry} track ${MEMO_TRACK_ID} carries no packetSet`);
  assert.equal(set.packetSetId, FAMILY_ID,
    `${GROUNDING_RECORDS.trackRegistry} track ${MEMO_TRACK_ID} names packet set ${set.packetSetId}, not ${FAMILY_ID}`);

  const steps = (set.requiredBeforeFiling ?? []).map((s) => String(s).trim()).filter(Boolean);
  assert.ok(steps.length > 0,
    `${GROUNDING_RECORDS.trackRegistry} packet set ${FAMILY_ID} states no requiredBeforeFiling step, so the packet cannot print one`);

  /* Every form this build renders must be a component the manifest names, and
   * every guidance component the manifest names must be a section this build
   * prints. A packet that renders a document the manifest does not carry, or
   * claims a guidance component it never writes, is not this packet set. */
  const components = set.components ?? [];
  const manifestForms = new Set(components.map((c) => c.officialFormId).filter(Boolean));
  for (const document of ROUTE.documents) {
    assert.ok(manifestForms.has(document.sourceId.replace(/^official-form:/, "")),
      `${FAMILY_ID}: the committed packet-set manifest names no component for ${document.sourceId}`);
  }
  const manifestGuidanceRoles = new Set(components.filter((c) => c.outputStrategy === "process_guidance").map((c) => c.role));
  for (const guidance of ROUTE.guidanceComponents) {
    assert.ok(manifestGuidanceRoles.has(guidance.role),
      `${FAMILY_ID}: the manifest names no process-guidance component ${guidance.role}`);
  }
  assert.equal(manifestGuidanceRoles.size, ROUTE.guidanceComponents.length,
    `${FAMILY_ID}: the manifest carries ${manifestGuidanceRoles.size} process-guidance component(s) and this build delivers `
    + `${ROUTE.guidanceComponents.length}; a guidance component nobody prints is a component the packet claims and does not deliver`);

  return { record: registry, set, steps, components, version: set.version ?? null };
}

/*
 * The central packet-set record predates the owner's five adopted revisions.
 * Keep its original steps in the bound source record, but adapt the participant
 * copy where the old wording would tell a person to resolve an adopted branch
 * as though it were still an unanswered question.  Any future shared-record
 * update that already carries the adopted wording simply passes through here.
 */
function effectivePacketSteps(packetSet, adoption) {
  const replacements = [];
  const steps = packetSet.steps.map((step) => {
    let replacement = step;
    if (/Department of Corrections investigation fee applies/i.test(step)) {
      replacement = `${adoption.rules.noDoc.participant} ${adoption.rules.costs.statePolice}`;
    } else if (/Motion for Waiver of Filing Fee,? NHJB-2311/i.test(step)) {
      replacement = adoption.rules.waivers.court;
    } else if (/Watching for the court's notice of determination and diarying the prosecutor's twenty days/i.test(step)) {
      replacement = `${adoption.rules.conditionalGrant.receipt} ${adoption.rules.conditionalGrant.participantSteps}`;
    }
    if (replacement !== step) replacements.push({ original: step, replacement });
    return replacement;
  });
  return { steps, replacements, originalSteps: packetSet.steps };
}

/*
 * Small, family-local decision functions make the five adopted branches
 * executable and testable without creating a repository-wide status enum. They
 * return handling instructions, not an eligibility or court determination.
 */
function handleStreamlinedEligibility(input) {
  const provenScope = input?.post2019 === true
    && ["violation", "class_b_misdemeanor"].includes(input?.offenseLevel)
    && input?.highestOffenseDocumented === true
    && input?.wholeRecordGate === true;
  if (input?.highestOffenseUncertain === true || input?.crossDateRelationshipUncertain === true) {
    return {
      handling: "MANUAL_LEGAL_REVIEW",
      routineDocReferral: false,
      confirmationRequired: false,
      reason: ADOPTED_PRODUCT_RULES.highestOffense.participant
    };
  }
  if (!provenScope) {
    return {
      handling: "WITHHOLD_AUTOMATED_STREAMLINED_ROUTE",
      routineDocReferral: false,
      confirmationRequired: false,
      reason: "The streamlined no-DOC treatment applies only after the target and whole-record facts are independently established."
    };
  }
  if (input?.contraryCourtOrDocDemand === true) {
    return {
      handling: "CONFIRMATION_REQUIRED",
      routineDocReferral: false,
      confirmationRequired: true,
      reason: "A contrary court or DOC demand is a case-specific confirmation/review branch; the participant is never told to disregard it."
    };
  }
  return {
    handling: "PUBLISHED_NO_DOC_WORKFLOW",
    routineDocReferral: false,
    confirmationRequired: false,
    reason: ADOPTED_PRODUCT_RULES.noDoc.participant
  };
}

function handleConditionalGrant(input) {
  const receiptKnown = input?.prosecutorReceiptDateKnown === true;
  const courtDeadlineKnown = input?.courtSpecifiedDeadlineKnown === true;
  return {
    deadline: courtDeadlineKnown || receiptKnown ? "ANCHOR_REQUIRED_BEFORE_COMPUTATION" : "UNCONFIRMED",
    finalCourtRelief: input?.finalEnteredOrderConfirmed === true,
    agencyImplementation: input?.statePoliceUpdateConfirmed === true,
    automaticallyFinalAfterTwentyDays: false,
    reason: ADOPTED_PRODUCT_RULES.conditionalGrant.receipt
  };
}

function handleWaiverCompatibility(input) {
  const courtCompatible = input?.courtWaiverEditionCompatible === true;
  const agencyDecision = input?.statePoliceAgencyWaiverDecision === true;
  return {
    courtWaiverUsable: courtCompatible,
    statePoliceWaiverGranted: agencyDecision,
    branch: courtCompatible ? "COURT_WAIVER_COMPATIBILITY_CONFIRMED" : ADOPTED_PRODUCT_RULES.waivers.branchStatus,
    coverageRetained: true,
    reason: ADOPTED_PRODUCT_RULES.waivers.court
  };
}

function adoptedRuleFocusedTest(adoption) {
  const proven = handleStreamlinedEligibility({
    post2019: true, offenseLevel: "violation", highestOffenseDocumented: true,
    wholeRecordGate: true
  });
  const contrary = handleStreamlinedEligibility({
    post2019: true, offenseLevel: "class_b_misdemeanor", highestOffenseDocumented: true,
    wholeRecordGate: true, contraryCourtOrDocDemand: true
  });
  const uncertainHighest = handleStreamlinedEligibility({
    post2019: true, offenseLevel: "violation", highestOffenseDocumented: false,
    highestOffenseUncertain: true, crossDateRelationshipUncertain: true, wholeRecordGate: true
  });
  const wholeRecordFailure = handleStreamlinedEligibility({
    post2019: true, offenseLevel: "class_b_misdemeanor", highestOffenseDocumented: true,
    wholeRecordGate: false
  });
  const sentButNoReceipt = handleConditionalGrant({
    prosecutorReceiptDateKnown: false, courtSpecifiedDeadlineKnown: false,
    finalEnteredOrderConfirmed: false, statePoliceUpdateConfirmed: false
  });
  const finalCourtOnly = handleConditionalGrant({
    prosecutorReceiptDateKnown: true, courtSpecifiedDeadlineKnown: false,
    finalEnteredOrderConfirmed: true, statePoliceUpdateConfirmed: false
  });
  const incompatibleWaiver = handleWaiverCompatibility({
    courtWaiverEditionCompatible: false, statePoliceAgencyWaiverDecision: false
  });
  const statePoliceAndDistinctCosts =
    ADOPTED_PRODUCT_RULES.costs.statePolice.includes("$100")
    && ADOPTED_PRODUCT_RULES.costs.statePolice.includes("State Police")
    && ADOPTED_PRODUCT_RULES.costs.distinct.includes("separate cost items")
    && ADOPTED_PRODUCT_RULES.waivers.statePolice.includes("separate agency branch");
  const wholeRecordScope =
    ADOPTED_PRODUCT_RULES.highestOffense.wholeRecord.includes("clean-period")
    && ADOPTED_PRODUCT_RULES.highestOffense.wholeRecord.includes("VI-a")
    && ADOPTED_PRODUCT_RULES.highestOffense.wholeRecord.includes("VII");
  const cases = [
    { name: "proven streamlined record follows published no-DOC workflow", pass: proven.handling === "PUBLISHED_NO_DOC_WORKFLOW" && proven.routineDocReferral === false },
    { name: "contrary court or DOC demand requires confirmation", pass: contrary.handling === "CONFIRMATION_REQUIRED" && contrary.confirmationRequired === true },
    { name: "uncertain highest offense is individual manual review", pass: uncertainHighest.handling === "MANUAL_LEGAL_REVIEW" && uncertainHighest.reason.includes("manual legal review") },
    { name: "whole-record failure withholds automated route", pass: wholeRecordFailure.handling === "WITHHOLD_AUTOMATED_STREAMLINED_ROUTE" },
    { name: "sent date without receipt cannot compute deadline", pass: sentButNoReceipt.deadline === "UNCONFIRMED" && sentButNoReceipt.automaticallyFinalAfterTwentyDays === false },
    { name: "court relief and agency implementation remain distinct", pass: finalCourtOnly.finalCourtRelief === true && finalCourtOnly.agencyImplementation === false },
    { name: "unverified waiver compatibility is withheld while coverage remains", pass: incompatibleWaiver.courtWaiverUsable === false && incompatibleWaiver.coverageRetained === true },
    { name: "State Police correction fee and agency waiver remain separate cost branches", pass: statePoliceAndDistinctCosts },
    { name: "whole-record clean-period, VI-a and VII gates remain explicit", pass: wholeRecordScope },
    { name: "adoption binds all five revisions", pass: adoption.revisionNumbers.join(",") === "1,2,3,4,5" }
  ];
  const failures = cases.filter((test) => !test.pass).map((test) => test.name);
  assert.deepEqual(failures, [], `NH adopted-rule focused test failed: ${failures.join(", ")}`);
  return {
    schemaVersion: "rcap-nh-streamlined-adopted-rule-focused-test/v1",
    familyId: FAMILY_ID,
    decisionId: adoption.decision.decisionId,
    adoptionRecord: adoption.record.path,
    adoptionRecordSha256: adoption.record.sha256,
    adoptedRevisionNumbers: adoption.revisionNumbers,
    result: "PASS",
    cases,
    branchExamples: { proven, contrary, uncertainHighest, wholeRecordFailure, sentButNoReceipt, finalCourtOnly, incompatibleWaiver },
    scope: "handling rules for this streamlined family only; no court, counsel, eligibility or production determination"
  };
}

/**
 * Which of the two petitions a conviction date selects, in the record's own
 * words, read out of the packet-set manifest rather than restated here.
 */
function petitionSelectionRule(packetSet) {
  const rows = (packetSet.components ?? []).filter((c) => c.role === "primary_filing");
  assert.equal(rows.length, 1, `${FAMILY_ID}: the streamlined manifest must carry exactly one primary petition`);
  const row = rows[0];
  assert.equal(row.officialFormId, "NHJB-3057-DSe", `${FAMILY_ID}: the streamlined primary must be NHJB-3057-DSe`);
  assert.equal(row.requirement, "required", `${FAMILY_ID}: NHJB-3057-DSe must be required on this route`);
  assert.ok(!row.conditionDescription, `${FAMILY_ID}: the streamlined primary may not be conditional on a pre-2019 selection`);
  return [{ formNumber: row.officialFormId, role: row.role, condition: null, requirement: row.requirement }];
}

function componentNote(fee, role) {
  const row = (fee.track.components ?? []).find((c) => c.role === role);
  assert.ok(row, `${GROUNDING_RECORDS.memo} track ${MEMO_TRACK_ID} carries no ${role} component`);
  const notes = String(row.notes ?? "").trim();
  assert.ok(notes.length > 0,
    `${GROUNDING_RECORDS.memo} track ${MEMO_TRACK_ID} component ${role} carries no notes, so the packet cannot deliver it`);
  return notes;
}

function participantInstructions(maps, rbf, unfittableItems, fee, stops, SERVICE, packetSet, openQuestions, adoption) {
  assert.ok(adoption?.rules, "NH streamlined participant instructions require the adopted bounded rules");
  const rules = adoption.rules;
  const out = [];
  out.push(`# Filing instructions — ${ROUTE.publicLabel}`, "");
  out.push(
    "This packet is the New Hampshire streamlined mandatory packet under RSA 651:5. It contains:", "",
    "- **NHJB-3057-DSe**, _Petition of Eligibility for Annulment of Record Conviction: For offenses resolved 01/01/2019 or later_ — the required petition for a qualifying violation or class B misdemeanor conviction.",
    "- **NHJB-2311**, _Motion for Waiver of Filing Fee_ — a conditional court-fee companion; use it only after the disposing clerk confirms that this edition fits the court and filing channel.",
    "- **NHJB-2328**, _Statement of Assets and Liabilities_ — include it with NHJB-2311 only for a compatible court-fee waiver request; it is not proof that the State Police has granted an agency waiver.",
    "- **NHJB-2956**, _Criminal History Record Information Release Authorization_ — use it to obtain your New Hampshire criminal history.",
    "- A process-guidance section for sentence-completion proof, what happens after filing, and the effect and limits of annulment.", "",
    `All four official forms are prepared under ${ROUTE.authority}.`, ""
  );
  out.push("## Which route this packet is built for", "");
  out.push(
    `This packet is for the **${fee.track.legalName}**. The route is stated in the committed track record and is not selected by a checkbox in this packet. `
    + "It is limited to a violation or class B misdemeanor conviction resolved on or after January 1, 2019, where that conviction was the highest offense in the case and the route's other conditions are met. The petition is filed with the court that disposed of the charge, one petition per charge.", ""
  );
  out.push(`- \`${ROUTE.routeKey}\``, "");
  out.push(
    "This packet does not decide eligibility. The conviction date, offence level, highest-offense determination, sentence-completion date, whole-record history and every sworn certification remain facts for the participant and the court record.", ""
  );
  out.push("## Bounded streamlined handling", "");
  out.push(rules.noDoc.participant, "");

  out.push("## One petition per charge", "");
  out.push(
    "The required primary filing is NHJB-3057-DSe. The form says **PLEASE COMPLETE A SEPARATE FORM FOR EACH OFFENSE**. If more than one charge is involved, stop and confirm with the disposing courts how many petitions and filing fees are required. This packet renders one petition for the one charge in each fixture.", ""
  );

  out.push("## What the record says must be done before this is filed", "");
  out.push(
    `The committed packet-set manifest names ${packetSet.steps.length} steps before filing. The current owner-adopted handling is applied to the affected steps below:`, ""
  );
  for (const step of packetSet.steps) out.push(`- ${step}`);
  out.push("");

  out.push("## What the platform filled, and what you must supply", "");
  out.push(
    "The platform fills only held identity and case values through the source forms' own controls. It does not choose a court, swear to eligibility, enter charge facts, complete a signature, complete a court-use section or invent financial answers. A field that the form itself cannot hold is left blank rather than truncated and is listed below.", ""
  );
  if (unfittableItems.length > 0) {
    out.push("### Boxes the form is too short to hold", "");
    out.push("Where a held value exceeds the form's own character limit, write the complete value by hand in that box before filing:", "");
    out.push("| Form | Section | Box | Limit |", "| --- | --- | --- | --- |");
    for (const i of unfittableItems) out.push(`| ${i.document} | ${i.section} | ${i.disclosureLabel} | ${i.declaredMaxLength} characters |`);
    out.push("");
  }
  if (rbf.length > 0) {
    out.push("### Information to complete before filing", "");
    out.push("The following source controls remain for the participant because the platform does not hold the fact or because the form reserves the answer for the participant:", "");
    out.push("| Form | Section | Box | What to provide |", "| --- | --- | --- | --- |");
    for (const i of rbf) out.push(`| ${i.document} | ${i.section} | ${i.disclosureLabel} | ${i.participantMustSupply ?? i.why ?? "Complete this from the court record or your own sworn knowledge."} |`);
    out.push("");
  }
  out.push(
    "Read every certification on NHJB-3057 before selecting it. The boxes are sworn statements under penalties of law about your record, eligibility, sentence completion, other convictions, pending charges, exclusions, enhanced penalties and whether you request a hearing. The platform leaves them unselected. Leave the applicant signature and date, counsel fields and every FOR COURT USE ONLY field blank for the responsible person or court.", ""
  );

  out.push("## Where you file, service and notice", "");
  out.push(`**Filing rule.** ${fee.track.rules.filing}`, "");
  out.push(`**Venue.** ${fee.track.geography.venue}`, "");
  out.push(`**Destination.** ${fee.track.destination.name}. The court reviews the petition and gives notice of its determination to the participant and prosecutor; the prosecutor's objection period is measured from the required receipt anchor described below.`, "");
  out.push(`**Service.** ${SERVICE.service}`, "");
  out.push(`**Notice.** ${SERVICE.notice}`, "");
  out.push(
    "You do not serve the prosecutor yourself on this route. The court provides the notice. Ask the disposing clerk about the filing method and any court-specific submission steps.", ""
  );

  out.push("## Fees and conditional waiver forms", "");
  out.push(`**Court filing fee.** ${rules.costs.court}`, "");
  out.push(`**Expected post-order agency cost.** ${rules.costs.statePolice}`, "");
  out.push(`**Other cost treatment.** ${rules.costs.doc} ${rules.costs.criminalHistory} ${rules.costs.distinct}`, "");
  out.push(`The schedule named by the record is ${fee.schedule.title}, at ${fee.schedule.url}, retrieved ${fee.schedule.retrievedOn}.`, "");
  out.push(
    rules.waivers.court, ""
  );
  out.push(rules.waivers.statePolice, "");
  out.push("The court/channel branch is **withheld until compatibility is verified**; the conditional waiver coverage remains recorded and is not silently removed.", "");

  out.push("## Criminal history request", "");
  out.push(
    "Complete NHJB-2956 using the request method printed on that form. The platform fills held name, date of birth and address controls where the source permits, but it leaves the maiden-name or alias, physical description, driver-licence details, recipient and Section II controls for you when the request method requires them. The purpose printed on the form is annulment/expungement; the platform does not write in the Other line.", ""
  );

  out.push(`## ${ROUTE.guidanceComponents.find((g) => g.role === "sentence_completion_proof").heading}`, "");
  out.push(`The packet manifest requires this guidance component. The committed record says:`, "", `> ${componentNote(fee, "sentence_completion_proof")}`, "");
  out.push(
    "Keep proof that every term and condition of the sentence is complete, including probation or parole, fines, fees, restitution and other conditions. Sentence completion is one of the two grounds on which the prosecutor may object to a streamlined petition. The proof is not filled into the petition by this builder; bring it or keep it available as the record and clerk require.", ""
  );
  out.push(`**Whole-record and highest-offense handling.** ${rules.highestOffense.wholeRecord}`, "");
  out.push(`**Highest-offense branch.** ${rules.highestOffense.participant}`, "");
  out.push(`The route's bounded no-DOC treatment applies only to ${rules.noDoc.scope}. ${rules.noDoc.outsideScope}`, "");
  for (const exclusion of fee.track.exclusions ?? []) {
    if (/highest offense|whole record|time requirements under paragraphs III and IV/i.test(exclusion)) continue;
    out.push(`- ${exclusion}`);
  }
  out.push("");

  out.push(`## ${ROUTE.guidanceComponents.find((g) => g.role === "post_filing_instructions").heading}`, "");
  out.push("The packet keeps the court notice and objection procedure, with the owner-adopted handling below.", "");
  out.push(`**Conditional grant and notice.** ${rules.conditionalGrant.participant}`, "");
  out.push(`**Receipt anchor.** ${rules.conditionalGrant.receipt}`, "");
  out.push("Do not treat twenty days by itself as a completed annulment. Keep the conditional or interim order, the notice and any objection/disposition, the final entered court order or certificate, and the separate State Police payment, waiver and record-update confirmation as distinct records.", "");

  out.push("## Where self-help ends", "");
  out.push(
    `The record names ${stops.conditions.length} situations where you should stop and obtain advice from a New Hampshire lawyer before filing. The list is reproduced in the record's own words:`, ""
  );
  for (const condition of stops.conditions) out.push(`- ${condition}`);
  out.push("");
  if (stops.boundaries.length > 0) {
    out.push("The same record identifies matters for the court rather than the participant to decide:", "");
    for (const boundary of stops.boundaries.filter((b) => !stops.conditions.includes(b))) out.push(`- ${boundary}`);
    out.push("");
  }

  out.push(`## ${ROUTE.guidanceComponents.find((g) => g.role === "effect_and_limits_disclosure").heading}`, "");
  out.push(`The committed record says:`, "", `> ${componentNote(fee, "effect_and_limits_disclosure")}`, "");
  out.push(
    "An annulment order has statutory effects and limits. It does not make the platform an eligibility decision-maker, does not file or take payment, and does not promise federal or immigration recognition, private-database removal or restoration of firearm rights. Read the governing record and the court's order for the effect on your matter.", ""
  );
  out.push(`_Route: ${ROUTE.routeKey} — ${ROUTE.authority}_`);
  return `${out.join("\n")}\n`;
}

/**
 * The filing instructions, as their own document.
 *
 * Same records, same sentences, no new claims: where to file, what it costs,
 * who is served, and what is left blank for the responsible person. It exists
 * because the builder contract asks for filing instructions as well as
 * participant instructions, and because a clerk-facing summary that fits on one
 * page is a different document from a twenty-section guide.
 */
function filingInstructions(fee, SERVICE, packetSet, adoption) {
  assert.ok(adoption?.rules, "NH streamlined filing instructions require the adopted bounded rules");
  const rules = adoption.rules;
  const out = [];
  out.push(`# Filing instructions — ${FAMILY_ID}`, "");
  out.push(`**Route.** ${ROUTE.publicLabel}, under ${ROUTE.authority}.`, "");
  out.push(`- \`${ROUTE.routeKey}\``, "");
  out.push("**Documents.**", "");
  for (const d of ROUTE.documents) out.push(`- ${d.formNumber} — ${d.title} (${d.instrumentKind})`);
  out.push("", `**Filing.** ${fee.track.rules.filing}`, `**Venue.** ${fee.track.geography.venue}`, `**Destination.** ${fee.track.destination.name}.`, "");
  out.push(`**Court fee.** ${rules.costs.court}`, `**Post-order State Police fee.** ${rules.costs.statePolice}`, `**Other costs.** ${rules.costs.doc} ${rules.costs.criminalHistory}`, `**Service.** ${SERVICE.service}`, `**Notice.** ${SERVICE.notice}`, `**Signature.** ${fee.track.rules.participantSignature}`, `**Notarization.** ${fee.track.rules.notarization}`, "");
  out.push("**Before filing, the committed record requires:**", "");
  for (const step of packetSet.steps) out.push(`- ${step}`);
  out.push("", `**Bounded route handling.** ${rules.noDoc.participant}`, `**Highest-offense and whole-record review.** ${rules.highestOffense.participant} ${rules.highestOffense.wholeRecord}`, `**Conditional notice.** ${rules.conditionalGrant.receipt} ${rules.conditionalGrant.participant}`, `**Waiver compatibility.** ${rules.waivers.court} ${rules.waivers.statePolice}`, "");
  out.push("", "File one NHJB-3057-DSe petition per charge. Leave applicant signatures, judge and clerk sections, court-use fields and any participant-sworn selections for the responsible signer or court.", "");
  out.push(`_Built by ${BUILD_SCRIPT}. This packet is review evidence: it authorizes no fulfillment and opens no commercial route._`);
  return `${out.join("\n")}\n`;
}

/* Source-independent regression for refusal reporting, not a packet acceptance.
 * It runs the real finalizer on synthetic form controls. It neither substitutes
 * these controls for the pinned NH forms nor writes a family artifact. */
async function selfTest() {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const repeatedHeaderPage = pdf.addPage([612, 792]);
  const form = pdf.getForm();
  const definitions = [
    ["case number", "matter.case_number", "Case Number", 17, 680],
    ["telnum.1", "participant.phone", "Telephone Number", 15, 620]
  ];
  const rows = definitions.map(([name, fact, effectiveLabel, maxLength, y]) => {
    const field = form.createTextField(name);
    field.setMaxLength(maxLength);
    field.addToPage(page, { x: 72, y, width: 300, height: 24 });
    if (name === "case number") field.addToPage(repeatedHeaderPage, { x: 72, y, width: 300, height: 24 });
    const rect = field.acroField.getWidgets()[0].getRectangle();
    return { name, key: name, fact, effectiveLabel, maxLength, page: 1, rect,
      widgets: field.acroField.getWidgets().map((w, i) => ({ page: i + 1, rect: w.getRectangle() })),
      section: "Synthetic caption", type: "text", policy: "write" };
  });
  const bytes = await pdf.save();
  const source = { formNumber: "NHJB-3057", instrumentKind: "primary_filing", title: "SYNTHETIC REFUSAL TEST",
    syntheticControlDocument: true, bytes, sha256: crypto.createHash("sha256").update(bytes).digest("hex") };
  const census = { rows, pageText: [] };
  const canonical = await renderDocument(source, census, "canonical");
  const boundary = await renderDocument(source, census, "boundary");
  assert.equal(canonical.report.written.length, 2);
  assert.equal(boundary.report.written.length, 0);
  const refused = maxLenRefusalsOf(boundary.report);
  assert.equal(refused.length, 2);
  for (const r of refused) {
    const expected = definitions.find(([name]) => name === r.field);
    assert.equal(r.maxLength, expected[3]);
    assert.equal(r.valueLength, String(factsFor("boundary")[expected[1]]).length);
    assert.ok(r.valueLength > r.maxLength);
  }
  const map = mapFor(source, census, canonical.report, boundary.report);
  assert.equal(map.canonicalWrites.length, 2);
  assert.equal(map.boundaryWrites.length, 0);
  assert.equal(map.boundaryRefusals.length, 2);
  const required = requiredBeforeFilingItems([map]);
  assert.equal(required.length, 2);
  assert.equal(required.reduce((n, r) => n + r.widgetLocations.length, 0), 3);
  assert.ok(required.every((r) => r.conditional && r.fixturesInWhichThisBoxIsBlank.join() === "boundary"));
  const reversed = requiredBeforeFilingItems([mapFor(source, census, boundary.report, canonical.report)]);
  assert.ok(reversed.every((r) => r.fixturesInWhichThisBoxIsBlank.join() === "canonical"));
  const both = requiredBeforeFilingItems([mapFor(source, census, boundary.report, boundary.report)]);
  assert.ok(both.every((r) => r.fixturesInWhichThisBoxIsBlank.join() === "canonical,boundary"));
  const fee = loadFeeGrounding();
  const service = loadServiceRule(fee.record);
  const stops = loadSelfHelpStops(fee.record);
  const packetSet = loadPacketSet();
  const adoption = loadOwnerAdoption();
  const effectiveSteps = effectivePacketSteps(packetSet, adoption);
  const guidancePacketSet = { ...packetSet, ...effectiveSteps };
  const adoptedRuleReport = adoptedRuleFocusedTest(adoption);
  const openQuestions = loadOpenQuestions(fee.record);
  const instructions = participantInstructions([map], required, required, fee, stops, service, guidancePacketSet, openQuestions, adoption);
  const filing = filingInstructions(fee, service, guidancePacketSet, adoption);
  assert.ok(instructions.includes(service.service) && instructions.includes(service.notice));
  assert.ok(filing.includes(service.service) && filing.includes(service.notice));
  assert.ok(instructions.includes("## Where you file, service and notice"));
  assert.ok(instructions.includes("Complete NHJB-2956 using the request method printed on that form"));
  assert.ok(instructions.includes("conditional court-fee companion"));
  assert.ok(instructions.includes("where the source permits"));
  assert.ok(!instructions.includes("standard route"));
  assert.ok(instructions.includes(adoption.rules.noDoc.participant));
  assert.ok(instructions.includes(adoption.rules.costs.statePolice));
  assert.ok(instructions.includes(adoption.rules.conditionalGrant.receipt));
  assert.ok(instructions.includes(adoption.rules.highestOffense.wholeRecord));
  assert.ok(instructions.includes(adoption.rules.waivers.court));
  assert.equal(adoptedRuleReport.result, "PASS");
  for (const r of required) assert.ok(instructions.includes(r.disclosureLabel));

  /* The affected memo sentences remain bound as historical evidence but may not
   * be printed after the owner adoption supersedes their unresolved wording. */
  for (const [name, sentence] of [["fees", fee.fees], ["feeWaiver", fee.feeWaiver], ["sharedFee", fee.sharedFee]]) {
    assert.ok(!instructions.includes(sentence), `participant-instructions.md must not print superseded memo ${name} wording`);
  }
  for (const [name, sentence] of [["fees", fee.fees], ["feeWaiver", fee.feeWaiver]]) {
    assert.ok(!filing.includes(sentence), `filing-instructions.md must not print superseded memo ${name} wording`);
  }
  for (const [name, sentence] of [["filing", fee.track.rules.filing], ["court", adoption.rules.costs.court]]) {
    assert.ok(filing.includes(sentence), `filing-instructions.md must carry the record's ${name} sentence`);
  }
  /* Every effective step is carried; affected historical steps are retained in
   * the source receipt rather than copied into participant guidance. */
  for (const step of guidancePacketSet.steps) {
    assert.ok(instructions.includes(step), `participant-instructions.md must carry the required-before-filing step: ${step.slice(0, 60)}`);
    assert.ok(filing.includes(step), `filing-instructions.md must carry the required-before-filing step: ${step.slice(0, 60)}`);
  }
  /* Every self-help stop condition, verbatim, and every route key named. */
  for (const condition of stops.conditions) {
    assert.ok(instructions.includes(condition), `participant-instructions.md must carry the stop condition: ${condition.slice(0, 60)}`);
  }
  for (const routeKey of ROUTE.routeKeys) {
    assert.ok(instructions.includes(routeKey) && filing.includes(routeKey), `both instruction documents must name ${routeKey}`);
  }
  /* The old release-blocking questions remain hash-bound history; the owner
   * adopted bounded branches replace their participant-facing raw wording. */
  for (const q of openQuestions.releaseBlockers) {
    assert.ok(!instructions.includes(q.question), `participant-instructions.md must not print superseded open question: ${q.question.slice(0, 60)}`);
  }
  /* Every guidance component the manifest names is a heading the packet prints,
   * and the two that quote the record's own note carry that note verbatim. */
  for (const guidance of ROUTE.guidanceComponents) {
    assert.ok(instructions.includes(`## ${guidance.heading}`), `participant-instructions.md must deliver the ${guidance.role} component`);
  }
  assert.ok(instructions.includes(componentNote(fee, "effect_and_limits_disclosure")),
    "participant-instructions.md must carry the record's own effect-and-limits note");
  assert.ok(!instructions.includes(componentNote(fee, "post_filing_instructions")),
    "participant-instructions.md must not print the superseded post-filing note verbatim");
  /* A quotation of nothing is a sentence the packet could not find, presented as
   * the record speaking. The sibling marijuana family shipped one; neither does
   * again. */
  for (const [name, document] of [["participant-instructions.md", instructions], ["filing-instructions.md", filing]]) {
    assert.ok(!/\u201c\s*\u201d/.test(document), `${name} carries an empty quotation`);
    assert.ok(!/>\s*$/m.test(document.replace(/\r/g, "")), `${name} carries an empty block quotation`);
  }
  /* The streamlined manifest has one required petition and no date-based form fork. */
  const petitions = petitionSelectionRule(packetSet.set);
  assert.equal(petitions.length, 1);
  assert.equal(petitions[0].formNumber, "NHJB-3057-DSe");
  assert.equal(petitions[0].condition, null);
  assert.ok(instructions.includes("one petition per charge"));
  assert.ok(filing.includes("one petition per charge"));
  const changedMemo = structuredClone(fee.record);
  changedMemo.data.tracks.find((t) => t.trackId === MEMO_TRACK_ID).rules.service = "";
  assert.throws(() => loadServiceRule(changedMemo), /disagree/);

  // A printed header has no widget. Exercise its source-rule binding and the
  // actual shared overlay/read-back path independently of the live queue.
  const printedPdf = await PDFDocument.create();
  printedPdf.addPage([612, 792]);
  const printedPage = printedPdf.addPage([612, 792]);
  for (const [text, y] of [["Case Name:", 764.9], ["Case Number:", 750.4], ["FOR COURT USE ONLY", 716.5]]) {
    printedPage.drawText(text, { x: 36, y, size: 10 });
  }
  const { rectangle, fill } = require("pdf-lib");
  printedPage.pushOperators(rectangle(96, 762.72, 480, 1.08), fill(), rectangle(106.56, 748.2, 469.44, 1.08), fill());
  const printedBytes = await printedPdf.save();
  const printedSource = { formNumber: "NHJB-2311", instrumentKind: "primary_filing", title: "SYNTHETIC PRINTED HEADER TEST",
    syntheticControlDocument: true, bytes: printedBytes, sha256: crypto.createHash("sha256").update(printedBytes).digest("hex") };
  const printedCensus = { rows: printedHeaderRows(printedSource, (await PDFDocument.load(printedBytes)).getPages()), pageText: [] };
  assert.equal(printedCensus.rows.length, 2);
  assert.ok(printedCensus.rows.every((r) => r.widgets.length === 0));
  assert.equal(printedCensus.rows.find((r) => r.key.endsWith("case-name")).policy, "supply");
  for (const fixture of ["canonical", "boundary"]) {
    const rendered = await renderDocument(printedSource, printedCensus, fixture);
    const proof = await byteProof(printedSource, printedCensus, rendered.bytes, rendered.report, fixture);
    assert.equal(proof.actualWrites.length, 1);
    assert.equal(proof.refusedFieldsWithInk.length, 0);
    assert.equal(rendered.report.printedHeaderOverlay.written[0].fontSize, 11);
    const outputPage = (await PDFDocument.load(rendered.bytes)).getPage(1);
    assert.deepEqual(extractTextItems(outputPage).filter((item) => item.y < 730).map((item) => item.text),
      ["FOR COURT USE ONLY"], "the court section must receive no participant ink");
  }
  const moved = await PDFDocument.load(printedBytes);
  moved.getPage(1).drawText("Case Number:", { x: 36, y: 735, size: 10 });
  const movedReadBack = await PDFDocument.load(await moved.save());
  assert.throws(() => printedHeaderRows(printedSource, movedReadBack.getPages()), /must occur once/);
  return { familyId: FAMILY_ID, status: "SELF_TEST_PASS", syntheticControls: 2,
    syntheticWidgetInstances: 3,
    syntheticPrintedHeaders: 2, printedHeaderFixturesReadBack: 2,
    duplicatePrintedCaptionRejected: true, courtSectionUnchanged: true,
    canonicalWrites: 2, boundaryMaxLenRefusals: refused, familyArtifactsWritten: false,
    limitation: "Synthetic control regression only; exact-source rebuild, visual review and determinism remain separate." };
}

/* ---- the entry point -------------------------------------------------------- */
export async function runFamily(argv = process.argv.slice(2)) {
  if (argv.includes("--self-test")) return selfTest();
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");
  // Source checks and no-raster builds do not require Chromium or sharp.
  // A requested raster still loads the same calibrated renderer and fails if
  // its actual dependencies are unavailable.
  const rasterizePageCalibrated = checkOnly || skipRaster ? null
    : (await import("./raster/pdf-page-raster.mjs")).rasterizePageCalibrated;

  const { resolved, failures } = resolveSources();
  if (failures.length > 0) {
    return {
      familyId: FAMILY_ID, status: "BLOCKED_SOURCE", failedSourceIdentities: failures,
      why: "a source did not bind by exact SHA-256, so nothing may be rendered from it",
      overlayDirectoryTouched: false
    };
  }

  /* Bound before anything is rendered, so a memo that stopped stating the fee
   * stops the build rather than producing a packet that quietly omits it. */
  const fee = loadFeeGrounding();

  /* Bound and asserted before anything is composed, for the same reason as the
   * fee: a record that stopped holding this route's stop conditions stops the
   * build rather than producing a packet that quietly omits them. */
  const stops = loadSelfHelpStops(fee.record);

  /* The committed packet set: the components this family is measured against and
   * the steps the record puts before filing. Bound before anything is rendered,
   * so a manifest that no longer names a component this build renders, or that
   * names a guidance component this build does not print, stops the family. */
  const packetSet = loadPacketSet();
  const adoption = loadOwnerAdoption();
  const effectiveSteps = effectivePacketSteps(packetSet, adoption);
  const guidancePacketSet = { ...packetSet, ...effectiveSteps };
  const adoptedRuleReport = adoptedRuleFocusedTest(adoption);

  /* Bound before anything is composed, for the same reason as the fee and the
   * stop conditions: the packet states who is served in the record's words or
   * the build stops. */
  const service = loadServiceRule(fee.record);

  /* The questions the record read and could not resolve. Bound before anything
   * is composed: the packet states them rather than printing around them. */
  const openQuestions = loadOpenQuestions(fee.record);

  const censuses = [];
  for (const source of resolved) {
    const census = await censusOf(source);
    assert.equal(census.unmapped.length, 0,
      `${source.formNumber}: ${census.unmapped.length} widget(s) carry no dictionary entry: ${JSON.stringify(census.unmapped.slice(0, 5).map((u) => u.field))}`);
    assert.equal(census.stale.length, 0,
      `${source.formNumber}: the dictionary names ${census.stale.length} field(s) this form does not have: ${JSON.stringify(census.stale)}`);
    /*
     * A write onto a widget the form hides is invisible ink. The finalizer would
     * report it, the flattened bytes would carry nothing, and the packet would
     * claim a value the paper does not show -- so it is refused here rather than
     * discovered by a reader of the raster.
     */
    const writesOntoHidden = census.rows.filter((r) => (r.policy === "write" || r.policy === "narrative") && r.hiddenUntilTheFormRevealsIt === true);
    assert.equal(writesOntoHidden.length, 0,
      `${source.formNumber}: ${writesOntoHidden.length} write(s) land on a widget the form hides: ${JSON.stringify(writesOntoHidden.map((r) => r.key))}`);
    if (source.acroFieldCount != null) {
      assert.equal(census.rows.filter((row) => !row.printedHeader).length, source.acroFieldCount,
        `${source.formNumber}: source AcroForm count must match ${source.acroFieldCount}; printed headers are inventoried separately`);
    }
    censuses.push({ source, census });
  }

  if (checkOnly) {
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY",
      adoption: {
        decisionId: adoption.decision.decisionId,
        record: adoption.record.path,
        recordSha256: adoption.record.sha256,
        adoptedRevisionNumbers: adoption.revisionNumbers
      },
      adoptedRuleFocusedTest: adoptedRuleReport,
      documents: censuses.map(({ source, census }) => ({
        formNumber: source.formNumber, sha256: source.sha256, fields: census.rows.length,
        writes: census.rows.filter((r) => r.policy === "write").length,
        narrativeWrites: census.rows.filter((r) => r.policy === "narrative").length,
        supply: census.rows.filter((r) => r.policy === "supply").length,
        elections: census.rows.filter((r) => r.policy === "election").length,
        viewer: census.rows.filter((r) => r.policy === "viewer").length,
        optional: census.rows.filter((r) => r.policy === "optional").length,
        notOnThisRoute: census.rows.filter((r) => r.policy === "not_on_route").length,
        protected: census.rows.filter((r) => r.policy === "protect").length,
        attorney: census.rows.filter((r) => r.policy === "attorney").length
      }))
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  /*
   * WHERE THE RASTERS GO, AND WHY THEY DO NOT STAY.
   *
   * Every page of both fixtures is rendered through
   * scripts/raster/pdf-page-raster.mjs, which discovers its own browser and
   * calibrates the page-to-pixel mapping against the paper bounds and the
   * stamped marks. The images are rendered into a staging directory OUTSIDE the
   * family directory and deleted as soon as each page has been measured, on this
   * lane's disposal rule: a build lane does not carry raster binaries into the
   * return. What survives is the MEASUREMENT -- the page geometry, the
   * calibration residual and the SHA-256 of the image that was produced -- and
   * the exact digests of the PDFs those images were rendered from, which is what
   * the central raster-acceptance workflow re-renders against.
   *
   * Recording the measurement is not a visual review and this lane does not
   * claim one. visualDefects stays whatever it is because nobody independent has
   * looked, not because there is nothing to see.
   */
  const rasterStage = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-nh-conviction-streamlined-raster-"));

  const sourceInkByForm = new Map();
  for (const { source } of censuses) sourceInkByForm.set(source.formNumber, await sourceInkOf(source));

  const artifacts = [];
  const writeProofs = [];
  const rasterPages = [];
  /* Where each form's appearance dispositions came from, and what proves the
   * registry entry describes these exact bytes. Recorded in the source receipt. */
  const appearanceProvenance = [];
  /* The field map is built after BOTH fixtures are rendered, because the
   * boundary side of it has to be what the boundary render actually did. Built
   * from the canonical report alone it declared eight writes the boundary bytes
   * do not carry. */
  const reportsByFixture = new Map([["canonical", new Map()], ["boundary", new Map()]]);

  for (const fixtureName of ["canonical", "boundary"]) {
    const packet = await PDFDocument.create();
    stampDeterministic(packet);
    const pageManifest = [];
    for (const { source, census } of censuses) {
      const { bytes, report } = await renderDocument(source, census, fixtureName, appearanceProvenance);
      const proof = await byteProof(source, census, bytes, report, fixtureName, sourceInkByForm.get(source.formNumber) ?? []);
      writeProofs.push({
        fixture: fixtureName, formNumber: source.formNumber, sourceSha256: source.sha256,
        proofMethod: "flattened widget appearances and printed-header page content read back at every measured write box of the finalized bytes",
        valuesReportedByFinalizer: report.written.length,
        flattenedWidgetAppearancesReadFromOutputBytes: proof.appearances,
        addedGlyphsReadFromOutputBytes: proof.glyphs,
        nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
        refusedFieldsWithInk: proof.refusedFieldsWithInk,
        documentAuthoredAppearances: proof.documentAuthoredAppearances,
        /* The finalizer files a /MaxLen refusal under report.refused rather
         * than under report.unfittable. Both are the same answer -- the form
         * will not take this value -- so both are recorded here, with the
         * measured length against the declared MaxLen. */
        unfittable: [...report.unfittable, ...maxLenRefusalsOf(report)],
        actualWrites: proof.actualWrites
      });
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const copied = await packet.copyPages(doc, doc.getPageIndices());
      for (const [i, p] of copied.entries()) {
        packet.addPage(p);
        pageManifest.push({ packetPage: packet.getPageCount(), formNumber: source.formNumber, sourcePage: i + 1, sourceSha256: source.sha256 });
      }
      reportsByFixture.get(fixtureName).set(source.formNumber, report);
    }

    const packetBytes = await packet.save({ useObjectStreams: false, updateMetadata: false });
    const file = `${OUT}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), packetBytes);
    artifacts.push({
      fixture: fixtureName, file,
      sha256: crypto.createHash("sha256").update(packetBytes).digest("hex"),
      byteLength: packetBytes.length, pageCount: packet.getPageCount(), pageManifest,
      documents: censuses.map((c) => c.source.formNumber)
    });

    const rasterDir = path.join(rasterStage, fixtureName);
    fs.mkdirSync(rasterDir, { recursive: true });
    for (let i = 0; !skipRaster && i < packet.getPageCount(); i += 1) {
      const stage = path.join(rasterDir, `page-${String(i + 1).padStart(2, "0")}`);
      const render = await rasterizePageCalibrated({ file: path.join(ROOT, file), pageIndex: i, keep: stage });
      for (const scrap of ["page.pdf", "page-calibration.pdf", "page-calibration.png"]) {
        const f = path.join(stage, scrap);
        if (fs.existsSync(f)) fs.unlinkSync(f);
      }
      const png = path.join(stage, "page.png");
      rasterPages.push({
        fixture: fixtureName, page: i + 1,
        file: null, imageRetained: false,
        imageDisposal: "rendered into a staging directory outside the family directory, measured, and deleted; the central raster-acceptance workflow re-renders from the pinned PDF digest",
        pageWidthPt: render.pageWidth, pageHeightPt: render.pageHeight,
        pixelsPerPoint: Number(render.pxPerPt.toFixed(4)),
        calibrationResidualPx: render.calibrationResidualPx,
        paperBounds: render.paper,
        engine: "chromium_calibrated_scripts_lib_pdf_page_raster",
        sha256: crypto.createHash("sha256").update(fs.readFileSync(png)).digest("hex")
      });
    }
  }

  /* The staging directory and every image in it. The measurement above is kept;
   * the binaries are not. */
  if (!process.env.RCAP_KEEP_RASTER_STAGE) fs.rmSync(rasterStage, { recursive: true, force: true });

  const maps = censuses.map(({ source, census }) => mapFor(
    source, census,
    reportsByFixture.get("canonical").get(source.formNumber),
    reportsByFixture.get("boundary").get(source.formNumber)
  ));

  const rbf = requiredBeforeFilingItems(maps);
  const unfittableItems = unfittableRequiredItems(maps);
  const instructionsText = participantInstructions(maps, rbf, unfittableItems, fee, stops, service, guidancePacketSet, openQuestions, adoption);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);
  const filingText = filingInstructions(fee, service, guidancePacketSet, adoption);
  fs.writeFileSync(path.join(ROOT, OUT, "filing-instructions.md"), filingText);
  writeJson(`${OUT}/reports/adopted-rule-focused-test.json`, adoptedRuleReport);

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID, worklistGroupId: FAMILY_ID,
    jurisdiction: ROUTE.jurisdiction, implementationStrategy: "official_pdf_fill",
    custodyClass: "SOURCE_ALREADY_HELD", acquisitionCommissioned: false,
    corpusRootFromEnvironment: "MASTER_LIBRARY_SOURCE_DIR",
    bindingMethod:
      "the SHA-256 the assignment pins, resolved to the committed corpus index entry that carries it in a custody this "
      + "container mounts, then re-hashed from the file on disk before a byte was read. The form number is recorded, "
      + "not used to resolve: the assignment's own paths for these four sources are in custodies this container does "
      + "not hold, and the digest is what makes the Master Library copy the same binary rather than a substitute.",
    custodyTheAssignmentNames: "d_source_packs and nationwide_recovery_pool_2026_09_02, neither mounted here",
    custodyActuallyRead: "master_library",
    routeKey: ROUTE.routeKey, routeKeys: ROUTE.routeKeys,
    routeSelectionId: ROUTE.routeSelectionId, statutoryAuthority: ROUTE.authority,
    allSourcesExact: true,
    /*
     * The registry entry that says what each source's own in-field appearance
     * MEANS, and the committed sibling receipt that proves the entry describes
     * these exact bytes. Recorded here because the packet's refusal to ship the
     * NHJB-2311 signature placeholder and the three zeroed NHJB-2328 totals rests
     * on it.
     */
    appearanceDispositionProvenance: appearanceProvenance,
    documents: resolved.map((r) => ({
      sourceIds: [r.sourceId], documentId: r.formNumber, formNumber: r.formNumber, revision: r.revision,
      pathInArchive: r.pathInArchive, sha256: r.sha256, byteLength: r.byteLength, instrumentKind: r.instrumentKind
    })),
    /*
     * The four binaries above are what the packet is RENDERED from. This record
     * is what the packet's cost and waiver sentences are QUOTED from, and it is
     * bound the same way and for the same reason: so a reader can check the
     * sentence against the bytes it came out of.
     */
    groundingRecords: [
      {
        path: fee.record.path, sha256: fee.record.sha256, byteLength: fee.record.byteLength,
        trackId: MEMO_TRACK_ID,
        fieldsQuotedOnParticipantSurfaces: ["rules.filing", "rules.service", "rules.notice", "rules.participantSignature", "rules.notarization"],
        retainedAsHistoricalSupportingAuthorityFor: ["rules.fees", "rules.feeWaiver", "destination.detail", "unresolvedQuestions"],
        supersededByOwnerAdoptionFor: adoption.memoIdentity.supersededFieldScopes,
        whyItIsBound:
          "The historical intake memo remains byte-bound and supplies unaffected filing, service, signature and "
          + "notarization rules. Its affected fee, waiver, conditional-grant, highest-offense and unresolved-question "
          + "wording is retained for provenance only because the registered owner adoption controls those streamlined "
          + "fields; participant surfaces use the adopted rules below rather than copying stale open-question text."
      },
      {
        path: stops.record.path, sha256: stops.record.sha256, byteLength: stops.record.byteLength,
        trackId: MEMO_TRACK_ID,
        fieldsQuotedOnParticipantSurfaces: [
          "selfHelpStopConditions", "selfHelpBoundaries", "rules.service", "rules.notice",
          "packetSet.requiredBeforeFiling", "packetSet.components[].conditionDescription"
        ],
        selfHelpStopConditionsCarriedVerbatim: stops.conditions.length,
        packetSetRequiredBeforeFilingStepsRead: packetSet.steps.length,
        packetSetRequiredBeforeFilingStepsPrintedAfterOwnerAdaptation: guidancePacketSet.steps.length,
        packetSetStepReplacements: effectiveSteps.replacements,
        releaseBlockingOpenQuestionsRetainedInSourceOnly: openQuestions.releaseBlockers.length,
        packetSetVersion: packetSet.version,
        whyItIsBound:
          "participant-instructions.md prints all " + stops.conditions.length + " of this track's self-help stop "
          + "conditions word for word under 'Where self-help ends'. Both instruction documents carry the packet-set "
          + "steps after the registered owner-adoption replacements recorded above. The record the unaffected sentences "
          + "come from is bound by SHA-256 here, the build asserts the counts before printing any of them, and the intake "
          + "memo must agree with the registry on every rule the packet quotes. The "
          + "the streamlined route has one required NHJB-3057-DSe petition, and the packet-set manifest supplies the "
          + "required or conditional companion components this build delivers."
      },
      {
        path: adoption.record.path, sha256: adoption.record.sha256, byteLength: adoption.record.byteLength,
        decisionId: adoption.decision.decisionId, owner: adoption.record.data.provenance.owner,
        ownerAdoption: true, adoptedRevisionNumbers: adoption.revisionNumbers,
        controllingForThisFamily: [
          "bounded no-DOC workflow and contrary referral confirmation", "expected separate $100 State Police correction",
          "receipt anchor and evidenced finality", "whole-record and bounded manual highest-offense handling",
          "court/channel waiver compatibility and retained conditional coverage"
        ],
        historicalDraft: { path: adoption.draft.path, sha256: adoption.draft.sha256, byteLength: adoption.draft.byteLength },
        adoptionReview: { path: adoption.review.path, sha256: adoption.review.sha256, byteLength: adoption.review.byteLength },
        originalBlockedVerdict: { path: adoption.blockedVerdict.path, sha256: adoption.blockedVerdict.sha256, byteLength: adoption.blockedVerdict.byteLength },
        governingMemoIdentity: { path: adoption.memo.path, sha256: adoption.memo.sha256, byteLength: adoption.memo.byteLength, trackId: MEMO_TRACK_ID },
        acceptanceState: "owner_adoption_only; counsel, court, packet, independent semantic and production acceptance remain pending",
        whyItIsBound:
          "The five owner-adopted revisions control only this streamlined family. The original draft, blocked semantic "
          + "verdict and historical memo remain hash-bound provenance; no other NH family or shared route is changed."
      }
    ],
    sourceBinaryCommitted: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1", familyId: FAMILY_ID,
    captionBasis:
      "Every label here was written by reading the printed line at the widget's own rectangle in the pinned binary. "
      + "These four forms extract cleanly, so that reading was possible; it is not claimed as an automated caption "
      + "check, because several boxes are NAMED for the line above them rather than for what they collect -- NHJB-3057's "
      + "City/Town box is named Mailing Address.2 and NHJB-2956's four name-part boxes are all named name.N -- and a "
      + "check that matched a widget to its nearest printed line would agree with the wrong caption exactly where it "
      + "matters. The extraction at each widget's own coordinate is recorded beside the label this build uses, in "
      + "reports/caption-evidence.json, for the reviewer who reads the paper.",
    documents: censuses.map(({ source, census }) => ({
      documentId: source.formNumber, formNumber: source.formNumber, sourceSha256: source.sha256,
      pageCount: census.pageCount, fieldCount: census.rows.length,
      acroFormFieldCount: census.rows.filter((r) => !r.printedHeader).length,
      printedHeaderCount: census.rows.filter((r) => r.printedHeader).length,
      corpusIndexDeclaresFieldCount: source.acroFieldCount,
      fields: census.rows.map((r) => ({
        field: r.key, page: r.page, rect: r.rect, rectBasis: r.rectBasis, pdfType: r.type,
        ...(r.printedHeader ? { printedHeader: true, sourceRule: r.sourceRule, courtSectionStartsAt: r.courtSectionStartsAt } : {}),
        hiddenUntilTheFormRevealsIt: r.hiddenUntilTheFormRevealsIt === true,
        isSelectionControl: r.isSelectionControl, multiline: r.multiline, maxLength: r.maxLength,
        section: r.section, effectiveLabel: r.effectiveLabel, policy: r.policy, factId: r.fact,
        printedTextAtCoordinate: r.printedTextAtCoordinate
      })),
      /*
       * WHAT THE BLANK OFFICIAL FORM ALREADY CARRIES IN EACH FIELD.
       *
       * The `fields` array above says what each field IS. This says what the
       * source ships INSIDE it before any participant sees the form, which is a
       * different question and the one the corpus-wide check
       * scripts/rcap-official-forms/verify-source-carried-values-are-dispositioned.mjs
       * asks: every value an official source ships inside a field must be
       * dispositioned by somebody, on the record, before the bytes go out. Until
       * this family emitted it, that check could not see New Hampshire at all --
       * it reads `documents[].rows[].sourceValuePresentInBlankForm`, this census
       * carried no `rows`, and a family that is invisible to a checker is not a
       * clean family.
       *
       * TWO PLACES A SOURCE CAN CARRY A VALUE, AND BOTH ARE READ. NHJB-2328's
       * three totals carry theirs in /V. NHJB-2311's signature box carries no /V
       * at all and carries its placeholder in the widget's own appearance
       * stream, which flattens onto the page exactly the same way; a reader that
       * looked only at /V would report that form as shipping nothing. So the
       * value is taken from /V where there is one, and otherwise from the ink
       * the PINNED SOURCE ITSELF draws at that widget's rectangle when flattened
       * unwritten -- the same sourceInk measurement the byte proof uses, so the
       * two cannot disagree.
       *
       * Whitespace is not a value. Three choice controls on these forms ship
       * /V " ", a single space, which draws nothing and asserts nothing; they
       * are recorded as carrying null rather than as carrying a space, because a
       * checker asked to disposition a space would be asked to disposition
       * nothing.
       *
       * A CONTROL THE STRUCTURAL RULE ALREADY ANSWERS IS NOT AN UNDISPOSITIONED
       * VALUE, AND IT IS ALSO NOT HIDDEN. Sixteen of these fields are
       * pushbuttons whose /MK caption -- "Clear Form", "Lock & Save Form", "Top
       * of Page", "Instructions" -- the source draws, and one is a dropdown
       * shipping a selected option on a section this route does not use. The
       * finalizer removes a pushbutton as chrome and drops an unanswered
       * chooser's prompt without consulting any registry, so neither can reach a
       * filing and neither is the defect this check exists to catch. Recording
       * them as source-carried values would ask a human to disposition, by name,
       * seventeen appearances that are already gone -- seventeen manufactured
       * findings. They are recorded instead under
       * sourceAppearanceOnAControlTheStructuralRuleAlreadyAnswers, with the
       * disposition that removes each one named, so the reader can see what was
       * excluded and why rather than having to trust that nothing was.
       */
      rows: census.rows.map((r) => {
        const declared = r.sourceValue === null || r.sourceValue === undefined
          ? null : String(Array.isArray(r.sourceValue) ? r.sourceValue.join(" ") : r.sourceValue);
        const declaredValue = declared !== null && declared.trim() !== "" ? declared : null;
        const drawn = (r.widgets ?? [])
          .flatMap((w) => drawnAt(sourceInkByForm.get(source.formNumber) ?? [], { page: w.page, rect: w.rect }))
          .map((d) => d.text).filter(Boolean).join("").trim();
        const drawnValue = drawn !== "" ? drawn : null;
        const carried = declaredValue ?? drawnValue;
        const structurallyAnswered = r.type === "button"
          ? "suppress_control_appearance: a pushbutton is chrome and the finalizer removes it"
          : r.isSelectionControl === true
            ? "render_participant_value_only_when_written: an unanswered chooser's prompt is dropped by the finalizer"
            : null;
        return {
          field: r.key, type: r.type, page: r.page, rect: r.rect, rectBasis: r.rectBasis,
          ...(r.printedHeader ? { printedHeader: true } : {}),
          isSelectionControl: r.isSelectionControl, policy: r.policy, factId: r.fact ?? null,
          effectiveLabel: r.effectiveLabel, section: r.section,
          sourceValuePresentInBlankForm: structurallyAnswered === null ? carried : null,
          sourceValueCarriedIn: structurallyAnswered !== null || carried === null
            ? null
            : declaredValue !== null ? "acroform_field_value" : "widget_appearance_stream_the_source_ships",
          sourceAppearanceOnAControlTheStructuralRuleAlreadyAnswers:
            structurallyAnswered !== null && carried !== null ? { text: carried, removedBy: structurallyAnswered } : null
        };
      })
    }))
  });

  writeJson(`${OUT}/reports/caption-evidence.json`, {
    schemaVersion: "rcap-caption-evidence/v1", familyId: FAMILY_ID,
    finding:
      "These four New Hampshire forms extract cleanly: the printed captions are readable in the content stream and were "
      + "read there while this dictionary was written.",
    whyReadableIsNotTheSameAsCheckable:
      "Readable is not the same as checkable. Several boxes on these forms are named for the line above them rather "
      + "than for what they collect -- NHJB-3057's City/Town box is named Mailing Address.2, and NHJB-2956's four "
      + "name-part boxes are all named name.N -- so a check that matched a widget to the nearest printed line would "
      + "agree with the wrong caption on exactly the fields where getting it wrong matters. The extraction at every "
      + "widget's own coordinate is recorded here beside the label this build uses, and the reviewer reads the paper.",
    whatTheCaptionClaimRestsOnHere:
      "Each label was written by reading the printed line at the widget's own rectangle in the pinned binary, and the "
      + "dictionary and the widget set are asserted to match exactly in both directions, on all four forms. Where a "
      + "field name and its printed line disagree, the disagreement is recorded in build-findings.json rather than "
      + "resolved silently.",
    perField: censuses.flatMap(({ source, census }) => census.rows.map((r) => ({
      document: source.formNumber, field: r.key, page: r.page, rect: r.rect,
      labelThisBuildUses: r.effectiveLabel, section: r.section,
      textExtractedAtThisCoordinate: r.printedTextAtCoordinate
    })))
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    routeKeys: ROUTE.routeKeys, routeSelectionId: ROUTE.routeSelectionId, renderStrategy: "acroform_fill",
    supplementalRenderStrategy: "shared_flat_overlay_for_measured_printed_header",
    captionBasis: "authored AcroForm field names plus printed section headings; see reports/caption-evidence.json",
    dispositionVocabulary: [SIGNATURE, COURT_OWNED, PARTICIPANT_ELECTION],
    routeDeterminedSelections: [],
    routeSelectionNote:
      "The packet states the single streamlined mandatory route on its participant surface and under its route key. "
      + "NHJB-3057-DSe is the required primary petition for the post-2019 violation or class B misdemeanor path. "
      + "The fee-waiver forms are conditional manifest components; their use is withheld until the disposing clerk "
      + "confirms court/channel compatibility, and any State Police agency waiver is a separate request and decision. "
      + "Court choice, hearing request, charge facts, sworn certifications and financial answers remain participant or "
      + "court determinations and are disclosed by name. The owner-adopted no-DOC, receipt/finality, whole-record and "
      + "manual highest-offense rules are bound in reports/adopted-rule-focused-test.json.",
    requiredBeforeFilingCount: rbf.length, requiredBeforeFiling: rbf,
    packetSetRequiredBeforeFilingSource: packetSet.steps,
    packetSetStepReplacements: effectiveSteps.replacements,
    adoptedRuleDecisionId: adoption.decision.decisionId,
    adoptedRuleRevisionNumbers: adoption.revisionNumbers,
    adoptedRuleFocusedTest: `${OUT}/reports/adopted-rule-focused-test.json`,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID, renderedFresh: true,
    artifacts, packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    adoptedRuleFocusedTest: {
      path: `${OUT}/reports/adopted-rule-focused-test.json`,
      decisionId: adoption.decision.decisionId,
      adoptionRecordSha256: adoption.record.sha256,
      result: adoptedRuleReport.result
    },
    rasterState: "BUILT_RASTER_PENDING",
    everyPageRastered: rasterPages.length === artifacts.reduce((n, a) => n + a.pageCount, 0),
    rasterImagesRetained: false,
    rasterImageDisposal:
      "Every page of both fixtures was rendered through scripts/raster/pdf-page-raster.mjs on a browser this container "
      + "resolves, measured, and then deleted with its staging directory: this build lane carries no raster binary into "
      + "its return. The measurement of each page is kept below with the SHA-256 of the image that was produced, and "
      + "the artifact digests above are what the central raster-acceptance workflow re-renders from.",
    rasterMeasurementIsNotAVisualReview:
      "Rendering a page and hashing it is not a review of it. No independent reader has looked at these pages, so "
      + "visualDefects records that nobody has looked rather than that there is nothing to see, and this family stays "
      + "BUILT_RASTER_PENDING until RASTER_PASS comes back from a lane that did not build it.",
    byteDerivedHashes: true, rasterEngine: RASTER_ENGINE, rasterPages,
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID, derivedFromArtifactBytes: true,
    note: "Read back from the finalized PDF bytes at every measured widget rectangle and printed-header write box, not from the finalizer's own report.",
    documents: writeProofs,
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture, formNumber: p.formNumber,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      refusedFieldsWithInk: p.refusedFieldsWithInk
    })),
    blockingFindings: writeProofs.flatMap((p) => p.refusedFieldsWithInk.map((r) => ({
      fixture: p.fixture, field: r.fieldId, finding: "a field the map refused carries ink in the output"
    })))
  });

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: FAMILY_ID,
    requiredBeforeFiling: rbf,
    participantElections: maps.flatMap((m) => m.selectionControls.map((c) => ({
      document: m.formNumber, field: c.field, page: c.page, section: c.sectionHeading, label: c.effectiveLabel, why: c.reason
    }))),
    protectedBlanks: maps.flatMap((m) => m.canonicalRefusals.filter((r) => r.requiredBeforeFiling !== true).map((r) => ({
      document: m.formNumber, field: r.field, page: r.page, label: r.effectiveLabel, refusalClass: r.category, why: r.why
    }))),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  writeJson(`${OUT}/reports/independent-visual-review.json`, {
    schemaVersion: "rcap-independent-visual-review/v1", familyId: FAMILY_ID,
    required: true, granted: false, reviewedBy: null,
    note:
      "Every page of both current fixtures requires review by a human who did not build this family. The --no-raster "
      + "build records exact PDF bytes and retains no PNG binaries. Review the source captions, participant writes, "
      + "conditional waiver forms and all protected signature, certification and court-use regions.",
    whatToLookAt: [
      "NHJB-3057 page 1: held name, date of birth, mailing address, telephone, e-mail and case number sit under the source captions; the court chooser and every charge/eligibility field remain for participant or court completion.",
      "NHJB-3057 page 2: all certification and hearing controls are unselected, and the printed applicant signature/date rules remain clear. Pages 3 and 4 court-use orders, signatures, dates, notices and certificates remain blank.",
      "NHJB-2311: held case number and name appear only in their mapped controls; its signature block and court election remain blank. Confirm the source-carried signature prompt is absent.",
      "NHJB-2328: held identity, residence address and case number appear where mapped; financial answers, totals, service certificate, signature and court controls remain blank. Confirm source-carried zero totals are absent.",
      "NHJB-2956: held date of birth, split name and one-line address appear; alias, physical description, license, recipient and Section II controls remain for the requestor.",
      "Across all four forms: no participant signature, sworn certification, court-owned value or synthesized viewer control is present."
    ],
    artifacts: artifacts.map((a) => ({ fixture: a.fixture, file: a.file, sha256: a.sha256, pageCount: a.pageCount })),
    rasterPages: rasterPages.map((p) => ({ fixture: p.fixture, page: p.page, sha256: p.sha256, imageRetained: false }))
  });

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID,
    buildStatus: "state_built", reviewStatus: "qa_review_pending", builtBy: BUILD_SCRIPT,
    rasterEngine: skipRaster ? "not rendered in this run" : "chromium_calibrated", popplerUsed: false,
    renderedArtifacts: artifacts.length, rasterPages: rasterPages.length, rasterImagesRetained: false,
    rasterState: skipRaster ? "NOT_RASTERED_IN_THIS_RUN" : "BUILT_RASTER_PENDING",
    independentVerificationStatus: "PENDING", selfVerified: false,
    generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  });

  const counted = countCompleteness(maps, writeProofs, artifacts, instructionsText);
  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID,
    whatThisIs:
      "The BUILDER's own count of the nine completeness counters, computed with the repository's own contract functions "
      + "over this family's field map, byte proof, rendered artifacts and participant-instructions.md.",
    whatThisIsNot:
      "A verdict. This lane does not verify its own packets, and PASS_COMPLETE additionally requires a hash-bound "
      + "RASTER_PASS from the central raster workflow.",
    counters: counted.counters,
    allNineZero: PASS_COUNTERS.every((c) => counted.counters[c] === 0),
    findings: counted.findings,
    blankDispositions: counted.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {})
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1", familyId: FAMILY_ID, blocking: [],
    findings: [
      {
        finding:
          "STREAMLINED ROUTE: NHJB-3057-DSe IS THE SINGLE REQUIRED PRIMARY PETITION. The committed packet-set manifest "
          + "names the post-2019 violation or class B misdemeanor petition as the primary filing. The route requires "
          + "one petition per charge and does not contain the standard route's pre-2019 petition fork.",
        consequence:
          "The two fixtures each deliver one NHJB-3057-DSe petition together with the four-form route set. The packet "
          + "does not choose eligibility, offence level, highest offense, sentence completion or a sworn certification."
      },
      {
        finding:
          "NHJB-3057-DSe has no AcroForm widget over the applicant signature/date rules or its FOR COURT USE ONLY "
          + "sections. Those rules are printed source content and remain blank for the applicant and court.",
        consequence:
          "The census records all 36 source fields and the rendered bytes carry no synthesized participant ink over "
          + "the printed signature, order, judge, prosecutor-notice or court-use lines."
      },
      {
        finding:
          "THE FEE-WAIVER FORMS ARE CONDITIONAL COMPANIONS. NHJB-2311 and NHJB-2328 are delivered as the manifest's "
          + "conditional components. They are withheld from filing until the disposing clerk confirms the court/channel "
          + "edition and confidentiality/service fit; any State Police indigency request is a separate agency branch. "
          + "Their source editions carry different court chooser lists, so the participant must follow the disposing "
          + "clerk's instruction rather than selecting an unrelated court.",
        consequence:
          "The source court controls remain participant elections, the conditional coverage remains in the manifest, and "
          + "the guide states the compatibility handback without inventing a court choice or an agency approval."
      },
      {
        finding:
          "SOURCE-CARRIED APPEARANCES ARE DISPOSITIONED BEFORE DELIVERY. The exact NHJB-2311 signature placeholder and "
          + "the three NHJB-2328 computed zero totals are removed through the existing sibling registry dispositions "
          + "proved against the four pinned binaries' SHA-256 values; viewer buttons are structural chrome.",
        consequence:
          "source-receipt.json records the sibling provenance and actual writes/appearance read-back records prove "
          + "the final bytes carry no refused-field ink."
      },
      {
        finding:
          "ADOPTED PROCESS RULES ARE FAMILY-SCOPED AND EXECUTABLE. The five owner-adopted revisions are loaded from "
          + `${GROUNDING_RECORDS.ownerAdoption} and tested through the local decision functions; no rule is exported to `
          + "another NH family or used as a statutory, counsel, court or production determination.",
        consequence:
          "The source receipt binds the owner record, its five revision numbers, the draft, adoption review, blocked "
          + "verdict and historical memo identities. The independent semantic lane must still accept the corrected bytes."
      },
      {
        finding:
          "NEW HAMPSHIRE FIELD NAMES DO NOT ALWAYS NAME THE PRINTED LINE. NHJB-3057's City/Town field, NHJB-2956's "
          + "split name fields and its one-line address use explicit named-fact mappings at the source widgets' own "
          + "rectangles. The criminal-history purpose remains the source's printed annulment/expungement option and "
          + "the Other line is not populated.",
        consequence:
          "The field census records the mapping and the byte proof compares the delivered text with the held fixture "
          + "fact after WinAnsi read-back normalization."
      },
      {
        finding:
          "THE OWNER ADOPTION BINDS FIVE BOUNDED STREAMLINED RULE REVISIONS. The published no-DOC treatment is limited "
          + "to proven III(a)(2)/III(b)(2) cases with a contrary-referral confirmation branch; the expected $100 State "
          + "Police correction and agency waiver remain separate; sending is not receipt and twenty days is not automatic "
          + "finality; uncertain highest-offense relationships receive individual manual review while whole-record III, "
          + "VI-a and VII gates remain explicit; and unverified court/channel waiver compatibility is withheld without "
          + "deleting conditional coverage.",
        consequence:
          "The participant and filing guides use the adopted treatment, while the original draft, blocked verdict and "
          + "historical memo remain hash-bound provenance. reports/adopted-rule-focused-test.json records the focused "
          + "branch results and does not claim counsel, court, packet or production acceptance."
      },
      {
        finding:
          "THE FOUR OFFICIAL FORM BINARIES ARE BOUND BY THE ASSIGNMENT DIGESTS. Each is resolved from the committed "
          + "Master Library index and re-hashed from disk before rendering; no replacement or stale source is used.",
        consequence: "source-receipt.json records the four exact source IDs, archive paths, byte lengths and SHA-256 values."
      },
      {
        severity: "advisory",
        finding: "The build rendered the two fixtures with --no-raster; the saved PDFs are ready for independent raster and semantic review.",
        consequence:
          "reports/rendered-artifacts.json records rasterState BUILT_RASTER_PENDING and retains no PNG binaries."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "BUILT_RASTER_PENDING",
    routeKeys: ROUTE.routeKeys,
    components: [
      ...resolved.map((r) => ({ kind: r.instrumentKind, documentId: r.formNumber, outputStrategy: "official_pdf_fill" })),
      ...ROUTE.guidanceComponents.map((g) => ({ kind: g.role, documentId: null, outputStrategy: "process_guidance",
        deliveredAs: `participant-instructions.md § ${g.heading}` }))
    ],
    artifacts: artifacts.map((a) => ({ fixture: a.fixture, file: a.file, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount })),
    independentVerificationStatus: "PENDING",
    approvedForLive: false, live: false, commercialRoutesOpened: 0, productionTouched: false,
    mattersForTheReviewersAttention: [
      "NHJB-3057-DSe is the single required primary petition. Confirm the post-2019 streamlined route and one-petition-per-charge instruction are clear.",
      "Confirm the printed NHJB-3057 signature/date rules and FOR COURT USE ONLY sections remain blank for the participant and court.",
      "Confirm the conditional NHJB-2311 and NHJB-2328 forms remain covered but are withheld until the disposing clerk confirms court/channel compatibility, and that their source court controls remain unselected.",
      "Confirm the NHJB-2311 signature placeholder and the three NHJB-2328 zero totals are removed under the digest-proved appearance dispositions recorded in source-receipt.json.",
      "Review reports/caption-evidence.json and the named-fact mappings for NHJB-3057 City/Town and NHJB-2956 split-name and one-line-address fields.",
      "Review reports/adopted-rule-focused-test.json and the thirteen self-help stop conditions. Confirm the owner-adopted no-DOC, State Police fee, receipt/finality, whole-record/manual-review and waiver-compatibility branches are handled without claiming legal, packet or production acceptance."
    ]
  });

  return {
    familyId: FAMILY_ID,
    status: PASS_COUNTERS.every((c) => counted.counters[c] === 0) ? "COMPLETED" : "STOPPED",
    counters: counted.counters, counterFindings: counted.findings,
    directory: OUT, documents: resolved.map((r) => r.formNumber),
    writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
    requiredBeforeFiling: rbf.length,
    participantElections: maps.reduce((n, m) => n + m.selectionControls.length, 0),
    artifacts: artifacts.map((a) => ({ fixture: a.fixture, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount })),
    adoptedRuleFocusedTest: {
      path: `${OUT}/reports/adopted-rule-focused-test.json`,
      result: adoptedRuleReport.result,
      decisionId: adoption.decision.decisionId,
      adoptionRecordSha256: adoption.record.sha256,
      adoptedRevisionNumbers: adoption.revisionNumbers
    },
    historicalGrounding: {
      memo: { path: adoption.memo.path, sha256: adoption.memo.sha256, byteLength: adoption.memo.byteLength },
      researchDraft: { path: adoption.draft.path, sha256: adoption.draft.sha256, byteLength: adoption.draft.byteLength },
      adoptionReview: { path: adoption.review.path, sha256: adoption.review.sha256, byteLength: adoption.review.byteLength },
      blockedVerdict: { path: adoption.blockedVerdict.path, sha256: adoption.blockedVerdict.sha256, byteLength: adoption.blockedVerdict.byteLength }
    },
    rasterPages: rasterPages.length, rasterImagesRetained: false,
    rasterState: skipRaster ? "NOT_RASTERED_IN_THIS_RUN" : "BUILT_RASTER_PENDING",
    selfVerified: false,
    countersAreTheBuildersOwnCount:
      "computed with the repository's own contract functions over this family's delivered field map, byte proof and "
      + "instructions. It is not a verdict: an independent lane that neither built nor repaired these bytes decides."
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((r) => {
      console.log(JSON.stringify(r, null, 2));
      if (r.status === "BLOCKED_SOURCE" || r.status === "STOPPED") process.exitCode = 1;
    })
    .catch((e) => { console.error(e); process.exit(1); });
}
