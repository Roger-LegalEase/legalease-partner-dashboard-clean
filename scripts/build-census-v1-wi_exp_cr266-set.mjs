#!/usr/bin/env node
/**
 * Route-obligation census v1 — packet family `wi_exp_cr266-set`.
 *
 *   node scripts/build-census-v1-wi_exp_cr266-set.mjs [--check] [--no-raster]
 *
 * Wisconsin, expunging the court record of a conviction under Wis. Stat.
 * § 973.015 where the sentence carried no probation and no incarceration.
 * Route `obligation:track-only:WI:wi_exp_cr266`. Two official Wisconsin circuit
 * court forms, filed together:
 *
 *   CR-266, 05/24  Petition to Expunge Court Record of Conviction
 *                  (Non-Probation/Non-Incarceration)   — the filing
 *   CR-267, 02/15  Order on Petition to Expunge Court Record of Conviction
 *                  (Non-Probation/Non-Incarceration)   — the proposed order
 *
 * THE OWNER'S ACTION, AND WHAT MAPPING IT ACTUALLY RESOLVED TO
 *
 * The recorded next executable action is: "Map established discharge facts to
 * exact CR-266 selections, leave participant assertions blank, hard-stop
 * unknown discharge types, and release the build."
 *
 * CR-266 HAS NO SELECTIONS. Measured from the pinned bytes on every run: no
 * /AcroForm in the catalog, zero annotations, zero stroked check-box paths, and
 * the only symbol glyphs on the page are three SymbolMT marks whose own
 * /ToUnicode CMap maps them to U+F0B7 — the Symbol bullet. They are the three
 * bulleted consequences under paragraph 1 ("only the court record … will be
 * expunged", "other court records … will not be affected, AND", "the conviction
 * is not vacated or set aside"), which are a list, not controls. Every one of
 * the six numbered declarations is unconditional pre-printed text.
 *
 * So the discharge-type election on this route is expressed by WHICH FORM IS
 * USED, and the compiled Wisconsin profile says so in as many words:
 *
 *   "CR-266 is only for adult conviction cases where expungement was already
 *    ordered and there was no probation/incarceration."
 *
 * The mapping this build performs is therefore a PRECONDITION over the record,
 * not a mark on the page: the established discharge facts select CR-266 and
 * CR-267 and nothing on either form is elected, because nothing on either form
 * is electable. That is recorded explicitly rather than left to be inferred
 * from an empty selection list, and the hard stop is executed and proved rather
 * than asserted — `hardStopProof` below runs the gate against a record whose
 * discharge type is unknown and requires it to refuse.
 *
 * "LEAVE PARTICIPANT ASSERTIONS BLANK" ON A FORM WITH NOTHING TO LEAVE BLANK
 *
 * Paragraphs 1 to 6 of CR-266 are assertions the petitioner makes, and they are
 * printed, not blank: the petitioner adopts all six by signing under the
 * criminal penalty of false swearing. There is nothing for a build to leave
 * blank there and nothing for it to fill. What this build does instead is
 * write nothing anywhere in the declaration block, leave the signature and its
 * date empty, and print all six declarations VERBATIM in the participant guide,
 * read out of the pinned bytes, so the participant checks each one against
 * their own record before they sign it. Paragraph 2 — that the sentencing court
 * ordered expungement upon successful completion — gets its own section,
 * because the compiled profile calls it "the biggest Wisconsin issue".
 *
 * CR-267 IS THE COURT'S PAPER
 *
 * Only the caption is written on it, and the anchors are declared captionOnly
 * so the shared binder refuses any non-caption fact on a court-issued order
 * even if a later edit tried to map one. Its eight printed check boxes — the
 * hearing finding, GRANTED, DENIED and the four denial reasons — and its three
 * fill-in rules are the court's, and they are left alone. Those check boxes are
 * measured from decoded page streams. Their geometry is recorded alongside
 * the court-owned labels. None is a participant election.
 *
 * NOTHING INTERNAL REACHES A FILED PAGE. Route keys, component ids, digests and
 * build vocabulary appear only in participant-instructions.md and in the JSON
 * reports. Nothing is drawn on CR-266 or CR-267 except participant and matter
 * facts at measured rules.
 *
 * A built family is a built family. It is not verified, not approved and not
 * sellable, and this builder issues no verdict on its own packets.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { finalizeFlatOverlay } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { rulesOfPage } from "./rcap-official-forms/rcap-pdf-rule-lines.mjs";
import { checkboxCandidates } from "./lib/pdf-stroked-boxes.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { BLANK_DISPOSITIONS, PASS_COUNTERS, classifyField, classifyBlank, rowKeyOf }
  from "./rcap-packet-completeness/completeness-contract.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, PDFRawStream, decodePDFRawStream } = require("pdf-lib");

const FAMILY_ID = "wi_exp_cr266-set";
const BUILD_SCRIPT = "scripts/build-census-v1-wi_exp_cr266-set.mjs";
const OUT = "data/rcap-all50/overlays/census-v1/wi/wi-exp-cr266-set--official-pdf-fill";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const PACKET_SET_MANIFESTS = "data/record-clearing/legal-design-packet-set-manifests.json";
const COMPILED_PROFILE = "src/lib/rcap-engine/compiled/profiles/WI-wisconsin.json";
const PACKET_SET_ID = "wi_exp_cr266-set";

const ROUTE = Object.freeze({
  jurisdiction: "WI",
  routeKey: "obligation:track-only:WI:wi_exp_cr266",
  routeSelectionId: "wi-exp-cr266-set-cr-266-cr-267",
  publicLabel: "Petition to expunge a Wisconsin conviction record where the sentence carried no probation and no jail or prison",
  authority: "Wis. Stat. § 973.015; Wisconsin circuit court forms CR-266 and CR-267",
  documents: [
    {
      formNumber: "CR-266",
      title: "Petition to Expunge Court Record of Conviction (Non-Probation/Non-Incarceration)",
      instrumentKind: "primary_filing",
      componentId: "wi_exp_cr266-primary-filing-1",
      captionOnly: false
    },
    {
      formNumber: "CR-267",
      title: "Order on Petition to Expunge Court Record of Conviction (Non-Probation/Non-Incarceration)",
      instrumentKind: "proposed_order",
      componentId: "wi_exp_cr266-proposed-order-2",
      captionOnly: true
    }
  ]
});

function corpusRoot() {
  const configured = process.env.MASTER_LIBRARY_SOURCE_DIR
    ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
  assert.ok(fs.existsSync(configured), `the Master Library is not mounted at ${configured}`);
  return configured;
}

const SUPPLY = (what) => ({ policy: "supply", what });
const WRITE = (fact) => ({ policy: "write", fact });
const PROTECT = (refusalClass, why) => ({ policy: "protect", refusalClass, why });
const ATTORNEY = (why) => ({ policy: "attorney", why });

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const PARTICIPANT_ELECTION = "participant_sworn_narrative_or_legal_election";

/* ------------------------------------------------------------------ *
 * THE MEASURED RULES A VALUE GOES ON.
 *
 * `rule` is the printed line, read from the page's own content stream by
 * scripts/rcap-official-forms/rcap-pdf-rule-lines.mjs. Every one is re-measured
 * on every run and the build refuses if any has moved by more than a point.
 *
 * TWO OF CR-266'S RULES CARRY TWO BLANKS EACH. The rule at y=228.29 runs from
 * x=284.69 to x=505.30 and TWO captions print beneath it: "Email Address" at
 * x=284.69 and "Telephone Number" at x=457.75. The rule at y=206.69 does the
 * same for "Date" and "State Bar No. (if any)". The form prints no divider
 * between them, so the boundary used here is the one the form DOES print: the
 * left edge of the right-hand caption. `ruleSpan` records the sub-extent taken
 * and `sharesRuleWith` names the other blank on the same line, so a reviewer
 * can see that the split was measured and not chosen.
 * ------------------------------------------------------------------ */
const CAPTION_SPLIT_X = 457.75;      // where "Telephone Number" and "State Bar No." begin
const CAPTION_SPLIT_GAP = 2;         // the gap left before that caption's own x

