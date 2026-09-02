#!/usr/bin/env node
/**
 * The Connecticut missed-automatic-erasure review packet family builder.
 *
 *   node scripts/build-census-v1-ct-missed-erasure-set.mjs [--check] [--no-raster]
 *
 * One census-v1 family, strategy participant_agency_application, TWO
 * statutory stages of which ONLY THE FIRST is buildable:
 *
 *   ct-missed-erasure-stage-1-record-and-assessment   process guidance (built)
 *   ct-missed-erasure-stage-2-despp-submission        UNRESOLVED (not built)
 *
 * WHY THIS PACKET IS GUIDANCE ONLY, READ FROM THE RECORDS
 *
 * The MASTER_QUEUE row binds ZERO sources: sourceStatus
 * CUSTOM_PLEADING_FROM_CODIFIED_TEXT, officialFormFamily NONE, forms [],
 * boundCount 0. The family's own legal-design record
 * (data/record-clearing/legal-design-intake/CT.memo.json, track
 * ct-missed-erasure, reviewedAsOf 2026-07-30) preserves a TRUE OUTPUT
 * BLOCKER on stage 2: C.G.S. § 54-142t(g) requires the submission to be made
 * to DESPP "in a form and manner determined by the department", that form
 * and manner is not in the statute and has not been located, and the record
 * classifies inventing a DESPP filing form as a legal_design_blocker. This
 * build therefore renders the stage-1 process guidance the record approves —
 * obtain the SPBI criminal history record via form DPS-0846-C, read it for
 * an erasure marking, and decide whether the record should have been deemed
 * erased under § 54-142a(e) — and generates NO submission document. The
 * packet-set manifest for this family names exactly one component:
 * process_guidance.
 *
 * The queue row's directory carries the suffix --official-pdf-fill; that
 * queue-owned path is used exactly as the row states it. No official PDF is
 * filled here and none exists to fill — DPS-0846-C is named as a document the
 * PARTICIPANT obtains and mails, never rendered, filled or bound.
 *
 * WHAT THIS BUILD WRITES, AND WHAT IT CARRIES
 *
 * The platform writes only the participant's name on the guidance. There are
 * no fillable blanks: nothing is filed, and the one required document — the
 * SPBI record search — is obtained by the participant from DESPP-SPBI, which
 * the guidance names with its recorded address and its recorded (dated,
 * verify-before-relying) fee figures.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { classifyField, classifyBlank, rowKeyOf, PASS_COUNTERS, BLANK_DISPOSITIONS } from "./rcap-packet-completeness/completeness-contract.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const FAMILY_ID = "ct-missed-erasure-set";
const OUT = "data/rcap-all50/overlays/census-v1/ct/ct-missed-erasure-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-ct-missed-erasure-set.mjs";
const IMPLEMENTATION_STRATEGY = "participant_agency_application";

const ROUTE = Object.freeze({
  jurisdiction: "CT",
  routeKeys: [
    "obligation:unit:CT:ct-missed-erasure:ct-missed-erasure-stage-1-record-and-assessment",
    "obligation:unit:CT:ct-missed-erasure:ct-missed-erasure-stage-2-despp-submission"
  ],
  primaryRouteKey: "obligation:unit:CT:ct-missed-erasure:ct-missed-erasure-stage-1-record-and-assessment",
  routeSelectionId: "ct-missed-erasure-composed-set",
  legalName: "Request for Review of a Missed Automatic Erasure, C.G.S. § 54-142t(g)",
  routeName: "finding out whether a Connecticut record that should have been erased automatically was actually erased, and preparing for the C.G.S. § 54-142t(g) review",
  statute: "C.G.S. § 54-142t(g)"
});

const COMPONENTS = ["process_guidance"];

const COMPOSED_TITLES = {
  process_guidance: "Process Guidance - Was Your Record Actually Erased, and What Comes Next"
};

const COMPONENT_CONDITIONS = {};

const COMPOSED_FROM =
  "the legal-design intake record (data/record-clearing/legal-design-intake/CT.memo.json, track "
  + "ct-missed-erasure, reviewedAsOf 2026-07-30) and the packet-set manifest "
  + "(data/record-clearing/legal-design-packet-set-manifests.json, ct-missed-erasure-set)";

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.street_address": "42 Elm Street, Hartford, CT 06103",
    "participant.phone": "860-555-0142",
    "participant.email": "jordan.reyes@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B, New London, Connecticut 06320-2214",
    "participant.phone": "(959) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
  }
};

const DOTS = (n = 84) => ".".repeat(n);

function composedBody(componentId, facts) {
  const name = facts["participant.full_legal_name"];
  const L = [];
  L.push(COMPOSED_TITLES[componentId].toUpperCase(), "");
  L.push(`This guidance is prepared for ${ROUTE.routeName}.`, "");
  L.push(`Prepared for: ${name}`, "");
  L.push("WHY THIS QUESTION NEEDS ASKING AT ALL. Connecticut erases certain records by operation of law under C.G.S. Sec. 54-142a(e), through the automated process Sec. 54-142t creates - but the state does not currently notify people that their records were erased. 'Was my record actually erased' is therefore the question this guidance answers first, and since 1 January 2024, Sec. 54-142t(g) gives a person who believes their record was required to be deemed erased, and finds it has not been marked as erased, a review remedy at the Department of Emergency Services and Public Protection (DESPP).", "");
  L.push("STAGE ONE - GET THE RECORD, READ IT, DECIDE. This is the stage this packet completes.", "");
  L.push("STEP ONE. Obtain your own criminal history record search from the State Police Bureau of Identification (SPBI), using form DPS-0846-C, the State of Connecticut Criminal History Record Request Form. You obtain and mail that form yourself - this packet does not fill it, and the statute requires a copy of this search as the proof that the information has not been marked as erased. Mail the completed form with payment to: DESPP-SPBI, 1111 Country Club Road, Middletown, CT 06457-2389, by check or money order payable to 'Treasurer-State of CT'.", "");
  L.push("STEP TWO. Know the cost before you mail. As printed on the DPS-0846-C form dated 12/01/17: $36 for a name and date of birth search showing only the existence of a record; $75 for a conviction history record search by name and date of birth; or $75 by fingerprint plus $15 for fingerprinting at a Connecticut State Police location. THOSE FIGURES ARE FROM A FORM DATED 12/01/17 AND MUST BE VERIFIED WITH DESPP-SPBI BEFORE RELYING ON THEM - the form itself warns that information may change.", "");
  L.push("STEP THREE. Read the result for an erasure marking. What you are looking for is whether the conviction you believe should have been erased appears, and whether it is marked as erased.", "");
  L.push("STEP FOUR. Decide whether there is a case. The records eligible to be deemed erased by operation of law are those Sec. 54-142a(e) describes, and the timing turns on dates you know: the date of the offense, and the date of your most recent judgment of conviction for any crime. If the record shows the information marked as erased, there is nothing to pursue - you are done, and that is a good outcome. If the conviction appears unmarked and you believe it was required to be deemed erased, stage two exists for exactly that.", "");
  L.push("STAGE TWO - THE DESPP SUBMISSION. THIS PACKET DOES NOT GENERATE IT, AND HERE IS WHY. Sec. 54-142t(g) requires the submission to be made to DESPP 'in a form and manner determined by the department'. That form and manner is not in the statute, it had not been located when the legal-design record was made, and the record classifies inventing a DESPP filing form as a design blocker. No submission document is generated, and none should be improvised: ask DESPP what form and manner it has determined for a Sec. 54-142t(g) submission, and use exactly that.", "");
  L.push("WHAT STAGE TWO LOOKS LIKE, SO YOU KNOW WHAT YOU ARE WALKING INTO. The submission includes a copy of your criminal history record search demonstrating that the information has not been marked as erased. DESPP then determines the matter FOLLOWING A CONTESTED HEARING, and that determination is a final decision under the Uniform Administrative Procedure Act (chapter 54). A contested administrative hearing against the state is a lawyer's proceeding: when you reach it, take a lawyer. This guidance is the whole of what self-help covers on this route.", "");
  L.push("ONE RUMOUR TO IGNORE. A rule that the SPBI report itself must be 'dated on or after January 1, 2024' appears in older internal material and looks like a misreading - that date is when the Sec. 54-142t(g) remedy became available, and nothing found requires the report to bear a post-2024 date. The point is recorded as unresolved rather than as a rule; get a current report anyway, because a current report is simply better evidence.", "");
  L.push("WHEN TO STOP AND GET HELP.");
  L.push("- The DESPP submission stage itself: its form and manner is undetermined here, and the contested hearing that follows is a lawyer's proceeding.");
  L.push("- You have an immigration matter.");
  L.push("- You cannot tell from the record whether the conviction was eligible for erasure by operation of law - eligibility under Sec. 54-142a(e) can turn on offense class, date and your later record, and a wrong guess wastes the filing.", "");
  L.push("TERMINOLOGY. Connecticut says ERASURE - not expungement, not sealing.");
  L.push("", `Route: ${ROUTE.routeKeys.join(" ; ")}`);
  return L.join("\n");
}

function composedMap(componentId) {
  const writes = [];
  const refusals = [];
  writes.push(mapWrite(componentId, "participant_name", "Person the process guidance is prepared for", "participant.full_legal_name"));
  return composedMapShell(componentId, writes, refusals);
}

const RECEIPT = {
  groundingRecords: [
    { record: "data/record-clearing/legal-design-intake/CT.memo.json", track: "ct-missed-erasure", reviewedAsOf: "2026-07-30" },
    { record: "data/record-clearing/legal-design-packet-set-manifests.json", packetSetId: "ct-missed-erasure-set" }
  ],
  officialSourcesRecordedInIntake: [
    { title: "C.G.S. § 54-142t, Automated process for erasure; request for review of criminal history records for erasure", url: "https://codes.findlaw.com/ct/title-54-criminal-procedure/ct-gen-st-sect-54-142t/", retrievedOn: "2026-07-30" },
    { title: "DPS-0846-C, State of Connecticut Criminal History Record Request Form, Rev. 12/01/17", url: "https://portal.ct.gov/despp", retrievedOn: "2026-07-30" }
  ],
  formIdentityNote:
    "Stage 2's instrument does not exist to bind: § 54-142t(g) requires the submission to DESPP 'in a form and "
    + "manner determined by the department', that form and manner is not in the statute and had not been located, "
    + "and the legal-design record classifies inventing a DESPP filing form as a legal_design_blocker. This build "
    + "renders only the stage-1 process guidance the record approves, exactly as the packet-set manifest directs "
    + "(one component, process_guidance). DPS-0846-C is named as a document the participant obtains and mails to "
    + "DESPP-SPBI; it is not rendered, filled or bound, and its printed fees (dated 12/01/17) are stated with a "
    + "verify-before-relying warning. The queue row's directory suffix (--official-pdf-fill) is the queue-owned "
    + "path and is used exactly as the row states it; no official PDF is filled here.",
  whatThisReceiptDoesNotEstablish: [
    "DESPP's current form and manner for a § 54-142t(g) submission — the recorded true output blocker; no submission document exists in this packet",
    "current SPBI fees and process — the recorded figures are from a form dated 12/01/17 and must be verified",
    "whether the SPBI report must bear any particular date — recorded as unresolved, not as a rule",
    "that any output is approved for participant delivery, or that any record was required to be deemed erased under § 54-142a(e)"
  ]
};

const FIELDMAP_NOTES = {
  routeSelectionNote:
    "Two statutory stages, one buildable: the stage-1 guidance is rendered, and stage 2 is deliberately absent "
    + "because DESPP's determined form and manner is a recorded output blocker no build may improvise around. "
    + "Nothing is filed and no election is rendered; the guidance states the stage boundary and the attorney "
    + "handoff at the contested hearing in terms."
};

const INSTRUCTIONS = {
  title: `What you must do — ${ROUTE.routeName}`,
  introLines: [
    `This packet is prepared for **${ROUTE.legalName}**.`,
    "",
    "**This packet is guidance only, by design.** Nothing in it is filed with any court, and it generates no DESPP submission: § 54-142t(g) requires the submission to be made 'in a form and manner determined by the department', that form and manner has not been located, and the legal-design record forbids inventing one. What the packet does complete is stage one — getting your official record, reading it, and deciding whether there is a case.",
    "",
    "**Connecticut says erasure** — not expungement, not sealing — and the state does not currently notify people that their records were erased, which is why 'was my record actually erased' is the question to answer first."
  ],
  componentBlurbs: {
    process_guidance: "the whole stage-1 process — obtaining the SPBI record via DPS-0846-C, reading it for an erasure marking, deciding whether there is a case — plus a plain account of what stage 2 is and why this packet does not generate it"
  },
  documentsLines: [
    "| Document | Where you get it |", "| --- | --- |",
    "| Your SPBI criminal history record search — the statute's own required proof that the information has not been marked as erased | DESPP, Division of State Police, State Police Bureau of Identification: mail form DPS-0846-C with a check or money order payable to \"Treasurer-State of CT\" to DESPP-SPBI, 1111 Country Club Road, Middletown, CT 06457-2389 (fees as printed on the 12/01/17 form: $36 name/DOB existence search, $75 conviction history by name/DOB, or $75 by fingerprint plus $15 fingerprinting — verify with DESPP-SPBI before relying) |"
  ],
  stepsLines: [
    "1. **Order your SPBI record search** with form DPS-0846-C — you obtain and mail the form yourself; this packet does not fill it.",
    "2. **Verify the fee first** — the recorded figures are from a form dated 12/01/17.",
    "3. **Read the result** for whether the conviction appears and whether it is marked as erased.",
    "4. **Decide.** Marked erased: done, nothing to pursue. Unmarked, and you believe § 54-142a(e) required it to be deemed erased: stage two exists for exactly that.",
    "5. **For stage two, ask DESPP** what form and manner it has determined for a § 54-142t(g) submission, and use exactly that — and take a lawyer: DESPP decides following a contested hearing, and the determination is a final decision under the Uniform Administrative Procedure Act."
  ],
  blanksLines: [
    "- **The DESPP submission itself.** Deliberately not generated: its form and manner is the department's to determine, is not in the statute, and was not located. No submission document may be improvised.",
    "- **The DPS-0846-C form.** Named, never filled — you obtain and complete it yourself with DESPP-SPBI."
  ],
  stopsLines: [
    "- the DESPP submission stage — undetermined form and manner here, and the contested hearing that follows is a lawyer's proceeding producing a UAPA final decision;",
    "- you have an immigration matter;",
    "- you cannot tell from the record whether the conviction was eligible for erasure by operation of law under § 54-142a(e)."
  ],
  notLines: [
    "This is process guidance for an agency-controlled remedy. It is not a court filing, not a DESPP submission, not legal advice, and it does not decide whether any record was required to be deemed erased. The § 54-142t(g) determination is DESPP's, made following a contested hearing, and it is final under chapter 54."
  ]
};

const FINDINGS = [
  {
    finding:
      "The MASTER_QUEUE row binds zero sources, and stage 2's instrument does not exist to bind: DESPP's "
      + "determined form and manner for a § 54-142t(g) submission is not in the statute, was not located, and the "
      + "legal-design record classifies inventing a DESPP filing form as a legal_design_blocker (its unit is "
      + "recorded available:false).",
    consequence:
      "This family is built as the guidance-packet fallback the sprint rules direct for a route without a "
      + "verified official form path: the stage-1 guidance the record approves is rendered in full, no submission "
      + "document exists anywhere in the packet, and the blocker is stated on the guidance's own face with the "
      + "ask-DESPP delegation."
  },
  {
    finding:
      "The queue row's implementationStrategy is participant_agency_application and its owned directory carries "
      + "the suffix --official-pdf-fill, while no official form family is bound (officialFormFamily NONE, forms "
      + "[]).",
    consequence:
      "The queue-owned directory path is used exactly as the row states it, no official PDF is filled, and "
      + "DPS-0846-C is named as a participant-obtained document only — never rendered, filled or bound. The "
      + "apparent suffix/strategy mismatch is recorded here for the queue's attention rather than resolved by "
      + "this build."
  },
  {
    finding:
      "The recorded SPBI fee figures come from a form dated 12/01/17 whose own face warns that information may "
      + "change, and the 'report must be dated on or after January 1, 2024' rule in older internal material is "
      + "recorded as a likely misreading, unresolved rather than a rule.",
    consequence:
      "Every fee figure is printed with its date and a verify-with-DESPP-SPBI warning; the date-of-report point "
      + "is presented as unresolved with the practical advice (get a current report) that does not depend on "
      + "resolving it."
  },
  {
    finding:
      "The contested administrative hearing is the recorded post-submission attorney handoff, producing a final "
      + "decision under the Uniform Administrative Procedure Act.",
    consequence:
      "The guidance says in terms that the hearing is a lawyer's proceeding and that this guidance is the whole "
      + "of what self-help covers on the route."
  }
];

const APPROVAL = {
  counselQuestionsRaised: [
    "DESPP's current form and manner for a § 54-142t(g) submission — the recorded true output blocker. Until it is located or determined, stage 2 remains unbuilt; no submission document should be approved from this packet because none exists in it.",
    "Current SPBI fees and process: the recorded figures are from DPS-0846-C Rev. 12/01/17. Verify before any participant-facing use.",
    "Whether the SPBI report must be dated on or after 1 January 2024: recorded as a likely misreading and preserved as unresolved. Confirm or discharge.",
    "Confirm the stage-1 guidance's account of § 54-142a(e) eligibility is pitched correctly — the guidance sends unclear eligibility to a lawyer rather than attempting the determination."
  ],
  mattersForTheReviewersAttention: [
    "The family's queue directory suffix (--official-pdf-fill) does not match its strategy (participant_agency_application, no bound forms); the build uses the queue-owned path exactly and records the mismatch in build-findings.json.",
    "This packet writes one fact (the participant's name) and carries no fillable blanks — nothing is filed and no submission is generated.",
    "Terminology is erasure throughout."
  ]
};

/* ════════════════════════════════════════════════════════════════════════════
 * ENGINE — shared census-v1 zero-bound-source composed-pleading machinery.
 *
 * This section is deliberately identical across the FABLE-B9 family builders
 * (each script stays self-contained because every family's MASTER_QUEUE row is
 * exclusiveScript with no shared build host). The family-specific facts live
 * entirely above this line. The machinery follows the proven working pattern
 * of scripts/build-census-v1-va_exp_identity_used_by_another-set.mjs, minus
 * the bound-source resolution and face reading, because this family's
 * MASTER_QUEUE row binds ZERO sources (sourceStatus
 * CUSTOM_PLEADING_FROM_CODIFIED_TEXT, boundCount 0): there are no source
 * bytes to verify, and the grounding records are the legal-design intake
 * track and the packet-set manifest named in the spec above.
 * ════════════════════════════════════════════════════════════════════════════ */

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";

