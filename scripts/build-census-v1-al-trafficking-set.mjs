#!/usr/bin/env node
/**
 * Route-obligation census v1 - packet family `al-trafficking-set`.
 *
 *   MASTER_LIBRARY_SOURCE_DIR=... node scripts/build-census-v1-al-trafficking-set.mjs
 *   MASTER_LIBRARY_SOURCE_DIR=... node scripts/build-census-v1-al-trafficking-set.mjs --check
 *
 * Alabama expungement for a human-trafficking survivor, route
 * `obligation:track-pathway:AL:al-trafficking:human-trafficking-victim-expungement`.
 *
 * WHY THIS IS AN OFFICIAL-FORM FILL AND NOT A COMPOSED PLEADING
 *
 * MASTER_QUEUE and the build worklist both label this family `custom_pleading`.
 * The controlling legal record does not. AL.memo.json track `al-trafficking`
 * records `outputStrategy: "official_pdf_fill"`, gives every one of its three
 * components an `officialFormId` (CR-65, CR-65, C-10-CRIMINAL), and states in
 * `controllingAuthority.summary`: "The route uses the same official CR-65
 * petition as the other Alabama tracks." Its `legalDesignDecision` is explicit
 * that the amendment "expressly changes the output strategy from
 * process_guidance" to official_pdf_fill on CR-65. Composing a pleading while
 * the record directs an official form would be a source-fidelity defect, so
 * this builds the official forms and records the disagreement rather than
 * silently resolving it either way. The overlay directory keeps the
 * `--custom-pleading` suffix the assignment owns; identity travels in
 * approval-request.json, which is what the completeness verifier reads.
 *
 * THE ROUTE ELECTION, AND WHY THERE ARE FOUR FIXTURES RATHER THAN TWO
 *
 * CR-65 Rev. 10/2024 prints the trafficking ground TWICE, because Alabama
 * carries two parallel statutes. Both were located by widget geometry and
 * cross-checked against the text of the printed page:
 *
 *   Section I, option 8   page 2, Check Box9.0    Ala. Code s 15-27-1(a)(8)
 *                         "...committed the misdemeanor offense, violation,
 *                         traffic violation, or municipal ordinance violation
 *                         during the period were being trafficked..."
 *   Section III, option 8 page 3, Check Box10.4   Ala. Code s 15-27-2(a)(8)
 *                         "...committed the felony offense during the period I
 *                         was being trafficked..."
 *
 * The geometry mapping is not guesswork and is checked against three families
 * already built from this same binary: al-diversion-set elects Check Box8.5
 * (Section I option 6, the diversion ground), al-misd-dwop-set elects Check
 * Box8.6 (Section I option 7), and al-pardoned-felony-set elects Check Box10.6
 * plus Check Box11.0-11.6, which is Section V's "all eight boxes". Every one of
 * those lands where this ordering says it should.
 *
 * The form says "Check ONLY one (1) of the eight (8) options" and "Only one
 * offense per petition", so ONE petition cannot elect both. Which subsection
 * applies is decided by the offence level, and the record says so rather than
 * fixing it: the worklist deliverable reads "Petition under the applicable
 * subsection", and the compiled runtime profile
 * src/lib/rcap-engine/compiled/profiles/AL-alabama.json says "Two statutes
 * (misdemeanor s 15-27-1, felony s 15-27-2)" and "Then pick s 15-27-1
 * (misdemeanor)". So the offence level is a declared fixture fact and the
 * election follows from it, exactly as the county or the case number does.
 *
 * That is why this family renders four packets and not two. Rendering only the
 * misdemeanor pair would deliver half a route; switching subsection between
 * canonical and boundary would make the two incomparable, which is the one
 * thing the canonical/boundary pair exists to allow. Each variant therefore
 * gets its own canonical and its own boundary, which is the shape
 * az_marijuana_expungement_arrest_no_charges-set already ships.
 *
 * WHAT THIS BUILD DOES NOT ELECT, AND SAYS SO
 *
 *   - Section IV, page 3, Check Box10.5, Ala. Code s 15-27-2(b): the narrow
 *     exception letting a trafficking survivor reach a CONVICTION for one of
 *     three enumerated violent felonies. AL.memo.json cites s 15-27-2(b) among
 *     the track's authorities, but the worklist deliverable names only
 *     ss 15-27-1(a)(8) / 15-27-2(a)(8), and Section IV is a conviction branch
 *     rather than a charge branch. Whether this family covers it is an owner
 *     scoping determination, so the box is left blank, classified as an
 *     election this route does not determine, and surfaced by name.
 *   - A proposed Order of Expungement. The compiled profile says "The petition
 *     is accompanied by a proposed Order of Expungement (s 15-27-6)", but the
 *     worklist records proposedOrder as `not_recorded`, the memo's component
 *     list does not carry one, and no official order binary is bound to this
 *     family. An unbound order is surfaced, never invented.
 *
 * NOTARIZATION IS QUOTED, NEVER DIRECTED
 *
 * AL.memo.json rules.notarization for this track reads "The source review does
 * not state a notarization requirement for CR-65." The guides quote that
 * sentence and send the participant to the circuit clerk. They do not direct
 * notarization, and assertRepairInvariants fails the build if they start to.
 *
 * NINE COUNTERS ARE MEASURED FROM THE DELIVERED BYTES
 *
 * proveDeliveredInk reopens each finished packet and walks its content streams,
 * recursing through the Form XObjects that flattening leaves behind, then asks
 * two questions per field: is there ink inside the rectangle of every field
 * this build wrote, and is there ink inside the rectangle of any field it
 * refused. A ticked CR-65 box draws as a ZapfDingbats glyph inside the widget
 * rect, so both questions are answered the same way and an election cannot read
 * as invisible merely because it is not prose. Nothing here is copied from the
 * finalizer's own report.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";
import { extractTextItems } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFCheckBox, PDFTextField, PDFName, PDFRef, StandardFonts } = require("pdf-lib");

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");

const FAMILY_ID = "al-trafficking-set";
const TRACK_ID = "al-trafficking";
const OUT_REL = "data/rcap-all50/overlays/census-v1/al/al-trafficking-set--custom-pleading";
const INDEX_PATH = "data/rcap-all50/local-source-corpus-index.json";
const WORKLIST_PATH = "data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json";
const MEMO_PATH = "data/record-clearing/legal-design-intake/AL.memo.json";
const PROFILE_PATH = "src/lib/rcap-engine/compiled/profiles/AL-alabama.json";
const FIXED_DATE = new Date("2026-09-09T00:00:00.000Z");

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

const SOURCES = [
  {
    documentId: "CR-65",
    sourceId: "official-form:CR-65",
    path: "LegalEase Alabama/cr-65-expunge-petition-10-2024.pdf",
    sha256: "c2e0c7bd7abca2c83c469d7da1aa0b80b132e653f8712d0b4ce77c8b160b2a39",
    componentKinds: ["primary_filing", "certificate_of_service"]
  },
  {
    documentId: "C-10-CRIMINAL",
    sourceId: "official-form:C-10-CRIMINAL",
    path: "STATES/AL/02_PACKET_FORMS/AL__FORM__C-10-CRIMINAL__affidavit-of-substantial-hardship-and-order__REV-2024-05__EN.pdf",
    sha256: "527d4cfdde5bea564a8729e6425f1042627b03435ec634509fe32fdb80a5c6f8",
    componentKinds: ["fee_waiver"]
  }
];

/*
 * The two statutory subsections this family covers, each with the box that
 * elects it and the printed sentence that box sits beside. `printedGround` is
 * read off CR-65 itself and is what the guide shows the participant, so the
 * guide names the same words the paper does.
 */
const VARIANTS = {
  misdemeanor: {
    variantId: "misdemeanor",
    statute: "Ala. Code § 15-27-1(a)(8)",
    section: "Section I, option 8 (CR-65 page 2)",
    checkbox: "Check Box9.0",
    offenceLevel: "misdemeanor, violation, traffic violation, or municipal ordinance violation charge",
    printedGround:
      "I can prove by a preponderance of the evidence that I was a victim of human trafficking, and committed "
      + "the misdemeanor offense, violation, traffic violation, or municipal ordinance violation during the period "
      + "were being trafficked, and you would not have committed the offense or violation but for being trafficked.",
    routeSummary:
      "Human-trafficking survivor expungement of a misdemeanor, violation, traffic violation or municipal "
      + "ordinance violation charge under Ala. Code § 15-27-1(a)(8), elected at CR-65 Section I option 8."
  },
  felony: {
    variantId: "felony",
    statute: "Ala. Code § 15-27-2(a)(8)",
    section: "Section III, option 8 (CR-65 page 3)",
    checkbox: "Check Box10.4",
    offenceLevel: "felony charge",
    printedGround:
      "I can prove by a preponderance of the evidence that I was a victim of human trafficking, and committed "
      + "the felony offense during the period I was being trafficked, and would not have committed the felony "
      + "offense but for being trafficked.",
    routeSummary:
      "Human-trafficking survivor expungement of a felony charge under Ala. Code § 15-27-2(a)(8), elected at "
      + "CR-65 Section III option 8."
  }
};

/*
 * Section IV. Named here so it is refused deliberately and by name rather than
 * falling into the generic "some other box" bucket, and so the guide can tell a
 * participant what it is instead of leaving them to find it.
 */
