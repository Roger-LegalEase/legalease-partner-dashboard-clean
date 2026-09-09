#!/usr/bin/env node
/**
 * The West Virginia § 61-11-26a accelerated expungement family —
 * `wv_acc_treatment_job_readiness-set`.
 *
 *   node scripts/build-census-v1-wv_acc_treatment_job_readiness-set.mjs [--check] [--no-raster]
 *
 * A HYBRID FAMILY. The MASTER_QUEUE calls its implementation strategy
 * custom_pleading and it binds TWO official Supreme Court of Appeals forms, and
 * both of those are true at once: the packet-set manifest declares seven
 * components, of which two are official_pdf_fill petitions, two more are pages
 * of whichever petition is used, one is a composed supplemental pleading and two
 * are process guidance. So this build fills official forms AND composes pages,
 * and the source receipt records exact custody for the two binaries rather than
 * the "no official form exists" line a purely composed family carries.
 *
 * WHY BOTH PETITIONS ARE IN THE PACKET
 *
 * Components 1 and 2 are declared CONDITIONAL alternatives in the manifest:
 * SCA-C906 "where the convictions to be expunged are misdemeanours or traffic
 * citations", SCA-C907 "instead where the conviction to be expunged is a
 * nonviolent felony under § 61-11-26a(a)(3)". Choosing between them would mean
 * deciding whether a participant's conviction is a misdemeanour or a NONVIOLENT
 * FELONY — and the route-obligation census lists "The characterisation of a
 * felony as nonviolent" as a later-completion field in terms. This build will
 * not make that characterisation. Both petitions are prepared, each carries its
 * condition on the page and in the instructions, and the participant files
 * exactly one.
 *
 * THE FIELD NAMES ON THESE TWO FORMS LIE, AND THEY LIE DIFFERENTLY ON EACH
 *
 * SCA-C906 was plainly derived from SCA-C907 and kept its names. Two
 * consequences, both measured here rather than assumed:
 *
 *   - On the MISDEMEANOUR form the four eligibility check boxes are named
 *     `SingleFelonyCB`, `MultipleFelonyCB`, `SingleSatisfiedCB` and
 *     `MultilpleSatisfiedCB` (the misspelling is the issuer's). Nothing on
 *     SCA-C906 is about a felony. So which statutory branch each box elects is
 *     read from the PRINTED PARAGRAPH beside it, never from the name.
 *
 *   - On the certificate of service the two forms do not list the same
 *     recipients. SCA-C906 lists EIGHT and SCA-C907 lists SEVEN: C907 has no
 *     "Chief Law Enforcement Officer of any other Law Enforcement Agency" line
 *     at all, and its widgets still carry the names `ChiefLEO1` / `ChiefLEO2` —
 *     sitting, on that form, beneath "The Superintendent or Warden of any
 *     Institution in which Petitioner was confined". A build that labelled by
 *     field name would tell a participant to address a police department on the
 *     line the court reads as the prison. Every recipient line is therefore
 *     labelled from the numbered item the form PRINTS above the widget.
 *
 * THE ROUTE ELECTS A PAIR OF BRANCHES; THE CASE ELECTS WITHIN THE PAIR
 *
 * Part (c) of page 1 offers four eligibility branches on both forms. Two recite
 * the ordinary elapsed-time route under § 61-11-26 alone — one year / two years
 * for misdemeanours, five years for felonies — and belong to other families
 * (`wv_conv_single_misdemeanor-set`, `wv_conv_multiple_misdemeanors-set`,
 * `wv_conv_nonviolent_felony-set`). Those two are declared
 * NOT_APPLICABLE_ON_THIS_ROUTE with the named condition, because this family's
 * single route is the § 61-11-26a accelerated one.
 *
 * The other two DO recite § 61-11-26a, and they differ only in whether the
 * participant has one conviction or several. That is a fact of the record, not
 * of the route, so both are declared REQUIRED_BEFORE_FILING with
 * determinedByTheCaseNotTheRoute and the reason stated. Which paragraph is
 * which is decided by reading the paragraph, not by reading the field name.
 *
 * WHAT THIS BUILD WRITES ON THE OFFICIAL FORMS, AND WHAT IT REFUSES
 *
 * Written, five widgets per petition: the petitioner's name in the caption, the
 * two address lines, the telephone number, and the petitioner's name in the
 * verification's "I, ____" recital.
 *
 * REFUSED BY ROLE, AND EACH FOR ITS OWN MEASURED REASON — every one of these
 * BINDS in the shared registry and would have been written by the descriptor
 * channel alone:
 *
 *   PetDOBDay, PetDOBMonth, PetDOBYear all resolve to participant.date_of_birth.
 *   The full ISO date would have gone into all three, and into a 26-point day
 *   slot. Worse, the form prints "DOB: __ / __ / __" with NO order beneath the
 *   slots, and the field names say day-month-year while the American convention
 *   these courts use is month-day-year. One of those is wrong and the paper does
 *   not say which, so the packet writes none of them and tells the participant.
 *
 *   PetitionersCurrentName1/2 resolve to participant.full_legal_name, under a
 *   printed question asking for "Petitioner's current name, previous names, and
 *   all aliases". The current name alone is a partial answer to a sworn question.
 *
 *   PetitionersOffenseAddress1/2 resolve to participant.street_address, under a
 *   printed question asking for "All of petitioner's addresses from the date of
 *   offense to current". The current address alone would assert an address
 *   HISTORY the platform does not hold; the route census names that history a
 *   manual completion item in terms.
 *
 *   CertifyName resolves to participant.full_legal_name inside the CERTIFICATE
 *   OF SERVICE — a statement that service has already happened. It has not.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { finalizeOfficialForm } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { flattenedWidgets, drawnAt } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { decideBinding } from "./rcap-official-forms/rcap-field-semantics.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { createTokenSplitter, fitsByFontMetrics } from "./rcap-custom-pleading/split-token.mjs";
import { sanitizePdfText, DOTS } from "./rcap-custom-pleading/composed-family-host.mjs";
import { assertNoMarkdownDelimitersOnDeliveredPages } from "./rcap-custom-pleading/composed-page-markdown.mjs";
import { BLANK_DISPOSITIONS, PASS_COUNTERS, classifyField, classifyBlank, rowKeyOf }
  from "./rcap-packet-completeness/completeness-contract.mjs";

const { rasterizePageCalibrated } = await import("./raster/pdf-page-raster.mjs");

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, StandardFonts, rgb } = require("pdf-lib");

const FAMILY_ID = "wv_acc_treatment_job_readiness-set";
const OUT = "data/rcap-all50/overlays/census-v1/wv/wv-acc-treatment-job-readiness-set--custom-pleading";
const BUILD_SCRIPT = "scripts/build-census-v1-wv_acc_treatment_job_readiness-set.mjs";
const MASTER_QUEUE = "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json";
const ROUTE_CENSUS = "data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json";
const SWEEP = "data/rcap-grade-a/source-wave-integration/SOURCE_IDENTITY_RESOLUTION_SWEEP.json";
const PACKET_SET_MANIFEST = "data/record-clearing/legal-design-packet-set-manifests.json";

const ROUTE_KEY =
  "obligation:track-pathway:WV:wv_acc_treatment_job_readiness:accelerated-treatment-recovery-job-readiness-expungement-under-61-11-26a";
const STATUTORY_AUTHORITY = "W. Va. Code § 61-11-26a";

const PINNED = {
  "SCA-C906": {
    sourceId: "official-form:SCA-C906",
    sha256: "43b5606c9faf6fcf4d6f73c1d97cf1bd87798158dee1b6f3381c8a0472b4b64c",
    declaredPath:
      "STATES/WV/02_PACKET_FORMS/WV__FORM__SCA-C906__sca-c906-petition-for-expungement-of-misdemeanor-violations-and-traffic-citations__REV-2019-06-04__EN.pdf",
    footerNeedle: "SCA-C906",
    captionNeedle: "PETITION FOR EXPUNGEMENT OF MISDEMEANOR VIOLATIONS"
  },
  "SCA-C907": {
    sourceId: "official-form:SCA-C907",
    sha256: "2a72314146636c4120d87bdfb83f8609e35e9e904eed2f8169bc2375fba30222",
    declaredPath: "LegalEase West Virginia/SCA-C907.pdf",
    footerNeedle: "SCA-C907",
    captionNeedle: "PETITION FOR EXPUNGEMENT OF FELONY VIOLATIONS"
  }
};

const CUSTODY_ROOTS = [
  process.env.MASTER_LIBRARY_SOURCE_DIR ?? null,
  "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1",
  "private/source-imports/Nationwide_Recovery_Pool_2026-09-02",
  "private/source-imports/rcap-d-source-packs-2026-08-12",
  "private/human-source-returns"
].filter(Boolean);

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const PARTICIPANT_ELECTION = "participant_sworn_narrative_or_legal_election";

const COMPONENTS = [
  { id: "wv_acc_treatment_job_readiness-primary-filing-1", role: "primary_filing", form: "SCA-C906", kind: "official_pdf_fill" },
  { id: "wv_acc_treatment_job_readiness-primary-filing-2", role: "primary_filing", form: "SCA-C907", kind: "official_pdf_fill" },
  { id: "wv_acc_treatment_job_readiness-supplemental-pleading-3", role: "supplemental_pleading", kind: "custom_pleading" },
  { id: "wv_acc_treatment_job_readiness-verification-4", role: "verification", form: "SCA-C906", kind: "page_of_the_official_petition", onPage: 3 },
  { id: "wv_acc_treatment_job_readiness-certificate-of-service-5", role: "certificate_of_service", form: "SCA-C906", kind: "page_of_the_official_petition", onPage: 4 },
  { id: "wv_acc_treatment_job_readiness-records-checklist-6", role: "records_checklist", kind: "process_guidance" },
  { id: "wv_acc_treatment_job_readiness-filing-instructions-7", role: "filing_instructions", kind: "process_guidance" }
];

const S = {
  CAPTION: "The caption block",
  IDENTITY: "The petitioner's own details",
  CHARGES: "The convictions to be expunged",
  ELIGIBILITY: "Part (c) — which statutory branch you are eligible under",
  RECITALS: "Parts (d) to (n) — the sworn recitals",
  VERIFICATION: "The verification, sworn before a notary",
  SERVICE: "The certificate of service",
  CHROME: "Viewer controls the form prints for itself"
};

const WHY_THE_CASE_ELECTS_WITHIN_THE_PAIR =
  "this family's single route is the § 61-11-26a accelerated one, and BOTH of the § 61-11-26a branches printed on "
  + "this page belong to it. They differ only in whether the participant has one conviction to clear or several, "
  + "which is a fact of the participant's own record and not of the route. The route-obligation census records the "
  + `eligibility clock for ${ROUTE_KEY} without electing between them.`;

/* ---- the static half of the field dictionary -------------------------------- *
 * Both binaries carry the same field NAMES for these, so one dictionary serves
 * both. Everything whose meaning differs between the two forms — the four
 * eligibility branches and every certificate-of-service recipient — is read
 * from the printed page instead, below.
 */
const SUPPLY = (what) => ({ policy: "supply", what });
const WRITE = (fact) => ({ policy: "write", fact });
const PROTECT = (refusalClass, why) => ({ policy: "protect", refusalClass, why });
const CASE_FACT = (what, why) => ({ policy: "case_fact", what, whyTheRouteCannotDetermineIt: why });
const CHROME = (why) => ({ policy: "chrome", why });