const ANCHORS = {
  "CR-266": {
    "county-venue": {
      page: 1, rule: { y: 735.6, x0: 241.49, x1: 392.47 },
      section: "Caption — venue", label: "County",
      printedSuffixAfterBlank: "County",
      captionEvidence: "the word COUNTY is printed at x=395.23 on the same line, immediately after this rule ends at x=392.47",
      ...WRITE("matter.county")
    },
    "defendant-name": {
      page: 1, rule: { y: 691.66, x0: 41.4, x1: 244.01 },
      section: "Caption — parties", label: "Defendant’s Name",
      captionEvidence: "the caption \"Defendant’s Name\" prints at y=684.22 x=41.40, directly beneath this rule and flush with its left end",
      ...WRITE("participant.full_legal_name")
    },
    "date-of-birth": {
      page: 1, rule: { y: 667.66, x0: 41.4, x1: 244.01 },
      section: "Caption — parties", label: "Date of Birth",
      captionEvidence: "the caption \"Date of Birth\" prints at y=660.22 x=41.40, directly beneath this rule and flush with its left end",
      ...WRITE("participant.date_of_birth")
    },
    "case-number": {
      page: 1, rule: { y: 653.62, x0: 354.91, x1: 432.07 },
      section: "Caption — case", label: "Case No.",
      captionEvidence: "the caption \"Case No.\" prints at y=655.18 x=310.49 and ends before this rule begins at x=354.91; the rule is 77.16pt and the caption box's vertical divider is at x=464.26",
      ...WRITE("matter.case_number")
    },
    signature: {
      page: 1, rule: { y: 294.29, x0: 284.69, x1: 505.3 },
      section: "Declaration — signature block", label: "Signature",
      captionEvidence: "the caption \"Signature\" prints at y=288.17 x=284.69, directly beneath this rule; the ► glyph sits on the rule at x=284.69",
      ...PROTECT(SIGNATURE, "the petitioner signs this under the criminal penalty of false swearing; a packet never prefills a signature")
    },
    "name-printed-or-typed": {
      page: 1, rule: { y: 272.93, x0: 284.69, x1: 505.3 },
      section: "Declaration — signature block", label: "Name Printed or Typed",
      captionEvidence: "the caption \"Name Printed or Typed\" prints at y=266.09 x=284.69, directly beneath this rule",
      ...WRITE("participant.full_legal_name")
    },
    address: {
      page: 1, rule: { y: 250.97, x0: 284.69, x1: 505.3 },
      section: "Declaration — signature block", label: "Address",
      captionEvidence: "the caption \"Address\" prints at y=244.13 x=284.69, directly beneath this rule",
      ...WRITE("participant.street_address")
    },
    "email-address": {
      page: 1, rule: { y: 228.29, x0: 284.69, x1: 505.3 },
      ruleSpan: { x0: 284.69, x1: CAPTION_SPLIT_X - CAPTION_SPLIT_GAP },
      sharesRuleWith: "telephone-number",
      section: "Declaration — signature block", label: "Email Address",
      captionEvidence: "the caption \"Email Address\" prints at y=222.17 x=284.69; the next caption on that line, \"Telephone Number\", prints at x=457.75, which is where this blank stops",
      ...WRITE("participant.email")
    },
    "telephone-number": {
      page: 1, rule: { y: 228.29, x0: 284.69, x1: 505.3 },
      ruleSpan: { x0: CAPTION_SPLIT_X, x1: 505.3 },
      sharesRuleWith: "email-address",
      section: "Declaration — signature block", label: "Telephone Number",
      fontSize: 8,
      captionEvidence: "the caption \"Telephone Number\" prints at y=222.17 x=457.75 and runs past the right end of the rule at x=505.30; the blank the form gives is the 47.55pt of rule above it",
      ...WRITE("participant.phone")
    },
    "date-signed": {
      page: 1, rule: { y: 206.69, x0: 284.69, x1: 505.3 },
      ruleSpan: { x0: 284.69, x1: CAPTION_SPLIT_X - CAPTION_SPLIT_GAP },
      sharesRuleWith: "state-bar-no",
      section: "Declaration — signature block", label: "Date",
      captionEvidence: "the caption \"Date\" prints at y=200.09 x=284.69, directly beneath this rule",
      ...PROTECT(SIGNATURE, "this is the date the petitioner signs the declaration. Signing has not happened when this packet is prepared, and a date written for a signature that does not exist would date a declaration nobody made")
    },
    "state-bar-no": {
      page: 1, rule: { y: 206.69, x0: 284.69, x1: 505.3 },
      ruleSpan: { x0: CAPTION_SPLIT_X, x1: 505.3 },
      sharesRuleWith: "date-signed",
      section: "Declaration — signature block", label: "State Bar No. (if any)",
      captionEvidence: "the caption \"State Bar No. (if any)\" prints at y=200.09 x=457.75",
      ...ATTORNEY("a Wisconsin State Bar number belongs to a lawyer signing the petition. This is an attorney-only line, no representation fact is held on this route, the packet is prepared for a petitioner acting for themselves, and the form itself marks the line \"(if any)\"")
    }
  },
  "CR-267": {
    "county-venue": {
      page: 1, rule: { y: 555.82, x0: 236.09, x1: 433.27 },
      section: "Caption — venue", label: "County",
      printedSuffixAfterBlank: "County",
      captionEvidence: "the word COUNTY is printed at x=436.03 on the same line, immediately after this rule ends at x=433.27",
      ...WRITE("matter.county")
    },
    "defendant-name": {
      page: 1, rule: { y: 511.75, x0: 36, x1: 216.05 },
      section: "Caption — parties", label: "Defendant’s Name",
      captionEvidence: "the caption \"Defendant’s Name\" prints at y=504.31 x=36.00, directly beneath this rule and flush with its left end",
      ...WRITE("participant.full_legal_name")
    },
    "date-of-birth": {
      page: 1, rule: { y: 487.75, x0: 36, x1: 216.05 },
      section: "Caption — parties", label: "Date of Birth",
      captionEvidence: "the caption \"Date of Birth\" prints at y=480.31 x=36.00, directly beneath this rule and flush with its left end",
      ...WRITE("participant.date_of_birth")
    },
    "case-number": {
      page: 1, rule: { y: 483.31, x0: 390.91, x1: 483.93 },
      section: "Caption — case", label: "Case No.",
      captionEvidence: "the caption \"Case No.\" prints at y=484.87 x=346.51 and ends at x=387.54, before this rule begins at x=390.91",
      ...WRITE("matter.case_number")
    },
    "hearing-date": {
      page: 1, rule: { y: 362.23, x0: 222.41, x1: 309.41 },
      section: "THE COURT FINDS", label: "4. The court conducted a hearing on",
      captionEvidence: "finding 4 prints at y=363.79 beginning x=50.28 and its sentence ends with a full stop after this rule",
      ...PROTECT(COURT_OWNED, "the date of a hearing the court conducted is a judicial fact recorded by the court. A proposed order that stated it would be reciting a hearing that has not happened")
    },
    "denial-reason-failed-to": {
      page: 1, rule: { y: 226.01, x0: 451.39, x1: 575.13 },
      section: "THE COURT ORDERS — 2. DENIED because", label: "the defendant did not successfully complete sentence because he or she failed to:",
      captionEvidence: "the denial reason prints at y=227.60 and its sentence ends with a full stop after this rule",
      ...PROTECT(COURT_OWNED, "this is a reason a court gives for denying the petition. A packet does not draft the court's denial")
    },
    "denial-reason-other": {
      page: 1, rule: { y: 190.01, x0: 115.94, x1: 575.13 },
      section: "THE COURT ORDERS — 2. DENIED because", label: "Other:",
      captionEvidence: "the caption \"Other:\" prints at y=191.60 x=36.00 and this rule begins at x=115.94 on the same line",
      ...PROTECT(COURT_OWNED, "this is a reason a court gives for denying the petition. A packet does not draft the court's denial")
    }
  }
};

/*
 * CR-267's eight court-owned checkbox labels, in descending source y order.
 * Geometry is obtained from decoded source streams, never invented from labels.
 */
const COURT_SELECTION_LABELS = [
  { document: "CR-267", page: 1, section: "THE COURT FINDS", printedNear: "4. The court conducted a hearing on", owner: "court" },
  { document: "CR-267", page: 1, section: "THE COURT ORDERS", printedNear: "1. GRANTED. The clerk is ordered to expunge the court's record of the conviction.", owner: "court" },
  { document: "CR-267", page: 1, section: "THE COURT ORDERS", printedNear: "2. DENIED because", owner: "court" },
  { document: "CR-267", page: 1, section: "THE COURT ORDERS — 2. DENIED because", printedNear: "at the time the sentence was imposed, the court did not order that the record be expunged upon successful completion of the sentence.", owner: "court" },
  { document: "CR-267", page: 1, section: "THE COURT ORDERS — 2. DENIED because", printedNear: "the defendant did not successfully complete sentence because he or she failed to pay all court-ordered financial obligations.", owner: "court" },
  { document: "CR-267", page: 1, section: "THE COURT ORDERS — 2. DENIED because", printedNear: "the defendant did not successfully complete sentence because he or she failed to:", owner: "court" },
  { document: "CR-267", page: 1, section: "THE COURT ORDERS — 2. DENIED because", printedNear: "between the date of conviction in this case and completion of the sentence, the defendant was convicted of another criminal offense.", owner: "court" },
  { document: "CR-267", page: 1, section: "THE COURT ORDERS — 2. DENIED because", printedNear: "Other:", owner: "court" }
];


function measuredCourtControls(formNumber, census) {
  const labels = COURT_SELECTION_LABELS.filter(c => c.document === formNumber);
  const boxes = census.strokedBoxes.flatMap(p => p.boxes.map(box => ({ page: p.page, ...box })))
    .sort((a, b) => a.page - b.page || b.y0 - a.y0 || a.x0 - b.x0);
  assert.equal(boxes.length, labels.length, `${formNumber}: source control/label count mismatch`);
  return boxes.map((box, index) => ({ ...labels[index], geometry: box,
    measurement: "checkboxCandidates over pdf-lib decoded page content streams", participantMayFill: false }));
}

/* ---- fixtures ------------------------------------------------------------ */
/*
 * The four discharge facts are RECORD facts, not form values. Nothing writes
 * them; they decide whether CR-266 is the right instrument at all, and the gate
 * below refuses any value other than the exact booleans.
 */
const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Devon Marie Kessler",
    "participant.date_of_birth": "1996-03-08",
    "participant.street_address": "742 Sherman Avenue, Madison, WI 53704",
    "participant.email": "devon.kessler@example.org",
    "participant.phone": "608-555-0142",
    "matter.county": "Dane",
    "matter.case_number": "2018CM001274",
    "matter.wi_expungement_ordered_at_sentencing": true,
    "matter.wi_sentence_included_probation": false,
    "matter.wi_sentence_included_jail_or_prison": false,
    "matter.wi_sentence_completed": true
  },
  boundary: {
    "participant.full_legal_name": "Anne-Sophie Vandenberg-Okonkwo",
    "participant.date_of_birth": "1968-11-30",
    "participant.street_address": "10488 North Port Washington Road, Apartment 21C, Mequon, WI 53092-2214",
    "participant.email": "anne.sophie.vandenberg.okonkwo@longmailexample.org",
    "participant.phone": "414-555-0199",
    "matter.county": "Fond du Lac County",
    "matter.case_number": "2015CF000884",
    "matter.wi_expungement_ordered_at_sentencing": true,
    "matter.wi_sentence_included_probation": false,
    "matter.wi_sentence_included_jail_or_prison": false,
    "matter.wi_sentence_completed": true
  }
};

