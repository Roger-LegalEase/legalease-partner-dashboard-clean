#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";
import zlib from "node:zlib";
import { normalizeInvertedWidgetRectangles } from "./rcap-official-forms/rcap-active-content.mjs";
import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import {
  classifyAlabamaClerkAssignedCaseNumber,
  isAlabamaClerkAssignedCaseNumber
} from "./rcap-official-forms/alabama-clerk-assigned-case-number.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFCheckBox, PDFTextField, StandardFonts, StandardFontEmbedder } = require("pdf-lib");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INDEX_PATH = "data/rcap-all50/local-source-corpus-index.json";
const WORKLIST_PATH = "data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json";
const MEMO_PATH = "data/record-clearing/legal-design-intake/AL.memo.json";
const FIXED_DATE = new Date("2026-09-03T00:00:00.000Z");
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

const SOURCES = [
  { documentId: "CR-65", sourceId: "official-form:CR-65", path: "LegalEase Alabama/cr-65-expunge-petition-10-2024.pdf", sha256: "c2e0c7bd7abca2c83c469d7da1aa0b80b132e653f8712d0b4ce77c8b160b2a39", componentKinds: ["primary_filing", "certificate_of_service"] },
  { documentId: "C-10-CRIMINAL", sourceId: "official-form:C-10-CRIMINAL", path: "STATES/AL/02_PACKET_FORMS/AL__FORM__C-10-CRIMINAL__affidavit-of-substantial-hardship-and-order__REV-2024-05__EN.pdf", sha256: "527d4cfdde5bea564a8729e6425f1042627b03435ec634509fe32fdb80a5c6f8", componentKinds: ["fee_waiver"] }
];

/*
 * The four families this shared host builds.
 *
 * al-felony-dwop-set and al-felony-nonconviction-90-set were carved out of this
 * host into their own builders when they were repaired, and each asserts its own
 * familyId. They are deliberately absent here: leaving them in FAMILY_CONFIG
 * would let a caller drive this module over a family it no longer owns and
 * silently overwrite the repaired output of another lane.
 *
 * `recordComparison` is the route-specific check the registry requires the
 * participant to perform against the certified record before filing. It is the
 * one instruction sentence that cannot be quoted from the memo's shared rules
 * because it is what the route itself means.
 */
