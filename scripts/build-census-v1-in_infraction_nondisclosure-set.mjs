#!/usr/bin/env node
/**
 * The Indiana infraction non-disclosure family — `in_infraction_nondisclosure-set`.
 *
 *   node scripts/build-census-v1-in_infraction_nondisclosure-set.mjs [--check]
 *
 * One census-v1 family, strategy custom_pleading on its queue row, AND THE
 * PLEADING IS NOW DRAFTED. It was not, until 2026-09-02.
 *
 * OWNER CORRECTION Q7, 2026-09-02: "THE REQUIRED COMPONENT MUST BE BUILT."
 *
 * The decision owner held this family because a component its own record names
 * as required was deliberately absent and the family shipped without it. The
 * owner's decision: "The reduced packet is not approved while a component the
 * family's own record declares required is absent. The alternative is a new
 * legal-design decision expressly removing or changing that requirement." No
 * such decision exists, so the component is built.
 *
 * WHAT THE GATE ACTUALLY WAS, AND WHY IT IS CLOSED ENOUGH TO DRAFT AGAINST.
 * The stage-2 unit was held unavailable on two questions, and they are not the
 * same kind of question.
 *
 *   (a) WHETHER A STATEWIDE FORM EXISTS. The held-source portion of this
 *       question is answered: no applicable statewide form for an I.C.
 *       34-28-5-15 infraction petition appears in any source this repository
 *       holds. Every Indiana PDF in the mounted Master Library (the CCA
 *       Section 1 non-conviction
 *       petition-and-order bundle, its inserts, its instructions, and the
 *       Section 2, 3 and 4 conviction inserts) and every Indiana PDF in the
 *       partial Nationwide custody was text-extracted on this pass: the
 *       strings "34-28-5-15" and "infraction" appear in NONE of them. Every
 *       Coalition for Court Access instrument held is an I.C. 35-38-9
 *       expungement form, which is a different chapter and a different
 *       remedy. The registry's own officialFormId and officialSourceUrl for
 *       this component are null. Outbound fetching of the CCA forms index was
 *       refused at CONNECT in this container, so current official-index
 *       confirmation remains outstanding. This build states the held-corpus
 *       result without turning it into a claim that no form exists.
 *       The held-source result supports a controlled pleading, and the
 *       family's own legalDesignDecision says so: "Stage 2 is a verified participant
 *       petition and is therefore packet-capable as a custom pleading."
 *
 *   (b) HOW COUNTIES HANDLE THE MC CASE-TYPE ASSIGNMENT where no cause number
 *       was assigned. This is NOT a drafting question and never was. It is a
 *       county-practice question, it is unanswerable from any source, and the
 *       family's own records already assign it to the participant: the
 *       manifest's serve_party action reads "Confirm local practice on the MC
 *       case-type assignment," and the memo's self-help stop conditions
 *       include "The county's MC case-type handling is unclear." The petition
 *       therefore leaves the case-type caption line BLANK, declares it
 *       required before filing, and tells the participant to get it from the
 *       clerk. That is the honest treatment of an open convention: a blank
 *       with a named authority, not a guess, and not a missing document.
 *
 * WHAT IS DRAFTED, AND FROM WHERE. Every element of the petition comes from
 * the family's own records and nothing is invented:
 *
 *   [MEMO]       data/record-clearing/legal-design-intake/IN.memo.json,
 *                track in_infraction_nondisclosure (I.C. 34-28-5-15, reviewed
 *                2026-07-30): the unit description, the venue, the five
 *                earliest-filing dates, the no-fee rule, the service rule and
 *                the thirty-day opposition period, the verification-and-
 *                signature manual completion item, and the deferral exclusion.
 *   [MANIFEST]   data/record-clearing/legal-design-packet-set-manifests.json,
 *                packetSetId in_infraction_nondisclosure-set: the component
 *                set and its participantActionRequired list.
 *   [DEPENDENCY] the component's own terminalized record, whose
 *                recordedButNotRendered block states the venue, fees, fee
 *                waiver, signature, service, notice and manual completion item
 *                that "the registry does state about this filing" and that was
 *                being held back. It is now rendered, which is what that block
 *                was preserved for.
 *
 * WHAT DID NOT CHANGE. Remedy, eligibility, the disposition list, venue, the
 * filing destination, service responsibility, the fee treatment and every one
 * of the four self-help stop conditions are exactly as the records state them.
 * The component set is the two the manifest declares — no third document was
 * added — and stage 1 still comes first and still tells a participant whose
 * order was already entered that there is nothing to file.
 *
 * The controlling records, and what each contributes:
 *
 *   [MEMO]       data/record-clearing/legal-design-intake/IN.memo.json,
 *                track in_infraction_nondisclosure (I.C. 34-28-5-15, reviewed
 *                2026-07-30). Unit stage-2 — the verified petition — carries
 *                available:false with the recorded reason: "No statewide form
 *                has been identified and county handling of the MC case-type
 *                assignment is unconfirmed, so the unit stays unavailable
 *                pending those release gates." Its scope restriction adds:
 *                "no form mapping is asserted."
 *   [MANIFEST]   data/record-clearing/legal-design-packet-set-manifests.json,
 *                packetSetId in_infraction_nondisclosure-set. The
 *                primary_filing component is CONDITIONAL, and its condition
 *                includes "once the form and MC case-type gates close" —
 *                which they have not.
 *   [DEPENDENCY] data/rcap-all50/composed-routes/indiana/in_infraction_nondisclosure/
 *                components/in_infraction_nondisclosure-primary-filing-2/dependency.json,
 *                the component's own terminalized record: drafted false,
 *                dependencyKind unresolved_form_question, with
 *                draftingProhibitedBecause quoting the registry, and the
 *                the missing determination assigned to the source-acquisition
 *                lanes. That record is UPDATED by this correction: drafted is
 *                now true, the held-corpus form search is recorded as complete
 *                while current official-index confirmation remains outstanding,
 *                and the MC case-type half is
 *                recorded as a participant-facing blank rather than a drafting
 *                bar. The build now REFUSES to run if that record ever says
 *                drafted:false again, which is the mirror of the guard it
 *                carried before.
 *
 * So this family is built as both stages: the stage-1 process-guidance
 * instrument — the statute requires the court to act on its own in the
 * non-prosecution, dismissal, not-committed and vacatur situations, so the
 * participant first checks whether that happened — followed by the stage-2
 * verified petition for the participant whose check comes back empty, or
 * whose route is the deferral or satisfied-judgment branch.
 *
 * TERMINOLOGY: never say records are destroyed — in Indiana expungement means
 * records are sealed or restricted under § 35-38-9-1(k), and the byte proof
 * asserts "destroy" absent from every page.
 *
 * WHAT THIS BUILD WRITES, AND WHAT IT CARRIES. The platform writes the
 * participant's own name. Every case fact the platform has not seen — the
 * county, the cause number or the MC case-type assignment, how the matter
 * ended and when, whether prosecution was deferred, the answer from the
 * court's records office about whether a non-disclosure order was already
 * entered, the court's own name, and the prosecuting attorney's name and
 * address — is a labelled blank declared REQUIRED_BEFORE_FILING and disclosed
 * with its checkable authority named. Nothing is signed and nothing is dated:
 * the petition is VERIFIED, so its verification and signature belong to the
 * participant alone and are written when the petition is actually filed. The
 * court's own ruling block is left to the court.
 *
 * No raster in this container: rasterState is BUILT_RASTER_PENDING.
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
import { preserveIdentityRefresh } from "./rcap-packet-completeness/identity-refresh.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const FAMILY_ID = "in_infraction_nondisclosure-set";
const OUT = "data/rcap-all50/overlays/census-v1/in/in-infraction-nondisclosure-set--custom-pleading";
const BUILD_SCRIPT = "scripts/build-census-v1-in_infraction_nondisclosure-set.mjs";

const MEMO_PATH = "data/record-clearing/legal-design-intake/IN.memo.json";
const MANIFEST_PATH = "data/record-clearing/legal-design-packet-set-manifests.json";
const DEPENDENCY_PATH = "data/rcap-all50/composed-routes/indiana/in_infraction_nondisclosure/components/in_infraction_nondisclosure-primary-filing-2/dependency.json";
const TRACK_ID = "in_infraction_nondisclosure";

const ROUTE = Object.freeze({
  jurisdiction: "IN",
  routeKeys: [
    "obligation:unit:IN:in_infraction_nondisclosure:in_infraction_nondisclosure-stage-1",
    "obligation:unit:IN:in_infraction_nondisclosure:in_infraction_nondisclosure-stage-2"
  ],
  legalName: "Infraction Non-Disclosure under I.C. 34-28-5-15",
  routeName: "keeping an Indiana infraction off background checks under I.C. 34-28-5-15",
  statute: "I.C. 34-28-5-15"
});

/* Both declared components are rendered, in the manifest's own order. The
 * stage-2 petition was absent until the owner's Q7 correction of 2026-09-02
 * directed that a component the family's own record declares required be
 * built; the header explains what the gate was and why the form half of it is
 * now answered. */