/* ---- field-map row helpers (maps-with-canonical-and-boundary shape) --------- */
function mapBase(componentId, id, label) {
  return {
    field: `${componentId}.${id}`, fieldName: `${componentId}.${id}`, page: 1,
    printedLabel: label, printedLine: label,
    effectiveLabel: label, regionHeading: label, sectionHeading: null,
    rectBasis: "composed_document_authored_by_this_build"
  };
}
function mapWrite(componentId, id, label, factId) {
  return { ...mapBase(componentId, id, label), factId, kind: "composed_text", document: componentId };
}
function mapProtected(componentId, id, label, why) {
  return {
    ...mapBase(componentId, id, label),
    reason: "signature or date field; never prefilled by this build",
    category: SIGNATURE, completenessClass: SIGNATURE, class: SIGNATURE,
    requiredBeforeFiling: false, document: componentId, why
  };
}
function mapCourtOwned(componentId, id, label, why) {
  return {
    ...mapBase(componentId, id, label),
    reason: "court, clerk, prosecutor, agency, or hearing field; the court completes it",
    category: COURT_OWNED, completenessClass: COURT_OWNED, class: COURT_OWNED,
    requiredBeforeFiling: false, document: componentId, why
  };
}
function mapRbf(componentId, id, label, what, why) {
  return {
    ...mapBase(componentId, id, label),
    reason: `the participant supplies this before filing: ${what}`,
    category: null, completenessClass: null, class: null,
    disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
    requiredBeforeFiling: true, identity: `${componentId} field ${id}`, factId: null, routeDetermined: false,
    document: componentId, why, participantMustSupply: what
  };
}
function composedMapShell(componentId, writes, refusals) {
  return {
    formNumber: componentId, documentId: componentId, documentRole: componentId,
    documentPolicy: {
      mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: ROUTE.primaryRouteKey,
      ...(COMPONENT_CONDITIONS[componentId] ? { conditional: true, conditionDescription: COMPONENT_CONDITIONS[componentId] } : {})
    },
    structuralClass: "composed_document",
    composedFrom: COMPOSED_FROM,
    explicitMappings: {}, roleRefusals: [], selectionControls: [],
    canonicalWrites: writes, canonicalRefusals: refusals,
    boundaryWrites: writes, boundaryRefusals: refusals
  };
}