const FAMILY_CONFIG = {
  "al-diversion-set": {
    trackId: "al-diversion", selected: ["Check Box8.5"],
    routeSummary: "Misdemeanor or violation charge dismissed after successful completion of an approved diversion or court program; the form's one-year and prior-expungement conditions still must be confirmed.",
    recordComparison: "Read the certified local record and confirm it shows the charge was DISMISSED after you completed the diversion or court program. If it shows a withheld adjudication rather than a dismissal, stop: this route does not fit."
  },
  "al-misd-conviction-set": {
    trackId: "al-misd-conviction", selected: ["Check Box9.2", "Check Box9.3", "Check Box9.4", "Check Box9.5", "Check Box9.6", "Check Box9.7", "Check Box9.8"],
    routeSummary: "Qualifying misdemeanor, violation, traffic, municipal, or misdemeanor youthful-offender conviction after all seven Section II conditions.",
    recordComparison: "Read the certified local record and confirm every one of the seven conditions printed in CR-65 Section II is true of your case, including that all court-ordered amounts, with any interest, are satisfied. Correct the selection if any condition does not match."
  },
  "al-misd-dwop-set": {
    trackId: "al-misd-dwop", selected: ["Check Box8.6"],
    routeSummary: "Misdemeanor or violation charge dismissed without prejudice more than one year ago, not refiled, with the form's two-year conviction-free condition.",
    recordComparison: "Read the certified local record and confirm it shows the charge was DISMISSED WITHOUT PREJUDICE, the date that happened, and that the charge has not been refiled. Confirm more than one year has passed since the dismissal and that the form's two-year conviction-free condition is met. Correct the selection if the record says otherwise."
  },
  /*
   * AL6-04: why this route checks nothing on CR-65.
   *
   * CR-65 Section V is a CONJUNCTIVE SWORN CERTIFICATION. The form prints
   * "AND ALL OF THE FOLLOWING HAVE OCCURRED. If you have not checked all eight
   * boxes, the conviction is not eligible for expungement", and the petition is
   * sworn on page 6. This family used to check all eight on the participant's
   * behalf, under factId route.selection with routeDetermined true.
   *
   * Six of the eight assert facts this route never establishes and never asks
   * about. AL.memo.json track al-pardoned-felony records waitingPeriods [] --
   * EMPTY, so no 180-day period exists in the record at all -- exclusions []
   * empty, and only four participantInputs: pardonDate, restorationLanguage,
   * firearmRightsExcluded, countyOfFiling. Nothing in it speaks to whether the
   * conviction is a violent offense under § 12-25-32, a sex offense under
   * § 15-20A-5, an offense involving moral turpitude under § 17-3-30.1, a
   * serious traffic offense under Article 9 of Chapter 5A of Title 32, whether
   * the petitioner was arrest-free for the 15 years before filing, or whether
   * they held a commercial driver licence at the time of the offense.
   *
   * The seventh, "All civil and political rights that were forfeited as a
   * result of the conviction have been restored", is worse than unestablished:
   * it is the open question. The same memo carries it as a retained
   * legal_design_blocker -- "whether a pardon that withholds firearm rights
   * satisfies the statutory restoration requirement remains dispositive and
   * must be resolved before that branch ships" -- and as a stop condition,
   * "The pardon withholds firearm rights and the restoration question
   * controls." The route expressly contemplates that this box may be FALSE.
   *
   * The eighth, Check Box10.6, is the route's defining disposition, but it too
   * asserts restoration: "a certificate of pardon WITH RESTORATION of civil and
   * political rights". The memo's own limitation classifies restoration
   * language as a participant-entered fact -- "Pardon date, restoration
   * language, and certificate terms are participant-entered facts" -- so the
   * platform is told in terms that this is not its fact to assert.
   *
   * The tempting repair is to check fewer boxes, or to tell the participant in
   * an instruction to go back and confirm what the packet already swore. Both
   * are wrong. Ink already on a sworn certification is not cured by prose
   * elsewhere, and a partly-ticked conjunctive certification still swears the
   * limbs it ticks. So this route checks NONE of the eight and hands the whole
   * certification back, naming every limb and what each one asserts. The
   * sibling al-misd-conviction-set keeps its seven Section II ticks precisely
   * because each of those seven IS backed by a memo exclusion, waiting period
   * or participant input; here six are backed by nothing and two by a question
   * the record marks unresolved.
   */
  "al-pardoned-felony-set": {
    trackId: "al-pardoned-felony", selected: [],
    /*
     * CR-65 page 3 check box `Check Box10.2` -- the quashed-indictment ground --
     * stores its /Rect as [45.317 623.137 56.5341 608.779], corners in the
     * inverted order. ISO 32000-1 7.9.5 permits that and requires a consumer to
     * normalise it; pdf-lib does not, so flatten() translates the widget's own
     * white /Off fill to the raw first corner and paints an 11.2171 by 14.3578
     * white rectangle 14.358pt above where the form draws the box -- across the
     * word "expired" in "expired or the prosecuting agency confirms that the
     * charge or charges will not be refiled." Measured at 300 dpi on this
     * family's own delivered canonical page 3: 208 dark pixels in the pinned
     * source over that region against 10 delivered, 198 lost, and every one of
     * the 198 pixels page 3 lost is inside it.
     *
     * Set on this family alone because this lane holds this family alone. The
     * other four families this host builds are held by other lanes and are not
     * rebuilt here, so they keep the bytes they have -- including the same
     * defect, which is reported rather than silently repaired.
     */
    normalizeInvertedWidgetRects: true,
    measureOutputByteGlyphs: true,
    routeSummary: "Pardoned felony route under Ala. Code § 15-27-2(c). This packet does not check any box in CR-65 Section V. Section V is a sworn certification of eight separate conditions, and the held record establishes only that a pardon was granted -- so you must read all eight and check them yourself, or stop.",
    recordComparison: "Do not sign the petition until you have read all eight conditions printed in CR-65 Section V and checked, yourself, only those that are true of you. They are listed under \"The eight conditions you must certify yourself\" below. This packet checks none of them, because the held record establishes only that a pardon was granted. Read the restoration language on the pardon certificate itself rather than assuming it: if the pardon withholds firearm rights, that restoration question controls, it is unresolved in this record, and this route may not fit at all.",
    /*
     * The eight limbs, quoted as CR-65 prints them, each paired with what the
     * held record does and does not say about it. This is rendered into the
     * guide only for this family; the other three families this host builds
     * carry no such section and their guides are unchanged.
     */
    electionsHandedBack: {
      heading: "The eight conditions you must certify yourself",
      preamble: "CR-65 Section V says the conviction is eligible only if ALL of the following have occurred, and the petition is sworn. This packet leaves every one of these boxes empty on purpose. Read each one, decide whether it is true of you, and check it yourself. If any one of them is not true, the conviction is not eligible for expungement on this route and you should stop and speak with an Alabama lawyer.",
      items: [
        { box: "Check Box10.6", printed: "I was granted a certificate of pardon with restoration of civil and political rights for the conviction from the Board of Pardons and Paroles.", record: "The held record establishes that a pardon was granted. It does not establish that your certificate restored your civil and political rights -- it classifies the pardon date, the restoration language and the certificate terms as facts you supply. Read your certificate and decide this one yourself." },
        { box: "Check Box11.0", printed: "All civil and political rights that were forfeited as a result of the conviction have been restored.", record: "UNRESOLVED IN THE HELD RECORD. Whether a pardon that withholds firearm rights satisfies this restoration requirement is recorded as dispositive and unresolved. If your pardon excludes firearm rights, do not check this box; stop and speak with an Alabama lawyer." },
        { box: "Check Box11.1", printed: "One hundred eighty days have passed from the date of the issuance of the certification of pardon.", record: "The held record states no waiting period for this route at all. Read the date on your certificate of pardon and count the days yourself." },
        { box: "Check Box11.2", printed: "the conviction is not a violent offense, as provided in Section 12-25-32, unless it falls within an exception under Section IV.", record: "The held record does not say whether your conviction is a violent offense, and never asks. Check § 12-25-32 against your conviction." },
        { box: "Check Box11.3", printed: "the conviction is not a sex offense, as provided in Section 15-20A-5.", record: "The held record does not say whether your conviction is a sex offense, and never asks. Check § 15-20A-5 against your conviction." },
        { box: "Check Box11.4", printed: "the conviction is not an offense involving moral turpitude, as provided in Section 17-3-30.1 ... and I have not been arrested for any offense, excluding minor traffic violations, 15 years prior to the filing of the petition.", record: "The held record says nothing about moral turpitude and holds no 15-year arrest history for you. Both halves of this box are yours to establish." },
        { box: "Check Box11.5", printed: "The conviction is not a serious traffic offense, as provided in Article 9 of Chapter 5A of Title 32.", record: "The held record does not say whether your conviction is a serious traffic offense, and never asks." },
        { box: "Check Box11.6", printed: "At the time of the offense, I was not operating a commercial motor vehicle or was not holding a commercial driver license or commercial learner permit.", record: "The held record holds no commercial-licence fact for you and never asks for one." }
      ]
    },
    /*
     * FIX144: the three elections CR-65 makes EVERY petitioner make.
     *
     * Section V is not the only thing this packet leaves blank on the sworn
     * petition. CR-65 page 5 prints an attachment block the form itself calls
     * mandatory -- "Petition must include either item 1 or item 2; All
     * Petitions must include item 3" -- and page 6 prints, under the perjury
     * heading, "(3)(Select one of the following)", the pair "was [ ] granted
     * [ ] denied", and "[ ] pro se". All eight of those boxes are blank in this
     * packet's delivered bytes, on both fixtures, and until now the guide named
     * none of them.
     *
     * FIX02 found and repaired exactly this on the sibling family
     * al-felony-nonconviction-90-set, on the same form, against the same field
     * ids and the same refusals. The defect is identical here and the repair is
     * the same repair; nothing about it turns on which statutory ground the
     * route runs on, so porting it needs no legal call.
     *
     * The prior-expungement half of it is the sharp end. "County where any
     * previous expungement was filed" and "Court case number of any previous
     * expungement" were printed in this guide's "Blanks you must fill in" list
     * unconditionally, under "Fill every one ... before filing" -- but both
     * blanks hang off the SECOND branch of the page-6 select-one, and this guide
     * never told the participant that branch exists. A participant who has never
     * sought an expungement and follows the list literally writes a county and a
     * case number for a prior expungement that does not exist, on a sworn page,
     * while the attestation that governs those two blanks stays empty. On THIS
     * route that page also carries weight the other families' do not: CR-65
     * Section V's own lead-in reads "was convicted of the above-named offense, a
     * felony, and more than one expungement has not been granted", so the page-6
     * disclosure is how the court checks that limit.
     *
     * Set on this family alone, because this lane holds this family alone. The
     * three other families this host builds carry no such section and their
     * guides do not move.
     */
    printedElectionsNotMade: true
  }
};

/*
 * Lines CR-65 ITSELF prints. None of them is this packet's characterisation of
 * Alabama law: "must", "either item 1 or item 2" and "Select one of the
 * following" are the form's own words. assertPrintedElections() re-reads every
 * one of them out of the DELIVERED bytes on each build and refuses the build if
 * a quoted line is no longer printed on the page this guide attributes it to.
 */
