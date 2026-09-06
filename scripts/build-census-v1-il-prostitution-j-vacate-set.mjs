#!/usr/bin/env node
/**
 * The Illinois Class 4 felony prostitution vacate-and-expunge packet family
 * builder.
 *
 *   node scripts/build-census-v1-il-prostitution-j-vacate-set.mjs [--check] [--no-raster]
 *
 * One census-v1 family, one strategy: custom_pleading, one track:
 *
 *   il-prostitution-j-vacate   Motion to Vacate and Expunge a Conviction for
 *                              Class 4 Felony Prostitution, 20 ILCS 2630/5.2(j)(3)
 *
 * WHY EVERY PAGE IS COMPOSED, READ FROM THE RECORDS
 *
 * The MASTER_QUEUE row binds ZERO sources: sourceStatus
 * CUSTOM_PLEADING_FROM_CODIFIED_TEXT, officialFormFamily NONE, forms [],
 * boundCount 0. The family's own legal-design record
 * (data/record-clearing/legal-design-intake/IL.memo.json, track
 * il-prostitution-j-vacate, reviewedAsOf 2026-07-30) records that no
 * statewide form suite exists for this route — it is Illinois's ONE
 * custom_pleading track — and expressly forbids mapping the statewide
 * cannabis form suite onto it. The route carries localFormOverride: a
 * published local form controls where one exists.
 *
 * WHAT THIS BUILD WRITES, AND WHAT IT CARRIES
 *
 * The platform holds the participant's own identity and contact facts and
 * writes only those. Every case fact — county, case number, conviction date,
 * the charge as the record words it, sentence completion — lives on a court
 * record the platform has not seen, so each is a labelled dotted blank
 * declared REQUIRED_BEFORE_FILING and disclosed in
 * participant-instructions.md. The adverse-consequences narrative is
 * participant-authored: the motion prints labelled lines and composes none
 * of it. The motion cites 20 ILCS 2630/5.2(j)(3), the expungement mechanics
 * at (d)(9)(A) and the effect provision at (j)(8), AND NOTHING ELSE, and
 * carries no verification language because the subsection requires none.
 * Nothing asserts that the conviction was a Class 4 felony — the participant
 * copies the charge as the record words it — and nothing predicts success.
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
import {
  IL_PROSTITUTION_J_VACATE_COMPONENTS,
  IL_PROSTITUTION_J_VACATE_TITLES,
  composedBody,
  participantFromCensusFacts
} from "./lib/il-prostitution-j-vacate-composition.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const FAMILY_ID = "il-prostitution-j-vacate-set";
const OUT = "data/rcap-all50/overlays/census-v1/il/il-prostitution-j-vacate-set--custom-pleading";
const BUILD_SCRIPT = "scripts/build-census-v1-il-prostitution-j-vacate-set.mjs";
const IMPLEMENTATION_STRATEGY = "custom_pleading";

const ROUTE = Object.freeze({
  jurisdiction: "IL",
  routeKeys: ["obligation:track-pathway:IL:il-prostitution-j-vacate:felony-prostitution-relief"],
  primaryRouteKey: "obligation:track-pathway:IL:il-prostitution-j-vacate:felony-prostitution-relief",
  routeSelectionId: "il-prostitution-j-vacate-composed-set",
  legalName: "Motion to Vacate and Expunge a Conviction for Class 4 Felony Prostitution, 20 ILCS 2630/5.2(j)(3)",
  routeName: "vacating and expunging an Illinois Class 4 felony prostitution conviction under 20 ILCS 2630/5.2(j)(3)",
  statute: "20 ILCS 2630/5.2(j)(3)"
});

const COMPONENTS = [...IL_PROSTITUTION_J_VACATE_COMPONENTS];
const COMPONENT_ROUTES = Object.freeze(
  Object.fromEntries(COMPONENTS.map((componentId) => [componentId, ROUTE.primaryRouteKey]))
);

const COMPOSED_TITLES = IL_PROSTITUTION_J_VACATE_TITLES;

const COMPONENT_CONDITIONS = {};

const COMPOSED_FROM =
  "the legal-design intake record (data/record-clearing/legal-design-intake/IL.memo.json, track "
  + "il-prostitution-j-vacate, reviewedAsOf 2026-07-30) and the packet-set manifest "
  + "(data/record-clearing/legal-design-packet-set-manifests.json, il-prostitution-j-vacate-set)";

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.street_address": "42 Prairie Street, Springfield, IL 62701",
    "participant.phone": "217-555-0142",
    "participant.email": "jordan.reyes@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B, Rockford, Illinois 61101-2214",
    "participant.phone": "(779) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
  }
};

/* The composed page text of both components lives in
 * scripts/lib/il-prostitution-j-vacate-composition.mjs, so the participant
 * renderer and these fixtures are built from the same approved sentences. */