/* ---- deterministic PDF rendering ------------------------------------------- */
function sanitizePdfText(text) {
  return text.replaceAll(" ", " ").replaceAll("‑", "-").replaceAll("–", "-")
    .replaceAll("—", "-").replaceAll("−", "-").replaceAll("’", "'")
    .replaceAll("‘", "'").replaceAll("“", '"').replaceAll("”", '"')
    .replaceAll("§", "Sec. ").replaceAll("…", "...");
}

async function renderComposedPdf(fullText, title) {
  const pdf = await PDFDocument.create();
  stampDeterministic(pdf);
  pdf.setTitle(title);
  pdf.setProducer("RCAP census-v1 artifact-only renderer");
  pdf.setCreator("RCAP evidence build");
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const fontSize = 11, lineHeight = 14.5, width = 612, height = 792, margin = 72;
  const maxWidth = width - 2 * margin;
  let page = pdf.addPage([width, height]);
  let y = height - margin;
  const draw = (line) => {
    if (y < margin) { page = pdf.addPage([width, height]); y = height - margin; }
    if (line) page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
    y -= lineHeight;
  };
  const splitToken = (token) => {
    const chunks = []; let current = "";
    for (const ch of token) {
      if (current && font.widthOfTextAtSize(`${current}${ch}`, fontSize) > maxWidth) { chunks.push(current); current = ch; }
      else current += ch;
    }
    if (current) chunks.push(current);
    return chunks;
  };
  const wrap = (line) => {
    if (!line) return [""];
    const words = line.split(/\s+/).flatMap((w) => font.widthOfTextAtSize(w, fontSize) > maxWidth ? splitToken(w) : [w]);
    const rows = []; let current = "";
    for (const w of words) {
      const candidate = current ? `${current} ${w}` : w;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) current = candidate;
      else { if (current) rows.push(current); current = w; }
    }
    if (current) rows.push(current);
    return rows;
  };
  for (const raw of sanitizePdfText(fullText).split("\n")) for (const row of wrap(raw)) draw(row);
  return Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
}