const STATIC_FIELDS = {
  PrintForm: {
    section: S.CHROME, caption: "IN THE CIRCUIT COURT OF", captionAbove: 0, captionBelow: 60,
    label: "Print this form — a viewer control, not a filing fact",
    ...CHROME("a push button the form draws for the person viewing it on a screen. It is not a blank and nothing is filed in it")
  },
  ResetButton: {
    section: S.CHROME, caption: "IN THE CIRCUIT COURT OF", captionAbove: 0, captionBelow: 60,
    label: "Reset this form — a viewer control, not a filing fact",
    ...CHROME("a push button the form draws for the person viewing it on a screen. It is not a blank and nothing is filed in it")
  },
  CoDrop: {
    section: S.CAPTION, caption: "IN THE CIRCUIT COURT OF", captionAbove: 0, captionBelow: 60, onlyOn: "SCA-C906",
    label: "County of the circuit court — the form's own county chooser",
    ...SUPPLY(
      "choose the county whose circuit court you are filing in — the county of conviction. The chooser lists all "
      + "fifty-five West Virginia counties and the platform holds no county for you")
  },
  County: {
    section: S.CAPTION, caption: "IN THE CIRCUIT COURT OF",
    label: "County of the circuit court the petition is filed in",
    ...SUPPLY(
      "the county of conviction, written into the caption. The route record puts the filing in the circuit court of "
      + "the county where the conviction happened, and only your own court papers say which that is")
  },
  /*
   * THE TWO CASE-NUMBER WIDGETS ARE LABELLED FROM THE PRINTED LINE ABOVE THEM,
   * NOT FROM THEIR NAMES, because on SCA-C907 they sit under each other's.
   *
   * SCA-C906 prints "Circuit Court Case No." at y 696 over the widget named
   * CircuitCaseNo at y 690.9, and "Magistrate Court Case No." at y 676 over
   * MagCaseNo at y 671.4 — names and paper agree. SCA-C907 prints "Magistrate
   * Court Case No." at y 698 over the widget named CircuitCaseNo at y 693, and
   * "Circuit Court Case No." at y 680 over the widget named MagCaseNo at y 675.
   * The two are swapped there. A build that trusted the names would put the
   * magistrate number on the circuit line of a petition the participant signs.
   *
   * `caseNumberLine: true` sends the field through the geometric labeller below,
   * which reads the printed line and records whether the name agrees with it.
   */
  CircuitCaseNo: { section: S.CAPTION, caseNumberLine: true },
  MagCaseNo: { section: S.CAPTION, caseNumberLine: true },
  ConvictionDate: {
    section: S.CAPTION, caption: "Conviction Date:",
    label: "Conviction date",
    ...SUPPLY(
      "the date of conviction, copied from the certified disposition or judgment order. The platform has not seen "
      + "your court record and will not write a conviction date it cannot read")
  },
  PetitionerName1: {
    section: S.CAPTION, caption: "Petitioner (First/Middle/Last)",
    label: "Petitioner name", ...WRITE("participant.full_legal_name")
  },
  PetAdd1: {
    section: S.IDENTITY, caption: "Address:",
    label: "Street address", ...WRITE("participant.street_address")
  },
  PetAdd2: {
    section: S.IDENTITY, caption: "Address:", captionAbove: 36,
    label: "City State ZIP code", ...WRITE("participant.city_state_zip")
  },
  PetPhoneNum: {
    section: S.IDENTITY, caption: "Phone No.",
    label: "Phone No.", ...WRITE("participant.phone")
  },
  PetSocSecno: {
    section: S.IDENTITY, caption: "SSN: XXX-XX-",
    label: "Last four digits of your Social Security number",
    ...SUPPLY(
      "the last four digits of your Social Security number — the form prints XXX-XX- and leaves you the rest. The "
      + "platform does not hold it and would not print it if it did: the shared protect rules refuse a government "
      + "identifier on every form")
  },
  PetDOBDay: {
    section: S.IDENTITY, caption: "DOB", dobSlot: "first",
    label: "Date of birth — the first of the three slots the form prints",
    registryGap: "participant.date_of_birth",
    ...SUPPLY(
      "your date of birth, in the three slots the form prints as __ / __ / __. The platform holds your date of birth "
      + "and deliberately did not print it: the form gives no order beneath the slots, and this binary's own field "
      + "names call them day, month and year while these courts' forms are conventionally month, day and year. One "
      + "of those is wrong and the paper does not say which, so you write it")
  },
  PetDOBMonth: {
    section: S.IDENTITY, caption: "DOB", dobSlot: "second",
    label: "Date of birth — the second of the three slots the form prints",
    registryGap: "participant.date_of_birth",
    ...SUPPLY(
      "the second slot of your date of birth. See the note on the first slot: the form prints no order and the field "
      + "names disagree with the local convention, so the packet writes none of the three")
  },
  PetDOBYear: {
    section: S.IDENTITY, caption: "DOB", dobSlot: "third",
    label: "Date of birth — the third of the three slots the form prints",
    registryGap: "participant.date_of_birth",
    ...SUPPLY(
      "the third slot of your date of birth, which on either reading of the order is the year. The packet writes none "
      + "of the three rather than write two correctly and one wrongly")
  },
  PetitionersCurrentName1: {
    section: S.RECITALS, caption: "current name, previous names, and all aliases", captionAbove: 26,
    label: "Your current name, previous names and all aliases — first line",
    registryGap: "participant.full_legal_name",
    ...SUPPLY(
      "your current name, every previous name and every alias you have used. The platform holds only your current "
      + "legal name, and its own field matcher resolves this box to exactly that — which on a sworn petition asking "
      + "for previous names and aliases would be a partial answer presented as a complete one")
  },
  PetitionersCurrentName2: {
    section: S.RECITALS, caption: "current name, previous names, and all aliases", captionAbove: 44,
    label: "Your current name, previous names and all aliases — second line",
    registryGap: "participant.full_legal_name",
    ...SUPPLY("the rest of your names and aliases, if they did not fit on the line above")
  },
  PetitionersOffenseAddress1: {
    section: S.RECITALS, caption: "addresses from the date of offense to current", captionAbove: 26,
    label: "All your addresses from the date of the offence to now — first line",
    registryGap: "participant.street_address",
    ...SUPPLY(
      "every address you have lived at from the date of the offence until now. The platform holds only your current "
      + "address, and its own field matcher resolves this box to exactly that — which would state an address HISTORY "
      + "it does not have. The route-obligation census names this a manual completion item in terms")
  },
  PetitionersOffenseAddress2: {
    section: S.RECITALS, caption: "addresses from the date of offense to current", captionAbove: 44,
    onlyOn: "SCA-C907",
    label: "All your addresses from the date of the offence to now — second line",
    registryGap: "participant.street_address",
    ...SUPPLY("the rest of your address history, if it did not fit on the line above")
  },
  PetArrestDate: {
    section: S.RECITALS, caption: "Date of arrest:",
    label: "Date of arrest",
    ...SUPPLY("the date of arrest, from your own court papers")
  },
  VictimsNames1: {
    section: S.RECITALS, caption: "Name(s) of victim(s) if applicable", captionAbove: 26,
    label: "Names of any victims — first line",
    ...SUPPLY("the name of any victim, if the form's question applies to your case, or leave it blank if it does not")
  },
  VictimsNames2: {
    section: S.RECITALS, caption: "Name(s) of victim(s) if applicable", captionAbove: 44,
    label: "Names of any victims — second line",
    ...SUPPLY("the rest of the names, if they did not fit on the line above")
  },
  Verdict1: {
    section: S.RECITALS, caption: "verdict and punishment imposed", captionAbove: 26,
    label: "The court's verdict and the punishment imposed — first line",
    ...SUPPLY("the verdict and the punishment the court imposed, copied from the judgment or sentencing order")
  },
  Verdict2: {
    section: S.RECITALS, caption: "verdict and punishment imposed", captionAbove: 44,
    label: "The court's verdict and the punishment imposed — second line",
    ...SUPPLY("the rest of the verdict and punishment, if it did not fit on the line above")
  },
  GroundsForExpungement1: {
    section: S.RECITALS, caption: "Grounds for expungement request", captionAbove: 44,
    label: "Your grounds for asking for expungement — first line",
    ...SUPPLY(
      "your own grounds for asking for expungement — the form asks you to explain in detail, and names employment and "
      + "licensure as examples rather than limits. These are your words and the platform writes none of them")
  },
  GroundsForExpungement2: {
    section: S.RECITALS, caption: "Grounds for expungement request", captionAbove: 62,
    label: "Your grounds for asking for expungement — second line",
    ...SUPPLY("the rest of your grounds, if they did not fit on the line above")
  },
  PetitionerName2: {
    section: S.VERIFICATION, caption: "VERIFICATION", captionAbove: 60,
    label: "Petitioner name in the verification recital",
    registryGap: "participant.full_legal_name",
    /*
     * THE SHARED REGIONAL PROTECT REFUSES THIS ONE, AND THAT GATE IS RIGHT.
     *
     * This build first declared it a write: the recital reads "I, ____ after
     * making an oath or affirmation to tell the truth", the platform holds the
     * name, and writing it saves a transcription error in a notarised block.
     * decideBinding refuses it anyway — reason protected_page_region, category
     * notarization — because the widget's region heading names the notary, and
     * the shared rules do not let a platform write inside a notarial block.
     *
     * The way to get the write back would have been to rename this build's own
     * section heading until the rule stopped matching. That is wording a label
     * to defeat a protect rule, which is the thing the region channel exists to
     * prevent, so the refusal stands and the name is the participant's to write
     * when they swear it in front of the notary.
     */
    ...PROTECT(SIGNATURE,
      "this is the recital you complete when you swear the verification in front of the notary, and the shared "
      + "protect rules refuse any platform write inside a notarial block. Write your own name here at the same time "
      + "you sign")
  },
  CertifyName: {
    section: S.SERVICE, caption: "CERTIFICATE OF SERVICE", captionAbove: 60,
    label: "Your name in the certificate of service",
    registryGap: "participant.full_legal_name",
    ...PROTECT(SIGNATURE,
      "the certificate of service states that you HAVE ALREADY given a copy of the petition to each recipient. When "
      + "this packet was prepared that had not happened, so nothing on this page is filled in — not even your name. "
      + "You complete the whole certificate on the day you actually serve")
  },
  CertifyDay: {
    section: S.SERVICE, caption: "do hereby certify", captionAbove: 40,
    label: "The day of the month you served the copies",
    ...PROTECT(SIGNATURE, "a date certifying service that has not happened when the packet is prepared")
  },
  CertifyMonth: {
    section: S.SERVICE, caption: "do hereby certify", captionAbove: 40,
    label: "The month you served the copies",
    ...PROTECT(SIGNATURE, "a date certifying service that has not happened when the packet is prepared")
  },
  CertifyYear: {
    section: S.SERVICE, caption: "do hereby certify", captionAbove: 60,
    label: "The year you served the copies",
    ...PROTECT(SIGNATURE, "a date certifying service that has not happened when the packet is prepared")
  },
  FirstClassMailCB: {
    section: S.SERVICE, selection: true, caption: "First Class Mail",
    label: "Service method — First Class Mail (selection)",
    ...PROTECT(SIGNATURE,
      "tick this only after you have actually posted the copies. The sentence above it says you have already served, "
      + "and when this packet was prepared you had not")
  },
  HandDeliveryCB: {
    section: S.SERVICE, selection: true, caption: "Hand Delivery",
    label: "Service method — Hand Delivery (selection)",
    ...PROTECT(SIGNATURE,
      "tick this only after you have actually delivered the copies by hand. The sentence above it says you have "
      + "already served, and when this packet was prepared you had not")
  },
  CertifiedMailCB: {
    section: S.SERVICE, selection: true, caption: "Certified Mail",
    label: "Service method — Certified Mail, Return Receipt (selection)",
    ...PROTECT(SIGNATURE,
      "tick this only after you have actually posted the copies by certified mail. The sentence above it says you "
      + "have already served, and when this packet was prepared you had not")
  },
  SignDate: {
    section: S.SERVICE, caption: "Signature of Petitioner", captionAbove: 0, captionBelow: 20, onlyOn: "SCA-C906",
    label: "Date you sign the certificate of service",
    ...PROTECT(SIGNATURE, "you date the certificate on the day you sign it, which is the day you serve")
  },
  CurrentOrderCB1: {
    section: S.RECITALS, selection: true, caption: "Yes", yesNo: "yes", question: "current no-contact order",
    label: "Is there a CURRENT no-contact order protecting a victim — Yes (selection)",
    ...CASE_FACT(
      "tick Yes only if there is a current order for restitution, protection, a restraining order or another "
      + "no-contact order stopping you contacting a victim — and if you do, attach a copy to the petition, which the "
      + "form asks for on the same line",
      "whether an order exists is a fact about the participant's own case and its victims. The platform holds no "
      + "order and has never seen one; no route determines the answer.")
  },
  CurrentOrderCB2: {
    section: S.RECITALS, selection: true, caption: "No", yesNo: "no", question: "current no-contact order",
    label: "Is there a CURRENT no-contact order protecting a victim — No (selection)",
    ...CASE_FACT(
      "tick No only if there is no such current order",
      "whether an order exists is a fact about the participant's own case and its victims. The platform holds no "
      + "order and has never seen one; no route determines the answer.")
  },
  PriorOrderCB1: {
    section: S.RECITALS, selection: true, caption: "Yes", yesNo: "yes", question: "prior no-contact order",
    label: "Was there a PRIOR no-contact order protecting a victim — Yes (selection)",
    ...CASE_FACT(
      "tick Yes only if there was previously such an order",
      "whether a prior order existed is a fact about the participant's own case and its victims. The platform holds "
      + "no order and has never seen one; no route determines the answer.")
  },
  PriorOrderCB2: {
    section: S.RECITALS, selection: true, caption: "No", yesNo: "no", question: "prior no-contact order",
    label: "Was there a PRIOR no-contact order protecting a victim — No (selection)",
    ...CASE_FACT(
      "tick No only if there was no such prior order",
      "whether a prior order existed is a fact about the participant's own case and its victims. The platform holds "
      + "no order and has never seen one; no route determines the answer.")
  },
  ExpungementCB1: {
    section: S.RECITALS, selection: true, caption: "Yes", yesNo: "yes", question: "prior expungement",
    label: "Have you ever been granted an expungement or similar relief anywhere — Yes (selection)",
    ...CASE_FACT(
      "tick Yes only if a court in this state, another state or a federal court has ever granted you an expungement "
      + "or similar relief",
      "whether the participant has ever been granted expungement anywhere is a fact of their own history. The "
      + "platform holds no such record and no route determines the answer.")
  },
  ExpungementCB2: {
    section: S.RECITALS, selection: true, caption: "No", yesNo: "no", question: "prior expungement",
    label: "Have you ever been granted an expungement or similar relief anywhere — No (selection)",
    ...CASE_FACT(
      "tick No only if you have never been granted an expungement or similar relief anywhere",
      "whether the participant has ever been granted expungement anywhere is a fact of their own history. The "
      + "platform holds no such record and no route determines the answer.")
  }
};

/* The four charge rows and their case numbers, and the six conviction / five
 * rehabilitation narrative lines, generated because they are identical in shape
 * and differ only by index. */
for (let i = 1; i <= 4; i += 1) {
  STATIC_FIELDS[`Charge${i}`] = {
    section: S.CHARGES, caption: "CHARGE:", chargeRow: i,
    label: `Row ${i} — the charge you want expunged`,
    ...SUPPLY(
      `the charge on line ${i}, copied word for word from the certified disposition or judgment order. The platform `
      + "has not seen your record and will not name a charge it cannot read")
  };
  STATIC_FIELDS[`CaseNo${i}`] = {
    section: S.CHARGES, caption: "CASE NO.:", chargeRow: i,
    label: `Row ${i} — the case number that charge was under`,
    ...SUPPLY(`the case number for the charge on line ${i}, from the same papers`)
  };
}
for (let i = 1; i <= 2; i += 1) {
  STATIC_FIELDS[`Charges${i}`] = {
    section: S.RECITALS, caption: "convicted", captionAbove: 26 + (i - 1) * 20,
    label: `The charges you were convicted on — line ${i}`,
    ...SUPPLY("the charges you were actually convicted on, from your own court papers")
  };
}
for (let i = 1; i <= 5; i += 1) {
  STATIC_FIELDS[`RehabilitationSteps${i}`] = {
    section: S.RECITALS, caption: "rehabilitation", captionAbove: 26 + (i - 1) * 20,
    label: `Steps you have taken towards rehabilitation — line ${i}`,
    ...SUPPLY(
      "your own account of the steps you have taken since the offence towards rehabilitation — the form names "
      + "treatment, work and other personal history and asks you to explain in detail. The route-obligation census "
      + "names the rehabilitation statement a later-completion field in terms, and these are your words")
  };
}

/* ---- fixtures ---------------------------------------------------------------- */
const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.first_name": "Jordan",
    "participant.middle_name": "Avery",
    "participant.last_name": "Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.street_address": "42 Maple Street, Apartment 3",
    "participant.city": "Charleston",
    "participant.state": "WV",
    "participant.zip": "25301",
    "participant.city_state_zip": "Charleston, WV 25301",
    "participant.phone": "304-555-0142",
    "participant.email": "jordan.reyes@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.first_name": "Maria-Alejandra",
    "participant.middle_name": "Consuelo",
    "participant.last_name": "O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B",
    "participant.city": "Unincorporated Township of Long Hollow Crossing",
    "participant.state": "West Virginia",
    "participant.zip": "26501-2214",
    "participant.city_state_zip": "Unincorporated Township of Long Hollow Crossing, West Virginia 26501-2214",
    "participant.phone": "(681) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
  }
};

const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";

/* ---- the controlling records, read at build time ---------------------------- */
function queueBinding() {
  const queue = JSON.parse(fs.readFileSync(path.join(ROOT, MASTER_QUEUE), "utf8"));
  const row = (queue.families ?? []).find((f) => f.familyId === FAMILY_ID);
  assert.ok(row, `${MASTER_QUEUE} carries no row for ${FAMILY_ID}`);
  assert.deepEqual(row.routeKeys, [ROUTE_KEY], `the queue's route keys moved: ${JSON.stringify(row.routeKeys)}`);

  /*
   * FOUR DECLARED SOURCES, TWO DOCUMENTS.
   *
   * The queue declares each of the two petitions twice: once as
   * `official-form:SCA-C90x` and once as `source-sha256:<that same digest>`. The
   * pairs carry the same declared path and the same digest, so they are ALIASES
   * of one identity, not two named forms sharing one digest — which is the
   * separate defect the source-identity sweep measured on ia-dci77-set, where
   * DCI-76 and DCI-77 are two different forms under one hash. That distinction
   * is asserted here rather than assumed, and the build stops if the shape ever
   * becomes the other one.
   */
  const byDigest = new Map();
  for (const h of row.sourceHashes ?? []) {
    const digest = String(h.sha256 ?? "").toLowerCase();
    if (!byDigest.has(digest)) byDigest.set(digest, []);
    byDigest.get(digest).push(h);
  }
  assert.equal(byDigest.size, 2,
    `${FAMILY_ID} binds two distinct documents and the queue names ${byDigest.size} distinct digests`);
  for (const [digest, entries] of byDigest) {
    const paths = new Set(entries.map((e) => e.path));
    assert.equal(paths.size, 1,
      `digest ${digest} is declared at ${paths.size} different paths: ${JSON.stringify([...paths])}. Two named forms `
      + "sharing one digest is a source-identity defect and this build stops rather than pick one.");
    const officialIds = entries.map((e) => e.sourceId).filter((id) => id.startsWith("official-form:"));
    assert.ok(officialIds.length <= 1,
      `digest ${digest} carries ${officialIds.length} different official-form ids: ${JSON.stringify(officialIds)}. `
      + "Two named forms sharing one digest is a source-identity defect and this build stops rather than pick one.");
  }

  const bound = {};
  for (const [form, pin] of Object.entries(PINNED)) {
    const entry = (row.sourceHashes ?? []).find((h) => h.sourceId === pin.sourceId);
    assert.ok(entry, `${MASTER_QUEUE} no longer declares ${pin.sourceId} for ${FAMILY_ID}`);
    assert.equal(String(entry.sha256).toLowerCase(), pin.sha256,
      `the MASTER_QUEUE pin for ${form} moved: the queue says ${entry.sha256}, this build asserts ${pin.sha256}`);
    assert.equal(entry.path, pin.declaredPath,
      `the MASTER_QUEUE path for ${form} moved: ${entry.path}`);
    bound[form] = { ...pin, tier: entry.tier ?? null };
  }
  return {
    forms: bound,
    officialFormFamily: row.officialFormFamily ?? null,
    custodyClassInQueue: row.sourceReadiness?.custodyClass ?? null,
    declaredSourceCount: (row.sourceHashes ?? []).length,
    distinctDocuments: byDigest.size,
    /*
     * The queue's own requiredForms list reads ["SCA-C906", "SCA-C906"] — the
     * misdemeanour form twice, and the felony form not at all — while its
     * sourceIds, sourceHashes and officialFormFamily all name both. Recorded
     * rather than reconciled here.
     */
    formsListedInTheQueueRow: row.forms ?? []
  };
}

function sweepMeasurement() {
  const sweep = JSON.parse(fs.readFileSync(path.join(ROOT, SWEEP), "utf8"));
  const family = (sweep.families ?? []).find((f) => f.familyId === FAMILY_ID);
  assert.ok(family, `${SWEEP} carries no family ${FAMILY_ID}`);
  assert.equal(family.answer, "RESOLVED_BY_CONTENT",
    `${SWEEP} no longer answers RESOLVED_BY_CONTENT for ${FAMILY_ID} (${family.answer})`);
  const perForm = {};
  for (const [form, pin] of Object.entries(PINNED)) {
    const measured = (family.sources ?? []).find((s) => s.sourceId === pin.sourceId);
    assert.ok(measured, `${SWEEP} carries no measurement for ${pin.sourceId}`);
    assert.equal(String(measured.actualSha256 ?? "").toLowerCase(), pin.sha256,
      `the sweep's measured digest for ${form} is ${measured.actualSha256}, not the pinned ${pin.sha256}`);
    perForm[form] = {
      actualPath: measured.actualPath ?? null,
      copiesInCustody: measured.copiesInCustody ?? null,
      custodies: measured.custodies ?? [],
      pageCount: measured.identityEvidence?.pageCount ?? null,
      acroFieldCount: measured.identityEvidence?.acroFieldCount ?? null,
      byteLength: measured.identityEvidence?.byteLength ?? null,
      embeddedTitle: measured.identityEvidence?.embeddedTitle ?? null,
      xfaPresentInTheSweep: measured.identityEvidence?.xfaPresent ?? null
    };
  }
  return { priorCustodyClass: family.priorCustodyClass ?? null, perForm };
}

function routeRecord() {
  const census = JSON.parse(fs.readFileSync(path.join(ROOT, ROUTE_CENSUS), "utf8"));
  const family = (census.packetFamilies ?? []).find((f) => f.worklistGroupId === FAMILY_ID);
  assert.ok(family, `${ROUTE_CENSUS} carries no packet family ${FAMILY_ID}`);
  assert.equal(family.routes?.length, 1,
    `${FAMILY_ID} is a single-route family and the census records ${family.routes?.length} routes`);
  const route = family.routes[0];
  assert.equal(route.routeKey, ROUTE_KEY, `the census route key moved: ${route.routeKey}`);

  const recorded = (key) => {
    const cell = route.deliverable?.[key];
    assert.ok(cell, `the census records no ${key} cell for ${ROUTE_KEY}`);
    assert.equal(cell.status, "recorded",
      `the census no longer records ${key} for ${ROUTE_KEY} (status ${cell.status}); this packet prints it, so the build stops`);
    const entries = (cell.entries ?? []).map((e) => String(e).trim()).filter((e) => e.length > 0);
    assert.ok(entries.length > 0,
      `the census records ${key} for ${ROUTE_KEY} with no non-empty entry; this packet will not print an empty quotation`);
    return entries;
  };

  const waitingPeriod = recorded("waitingPeriodCalculation");
  const acceleratedBasis = waitingPeriod.find((e) => /accelerated clock/i.test(e));
  assert.ok(acceleratedBasis,
    `the route-obligation census no longer records an accelerated eligibility clock for ${ROUTE_KEY}. The whole `
    + "treatment of Part (c) rests on this route being the § 61-11-26a one, so the build refuses.");

  const filingDestination = recorded("filingDestination");
  const circuitBasis = filingDestination.find((e) => /circuit court/i.test(e));
  assert.ok(circuitBasis, `the census no longer names a circuit court as the destination for ${ROUTE_KEY}`);

  const filingFee = recorded("filingFee");
  const feeWaiver = recorded("feeWaiverTreatment");
  const clerkFee = filingFee.find((e) => /circuit clerk/i.test(e));
  assert.ok(clerkFee, "the census no longer records the circuit clerk's filing fee for this route, and the packet states it");
  const waivedFee = feeWaiver.find((e) => /waived/i.test(e));
  assert.ok(waivedFee, "the census no longer records which fee is waived on this route, and the packet states it");

  return {
    routeKey: route.routeKey, trackId: route.trackId,
    waitingPeriod, acceleratedBasis,
    filingDestination, circuitBasis,
    filingFee, clerkFee, feeWaiver, waivedFee,
    certificateOfService: recorded("certificateOfService"),
    affidavitOrVerification: recorded("affidavitOrVerification"),
    schedules: recorded("schedulesOrContinuationPages"),
    requiredParticipantAttachments: recorded("requiredParticipantAttachments"),
    laterCompletionFields: recorded("laterCompletionFields"),
    signatureRequirements: recorded("signatureRequirements"),
    notarizationRequirements: recorded("notarizationRequirements"),
    primaryFiling: recorded("primaryOfficialFormOrComposedPleading"),
    contestedHandoff: recorded("contestedHearingOrOppositionHandoff"),
    notRecorded: Object.entries(route.deliverable ?? {})
      .filter(([, v]) => v?.status !== "recorded").map(([k]) => k).sort()
  };
}