/** A record whose discharge type is not established. Never rendered: proof the gate refuses. */
const UNKNOWN_DISCHARGE_RECORD = {
  ...FIXTURES.canonical,
  "matter.wi_sentence_included_probation": null
};

const RULE_TOLERANCE = 1.0;
const WRITE_BOX_HEIGHT = 12;

/* ------------------------------------------------------------------------- *
 * THE HARD STOP THE OWNER'S ACTION ASKS FOR.
 * ------------------------------------------------------------------------- */
const DISCHARGE_GATE = [
  {
    factId: "matter.wi_expungement_ordered_at_sentencing", mustBe: true,
    why: "Wis. Stat. § 973.015 lets the SENTENCING court order expungement upon successful completion, and the "
      + "compiled Wisconsin profile records that \"nothing in the statute lets the circuit court revisit the "
      + "expungement decision later\". CR-266 paragraph 2 asserts the order was made. If the record does not "
      + "establish it, CR-266 is not the instrument."
  },
  {
    factId: "matter.wi_sentence_included_probation", mustBe: false,
    why: "CR-266 paragraph 3 asserts \"I was not placed on probation\", and the form is captioned "
      + "(Non-Probation/Non-Incarceration). A probation discharge is a different pathway and a different form."
  },
  {
    factId: "matter.wi_sentence_included_jail_or_prison", mustBe: false,
    why: "CR-266 paragraph 4 asserts \"I was not sentenced to jail or prison\". An incarceration discharge is a "
      + "different pathway and a different form."
  },
  {
    factId: "matter.wi_sentence_completed", mustBe: true,
    why: "CR-266 paragraph 5 asserts the sentence was successfully completed, including all court-ordered "
      + "financial obligations. Expungement under § 973.015 takes effect on successful completion."
  }
];

/** Refuses unless every discharge fact is established as the exact boolean the form asserts. */
function dischargeGate(facts) {
  const unestablished = [];
  const established = [];
  for (const rule of DISCHARGE_GATE) {
    const value = facts[rule.factId];
    if (value === rule.mustBe) { established.push({ factId: rule.factId, value }); continue; }
    unestablished.push({
      factId: rule.factId,
      recordValue: value === undefined ? "absent from the record" : value,
      requiredValue: rule.mustBe,
      why: rule.why
    });
  }
  return { established, unestablished, passes: unestablished.length === 0 };
}

/* ---- source binding ------------------------------------------------------ */
function resolveSources() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const all = index.entries ?? [];
  const root = corpusRoot();
  const resolved = [];
  const failures = [];
  for (const wanted of ROUTE.documents) {
    const entry = all.find((e) => e.state === "WI" && e.formNumber === wanted.formNumber && e.assetClass === "FORM");
    if (!entry) {
      failures.push({ sourceId: `official-form:${wanted.formNumber}`, why: "no entry for this form number in the committed corpus index" });
      continue;
    }
    const abs = path.resolve(ROOT, root, entry.path);
    if (!fs.existsSync(abs)) {
      failures.push({ sourceId: `official-form:${wanted.formNumber}`, pathInArchive: entry.path, why: `the indexed path does not exist on disk: ${entry.path}` });
      continue;
    }
    const bytes = fs.readFileSync(abs);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    if (String(entry.sha256 ?? "") !== sha256) {
      failures.push({ sourceId: `official-form:${wanted.formNumber}`, pathInArchive: entry.path, why: `SHA-256 drift: the committed index says ${entry.sha256}, the mounted corpus holds ${sha256}` });
      continue;
    }
    resolved.push({
      ...wanted, sourceId: `official-form:${wanted.formNumber}`, pathInArchive: entry.path,
      revision: entry.revision ?? null, sha256, byteLength: bytes.length, bytes,
      acroFieldCount: entry.acroFieldCount ?? null, pageCount: entry.pageCount ?? null,
      structuralClassObserved: entry.structuralClassObserved ?? null
    });
  }
  return { resolved, failures };
}

/* ---- census: measure the rules, then place the boxes on them -------------- */
async function censusFlat(source) {
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  const pageText = pages.map((p, i) => {
    const items = extractTextItems(p);
    return {
      page: i + 1,
      lines: groupIntoLines(items).map((l) => {
        // The left edge of a printed line is its own indent, and on CR-266 the
        // indent is the only thing that tells a bulleted sub-item apart from a
        // continuation: the SymbolMT bullet itself is dropped by every text
        // extractor here, so reading the list off the string alone runs the
        // three items together into one sentence.
        const here = items.filter((t) => Math.abs(Number(t.y) - l.y) <= 0.6 && String(t.text ?? "").trim());
        const firstX = here.length ? Math.min(...here.map((t) => Number(t.x))) : null;
        return { y: Math.round(l.y), firstX: firstX === null ? null : Number(firstX.toFixed(2)), text: l.text };
      })
    };
  });
  const measured = pages.map((p, i) => ({ page: i + 1, horizontal: rulesOfPage(p).horizontal ?? [] }));

  const acroFieldCount = doc.getForm().getFields().length;
  const annotationCount = pages.reduce((n, p) => {
    const annots = p.node.Annots?.();
    return n + (annots && typeof annots.size === "function" ? annots.size() : 0);
  }, 0);
  const strokedBoxes = pages.map((p, i) => {
    let content = "";
    for (const stream of p.node.normalizedEntries?.().Contents?.asArray?.() ?? []) {
      const raw = doc.context.lookup(stream);
      const decoded = raw instanceof PDFRawStream ? decodePDFRawStream(raw).decode() : raw.getUnencodedContents();
      content += Buffer.from(decoded).toString("latin1") + "\n";
    }
    return { page: i + 1, boxes: content ? checkboxCandidates(content) : [] };
  });

  const dictionary = ANCHORS[source.formNumber];
  const rows = [];
  const ruleDrift = [];
  for (const [key, entry] of Object.entries(dictionary)) {
    const here = measured.find((m) => m.page === entry.page)?.horizontal ?? [];
    const hit = here.find((r) =>
      Math.abs(r.y - entry.rule.y) <= RULE_TOLERANCE
      && Math.abs(r.x - entry.rule.x0) <= RULE_TOLERANCE
      && Math.abs(r.endX - entry.rule.x1) <= RULE_TOLERANCE);
    if (!hit) {
      ruleDrift.push({
        anchor: key, page: entry.page, expected: entry.rule,
        nearest: here.filter((r) => Math.abs(r.y - entry.rule.y) <= 6)
          .map((r) => ({ y: r.y, x: r.x, endX: r.endX })).slice(0, 3)
      });
      continue;
    }
    // The value sits ON the rule. Where a rule carries two blanks, the sub-span
    // is the measured caption boundary, not the rule's own ends.
    const span = entry.ruleSpan ?? { x0: hit.x, x1: hit.endX };
    const writeBox = {
      x: Number((span.x0 + 2).toFixed(2)),
      y: Number((hit.y + 2).toFixed(2)),
      width: Number((span.x1 - span.x0 - 4).toFixed(2)),
      height: WRITE_BOX_HEIGHT
    };
    rows.push({
      key, name: key, page: entry.page,
      rect: writeBox, writeBox,
      rectBasis: entry.ruleSpan
        ? "measured_printed_rule_read_from_the_page_content_stream_split_at_the_printed_caption_beside_it"
        : "measured_printed_rule_read_from_the_page_content_stream",
      measuredRule: { y: hit.y, x: hit.x, endX: hit.endX, width: hit.width, thickness: hit.height },
      ...(entry.ruleSpan ? { ruleSpanTaken: entry.ruleSpan, sharesRuleWith: entry.sharesRuleWith ?? null } : {}),
      captionEvidence: entry.captionEvidence,
      type: "flat_overlay_text", isSelectionControl: false, multiline: false, maxLength: null,
      section: entry.section, effectiveLabel: entry.label,
      printedSuffixAfterBlank: entry.printedSuffixAfterBlank ?? null,
      fontSize: entry.fontSize ?? 10,
      policy: entry.policy, fact: entry.fact ?? null,
      refusalClass: entry.refusalClass ?? null, what: entry.what ?? null, why: entry.why ?? null,
      printedTextAtCoordinate: (pageText.find((p) => p.page === entry.page)?.lines ?? [])
        .filter((l) => Math.abs(l.y - entry.rule.y) <= 14)
        .sort((a, b) => Math.abs(a.y - entry.rule.y) - Math.abs(b.y - entry.rule.y))
        .slice(0, 2).map((l) => ({ y: l.y, extracted: l.text }))
    });
  }

  return {
    rows, ruleDrift, pageText, pageCount: pages.length,
    acroFieldCount, annotationCount,
    strokedBoxes,
    strokedCheckboxCount: strokedBoxes.reduce((n, p) => n + p.boxes.length, 0),
    measuredRuleCount: measured.reduce((n, m) => n + m.horizontal.length, 0)
  };
}

/**
 * CR-266's six declarations, read out of the pinned bytes.
 *
 * Paragraph 1 ends in a three-item bulleted list whose bullets are SymbolMT
 * glyph 0x78 and are dropped by the text extractor. Reading the paragraph as
 * one string runs the three items together into a single sentence that the
 * form does not print, so the list is separated by the indent the form DOES
 * print: a bullet item starts at x=92.06 and its continuation at x=110.06,
 * where the paragraph body starts at x=54.96 and continues at x=74.06.
 */
const BULLET_INDENT_X = 92.06;
const BULLET_CONTINUATION_X = 110.06;
const INDENT_TOLERANCE = 1.5;

