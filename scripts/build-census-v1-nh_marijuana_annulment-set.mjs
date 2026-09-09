#!/usr/bin/env node
/**
 * The New Hampshire marijuana-possession annulment family —
 * `nh_marijuana_annulment-set`.
 *
 *   node scripts/build-census-v1-nh_marijuana_annulment-set.mjs [--check] [--no-raster]
 *
 * Three official New Hampshire Judicial Branch forms:
 *
 *   NHJB-3124-DS   Petition of Eligibility for Annulment of Record of Arrest or
 *                  Conviction for Personal Possession of Marijuana (3/4 oz. or
 *                  less), Offense Occurring Prior to September 16, 2017        — the filing
 *   NHJB-2311      Motion for Waiver of Filing Fee                             — the fee waiver
 *   NHJB-2328      Statement of Assets and Liabilities                         — what the waiver rests on
 *
 * The route is
 * `obligation:track-pathway:NH:nh_marijuana_annulment:marijuana-possession-annulment-under-rsa-651-5-b`,
 * RSA 651:5-b, on the judiciary's own marijuana form. The committed record is
 * explicit that these participants are NOT routed through the general annulment
 * forms: "Do not route these participants through the general annulment forms.
 * The judiciary has separate instructions and forms."
 *
 * FIVE THINGS ABOUT THIS PACKET SHAPED THE IMPLEMENTATION.
 *
 * First, THE PETITIONER SERVES THE PROSECUTOR ON THIS ROUTE, AND THE CLOCK RUNS
 * FROM RECEIPT. RSA 651:5-b puts the copy on the petitioner rather than on the
 * court, which is the opposite of the general rule at RSA 651:5, IX, and the
 * prosecutor's ten-day objection window runs from their receipt of it. That is a
 * step the packet has to build in rather than mention, so it is one of the
 * committed manifest's own components — prosecutor_copy, required — and it is
 * delivered as a named section of participant-instructions.md together with the
 * proof_of_service component the record recommends in every case.
 *
 * Second, THE STATUTORY STATEMENT IS THE PARTICIPANT'S AND ONLY THE
 * PARTICIPANT'S. RSA 651:5-b requires the petition to state that the amount was
 * three quarters of an ounce or less. The committed record lists that as a
 * manual completion item in terms: "LegalEase asks the question and never
 * answers it for them." Nothing in this build asserts an amount, and the sworn
 * verification block on page 2 that carries the assertion is delivered blank.
 *
 * Third, THE PACKET MAY NOT STATE A PRICE. The record's fee rule for this track
 * says RSA 651:5-b, unlike RSA 651:5-a, contains no fee provision and no
 * exemption, that whether the $125.00 filing fee and the $100 investigation fee
 * apply is an open question, and that "the packet must not state a price". So
 * the packet prints that sentence and the open question in the record's own
 * words and states no figure of its own. The fee-waiver papers are still
 * prepared, because the record names them for the case where a fee is charged.
 *
 * Fourth, ARREST OR CONVICTION, AND THE CASE DECIDES. The form carries one
 * check box, "Arrest — no conviction", beside a charge line the court has
 * already printed. The route reaches both an arrest-only participant and a
 * convicted one — the record's eligibleDispositions are "arrested" and
 * "convicted" — so the route does not settle that box; the participant's own
 * case does, and the platform has not seen it. It is left as a participant
 * election and disclosed by name.
 *
 * Fifth, THE OFFENCE DATE DECIDES ELIGIBILITY AND THE PLATFORM DOES NOT HOLD IT.
 * The section reaches only offences occurring before 16 September 2017, and the
 * record records as an open question whether the offence date or the arrest date
 * controls where the two straddle that line. The date is declared
 * REQUIRED_BEFORE_FILING, the cutoff is stated, and the open question is stated
 * rather than answered.
 *
 * Rasterization goes through scripts/raster/pdf-page-raster.mjs. Never Poppler.
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

const FAMILY_ID = "nh_marijuana_annulment-set";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const OUT = "data/rcap-all50/overlays/census-v1/nh/nh-marijuana-annulment-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-nh_marijuana_annulment-set.mjs";

/*
 * WHAT THE SOURCE ITSELF DRAWS INSIDE A FIELD, AND WHETHER IT MAY REACH THE FILING.
 *
 * Refusing to WRITE a field does not clear the appearance the source ships in
 * it. Two of these three forms ship one:
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
 * NHJB-3124 ships no such appearance and is handed an empty map, so it keeps the
 * structural default and is byte-unaffected.
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
   * packet set's own requiredBeforeFiling steps and its component conditions.
   * Both records are read and asserted to agree on everything the packet quotes.
   */
  trackRegistry: "data/record-clearing/legal-design-track-registry.json"
});
const MEMO_TRACK_ID = "nh_marijuana_annulment";
/*
 * The schedule the memo names in its own officialSources list.
 *
 * IT IS BOUND, AND THE PACKET STILL STATES NO PRICE. The record names the
 * Circuit Court Filing Fees schedule among this track's official sources, and
 * the same record says in terms that whether that schedule's fee applies to an
 * RSA 651:5-b petition is an open question and that the packet must not state a
 * price. Both facts are printed, in the record's own words, and no figure is
 * asserted.
 */
const FEE_SCHEDULE_TITLE_PREFIX = "Circuit Court Filing Fees";