function packetSetRecord() {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, PACKET_SET_MANIFEST), "utf8"));
  const set = (manifest.packetSets ?? []).find((s) => s.packetSetId === FAMILY_ID);
  assert.ok(set, `${PACKET_SET_MANIFEST} carries no packet set ${FAMILY_ID}`);
  assert.deepEqual(set.components.map((c) => c.componentId), COMPONENTS.map((c) => c.id),
    "the packet-set manifest's component list no longer matches the one this build renders");
  for (const [i, c] of set.components.entries()) {
    assert.equal(c.role, COMPONENTS[i].role, `component ${c.componentId} changed role to ${c.role}`);
    if (COMPONENTS[i].form) {
      assert.equal(c.officialFormId, COMPONENTS[i].form,
        `component ${c.componentId} now names official form ${c.officialFormId}, not ${COMPONENTS[i].form}`);
    }
  }
  const actions = set.participantActionRequired ?? [];
  assert.ok(actions.length > 0, "the packet-set manifest records no participant actions and this packet prints them");
  return {
    components: set.components,
    conditions: Object.fromEntries(set.components.filter((c) => c.conditionDescription)
      .map((c) => [c.componentId, c.conditionDescription])),
    actions,
    documentsToObtain: actions.filter((a) => a.kind === "obtain_document"),
    answersToConfirm: actions.filter((a) => a.kind === "confirm_answer"),
    fieldsToComplete: actions.filter((a) => a.kind === "complete_field"),
    fileAction: actions.find((a) => a.kind === "file"),
    serveAction: actions.find((a) => a.kind === "serve_party"),
    signAction: actions.find((a) => a.kind === "sign"),
    notarizeAction: actions.find((a) => a.kind === "notarize")
  };
}

/* ---- source binding --------------------------------------------------------- */
function resolveSource(pin) {
  const searched = [];
  for (const root of CUSTODY_ROOTS) {
    const abs = path.resolve(ROOT, root, pin.declaredPath);
    const exists = fs.existsSync(abs);
    searched.push({ root, absolutePath: abs, exists });
    if (!exists) continue;
    const bytes = fs.readFileSync(abs);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    searched[searched.length - 1].sha256 = sha256;
    if (sha256 !== pin.sha256) continue;
    /*
     * An encrypted official source is a real and handled shape in this factory
     * — the pikepdf-unlocked-derivative pattern is proven on five California
     * forms and a Maine family — and pdf-lib does not report it as one: with
     * ignoreEncryption it parses ciphertext as plaintext and throws something
     * unrelated. So the bytes are checked for /Encrypt directly, and the answer
     * is recorded either way rather than left to be inferred from a crash.
     */
    const encrypted = bytes.includes(Buffer.from("/Encrypt"));
    return {
      bound: true, custodyRoot: root, pathInArchive: pin.declaredPath, absolutePath: abs,
      sha256, byteLength: bytes.length, bytes, searched, encrypted
    };
  }
  return { bound: false, searched };
}

/* ---- census ----------------------------------------------------------------- */
const flat = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

async function censusOf(form, source) {
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  const pageText = pages.map((p, i) => ({
    page: i + 1,
    lines: groupIntoLines(extractTextItems(p)).map((l) => ({ y: Math.round(l.y), text: l.text }))
  }));

  const acroBefore = doc.catalog.lookup(PDFName.of("AcroForm"));
  const xfaInInputDict = Boolean(acroBefore && acroBefore.get(PDFName.of("XFA")) !== undefined);

  const linesOn = (page) => pageText.find((p) => p.page === page)?.lines ?? [];

  /*
   * THE FOUR ELIGIBILITY BRANCHES, READ FROM THE PARAGRAPHS AND NOT THE NAMES.
   *
   * On SCA-C906 all four boxes are named "…Felony…" on a form about
   * misdemeanours. The paragraph beside each box is what says which statutory
   * branch it elects, so each box's paragraph is read from the binary — from
   * just above the box down to just above the next box — and classified by
   * whether it cites § 61-11-26a and whether it recites a single conviction or
   * several.
   */
  const branchBoxNames = ["SingleFelonyCB", "MultipleFelonyCB", "SingleSatisfiedCB", "MultilpleSatisfiedCB"];
  const branchDateNames = {
    SingleFelonyCB: "SingleFelonyCompletionDate",
    MultipleFelonyCB: "MultipleFelonyCompletionDate",
    SingleSatisfiedCB: "SingleFelonySatisfiesDate",
    MultilpleSatisfiedCB: "MulitipleFelonlySatisfiesDate"
  };
  const widgetYOf = (name) => {
    const f = doc.getForm().getFields().find((x) => x.getName() === name);
    const w = f?.acroField.getWidgets()[0];
    return w ? +w.getRectangle().y.toFixed(2) : null;
  };
  const branchYs = branchBoxNames.map((n) => ({ name: n, y: widgetYOf(n) }))
    .filter((b) => b.y !== null).sort((a, b) => b.y - a.y);
  const branches = [];
  for (const [i, b] of branchYs.entries()) {
    const top = b.y + 8;
    const bottom = i + 1 < branchYs.length ? branchYs[i + 1].y + 8 : 40;
    const text = linesOn(1).filter((l) => l.y <= top && l.y > bottom)
      .sort((x, y) => y.y - x.y).map((l) => l.text).join(" ").replace(/\s+/g, " ").trim();
    const f = flat(text);
    branches.push({
      control: b.name, widgetY: b.y, dateField: branchDateNames[b.name],
      printedParagraph: text,
      citesAcceleratedSection: /61 11 26a/.test(f),
      recitesSingle: /\bsingle\b/.test(f),
      recitesMultiple: /\bmultiple\b/.test(f)
    });
  }

  const branchDrift = [];
  for (const b of branches) {
    if (b.printedParagraph.length === 0) branchDrift.push({ ...b, why: "no printed paragraph was found beside this eligibility box" });
    else if (b.recitesSingle === b.recitesMultiple) {
      branchDrift.push({ ...b, why: "the printed paragraph recites neither a single conviction nor several, or both" });
    }
  }
  const accelerated = branches.filter((b) => b.citesAcceleratedSection);
  const ordinary = branches.filter((b) => !b.citesAcceleratedSection);

  /*
   * THE CERTIFICATE-OF-SERVICE RECIPIENTS, READ FROM THE NUMBERED ITEMS.
   *
   * The two forms do not list the same recipients and their widgets carry the
   * same names, so each recipient line is labelled from the numbered item the
   * form prints above it.
   */
  const numbered = linesOn(4).filter((l) => /^\s*\d+\s*\./.test(l.text))
    .map((l) => ({ y: l.y, text: l.text.replace(/\s+/g, " ").trim() }))
    .sort((a, b) => b.y - a.y);
  const numberedItems = numbered.map((item, i) => {
    const bottom = i + 1 < numbered.length ? numbered[i + 1].y : 0;
    const text = linesOn(4).filter((l) => l.y <= item.y && l.y > bottom)
      .sort((x, y) => y.y - x.y).map((l) => l.text).join(" ").replace(/\s+/g, " ").trim();
    return { number: Number(/^\s*(\d+)/.exec(item.text)[1]), y: item.y, text };
  });

  const recipientNames = [
    "StatePoliceSuperintendent1", "ProsecutingAttCounty", "ProsecutingAttAdd",
    "OffensesCommittedAt1", "OffensesCommittedAt2", "ChiefLEO1", "ChiefLEO2",
    "ConfinedInstitution1", "ConfinedInstitution2",
    "CircuitDisposedCharges", "MagDisposedCharges", "MunicipalDisposedCharges"
  ];
  const recipientDrift = [];
  const caseNumberDrift = [];
  const caseNumberLines = [];

  const rows = [];
  const unmapped = [];
  const registryWouldWrite = [];

  for (const field of doc.getForm().getFields()) {
    const name = field.getName();
    const widgets = field.acroField.getWidgets().map((w) => {
      const r = w.getRectangle();
      const ref = w.P();
      let pi = pages.findIndex((p) => p.ref === ref);
      if (pi < 0) pi = 0;
      let appearanceStates = [];
      try {
        const ap = w.dict.lookup(PDFName.of("AP"));
        const n = ap ? ap.lookup(PDFName.of("N")) : null;
        if (n && typeof n.keys === "function") appearanceStates = n.keys().map((k) => k.asString());
      } catch { /* a widget without an /AP is recorded as having none */ }
      return {
        page: pi + 1,
        rect: { x: +r.x.toFixed(2), y: +r.y.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) },
        rectBasis: "acroform_widget_rect_read_first_hand_from_pinned_binary",
        appearanceStates
      };
    });
    const w0 = widgets[0];
    let entry = STATIC_FIELDS[name] ? { ...STATIC_FIELDS[name] } : null;

    /* Eligibility branch controls and their date blanks. */
    const branch = branches.find((b) => b.control === name)
      ?? branches.find((b) => b.dateField === name);
    if (!entry && branch) {
      const isBox = branch.control === name;
      const which = `${branch.recitesSingle ? "single" : "multiple"} conviction`;
      if (branch.citesAcceleratedSection) {
        entry = {
          section: S.ELIGIBILITY, selection: isBox, branch: branch.control,
          caption: "eligibility requirements for expungement", captionAbove: 400,
          printedParagraph: branch.printedParagraph,
          label: isBox
            ? `Part (c) — the § 61-11-26a branch for a ${which} (selection)`
            : `Part (c) — the date of eligibility for the § 61-11-26a ${which} branch`,
          ...CASE_FACT(
            isBox
              ? `tick this branch only if it is the one that fits your record — it is the § 61-11-26a branch for a ${which}`
              : `the date of eligibility the paragraph asks for, if this is the branch you ticked`,
            WHY_THE_CASE_ELECTS_WITHIN_THE_PAIR)
        };
      } else {
        entry = {
          section: S.ELIGIBILITY, selection: isBox, branch: branch.control,
          caption: "eligibility requirements for expungement", captionAbove: 400,
          printedParagraph: branch.printedParagraph,
          label: isBox
            ? `Part (c) — the ordinary § 61-11-26 elapsed-time branch for a ${which} (selection)`
            : `Part (c) — the date of completion for the ordinary § 61-11-26 ${which} branch`,
          policy: "off_route",
          condition:
            "this paragraph recites the ORDINARY elapsed-time route under § 61-11-26 alone and does not cite "
            + `§ 61-11-26a. This family's single route is ${ROUTE_KEY}, the accelerated one, whose eligibility clock `
            + "the route-obligation census records as replacing that wait. The elapsed-time branches belong to the "
            + "wv_conv_single_misdemeanor, wv_conv_multiple_misdemeanors and wv_conv_nonviolent_felony tracks, each "
            + "with its own route key."
        };
      }
    }

    /* The two case-number lines, labelled from the printed line above them. */
    if (entry?.caseNumberLine && w0) {
      const printedLine = linesOn(w0.page)
        .filter((l) => l.y >= w0.rect.y && l.y <= w0.rect.y + 14 && /case\s*no/i.test(l.text))
        .sort((a, b) => a.y - b.y)[0] ?? null;
      if (!printedLine) {
        caseNumberDrift.push({ field: name, page: w0.page, widgetY: w0.rect.y, why: "no printed case-number caption was found above this widget" });
        entry = null;
      } else {
        const printed = printedLine.text.replace(/\s+/g, " ").trim();
        const isCircuit = /circuit/i.test(printed);
        caseNumberLines.push({
          form, field: name, printedCaption: printed, printedAtY: printedLine.y, widgetY: w0.rect.y,
          fieldNameSaysCircuit: /circuitcaseno/i.test(name),
          printedCaptionSaysCircuit: isCircuit,
          nameAgreesWithThePaper: /circuitcaseno/i.test(name) === isCircuit
        });
        entry = {
          section: S.CAPTION, caption: printed.slice(0, 24), captionAbove: 14, captionBelow: 2,
          printedItem: printed,
          label: isCircuit ? "Circuit Court case number" : "Magistrate Court case number",
          ...SUPPLY(isCircuit
            ? "the circuit court case number, if one has been assigned. The packet record names this a "
              + "later-completion item in terms: on a new petition the circuit clerk assigns it when you file. Write "
              + "it on the line the form prints as the circuit court line, which on this form is the line this blank "
              + "sits on"
            : "the magistrate court case number from your own court papers, if the case was heard there. Write it on "
              + "the line the form prints as the magistrate court line, which on this form is the line this blank "
              + "sits on")
        };
      }
    }

    /* Certificate-of-service recipient lines. */
    if (!entry && recipientNames.includes(name) && w0?.page === 4) {
      const item = numberedItems.filter((n) => n.y > w0.rect.y).sort((a, b) => a.y - b.y)[0] ?? null;
      if (!item) {
        recipientDrift.push({ field: name, widgetY: w0.rect.y, why: "no numbered recipient item was found above this widget" });
      } else {
        entry = {
          section: S.SERVICE, recipientNumber: item.number, printedItem: item.text,
          caption: item.text.slice(0, 34), captionAbove: Math.ceil(item.y - w0.rect.y) + 6,
          label: `Certificate of service, recipient ${item.number} — address`,
          ...SUPPLY(
            `the address of recipient ${item.number} on the form's own list: "${item.text}". The platform holds no `
            + "address for any of these offices and will not invent one; look each up before you serve")
        };
      }
    }

    if (!entry) { unmapped.push({ field: name, page: w0?.page ?? null, rect: w0?.rect ?? null }); continue; }
    if (entry.onlyOn && entry.onlyOn !== form) {
      unmapped.push({ field: name, why: `the dictionary marks this field as present only on ${entry.onlyOn}` });
      continue;
    }

    let sourceValue = null;
    let options = null;
    try {
      if (typeof field.isChecked === "function") sourceValue = field.isChecked() ? "on" : null;
      else if (typeof field.getSelected === "function") {
        const sel = field.getSelected();
        sourceValue = Array.isArray(sel) && sel.length > 0 ? sel.join(" | ") : null;
        options = typeof field.getOptions === "function" ? field.getOptions() : null;
      } else if (typeof field.getText === "function") sourceValue = field.getText() ?? null;
    } catch { sourceValue = null; }

    const pdfType = field.constructor.name === "PDFTextField" ? "text" : "other";
    const fromName = decideBinding({ name, pdfType, effectiveLabel: null, regionHeading: null }, {});
    const fromLabel = decideBinding({ name, pdfType, effectiveLabel: entry.label, regionHeading: entry.section }, {});
    if (entry.policy !== "write" && fromName.writable) {
      registryWouldWrite.push({ form, field: name, wouldBind: fromName.factId, label: entry.label, policy: entry.policy });
    }

    rows.push({
      key: `${form}/${name}`, name, form, page: w0?.page ?? null, widgets, sourceValue, options,
      rect: w0?.rect ?? null, rectBasis: w0?.rectBasis ?? null,
      type: field.constructor.name.replace(/^PDF/, "").toLowerCase().replace("textfield", "text"),
      isSelectionControl: entry.selection === true || field.constructor.name === "PDFCheckBox",
      multiline: typeof field.isMultiline === "function" ? field.isMultiline() : false,
      maxLength: typeof field.getMaxLength === "function" ? (field.getMaxLength() ?? null) : null,
      /* The issuer stores three of these rectangles with a NEGATIVE height. */
      rectHeightIsNegative: (w0?.rect?.height ?? 0) < 0,
      section: entry.section, effectiveLabel: entry.label,
      caption: entry.caption, captionAbove: entry.captionAbove ?? 34, captionBelow: entry.captionBelow ?? 8,
      printedParagraph: entry.printedParagraph ?? null,
      printedItem: entry.printedItem ?? null,
      recipientNumber: entry.recipientNumber ?? null,
      branch: entry.branch ?? null, chargeRow: entry.chargeRow ?? null,
      dobSlot: entry.dobSlot ?? null, yesNo: entry.yesNo ?? null, question: entry.question ?? null,
      registryGap: entry.registryGap ?? null,
      policy: entry.policy, fact: entry.fact ?? null,
      refusalClass: entry.refusalClass ?? null, what: entry.what ?? null,
      why: entry.why ?? null, condition: entry.condition ?? null,
      whyTheRouteCannotDetermineIt: entry.whyTheRouteCannotDetermineIt ?? null,
      sharedRegistryWouldBindFromName: fromName.writable ? fromName.factId : null,
      sharedRegistryWouldBindFromThisBuildsLabel: fromLabel.writable ? fromLabel.factId : null
    });
  }

  /* Captions: the needle must be printed on the widget's own page, on a line
   * whose baseline sits within a measured band above (or a little below) it. */
  const captionDrift = [];
  for (const r of rows) {
    if (!r.caption || !r.rect) continue;
    const band = linesOn(r.page).filter((l) => l.y <= r.rect.y + r.captionAbove && l.y >= r.rect.y - r.captionBelow);
    if (!band.some((l) => flat(l.text).includes(flat(r.caption)))) {
      captionDrift.push({
        key: r.key, page: r.page, widgetY: r.rect.y, caption: r.caption, band: r.captionAbove,
        linesInBand: band.slice(0, 3).map((l) => l.text)
      });
    }
  }

  const dictionaryKeys = new Set(Object.keys(STATIC_FIELDS)
    .filter((k) => !STATIC_FIELDS[k].onlyOn || STATIC_FIELDS[k].onlyOn === form));
  for (const r of rows) dictionaryKeys.delete(r.name);

  return {
    form, rows, unmapped: unmapped.filter((u) => !u.why), stale: [...dictionaryKeys],
    captionDrift, branchDrift, recipientDrift, caseNumberDrift, caseNumberLines,
    branches, accelerated, ordinary, numberedItems, registryWouldWrite,
    xfaInInputDict, encrypted: source.encrypted,
    pageText, pageCount: pages.length,
    negativeHeightRects: rows.filter((r) => r.rectHeightIsNegative)
      .map((r) => ({ field: r.name, page: r.page, rect: r.rect }))
  };
}