/* ---- byte proof of the composed writes -------------------------------------- *
 * Read back from the saved packet bytes, never from this builder's own intent:
 * each written fact value must be found in the extracted text of the pages the
 * page manifest assigns to its component. Wrapped lines are joined on spaces
 * before matching, because the renderer wraps at word boundaries.
 */
async function byteProof(packetBytes, pageManifest, maps, facts, fixtureName) {
  const doc = await PDFDocument.load(packetBytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPages();
  assert.equal(pages.length, pageManifest.length, "the page manifest must describe every page of the packet");
  const textOfPage = pages.map((p) => groupIntoLines(extractTextItems(p)).map((l) => l.text).join(" ").replace(/\s+/g, " "));
  const textOfComponent = new Map();
  for (const [i, m] of pageManifest.entries()) {
    textOfComponent.set(m.component, `${textOfComponent.get(m.component) ?? ""} ${textOfPage[i]}`);
  }
  const actualWrites = [];
  let glyphs = 0;
  for (const map of maps) {
    const componentText = String(textOfComponent.get(map.formNumber) ?? "").replace(/\s+/g, " ");
    for (const w of map.canonicalWrites ?? []) {
      const value = sanitizePdfText(String(facts[w.factId] ?? ""));
      assert.ok(value.length > 0, `${map.formNumber}/${w.field}: no fixture value for ${w.factId}`);
      const found = componentText.includes(value);
      assert.ok(found, `${fixtureName} ${map.formNumber}/${w.field}: the value bound to ${w.factId} is not readable from the output bytes`);
      glyphs += value.replace(/\s+/g, "").length;
      actualWrites.push({
        field: w.field, document: map.formNumber, factId: w.factId,
        expected: value, foundInOutputBytes: true,
        proof: "value read back from the extracted text of the component's own pages in the saved packet bytes"
      });
    }
  }
  return { actualWrites, glyphs, pagesRead: pages.length };
}

/* ---- the builder's own count of the nine counters ---------------------------- */
function countCompleteness(maps, writeProofs, instructionsText) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };

  const row = (r) => ({
    id: r.field, name: r.fieldName ?? r.field, label: r.effectiveLabel ?? "", reason: r.reason ?? "",
    refusalClass: r.category ?? null, page: r.page ?? null, document: r.document ?? null,
    factId: r.factId ?? null, isSelectionControl: false,
    declared: {
      disposition: r.completenessDisposition ?? null,
      ...(Object.hasOwn(r, "requiredBeforeFiling") ? { requiredBeforeFiling: r.requiredBeforeFiling === true } : {}),
      ...(Object.hasOwn(r, "routeDetermined") ? { routeDetermined: r.routeDetermined === true } : {}),
      identity: r.identity ?? null, factId: r.factId ?? null
    }
  });

  const writes = [];
  const blanks = [];
  for (const m of maps) {
    for (const w of m.canonicalWrites ?? []) writes.push(row(w));
    for (const r of m.canonicalRefusals ?? []) blanks.push(row(r));
  }

  const availableFacts = new Set(writes.map((w) => w.factId).filter(Boolean));
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
      factAvailable: (blank.declared?.factId ? availableFacts.has(String(blank.declared.factId)) : false)
        || here.has(normLabel(blank.label)) || here.has(normLabel(blank.name))
    };
    const verdict = classifyBlank(blank, blank.reason, blank.refusalClass, declared);
    ledger.push({ ...blank, ...verdict });
    const spec = BLANK_DISPOSITIONS[verdict.disposition];
    if (spec.allowed) continue;
    if (verdict.disposition === "KNOWN_FACT_NOT_WRITTEN") note("knownRequiredFieldsMissing", { field: blank.id, label: blank.label, basis: verdict.basis });
    else if (verdict.disposition === "ROUTE_OPTION_NOT_SELECTED") note("requiredOptionsMissing", { field: blank.id, label: blank.label, basis: verdict.basis });
    else note("unclassifiedBlanks", { field: blank.id, label: blank.label, basis: verdict.basis });
  }

  const hay = String(instructionsText ?? "").toLowerCase();
  for (const b of ledger.filter((x) => x.disposition === "REQUIRED_BEFORE_FILING")) {
    const needles = [b.label, b.id, b.declared?.identity].map((x) => String(x ?? "").trim()).filter((x) => x.length >= 3);
    if (needles.some((n) => hay.includes(n.toLowerCase().slice(0, 60)))) continue;
    note("requiredFactsNotCollected", { field: b.id, label: b.label, why: "classified required-before-filing and not named in participant-instructions.md" });
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
    const missing = cells.filter((c) => !c.written && classifyField(c.label, false).requirement === "REQUIRED_KNOWN");
    if (missing.length > 0) note("incompleteRows", { row: key, missingCells: missing.map((m) => m.label).slice(0, 6) });
  }

  for (const w of writes) {
    if (classifyField(w.label, false).requirement === "PROTECTED") {
      note("protectedWrites", { field: w.id, label: w.label, why: "a protected field was written" });
    }
  }

  for (const p of writeProofs) {
    const visible = (p.addedGlyphsReadFromOutputBytes ?? 0) + (p.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if ((p.valuesReportedByFinalizer ?? 0) > 0 && visible === 0) note("invisibleWrites", { fixture: p.fixture, reportedByFinalizer: p.valuesReportedByFinalizer });
    if ((p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: p.fixture, glyphsOutside: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes });
  }

  return { counters, findings, ledger, terminalFields: writes.length + blanks.length, written: writes.length, blank: blanks.length };
}