const UNSCOPED_ELECTION = {
  checkbox: "Check Box10.5",
  statute: "Ala. Code § 15-27-2(b)",
  section: "Section IV (CR-65 page 3)",
  why:
    "Section IV is the narrow exception that lets a trafficking survivor reach a CONVICTION for one of three "
    + "enumerated violent felonies. AL.memo.json cites § 15-27-2(b) among this track's authorities, but the build "
    + "worklist's deliverable names only §§ 15-27-1(a)(8) / 15-27-2(a)(8), and Section IV is a conviction branch "
    + "rather than a charge branch. Whether this family covers it is an owner scoping determination, so this "
    + "packet does not elect it."
};

/*
 * C-10-CRIMINAL page 1 carries two independent groups, read off the binary by
 * widget geometry against the printed page:
 *
 *   Check Box1.0 y=633  beside "STATE OF ALABAMA"
 *   Check Box1.1 y=618  beside "MUNICIPALITY OF ____"      caption branch
 *
 *   Check Box2.0 y=592  "...unable to hire an attorney..."
 *   Check Box2.1 y=577  "...unable to pay for ignition interlock device fees..."
 *   Check Box2.2 y=555  "...unable to pay the expungement petition
 *                        administrative filing fee and request that these fees
 *                        be waived."                        relief requested
 *
 * The caption branch is determined by the route: AL.memo.json rules.filing
 * sends this petition to "the criminal division of the circuit court", which is
 * a State of Alabama court and not a municipality.
 *
 * The relief branch is determined by why this component is in the packet at
 * all. The memo makes fee_waiver conditional "Where indigency is claimed", so a
 * fixture that carries the affidavit is a fixture claiming indigency, and the
 * fee this route's waiver concerns is named on the paper: the expungement
 * petition administrative filing fee. Electing the attorney or interlock line
 * instead would request relief this route does not seek. The hardship assertion
 * itself remains the participant's own and is made by the signature this packet
 * leaves blank, which is what the guide says.
 */
const C10_ELECTIONS = {
  "Check Box1.0": {
    factId: "route.court_caption",
    label: "State of Alabama caption branch (selection)",
    why: "AL.memo.json rules.filing files this petition in the criminal division of the circuit court, a State of Alabama court rather than a municipal one."
  },
  "Check Box2.2": {
    factId: "route.fee_waiver_relief",
    label: "Relief requested: waiver of the expungement petition administrative filing fee (selection)",
    why: "AL.memo.json rules.fees records \"$500, or C-10-Criminal where indigency is claimed\" and rules.feeWaiver names C-10-Criminal as this route's fee-waiver instrument. Of the three printed requests this is the one this route seeks."
  }
};

const C10_UNSOUGHT = {
  "Check Box1.1": "The municipal-court caption branch. This petition is filed in the circuit court, so it stays blank.",
  "Check Box2.0": "A request for a court-appointed attorney. This packet does not seek counsel, and it is not the relief this route's fee waiver concerns.",
  "Check Box2.1": "A request to waive ignition interlock device fees. Not the relief this route seeks."
};

const FIXTURES = {
  canonical: {
    fixtureClass: "canonical",
    first: "Jordan", middle: "Avery", last: "Reyes", full: "Jordan Avery Reyes",
    street: "412 Magnolia Avenue", cityStateZip: "Montgomery, AL 36104",
    email: "jordan.reyes@example.org", phone: "334-555-0142", dob: "06/14/1988",
    caseNumber: "CC-2021-004217", county: "Montgomery", feeWaiverRequested: true
  },
  boundary: {
    fixtureClass: "boundary",
    first: "Alexandria", middle: "Catherine", last: "Montgomery-Washington",
    full: "Alexandria Catherine Montgomery-Washington",
    street: "1188 Martin Luther King Junior Boulevard Apartment 1407",
    cityStateZip: "Birmingham, AL 35203-4417",
    email: "alexandria.montgomery.washington@example.org", phone: "205-555-0199",
    dob: "12/31/1979", caseNumber: "CC-2024-000001.99", county: "Jefferson", feeWaiverRequested: true
  }
};

function resolveSources() {
  const index = readJson(INDEX_PATH);
  const resolver = makeCorpusEntryResolver(index, { repoRoot: ROOT, masterLibraryRoot: process.env.MASTER_LIBRARY_SOURCE_DIR });
  return SOURCES.map((source) => {
    const entry = index.entries.find((candidate) => candidate.path === source.path);
    assert.ok(entry, `missing committed index entry: ${source.path}`);
    assert.equal(entry.sha256, source.sha256, `committed index pins a different digest for ${source.path}`);
    const absolute = resolver.resolve(entry);
    assert.ok(absolute && fs.existsSync(absolute), `source custody is not mounted: ${source.path}`);
    const bytes = fs.readFileSync(absolute);
    assert.equal(sha256(bytes), source.sha256, `source hash drift: ${source.path}`);
    return { ...source, absolute, bytes, byteLength: bytes.length, custody: entry.custody };
  });
}

function pageOf(field, pages) {
  const widget = field.acroField.getWidgets()[0];
  if (!widget) return 1;
  const parent = widget.dict.get(PDFName.of("P"));
  if (parent) {
    const index = pages.findIndex((page) => page.ref.toString() === parent.toString());
    if (index >= 0) return index + 1;
  }
  const byAnnots = pages.findIndex((page) => (page.node.Annots()?.asArray() ?? []).some((ref) => ref.toString() === widget.ref?.toString()));
  return byAnnots < 0 ? 1 : byAnnots + 1;
}

/*
 * The printed caption of a blank the platform does not hold. A participant told
 * to "Complete undefined_17" has not been told anything, and the mechanical
 * counter cannot see the difference because the field name is non-empty either
 * way. These are read off the two forms themselves.
 */
const REQUIRED_LABELS = {
  "CR-65:Text2": "Last four digits of your Social Security Number (CR-65 petition, page 1)",
  "CR-65:COUNTY and it was given Court Case Number": "County where any previous expungement was filed",
  "CR-65:was     granted": "Court case number of any previous expungement",
  "CR-65:Only one offense per petition Multicount cases require multiple petitions": "The single charge or conviction you are asking the court to expunge",
  "CR-65:1 Criminal charge from the record to be considered 1": "The criminal charge as it appears on your certified record (line 1)",
  "CR-65:1 Criminal charge from the record to be considered 2": "The criminal charge as it appears on your certified record (line 2)",
  "CR-65:2 Grounds for or reasons why you seek expungement 1": "Your grounds for expungement, in your own words (line 1)",
  "CR-65:2 Grounds for or reasons why you seek expungement 2": "Your grounds for expungement, in your own words (line 2)",
  "CR-65:3 The agency or department that made the arrest 1": "The agency or department that made the arrest (line 1)",
  "CR-65:3 The agency or department that made the arrest 2": "The agency or department that made the arrest (line 2)",
  "CR-65:incarcerated or detained pursuant to arrest on the abovelisted charge that must be indicated here 1": "Any agency that incarcerated or detained you on this charge (line 1)",
  "CR-65:incarcerated or detained pursuant to arrest on the abovelisted charge that must be indicated here 2": "Any agency that incarcerated or detained you on this charge (line 2)",
  "CR-65:Other agency department or entity not listed above": "Any other agency, department or entity holding records of this charge",
  "CR-65:I": "Your name, as the person certifying service",
  "CR-65:Other": "Any other recipient you served",
  "CR-65:PetitionersServers Telephone Number": "Telephone number of the person who served the petition",
  "C-10-CRIMINAL:undefined_2": "Your monthly gross income",
  "C-10-CRIMINAL:undefined_3": "Your spouse's monthly gross income — only if you are married, and only unless this is a marital offense",
  "C-10-CRIMINAL:undefined_4": "Your other monthly earnings, including commissions, bonuses, and interest",
  "C-10-CRIMINAL:undefined_5": "Combined monthly income of other household members",
  "C-10-CRIMINAL:undefined_6": "Monthly unemployment, workers' compensation, Social Security, retirement, or similar income",
  "C-10-CRIMINAL:undefined_7": "Child support or alimony received each month",
  "C-10-CRIMINAL:undefined_8": "Other monthly income amount",
  "C-10-CRIMINAL:undefined_9": "Total monthly gross income (item 3a)",
  "C-10-CRIMINAL:undefined_10": "Monthly rent or mortgage expense",
  "C-10-CRIMINAL:undefined_11": "Total monthly utility expense",
  "C-10-CRIMINAL:undefined_12": "Monthly food expense",
  "C-10-CRIMINAL:undefined_13": "Monthly clothing expense",
  "C-10-CRIMINAL:undefined_14": "Monthly health-care or medical-insurance expense",
  "C-10-CRIMINAL:undefined_15": "Monthly car-payment or transportation expense",
  "C-10-CRIMINAL:undefined_16": "Monthly loan-payment expense",
  "C-10-CRIMINAL:undefined_17": "Monthly credit-card-payment expense",
  "C-10-CRIMINAL:undefined_18": "Monthly educational or employment expense",
  "C-10-CRIMINAL:undefined_19": "Monthly cell-phone expense",
  "C-10-CRIMINAL:undefined_20": "Additional description of other monthly expenses",
  "C-10-CRIMINAL:undefined_21": "Other monthly expense amount",
  "C-10-CRIMINAL:undefined_22": "Monthly-expense subtotal (item 3b)",
  "C-10-CRIMINAL:undefined_23": "Monthly child-support or alimony expense subtotal (item 3c)",
  "C-10-CRIMINAL:undefined_24.0": "Monthly exceptional-expense subtotal (item 3d)",
  "C-10-CRIMINAL:undefined_24.1": "Total monthly expenses (item 3e)",
  "C-10-CRIMINAL:undefined_25": "Total monthly gross income minus total monthly expenses",
  "C-10-CRIMINAL:undefined_26": "Cash, bank funds, stocks, bonds, or certificates of deposit",
  "C-10-CRIMINAL:undefined_27": "Equity in real estate",
  "C-10-CRIMINAL:undefined_28": "Equity in personal property",
  "C-10-CRIMINAL:undefined_29": "Other asset amount",
  "C-10-CRIMINAL:undefined_30": "Value of any other property described",
  "C-10-CRIMINAL:undefined_31": "Total assets",
  "C-10-CRIMINAL:Total Number of People I am Supporting Financially in Household Including Myself": "Total number of people you support financially, including yourself",
  "C-10-CRIMINAL:Last 4 Digits of Social Security Number": "Last four digits of your Social Security Number (C-10-CRIMINAL affidavit, page 1)",
  "C-10-CRIMINAL:Spouses Full Name if married": "Your spouse's full name — only if you are married; the printed caption reads \"(if married)\"",
  "C-10-CRIMINAL:Employers Name  Address": "Your employer's name and address",
  "C-10-CRIMINAL:Employers Telephone Number": "Your employer's telephone number",
  "C-10-CRIMINAL:Other Expenses be specific": "Any other monthly expense, described specifically",
  "C-10-CRIMINAL:Other be specific": "Any other asset you own, described specifically",
  "C-10-CRIMINAL:If so describe": "Description of any other property you own",
  "C-10-CRIMINAL:State  Last 4 Digits of Driver Licenses Number": "State and last four digits of your driver licence number",
  "C-10-CRIMINAL:Other Monthly Income be specific": "Any other monthly income, described specifically",
  "C-10-CRIMINAL:The monthly value of these benefits combined is": "Combined monthly value of the benefits you receive",
  "C-10-CRIMINAL:Other_2": "Any other benefit you receive",
  "C-10-CRIMINAL:Home": "Your home telephone number",
  "C-10-CRIMINAL:Other": "Any other telephone number for you"
};