/* ---- render: the official petitions ----------------------------------------- */
async function renderPetition(form, source, census, fixtureName) {
  const facts = FIXTURES[fixtureName];
  const writeRows = census.rows.filter((r) => r.policy === "write");
  const unwritableFields = census.rows.filter((r) => r.policy !== "write").map((r) => ({ field: r.name }));

  const { bytes, report } = await finalizeOfficialForm({
    sourceBytes: source.bytes,
    expectedSha256: source.sha256,
    census: census.rows.map((r) => ({
      name: r.name, type: r.type, effectiveLabel: r.effectiveLabel, regionHeading: r.section,
      widgets: r.widgets.map((w) => ({ page: w.page, rect: w.rect })),
      multiline: r.multiline === true, maxLength: r.maxLength ?? null
    })),
    facts,
    explicitMappings: Object.fromEntries(writeRows.map((r) => [r.name, r.fact])),
    unwritableFields,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    suppressSynthesizedAppearances: true,
    suppressSynthesizedWidgetBorders: true,
    /*
     * LOAD-BEARING ON THESE TWO BINARIES, AND MEASURED BEFORE IT WAS SET.
     *
     * Every check box on both forms ships an /AP /N stream whose /BBox is in
     * PAGE coordinates rather than the origin-based box a form XObject normally
     * carries: SingleFelonyCB has Rect [91.7 324.9 103.2 336.4] and BBox
     * [91.7 324.9 103.2 336.4], with no /Matrix. Under ISO 32000-1 12.5.5 the
     * BBox is mapped onto the Rect, which for these is a translation of (0, 0)
     * — the stream's own absolute coordinates already place the square.
     * pdf-lib's flatten emits `1 0 0 1 Rect.x Rect.y cm` instead, adding the
     * offset a second time, so every box is drawn at roughly twice its own
     * coordinates.
     *
     * The first render of this family delivered exactly that: four squares
     * scattered across page 1 of each petition — one beside "IN RE: Expungement
     * of Record of:", one on the petition's own caption rule, one inside the
     * fourth CHARGE line and one inside the word "traffic" — and not one box in
     * the left margin where the paper prints them. No counter saw it. The byte
     * proof read each appearance at the widget rectangle the placement names,
     * which is where the placement IS; the mis-draw happens inside the form
     * XObject, past the point a rectangle reading can see. It was found by
     * looking at the rendered page.
     *
     * This flag pre-composes the 12.5.5 mapping into each affected stream's own
     * /Matrix so the translation-only placement lands correctly, and the byte
     * proof below now measures the placement as well as the ink.
     */
    fitAppearancesToRect: true,
    title: form === "SCA-C906"
      ? "Petition for Expungement of Misdemeanor Violations and Traffic Citations"
      : "Petition for Expungement of Felony Violations"
  });
  return { bytes, report };
}

/* ---- render: the composed pages ---------------------------------------------- */
const RULE = (n = 70) => "_".repeat(n);

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
  const splitToken = createTokenSplitter({ fits: fitsByFontMetrics(font, fontSize, maxWidth) });
  const wrap = (line) => {
    if (!line) return [""];
    const words = line.split(/\s+/).flatMap((w) => (font.widthOfTextAtSize(w, fontSize) > maxWidth ? splitToken(w) : [w]));
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
  assert.equal(splitToken.hardSplits, 0,
    `${title}: a token was chopped mid-word to fit the column; it has no separator to break on and must not ship broken`);
  return Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
}

/**
 * The composed blanks, declared once so the field map, the counters and the
 * page text all speak about the same things.
 */
function composedBlanks(componentId) {
  const b = (id, label, what) => ({ componentId, id, label, what });
  if (componentId === "wv_acc_treatment_job_readiness-supplemental-pleading-3") {
    return [
      b("county", "County of the circuit court", "the county of conviction, the same county you wrote in the petition's caption"),
      b("circuit-case-no", "Circuit Court case number", "the circuit court case number, once the clerk has assigned one"),
      b("branch-relied-on", "Which limb of § 61-11-26a(a) you rely on",
        "write TREATMENT, JOB READINESS, or BOTH — whichever describes what you are relying on. Only you know which"),
      b("programme-name", "Name of the treatment or recovery and counselling programme",
        "the name of the programme, exactly as it appears on the documentation the provider gave you"),
      b("programme-approval", "Who approved that programme",
        "the written confirmation from the provider that the programme is approved by the Secretary of the Department of Health"),
      b("programme-dates", "The dates you were in compliance with that programme",
        "the dates your compliance covers, taken from the provider's own written documentation and not from memory"),
      b("medical-history", "Your medically documented history of substance abuse",
        "say whether you have medical documentation of a history of substance abuse, and attach it. The platform does not see, hold or assess those records"),
      b("course-name", "Name of the job readiness adult training course",
        "the name of the course you graduated from, exactly as it appears on your certificate"),
      b("course-provider", "The course provider and its approval",
        "the provider, and the written confirmation that the course is approved by the West Virginia Department of Education"),
      b("course-date", "The date you graduated", "the graduation date shown on the certificate itself"),
      b("attachments", "The documents you are attaching to this pleading",
        "list what you are actually attaching, from the checklist in this packet"),
      b("signature", "Your signature on this supplemental pleading",
        "sign it yourself. The route record requires your signature on the supplemental pleading as well as on the petition"),
      b("signature-date", "The date you sign this supplemental pleading", "the date you actually sign")
    ];
  }
  return [];
}

function supplementalPleadingBody(facts, route, packetSet, census906) {
  const caption = census906.pageText.find((p) => p.page === 1)?.lines
    .find((l) => /IN THE CIRCUIT COURT OF/i.test(l.text))?.text ?? null;
  assert.ok(caption, "SCA-C906 no longer prints its circuit court caption line, which this pleading copies");
  const blanks = Object.fromEntries(composedBlanks("wv_acc_treatment_job_readiness-supplemental-pleading-3").map((x) => [x.id, x]));
  const out = [];
  out.push(caption.replace(/\s+/g, " ").trim().replace("COUNTY", `${DOTS(30)} COUNTY`));
  out.push("");
  out.push(`IN RE: Expungement of Record of: ${facts["participant.full_legal_name"]}`);
  out.push(`Circuit Court Case No. ${DOTS(40)}`);
  out.push("");
  out.push("PETITIONER'S SUPPLEMENTAL PLEADING UNDER W. VA. CODE SEC. 61-11-26a(b)");
  out.push("");
  out.push(
    "This pleading is filed with the petitioner's official petition for expungement and supplies the documentation "
    + "that Section 61-11-26a(b) requires to be included in that petition. It is not a substitute for the petition "
    + "and is not filed on its own.");
  out.push("");
  out.push(`Petitioner: ${facts["participant.full_legal_name"]}`);
  out.push(`Address: ${facts["participant.street_address"]}`);
  out.push(`         ${facts["participant.city_state_zip"]}`);
  out.push(`Telephone: ${facts["participant.phone"]}`);
  out.push("");
  out.push(`1. Which limb of Section 61-11-26a(a) the petitioner relies on: ${DOTS(28)}`);
  out.push(`   (${blanks["branch-relied-on"].what})`);
  out.push("");
  out.push("2. Compliance with an approved substance abuse treatment or recovery and counselling programme.");
  const treatmentDoc = packetSet.documentsToObtain.find((d) => /treatment or recovery/i.test(d.description));
  assert.ok(treatmentDoc, "the packet-set manifest no longer names the treatment-compliance document this pleading recites");
  out.push("   From the packet record, in its own words:");
  out.push(`   ${treatmentDoc.description}`);
  out.push(`   Obtained from: ${treatmentDoc.obtainedFrom}`);
  out.push(`   Programme name: ${DOTS(46)}`);
  out.push(`   Approved by: ${DOTS(48)}`);
  out.push(`   Dates of compliance: ${DOTS(42)}`);
  const medicalDoc = packetSet.documentsToObtain.find((d) => /Medical documentation/i.test(d.description));
  assert.ok(medicalDoc, "the packet-set manifest no longer names the medical-history document this pleading recites");
  out.push(`   ${medicalDoc.conditionDescription}`);
  out.push(`   Medically documented history of substance abuse: ${DOTS(24)}`);
  out.push("");
  out.push("3. Graduation from an approved job readiness adult training course.");
  const courseDoc = packetSet.documentsToObtain.find((d) => /job readiness/i.test(d.description));
  assert.ok(courseDoc, "the packet-set manifest no longer names the job-readiness certificate this pleading recites");
  out.push("   From the packet record, in its own words:");
  out.push(`   ${courseDoc.description}`);
  out.push(`   Obtained from: ${courseDoc.obtainedFrom}`);
  out.push(`   Course name: ${DOTS(48)}`);
  out.push(`   Provider and approval: ${DOTS(40)}`);
  out.push(`   Date of graduation: ${DOTS(44)}`);
  out.push("");
  out.push("4. Eligibility clock. The route record for this petition states it as follows:");
  out.push(`   "${recordProse(route.acceleratedBasis, "the accelerated eligibility clock", "accelerated clock")}"`);
  out.push("");
  out.push("5. Documents attached to this pleading:");
  out.push(`   ${DOTS(66)}`);
  out.push(`   ${DOTS(66)}`);
  out.push(`   (${blanks.attachments.what})`);
  out.push("");
  out.push(`Signature requirement, from the route record: "${recordProse(route.signatureRequirements[0], "signature requirements")}"`);
  out.push("");
  /* One rule per line with its own caption beneath it. A composed page is laid
   * out by a word-wrapping renderer that collapses runs of whitespace, so two
   * captions separated by spaces on one line arrive as "Signature of Petitioner
   * Date" under two rules that no longer line up with either of them. */
  out.push(RULE(52));
  out.push("Signature of Petitioner");
  out.push("");
  out.push(RULE(26));
  out.push("Date");
  out.push("");
  out.push(
    "This pleading was prepared from the petitioner's own details and from the packet record. Every blank above is "
    + "the petitioner's to complete before filing. Nothing on this page is sworn until the petitioner signs it.");
  return out.join("\n");
}

function recordsChecklistBody(facts, packetSet) {
  const out = [];
  out.push("RECORDS CHECKLIST");
  out.push("");
  out.push(`Prepared for: ${facts["participant.full_legal_name"]}`);
  out.push("");
  out.push(
    "Every item below comes from this packet's own record of what the filing needs. Tick each one when you actually "
    + "have it in your hand. LegalEase does not see, hold or assess any of these documents.");
  out.push("");
  for (const [i, d] of packetSet.documentsToObtain.entries()) {
    out.push(`${i + 1}. [ ] ${d.description}`);
    out.push(`      Where to get it: ${d.obtainedFrom}`);
    if (d.conditionDescription) out.push(`      When it applies: ${d.conditionDescription}`);
    out.push("");
  }
  out.push("Then check your own answers against those documents:");
  out.push("");
  for (const a of packetSet.answersToConfirm) out.push(`   [ ] ${a.description}`);
  out.push("");
  out.push("And complete these by hand before filing:");
  out.push("");
  for (const f of packetSet.fieldsToComplete) out.push(`   [ ] ${f.description}`);
  out.push("");
  out.push(
    "If any document above disagrees with what you told us, the document is right and the packet is wrong. Correct "
    + "the packet before you sign anything.");
  return out.join("\n");
}

function filingInstructionsPageBody(facts, route, packetSet) {
  const out = [];
  out.push("FILING INSTRUCTIONS");
  out.push("");
  out.push(`Prepared for: ${facts["participant.full_legal_name"]}`);
  out.push("");
  out.push("WHICH PETITION YOU FILE. This packet contains two official petitions and you file exactly one.");
  for (const c of COMPONENTS.filter((x) => x.kind === "official_pdf_fill")) {
    out.push(`   ${c.form}: ${packetSet.conditions[c.id]}`);
  }
  out.push("");
  out.push(
    "The packet does not choose between them. Whether a felony is a nonviolent felony is a legal characterisation of "
    + "your own record, and the packet record names it a manual completion item. File the one that fits and leave "
    + "the other out.");
  out.push("");
  out.push("WHERE IT GOES.");
  out.push(`   "${recordProse(route.circuitBasis, "the filing destination", "circuit court")}"`);
  out.push("");
  out.push("WHAT IT COSTS.");
  for (const f of route.filingFee) out.push(`   "${recordProse(f, "the filing fee")}"`);
  for (const f of route.feeWaiver) out.push(`   "${recordProse(f, "the fee waiver treatment")}"`);
  out.push("");
  out.push("SIGNING AND SWEARING.");
  out.push(`   "${recordProse(route.signatureRequirements[0], "signature requirements")}"`);
  out.push(`   Notarisation: "${recordProse(route.notarizationRequirements[0], "notarisation requirements")}"`);
  out.push("");
  out.push("SERVICE.");
  assert.ok(packetSet.serveAction, "the packet-set manifest no longer records who the participant serves");
  out.push(`   "${packetSet.serveAction.description}"`);
  out.push(
    "   The certificate of service page of whichever petition you file lists the recipients the form itself names, "
    + "and you write each address. Complete and sign that page on the day you actually serve, not before.");
  out.push("");
  out.push("FILING.");
  assert.ok(packetSet.fileAction, "the packet-set manifest no longer records the filing step");
  out.push(`   "${packetSet.fileAction.description}"`);
  out.push("");
  out.push("IF IT IS OPPOSED.");
  out.push(`   "${recordProse(route.contestedHandoff[0], "the contested handoff")}"`);
  out.push("");
  out.push(
    "WHAT THIS PACKET IS NOT. It is a prepared copy of official West Virginia forms with a supplemental pleading. It "
    + "is not legal advice, it is not filed for you, and it does not decide whether your record can be expunged. A "
    + "circuit judge decides that.");
  return out.join("\n");
}

/* ---- byte proof -------------------------------------------------------------- */
const INK_OPS = /(?:^|[\s])(?:S|s|f\*?|F|B\*?|b\*?|sh|Do)(?=[\s]|$)/g;
const PATH_ONLY_OPS = /(?:^|[\s])(?:re|m|l|c|v|y|h|W\*?|n)(?=[\s]|$)/g;
const inflate = (buf) => { try { return zlib.inflateSync(buf); } catch { return buf; } };
const countInkOps = (s) => (String(s).match(INK_OPS) ?? []).length;
const countPathOnlyOps = (s) => (String(s).match(PATH_ONLY_OPS) ?? []).length;
const nonWhitespaceGlyphs = (s) => (String(s).match(/\S/g) ?? []).length;