function declarationsOfCr266(census) {
  const lines = (census.pageText.find((p) => p.page === 1)?.lines ?? []).slice().sort((a, b) => b.y - a.y);
  const near = (x, target) => x !== null && Math.abs(x - target) <= INDENT_TOLERANCE;
  const declared = [];
  let current = null;
  for (const line of lines) {
    if (line.y > 634 || line.y < 395) continue;      // between "I DECLARE THAT:" and the block's end
    const text = line.text.trim();
    if (!text) continue;
    const start = /^([1-6])\.\s+(.*)$/.exec(text);
    if (start) {
      if (current) declared.push(current);
      current = { number: Number(start[1]), text: start[2].trim(), subItems: [] };
      continue;
    }
    if (!current) continue;
    if (near(line.firstX, BULLET_INDENT_X)) { current.subItems.push(text); continue; }
    if (near(line.firstX, BULLET_CONTINUATION_X) && current.subItems.length > 0) {
      current.subItems[current.subItems.length - 1] =
        `${current.subItems[current.subItems.length - 1]} ${text}`.replace(/\s+/g, " ").trim();
      continue;
    }
    current.text = `${current.text} ${text}`.replace(/\s+/g, " ").trim();
  }
  if (current) declared.push(current);
  return declared;
}

/* ---- render --------------------------------------------------------------- */
async function renderFlat(source, census, fixtureName) {
  const facts = FIXTURES[fixtureName];
  const writable = census.rows.filter((r) => r.policy === "write");
  const protectedRules = census.rows
    .filter((r) => r.policy === "protect")
    .map((r) => ({
      page: r.page, y: r.measuredRule.y, x: r.measuredRule.x, endX: r.measuredRule.endX,
      category: r.refusalClass, caption: r.effectiveLabel
    }));

  const anchors = writable.map((r) => ({
    page: r.page, label: r.effectiveLabel, writeBox: r.writeBox,
    factId: r.fact, fontSize: r.fontSize, protectedRules,
    captionOnly: source.captionOnly === true,
    ...(r.printedSuffixAfterBlank ? { printedSuffixAfterBlank: r.printedSuffixAfterBlank } : {})
  }));

  return finalizeFlatOverlay({
    sourceBytes: source.bytes,
    expectedSha256: source.sha256,
    anchors,
    protectedRules,
    explicitMappings: Object.fromEntries(writable.map((r) => [r.effectiveLabel, r.fact])),
    facts,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    title: source.title
  });
}

/* ---- byte proof, read from the produced PDF -------------------------------- */
/**
 * Both output-byte glyph readings, MEASURED.
 *
 * finalizeFlatOverlay draws into page content, so there is no flattened widget
 * appearance to read and the shared widget reader would return zero for every
 * write on a correctly built packet. The reading here is the one that fits how
 * the ink was put down: every text item in the OUTPUT that the SOURCE does not
 * also draw at the same place is ink this build added, and each is tested
 * against every measured write box on its own page.
 *
 * NEITHER NUMBER IS A LITERAL. If the source cannot be read back for
 * subtraction, both come back null rather than 0.
 */
async function byteProof(source, census, artifactBytes, report, fixtureName) {
  const out = await PDFDocument.load(artifactBytes, { ignoreEncryption: true });
  const src = await PDFDocument.load(source.bytes, { ignoreEncryption: true });
  const outPages = out.getPages();
  const srcPages = src.getPages();
  if (outPages.length !== srcPages.length) {
    return {
      readable: false,
      why: `the produced PDF has ${outPages.length} page(s) and the pinned source has ${srcPages.length}; `
        + "added ink cannot be separated from the form's own text",
      addedGlyphsReadFromOutputBytes: null,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: null
    };
  }

  const itemsOf = (page) => extractTextItems(page).map((t) => ({
    x: Number(t.x), y: Number(t.y), width: Number(t.width ?? 0), text: String(t.text ?? "")
  }));
  const keyOf = (t) => `${Math.round(t.x * 10)}:${Math.round(t.y * 10)}:${t.text}`;

  const boxesByPage = new Map();
  for (const r of census.rows) {
    if (!boxesByPage.has(r.page)) boxesByPage.set(r.page, []);
    boxesByPage.get(r.page).push({ key: r.key, box: r.rect });
  }
  const inBox = (t, box) => t.x >= box.x - 2 && t.x <= box.x + box.width + 2
    && t.y >= box.y - 3 && t.y <= box.y + box.height + 3;

  let addedGlyphs = 0;
  let outsideNonWhitespace = 0;
  const addedOutside = [];
  const addedByBox = new Map();

  for (let i = 0; i < outPages.length; i += 1) {
    const before = new Set(itemsOf(srcPages[i]).map(keyOf));
    const added = itemsOf(outPages[i]).filter((t) => t.text.length > 0 && !before.has(keyOf(t)));
    const boxes = boxesByPage.get(i + 1) ?? [];
    for (const t of added) {
      addedGlyphs += t.text.length;
      const hit = boxes.find((b) => inBox(t, b.box));
      if (!hit) {
        outsideNonWhitespace += t.text.replace(/\s/g, "").length;
        if (t.text.trim()) addedOutside.push({ page: i + 1, x: Number(t.x.toFixed(2)), y: Number(t.y.toFixed(2)), text: t.text });
        continue;
      }
      addedByBox.set(hit.key, `${addedByBox.get(hit.key) ?? ""}${t.text}`);
    }
  }

  const written = new Set(report.written.map((w) => w.anchor));
  const actualWrites = [];
  const refusedFieldsWithInk = [];
  for (const r of census.rows) {
    const ink = (addedByBox.get(r.key) ?? "").trim();
    const isWritten = written.has(r.effectiveLabel) && r.policy === "write";
    if (isWritten) {
      const normalized = report.normalized.find((n) => n.anchor === r.effectiveLabel) ?? null;
      const expected = String(normalized ? normalized.to : (FIXTURES[fixtureName][r.fact] ?? "")).trim();
      actualWrites.push({
        field: r.key, factId: r.fact, page: r.page, rect: r.rect, measuredRule: r.measuredRule,
        section: r.section, effectiveLabel: r.effectiveLabel,
        drawnText: ink, expected, matchesExpected: ink === expected,
        ...(normalized ? { normalizedFromRecordValue: normalized.from, becauseTheFormPrints: r.printedSuffixAfterBlank } : {})
      });
      continue;
    }
    if (ink.length > 0) refusedFieldsWithInk.push({ fieldId: r.key, page: r.page, drawnText: ink });
  }

  return {
    readable: true,
    addedGlyphsReadFromOutputBytes: addedGlyphs,
    nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: outsideNonWhitespace,
    addedInkOutsideEveryMeasuredWriteBox: addedOutside,
    actualWrites, refusedFieldsWithInk
  };
}

/* ---- field map ------------------------------------------------------------- */
function mapFor(source, census, report) {
  const writtenLabels = new Set(report.written.map((w) => w.anchor));
  const canonicalWrites = [];
  const canonicalRefusals = [];

  for (const r of census.rows) {
    const base = {
      field: `${source.formNumber}/${r.key}`,
      fieldName: `${source.formNumber}/${r.key}`,
      acroFieldName: null,
      page: r.page, rect: r.rect, rectBasis: r.rectBasis,
      measuredRule: r.measuredRule,
      ...(r.ruleSpanTaken ? { ruleSpanTaken: r.ruleSpanTaken, sharesRuleWith: r.sharesRuleWith } : {}),
      printedLabel: r.effectiveLabel, printedLine: r.effectiveLabel,
      sectionHeading: r.section, regionHeading: r.effectiveLabel, effectiveLabel: r.effectiveLabel,
      captionBasis: "the printed caption beside or beneath the measured rule, located by its own x and y on the page",
      captionEvidence: r.captionEvidence,
      printedTextAtCoordinate: r.printedTextAtCoordinate,
      document: source.formNumber
    };

    if (r.policy === "write") {
      if (writtenLabels.has(r.effectiveLabel)) {
        canonicalWrites.push({ ...base, factId: r.fact, kind: r.type });
      } else {
        canonicalRefusals.push({
          ...base,
          reason: "the finalizer refused this write; the packet does not claim a value it did not draw",
          category: null, completenessClass: null, class: null,
          requiredBeforeFiling: false,
          why: "reported rather than claimed, so the defect is visible to the audit"
        });
      }
      continue;
    }

    if (r.policy === "protect") {
      canonicalRefusals.push({
        ...base, reason: r.why, category: r.refusalClass,
        completenessClass: r.refusalClass, class: r.refusalClass,
        requiredBeforeFiling: r.refusalClass === SIGNATURE,
        ...(r.refusalClass === SIGNATURE
          ? {
            disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
            identity: `${source.formNumber} blank ${r.key}`,
            participantMustSupply: r.why
          }
          : {}),
        why: r.why
      });
      continue;
    }

    if (r.policy === "attorney") {
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
      requiredBeforeFiling: true, identity: `${source.formNumber} blank ${r.key}`,
      factId: null, routeDetermined: false,
      why: `the platform holds no value for this and the participant supplies it before filing: ${r.what}`,
      participantMustSupply: r.what
    });
  }

  return {
    formNumber: source.formNumber, documentId: source.formNumber, documentRole: source.instrumentKind,
    componentId: source.componentId,
    documentPolicy: {
      mode: source.captionOnly ? "court_issued_order" : "participant",
      captionOnly: source.captionOnly === true,
      documentAcceptsFill: true,
      routeKey: ROUTE.routeKey
    },
    structuralClass: "flat_pdf_measured_overlay",
    explicitMappings: Object.fromEntries(canonicalWrites.map((w) => [w.field, w.factId])),
    roleRefusals: [], selectionControls: [], canonicalWrites, canonicalRefusals,
    boundaryWrites: canonicalWrites, boundaryRefusals: canonicalRefusals,
    selectionControlsOnThisDocument: {
      acroFormSelectionFields: 0,
      annotations: 0,
      strokedCheckBoxPaths: census.strokedCheckboxCount,
      measuredCourtSelectionControls: measuredCourtControls(source.formNumber, census),
      printedSelectionControlsNotMeasured: [],
      note: source.formNumber === "CR-266"
        ? "CR-266 carries NO selection control of any kind. The three marks under paragraph 1 are SymbolMT "
          + "glyph 0x78, whose own /ToUnicode CMap maps it to U+F0B7 — the Symbol bullet — and they head a "
          + "three-item list of consequences, not a set of options. Every one of the six numbered declarations "
          + "is unconditional pre-printed text adopted by the petitioner's signature."
        : "CR-267 has eight stroked checkbox squares measured from decoded source streams. All are court-owned findings or order choices; ownership, not absence of geometry, requires leaving them blank."
    }
  };
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
    for (const w of p.actualWrites ?? []) if (w.factId && String(w.drawnText).trim()) availableFacts.add(String(w.factId));
  }
  const normLabel = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
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
    note("requiredFactsNotCollected", {
      field: b.field, label: b.label,
      why: "declared required-before-filing and not named in participant-instructions.md"
    });
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
    if (p.addedGlyphsReadFromOutputBytes === null || p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes === null) {
      note("visualDefects", {
        fixture: p.fixture, document: p.formNumber,
        why: "the output-byte glyph readings could not be measured, so no claim is made that the page is clean"
      });
      continue;
    }
    if ((p.valuesReportedByFinalizer ?? 0) > 0 && p.addedGlyphsReadFromOutputBytes === 0) {
      note("invisibleWrites", {
        fixture: p.fixture, document: p.formNumber,
        why: "the finalizer reported values and the output bytes carry no glyph the source does not also carry"
      });
    }
    if (p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes > 0) {
      note("visualDefects", {
        fixture: p.fixture, document: p.formNumber,
        why: "ink landed outside every measured write box",
        where: (p.addedInkOutsideEveryMeasuredWriteBox ?? []).slice(0, 6)
      });
    }
    for (const refused of p.refusedFieldsWithInk ?? []) {
      note("protectedWrites", {
        fixture: p.fixture, document: p.formNumber, field: refused.fieldId,
        why: "a blank the map refused carries ink in the output"
      });
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
  // The manifest declares three components; the third is process guidance and is
  // participant-instructions.md. A packet missing it is missing a component.
  if (!instructions.trim()) {
    note("requiredComponentsMissing", {
      component: "wi_exp_cr266-filing-instructions-3",
      why: "the packet-set manifest declares filing instructions as a required component and none was generated"
    });
  }

  return { counters, findings, ledger };
}