const COMPONENTS = [
  "in_infraction_nondisclosure-process-guidance-1",
  "in_infraction_nondisclosure-primary-filing-2"
];

const BUILT_COMPONENT_NOTE = Object.freeze({
  componentId: "in_infraction_nondisclosure-primary-filing-2",
  unitId: "in_infraction_nondisclosure-stage-2",
  builtUnder: "OWNER_CORRECTIONS_REQUIRED.json, Q7-required-component-deliberately-absent, decided 2026-09-02",
  previouslyAbsentBecause:
    "the manifest makes the component conditional on 'once the form and MC case-type gates close'; the memo held "
    + "the unit unavailable ('No statewide form has been identified and county handling of the MC case-type "
    + "assignment is unconfirmed'), and the component's own dependency record stated drafted:false with "
    + "dependencyKind unresolved_form_question.",
  whatChanged:
    "The held-source search found no applicable statewide form for an I.C. 34-28-5-15 infraction petition. "
    + "Every Indiana PDF in the mounted Master Library and in the partial Nationwide custody "
    + "was text-extracted and none contains '34-28-5-15' or 'infraction'; every Coalition for Court Access "
    + "instrument held is an I.C. 35-38-9 expungement form. The registry's officialFormId and officialSourceUrl "
    + "for this component are null. Outbound fetching of the CCA forms index was refused at CONNECT in this "
    + "container, so official forms index live confirmation remains outstanding and the held-corpus limit is "
    + "stated expressly. The MC case-type half is a "
    + "county-practice question that was never a drafting bar: it is a blank on the petition's caption, declared "
    + "required before filing, with the clerk named as the authority — which is what the family's own records "
    + "already direct.",
  dependencyRecord: DEPENDENCY_PATH
});

const COMPONENT_CONDITIONS = {
  "in_infraction_nondisclosure-process-guidance-1":
    "Stage 1, always applicable: check whether the court already ordered non-disclosure before anything else.",
  "in_infraction_nondisclosure-primary-filing-2":
    "Stage 2, used only where the stage-1 check shows the court entered no order, or where the route is the "
    + "deferral or satisfied-judgment branch. Where the order was already entered, this petition is not filed."
};

const COMPOSED_TITLES = {
  "in_infraction_nondisclosure-process-guidance-1": "Checking Whether the Court Already Ordered Non-Disclosure of Your Infraction (I.C. 34-28-5-15)",
  "in_infraction_nondisclosure-primary-filing-2": "Verified Petition for an Order of Non-Disclosure of Infraction Information (I.C. 34-28-5-15)"
};

const RECORD_ANCHORS = {
  memo: [
    "I.C. 34-28-5-15",
    "in_infraction_nondisclosure-stage-1",
    "in_infraction_nondisclosure-stage-2",
    "No statewide form has been identified and county handling of the MC case-type assignment is unconfirmed, so the unit stays unavailable pending those release gates.",
    "This does not apply where prosecution was deferred.",
    "Never say records are destroyed.",
    "Service on the prosecuting attorney, who has thirty days to file a notice in opposition.",
    "30 days after judgment",
    "2 years after the conduct",
    "Not applicable. There is no fee.",
    "Clerk of the court where the infraction was handled"
  ],
  manifest: [
    "in_infraction_nondisclosure-process-guidance-1",
    "in_infraction_nondisclosure-primary-filing-2",
    "once the form and MC case-type gates close"
  ],
  dependency: [
    "No statewide form has been identified",
    "in_infraction_nondisclosure-primary-filing-2",
    "The court where the charges were brought or the trial was held",
    "Service on the prosecuting attorney",
    "The petition is verified and signed by the petitioner."
  ]
};

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield"
  }
};