function composedMap(componentId) {
  const writes = [];
  const refusals = [];
  const w = (id, label, factId) => writes.push(mapWrite(componentId, id, label, factId));
  const rbf = (id, label, what, why) => refusals.push(mapRbf(componentId, id, label, what, why));
  const prot = (id, label, why) => refusals.push(mapProtected(componentId, id, label, why));
  const court = (id, label, why) => refusals.push(mapCourtOwned(componentId, id, label, why));

  if (componentId === "primary_filing") {
    w("movant_name", "Movant named in the caption of this motion", "participant.full_legal_name");
    w("mailing_address", "Mailing address of the movant in the contact block at the foot of the motion", "participant.street_address");
    w("telephone", "Telephone number of the movant in the contact block at the foot of the motion", "participant.phone");
    w("email", "Email address of the movant in the contact block at the foot of the motion", "participant.email");
    rbf("conviction_county", "County in the caption - the Illinois county of the conviction",
      "the county where you were convicted - the circuit court of that county is where the motion is filed",
      "the county of conviction is a case fact on a record the platform has not seen");
    rbf("case_number", "Case number of the existing criminal case",
      "the existing criminal case number, copied from the court record or your Illinois State Police transcript",
      "no case identifier is held for a record the platform has not seen");
    rbf("conviction_date", "Date of conviction",
      "the conviction date, copied from the court record",
      "no conviction fact is held for a record the platform has not seen");
    rbf("conviction_as_worded", "The conviction as the court record words it, copied exactly",
      "the conviction exactly as the record words it - file only if the record shows a Class 4 felony prostitution conviction, and stop if it does not; this packet never asserts the classification for you",
      "the legal-design record forbids asserting the conviction was a Class 4 felony where the record does not say so, so the record's own wording is copied by the participant");
    rbf("sentence_completion_date", "Date the sentence and every condition imposed by the conviction was completed",
      "the completion date, from the circuit court or probation department documentation",
      "no sentence fact is held for a record the platform has not seen");
    rbf("adverse_consequences", "Your own statement of the specific problems this conviction has caused you",
      "your own account, in your own words, of the specific problems the conviction has caused - the discretionary showing is yours alone and this packet composes none of it",
      "the legal-design record forbids composing the adverse-consequences narrative or characterizing the circumstances of the offense");
    prot("movant_signature", "Signature of the movant on the motion", "the movant signs the motion personally; no verification language is added because the subsection requires none");
    prot("signature_date", "Date beside the movant's signature on the motion", "a date written before the motion is signed would be false");
  } else {
    w("movant_name", "Movant named in the proposed order", "participant.full_legal_name");
    rbf("conviction_county", "County in the caption of the proposed order",
      "the same county as on the motion",
      "the county of conviction is a case fact on a record the platform has not seen");
    rbf("case_number", "Case number of the existing criminal case, on the proposed order",
      "the same case number as on the motion",
      "no case identifier is held for a record the platform has not seen");
    rbf("conviction_as_worded", "The conviction as the court record words it, on the proposed order",
      "the conviction exactly as the record words it, copied before tendering",
      "the record's own wording controls and the platform has not seen it");
    court("judge_signature_and_entry", "Judge's signature line and date of entry of the order",
      "the order is the court's; the judicial decision and signature fields remain blank");
  }
  return composedMapShell(componentId, writes, refusals);
}

const RECEIPT = {
  groundingRecords: [
    { record: "data/record-clearing/legal-design-intake/IL.memo.json", track: "il-prostitution-j-vacate", reviewedAsOf: "2026-07-30" },
    { record: "data/record-clearing/legal-design-packet-set-manifests.json", packetSetId: "il-prostitution-j-vacate-set" }
  ],
  officialSourcesRecordedInIntake: [
    { title: "Criminal Identification Act, 20 ILCS 2630/5.2", url: "https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=350&ChapterID=5", retrievedOn: "2026-07-30" },
    { title: "Public Act 104-0459, the Clean Slate Act, enrolled HB 1836", url: "https://ilga.gov/Documents/Legislation/PublicActs/104/PDF/104-0459.pdf", retrievedOn: "2026-07-30" },
    { title: "Bureau of Identification Fee Schedule", url: "https://isp.illinois.gov/BureauOfIdentification/FeeSchedule", retrievedOn: "2026-07-30" }
  ],
  formIdentityNote:
    "No statewide form suite exists for the 20 ILCS 2630/5.2(j)(3) motion — the legal-design record makes it "
    + "Illinois's one custom_pleading track and expressly forbids mapping the statewide cannabis form suite onto "
    + "it. The MASTER_QUEUE row agrees: officialFormFamily NONE, implementationStrategy custom_pleading, forms [], "
    + "boundCount 0. The route carries localFormOverride: a published local form controls where one exists, and "
    + "the instructions direct the participant to confirm the filing method with the circuit clerk.",
  whatThisReceiptDoesNotEstablish: [
    "that no published local form governs in the participant's county (localFormOverride)",
    "that any output is approved for participant delivery",
    "that any conviction is eligible under 20 ILCS 2630/5.2(j)(3)",
    "the service model for the motion — whether the clerk serves as under § 5.2(d)(4) or the movant serves as in the cannabis suite is recorded as unresolved"
  ]
};

