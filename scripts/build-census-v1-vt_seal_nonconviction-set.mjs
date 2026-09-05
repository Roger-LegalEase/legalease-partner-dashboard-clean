#!/usr/bin/env node
/**
 * The Vermont non-conviction sealing packet family builder.
 *
 *   node scripts/build-census-v1-vt_seal_nonconviction-set.mjs [--check] [--no-raster]
 *
 * One family, three official Vermont forms, and THREE routes the census records
 * for it:
 *
 *   an ordinary contested petition at any time, 13 V.S.A. Sec. 7603(g)
 *   a stipulated sealing at any time, 13 V.S.A. Sec. 7603(a)(2)
 *   no filing -- process guidance
 *
 * The packet carries all three. The petition (200-00130) is the contested route,
 * the stipulation (200-00132) is the stipulated route, and a composed guidance
 * page is the third: a route that files nothing still has to tell the
 * participant what happens instead, or the packet has quietly dropped a third of
 * what it was built for.
 *
 * WHAT THE ROUTE DETERMINES, AND WHAT IT DOES NOT
 *
 * These are the same three forms the sealing-by-conviction families in this
 * repository use, and the difference is one question. Question 2 of 200-00130
 * asks the petitioner to say whether they were convicted. This family is
 * NON-CONVICTION sealing, so the route determines that answer: the packet marks
 * "I was not convicted for the offenses listed above" and refuses the whole
 * conviction block beneath it -- the date of conviction, the probation
 * questions and the restitution questions -- as a branch this route does not
 * take.
 *
 * What the route does NOT determine is which non-conviction ending applies:
 * never charged, no probable cause, or dismissed. Those are three different
 * things that happened to a participant's own case, and the packet leaves all
 * three boxes for them.
 *
 * Captions are read out of the pinned binary at build time; the exact SHA-256
 * source binding is what fails the family closed if a form changes. The policy
 * assignments are the ones this repository already carries a verified map for
 * on these three binaries, restated here with the route treatment above.
 *
 * Rasterization goes through scripts/raster/pdf-page-raster.mjs. Never Poppler.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { finalizeOfficialForm, PARTICIPANT_INK, SELECTION_INSET, SELECTION_LINE_WIDTH } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { extractPageGeometry } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { flattenedWidgets, drawnAt } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { rasterizePageCalibrated } from "./raster/pdf-page-raster.mjs";
import { classifyField, classifyBlank, rowKeyOf, PASS_COUNTERS, BLANK_DISPOSITIONS } from "./rcap-packet-completeness/completeness-contract.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const TRACK_REGISTRY = "data/record-clearing/legal-design-track-registry.json";
const ROUTE_CENSUS = "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json";
const OVERLAY_ROOT = "data/rcap-all50/overlays/census-v1/vt";
const FIXED_DATE = "2026-01-01T00:00:00.000Z";

function corpusRoot() {
  const configured = process.env.MASTER_LIBRARY_SOURCE_DIR
    ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
  assert.ok(fs.existsSync(configured), `the Master Library is not mounted at ${configured}`);
  return configured;
}

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const ELECTION_CLASS = "participant_sworn_narrative_or_legal_election";
const FEE_WAIVER_NOT_APPLICABLE = "no filing fee is charged on this track, so the fee-waiver component's condition is not met; 600-00228 is delivered exactly as the Judiciary publishes it and this field is never populated with participant data on this route";

const WRITE = (fact) => ({ policy: "write", fact });
const SUPPLY = (what) => ({ policy: "supply", what });
const PROTECT = (why) => ({ policy: "protect", refusalClass: why });
const ELECTION = () => ({ policy: "election" });
const SELECT = (why) => ({ policy: "select", routeReason: why });
const OFFROUTE = (why) => ({ policy: "offroute", routeReason: why });

/* ---- the printed caption, as a caption rather than as bytes ---------------- *
 *
 * All three of these forms draw their empty checkboxes as Wingdings glyphs, and
 * those glyphs decode to control characters: U+0007 U+0006 on both petition
 * forms and, on one line of the fee-waiver, U+0005 U+007F. They are the BOX. The
 * caption is the words beside it. The committed map carried the control
 * characters inside printedLabel -- "\u0007\u0006I was convicted of the
 * offenses." -- so what it declared as the printed caption was not what the form
 * prints, and a reviewer comparing the map to the page had to know to look past
 * two invisible bytes first.
 */
function printedCaption(text) {
  return String(text ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
}

/* ---- which box on a shared YES/NO line is THIS box ------------------------- *
 *
 * Five of the twenty checkboxes on these forms share one printed line with their
 * opposite: "YES  NO" on both consent-to-email questions, "Yes  No" on the
 * fee-waiver's employment, benefits and additional-assets questions. The
 * nearest-printed-line rule gives both members of the pair the SAME caption, so
 * the map could not tell YES from NO, and the two rows for a question were
 * indistinguishable.
 *
 * The option word is not transcribed. The policy entry names which word this box
 * carries, and this function proves it against the pinned binary: it reads the
 * characters of the widget's own printed line, finds every occurrence of every
 * option word, takes the one nearest to the RIGHT of the widget's own box, and
 * refuses the build if that is not the word the policy named. A caption that
 * cannot be located beside its own box is not a caption that was read off the
 * page.
 */
function optionWordBesideBox(line, rect, options, expected, where) {
  const chars = line?.chars ?? [];
  assert.ok(chars.length > 0, `${where}: the printed line beside this box carries no measurable characters`);
  const text = chars.map((c) => c.c).join("");
  const found = [];
  for (const option of options) {
    let at = text.indexOf(option);
    while (at >= 0) {
      const first = chars[at];
      const last = chars[at + option.length - 1] ?? first;
      found.push({ option, x: first.x, x2: last.x + (last.w ?? 0) });
      at = text.indexOf(option, at + 1);
    }
  }
  assert.ok(found.length > 0, `${where}: none of ${JSON.stringify(options)} is printed on this box's own line`);
  const toTheRight = found.filter((f) => f.x >= rect.x).sort((a, b) => a.x - b.x);
  const nearest = toTheRight[0] ?? found.sort((a, b) => Math.abs(a.x - rect.x) - Math.abs(b.x - rect.x))[0];
  assert.equal(nearest.option, expected,
    `${where}: the policy calls this box "${expected}" and the word printed beside it at x=${nearest.x} is "${nearest.option}"`);
  return { word: nearest.option, xOfWord: nearest.x, xOfBox: Number(rect.x.toFixed(2)), optionsOnThisLine: [...new Set(found.map((f) => f.option))] };
}

/* ---- what the manifest says about the fee-waiver component ----------------- *
 *
 * data/record-clearing/legal-design-packet-set-manifests.json carries
 * vt_seal_nonconviction-set's fee-waiver component as CONDITIONAL, and resolves
 * the condition against this track itself: "Only where a filing fee is charged;
 * on this track none is." Its apply_fee_waiver participant action says the same
 * thing in the participant's own words -- "Use it only if you are asking the
 * court to waive the filing fee; if you are paying the fee, you do not need it."
 *
 * The build used to generate the form AND prefill it with the participant's
 * name, address, city, telephone, email, docket number and printed name, on a
 * component whose own filing disposition is do_not_file and whose page 2 is a
 * financial declaration made under oath -- while participant-instructions.md
 * told the participant twice not to complete or file it. A packet cannot fill a
 * form in and tell the reader not to fill it in; one of the two is false, and
 * the prefill was the false one.
 *
 * The manifest's conditional rule decides, and the treatment it decides on is
 * the second of the two honest ones: the Judiciary's single statewide fee-waiver
 * form is DELIVERED UNFILLED, so nothing on it is asserted on the participant's
 * behalf, and the instructions and the process-guidance page say what it is and
 * when it would be used. Nothing in the packet now claims a financial fact.
 */
const FEE_WAIVER_COMPONENT_REQUIREMENT = Object.freeze({
  requirement: "conditional",
  conditionDescription: "Only where a filing fee is actually charged; on this track none is.",
  conditionMetOnThisTrack: false,
  filingDispositionForThisTrack: "do_not_file",
  deliveryTreatment: "delivered_unfilled",
  whyItIsStillDelivered: "600-00228 is the Vermont Judiciary's single statewide fee-waiver application and the packet-set manifest carries it as a component of this set. It is delivered exactly as the Judiciary publishes it, with nothing written on it, so the packet asserts no financial fact and no identity on a form the participant is told not to file. The instructions and the process-guidance page name the form, say no fee is charged on this track, and say the only circumstance in which it is used.",
  nothingIsWrittenOnIt: true,
  manifestRecord: "data/record-clearing/legal-design-packet-set-manifests.json -> packetSets[vt_seal_nonconviction-set].components[vt_seal_nonconviction-fee-waiver-application-5]"
});

/* ---- what the manifest says about the interests-of-justice prompts --------- *
 *
 * The packet-set manifest names FIVE components for this family and the packet
 * used to declare four. The missing one is
 * vt_seal_nonconviction-interests-of-justice-prompts-4, conditional on
 * "Only on the Sec. 7603(g) ordinary petition route, where the petitioner
 * carries the affirmative burden" -- a route this packet expressly carries, as
 * ROUTE_KEYS[1], as the petition it fills, and as section 1 of its own guidance
 * page. Its condition is therefore MET here, and a component whose condition is
 * met is owed a page.
 *
 * Unlike the fee waiver, which is conditional, unmet, and dispositioned in
 * componentRequirements as delivered_unfilled, this component was absent
 * silently: neither rendered nor dispositioned, and invisible to every counter
 * because a component that was never built has no field-map row to count.
 *
 * WHAT IT MAY BE AND WHAT IT MAY NOT BE. The committed record fixes this and
 * the build does not get to choose. The intake memo's component note is
 * "Prompts the participant to write, in their own words, why sealing serves the
 * interests of justice. LegalEase never generates this argument." The track
 * registry says the same of the unit: "The interests-of-justice statement is a
 * participant-authored field with prompts and never generated argument, because
 * on this route the burden is affirmative on the petitioner rather than on the
 * State." So the page carries QUESTIONS and carries no answer: no drafted
 * sentence the participant could sign, no example statement, no argument. The
 * blank it feeds -- question 4 of 200-00130 -- stays a supply, exactly as it
 * was, and nothing on the petition changed.
 */
const IOJ_COMPONENT_REQUIREMENT = Object.freeze({
  requirement: "conditional",
  conditionDescription: "Only on the Sec. 7603(g) ordinary petition route, where the petitioner carries the affirmative burden.",
  conditionMetOnThisTrack: true,
  whyTheConditionIsMet: "This packet carries the Sec. 7603(g) ordinary contested petition as one of its three routes: it is ROUTE_KEYS[1] (obligation:unit:VT:vt_seal_nonconviction:vt-nonconviction-ordinary-petition), it is the route 200-00130 is filled for, and it is section 1 of the packet's own process-guidance page. On that route the burden is affirmative on the petitioner.",
  filingDispositionForThisTrack: "not_filed_by_itself",
  deliveryTreatment: "rendered_as_a_composed_component_page_of_participant_facing_prompts",
  whatItCarries: "Prompts only -- questions for the participant to answer in their own words, and a statement of where their own answer goes on the petition.",
  whatItNeverCarries: "No generated argument, no drafted or example statement, and no sentence the participant could sign as their own. The platform writes nothing into question 4 of 200-00130 and this page writes nothing there either.",
  feedsBlank: "200-00130 question 4, printed caption '4. I believe that sealing of my criminal history is in the interests of justice because:', which remains a participant supply and was not changed by this component.",
  manifestRecord: "data/record-clearing/legal-design-packet-set-manifests.json -> packetSets[vt_seal_nonconviction-set].components[vt_seal_nonconviction-interests-of-justice-prompts-4]",
  registryRecord: "data/record-clearing/legal-design-track-registry.json -> vt_seal_nonconviction, unit vt-nonconviction-ordinary-petition"
});

const COMPONENTS = ["petition", "stipulation_and_proposed_order", "fee_waiver_application", "process_guidance", "interests_of_justice_prompts"];
const DOCUMENT_OF_COMPONENT = {
  petition: "200-00130",
  stipulation_and_proposed_order: "200-00132",
  fee_waiver_application: "600-00228",
  process_guidance: "process_guidance",
  interests_of_justice_prompts: "interests_of_justice_prompts"
};

/* ---- every component the manifest declares, and where it lands ------------- *
 *
 * The manifest is read at build time rather than restated here, and this table
 * says only which packet component carries each declared componentId. The build
 * refuses if the manifest's five ids are not exactly these five, and refuses if
 * any declared component neither reaches a page of the assembled packet nor
 * carries a componentRequirements disposition explaining why its condition is
 * not met. A component that stops reaching a page now stops the build.
 *
 * One row is not an identity: the manifest's component 1 has role
 * automatic_sealing_verification_guidance, and this packet's composed page is
 * named process_guidance in componentSet, in documentOfComponent, in the page
 * manifest and in the delivered page's own footer. The page discharges the role
 * -- it is where the three routes, including the one that files nothing, are
 * set out -- and the mapping is written down rather than left to be inferred.
 */
const MANIFEST_COMPONENT_DELIVERY = Object.freeze({
  "vt_seal_nonconviction-automatic-sealing-verification-guidance-1": {
    packetComponent: "process_guidance",
    note: "The composed process-guidance page carries this role. Its section 3, THE ROUTE THAT FILES NOTHING, is the automatic Sec. 7603(a)(1) route and how to verify it."
  },
  "vt_seal_nonconviction-petition-2": { packetComponent: "petition", note: "Form 200-00130." },
  "vt_seal_nonconviction-stipulation-and-proposed-order-3": { packetComponent: "stipulation_and_proposed_order", note: "Form 200-00132." },
  "vt_seal_nonconviction-interests-of-justice-prompts-4": {
    packetComponent: "interests_of_justice_prompts",
    note: "The composed prompts page. Its condition is met on this track, so it is rendered rather than dispositioned."
  },
  "vt_seal_nonconviction-fee-waiver-application-5": {
    packetComponent: "fee_waiver_application",
    note: "Form 600-00228, delivered unfilled; its condition is not met and componentRequirements says so."
  }
});

/* Every conditional component of this set, with its condition and whether the
 * condition is met on this track. The fee waiver's condition is not met and it
 * is delivered unfilled; the prompts component's condition IS met and it is
 * rendered. Both are here for the same reason: a conditional component has to
 * say which it is. */
const COMPONENT_REQUIREMENTS = Object.freeze({
  fee_waiver_application: FEE_WAIVER_COMPONENT_REQUIREMENT,
  interests_of_justice_prompts: IOJ_COMPONENT_REQUIREMENT
});

const PACKET_SET_MANIFEST = "data/record-clearing/legal-design-packet-set-manifests.json";

/**
 * Every component the packet-set manifest declares is rendered or dispositioned.
 *
 * Rendered means a page of THIS assembled fixture carries it. Dispositioned
 * means componentRequirements records the condition and records that it is not
 * met on this track. Anything else -- a component the manifest names that the
 * packet neither delivers nor accounts for -- fails the build, which is the
 * defect this function exists to make impossible to ship again.
 */
function assertEveryDeclaredComponentIsAccountedFor(familyId, pageManifest, componentRequirements, fixtureName) {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, PACKET_SET_MANIFEST), "utf8"));
  const set = (manifest.packetSets ?? []).find((row) => row.packetSetId === familyId);
  assert.ok(set, `${familyId}: no packet-set manifest entry to read the declared components from`);
  const declared = (set.components ?? []).map((c) => c.componentId);
  assert.deepEqual([...declared].sort(), Object.keys(MANIFEST_COMPONENT_DELIVERY).sort(),
    `${familyId}: the packet-set manifest declares components this build has no delivery for: ${JSON.stringify(declared)}`);
  const onAPage = new Set(pageManifest.map((p) => p.component));
  const accounted = [];
  for (const component of set.components ?? []) {
    const delivery = MANIFEST_COMPONENT_DELIVERY[component.componentId];
    assert.ok(COMPONENTS.includes(delivery.packetComponent),
      `${familyId} ${fixtureName}: ${component.componentId} is delivered as ${delivery.packetComponent}, which componentSet does not declare`);
    const rendered = onAPage.has(delivery.packetComponent);
    const disposition = componentRequirements[delivery.packetComponent] ?? null;
    const dispositioned = disposition !== null && disposition.conditionMetOnThisTrack === false;
    assert.ok(rendered || dispositioned,
      `${familyId} ${fixtureName}: ${component.componentId} (${component.requirement}) reaches no page and carries no componentRequirements disposition`);
    if (component.requirement === "required") {
      assert.ok(rendered, `${familyId} ${fixtureName}: ${component.componentId} is REQUIRED and reaches no page`);
    }
    accounted.push({
      componentId: component.componentId, role: component.role, requirement: component.requirement,
      conditionDescription: component.conditionDescription ?? null,
      packetComponent: delivery.packetComponent, note: delivery.note,
      pages: pageManifest.filter((p) => p.component === delivery.packetComponent).map((p) => p.packetPage),
      dispositionedInComponentRequirements: disposition !== null,
      conditionMetOnThisTrack: disposition ? disposition.conditionMetOnThisTrack : null
    });
  }
  return accounted;
}