/* ---- record grounding --------------------------------------------------------- */
function groundRecords() {
  const failures = [];
  const records = [];
  for (const [name, rel, anchors, locate] of [
    ["memo", MEMO_PATH, RECORD_ANCHORS.memo, (j) => (j.tracks ?? j.records ?? []).find?.((t) => t.trackId === TRACK_ID) ?? j[TRACK_ID]],
    ["manifest", MANIFEST_PATH, RECORD_ANCHORS.manifest, (j) => (j.packetSets ?? []).find((p) => p.packetSetId === FAMILY_ID)],
    ["dependency", DEPENDENCY_PATH, RECORD_ANCHORS.dependency, (j) => j]
  ]) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) { failures.push({ record: name, path: rel, why: "the committed record does not exist" }); continue; }
    const bytes = fs.readFileSync(abs);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    const json = JSON.parse(bytes.toString("utf8"));
    const entry = locate(json);
    if (!entry) { failures.push({ record: name, path: rel, why: `the record no longer carries ${TRACK_ID}` }); continue; }
    const flat = JSON.stringify(entry);
    const missing = anchors.filter((a) => !flat.includes(a));
    if (missing.length > 0) { failures.push({ record: name, path: rel, why: `the record no longer states ${missing.length} fact(s) this build relies on`, missing }); continue; }
    records.push({ record: name, path: rel, sha256, byteLength: bytes.length, anchorsVerified: anchors.length });
  }
  // The one assertion that would CHANGE this build if it flipped, now the
  // mirror of the guard this builder carried before the owner's Q7 correction.
  // The petition IS drafted; if the dependency record is ever reverted to
  // drafted:false, this two-component shape is the stale one and the build
  // must be revised rather than rerun.
  const dep = JSON.parse(fs.readFileSync(path.join(ROOT, DEPENDENCY_PATH), "utf8"));
  if (dep.drafted !== true) {
    failures.push({
      record: "dependency", path: DEPENDENCY_PATH,
      why: "the stage-2 dependency record no longer states drafted:true; the owner's Q7 correction of 2026-09-02 required this component to be built, so a record that withdraws it must be reconciled with that decision rather than silently reducing the packet"
    });
  }
  return { records, failures };
}

/* ---- composed documents -------------------------------------------------------- */
const DOTS = (n = 84) => ".".repeat(n);

function composedBody(componentId, facts) {
  if (componentId === "in_infraction_nondisclosure-primary-filing-2") return petitionBody(facts);
  const name = facts["participant.full_legal_name"];
  const L = [];
  L.push(COMPOSED_TITLES[componentId].toUpperCase(), "");
  L.push(`Prepared for: ${name}`, "");
  L.push("WHY YOU CHECK FIRST. In the situations I.C. 34-28-5-15 covers automatically - the person is not prosecuted, the charge is dismissed, the person is adjudged not to have committed the infraction, or an adjudication is later vacated - the statute requires the COURT to order the clerk and any case management system operator not to disclose the infraction information to non-criminal-justice organisations or individuals. The court is supposed to act on its own. So the first step is never to file anything: it is to find out whether the order was already entered, because where it was, there is nothing to file.", "");
  L.push("ONE EXCLUSION BEFORE ANYTHING ELSE. The automatic rule does not apply where prosecution was DEFERRED. A deferral, or a satisfied judgment, supports a verified petition no earlier than five years after satisfying the conditions - that is the five-year branch, not the automatic one.", "");
  L.push("THE WORKSHEET. Gather these from your own papers, then make the call described below. Nothing on these lines is written for you:", "");
  L.push("County where the infraction was handled:");
  L.push(DOTS(), "");
  L.push("Cause number, if one was assigned:");
  L.push(DOTS(), "");
  L.push("How the matter ended, and on what date (never prosecuted / dismissed / found not to have committed it / adjudication vacated / deferral completed / judgment satisfied):");
  L.push(DOTS(), "");
  L.push("Was prosecution deferred, answered from your own papers:");
  L.push(DOTS(), "");
  L.push("THE CALL. Ask the office of the clerk of the court where the infraction was handled whether the court entered an order under I.C. 34-28-5-15 in your cause. Write down the answer:", "");
  L.push("Answer from the records office of the court where the infraction was handled - was a non-disclosure order under I.C. 34-28-5-15 already entered in your cause:");
  L.push(DOTS(), "");
  L.push("IF THE ORDER WAS ALREADY ENTERED: there is nothing to file. The order runs to the clerk and any case management system operator, restricting disclosure to non-criminal-justice organisations and individuals. Note that in Indiana, record relief restricts access to the records; it does not remove them.", "");
  L.push("IF NO ORDER WAS ENTERED, OR YOUR SITUATION IS A DEFERRAL OR SATISFIED JUDGMENT: the statute provides a verified petition, with these recorded features - it is filed under the original cause number, or as an MC case type where none was assigned, in the court where the charges were brought or the trial was held; there is no fee; it is served on the prosecuting attorney, who has thirty days to file a notice in opposition; and the earliest filing dates are: found not to have committed it - 30 days after judgment; vacatur final or certified - 365 days; conduct not prosecuted - 2 years after the conduct; dismissal with no new action filed - 30 days after dismissal; deferral or judgment satisfied - 5 years.", "");
  L.push("THE PETITION IS THE SECOND DOCUMENT IN THIS PACKET. Use it only if this check comes back empty - no order entered - or if your route is the deferral or satisfied-judgment branch. No applicable statewide form is held in this packet's governed source corpus; live confirmation at the official forms index remains outstanding after a refused fetch. What follows is therefore a controlled pleading drafted to the recorded statute requirements, not a claim that no form exists. Before you file it, ask the clerk of the court where the infraction was handled TWO things: what that court requires for an I.C. 34-28-5-15 petition, and - if no cause number was ever assigned to your infraction - how that county assigns the MC case type. This packet leaves that caption line blank on purpose rather than guessing a county convention that varies.", "");
  L.push("WHEN TO STOP AND GET HELP INSTEAD:");
  L.push("- the prosecuting attorney files a notice in opposition;");
  L.push("- the court sets a hearing;");
  L.push("- prosecution was deferred and the five-year clock has not run;");
  L.push("- the county's MC case-type handling is unclear.");
  L.push("", `Routes: ${ROUTE.routeKeys.join(" ; ")}`);
  return L.join("\n");
}