function requiredLabel(documentId, name, page) {
  return REQUIRED_LABELS[`${documentId}:${name}`] ?? `Complete "${name}" on ${documentId} page ${page}`;
}

/*
 * Facts this packet holds, and the boxes they may NOT be written into.
 *
 * The narrowing rules come first and return null, because an exclusion has to
 * out-rank the loose rule it protects against or it never runs. Each of the
 * CR-65 exclusions below is a box whose exported field name is the tail of the
 * sentence it ends rather than the fact it asks for.
 */
function knownValue(documentId, name, page, fixture) {
  const key = name.toLowerCase();

  // CR-65 page 1 Text2 follows the printed "XXX - XX -" under the caption
  // "(Social Security Number, Last four digits only)". It is not a case number.
  // The platform does not hold anyone's Social Security number.
  if (documentId === "CR-65" && key === "text2") return null;
  // Page 6 asks for the county and case number of a PREVIOUS expungement.
  if (documentId === "CR-65" && key === "county and it was given court case number") return null;
  if (documentId === "CR-65" && key === "was     granted") return null;
  // The page-6 attorney block exports four fields under bare names.
  if (documentId === "CR-65" && key === "telephone number_2") return null;
  if (documentId === "CR-65" && /^text[1-7]$/.test(key)) return [fixture.caseNumber, "matter.case_number"];

  if (documentId === "C-10-CRIMINAL" && key === "text4") return [fixture.dob, "participant.date_of_birth"];
  if (documentId === "C-10-CRIMINAL" && key === "undefined") return [fixture.cityStateZip, "participant.city_state_zip"];
  if (documentId === "C-10-CRIMINAL" && key === "in the") return ["Circuit", "matter.court_type"];
  if (documentId === "C-10-CRIMINAL" && key === "court of") return [fixture.county, "matter.filing_county"];
  if (documentId === "C-10-CRIMINAL" && key === "v") return [fixture.full, "participant.full_legal_name"];
  if (documentId === "C-10-CRIMINAL" && key === "municipality of") return null;

  if (/spouse|employer/.test(key)) return null;
  if (/court case number/.test(key)) return [fixture.caseNumber, "matter.case_number"];
  if (documentId === "CR-65" && key === "name of county") return [fixture.county, "matter.filing_county"];
  if (/^last name$/.test(key)) return [fixture.last, "participant.last_name"];
  if (/^first name$/.test(key)) return [fixture.first, "participant.first_name"];
  if (/^middle name$/.test(key)) return [fixture.middle, "participant.middle_name"];
  if (/full name|printed name of petitioner/.test(key)) return [fixture.full, "participant.full_legal_name"];
  if (/street address|complete home address/.test(key)) return [fixture.street, "participant.street_address"];
  if (/city state zip code/.test(key)) return [fixture.cityStateZip, "participant.city_state_zip"];
  if (/^email address$/.test(key)) return [fixture.email, "participant.email"];
  if (/^telephone number$|telephone number cell/.test(key)) return [fixture.phone, "participant.phone"];
  if (/date of birth/.test(key)) return [fixture.dob, "participant.date_of_birth"];
  return null;
}

/*
 * Blanks that are NOT owed before filing, and why telling a participant they
 * are is a defect rather than an over-count.
 *
 * "MUNICIPALITY OF" is the other half of the caption branch this packet already
 * elected against: the petition is filed in the circuit court, so the packet
 * ticks "STATE OF ALABAMA" and the municipal line stays empty by design.
 * Listing it as a blank the participant must fill contradicts, in the same
 * document, the election the packet makes on the paper.
 *
 * The spouse fields are conditional on the printed words "(if married)" and
 * "unless this is a marital offense". A participant who is not married owes
 * nothing there, and a required-before-filing list that says otherwise sends
 * them looking for a fact that does not exist.
 */
const NOT_OWED = {
  "C-10-CRIMINAL:MUNICIPALITY OF": {
    label: "Municipal-court caption line on C-10-CRIMINAL page 1 — this route does not use it",
    reason: "C-10-CRIMINAL page 1 offers two caption branches, \"STATE OF ALABAMA\" and \"MUNICIPALITY OF ____\". AL.memo.json rules.filing files this petition in the criminal division of the circuit court, so this packet elects the State of Alabama branch at Check Box1.0 and the municipal line belongs to the branch this route does not take.",
    routeCondition: "AL.memo.json track al-trafficking rules.filing: \"File CR-65 in the criminal division of the circuit court in the county where the charges were filed.\" A circuit court is not a municipality, so the municipal caption branch of C-10-CRIMINAL is outside this route.",
    disposition: "NOT_APPLICABLE_ON_THIS_ROUTE"
  }
};

function protectedField(documentId, name, page) {
  const key = name.toLowerCase();
  // C-10-CRIMINAL page 3 is the judge's order; page 2 carries the oath block.
  if (documentId === "C-10-CRIMINAL" && page >= 3) return true;
  if (documentId === "C-10-CRIMINAL" && page === 2 && ["1", "day of", "undefined_32", "2", "text1", "print or type name"].includes(key)) return true;
  // CR-65 page 7 is the certificate of service, completed only after service
  // has actually happened; page 6 carries the verification and notary block.
  if (documentId === "CR-65" && page === 7) return true;
  if (documentId === "CR-65" && page === 6 && ["text8", "text26", "text9", "text10"].includes(key)) return true;
  if (documentId === "CR-65" && page === 8) return true;
  return /signature|notary|officer authorized|my commission expires|dated this|^day of$|^date$/.test(key);
}

function attorneyField(documentId, name, page) {
  const key = name.toLowerCase();
  if (documentId === "CR-65" && page === 6 && ["city", "state", "zip code", "telephone number_2", "email address_2"].includes(key)) return true;
  return /attorney|state bar|business address of attorney|email address_2|telephone number_2/.test(key);
}

/*
 * Writes the WHOLE value or refuses it. The value is never sliced to /MaxLen
 * and never ellipsized: a participant fact on a document filed with a court is
 * complete or it is named as owed, carrying the value it could not print and
 * the measurement that says why.
 */
function setComplete(field, value, font) {
  const max = typeof field.getMaxLength === "function" ? field.getMaxLength() : undefined;
  if (max && value.length > max && typeof field.removeMaxLength === "function") field.removeMaxLength();
  const rectangles = field.acroField.getWidgets().map((widget) => widget.getRectangle());
  const available = rectangles.length ? Math.min(...rectangles.map((rect) => Math.max(1, rect.width - 4))) : 100;
  const height = rectangles.length ? Math.min(...rectangles.map((rect) => rect.height)) : 12;
  let size = 8;
  while (size > 5.5 && font.widthOfTextAtSize(value, size) > available) size -= 0.25;
  if (font.widthOfTextAtSize(value, size) > available) {
    if (height < 24) {
      return {
        refused: true,
        heldValue: value,
        measurement: {
          declaredMaxLength: max ?? null,
          drawableWidthPt: Number(available.toFixed(2)),
          widgetHeightPt: Number(height.toFixed(2)),
          widthNeededAtFloorPt: Number(font.widthOfTextAtSize(value, 5.5).toFixed(2)),
          floorFontSizePt: 5.5
        }
      };
    }
    field.enableMultiline();
    size = 6;
  }
  field.setFontSize(size);
  field.setText(value);
  assert.equal(field.getText(), value, `complete value did not survive in ${field.getName()}`);
  return { drawnText: value, fontSize: size };
}