const CONSENT_OPTIONS = ["YES", "NO"];
const YES_NO = ["Yes", "No"];
const CONSENT_INSTRUCTION = "Tick exactly one. The form asks whether you agree to receive the other parties' filings by email instead of by post. Only you can answer it, and the packet has written your email address on the line beneath the question, so if you tick YES that is the address the other parties will use.";
const FEE_WAIVER_BOX_INSTRUCTION = "Leave this blank. It belongs to the fee-waiver application, which is delivered blank in this packet and is used only if a court actually charges you a filing fee and you cannot pay it. No fee is charged on this track.";
const NON_CONVICTION_ENDING_INSTRUCTION = "Tick the one of the three that matches how your case actually ended -- and tick only one. The route has already stated that you were not convicted; which of the three Sec. 7603(a)(1) endings applies is a fact about your own case and the packet does not guess it.";
const CONVICTION_BRANCH_INSTRUCTION = "Leave this blank. It belongs to the conviction branch of question 2, and this packet is built for non-conviction sealing.";

const POLICY_200_00130 = {
  "Unit": { ...SUPPLY("the Superior Court unit (county) where the case was decided"), label: "Unit (Superior Court unit)" },
  "Docket Number": { ...WRITE("matter.case_number"), label: "Case No. (docket number)" },
  "Defendant": { ...WRITE("participant.full_legal_name"), label: "In RE: Defendant" },
  "DOB": { ...WRITE("participant.date_of_birth"), label: "DOB" },
  "1": { ...SUPPLY("the description of the first offence you are asking the court to seal"), label: "Description of Offense" },
  "2": { ...SUPPLY("the year of the first offence"), label: "Year" },
  "3": { ...SUPPLY("the docket number of the first offence, if it has one"), label: "Docket Number (If Any)" },
  "4": { ...SUPPLY("the description of a second offence from the same incident, if there is one"), label: "Description of Offense" },
  "5": { ...SUPPLY("the year of the second offence"), label: "Year" },
  "6": { ...SUPPLY("the docket number of the second offence"), label: "Docket Number (If Any)" },
  "7": { ...SUPPLY("the description of a third offence from the same incident, if there is one"), label: "Description of Offense" },
  "8": { ...SUPPLY("the year of the third offence"), label: "Year" },
  "9": { ...SUPPLY("the docket number of the third offence"), label: "Docket Number (If Any)" },
  "10": { ...ELECTION(), label: "I was convicted of the offenses." },
  "11": { ...SUPPLY("the date you were convicted, from your docket sheet or judgment order"), label: "a. Date of conviction:" },
  "12": { ...ELECTION(), label: "b. I completed all of the conditions of my probation:" },
  "13": { ...SUPPLY("the date you completed probation, if you were on probation"), label: "Yes – Date of Completion:" },
  "14": { ...ELECTION(), label: "No" },
  "15": { ...ELECTION(), label: "c. Any restitution ordered by the Court has been paid: Yes" },
  "16": { ...ELECTION(), label: "c. Any restitution ordered by the Court has been paid: No" },
  "17": { ...ELECTION(), label: "Restitution was not ordered" },
  "18": { ...ELECTION(), label: "I was not convicted for the offenses listed above." },
  "19": { ...ELECTION(), label: "I was cited or arrested, by (name of arresting law enforcement agency or department)" },
  "19a": { ...SUPPLY("the name of the law enforcement agency that cited or arrested you, if no charge was filed"), label: "name of arresting law enforcement agency or department" },
  "20": { ...ELECTION(), label: "A charge was filed, but the Court did not find probable cause." },
  "21": { ...ELECTION(), label: "A charge was filed and later dismissed by the Court." },
  "22": { ...SUPPLY("any new offence since the offence in question 1 — leave blank if there are none"), label: "Offense (new charges since)" },
  "23": { ...SUPPLY("the date of that new offence"), label: "Date of Offense (new charges since)" },
  "24": { ...SUPPLY("the date that new charge was brought"), label: "Date of Charge (new charges since)" },
  "25": { ...SUPPLY("the date of conviction on that new charge, if there was one"), label: "Date of Conviction (new charges since)" },
  "28": { ...SUPPLY("the date that second new charge was brought"), label: "Date of Charge (new charges since)" },
  "29": { ...SUPPLY("the date of conviction on that second new charge"), label: "Date of Conviction (new charges since)" },
  "32": { ...SUPPLY("the date that third new charge was brought"), label: "Date of Charge (new charges since)" },
  "33": { ...SUPPLY("the date of conviction on that third new charge"), label: "Date of Conviction (new charges since)" },
  "36": { ...SUPPLY("your own statement of why sealing is in the interests of justice — this is yours to write and the platform never writes it for you"), label: "4. I believe that sealing of my criminal history is in the interests of justice because:" },
  "36a": { ...ELECTION(), label: "I consent to receive documents from the other parties at the email provided below:", option: "YES", options: CONSENT_OPTIONS, instruction: CONSENT_INSTRUCTION },
  "36b": { ...ELECTION(), label: "I consent to receive documents from the other parties at the email provided below:", option: "NO", options: CONSENT_OPTIONS, instruction: CONSENT_INSTRUCTION },
  "37": { ...PROTECT(SIGNATURE), label: "Date of Signature" },
  "37a": { ...PROTECT(SIGNATURE), label: "Signature of Defendant" },
  "38": { ...WRITE("participant.full_legal_name"), label: "Printed Name of Defendant" },
  "39": { ...WRITE("participant.street_address"), label: "Address" },
  "40": { ...WRITE("participant.city_state_zip"), label: "City, State, Zip" },
  "41": { ...WRITE("participant.phone"), label: "Phone" },
  "42": { ...WRITE("participant.email"), label: "Email Address" },
};
const POLICY_200_00132 = {
  "Unit": { ...SUPPLY("the Superior Court unit (county) where the case was decided"), label: "Unit (Superior Court unit)" },
  "Docket Number": { ...WRITE("matter.case_number"), label: "Case No. (docket number)" },
  "Defendant": { ...WRITE("participant.full_legal_name"), label: "In RE: Defendant" },
  "DOB": { ...WRITE("participant.date_of_birth"), label: "DOB:" },
  "22": { ...SUPPLY("the description of the first offence, exactly as on the petition"), label: "Description of Offense" },
  "23": { ...SUPPLY("the date of the first offence"), label: "Date of Offense" },
  "24": { ...SUPPLY("the incident number for the first offence, if the record shows one"), label: "Incident Number" },
  "25": { ...SUPPLY("the docket number of the first offence, if it has one"), label: "Docket Number (if any)" },
  "26": { ...SUPPLY("the description of a second offence from the same incident, if there is one"), label: "Description of Offense" },
  "27": { ...SUPPLY("the date of the second offence"), label: "Date of Offense" },
  "28": { ...SUPPLY("the incident number for the second offence"), label: "Incident Number" },
  "29": { ...SUPPLY("the docket number of the second offence"), label: "Docket Number (if any)" },
  "30": { ...SUPPLY("the description of a third offence from the same incident, if there is one"), label: "Description of Offense" },
  "31": { ...SUPPLY("the date of the third offence"), label: "Date of Offense" },
  "32": { ...SUPPLY("the incident number for the third offence"), label: "Incident Number" },
  "33": { ...SUPPLY("the docket number of the third offence"), label: "Docket Number (if any)" },
  "34": { ...SUPPLY("the name of any other state agency the court should notify, if you know of one"), label: "State Agency (other state entities to notify)" },
  "34a": { ...SUPPLY("that agency's address"), label: "Address (other state entities to notify)" },
  "35": { ...SUPPLY("a second agency the court should notify, if there is one"), label: "State Agency (other state entities to notify)" },
  "36": { ...SUPPLY("that second agency's address"), label: "Address (other state entities to notify)" },
  "check box 1": { ...ELECTION(), label: "I consent to receive documents from the other parties at the email provided below:", option: "YES", options: CONSENT_OPTIONS, instruction: CONSENT_INSTRUCTION },
  "chec box 2": { ...ELECTION(), label: "I consent to receive documents from the other parties at the email provided below:", option: "NO", options: CONSENT_OPTIONS, instruction: CONSENT_INSTRUCTION },
  "34b": { ...PROTECT(SIGNATURE), label: "Defendant: Date of Signature" },
  "34c": { ...PROTECT(SIGNATURE), label: "Defendant: Signature" },
  "34d": { ...WRITE("participant.full_legal_name"), label: "Printed Name" },
  "34e": { ...WRITE("participant.street_address"), label: "Mailing Address" },
  "34f": { ...WRITE("participant.city_state_zip"), label: "Mailing Address — City, State, Zip" },
  "34g": { ...SUPPLY("a third mailing-address line, only if your address needs one"), label: "Mailing Address (third line)" },
  "34h": { ...WRITE("participant.phone"), label: "Phone Number" },
  "34i": { ...WRITE("participant.email"), label: "Email Address" },
  "34j": { ...PROTECT(COURT_OWNED), label: "State’s Attorney: Date of Signature" },
  "34k": { ...PROTECT(COURT_OWNED), label: "State’s Attorney: Signature" },
  "34l": { ...PROTECT(COURT_OWNED), label: "State’s Attorney: Printed Name" },
};
const POLICY_600_00228 = {
  "Division": { ...SUPPLY("the Superior Court division your case is in"), label: "SUPERIOR COURT DIVISION" },
  "Unit": { ...SUPPLY("the Superior Court unit (county) where the case was decided"), label: "Unit (Superior Court unit)" },
  "Docket Number": { ...SUPPLY("your docket number, and only if you end up needing this form at all"), label: "Case No. (docket number)" },
  "Case Name": { ...SUPPLY("the case name, and only if you end up needing this form at all"), label: "Case Name" },
  "3": { ...SUPPLY("your name, and only if you end up needing this form at all"), label: "Name: (First & Last)" },
  "2": { ...SUPPLY("your street address, and only if you end up needing this form at all"), label: "Street Address:" },
  "4": { ...SUPPLY("your city, state and zip, and only if you end up needing this form at all"), label: "City/State/Zip:" },
  "5": { ...SUPPLY("a mailing address, only if it is different from your street address"), label: "Mailing Address: (if different from street address)" },
  "5a": { ...SUPPLY("your email address, and only if you end up needing this form at all"), label: "Email Address:" },
  "6": { ...SUPPLY("your home or cell phone number, and only if you end up needing this form at all"), label: "Home / Cell Phone:" },
  "7": { ...SUPPLY("your work phone number, if you have one"), label: "Work Phone:" },
  "8": { ...SUPPLY("how many people live in your household, counting a spouse or partner and any dependants"), label: "Total Number Living in Household (spouse, partner & dependents)" },
  "15": { ...ELECTION(), label: "Are you employed?", option: "Yes", options: YES_NO, instruction: FEE_WAIVER_BOX_INSTRUCTION },
  "16": { ...ELECTION(), label: "Are you employed?", option: "No", options: YES_NO, instruction: FEE_WAIVER_BOX_INSTRUCTION },
  "17": { ...SUPPLY("your employer's name, if you are employed"), label: "Employer Name" },
  "18": { ...SUPPLY("your employer's address"), label: "Employer Address" },
  "19": { ...SUPPLY("a second employer's name, if you have one"), label: "Employer Name" },
  "20": { ...SUPPLY("that second employer's address"), label: "Employer Address" },
  "21": { ...ELECTION(), label: "Do you receive any kind of government benefit that is based on need, dependent children, or other income sensitive criteria?", option: "Yes", options: YES_NO, instruction: FEE_WAIVER_BOX_INSTRUCTION },
  "22": { ...ELECTION(), label: "Do you receive any kind of government benefit that is based on need, dependent children, or other income sensitive criteria?", option: "No", options: YES_NO, instruction: FEE_WAIVER_BOX_INSTRUCTION },
  "23": { ...SUPPLY("the type of public assistance you receive, if you receive any"), label: "Type of Assistance:" },
  "24": { ...SUPPLY("the monthly amount of that public assistance"), label: "Monthly Amount $" },
  "27": { ...SUPPLY("your gross monthly income from wages"), label: "Gross Income from Wages" },
  "29": { ...SUPPLY("your monthly unemployment compensation, if any"), label: "Unemployment Compensation" },
  "31": { ...SUPPLY("child support you receive each month, if any"), label: "Child Support (income received)" },
  "33": { ...SUPPLY("any other monthly income"), label: "Other Income" },
  "35": { ...SUPPLY("your monthly self-employment or business income, if any"), label: "Self-Employment/Business Income (other than wages)" },
  "MonthlyTotal": { ...SUPPLY("your total monthly income"), label: "Total Monthly Income" },
  "41": { ...SUPPLY("your total income over the past twelve months"), label: "Total Income in the past 12 months" },
  "45": { ...SUPPLY("your monthly rent or mortgage payment"), label: "Rent or Mortgage Payment" },
  "46": { ...SUPPLY("your monthly electricity bill"), label: "Electric Service" },
  "47": { ...SUPPLY("your monthly phone bill"), label: "Phone (monthly expense)" },
  "48": { ...SUPPLY("your monthly fuel, heating or gas cost"), label: "Fuel (heat and/or gas)" },
  "49": { ...SUPPLY("your monthly food cost"), label: "Food" },
  "50": { ...SUPPLY("the household expense on this line of the form"), label: "the unlabelled expense line printed left of Clothing" },
  "51": { ...SUPPLY("your monthly clothing cost"), label: "Clothing" },
  "52": { ...SUPPLY("your monthly medical cost"), label: "Medical" },
  "53": { ...SUPPLY("child support you pay each month, if any"), label: "Child Support (monthly expense)" },
  "54": { ...SUPPLY("your monthly car loan payment, if any"), label: "Auto Loan Payment" },
  "55": { ...SUPPLY("your monthly property tax, if you pay it"), label: "Property Taxes" },
  "56": { ...SUPPLY("your monthly insurance cost"), label: "Insurance (health, auto, etc.)" },
  "57": { ...SUPPLY("any other monthly expense"), label: "Other Expenses" },
  "72": { ...ELECTION(), label: "I have additional assets:", option: "Yes", options: YES_NO, instruction: FEE_WAIVER_BOX_INSTRUCTION },
  "73": { ...ELECTION(), label: "I have additional assets:", option: "No", options: YES_NO, instruction: FEE_WAIVER_BOX_INSTRUCTION },
  "74": { ...SUPPLY("the make and model of a vehicle you own, if you own one"), label: "Vehicles Make, Model" },
  "75": { ...SUPPLY("that vehicle's year and fair market value"), label: "Vehicle Year / Fair Market Value" },
  "76": { ...SUPPLY("how much you still owe on that vehicle"), label: "Vehicle Amount Owed" },
  "77": { ...SUPPLY("that vehicle's net value"), label: "Vehicle Net Value" },
  "78": { ...SUPPLY("a second vehicle's make and model, if you own one"), label: "Vehicles Make, Model" },
  "79": { ...SUPPLY("that second vehicle's year and fair market value"), label: "Vehicle Year / Fair Market Value" },
  "80": { ...SUPPLY("how much you still owe on that second vehicle"), label: "Vehicle Amount Owed" },
  "81": { ...SUPPLY("that second vehicle's net value"), label: "Vehicle Net Value" },
  "82": { ...SUPPLY("a third vehicle's make and model, if you own one"), label: "Vehicles Make, Model" },
  "83": { ...SUPPLY("that third vehicle's year and fair market value"), label: "Vehicle Year / Fair Market Value" },
  "84": { ...SUPPLY("how much you still owe on that third vehicle"), label: "Vehicle Amount Owed" },
  "85": { ...SUPPLY("that third vehicle's net value"), label: "Vehicle Net Value" },
  "86": { ...SUPPLY("a fourth vehicle's make and model, if you own one"), label: "Vehicles Make, Model" },
  "87": { ...SUPPLY("that fourth vehicle's year and fair market value"), label: "Vehicle Year / Fair Market Value" },
  "88": { ...SUPPLY("how much you still owe on that fourth vehicle"), label: "Vehicle Amount Owed" },
  "89": { ...SUPPLY("that fourth vehicle's net value"), label: "Vehicle Net Value" },
  "90": { ...SUPPLY("a description of real property you own, if you own any"), label: "Real Property Description" },
  "91": { ...SUPPLY("that property's fair market value"), label: "Real Property FMV" },
  "92": { ...SUPPLY("the mortgage on that property"), label: "Real Property Mortgage" },
  "93": { ...SUPPLY("that property's net value"), label: "Real Property Net Value" },
  "94": { ...SUPPLY("a second property's description, if you own one"), label: "Real Property Description" },
  "95": { ...SUPPLY("that second property's fair market value"), label: "Real Property FMV" },
  "96": { ...SUPPLY("the mortgage on that second property"), label: "Real Property Mortgage" },
  "97": { ...SUPPLY("that second property's net value"), label: "Real Property Net Value" },
  "98": { ...SUPPLY("how much cash you have on hand"), label: "Cash on Hand" },
  "99": { ...SUPPLY("the balance of your checking account"), label: "Checking Account" },
  "100": { ...SUPPLY("the balance of your savings accounts"), label: "Savings Accounts" },
  "101": { ...SUPPLY("your total cash assets"), label: "Total Cash Assets" },
  "102": { ...SUPPLY("a description of any other asset — tools, equipment, stocks and so on"), label: "Other Assets Description" },
  "103": { ...SUPPLY("that asset's fair market value"), label: "Other Assets FMV" },
  "104": { ...SUPPLY("a second other asset, if you have one"), label: "Other Assets Description" },
  "105": { ...SUPPLY("that second asset's fair market value"), label: "Other Assets FMV" },
  "113": { ...SUPPLY("anything else you want the court to know about why you cannot afford the fees — this is yours to write"), label: "These are additional reasons why I cannot afford the fees:" },
  "115": { ...PROTECT(SIGNATURE), label: "Date" },
  "116": { ...PROTECT(SIGNATURE), label: "Applicant Signature" },
  "117": { ...SUPPLY("your printed name, and only if you end up needing this form at all"), label: "Printed Name" },
};