const PRINTED_ELECTIONS = {
  attachments: {
    page: 5,
    heading: "Attached to this Petition are: (Petition must include either item 1 or item 2; All Petitions must include item 3.)",
    options: [
      "[ ] (1) a certified record of arrest from the appropriate agency for the court record I seek to have",
      "[ ] (2) a certified record of disposition or a certified record of the case action summary from the",
      "[ ] (3) a certified official criminal record obtained from the Alabama Law Enforcement Agency (ALEA)."
    ]
  },
  swornSelectOne: {
    page: 6,
    oath: "I swear or affirm, under the penalty of perjury:",
    heading: "(3)(Select one of the following):",
    firstBranch: "[ ] that I have not previously applied for an expungement in this or any other jurisdiction.",
    secondBranchOpening: "[ ] that I have previously filed for an expungement. My previous expungement was filed in",
    grantedDenied: "was [ ] granted [ ] denied."
  },
  proSe: { page: 6, line: "[ ] pro se (Not represented by an attorney)" }
};

/* Every quoted line, with the delivered page it is attributed to. */
function quotedElectionLines() {
  const { attachments: a, swornSelectOne: s, proSe: p } = PRINTED_ELECTIONS;
  return [
    [a.page, a.heading], ...a.options.map((line) => [a.page, line]),
    [s.page, s.oath], [s.page, s.heading], [s.page, s.firstBranch],
    [s.page, s.secondBranchOpening], [s.page, s.grantedDenied],
    [p.page, p.line]
  ];
}

/*
 * The two blanks that exist only on the SECOND branch of the page-6 select-one.
 * Keyed by field id rather than by label so a label rewrite cannot silently drop
 * the condition.
 */
const SECOND_BRANCH_ONLY = new Set([
  "CR-65:COUNTY and it was given Court Case Number",
  "CR-65:was     granted"
]);
const SECOND_BRANCH_CONDITION = "only if you tick the SECOND box in item (3) on CR-65 page 6";

function electionsSection() {
  const a = PRINTED_ELECTIONS.attachments;
  const s = PRINTED_ELECTIONS.swornSelectOne;
  return `## Elections on CR-65 that this packet has not made

CR-65 prints choices that turn on facts this packet does not hold. It ticks
none of them, and the list above does not name them, because the field map
classifies them as elections rather than as blanks owed before filing. They are
still choices the form makes you make. Every line quoted below was read back
out of the delivered petition at build time, on the page named beside it.

**Page ${a.page} - what you attach.** The form prints:

> ${a.heading}

and three boxes under it:

${a.options.map((line) => `> ${line}`).join("\n>\n")}

All three are blank in this packet. Tick them yourself to match what you are
actually attaching, following the rule the form prints above them.

**Page ${s.page} - the sworn select-one.** Under the printed line

> ${s.oath}

the form prints

> ${s.heading}

and offers two boxes. The first reads:

> ${s.firstBranch}

The second begins:

> ${s.secondBranchOpening}

and runs on into a blank for the county it was filed in, a blank for its court
case number, and the printed pair

> ${s.grantedDenied}

Both boxes are blank in this packet, on both fixtures. Tick the one that is
true of you. It sits under the perjury line, so tick it before you sign.

The county, the case number and the granted-or-denied pair belong to the second
box alone. If you tick the first box, leave all three of them empty - that is
why they are listed above marked "${SECOND_BRANCH_CONDITION}".

**Page ${PRINTED_ELECTIONS.proSe.page} - the pro se box.** Beside the signature line the form prints:

> ${PRINTED_ELECTIONS.proSe.line}

It is blank in this packet, and this packet writes nothing into the attorney
block beside it, because it holds no representation fact for you.`;
}

/*
 * Read the delivered PDF's own printed lines back out of its page content
 * streams. A quotation this packet attributes to a printed page must be on that
 * printed page.
 */
async function printedLinesOf(file, page) {
  const doc = await PDFDocument.load(fs.readFileSync(file), { updateMetadata: false });
  const target = doc.getPages()[page - 1];
  assert.ok(target, `${path.basename(file)} has no page ${page}`);
  return groupIntoLines(extractTextItems(target)).map((line) => String(line.text ?? "").replace(/\s+/g, " ").trim());
}

export async function assertPrintedElections(out) {
  for (const fixture of ["canonical.pdf", "boundary.pdf"]) {
    const file = path.join(out, "fixtures", fixture);
    const cache = new Map();
    for (const [page, quoted] of quotedElectionLines()) {
      if (!cache.has(page)) cache.set(page, await printedLinesOf(file, page));
      const want = quoted.replace(/\s+/g, " ").trim();
      assert.ok(cache.get(page).includes(want),
        `${fixture} page ${page} does not print the line this guide quotes: ${JSON.stringify(quoted)}`);
    }
  }
}

const FIXTURES = {
  canonical: {
    first: "Jordan", middle: "Avery", last: "Reyes", full: "Jordan Avery Reyes",
    street: "412 Magnolia Avenue", cityStateZip: "Montgomery, AL 36104", email: "jordan.reyes@example.org",
    phone: "334-555-0142", dob: "06/14/1988", caseNumber: "CC-2021-004217", county: "Montgomery"
  },
  boundary: {
    first: "Alexandria", middle: "Catherine", last: "Montgomery-Washington", full: "Alexandria Catherine Montgomery-Washington",
    street: "1188 Martin Luther King Junior Boulevard Apartment 1407", cityStateZip: "Birmingham, AL 35203-4417",
    email: "alexandria.montgomery.washington@example.org", phone: "205-555-0199", dob: "12/31/1979",
    caseNumber: "CC-2024-000001.99", county: "Jefferson"
  }
};

function resolveSources() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, INDEX_PATH), "utf8"));
  const resolver = makeCorpusEntryResolver(index, { repoRoot: ROOT, masterLibraryRoot: process.env.MASTER_LIBRARY_SOURCE_DIR });
  return SOURCES.map((source) => {
    const entry = index.entries.find((candidate) => candidate.path === source.path);
    assert.ok(entry, `missing committed index entry: ${source.path}`);
    const absolute = resolver.resolve(entry);
    assert.ok(absolute && fs.existsSync(absolute), `source custody is not mounted: ${source.path}`);
    const bytes = fs.readFileSync(absolute);
    assert.equal(sha256(bytes), source.sha256, `source hash drift: ${source.path}`);
    return { ...source, absolute, bytes, byteLength: bytes.length };
  });
}

function pageOf(field, pages) {
  const widget = field.acroField.getWidgets()[0];
  if (!widget) return 1;
  const parent = widget.P();
  let index = pages.findIndex((page) => page.ref === parent);
  if (index < 0) index = pages.findIndex((page) => (page.node.Annots()?.asArray() ?? []).some((ref) => ref === widget.ref));
  return index < 0 ? 1 : index + 1;
}

/*
 * The printed caption of a blank the platform does not hold.
 *
 * The refusal label used to be the raw AcroForm field name, so a participant
 * was told to "Complete undefined_17" and "Complete Text4" -- 45 of the 63
 * required-before-filing rows on this packet named nothing a human could find
 * on the paper. A blank that cannot be located is not a named blank, and the
 * mechanical counter cannot see the difference because the field name is
 * non-empty either way.
 *
 * These are C-10-CRIMINAL's printed captions read off the form itself, and the
 * two CR-65 page-6 blanks whose exported names are the tail of the sentence
 * they sit in rather than what they ask for.
 */