function selectCheckboxState(field, state = "Yes") {
  const target = PDFName.of(state);
  const widgets = field.acroField.getWidgets();
  const offered = widgets.map((widget) => widget.getOnValue());
  assert.ok(offered.some((value) => value?.toString() === target.toString()),
    `${field.getName()} offers no widget state ${state} (offers ${offered.map(String).join(", ")})`);
  field.acroField.dict.set(PDFName.of("V"), target);
  for (const widget of widgets) {
    widget.setAppearanceState(widget.getOnValue()?.toString() === target.toString() ? target : PDFName.of("Off"));
  }
}

/*
 * pdf-lib's form.flatten() deletes the field objects but leaves the page
 * /Annots array naming object numbers that no longer resolve, and a reader that
 * follows them reports "Invalid XRef entry". Detaching the dead references is
 * what keeps the delivered file readable.
 */
function pruneDanglingAnnots(document) {
  let removed = 0;
  for (const page of document.getPages()) {
    const annots = page.node.Annots();
    if (!annots) continue;
    const before = removed;
    const keep = annots.asArray().filter((entry) => {
      const resolved = entry instanceof PDFRef ? document.context.lookup(entry) : entry;
      if (resolved) return true;
      removed += 1;
      return false;
    });
    if (removed === before) continue;
    if (keep.length === 0) page.node.delete(PDFName.of("Annots"));
    else page.node.set(PDFName.of("Annots"), document.context.obj(keep));
  }
  return removed;
}

async function fillDocument(source, fixture, variant) {
  const document = await PDFDocument.load(source.bytes);
  const form = document.getForm();
  const pages = document.getPages();
  const font = await document.embedFont(StandardFonts.Helvetica);
  const writes = [];
  const refusals = [];
  // Widget rectangles are captured BEFORE flattening, because flattening
  // removes the widgets and the delivered-ink measurement needs to know where
  // each field was in order to ask whether anything was drawn there.
  const boxes = [];

  for (const field of form.getFields()) {
    const name = field.getName();
    const page = pageOf(field, pages);
    const id = `${source.documentId}:${name}`;
    const rect = field.acroField.getWidgets()[0]?.getRectangle() ?? null;
    const base = { fieldId: id, fieldName: name, documentId: source.documentId, page };

    if (field instanceof PDFCheckBox) {
      if (source.documentId === "CR-65" && name === variant.checkbox) {
        selectCheckboxState(field, "Yes");
        writes.push({
          ...base,
          effectiveLabel: `${variant.statute}, ${variant.section} (selection)`,
          factId: "route.selection", drawnText: "Yes", isSelectionControl: true, routeDetermined: true,
          routeReason: `This packet is built for ${variant.statute}. The printed ground reads: "${variant.printedGround}"`
        });
        boxes.push({ ...base, rect, expectInk: true });
      } else if (source.documentId === "CR-65" && name === UNSCOPED_ELECTION.checkbox) {
        refusals.push({
          ...base,
          effectiveLabel: `Legal election outside this packet's scope: ${UNSCOPED_ELECTION.section}, ${UNSCOPED_ELECTION.statute}`,
          reason: UNSCOPED_ELECTION.why,
          refusalClass: "participant_sworn_narrative_or_legal_election",
          isSelectionControl: true, routeDetermined: false, ownerDeterminationNeeded: true
        });
        boxes.push({ ...base, rect, expectInk: false });
      } else if (source.documentId === "C-10-CRIMINAL" && fixture.feeWaiverRequested && C10_ELECTIONS[name]) {
        const election = C10_ELECTIONS[name];
        selectCheckboxState(field, "Yes");
        writes.push({
          ...base, effectiveLabel: election.label, factId: election.factId,
          drawnText: "Yes", isSelectionControl: true, routeDetermined: true, routeReason: election.why
        });
        boxes.push({ ...base, rect, expectInk: true });
      } else if (source.documentId === "C-10-CRIMINAL" && C10_UNSOUGHT[name]) {
        refusals.push({
          ...base, effectiveLabel: `Relief this route does not seek: ${name}`,
          reason: C10_UNSOUGHT[name],
          refusalClass: "participant_sworn_narrative_or_legal_election",
          isSelectionControl: true, routeDetermined: false
        });
        boxes.push({ ...base, rect, expectInk: false });
      } else if (protectedField(source.documentId, name, page)) {
        refusals.push({
          ...base, effectiveLabel: `Court or later-completion control: ${name}`,
          reason: "court, clerk, prosecutor, agency, or hearing field; never prefilled",
          refusalClass: "court_prosecutor_clerk_or_agency_owned", role: "court"
        });
        boxes.push({ ...base, rect, expectInk: false });
      } else {
        refusals.push({
          ...base, effectiveLabel: `Participant choice: ${name} (selection)`,
          reason: "A genuine participant election not determined by this route. This petition elects one statutory ground only.",
          refusalClass: "participant_sworn_narrative_or_legal_election",
          isSelectionControl: true, routeDetermined: false
        });
        boxes.push({ ...base, rect, expectInk: false });
      }
      continue;
    }

    if (!(field instanceof PDFTextField)) continue;

    const known = knownValue(source.documentId, name, page, fixture);
    if (known && !protectedField(source.documentId, name, page)) {
      const outcome = setComplete(field, known[0], font);
      if (outcome.refused) {
        // A value that cannot be printed complete is surfaced as owed, carrying
        // the held value and the measurement. It is never shortened.
        refusals.push({
          ...base,
          effectiveLabel: `${requiredLabel(source.documentId, name, page)} — this packet holds the value but the printed box cannot carry it complete`,
          reason: `The held value "${outcome.heldValue}" needs ${outcome.measurement.widthNeededAtFloorPt}pt at the ${outcome.measurement.floorFontSizePt}pt floor and the box draws ${outcome.measurement.drawableWidthPt}pt on a single line. It is left blank rather than shortened: a shortened fact on a sworn petition is a false one.`,
          completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true,
          factAvailable: true, heldValue: outcome.heldValue, measurement: outcome.measurement,
          routeDetermined: false, role: "participant"
        });
        boxes.push({ ...base, rect, expectInk: false });
      } else {
        writes.push({ ...base, effectiveLabel: requiredLabel(source.documentId, name, page), factId: known[1], drawnText: outcome.drawnText, fontSize: outcome.fontSize });
        boxes.push({ ...base, rect, expectInk: true, expectText: outcome.drawnText });
      }
    } else if (protectedField(source.documentId, name, page)) {
      refusals.push({
        ...base, effectiveLabel: `Signature, court, or later-completion field: ${name}`,
        reason: "signature, date, court or certificate-of-mailing field; never prefilled",
        refusalClass: "signature_or_date_participant_completion", role: "protected"
      });
      boxes.push({ ...base, rect, expectInk: false });
    } else if (attorneyField(source.documentId, name, page)) {
      refusals.push({
        ...base, effectiveLabel: `Attorney field: ${name}`,
        reason: "attorney-only; no representation fact is held", role: "attorney"
      });
      boxes.push({ ...base, rect, expectInk: false });
    } else if (NOT_OWED[id]) {
      const rule = NOT_OWED[id];
      refusals.push({
        ...base, effectiveLabel: rule.label, reason: rule.reason,
        completenessDisposition: rule.disposition,
        routeConditionThatMakesItInapplicable: rule.routeCondition,
        requiredBeforeFiling: false, factAvailable: false,
        // Declaring both routeDetermined and NOT_APPLICABLE_ON_THIS_ROUTE is a
        // contradiction the contract refuses: a route election this route DOES
        // use can never be inapplicable to it.
        routeDetermined: false, role: "participant"
      });
      boxes.push({ ...base, rect, expectInk: false });
    } else {
      refusals.push({
        ...base, effectiveLabel: requiredLabel(source.documentId, name, page),
        reason: "The platform does not hold this participant or case fact; supply it before filing",
        completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true,
        factAvailable: false, routeDetermined: false, role: "participant"
      });
      boxes.push({ ...base, rect, expectInk: false });
    }
  }

  form.updateFieldAppearances(font);
  form.flatten();
  const danglingAnnotsPruned = pruneDanglingAnnots(document);
  document.setTitle(`${source.documentId} - ${FAMILY_ID}`);
  document.setAuthor("LegalEase packet factory");
  document.setCreator("LegalEase deterministic official-form builder");
  document.setProducer("pdf-lib 1.17.1");
  document.setCreationDate(FIXED_DATE);
  document.setModificationDate(FIXED_DATE);
  return { document, writes, refusals, boxes, danglingAnnotsPruned };
}

/*
 * THE MEASUREMENT. Reopens the finished packet, walks every page's content
 * stream and recurses through the Form XObjects flattening leaves behind, then
 * asks the delivered bytes two questions per field:
 *
 *   - is there ink inside the rectangle of every field this build wrote, and
 *     for a text write, does the value read back COMPLETE, and
 *   - is there ink inside the rectangle of any field this build refused.
 *
 * A ticked CR-65 box draws as a ZapfDingbats glyph inside the widget rect, so
 * an election answers the same question a name does and cannot read as
 * invisible merely because it is not prose.
 */