/* ------------------------------------------------------------------ *
 * The route's own determination on question 2 of the petition.
 *
 * This family is non-conviction sealing, so the packet states that rather than
 * asking it, and refuses the conviction block beneath it. What ENDED the case
 * without a conviction -- never charged, no probable cause, or dismissed -- is
 * three different things that happened to a participant's own case, and all
 * three boxes stay theirs.
 * ------------------------------------------------------------------ */
/* Four names carry two boxes each on 200-00130: a new-charge row on page 1 and a
 * state-agency row on page 2. Addressed by coordinate, because the name alone
 * cannot tell a charge from an agency. */
POLICY_200_00130["26@p1y127"] = { ...SUPPLY("a second new offence since the offence in question 1, if there is one"), label: "Offense (new charges since)" };
POLICY_200_00130["27@p1y127"] = { ...SUPPLY("the date of that second new offence"), label: "Date of Offense (new charges since)" };
POLICY_200_00130["30@p1y112"] = { ...SUPPLY("a third new offence, if there is one"), label: "Offense (new charges since)" };
POLICY_200_00130["31@p1y112"] = { ...SUPPLY("the date of that third new offence"), label: "Date of Offense (new charges since)" };
POLICY_200_00130["26@p2y566"] = { ...SUPPLY("the name of any other state agency the court should notify, if you know of one"), label: "State Agency (other state entities to notify)" };
POLICY_200_00130["27@p2y564"] = { ...SUPPLY("that agency's address"), label: "Address (other state entities to notify)" };
POLICY_200_00130["30@p2y549"] = { ...SUPPLY("a second agency the court should notify, if there is one"), label: "State Agency (other state entities to notify)" };
POLICY_200_00130["31@p2y548"] = { ...SUPPLY("that second agency's address"), label: "Address (other state entities to notify)" };

const NOT_A_CONVICTION = "this packet is built for non-conviction sealing under 13 V.S.A. Sec. 7603, so the petition states that the petitioner was not convicted";
POLICY_200_00130["18"] = {
  ...SELECT(NOT_A_CONVICTION),
  label: "I was not convicted for the offenses listed above.",
  instruction: "The packet has already marked this box for you. It is the one answer on question 2 that the route decides, because this packet exists only for records that did not end in a conviction. Leave the mark as it is."
};
const CONVICTION_BRANCH = "this packet is built for non-conviction sealing, and the conviction block of question 2 belongs to the conviction routes";
for (const [key, label, option] of [
  ["10", "I was convicted of the offenses.", null],
  ["11", "a. Date of conviction:", null],
  ["12", "b. I completed all of the conditions of my probation:", "Yes"],
  ["13", "Yes - Date of Completion of probation", null],
  ["14", "b. I completed all of the conditions of my probation:", "No"],
  ["15", "c. Any restitution ordered by the Court has been paid:", "Yes"],
  ["16", "c. Any restitution ordered by the Court has been paid:", "No"],
  ["17", "Restitution was not ordered", null]
]) {
  POLICY_200_00130[key] = {
    ...OFFROUTE(CONVICTION_BRANCH), label,
    ...(option ? { option, options: YES_NO } : {}),
    instruction: CONVICTION_BRANCH_INSTRUCTION
  };
}
for (const key of ["19", "20", "21"]) {
  POLICY_200_00130[key] = { ...POLICY_200_00130[key], instruction: NON_CONVICTION_ENDING_INSTRUCTION };
}

const FORMS = {
  "200-00130": { title: "Petition to Seal Criminal History", component: "petition", policy: POLICY_200_00130 },
  "200-00132": { title: "Stipulation to Seal Criminal History Record + Order", component: "stipulation_and_proposed_order", policy: POLICY_200_00132 },
  "600-00228": { title: "Application to Waive Filing Fees and Service Costs", component: "fee_waiver_application", policy: POLICY_600_00228 }
};
const ORDER = ["200-00130", "200-00132", "600-00228"];

const ROUTE_KEYS = Object.freeze([
  "obligation:unit:VT:vt_seal_nonconviction:vt-nonconviction-automatic-and-verification",
  "obligation:unit:VT:vt_seal_nonconviction:vt-nonconviction-ordinary-petition",
  "obligation:unit:VT:vt_seal_nonconviction:vt-nonconviction-stipulated-petition"
]);

export const FAMILY_CONFIGS = Object.freeze({
  "vt_seal_nonconviction-set": {
    jurisdiction: "VT",
    routeKey: ROUTE_KEYS[0],
    routeKeys: ROUTE_KEYS,
    documentRouteKeys: {
      "200-00130": [ROUTE_KEYS[1]],
      "200-00132": [ROUTE_KEYS[2]],
      "600-00228": [ROUTE_KEYS[1], ROUTE_KEYS[2]],
      process_guidance: [ROUTE_KEYS[0]],
      // The prompts page belongs to the Sec. 7603(g) ordinary petition route and
      // to no other: that is the route its manifest condition names, and the one
      // where the burden is affirmative on the petitioner. No route key is added
      // here; this is an existing key of this family being assigned a document.
      interests_of_justice_prompts: [ROUTE_KEYS[1]]
    },
    // The committed track registry entry this route's self-help stop conditions
    // are read from at build time. Naming the track rather than carrying the
    // conditions keeps them out of an editor's hands.
    trackId: "vt_seal_nonconviction",
    routeSelectionId: "vt-seal-nonconviction-200-00130-complete-set",
    legalName: "Petition to Seal a Non-Conviction Record, 13 V.S.A. Sec. 7603",
    routeName: "sealing a record that did not end in a conviction",
    statute: "13 V.S.A. Sec. 7603",
    documents: ORDER,
    routes: [
      { id: "contested_petition", label: "an ordinary contested petition at any time", authority: "13 V.S.A. Sec. 7603(g)", carriedBy: "200-00130" },
      { id: "stipulated_sealing", label: "a stipulated sealing at any time", authority: "13 V.S.A. Sec. 7603(a)(2)", carriedBy: "200-00132" },
      { id: "no_filing_process_guidance", label: "no filing - process guidance", authority: null, carriedBy: "process_guidance" }
    ]
  }
});

function assertCommittedRouteKeys(familyId, config) {
  const outDir = `${OVERLAY_ROOT}/${familyId.replace(/_/g, "-")}--official-pdf-fill`;
  const wiringPath = path.join(ROOT, outDir, "product-wiring.json");
  assert.ok(fs.existsSync(wiringPath), `${familyId}: committed product-wiring.json is missing`);
  const wiring = JSON.parse(fs.readFileSync(wiringPath, "utf8"));
  assert.deepEqual(wiring.routeKeys, config.routeKeys,
    `${familyId}: builder route keys must exactly match committed product wiring`);
  assert.equal(wiring.routeKey, config.routeKey,
    `${familyId}: primary builder route key must exactly match committed product wiring`);

  const census = JSON.parse(fs.readFileSync(path.join(ROOT, ROUTE_CENSUS), "utf8"));
  const censusKeys = new Set((census.routes ?? []).map((row) => row.routeKey));
  for (const routeKey of config.routeKeys) {
    assert.ok(censusKeys.has(routeKey), `${familyId}: route key is absent from the committed census: ${routeKey}`);
  }
}