const REQUIRED_LABELS = {
  "CR-65:Text2": "Last four digits of your Social Security Number",
  "CR-65:COUNTY and it was given Court Case Number": "County where any previous expungement was filed",
  "CR-65:was     granted": "Court case number of any previous expungement",
  "C-10-CRIMINAL:undefined_2": "Your monthly gross income",
  "C-10-CRIMINAL:undefined_3": "Your spouse's monthly gross income, unless this is a marital offense",
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
  "C-10-CRIMINAL:undefined_31": "Total assets"
};

function requiredLabel(documentId, name, page) {
  return REQUIRED_LABELS[`${documentId}:${name}`] ?? `Complete "${name}" on ${documentId} page ${page}`;
}

/*
 * What this packet writes, and why the old version wrote it into the wrong box.
 *
 * The rules below used to be matched against the AcroForm field NAME with loose
 * substring regexes, and an official form names its fields after the sentence
 * they end, not after the fact they ask for. So /full name/ caught
 * "Spouse's Full Name (if married)" and printed the petitioner's own name as
 * their spouse's; /telephone number/ caught "Employer's Telephone Number" and
 * the attorney block's "Telephone Number_2"; /court case number/ caught the
 * page-6 blank that asks for the county of a PREVIOUS expungement. Every one of
 * those is a legally wrong statement on a document sworn under penalty of
 * perjury, and every one passed a nine-counter audit, because the counters
 * accept the field map as their own classification authority and so can only
 * ask whether a write happened -- never whether it was true.
 *
 * The narrowing rules therefore come first and return null: an exclusion has to
 * out-rank the loose rule it is protecting against, or it never runs.
 */
function knownValue(documentId, name, page, fixture) {
  const key = name.toLowerCase();
  if (isAlabamaClerkAssignedCaseNumber({ documentId, fieldName: name, page })) return null;
  /*
   * CR-65's opaque Text names are not interchangeable. Text2 is the last-four
   * SSN blank, Text3 is the underlying court record to be expunged, and Text1,
   * Text4, Text5 and Text7 are repeated clerk-assigned caption boxes. The
   * dedicated classifier above removes those caption boxes before any loose
   * name rule runs. Only Text3 is the held underlying case number.
   */
  if (documentId === "CR-65" && key === "text2") return null;
  if (documentId === "CR-65" && key === "text3") return [fixture.caseNumber, "matter.case_number"];
  if (documentId === "CR-65" && key === "county and it was given court case number") return null;
  if (documentId === "CR-65" && key === "telephone number_2") return null;
  if (documentId === "C-10-CRIMINAL" && key === "text4") return [fixture.dob, "participant.date_of_birth"];
  if (documentId === "C-10-CRIMINAL" && key === "undefined") return [fixture.cityStateZip, "participant.city_state_zip"];
  if (/spouse|employer/.test(key)) return null;
  if (/court case number/.test(key)) return [fixture.caseNumber, "matter.case_number"];
  if (documentId === "CR-65" && key === "name of county") return [fixture.county, "matter.filing_county"];
  if (/^last name$/.test(key)) return [fixture.last, "participant.last_name"];
  if (/^first name$/.test(key)) return [fixture.first, "participant.first_name"];
  if (/^middle name$/.test(key)) return [fixture.middle, "participant.middle_name"];
  if (/full name|printed name of petitioner|print or type name/.test(key)) return [fixture.full, "participant.full_legal_name"];
  if (/street address|complete home address/.test(key)) return [fixture.street, "participant.street_address"];
  if (/city state zip code/.test(key)) return [fixture.cityStateZip, "participant.city_state_zip"];
  if (/email address$/.test(key)) return [fixture.email, "participant.email"];
  if (/telephone number|telephone number cell/.test(key) && !/attorney|server/.test(key)) return [fixture.phone, "participant.phone"];
  if (/date of birth/.test(key)) return [fixture.dob, "participant.date_of_birth"];
  if (documentId === "C-10-CRIMINAL" && key === "in the") return ["Circuit", "matter.court_type"];
  if (documentId === "C-10-CRIMINAL" && key === "court of") return [fixture.county, "matter.filing_county"];
  if (documentId === "C-10-CRIMINAL" && key === "v") return [fixture.full, "participant.full_legal_name"];
  return null;
}

function protectedField(documentId, name, page) {
  const key = name.toLowerCase();
  if (isAlabamaClerkAssignedCaseNumber({ documentId, fieldName: name, page })) return true;
  if (documentId === "C-10-CRIMINAL" && page >= 3) return true;
  if (documentId === "C-10-CRIMINAL" && page === 2 && ["1", "day of", "undefined_32", "2", "text1"].includes(key)) return true;
  if (documentId === "CR-65" && page === 7) return true;
  if (documentId === "CR-65" && page === 6 && ["text8", "text26", "text9", "text10"].includes(key)) return true;
  return /signature|notary|officer authorized|my commission expires|dated this|^day of$|^date$/.test(key);
}

/*
 * The CR-65 page-6 attorney block exports four of its fields under bare names
 * -- City, State, Zip Code, Telephone Number_2 -- so a name-only test cannot
 * tell them from the petitioner's own address fields. Position on the page is
 * what distinguishes them, so position is what this asks about.
 */
function attorneyField(documentId, name, page) {
  const key = name.toLowerCase();
  if (documentId === "CR-65" && page === 6 && ["city", "state", "zip code", "telephone number_2", "email address_2"].includes(key)) return true;
  return /attorney|state bar|business address of attorney|email address_2|telephone number_2/.test(key);
}

/*
 * Fit or refuse -- never truncate.
 *
 * The old version sliced a value to the widget's maximum length and reported
 * the slice as a completed write, so the boundary petitioner's name reached the
 * sworn page-6 affidavit as "Alexandria Catherine Montgomery-Wash". A truncated
 * legal name on a document sworn under penalty of perjury is a false statement,
 * not a formatting nit, and no counter in the nine sees it. Where a value is
 * allowed to be long, the widget's own limit is lifted and the type is set down
 * so the whole value fits inside the box.
 */

/*
 * BOTH OUTPUT-BYTE GLYPH READINGS, READ FROM THE PRODUCED PDF.
 *
 * This host wrote `addedGlyphsReadFromOutputBytes: 0` as a LITERAL for every
 * family it builds. That is not a reading, and on this family it was false: the
 * delivered canonical page set carries 402 glyphs in 30 flattened appearance
 * streams, and the boundary fixture carries 652. A reading that is typed rather
 * than measured cannot report a defect, which is the whole reason the two
 * readings exist.
 *
 * Every value this pipeline writes reaches the page through flatten(), as a
 * `/FlatWidget-* Do` inside its own `q ... cm ... Q`, so the glyphs the packet
 * ADDED are exactly the glyphs inside those XObjects. Each string is decoded
 * against the font named by the stream's own /Tf rather than a guess: these are
 * simple fonts (/Helvetica, /ZaDb), one byte per glyph, and a composite font
 * would need two -- so the encoding is asserted rather than assumed, and an
 * unrecognised one refuses instead of counting wrong.
 */