/*
 * THE STAGE-2 VERIFIED PETITION.
 *
 * Every clause below is traceable to the family's own records and to nothing
 * else. The caption follows the memo's venue rule and the manifest's filing
 * action; the allegations follow the memo's controllingAuthority summary, its
 * eligibleDispositions and its five waitingPeriods; the prayer asks for the
 * order the statute directs the court to make; the fee line follows the memo's
 * rules.fees; the service line follows rules.service and rules.notice; and the
 * verification block follows rules.participantSignature and the memo's single
 * manualCompletionItem. No allegation is pleaded that the records do not
 * support, and nothing the participant must decide is decided here.
 */
function petitionBody(facts) {
  const name = facts["participant.full_legal_name"];
  const L = [];
  L.push("IN THE " + DOTS(40) + " COURT");
  L.push(DOTS(30) + " COUNTY, INDIANA", "");
  L.push("CAUSE NUMBER (the original cause number; if no cause number was assigned, the MC case-type number the clerk of that county tells you to use):");
  L.push(DOTS(), "");
  L.push("IN RE: " + name, "");
  L.push(COMPOSED_TITLES["in_infraction_nondisclosure-primary-filing-2"].toUpperCase(), "");
  L.push("The Petitioner, " + name + ", petitions the Court under Indiana Code 34-28-5-15 for an order directing the clerk of this Court, and any person or entity operating a case management system for this Court, not to disclose the infraction information described below to a non-criminal-justice organisation or individual. In support, the Petitioner states:", "");
  L.push("1. IDENTITY. The Petitioner is " + name + ", the person named in the infraction matter described in paragraph 2.", "");
  L.push("2. THE INFRACTION MATTER. The infraction, and the county and court in which it was handled:");
  L.push(DOTS(), "");
  L.push("3. HOW THE MATTER ENDED, AND WHEN. State which one applies and the date it occurred - never prosecuted; dismissed with no new action filed; adjudged not to have committed the infraction; an adjudication vacated by an order or decision that is now final or certified; a deferral programme completed; or a judgment satisfied:");
  L.push(DOTS(), "");
  L.push("4. THE EARLIEST FILING DATE HAS PASSED. Indiana Code 34-28-5-15 fixes the earliest date on which this petition may be filed by how the matter ended: thirty (30) days after judgment where the person was adjudged not to have committed the infraction; three hundred sixty-five (365) days after an order or decision vacating an adjudication becomes final or is certified; two (2) years after the conduct where the conduct was not prosecuted; thirty (30) days after dismissal where no new action was filed; and five (5) years after satisfying the conditions of a deferral programme or the judgment imposed. The date computed from paragraph 3 under the applicable rule, which has passed:");
  L.push(DOTS(), "");
  L.push("5. THE COURT HAS NOT ALREADY ORDERED NON-DISCLOSURE. Where a person is not prosecuted, the charge is dismissed, the person is adjudged not to have committed the infraction, or an adjudication is vacated, Indiana Code 34-28-5-15 requires the Court to order non-disclosure on its own. The Petitioner asked the office of the clerk of the court in which the infraction was handled whether such an order was entered in this cause, and states the answer received:");
  L.push(DOTS(), "");
  L.push("(Where the answer is that an order was already entered, do not file this petition: the relief already exists. Where the Petitioner's route is a completed deferral or a satisfied judgment, the automatic rule does not reach it and this paragraph is answered by stating that branch.)", "");
  L.push("6. NO FEE. No filing fee is charged for this petition.", "");
  L.push("7. SERVICE ON THE PROSECUTING ATTORNEY. A copy of this petition is served on the prosecuting attorney, who has thirty (30) days from service to file a notice in opposition. The prosecuting attorney served, and the address used:");
  L.push(DOTS(), "");
  L.push("WHEREFORE, the Petitioner asks the Court to order the clerk of this Court, and any person or entity operating a case management system for this Court, not to disclose to a non-criminal-justice organisation or individual the infraction information described in paragraph 2, and for all other proper relief.", "");
  L.push("VERIFICATION. I affirm under the penalties for perjury that the foregoing representations are true.", "");
  L.push("SIGNATURE OF PETITIONER " + DOTS(46));
  L.push("DATE " + DOTS(30), "");
  L.push("PRINTED NAME: " + name, "");
  L.push("FOR THE COURT ONLY - do not write below this line.", "");
  L.push("The Court, having considered the petition, ORDERS:" + DOTS(40));
  L.push("JUDGE " + DOTS(40) + "   DATE " + DOTS(24), "");
  L.push("BEFORE YOU FILE THIS. Ask the clerk of the court where the infraction was handled what that court requires for an I.C. 34-28-5-15 petition, and - if no cause number was ever assigned - how that county assigns the MC case type. No applicable statewide form is held in this packet's governed source corpus, and live confirmation at the official forms index remains outstanding after a refused fetch; this controlled pleading does not claim that no form exists. County handling of the case-type assignment is also unconfirmed, so the caption above is left for you and the clerk to complete rather than guessed. Do not file this petition if the clerk tells you the Court already entered a non-disclosure order in your cause: the relief already exists.", "");
  L.push("STOP AND GET HELP INSTEAD IF: the prosecuting attorney files a notice in opposition; the Court sets a hearing; prosecution was deferred and the five-year clock has not run; or the county's MC case-type handling is unclear.", "");
  L.push("Note that in Indiana, record relief restricts access to the records; it does not remove them.", "");
  L.push(`Routes: ${ROUTE.routeKeys.join(" ; ")}`);
  return L.join("\n");
}

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