function documentPolicy(config, documentId) {
  const routeKeys = config.documentRouteKeys[documentId];
  assert.ok(Array.isArray(routeKeys) && routeKeys.length > 0,
    `${documentId}: no committed census/product-wiring route key assigned`);
  for (const routeKey of routeKeys) {
    assert.ok(config.routeKeys.includes(routeKey), `${documentId}: document policy carries an unknown route key ${routeKey}`);
  }
  return {
    mode: "participant", captionOnly: false, documentAcceptsFill: true,
    routeKey: routeKeys[0], routeKeys
  };
}

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.street_address": "42 Maple Street",
    "participant.city_state_zip": "Burlington, VT 05401",
    "participant.phone": "802-555-0142",
    "participant.email": "jordan.reyes@example.org",
    "matter.case_number": "123-4-21 Cncr"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B",
    "participant.city_state_zip": "South Burlington, Vermont 05403-2214",
    "participant.phone": "(802) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org",
    "matter.case_number": "1276-11-24 Frcr"
  }
};

/* ---- source binding ------------------------------------------------------ */
function resolveSources(familyId) {
  const config = FAMILY_CONFIGS[familyId];
  assert.ok(config, `unknown family ${familyId}`);
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const raw = index.entries ?? index.files ?? index;
  const rows = Array.isArray(raw) ? raw : Object.values(raw);
  const root = corpusRoot();
  const resolved = []; const failures = [];
  for (const formNumber of config.documents) {
    // The form-number token is delimited on both sides, so 200-00132A cannot
    // match the 200-00132A binary and 200-00130 cannot match 200-00130A.
    const entry = rows.find((e) => String(e.path ?? e.relativePath ?? "").includes(`__${formNumber}__`)
      && String(e.path ?? e.relativePath ?? "").startsWith("STATES/VT/"));
    if (!entry) { failures.push({ sourceIdentity: `official-form:${formNumber}`, why: "no entry for this form number in the committed corpus index" }); continue; }
    const rel = entry.path ?? entry.relativePath;
    const abs = path.resolve(ROOT, root, rel);
    if (!fs.existsSync(abs)) { failures.push({ sourceIdentity: `official-form:${formNumber}`, why: `the indexed path does not exist on disk: ${rel}` }); continue; }
    const bytes = fs.readFileSync(abs);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    const indexed = String(entry.sha256 ?? entry.sha ?? "");
    if (indexed && indexed !== sha256) { failures.push({ sourceIdentity: `official-form:${formNumber}`, why: `SHA-256 drift: the committed index says ${indexed}, the corpus binary hashes ${sha256}` }); continue; }
    resolved.push({
      formNumber, sourceId: `official-form:${formNumber}`, pathInArchive: rel,
      revision: /__REV-([0-9A-Za-z-]+)__/.exec(rel)?.[1] ?? null,
      sha256, byteLength: bytes.length, bytes
    });
  }
  return { resolved, failures };
}

function normalizeRect(r) {
  const x = Math.min(r.x, r.x + r.width);
  const y = Math.min(r.y, r.y + r.height);
  return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)), width: Number(Math.abs(r.width).toFixed(2)), height: Number(Math.abs(r.height).toFixed(2)) };
}

/* ---- census, with the caption read off the page --------------------------- */
async function censusOf(source) {
  const spec = FORMS[source.formNumber];
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  const pageText = pages.map((p, i) => ({
    page: i + 1,
    lines: groupIntoLines(extractTextItems(p)).map((l) => ({ y: Math.round(l.y), text: String(l.text ?? "").trim(), chars: l.chars ?? [] })).filter((l) => l.text)
  }));

  // How many boxes each name carries, so a name that carries one keeps its own
  // name as its key and a name that carries several is addressed by coordinate.
  const counts = new Map();
  for (const f of doc.getForm().getFields()) counts.set(f.getName(), f.acroField.getWidgets().length);

  const rows = []; const unmapped = []; const used = new Set();
  for (const field of doc.getForm().getFields()) {
    const name = field.getName();
    const pdfClass = field.constructor.name;
    for (const w of field.acroField.getWidgets()) {
      const rect = normalizeRect(w.getRectangle());
      const ref = w.P();
      let pi = pages.findIndex((p) => p.ref === ref); if (pi < 0) pi = 0;
      const page = pi + 1;
      const key = counts.get(name) > 1 ? `${name}@p${page}y${Math.round(rect.y)}` : name;
      /*
       * A name that carries several boxes is addressed ONLY by coordinate. The
       * base-name fallback is right for a name that carries one box and wrong
       * for one that carries several: on 200-00130 the names 26, 27, 30 and 31
       * are a new-charge row near the top of page 2 AND a state-agency row two
       * thirds of the way down it, and a fallback would have given the agency
       * rows the new-charge wording without anything failing.
       */
      const entry = counts.get(name) > 1 ? spec.policy[key] : (spec.policy[key] ?? spec.policy[name]);
      if (!entry) { unmapped.push({ key, field: name, page, rect, why: "no policy entry for this widget" }); continue; }
      used.add(spec.policy[key] ? key : name);
      /*
       * The caption: the printed line whose baseline is nearest this widget's
       * own, on this widget's own page. These forms label a blank above it, on
       * it, or under it depending on the block, so nearest-by-distance is the
       * only rule that reads all three the same way.
       */
      const lines = pageText.find((p) => p.page === page)?.lines ?? [];
      const nearest = [...lines].sort((a, b) => Math.abs(a.y - rect.y) - Math.abs(b.y - rect.y))[0] ?? null;
      /*
       * The caption printed beside the widget, with the form's own checkbox
       * glyphs taken out of it, and -- where the box shares a line with its
       * opposite -- the one word on that line that belongs to THIS box, located
       * against the pinned binary rather than transcribed.
       */
      const caption = nearest ? printedCaption(nearest.text) : null;
      const where = `${source.formNumber} ${key} p${page}`;
      const optionProof = entry.option
        ? optionWordBesideBox(nearest, rect, entry.options ?? [entry.option], entry.option, where)
        : null;
      const boxCaption = optionProof ? optionProof.word : caption;
      const effectiveLabel = entry.label
        ? (entry.option ? `${entry.label} ${entry.option}` : entry.label)
        : (caption ?? key);
      rows.push({
        key, name, page, rect,
        type: pdfClass.replace("PDF", "").toLowerCase().replace("textfield", "text"),
        rectBasis: "acroform_widget_rect_read_first_hand_from_pinned_binary_and_normalized",
        caption,
        printedCaptionForThisBox: boxCaption,
        optionProof,
        captionAt: nearest ? { page, y: nearest.y, basis: "nearest printed line to this widget's own baseline, read from the pinned binary at build time, with the form's own checkbox glyphs removed" } : null,
        effectiveLabel,
        regionHeading: effectiveLabel,
        policy: entry.policy, fact: entry.fact ?? null,
        routeReason: entry.routeReason ?? null,
        participantInstruction: entry.instruction ?? null,
        refusalClass: entry.refusalClass ?? null, what: entry.what ?? null,
        isSelectionControl: pdfClass === "PDFCheckBox",
        multiline: typeof field.isMultiline === "function" ? field.isMultiline() : false,
        maxLength: typeof field.getMaxLength === "function" ? (field.getMaxLength() ?? null) : null
      });
    }
  }
  const missingKeys = Object.keys(spec.policy).filter((k) => !used.has(k));
  const uncaptioned = rows.filter((r) => !r.caption).map((r) => ({ key: r.key, page: r.page }));
  return { rows, unmapped, missingKeys, uncaptioned, pageText };
}


/* ---- the route's own election, marked on the court's own box -------------- *
 *
 * finalizeOfficialForm refuses a checkbox by type, which is right for a fact map
 * and wrong for a route election: the packet is built for one statutory route
 * and the form asks which one, so the answer is a property of the packet. The
 * mark is two diagonals struck strictly inside the box the court already
 * printed. No box is drawn, thickened or moved.
 */
async function markRouteSelections(flattenedBytes, selections) {
  if (selections.length === 0) return { bytes: flattenedBytes, marks: [] };
  const pdf = await PDFDocument.load(flattenedBytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = pdf.getPages();
  const marks = [];
  for (const sel of selections) {
    const page = pages[sel.page - 1];
    assert.ok(page, `route selection ${sel.key} names page ${sel.page}, which is not in the document`);
    const { x, y, width, height } = sel.rect;
    const inset = SELECTION_INSET;
    assert.ok(width > inset * 2 + 1 && height > inset * 2 + 1,
      `route selection ${sel.key} is ${width}x${height}pt, too small to mark inside the court's own stroke`);
    const a = { x: x + inset, y: y + inset };
    const b = { x: x + width - inset, y: y + height - inset };
    page.drawLine({ start: a, end: b, thickness: SELECTION_LINE_WIDTH, color: PARTICIPANT_INK });
    page.drawLine({ start: { x: a.x, y: b.y }, end: { x: b.x, y: a.y }, thickness: SELECTION_LINE_WIDTH, color: PARTICIPANT_INK });
    marks.push({ key: sel.key, page: sel.page, box: { x0: x, y0: y, x1: x + width, y1: y + height }, inset,
      lineWidth: SELECTION_LINE_WIDTH, mark: "two_diagonal_strokes_inset", drewANewBox: false, redrewTheCourtsBox: false, routeReason: sel.routeReason });
  }
  return { bytes: Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false })), marks };
}

async function paintedPaths(bytes) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  return pdf.getPages().flatMap((page, index) => extractPageGeometry(page).paths
    .filter((row) => /^(S|s|f|F|f\*|B|B\*|b|b\*)$/.test(String(row.paintedBy ?? "")))
    .map((row) => ({ page: index + 1, operator: row.operator, paintedBy: row.paintedBy,
      x: +row.x.toFixed(3), y: +row.y.toFixed(3), width: +row.width.toFixed(3), height: +row.height.toFixed(3) })));
}

async function addedPaintedPaths(beforeBytes, afterBytes) {
  const before = await paintedPaths(beforeBytes);
  const after = await paintedPaths(afterBytes);
  const key = (r) => [r.page, r.operator, r.paintedBy, r.x, r.y, r.width, r.height].join("|");
  const counts = new Map();
  for (const r of before) counts.set(key(r), (counts.get(key(r)) ?? 0) + 1);
  return after.filter((r) => {
    const remaining = counts.get(key(r)) ?? 0;
    if (remaining <= 0) return true;
    counts.set(key(r), remaining - 1);
    return false;
  });
}

function pathInsideBox(row, box) {
  const pad = 0.75;
  return row.x >= box.x0 - pad && row.x + Math.abs(row.width) <= box.x1 + pad
    && row.y >= box.y0 - pad && row.y + Math.abs(row.height) <= box.y1 + pad;
}

/* ---- render one official form -------------------------------------------- */
async function renderDocument(source, census, fixtureName) {
  const facts = FIXTURES[fixtureName];
  const byName = new Map();
  for (const r of census.rows) {
    const existing = byName.get(r.name);
    if (!existing) { byName.set(r.name, r); continue; }
    assert.ok(!(existing.policy === "write" || r.policy === "write"),
      `widget name ${r.name} carries several boxes and one of them is a write; a name-keyed fill cannot address them separately`);
  }
  const unique = [...byName.values()];
  const writable = unique.filter((r) => r.policy === "write");
  const explicitMappings = Object.fromEntries(writable.map((r) => [r.name, r.fact]));
  const unwritableFields = unique.filter((r) => r.policy !== "write").map((r) => ({ field: r.name }));
  const { bytes, report } = await finalizeOfficialForm({
    sourceBytes: source.bytes, expectedSha256: source.sha256,
    census: unique.map((r) => ({
      name: r.name, type: r.type, effectiveLabel: r.effectiveLabel, regionHeading: r.regionHeading,
      widgets: [{ page: r.page, rect: r.rect }], multiline: r.multiline === true, maxLength: r.maxLength ?? null
    })),
    facts, explicitMappings, unwritableFields,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    evaluateDeclaredMinimumSize: true,
    alignWidgetFontSizeToFit: true,
    /* FIX50. Both 200-00130 and 200-00132 ship every check box at /AS /Off with
     * /Yes as the only state in /AP /N. The shared sanitizer runs
     * updateFieldAppearances() before flatten, pdf-lib regenerates an
     * appearance for exactly that condition, and its default provider paints a
     * stroked 14.4pt square -- so all 14 unticked boxes on the petition and the
     * stipulation were delivered inside a square the court's paper does not
     * print and no conforming viewer paints (ISO 32000-1 12.5.5). VF02 proved
     * the square came from this step and not from this family, by rebuilding
     * the pinned 200-00130 through the same sanitizer with no writes at all and
     * finding the squares pixel-identical in the zero-write baseline.
     *
     * Opting in supplies the missing /Off state as an EMPTY appearance instead,
     * so nothing is synthesized and nothing is flattened there. 600-00228 ships
     * its own /Off appearance and is untouched by this: its six boxes are the
     * court's own and stay, which is what RI-OFF-APPEARANCE settles. */
    suppressSynthesizedAppearances: true,
    title: FORMS[source.formNumber].title
  });
  if (process.env.VT_DEBUG_RENDER) {
    console.log(`-- ${source.formNumber} ${fixtureName}: written=${report.written.length} refused=${report.refused.length}`);
    const wanted = new Set(writable.map((r) => r.name));
    for (const r of report.refused) if (wanted.has(r.field)) console.log(`   REFUSED A WRITE ${r.field}: ${r.reason}`);
  }
  return { bytes, report };
}

async function byteProof(source, census, file, report, fixtureName) {
  const widgets = await flattenedWidgets(file);
  const written = new Map(report.written.map((w) => [w.field, w]));
  const actualWrites = [];
  for (const r of census.rows) {
    const w = written.get(r.name);
    if (!w || r.policy !== "write") continue;
    const drawn = drawnAt(widgets, { page: r.page, rect: r.rect });
    actualWrites.push({
      field: r.key, widgetName: r.name, factId: w.factId ?? r.fact, page: r.page, rect: r.rect,
      printedCaption: r.caption, drawnText: drawn.map((d) => d.text).filter(Boolean),
      expected: FIXTURES[fixtureName][r.fact] ?? null
    });
  }
  const measured = census.rows.map((r) => ({ page: r.page, rect: r.rect }));
  let outside = 0;
  for (const w of widgets) {
    const at = measured.some((m) => m.page === w.page && Math.abs(w.x - m.rect.x) <= 2 && Math.abs(w.y - m.rect.y) <= 2);
    if (!at) outside += String(w.text ?? "").replace(/\s+/g, "").length;
  }
  return { actualWrites, appearances: widgets.length, outside };
}