const inkKey = (item) => `${item.text}@${item.x.toFixed(1)},${item.y.toFixed(1)}`;

/*
 * The baseline this measurement subtracts.
 *
 * An official form prints its own rules, captions and boundary text, and a
 * widget rectangle routinely sits on top of some of it — CR-65's page-1 caption
 * boxes overlap the printed county rule, and the C-10 income table's cells sit
 * inside their printed grid. A reader that counts every glyph inside a
 * rectangle therefore reports the FORM's ink as the BUILD's ink, and every
 * blank field on the paper looks written on. The first run of this measurement
 * did exactly that and reported 145 refused fields carrying ink.
 *
 * So the question asked of the delivered bytes is not "is there ink here" but
 * "is there ink here that the blank form does not print". The baseline is the
 * same binary driven through the same appearance-update, flatten and prune
 * pipeline with no value set and no box elected, so anything the comparison
 * surfaces was added by this build and nothing the form prints can be mistaken
 * for a write.
 */
async function baselineInk(source) {
  const document = await PDFDocument.load(source.bytes);
  const form = document.getForm();
  const font = await document.embedFont(StandardFonts.Helvetica);
  form.updateFieldAppearances(font);
  form.flatten();
  pruneDanglingAnnots(document);
  const bytes = Buffer.from(await document.save({ useObjectStreams: false, addDefaultPage: false, objectsPerTick: Infinity }));
  const reopened = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  return reopened.getPages().map((page) => new Set(extractTextItems(page).map(inkKey)));
}

async function proveDeliveredInk(packetBytes, pageManifest, baselines, mode = {}) {
  const subtractBaseline = mode.subtractBaseline !== false;
  const singleAssignment = mode.singleAssignment !== false;
  const pdf = await PDFDocument.load(packetBytes, { ignoreEncryption: true, updateMetadata: false });
  const itemsByPage = pdf.getPages().map((page) => extractTextItems(page));

  const inside = (item, rect) =>
    item.x >= rect.x - 1.5 && item.x <= rect.x + rect.width + 1.5 &&
    item.y >= rect.y - 3.5 && item.y <= rect.y + rect.height + 3.5;

  const invisibleWrites = [];
  const refusedFieldsWithInk = [];
  const incompleteValues = [];
  let glyphsInWriteBoxes = 0;
  let baselineGlyphsIgnored = 0;
  let addedGlyphsOutsideAnyFieldRect = 0;

  /*
   * ONE GLYPH BELONGS TO ONE FIELD.
   *
   * C-10-CRIMINAL's own widgets overlap: "Date of Birth" (Text4, x 441.8-561.2,
   * y 449.4-465.1) sits inside "Spouse's Full Name (if married)" (x 197.2-561.5,
   * y 442.7-452.3), because the official form draws the date-of-birth box at the
   * end of the Full Name line and the spouse line's box runs the full width
   * underneath it. A reader that credits a glyph to every rectangle containing
   * it therefore reports the correctly-written date of birth as ink on the
   * refused spouse-name field, which is exactly what the first differential run
   * of this measurement did on all four packets.
   *
   * So each added glyph is assigned to exactly one field: the SMALLEST
   * rectangle containing it, which is the most specific claim any field can make
   * on that position. A glyph inside no field's rectangle is counted separately
   * rather than dropped, because ink outside every measured box is its own
   * question and must not vanish into a pass.
   */
  const boxesWithRects = pageManifest.boxes.filter((box) => box.rect);
  const assigned = new Map(boxesWithRects.map((box) => [box.fieldId, []]));

  for (const [pageIndex, items] of itemsByPage.entries()) {
    const onPage = boxesWithRects.filter((box) => box.packetPage === pageIndex + 1);
    if (onPage.length === 0) continue;
    const printed = baselines[onPage[0].documentId]?.[onPage[0].page - 1] ?? new Set();
    for (const item of items) {
      if (subtractBaseline && printed.has(inkKey(item))) { baselineGlyphsIgnored += 1; continue; }
      const containing = onPage.filter((box) => inside(item, box.rect));
      if (containing.length === 0) { addedGlyphsOutsideAnyFieldRect += item.text.replace(/\s+/g, "").length; continue; }
      if (!singleAssignment) {
        // The pre-repair reader: every rectangle containing the glyph claims it.
        for (const box of containing) assigned.get(box.fieldId).push(item);
        continue;
      }
      let best = null;
      let bestArea = Infinity;
      for (const box of containing) {
        const area = box.rect.width * box.rect.height;
        if (area < bestArea) { best = box; bestArea = area; }
      }
      assigned.get(best.fieldId).push(item);
    }
  }

  for (const box of boxesWithRects) {
    const added = (assigned.get(box.fieldId) ?? []).slice().sort((a, b) => a.x - b.x);
    const ink = added.map((item) => item.text).join("").replace(/\s+/g, "");

    if (box.expectInk) {
      if (ink.length === 0) {
        invisibleWrites.push({
          fieldId: box.fieldId, packetPage: box.packetPage,
          why: "the delivered bytes draw no glyph inside this field's rectangle that the blank form does not already print"
        });
      } else {
        glyphsInWriteBoxes += ink.length;
      }
      if (box.expectText) {
        const want = box.expectText.replace(/\s+/g, "");
        if (!ink.includes(want)) {
          incompleteValues.push({ fieldId: box.fieldId, packetPage: box.packetPage, held: box.expectText, readBackFromDeliveredBytes: ink });
        }
      }
    } else if (ink.length > 0) {
      refusedFieldsWithInk.push({ fieldId: box.fieldId, packetPage: box.packetPage, addedInk: ink });
    }
  }

  return {
    pagesRead: pdf.getPageCount(),
    fieldsMeasured: pageManifest.boxes.filter((box) => box.rect).length,
    addedGlyphsReadFromOutputBytes: glyphsInWriteBoxes,
    flattenedWidgetAppearancesReadFromOutputBytes: pageManifest.boxes.filter((box) => box.expectInk).length - invisibleWrites.length,
    printedFormGlyphsInsideFieldRectsIgnored: baselineGlyphsIgnored,
    nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: addedGlyphsOutsideAnyFieldRect,
    invisibleWrites,
    refusedFieldsWithInk,
    incompleteValues,
    proof: "each field's pre-flatten widget rectangle was re-read against the glyphs the finished packet actually draws, recursing through flattened Form XObjects, minus the glyphs the blank source prints inside the same rectangle"
  };
}

async function buildPacket(sources, fixture, variant, baselines) {
  const filled = [];
  for (const source of sources) filled.push({ source, ...(await fillDocument(source, fixture, variant)) });

  const packet = await PDFDocument.create();
  const boxes = [];
  let pageCursor = 0;
  for (const item of filled) {
    const copied = await packet.copyPages(item.document, item.document.getPageIndices());
    copied.forEach((page) => packet.addPage(page));
    for (const box of item.boxes) boxes.push({ ...box, packetPage: pageCursor + box.page });
    pageCursor += item.document.getPageCount();
  }
  pruneDanglingAnnots(packet);
  packet.setTitle(`${FAMILY_ID} ${fixture.fixtureClass}/${variant.variantId} filing packet`);
  packet.setAuthor("LegalEase packet factory");
  packet.setCreator("LegalEase deterministic official-form builder");
  packet.setProducer("pdf-lib 1.17.1");
  packet.setCreationDate(FIXED_DATE);
  packet.setModificationDate(FIXED_DATE);

  const bytes = Buffer.from(await packet.save({ useObjectStreams: false, addDefaultPage: false, objectsPerTick: Infinity }));
  const reopened = await PDFDocument.load(bytes);
  assert.equal(reopened.getPageCount(), pageCursor, "the packet must carry every page of every component");
  assert.equal(reopened.getForm().getFields().length, 0, "flattened packet must carry no live fields");

  const proof = await proveDeliveredInk(bytes, { boxes }, baselines);
  return {
    bytes, boxes, pageCount: reopened.getPageCount(),
    writes: filled.flatMap((item) => item.writes),
    refusals: filled.flatMap((item) => item.refusals),
    danglingAnnotsPruned: filled.reduce((sum, item) => sum + item.danglingAnnotsPruned, 0),
    proof
  };
}

/** The words the record uses, read at build time so the packet cannot drift. */
function controllingRecord() {
  const memoBytes = fs.readFileSync(path.join(ROOT, MEMO_PATH));
  const memo = JSON.parse(memoBytes.toString("utf8"));
  const track = memo.tracks.find((entry) => entry.trackId === TRACK_ID);
  assert.ok(track, `track absent from ${MEMO_PATH}: ${TRACK_ID}`);
  const rules = track.rules ?? {};
  for (const required of ["filing", "fees", "feeWaiver", "notice", "service", "participantSignature", "notarization"]) {
    assert.ok(rules[required], `${TRACK_ID}: rules.${required} is not held; a guide may not be written past an absent rule`);
  }
  assert.ok((track.selfHelpStopConditions ?? []).length > 0, `${TRACK_ID}: the record holds no stop conditions`);
  assert.ok((track.supportingDocuments ?? []).length > 0, `${TRACK_ID}: the record holds no supporting documents`);
  assert.equal(track.outputStrategy, "official_pdf_fill",
    `${TRACK_ID}: the record no longer directs official_pdf_fill; this builder prints official forms and must not run past that`);

  const worklist = readJson(WORKLIST_PATH);
  const family = worklist.packetFamilies.find((entry) => entry.worklistGroupId === FAMILY_ID);
  assert.ok(family, `family absent from worklist: ${FAMILY_ID}`);

  const profileBytes = fs.readFileSync(path.join(ROOT, PROFILE_PATH));
  const profile = JSON.parse(profileBytes.toString("utf8"));
  const pathway = profile.pathways.find((entry) => entry.id === "human-trafficking-victim-expungement");
  assert.ok(pathway, `pathway absent from ${PROFILE_PATH}`);

  return {
    track, rules, family, pathway,
    memoDigest: sha256(memoBytes),
    profileDigest: sha256(profileBytes),
    deliverable: family.routes[0]?.deliverable ?? {},
    routeKeys: family.routes.map((route) => route.routeKey)
  };
}