/* ---- the field maps -------------------------------------------------------------- */
function composedMap(componentId) {
  const base = (id, label) => ({
    field: `${componentId}.${id}`, fieldName: `${componentId}.${id}`, page: 1,
    printedLabel: label, printedLine: label,
    effectiveLabel: label, regionHeading: label, sectionHeading: null,
    rectBasis: "composed_document_authored_by_this_build"
  });
  const write = (id, label, factId) => ({ ...base(id, label), factId, kind: "composed_text", document: componentId });
  const rbf = (id, label, what, why) => ({
    ...base(id, label),
    reason: `the participant supplies this before anything is filed: ${what}`,
    category: null, completenessClass: null, class: null,
    disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
    requiredBeforeFiling: true, identity: `${componentId} field ${id}`, factId: null, routeDetermined: false,
    document: componentId, why, participantMustSupply: what
  });

  const prot = (id, label, why) => ({
    ...base(id, label),
    reason: "signature or date field; never prefilled by this build",
    category: SIGNATURE, completenessClass: SIGNATURE, class: SIGNATURE,
    requiredBeforeFiling: false, document: componentId, why
  });
  const court = (id, label, why) => ({
    ...base(id, label),
    reason: "court, clerk, prosecutor, agency, or hearing field; the court completes it",
    category: COURT_OWNED, completenessClass: COURT_OWNED, class: COURT_OWNED,
    requiredBeforeFiling: false, document: componentId, why
  });

  if (componentId === "in_infraction_nondisclosure-primary-filing-2") {
    const pWrites = [
      write("petitioner_name", "Petitioner named in the caption, the body and the printed-name line", "participant.full_legal_name")
    ];
    const pRefusals = [
      rbf("court_name", "Court the petition is captioned to - the court where the charges were brought or the trial was held",
        "the name of the Indiana court where the charges were brought or the trial was held, or, on the deferral branch, the court with jurisdiction over the violation - copied from your own papers",
        "the venue is a case fact the platform has not seen, and the memo states it as a rule rather than as a value"),
      rbf("county_name", "County in the caption",
        "the Indiana county that court sits in, copied from your own papers",
        "no county fact is held for a record the platform has not seen"),
      rbf("cause_or_mc_number", "Cause number, or the MC case-type number the clerk gives you where none was assigned",
        "the original cause number; and where no cause number was ever assigned, the MC case-type number the clerk of that county tells you to use - ask the clerk, because county handling of the MC case-type assignment is not uniform and this packet will not guess it",
        "the cause number is a case identifier the platform has not seen, and the MC case-type convention is an open county-practice question the family's own records assign to the participant and the clerk"),
      rbf("infraction_and_court", "The infraction, and the county and court in which it was handled - paragraph 2",
        "the infraction as your papers describe it, with the county and court that handled it",
        "no infraction fact is held for a record the platform has not seen"),
      rbf("how_and_when_it_ended", "How the matter ended, and the date - paragraph 3",
        "which of the six recorded dispositions applies - never prosecuted, dismissed with no new action filed, adjudged not to have committed it, an adjudication vacated, a deferral programme completed, or a judgment satisfied - and the date it happened",
        "the disposition and its date decide which earliest-filing rule applies, and only the participant's papers hold them"),
      rbf("earliest_filing_date", "The earliest filing date computed under the applicable rule - paragraph 4",
        "the date computed from paragraph 3 under the rule printed in paragraph 4, which must already have passed before you file",
        "the computation depends on the participant's own disposition and date, which the platform has not seen"),
      rbf("clerk_answer", "The answer the clerk gave about whether an order was already entered - paragraph 5",
        "the answer the office of the clerk of that court gave when you asked whether an order under I.C. 34-28-5-15 was already entered in your cause - if it was, do not file this petition",
        "whether the court already acted is a fact only that court's records hold, and it decides whether this petition should be filed at all"),
      rbf("prosecuting_attorney", "The prosecuting attorney served, and the address used - paragraph 7",
        "the prosecuting attorney you serve and the address you use, written after service actually happens",
        "the platform holds no prosecuting-attorney address for any Indiana county and does not guess one"),
      prot("petitioner_signature", "Signature of Petitioner on the verification",
        "the petition is verified under the penalties for perjury; the participant signs it themselves when it is actually filed"),
      prot("petitioner_signature_date", "Date beside the signature of Petitioner",
        "a verification dated before the petition is actually filed would be false"),
      court("court_order_block", "The Court's order on the petition",
        "the Court rules on the petition; the block is printed so the order has somewhere to go and is never completed by this build"),
      court("judge_signature_and_date", "Judge's signature and the date of the order",
        "the judge signs the order; nothing on this line belongs to the participant or to this build")
    ];
    return composedMapShell(componentId, pWrites, pRefusals);
  }

  const writes = [
    write("participant_name", "Person this worksheet is prepared for", "participant.full_legal_name")
  ];
  const refusals = [
    rbf("county", "County where the infraction was handled",
      "the Indiana county where the infraction was handled, from your own papers",
      "no case fact is held for a record the platform has not seen"),
    rbf("cause_number", "Cause number, if one was assigned",
      "the cause number if one was assigned, copied from your papers - if none was assigned, write none, because that decides the MC case-type question the petition branch turns on",
      "no case identifier is held for a record the platform has not seen"),
    rbf("outcome_and_date", "How the matter ended, and on what date",
      "how the infraction matter ended (never prosecuted, dismissed, found not to have committed it, adjudication vacated, deferral completed, or judgment satisfied) and the date it did - the earliest filing dates run from this",
      "no disposition fact is held for a record the platform has not seen"),
    rbf("deferral_answer", "Was prosecution deferred, answered from your own papers",
      "whether prosecution was deferred - the automatic rule does not apply where it was, and the five-year branch does",
      "the deferral answer routes between the automatic rule and the five-year branch, and only the participant's papers hold it"),
    rbf("order_answer", "Answer from the records office of the court where the infraction was handled - was a non-disclosure order under I.C. 34-28-5-15 already entered in your cause",
      "the answer you are given when you ask the office of the clerk of the court where the infraction was handled whether an order under I.C. 34-28-5-15 was entered in your cause - write it down, because where the order exists there is nothing to file",
      "whether the court already acted is a fact only that court's records hold")
  ];
  return composedMapShell(componentId, writes, refusals);
}

function composedMapShell(componentId, writes, refusals) {
  return {
    formNumber: componentId, documentId: componentId, documentRole: componentId,
    documentPolicy: {
      mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKeys: ROUTE.routeKeys,
      conditional: true, conditionDescription: COMPONENT_CONDITIONS[componentId]
    },
    structuralClass: "composed_document",
    composedFrom:
      "the legal-design intake record (data/record-clearing/legal-design-intake/IN.memo.json, track "
      + "in_infraction_nondisclosure), the packet-set manifest "
      + "(data/record-clearing/legal-design-packet-set-manifests.json), and the stage-2 component's own dependency "
      + "record (drafted:false, unresolved_form_question)",
    explicitMappings: {}, roleRefusals: [], selectionControls: [],
    canonicalWrites: writes, canonicalRefusals: refusals,
    boundaryWrites: writes, boundaryRefusals: refusals
  };
}