/* ---- the composed instructions component ---------------------------------- */
function composedBody(config, facts, resolved) {
  const L = [];
  L.push("PROCESS GUIDANCE, INCLUDING THE ROUTE THAT FILES NOTHING", "");
  L.push(`Petitioner: ${facts["participant.full_legal_name"]}`);
  L.push(`Case No.: ${facts["matter.case_number"]}`);
  L.push(`Route: ${config.legalName}`, "");
  L.push("THREE ROUTES, AND THIS PACKET CARRIES ALL THREE", "");
  for (const r of config.routes) {
    L.push(`- ${r.label}${r.authority ? ` (${r.authority})` : ""}: ${r.carriedBy === "process_guidance" ? "this page" : `Form ${r.carriedBy}`}.`);
  }
  L.push("");
  L.push("1. THE CONTESTED PETITION", "");
  L.push("File the petition (200-00130) with the Vermont Superior Court, Criminal Division, in the unit where your case was decided. The State's Attorney may oppose it and the court may set a hearing. This is the route that does not need anybody's agreement.", "");
  L.push("2. THE STIPULATED SEALING", "");
  L.push("If the prosecuting office will agree, sign the stipulation (200-00132) and take or send it to that office. The participant does not file the stipulation: the prosecutor signs and files it with the court. The court may then seal the record on that agreement.", "");
  L.push("If the State's Attorney will not sign, that is not the end of it. File the petition on its own and ask the court to set a hearing. The two routes use the same underlying facts and this packet prepares both.", "");
  L.push("3. THE ROUTE THAT FILES NOTHING", "");
  L.push("Some non-conviction records are cleared without a petition at all, and a packet that only ever told you to file would be telling you to do work you may not need to do. Before you file, ask the clerk of the unit above whether the record you are asking about has already been sealed, or is due to be, without a filing. If it has, nothing in this packet needs to be filed.", "");
  /* FIX43. This sentence used to read "This page states no timetable and no
   * criterion for that, because neither is established by the forms this packet
   * is built from." True of the three bound PDFs and false of the record the
   * page is built from, which establishes both: 13 V.S.A. Sec. 7603(a)(1)'s
   * 60-day clock and its three triggers, and Form 200-00331 as how the
   * participant checks. A required component that tells the participant no
   * timetable exists where the record supplies one is worse than silent. The
   * clerk sentence that followed it is unchanged and still true. */
  L.push("There is a timetable and there is a criterion, and both come from the statute rather than from these forms. Under 13 V.S.A. Sec. 7603(a)(1) the court shall issue the sealing order within 60 days after final disposition where the court made no probable cause determination at arraignment, the charge was dismissed before trial with or without prejudice, or you were acquitted -- unless a party objects in the interests of justice, in which case the court schedules a hearing under Sec. 7603(b) instead, with you and the prosecuting attorney as the only parties. To see where your own record stands, complete Form 200-00331, Request for Criminal Record Search, and submit it to the court in the county; the result of that search is how you see whether the automatic sealing has already happened. A separate request is needed for each county and there is a fee for it, so allow time for the answer before you decide whether to file. The clerk of the unit is who can tell you where your own record stands.", "");
  L.push("NO FILING FEE ON THIS TRACK", "");
  L.push("There is no filing fee on this non-conviction sealing track. Under 32 V.S.A. Sec. 1431(e), the $90 fee applies only to sealing a conviction for a violation of 23 V.S.A. Sec. 1201(a). This track does not seal a conviction.", "");
  L.push("Form 600-00228, the Judiciary's statewide Application to Waive Filing Fees and Service Costs, is conditional: it is used only where a filing fee is actually charged and the applicant cannot pay it. No fee is charged on this track, so nothing on it needs to be completed or filed for this petition. It is in this packet BLANK on purpose -- the platform has written nothing on it, because page 2 of that form is a financial declaration made under oath and this packet asserts no financial fact on your behalf.", "");
  L.push("NO PARTICIPANT SERVICE OF PROCESS", "");
  L.push("You do not serve the prosecutor with process. If you file the petition, the court provides a copy to the prosecutor. If you use the stipulation, take or send it to the prosecuting office; the prosecutor signs and files it with the court.", "");
  L.push("WHAT THIS PACKET IS NOT", "");
  L.push("This is a prepared set of official Vermont forms and this guidance page. It is not legal advice, it is not filed for you, and it does not decide whether the court will seal the record.", "");
  /* FIX02, ROUTE_IDENTITY. The other participant-facing surface that printed
   * the machine route id; see the note on the instructions footer. This page is
   * rendered into fixtures/canonical.pdf, so the participant reads it on paper. */
  L.push(`Route: ${config.routeName} (${config.statute})`);
  return L.join("\n");
}

/* ---- the composed interests-of-justice prompts component ------------------- *
 *
 * PROMPTS ONLY. Every line below is either a question for the participant, a
 * statement of where their own answer goes, or a statement of what the platform
 * will not do. There is no drafted sentence here, no example statement and no
 * argument, because the committed record for this route says the statement is a
 * participant-authored field with prompts and never generated argument. If a
 * future edit puts a sentence here that a participant could copy onto the
 * petition and sign, that edit has broken the component.
 */
function interestsOfJusticePromptsBody(config, facts) {
  const L = [];
  L.push("INTERESTS-OF-JUSTICE PROMPTS -- THE STATEMENT ONLY YOU CAN WRITE", "");
  L.push(`Petitioner: ${facts["participant.full_legal_name"]}`);
  L.push(`Case No.: ${facts["matter.case_number"]}`);
  L.push("Route: an ordinary contested petition at any time (13 V.S.A. Sec. 7603(g))", "");
  L.push("WHY THIS PAGE IS IN THE PACKET", "");
  L.push("On the ordinary petition route the court grants the petition if it finds that sealing serves the interests of justice. The burden is yours rather than the State's: this is the route where you have to satisfy the court, and not the one where the State has to show why not. Question 4 of the petition (200-00130) prints \"I believe that sealing of my criminal history is in the interests of justice because:\" and the words after that colon are yours.", "");
  L.push("THIS PAGE IS PROMPTS, NOT AN ANSWER, AND IT IS NOT FILED", "");
  L.push("The platform has written nothing in question 4 and it will not. It does not draft that statement for you, does not show you an example one, and does not suggest sentences for you to sign your name under. What follows is questions. Your answers to them, in your own words, are what goes on the petition. This page itself is not filed and is not part of what the court reads.", "");
  L.push("QUESTIONS TO ANSWER IN YOUR OWN WORDS", "");
  L.push("Answer the ones that are true of you and leave the rest alone. A short, plain, honest answer is a real answer: there is no required length and no required form of words.", "");
  for (const question of INTERESTS_OF_JUSTICE_PROMPTS) L.push(`- ${question}`);
  L.push("");
  L.push("WHERE YOUR ANSWER GOES", "");
  L.push("Write it in the space the petition prints after question 4. If what you have written does not fit that space, ask the clerk of the unit where you are filing how the court wants a longer statement submitted, rather than cutting it down before you have asked. Where self-help ends on this route is the instructions page, which lists the registry's stop conditions in its own words.", "");
  L.push(`Route: ${config.routeName} (${config.statute})`);
  return L.join("\n");
}

const INTERESTS_OF_JUSTICE_PROMPTS = Object.freeze([
  "What happened in this case, and how did it end?",
  "What does having this record on your criminal history stop you from doing now?",
  "Has it come up in a job, a license application, housing, schooling, volunteering or anything else? What happened when it did?",
  "Who else is affected by it -- family, dependants, anyone who relies on you?",
  "How much time has passed since the case ended, and what have you been doing in that time?",
  "Is there anything about how the case ended -- no charge filed, no probable cause found, dismissed, or acquitted -- that you want the court to have in front of it?",
  "What would change for you if the court sealed this record?",
  "Is there anything you would want the court to know that nobody has asked you about yet?"
]);

function interestsOfJusticePromptsMap(config) {
  const id = "interests_of_justice_prompts";
  const base = (fid, label) => ({
    field: `${id}.${fid}`, page: 1, printedLabel: label, printedLine: label,
    effectiveLabel: label, regionHeading: label, sectionHeading: null,
    rectBasis: "composed_document_authored_by_this_build"
  });
  const writes = [
    { ...base("petitioner_name", "Petitioner named on this page"), factId: "participant.full_legal_name", kind: "composed_text", document: id },
    { ...base("case_number", "Case No. printed on this page"), factId: "matter.case_number", kind: "composed_text", document: id }
  ];
  return {
    formNumber: id,
    documentPolicy: documentPolicy(config, id),
    structuralClass: "composed_document",
    explicitMappings: {}, roleRefusals: [], selectionControls: [],
    canonicalWrites: writes, canonicalRefusals: [],
    boundaryWrites: writes, boundaryRefusals: []
  };
}

function sanitizePdfText(t) {
  return t.replaceAll(" ", " ").replaceAll("‑", "-").replaceAll("–", "-").replaceAll("—", "-")
    .replaceAll("−", "-").replaceAll("’", "'").replaceAll("‘", "'").replaceAll("“", '"')
    .replaceAll("”", '"').replaceAll("§", "Sec. ").replaceAll("…", "...");
}

async function renderComposedPdf(fullText, title) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(title); pdf.setProducer("RCAP census-v1 artifact-only renderer"); pdf.setCreator("RCAP evidence build");
  const fixed = new Date(FIXED_DATE); pdf.setCreationDate(fixed); pdf.setModificationDate(fixed);
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const size = 11, lh = 14.5, W = 612, H = 792, margin = 72, maxW = W - 2 * margin;
  let page = pdf.addPage([W, H]); let y = H - margin;
  const draw = (line) => { if (y < margin) { page = pdf.addPage([W, H]); y = H - margin; } if (line) page.drawText(line, { x: margin, y, size, font, color: rgb(0, 0, 0) }); y -= lh; };
  const splitToken = (tok) => { const out = []; let c = ""; for (const ch of tok) { if (c && font.widthOfTextAtSize(`${c}${ch}`, size) > maxW) { out.push(c); c = ch; } else c += ch; } if (c) out.push(c); return out; };
  const wrap = (line) => {
    if (!line) return [""];
    const words = line.split(/\s+/).flatMap((w) => font.widthOfTextAtSize(w, size) > maxW ? splitToken(w) : [w]);
    const out = []; let c = "";
    for (const w of words) { const cand = c ? `${c} ${w}` : w; if (font.widthOfTextAtSize(cand, size) <= maxW) c = cand; else { if (c) out.push(c); c = w; } }
    if (c) out.push(c); return out;
  };
  for (const raw of sanitizePdfText(fullText).split("\n")) for (const row of wrap(raw)) draw(row);
  return Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
}

function composedMap(config) {
  const id = "process_guidance";
  const base = (fid, label) => ({
    field: `${id}.${fid}`, page: 1, printedLabel: label, printedLine: label,
    effectiveLabel: label, regionHeading: label, sectionHeading: null,
    rectBasis: "composed_document_authored_by_this_build"
  });
  const writes = [
    { ...base("petitioner_name", "Petitioner named on this page"), factId: "participant.full_legal_name", kind: "composed_text", document: id },
    { ...base("case_number", "Case No. printed on this page"), factId: "matter.case_number", kind: "composed_text", document: id }
  ];
  return {
    formNumber: id,
    documentPolicy: documentPolicy(config, id),
    structuralClass: "composed_document",
    explicitMappings: {}, roleRefusals: [], selectionControls: [],
    canonicalWrites: writes, canonicalRefusals: [],
    boundaryWrites: writes, boundaryRefusals: []
  };
}

/* ---- field map ------------------------------------------------------------ */
const OFFROUTE_REASON = (why) => `${why}; this branch of the form is never populated with participant data on this route`;