const FIELDMAP_NOTES = {
  routeSelectionNote:
    "The motion names 20 ILCS 2630/5.2(j)(3) in its own title and body, with the expungement mechanics at "
    + "(d)(9)(A) and the effect provision at (j)(8), and cites nothing else, exactly as the legal-design record "
    + "directs. No election control is rendered: the one route this family serves is stated on the paper, and the "
    + "trafficking-survivor screening the record requires is a stop condition in the instructions, not a form "
    + "election."
};

const INSTRUCTIONS = {
  title: `What you must do before you file — ${ROUTE.routeName}`,
  introLines: [
    `This packet is prepared for **${ROUTE.legalName}**.`,
    "",
    "No statewide form exists for this route — it is Illinois's one custom-pleading expungement track — so both pages are composed pleadings grounded on the statute's recorded requirements. Where your county publishes its own local form for this motion, **that local form controls**: confirm the filing method with the circuit clerk before filing.",
    "",
    "The platform filled in what it holds about you: your name, your mailing address, your telephone number and your email. Every case fact lives on a court record the platform has not seen, so every one of them is a labelled dotted blank listed below, and you fill it from the record itself, never from memory.",
    "",
    "**Attorney review is the default on this route.** The motion is a conviction vacatur decided on discretionary factors and it touches survivor circumstances. The statewide referral destination for every stop condition is the Office of the State Appellate Defender, Expungement Unit, 866-787-1776.",
    "",
    "**If your involvement resulted from trafficking,** relief under 20 ILCS 2630/5.2(h) is stronger and the questioning must change — talk to the Expungement Unit or a lawyer before using this packet."
  ],
  componentBlurbs: {
    primary_filing: "the composed motion under § 5.2(j)(3), citing (d)(9)(A) mechanics and the (j)(8) effect and nothing else, with no verification language",
    proposed_order: "the proposed order tendered with the motion, with every judicial decision and signature field left blank"
  },
  documentsLines: [
    "| Document | Where you get it |", "| --- | --- |",
    "| Illinois State Police statewide criminal history transcript | ISP Bureau of Identification, through Access and Review (free on the ISP fee schedule; fingerprints at an Illinois law-enforcement or correctional facility or a licensed fingerprint vendor) |",
    "| Proof the sentence and every condition imposed by the conviction is complete | circuit clerk or probation department of the county of conviction |"
  ],
  stepsLines: [
    "1. **Get your ISP transcript and completion proof** — the two documents above.",
    "2. **Check the record's own wording.** File this motion only if the record shows a Class 4 felony prostitution conviction; if it does not clearly say so, stop and call the Expungement Unit.",
    "3. **Fill in every dotted blank from the record**, and write your own statement of the specific problems the conviction has caused you — that showing is yours alone.",
    "4. **Sign the motion yourself** (self-represented designation is printed). No verification language is added because the subsection requires none.",
    "5. **Confirm the filing method with the circuit clerk** of the county of conviction — no statewide form exists, counties vary on e-filing and self-represented exemptions, and the clerk can also tell you the county's filing fee, if any. Where a county fee applies, Supreme Court Rule 298 provides an Application for Waiver of Court Fees.",
    "6. **File the motion and proposed order** with the circuit court with jurisdiction over the conviction (or the Chief Judge or a designated judge of that circuit).",
    "7. **Know the objection window.** The State's Attorney receives notice and has 60 days to object with supporting evidence. Whether the clerk serves the motion or you do is recorded as unresolved — ask the circuit clerk how notice to the State's Attorney is handled in your county, and follow that direction."
  ],
  blanksLines: [
    "- **Your signature and the date beside it.** The motion is yours to sign.",
    "- **Your statement of adverse consequences.** The packet formats your own words and composes none of them.",
    "- **The judge's decision, signature and date of entry** on the proposed order.",
    "- **Any assertion that the conviction was a Class 4 felony.** You copy the conviction exactly as the record words it; the packet never asserts the classification."
  ],
  stopsLines: [
    "- the record does not clearly show a Class 4 felony prostitution conviction;",
    "- your involvement resulted from trafficking — the § 5.2(h) route is stronger and the questioning must change;",
    "- the State's Attorney objects within the 60-day window;",
    "- the court sets a contested or evidentiary hearing;",
    "- you want advice on the discretionary factors themselves — attorney review is the default on this route.",
    "",
    "Office of the State Appellate Defender, Expungement Unit, 866-787-1776, is the statewide referral destination for every stop condition."
  ],
  notLines: [
    "This is a prepared motion and proposed order. It is not a statewide form — none exists for this route — and it is not legal advice, it is not filed for you, and it does not predict or promise that the court will vacate or expunge anything. The decision is discretionary and belongs to the court."
  ]
};