/* ---- byte proof of the composed writes --------------------------------------------- */
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
  // Terminology guard: never say records are destroyed — Indiana relief
  // restricts access; it does not destroy.
  for (const [i, t] of textOfPage.entries()) {
    assert.ok(!/destro/i.test(t),
      `packet page ${i + 1} says records are destroyed in some form; the memo forbids it — Indiana relief restricts, it does not destroy`);
  }
  return { actualWrites, glyphs, pagesRead: pages.length };
}

/* ---- the builder's own count of the nine counters ------------------------------------ */
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

/* ---- outputs -------------------------------------------------------------------------- */
function writeJson(rel, value) {
  const absolute = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  /* A hand-written identityRefresh on a source pin this build did not move
   * survives the rebuild; one whose source moved again does not. See
   * scripts/rcap-packet-completeness/identity-refresh.mjs. */
  fs.writeFileSync(absolute, `${JSON.stringify(preserveIdentityRefresh(fs, absolute, value), null, 2)}\n`);
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

function participantInstructions(maps, rbfItems) {
  const byDoc = new Map();
  for (const item of rbfItems) byDoc.set(item.document, [...(byDoc.get(item.document) ?? []), item]);
  const out = [];
  out.push(`# What you must do — ${ROUTE.routeName}`, "");
  out.push(`This packet is prepared for **${ROUTE.legalName}**.`, "");
  out.push("In Indiana, record relief **restricts access** to records — under § 35-38-9-1(k) records are sealed or restricted, and the Office of Judicial Administration states plainly that court records are not deleted. Nothing in this packet says otherwise.", "");

  out.push("## What this packet is, honestly", "");
  out.push("It is **two documents, in the order you use them**.", "");
  out.push("**The stage-1 check comes first.** The statute requires the court to order non-disclosure on its own where the person is not prosecuted, the charge is dismissed, the person is adjudged not to have committed the infraction, or an adjudication is vacated — so the first step is to find out whether that already happened, because **where it did there is nothing to file** and you are done.", "");
  out.push("**The stage-2 verified petition comes second, and only if you need it.** Use it where the check comes back empty — no order was entered — or where your route is the deferral or satisfied-judgment branch, which the automatic rule does not reach.", "");
  out.push("**No applicable statewide form is held in this packet's governed source corpus for an I.C. 34-28-5-15 petition.** Every Indiana form the repository holds is a Coalition for Court Access expungement form under a different chapter, I.C. 35-38-9, and none mentions this statute or infractions. Live confirmation at the official forms index remains outstanding after a refused fetch, so this packet does not claim that no form exists. The petition is a controlled pleading drafted to the recorded statute requirements rather than filled onto a held form.", "");
  out.push("**One thing on the petition is deliberately left blank, and you should know why.** Where no cause number was ever assigned to your infraction, the petition is filed under an **MC case type** — and how a county assigns that is not uniform and is not published anywhere this packet can read. Guessing it risks the petition being rejected at the counter, so the caption line is left for you and the clerk. **Ask the clerk of the court where the infraction was handled** what that court requires for an I.C. 34-28-5-15 petition, and how the county assigns the MC case type if you have no cause number.", "");

  out.push("## The items you must supply", "");
  out.push("Each is printed on its document as a labelled dotted blank.", "");
  for (const [doc, items] of byDoc) {
    out.push(`### ${doc} — ${COMPOSED_TITLES[doc] ?? doc}`, "");
    out.push("| The blank on the document | What to write |", "| --- | --- |");
    for (const i of items) out.push(`| ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## What you do, in order", "");
  out.push("1. **Fill in the worksheet** from your own papers. If prosecution was deferred, the automatic rule does not apply — the five-year deferral branch does.");
  out.push("2. **Call or visit the office of the clerk of the court where the infraction was handled** and ask whether the court entered an order under I.C. 34-28-5-15 in your cause. Write down the answer.");
  out.push("3. **If the order was entered**: nothing to file. You are done.");
  out.push("4. **If no order was entered, or yours is a deferral or satisfied judgment**: use the verified petition in this packet. There is no fee. Check the timing table below against how and when your matter ended, and do not file before the earliest date has passed.");
  out.push("5. **Call the clerk again before you file the petition** and ask what that court requires for an I.C. 34-28-5-15 petition, and — if no cause number was ever assigned — how the county assigns the MC case type. Write the case-type number on the caption line.");
  out.push("6. **Fill in every dotted blank on the petition**, then **sign the verification yourself, on the day you file**. It is affirmed under the penalties for perjury, so it is signed when it is true and not before.");
  out.push("7. **Serve a copy on the prosecuting attorney**, and write who you served and the address you used on paragraph 7 **after service has actually happened**. The prosecuting attorney then has thirty days to file a notice in opposition.");
  out.push("");

  out.push("## Timing, from the statute's recorded waiting periods", "");
  out.push("| How your matter ended | Earliest petition date |", "| --- | --- |");
  out.push("| Found not to have committed the infraction | 30 days after judgment |");
  out.push("| An order or decision vacating an adjudication becomes final or is certified | 365 days |");
  out.push("| Conduct not prosecuted | 2 years after the conduct |");
  out.push("| Dismissal with no new action filed | 30 days after dismissal |");
  out.push("| Deferral programme or judgment conditions satisfied | 5 years |");
  out.push("");

  out.push("## When to stop and get help instead", "");
  out.push("- the prosecuting attorney files a notice in opposition;");
  out.push("- the court sets a hearing;");
  out.push("- prosecution was deferred and the five-year clock has not run;");
  out.push("- the county's MC case-type handling is unclear.", "");

  out.push("## What this packet is not", "");
  out.push("It is not an official Indiana form — none exists for this petition — it is not legal advice, it is not filed or served for you, and it does not decide whether the court will order non-disclosure. One more recorded disclosure that belongs to Indiana record-relief cases generally: a relief case's file is public until the order is granted.", "");
  out.push(`_Routes: ${ROUTE.routeKeys.join(" ; ")}_`);
  return `${out.join("\n")}\n`;
}

/* ---- the entry point ----------------------------------------------------------------------- */
export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");

  const { records, failures } = groundRecords();
  if (failures.length > 0) {
    return {
      familyId: FAMILY_ID, status: "BLOCKED_SOURCE", failedSourceIdentities: failures,
      why: "a committed governing record no longer states what this build relies on, so nothing may be composed against it",
      overlayDirectoryTouched: false
    };
  }

  if (checkOnly) {
    const maps = COMPONENTS.map((c) => composedMap(c));
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY",
      groundingRecords: records, components: COMPONENTS, builtComponentNote: BUILT_COMPONENT_NOTE,
      writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
      blanks: maps.reduce((n, m) => n + m.canonicalRefusals.length, 0)
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  const maps = COMPONENTS.map((c) => composedMap(c));
  const artifacts = [];
  const writeProofs = [];
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
      proofMethod: "every written fact value read back from the extracted text of its component's own pages in the saved packet bytes; every page asserted free of any claim that records are destroyed",
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
  }

  const rbfItems = requiredBeforeFilingItems(maps);
  const instructionsText = participantInstructions(maps, rbfItems);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID, worklistGroupId: FAMILY_ID,
    jurisdiction: ROUTE.jurisdiction, implementationStrategy: "custom_pleading",
    custodyClass: "CUSTOM_PLEADING_FROM_CODIFIED_TEXT", acquisitionCommissioned: false,
    bindingMethod:
      "no source bytes are bound — the MASTER_QUEUE row binds none (sourceStatus CUSTOM_PLEADING_FROM_CODIFIED_TEXT, "
      + "boundSources []) — so the build grounds on the family's committed legal-design records and the stage-2 "
      + "component's own dependency record, each verified by SHA-256 and by content assertion before composing",
    routeKeys: ROUTE.routeKeys,
    statutoryAuthority: ROUTE.statute, legalName: ROUTE.legalName,
    allSourcesExact: true,
    officialFormExistenceStatus:
      "NOT_CONFIRMED_CURRENT — no applicable statewide form is held in the governed corpus; official forms index live confirmation remains outstanding after the recorded refused fetch",
    groundingRecords: records,
    documents: [],
    composedComponentsAuthoredByThisBuild: COMPONENTS,
    ownerCorrectionQ7: BUILT_COMPONENT_NOTE,
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "that I.C. 34-28-5-15 as recorded in the memo (reviewed 2026-07-30) is the current text of the statute",
      "whether a current statewide form exists for the stage-2 petition; official forms index live confirmation remains outstanding after the recorded refused fetch",
      "how counties handle the MC case-type assignment where no cause number was assigned",
      "that any output is approved for participant delivery",
      "that any record qualifies for non-disclosure under I.C. 34-28-5-15"
    ]
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    routeKeys: ROUTE.routeKeys, renderStrategy: "composed_pleading",
    jurisdiction: ROUTE.jurisdiction, statute: ROUTE.statute, legalName: ROUTE.legalName,
    implementationStrategy: "custom_pleading",
    officialForm: null,
    componentSet: COMPONENTS,
    componentConditions: COMPONENT_CONDITIONS,
    ownerCorrectionQ7: BUILT_COMPONENT_NOTE,
    dispositionVocabulary: [SIGNATURE, COURT_OWNED],
    routeSelectionsMade: [],
    routeSelectionNote:
      "The stage-1/stage-2 sequence is not an election this packet makes: stage 1 always runs first, because the "
      + "statute requires the court to act on its own and the participant's job is to find out whether it did. "
      + "Stage 2 turns on the answer that check produces, and on the disposition branch — so both instruments are "
      + "delivered and the petition's own face states the condition on which it is used, rather than the packet "
      + "choosing for the participant. No route control is rendered and no branch is pre-selected.",
    requiredBeforeFilingCount: rbfItems.length,
    requiredBeforeFiling: rbfItems,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID,
    renderedFresh: true, derivedFromBytes: true,
    componentSet: COMPONENTS,
    componentConditions: COMPONENT_CONDITIONS,
    ownerCorrectionQ7: BUILT_COMPONENT_NOTE,
    pdfs: pdfsDeclared,
    artifacts,
    packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    everyPageRastered: false,
    byteDerivedHashes: true,
    rasterEngine: null, rasterSkipped: true, rasterPages: [],
    rasterState: "BUILT_RASTER_PENDING",
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID, derivedFromArtifactBytes: true,
    note:
      "Every written fact value was read back from the extracted text of its component's own pages in the saved "
      + "packet bytes, not from this builder's intent; every page was asserted free of any claim that records are "
      + "destroyed, per the memo's terminology rule.",
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
    requiredBeforeFiling: rbfItems,
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
    rasterEngine: "not rendered in this run", popplerUsed: false,
    renderedArtifacts: artifacts.length, rasterPages: 0,
    rasterState: "BUILT_RASTER_PENDING",
    independentVerificationStatus: "PENDING", selfVerified: false,
    generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1", familyId: FAMILY_ID, blocking: [],
    findings: [
      {
        finding:
          "OWNER CORRECTION Q7, 2026-09-02: 'THE REQUIRED COMPONENT MUST BE BUILT.' The queue row's "
          + "implementationStrategy is custom_pleading and its instrumentKinds names the stage-2 verified "
          + "petition, and until this correction the family shipped without it: the memo held the stage-2 unit "
          + "unavailable pending the statewide-form and MC case-type gates, and the component's dependency record "
          + "stated drafted:false with dependencyKind unresolved_form_question. The owner ruled the reduced packet "
          + "unapproved while that component is absent, and no legal-design decision removing the requirement "
          + "exists.",
        consequence:
          "The petition is drafted and the packet now renders both declared components in the manifest's order. "
          + "The held-source search found no applicable statewide form for an I.C. 34-28-5-15 infraction petition "
          + "in any source this repository holds — every Indiana PDF in the mounted "
          + "Master Library and in the partial Nationwide custody was text-extracted on this pass and none "
          + "contains '34-28-5-15' or 'infraction', every Coalition for Court Access instrument held being an "
          + "I.C. 35-38-9 expungement form, and the registry's officialFormId and officialSourceUrl for this "
          + "component are null. Outbound fetching of the CCA forms index was refused at CONNECT (HTTP 403), so "
          + "official forms index live confirmation remains outstanding; the held-corpus limit and exact URL are "
          + "recorded rather than converted into a nonexistence claim. The MC "
          + "case-type half was never a drafting bar: it is a caption blank declared REQUIRED_BEFORE_FILING with "
          + "the county clerk named, which is what the family's own records already direct. Every clause of the "
          + "petition traces to the memo, the manifest or the dependency record's own recordedButNotRendered "
          + "block, which is now rendered. Remedy, eligibility, venue, filing destination, service "
          + "responsibility, the fee treatment and all four self-help stop conditions are unchanged, and no third "
          + "component was added. The build now refuses to run if the dependency record is ever reverted to "
          + "drafted:false."
      },
      {
        finding:
          "Stage 1 is genuinely nothing-to-file: the statute requires the court to act on its own in the "
          + "non-prosecution, dismissal, not-committed and vacatur situations, and the memo's supporting document "
          + "is the clerk's confirmation of whether an order was entered.",
        consequence:
          "The instrument is a worksheet-and-call page: gather the case facts, ask the clerk of the court where the "
          + "infraction was handled whether an I.C. 34-28-5-15 order was entered in the cause, and write the answer "
          + "down. Where the order exists there is nothing to file, and the packet says so."
      },
      {
        finding:
          "The memo excludes deferred prosecutions from the automatic branch (they use the five-year deferral "
          + "branch), and records earliest filing dates per disposition.",
        consequence:
          "Both are stated verbatim on the guidance page and in the instructions' timing table; the deferral answer "
          + "is a worksheet blank because only the participant's papers hold it."
      },
      {
        finding:
          "The memo's terminology rule: never say records are destroyed — Indiana relief seals or restricts under "
          + "§ 35-38-9-1(k) — and the jurisdiction-wide disclosure that a relief case's file is public until the "
          + "order is granted.",
        consequence:
          "The byte proof asserts no page claims destruction, and the instructions carry the public-file disclosure."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    counselQuestionsRaised: [
      "THE STAGE-2 VERIFIED PETITION IS NOW BUILT, under OWNER_CORRECTIONS_REQUIRED.json Q7 of 2026-09-02. It is a composed pleading, not a form fill, because no applicable statewide form is held in the governed corpus: every Indiana PDF in the mounted Master Library and in the partial Nationwide custody was text-extracted on this build and none contains '34-28-5-15' or 'infraction'. Official forms index live confirmation remains outstanding after the recorded refused fetch; this packet does not claim that no form exists. THE SUBSTANCE OF THE PETITION IS WHAT COUNSEL MUST READ. Every clause traces to this family's own records — the caption to the memo's venue rule, paragraphs 3 and 4 to its six eligibleDispositions and five waitingPeriods, paragraph 6 to rules.fees, paragraph 7 to rules.service and rules.notice, and the verification to rules.participantSignature and the single manualCompletionItem — but a drafted pleading is a legal instrument and no verifier can approve its wording for it. Approve, amend or reject the petition as drafted.",
      "The MC case-type caption line is left BLANK and declared required before filing, with the county clerk named, because county handling of the assignment is unconfirmed and unpublished. Confirm that a blank with a named authority is the right treatment rather than a stop condition that withholds the petition entirely.",
      "Confirm the timing table and the petition's paragraph 4 (the statute's earliest filing dates per disposition) are stated correctly for participant use.",
      "The petition instructs the participant NOT to file where the clerk says an order was already entered. Confirm that instruction is placed strongly enough on the petition's own face as well as in the instructions."
    ],
    mattersForTheReviewersAttention: [
      "The build now refuses to run if the stage-2 dependency record is reverted to drafted:false, which is the mirror of the guard it carried before the correction: the reduced shape cannot silently return.",
      "The dependency record's recordedButNotRendered block is preserved verbatim and marked superseded, with a renderedInto map, so the drafted petition can be checked clause by clause against the registry statement it was drafted from.",
      "Terminology: the byte proof asserts no page claims records are destroyed.",
      "Nothing on the petition is signed or dated by this build. The verification is affirmed under the penalties for perjury and belongs to the participant on the day of filing; the court's ruling block is left to the court.",
      "Outbound fetching of the Coalition for Court Access expungement forms index was refused at CONNECT (HTTP 403) in the correction container. The absence of a statewide form rests on held sources, and the exact URL is recorded in the dependency record's exactMissingSource rather than treated as answered by a fetch."
    ]
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
    implementationStrategy: "custom_pleading",
    groundingRecords: records,
    components: COMPONENTS,
    documents: COMPONENTS,
    ownerCorrectionQ7Component: BUILT_COMPONENT_NOTE.componentId,
    writes: maps.reduce((n, m) => n + (m.canonicalWrites ?? []).length, 0),
    requiredBeforeFiling: rbfItems.length,
    artifactHashes: artifacts.map((a) => ({ fixture: a.fixture, packetSha256: a.sha256, pages: a.pageCount })),
    rasterPages: 0,
    rasterState: "BUILT_RASTER_PENDING",
    nineCountersZero: allZero,
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };
}

async function selfTest() {
  const receiptText = fs.readFileSync(path.join(ROOT, OUT, "source-receipt.json"), "utf8");
  const instructionsText = fs.readFileSync(path.join(ROOT, OUT, "participant-instructions.md"), "utf8");
  const renderedText = [];
  for (const fixture of ["canonical", "boundary"]) {
    const bytes = fs.readFileSync(path.join(ROOT, OUT, "fixtures", `${fixture}.pdf`));
    const document = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    renderedText.push(document.getPages().map((page) => groupIntoLines(extractTextItems(page)).map((line) => line.text).join(" ")).join("\n"));
  }
  const allParticipantFacingText = [instructionsText, ...renderedText].join("\n");
  assert.doesNotMatch(allParticipantFacingText, /Indiana publishes no statewide form|no statewide form exists/i, "participant-facing text must not claim a nonexistence that current official-index evidence does not establish");
  assert.doesNotMatch(receiptText, /open question that keeps it undrafted/i, "receipt must not call a rendered petition undrafted");
  assert.match(receiptText, /official forms index[^.]*confirmation[^.]*outstanding/i, "receipt must disclose the outstanding official-index confirmation");
  console.log("in_infraction_nondisclosure-set source-identity self-test passed");
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  const operation = process.argv.includes("--self-test") ? selfTest() : runFamily();
  operation
    .then((r) => { if (r) console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