async function checkBoxAppearanceBaseline(source) {
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true });
  const ctx = doc.context;
  const baseline = new Map();
  for (const field of doc.getForm().getFields()) {
    if (field.constructor.name !== "PDFCheckBox") continue;
    for (const w of field.acroField.getWidgets()) {
      const ap = ctx.lookup(w.dict.get(PDFName.of("AP")));
      if (!ap) continue;
      const n = ctx.lookup(ap.get(PDFName.of("N")));
      if (!n || typeof n.get !== "function") continue;
      const states = typeof n.keys === "function" ? n.keys().map((k) => k.asString()) : [];
      const off = n.get(PDFName.of("Off"));
      let offInkOps = null;
      if (off) offInkOps = countInkOps(inflate(Buffer.from(ctx.lookup(off).contents)).toString("latin1"));
      const on = states.find((s) => s !== "/Off");
      let onInkOps = null;
      if (on) {
        const stream = ctx.lookup(n.get(PDFName.of(on.replace(/^\//, ""))));
        if (stream?.contents) onInkOps = countInkOps(inflate(Buffer.from(stream.contents)).toString("latin1"));
      }
      baseline.set(field.getName(), { states, offStreamPresent: Boolean(off), offInkOps, onInkOps });
    }
  }
  return baseline;
}

/** Every flattened appearance's own /BBox and /Matrix, from the artifact. */
async function flattenedAppearanceBoxes(file) {
  const doc = await PDFDocument.load(fs.readFileSync(file), { ignoreEncryption: true, updateMetadata: false });
  const ctx = doc.context;
  const boxes = new Map();
  for (const page of doc.getPages()) {
    const resources = page.node.get(PDFName.of("Resources"));
    const xObjects = resources && ctx.lookup(resources).get(PDFName.of("XObject"));
    if (!xObjects) continue;
    const dict = ctx.lookup(xObjects);
    for (const key of dict.keys()) {
      const obj = ctx.lookup(dict.get(key));
      if (!obj?.dict) continue;
      const bboxRaw = ctx.lookup(obj.dict.get(PDFName.of("BBox")));
      const matrixRaw = ctx.lookup(obj.dict.get(PDFName.of("Matrix")));
      if (!bboxRaw || typeof bboxRaw.asArray !== "function") continue;
      boxes.set(key.asString().replace(/^\//, ""), {
        bbox: bboxRaw.asArray().map((v) => Number(v.asNumber().toFixed(3))),
        matrix: matrixRaw && typeof matrixRaw.asArray === "function"
          ? matrixRaw.asArray().map((v) => Number(v.asNumber().toFixed(4))) : null
      });
    }
  }
  return boxes;
}

async function flattenedAppearanceBodies(file) {
  const doc = await PDFDocument.load(fs.readFileSync(file), { ignoreEncryption: true, updateMetadata: false });
  const ctx = doc.context;
  const bodies = new Map();
  for (const page of doc.getPages()) {
    const resources = page.node.get(PDFName.of("Resources"));
    const xObjects = resources && ctx.lookup(resources).get(PDFName.of("XObject"));
    if (!xObjects) continue;
    const dict = ctx.lookup(xObjects);
    for (const key of dict.keys()) {
      const obj = ctx.lookup(dict.get(key));
      if (!obj?.contents) continue;
      bodies.set(key.asString().replace(/^\//, ""), inflate(Buffer.from(obj.contents)).toString("latin1"));
    }
  }
  return bodies;
}

async function petitionByteProof(form, source, census, artifactFile, fixtureName, report) {
  const widgets = await flattenedWidgets(path.join(ROOT, artifactFile));
  const bodies = await flattenedAppearanceBodies(path.join(ROOT, artifactFile));
  const boxBaseline = await checkBoxAppearanceBaseline(source);
  const appearanceBoxes = await flattenedAppearanceBoxes(path.join(ROOT, artifactFile));
  /*
   * WHERE AN APPEARANCE ACTUALLY LANDS, not merely where it is placed.
   *
   * `drawnAt` matches the placement operator's translation against the widget
   * rectangle, which answers "was this appearance placed at this widget" and
   * NOT "does its ink fall inside this widget". A stream whose /BBox is in page
   * coordinates draws far from the point it is placed at, and every
   * rectangle-based reading calls that clean. So the effective box is computed
   * here — the /BBox mapped through its /Matrix and then by the placement — and
   * compared with the widget's own rectangle.
   */
  const placedBoxOf = (drawn) => {
    const box = appearanceBoxes.get(drawn.appearance);
    if (!box) return null;
    const [a, b, c, d, e, f] = box.matrix ?? [1, 0, 0, 1, 0, 0];
    const [x0, y0, x1, y1] = box.bbox;
    const corners = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
      .map(([x, y]) => [a * x + c * y + e + drawn.x, b * x + d * y + f + drawn.y]);
    return {
      x: Math.min(...corners.map((p) => p[0])), y: Math.min(...corners.map((p) => p[1])),
      width: Math.max(...corners.map((p) => p[0])) - Math.min(...corners.map((p) => p[0])),
      height: Math.max(...corners.map((p) => p[1])) - Math.min(...corners.map((p) => p[1]))
    };
  };

  /*
   * WHAT THE ISSUER ALREADY DREW, READ FROM THE ISSUER'S OWN BYTES.
   *
   * flattenedWidgets reports every XObject the page content places, not only
   * the appearances a flatten added — and these two binaries place an IMAGE
   * (the Supreme Court of Appeals seal, "Im0") on all four pages. Reading its
   * bytes as show-text operands yields 316 characters of garbage per page, and
   * counting those as ink this build put outside its write boxes reported 1,264
   * added glyphs per petition on a packet whose only writes are four lines of a
   * caption block.
   *
   * So the source's own placements are read the same way and subtracted. What
   * is left is what THIS BUILD added, which is what the counter is about. The
   * same reasoning applies to the check boxes: these forms ship a real /Off
   * appearance that STROKES a square, so an unticked box legitimately carries
   * one ink operator, and "marked" is measured against the source's own /Off
   * baseline rather than against zero.
   */
  const sourceAppearances = await flattenedWidgets(source.absolutePath);
  const preExisting = (w) => sourceAppearances.some((s) => s.page === w.page
    && Math.abs(s.x - w.x) <= 1 && Math.abs(s.y - w.y) <= 1 && s.text === w.text);

  const actualWrites = [];
  const selectionsRead = [];
  const refusedFieldsWithInk = [];
  const synthesizedAppearancesFound = [];
  const appearancePlacementDefects = [];
  let glyphs = 0;
  const writtenByFinalizer = new Set(report.written.map((w) => w.field));

  for (const r of census.rows) {
    for (const wdg of r.widgets) {
      const drawn = drawnAt(widgets, { page: wdg.page, rect: wdg.rect });
      const ink = drawn.map((d) => d.text).filter(Boolean).join("").trim();
      const inkOps = drawn.reduce((n, d) => n + countInkOps(bodies.get(d.appearance) ?? ""), 0);
      const pathOnlyOps = drawn.reduce((n, d) => n + countPathOnlyOps(bodies.get(d.appearance) ?? ""), 0);

      if (r.isSelectionControl) {
        const baseline = boxBaseline.get(r.name) ?? null;
        const placed = drawn.map((d) => placedBoxOf(d)).filter(Boolean);
        const misplaced = placed.filter((b) => Math.abs(b.x - wdg.rect.x) > 1.5 || Math.abs(b.y - wdg.rect.y) > 1.5);
        if (misplaced.length > 0) {
          appearancePlacementDefects.push({
            field: r.key, page: wdg.page, widgetRect: wdg.rect, drawnAt: misplaced,
            why:
              "the appearance stamped for this control draws outside the widget rectangle it belongs to. Under ISO "
              + "32000-1 12.5.5 the appearance's /BBox is mapped onto the /Rect; a stream whose BBox is in page "
              + "coordinates lands at roughly twice its own offset when a flatten emits the translation alone."
          });
        }
        selectionsRead.push({
          appearanceDrawsAt: placed,
          appearanceLandsInsideItsOwnWidgetRect: misplaced.length === 0,
          control: r.name, form, page: wdg.page, rect: wdg.rect,
          glyphChannel: ink, appearancesStampedInOutput: drawn.length,
          inkOperatorsInOutput: inkOps, pathConstructionAndClipOperatorsInOutput: pathOnlyOps,
          sourceAppearanceStates: baseline?.states ?? [],
          sourceShipsAnOffAppearance: baseline?.offStreamPresent ?? null,
          inkOperatorsInSourceOnAppearance: baseline?.onInkOps ?? null,
          inkOperatorsInSourceOffAppearance: baseline?.offInkOps ?? null,
          marked: ink.length > 0 || inkOps > (baseline?.offInkOps ?? 0),
          expectedMarked: false,
          basisForReadingItUnmarked:
            "these forms ship a real /Off appearance that strokes a square, so an unticked box carries the issuer's "
            + "own ink. The box is read as marked only when the output draws a glyph or MORE ink operators than the "
            + "source's own /Off stream for the same widget."
        });
        if (ink.length > 0 || inkOps > (baseline?.offInkOps ?? 0)) {
          synthesizedAppearancesFound.push({
            field: r.key, page: wdg.page, rect: wdg.rect, inkOps,
            sourceOnStateInkOps: baseline?.onInkOps ?? null,
            why: "a selection control this packet does not make marks the page in the output"
          });
          refusedFieldsWithInk.push({ fieldId: r.key, page: wdg.page, drawnText: [ink], inkOps });
        }
        continue;
      }

      if (drawn.length === 0) continue;
      if (!writtenByFinalizer.has(r.name)) {
        const added = drawn.filter((d) => !preExisting(d));
        const addedInk = added.reduce((n, d) => n + countInkOps(bodies.get(d.appearance) ?? ""), 0);
        const addedText = added.map((d) => d.text).filter(Boolean).join("").trim();
        if (addedText.length > 0 || addedInk > 0) {
          refusedFieldsWithInk.push({ fieldId: r.key, page: wdg.page, drawnText: [addedText], inkOps: addedInk, pathOnlyOps });
        }
        continue;
      }
      glyphs += nonWhitespaceGlyphs(ink);
      actualWrites.push({ field: r.key, factId: r.fact, page: wdg.page, rect: wdg.rect, drawnText: [ink] });
    }
  }

  const writeRects = census.rows.filter((r) => writtenByFinalizer.has(r.name))
    .flatMap((r) => r.widgets.map((w) => ({ page: w.page, rect: w.rect })));
  const outsideWriteBoxes = [];
  let outsideGlyphs = 0;
  let preExistingAppearancesSubtracted = 0;
  for (const w of widgets) {
    const inside = writeRects.some((b) => b.page === w.page
      && Math.abs(w.x - b.rect.x) <= 2 && Math.abs(w.y - b.rect.y) <= 2);
    if (inside) continue;
    if (preExisting(w)) { preExistingAppearancesSubtracted += 1; continue; }
    const count = nonWhitespaceGlyphs(w.text ?? "");
    if (count === 0) continue;
    outsideGlyphs += count;
    outsideWriteBoxes.push({ page: w.page, x: w.x, y: w.y, appearance: w.appearance, text: w.text.slice(0, 120), glyphs: count });
  }

  return {
    form, fixture: fixtureName,
    actualWrites, selectionsRead, refusedFieldsWithInk, synthesizedAppearancesFound,
    appearancePlacementDefects,
    glyphs, outsideGlyphs, outsideWriteBoxes, appearances: widgets.length,
    appearancesInTheSourceItself: sourceAppearances.length, preExistingAppearancesSubtracted
  };
}

/**
 * The composed pages, read from the assembled packet's own bytes.
 *
 * A composed page has no widget rectangles, so "ink outside a measured write
 * box" has to mean something else on it, and it is measured rather than
 * declared: the delivered page text, with whitespace removed, must equal the
 * composed body this build authored, with whitespace removed. Line wrapping
 * changes whitespace and nothing else, so any surviving difference is a glyph
 * on the delivered page that this build did not compose — which is exactly what
 * the counter is for.
 */
function composedByteProof(componentId, composedBody, deliveredPageTexts, facts) {
  const strip = (s) => String(s).replace(/\s+/g, "");
  const delivered = strip(deliveredPageTexts.join(""));
  const authored = strip(sanitizePdfText(composedBody));
  let outsideGlyphs = 0;
  let firstDifferenceAt = null;
  if (delivered !== authored) {
    const n = Math.min(delivered.length, authored.length);
    let i = 0;
    while (i < n && delivered[i] === authored[i]) i += 1;
    firstDifferenceAt = i;
    outsideGlyphs = Math.abs(delivered.length - authored.length) + (delivered.length === authored.length ? 1 : 0);
  }
  const factsFound = Object.entries(facts)
    .filter(([, v]) => typeof v === "string" && v.length > 0 && strip(composedBody).includes(strip(v)))
    .map(([k, v]) => ({ factId: k, foundInDeliveredBytes: delivered.includes(strip(v)), glyphs: nonWhitespaceGlyphs(v) }));
  return {
    componentId,
    proofMethod:
      "the delivered page text of this component, whitespace removed, compared character for character against the "
      + "body this build composed, whitespace removed. Line wrapping changes whitespace and nothing else, so any "
      + "difference is a glyph on the page this build did not author.",
    deliveredCharacters: delivered.length, authoredCharacters: authored.length,
    identicalIgnoringWhitespace: delivered === authored, firstDifferenceAt,
    nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: outsideGlyphs,
    addedGlyphsReadFromOutputBytes: factsFound.filter((f) => f.foundInDeliveredBytes).reduce((n, f) => n + f.glyphs, 0),
    factsWritten: factsFound
  };
}

/* ---- field map ---------------------------------------------------------------- */
function quote(entry, what) {
  const text = String(entry ?? "").replace(/\s*\n\s*/g, " — ").replace(/\s+/g, " ").trim();
  assert.ok(text.length > 0, `the record's ${what} is empty and this packet will not print an empty quotation`);
  return text;
}

/**
 * The PROSE half of a record entry, for a page a court reads.
 *
 * Several route-census cells are stored as a newline-joined tuple whose leading
 * elements are the record's own field names and whose last element is the
 * sentence a person can read. The eligibility clock is one:
 *
 *   "elapsed_eligibility_clock \n 90 days \n disposition_date \n ninety days of
 *    programme compliance OR completion of an approved job readiness adult
 *    training course, or both where applicable; ..."
 *
 * `quote` joins that whole tuple, which is right for an audit record and wrong
 * for a pleading. The first render of this family printed
 * "elapsed_eligibility_clock - 90 days - disposition_date - ..." onto page 2 of
 * a document filed with a circuit judge. This build's own internal field names
 * do not belong on a court filing.
 *
 * So a delivered page prints the LAST segment — the record's own sentence, not
 * one word of it changed — and the full tuple stays in production-field-map.json
 * where the audit reads it. The extraction is asserted non-empty and asserted
 * to still carry the phrase the family reasons from.
 */
function recordProse(entry, what, mustContain = null) {
  const segments = String(entry ?? "").split("\n").map((x) => x.trim()).filter((x) => x.length > 0);
  const text = (segments[segments.length - 1] ?? "").replace(/\s+/g, " ").trim();
  assert.ok(text.length > 0, `the record's ${what} has no prose segment and this packet will not print an empty quotation`);
  if (mustContain) {
    assert.ok(text.toLowerCase().includes(mustContain.toLowerCase()),
      `the record's ${what} prose segment no longer carries "${mustContain}"; the delivered page quotes it, so the build stops`);
  }
  return text;
}

function geometryRefusalsOf(report) {
  const out = new Map();
  for (const u of report.unfittable ?? []) {
    out.set(u.field, {
      field: u.field, factId: u.factId ?? null, kind: "width",
      reason: u.reason ?? "value_does_not_fit_the_widget_at_a_readable_size",
      measurement: { outcome: u.outcome ?? null, fontSize: u.fontSize ?? null, minFontSize: u.minFontSize ?? null }
    });
  }
  for (const r of report.refused ?? []) {
    if (r.reason !== "value_exceeds_form_max_length") continue;
    out.set(r.field, {
      field: r.field, factId: r.factId ?? null, kind: "max_length", reason: r.reason,
      measurement: { declaredMaxLength: r.maxLength ?? null, valueLength: r.valueLength ?? null }
    });
  }
  return out;
}

function petitionSide(component, census, report, fixtureName) {
  const written = new Set(report.written.map((w) => w.field));
  const geometry = geometryRefusalsOf(report);
  const writes = [];
  const refusals = [];
  const selectionControls = [];

  for (const r of census.rows) {
    const base = {
      field: `${component.id}/${r.key}`, fieldName: `${component.id}/${r.key}`,
      acroFieldName: r.name, form: r.form,
      page: r.page, rect: r.rect, rectBasis: r.rectBasis,
      printedLabel: r.caption, printedLine: r.printedItem ?? r.printedParagraph ?? r.caption,
      sectionHeading: r.section, regionHeading: r.effectiveLabel,
      effectiveLabel: r.effectiveLabel,
      captionBasis:
        "the printed caption is re-read from the pinned binary on the widget's own page within a measured band above "
        + "it; an eligibility branch is labelled from the PARAGRAPH printed beside it and a certificate-of-service "
        + "line from the NUMBERED ITEM printed above it, because the field names on these two forms do not describe "
        + "what the paper says",
      recipientNumber: r.recipientNumber, branch: r.branch, chargeRow: r.chargeRow,
      sharedRegistryWouldBindFromName: r.sharedRegistryWouldBindFromName,
      sharedRegistryWouldBindFromThisBuildsLabel: r.sharedRegistryWouldBindFromThisBuildsLabel,
      document: component.id
    };

    if (r.policy === "write") {
      if (written.has(r.name)) {
        writes.push({ ...base, factId: r.fact, kind: r.type, writeChannel: "finalizer_descriptor_channel" });
        continue;
      }
      const g = geometry.get(r.name);
      const held = FIXTURES[fixtureName][r.fact] ?? null;
      const measuredWhy = g && g.kind === "max_length"
        ? `the form limits this box to ${g.measurement.declaredMaxLength} characters and the value held for you is `
          + `${g.measurement.valueLength}`
        : `the box the form prints is ${r.rect?.width ?? "?"} points wide and the value held for you is `
          + `${held === null ? "?" : String(held).length} characters, which will not fit inside it even at the `
          + `smallest size that stays readable (${g?.measurement?.minFontSize ?? "?"} point)`;
      refusals.push({
        ...base,
        reason: `the value this ${fixtureName} participant holds will not fit the box the form prints: ${measuredWhy}`,
        measuredWhy, category: null, completenessClass: null, class: null,
        disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
        requiredBeforeFiling: true, identity: `${r.form} field ${r.name}`,
        factId: r.fact, routeDetermined: false,
        heldButNotPrinted: true, heldValue: held, geometryRefusal: g ?? null,
        why: "the packet refuses the write rather than shortening it",
        participantMustSupply:
          `write this in by hand — the platform holds it but this box will not take it whole. What it holds: `
          + `${held ?? "(not held)"}. Never shorten your own details to fit a box.`
      });
      continue;
    }

    if (r.policy === "off_route") {
      selectionControls.push({
        ...base, selectionId: base.field, kind: "selection_control", type: r.type, widgets: r.widgets,
        disposition: "explicit_refusal", reason: r.condition,
        category: null, completenessClass: null, class: null,
        completenessDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
        routeConditionThatMakesItInapplicable: r.condition,
        requiredBeforeFiling: false, routeDetermined: false,
        printedParagraph: r.printedParagraph, why: r.condition
      });
      if (!r.isSelectionControl) {
        refusals.push({
          ...base, reason: r.condition, category: null, completenessClass: null, class: null,
          disposition: "NOT_APPLICABLE_ON_THIS_ROUTE", completenessDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
          routeConditionThatMakesItInapplicable: r.condition,
          requiredBeforeFiling: false, routeDetermined: false, why: r.condition
        });
      }
      continue;
    }

    if (r.policy === "case_fact") {
      const row = {
        ...base, reason: `the case decides this, not the route: ${r.what}`,
        category: null, completenessClass: null, class: null,
        disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
        requiredBeforeFiling: true, identity: `${r.form} field ${r.name}`,
        factId: null, routeDetermined: false,
        determinedByTheCaseNotTheRoute: true,
        whyTheRouteCannotDetermineIt: r.whyTheRouteCannotDetermineIt,
        printedParagraph: r.printedParagraph,
        why: r.whyTheRouteCannotDetermineIt, participantMustSupply: r.what
      };
      if (r.isSelectionControl) {
        selectionControls.push({ ...row, selectionId: base.field, kind: "selection_control", type: r.type, widgets: r.widgets });
      }
      refusals.push(row);
      continue;
    }

    if (r.policy === "protect") {
      const row = {
        ...base, reason: r.why, category: r.refusalClass,
        completenessClass: r.refusalClass, class: r.refusalClass,
        requiredBeforeFiling: false, routeDetermined: false, why: r.why
      };
      if (r.isSelectionControl) {
        selectionControls.push({ ...row, selectionId: base.field, kind: "selection_control", type: r.type, widgets: r.widgets, disposition: "protected" });
      }
      refusals.push(row);
      continue;
    }

    if (r.policy === "chrome") {
      refusals.push({
        ...base, reason: `viewer ui control; never a filing fact: ${r.why}`,
        category: null, completenessClass: null, class: null,
        requiredBeforeFiling: false, routeDetermined: false, why: r.why
      });
      continue;
    }

    refusals.push({
      ...base,
      reason: `the participant supplies this before filing: ${r.what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true, identity: `${r.form} field ${r.name}`,
      factId: null, routeDetermined: false,
      ...(r.registryGap ? { sharedRegistryWouldHaveWritten: r.registryGap } : {}),
      why: `the platform holds no value it may write here and the participant supplies it before filing: ${r.what}`,
      participantMustSupply: r.what
    });
  }
  return { writes, refusals, selectionControls };
}

function composedSide(component, facts) {
  const writes = [];
  const refusals = [];
  /* The participant facts this build actually prints on the composed page. */
  const printed = component.id.endsWith("-3")
    ? ["participant.full_legal_name", "participant.street_address", "participant.city_state_zip", "participant.phone"]
    : ["participant.full_legal_name"];
  for (const factId of printed) {
    writes.push({
      field: `${component.id}/${factId}`, fieldName: `${component.id}/${factId}`,
      effectiveLabel: `${factId.replace("participant.", "").replace(/_/g, " ")} on the composed page`,
      page: null, sectionHeading: component.role, document: component.id,
      factId, kind: "composed_text", writeChannel: "composed_page_authored_from_held_facts",
      value: facts[factId]
    });
  }
  for (const b of composedBlanks(component.id)) {
    refusals.push({
      field: `${component.id}/${b.id}`, fieldName: `${component.id}/${b.id}`,
      effectiveLabel: b.label, page: null, sectionHeading: component.role, document: component.id,
      reason: `the participant supplies this before filing: ${b.what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true, identity: `${component.id} blank ${b.id}`,
      factId: null, routeDetermined: false,
      why: `the platform holds no value it may write here: ${b.what}`,
      participantMustSupply: b.what
    });
  }
  return { writes, refusals, selectionControls: [] };
}

/* ---- the builder's own count of the nine counters ------------------------------ */
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
      routeConditionThatMakesItInapplicable: r.routeConditionThatMakesItInapplicable ?? null,
      determinedByTheCaseNotTheRoute: r.determinedByTheCaseNotTheRoute === true,
      whyTheRouteCannotDetermineIt: r.whyTheRouteCannotDetermineIt ?? null,
      identity: r.identity ?? null, factId: r.factId ?? null
    }
  });

  const writes = maps.flatMap((m) => m.canonicalWrites.map((w) => row(w)));
  const blanks = [];
  const seen = new Set();
  for (const m of maps) {
    for (const r of m.canonicalRefusals) { if (seen.has(r.field)) continue; seen.add(r.field); blanks.push(row(r, false)); }
    for (const c of m.selectionControls) { if (seen.has(c.field)) continue; seen.add(c.field); blanks.push(row(c, true)); }
  }

  const availableFacts = new Set(writes.flatMap((w) => (w.factId ? [w.factId] : [])));
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
      note("invisibleWrites", { component: p.componentOrForm, fixture: p.fixture, why: "values were reported and the output bytes carry no glyph and no flattened appearance" });
    }
    if ((p.valuesReportedByFinalizer ?? 0) > 0 && (p.addedGlyphsReadFromOutputBytes ?? 0) === 0) {
      note("invisibleWrites", { component: p.componentOrForm, fixture: p.fixture, why: "values were reported and no glyph was read from the output bytes" });
    }
    if ((p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) {
      note("visualDefects", { component: p.componentOrForm, fixture: p.fixture, why: "ink on the delivered page that this build did not write or compose", where: p.glyphsOutsideMeasuredWriteBoxes ?? null });
    }
    for (const s of p.synthesizedAppearancesFound ?? []) {
      note("visualDefects", { component: p.componentOrForm, fixture: p.fixture, field: s.field, why: s.why });
    }
    for (const d of p.appearancePlacementDefects ?? []) {
      note("visualDefects", { component: p.componentOrForm, fixture: p.fixture, field: d.field, why: d.why, drawnAt: d.drawnAt, widgetRect: d.widgetRect });
    }
    for (const refused of p.refusedFieldsWithInk ?? []) {
      note("protectedWrites", { component: p.componentOrForm, fixture: p.fixture, field: refused.fieldId, why: "a field the map refused carries ink in the output" });
    }
  }
  for (const w of writes) {
    if (classifyField(w.label, false).requirement === "PROTECTED") {
      note("protectedWrites", { field: w.id, label: w.label, why: "a protected field was written" });
    }
  }

  const rendered = artifacts.map((a) => `${a.file} ${(a.documents ?? []).join(" ")}`).join(" ").toLowerCase();
  for (const m of maps) {
    if (!rendered.includes(String(m.formNumber).toLowerCase())) {
      note("requiredComponentsMissing", { component: m.formNumber, why: "the field map names this component and it appears in no rendered artifact" });
    }
  }

  return { counters, findings, ledger };
}

/* ---- artifacts ------------------------------------------------------------------ */
function writeJson(rel, value) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(value, null, 2)}\n`);
}

function requiredBeforeFilingItems(maps, side = "canonicalRefusals") {
  const seen = new Set();
  return maps.flatMap((m) => m[side]
    .filter((r) => r.requiredBeforeFiling === true)
    .filter((r) => { if (seen.has(r.field)) return false; seen.add(r.field); return true; })
    .map((r) => ({
      component: m.formNumber, form: r.form ?? null, field: r.field, page: r.page, rect: r.rect,
      section: r.sectionHeading, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply,
      ...(r.branch ? { branch: r.branch, printedParagraph: r.printedParagraph } : {}),
      ...(r.recipientNumber ? { recipientNumber: r.recipientNumber } : {}),
      ...(r.determinedByTheCaseNotTheRoute ? { determinedByTheCaseNotTheRoute: true, whyTheRouteCannotDetermineIt: r.whyTheRouteCannotDetermineIt } : {}),
      ...(r.measuredWhy ? { measuredWhy: r.measuredWhy } : {}),
      ...(r.heldButNotPrinted ? { heldButNotPrinted: true, heldValue: r.heldValue } : {}),
      ...(r.sharedRegistryWouldHaveWritten ? { sharedRegistryWouldHaveWritten: r.sharedRegistryWouldHaveWritten } : {})
    })));
}

function participantInstructions(maps, rbf, boundaryOnlyRbf, route, packetSet, sources, censuses) {
  const offRoute = maps.flatMap((m) => m.selectionControls.filter((c) => c.completenessDisposition === "NOT_APPLICABLE_ON_THIS_ROUTE"));
  const writes = maps.flatMap((m) => m.canonicalWrites);
  const out = [];

  out.push("# Filing instructions — clear a West Virginia conviction on the accelerated § 61-11-26a route", "");
  out.push(
    "This packet is built for **one** route: the accelerated expungement West Virginia allows where you have complied "
    + "with an approved treatment or recovery programme, or graduated from an approved job readiness course, or both. "
    + "It is not the ordinary waiting-period route.", ""
  );
  out.push(`The route record states the clock this way: _"${recordProse(route.acceleratedBasis, "the accelerated clock", "accelerated clock")}"_`, "");

  out.push("## What is in this packet, and which parts you actually file", "");
  out.push("| # | Component | What it is |", "| --- | --- | --- |");
  for (const [i, c] of COMPONENTS.entries()) {
    const what = c.kind === "official_pdf_fill"
      ? `Official form **${c.form}** — ${packetSet.conditions[c.id] ?? "required"}`
      : c.kind === "page_of_the_official_petition"
        ? `Page ${c.onPage} of ${c.form} (and the same page of SCA-C907 if you file that one instead)`
        : c.kind === "custom_pleading" ? "A pleading prepared for you, to be signed and filed with the petition"
          : "Guidance for you — not filed";
    out.push(`| ${i + 1} | ${c.id} | ${what} |`);
  }
  out.push("");

  out.push("## Which of the two petitions you file — the packet does not choose", "");
  for (const c of COMPONENTS.filter((x) => x.kind === "official_pdf_fill")) {
    out.push(`- **${c.form}** — ${packetSet.conditions[c.id]}`);
  }
  out.push("");
  out.push(
    "**File exactly one of them.** Whether a felony is a *nonviolent* felony is a legal characterisation of your own "
    + "record, and this packet's own record names it a manual completion item, so nothing here decides it for you. "
    + "The two forms are not interchangeable: they recite different waiting periods, and their certificates of "
    + "service do not even list the same recipients.", ""
  );

  out.push("## Part (c) — the eligibility branch, and the two branches this packet has ruled out", "");
  out.push(
    "Page 1 of each petition offers four eligibility branches and you tick one. **This packet has ticked none**, but "
    + "it has narrowed them: two of the four are not available on this route at all.", ""
  );
  out.push("| The branch the form prints | Why this packet does not tick it |", "| --- | --- |");
  for (const c of offRoute) {
    out.push(`| ${c.effectiveLabel} (${c.form}) | ${c.routeConditionThatMakesItInapplicable} |`);
  }
  out.push("");
  out.push(
    "The other two branches — the ones that cite § 61-11-26a — are both yours. They differ only in whether you have "
    + "**one** conviction to clear or **several**, which only your own record says. Tick the one that fits and write "
    + "the date of eligibility the paragraph asks for.", ""
  );
  out.push(
    "**Read the paragraph, not the tick-box's position.** On the misdemeanour form all four boxes are named after "
    + "felonies in the file itself — the form was built from the felony one — so this packet labelled each branch "
    + "from the paragraph printed beside it and you should read it the same way.", ""
  );

  out.push("## What this packet already filled in", "");
  out.push("| Component | The blank | What it says |", "| --- | --- | --- |");
  for (const w of writes) out.push(`| ${w.document} | ${w.effectiveLabel} | from the details you gave the platform |`);
  out.push("");
  out.push("**Check every one of them against your own papers before you sign.** You are signing the petition, not the platform.", "");

  out.push("## Your date of birth — deliberately left blank", "");
  out.push(
    "Both petitions print `DOB: __ / __ / __` with **no order printed beneath the slots**. This binary's own field "
    + "names call the three slots day, month and year, while these courts' forms are conventionally month, day and "
    + "year. One of those is wrong and the paper does not say which, so the packet wrote none of the three rather "
    + "than fill two correctly and one wrongly on a sworn petition. Write your date of birth yourself.", ""
  );

  out.push("## The documents you must have before you file", "");
  for (const [i, d] of packetSet.documentsToObtain.entries()) {
    out.push(`${i + 1}. **${d.description}**`);
    out.push(`   - Where to get it: ${d.obtainedFrom}`);
    if (d.conditionDescription) out.push(`   - When it applies: ${d.conditionDescription}`);
  }
  out.push("");
  out.push(`The route record names the attachment requirement in terms: _"${recordProse(route.requiredParticipantAttachments[0], "required attachments")}"_`, "");

  out.push("## Signing, swearing and serving", "");
  out.push(`- **Signing:** _"${recordProse(route.signatureRequirements[0], "signature requirements")}"_`);
  out.push(`- **Notarisation:** _"${recordProse(route.notarizationRequirements[0], "notarisation requirements")}"_ The verification page carries **no fillable boxes at all** for the notarial block — the notary completes it on paper.`);
  out.push(`- **Service:** _"${packetSet.serveAction.description}"_`);
  out.push(
    "- **The certificate of service is the last thing you complete.** It states that you have ALREADY given a copy "
    + "to each recipient. Everything on that page is blank on your copy — including your own name — because when "
    + "this packet was prepared you had not served anyone. Fill it in, tick the method and sign it on the day you "
    + "actually serve."
  );
  out.push("");

  out.push("## Where it goes and what it costs", "");
  out.push(`- **Where:** _"${recordProse(route.circuitBasis, "the filing destination", "circuit court")}"_`);
  for (const f of route.filingFee) out.push(`- **Fee:** _"${recordProse(f, "the filing fee")}"_`);
  for (const f of route.feeWaiver) out.push(`- **Waiver:** _"${recordProse(f, "the fee waiver")}"_`);
  out.push(`- **Filing:** _"${packetSet.fileAction.description}"_`);
  out.push(`- **If it is opposed:** _"${recordProse(route.contestedHandoff[0], "the contested handoff")}"_`);
  out.push("");

  out.push("## Every blank you must complete", "");
  out.push("| Component | The blank | What to write |", "| --- | --- | --- |");
  for (const i of rbf) out.push(`| ${i.component} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
  out.push("");

  if (boundaryOnlyRbf.length > 0) {
    out.push("## Blanks the form itself is too small for", "");
    out.push(
      "On some records a detail the platform holds is longer than the box the form prints for it. The packet leaves "
      + "that box **blank rather than shortening what you told us** — a shortened address on a verified petition "
      + "reads as a complete one. If any of these is blank on your copy, write it in by hand:", ""
    );
    out.push("| Component | The blank | Why it is blank |", "| --- | --- | --- |");
    for (const i of boundaryOnlyRbf) out.push(`| ${i.component} | ${i.disclosureLabel} | ${i.measuredWhy ?? i.why} |`);
    out.push("");
  }

  out.push("## What this packet is not", "");
  out.push(
    "These are prepared copies of official West Virginia Supreme Court of Appeals forms, with a supplemental "
    + "pleading and guidance. This is not legal advice, it is not filed for you, and it does not decide whether your "
    + "record can be expunged. A circuit judge decides that."
  );
  out.push("");
  out.push(`_Route: ${route.routeKey} · ${STATUTORY_AUTHORITY} · `
    + Object.entries(sources).map(([f, s]) => `${f} SHA-256 ${s.sha256}`).join(" · ")
    + ` · ${Object.values(censuses).reduce((n, c) => n + c.rows.length, 0)} widgets read from the pinned binaries_`);
  return `${out.join("\n")}\n`;
}