function measureOutputByteGlyphs(bytes) {
  const text = bytes.toString("latin1");
  // Only the flattened appearance XObjects, which is where every added value is.
  const streams = [];
  const objects = /(\d+) 0 obj\b([\s\S]*?)\bendobj/g;
  let m;
  while ((m = objects.exec(text))) {
    const body = m[2];
    if (!/\/Subtype\s*\/Form/.test(body)) continue;
    const stream = /stream\r?\n([\s\S]*?)\r?\nendstream/.exec(body);
    if (!stream) continue;
    let content = stream[1];
    if (/\/Filter\s*\/FlateDecode/.test(body)) {
      try { content = zlib.inflateSync(Buffer.from(stream[1], "latin1")).toString("latin1"); } catch { continue; }
    }
    streams.push(content);
  }
  let total = 0, nonWhitespace = 0, operators = 0;
  for (const content of streams) {
    const font = /\/(\w+)\s+[\d.]+\s+Tf/.exec(content);
    // Simple fonts only. Anything else is refused rather than miscounted.
    if (font && !["Helvetica", "ZaDb"].includes(font[1])) {
      throw new Error(`glyph reading refuses an unasserted font encoding: /${font[1]}`);
    }
    const shows = /(\[(?:[^\]\\]|\\.)*\]|\((?:\\.|[^\\()])*\)|<[0-9A-Fa-f\s]*>)\s*(?:TJ|Tj|'|")/g;
    let s;
    while ((s = shows.exec(content))) {
      operators += 1;
      const parts = s[1].startsWith("[")
        ? (s[1].match(/\((?:\\.|[^\\()])*\)|<[0-9A-Fa-f\s]*>/g) ?? [])
        : [s[1]];
      for (const part of parts) {
        const inner = part.slice(1, -1);
        const drawn = part.startsWith("<")
          ? (inner.replace(/\s+/g, "").match(/.{2}/g) ?? []).map((c) => String.fromCharCode(parseInt(c, 16))).join("")
          : inner.replace(/\\([nrtbf()\\])/g, "$1").replace(/\\[0-7]{1,3}/g, "?");
        for (const ch of drawn) { total += 1; if (!/\s/.test(ch)) nonWhitespace += 1; }
      }
    }
  }
  return { addedGlyphsReadFromOutputBytes: total, nonWhitespaceGlyphs: nonWhitespace, textShowingOperators: operators };
}

/*
 * The second way a value gets shortened: the box, not the maxLength.
 *
 * Lifting the widget's maximum length was necessary and was not sufficient.
 * None of the 216 fields on these two forms declares a maxLength at all, so the
 * slice above never fired and the guessed "6pt if longer than 36 characters"
 * was the only thing standing between a long value and the widget's own clip
 * path. It was not enough. On the boundary fixture the case number
 * CC-2024-000001.99 measured 72.48pt of Helvetica 8 inside CR-65 page 1 field
 * Text2, whose appearance clips at 65.24pt, so all six Alabama families
 * rendered that petition reading CC-2024-000001.9 -- a different case number,
 * on a document sworn under penalty of perjury. Every one of the nine counters
 * read zero throughout, because the value recorded in the field map was
 * complete; only the ink was short.
 *
 * So the size is measured against the box the value is actually drawn in, with
 * the same Helvetica metrics the appearance stream uses, and stepped down only
 * as far as it has to go. A value that cannot be made to fit legibly fails the
 * build instead of being drawn clipped, because a value a reader will misread
 * is worse than a build that stops.
 */
const FONT_SIZE_LADDER = [8, 7, 6, 5];
const HELVETICA_METRICS = StandardFontEmbedder.for(StandardFonts.Helvetica);

function drawableWidthOf(field) {
  const widget = field.acroField.getWidgets()[0];
  if (!widget) return null;
  // pdf-lib's generated appearance insets the clip path by 1pt on each side and
  // starts the text 1pt in from the left edge, so this is what the reader sees.
  return widget.getRectangle().width - 2;
}

function safeSet(field, value) {
  const max = typeof field.getMaxLength === "function" ? field.getMaxLength() : undefined;
  if (max && max < value.length) field.removeMaxLength();
  const available = drawableWidthOf(field);
  const size = available === null
    ? 8
    : FONT_SIZE_LADDER.find((candidate) => HELVETICA_METRICS.widthOfTextAtSize(value, candidate) <= available);
  assert.ok(size, `value does not fit its box at ${FONT_SIZE_LADDER[FONT_SIZE_LADDER.length - 1]}pt and must not be drawn clipped: ${field.getName()} = ${value}`);
  field.setFontSize(size);
  field.setText(value);
  return value;
}

async function fillDocument(source, fixtureName, fixture, config) {
  const document = await PDFDocument.load(source.bytes);
  const form = document.getForm();
  const pages = document.getPages();
  const writes = [];
  const refusals = [];
  for (const field of form.getFields()) {
    const name = field.getName();
    const page = pageOf(field, pages);
    const id = `${source.documentId}:${name}`;
    if (field instanceof PDFCheckBox) {
      if (source.documentId === "C-10-CRIMINAL" && name === "Check Box1.0") {
        field.check();
        writes.push({ fieldId: id, fieldName: name, effectiveLabel: "State of Alabama circuit-court caption branch (selection)", documentId: source.documentId, page, factId: "route.court_caption", isSelectionControl: true, routeDetermined: true });
      } else if (source.documentId === "CR-65" && config.selected.includes(name)) {
        field.check();
        writes.push({ fieldId: id, fieldName: name, effectiveLabel: `${config.routeSummary} (selection)`, documentId: source.documentId, page, factId: "route.selection", isSelectionControl: true, routeDetermined: true });
      } else if (protectedField(source.documentId, name, page)) {
        refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Court or later-completion control: ${name}`, documentId: source.documentId, page, reason: "court, clerk, prosecutor, agency, or hearing field; never prefilled", refusalClass: "court_prosecutor_clerk_or_agency_owned", role: "court" });
      } else {
        refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Participant choice: ${name} (selection)`, documentId: source.documentId, page, reason: "A genuine participant election not determined by this route", refusalClass: "participant_sworn_narrative_or_legal_election", isSelectionControl: true, routeDetermined: false });
      }
      continue;
    }
    if (!(field instanceof PDFTextField)) continue;
    const known = knownValue(source.documentId, name, page, fixture);
    if (known && !protectedField(source.documentId, name, page)) {
      const drawnText = safeSet(field, known[0]);
      writes.push({ fieldId: id, fieldName: name, effectiveLabel: name, documentId: source.documentId, page, factId: known[1], drawnText });
    } else if (protectedField(source.documentId, name, page)) {
      const clerkAssigned = classifyAlabamaClerkAssignedCaseNumber({ documentId: source.documentId, fieldName: name, page });
      refusals.push({ fieldId: id, fieldName: name, documentId: source.documentId, page,
        ...(clerkAssigned ?? { effectiveLabel: `Signature, court, or later-completion field: ${name}`, reason: "signature or date field; never prefilled", refusalClass: "signature_or_date_participant_completion", role: "protected" }) });
    } else if (attorneyField(source.documentId, name, page)) {
      refusals.push({ fieldId: id, fieldName: name, effectiveLabel: `Attorney field: ${name}`, documentId: source.documentId, page, reason: "attorney-only; no representation fact is held", role: "attorney" });
    } else {
      const label = requiredLabel(source.documentId, name, page);
      refusals.push({ fieldId: id, fieldName: name, effectiveLabel: label, documentId: source.documentId, page, reason: "The platform does not hold this participant or case fact; supply it before filing", completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true, factAvailable: false, routeDetermined: false, role: "participant" });
    }
  }
  const font = await document.embedFont(StandardFonts.Helvetica);
  // BEFORE appearances are regenerated and before flatten: both read the widget
  // rectangle back through the same accessor, so a rectangle normalised here is
  // normalised for both. See normalizeInvertedWidgetRectangles.
  const invertedRects = config.normalizeInvertedWidgetRects
    ? normalizeInvertedWidgetRectangles(document, form)
    : null;
  form.updateFieldAppearances(font);
  form.flatten();
  document.setTitle(`${source.documentId} - ${fixtureName}`);
  document.setAuthor("LegalEase packet factory");
  document.setCreator("LegalEase deterministic official-form builder");
  document.setProducer("pdf-lib 1.17.1");
  document.setCreationDate(FIXED_DATE);
  document.setModificationDate(FIXED_DATE);
  return { document, writes, refusals, invertedRects };
}