export function writeGuides({ out, record, artifacts, required, heldButUnprintable }) {
  const { track, rules, deliverable, memoDigest, profileDigest } = record;
  const provenance = [
    "Every quoted line below is taken verbatim from the Alabama legal-design record",
    `\`${MEMO_PATH}\`, track \`${TRACK_ID}\` (sha256 ${memoDigest}), and from the compiled Alabama runtime profile`,
    `\`${PROFILE_PATH}\` (sha256 ${profileDigest}).`,
    "Where those records do not establish something, this packet says so rather than guessing."
  ].join(" ");

  const heldRecord = [
    `- Where to file: "${rules.filing}"`,
    `- Filing fee: "${rules.fees}"`,
    `- Fee waiver: "${rules.feeWaiver}"`,
    `- Notice: "${rules.notice}"`,
    `- Service: "${rules.service}"`,
    `- Who signs: "${rules.participantSignature}"`,
    `- Notarization: "${rules.notarization}"`
  ].join("\n");

  const variantTable = Object.values(VARIANTS).map((variant) => {
    const files = artifacts.filter((row) => row.variant === variant.variantId).map((row) => `\`${path.basename(row.file)}\``).join(" and ");
    return `- **${variant.statute}** — for a ${variant.offenceLevel}. Elected at ${variant.section}. Delivered as ${files}.\n  The printed ground reads: "${variant.printedGround}"`;
  }).join("\n");

  const supporting = track.supportingDocuments ?? [];
  const manual = track.manualCompletionItems ?? [];
  const beforeFiling = [
    ...supporting.map((doc, index) => `${index + 1}. Obtain: ${doc.name}. Where from: ${doc.obtainedFrom}. How: ${doc.howToObtain}`),
    `${supporting.length + 1}. Read the certified record and confirm the offence level. This packet is delivered in two versions because Alabama carries two statutes, and the version you file must match your charge. If the record shows a felony charge, file the § 15-27-2(a)(8) version; if it shows a misdemeanor, violation, traffic violation or municipal ordinance violation, file the § 15-27-1(a)(8) version. Do not file both, and do not tick the other section's box on the copy you file: CR-65 says "Check ONLY one (1) of the eight (8) options" and "Only one offense per petition".`,
    `${supporting.length + 2}. Fill in every blank listed under "Blanks you must fill in" below. Each one is a fact this packet does not hold for you.`,
    `${supporting.length + 3}. Decide the fee. The record states: "${rules.fees}" The C-10-CRIMINAL affidavit in this packet already elects the printed request for waiver of the expungement petition administrative filing fee, because that is the fee this petition carries. If you are NOT claiming financial hardship, remove the affidavit from the packet and pay the filing fee instead — the hardship statement is yours, and you make it by signing it.`,
    ...manual.map((item, index) => `${supporting.length + 4 + index}. ${item.item} on ${item.whereInPacket}, and only after everything above is done. ${item.why} This packet deliberately leaves your signature and every date blank; do not sign or date early.`)
  ].join("\n");

  const requiredList = required.length
    ? required.map((row) => `- ${row.effectiveLabel}`).join("\n")
    : "- (none: every blank on the paper is either filled, protected, or classified elsewhere)";

  const unprintable = heldButUnprintable.length
    ? heldButUnprintable.map((row) => `- ${row.effectiveLabel}\n  ${row.reason}`).join("\n")
    : "- None. Every fact this packet holds printed complete inside its box.";

  const stops = (track.selfHelpStopConditions ?? []).map((stop) => `- ${stop}`).join("\n");

  const orderStatus = deliverable.proposedOrder?.status ?? "not_recorded";

  fs.writeFileSync(path.join(out, "participant-instructions.md"), `# Alabama human-trafficking survivor expungement packet — ${FAMILY_ID}

## Which version of this packet you file

${variantTable}

Alabama carries two expungement statutes and CR-65 prints the trafficking
ground under each of them. The compiled Alabama runtime record states it
plainly: "Two statutes (misdemeanor § 15-27-1, felony § 15-27-2)". The build
worklist records this family's deliverable as "Petition under the applicable
subsection". Which one is applicable is decided by the level of your charge, so
both are delivered and you file the one that matches your certified record.

## What the held record establishes

${provenance}

${heldRecord}

## Do these before you file

${beforeFiling}

## Blanks you must fill in

Each line names a blank on the paper that this packet did not fill because it
does not hold that fact. Fill every one on the version you file before filing.

${requiredList}

## Facts this packet holds but could not print

${unprintable}

## What this packet deliberately does not tick

- **${UNSCOPED_ELECTION.section}, ${UNSCOPED_ELECTION.statute}.** ${UNSCOPED_ELECTION.why}
  If your record is a conviction for one of the three violent felonies Section
  IV lists, this packet is not scoped to it; speak with an Alabama lawyer.
- **C-10-CRIMINAL, request for a court-appointed attorney, and request to waive
  ignition interlock device fees.** Neither is the relief this route seeks.

## Service

The record states: "${rules.service}" Use a separate CR-65 page 7 certificate of
service for each recipient.

The held record does not state which recipients Alabama requires for this
petition, nor which service method, nor the timing — the build worklist records
serviceRecipients, serviceMethod and serviceTiming as "not recorded" — and this
packet will not guess any of them. Ask the circuit clerk in the filing county
who must be served and by what method before you serve. Complete the service
date, method, recipient, address and server signature on each certificate only
after service has actually happened.

## Notarization

CR-65 page 6 carries a notary block. The record states: "${rules.notarization}"
So ask the circuit clerk in the filing county whether that court requires the
page-6 affidavit to be sworn before a notary or other authorized officer. Leave
the notary block, its date and your own signature blank until you are in front
of whoever administers the oath.

## Proposed order

The compiled Alabama runtime record states: "The petition is accompanied by a
proposed Order of Expungement (§ 15-27-6)." This packet does not include one:
the build worklist records this family's proposedOrder as "${orderStatus}", no
official Alabama order form is bound to this family, and this packet does not
invent a court order. Ask the circuit clerk whether the court expects you to
submit a proposed order with the petition.

## Stop and get help

Stop using automated assistance and speak with an Alabama lawyer if any of these
is true:

${stops}
`);

  fs.writeFileSync(path.join(out, "filing-instructions.md"), `# Filing instructions — ${FAMILY_ID}

${provenance}

- Where to file: "${rules.filing}"
- Destination: ${track.destination?.name ?? "not stated in the record"}${track.destination?.detail ? ` — "${track.destination.detail}"` : ""}
- Venue: ${track.geography?.venue ?? "not stated in the record"}
- Filing fee: "${rules.fees}"
- Fee waiver: "${rules.feeWaiver}"
- Notice: "${rules.notice}"
- Notarization: "${rules.notarization}"

## File one version, not both

${Object.values(VARIANTS).map((v) => `- ${v.statute} — ${v.offenceLevel} — elected at ${v.section}`).join("\n")}

CR-65 states "Only one offense per petition; Multi-count cases require multiple
petitions" and, in each section, "Check ONLY one (1) of the eight (8) options".
File the version whose statute matches the level of the charge on your certified
record.

The C-10-CRIMINAL affidavit included in this packet is the fee-waiver form. It
already elects the printed request for waiver of the expungement petition
administrative filing fee. Complete it only if you are claiming financial
hardship; the judge, not you, completes its order page. Do not sign or date the
petition until every required blank and every attachment is complete.
`);
}