/* ---- the entry point --------------------------------------------------------------- */
export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");

  const binding = queueBinding();
  const sweep = sweepMeasurement();
  const packetSet = packetSetRecord();

  const sources = {};
  const failed = [];
  for (const [form, pin] of Object.entries(binding.forms)) {
    const s = resolveSource(pin);
    if (!s.bound) { failed.push({ form, sourceId: pin.sourceId, declaredSha256: pin.sha256, declaredPath: pin.declaredPath, mountsSearched: s.searched }); continue; }
    sources[form] = { ...pin, ...s };
  }
  if (failed.length > 0) {
    return {
      familyId: FAMILY_ID, status: "STOPPED", stopReason: "BLOCKED_SOURCE",
      failedSourceIdentities: failed,
      why: "a bound source did not bind by exact SHA-256 in any mounted custody root, so nothing may be rendered from it",
      counters: null, overlayDirectoryTouched: false
    };
  }

  const route = routeRecord();
  const censuses = {};
  for (const [form, source] of Object.entries(sources)) censuses[form] = await censusOf(form, source);

  for (const [form, census] of Object.entries(censuses)) {
    assert.equal(census.encrypted, false,
      `${form} carries an /Encrypt entry. An encrypted official source is a handled shape in this factory — the `
      + "pikepdf unlocked-derivative pattern — but this build is not written for it and must not parse ciphertext "
      + "as plaintext.");
    assert.equal(census.unmapped.length, 0,
      `${form}: ${census.unmapped.length} widget(s) carry no dictionary entry: ${JSON.stringify(census.unmapped)}`);
    assert.equal(census.stale.length, 0,
      `${form}: the dictionary names ${census.stale.length} field(s) this form does not have: ${JSON.stringify(census.stale)}`);
    assert.equal(census.captionDrift.length, 0,
      `${form}: a recorded caption is no longer printed near its widget: ${JSON.stringify(census.captionDrift, null, 2)}`);
    assert.equal(census.branchDrift.length, 0,
      `${form}: an eligibility branch's printed paragraph could not be read: ${JSON.stringify(census.branchDrift, null, 2)}`);
    assert.equal(census.caseNumberDrift.length, 0,
      `${form}: a case-number blank could not be matched to a printed caption: ${JSON.stringify(census.caseNumberDrift, null, 2)}`);
    assert.equal(census.caseNumberLines.length, 2,
      `${form}: two case-number blanks are expected and ${census.caseNumberLines.length} were resolved`);
    assert.equal(new Set(census.caseNumberLines.map((c) => c.printedCaptionSaysCircuit)).size, 2,
      `${form}: the two case-number blanks must sit under one circuit caption and one magistrate caption`);
    assert.equal(census.recipientDrift.length, 0,
      `${form}: a certificate-of-service line could not be matched to a printed numbered item: ${JSON.stringify(census.recipientDrift, null, 2)}`);
    assert.equal(census.accelerated.length, 2,
      `${form}: exactly two of the four eligibility branches must cite § 61-11-26a and ${census.accelerated.length} do`);
    assert.equal(census.ordinary.length, 2,
      `${form}: exactly two of the four eligibility branches must recite the ordinary § 61-11-26 route and ${census.ordinary.length} do`);
    assert.equal(new Set(census.accelerated.map((b) => b.recitesSingle)).size, 2,
      `${form}: the two § 61-11-26a branches must be one single-conviction and one multiple-conviction branch`);
    assert.equal(census.rows.length, sweep.perForm[form].acroFieldCount,
      `${form}: the sweep measured ${sweep.perForm[form].acroFieldCount} fields and this build reads ${census.rows.length}`);
    assert.equal(census.pageCount, sweep.perForm[form].pageCount,
      `${form}: the sweep measured ${sweep.perForm[form].pageCount} pages and this build reads ${census.pageCount}`);
    assert.equal(census.rows.filter((r) => r.policy === "write").length, 4,
      `${form}: this build writes exactly four widgets and the dictionary declares ${census.rows.filter((r) => r.policy === "write").length}`);
  }

  if (checkOnly) {
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY",
      declaredSources: binding.declaredSourceCount, distinctDocuments: binding.distinctDocuments,
      formsListedInTheQueueRow: binding.formsListedInTheQueueRow,
      priorCustodyClass: sweep.priorCustodyClass,
      forms: Object.fromEntries(Object.entries(censuses).map(([f, c]) => [f, {
        sha256: sources[f].sha256, custodyRoot: sources[f].custodyRoot,
        encrypted: c.encrypted, xfaInInputDict: c.xfaInInputDict,
        pages: c.pageCount, fields: c.rows.length,
        writes: c.rows.filter((r) => r.policy === "write").length,
        acceleratedBranches: c.accelerated.map((b) => ({ control: b.control, single: b.recitesSingle })),
        ordinaryBranches: c.ordinary.map((b) => ({ control: b.control, single: b.recitesSingle })),
        certificateOfServiceRecipients: c.numberedItems.length,
        negativeHeightRects: c.negativeHeightRects.length,
        caseNumberLines: c.caseNumberLines,
        fieldsTheSharedRegistryWouldHaveWritten: c.registryWouldWrite.length
      }]))
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  const artifacts = [];
  const writeProofs = [];
  const rasterPages = [];
  const reports = {};
  const composedBodies = {};
  let sanitationSample = null;

  for (const fixtureName of ["canonical", "boundary"]) {
    const facts = FIXTURES[fixtureName];
    const packet = await PDFDocument.create();
    stampDeterministic(packet);
    packet.setTitle(`West Virginia § 61-11-26a accelerated expungement packet — ${fixtureName} fixture`);
    const pageManifest = [];
    const documents = [];
    reports[fixtureName] = {};

    for (const component of COMPONENTS) {
      if (component.kind === "page_of_the_official_petition") {
        /* Components 4 and 5 are pages of the petitions already in the packet.
         * They are declared, page-mapped and disclosed; they are not rendered
         * twice, because the paper does not carry them twice. */
        documents.push(component.id);
        continue;
      }

      if (component.kind === "official_pdf_fill") {
        const form = component.form;
        const { bytes, report } = await renderPetition(form, sources[form], censuses[form], fixtureName);
        reports[fixtureName][form] = report;
        sanitationSample = report.sanitation ?? sanitationSample;

        const single = `${OUT}/fixtures/${fixtureName}-${form}.pdf`;
        fs.writeFileSync(path.join(ROOT, single), bytes);
        const proof = await petitionByteProof(form, sources[form], censuses[form], single, fixtureName, report);
        writeProofs.push({
          componentOrForm: component.id, form, fixture: fixtureName,
          standaloneFile: single, sourceSha256: sources[form].sha256,
          proofMethod:
            "every measured widget /Rect of the finalized petition bytes is read for the appearance stamped there, "
            + "its show-text operands and its count of stroke, fill, shading and XObject operators, kept apart from "
            + "path-construction and clipping operators which mark nothing",
          valuesReportedByFinalizer: report.written.length,
          flattenedWidgetAppearancesReadFromOutputBytes: proof.appearances,
          addedGlyphsReadFromOutputBytes: proof.glyphs,
          nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: proof.outsideGlyphs,
          glyphsOutsideMeasuredWriteBoxes: proof.outsideWriteBoxes,
          appearancesInTheSourceItself: proof.appearancesInTheSourceItself,
          preExistingAppearancesSubtracted: proof.preExistingAppearancesSubtracted,
          synthesizedAppearancesFound: proof.synthesizedAppearancesFound,
          appearancePlacementDefects: proof.appearancePlacementDefects,
          refusedFieldsWithInk: proof.refusedFieldsWithInk,
          selectionsRead: proof.selectionsRead,
          geometryRefusals: [...geometryRefusalsOf(report).values()],
          unfittable: report.unfittable,
          actualWrites: proof.actualWrites
        });

        const filled = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
        for (const [i, p] of (await packet.copyPages(filled, filled.getPageIndices())).entries()) {
          packet.addPage(p);
          const alsoComponent = COMPONENTS.find((c) => c.kind === "page_of_the_official_petition" && c.form === form && c.onPage === i + 1);
          pageManifest.push({
            packetPage: packet.getPageCount(), component: component.id, documentId: form,
            alsoComponent: alsoComponent?.id ?? null,
            sourcePage: i + 1, sourceSha256: sources[form].sha256
          });
        }
        documents.push(component.id);
        continue;
      }

      const body = component.id.endsWith("-3") ? supplementalPleadingBody(facts, route, packetSet, censuses["SCA-C906"])
        : component.id.endsWith("-6") ? recordsChecklistBody(facts, packetSet)
          : filingInstructionsPageBody(facts, route, packetSet);
      composedBodies[`${fixtureName}/${component.id}`] = body;
      assert.ok(body.includes(facts["participant.full_legal_name"]),
        `${component.id}: the composed page must carry the participant's name`);
      const composedBytes = await renderComposedPdf(body, component.id);
      const composed = await PDFDocument.load(composedBytes, { ignoreEncryption: true, updateMetadata: false });
      const firstPage = packet.getPageCount() + 1;
      for (const [i, p] of (await packet.copyPages(composed, composed.getPageIndices())).entries()) {
        packet.addPage(p);
        pageManifest.push({ packetPage: packet.getPageCount(), component: component.id, documentId: component.id, sourcePage: i + 1, sourceSha256: null });
      }
      documents.push(component.id);
      composedBodies[`${fixtureName}/${component.id}/pages`] = [firstPage, packet.getPageCount()];
    }

    const packetBytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
    const file = `${OUT}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), packetBytes);

    /* The composed components, read back from the ASSEMBLED packet. */
    const assembled = await PDFDocument.load(packetBytes, { ignoreEncryption: true, updateMetadata: false });
    const pageTexts = assembled.getPages().map((p) => groupIntoLines(extractTextItems(p)).map((l) => l.text).join("\n"));
    assertNoMarkdownDelimitersOnDeliveredPages(pageTexts, fixtureName);
    for (const component of COMPONENTS.filter((c) => c.kind === "custom_pleading" || c.kind === "process_guidance")) {
      const [from, to] = composedBodies[`${fixtureName}/${component.id}/pages`];
      const proof = composedByteProof(component.id, composedBodies[`${fixtureName}/${component.id}`], pageTexts.slice(from - 1, to), facts);
      writeProofs.push({
        componentOrForm: component.id, form: null, fixture: fixtureName,
        packetPages: [from, to],
        valuesReportedByFinalizer: proof.factsWritten.length,
        flattenedWidgetAppearancesReadFromOutputBytes: 0,
        ...proof
      });
    }

    const sha256 = crypto.createHash("sha256").update(packetBytes).digest("hex");
    artifacts.push({
      fixture: fixtureName, file, sha256,
      byteLength: packetBytes.length, pageCount: assembled.getPageCount(), pageManifest,
      documents, components: COMPONENTS.map((c) => c.id)
    });

    if (!skipRaster) {
      const rasterDir = `${OUT}/raster/${fixtureName}`;
      fs.mkdirSync(path.join(ROOT, rasterDir), { recursive: true });
      for (let i = 0; i < assembled.getPageCount(); i += 1) {
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
          pageWidthPt: render.pageWidth, pageHeightPt: render.pageHeight,
          pixelsPerPoint: Number(render.pxPerPt.toFixed(4)),
          calibrationResidualPx: render.calibrationResidualPx,
          engine: "chromium_calibrated_scripts_raster_pdf_page_raster",
          sha256: crypto.createHash("sha256").update(fs.readFileSync(png)).digest("hex")
        });
      }
    }
  }

  /* ---- the field map, one map per component ---- */
  const maps = COMPONENTS.map((component) => {
    if (component.kind === "official_pdf_fill") {
      const census = censuses[component.form];
      const canonical = petitionSide(component, census, reports.canonical[component.form], "canonical");
      const boundary = petitionSide(component, census, reports.boundary[component.form], "boundary");
      return {
        formNumber: component.id, documentId: component.form, componentRole: component.role,
        renderStrategy: "acroform_fill", structuralClass: "acroform",
        conditional: true, condition: packetSet.conditions[component.id] ?? null,
        explicitMappings: Object.fromEntries(census.rows.filter((r) => r.policy === "write").map((r) => [r.name, r.fact])),
        eligibilityBranches: census.branches.map((b) => ({
          control: b.control, dateField: b.dateField, citesAcceleratedSection: b.citesAcceleratedSection,
          recitesSingleConviction: b.recitesSingle, printedParagraph: b.printedParagraph
        })),
        certificateOfServiceRecipients: census.numberedItems,
        selectionControls: canonical.selectionControls,
        canonicalWrites: canonical.writes, canonicalRefusals: canonical.refusals,
        boundaryWrites: boundary.writes, boundaryRefusals: boundary.refusals
      };
    }
    if (component.kind === "page_of_the_official_petition") {
      return {
        formNumber: component.id, documentId: component.form, componentRole: component.role,
        renderStrategy: "page_of_the_official_petition", structuralClass: "acroform",
        deliveredAs: `page ${component.onPage} of ${component.form}, and of SCA-C907 where that petition is used instead`,
        selectionControls: [], canonicalWrites: [], canonicalRefusals: [], boundaryWrites: [], boundaryRefusals: [],
        blanksAreMappedOn: COMPONENTS.filter((c) => c.kind === "official_pdf_fill").map((c) => c.id)
      };
    }
    const canonical = composedSide(component, FIXTURES.canonical);
    const boundary = composedSide(component, FIXTURES.boundary);
    return {
      formNumber: component.id, documentId: component.id, componentRole: component.role,
      renderStrategy: "composed_page_authored_from_the_controlling_records", structuralClass: "composed",
      selectionControls: [],
      canonicalWrites: canonical.writes, canonicalRefusals: canonical.refusals,
      boundaryWrites: boundary.writes, boundaryRefusals: boundary.refusals
    };
  });

  const rbf = requiredBeforeFilingItems(maps, "canonicalRefusals");
  const boundaryRbf = requiredBeforeFilingItems(maps, "boundaryRefusals");
  const canonicalFields = new Set(rbf.map((r) => r.field));
  const boundaryOnlyRbf = boundaryRbf.filter((r) => !canonicalFields.has(r.field));
  const instructionsText = participantInstructions(maps, rbf, boundaryOnlyRbf, route, packetSet, sources, censuses);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID, worklistGroupId: FAMILY_ID,
    jurisdiction: "WV", implementationStrategy: "custom_pleading",
    hybridNote:
      "The MASTER_QUEUE calls this family custom_pleading and it binds two official forms; both are true. Two of its "
      + "seven components are official_pdf_fill petitions and two more are pages of whichever petition is used, so "
      + "this receipt records exact custody for two binaries rather than the no-official-form-exists line a purely "
      + "composed family carries.",
    custodyClass: "SOURCE_ALREADY_HELD", acquisitionCommissioned: false, networkAcquisitionsMade: 0,
    bindingMethod:
      "each petition's own declared path and SHA-256 from the MASTER_QUEUE row, read at build time and matched "
      + "byte-for-byte against the first mounted custody root that holds it, with the digest asserted a second time "
      + "in the builder and a third time against SOURCE_IDENTITY_RESOLUTION_SWEEP.json",
    routeKey: route.routeKey, statutoryAuthority: STATUTORY_AUTHORITY,
    allSourcesExact: true,
    declaredSourceCount: binding.declaredSourceCount,
    distinctDocumentsBound: binding.distinctDocuments,
    aliasNote:
      "The queue declares four sources for two documents: each petition appears once as official-form:SCA-C90x and "
      + "once as source-sha256:<that same digest>, at the same declared path. Those are ALIASES of one identity. The "
      + "build asserts that shape and stops if it ever becomes the other one — two differently named forms under a "
      + "single digest, which is the defect the source-identity sweep measured on ia-dci77-set.",
    documents: Object.entries(sources).map(([form, s]) => ({
      sourceIds: [PINNED[form].sourceId, `source-sha256:${PINNED[form].sha256}`],
      documentId: form, formNumber: form,
      pathInArchive: s.pathInArchive, sha256: s.sha256, byteLength: s.byteLength,
      custodyRoot: s.custodyRoot,
      instrumentKind: "primary_filing",
      pageCount: censuses[form].pageCount, acroFieldCount: censuses[form].rows.length,
      encryptedInInput: censuses[form].encrypted,
      xfaPresentInTheAcroFormDictionary: censuses[form].xfaInInputDict,
      custodyRootsSearched: s.searched.map((x) => ({ root: x.root, exists: x.exists, sha256: x.sha256 ?? null }))
    })),
    sweepMeasurement: sweep,
    custodyRecordDisagreement: {
      finding:
        "SOURCE_READY_BUILDABILITY.json and the MASTER_QUEUE row classify this family custodyClass "
        + `${JSON.stringify(binding.custodyClassInQueue)} — SOURCE_GENUINELY_MISSING — with documentSourcesResolved 0, `
        + "while both declared paths hold their declared digests exactly.",
      basis:
        "The same buildability row carries kind 'held_pdf', firstBytes '%PDF-' and resolvedBy 'declared_path' for all "
        + "four declared sources, and the MASTER_QUEUE row reads sourceStatus SOURCE_BOUND_BY_HELD_BYTES and "
        + "sourceBound true beside the scalar that says they are missing. This build looked: both bind.",
      consequence: "recorded for whoever owns the custody scalar"
    },
    encryptionCheck: {
      why:
        "an encrypted official source is a real and handled shape in this factory — the pikepdf unlocked-derivative "
        + "pattern proven on five California forms and a Maine family — and pdf-lib does not report it as one, "
        + "because ignoreEncryption makes it parse ciphertext as plaintext and throw something unrelated. So the "
        + "pinned bytes were checked directly for an /Encrypt entry.",
      result: Object.fromEntries(Object.entries(censuses).map(([f, c]) => [f, c.encrypted ? "ENCRYPTED" : "not encrypted"])),
      consequence:
        "neither pinned binary is encrypted, both parse cleanly, and no unlocked derivative was generated, used or "
        + "needed. A decrypted review derivative for a DIFFERENT SCA-C906 binary exists in the repository at "
        + "data/rcap-all50/overlays/rescued-encrypted-pdfs/west-virginia-sca-c906-rescued.pdf; it is 150,937 bytes "
        + "with 71 AcroForm fields against this family's pinned 176,072 bytes with 75, and its caption field is "
        + "named PetitionerName where the pinned binary's is PetitionerName1. It is a different revision of the "
        + "form, it is not bound here, and binding it would satisfy one identity with another document's bytes."
    },
    sanitationObserved: sanitationSample ? {
      xfaPresentInInput: sanitationSample.xfaPresentInInput ?? null,
      xfaRemoved: sanitationSample.xfaRemoved ?? null,
      synthesizedAppearancesSuppressed: sanitationSample.synthesizedAppearancesSuppressed ?? null,
      synthesizedWidgetBordersSuppressed: sanitationSample.synthesizedWidgetBordersSuppressed ?? null
    } : null,
    composedComponentsAuthoredByThisBuild: COMPONENTS.filter((c) => c.kind === "custom_pleading" || c.kind === "process_guidance").map((c) => c.id),
    compositionSources: [ROUTE_CENSUS, PACKET_SET_MANIFEST],
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "that the 06/04/2019 revision of either form is the current published edition — no freshness review has been done here",
      "that any output is approved for participant delivery",
      "that any record is eligible for expungement under W. Va. Code § 61-11-26a"
    ]
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1", familyId: FAMILY_ID,
    captionBasis:
      "Every caption is re-read from the pinned binary on the widget's own page, within a measured band above it. "
      + "Two classes of field are NOT labelled from the dictionary at all, because the field names on these forms do "
      + "not describe what the paper says: an eligibility branch is labelled from the paragraph printed beside it, "
      + "and a certificate-of-service line from the numbered item printed above it.",
    documents: Object.entries(censuses).map(([form, census]) => ({
      documentId: form, formNumber: form, sourceSha256: sources[form].sha256,
      pageCount: census.pageCount, fieldCount: census.rows.length,
      xfaPresentInTheAcroFormDictionary: census.xfaInInputDict,
      encryptedInInput: census.encrypted,
      negativeHeightRects: census.negativeHeightRects,
      caseNumberLinesReadFromThePrintedCaptions: census.caseNumberLines,
      eligibilityBranchesReadFromThePrintedParagraphs: census.branches,
      certificateOfServiceRecipientsReadFromThePrintedItems: census.numberedItems,
      fieldsTheSharedRegistryWouldHaveWrittenAndThisBuildRefusesByRole: census.registryWouldWrite,
      fields: census.rows.map((r) => ({
        field: r.name, page: r.page, rect: r.rect, rectBasis: r.rectBasis, pdfType: r.type,
        isSelectionControl: r.isSelectionControl, multiline: r.multiline, maxLength: r.maxLength,
        appearanceStates: r.widgets[0]?.appearanceStates ?? [],
        chooserOptionCount: Array.isArray(r.options) ? r.options.length : null,
        section: r.section, effectiveLabel: r.effectiveLabel,
        printedCaption: r.caption, printedParagraph: r.printedParagraph, printedItem: r.printedItem,
        policy: r.policy, factId: r.fact,
        sourceShippedValue: r.sourceValue,
        sharedRegistryWouldBindFromName: r.sharedRegistryWouldBindFromName,
        sharedRegistryWouldBindFromThisBuildsLabel: r.sharedRegistryWouldBindFromThisBuildsLabel
      }))
    }))
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    routeKeys: [route.routeKey], jurisdiction: "WV",
    implementationStrategy: "custom_pleading",
    renderStrategy: "official_form_finalizer_for_two_conditional_petitions_plus_composed_pages",
    statutoryAuthority: `${STATUTORY_AUTHORITY} — accelerated expungement on treatment, recovery or job-readiness grounds`,
    officialForms: Object.keys(sources), assignedOfficialForm: binding.officialFormFamily,
    componentSet: COMPONENTS,
    conditionalPrimaryFilings: {
      why:
        "the packet-set manifest declares components 1 and 2 as conditional alternatives, and choosing between them "
        + "would mean characterising a felony as nonviolent — which the route-obligation census names a "
        + "later-completion field in terms. Both petitions are prepared, each carries its condition, and the "
        + "participant files exactly one.",
      conditions: packetSet.conditions
    },
    routeDeterminedSelections: [],
    routeSelectionNote:
      "Part (c) of each petition offers four eligibility branches. The route rules OUT two of them — the ordinary "
      + "§ 61-11-26 elapsed-time branches — and those are declared NOT_APPLICABLE_ON_THIS_ROUTE with the named "
      + "condition. The other two both belong to this route and differ only in whether the participant has one "
      + "conviction or several, so both are declared REQUIRED_BEFORE_FILING with determinedByTheCaseNotTheRoute. "
      + "Which paragraph is which is read from the printed paragraph, never from the field name: on SCA-C906 all "
      + "four boxes are named after felonies on a form about misdemeanours.",
    requiredBeforeFilingCount: rbf.length, requiredBeforeFiling: rbf,
    boundaryOnlyRequiredBeforeFiling: boundaryOnlyRbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID, renderedFresh: true,
    componentSet: COMPONENTS.map((c) => c.id),
    componentSetBasis:
      "the packet-set manifest's seven components, asserted at build time against this build's own list. Components "
      + "4 and 5 are pages 3 and 4 of whichever petition is filed and are page-mapped onto those pages rather than "
      + "rendered a second time, because the paper does not carry them twice.",
    artifacts, packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    everyPageRastered: rasterPages.length === artifacts.reduce((n, a) => n + a.pageCount, 0),
    byteDerivedHashes: true,
    rasterEngine: skipRaster ? null : RASTER_ENGINE, rasterSkipped: skipRaster, rasterPages,
    fixturesAreByteIdentical: artifacts.length === 2 && artifacts[0].sha256 === artifacts[1].sha256,
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID, derivedFromArtifactBytes: true,
    note:
      "Two proof methods, because this packet carries two kinds of page. An official petition is read at every "
      + "measured widget rectangle of its finalized bytes, on the glyph channel and on the ink-operator channel "
      + "(stroke, fill, shading, XObject), kept apart from path-construction and clipping operators which mark "
      + "nothing. A composed page has no widget rectangles, so its delivered text is compared character for "
      + "character — whitespace removed — against the body this build authored; line wrapping changes whitespace "
      + "and nothing else, so any difference is a glyph this build did not compose.",
    documents: writeProofs,
    artifacts: writeProofs.map((p) => ({
      component: p.componentOrForm, form: p.form, fixture: p.fixture,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      refusedFieldsWithInk: p.refusedFieldsWithInk ?? [],
      synthesizedAppearancesFound: p.synthesizedAppearancesFound ?? []
    })),
    blockingFindings: writeProofs.flatMap((p) => (p.refusedFieldsWithInk ?? []).map((r) => ({
      component: p.componentOrForm, fixture: p.fixture, field: r.fieldId,
      finding: "a field the map refused carries ink in the output"
    })))
  });

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: FAMILY_ID,
    requiredBeforeFiling: rbf,
    boundaryOnlyRequiredBeforeFiling: boundaryOnlyRbf,
    notApplicableOnThisRoute: maps.flatMap((m) => m.selectionControls
      .filter((c) => c.completenessDisposition === "NOT_APPLICABLE_ON_THIS_ROUTE")
      .map((c) => ({
        component: m.formNumber, field: c.field, page: c.page, label: c.effectiveLabel,
        routeConditionThatMakesItInapplicable: c.routeConditionThatMakesItInapplicable,
        printedParagraph: c.printedParagraph
      }))),
    protectedBlanks: maps.flatMap((m) => m.canonicalRefusals
      .filter((r) => r.requiredBeforeFiling !== true && r.category)
      .map((r) => ({ component: m.formNumber, field: r.field, page: r.page, label: r.effectiveLabel, refusalClass: r.category, why: r.why }))),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  writeJson(`${OUT}/reports/independent-visual-review.json`, {
    schemaVersion: "rcap-independent-visual-review/v1", familyId: FAMILY_ID,
    required: true, granted: false, reviewedBy: null,
    whatToLookAt: [
      "Both petitions carry the participant's name, two address lines and telephone number in the caption block, and the name again in the verification's 'I, ____' recital. Nothing else on either petition is filled in.",
      "The three DOB slots on page 1 of BOTH petitions are empty. This is deliberate: the form prints no order beneath them.",
      "NOT ONE check box on either petition carries a mark, and none has acquired a square, border or outline the blank form does not print.",
      "Part (c) on page 1: all four eligibility boxes are empty and all four date blanks are empty, on both petitions.",
      "The whole certificate-of-service page of each petition is empty — including the petitioner's own name in the opening line.",
      "The verification page carries no ink except the petitioner's name in the recital; the signature line, the date, the notarial block and the commission-expiry line are all blank.",
      "The composed pages — supplemental pleading, records checklist, filing instructions — carry no markdown delimiters and no asterisks; their dotted blanks run unbroken.",
      "The packet reads in component order: SCA-C906 (4 pages), SCA-C907 (4 pages), supplemental pleading, records checklist, filing instructions."
    ],
    artifacts: artifacts.map((a) => ({ fixture: a.fixture, file: a.file, sha256: a.sha256, pageCount: a.pageCount })),
    rasterPages: rasterPages.map((p) => ({ fixture: p.fixture, page: p.page, file: p.file, sha256: p.sha256 }))
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

  const counted = countCompleteness(maps, writeProofs, artifacts, instructionsText);
  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID,
    whatThisIs:
      "The BUILDER's own count of the nine completeness counters, computed with the repository's own contract "
      + "functions over this family's field map, byte proof, rendered artifacts and participant-instructions.md.",
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
        severity: "blocking_if_unfixed_elsewhere",
        finding:
          "SCA-C906's FIELD NAMES DESCRIBE THE WRONG FORM. All four of its Part (c) eligibility check boxes are "
          + "named SingleFelonyCB, MultipleFelonyCB, SingleSatisfiedCB and MultilpleSatisfiedCB (the misspelling is "
          + "the issuer's), and their date blanks SingleFelonyCompletionDate, MultipleFelonyCompletionDate, "
          + "SingleFelonySatisfiesDate and MulitipleFelonlySatisfiesDate — on a petition whose own caption reads "
          + "PETITION FOR EXPUNGEMENT OF MISDEMEANOR VIOLATIONS AND TRAFFIC CITATIONS. The form was plainly derived "
          + "from SCA-C907 and kept its names.",
        consequence:
          "Which statutory branch each box elects is read from the PARAGRAPH the form prints beside it, never from "
          + "the name: the build reads the text between each box and the next, classifies it by whether it cites "
          + "§ 61-11-26a and by whether it recites a single conviction or several, and refuses to build if that "
          + "reading stops producing exactly two accelerated and two ordinary branches, one single and one multiple "
          + "in each pair."
      },
      {
        severity: "blocking_if_unfixed_elsewhere",
        finding:
          "THE TWO PETITIONS DO NOT LIST THE SAME CERTIFICATE-OF-SERVICE RECIPIENTS, AND THEIR WIDGETS SHARE NAMES. "
          + `SCA-C906 prints ${censuses["SCA-C906"].numberedItems.length} numbered recipients and SCA-C907 prints `
          + `${censuses["SCA-C907"].numberedItems.length}. SCA-C907 has no "Chief Law Enforcement Officer of any `
          + "other Law Enforcement Agency\" line at all, and its widgets are still named ChiefLEO1 and ChiefLEO2 — "
          + "sitting, on that form, beneath \"The Superintendent or Warden of any Institution in which Petitioner "
          + "was confined\".",
        consequence:
          "A build that labelled these by field name would tell a participant to address a police department on the "
          + "line the court reads as the prison, on a certificate of service they sign. Every recipient line is "
          + "labelled from the numbered item the form PRINTS above the widget, matched by geometry, and the build "
          + "refuses if any line matches none. Returned as a factory-level finding: shared field names across two "
          + "revisions of a form are not evidence of shared meaning."
      },
      {
        severity: "blocking_if_unfixed_elsewhere",
        finding:
          "ON SCA-C907 THE TWO CASE-NUMBER WIDGETS SIT UNDER EACH OTHER'S PRINTED CAPTIONS. Measured: "
          + `${JSON.stringify(censuses["SCA-C907"].caseNumberLines)}. SCA-C907 prints "Magistrate Court Case No." at `
          + "y 698 over the widget NAMED CircuitCaseNo at y 693, and \"Circuit Court Case No.\" at y 680 over the "
          + "widget NAMED MagCaseNo at y 675. On SCA-C906 the same two names agree with the same two captions, so "
          + `the disagreement is C907's alone: ${JSON.stringify(censuses["SCA-C906"].caseNumberLines.map((c) => c.nameAgreesWithThePaper))}.`,
        consequence:
          "A build that trusted the field names would print the magistrate court's case number on the line the "
          + "circuit court reads as its own, and the reverse, on a petition the participant signs under a "
          + "verification sworn before a notary — and no field counter would see it, because both blanks would be "
          + "filled and both would be labelled. Both blanks are labelled from the printed caption above them and the "
          + "build refuses if either cannot be matched to one, or if the two do not resolve to one circuit and one "
          + "magistrate caption. This is the same defect class as the eligibility box names and the "
          + "certificate-of-service recipients on these forms, and as the AcroForm-index-versus-printed-row finding "
          + "this lane returned on the Massachusetts TC0057 charge table: a field name is not evidence of what the "
          + "paper says."
      },
      {
        severity: "blocking_if_unfixed_elsewhere",
        finding:
          "PetDOBDay, PetDOBMonth AND PetDOBYear ALL BIND TO participant.date_of_birth IN THE SHARED REGISTRY, "
          + "measured with decideBinding against each binary's own field names. The form prints DOB as three slots "
          + "separated by two printed slashes and prints NO order beneath them.",
        consequence:
          "Left to the descriptor channel the full ISO date would have been written into all three boxes, the first "
          + "of which is 26 points wide. Beyond that, the field names say day-month-year while the American "
          + "convention these courts' forms use is month-day-year, and the paper does not say which is right. All "
          + "three are passed as unwritable by ROLE, all three are declared required-before-filing with the "
          + "measurement stated, and the participant is told why the packet left their own date of birth blank. "
          + "Returned for whoever owns the descriptor list: three component slots of one date are not three "
          + "instances of that date."
      },
      {
        finding:
          "PetitionersCurrentName1/2 bind to participant.full_legal_name under a printed question asking for "
          + "\"Petitioner's current name, previous names, and all aliases\", and PetitionersOffenseAddress1/2 bind "
          + "to participant.street_address under one asking for \"All of petitioner's addresses from the date of "
          + "offense to current\".",
        consequence:
          "Both would have answered a question about a HISTORY with a single current value, on a sworn petition. "
          + "Both are refused by role, declared required-before-filing and disclosed; the route-obligation census "
          + "independently names the address history a manual completion item. Same registry shape as the four "
          + "third-party name boxes ma-seal-decrim-set measured on the Massachusetts OCP petition: the full_legal_name "
          + "descriptor's catch-all reaches every box whose caption contains the word name."
      },
      {
        finding:
          "CertifyName binds to participant.full_legal_name inside the block the form captions CERTIFICATE OF "
          + "SERVICE — a statement that copies have ALREADY been given to each recipient.",
        consequence:
          "Nothing on that page is written, not even the participant's own name, and the whole page is disclosed as "
          + "the last thing they complete, on the day they actually serve. The service-method boxes and the "
          + "certificate date carry the same refusal."
      },
      {
        finding:
          "THREE WIDGET RECTANGLES ARE STORED WITH A NEGATIVE HEIGHT: "
          + `${JSON.stringify(Object.entries(censuses).flatMap(([f, c]) => c.negativeHeightRects.map((r) => `${f}/${r.field}`)))}.`,
        consequence:
          "None of them is a box this build writes into, so no value was fitted against a negative height. Recorded "
          + "because a fitter measuring one of these would compute a negative available height and could either "
          + "refuse a value that fits or accept one that does not, and because a visual reviewer should know the "
          + "issuer's own geometry is malformed there."
      },
      {
        finding:
          "SCA-C906 MIS-CITES THE ACCELERATED SECTION IN ITS OWN CAPTION AND CERTIFICATE. Its page 1 heading reads "
          + "\"W.Va. Code §61-11-26 and §61-11-26(a)\" and its certificate of service repeats \"§61-11-26(a)\", "
          + "while SCA-C907 reads \"§61-11-26 and §61-11-26a\". Section 61-11-26(a) is a subsection of the ordinary "
          + "section; § 61-11-26a is the separate accelerated section this family is built for. SCA-C906's own "
          + "Part (c) paragraphs then cite \"§61-11-26a(1) or §61-11-26a(2)\" where SCA-C907 cites "
          + "\"§61-11-26a(a)(1) or §61-11-26a(a)(2)\".",
        consequence:
          "Recorded as a source-fidelity finding and raised for counsel. Nothing in this packet repeats the "
          + "mis-citation: every statutory reference this build prints comes from the route-obligation census or "
          + "the packet-set manifest, both of which say § 61-11-26a."
      },
      {
        finding:
          "The MASTER_QUEUE row's own requiredForms list reads "
          + `${JSON.stringify(binding.formsListedInTheQueueRow)} — while its sourceIds, its sourceHashes and its `
          + "officialFormFamily (SCA-C906+SCA-C907) all name both petitions.",
        consequence:
          "The build takes the two documents from the digests rather than from that list, and asserts each digest "
          + "three times before rendering. Recorded for whoever owns the queue row."
      },
      {
        finding:
          "The queue declares FOUR sources for TWO documents: each petition appears once as official-form:SCA-C90x "
          + "and once as source-sha256:<its own digest>, at the same declared path.",
        consequence:
          "Those are aliases of one identity, not two named forms sharing one digest — which is the separate defect "
          + "the source-identity sweep measured on ia-dci77-set, where DCI-76 and DCI-77 share a hash. The build "
          + "asserts the alias shape explicitly and stops if it ever becomes the other one."
      },
      {
        finding:
          "The verification page of both petitions carries exactly ONE widget — the petitioner's name in the "
          + "\"I, ____\" recital. The signature line, the date, the notarial block and the commission-expiry line "
          + "have no widgets at all.",
        consequence:
          "The packet writes the name and nothing else there, and the participant instructions say in terms that "
          + "the notarial block has no fillable boxes and is completed on paper by the notary. Recorded because a "
          + "notarial block invisible to the field census is exactly the kind of omission these packets exist to "
          + "prevent."
      },
      {
        severity: "blocking_if_unfixed_elsewhere",
        finding:
          "EVERY CHECK BOX ON BOTH BINARIES SHIPS AN /AP /N STREAM WHOSE /BBox IS IN PAGE COORDINATES, WITH NO "
          + "/Matrix. SingleFelonyCB has Rect [91.7 324.9 103.2 336.4] and BBox [91.7 324.9 103.2 336.4]. Under ISO "
          + "32000-1 12.5.5 the BBox is mapped onto the Rect, which here is a translation of (0, 0) — the stream's "
          + "own absolute coordinates already place the square. pdf-lib's flatten emits the widget's own offset as a "
          + "translation instead, adding it a second time.",
        consequence:
          "The first render of this family delivered four squares scattered across page 1 of each petition — beside "
          + "\"IN RE: Expungement of Record of:\", on the petition's own caption rule, inside the fourth CHARGE line "
          + "and inside the word \"traffic\" — and not one box in the left margin where the paper prints them. "
          + "MEASURED: with the fix off, 52 appearances draw outside their own widget rectangles, the first at "
          + "(183.364, 649.822) against a widget rectangle at (91.7, 324.9) — exactly twice the offset. "
          + "fitAppearancesToRect is passed, and the byte proof now computes each appearance's /BBox through its "
          + "/Matrix and the placement and compares the result with the widget's rectangle, so the build can see "
          + "this class rather than rely on someone looking at the page."
      },
      {
        severity: "blocking_if_unfixed_elsewhere",
        finding:
          "NO COUNTER COULD SEE THAT DEFECT, AND THE BYTE PROOF AS FIRST WRITTEN COULD NOT EITHER. `drawnAt` matches "
          + "the placement operator's translation against the widget rectangle, which answers whether an appearance "
          + "was PLACED at a widget and not whether its ink FALLS INSIDE one. Every rectangle-based reading called "
          + "the misdrawn packet clean; it was found by rendering the page and looking at it.",
        consequence:
          "Returned as a factory-level finding. Any family whose source ships its own widget appearances needs the "
          + "placement measurement, not only the rectangle reading — and a family that only ever reads appearances "
          + "it generated itself will not notice, because a generated appearance carries an origin-based BBox."
      },
      {
        finding:
          "TWO DELIVERED-PAGE DEFECTS ON THE COMPOSED PLEADING, BOTH FOUND BY LOOKING AT THE RENDERED PAGE. First, "
          + "the signature block was written as one line with the two captions separated by spaces; a composed page "
          + "is laid out by a word-wrapping renderer that collapses runs of whitespace, so it arrived as \"Signature "
          + "of Petitioner Date\" beneath two rules that lined up with neither. Second, item 4 quoted the route "
          + "census's eligibility-clock cell through the audit quoter, which joins the whole newline-separated tuple "
          + "— so \"elapsed_eligibility_clock - 90 days - disposition_date - ...\" was printed on a page filed with "
          + "a circuit judge.",
        consequence:
          "The signature block is now one rule per line with its caption beneath it. A delivered page now quotes "
          + "through recordProse, which takes the record's own last segment — its prose sentence, not one word "
          + "changed — and asserts it non-empty and still carrying the phrase the family reasons from; the full "
          + "tuple stays in production-field-map.json for the audit. This build's own internal field names do not "
          + "belong on a court filing."
      },
      {
        finding:
          "Neither pinned binary is encrypted — checked directly for an /Encrypt entry, because pdf-lib with "
          + "ignoreEncryption parses ciphertext as plaintext and reports something unrelated rather than an "
          + "encryption error.",
        consequence:
          "No unlocked derivative was generated or used. The repository's "
          + "data/rcap-all50/overlays/rescued-encrypted-pdfs/west-virginia-sca-c906-rescued.pdf is a DIFFERENT "
          + "SCA-C906 revision — 150,937 bytes and 71 fields against this family's pinned 176,072 bytes and 75, with "
          + "the caption field named PetitionerName rather than PetitionerName1 — and binding it would have "
          + "satisfied one identity with another document's bytes, on a form whose field dictionary would then have "
          + "been built against the wrong paper."
      },
      {
        finding:
          "The route-obligation census records nothing for this route on proposedOrder, coverSheet, notice, "
          + "filingMethod, serviceRecipients, serviceMethod, serviceTiming, filingDeadline, postFilingInstructions "
          + `or uncontestedHearingTreatment: ${JSON.stringify(route.notRecorded)}.`,
        consequence:
          "The participant instructions state no service deadline, no filing method and no hearing step. Who is "
          + "served comes from the packet-set manifest's own serve_party action and from the recipient list the "
          + "FORM prints; the fee and the waiver come from the census cells that are recorded. Nothing is stated "
          + "that no record carries."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    counselQuestionsRaised: [
      "This packet delivers BOTH conditional petitions — SCA-C906 and SCA-C907 — and tells the participant to file "
      + "exactly one, because choosing would mean characterising a felony as nonviolent, which the route record "
      + "names a manual completion item. Confirm that is the right treatment, and that a packet containing two "
      + "mutually exclusive petitions is acceptable.",
      "Part (c): the two ordinary § 61-11-26 elapsed-time branches are declared not applicable on this route and the "
      + "two § 61-11-26a branches are left to the participant on a single-versus-multiple-conviction basis. Confirm "
      + "that division.",
      "This packet writes the petitioner's name into the verification's 'I, ____' recital while leaving the "
      + "signature, the date and the whole notarial block blank. Confirm that pre-naming the affiant on a page sworn "
      + "before a notary is acceptable.",
      "The three date-of-birth slots are left blank on both petitions because the form prints no order beneath them "
      + "and the field names disagree with the local convention. Confirm the refusal, or supply the order the "
      + "Supreme Court of Appeals intends.",
      "SCA-C906 cites the accelerated section as § 61-11-26(a) in its own caption and certificate of service, where "
      + "SCA-C907 cites § 61-11-26a. Confirm which is right for the participant's purposes, and whether the "
      + "misdemeanour form's citation affects a filing made on the accelerated route.",
      "The 06/04/2019 revision of both forms is what is held in custody. Confirm it is still the published edition "
      + "before any promotion beyond state_built."
    ],
    mattersForTheReviewersAttention: [
      "build-findings.json — SCA-C906's eligibility check boxes are all named after felonies on a misdemeanour form; branches are read from the printed paragraphs.",
      "build-findings.json — the two forms list different certificate-of-service recipients under shared widget names; recipients are read from the printed numbered items.",
      "build-findings.json — all three DOB slots bind to the same descriptor and the form prints no order.",
      "source-receipt.json — the rescued SCA-C906 in the repository is a different revision of the form and is not bound here."
    ]
  });

  return {
    familyId: FAMILY_ID,
    status: PASS_COUNTERS.every((c) => counted.counters[c] === 0) ? "COMPLETED" : "STOPPED",
    counters: counted.counters, counterFindings: counted.findings,
    directory: OUT, components: COMPONENTS.map((c) => c.id),
    officialForms: Object.fromEntries(Object.entries(sources).map(([f, s]) => [f, s.sha256])),
    writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
    routeSelectionsMade: 0,
    notApplicableOnThisRoute: maps.reduce((n, m) => n + m.selectionControls.filter((c) => c.completenessDisposition === "NOT_APPLICABLE_ON_THIS_ROUTE").length, 0),
    requiredBeforeFiling: rbf.length,
    boundaryOnlyRequiredBeforeFiling: boundaryOnlyRbf.length,
    artifacts: artifacts.map((a) => ({ fixture: a.fixture, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount })),
    rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RASTER_LOCAL_PENDING_CENTRAL",
    nineCountersZero: PASS_COUNTERS.every((c) => counted.counters[c] === 0),
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