const ROUTE = Object.freeze({
  jurisdiction: "NH",
  routeKeys: [
    "obligation:track-pathway:NH:nh_marijuana_annulment:marijuana-possession-annulment-under-rsa-651-5-b"
  ],
  routeKey: "obligation:track-pathway:NH:nh_marijuana_annulment:marijuana-possession-annulment-under-rsa-651-5-b",
  routeSelectionId: "nh-marijuana-annulment-set-nhjb-3124-2311-2328",
  publicLabel: "Petition to annul the record of an arrest or conviction for personal possession of three quarters of an ounce of marijuana or less, for an offence before 16 September 2017",
  authority: "RSA 651:5-b; RSA 651:5, X; RSA 651:5, XI; New Hampshire Judicial Branch forms NHJB-3124-DS, NHJB-2311 and NHJB-2328",
  /*
   * Each document names the identity the MASTER_QUEUE pins and the digest it
   * pins it by. Binding is by that exact digest, not by a path: the queue's own
   * paths for this family name custodies this container does not mount, and the
   * committed corpus index records the same digests in the Master Library.
   */
  documents: [
    { formNumber: "NHJB-3124", sourceId: "official-form:NHJB-3124-DS", pinnedSha256: "eee788220b7e624f0294d00b01024bff251d5d1dbfe61062c9a8f78fab58529c",
      title: "Petition of Eligibility for Annulment of Record of Arrest or Conviction for Personal Possession of Marijuana (3/4 oz. or less), Offense Occurring Prior to September 16, 2017", instrumentKind: "primary_filing" },
    { formNumber: "NHJB-2311", sourceId: "official-form:NHJB-2311", pinnedSha256: "f8b5df1366a91a9fd177612c0519f941b8d4f60e1f8f84c2a6c0c064ba7da58e",
      title: "Motion for Waiver of Filing Fee", instrumentKind: "fee_waiver_motion" },
    { formNumber: "NHJB-2328", sourceId: "official-form:NHJB-2328", pinnedSha256: "b4384b41efb472951c28b1289e46b05dfcc9463147aa490597f541f5291ce919",
      title: "Statement of Assets and Liabilities for Individuals and Sole Proprietors", instrumentKind: "fee_waiver_financial_statement" }
  ],
  /*
   * The four components this route names that are not a form binary. Each is a
   * process-guidance component in the committed packet-set manifest, and each is
   * delivered as a named section of participant-instructions.md rather than as a
   * document -- a guidance component that appears nowhere on a participant
   * surface is a component the packet claims and does not deliver. Two of them
   * exist only on this route: on the general annulment track the court serves
   * the prosecutor, and here the petitioner does.
   */
  guidanceComponents: [
    { role: "prosecutor_copy", heading: "The copy you send to the prosecutor" },
    { role: "proof_of_service", heading: "Keeping proof of what you sent, and when" },
    { role: "post_filing_instructions", heading: "What happens after you file, and the ten-day clock" },
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
    data: JSON.parse(bytes.toString("utf8"))
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
    "Petition of Eligibility for Annulment of the Record of Arrest or Conviction for Personal Possession of "
    + "Marijuana (RSA 651:5-b)");

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
 * The committed legal-design record holds seven selfHelpStopConditions for this
 * track. They are read here rather than restated, and every one of them is
 * printed verbatim: a stop condition paraphrased is a stop condition weakened,
 * and the two that carry a date or a statute cite -- 16 September 2017 and RSA
 * 651:5, XVII -- lose it in any paraphrase.
 *
 * TWO RECORDS, AND THEY MUST AGREE. The registry and the intake memo carry the
 * same track and this family binds both by SHA-256. Both are read and asserted
 * identical, so the packet cannot print seven sentences that only one of them
 * holds. A count that is not seven, or a disagreement between the two, stops the
 * build rather than shipping a shortened list.
 */
const SELF_HELP_STOP_CONDITIONS_EXPECTED = 7;

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
 * On this route the answer is the opposite of the general annulment track's, and
 * that difference is the reason the record makes prosecutor_copy a required
 * component: RSA 651:5-b puts the copy of the petition on the PETITIONER rather
 * than on the court, and the prosecutor's ten-day objection window runs from
 * their receipt of it. Both sentences are read here rather than restated, from
 * the same two records the fee and the stop conditions are read from, and both
 * must agree. An emptied or reworded rule stops the build.
 *
 * WHAT IT DOES NOT LICENCE. The participant serving the prosecutor does not make
 * NHJB-2328's certificate of service something this build may complete: a
 * certificate of mailing is signed on the day the copy goes out and never
 * before, so the box stays blank whatever the service rule says. The
 * certificate's disposition in the dictionary below quotes this record's service
 * sentence and is asserted against it here, so the two cannot drift apart.
 */
const SERVICE_SENTENCE_QUOTED_IN_THE_DICTIONARY =
  "By the petitioner, not the court. This differs from the general rule under RSA 651:5, IX.";

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
 *   NHJB-2317 "Mailing Address.2"  (prints City/Town)   -> participant.street_address
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
 * fixtures contradict, and the paper showed it: NHJB-2317 printed an address
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
   * NHJB-3124-DS, the marijuana petition. Two pages: the petition on page 1, and
   * on page 2 the sworn verification, the counsel block, a COURT COMPLETES
   * block, the printed NOTICE TO PETITIONER that states the prosecutor's ten-day
   * objection window, and the court's certificate of annulment.
   *
   * THE CHARGE IS ALREADY PRINTED, WHICH IS WHY THERE IS NO RSA BOX. The court
   * has printed "Possession of ¾ ounce or less of marijuana" on the charge line
   * itself; the form asks for no RSA and no charge description because the
   * section reaches exactly one offence. What it does ask for is the offence
   * date -- which decides eligibility against the 16 September 2017 cutoff --
   * the date of conviction if there was one, the charge degree, and a
   * description of the sentence.
   *
   * THE COURT COMPLETES BLOCK CARRIES NO WIDGETS. "Date sent to Prosecutor",
   * "Sent by (initials)" and "Name of Prosecutor" are printed rules with nothing
   * over them, as are every line of the certificate of annulment and the CC
   * list. They are recorded in build-findings.json rather than passed over.
   */
  "NHJB-3124": {
    /* --- The caption ----------------------------------------------------- */
    "court.district/su": {
      section: "Caption", label: "Court Name (selection)", selection: true,
      ...ELECTION("New Hampshire prints every circuit-court district division and every superior court in this list. On this route the record's venue is broader than the general rule — “The court in which the person was convicted or arrested” — so an arrest-only participant may file where the arrest happened, and which court that is is a fact about your case the platform does not hold")
    },
    case: { section: "Caption", label: "Case Name, as the court styles it", ...SUPPLY("the case name exactly as the court writes it, which for a New Hampshire criminal case is usually The State of New Hampshire v. your name; copy it from a paper the court sent you. If you were arrested and never charged, ask the clerk what to write here") },
    "case number": { section: "Caption", label: "Case Number", ...WRITE("matter.case_number") },
    ChargeID: { section: "Caption", label: "Charge ID, if known", ...SUPPLY("the Charge ID the court or the police gave this charge, if you know it. The form says 'if known' and does not require it") },

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
     * The form says PLEASE COMPLETE A SEPARATE FORM FOR EACH OFFENSE, and it
     * prints the charge for you. The offence date is the cell that decides
     * whether this route is open at all, and the platform does not hold it. */
    cb1: {
      section: "Charge Information", selection: true, label: "Arrest with no conviction (selection)",
      ...ELECTION("the form prints the charge and asks you to say whether this was an arrest with no conviction. RSA 651:5-b reaches both an arrest and a conviction, so the route does not answer this; your own case does, and the platform has not seen it")
    },
    "Date.2": { section: "Charge Information", label: "Offense Date", ...SUPPLY("the date the offence happened, from the court or arrest record. This is the date that decides whether this route is open to you at all: RSA 651:5-b reaches only offences occurring BEFORE 16 September 2017. Do not estimate it") },
    "Date.3": { section: "Charge Information", label: "Date of Conviction", ...SUPPLY("the date you were convicted, from the court record. Leave it blank if you were arrested and never convicted") },
    offense: { section: "Charge Information", label: "Charge Degree at Conviction", ...SUPPLY("the degree of the charge as you were convicted of it, exactly as the court record states it. Leave it blank if you were arrested and never convicted") },
    "tr.disposition": { section: "Charge Information", label: "Description of Sentence and Date Sentence Completed", ...SUPPLY("the sentence the court imposed, described from the court record, and the date every term and condition of it was completed. Leave it blank if you were arrested and never convicted") },

    /* --- Signature -------------------------------------------------------- *
     * The verification on page 2 swears both that the facts are true and that
     * the amount was three quarters of an ounce or less. The committed record
     * lists that statement as the participant's own, in terms. */
    DefDate: { section: "Signature", label: "Date you sign, entered at signature", ...PROTECT(SIGNATURE, "the date is part of the sworn verification block and is entered when you sign") },
    "DEFsig.8": { section: "Signature", label: "Applicant's Signature", ...PROTECT(SIGNATURE, "you swear or affirm under penalties of law — including that the amount of marijuana was three quarters of an ounce or less — and sign this yourself. The committed record says so in terms: LegalEase asks the question and never answers it for you") },
    Counsel: { section: "Signature", label: "Name of Counsel", ...ATTORNEY("attorney-only; no attorney-representation fact is held for this participant") },
    "Attysig.8": { section: "Signature", label: "Counsel's Signature", ...ATTORNEY("attorney-only; no attorney-representation fact is held for this participant") },
    "Counsel Mailing Address1": { section: "Signature", label: "Counsel's Address, first line", ...ATTORNEY("attorney-only; no attorney-representation fact is held for this participant") },
    "Counsel Mailing Address2": { section: "Signature", label: "Counsel's Address, second line", ...ATTORNEY("attorney-only; no attorney-representation fact is held for this participant") },

    /* --- Page 2 header ----------------------------------------------------- */
    case1: { section: "Page Header", label: "Case Name repeated in the page header", ...SUPPLY("the same case name as the caption, repeated in the header of page 2") },
    "case number1": { section: "Page Header", label: "Case Number repeated in the page header", ...WRITE("matter.case_number") },

    /* --- Viewer controls --------------------------------------------------- */
    "Clear Form - multi": { section: "Viewer Controls", label: "Clear this form (viewer control)", ...VIEWER("a button in the PDF viewer, not a place anything is filed") },
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

    "cbcert.1": { section: "Certificate of Service", selection: true, label: "Certificate of service \u2014 certifying you sent a copy on the date you sign (selection)", ...PROTECT(SIGNATURE, "on this route you DO send a copy to the prosecutor \u2014 the record's rule is \u201cBy the petitioner, not the court. This differs from the general rule under RSA 651:5, IX.\u201d \u2014 and that is exactly why this box stays blank here: a certificate of service is signed and dated on the day the copy actually goes out, and a packet that ticked it in advance would be certifying a mailing that has not happened. You complete it yourself when you send the copy") },
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
 * already writes elsewhere -- participant.street_address on NHJB-2317,
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
 * NHJB-2317, because those widgets declare /MaxLen 17 and 15 and the boundary
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
 * and delivers every component the manifest names, so a component that exists
 * only in the manifest cannot quietly go undelivered and a prerequisite the
 * record states cannot be replaced by prose this file remembers.
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

  /*
   * The packet instructions the record attaches to this track. One of them is a
   * sentence the participant is directly better off having -- the RSA 651:5,
   * X(f) question form -- and the record says so in terms. All of them are
   * printed verbatim.
   */
  const packetInstructions = (track.packetInstructions ?? []).map((x) => String(x).trim()).filter(Boolean);
  assert.ok(packetInstructions.length > 0,
    `${GROUNDING_RECORDS.trackRegistry} track ${MEMO_TRACK_ID} carries no packetInstructions`);

  return { record: registry, set, steps, components, packetInstructions, version: set.version ?? null };
}

/**
 * The record's own reason for a manual completion item, found by the item's own
 * name.
 *
 * IT IS ASSERTED NON-EMPTY, and the reason is a delivered defect this build
 * shipped once: the first run looked for the item text in the WHY field, found
 * nothing, and printed an empty pair of quotation marks on the participant
 * surface -- a quotation of nothing, presented as the record speaking. A
 * sentence the packet cannot find is a build failure, never an empty quote.
 */
function manualCompletionReason(fee, itemPattern) {
  const rows = (fee.track.manualCompletionItems ?? []).filter((m) => itemPattern.test(String(m.item ?? "")));
  assert.equal(rows.length, 1,
    `${GROUNDING_RECORDS.memo} track ${MEMO_TRACK_ID} carries ${rows.length} manual completion item(s) matching `
    + `${itemPattern}; the packet quotes exactly one and will not quote a sentence it cannot find`);
  const why = String(rows[0].why ?? "").trim();
  assert.ok(why.length > 0,
    `${GROUNDING_RECORDS.memo} track ${MEMO_TRACK_ID} manual completion item "${rows[0].item}" carries no reason, so `
    + "the packet cannot quote one");
  return why;
}

/** One manifest component, by role, so the packet can quote its own note. */
function componentNote(fee, role) {
  const row = (fee.track.components ?? []).find((c) => c.role === role);
  assert.ok(row && typeof row.notes === "string" && row.notes.trim(),
    `${GROUNDING_RECORDS.memo} track ${MEMO_TRACK_ID} carries no notes for the ${role} component, so the packet cannot deliver it`);
  return row.notes.trim();
}

function participantInstructions(maps, rbf, unfittableItems, fee, stops, SERVICE, packetSet, openQuestions) {
  const byDoc = new Map();
  for (const i of rbf) byDoc.set(i.document, [...(byDoc.get(i.document) ?? []), i]);
  const elections = maps.flatMap((m) => m.selectionControls.map((c) => ({ document: m.formNumber, ...c })));

  const out = [];
  out.push(`# Filing instructions — ${ROUTE.publicLabel}`, "");
  out.push(
    "This packet is three New Hampshire Judicial Branch forms:", "",
    "- **NHJB-3124-DS**, _Petition of Eligibility for Annulment of Record of Arrest or Conviction for Personal Possession of Marijuana (3/4 oz. or less), Offense Occurring Prior to September 16, 2017_ — what you file.",
    "- **NHJB-2311**, _Motion for Waiver of Filing Fee_ — file it with the petition if a fee is charged and you cannot pay it.",
    "- **NHJB-2328**, _Statement of Assets and Liabilities_ — the motion above says you have completed this, so it is filed with it.", "",
    `All three are prepared for one route — **${ROUTE.publicLabel}** — under ${ROUTE.authority}.`, ""
  );

  out.push("## Which route this packet is built for", "");
  out.push(
    "This packet proceeds under **RSA 651:5-b**, the marijuana-possession section, on the judiciary's own marijuana "
    + "form:", ""
  );
  for (const routeKey of ROUTE.routeKeys) out.push(`- \`${routeKey}\``);
  out.push("");
  out.push(
    "The committed record is explicit that this is a separate route with separate papers, and says so in terms: "
    + `“${packetSet.packetInstructions[0]}” It is not the general annulment route under RSA 651:5, and this packet `
    + "is not the general annulment packet.", ""
  );
  out.push(
    "**Two things decide whether this route is open to you, and the platform holds neither.** The offence must have "
    + "happened **before 16 September 2017**, and the amount must have been **three quarters of an ounce or less**. "
    + "The date is a fact on your court or arrest record and it is left blank for you to fill in. The amount is a "
    + "statement RSA 651:5-b requires the petition to make, and it is sworn — the record says of it, in terms: "
    + `“${manualCompletionReason(fee, /three quarters of an ounce/i)}”`, ""
  );

  out.push(
    "The platform filled in what it holds about you and your case: your name, your date of birth, your street "
    + "address, your city or town, your state, your ZIP code, your e-mail, and your telephone number and the case "
    + "number **wherever the form's own box is long enough to hold them**. Everything else is yours, and every one of "
    + "those blanks is listed below by the form and the section it is in.", ""
  );
  if (unfittableItems.length > 0) {
    out.push("## Boxes the form itself is too short to hold", "");
    out.push(
      "New Hampshire sets a character limit on some of these boxes in the form file itself, and where the value the "
      + "platform holds is longer than the limit **the box is delivered blank rather than shortened**. A case number or "
      + "a telephone number that has been cut to fit reads as a whole one, and on a court filing that is worse than an "
      + "empty box. **Check every box named here on your own packet, and write the value in by hand if it is blank.**", ""
    );
    out.push("| Form | Section | The box | The form's limit |", "| --- | --- | --- | --- |");
    for (const i of unfittableItems) {
      out.push(`| ${i.document} | ${i.section} | ${i.disclosureLabel} | ${i.declaredMaxLength} characters |`);
    }
    out.push("");
  }

  out.push("## One offence, one petition", "");
  out.push(
    "NHJB-3124 says it in capitals: **PLEASE COMPLETE A SEPARATE FORM FOR EACH OFFENSE.** If you are asking the court "
    + "to annul more than one matter, you need one petition for each. This packet prepares one.", ""
  );

  out.push("## What the record says must be done before this is filed", "");
  out.push(
    `The committed packet-set manifest for this route names ${packetSet.steps.length} steps that come before filing. `
    + "They are printed here in that record's own words.", ""
  );
  for (const step of packetSet.steps) out.push(`- ${step}`);
  out.push("");

  out.push("## Where you file this", "");
  out.push(
    `File the petition with the **${fee.track.destination.name}**. The record states the filing rule in its own `
    + `words: “${fee.track.rules.filing}” and the venue: “${fee.track.geography.venue}” That venue is wider than the `
    + "general annulment rule, which matters if you were arrested and never charged. This packet does not state a "
    + "courthouse address, because the platform holds no court directory and an unsourced address in a filing "
    + "instruction is worse than none.", ""
  );

  /* ---- prosecutor_copy: a required component of this packet set ----------- */
  out.push(`## ${ROUTE.guidanceComponents.find((g) => g.role === "prosecutor_copy").heading}`, "");
  out.push(
    "**On this route you send the copy, not the court.** That is the opposite of the general annulment rule, and it "
    + `is the single most important difference in this packet. The record states it: “${SERVICE.service}” and it `
    + `explains what follows: “${SERVICE.notice}”`, ""
  );
  out.push("The committed record makes this its own required component and describes it:", "",
    `> ${componentNote(fee, "prosecutor_copy")}`, "");
  out.push(
    "So: when you file the petition with the clerk, **also furnish a copy to the office of the prosecutor of the "
    + "underlying offence.** Nothing in this packet is sent for you, and the packet does not name a prosecutor's "
    + "office or an address, because the platform holds no sourced New Hampshire prosecutor directory — ask the clerk "
    + "where the copy goes.", ""
  );

  /* ---- proof_of_service --------------------------------------------------- */
  out.push(`## ${ROUTE.guidanceComponents.find((g) => g.role === "proof_of_service").heading}`, "");
  out.push(`> ${componentNote(fee, "proof_of_service")}`, "");
  out.push(
    "The statute requires you to furnish the copy and does not prescribe how you prove it, so nothing here is a "
    + "required form. Keep a short record of **when** and **how** the copy went to the prosecutor — a dated note, a "
    + "posting receipt, a delivery confirmation — because the ten-day objection window runs from their receipt and "
    + "you may need to show it has run.", ""
  );
  out.push(
    "**The certificate of service on NHJB-2328 is delivered blank and stays blank until you send something.** A "
    + "certificate of service is signed and dated on the day the copy actually goes out; a packet that ticked it in "
    + "advance would be certifying a mailing that has not happened.", ""
  );

  out.push("## What it costs", "");
  out.push(
    "**This packet does not state a price for this petition, and that is deliberate.** The record's own fee rule for "
    + `this route says so: “${fee.fees}”`, ""
  );
  /*
   * THE SCHEDULE IS NAMED AND ITS FIGURE IS NOT REPEATED.
   *
   * The record lists the fee schedule among this track's official sources, and
   * that source's TITLE carries the general petition's figure inside it. Quoting
   * the title here would put a price on this packet's participant surface by the
   * back door, on a route whose own fee rule says the packet must not state one.
   * So the schedule is named by the prefix this build already asserts against
   * its title, and located by its URL and retrieval date, and the figure is left
   * where the record put it.
   */
  out.push(
    `The record does name a schedule among this route's sources — the ${FEE_SCHEDULE_TITLE_PREFIX} schedule, read at `
    + `${fee.schedule.url} on ${fee.schedule.retrievedOn} — but that schedule sets a fee for the GENERAL petition to `
    + "annul a criminal record, and whether it reaches an RSA 651:5-b petition is one of the open questions below, not "
    + "something this packet may decide. Its figure is deliberately not repeated here. **Ask the clerk what you will "
    + "be charged before you pay.**", ""
  );
  out.push(
    `**If a fee is charged and you cannot pay it.** The record names the papers to file instead: “${fee.feeWaiver}” `
    + "Both are prepared in this packet.", ""
  );
  out.push(
    "**A note about the fee-waiver form's court list.** NHJB-2311's only court control is a list of SUPERIOR courts, "
    + "while NHJB-3124's own dropdown carries every circuit-court district division and every superior court. If your "
    + "case is in a circuit court district division, that list cannot name your court, so write the court's name on "
    + "the form by hand. This packet will not choose a superior court you are not in.", ""
  );

  out.push("## Questions the record has not settled", "");
  out.push(
    "The committed legal-design record for this route records "
    + `${openQuestions.releaseBlockers.length} question${openQuestions.releaseBlockers.length === 1 ? "" : "s"} it `
    + "read and could not resolve. This packet states them rather than answering them, in the record's own words, "
    + "because an invented answer in a filing instruction is worse than an admitted gap:", ""
  );
  for (const q of openQuestions.releaseBlockers) out.push(`- ${q.question}`);
  out.push("");
  out.push(
    "The second of those is why this packet prints no price. The others go to whether this route is open to you at "
    + "all, which is a question for a lawyer licensed in New Hampshire and not for this packet.", ""
  );

  out.push("## What you must do before you file", "");
  out.push("1. **Get the offence date from the court or arrest record.** RSA 651:5-b reaches only offences occurring before 16 September 2017. It is the first thing that decides whether this route is open to you, and this packet leaves it blank because it does not hold it.");
  out.push("2. **Fill in every item in the tables below.** Each names the form, the section and the blank.");
  out.push("3. **Say whether this was an arrest with no conviction.** The form carries one box for it beside the charge line the court has already printed. The section reaches both an arrest and a conviction, so only you can answer it.");
  out.push("4. **Read the sworn verification on page 2 before you sign it.** You are swearing that the facts are true AND that the amount of marijuana was three quarters of an ounce or less. This packet does not assert an amount for you and never will.");
  out.push("5. **Sign and date the petition yourself.** Both the Date and the Applicant's Signature boxes are delivered empty.");
  out.push("6. **Furnish a copy of the petition to the prosecutor's office and keep proof of when and how you sent it.** See the two sections above; on this route the clock runs from their receipt.");
  out.push("7. **Complete the signature blocks on the waiver papers yourself.** On NHJB-2311 and NHJB-2328 the whole block — name, address, city, state, zip, telephone, e-mail, signature and date — is completed by the filer at the moment of signing, and New Hampshire names every box in it sig.N, so none of it is filled in for you.");
  out.push("8. **Add up the three totals on NHJB-2328 yourself.** Each of the three Total $ lines — weekly take-home in item 12, money presently available in item 13, and monthly household expenses in item 14 — is blank in this packet, and the lines that feed it are blank too. The blank form New Hampshire publishes ships those three totals already set to 0.00; this packet removes them, because a zero total for your income, your available money and your expenses is an answer, and it would be sworn in your name on a statement you sign under penalty of perjury. Write the real figures, and the real totals.");
  out.push("9. **Sign NHJB-2311 by writing /s/ and then your name.** The blank form carries \"Enter /s/ before name\" inside the signature box as grey placeholder text for someone typing into it on a computer. This packet delivers that box empty, so the line is clear for your signature. If you are filing electronically, type /s/ followed by your name; if you are filing on paper, sign it.");
  out.push("");

  for (const [doc, items] of byDoc) {
    const title = ROUTE.documents.find((d) => d.formNumber === doc)?.title ?? doc;
    out.push(`## ${doc} — ${title}: the items you must supply`, "");
    out.push("| Section | The blank on the form | What to write |", "| --- | --- | --- |");
    for (const i of items) out.push(`| ${i.section} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## The choices that are yours", "");
  out.push("| Form | Section | The choice | Why it is yours |", "| --- | --- | --- | --- |");
  for (const c of elections) out.push(`| ${c.document} | ${c.sectionHeading} | ${c.effectiveLabel} | ${c.reason} |`);
  out.push("");

  out.push("## What the platform deliberately left blank", "");
  out.push("- **Your signature and the date beside it, on every form that has one.** You sign them yourself, on the day you sign.");
  out.push("- **The statement that the amount was three quarters of an ounce or less.** It is sworn, it is yours, and this packet asks the question and never answers it.");
  out.push("- **The whole signature block on NHJB-2311 and NHJB-2328** — name, address, city, state, zip, telephone and e-mail. New Hampshire names every box in that block sig.N, and the block is completed at signing.");
  out.push("- **The certificate of service box on NHJB-2328.** You do serve the prosecutor on this route — which is exactly why this box stays blank until you have actually sent the copy.");
  out.push("- **The counsel blocks.** You are filing this yourself; no attorney-representation fact is held for you.");
  out.push("- **Everything in the COURT COMPLETES block and the certificate of annulment on page 2 of NHJB-3124** — the date sent to the prosecutor, the initials of who sent it, the name of the prosecutor, the order, the certificate, the denial reasons, the judge's signature and printed name, and the whole CC list. Those are the court's, and on this form they are printed rules with no fillable box over them at all.");
  out.push("- **The ruling section marked FOR COURT USE ONLY on page 2 of NHJB-2311.** The Case Name and Case Number headers above it are case captions: copy the case name into that printed header; its held case number is filled in above the court section.");
  out.push("");

  out.push(`## ${ROUTE.guidanceComponents.find((g) => g.role === "post_filing_instructions").heading}`, "");
  out.push(`> ${componentNote(fee, "post_filing_instructions")}`, "");
  out.push(
    "The form prints the same warning on page 2 under NOTICE TO PETITIONER. In short: **diary ten days from the day "
    + "the prosecutor receives your copy.** If no timely objection is made, the court shall grant the petition. If "
    + "the prosecutor does object, there is a hearing, and at it the prosecutor must prove beyond a reasonable doubt "
    + "that the amount exceeded three quarters of an ounce. A prosecutor objection is one of the points below where "
    + "self-help ends.", ""
  );

  out.push("## Where self-help ends", "");
  out.push(
    "This packet prepares three official forms; it decides nothing. The committed legal-design record for this route "
    + "names the points where preparing your own papers stops being enough, and it names "
    + `${stops.conditions.length} of them. They are set out below in that record's own words. If any one of them `
    + "describes your case, stop here and get advice from a **lawyer licensed in New Hampshire** before you file. "
    + "The clerk of the court can tell you what the court requires procedurally, but a clerk cannot give you legal "
    + "advice. This packet does not name a legal-aid organisation or a referral line, for the same reason it prints "
    + "no courthouse address: the platform holds no sourced New Hampshire directory, and an invented one in a filing "
    + "instruction is worse than none.", ""
  );
  for (const condition of stops.conditions) out.push(`- ${condition}`);
  out.push("");
  if (stops.boundaries.length > 0) {
    const extra = stops.boundaries.filter((b) => !stops.conditions.includes(b));
    if (extra.length > 0) {
      out.push("The same record names what is the court's to decide and nobody else's:", "");
      for (const boundary of extra) out.push(`- ${boundary}`);
      out.push("");
    }
  }

  out.push(`## ${ROUTE.guidanceComponents.find((g) => g.role === "effect_and_limits_disclosure").heading}`, "");
  out.push(`> ${componentNote(fee, "effect_and_limits_disclosure")}`, "");
  out.push(
    "The record also gives the only question anyone may put to you about an annulled record, and it is worth having "
    + `in the record's own words: “${packetSet.packetInstructions.find((x) => x.includes("651:5, X(f)")) ?? ""}”`, ""
  );
  out.push(
    "And the limits the record sets against this route, in its own words:", ""
  );
  for (const restriction of fee.track.scopeRestrictions ?? []) out.push(`- ${restriction}`);
  out.push("");
  out.push(
    "This packet does not decide whether you are eligible, does not file anything for you, does not send the copy to "
    + "the prosecutor for you, and does not take payment.", ""
  );
  out.push(`_Route: ${ROUTE.routeKey} — ${ROUTE.authority}_`);
  return `${out.join("\n")}\n`;
}

/**
 * The filing instructions, as their own document. Same records, same sentences,
 * no new claims.
 */
function filingInstructions(fee, SERVICE, packetSet, openQuestions) {
  const out = [];
  out.push(`# Filing instructions — ${FAMILY_ID}`, "");
  out.push(`**Route.** ${ROUTE.publicLabel}, under ${ROUTE.authority}.`, "");
  for (const routeKey of ROUTE.routeKeys) out.push(`- \`${routeKey}\``);
  out.push("");
  out.push("**What is in the packet.**", "");
  for (const d of ROUTE.documents) out.push(`- ${d.formNumber} — ${d.title} (${d.instrumentKind})`);
  out.push("");
  out.push(`**Where.** ${fee.track.rules.filing}`, "");
  out.push(`The destination is the ${fee.track.destination.name}. ${fee.sharedFee}`, "");
  out.push(`**Venue.** ${fee.track.geography.venue}`, "");
  out.push(`**Fees.** ${fee.fees}`, "");
  out.push(`**Waiver.** ${fee.feeWaiver}`, "");
  out.push(`**Service — by the petitioner on this route.** ${SERVICE.service}`, "");
  out.push(`**Notice.** ${SERVICE.notice}`, "");
  out.push(`**Signature.** ${fee.track.rules.participantSignature}`, "");
  out.push(`**Notarization.** ${fee.track.rules.notarization}`, "");
  out.push("");
  out.push("**Before filing, the committed record requires:**", "");
  for (const step of packetSet.steps) out.push(`- ${step}`);
  out.push("");
  out.push("**The record's own packet instructions for this route:**", "");
  for (const instruction of packetSet.packetInstructions) out.push(`- ${instruction}`);
  out.push("");
  out.push("**Open questions the record has not settled, and which this packet does not answer:**", "");
  for (const q of openQuestions.releaseBlockers) out.push(`- ${q.question}`);
  out.push("");
  out.push(
    "Do not complete the judge's order, the certificate of annulment, the date sent to the prosecutor, the sender's "
    + "initials, the name of the prosecutor, the participant's signature, the signature date or the certificate of "
    + "service in advance. Every one of them is delivered blank, and the certificate of service is signed on the day "
    + "the copy actually goes out.", ""
  );
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
  const source = { formNumber: "NHJB-3124", instrumentKind: "primary_filing", title: "SYNTHETIC REFUSAL TEST",
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
  const openQuestions = loadOpenQuestions(fee.record);
  const instructions = participantInstructions([map], required, required, fee, stops, service, packetSet, openQuestions);
  const filing = filingInstructions(fee, service, packetSet, openQuestions);
  assert.ok(instructions.includes(service.service) && instructions.includes(service.notice));
  assert.ok(filing.includes(service.service) && filing.includes(service.notice));
  assert.ok(instructions.includes("wherever the form's own box is long enough to hold them"));
  for (const r of required) assert.ok(instructions.includes(r.disclosureLabel));

  /*
   * THIS PACKET MUST NOT STATE A PRICE, and the record says so in terms. The
   * assertion is on the DELIVERED prose: no dollar figure may appear in either
   * instruction document except inside a sentence the record itself wrote.
   */
  const recordSentences = [fee.fees, fee.feeWaiver, fee.sharedFee, fee.track.rules.filing,
    ...packetSet.steps, ...openQuestions.releaseBlockers.map((q) => q.question)];
  for (const [name, document] of [["participant-instructions.md", instructions], ["filing-instructions.md", filing]]) {
    let stripped = document;
    for (const sentence of recordSentences) stripped = stripped.split(sentence).join(" ");
    const figures = stripped.match(/\$\s?[0-9][0-9,.]*/g) ?? [];
    assert.deepEqual(figures, [],
      `${name} states a price of its own (${figures.join(", ")}); the record says this packet must not state one`);
  }

  /* A quotation of nothing is a sentence the packet could not find, presented
   * as the record speaking. It shipped once; it never ships again. */
  for (const [name, document] of [["participant-instructions.md", instructions], ["filing-instructions.md", filing]]) {
    assert.ok(!/\u201c\s*\u201d/.test(document), `${name} carries an empty quotation`);
    assert.ok(!/>\s*$/m.test(document.replace(/\r/g, "")), `${name} carries an empty block quotation`);
  }
  assert.ok(instructions.includes(manualCompletionReason(fee, /three quarters of an ounce/i)),
    "participant-instructions.md must carry the record's own reason for the three-quarters-of-an-ounce statement");

  for (const [name, sentence] of [["fees", fee.fees], ["feeWaiver", fee.feeWaiver]]) {
    assert.ok(instructions.includes(sentence), `participant-instructions.md must carry the record's ${name} sentence`);
    assert.ok(filing.includes(sentence), `filing-instructions.md must carry the record's ${name} sentence`);
  }
  for (const step of packetSet.steps) {
    assert.ok(instructions.includes(step), `participant-instructions.md must carry the required-before-filing step: ${step.slice(0, 60)}`);
    assert.ok(filing.includes(step), `filing-instructions.md must carry the required-before-filing step: ${step.slice(0, 60)}`);
  }
  for (const condition of stops.conditions) {
    assert.ok(instructions.includes(condition), `participant-instructions.md must carry the stop condition: ${condition.slice(0, 60)}`);
  }
  for (const q of openQuestions.releaseBlockers) {
    assert.ok(instructions.includes(q.question) && filing.includes(q.question),
      `both instruction documents must state the open question: ${q.question.slice(0, 60)}`);
  }
  for (const instruction of packetSet.packetInstructions) {
    assert.ok(filing.includes(instruction), `filing-instructions.md must carry the packet instruction: ${instruction.slice(0, 60)}`);
  }
  for (const routeKey of ROUTE.routeKeys) {
    assert.ok(instructions.includes(routeKey) && filing.includes(routeKey), `both instruction documents must name ${routeKey}`);
  }
  for (const guidance of ROUTE.guidanceComponents) {
    assert.ok(instructions.includes(`## ${guidance.heading}`), `participant-instructions.md must deliver the ${guidance.role} component`);
    assert.ok(instructions.includes(componentNote(fee, guidance.role)),
      `participant-instructions.md must carry the record's own note for the ${guidance.role} component`);
  }
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
   * fee: a record that stopped holding the eight stop conditions stops the build
   * rather than producing a packet that quietly omits them again. */
  const stops = loadSelfHelpStops(fee.record);

  /* Bound before anything is composed, for the same reason as the fee and the
   * stop conditions: the packet states who is served in the record's words or
   * the build stops. On this route that sentence is a step the participant has
   * to take, not a reassurance. */
  const service = loadServiceRule(fee.record);

  /* The committed packet set: the components this family is measured against,
   * the steps the record puts before filing, and the record's own packet
   * instructions. A manifest that no longer names a component this build
   * renders, or names a guidance component this build does not print, stops the
   * family. */
  const packetSet = loadPacketSet();

  /* The questions the record read and could not resolve. Bound before anything
   * is composed: the packet states them rather than printing around them, and
   * one of them is the reason this packet prints no price. */
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
   * lane's disposal rule. What survives is the MEASUREMENT and the exact digests
   * of the PDFs those images were rendered from, which is what the central
   * raster-acceptance workflow re-renders against. Recording a measurement is
   * not a visual review and this lane does not claim one.
   */
  const rasterStage = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-nh-marijuana-annulment-raster-"));

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
  const instructionsText = participantInstructions(maps, rbf, unfittableItems, fee, stops, service, packetSet, openQuestions);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);
  const filingText = filingInstructions(fee, service, packetSet, openQuestions);
  fs.writeFileSync(path.join(ROOT, OUT, "filing-instructions.md"), filingText);

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID, worklistGroupId: FAMILY_ID,
    jurisdiction: ROUTE.jurisdiction, implementationStrategy: "official_pdf_fill",
    custodyClass: "SOURCE_ALREADY_HELD", acquisitionCommissioned: false,
    corpusRootFromEnvironment: "MASTER_LIBRARY_SOURCE_DIR",
    bindingMethod:
      "the SHA-256 the assignment pins, resolved to the committed corpus index entry that carries it in a custody this "
      + "container mounts, then re-hashed from the file on disk before a byte was read. The form number is recorded, "
      + "not used to resolve: the assignment's own paths for these three sources are in custodies this container does "
      + "not hold, and the digest is what makes the Master Library copy the same binary rather than a substitute.",
    custodyTheAssignmentNames: "d_source_packs, not mounted here",
    custodyActuallyRead: "master_library",
    routeKey: ROUTE.routeKey, routeKeys: ROUTE.routeKeys,
    routeSelectionId: ROUTE.routeSelectionId, statutoryAuthority: ROUTE.authority,
    allSourcesExact: true,
    /*
     * The registry entry that says what each source's own in-field appearance
     * MEANS, and the committed sibling receipt that proves the entry describes
     * these exact bytes. Recorded here because the packet's refusal to ship the
     * NHJB-2311 signature placeholder and the three zeroed NHJB-2328 totals
     * rests on it.
     */
    appearanceDispositionProvenance: appearanceProvenance,
    documents: resolved.map((r) => ({
      sourceIds: [r.sourceId], documentId: r.formNumber, formNumber: r.formNumber, revision: r.revision,
      pathInArchive: r.pathInArchive, sha256: r.sha256, byteLength: r.byteLength, instrumentKind: r.instrumentKind
    })),
    /*
     * The three binaries above are what the packet is RENDERED from. This record
     * is what the packet's cost and waiver sentences are QUOTED from, and it is
     * bound the same way and for the same reason: so a reader can check the
     * sentence against the bytes it came out of.
     */
    groundingRecords: [
      {
        path: fee.record.path, sha256: fee.record.sha256, byteLength: fee.record.byteLength,
        trackId: MEMO_TRACK_ID,
        fieldsQuotedOnParticipantSurfaces: ["rules.fees", "rules.feeWaiver", "destination.detail", "rules.service", "rules.notice"],
        whyItIsBound:
          "participant-instructions.md and filing-instructions.md quote this track's fee sentence -- which is the "
          + "sentence that FORBIDS this packet from stating a price -- its waiver papers, its filing rule, its venue, "
          + "its scope restrictions, its manual-completion reason for the three-quarters-of-an-ounce statement, and "
          + "the prosecutor_copy, proof_of_service, post_filing_instructions and effect_and_limits_disclosure "
          + "component notes as the four guidance components the manifest names. Every one of those sentences is the "
          + "record's, not this file's, and the build stops if the record stops holding one."
      },
      {
        path: stops.record.path, sha256: stops.record.sha256, byteLength: stops.record.byteLength,
        trackId: MEMO_TRACK_ID,
        fieldsQuotedOnParticipantSurfaces: [
          "selfHelpStopConditions", "selfHelpBoundaries", "rules.service", "rules.notice",
          "packetSet.requiredBeforeFiling", "packetInstructions", "unresolvedQuestions"
        ],
        selfHelpStopConditionsCarriedVerbatim: stops.conditions.length,
        packetSetRequiredBeforeFilingStepsCarriedVerbatim: packetSet.steps.length,
        releaseBlockingOpenQuestionsCarriedVerbatim: openQuestions.releaseBlockers.length,
        packetSetVersion: packetSet.version,
        whyItIsBound:
          "participant-instructions.md prints all " + stops.conditions.length + " of this track's self-help stop "
          + "conditions word for word, both instruction documents print all " + packetSet.steps.length + " of the "
          + "committed packet set's requiredBeforeFiling steps and all "
          + openQuestions.releaseBlockers.length + " of its release-blocking open questions, and the build asserts "
          + "every count before printing any of them. The service and notice sentences matter more on this route than "
          + "on any other New Hampshire track, because RSA 651:5-b puts the copy to the prosecutor on the petitioner: "
          + "the intake memo and the registry must agree on both before either is printed."
      }
    ],
    sourceBinaryCommitted: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1", familyId: FAMILY_ID,
    captionBasis:
      "Every label here was written by reading the printed line at the widget's own rectangle in the pinned binary. "
      + "These three forms extract cleanly, so that reading was possible; it is not claimed as an automated caption "
      + "check, because several boxes are NAMED for the line above them rather than for what they collect -- NHJB-2317's "
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
      + "than for what they collect -- NHJB-2317's City/Town box is named Mailing Address.2, and NHJB-2956's four "
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
      "The packet states the route it was built for, on its own participant surface and under its own heading: "
      + "annulment of the record of an arrest or conviction for personal possession of three quarters of an ounce of "
      + "marijuana or less, for an offence before 16 September 2017, under RSA 651:5-b, on the judiciary's own "
      + "marijuana form. The committed record's own packet instruction that these participants must NOT be routed "
      + "through the general annulment forms is printed verbatim beside it. Nothing on this form is a route election "
      + "left unmade: the single check box, 'Arrest — no conviction', is determined by the participant's own case and "
      + "not by the route, because the record's eligibleDispositions for this track are both 'arrested' and "
      + "'convicted' and its venue rule is deliberately wider than the general one so an arrest-only participant can "
      + "file where the arrest happened. The court selection and every financial answer on the waiver papers are the "
      + "participant's too, and each is disclosed by name.",
    requiredBeforeFilingCount: rbf.length, requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID, renderedFresh: true,
    artifacts, packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
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
      "Every page of both current fixtures requires raster review by a human who did not build this family. This lane "
      + "rendered every page through the calibrated rasterizer, measured it and deleted the image; that is a "
      + "measurement, not a review, and nobody has looked at these pages. On these three forms the printed captions do "
      + "extract cleanly, and each label in the dictionary was written by reading the line at the widget's own "
      + "rectangle -- but several boxes are NAMED for the line above them rather than for what they collect, so a "
      + "reader of the paper is the check that a value sits under the heading it belongs to.",
    whatToLookAt: [
      "NHJB-3124 page 1: the applicant's name, date of birth, street address, CITY OR TOWN, state, zip, telephone and "
        + "e-mail each under the heading they belong to, and the case number in the caption. The City/Town box is the "
        + "box New Hampshire named \"Mailing Address.2\" — please read the paper and confirm the TOWN is in it and not "
        + "the street address.",
      "NHJB-3124 page 1 charge block: the court's own printed charge line 'Possession of ¾ ounce or less of "
        + "marijuana' present and unaltered; the 'Arrest — no conviction' box UNTICKED; and the Offense Date, Date of "
        + "Conviction, Charge Degree at Conviction and Description of Sentence boxes all BLANK. The offence date in "
        + "particular must be blank: it is what decides eligibility against the 16 September 2017 cutoff.",
      "NHJB-3124 page 2: the sworn verification paragraph — which asserts BOTH that the facts are true AND that the "
        + "amount was three quarters of an ounce or less — with the Date and Applicant's Signature boxes EMPTY, and "
        + "the counsel name, counsel signature and both counsel address lines empty.",
      "NHJB-3124 page 2 lower half: the COURT COMPLETES block (date sent to prosecutor, sent-by initials, name of "
        + "prosecutor), the printed NOTICE TO PETITIONER, the certificate of annulment, the denial-reason lines, the "
        + "judge's signature and printed name and the CC list must all be blank. None of them carries a widget at all "
        + "on this form, so this is a check that nothing was drawn over a printed rule.",
      "NHJB-2311: the case number and the applicant's name in the opening line, and the entire signature block blank — "
        + "name, address, city, state, zip, telephone, e-mail, signature and date. The source's placeholder "
        + "'Enter /s/ before name' is removed under the recorded participant-input appearance disposition; the "
        + "signature line must be empty.",
      "NHJB-2311 page 2: the complete held Case Number is printed above FOR COURT USE ONLY in both fixtures. The "
        + "separate printed Case Name line is blank and required before filing. The ruling section remains blank.",
      "NHJB-2328 page 1: name, date of birth, complete residence address (street, city, state and ZIP) and case number "
        + "written where the form permits; every financial line and both take-home columns blank. The three Total lines "
        + "on pages 1 and 2 must be blank: the source's precomputed zero values are removed under the recorded "
        + "participant-input appearance dispositions.",
      "NHJB-2328 pages 2 and 3: every expense, asset and liability line blank, and the whole signature block blank. "
        + "THE CERTIFICATE OF SERVICE BOX MUST BE UNTICKED AND ITS DATE EMPTY. On this route the participant does "
        + "serve the prosecutor, so a reviewer who knows that might expect the box to be marked — it must not be. A "
        + "certificate of service is signed on the day the copy actually goes out.",
      "Across all three: no signature anywhere, no date beside a signature anywhere, no counsel block filled, and no "
        + "statement anywhere about the amount of marijuana. No check box anywhere carries a stroked square the source "
        + "does not print — the synthesized-appearance suppression is opted into and every widget whose /AS state has "
        + "no /AP /N stream is supplied an empty appearance rather than a drawn one.",
      "participant-instructions.md and filing-instructions.md: confirm no dollar figure appears anywhere except "
        + "inside a sentence quoted from the committed record. The record says this packet must not state a price."
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
          "THE PETITIONER SERVES THE PROSECUTOR ON THIS ROUTE, WHICH IS THE OPPOSITE OF THE GENERAL ANNULMENT TRACK. "
          + "RSA 651:5-b puts the copy of the petition on the petitioner rather than on the court, the committed "
          + "record's rules.service says so in terms, and the prosecutor's ten-day objection window runs from their "
          + "receipt of it. The manifest makes prosecutor_copy a REQUIRED component of this packet set and "
          + "proof_of_service a conditional one recommended in every case.",
        consequence:
          "Both are delivered as named sections of participant-instructions.md, quoting the record's own component "
          + "notes, and the service and notice sentences are printed verbatim in both instruction documents. Nothing "
          + "is sent for the participant and no prosecutor's office or address is named, because the platform holds no "
          + "sourced New Hampshire prosecutor directory. The certificate of service on NHJB-2328 is still delivered "
          + "BLANK: the participant does serve, and that is exactly why the certificate is signed on the day the copy "
          + "goes out rather than in advance by a packet."
      },
      {
        finding:
          "THE RECORD FORBIDS THIS PACKET FROM STATING A PRICE. rules.fees for this track says RSA 651:5-b, unlike RSA "
          + "651:5-a, contains no fee provision and no exemption, that whether the $125.00 filing fee and the $100 "
          + "Department of Corrections investigation fee apply is an open question, and -- in terms -- that the packet "
          + "must not state a price. The record still names the Circuit Court Filing Fees schedule among this track's "
          + "official sources, which is what makes the trap live: the schedule carries a figure and this route may not "
          + "assert it.",
        consequence:
          "The packet prints the record's own fees sentence and the record's own open question, names the schedule as "
          + "a source without adopting its figure, and tells the participant to ask the clerk. The self-test enforces "
          + "it on the delivered prose rather than on intent: every sentence quoted from the record is removed from "
          + "both instruction documents and what remains must contain no currency figure at all. The fee-waiver papers "
          + "are still prepared, because the record names them for the case where a fee is charged."
      },
      {
        finding:
          "THE STATUTORY STATEMENT ABOUT THE AMOUNT IS THE PARTICIPANT'S ALONE. RSA 651:5-b requires the petition to "
          + "state that the amount was three quarters of an ounce or less, and the sworn verification on page 2 of "
          + "NHJB-3124 carries that assertion together with the truth of the facts. The committed record lists it as a "
          + "manual completion item and gives the reason in terms: LegalEase asks the question and never answers it "
          + "for them.",
        consequence:
          "Nothing in this build asserts an amount, the verification block is delivered blank, and the participant is "
          + "told in participant-instructions.md exactly what they are swearing to before they sign. It is also put in "
          + "front of visual review as something to confirm on the paper."
      },
      {
        finding:
          "ARREST OR CONVICTION IS DECIDED BY THE CASE, NOT BY THE ROUTE. NHJB-3124 carries a single check box, "
          + "\"Arrest — no conviction\", beside a charge line the court has already printed. The record's "
          + "eligibleDispositions for this track are \"arrested\" and \"convicted\", and its venue rule is deliberately "
          + "wider than the general one so that an arrest-only participant can file where the arrest happened.",
        consequence:
          "The box is left as a participant election and disclosed by name, with the reason stated: the route reaches "
          + "both, so the route cannot answer it. The three conviction-only cells beside it — date of conviction, "
          + "charge degree and description of sentence — are declared required before filing and each tells the "
          + "participant to leave it blank if there was no conviction."
      },
      {
        finding:
          "NHJB-3124 CARRIES NO WIDGET ANYWHERE IN ITS COURT-COMPLETED HALF. Its 28 AcroForm fields were read from the "
          + "pinned binary and the COURT COMPLETES block (date sent to prosecutor, sent-by initials, name of "
          + "prosecutor), the NOTICE TO PETITIONER, the certificate of annulment, the denial-reason lines, the judge's "
          + "signature and printed name and the CC list are all printed page content with nothing on top of them.",
        consequence:
          "There is nothing there for this build to refuse and nothing for it to write, which makes 'no court-owned "
          + "write' a weaker statement here than it is where a widget exists. It is recorded here and put in front of "
          + "visual review as something to confirm on the paper: those rules must be clear."
      },
      {
        finding:
          "THE APPEARANCE-SEMANTICS REGISTRY IS KEYED BY FAMILY AND THE MEASUREMENT IS A PROPERTY OF THE BINARY. "
          + "data/rcap-all50/shared/field-appearance-semantics.json records that NHJB-2311's sig.8 ships the "
          + "placeholder 'Enter /s/ before name' in its own widget appearance and that NHJB-2328's 12.total, "
          + "money.total and monthly.total ship a white 0.00 -- but it records them under "
          + "nh_petition_nonconviction_pre2019-set and nh_petition_vacated-set. This family binds byte-for-byte the "
          + "same two binaries and has no entry of its own.",
        consequence:
          "The registry file is a shared host this lane does not open, so the dispositions are READ from the existing "
          + "entries and reused only where the digest proves the bytes are identical: the sibling family's committed "
          + "source-receipt.json must record the same SHA-256 this build pinned and re-hashed, and the entry must "
          + "carry the expected number of fields. A mismatch stops the build. Without that, this packet would have "
          + "shipped a motion whose signature line reads 'Enter /s/ before name' and a sworn financial statement whose "
          + "three totals read 0.00 above empty columns. What the registry needs is a key on the source digest rather "
          + "than on the family; that belongs to the lane that owns the file, and the provenance actually used is "
          + "recorded in source-receipt.json under appearanceDispositionProvenance."
      },
      {
        finding:
          "SHARED-BINDER GAP, STILL OPEN, ON A BOX NEW HAMPSHIRE NAMES FOR THE LINE ABOVE IT. NHJB-3124 prints "
          + "City/Town at the box named \"Mailing Address.2\", directly under the box named \"Mailing Address.1\" that "
          + "prints Address. decideBinding resolves a field's fact from its NAME before its printed line and never "
          + "reaches the label when the name matches, so that box resolves to participant.street_address; an explicit "
          + "mapping to the right fact is then refused as explicit_mapping_conflicts_with_field_name. The rule lives "
          + "in scripts/rcap-official-forms/rcap-field-semantics.mjs, a shared host this lane does not open.",
        consequence:
          "The city is WRITTEN at that widget's own rectangle through the finalizer's opt-in named-fact channel, which "
          + "names one fact id and one field, resolves the fact from the same facts set as every other write, runs the "
          + "same protect test on the caption and on the field name, and refuses a value whole rather than truncating "
          + "it. The shared gap itself is unchanged and stays reported here for the lane that owns it."
      },
      {
        finding:
          "NO SINGLE REGISTRY FACT NAMES A ONE-LINE ADDRESS, which is why NHJB-2328's Residence Address is written "
          + "through the same named-fact channel from the held street, city, state abbreviation and ZIP rather than "
          + "through the shared descriptor channel, whose generic address caption binds street only.",
        consequence:
          "Nothing is authored: the value is a function of held facts and, if a part were missing, the fact would be "
          + "absent and the line would stay blank rather than carry a fraction of an address. Closing the gap properly "
          + "means a descriptor and a fact in scripts/rcap-official-forms/rcap-field-semantics.mjs, which this lane "
          + "does not open."
      },
      {
        finding:
          "READ-BACK ENCODING in the shared flattened-widget reader. "
          + "scripts/rcap-official-forms/pdf-flattened-widgets.mjs decodes an appearance stream's string bytes as "
          + "latin1, so a WinAnsi right single quotation mark (byte 0x92) reads back as U+0092 and a boundary surname "
          + "carrying one appears not to match what was expected on a page where it does match.",
        consequence:
          "This family applies the WinAnsi 0x80-0x9F block to what the shared reader returns before comparing and "
          + "before recording drawnText. The shared reader is not opened here and the defect stays reported for the "
          + "lane that owns it."
      },
      {
        finding:
          "NHJB-2311's only court control is a dropdown of SUPERIOR courts, while NHJB-3124 carries its own dropdown "
          + "of every circuit-court district division and every superior court.",
        consequence:
          "The fee-waiver form cannot name the court a circuit-court petition is filed in. Nothing is invented around "
          + "it: the election is left to the participant and participant-instructions.md tells them to write the court "
          + "name by hand where the list cannot express it."
      },
      {
        finding:
          "NHJB-2328 ships three computed total fields carrying the value 0, so a naively flattened packet prints "
          + "\"Total $ 0.00\" beneath columns of otherwise empty lines.",
        consequence:
          "The census reads the value from the pinned source, the recorded participant-input appearance disposition "
          + "drops it, and the byte proof records what the source itself draws so the two can never be confused. It is "
          + "stated to the participant, because a frozen 0.00 above a hand-written column would tell the court "
          + "something the participant did not mean to say."
      },
      {
        finding:
          "THE COMMITTED RECORD CARRIES THREE OPEN QUESTIONS ON THIS ROUTE THAT IT CLASSIFIES AS RELEASE BLOCKERS: "
          + "whether the RSA 651:5, VI whole-record bar applies to an RSA 651:5-b petition, whether the filing and "
          + "investigation fees apply, and whether the offence-date cutoff or the arrest date controls where the two "
          + "straddle 16 September 2017. The track's legalInputStatus in the packet factory queue is SETTLED and the "
          + "family's row gate reports no open legal input, so these are release blockers rather than build blockers.",
        consequence:
          "None is answered by this build and none is guessed or researched. All three are printed verbatim in both "
          + "instruction documents under their own heading, so the participant is told what nobody has established. "
          + "They remain the release gate's to clear."
      },
      {
        finding:
          "THE MASTER_QUEUE row for this family gives its three sources paths in the D source packs, a custody this "
          + "container does not mount.",
        consequence:
          "The build binds all three from the Master Library instead, starting from the digest the assignment pins, "
          + "and re-hashes each file on disk before a byte is read. The committed corpus index records the same three "
          + "digests in the Master Library, so this is the same binary held in more than one custody, not a "
          + "substituted source. The source receipt records the path actually read."
      },
      {
        severity: "advisory",
        finding:
          "This lane rendered every page of both fixtures through the calibrated rasterizer and then DELETED the "
          + "images, keeping the measurement and the image digest.",
        consequence:
          "reports/rendered-artifacts.json records the geometry, the calibration residual and the SHA-256 of each page "
          + "image, with rasterImagesRetained false. The family is BUILT_RASTER_PENDING: the central raster-acceptance "
          + "workflow re-renders from the artifact digests recorded there, and no packet becomes PASS_COMPLETE without "
          + "a RASTER_PASS from a lane that did not build it."
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
      "This route is the one where the PETITIONER serves the prosecutor. Confirm the packet says so and that "
        + "NHJB-2328's certificate of service is nonetheless delivered blank.",
      "The record forbids this packet from stating a price. Confirm no currency figure appears in either instruction "
        + "document outside a sentence quoted from the record.",
      "The statement that the amount was three quarters of an ounce or less is the participant's own and is nowhere "
        + "asserted by this build. Confirm on the paper.",
      "NHJB-3124 carries no widget anywhere in its court-completed half. Confirm nothing was drawn over those printed "
        + "rules.",
      "The NHJB-2311 signature placeholder and the three NHJB-2328 zero totals are suppressed under an appearance "
        + "disposition this family reuses from a sibling family's registry entry, proved to describe the same bytes by "
        + "digest. See source-receipt.json appearanceDispositionProvenance and build-findings.json."
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