/* ---- outputs ------------------------------------------------------------------ */
function writeJson(rel, value) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(value, null, 2)}\n`);
}

function requiredBeforeFilingItems(maps) {
  const order = Object.fromEntries(COMPONENTS.map((c, i) => [c, i]));
  return maps.flatMap((m) => (m.canonicalRefusals ?? [])
    .filter((r) => r.requiredBeforeFiling === true)
    .map((r) => ({
      document: m.formNumber, field: r.field, page: r.page,
      printedContext: r.printedLabel, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply
    })))
    .sort((a, b) => (order[a.document] - order[b.document]) || a.field.localeCompare(b.field));
}

function participantInstructions(maps, rbf) {
  const byDoc = new Map();
  for (const item of rbf) byDoc.set(item.document, [...(byDoc.get(item.document) ?? []), item]);
  const out = [];
  out.push(`# ${INSTRUCTIONS.title}`, "");
  out.push(...INSTRUCTIONS.introLines, "");

  out.push("## What is in this packet", "");
  out.push("| Component | What it is |", "| --- | --- |");
  for (const c of COMPONENTS) {
    const cond = COMPONENT_CONDITIONS[c] ? ` **Conditional:** ${COMPONENT_CONDITIONS[c]}` : "";
    out.push(`| \`${c}\` | ${INSTRUCTIONS.componentBlurbs[c] ?? COMPOSED_TITLES[c]}${cond} |`);
  }
  out.push("");

  if (INSTRUCTIONS.documentsLines?.length) {
    out.push("## Documents you must obtain first", "");
    out.push(...INSTRUCTIONS.documentsLines, "");
  }

  if (rbf.length > 0) {
    out.push("## The items you must supply", "");
    out.push("Each is printed on its page as a labelled dotted blank. Fill every one that belongs to the document you are using, from the record itself, never from memory.", "");
    for (const [doc, items] of byDoc) {
      out.push(`### ${doc} — ${COMPOSED_TITLES[doc] ?? doc}`, "");
      out.push("| The blank on the document | What to write |", "| --- | --- |");
      for (const i of items) out.push(`| ${i.disclosureLabel} | ${i.participantMustSupply} |`);
      out.push("");
    }
  }

  out.push("## What you do, in order", "");
  out.push(...INSTRUCTIONS.stepsLines, "");

  out.push("## Things the platform deliberately left blank", "");
  out.push(...INSTRUCTIONS.blanksLines, "");

  out.push("## When to stop and get help instead", "");
  out.push(...INSTRUCTIONS.stopsLines, "");

  out.push("## What this packet is not", "");
  out.push(...INSTRUCTIONS.notLines, "");
  out.push(`_Route: ${ROUTE.routeKeys.join(" · ")}_`);
  return `${out.join("\n")}\n`;
}