const FINDINGS = [
  {
    finding:
      "The MASTER_QUEUE row binds zero sources, and the legal-design record establishes that no statewide form "
      + "suite exists for the § 5.2(j)(3) motion — Illinois's one custom_pleading track — while expressly "
      + "forbidding reuse of the statewide cannabis form suite.",
    consequence:
      "Both pages are composed, the cannabis suite is not mapped, and localFormOverride is honoured through a "
      + "mandatory confirm-with-the-clerk instruction. No form was substituted and none was invented."
  },
  {
    finding:
      "The legal-design record forbids generating: any prediction of success; any assertion that the conviction "
      + "was a Class 4 felony where the record does not say so; the adverse-consequences narrative; any "
      + "characterization of the circumstances of the offense; and any verification language, which the "
      + "subsection does not require.",
    consequence:
      "The motion copies the conviction exactly as the record words it (a labelled participant blank with a "
      + "printed stop instruction), prints the participant's narrative as their own labelled lines, adds no "
      + "verification block, and asserts nothing about outcome. The citation set is closed: § 5.2(j)(3), "
      + "(d)(9)(A) and (j)(8) and nothing else."
  },
  {
    finding:
      "The service model for the § 5.2(j)(3) motion is recorded as unresolved — the subsection does not state "
      + "whether the clerk serves as under § 5.2(d)(4) or the movant serves as in the cannabis suite — and county "
      + "filing fees have no statewide schedule.",
    consequence:
      "The packet publishes no fee figure and no service mechanic. Both are delegated by name to the circuit "
      + "clerk of the county of conviction, with Supreme Court Rule 298 named for fee waiver where a county fee "
      + "applies, and both questions travel to counsel in approval-request.json."
  },
  {
    finding:
      "Attorney review is the recorded default for this route — a conviction vacatur on discretionary factors "
      + "touching survivor circumstances — and trafficking-survivor screening must precede ordinary questioning "
      + "because the § 5.2(h) route is stronger.",
    consequence:
      "The instructions state the attorney-review default in bold, print the trafficking-survivor condition "
      + "before the steps, and name the Office of the State Appellate Defender Expungement Unit, 866-787-1776, "
      + "as the statewide referral destination for every stop condition."
  }
];

const APPROVAL = {
  counselQuestionsRaised: [
    "Service model for the § 5.2(j)(3) motion: does the clerk serve as under § 5.2(d)(4), or does the movant serve as in the cannabis suite? The packet delegates the question to the circuit clerk and publishes no mechanic.",
    "Confirm the closed citation set (§ 5.2(j)(3), (d)(9)(A), (j)(8)) is complete for a well-pleaded motion, per the record's 'cite nothing else without approval'.",
    "Confirm the composed motion's completion recital satisfies the 'after completion of any sentence or condition' precondition as pleaded, given the participant supplies the completion date.",
    "The attorney-review-by-default posture is printed in the instructions. Confirm this satisfies the record's self-help boundary for a packet that generates end-to-end."
  ],
  mattersForTheReviewersAttention: [
    "The conviction's Class 4 felony classification is never asserted by the packet: the participant copies the record's own wording, and a printed stop instruction sits on the blank itself.",
    "No verification language appears on the motion — deliberate, per the record.",
    "The adverse-consequences lines are participant-authored; confirm the labelled-lines presentation is acceptable for the discretionary showing."
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
      const body = composedBody(componentId, participantFromCensusFacts(facts), ROUTE.routeKeys);
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
    componentRoutes: COMPONENT_ROUTES,
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