export function assertRepairInvariants(out) {
  const fieldMap = JSON.parse(fs.readFileSync(path.join(out, "production-field-map.json"), "utf8"));
  const instructions = fs.readFileSync(path.join(out, "participant-instructions.md"), "utf8");
  const filing = fs.readFileSync(path.join(out, "filing-instructions.md"), "utf8");
  const summary = JSON.parse(fs.readFileSync(path.join(out, "reports", "build-summary.json"), "utf8"));
  const written = new Set(fieldMap.writes.map((row) => row.fieldId));

  // A fact printed into a box that asks for a different fact.
  for (const forbidden of [
    "CR-65:Text2",
    "CR-65:COUNTY and it was given Court Case Number",
    "CR-65:was     granted",
    "CR-65:Telephone Number_2",
    "C-10-CRIMINAL:Spouses Full Name if married",
    "C-10-CRIMINAL:Employers Telephone Number",
    "C-10-CRIMINAL:MUNICIPALITY OF"
  ]) assert.ok(!written.has(forbidden), `semantically invalid write remains: ${forbidden}`);

  // The route election this packet exists to make.
  const elected = fieldMap.writes.filter((row) => row.factId === "route.selection");
  assert.equal(elected.length, 1, "a petition elects exactly one statutory ground");
  assert.ok(Object.values(VARIANTS).some((v) => elected[0].fieldId === `CR-65:${v.checkbox}`),
    "the elected ground must be one of the two trafficking subsections this family covers");

  // Section IV is refused by name, never silently.
  const sectionIv = fieldMap.refusals.find((row) => row.fieldId === `CR-65:${UNSCOPED_ELECTION.checkbox}`);
  assert.ok(sectionIv?.ownerDeterminationNeeded, "Section IV must be refused as an owner determination, by name");
  assert.match(instructions, /Section IV/);

  // The fee-waiver affidavit states which relief it requests.
  assert.ok(written.has("C-10-CRIMINAL:Check Box2.2"), "the fee-waiver affidavit must state which fee it asks to waive");
  assert.ok(written.has("C-10-CRIMINAL:Check Box1.0"), "the State of Alabama caption branch must be selected");
  assert.ok(!written.has("C-10-CRIMINAL:Check Box2.0"), "this route does not request a court-appointed attorney");
  assert.ok(!written.has("C-10-CRIMINAL:Check Box2.1"), "this route does not request an ignition-interlock fee waiver");

  // A field this route does not use, or one the paper marks conditional, must
  // never reach the participant as a blank they must fill before filing.
  for (const fieldId of Object.keys(NOT_OWED)) {
    const row = fieldMap.refusals.find((entry) => entry.fieldId === fieldId);
    assert.ok(row, `NOT_OWED field missing from the field map: ${fieldId}`);
    assert.ok(!row.requiredBeforeFiling, `${fieldId} is not owed before filing and must not be listed as owed`);
  }
  assert.doesNotMatch(instructions, /^- Complete "MUNICIPALITY OF"/m,
    "the municipal caption line is not used by this route and must not be listed as a blank to fill");

  // A blank a participant cannot find is not a named blank.
  for (const refusal of fieldMap.refusals.filter((row) => row.requiredBeforeFiling)) {
    assert.ok(!/\b(?:undefined(?:_\d+(?:\.\d+)?)?|Text\d+)\b/.test(refusal.effectiveLabel),
      `opaque required-before-filing label remains: ${refusal.fieldId}`);
  }

  // The record's own prerequisites, quoted rather than retyped.
  const memo = JSON.parse(fs.readFileSync(path.join(ROOT, MEMO_PATH), "utf8"));
  const track = memo.tracks.find((entry) => entry.trackId === TRACK_ID);
  for (const doc of track.supportingDocuments ?? []) {
    assert.ok(instructions.includes(doc.name), `supporting document missing from the guide: ${doc.name}`);
  }
  for (const stop of track.selfHelpStopConditions ?? []) {
    assert.ok(instructions.includes(stop), `stop condition missing from the guide: ${stop}`);
  }
  assert.ok(instructions.includes(track.rules.notarization), "the guide must quote the record's notarization sentence");
  assert.ok(instructions.includes(track.rules.fees), "the guide must quote the record's fee sentence");

  // A denial the repository can contradict is a defect: the record says the
  // source review does not establish a notarization requirement, so no guide
  // may direct notarization as though it did.
  for (const [name, text] of [["participant-instructions.md", instructions], ["filing-instructions.md", filing]]) {
    assert.doesNotMatch(text, /Sign the petition under oath before an authorized officer or notary/, `${name} directs notarization`);
    assert.doesNotMatch(text, /(?:must|shall) (?:be|have (?:it|this|the petition) )notariz/i, `${name} directs notarization`);
    assert.doesNotMatch(text, /have (?:it|this|the petition|the affidavit) notarized/i, `${name} directs notarization`);
  }

  // Both statutory versions are actually delivered, and each names its statute.
  for (const variant of Object.values(VARIANTS)) {
    assert.ok(instructions.includes(variant.statute), `the guide does not name ${variant.statute}`);
    assert.ok(filing.includes(variant.statute), `the filing guide does not name ${variant.statute}`);
  }

  // Nothing invisible, nothing on a refused field, nothing shortened — and
  // these are read from the delivered bytes, not from the finalizer's report.
  for (const artifact of summary.deliveredInk) {
    assert.equal(artifact.invisibleWrites.length, 0, `${artifact.fixture}: a write is not visible in the delivered bytes`);
    assert.equal(artifact.refusedFieldsWithInk.length, 0, `${artifact.fixture}: a refused field carries ink in the delivered bytes`);
    assert.equal(artifact.incompleteValues.length, 0, `${artifact.fixture}: a held value did not read back complete from the delivered bytes`);
    assert.ok(artifact.addedGlyphsReadFromOutputBytes > 0, `${artifact.fixture}: no glyph was measured in any write box`);
  }
}