/* ---- artifacts ------------------------------------------------------------- */
function writeJson(rel, value) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(value, null, 2)}\n`);
}

function packetSetOfRecord() {
  const doc = JSON.parse(fs.readFileSync(path.join(ROOT, PACKET_SET_MANIFESTS), "utf8"));
  const set = (doc.packetSets ?? []).find((row) => row.packetSetId === PACKET_SET_ID);
  assert.ok(set, `the committed packet-set manifest has no entry for ${PACKET_SET_ID}`);
  return set;
}

function profileClauses() {
  const profile = JSON.parse(fs.readFileSync(path.join(ROOT, COMPILED_PROFILE), "utf8"));
  const clauses = [];
  const walk = (node) => {
    if (Array.isArray(node)) { for (const item of node) walk(item); return; }
    if (node && typeof node === "object") {
      if (Array.isArray(node.ruleClauses)) for (const c of node.ruleClauses) if (typeof c === "string") clauses.push(c);
      for (const value of Object.values(node)) walk(value);
    }
  };
  walk(profile);
  return clauses;
}

function requiredBeforeFilingItems(maps) {
  return maps.flatMap((m) => m.canonicalRefusals
    .filter((r) => r.requiredBeforeFiling === true)
    .map((r) => ({
      document: m.formNumber, field: r.field, page: r.page,
      section: r.sectionHeading, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply ?? r.why
    })));
}

/**
 * Sentences the committed record requires this guide to carry.
 *
 * Asserted over the GENERATED text before a byte of the overlay directory is
 * written, so a later edit cannot quietly drop one.
 */
function requiredPhrases(packetSet, clauses) {
  const feeLine = (packetSet.participantActionRequired ?? []).find((a) => a.kind === "pay_fee")?.description;
  const CR266_SCOPE_SENTENCE =
    "CR-266 is only for adult conviction cases where expungement was already ordered and there was no "
    + "probation/incarceration.";
  /*
   * The compiled profile carries this sentence inside an agent-facing clause
   * whose sentences are run together without spaces. Quoting the whole clause
   * puts "Wisconsin expungement is narrow.Adult conviction expungement must
   * usually be ordered at sentencing." in front of a participant, which is a
   * mangled quotation and worse than none. The exact sentence is located inside
   * the clause and quoted whole, and if the clause stops carrying it the build
   * stops rather than quoting something else.
   */
  const cr266Clause = clauses.find((c) => c.includes(CR266_SCOPE_SENTENCE));
  const cr266Only = cr266Clause ? CR266_SCOPE_SENTENCE : null;
  const atSentencing = clauses.find((c) => c.includes("Wisconsin usually requires adult expungement to be ordered at sentencing"));
  assert.ok(feeLine, "the packet-set manifest carries no pay_fee description to quote");
  assert.ok(cr266Only, "the compiled Wisconsin profile no longer carries the CR-266 scope sentence verbatim");
  assert.ok(atSentencing, "the compiled Wisconsin profile carries no at-sentencing clause to quote");
  return {
    feeLine, cr266Only, atSentencing,
    phrases: [
      feeLine,
      "This form shall not be modified. It may be supplemented with additional material.",
      "I declare under the criminal penalty of false swearing",
      "I was not placed on probation.",
      "I was not sentenced to jail or prison.",
      "CR-267 has no signature block",
      "CR-266 has no such assertion and no grounds"
    ]
  };
}

function participantInstructions({ maps, rbf, declarations, packetSet, phrases, gate }) {
  const byDoc = new Map();
  for (const i of rbf) byDoc.set(i.document, [...(byDoc.get(i.document) ?? []), i]);
  const out = [];

  out.push("# Filing instructions — Wisconsin petition to expunge a conviction record (CR-266)", "");
  out.push("This packet is two Wisconsin circuit court forms, filed together in the criminal case you already have:", "");
  out.push("- **CR-266**, _Petition to Expunge Court Record of Conviction (Non-Probation/Non-Incarceration)_ — what you file.");
  out.push("- **CR-267**, _Order on Petition to Expunge Court Record of Conviction (Non-Probation/Non-Incarceration)_ — the proposed order you file with the petition, for the court to enter its decision on.", "");
  out.push(`Both are prepared under ${ROUTE.authority}.`, "");
  out.push(
    "The platform filled in only what it holds about you and your case — your name, your date of birth, your address, "
    + "your e-mail, your telephone number, the county and the case number — on the caption of both forms, and your "
    + "printed name and contact details in the declaration block of CR-266. Everything else on both forms is either "
    + "already printed by the court or belongs to someone else, and this page says which is which.", ""
  );

  out.push("## Why these two forms and not others", "");
  out.push(`> ${phrases.cr266Only}`, "");
  out.push(
    "That is the whole of the choice. **CR-266 has no boxes to tick and no options to choose** — no fillable fields, "
    + "no check boxes, nothing electable anywhere on the page. Which form you use IS the choice, and it was made from "
    + "four facts about how your sentence ended:", ""
  );
  out.push("| The fact | What your record has to say | Where it shows on CR-266 |", "| --- | --- | --- |");
  out.push("| Expungement was ordered at sentencing | yes | paragraph 2 |");
  out.push("| You were placed on probation | no | paragraph 3 |");
  out.push("| You were sentenced to jail or prison | no | paragraph 4 |");
  out.push("| You completed the sentence, money included | yes | paragraph 5 |");
  out.push("");
  out.push(
    "If any one of those four is not what your record says, **this is the wrong form** and this packet is not built. "
    + "That is checked before anything is drawn, and the build stops rather than guessing.", ""
  );

  out.push("## The at-sentencing question, before anything else", "");
  out.push(`> ${phrases.atSentencing}`, "");
  out.push(
    "So the first thing to do with this packet is not to fill anything in. It is to get the **judgment of conviction**, "
    + "and the **sentencing transcript or minutes** if the judgment is silent, and read whether the judge ordered "
    + "expungement at sentencing. Paragraph 2 of CR-266 says that they did, and you sign it.", ""
  );

  out.push("## What you are signing", "");
  out.push(
    "CR-266 carries six numbered declarations. They are **already printed** — there is nothing to fill in and nothing "
    + "to leave blank in them, and you adopt all six the moment you sign. The form says how seriously: "
    + "_\"I declare under the criminal penalty of false swearing that the information I have provided is true and "
    + "accurate.\"_ Read each one against your own record before you sign:", ""
  );
  for (const d of declarations) {
    out.push(`${d.number}. ${d.text}`);
    for (const item of d.subItems ?? []) out.push(`   - ${item.replace(/\s+/g, " ").trim()}`);
  }
  out.push("");
  out.push(
    "Nothing was written on any of them, and neither the signature line nor the date beside it was filled in. Both are "
    + "yours, and the date is the day you actually sign.", ""
  );

  out.push("## What belongs to the court, on CR-267", "");
  out.push(
    "CR-267 is the court's order and only its caption was filled in — the county, your name, your date of birth and the "
    + "case number. Everything below the caption is the judge's, including **eight printed check boxes** this packet "
    + "does not mark:", ""
  );
  for (const c of COURT_SELECTION_LABELS) {
    out.push(`- **${c.section}** — beside _${c.printedNear}_`);
  }
  out.push("");
  out.push(
    "So are the three blank lines on it: the date of any hearing, the reason under _\"failed to:\"_, and the line after "
    + "_\"Other:\"_. Leave all of them alone. The court also prints, at the foot of both forms: "
    + "_\"This form shall not be modified. It may be supplemented with additional material.\"_", ""
  );

  out.push("## What you must do before you file", "");
  const KIND_LABEL = {
    obtain_document: "Get the document", confirm_answer: "Check your answer",
    complete_field: "Fill in", sign: "Sign", notarize: "Notarize",
    pay_fee: "Filing fee", apply_fee_waiver: "Fee waiver",
    serve_party: "Serve", file: "File"
  };
  let n = 1;
  for (const action of packetSet.participantActionRequired ?? []) {
    if (action.requiredBeforeFiling !== true) continue;
    const label = KIND_LABEL[action.kind] ?? action.kind;
    out.push(`${n++}. **${label}** — ${action.description}`);
  }
  out.push("");
  out.push("Then, once all of that is done:", "");
  for (const action of packetSet.participantActionRequired ?? []) {
    if (action.requiredBeforeFiling === true) continue;
    const label = KIND_LABEL[action.kind] ?? action.kind;
    out.push(`- **${label}** — ${action.description}`);
  }
  out.push("");
  out.push(
    "Two of those lines are the record saying it has nothing: the fee waiver reads _\"none identified\"_ and service "
    + "reads _\"none identified beyond ordinary circuit court practice\"_. That is what the record establishes and "
    + "this packet does not fill either gap in with a rule of its own.", ""
  );
  out.push("### Three of those items name something that is not a blank on these forms", "");
  out.push(
    "- _\"Judge's signature and date of entry — CR-267, signature block.\"_ **CR-267 has no signature block.** The "
    + "pinned form was searched for the words \"judge\", \"by the court\", \"signature\" and \"dated\" and prints none "
    + "of them; below the denial reasons it prints only _\"THIS IS A FINAL ORDER FOR THE PURPOSE OF APPEAL.\"_ and the "
    + "distribution list. Nothing was left blank for a judge's signature because the form leaves no room for one."
  );
  out.push(
    "- _\"Any assertion that the sentencing court ordered expungement — CR-266, grounds.\"_ **That assertion is "
    + "paragraph 2, and it is already printed.** CR-266 has no grounds section and no blank there. You make the "
    + "assertion by signing the form, which is why the judgment of conviction or the sentencing transcript has to be "
    + "in your hand before you do."
  );
  out.push(
    "- _\"Any benefit-and-no-harm assertion — CR-266, grounds.\"_ **CR-266 has no such assertion and no grounds "
    + "section.** Under § 973.015 the finding that the person will benefit and society will not be harmed is the "
    + "SENTENCING court's, made when expungement was ordered. There is nothing on this petition for you to assert "
    + "about it and nothing was left blank for it."
  );
  out.push("");

  out.push("## The filing fee", "");
  out.push(`> ${phrases.feeLine}`, "");
  out.push(
    "This packet quotes no fee and no fee waiver, because the record establishes neither. **Ask the clerk.**", ""
  );

  for (const [doc, items] of byDoc) {
    const title = ROUTE.documents.find((d) => d.formNumber === doc)?.title ?? doc;
    out.push(`## ${doc} — ${title}: the blanks left for you`, "");
    out.push("| Section | The blank on the form | Why it is yours |", "| --- | --- | --- |");
    for (const i of items) out.push(`| ${i.section} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## What the platform deliberately left blank", "");
  out.push("- **Your signature on CR-266**, and the **Date** beside it. You sign, and you date it the day you sign.");
  out.push("- **State Bar No. (if any)** on CR-266. That line is a lawyer's. This packet is prepared for you acting for yourself.");
  out.push("- **Everything on CR-267 below the caption** — all eight check boxes, the hearing date, the \"failed to:\" line and the \"Other:\" line.");
  out.push("");

  out.push("## What this packet is not", "");
  out.push(
    "This is a prepared set of official Wisconsin circuit court forms. It is not legal advice, it is not filed for you, "
    + "and it does not decide whether your record will be expunged. CR-267 prints four named reasons a court may give "
    + "for denying this petition, and an \"Other:\" line for a reason of its own. The decision is the court's."
  );
  out.push("");
  out.push(`_Route: ${ROUTE.routeKey} — ${ROUTE.authority}. Discharge facts established before build: `
    + `${gate.established.map((e) => `${e.factId}=${e.value}`).join(", ")}._`);
  return `${out.join("\n")}\n`;
}

/* ---- the entry point -------------------------------------------------------- */
export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");

  /*
   * THE HARD STOP, EXECUTED AND PROVED.
   *
   * Every fixture record passes the discharge gate before anything is bound,
   * and a record whose discharge type is unknown is run through the same gate
   * and required to fail. A gate nobody exercised is a gate nobody can trust.
   */
  const gates = Object.fromEntries(Object.keys(FIXTURES).map((name) => [name, dischargeGate(FIXTURES[name])]));
  const hardStopProof = dischargeGate(UNKNOWN_DISCHARGE_RECORD);
  if (hardStopProof.passes) {
    return {
      familyId: FAMILY_ID, status: "STOPPED", stopClass: "HARD_STOP_DOES_NOT_STOP",
      overlayDirectoryTouched: false, counters: null,
      countersAreNullBecause: "nothing was built",
      why: "the discharge gate accepted a record whose probation fact is not established. The hard stop the "
        + "owner's action requires does not work, so nothing was built."
    };
  }
  for (const [name, gate] of Object.entries(gates)) {
    if (gate.passes) continue;
    return {
      familyId: FAMILY_ID, status: "STOPPED", stopClass: "DISCHARGE_TYPE_NOT_ESTABLISHED",
      overlayDirectoryTouched: false, counters: null,
      countersAreNullBecause: "nothing was built, so no counter was measured",
      fixture: name,
      factsNotEstablished: gate.unestablished,
      why: "CR-266 asserts, in pre-printed paragraphs the petitioner adopts by signing, that expungement was "
        + "ordered at sentencing, that there was no probation, that there was no jail or prison, and that the "
        + "sentence was completed. A record that does not establish all four does not belong on this form."
    };
  }

  const { resolved, failures } = resolveSources();
  if (failures.length > 0) {
    return {
      familyId: FAMILY_ID, status: "STOPPED", stopClass: "BLOCKED_SOURCE",
      failedSourceIdentities: failures, counters: null,
      countersAreNullBecause: "nothing was built, so no counter was measured",
      why: "a source did not bind by exact SHA-256, so nothing may be rendered from it",
      overlayDirectoryTouched: false
    };
  }

  const censuses = [];
  for (const source of resolved) {
    const census = await censusFlat(source);
    assert.equal(census.ruleDrift.length, 0,
      `${source.formNumber}: ${census.ruleDrift.length} measured rule(s) are no longer printed where the anchor says: ${JSON.stringify(census.ruleDrift.slice(0, 3))}`);
    assert.equal(census.acroFieldCount, 0,
      `${source.formNumber}: the corpus index records this form as flat and it now carries ${census.acroFieldCount} AcroForm field(s)`);
    assert.equal(census.annotationCount, 0,
      `${source.formNumber}: this form now carries ${census.annotationCount} annotation(s); the overlay strategy and the source render both assume none`);
    assert.equal(census.strokedCheckboxCount, source.formNumber === "CR-267" ? 8 : 0,
      `${source.formNumber}: decoded source checkbox geometry changed; inspect source controls before building`);
    assert.equal(census.rows.length, Object.keys(ANCHORS[source.formNumber]).length,
      `${source.formNumber}: ${census.rows.length} of ${Object.keys(ANCHORS[source.formNumber]).length} anchors resolved`);
    if (source.pageCount != null) {
      assert.equal(census.pageCount, source.pageCount,
        `${source.formNumber}: censused ${census.pageCount} page(s), the committed corpus index declares ${source.pageCount}`);
    }
    censuses.push({ source, census });
  }

  const cr266 = censuses.find((c) => c.source.formNumber === "CR-266");
  const declarations = declarationsOfCr266(cr266.census);
  assert.equal(declarations.length, 6,
    `CR-266: read ${declarations.length} numbered declarations out of the pinned bytes, expected 6`);

  const packetSet = packetSetOfRecord();
  const clauses = profileClauses();
  const phrases = requiredPhrases(packetSet, clauses);

  if (checkOnly) {
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY",
      dischargeGate: { canonical: gates.canonical, hardStopRefusesUnknown: !hardStopProof.passes },
      declarationsReadFromTheBytes: declarations.length,
      documents: censuses.map(({ source, census }) => ({
        formNumber: source.formNumber, sha256: source.sha256, pages: census.pageCount,
        structuralClassObserved: source.structuralClassObserved,
        measuredRulesOnTheForm: census.measuredRuleCount,
        acroFieldsOnTheForm: census.acroFieldCount,
        annotationsOnTheForm: census.annotationCount,
        strokedTickBoxes: census.strokedCheckboxCount,
        blanks: census.rows.length,
        writes: census.rows.filter((r) => r.policy === "write").length,
        protected: census.rows.filter((r) => r.policy === "protect").length,
        attorneyOnly: census.rows.filter((r) => r.policy === "attorney").length
      }))
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  const artifacts = [];
  const writeProofs = [];
  const maps = [];

  for (const fixtureName of ["canonical", "boundary"]) {
    const perDocument = [];
    for (const { source, census } of censuses) {
      const { bytes, report } = await renderFlat(source, census, fixtureName);
      const proof = await byteProof(source, census, bytes, report, fixtureName);
      const file = `${OUT}/fixtures/${source.formNumber.toLowerCase()}-${fixtureName}.pdf`;
      fs.writeFileSync(path.join(ROOT, file), bytes);
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      perDocument.push({
        document: source.formNumber, componentId: source.componentId, fixture: fixtureName, file,
        sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
        byteLength: bytes.length, pageCount: doc.getPageCount(),
        sourceSha256: source.sha256
      });
      writeProofs.push({
        fixture: fixtureName, formNumber: source.formNumber,
        sourceSha256: source.sha256,
        proofMethod:
          "every text item in the produced PDF that the pinned source does not draw at the same coordinate is "
          + "ink this build added; each added item is tested against every measured write box on its own page. "
          + "Read from the bytes that were written, never from the finalizer's report.",
        valuesReportedByFinalizer: report.written.length,
        addedGlyphsReadFromOutputBytes: proof.addedGlyphsReadFromOutputBytes,
        nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: proof.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
        flattenedWidgetAppearancesReadFromOutputBytes: 0,
        flattenedWidgetAppearancesNote:
          "zero because there are none to read: both sources are flat PDFs with no AcroForm and no annotation, "
          + "so finalizeFlatOverlay draws into page content and creates no widget appearance. This is a measured "
          + "absence, not a skipped measurement.",
        addedInkOutsideEveryMeasuredWriteBox: proof.addedInkOutsideEveryMeasuredWriteBox,
        refusedFieldsWithInk: proof.refusedFieldsWithInk,
        unfittable: report.unfittable,
        refusedByTheFinalizer: report.refused,
        normalized: report.normalized,
        actualWrites: proof.actualWrites
      });
      if (fixtureName === "canonical") maps.push(mapFor(source, census, report));
    }

    // The packet: both documents, in the order the manifest declares.
    /*
     * pdf-lib stamps the wall clock into a document made with create(), so two
     * builds of the same family from the same inputs hash differently and a
     * RASTER_PASS bound to a digest is discarded as though the packet had been
     * edited. Measured here before this line was added: the two per-document
     * PDFs were byte-identical across runs and the assembled packet was not.
     */
    const packet = stampDeterministic(await PDFDocument.create());
    const pageManifest = [];
    for (const entry of perDocument) {
      const doc = await PDFDocument.load(fs.readFileSync(path.join(ROOT, entry.file)), { ignoreEncryption: true });
      const copied = await packet.copyPages(doc, doc.getPageIndices());
      for (const [i, p] of copied.entries()) {
        packet.addPage(p);
        pageManifest.push({
          packetPage: packet.getPageCount(), formNumber: entry.document,
          sourcePage: i + 1, sourceSha256: entry.sourceSha256
        });
      }
    }
    const packetBytes = await packet.save({ useObjectStreams: false, updateMetadata: false });
    const packetFile = `${OUT}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, packetFile), packetBytes);
    artifacts.push({
      fixture: fixtureName, file: packetFile,
      sha256: crypto.createHash("sha256").update(packetBytes).digest("hex"),
      byteLength: packetBytes.length, pageCount: packet.getPageCount(),
      pageManifest, documents: censuses.map((c) => c.source.formNumber),
      perDocument
    });
  }

  const rbf = requiredBeforeFilingItems(maps);
  const instructionsText = participantInstructions({
    maps, rbf, declarations, packetSet, phrases, gate: gates.canonical
  });
  for (const phrase of phrases.phrases) {
    assert.ok(instructionsText.includes(phrase),
      `participant-instructions.md does not carry a sentence the committed record requires: ${JSON.stringify(phrase.slice(0, 80))}`);
  }
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID, worklistGroupId: FAMILY_ID,
    jurisdiction: ROUTE.jurisdiction, implementationStrategy: "official_pdf_fill",
    implementationStrategyNote:
      "The assignment names official_pdf_fill and BOTH forms are flat PDFs: no AcroForm, no annotation, nothing "
      + "fillable. Each is built as a measured overlay through finalizeFlatOverlay against rules read from the "
      + "page's own content stream, which is the path the Washington vacatur and Colorado JDF-680 families use.",
    custodyClass: "SOURCE_ALREADY_HELD", acquisitionCommissioned: false,
    corpusRootFromEnvironment: "MASTER_LIBRARY_SOURCE_DIR",
    bindingMethod: "exact form number + committed corpus-index SHA-256 + on-disk SHA-256 + byte length",
    routeKey: ROUTE.routeKey, routeSelectionId: ROUTE.routeSelectionId, statutoryAuthority: ROUTE.authority,
    allSourcesExact: true,
    documents: resolved.map((r) => ({
      sourceIds: [r.sourceId], documentId: r.formNumber, formNumber: r.formNumber, revision: r.revision,
      pathInArchive: r.pathInArchive, sha256: r.sha256, byteLength: r.byteLength,
      instrumentKind: r.instrumentKind, componentId: r.componentId,
      structuralClassObserved: r.structuralClassObserved, acroFieldCount: r.acroFieldCount,
      printedRevisionOnTheFace: r.formNumber === "CR-266" ? "CR-266, 05/24" : "CR-267, 02/15"
    })),
    revisionLabelNote:
      "The corpus index and the archive filename label BOTH forms REV-2024-05. CR-266 prints \"CR-266, 05/24\" "
      + "and agrees. CR-267 prints \"CR-267, 02/15\" and does not: its own face says February 2015, and its "
      + "filename carries both tokens (cr-267-02-15-… __REV-2024-05__). The bytes are the ones the queue binds "
      + "and nothing was substituted; the label is recorded as observed rather than repeated.",
    sourceBinaryCommitted: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1", familyId: FAMILY_ID,
    captionBasis:
      "Neither form has a field, so there is no authored field name and no /TU tooltip to read a caption from. "
      + "Every blank here is the printed RULE the value sits on, measured from the page's own content stream, "
      + "and its caption is the printed text located by its own x and y beside or beneath that rule. "
      + "captionEvidence records, per blank, which printed text was used and where it sits.",
    twoBlanksOnOneRule:
      "CR-266 prints one rule at y=228.29 under two captions (Email Address at x=284.69, Telephone Number at "
      + "x=457.75) and one at y=206.69 under two more (Date, State Bar No.). The form prints no divider, so each "
      + "blank's extent is bounded by the printed x of the caption beside it; ruleSpanTaken and sharesRuleWith "
      + "record the split.",
    documents: censuses.map(({ source, census }) => ({
      documentId: source.formNumber, formNumber: source.formNumber, sourceSha256: source.sha256,
      strategy: "measured_flat_overlay", structuralClassObserved: source.structuralClassObserved,
      pageCount: census.pageCount, fieldCount: census.rows.length,
      acroFieldsOnTheForm: census.acroFieldCount,
      annotationsOnTheForm: census.annotationCount,
      strokedTickBoxesOnTheForm: census.strokedCheckboxCount,
      measuredCourtSelectionControls: measuredCourtControls(source.formNumber, census),
      measuredHorizontalRulesOnTheForm: census.measuredRuleCount,
      printedSelectionControlsNotMeasured: [],
      fields: census.rows.map((r) => ({
        field: r.key, page: r.page, rect: r.rect, rectBasis: r.rectBasis,
        measuredRule: r.measuredRule,
        ...(r.ruleSpanTaken ? { ruleSpanTaken: r.ruleSpanTaken, sharesRuleWith: r.sharesRuleWith } : {}),
        captionEvidence: r.captionEvidence,
        pdfType: r.type, isSelectionControl: r.isSelectionControl, multiline: r.multiline, maxLength: r.maxLength,
        section: r.section, effectiveLabel: r.effectiveLabel, policy: r.policy, factId: r.fact,
        printedSuffixAfterBlank: r.printedSuffixAfterBlank,
        printedTextAtCoordinate: r.printedTextAtCoordinate
      }))
    })),
    cr266DeclarationsReadFromTheBytes: declarations
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    routeKeys: [ROUTE.routeKey], routeSelectionId: ROUTE.routeSelectionId,
    renderStrategy: "measured_flat_overlay",
    dispositionVocabulary: [SIGNATURE, COURT_OWNED, PARTICIPANT_ELECTION],
    routeDeterminedSelections: [],
    routeSelectionNote:
      "There is nothing on either form to elect. CR-266 carries no AcroForm field, no annotation, no stroked "
      + "check box and no selection glyph — the three marks under paragraph 1 are SymbolMT bullets by the font's "
      + "own /ToUnicode CMap. CR-267's eight printed check boxes are all the court's. The discharge-type election "
      + "this route makes is the choice of THESE FORMS, recorded under dischargeFactsThatSelectedTheseForms.",
    dischargeFactsThatSelectedTheseForms: {
      ownerAction: "Map established discharge facts to exact CR-266 selections, leave participant assertions "
        + "blank, hard-stop unknown discharge types, and release the build.",
      resolvedTo: "CR-266 has no selections. The established discharge facts select the FORM; nothing on the form "
        + "is elected because nothing on it is electable.",
      gate: DISCHARGE_GATE.map((rule) => ({ factId: rule.factId, mustBe: rule.mustBe, why: rule.why })),
      established: gates.canonical.established,
      hardStopProof: {
        recordTested: "the canonical record with matter.wi_sentence_included_probation set to null",
        refused: !hardStopProof.passes,
        factsNotEstablished: hardStopProof.unestablished
      }
    },
    participantAssertionsLeftAsPrinted: {
      what: "CR-266 paragraphs 1 to 6",
      why: "each is unconditional pre-printed text the petitioner adopts by signing under the criminal penalty of "
        + "false swearing. There is no blank in any of them: nothing was written and nothing could be left blank. "
        + "All six are printed verbatim in participant-instructions.md, read out of the pinned bytes, so the "
        + "participant checks each against their own record before signing.",
      declarations
    },
    requiredBeforeFilingCount: rbf.length, requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID, renderedFresh: true,
    artifacts,
    packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    everyPageRastered: false,
    rasterEngine: skipRaster ? "not rendered in this run" : "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)",
    rasterPages: [],
    rasterState: "BUILT_RASTER_PENDING",
    rasterNote:
      "No page raster was produced in this run and none was dispatched. A local render is not a receipt: only the "
      + "central raster workflow issues one, bound to the exact SHA-256 recorded here.",
    byteDerivedHashes: true,
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID, derivedFromArtifactBytes: true,
    note:
      "Read back from the produced PDF bytes, not from the finalizer's report. Both glyph readings below are "
      + "measured: addedGlyphsReadFromOutputBytes counts every glyph the output draws that the source does not, "
      + "and nonWhitespaceGlyphsOutsideMeasuredWriteBoxes counts the non-whitespace part of those that land "
      + "outside every measured write box on their page. Neither is a literal, and both come back null rather "
      + "than 0 if the source cannot be read back for subtraction.",
    documents: writeProofs,
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture, formNumber: p.formNumber,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      refusedFieldsWithInk: p.refusedFieldsWithInk
    })),
    blockingFindings: writeProofs.flatMap((p) => (p.refusedFieldsWithInk ?? []).map((r) => ({
      fixture: p.fixture, document: p.formNumber, field: r.fieldId,
      finding: "a blank the map refused carries ink in the output"
    })))
  });

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: FAMILY_ID,
    requiredBeforeFiling: rbf,
    handMarkedControls: censuses.flatMap(({ source, census }) => measuredCourtControls(source.formNumber, census)),
    handMarkedControlsNote:
      "All eight CR-267 controls are measured from decoded source streams and are court-owned findings or order choices. The participant must leave them blank.",
    participantElections: [],
    participantElectionsNote:
      "None. CR-266 offers the participant no election of any kind — no field, no annotation, no check box, no "
      + "selection glyph. Its six declarations are pre-printed and adopted by signature.",
    protectedBlanks: maps.flatMap((m) => m.canonicalRefusals.map((r) => ({
      document: m.formNumber, field: r.field, page: r.page, label: r.effectiveLabel,
      refusalClass: r.category, requiredBeforeFiling: r.requiredBeforeFiling === true, why: r.why
    }))),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  writeJson(`${OUT}/reports/independent-visual-review.json`, {
    schemaVersion: "rcap-independent-visual-review/v1", familyId: FAMILY_ID,
    required: true, granted: false, reviewedBy: null,
    note:
      "Both documents are drawn onto flat forms at measured coordinates, so a reviewer reading the paper is the "
      + "check that a value sits ON the rule it belongs to rather than merely near it. No page raster was "
      + "produced in this run; the fixtures are the artifact to read.",
    whatToLookAt: [
      "CR-266 caption: the county on the venue rule, with the form's own printed word COUNTY still legible after "
        + "it and NOT doubled — the boundary fixture's county is recorded as \"Fond du Lac County\" and the "
        + "printed suffix is stripped before drawing.",
      "CR-266 caption: the case number inside the 77.16pt rule at x=354.91-432.07 and NOT crossing the caption "
        + "box's vertical divider at x=464.26.",
      "CR-266 declaration block: paragraphs 1 to 6 completely unmarked, the Signature line empty, and the Date "
        + "beside it empty.",
      "CR-266 signature block: Name Printed or Typed, Address, Email Address and Telephone Number each on their "
        + "own rule. The e-mail and the telephone SHARE one printed rule; check the e-mail does not run into the "
        + "telephone's part of it and that the telephone sits above its own caption.",
      "CR-266: State Bar No. (if any) empty.",
      "CR-267: caption written — county, defendant's name, date of birth, case number — and everything below it "
        + "untouched: all eight check boxes unmarked, the hearing-date line empty, the \"failed to:\" line empty "
        + "and the \"Other:\" line empty.",
      "Both forms: nothing anywhere on the page that is not a participant or matter fact. No route key, no "
        + "component id, no digest, no build vocabulary."
    ],
    artifacts: artifacts.map((a) => ({ fixture: a.fixture, file: a.file, sha256: a.sha256, pageCount: a.pageCount }))
  });

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID,
    buildStatus: "state_built", reviewStatus: "qa_review_pending", builtBy: BUILD_SCRIPT,
    rasterEngine: skipRaster ? "not rendered in this run" : "chromium_calibrated", popplerUsed: false,
    renderedArtifacts: artifacts.length, rasterPages: 0, rasterState: "BUILT_RASTER_PENDING",
    independentVerificationStatus: "PENDING", selfVerified: false,
    generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  });

  const counted = countCompleteness(maps, writeProofs, artifacts, instructionsText);
  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID,
    whatThisIs:
      "The BUILDER's own count of the nine completeness counters, computed with the repository's own contract "
      + "functions over this family's field map, byte proof, rendered artifacts and participant-instructions.md.",
    whatThisIsNot:
      "A verdict. This lane does not verify its own packets, and PASS_COMPLETE additionally requires a "
      + "hash-bound RASTER_PASS from the central raster workflow.",
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
          "The owner's action asks for established discharge facts to be mapped to exact CR-266 SELECTIONS. "
          + "CR-266 has none: zero AcroForm fields, annotations and decoded stroked checkbox paths. CR-267 has eight measured court-owned checkbox squares. CR-266's only symbol glyphs are three SymbolMT marks that the font's own "
          + "/ToUnicode CMap maps to U+F0B7, the Symbol bullet, heading the three-item list under paragraph 1.",
        consequence:
          "The mapping resolves to a PRECONDITION rather than a mark: the four established discharge facts select "
          + "CR-266 and CR-267, and nothing on either form is elected. The gate is executed before anything is "
          + "bound and is proved by running it against a record whose probation fact is null and requiring it to "
          + "refuse."
      },
      {
        finding:
          "\"Leave participant assertions blank\" has no blank to leave. CR-266's six declarations are "
          + "unconditional pre-printed text the petitioner adopts by signing under the criminal penalty of false "
          + "swearing.",
        consequence:
          "Nothing is written anywhere in the declaration block, the signature and its date are left empty, and "
          + "all six declarations are printed verbatim in the guide, read out of the pinned bytes, so the "
          + "participant checks each against their own record before signing."
      },
      {
        finding:
          "Two of the packet-set manifest's own requiredBeforeFiling items name places on these forms that do not "
          + "exist: \"Judge's signature and date of entry — CR-267, signature block\" and \"Any benefit-and-no-harm "
          + "assertion — CR-266, grounds\".",
        consequence:
          "Both are disclosed in the guide as items that have nowhere to go, with what was measured. CR-267 was "
          + "searched for \"judge\", \"by the court\", \"signature\" and \"dated\" and prints none of them. CR-266 "
          + "has no grounds section and no benefit-and-no-harm assertion; under § 973.015 that finding is the "
          + "sentencing court's. Nothing was invented for either and no blank was fabricated to receive them."
      },
      {
        finding:
          "CR-266 prints ONE rule at y=228.29 beneath two captions (Email Address at x=284.69, Telephone Number "
          + "at x=457.75) and ONE at y=206.69 beneath two more (Date, State Bar No. (if any)). The form prints no "
          + "divider between them.",
        consequence:
          "Each blank's extent is bounded by the printed x of the caption beside it — measured geometry, not a "
          + "chosen midpoint — and ruleSpanTaken/sharesRuleWith record the split on every affected row. The "
          + "telephone blank is 47.55pt of rule and is drawn at 8pt so it stays inside it."
      },
      {
        finding:
          "CR-267's face prints \"CR-267, 02/15\" while the corpus index and the archive filename label it "
          + "REV-2024-05.",
        consequence:
          "Recorded as observed in source-receipt.json. The bound digest is the one MASTER_QUEUE declares and "
          + "nothing was substituted."
      },
      {
        finding:
          "CR-267's page content begins about 30% down a 612x792 page: its caption baseline is at y=557.98 where "
          + "CR-266's is at y=737.76, leaving roughly three inches of blank paper above the caption.",
        consequence:
          "Recorded for visual review. It is a property of the pinned binary and was not altered; a build that "
          + "moved the court's own content to close the gap would be modifying a form whose foot prints \"This "
          + "form shall not be modified.\""
      },
      {
        finding:
          "No page raster was produced. --no-raster was passed deliberately.",
        consequence:
          "rasterState is BUILT_RASTER_PENDING and no workflow was dispatched. A local render is not a receipt; "
          + "only the central raster workflow issues one, bound to the exact SHA-256 recorded here."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    mattersForTheReviewersAttention: [
      "Both documents are drawn onto flat forms at measured coordinates. reports/independent-visual-review.json "
        + "names what to look at; placement is the thing only a reviewer reading the paper can confirm.",
      "The discharge-type mapping this family was assigned resolved to a precondition over the record rather than "
        + "a mark on the page, because CR-266 has no selection control of any kind. "
        + "production-field-map.json → dischargeFactsThatSelectedTheseForms records the gate, what it established, "
        + "and the proof that it refuses an unestablished record.",
      "Two of the packet-set manifest's requiredBeforeFiling items name places on these forms that do not exist. "
        + "See build-findings.json; both are disclosed to the participant rather than silently dropped."
    ]
  });

  const allZero = PASS_COUNTERS.every((c) => counted.counters[c] === 0);
  return {
    familyId: FAMILY_ID,
    status: allZero ? "COMPLETED" : "STOPPED",
    ...(allZero ? {} : {
      stopClass: "COMPLETENESS_COUNTER_NOT_ZERO",
      nonZeroCounters: PASS_COUNTERS.filter((c) => counted.counters[c] > 0),
      firstFindings: counted.findings.slice(0, 8)
    }),
    counters: counted.counters,
    directory: OUT,
    rasterState: "BUILT_RASTER_PENDING",
    documents: resolved.map((r) => `${r.formNumber} (measured_flat_overlay)`),
    dischargeGate: {
      established: gates.canonical.established,
      hardStopRefusesUnknownDischargeType: !hardStopProof.passes
    },
    writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
    requiredBeforeFiling: rbf.length,
    outputByteGlyphReadings: writeProofs.map((p) => ({
      document: p.formNumber, fixture: p.fixture,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes
    })),
    artifacts: artifacts.map((a) => ({
      fixture: a.fixture, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount,
      perDocument: a.perDocument.map((d) => ({ document: d.document, sha256: d.sha256, pageCount: d.pageCount }))
    })),
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((r) => { console.log(JSON.stringify(r, null, 2)); if (r.status === "STOPPED") process.exit(1); })
    .catch((e) => { console.error(e); process.exit(1); });
}

export { runFamily as build, FAMILY_ID, OUT, censusFlat, measuredCourtControls, resolveSources, dischargeGate, DISCHARGE_GATE, FIXTURES };