/* ---- the entry point ----------------------------------------------------------- */
export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");

  const maps = COMPONENTS.map((c) => composedMap(c));

  if (checkOnly) {
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY",
      boundSources: 0, components: COMPONENTS,
      writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
      blanks: maps.reduce((n, m) => n + m.canonicalRefusals.length, 0)
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  const artifacts = [];
  const writeProofs = [];
  const rasterPages = [];
  const pdfsDeclared = [];

  for (const fixtureName of ["canonical", "boundary"]) {
    const facts = FIXTURES[fixtureName];
    const packet = await PDFDocument.create();
    stampDeterministic(packet);
    packet.setTitle(`${ROUTE.legalName} — ${fixtureName} fixture`);
    const pageManifest = [];
    const documents = [];

    for (const componentId of COMPONENTS) {
      const body = composedBody(componentId, facts);
      assert.ok(body.includes(facts["participant.full_legal_name"]),
        `${componentId}: the composed page must carry the participant's name`);
      const composedBytes = await renderComposedPdf(body, COMPOSED_TITLES[componentId]);
      const composed = await PDFDocument.load(composedBytes, { ignoreEncryption: true, updateMetadata: false });
      for (const [i, p] of (await packet.copyPages(composed, composed.getPageIndices())).entries()) {
        packet.addPage(p);
        pageManifest.push({ packetPage: packet.getPageCount(), component: componentId, documentId: componentId, sourcePage: i + 1, sourceSha256: null });
      }
      documents.push(componentId);
    }

    const packetBytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
    const file = `${OUT}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), packetBytes);

    const proof = await byteProof(packetBytes, pageManifest, maps, facts, fixtureName);
    writeProofs.push({
      fixture: fixtureName,
      proofMethod: "every written fact value read back from the extracted text of its component's own pages in the saved packet bytes",
      valuesReportedByFinalizer: proof.actualWrites.length,
      addedGlyphsReadFromOutputBytes: proof.glyphs,
      flattenedWidgetAppearancesReadFromOutputBytes: 0,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
      refusedFieldsWithInk: [],
      actualWrites: proof.actualWrites
    });

    const sha256 = crypto.createHash("sha256").update(packetBytes).digest("hex");
    artifacts.push({
      fixture: fixtureName, file, sha256,
      byteLength: packetBytes.length, pageCount: packet.getPageCount(), pageManifest,
      documents, components: COMPONENTS
    });
    pdfsDeclared.push({
      file, documentId: "assembled_packet", role: "assembled_packet_of_composed_pleadings",
      fixture: fixtureName, sha256, byteLength: packetBytes.length, pageCount: packet.getPageCount()
    });

    if (!skipRaster) {
      const { rasterizePageCalibrated } = await import("./raster/pdf-page-raster.mjs");
      const rasterDir = `${OUT}/raster/${fixtureName}`;
      fs.mkdirSync(path.join(ROOT, rasterDir), { recursive: true });
      for (let i = 0; i < packet.getPageCount(); i += 1) {
        const stage = path.join(ROOT, rasterDir, `page-${String(i + 1).padStart(2, "0")}`);
        const render = await rasterizePageCalibrated({ file: path.join(ROOT, file), pageIndex: i, keep: stage });
        for (const scrap of ["page.pdf", "page-calibration.pdf", "page-calibration.png"]) {
          const f = path.join(stage, scrap);
          if (fs.existsSync(f)) fs.unlinkSync(f);
        }
        const png = path.join(stage, "page.png");
        rasterPages.push({
          fixture: fixtureName, page: i + 1,
          file: `${rasterDir}/page-${String(i + 1).padStart(2, "0")}/page.png`,
          component: pageManifest[i]?.component ?? null,
          pageWidthPt: render.pageWidth, pageHeightPt: render.pageHeight,
          pixelsPerPoint: Number(render.pxPerPt.toFixed(4)),
          calibrationResidualPx: render.calibrationResidualPx,
          paperBounds: render.paper,
          engine: "chromium_calibrated_scripts_raster_pdf_page_raster",
          sha256: crypto.createHash("sha256").update(fs.readFileSync(png)).digest("hex")
        });
      }
    }
  }

  const rbf = requiredBeforeFilingItems(maps);
  const instructionsText = participantInstructions(maps, rbf);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID, worklistGroupId: FAMILY_ID,
    jurisdiction: ROUTE.jurisdiction, implementationStrategy: IMPLEMENTATION_STRATEGY,
    custodyClass: "CUSTOM_PLEADING_FROM_CODIFIED_TEXT", acquisitionCommissioned: false,
    bindingMethod:
      "no source bytes are bound: the MASTER_QUEUE row for this family binds zero sources (sourceStatus "
      + "CUSTOM_PLEADING_FROM_CODIFIED_TEXT, boundCount 0, officialFormFamily NONE, forms []). Every composed "
      + "page is grounded on the committed legal-design records named in groundingRecords, and nothing else.",
    routeKeys: ROUTE.routeKeys, routeSelectionId: ROUTE.routeSelectionId,
    statutoryAuthority: ROUTE.statute, legalName: ROUTE.legalName,
    allSourcesExact: true,
    allSourcesExactNote:
      "true vacuously: this family binds zero source binaries, so there is no source that is not bound by exact "
      + "SHA-256. No official form exists for this route per the legal-design record, and none was invented.",
    documents: [],
    groundingRecords: RECEIPT.groundingRecords,
    officialSourcesRecordedInIntake: RECEIPT.officialSourcesRecordedInIntake,
    formIdentityNote: RECEIPT.formIdentityNote,
    composedComponentsAuthoredByThisBuild: COMPONENTS,
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: RECEIPT.whatThisReceiptDoesNotEstablish
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    routeKeys: ROUTE.routeKeys, routeSelectionId: ROUTE.routeSelectionId, renderStrategy: "composed_pleading",
    jurisdiction: ROUTE.jurisdiction, statute: ROUTE.statute, legalName: ROUTE.legalName,
    implementationStrategy: IMPLEMENTATION_STRATEGY,
    officialForm: null,
    componentSet: COMPONENTS,
    componentConditions: COMPONENT_CONDITIONS,
    dispositionVocabulary: [SIGNATURE, COURT_OWNED],
    routeSelectionsMade: [],
    routeSelectionNote: FIELDMAP_NOTES.routeSelectionNote,
    requiredBeforeFilingCount: rbf.length,
    requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID,
    renderedFresh: true, derivedFromBytes: true,
    componentSet: COMPONENTS,
    componentConditions: COMPONENT_CONDITIONS,
    boundSources: [],
    boundSourcesNote: "this family binds zero source binaries; every page is composed by this build",
    pdfs: pdfsDeclared,
    artifacts,
    packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    everyPageRastered: rasterPages.length === artifacts.reduce((n, a) => n + a.pageCount, 0),
    byteDerivedHashes: true,
    rasterEngine: skipRaster ? null : RASTER_ENGINE, rasterSkipped: skipRaster, rasterPages,
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID, derivedFromArtifactBytes: true,
    note:
      "Every written fact value was read back from the extracted text of its component's own pages in the saved "
      + "packet bytes, not from this builder's intent.",
    documents: writeProofs,
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      refusedFieldsWithInk: p.refusedFieldsWithInk
    })),
    blockingFindings: []
  });

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: FAMILY_ID,
    requiredBeforeFiling: rbf,
    protectedBlanks: maps.flatMap((m) => (m.canonicalRefusals ?? [])
      .filter((r) => r.requiredBeforeFiling !== true)
      .map((r) => ({ document: m.formNumber, field: r.field, label: r.effectiveLabel, refusalClass: r.category ?? null, why: r.why ?? r.reason }))),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  const counted = countCompleteness(maps, writeProofs, instructionsText);
  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID,
    whatThisIs:
      "The BUILDER's own count of the nine completeness counters, computed with the repository's own contract "
      + "functions over this family's field map, byte proof and participant-instructions.md.",
    whatThisIsNot:
      "A verdict. This lane does not verify its own packets, and PASS_COMPLETE additionally requires a hash-bound "
      + "RASTER_PASS from the central raster workflow.",
    counters: counted.counters,
    allNineZero: PASS_COUNTERS.every((c) => counted.counters[c] === 0),
    findings: counted.findings,
    blankDispositions: counted.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {})
  });

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID,
    buildStatus: "state_built", reviewStatus: "qa_review_pending", builtBy: BUILD_SCRIPT,
    rasterEngine: skipRaster ? "not rendered in this run" : "chromium_calibrated", popplerUsed: false,
    renderedArtifacts: artifacts.length, rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RASTER_LOCAL_PENDING_CENTRAL",
    independentVerificationStatus: "PENDING", selfVerified: false,
    generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1", familyId: FAMILY_ID, blocking: [],
    findings: FINDINGS
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    counselQuestionsRaised: APPROVAL.counselQuestionsRaised,
    mattersForTheReviewersAttention: APPROVAL.mattersForTheReviewersAttention
  });

  const allZero = PASS_COUNTERS.every((c) => counted.counters[c] === 0);
  return {
    familyId: FAMILY_ID,
    status: allZero ? "COMPLETED" : "STOPPED",
    ...(allZero ? {} : {
      stopClass: "COMPLETENESS_COUNTER_NOT_ZERO",
      nonZeroCounters: PASS_COUNTERS.filter((c) => counted.counters[c] > 0),
      firstFindings: counted.findings.slice(0, 6)
    }),
    counters: counted.counters,
    directory: OUT,
    implementationStrategy: IMPLEMENTATION_STRATEGY,
    boundSources: 0,
    components: COMPONENTS,
    documents: COMPONENTS,
    writes: maps.reduce((n, m) => n + (m.canonicalWrites ?? []).length, 0),
    requiredBeforeFiling: rbf.length,
    artifactHashes: artifacts.map((a) => ({ fixture: a.fixture, packetSha256: a.sha256, pages: a.pageCount })),
    rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RASTER_LOCAL_PENDING_CENTRAL",
    nineCountersZero: allZero,
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