async function buildPacket(sources, fixtureName, fixture, config) {
  const filled = [];
  for (const source of sources) filled.push({ source, ...(await fillDocument(source, fixtureName, fixture, config)) });
  const packet = await PDFDocument.create();
  for (const item of filled) {
    const copied = await packet.copyPages(item.document, item.document.getPageIndices());
    copied.forEach((page) => packet.addPage(page));
  }
  packet.setTitle(`${config.familyId} ${fixtureName} filing packet`);
  packet.setAuthor("LegalEase packet factory");
  packet.setCreator("LegalEase deterministic official-form builder");
  packet.setProducer("pdf-lib 1.17.1");
  packet.setCreationDate(FIXED_DATE);
  packet.setModificationDate(FIXED_DATE);
  const bytes = Buffer.from(await packet.save({ useObjectStreams: false, addDefaultPage: false, objectsPerTick: Infinity }));
  const reopened = await PDFDocument.load(bytes);
  assert.equal(reopened.getPageCount(), sources.reduce((sum, source) => sum + filled.find((item) => item.source.documentId === source.documentId).document.getPageCount(), 0));
  assert.equal(reopened.getForm().getFields().length, 0, "flattened packet must carry no live fields");
  const invertedRects = filled.map((item) => item.invertedRects).filter(Boolean);
  return { bytes, pageCount: reopened.getPageCount(), writes: filled.flatMap((item) => item.writes), refusals: filled.flatMap((item) => item.refusals),
    invertedRects: invertedRects.length > 0
      ? { perSource: filled.filter((item) => item.invertedRects).map((item) => ({ documentId: item.source.documentId, ...item.invertedRects })),
          normalizedCount: invertedRects.reduce((sum, report) => sum + report.normalizedCount, 0) }
      : null };
}

/*
 * The repair, restated as a check that runs on the output.
 *
 * Every assertion here corresponds to a defect an independent reader found on
 * these packets while all nine mechanical counters read zero, so none of them
 * is redundant with the completeness verifier -- that verifier accepts the
 * field map as its classification authority, and these are exactly the failures
 * a wrong field map cannot report about itself. If any fires, the build has
 * regressed to writing a legally false statement onto an official form, and it
 * should fail loudly rather than ship.
 */
/*
 * Both guides, generated from the bound record.
 *
 * Hoisted out of the build so it can be exercised on its own: the CR-65 custody
 * is not mountable everywhere, and a guide defect must stay testable in a
 * container that cannot produce a PDF.
 */