function officialFieldMap(source, census, report, config, marks = []) {
  const written = new Set(report.written.map((w) => w.field));
  const feeWaiverNotApplicable = source.formNumber === "600-00228";
  const canonicalWrites = []; const canonicalRefusals = []; const selectionControls = [];
  for (const r of census.rows) {
    const base = {
      field: r.key, widgetName: r.name, page: r.page, rect: r.rect, rectBasis: r.rectBasis,
      printedLabel: r.caption, printedLine: r.caption,
      printedCaption: r.printedCaptionForThisBox ?? r.caption,
      ...(r.optionProof ? { optionWordLocatedInTheBinary: r.optionProof } : {}),
      regionHeading: r.effectiveLabel, sectionHeading: null,
      effectiveLabel: r.effectiveLabel, captionReadAt: r.captionAt,
      ...(r.participantInstruction ? { participantInstruction: r.participantInstruction } : {})
    };
    if (r.policy === "write") {
      assert.ok(written.has(r.name), `${source.formNumber} ${r.key} is mapped as a write and the finalizer did not write it`);
      canonicalWrites.push({ ...base, factId: r.fact, kind: r.type, document: source.formNumber });
      continue;
    }
    if (r.policy === "select") {
      assert.ok(marks.some((m) => m.key === r.key), `${source.formNumber} ${r.key} is a route selection and no mark was drawn for it`);
      assert.ok(r.routeReason, `${source.formNumber} ${r.key} is a route selection and carries no route reason`);
      selectionControls.push({
        ...base, selectionId: r.key, kind: "selection_control", type: "checkbox",
        widgets: [{ page: r.page, rect: r.rect, rectBasis: r.rectBasis }],
        disposition: "selected_by_route", markedByTheBuild: true,
        reason: r.routeReason, routeDetermined: true,
        requiredBeforeFiling: false, why: r.routeReason, document: source.formNumber
      });
      continue;
    }
    if (r.isSelectionControl) {
      const protect = r.policy === "protect";
      const offroute = r.policy === "offroute";
      assert.ok(!offroute || r.routeReason,
        `${source.formNumber} ${r.key} is off-route and carries no route reason; the map would print the word "undefined" as its reason`);
      assert.ok(protect || r.participantInstruction,
        `${source.formNumber} ${r.key} is a declared blank checkbox and carries no participant instruction`);
      const cls = protect ? r.refusalClass : ((offroute || feeWaiverNotApplicable) ? null : ELECTION_CLASS);
      selectionControls.push({
        ...base, selectionId: r.key, kind: "selection_control", type: "checkbox",
        widgets: [{ page: r.page, rect: r.rect, rectBasis: r.rectBasis }],
        disposition: "explicit_refusal",
        reason: protect ? "signature or date field; never prefilled by this build"
          : offroute ? OFFROUTE_REASON(r.routeReason)
            : feeWaiverNotApplicable ? FEE_WAIVER_NOT_APPLICABLE
              : "a sworn assertion or legal election the route does not determine; only the participant may make it",
        category: cls, completenessClass: cls, class: cls,
        requiredBeforeFiling: false, routeDetermined: false, document: source.formNumber,
        why: protect ? "the participant signs and dates this themselves at filing time"
          : offroute ? r.routeReason
            : feeWaiverNotApplicable ? "form 600-00228 is used only when a fee is actually charged and the applicant cannot pay it; no fee is charged on this track, so the form is delivered blank and nothing on it is completed or filed here"
              : "only the participant may make this election"
      });
      continue;
    }
    if (r.policy === "protect") {
      canonicalRefusals.push({
        ...base, reason: "signature or date field; never prefilled by this build",
        category: r.refusalClass, completenessClass: r.refusalClass, class: r.refusalClass,
        requiredBeforeFiling: false, document: source.formNumber,
        why: r.refusalClass === SIGNATURE
          ? "the participant signs and dates this themselves at filing time"
          : "the court, the clerk or the State's Attorney owns this field"
      });
      continue;
    }
    if (r.policy === "offroute") {
      assert.ok(r.routeReason, `${source.formNumber} ${r.key} is off-route and carries no route reason`);
      canonicalRefusals.push({
        ...base, reason: OFFROUTE_REASON(r.routeReason),
        category: null, completenessClass: null, class: null,
        requiredBeforeFiling: false, routeDetermined: false, document: source.formNumber,
        why: r.routeReason
      });
      continue;
    }
    if (feeWaiverNotApplicable) {
      canonicalRefusals.push({
        ...base, reason: FEE_WAIVER_NOT_APPLICABLE,
        category: null, completenessClass: null, class: null,
        requiredBeforeFiling: false, routeDetermined: false, document: source.formNumber,
        why: "form 600-00228 is used only when a fee is actually charged and the applicant cannot pay it; no fee is charged on this track, so the form is delivered blank and nothing on it is completed or filed here"
      });
      continue;
    }
    canonicalRefusals.push({
      ...base, reason: `the participant supplies this before filing: ${r.what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, routeDetermined: false,
      identity: `${source.formNumber} field ${r.key}`, factId: null, document: source.formNumber,
      why: `the platform holds no value for this and the participant supplies it before filing: ${r.what}`,
      participantMustSupply: r.what
    });
  }
  return {
    formNumber: source.formNumber,
    documentPolicy: documentPolicy(config, source.formNumber),
    structuralClass: "acroform",
    component: FORMS[source.formNumber].component,
    explicitMappings: Object.fromEntries(census.rows.filter((r) => r.policy === "write").map((r) => [r.name, r.fact])),
    roleRefusals: [], selectionControls, canonicalWrites, canonicalRefusals,
    boundaryWrites: canonicalWrites, boundaryRefusals: canonicalRefusals
  };
}

function builderCounters(maps, actualWrites, instructionsText) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };
  const writes = []; const blanks = [];
  for (const m of maps) {
    const id = m.formNumber;
    for (const w of m.canonicalWrites ?? []) writes.push({ ...w, document: id, name: w.field, label: w.effectiveLabel ?? w.field, isSelectionControl: false });
    for (const r of m.canonicalRefusals ?? []) blanks.push({ ...r, document: id, name: r.field, label: r.effectiveLabel ?? r.field, refusalClass: r.completenessClass ?? null, isSelectionControl: false });
    for (const c of m.selectionControls ?? []) {
      if (String(c.disposition ?? "").toLowerCase().startsWith("select")) writes.push({ ...c, document: id, name: c.selectionId, label: c.field, isSelectionControl: false });
      else blanks.push({ ...c, document: id, name: c.field, label: `${c.field} (selection)`, refusalClass: c.completenessClass ?? null, isSelectionControl: true });
    }
  }
  const normLabel = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const writtenInDocument = new Map();
  for (const w of writes) {
    const doc = String(w.document ?? "");
    if (!writtenInDocument.has(doc)) writtenInDocument.set(doc, new Set());
    for (const k of [normLabel(w.label), normLabel(w.name)]) if (k.length >= 4) writtenInDocument.get(doc).add(k);
  }
  const availableFacts = new Set(writes.map((w) => w.factId).filter(Boolean).map(String));
  const declaredRequired = [];
  for (const b of blanks) {
    const here = writtenInDocument.get(String(b.document ?? "")) ?? new Set();
    const declared = {
      disposition: b.completenessDisposition ?? null,
      ...(Object.hasOwn(b, "requiredBeforeFiling") ? { requiredBeforeFiling: b.requiredBeforeFiling === true } : {}),
      routeDetermined: b.routeDetermined === true,
      factId: b.factId ?? null, identity: b.field ?? null,
      factAvailable: (b.factId ? availableFacts.has(String(b.factId)) : false) || here.has(normLabel(b.label)) || here.has(normLabel(b.name))
    };
    const verdict = classifyBlank(b, b.reason, b.refusalClass, declared);
    if (verdict.disposition === "REQUIRED_BEFORE_FILING") declaredRequired.push(b);
    if (BLANK_DISPOSITIONS[verdict.disposition].allowed) continue;
    if (verdict.disposition === "KNOWN_FACT_NOT_WRITTEN") note("knownRequiredFieldsMissing", { field: b.field, label: b.label, basis: verdict.basis });
    else if (verdict.disposition === "ROUTE_OPTION_NOT_SELECTED") note("requiredOptionsMissing", { field: b.field, label: b.label, basis: verdict.basis });
    else note("unclassifiedBlanks", { field: b.field, label: b.label, basis: verdict.basis });
  }
  const hay = String(instructionsText ?? "").toLowerCase();
  for (const b of declaredRequired) {
    const needles = [b.effectiveLabel, b.field, b.identity].map((x) => String(x ?? "").trim()).filter((x) => x.length >= 3);
    if (needles.some((n) => hay.includes(n.toLowerCase().slice(0, 60)))) continue;
    note("requiredFactsNotCollected", { field: b.field, label: b.label, why: "classified required-before-filing and not named in participant-instructions.md" });
  }
  const rows = new Map();
  for (const f of [...writes.map((w) => ({ ...w, written: true })), ...blanks.map((b) => ({ ...b, written: false }))]) {
    const key = rowKeyOf(f); if (!key) continue;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(f);
  }
  for (const [key, cells] of rows) {
    if (!cells.some((c) => c.written)) continue;
    const missing = cells.filter((c) => !c.written && classifyField(c.label, c.isSelectionControl === true).requirement === "REQUIRED_KNOWN");
    if (missing.length > 0) note("incompleteRows", { row: key, missingCells: missing.map((m) => m.label).slice(0, 6) });
  }
  for (const w of writes) {
    if (classifyField(w.label, w.isSelectionControl === true).requirement === "PROTECTED") note("protectedWrites", { field: w.field, label: w.label, why: "a protected field was written" });
  }
  for (const a of actualWrites.artifacts ?? []) {
    const reported = a.valuesReportedByFinalizer ?? null;
    const visible = (a.addedGlyphsReadFromOutputBytes ?? 0) + (a.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if (typeof reported === "number" && reported > 0 && visible === 0) note("invisibleWrites", { fixture: a.fixture, reportedByFinalizer: reported });
    if ((a.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: a.fixture, glyphsOutsideMeasuredBoxes: a.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes });
  }
  return { counters, findings, terminalFields: writes.length + blanks.length, written: writes.length, blank: blanks.length };
}

function requiredBeforeFilingItems(maps) {
  const order = Object.fromEntries(ORDER.map((f, i) => [f, i]));
  return maps.flatMap((m) => (m.canonicalRefusals ?? []).filter((r) => r.requiredBeforeFiling === true).map((r) => ({
    document: m.formNumber, field: r.field, page: r.page, y: r.rect?.y ?? null,
    printedContext: r.printedLabel, disclosureLabel: r.effectiveLabel,
    identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply
  })))
    .sort((a, b) => ((order[a.document] ?? 99) - (order[b.document] ?? 99)) || (a.page - b.page) || ((b.y ?? 0) - (a.y ?? 0)));
}

function instructionsMarkdown(config, resolved, rbf, maps) {
  const byDoc = new Map();
  for (const i of rbf) byDoc.set(i.document, [...(byDoc.get(i.document) ?? []), i]);
  const out = [];
  out.push(`# What you must do before you file — ${config.routeName}`, "");
  out.push(`This packet is prepared for **${config.legalName}**.`, "");
  out.push("The platform filled in what it holds about you -- your name, your date of birth, your address, your telephone number, your email and your docket number -- on the petition and on the stipulation. It wrote **nothing at all** on the fee-waiver form, which is delivered exactly as the Judiciary publishes it, because no fee is charged on this track. This page lists every blank and every checkbox that is yours, by the words printed beside it.", "");
  out.push("## Where you file this", "");
  out.push("File the completed packet with the **Vermont Superior Court, Criminal Division**, in the unit where your case was decided.", "");
  out.push("Both the petition (200-00130) and the stipulation (200-00132) print `SUPERIOR COURT CRIMINAL DIVISION` across the top of page 1, and the `Unit` box beside it is where that unit goes. If you do not know which unit decided your case, the docket number on your paperwork identifies it, and the clerk of any Superior Court unit can tell you from the docket number.", "");
  out.push("## What it costs, and when the fee-waiver form applies", "");
  out.push("**There is no filing fee on this non-conviction sealing track.** Under 32 V.S.A. § 1431(e), the $90 fee applies only to sealing a conviction for a violation of 23 V.S.A. § 1201(a). This track does not seal a conviction.", "");
  out.push("Form **600-00228**, *Application to Waive Filing Fees and Service Costs*, is the Vermont Judiciary's single statewide fee-waiver application. It is conditional: it is used only where a filing fee is actually charged and the applicant cannot pay it. **No fee is charged on this track, so you do not need it, and nothing on it needs to be completed or filed for this petition.**", "");
  out.push("**It is in this packet blank on purpose.** The platform has written nothing on it: not your name, not your address, not your docket number, and none of the income, expense or asset figures on its financial declaration. Page 2 of that form is a declaration made under oath, and a packet that filled it in and then told you not to file it would be asserting your finances to a court on a form you were told to leave alone. If a court ever does charge you a fee on a different matter, that is when the form is used, and every blank on it is then yours to complete.", "");
  out.push("## Filing and prosecutor workflow", "");
  out.push("**You do not serve the prosecutor with process.** If you file the petition, the court provides a copy to the prosecutor. If you use the stipulation, sign it and take or send it to the prosecuting office; the prosecutor signs and files it with the court.", "");
  out.push("## What is in this packet", "");
  out.push("| Component | Document |", "| --- | --- |");
  for (const r of resolved) {
    const conditional = r.formNumber === "600-00228"
      ? " — conditional, and its condition is not met on this track; delivered blank, nothing on it is completed or filed here"
      : "";
    out.push(`| \`${FORMS[r.formNumber].component}\` | **${r.formNumber}** — ${FORMS[r.formNumber].title}${conditional} |`);
  }
  /* The fourth component of THIS family is process_guidance -- the composed page
   * that carries the third route, the one that files nothing. The row used to
   * name filing_and_expectation_instructions, which is the sibling
   * vt_exp_decriminalized-set's fourth component and is not in this packet at
   * all; componentSet, documentOfComponent, the page manifest and the delivered
   * page footer all say process_guidance. */
  out.push("| `process_guidance` | the composed page that sets out all three routes, including the one that files nothing, and says where the packet goes |");
  /* The fifth component the packet-set manifest declares, conditional on the
   * § 7603(g) ordinary petition route and met on this track. It is prompts, and
   * the row says so, because a participant who reads "interests-of-justice" in
   * a contents list and expects a written argument has been misled. */
  out.push("| `interests_of_justice_prompts` | the composed page of prompts for the statement in question 4 of the petition — questions for you to answer in your own words; the platform writes no part of that statement |", "");
  out.push("## What you must do", "");
  out.push("1. **Fill in every item listed below.** Each one names the form, the page and the printed words next to the blank.");
  out.push("2. **Say which non-conviction ending applies to your case.** Question 2 of the petition offers three: you were cited or arrested but no charge was filed, a charge was filed and the court found no probable cause, or a charge was filed and the court dismissed it. Those are three different things and only you know which happened. The packet has already stated that you were **not convicted** — that much the route decides — and it leaves the rest to you.");
  out.push("3. **Sign and date each form yourself.** The platform never signs and never dates a signature. Blank signature and date lines are deliberate.");
  out.push("4. **Decide which route you are taking.** For a stipulation, sign form 200-00132 and take or send it to the prosecuting office; the prosecutor signs and files it with the court. If the prosecutor will not stipulate, file the petition (200-00130) on its own. The process-guidance page in this packet sets out both, and the third route — the one that files nothing — as well.");
  out.push("5. **Leave form 600-00228 alone on this track.** There is no filing fee here, so there is nothing to waive. It is delivered blank and the platform has written nothing on it. The waiver is used only where a fee is actually charged and the applicant cannot pay it.", "");
  /*
   * FIX02, SELF_HELP_STOP. Step 4 tells the participant to ask the court to set
   * a hearing, and this route's committed registry entry records BOTH a
   * scheduled hearing and an objection in the interests of justice as the point
   * where self-help ends -- conditions 1 and 2. The step is correct as a
   * description of the route and stays; what was missing is that it leads
   * directly to the stop. The sibling vt_seal_pardon-set states it in the same
   * place and in the same terms.
   */
  out.push("**A scheduled hearing is where this packet's self-help ends.** The committed track registry records the prosecutor opposing the petition, or the court scheduling a hearing, as the point to get a lawyer or a legal-aid office rather than to press on alone — and it records an objection \"in the interests of justice\" as converting the automatic route into a § 7603(b) hearing. The hearing date stands either way, so start looking for help the day you learn of one.", "");
  out.push("## The petition and stipulation items you must supply", "");
  for (const [doc, items] of byDoc) {
    out.push(`### ${doc} — ${FORMS[doc]?.title ?? doc}`, "");
    out.push("| Page | The blank on the form | What to write |", "| --- | --- | --- |");
    for (const i of items) out.push(`| ${i.page} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }
  /*
   * EVERY CHECKBOX, NAMED BY THE WORDS PRINTED BESIDE IT.
   *
   * The three bound forms carry twenty checkboxes between them and the packet
   * used to dispose of the lot in one sentence -- "Every checkbox. Read them and
   * tick the ones that are true for you" -- which names none of them, tells the
   * participant nothing about which the route has already answered, and left the
   * stipulation's consent-to-email question sitting blank on a page where the
   * packet had already written the email address. This table is generated from
   * the field map, so the two cannot drift: each row is one box, at the page it
   * is on, under the words the form prints beside it, with what to do about it.
   */
  out.push("## Every checkbox on these forms, and what to do with each one", "");
  out.push("These three forms carry twenty checkboxes. One of them the route has already answered and marked for you. The rest are yours, and the table says which is which.", "");
  out.push("| Form | Page | The words printed beside the box | What to do |", "| --- | --- | --- | --- |");
  const cell = (x) => String(x ?? "").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
  for (const m of maps) {
    for (const c of m.selectionControls ?? []) {
      const marked = c.disposition === "selected_by_route";
      const printed = c.printedCaption && c.printedCaption !== c.effectiveLabel
        ? `${c.effectiveLabel} (printed beside the box: "${c.printedCaption}")`
        : c.effectiveLabel;
      const todo = marked
        ? `**Already marked by the packet.** ${c.participantInstruction ?? ""}`
        : (c.participantInstruction ?? "");
      out.push(`| ${cell(m.formNumber)} | ${c.page} | ${cell(printed)} | ${cell(todo)} |`);
    }
  }
  out.push("");
  out.push("## Things the platform deliberately left blank", "");
  out.push("- **Your signature and the date you sign.** A signature is yours alone, and a date written before you sign would be false.");
  out.push("- **The State's Attorney's signature, date and printed name, and the court's order on the stipulation.** Those belong to the prosecutor and the judge.");
  out.push("- **Nineteen of the twenty checkboxes.** Each is a statement about your own record or a choice only you can make. The twentieth — \"I was not convicted for the offenses listed above.\" on page 1 of the petition — is the one the route decides, and the packet has marked it.");
  out.push("- **The whole of form 600-00228.** It is delivered blank because no fee is charged on this track.", "");
  /*
   * FIX02, SELF_HELP_STOP. The committed track registry holds six self-help
   * stop conditions for trackId vt_seal_nonconviction and the packet carried
   * none of them, with no stop section of any kind. They are read from the
   * registry at build time and reproduced word for word, in the registry's own
   * order, cited to file, track and field -- the shape the sibling
   * vt_seal_pardon-set already delivers for its own ten.
   */
  {
    const registry = JSON.parse(fs.readFileSync(path.join(ROOT, TRACK_REGISTRY), "utf8"));
    const track = (registry.tracks ?? []).find((row) => row.trackId === config.trackId);
    assert.ok(track, `${config.trackId}: no committed track registry entry to read stop conditions from`);
    const conditions = (track.selfHelpStopConditions ?? [])
      .map((condition) => String(condition).trim()).filter(Boolean);
    assert.ok(conditions.length,
      `${config.trackId}: the track registry holds no self-help stop condition`);
    out.push("## When to stop and get a lawyer", "");
    out.push("The committed track registry records these as the points where self-help ends on this route, in its own words. If any of them describes your case, stop here and take it to a lawyer or a legal-aid office rather than filing:", "");
    out.push(...conditions.map((condition) => `- ${condition}`), "");
    out.push("**Immigration consequences are the last of these, and this packet cannot tell you what sealing does to your immigration position.** Ask an immigration lawyer before you file if you are not a United States citizen. And note the fifth: this route seals the record, it does not destroy it — Act 60 repealed the no-conviction expungement routes, so if what you are expecting is expungement, this is not that.", "");
  }

  out.push("## What this packet is not", "");
  out.push("This is a prepared set of official Vermont forms and a process-guidance page. It is not legal advice, it is not filed for you, and it does not decide whether the court will seal the record.", "");
  /* Participant-facing pages carry a human label. Exact machine keys remain in
   * production-field-map.json and each documentPolicy record. */
  out.push(`_Route: ${config.routeName} (${config.statute})_`);
  return `${out.join("\n")}\n`;
}

/* ---- artifacts ------------------------------------------------------------ */
function writeArtifacts(ctx) {
  const { familyId, config, outDir, resolved, maps, artifacts, writeProofs, rasterPages, rbf, instructions, audit, rasterSkipped, routeSelectionsMade, manifestComponentDelivery } = ctx;
  const W = (rel, body) => fs.writeFileSync(path.join(ROOT, outDir, rel), body);
  W("production-field-map.json", `${JSON.stringify({
    schemaVersion: "rcap-official-form-field-map/v1-census-v1",
    familyId, routeKeys: config.routeKeys, routeSelectionId: config.routeSelectionId,
    jurisdiction: config.jurisdiction, statute: config.statute, legalName: config.legalName,
    officialForms: resolved.map((r) => r.formNumber),
    componentSet: COMPONENTS, documentOfComponent: DOCUMENT_OF_COMPONENT,
    componentRequirements: COMPONENT_REQUIREMENTS,
    manifestComponentDelivery,
    captionBasis: "every printed caption in this map was READ OUT OF THE PINNED BINARY at build time -- the printed line nearest the widget's own baseline on the widget's own page -- and captionReadAt records the y it was read from. The source gate is the exact SHA-256 binding, which fails the family closed on any change to the form.",
    dispositionVocabulary: [SIGNATURE, COURT_OWNED, ELECTION_CLASS],
    routeSelectionsMade,
    routeSelectionNote: "Question 2 of 200-00130 asks whether the petitioner was convicted, and this family is non-conviction sealing, so the route determines the answer: the packet marks 'I was not convicted for the offenses listed above' and refuses the conviction block beneath it. Which non-conviction ending applies -- never charged, no probable cause, or dismissed -- is not route-determined and stays with the participant.",
    requiredBeforeFilingCount: rbf.length, requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  }, null, 2)}\n`);
  W("source-receipt.json", `${JSON.stringify({
    schemaVersion: "rcap-family-source-receipt/v1",
    familyId, worklistGroupId: familyId, jurisdiction: config.jurisdiction,
    implementationStrategy: "official_pdf_fill", custodyClass: "SOURCE_ALREADY_HELD",
    acquisitionCommissioned: false, corpusRootFromEnvironment: "MASTER_LIBRARY_SOURCE_DIR",
    bindingMethod: "exact path + corpus-index SHA-256 + on-disk SHA-256 + byte length",
    routeSelectionId: config.routeSelectionId, allSourcesExact: true,
    documents: resolved.map((r) => ({ sourceIds: [r.sourceId], formNumber: r.formNumber, revision: r.revision, pathInArchive: r.pathInArchive, sha256: r.sha256, byteLength: r.byteLength })),
    composedComponentsAuthoredByThisBuild: ["process_guidance", "interests_of_justice_prompts"],
    commercialRoutesOpened: 0
  }, null, 2)}\n`);
  W("reports/rendered-artifacts.json", `${JSON.stringify({
    schemaVersion: "rcap-rendered-artifacts/v1", familyId, renderedFresh: true,
    componentSet: COMPONENTS, artifacts,
    componentRequirements: COMPONENT_REQUIREMENTS,
    manifestComponentDelivery,
    packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    rasterEngine: rasterSkipped ? null : "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)",
    rasterSkipped, rasterPages
  }, null, 2)}\n`);
  W("reports/actual-writes.json", `${JSON.stringify({
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId, derivedFromArtifactBytes: true,
    documents: writeProofs,
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture, formNumber: p.formNumber,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes
    }))
  }, null, 2)}\n`);
  W("reports/builder-completeness-counters.json", `${JSON.stringify({
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId,
    thisIsNotAVerdict: "A builder verdict is not a verdict. These counters are the builder contract's own obligation, computed with scripts/rcap-packet-completeness/completeness-contract.mjs. An independent verification lane that did not build this packet decides whether it passes.",
    focusedCheckNote: "scripts/rcap-packet-completeness/verify-packet-completeness.mjs enumerates only families listed BUILT in data/rcap-grade-a/launch-control/C11_RETURN_REVIEW.json, an earlier wave's record that this lane may not write.",
    counters: audit.counters, allNineZero: PASS_COUNTERS.every((c) => audit.counters[c] === 0),
    totals: { terminalFields: audit.terminalFields, written: audit.written, blank: audit.blank },
    findings: audit.findings
  }, null, 2)}\n`);
  W("build-status.json", `${JSON.stringify({
    schemaVersion: "rcap-family-build-status/v1", familyId,
    buildStatus: "state_built", reviewStatus: "qa_review_pending",
    builtBy: "scripts/build-census-v1-vt_seal_nonconviction-set.mjs",
    rasterEngine: rasterSkipped ? null : "chromium_calibrated", popplerUsed: false,
    rasterState: rasterSkipped ? "BUILT_RASTER_PENDING" : "rendered_locally_pending_central_acceptance",
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  }, null, 2)}\n`);
  W("build-findings.json", `${JSON.stringify({
    schemaVersion: "rcap-family-build-findings/v1", familyId,
    findings: [
      { finding: "This family files the same three forms as the Vermont sealing-by-conviction families, and differs from them by one question.", consequence: "Question 2 of 200-00130 is route-determined here: the packet marks 'I was not convicted for the offenses listed above' and refuses the whole conviction block beneath it -- the date of conviction, the probation questions and the restitution questions -- as a branch this route does not take." },
      { finding: "The census records THREE routes for this family, and one of them files nothing at all.", consequence: "A composed process-guidance page carries that third route. A packet that only ever told the participant to file would be telling them to do work they may not need to do, and dropping the route rather than carrying it would have lost a third of what the family was built for." },
      { finding: "Which non-conviction ending applies -- never charged, no probable cause, or dismissed -- is three different things that happened to a participant's own case.", consequence: "All three boxes stay the participant's, and the instructions say in terms which part the route decided and which part it did not." },
      { finding: "Every caption in this map is read out of the pinned binary at build time rather than transcribed.", consequence: "The guard against a changed form is the exact SHA-256 source binding, which fails the family closed on any byte." },
      { finding: "The held fee answer is no filing fee on this non-conviction track; the $90 fee in 32 V.S.A. Sec. 1431(e) is limited to sealing a DUI conviction.", consequence: "600-00228 is expressly conditional only where a fee is actually charged and the participant cannot pay it, and the packet-set manifest resolves that condition against this track: none is charged. The form is therefore DELIVERED UNFILLED -- the build writes nothing on it, not the name, address, telephone, email, docket number or printed name it once wrote, and none of the financial declaration. An earlier build prefilled all of those on a component whose filing disposition is do_not_file and whose page 2 is sworn, while the instructions told the participant twice not to complete it. A packet may not fill a form in and tell the reader not to fill it in." },
      { finding: "The three bound binaries carry twenty checkboxes, and the map declared them without the words printed beside them.", consequence: "Every one of the twenty now carries the printed caption with the form's own Wingdings box glyphs taken out of it, and each of the ten that shares a YES/NO line with its opposite carries the single option word located against the pinned binary by position -- the build refuses if the word nearest to the right of the box is not the word the policy names. Every declared blank checkbox carries a participant instruction, and participant-instructions.md lists all twenty in a generated table." },
      { finding: "The map declared routeSelectionsMade as the empty array while the build struck two diagonals through question 2 of the petition in both fixtures, and the field the mark lands on carried the literal string 'undefined' where its reason should have been.", consequence: "routeSelectionsMade is now built from the marks actually drawn, with the box, the printed caption, the stroke count read back from the output bytes and the route reason; and the census carries routeReason through to the map, so six off-route conviction-branch boxes no longer print 'undefined' as their reason. The build refuses if a route selection or an off-route box has no reason." },
      { finding: "The participant does not serve the prosecutor with process.", consequence: "The court provides a filed petition to the prosecutor. For a stipulation, the participant takes or sends the form to the prosecuting office, and the prosecutor signs and files it with the court." },
      { finding: "The boundary stipulation's printed-name and email widgets require the finalizer's existing minimum-size and widget-appearance alignment safeguards.", consequence: "Field 34d carries the full boundary name in fitted visible ink, and field 34i preserves the held boundary email rather than disappearing without an explicit refusal." },
      { finding: "The packet-set manifest declares FIVE components for this family and the packet declared four. The fifth, vt_seal_nonconviction-interests-of-justice-prompts-4, is conditional on the Sec. 7603(g) ordinary petition route -- a route this packet expressly carries -- so its condition is met, and it was neither rendered nor dispositioned. No counter could see it: a component that was never built has no field-map row to count.", consequence: "It is now a composed component page of participant-facing prompts, appended after the guidance page so that no page of the three official forms and no page of the guidance moves. It carries questions only: no drafted statement, no example, no argument, because the manifest, the intake memo and the track registry all say the statement is participant-authored with prompts and never generated argument. Question 4 of 200-00130 is unchanged and still a participant supply. The build now reads the manifest at build time and refuses, per fixture, if any declared component neither reaches a page nor carries a componentRequirements disposition." },
      { finding: "The guidance page told the participant that no timetable and no criterion is established for the route that files nothing. That was true of the three bound PDFs and false of the record the page is built from.", consequence: "The sentence is corrected out of the record: 13 V.S.A. Sec. 7603(a)(1)'s 60 days after final disposition, its three triggers, the objection in the interests of justice that converts it into a Sec. 7603(b) hearing, and Form 200-00331, Request for Criminal Record Search, as how the participant sees whether the automatic sealing has already happened. No other guidance sentence was touched." }
    ]
  }, null, 2)}\n`);
  W("participant-instructions.md", instructions);
  W("approval-request.json", `${JSON.stringify({
    schemaVersion: "rcap-family-approval-request/v1", familyId,
    requested: "visual review and counsel review", buildStatus: "state_built",
    counselQuestionsRaised: [
      "The packet marks question 2 of 200-00130 as 'I was not convicted' on the reasoning that a non-conviction sealing family determines that answer. Confirm that is right for all three of this family's routes.",
      "The process-guidance page now states the timetable and the criterion for the no-filing route out of the record rather than out of the three bound forms: the Sec. 7603(a)(1) 60-day clock from final disposition, its three triggers, the objection that converts it into a Sec. 7603(b) hearing, and Form 200-00331 as how the participant checks. Confirm that statement is right as written. It replaced a sentence that told the participant no timetable and no criterion existed.",
      "The interests-of-justice prompts component is delivered as a page of questions and carries no drafted or example statement, because the packet-set manifest, the intake memo and the track registry all describe it as participant-authored with prompts and never generated argument. Confirm the eight prompts ask and do not answer, and that none of them suggests a ground the participant has not raised."
    ],
    approvedForLive: false, live: false, commercialRoutesOpened: 0
  }, null, 2)}\n`);
}

/* ---- the one exported entry point ---------------------------------------- */
export async function runFamilyById(familyId, argv = process.argv.slice(2)) {
  const config = FAMILY_CONFIGS[familyId];
  assert.ok(config, `unknown family ${familyId}`);
  assertCommittedRouteKeys(familyId, config);
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");
  const { resolved, failures } = resolveSources(familyId);
  if (failures.length > 0) {
    return { familyId, status: "STOPPED", stopClass: "BLOCKED_SOURCE", failedSourceIdentities: failures,
      why: "a source did not bind by exact SHA-256, so nothing may be rendered from it", overlayDirectoryTouched: false };
  }
  const outDir = `${OVERLAY_ROOT}/${familyId.replace(/_/g, "-")}--official-pdf-fill`;
  const censuses = [];
  for (const source of resolved) censuses.push({ source, census: await censusOf(source) });

  if (process.env.VT_DUMP_DRIFT) {
    for (const c of censuses) {
      for (const u of c.census.unmapped) console.log(`UNMAPPED ${c.source.formNumber} ${u.key} (${u.field}) p${u.page} y=${u.rect.y}`);
      for (const k of c.census.missingKeys) console.log(`POLICY KEY MATCHED NO WIDGET ${c.source.formNumber}: ${k}`);
      for (const u of c.census.uncaptioned) console.log(`NO CAPTION ${c.source.formNumber} ${u.key} p${u.page}`);
    }
    process.exit(0);
  }
  const unmapped = censuses.flatMap((c) => c.census.unmapped.map((u) => ({ form: c.source.formNumber, ...u })));
  const missing = censuses.flatMap((c) => c.census.missingKeys.map((k) => `${c.source.formNumber}:${k}`));
  const uncaptioned = censuses.flatMap((c) => c.census.uncaptioned.map((u) => `${c.source.formNumber}:${u.key}`));
  assert.equal(unmapped.length, 0, `${unmapped.length} widget(s) carry no policy: ${JSON.stringify(unmapped.slice(0, 6), null, 2)}`);
  assert.equal(missing.length, 0, `${missing.length} policy key(s) match no widget: ${JSON.stringify(missing.slice(0, 10))}`);
  assert.equal(uncaptioned.length, 0, `${uncaptioned.length} widget(s) have no printed line to read a caption from: ${JSON.stringify(uncaptioned)}`);

  if (checkOnly) {
    return {
      familyId, status: "CHECK_ONLY",
      documents: censuses.map((c) => {
        const by = (p) => c.census.rows.filter((r) => r.policy === p).length;
        return { formNumber: c.source.formNumber, sha256: c.source.sha256, widgets: c.census.rows.length, write: by("write"), supply: by("supply"), protect: by("protect"), election: by("election") };
      })
    };
  }

  for (const sub of ["fixtures", "reports", "raster"]) fs.mkdirSync(path.join(ROOT, outDir, sub), { recursive: true });
  const maps = []; const artifacts = []; const writeProofs = []; const rasterPages = [];
  /*
   * Every mark this build actually draws, recorded as the map's own
   * routeSelectionsMade. It used to be the literal empty array while the build
   * struck two diagonals through question 2 of the petition in both fixtures, so
   * the map denied making the one selection the packet makes, and the field the
   * mark lands on was declared without the reason for the mark. A map that
   * cannot be reconciled with the page it describes is not a map of that page.
   */
  const routeSelectionsMade = [];
  /* Where each of the packet-set manifest's five declared components landed,
   * recorded per fixture by the assertion and reported for the canonical one. */
  const manifestComponentDelivery = [];

  for (const fixtureName of ["canonical", "boundary"]) {
    const facts = FIXTURES[fixtureName];
    // The assembled container carries the same fixed date every component page
    // already carries. PDFDocument.create() stamps the wall clock into
    // /CreationDate and /ModDate, and save({ updateMetadata: false }) only
    // declines to REFRESH that stamp -- it does not remove it -- so the first
    // stamp survived into the saved bytes. Two consecutive builds of this
    // family from identical inputs produced different canonical.pdf and
    // boundary.pdf SHA-256 while all sixteen raster pages and all six per-form
    // fixtures came out byte-identical. A RASTER_PASS is pinned to the packet
    // hash, so a rebuild that changed nothing discarded the visual verdict as
    // though the packet had been edited.
    const packet = stampDeterministic(await PDFDocument.create());
    const pageManifest = []; const documents = [];
    for (const { source, census } of censuses) {
      const { bytes: filled, report } = await renderDocument(source, census, fixtureName);
      const selections = census.rows.filter((r) => r.policy === "select")
        .map((r) => ({ key: r.key, page: r.page, rect: r.rect, routeReason: r.routeReason }));
      const { bytes, marks } = await markRouteSelections(filled, selections);
      const single = `${outDir}/fixtures/${fixtureName}--${source.formNumber}.pdf`;
      fs.writeFileSync(path.join(ROOT, single), bytes);
      const proof = await byteProof(source, census, path.join(ROOT, single), report, fixtureName);
      if (fixtureName === "boundary" && source.formNumber === "200-00132") {
        for (const [field, factId] of [["34d", "participant.full_legal_name"], ["34i", "participant.email"]]) {
          const actual = proof.actualWrites.find((row) => row.field === field);
          assert.ok(actual, `boundary packet page 3 field ${field} was not preserved in the finalized bytes`);
          assert.equal(actual.drawnText.join(""), facts[factId],
            `boundary packet page 3 field ${field} does not carry the full held ${factId}`);
        }
      }
      // Every mark this packet claims must be readable in the bytes, inside its
      // own measured box, and nothing may have landed outside one.
      const added = marks.length > 0 ? await addedPaintedPaths(filled, bytes) : [];
      const markProof = marks.map((m) => ({ ...m, paintedStrokesInsideTheBox: added.filter((row) => row.page === m.page && pathInsideBox(row, m.box)).length }));
      const strayMarkStrokes = added.filter((row) => !marks.some((m) => m.page === row.page && pathInsideBox(row, m.box))).length;
      for (const m of markProof) {
        assert.ok(m.paintedStrokesInsideTheBox >= 2, `route selection ${m.key} claims a mark and the output bytes carry ${m.paintedStrokesInsideTheBox} painted stroke(s) inside its box`);
      }
      assert.equal(strayMarkStrokes, 0, `${strayMarkStrokes} route-selection stroke(s) landed outside every measured box`);
      writeProofs.push({
        routeSelectionMarks: markProof, strayRouteSelectionStrokes: strayMarkStrokes,
        fixture: fixtureName, formNumber: source.formNumber, sourceSha256: source.sha256,
        proofMethod: "flattened widget appearances read back at every measured /Rect of the finalized bytes",
        valuesReportedByFinalizer: report.written.length,
        flattenedWidgetAppearancesReadFromOutputBytes: proof.appearances,
        addedGlyphsReadFromOutputBytes: proof.actualWrites.reduce((n, w) => n + w.drawnText.join("").length, 0),
        nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: proof.outside,
        actualWrites: proof.actualWrites
      });
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      for (const [i, p] of (await packet.copyPages(doc, doc.getPageIndices())).entries()) {
        packet.addPage(p);
        pageManifest.push({ packetPage: packet.getPageCount(), component: FORMS[source.formNumber].component, documentId: source.formNumber, sourcePage: i + 1, sourceSha256: source.sha256 });
      }
      documents.push(FORMS[source.formNumber].component, source.formNumber);
      if (fixtureName === "canonical") {
        maps.push(officialFieldMap(source, census, report, config, marks));
        for (const m of marks) {
          const row = census.rows.find((r) => r.key === m.key);
          routeSelectionsMade.push({
            document: source.formNumber,
            component: FORMS[source.formNumber].component,
            field: m.key, page: m.page, box: m.box,
            printedCaption: row?.printedCaptionForThisBox ?? row?.caption ?? null,
            effectiveLabel: row?.effectiveLabel ?? null,
            disposition: "selected_by_route",
            mark: m.mark, inset: m.inset, lineWidth: m.lineWidth,
            drewANewBox: m.drewANewBox, redrewTheCourtsBox: m.redrewTheCourtsBox,
            routeReason: m.routeReason,
            paintedStrokesInsideTheBoxReadBackFromTheOutputBytes:
              markProof.find((x) => x.key === m.key)?.paintedStrokesInsideTheBox ?? null
          });
        }
      }
    }
    const instrBytes = await renderComposedPdf(composedBody(config, facts, resolved), "Process Guidance, Including the Route That Files Nothing");
    const instrDoc = await PDFDocument.load(instrBytes, { ignoreEncryption: true });
    for (const [i, p] of (await packet.copyPages(instrDoc, instrDoc.getPageIndices())).entries()) {
      packet.addPage(p);
      pageManifest.push({ packetPage: packet.getPageCount(), component: "process_guidance", documentId: "process_guidance", sourcePage: i + 1, sourceSha256: null });
    }
    documents.push("process_guidance");
    if (fixtureName === "canonical") maps.push(composedMap(config));

    /* The fifth component the packet-set manifest declares. Its condition -- the
     * Sec. 7603(g) ordinary petition route -- is met on this track, so it is
     * rendered rather than dispositioned, as a composed page of participant
     * prompts. It is appended after the guidance page so that no page of the
     * three official forms and no page of the guidance moves. */
    const iojBytes = await renderComposedPdf(interestsOfJusticePromptsBody(config, facts), "Interests-of-Justice Prompts");
    const iojDoc = await PDFDocument.load(iojBytes, { ignoreEncryption: true });
    for (const [i, page] of (await packet.copyPages(iojDoc, iojDoc.getPageIndices())).entries()) {
      packet.addPage(page);
      pageManifest.push({ packetPage: packet.getPageCount(), component: "interests_of_justice_prompts", documentId: "interests_of_justice_prompts", sourcePage: i + 1, sourceSha256: null });
    }
    documents.push("interests_of_justice_prompts");
    if (fixtureName === "canonical") maps.push(interestsOfJusticePromptsMap(config));

    const declaredComponentDelivery = assertEveryDeclaredComponentIsAccountedFor(
      familyId, pageManifest, COMPONENT_REQUIREMENTS, fixtureName);
    if (fixtureName === "canonical") manifestComponentDelivery.push(...declaredComponentDelivery);

    const packetBytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
    const file = `${outDir}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), packetBytes);
    artifacts.push({
      fixture: fixtureName, file,
      sha256: crypto.createHash("sha256").update(packetBytes).digest("hex"),
      byteLength: packetBytes.length, pageCount: packet.getPageCount(), pageManifest,
      documents, components: COMPONENTS
    });

    if (!skipRaster) {
      const rasterDir = `${outDir}/raster/${fixtureName}`;
      fs.mkdirSync(path.join(ROOT, rasterDir), { recursive: true });
      for (let i = 0; i < packet.getPageCount(); i += 1) {
        const stage = path.join(ROOT, rasterDir, `page-${String(i + 1).padStart(2, "0")}`);
        const render = await rasterizePageCalibrated({ file: path.join(ROOT, file), pageIndex: i, keep: stage });
        for (const scrap of ["page.pdf", "page-calibration.pdf", "page-calibration.png"]) {
          const f = path.join(stage, scrap); if (fs.existsSync(f)) fs.unlinkSync(f);
        }
        const png = path.join(stage, "page.png");
        rasterPages.push({
          fixture: fixtureName, page: i + 1,
          file: `${rasterDir}/page-${String(i + 1).padStart(2, "0")}/page.png`,
          component: pageManifest[i]?.component ?? null,
          pageWidthPt: render.pageWidth, pageHeightPt: render.pageHeight,
          pixelsPerPoint: Number(render.pxPerPt.toFixed(4)),
          calibrationResidualPx: render.calibrationResidualPx, paperBounds: render.paper,
          engine: "chromium_calibrated_scripts_lib_pdf_page_raster",
          sha256: crypto.createHash("sha256").update(fs.readFileSync(png)).digest("hex")
        });
      }
    }
  }

  const rbf = requiredBeforeFilingItems(maps);
  const instructions = instructionsMarkdown(config, resolved, rbf, maps);
  const audit = builderCounters(maps, {
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture, valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes
    }))
  }, instructions);

  assert.ok(routeSelectionsMade.length > 0,
    "this family marks question 2 of 200-00130 from the route, and no mark was recorded for the map to declare");
  writeArtifacts({ familyId, config, outDir, resolved, maps, artifacts, writeProofs, rasterPages, rbf, instructions, audit, rasterSkipped: skipRaster, routeSelectionsMade, manifestComponentDelivery });
  const allZero = PASS_COUNTERS.every((c) => audit.counters[c] === 0);
  return {
    familyId, status: allZero ? "COMPLETED" : "STOPPED",
    ...(allZero ? {} : { stopClass: "COMPLETENESS_COUNTER_NOT_ZERO", nonZeroCounters: PASS_COUNTERS.filter((c) => audit.counters[c] > 0), firstFindings: audit.findings.slice(0, 8) }),
    directory: outDir,
    officialForms: resolved.map((r) => ({ formNumber: r.formNumber, sha256: r.sha256 })),
    components: COMPONENTS,
    terminalFields: audit.terminalFields, written: audit.written,
    requiredBeforeFiling: rbf.length,
    counters: audit.counters, nineCountersZero: allZero,
    rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RENDERED_LOCALLY_PENDING_CENTRAL_ACCEPTANCE",
    artifactHashes: artifacts.map((a) => ({ fixture: a.fixture, packetSha256: a.sha256, pages: a.pageCount })),
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamilyById("vt_seal_nonconviction-set")
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