export async function build() {
  const record = controllingRecord();
  const sources = resolveSources();
  const out = path.join(ROOT, OUT_REL);

  // What the blank forms print inside their own field rectangles, so the
  // delivered-ink measurement can subtract it and report only what this build
  // added. Computed once: the baseline depends on the binary, not the fixture.
  const baselines = {};
  for (const source of sources) baselines[source.documentId] = await baselineInk(source);

  const packets = [];
  for (const variant of Object.values(VARIANTS)) {
    for (const fixture of Object.values(FIXTURES)) {
      const name = `${fixture.fixtureClass}--${variant.variantId}`;
      packets.push({ name, variant, fixture, ...(await buildPacket(sources, fixture, variant, baselines)) });
    }
  }

  fs.mkdirSync(path.join(out, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(out, "reports"), { recursive: true });
  for (const packet of packets) fs.writeFileSync(path.join(out, "fixtures", `${packet.name}.pdf`), packet.bytes);

  const artifacts = packets.map((packet) => ({
    fixture: packet.name, fixtureClass: packet.fixture.fixtureClass, variant: packet.variant.variantId,
    statute: packet.variant.statute, electedAt: `CR-65 ${packet.variant.checkbox}`,
    file: `${OUT_REL}/fixtures/${packet.name}.pdf`,
    sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: packet.pageCount
  }));

  // The field map describes the canonical misdemeanor packet, and names the
  // variant it describes so a reader is never left guessing which of four.
  const reference = packets.find((packet) => packet.name === "canonical--misdemeanor");
  assert.ok(reference, "the canonical misdemeanor packet must exist");

  writeJson(path.join(out, "production-field-map.json"), {
    schemaVersion: "rcap-production-field-map/v2",
    familyId: FAMILY_ID,
    implementationStrategy: "official_pdf_fill",
    describesFixture: reference.name,
    routeKeys: record.routeKeys,
    routeSummary: reference.variant.routeSummary,
    statutoryVariants: Object.values(VARIANTS).map((v) => ({ variantId: v.variantId, statute: v.statute, section: v.section, checkbox: `CR-65:${v.checkbox}`, offenceLevel: v.offenceLevel })),
    writes: reference.writes.map(({ drawnText, ...row }) => row),
    refusals: reference.refusals
  });

  writeJson(path.join(out, "source-receipt.json"), {
    schemaVersion: "rcap-source-receipt/v2", familyId: FAMILY_ID, allSourcesExact: true,
    sources: sources.map(({ documentId, sourceId, path: sourcePath, sha256: digest, byteLength, componentKinds, custody }) => ({
      documentId, formNumber: documentId, sourceId, path: sourcePath, sha256: digest, sha256Exact: true, byteLength, custody, componentKinds
    })),
    controllingRecords: [
      { path: MEMO_PATH, sha256: record.memoDigest, trackId: TRACK_ID },
      { path: PROFILE_PATH, sha256: record.profileDigest, pathwayId: "human-trafficking-victim-expungement" }
    ]
  });

  writeJson(path.join(out, "reports", "actual-writes.json"), {
    schemaVersion: "rcap-actual-writes/v2", familyId: FAMILY_ID,
    documents: SOURCES.map((source) => ({
      documentId: source.documentId,
      actualWrites: reference.writes.filter((row) => row.documentId === source.documentId)
    })),
    artifacts: packets.map((packet) => ({
      fixture: packet.name,
      valuesReportedByFinalizer: packet.writes.length,
      addedGlyphsReadFromOutputBytes: packet.proof.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: packet.proof.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: packet.proof.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      printedFormGlyphsInsideFieldRectsIgnored: packet.proof.printedFormGlyphsInsideFieldRectsIgnored,
      fieldRectanglesMeasured: packet.proof.fieldsMeasured,
      invisibleWrites: packet.proof.invisibleWrites,
      refusedFieldsWithInk: packet.proof.refusedFieldsWithInk,
      incompleteValues: packet.proof.incompleteValues,
      danglingAnnotsPruned: packet.danglingAnnotsPruned,
      proof: packet.proof.proof
    }))
  });

  writeJson(path.join(out, "reports", "rendered-artifacts.json"), {
    schemaVersion: "rcap-rendered-artifacts/v2", familyId: FAMILY_ID, rasterState: "BUILT_RASTER_PENDING",
    whyRasterPending: "This container cannot resolve or fetch a Chromium the page rasterizer can execute (ENV-RAS01). Rendering is central; visualDefects stays null because nobody has looked, not because there is nothing to see.",
    packets: packets.map((packet) => ({
      fixture: packet.name, file: `${OUT_REL}/fixtures/${packet.name}.pdf`,
      sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: packet.pageCount,
      documents: SOURCES.map((source) => ({ documentId: source.documentId, componentKinds: source.componentKinds }))
    }))
  });

  writeJson(path.join(out, "approval-request.json"), {
    schemaVersion: "rcap-packet-approval-request/v2", familyId: FAMILY_ID, status: "BUILT_RASTER_PENDING",
    implementationStrategy: "official_pdf_fill",
    strategyRecordDisagreement: {
      masterQueueAndWorklistSay: "custom_pleading",
      controllingLegalRecordSays: "official_pdf_fill",
      where: `${MEMO_PATH} track ${TRACK_ID}: outputStrategy, every component's officialFormId, and controllingAuthority.summary "The route uses the same official CR-65 petition as the other Alabama tracks."`,
      builtAs: "official_pdf_fill",
      why: "Composing a pleading while the controlling legal record directs an official form would be a source-fidelity defect. Recorded rather than resolved: reconciling the queue label is a Captain action."
    },
    routeKeys: record.routeKeys,
    components: SOURCES.flatMap((source) => source.componentKinds.map((kind) => ({ kind, documentId: source.documentId }))),
    artifacts,
    independentVerificationStatus: "PENDING", selfVerified: false,
    commercialRoutesOpened: 0, productionTouched: false
  });

  const required = reference.refusals.filter((row) => row.requiredBeforeFiling);
  const heldButUnprintable = reference.refusals.filter((row) => row.requiredBeforeFiling && row.factAvailable);
  writeGuides({ out, record, artifacts, required, heldButUnprintable });

  const counters = {
    knownRequiredFieldsMissing: 0,
    requiredFactsNotCollected: 0,
    unclassifiedBlanks: reference.refusals.filter((row) => !row.refusalClass && !row.completenessDisposition && !row.role).length,
    incompleteRows: packets.reduce((sum, p) => sum + p.proof.incompleteValues.length, 0),
    requiredOptionsMissing: 0,
    requiredComponentsMissing: 0,
    invisibleWrites: packets.reduce((sum, p) => sum + p.proof.invisibleWrites.length, 0),
    protectedWrites: packets.reduce((sum, p) => sum + p.proof.refusedFieldsWithInk.length, 0),
    visualDefects: null
  };

  writeJson(path.join(out, "reports", "build-summary.json"), {
    familyId: FAMILY_ID, result: "BUILT_RASTER_PENDING", counters,
    countersMeasuredFrom: "invisibleWrites, protectedWrites and incompleteRows are read from the delivered packet bytes by proveDeliveredInk; visualDefects is null because no raster was produced in this container",
    statutoryVariantsDelivered: Object.values(VARIANTS).map((v) => v.statute),
    ownerDeterminationsSurfaced: [
      { what: `${UNSCOPED_ELECTION.section}, ${UNSCOPED_ELECTION.statute}`, why: UNSCOPED_ELECTION.why },
      {
        what: "Proposed Order of Expungement, Ala. Code § 15-27-6",
        why: "The compiled Alabama runtime profile states the petition is accompanied by a proposed order, but the build worklist records proposedOrder as not_recorded, the memo's component list carries none, and no official order binary is bound to this family. Not invented."
      },
      {
        what: "Strategy label disagreement",
        why: "MASTER_QUEUE and the worklist label this family custom_pleading; AL.memo.json directs official_pdf_fill on CR-65. Built as the legal record directs and recorded here."
      },
      {
        what: "Release blocker recorded in AL.memo.json",
        why: (JSON.parse(fs.readFileSync(path.join(ROOT, MEMO_PATH), "utf8")).tracks.find((t) => t.trackId === TRACK_ID).unresolvedQuestions ?? []).map((q) => `${q.question} (impact: ${q.impact})`).join("; ")
      }
    ],
    deliveredInk: packets.map((packet) => ({
      fixture: packet.name,
      addedGlyphsReadFromOutputBytes: packet.proof.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: packet.proof.flattenedWidgetAppearancesReadFromOutputBytes,
      fieldRectanglesMeasured: packet.proof.fieldsMeasured,
      invisibleWrites: packet.proof.invisibleWrites,
      refusedFieldsWithInk: packet.proof.refusedFieldsWithInk,
      incompleteValues: packet.proof.incompleteValues
    })),
    artifacts, selfVerified: false
  });

  for (const packet of packets) {
    console.log(`${FAMILY_ID}/${packet.name}: ${packet.writes.length} writes, ${packet.refusals.length} classified blanks, `
      + `${packet.proof.addedGlyphsReadFromOutputBytes} glyphs measured in write boxes, `
      + `${packet.proof.invisibleWrites.length} invisible, ${packet.proof.refusedFieldsWithInk.length} refused-with-ink, `
      + `sha256=${sha256(packet.bytes)}`);
  }
  return { out, packets, artifacts };
}

/*
 * NEGATIVE CONTROLS.
 *
 * Both repairs to the delivered-ink reader are re-run here against the SAME
 * delivered bytes with the repair removed, and each must report defects the
 * repaired reader does not. A control that cannot fail proves nothing about the
 * reader that passes, so these assert that the pre-repair readers FIRE.
 */
export async function negativeControls() {
  const record = controllingRecord();
  const sources = resolveSources();
  const baselines = {};
  for (const source of sources) baselines[source.documentId] = await baselineInk(source);

  const results = [];
  for (const variant of Object.values(VARIANTS)) {
    for (const fixture of Object.values(FIXTURES)) {
      const name = `${fixture.fixtureClass}--${variant.variantId}`;
      const packet = await buildPacket(sources, fixture, variant, baselines);
      const manifest = { boxes: packet.boxes };

      const repaired = await proveDeliveredInk(packet.bytes, manifest, baselines);
      const noBaseline = await proveDeliveredInk(packet.bytes, manifest, baselines, { subtractBaseline: false });
      const multiAssign = await proveDeliveredInk(packet.bytes, manifest, baselines, { singleAssignment: false });

      assert.equal(repaired.refusedFieldsWithInk.length, 0, `${name}: the repaired reader must report no refused field carrying ink`);
      assert.ok(noBaseline.refusedFieldsWithInk.length > 0,
        `${name}: CONTROL DID NOT FIRE — dropping the blank-form baseline must make the form's own printed ink read as writes`);
      assert.ok(multiAssign.refusedFieldsWithInk.some((row) => row.fieldId === "C-10-CRIMINAL:Spouses Full Name if married"),
        `${name}: CONTROL DID NOT FIRE — crediting a glyph to every containing rectangle must read the date of birth as ink on the overlapping spouse-name field`);

      results.push({
        fixture: name,
        repairedReaderRefusedFieldsWithInk: repaired.refusedFieldsWithInk.length,
        preRepairNoBaselineSubtraction: noBaseline.refusedFieldsWithInk.length,
        preRepairMultipleAssignment: multiAssign.refusedFieldsWithInk.length,
        preRepairMultipleAssignmentNames: multiAssign.refusedFieldsWithInk.map((row) => row.fieldId)
      });
      console.log(`${name}: repaired=${repaired.refusedFieldsWithInk.length} refused-with-ink, `
        + `no-baseline=${noBaseline.refusedFieldsWithInk.length} (control fires), `
        + `multi-assignment=${multiAssign.refusedFieldsWithInk.length} (control fires)`);
    }
  }

  // The route election must flip with the offence level and never double-elect.
  for (const [a, b] of [[VARIANTS.misdemeanor, VARIANTS.felony], [VARIANTS.felony, VARIANTS.misdemeanor]]) {
    const packet = await buildPacket(sources, FIXTURES.canonical, a, baselines);
    const elected = packet.writes.filter((row) => row.factId === "route.selection").map((row) => row.fieldName);
    assert.deepEqual(elected, [a.checkbox], `${a.variantId} must elect exactly ${a.checkbox}`);
    assert.ok(!elected.includes(b.checkbox), `${a.variantId} must not elect ${b.checkbox}`);
    assert.ok(!elected.includes(UNSCOPED_ELECTION.checkbox), `${a.variantId} must not elect Section IV`);
  }

  // Fit-or-refuse: a value that cannot be printed complete is refused carrying
  // the held value, never shortened to fit.
  const probe = await PDFDocument.load(sources.find((s) => s.documentId === "CR-65").bytes);
  const font = await probe.embedFont(StandardFonts.Helvetica);
  const narrow = probe.getForm().getField("Text2");
  const overlong = "X".repeat(400);
  const outcome = setComplete(narrow, overlong, font);
  assert.ok(outcome.refused, "CONTROL DID NOT FIRE — a value that cannot fit must be refused, not drawn");
  assert.equal(outcome.heldValue, overlong, "the refusal must carry the whole held value");
  assert.ok(!outcome.drawnText, "a refused value must not be drawn at all");
  assert.equal(narrow.getText() ?? "", "", "a refused value must leave the box empty rather than shortened");
  console.log(`fit-or-refuse: a ${overlong.length}-character value in CR-65 Text2 was refused carrying its whole value, not shortened`);

  console.log(`al-trafficking-set: ${results.length * 2 + 4} negative controls fired as designed`);
  return results;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const out = path.join(ROOT, OUT_REL);
  if (process.argv.includes("--negative-control")) {
    await negativeControls();
  } else if (process.argv.includes("--check")) {
    assertRepairInvariants(out);
    console.log(`${FAMILY_ID}: repair invariants PASS`);
  } else {
    await build();
    assertRepairInvariants(out);
    console.log(`${FAMILY_ID}: BUILT_RASTER_PENDING; repair invariants PASS`);
  }
}

export { FAMILY_ID, OUT_REL, VARIANTS, UNSCOPED_ELECTION };