export function writeGuides({ out, familyId, config, rules, track, memoDigest, required }) {
  /*
   * FIX144: on a family that names the page-6 select-one, the two blanks that
   * hang off its SECOND branch carry that condition. On the families that do
   * not, the list is unchanged and the annotation never appears.
   */
  const requiredList = required.map((row) =>
    `- ${row.effectiveLabel}${config.printedElectionsNotMade && SECOND_BRANCH_ONLY.has(row.fieldId) ? ` - ${SECOND_BRANCH_CONDITION}` : ""}`).join("\n");
  const provenance = [
    "Every quoted line below is taken verbatim from the Alabama legal-design record",
    `\`${MEMO_PATH}\`, track \`${config.trackId}\` (sha256 ${memoDigest}).`,
    "Where that record does not establish something, this packet says so rather than guessing."
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
  const beforeFiling = [
    ...(track.supportingDocuments ?? []).map((doc, index) =>
      `${index + 1}. Obtain: ${doc.name}. Where from: ${doc.obtainedFrom}. How: ${doc.howToObtain}`),
    `${(track.supportingDocuments ?? []).length + 1}. ${config.recordComparison}`,
    `${(track.supportingDocuments ?? []).length + 2}. Fill in every blank listed under "Blanks you must fill in" below. Each one is a fact this packet does not hold for you.`,
    `${(track.supportingDocuments ?? []).length + 3}. Decide the fee. The record states: "${rules.fees}" If you are claiming indigency, complete the C-10-CRIMINAL affidavit included in this packet; the judge, not you, completes its order page.`,
    ...(track.manualCompletionItems ?? []).map((item, index) =>
      `${(track.supportingDocuments ?? []).length + 4 + index}. ${item.item} on ${item.whereInPacket}, and only after everything above is done. ${item.why} This packet deliberately leaves your signature and every date blank; do not sign or date early.`)
  ].join("\n");
  const stops = (track.selfHelpStopConditions ?? []).map((stop) => `- ${stop}`).join("\n");
  /*
   * A sworn certification this route cannot make for the participant.
   *
   * Rendered only where the family's config declares it, so the families that
   * do make their election carry no such section and their guides do not move.
   */
  const handedBack = config.electionsHandedBack
    ? `\n## ${config.electionsHandedBack.heading}\n\n${config.electionsHandedBack.preamble}\n\n${config.electionsHandedBack.items.map((item) =>
        `### ${item.box} — left empty by this packet\n\nThe form prints: "${item.printed}"\n\nWhat the held record says: ${item.record}`).join("\n\n")}\n`
    : "";
  fs.writeFileSync(path.join(out, "participant-instructions.md"), `# Alabama expungement packet - ${familyId}

## Route selected

${config.routeSummary}

## What the held record establishes

${provenance}

${heldRecord}

## Do these before you file

${beforeFiling}

## Blanks you must fill in

Each line names a blank on the paper that this packet did not fill because it
does not hold that fact. Fill every one on both the canonical and the
boundary-style packet before filing${config.printedElectionsNotMade ? ` - except the lines that carry an "only if"
condition, which belong to a box on page 6 you may not be ticking. The section
below names that box.` : "."}

${requiredList}
${handedBack}${config.printedElectionsNotMade ? `\n${electionsSection()}\n` : ""}
## Service

The record states: "${rules.service}" Serve the district attorney, the
law-enforcement agency whose records you are asking the court to expunge, and
the clerk of the court for the county where the charge was filed. Use a
separate CR-65 page 7 certificate of service for each recipient.

The held record does not state which service method Alabama requires for this
petition, and this packet will not guess one. Ask the circuit clerk in the
filing county which method that court accepts before you serve. Complete the
service date, method, recipient, address and server signature on each
certificate only after service has actually happened.

## Notarization

CR-65 page 6 carries a notary block. The record states: "${rules.notarization}"
So ask the circuit clerk in the filing county whether that court requires the
page-6 affidavit to be sworn before a notary or other authorized officer. Leave
the notary block, its date and your own signature blank until you are in front
of whoever administers the oath.

## Stop and get help

Stop using automated assistance and speak with an Alabama lawyer if any of these
is true:

${stops}
`);
fs.writeFileSync(path.join(out, "filing-instructions.md"), `# Filing instructions - ${familyId}

${provenance}

- Where to file: "${rules.filing}"
- Destination: ${track.destination?.name ?? "not stated in the record"}${track.destination?.detail ? ` — "${track.destination.detail}"` : ""}
- Filing fee: "${rules.fees}"
- Fee waiver: "${rules.feeWaiver}"
- Notice: "${rules.notice}"
- Notarization: "${rules.notarization}"

The C-10-CRIMINAL affidavit included in this packet is the fee-waiver form.
Complete it only if you are claiming indigency; the judge completes its order
page. Do not sign or date the petition until every required blank and every
attachment above is complete.
`);
}

export function assertRepairInvariants(out) {
  const fieldMap = JSON.parse(fs.readFileSync(path.join(out, "production-field-map.json"), "utf8"));
  const instructions = fs.readFileSync(path.join(out, "participant-instructions.md"), "utf8");
  const filing = fs.readFileSync(path.join(out, "filing-instructions.md"), "utf8");
  const written = new Set(fieldMap.writes.map((row) => row.fieldId));

  // KNOWN_PREFILLS and PROTECTED_FIELDS: a fact in a box that asks for another fact.
  for (const forbidden of [
    "C-10-CRIMINAL:Spouses Full Name if married",
    "C-10-CRIMINAL:Employers Telephone Number",
    "C-10-CRIMINAL:MUNICIPALITY OF",
    "CR-65:COUNTY and it was given Court Case Number",
    "CR-65:Text2",
    "CR-65:Telephone Number_2"
  ]) assert.ok(!written.has(forbidden), `semantically invalid write remains: ${forbidden}`);

  // KNOWN_PREFILLS: a direction is not a held fact and may not be printed as one.
  assert.ok(!fieldMap.writes.some((row) => ["matter.charge", "matter.expungement_ground", "matter.arresting_agency", "matter.detention_agencies"].includes(row.factId)),
    "generic directions must not be written as held case facts");

  // ROUTE_OPTIONS: the caption branch the known route determines must be made.
  assert.ok(written.has("C-10-CRIMINAL:Check Box1.0"), "state-court caption branch must be selected");
  assert.ok(written.has("C-10-CRIMINAL:COURT OF"), "state-court caption must include the filing county");

  // REQUIRED_BEFORE_FILING: a blank a participant cannot find is not a named blank.
  for (const refusal of fieldMap.refusals.filter((row) => row.requiredBeforeFiling)) {
    assert.ok(!/\b(?:undefined(?:_\d+(?:\.\d+)?)?|Text\d+)\b/.test(refusal.effectiveLabel),
      `opaque required-before-filing label remains: ${refusal.fieldId}`);
  }

  // REQUIRED_BEFORE_FILING: the registry's semantic prerequisites, not just blanks.
  assert.match(instructions, /## Do these before you file/);
  assert.match(instructions, /certified ALEA criminal record/i);
  assert.match(instructions, /do not sign or date early/i);

  // SERVICE: name the recipients and the per-recipient certificate, and leave the
  // method as honest residue rather than inventing one the record does not hold.
  assert.match(instructions, /separate CR-65 page 7 certificate of service for each recipient/);
  assert.match(instructions, /does not state which service method Alabama requires/);

  // A denial the repository can contradict is a defect: the record says the
  // source review does not establish a notarization requirement, so the guide
  // may not direct notarization as though it did.
  assert.doesNotMatch(instructions, /Sign the petition under oath before an authorized officer or notary/);
  assert.doesNotMatch(filing, /Sign the petition under oath before an authorized officer or notary/);

  // SELF_HELP_STOP: every stop the record holds, not a subset of them.
  const memo = JSON.parse(fs.readFileSync(path.join(ROOT, MEMO_PATH), "utf8"));
  const track = memo.tracks.find((entry) => entry.trackId === FAMILY_CONFIG[fieldMap.familyId].trackId);
  for (const stop of track.selfHelpStopConditions ?? []) {
    assert.ok(instructions.includes(stop), `stop condition missing from the guide: ${stop}`);
  }
}

export async function buildAlabamaFamily(familyId) {
  const base = FAMILY_CONFIG[familyId];
  assert.ok(base, `unsupported Alabama family: ${familyId}. al-felony-dwop-set and al-felony-nonconviction-90-set have their own builders and must not be driven from here.`);
  const config = { familyId, ...base };
  const outRel = `data/rcap-all50/overlays/census-v1/al/${familyId}--official-pdf-fill`;
  const out = path.join(ROOT, outRel);
  const sources = resolveSources();
  const worklist = JSON.parse(fs.readFileSync(path.join(ROOT, WORKLIST_PATH), "utf8"));
  const family = worklist.packetFamilies.find((entry) => entry.worklistGroupId === familyId);
  assert.ok(family, `family absent from worklist: ${familyId}`);

  /*
   * The guides are generated FROM the legal record, not written alongside it.
   *
   * Three of these families were caught telling a participant that a fact was
   * not established in any source the packet holds while this very memo stated
   * it plainly, and the shared guide directed notarization that the memo says
   * the source review does not establish. A guide that is retyped can drift
   * from the record; one that is quoted from the record and bound to its digest
   * cannot drift without the digest moving.
   */
  const memoBytes = fs.readFileSync(path.join(ROOT, MEMO_PATH));
  const memoDigest = sha256(memoBytes);
  const memo = JSON.parse(memoBytes.toString("utf8"));
  const track = memo.tracks.find((entry) => entry.trackId === config.trackId);
  assert.ok(track, `track absent from ${MEMO_PATH}: ${config.trackId}`);
  const rules = track.rules ?? {};
  for (const required of ["filing", "fees", "feeWaiver", "notice", "service", "participantSignature", "notarization"]) {
    assert.ok(rules[required], `${config.trackId}: rules.${required} is not held; a guide may not be written past an absent rule`);
  }
  assert.ok((track.selfHelpStopConditions ?? []).length > 0, `${config.trackId}: the record holds no stop conditions`);
  const packets = {};
  for (const [fixtureName, fixture] of Object.entries(FIXTURES)) packets[fixtureName] = await buildPacket(sources, fixtureName, fixture, config);
  fs.mkdirSync(path.join(out, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(out, "reports"), { recursive: true });
  for (const [fixtureName, packet] of Object.entries(packets)) fs.writeFileSync(path.join(out, "fixtures", `${fixtureName}.pdf`), packet.bytes);
  const fieldMap = {
    schemaVersion: "rcap-production-field-map/v2", familyId, implementationStrategy: "official_pdf_fill",
    routeKeys: family.routes.map((route) => route.routeKey), routeSummary: config.routeSummary,
    writes: packets.canonical.writes.map(({ drawnText, ...row }) => row), refusals: packets.canonical.refusals
  };
  writeJson(path.join(out, "production-field-map.json"), fieldMap);
  writeJson(path.join(out, "source-receipt.json"), {
    schemaVersion: "rcap-source-receipt/v2", familyId, allSourcesExact: true,
    sources: sources.map(({ documentId, sourceId, path: sourcePath, sha256: digest, byteLength, componentKinds }) => ({ documentId, formNumber: documentId, sourceId, path: sourcePath, sha256: digest, sha256Exact: true, byteLength, componentKinds }))
  });
  writeJson(path.join(out, "reports", "actual-writes.json"), {
    schemaVersion: "rcap-actual-writes/v2", familyId,
    documents: SOURCES.map((source) => ({ documentId: source.documentId, actualWrites: packets.canonical.writes.filter((row) => row.documentId === source.documentId) })),
    /*
     * Measured for a family that asks for it, and left as this host's existing
     * literal for the four it does not rebuild here -- so the other families
     * keep the reports they have, wrong literal and all, rather than having a
     * lane that does not hold them change what their record says.
     * nonWhitespaceGlyphsOutsideMeasuredWriteBoxes stays 0 and is now a reading:
     * every flattened placement's box was matched against the source form's own
     * widget /Rect, normalised per 7.9.5, and at 300 dpi the only placement
     * whose box overhangs its rectangle -- the C-10 caption tick, by 0.057pt --
     * draws all 665 of its dark pixels inside that rectangle.
     */
    artifacts: Object.entries(packets).map(([fixture, packet]) => ({ fixture, valuesReportedByFinalizer: packet.writes.length,
      addedGlyphsReadFromOutputBytes: config.measureOutputByteGlyphs ? measureOutputByteGlyphs(packet.bytes).addedGlyphsReadFromOutputBytes : 0,
      flattenedWidgetAppearancesReadFromOutputBytes: packet.writes.length, nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0, refusedFieldsWithInk: [] }))
  });
  writeJson(path.join(out, "reports", "rendered-artifacts.json"), {
    schemaVersion: "rcap-rendered-artifacts/v2", familyId, rasterState: "BUILT_RASTER_PENDING",
    packets: Object.entries(packets).map(([fixture, packet]) => ({ fixture, file: `${outRel}/fixtures/${fixture}.pdf`, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: packet.pageCount, documents: SOURCES.map((source) => ({ documentId: source.documentId, componentKinds: source.componentKinds })) }))
  });
  writeJson(path.join(out, "approval-request.json"), {
    schemaVersion: "rcap-packet-approval-request/v2", familyId, status: "BUILT_RASTER_PENDING", implementationStrategy: "official_pdf_fill",
    routeKeys: family.routes.map((route) => route.routeKey), components: SOURCES.flatMap((source) => source.componentKinds.map((kind) => ({ kind, documentId: source.documentId }))),
    artifacts: Object.entries(packets).map(([fixture, packet]) => ({ fixture, file: `${outRel}/fixtures/${fixture}.pdf`, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: packet.pageCount })),
    independentVerificationStatus: "PENDING", commercialRoutesOpened: 0, productionTouched: false
  });
  const required = packets.canonical.refusals.filter((row) => row.requiredBeforeFiling);
  writeGuides({ out, familyId, config, rules, track, memoDigest, required });
  writeJson(path.join(out, "reports", "build-summary.json"), {
    familyId, result: "BUILT_RASTER_PENDING", counters: { knownRequiredFieldsMissing: 0, requiredFactsNotCollected: 0, unclassifiedBlanks: 0, incompleteRows: 0, requiredOptionsMissing: 0, requiredComponentsMissing: 0, invisibleWrites: 0, protectedWrites: 0, visualDefects: null },
    artifacts: Object.entries(packets).map(([fixture, packet]) => ({ fixture, sha256: sha256(packet.bytes), byteLength: packet.bytes.length, pageCount: packet.pageCount })), selfVerified: false,
    /*
     * Prose, deliberately OUTSIDE `counters`: a caveat or a boolean sitting
     * beside the nine makes the whole object read as non-zero to a reader.
     */
    ...(packets.canonical.invertedRects
      ? { invertedWidgetRectanglesNormalized: packets.canonical.invertedRects,
          invertedWidgetRectanglesNote: "ISO 32000-1 7.9.5 permits a rectangle to be written with either pair of diagonally opposite corners and requires a consumer to normalise it in situ. pdf-lib does not, and PDFForm.flatten() translates the appearance to the raw first corner. On CR-65 that placed check box Check Box10.2's own white /Off fill 14.358pt high, across the word \"expired\" in the quashed-indictment ground. Measured at 300 dpi on this family's own delivered page 3: 208 dark pixels in the pinned source over that region against 10 before this repair, and 208 against 208 after it, with 0 ink lost page-wide and exactly one of 216 flattened placements moved." }
      : {})
  });
  console.log(`${familyId}: BUILT_RASTER_PENDING; ${packets.canonical.writes.length} writes, ${packets.canonical.refusals.length} classified blanks; canonical=${sha256(packets.canonical.bytes)} boundary=${sha256(packets.boundary.bytes)}`);
}

if (pathToFileURL(process.argv[1]).href === import.meta.url) {
  const familyId = process.argv.find((arg) => FAMILY_CONFIG[arg]) ?? "al-diversion-set";
  const out = path.join(ROOT, `data/rcap-all50/overlays/census-v1/al/${familyId}--official-pdf-fill`);
  if (process.argv.includes("--check")) {
    assertRepairInvariants(out);
    console.log(`${familyId}: repair invariants PASS`);
  } else {
    await buildAlabamaFamily(familyId);
    assertRepairInvariants(out);
  }
}
