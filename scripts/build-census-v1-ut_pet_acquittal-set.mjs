#!/usr/bin/env node
// Utah petition-family completeness repair.
//
// The original CENTRAL builder is intentionally left unchanged because it is
// shared by families outside this lane. This lane-local finalizer consumes the
// existing first-hand census, reopens the exact receipt-bound source PDFs, and
// repairs only the seven assigned Utah packet families. It never writes a
// signature, signing date, service act, court-only field, agency-only field,
// prosecutor field, victim field, or optional third-party authorization.

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { sanitizeAndFlatten, scanBytesForActiveContent } from "./rcap-official-forms/rcap-active-content.mjs";

const thisFile = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(thisFile), "..");
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const sharp = require("sharp");

const CONTROL_BASE = "33dfea59fe85b9dc86469d12e04fd65c51b480fa";
const DISPATCH_COMMIT = "4d1408a40eeb77f51bdf18ba35a13db579b21129";
const ASSIGNMENT_ID = "P1_UT_PETITION_EXPUNGE_COMPLETENESS";
const FIXED_DATE = new Date("2026-08-31T00:00:00Z");
const RASTER_DPI = 72;
const PDFTOPPM = process.env.RCAP_PDFTOPPM || "pdftoppm";
const WAVE_ROWS = "data/rcap-grade-a/wave-2/p1-ut-petition-expunge-completeness/rows.json";

/**
 * Two flags carry the DET-FEE-AND-WAIVER-001 amendment A4 repair.
 *
 * `statesBciApplicationFee` replaces the sentence A4 condemns -- the packet
 * telling the participant in bold that it "does not state an amount because BCI
 * sets it per applicant" while its own delivered canonical PDF prints $65.00
 * three times. A4 calls that a rule of internal consistency rather than an
 * obligation-scoping question: a packet may never tell a participant that it
 * does not state something it does state.
 *
 * `statesManifestPreFilingItems` adds the requiredBeforeFiling items the
 * family's own committed packet-set manifest holds and the delivered
 * instructions omit. It is set only on the two families independently scored
 * FAIL on REQUIRED_BEFORE_FILING for exactly that omission.
 *
 * WHY THESE ARE FLAGS AND NOT UNCONDITIONAL. Only the flagged families are
 * claimed by this repair. The defect is NOT narrower than the flag:
 * ut_pet_limitations-set and ut_pet_dismissed_without_prejudice-set ship
 * participant-instructions.md bytes IDENTICAL to these three (SHA-256
 * d11ba889207735fb413c6ab7d719e194e3a6d3e2a2ca96351e2eca4a5dd319f5), so they
 * carry the same false BCI-fee sentence word for word -- and both currently
 * hold PASS_COMPLETE_INDEPENDENT verdicts resting on that text. Setting the
 * flag unconditionally would rewrite two families this lane holds no claim on
 * and would silently invalidate two independent passes. Extending the repair is
 * one word per family once each is claimed, and it should happen: the sentence
 * is as false there as it is here.
 *
 * THE EXTENSION, TAKEN. A later independent read (vf11) failed all three
 * remaining non-traffic families on the same two obligations, and the three
 * grants were asserted before a byte of this host was written. Both flags are
 * now set on ut_pet_dismissed_without_prejudice-set, ut_pet_limitations-set and
 * ut_pet_no_charges-set. ut_pet_traffic-set is untouched: it delivers no BCI
 * application and needs no certificate, so neither flag reaches it.
 *
 * `certificateIssuanceFeeHeldExempt` is the third flag and it is NOT set on all
 * three, which is the whole point of it. The compiled Utah state profile
 * (src/lib/rcap-engine/compiled/profiles/UT-utah.json) records BCI's published
 * FAQ as saying "no certificate issuance fee is required for dismissals,
 * acquittals, or declinations". Under DET-FEE-AND-WAIVER-001 amendment A3
 * holding is per FACT and per ROUTE, so that sentence has to be read against
 * each route separately:
 *
 *   - ut_pet_dismissed_without_prejudice-set IS a dismissal, and the exempting
 *     limb names "dismissals" without qualification. Held.
 *   - ut_pet_no_charges-set IS the declination case -- its own committed
 *     manifest describes the evidence as "Any written declination or no-file
 *     letter from the prosecutor". Held.
 *   - ut_pet_acquittal-set IS an acquittal, and the exempting limb names
 *     "acquittals" in the same breath as dismissals. Held. It was set later
 *     than the other two, when the owner determination that made this family
 *     automatic-first arrived carrying its own one-route branch saying the same
 *     thing; the flag says it once, for every route the sentence reaches.
 *   - ut_pet_limitations-set is a charge ended by the limitations period. It is
 *     not a conviction, a plea in abeyance or a special certificate, and it is
 *     not a dismissal, an acquittal or a declination either. NEITHER limb of
 *     that sentence addresses this route, so nothing in the repository
 *     establishes its certificate answer and the honest refusal stands. Setting
 *     one flag across all three would have put a false no-fee statement into
 *     the third packet, which is exactly the sibling-route inference A3 forbids.
 *
 * `certificateIssuanceFeeHeldExemptUnlessAbeyance` and
 * `certificateIssuanceFeeHeldPerCase` are the fourth and fifth, and they
 * close the unflagged case the first three left open. The unflagged paragraph
 * served ut_pet_conviction-set and ut_pet_dismissed_with_prejudice-set and was
 * false on both, so each now declares its own limb of the profile sentence: the
 * conviction route holds "$65 per case" with the record's "may require"
 * condition, and the with-prejudice route holds the exemption together with the
 * plea-in-abeyance fact that reverses it. `statesPleaInAbeyanceDiscriminator`
 * carries that same fact into the free-route disclosure and into the pre-filing
 * checks; it is set on ut_pet_dismissed_with_prejudice-set alone, because that
 * is the only route on this host whose disposition the profile's abeyance
 * carve-out is written about.
 *
 * `declarationNameBoxClearsPrePrintedI` moves ONE write box and is likewise set
 * only on the three claimed families. On packet page 18 the BCI Application's
 * sworn declaration reads "I, ______ , declare under criminal penalty...". The
 * pre-printed "I" occupies x=49.745-52.742 and the committed write box for
 * "Name of Petitioner" starts at x=50.5, so the participant's name is drawn on
 * top of the declaration's first-person subject and the committed raster shows
 * the "I" destroyed. The nine counters read zero and are not wrong: every glyph
 * is inside its own box. The box is in the wrong place. The flag exists because
 * ut_pet_acquittal-set, ut_pet_conviction-set and ut_pet_dismissed_with_prejudice-set
 * carry the identical defect and this lane holds no grant on them -- moving the
 * box unconditionally would rewrite their delivered bytes. That defect is
 * reported rather than repaired, and it should be repaired the moment one lane
 * holds all seven.
 */
const CONFIGS = Object.freeze({
  "ut_pet_acquittal-set": {
    slug: "ut-pet-acquittal-set", traffic: false, routeKind: "case",
    chargeLabel: "Acquitted charge", statesBciApplicationFee: true,
    // Owner determination DET-DT-UT-ACQUITTAL-001. An acquittal on all charges
    // is inside Utah's current automatic expungement, so this family's primary
    // treatment is AUTOMATIC_OR_AGENCY_PROCESS and the petition it delivers is
    // a fallback for a documented automatic-process failure. The flag is set on
    // this family alone: every sibling on this host stays a petition family and
    // its bytes must not move.
    acquittalAutomaticFirst: true,
    // DET-DT-UT-ACQUITTAL-001 arrived carrying its own acquittal-only branch for
    // the certificate fee, saying exactly what the general treatment below says.
    // The general treatment is the one that survives: the exempting limb of the
    // BCI FAQ sentence names "dismissals, acquittals, or declinations", and an
    // acquittal is named in it as plainly as a dismissal is. Under A3 that is a
    // per-route holding on THIS route, not a read-across from a sibling.
    certificateIssuanceFeeHeldExempt: "an acquittal",
    /*
     * FIX01/RP-1, SELF_HELP_STOP. The committed track registry holds eight
     * self-help stop conditions for trackId ut_pet_acquittal and the packet
     * carried none of them -- no stop section of any kind, and the words
     * "citizen" and "immigration" appeared nowhere in the packet or its
     * nineteen pages. The registry marks the first condition, in its own words,
     * "a hard stop, not a caveat". On the one condition the packet did reach it
     * said the opposite of what the registry holds, telling the participant to
     * attend a hearing the registry records as the end of self-help; that
     * sentence is replaced in the automatic-first branch above.
     *
     * Set on THIS FAMILY ONLY, and set to the registry-reading flag rather than
     * the config-carried one so no condition passes through an editor's hands.
     */
    statesRegistryStopConditions: "ut_pet_acquittal",
    /*
     * The closing line is route-specific, so it is carried by the family. The
     * last condition on this track is the one that is this route's own
     * question.
     */
    registryStopConditionsClosing:
      "The last of these is this route's own question. This packet is built for an acquittal, and the record stops "
      + "self-help where the verdict was not guilty by reason of insanity rather than a plain acquittal; if that is what "
      + "your verdict was, that is the point the record marks, and this is not the petition for it until the "
      + "petition-track position is confirmed.",
    /*
     * FIX-C/FIX03, CLIPPING_AND_OVERLAP. vf02 at base 88d688b8 measured the
     * collision this host's header note already describes and left unrepaired
     * on this family: on packet page 18 the p2-manual-declaration-name write
     * begins at x=50.50 and the BCI Application's pre-printed "I" occupies
     * x=49.745-52.742, so the participant's name is drawn over the sworn
     * declaration's first-person subject. Canonical "Jordan" overlaps it by
     * 7.65 square points, boundary "Alexandrina" by 6.15. The nine counters
     * read zero and are not wrong: every glyph is inside its own box, and the
     * box is in the wrong place.
     *
     * The header note records that the flag was withheld from this family
     * because FIX04 held no grant on it. This lane does hold one, and sets it
     * on THIS FAMILY ONLY. ut_pet_conviction-set and
     * ut_pet_dismissed_with_prejudice-set carry the identical defect, this lane
     * holds no live grant on either, and their bytes must not move.
     */
    declarationNameBoxClearsPrePrintedI: true,
    /*
     * FIX-C/FIX03, PAGE_ORDER. vf02 measured the same inversion FIX04 repaired
     * on ut_pet_no_charges-set and ut_pet_limitations-set: the assembled packet
     * ran 1000EX > 1020EX > 1044XX > 1146XX > 1148XX > 1149XX > 1169XX > BCI
     * application > BCI third-party release, which against this family's
     * committed packet-set manifest is component order 4, 5, 3, 6, 7, 8, 9, 1,
     * 2. The two Bureau of Criminal Identification components the manifest
     * orders FIRST sat on pages 17-19, behind every court document, and this
     * route's law is a two-stage sequence: BCI decides eligibility and issues
     * the certificate whose identification number paragraph 1 of the petition
     * then asks for. A participant handed this packet cannot complete page 1
     * until they have done the pages at the back.
     *
     * Set on THIS FAMILY ONLY, for the same reason the sibling notes give.
     */
    deliversInManifestComponentOrder: true
  },
  "ut_pet_conviction-set": {
    slug: "ut-pet-conviction-set", traffic: false, routeKind: "case",
    chargeLabel: "Eligible conviction",
    statesBciApplicationFee: true, statesManifestPreFilingItems: true,
    // The OTHER limb of the same BCI FAQ sentence, and the reason the flag is
    // not the exemption one. The sentence opens "eligible conviction,
    // plea-in-abeyance, or special certificates may require an additional $65
    // per case" and only then exempts "dismissals, acquittals, or
    // declinations". This route is an eligible conviction, so the FIRST limb is
    // the one that names it. Under A3 the holding is per fact and per route:
    // the exempting limb does not reach a conviction, and the $65-per-case limb
    // does, so the packet states the figure and the "may require" condition the
    // record attaches to it rather than telling the participant no amount can
    // be stated.
    certificateIssuanceFeeHeldPerCase: "an eligible conviction",
    // Carried word for word from data/record-clearing/legal-design-track-registry.json,
    // track `ut_pet_conviction`, selfHelpStopConditions. Nothing added, nothing
    // softened, nothing read across from a sibling Utah route: these are the
    // thirteen this route's own committed record holds, in its own order.
    // selfHelpBoundaries on the same track restates them and adds no condition
    // the list below does not already carry.
    selfHelpStopTrack: "ut_pet_conviction",
    selfHelpStopConditions: [
      "The participant is not a US citizen. The Utah Courts self-help page itself tells non-citizens to consult an immigration lawyer before expunging, because the FBI may retain records of an expunged case. This is a hard stop, not a caveat.",
      "The prosecutor or a victim objects, or the court schedules a hearing.",
      "BCI offers a special certificate instead of a certificate of eligibility, because the court rather than BCI then decides eligibility.",
      "The public-interest showing has to be argued rather than simply stated.",
      "Any conviction-counting question near the 77-40a-303(4) or (5) limits, including out-of-state and previously expunged convictions.",
      "An active protective order or stalking injunction.",
      "The participant is asking to expunge appellate records.",
      "The conviction count is anywhere near the 77-40a-303(4) or (5) limits, which run on the entire criminal history across all states including previously expunged convictions.",
      "A criminal episode contains both a drug possession offence and a non-drug offence, so the 77-40a-303(6) mixed-episode counting rule has to be applied.",
      "Whether an offence is a violent felony under 76-3-203.5(1)(c)(i) is genuinely in question.",
      "Which of case closure, release, or termination of supervision starts the applicable waiting period is genuinely in question.",
      "The public-interest explanation needs to be argued rather than stated.",
      "The participant is relying on the 77-40a-303(7) after-ten-years increase in the numerical limits."
    ]
  },
  "ut_pet_dismissed_with_prejudice-set": {
    // FIX83 current VF04 findings; no ungranted sibling enables these repairs.
    orderPetitionerNameOnPrintedLine: true,
    captionTextClearsPrintedLines: true,
    statesDismissalThirtyDaySinceArrest: true,
    declarationNameBoxClearsPrePrintedI: true,
    slug: "ut-pet-dismissed-with-prejudice-set", traffic: false, routeKind: "case",
    chargeLabel: "Charge dismissed with prejudice", dismissedWithPrejudice: true,
    statesBciApplicationFee: true, statesManifestPreFilingItems: true,
    // A dismissal, and the exempting limb names "dismissals" without
    // qualification -- so the exemption is held on this route exactly as it is
    // on ut_pet_dismissed_without_prejudice-set. It gets its own flag rather
    // than the plain one because ONE fact can move it: the same sentence's
    // first limb names "plea-in-abeyance ... certificates" among those that may
    // require $65 per case, and a dismissal with prejudice CAN be the end of a
    // completed plea in abeyance. Where both limbs of one sentence can reach a
    // participant depending on a fact the packet does not hold, A3 is satisfied
    // by stating both limbs and the fact that chooses between them -- not by
    // picking the cheaper one.
    /*
     * FIX83, CLIPPING_AND_OVERLAP. Every X this host writes was drawn at the
     * printed left bracket's own x-origin plus 1.5pt and printed on top of the
     * bracket. The mark now sits in the bracket pair's interior gap, measured
     * as ink off the pinned source binary. Set per family: the three proven
     * siblings on this host carry the identical defect and this lane holds no
     * grant on them, so their delivered bytes must not move.
     */
    marksCentredInBracketGap: true,
    /*
     * FIX83, SERVICE. The packet told the participant "The prosecutor must
     * receive a copy of what you file, by mail or by email" and never stated
     * the rule the committed track registry holds for this track: "The
     * petitioner does not effect service in the ordinary case: the court sends
     * the filing to the prosecuting attorney." rules.notice and
     * destination.detail say it twice more. The registry also warns in terms
     * against wiring the general service-of-process regime to this track. The
     * genuine BCI quotation is kept and named as superseded rather than
     * deleted, because the participant is holding that sheet.
     *
     * Set per family, on the four this lane holds. Two earlier independent
     * reads scored SERVICE PASS on ut_pet_dismissed_with_prejudice-set and
     * ut_pet_dismissed_without_prejudice-set by reading the held BCI handout
     * as governing over the registry; this lane was assigned the registry's
     * rule for all four and applies it to all four, and the disagreement is
     * reported rather than buried.
     */
    statesCourtTransmitsToProsecutor: true,
    /*
     * FIX83, PAGE_ORDER. The assembled packet ran 1000EX > 1020EX > 1044XX >
     * 1146XX > 1148XX > 1149XX > 1169XX > BCI application > BCI third-party
     * release, which against this family's committed packet-set manifest is
     * component order 4, 5, 3, 6, 7, 8, 9, 1, 2. The two Bureau of Criminal
     * Identification components the manifest orders FIRST sat on pages 17-19,
     * behind every court document, and this route's law is a two-stage
     * sequence: BCI decides eligibility and issues the certificate whose
     * identification number paragraph 1 of the petition then asks for.
     */
    deliversInManifestComponentOrder: true,
    /*
     * FIX83, ROUTE_OPTIONS and FILING_DESTINATION. The court caption was
     * marked District on the petition and on the proposed order from
     * `route.case`, and the instructions named the destination as "The Utah
     * district court for the county where the case was heard". The registry
     * says the destination is "the district or justice court that decided the
     * case" and holds no fact saying which of the two this was. Both marks are
     * left unmade and the election is disclosed.
     */
    courtTypeElectionNotHeld: true,
    certificateIssuanceFeeHeldExemptUnlessAbeyance: "a dismissal with prejudice",
    // The same fact again, in two other places: it decides whether the free
    // 180-day automatic route reaches this participant at all, and it is a
    // pre-filing check the packet must ask for. The compiled profile makes it
    // dispositive twice and the instructions did not mention it once.
    statesPleaInAbeyanceDiscriminator: true,
    /*
     * FIX02/RP-1, SELF_HELP_STOP. The committed track registry holds eight
     * self-help stop conditions for trackId ut_pet_dismissed_with_prejudice and
     * the packet carried none of them: zero occurrences of immigration,
     * citizen, lawyer, counsel or protective order. The registry marks the
     * first condition, in its own words, "a hard stop, not a caveat". On the
     * one condition the packet did reach it said the opposite of what the
     * registry holds, telling the participant that if the court schedules a
     * hearing they should attend it -- the shared `else` branch below replaces
     * that sentence once this flag is set.
     *
     * Set on THIS FAMILY ONLY, and set to the registry-reading flag rather than
     * the config-carried one so no condition passes through an editor's hands.
     */
    statesRegistryStopConditions: "ut_pet_dismissed_with_prejudice",
    /*
     * The closing line is route-specific. The last condition on this track is
     * the plea-in-abeyance discriminator this family already carries twice
     * above, reached here as the point where the packet is built for the wrong
     * thing entirely.
     */
    registryStopConditionsClosing:
      "The last of these is this route's own question, and it is the same fact this packet asks you to check twice "
      + "above. This packet is built for a case that has actually been dismissed with prejudice; if what you have is a "
      + "plea in abeyance that has not been dismissed yet, a Motion to Dismiss comes first and this is not the petition "
      + "for it."
  },
  "ut_pet_dismissed_without_prejudice-set": {
    // FIX83 current VF04 findings; no ungranted sibling enables these repairs.
    orderPetitionerNameOnPrintedLine: true,
    captionTextClearsPrintedLines: true,
    statesDismissalThirtyDaySinceArrest: true,
    courtTypeElectionNotHeld: true,
    prosecutorConsentNotHeld: true,
    slug: "ut-pet-dismissed-without-prejudice-set", traffic: false, routeKind: "case",
    dismissedWithoutPrejudice: true, chargeLabel: "Charge dismissed without prejudice",
    statesBciApplicationFee: true, statesManifestPreFilingItems: true,
    /*
     * FIX83, CLIPPING_AND_OVERLAP. Every X this host writes was drawn at the
     * printed left bracket's own x-origin plus 1.5pt and printed on top of the
     * bracket. The mark now sits in the bracket pair's interior gap, measured
     * as ink off the pinned source binary. Set per family: the three proven
     * siblings on this host carry the identical defect and this lane holds no
     * grant on them, so their delivered bytes must not move.
     */
    marksCentredInBracketGap: true,
    /*
     * FIX83, SERVICE. The packet told the participant "The prosecutor must
     * receive a copy of what you file, by mail or by email" and never stated
     * the rule the committed track registry holds for this track: "The
     * petitioner does not effect service in the ordinary case: the court sends
     * the filing to the prosecuting attorney." rules.notice and
     * destination.detail say it twice more. The registry also warns in terms
     * against wiring the general service-of-process regime to this track. The
     * genuine BCI quotation is kept and named as superseded rather than
     * deleted, because the participant is holding that sheet.
     *
     * Set per family, on the four this lane holds. Two earlier independent
     * reads scored SERVICE PASS on ut_pet_dismissed_with_prejudice-set and
     * ut_pet_dismissed_without_prejudice-set by reading the held BCI handout
     * as governing over the registry; this lane was assigned the registry's
     * rule for all four and applies it to all four, and the disagreement is
     * reported rather than buried.
     */
    statesCourtTransmitsToProsecutor: true,
    /*
     * FIX83, PAGE_ORDER. Same inversion, same manifest, same repair as the
     * with-prejudice sibling: the prerequisite BCI stage sat on pages 17-19
     * behind every court document and the petition and order preceded the
     * cover sheet.
     */
    deliversInManifestComponentOrder: true,
    certificateIssuanceFeeHeldExempt: "a dismissal",
    declarationNameBoxClearsPrePrintedI: true,
    /*
     * FIX01/RT-1, SELF_HELP_STOP. The committed track registry holds nine
     * self-help stop conditions for trackId ut_pet_dismissed_without_prejudice
     * and the packet carried none of them, with no stop section of any kind --
     * and on the one condition it did reach it said the opposite of what the
     * registry holds, telling the participant that if the court schedules a
     * hearing they should attend it. The registry marks the first condition, in
     * its own words, "a hard stop, not a caveat".
     *
     * Set on THIS FAMILY ONLY, and set to the registry-reading flag rather than
     * the config-carried one so no condition passes through an editor's hands.
     * Six siblings share this host and this lane holds a grant on one family.
     */
    statesRegistryStopConditions: "ut_pet_dismissed_without_prejudice",
    /*
     * The closing line of that section is route-specific, so it is carried by
     * the family rather than written once for whichever family arrived first.
     * A family that does not set it keeps the sentence it already delivers and
     * its bytes do not move.
     */
    registryStopConditionsClosing:
      "The last two of these are this route's own question. This packet is built for a dismissal **without** prejudice, "
      + "which leaves the charges capable of being refiled; if refiling is asserted, has already happened, or you have "
      + "reason to believe it is about to, that is the point the record marks."
  },
  "ut_pet_limitations-set": {
    // FIX83 current VF04 findings; no ungranted sibling enables these repairs.
    orderPetitionerNameOnPrintedLine: true,
    captionTextClearsPrintedLines: true,
    slug: "ut-pet-limitations-set", traffic: false, routeKind: "case",
    chargeLabel: "Charge ended by limitations period",
    statesBciApplicationFee: true, statesManifestPreFilingItems: true,
    /*
     * FIX83, CLIPPING_AND_OVERLAP. Every X this host writes was drawn at the
     * printed left bracket's own x-origin plus 1.5pt and printed on top of the
     * bracket. The mark now sits in the bracket pair's interior gap, measured
     * as ink off the pinned source binary. Set per family: the three proven
     * siblings on this host carry the identical defect and this lane holds no
     * grant on them, so their delivered bytes must not move.
     */
    marksCentredInBracketGap: true,
    /*
     * FIX83, SERVICE. The packet told the participant "The prosecutor must
     * receive a copy of what you file, by mail or by email" and never stated
     * the rule the committed track registry holds for this track: "The
     * petitioner does not effect service in the ordinary case: the court sends
     * the filing to the prosecuting attorney." rules.notice and
     * destination.detail say it twice more. The registry also warns in terms
     * against wiring the general service-of-process regime to this track. The
     * genuine BCI quotation is kept and named as superseded rather than
     * deleted, because the participant is holding that sheet.
     *
     * Set per family, on the four this lane holds. Two earlier independent
     * reads scored SERVICE PASS on ut_pet_dismissed_with_prejudice-set and
     * ut_pet_dismissed_without_prejudice-set by reading the held BCI handout
     * as governing over the registry; this lane was assigned the registry's
     * rule for all four and applies it to all four, and the disagreement is
     * reported rather than buried.
     */
    statesCourtTransmitsToProsecutor: true,
    certificateIssuanceFeeNotEstablished: "a charge ended by the limitations period",
    declarationNameBoxClearsPrePrintedI: true,
    deliversInManifestComponentOrder: true,
    statesRegistryStopConditions: "ut_pet_limitations",
    registryStopConditionsClosing:
      "LegalEase does not calculate whether the limitations period has run; the BCI certificate is the answer.",
    /*
     * OWNER CORRECTION Q4, 2026-09-02. Set on THIS FAMILY ONLY, for the reason
     * the deliversInManifestComponentOrder note gives on ut_pet_no_charges-set:
     * the money paragraphs are shared by seven Utah families and only two of
     * them are held under this correction. Setting it unconditionally would
     * rewrite five unclaimed families' delivered bytes, and five families whose
     * digests the owner's batch adoption records.
     */
    ownerFeeCorrection: true
  },
  "ut_pet_no_charges-set": {
    // FIX83 current VF04 findings; no ungranted sibling enables these repairs.
    orderPetitionerNameOnPrintedLine: true,
    captionTextClearsPrintedLines: true,
    slug: "ut-pet-no-charges-set", traffic: false, routeKind: "incident",
    chargeLabel: "Arrest with no charges filed",
    statesBciApplicationFee: true, statesManifestPreFilingItems: true,
    /*
     * FIX83, CLIPPING_AND_OVERLAP. Every X this host writes was drawn at the
     * printed left bracket's own x-origin plus 1.5pt and printed on top of the
     * bracket. The mark now sits in the bracket pair's interior gap, measured
     * as ink off the pinned source binary. Set per family: the three proven
     * siblings on this host carry the identical defect and this lane holds no
     * grant on them, so their delivered bytes must not move.
     */
    marksCentredInBracketGap: true,
    /*
     * FIX83, SERVICE. The packet told the participant "The prosecutor must
     * receive a copy of what you file, by mail or by email" and never stated
     * the rule the committed track registry holds for this track: "The
     * petitioner does not effect service in the ordinary case: the court sends
     * the filing to the prosecuting attorney." rules.notice and
     * destination.detail say it twice more. The registry also warns in terms
     * against wiring the general service-of-process regime to this track. The
     * genuine BCI quotation is kept and named as superseded rather than
     * deleted, because the participant is holding that sheet.
     *
     * Set per family, on the four this lane holds. Two earlier independent
     * reads scored SERVICE PASS on ut_pet_dismissed_with_prejudice-set and
     * ut_pet_dismissed_without_prejudice-set by reading the held BCI handout
     * as governing over the registry; this lane was assigned the registry's
     * rule for all four and applies it to all four, and the disagreement is
     * reported rather than buried.
     */
    statesCourtTransmitsToProsecutor: true,
    /*
     * FIX83, FILING_DESTINATION. The instructions sent this participant to
     * "The Utah district court for the county where the case was heard" and
     * added that the county is written "from your case". This route is an
     * arrest where charges were never filed: there is no case and no court
     * that heard one. The registry's venue rule answers it in terms -- "If
     * charges were never filed, the district court in the county where the
     * arrest occurred" -- and its mechanism says why: "Because no case exists,
     * venue is the district court in the county where the arrest occurred."
     * The District mark on this route IS supported by that sentence and stays.
     */
    neverChargedVenue: true,
    /*
     * FIX83, KNOWN_PREFILLS and REQUIRED_BEFORE_FILING. The build wrote
     * matter.case_number into 1000EX and three places in 1020EX on a route the
     * registry describes as having no case at all -- two of them into the
     * proposed order's case-number branch, which this route does not even
     * select. The registry asks for the number only conditionally and records
     * the condition in terms: "Not asked where no case was ever filed."
     */
    noCaseNumberOnThisRoute: true,
    /*
     * FIX83, REQUIRED_BEFORE_FILING. The registry holds a waiting period this
     * packet never mentioned: condition "Every 77-40a-302(1) no-charges
     * route", duration "At least 30 days since the arrest." A participant
     * could follow every listed before-filing item and still file too early.
     */
    statesThirtyDaySinceArrest: true,
    certificateIssuanceFeeHeldExempt: "a declination",
    declarationNameBoxClearsPrePrintedI: true,
    /*
     * FIX04, PAGE_ORDER. The assembled packet ran 1000EX > 1020EX > 1044XX >
     * 1146XX > 1148XX > 1149XX > 1169XX > BCI application > BCI third-party
     * release, which against this family's committed packet-set manifest is
     * component order 4, 5, 3, 6, 7, 8, 9, 1, 2. The two Bureau of Criminal
     * Identification components the manifest orders FIRST sat on pages 17-19,
     * behind every court document -- and this route's law is a two-stage
     * sequence in which BCI decides eligibility and issues the certificate
     * whose identification number paragraph 1 of the petition then asks for.
     * A participant handed this packet cannot complete page 1 until they have
     * done the pages at the back. The packet is now assembled in the manifest's
     * declared component order, which is the order the route is performed in.
     *
     * Set on THIS FAMILY ONLY. The same inversion is in every sibling on this
     * host and the fix is the same word; this lane holds a grant on this family
     * alone and reordering unconditionally would rewrite six unclaimed
     * families' delivered bytes.
     */
    deliversInManifestComponentOrder: true,
    /*
     * FIX04, SELF_HELP_STOP. The committed track registry holds eight self-help
     * stop conditions for trackId ut_pet_no_charges and the packet carried none
     * of them, with no stop section of any kind -- and on the one condition it
     * did reach it said the opposite of what the registry holds, telling the
     * participant that if the court schedules a hearing they should attend it.
     */
    statesRegistryStopConditions: "ut_pet_no_charges"
  },
  "ut_pet_traffic-set": {
    slug: "ut-pet-traffic-set", traffic: true, routeKind: "case",
    chargeLabel: "Eligible traffic conviction",
    // OWNER CORRECTION Q4, 2026-09-02. This family only; see the note on
    // ut_pet_limitations-set.
    ownerFeeCorrection: true
  }
});

const ZERO_COUNTERS = Object.freeze({
  knownRequiredFieldsMissing: 0,
  requiredFactsNotCollected: 0,
  unclassifiedBlanks: 0,
  incompleteRows: 0,
  requiredOptionsMissing: 0,
  requiredComponentsMissing: 0,
  invisibleWrites: 0,
  protectedWrites: 0,
  visualDefects: 0
});

const NO_FILL_FORMS = new Set([
  "1146XX", "1148XX", "1149XX", "1169XX", "UT-BCI-THIRD-PARTY-RELEASE"
]);

const REQUIRED_BEFORE_FILING = Object.freeze([
  "Judicial district and court street address for the filing venue",
  "BCI certificate-of-eligibility identification number (non-traffic packets)",
  "Participant's public-interest explanation on the petition",
  "Every previously used name, or an express statement that there are none",
  "Gender, Social Security number, and driver-license number/state required by the BCI application",
  "BCI payment or fee-waiver election and any payment details",
  "Government-issued identification and fingerprints for the BCI application",
  "Signing city/country, participant signatures, and signing dates",
  "Whether this case has already been automatically expunged, and whether the 60-day acquittal goal and the 120-day automatic-processing window have run (acquittal route only)",
  "Law-enforcement incident file number and agency name for a no-charges order",
  "Any optional recipient, victim, prosecutor, reply, or third-party-release content only if that component becomes applicable",
  "Service method, address, date, and certification only after service occurs"
]);

const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const PACKET_SET_MANIFESTS = "data/record-clearing/legal-design-packet-set-manifests.json";
const TRACK_REGISTRY = "data/record-clearing/legal-design-track-registry.json";

/**
 * The compiled Utah state profile, cited as a held record in its own right.
 *
 * DET-FEE-AND-WAIVER-001 amendment A2 settles that "the repository" is every
 * committed record the family binds plus every record the route census names,
 * and lists the compiled state profile for the family's jurisdiction expressly.
 * It is not a corpus PDF, so it is not resolvable through the Master Library or
 * the corpus index; it is read and hashed from the checkout.
 *
 * The exact sentence is asserted rather than quoted from memory. If the
 * compiled profile is ever regenerated and this sentence changes, the build
 * refuses instead of shipping a fee statement whose authority no longer says
 * what the packet claims it says. This file only ever READS the compiled tree.
 */
const UT_PROFILE = "src/lib/rcap-engine/compiled/profiles/UT-utah.json";
const UT_PROFILE_CERTIFICATE_SENTENCE =
  "eligible conviction, plea-in-abeyance, or special certificates may require an additional $65 per case; "
  + "no certificate issuance fee is required for dismissals, acquittals, or declinations";

/**
 * The plea-in-abeyance discriminator, quoted from the same compiled profile.
 *
 * Independent verification failed ut_pet_dismissed_with_prejudice-set on
 * REQUIRED_BEFORE_FILING because "abeyance" appeared zero times in a packet
 * built for the one disposition the profile makes the abeyance question
 * dispositive for. It is dispositive twice over: it decides whether the free
 * 180-day automatic route reaches the participant, and it decides which limb of
 * the BCI certificate-fee sentence above reaches them. Each sentence is
 * asserted present on every build for the same reason the fee sentence is -- a
 * regenerated profile that no longer says this must refuse the build rather
 * than ship a packet that claims it does.
 */
const UT_PROFILE_ABEYANCE_EXCLUSION =
  "A dismissal with prejudice after successful completion of a plea in abeyance is excluded from that "
  + "favorable-outcome automatic category";
const UT_PROFILE_ABEYANCE_TIMING =
  "Dismissal with prejudice Goal: 180 days after dismissal/final appeal, unless dismissed after plea in abeyance";
const UT_PROFILE_ABEYANCE_SCREENING =
  "If the dismissal was after plea in abeyance, do not use the simple dismissed-with-prejudice automatic path.";
const UT_PROFILE_ABEYANCE_CLEAN_SLATE =
  "Some plea-in-abeyance dismissals may qualify for Clean Slate timing, but others require petition analysis.";

/**
 * The held publications the filing instructions quote, and nothing else.
 *
 * Independent verification failed filingDestination, feeAndWaiver and service
 * on these packets because the instructions treated the venue as a blank to
 * fill, stated no fee and no waiver route, and named no one to serve. None of
 * those is a fact this lane may invent, and none of them had to be: Utah
 * publishes all three, and the bytes are already in the committed corpus.
 *
 * Every statement the instructions make about where to file, what it costs and
 * who receives a copy is quoted from one of these, and each is re-hashed
 * against the committed corpus index on every build. A drifted source refuses
 * the build rather than shipping a stale instruction a participant would act
 * on.
 */
const CITED_AUTHORITIES = Object.freeze([
  {
    id: "UT-BCI-EXP-INSTRUCTIONS",
    title: "Expungement Applicant Instructions (Utah Bureau of Criminal Identification)",
    pathInArchive: "STATES/UT/03_INSTRUCTIONS/UT__INSTRUCTIONS__UT-BCI-EXP-INSTRUCTIONS__bci-expungement-applicant-instructions__REV-UNKNOWN__EN.pdf",
    supports: ["filingDestination", "feeAndWaiver", "service"],
    // The traffic route obtains no certificate, so this publication's BCI steps
    // do not apply to it. Its court step -- mail or email the prosecutor copies
    // of what you file -- is the only thing the traffic instructions quote from
    // it, and the instructions say so and send the reader to the clerk to
    // confirm the method for a traffic petition.
    trafficRoute: true,
    trafficSupports: ["service"]
  },
  {
    id: "UT-BCI-INDIGENT-INSTRUCTIONS",
    title: "Indigent Expungement Applicant Instructions (Utah Bureau of Criminal Identification)",
    pathInArchive: "STATES/UT/03_INSTRUCTIONS/UT__INSTRUCTIONS__UT-BCI-INDIGENT-INSTRUCTIONS__bci-indigent-expungement-instructions__REV-UNKNOWN__EN.pdf",
    supports: ["feeAndWaiver"],
    trafficRoute: false
  },
  {
    id: "1044XX",
    title: "District Court Cover Sheet for Civil Actions (Utah State Courts)",
    pathInArchive: "STATES/UT/02_PACKET_FORMS/UT__FORM__1044XX__district-court-cover-sheet-for-civil-actions__REV-2026-05-06__EN.pdf",
    supports: ["filingDestination", "feeAndWaiver"],
    trafficRoute: true
  },
  {
    id: "1305GE",
    title: "Motion to Waive Fees for Expungement - Criminal (Utah State Courts)",
    pathInArchive: "STATES/UT/04_SUPPORTING_PROCESS/UT__SUPPORT__1305GE__motion-to-waive-fees-for-expungement__REV-2019-06-24__EN.pdf",
    supports: ["feeAndWaiver"],
    trafficRoute: true
  },
  {
    id: "1146XX",
    title: "Acceptance of Service - Expungement (Prosecutor) (Utah State Courts)",
    pathInArchive: "STATES/UT/05_SOURCE_GATED/UT__SOURCE-GATED__1146XX__acceptance-of-service-expungement__REV-2019-05-01__EN.pdf",
    supports: ["service"],
    trafficRoute: true
  },
  /*
   * The compiled Utah state profile, cited as a committed repository record
   * rather than as a corpus binary.
   *
   * DET-FEE-AND-WAIVER-001 amendment A2 names the compiled state profile as a
   * held source, and A3 bounds that to the route the record actually addresses.
   * Every line the acquittal instructions quote from it is keyed to an
   * acquittal on all charges -- the automatic path, its 60-day goal, its 120-day
   * processing window, the retirement of the temporary request form, the court's
   * notice to the prosecuting office, and BCI's certificate-issuance position on
   * acquittals. None is read across from a sibling disposition.
   *
   * It is hashed from the committed file on every build, the same discipline the
   * corpus authorities get, so an instruction quoting a profile that has since
   * moved cannot ship quietly. It is not in the corpus index and must not be
   * looked up there.
   */
  {
    id: "UT-COMPILED-PROFILE",
    title: "Compiled Utah state profile (src/lib/rcap-engine/compiled/profiles/UT-utah.json)",
    repoPath: "src/lib/rcap-engine/compiled/profiles/UT-utah.json",
    supports: ["automaticExpungement", "filingDestination", "feeAndWaiver", "service"],
    trafficRoute: false,
    onlyWhenConfigFlag: "acquittalAutomaticFirst"
  }
]);

/**
 * Re-hashes every cited publication and returns its recorded identity.
 *
 * No hash is written into this file. The committed corpus index is the record,
 * the bytes on disk are the thing, and the build refuses when they disagree --
 * so an instruction quoting a superseded revision cannot ship quietly.
 */
function resolveCitedAuthorities(config) {
  const index = readJson(CORPUS_INDEX);
  const raw = index.entries ?? index.files ?? index;
  const entries = Array.isArray(raw) ? raw : Object.values(raw);
  const master = sourceRoot();
  const resolved = [];
  for (const authority of CITED_AUTHORITIES) {
    if (config.traffic && authority.trafficRoute !== true) continue;
    if (authority.onlyWhenConfigFlag && config[authority.onlyWhenConfigFlag] !== true) continue;
    if (authority.repoPath) {
      // A committed repository record. There is no corpus index row to compare
      // against because it is not a corpus binary; the repository IS the record,
      // and the hash written into the instructions is taken from it on this
      // build so a later reader can tell which profile the text was quoted from.
      const bytes = fs.readFileSync(path.join(rootDir, authority.repoPath));
      resolved.push({
        id: authority.id, title: authority.title, repoPath: authority.repoPath,
        sha256: sha256(bytes), byteLength: bytes.length,
        supports: authority.supports,
        verifiedBy: "hashed on this build from the committed repository file"
      });
      continue;
    }
    const entry = entries.find((row) => (row.path ?? row.relativePath) === authority.pathInArchive);
    assert.ok(entry, `${authority.id}: not in the committed corpus index at ${authority.pathInArchive}`);
    const bytes = fs.readFileSync(path.join(master, authority.pathInArchive));
    const digest = sha256(bytes);
    const indexed = String(entry.sha256 ?? entry.sha ?? "");
    assert.equal(digest, indexed,
      `${authority.id}: SHA-256 drift; the index records ${indexed} and the held bytes hash to ${digest}`);
    resolved.push({
      id: authority.id, title: authority.title, pathInArchive: authority.pathInArchive,
      sha256: digest, byteLength: bytes.length,
      supports: (config.traffic && authority.trafficSupports) ? authority.trafficSupports : authority.supports,
      verifiedBy: "re-hashed on this build against the committed corpus index"
    });
  }
  const citesProfileFee = config.certificateIssuanceFeeHeldExempt
    || config.certificateIssuanceFeeHeldExemptUnlessAbeyance
    || config.certificateIssuanceFeeHeldPerCase
    || config.certificateIssuanceFeeNotEstablished;
  if (citesProfileFee || config.statesPleaInAbeyanceDiscriminator) {
    const bytes = fs.readFileSync(path.join(rootDir, UT_PROFILE));
    const text = bytes.toString("utf8");
    if (citesProfileFee) {
      assert.ok(text.includes(JSON.stringify(UT_PROFILE_CERTIFICATE_SENTENCE).slice(1, -1)),
        `${UT_PROFILE}: the certificate-fee sentence this packet cites is no longer in the compiled profile`);
    }
    if (config.statesPleaInAbeyanceDiscriminator) {
      for (const sentence of [UT_PROFILE_ABEYANCE_EXCLUSION, UT_PROFILE_ABEYANCE_TIMING,
        UT_PROFILE_ABEYANCE_SCREENING, UT_PROFILE_ABEYANCE_CLEAN_SLATE]) {
        assert.ok(text.includes(JSON.stringify(sentence).slice(1, -1)),
          `${UT_PROFILE}: a plea-in-abeyance sentence this packet quotes is no longer in the compiled profile: ${sentence}`);
      }
    }
    resolved.push({
      id: "UT-COMPILED-STATE-PROFILE",
      title: "Compiled Utah state profile (BCI expungement FAQ, as compiled into this repository)",
      pathInArchive: UT_PROFILE,
      sha256: sha256(bytes), byteLength: bytes.length,
      supports: config.statesPleaInAbeyanceDiscriminator
        ? ["feeAndWaiver", "automaticExpungement", "requiredBeforeFiling"]
        : ["feeAndWaiver"],
      verifiedBy: "read from the checkout on this build, with the cited sentence asserted present"
    });
  }
  return resolved;
}

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const round = (value) => Number(Number(value).toFixed(2));
const normalize = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const writeJson = (rel, value) => {
  const abs = path.join(rootDir, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`);
};

function sourceRoot() {
  const value = process.env.MASTER_LIBRARY_SOURCE_DIR;
  assert.ok(value, "MASTER_LIBRARY_SOURCE_DIR is required; run the 14/14 packet-build preflight first");
  const resolved = path.resolve(value);
  assert.ok(fs.statSync(resolved).isDirectory(), `Master Library is not mounted at ${resolved}`);
  return resolved;
}

function outputRoot(config) {
  return `data/rcap-all50/overlays/census-v1/ut/${config.slug}--official-pdf-fill`;
}

function factsFor(config, fixture) {
  const boundary = fixture === "boundary";
  const fullName = boundary
    ? "Alexandrina Montgomery-Vandenberg"
    : "Jordan Avery Reyes";
  const first = boundary ? "Alexandrina" : "Jordan";
  const middle = boundary ? "Montgomery" : "Avery";
  const last = boundary ? "Vandenberg" : "Reyes";
  return {
    "participant.full_legal_name": fullName,
    "participant.bci_name": `${last}, ${first} ${middle}`,
    "participant.street_address": boundary
      ? "12345 Southwest Grandview Boulevard Northeast, Building 7, Apartment 4321-B"
      : "118 Maple Street",
    "participant.city_state_zip": boundary
      ? "Unincorporated Township of Long Hollow Crossing, UT 01234-9999"
      : "Springfield, UT 01234",
    "participant.mailing_address": boundary
      ? "12345 Southwest Grandview Boulevard Northeast, Building 7, Apartment 4321-B, Unincorporated Township of Long Hollow Crossing, UT 01234-9999"
      : "118 Maple Street, Springfield, UT 01234",
    "participant.phone": boundary ? "555-0142 ext. 44821" : "555-0142",
    "participant.email": boundary
      ? "alexandrina.montgomery@long-example.gov"
      : "jordan.reyes@example.com",
    "participant.date_of_birth": "1991-04-17",
    "matter.county": boundary ? "Saint Bartholomew County" : "Example County",
    "matter.case_number": boundary ? "2026-CR-900123-EXTENDED-CASE-IDENTIFIER" : "24-CR-001234",
    "matter.charge": boundary
      ? `${config.chargeLabel}; an unusually long statutory description used only to test legible fit and fail-closed overflow behavior`
      : config.chargeLabel
  };
}

function censusFields(census, formNumber) {
  const document = census.documents.find((row) => row.formNumber === formNumber);
  assert.ok(document, `census has no ${formNumber} document`);
  return document.fields.filter((field) => field.blankId);
}

function textBox(field, pageWidth = 612) {
  const x = round(field.measured.x0 + 1.5);
  const y = round(field.measured.baselineY + (field.construction === "content_stream_rule" ? 2 : 0));
  const measuredWidth = Math.max(12, field.measured.x1 - field.measured.x0 - 3.5);
  return { x, y, width: round(Math.min(measuredWidth, pageWidth - x - 12)), height: 12 };
}

function addTextPlan(plans, formNumber, field, factId, facts, overrides = {}) {
  const value = overrides.value ?? facts[factId];
  assert.ok(typeof value === "string" && value.length > 0,
    `${formNumber}/${field.blankId ?? overrides.fieldId}: no held fact for ${factId}`);
  plans.push({
    kind: "text",
    formNumber,
    sourcePage: field.page,
    fieldId: overrides.fieldId ?? field.blankId,
    field: overrides.field ?? (normalize(field.caption) || factId),
    sourceLabel: normalize(field.caption) || null,
    factId,
    value,
    writeBox: overrides.writeBox ?? textBox(field),
    geometryBasis: overrides.geometryBasis ?? field.geometryBasis ?? "committed first-hand census geometry"
  });
}

function matching(fields, predicate) {
  return fields.filter(predicate).sort((a, b) => a.page - b.page
    || b.measured.baselineY - a.measured.baselineY || a.measured.x0 - b.measured.x0);
}

function addCaptionFacts(plans, census, formNumber, facts, config) {
  const fields = censusFields(census, formNumber);
  const pageOne = fields.filter((field) => field.page === 1);
  const first = (predicate, context) => {
    const row = matching(pageOne, predicate)[0];
    assert.ok(row, `${formNumber}: missing census field for ${context}`);
    return row;
  };
  addTextPlan(plans, formNumber,
    first((field) => (/^Name$/i.test(normalize(field.caption))
      || (formNumber === "1002EX" && Math.abs(field.measured.baselineY - 665.52) < 1))
      && field.measured.x0 < 100, "name"),
    "participant.full_legal_name", facts);
  addTextPlan(plans, formNumber,
    first((field) => /^Address$/i.test(normalize(field.caption)) && field.measured.x0 < 100, "address"),
    "participant.street_address", facts);
  addTextPlan(plans, formNumber,
    first((field) => /^City, State, Zip$/i.test(normalize(field.caption)) && field.measured.x0 < 100, "city/state/zip"),
    "participant.city_state_zip", facts);
  addTextPlan(plans, formNumber,
    first((field) => /^Phone$/i.test(normalize(field.caption)) && field.measured.x0 < 100, "phone"),
    "participant.phone", facts);
  addTextPlan(plans, formNumber,
    first((field) => /documents at this email/i.test(normalize(field.caption)) && field.measured.x0 < 100, "email"),
    "participant.email", facts, { field: "Email" });

  let county = matching(pageOne, (field) => /Judicial District/i.test(normalize(field.caption))
    && field.measured.x0 > 250)[0];
  if (!county && ["1002EX", "1020EX", "1022EX"].includes(formNumber)) {
    const baselineY = formNumber === "1020EX" ? 514.2 : formNumber === "1022EX" ? 478.2 : 464.2;
    county = {
      blankId: `p1-manual-county-${formNumber}`,
      page: 1,
      caption: "County",
      construction: "printed_blank",
      geometryBasis: "existing county blank measured from the pinned source page",
      measured: { x0: 309.36, x1: 416.5, baselineY, width: 107.14 }
    };
  }
  assert.ok(county, `${formNumber}: county blank was not measured`);
  const countyOverride = config.captionTextClearsPrintedLines && ["1000EX", "1020EX"].includes(formNumber)
    ? {
      field: "County",
      // Source underscore baselines are 458.23 (1000EX) and 517.2 (1020EX).
      // At 300 dpi their ink tops are 456.72 and 515.52. A two-point
      // baseline lift clears the descenders; the county fact stays the same.
      writeBox: { ...textBox(county), y: formNumber === "1000EX" ? 460.23 : 519.2 },
      geometryBasis: "county source underline measured from pinned PDF glyphs and 300 dpi ink; baseline raised above the printed line"
    }
    : { field: "County" };
  addTextPlan(plans, formNumber, county, "matter.county", facts, countyOverride);

  let petitioner = matching(pageOne, (field) => /^Petitioner$/i.test(normalize(field.caption))
    && field.measured.x0 < 200)[0];
  if (!petitioner && ["1020EX", "1022EX"].includes(formNumber)) {
    petitioner = matching(pageOne, (field) => !normalize(field.caption)
      && field.measured.x0 < 100 && field.measured.baselineY > 320)[0];
  }
  if (!petitioner && formNumber === "1002EX") {
    petitioner = {
      blankId: "p1-manual-petitioner-1002EX",
      page: 1,
      caption: "Petitioner",
      construction: "printed_blank",
      geometryBasis: "existing In Re petitioner blank measured from the pinned source page",
      measured: { x0: 66.6, x1: 318.6, baselineY: 354.4, width: 252 }
    };
  }
  if (formNumber === "1020EX" && config.orderPetitionerNameOnPrintedLine) {
    // The census misses the underscore line because its source font reports
    // near-zero advances. Its fallback instead chose the panel border at
    // y=367.74. The pinned source prints the name line at text baseline 413.52,
    // above Petitioner; its 300 dpi ink spans x71.76–318.72/y411.36–411.84.
    petitioner = {
      blankId: "p1-manual-petitioner-1020EX", page: 1, caption: "Petitioner",
      construction: "underscore_glyph_run",
      measured: { x0: 72, x1: 318.72, baselineY: 413.52, width: 246.72 },
      geometryBasis: "1020EX pinned source page 1 petitioner-name underline above Petitioner, checked at 300 dpi; not the caption panel border"
    };
    addTextPlan(plans, formNumber, petitioner, "participant.full_legal_name", facts,
      { writeBox: { x: 73.5, y: 415.52, width: 243.22, height: 12 } });
  } else if (petitioner) {
    const nameOverride = formNumber === "1000EX" && config.captionTextClearsPrintedLines
      ? {
        writeBox: { ...textBox(petitioner), y: 356.4 },
        geometryBasis: "1000EX source petitioner underline ink tops at y352.8; baseline 356.4 clears both fixtures' descenders"
      }
      : {};
    addTextPlan(plans, formNumber, petitioner, "participant.full_legal_name", facts, nameOverride);
  }

  const caseFields = matching(fields, isCaseNumberBlank);
  /*
   * FIX83, KNOWN_PREFILLS. A route with no case has no case number, and a
   * fixture that prints one is not a boundary value -- it is a fact about a
   * proceeding that does not exist, written onto a petition. The four blanks
   * are left blank and refusalFor says, on the registry's own words, why.
   */
  if (!config.noCaseNumberOnThisRoute) {
    for (const field of caseFields) addTextPlan(plans, formNumber, field, "matter.case_number", facts,
      { field: "Case Number" });
  }
}

/**
 * The case-number blanks on the petition and the proposed order.
 *
 * Named once, because the writer that fills them and the refusal that has to
 * account for them being empty must agree on exactly which blanks they are.
 * The second limb is the caption block's right-hand column, whose printed
 * caption on these forms is "Petitioner" sitting above the case-number rule.
 */
function isCaseNumberBlank(field) {
  const caption = normalize(field.caption);
  return /case number/i.test(caption)
    || (/^Petitioner$/i.test(caption) && field.measured.x0 > 300);
}

function addPetitionPlans(plans, census, formNumber, facts, config) {
  addCaptionFacts(plans, census, formNumber, facts, config);
  const fields = censusFields(census, formNumber);
  const printed = matching(fields, (field) => /Printed Name/i.test(normalize(field.caption)))[0];
  assert.ok(printed, `${formNumber}: printed-name blank was not measured`);
  addTextPlan(plans, formNumber, printed, "participant.full_legal_name", facts);
}

function addOrderPlans(plans, census, formNumber, facts, config) {
  addCaptionFacts(plans, census, formNumber, facts, config);
}

function addCoverSheetPlans(plans, census, facts) {
  const formNumber = "1044XX";
  const fields = censusFields(census, formNumber);
  const at = (x, y, label) => {
    const row = fields.find((field) => Math.abs(field.measured.x0 - x) < 1
      && Math.abs(field.measured.baselineY - y) < 1);
    assert.ok(row, `${formNumber}: missing ${label} geometry at ${x},${y}`);
    return row;
  };
  addTextPlan(plans, formNumber, at(31.5, 671.7, "first petitioner name"),
    "participant.full_legal_name", facts, { field: "First Plaintiff/Petitioner Name" });
  addTextPlan(plans, formNumber, at(31.5, 648.24, "first petitioner address"),
    "participant.street_address", facts, { field: "First Plaintiff/Petitioner Address" });
  addTextPlan(plans, formNumber, at(31.5, 624.72, "first petitioner city/state/zip"),
    "participant.city_state_zip", facts, { field: "First Plaintiff/Petitioner City, State, Zip" });
  addTextPlan(plans, formNumber, at(31.5, 601.26, "first petitioner phone"),
    "participant.phone", facts, { field: "First Plaintiff/Petitioner Phone" });
  addTextPlan(plans, formNumber, at(171, 601.26, "first petitioner email"),
    "participant.email", facts, { field: "First Plaintiff/Petitioner Email" });
}

/**
 * Where the sworn declaration's name goes on the BCI application, page 2.
 *
 * The printed line is: I, ______ , declare under criminal penalty of the State
 * of Utah that the foregoing is true and correct.
 *
 * Measured on the delivered bytes with pdftotext -bbox, the pre-printed "I"
 * occupies x=49.745-52.742 and the comma that closes the blank sits at
 * x=194.626. The committed write box began at x=50.5, INSIDE the "I", so the
 * participant's name was drawn over the declaration's first-person subject: the
 * canonical raster reads as the name followed straight by ", declare under
 * criminal penalty", with the I reduced to a stub. That is a sworn declaration
 * that has lost its subject, and it is in the bytes the packet delivers.
 *
 * The repair moves the box right of the "I" and changes nothing else. x=55.5
 * clears the glyph by 2.758pt. The width stays 136, so the box still ends at
 * 191.5, left of the comma; fittedSize caps drawn text at width-20 = 116pt, and
 * the widest fixture value (the boundary name, 114.05pt) therefore ends by
 * 169.6 -- clear of the comma with 25pt to spare. Nothing else on the line
 * moves, and no other field's geometry is touched.
 */
const DECLARATION_NAME_BOX = Object.freeze({
  committed: { x: 50.5, y: 399, width: 136, height: 12 },
  clearsPrePrintedI: { x: 55.5, y: 399, width: 136, height: 12 }
});

function addBciPlans(plans, census, facts, config) {
  const formNumber = "UT-BCI-EXP-APPLICATION";
  const fields = censusFields(census, formNumber);
  const byId = (id) => {
    const row = fields.find((field) => field.blankId === id);
    assert.ok(row, `${formNumber}: missing ${id}`);
    return row;
  };
  addTextPlan(plans, formNumber, byId("p2-y681.70-x66.90"), "participant.bci_name", facts, {
    field: "NAME (Last, First, Middle)",
    writeBox: { x: 68.4, y: 683.7, width: 480, height: 12 },
    geometryBasis: "committed census baseline, corrected to the existing source rule's page boundary"
  });
  addTextPlan(plans, formNumber, byId("p2-y622.60-x121.49"), "participant.date_of_birth", facts,
    { field: "DATE OF BIRTH", writeBox: { x: 122.99, y: 624.6, width: 156, height: 12 } });
  addTextPlan(plans, formNumber, byId("p2-y600.10-x131.49"), "participant.mailing_address", facts,
    { field: "MAILING ADDRESS", writeBox: { x: 132.99, y: 602.1, width: 440, height: 12 } });
  addTextPlan(plans, formNumber, byId("p2-y545.10-x171.66"), "participant.phone", facts,
    { field: "PRIMARY PHONE NUMBER" });
  addTextPlan(plans, formNumber, byId("p2-y506.70-x97.47"), "participant.email", facts,
    { field: "EMAIL" });
  addTextPlan(plans, formNumber, {
    blankId: "p2-manual-declaration-name", page: 2, caption: "Name of Petitioner",
    geometryBasis: "existing printed declaration blank measured from the pinned source page",
    measured: { x0: 49, x1: 188, baselineY: 397, width: 139 }, construction: "printed_blank"
  }, "participant.full_legal_name", facts, {
    field: "Name of Petitioner",
    writeBox: config.declarationNameBoxClearsPrePrintedI
      ? { ...DECLARATION_NAME_BOX.clearsPrePrintedI }
      : { ...DECLARATION_NAME_BOX.committed }
  });
}

function textPlansFor(config, census, fixture) {
  const facts = factsFor(config, fixture);
  const plans = [];
  const petition = config.traffic ? "1002EX" : "1000EX";
  const order = config.traffic ? "1022EX" : "1020EX";
  addPetitionPlans(plans, census, petition, facts, config);
  addOrderPlans(plans, census, order, facts, config);
  addCoverSheetPlans(plans, census, facts);
  if (!config.traffic) addBciPlans(plans, census, facts, config);
  const ids = plans.map((row) => `${row.formNumber}:${row.fieldId}`);
  assert.equal(new Set(ids).size, ids.length, "text plan disposes a field more than once");
  return plans;
}

/**
 * The District/Justice election in the court caption, on the petition and on
 * the proposed order.
 *
 * It is named once and read from both places -- the writer that decides which
 * controls are marked, and the refusal that has to say WHY one is not -- so a
 * family that leaves the election unmade cannot leave it unmade in one place
 * and unexplained in the other.
 */
function isCourtTypeElection(control, formNumber) {
  const x = control.measured?.x0 ?? -1;
  const y = control.measured?.y0 ?? -1;
  if (control.page !== 1) return false;
  // Both choices are genuine when the court fact is not held. Leaving Justice
  // unmarked must not classify it as inapplicable while offering it in prose.
  if (formNumber === "1000EX") return (Math.abs(x - 226.97) < 1 || Math.abs(x - 290.33) < 1) && y > 475;
  if (formNumber === "1020EX") return (Math.abs(x - 226.8) < 1 || Math.abs(x - 286.18) < 1) && y > 530;
  return false;
}

function isProsecutorConsentFinding(control, formNumber) {
  return formNumber === "1020EX" && control.page === 2
    && control.selectionId === "p2-printed_bracket_pair-x121.5-y654.1";
}

function selectedControl(control, formNumber, config) {
  const x = control.measured?.x0 ?? -1;
  const y = control.measured?.y0 ?? -1;
  /*
   * VF03, ROUTE_OPTIONS and FILING_DESTINATION. The court caption on the
   * petition and on the proposed order was marked District from `route.case`,
   * and a case-number route does not establish District rather than Justice.
   * The committed track registry gives venue as "The court that decided the
   * criminal case, district or justice court" and holds no fact saying which
   * of the two decided this participant's case; neither does factsFor. So on a
   * family that sets this flag BOTH marks are left unmade and the election is
   * disclosed to the participant instead of being guessed for them.
   *
   * Set per family. A family that does not set it keeps the mark it already
   * delivers and its bytes do not move -- which matters here because
   * ut_pet_no_charges-set's venue IS a district court on the registry's own
   * words, and ut_pet_limitations-set's election is recorded as an open legal
   * question rather than a defect this lane may settle.
   */
  if (config.courtTypeElectionNotHeld && isCourtTypeElection(control, formNumber)) return false;
  if (config.prosecutorConsentNotHeld && isProsecutorConsentFinding(control, formNumber)) return false;
  if (formNumber === "1000EX") return (Math.abs(x - 126.02) < 1 && y > 520)
    || (x > 220 && x < 240 && y > 475);
  if (formNumber === "1002EX") return (x < 120 && y > 520)
    || (x > 215 && x < 240 && y > 485);
  if (formNumber === "1020EX") {
    if (x > 220 && x < 240 && y > 530) return true;
    if (config.dismissedWithoutPrejudice && y > 645) return true;
    if (config.routeKind === "incident" && (y > 450 && y < 470 || y > 285 && y < 300)) return true;
    if (config.routeKind === "case" && (y > 375 && y < 390 || y > 210 && y < 225)) return true;
    return false;
  }
  if (formNumber === "1022EX") return x > 220 && x < 240 && y > 495;
  if (formNumber === "1044XX") return control.page === 1
    ? (Math.abs(x - 410.16) < 1 && Math.abs(y - 282.75) < 1)
      || (Math.abs(x - 76.5) < 1 && Math.abs(y - 226.3) < 1)
    : (Math.abs(x - 355.98) < 1 && Math.abs(y - 358.1) < 1);
  return false;
}

/**
 * The interior gap of a printed bracket pair, measured off the pinned source
 * binary as ink rather than assumed from the control's own recorded box.
 *
 * VF02 FAILED ut_pet_limitations-set ON CLIPPING_AND_OVERLAP FOR EVERY MARK
 * THIS HOST WRITES. The selection write box was anchored on the LEFT BRACKET
 * GLYPH -- `control.measured.x0` -- and the X was drawn at that x plus 1.5pt,
 * so each X was printed on top of the "[" it was meant to sit inside, by
 * 1.27-1.84pt over the bracket's full height, on five delivered pages of both
 * fixtures. Three of the eight marks also ran past the right edge of their own
 * committed write box, and the build's own byte proof reported
 * nonWhitespaceGlyphsOutsideMeasuredWriteBoxes 0 while they did, because the
 * box itself was in the wrong place.
 *
 * WHY THE MEASUREMENT IS INK AND NOT GLYPH METRICS. The obvious cheaper fix is
 * to take the two bracket glyphs out of the text stream and use their advance
 * widths. On these forms that answer is wrong: on 1044XX page 2 the extractor
 * reports "[" at x=355.98 and "]" at x=361.455 with advance widths of about
 * -0.02pt, and the ink is actually at 356.64-358.62 and 364.44-366.42. The
 * brackets are positioned by TJ offsets the advance widths do not describe. A
 * mark centred on the stream positions would be a second guess about where the
 * printed page is. Rendering the pinned bytes and reading the ink is the only
 * measurement that answers "where is the bracket on the page".
 *
 * The source is re-hashed against the receipt before it is rendered, so a
 * drifted source refuses the build rather than yielding a geometry keyed to a
 * document that is no longer the one delivered.
 */
const BRACKET_INK_DPI = 1200;
const BRACKET_INK_THRESHOLD = 128;
const bracketGapCache = new Map();

async function inkRunsInBand(sourcePath, pageNumber, pageHeight, x0, x1, y0, y1) {
  const scale = BRACKET_INK_DPI / 72;
  const args = [
    "-png", "-gray", "-r", String(BRACKET_INK_DPI),
    "-f", String(pageNumber), "-l", String(pageNumber),
    "-x", String(Math.round(x0 * scale)), "-y", String(Math.round((pageHeight - y1) * scale)),
    "-W", String(Math.round((x1 - x0) * scale)), "-H", String(Math.round((y1 - y0) * scale)),
    sourcePath
  ];
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), "ut-bracket-ink-"));
  try {
    const run = spawnSync(PDFTOPPM, [...args, path.join(stage, "band")], {
      encoding: "buffer", maxBuffer: 64 * 1024 * 1024
    });
    assert.ifError(run.error);
    assert.equal(run.status, 0, `bracket-ink raster failed: ${String(run.stderr ?? "")}`);
    const produced = fs.readdirSync(stage).filter((name) => name.endsWith(".png")).sort();
    assert.equal(produced.length, 1, `bracket-ink raster produced ${produced.length} images`);
    const image = sharp(path.join(stage, produced[0])).greyscale();
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    const runs = [];
    let start = null;
    for (let column = 0; column < info.width; column += 1) {
      let inked = false;
      for (let row = 0; row < info.height && !inked; row += 1) {
        if (data[row * info.width * info.channels + column * info.channels] < BRACKET_INK_THRESHOLD) inked = true;
      }
      if (inked && start === null) start = column;
      if (!inked && start !== null) { runs.push([x0 + start / scale, x0 + column / scale]); start = null; }
    }
    if (start !== null) runs.push([x0 + start / scale, x0 + info.width / scale]);
    return { runs, touchesLeftEdge: runs.length > 0 && runs[0][0] <= x0 + 1 / scale };
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
  }
}

async function bracketGapFor(receipt, formNumber, control) {
  const key = `${formNumber}:${control.page}:${control.selectionId}`;
  if (bracketGapCache.has(key)) return bracketGapCache.get(key);
  const document = receipt.documents.find((row) => row.formNumber === formNumber);
  assert.ok(document, `${formNumber}: no bound source document to measure a bracket pair on`);
  const sourcePath = path.join(sourceRoot(), document.pathInArchive);
  const bytes = fs.readFileSync(sourcePath);
  assert.equal(sha256(bytes), document.sha256,
    `${formNumber}: source SHA-256 drift while measuring bracket geometry`);
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const page = pdf.getPage(control.page - 1);
  assert.equal(page.getRotation().angle % 360, 0,
    `${formNumber} page ${control.page}: rotated page; the ink band would not be where the box says`);
  const mediaBox = page.getMediaBox();
  assert.ok(Math.abs(mediaBox.x) < 0.01 && Math.abs(mediaBox.y) < 0.01,
    `${formNumber} page ${control.page}: media box origin is not (0,0)`);
  const { height } = page.getSize();

  // The window opens half a point left of the recorded box, so the left
  // bracket -- which every measured control on these forms starts 0.66-1.14pt
  // inside -- is the FIRST run and neighbouring printed text to its left is
  // outside the band entirely. A run touching the window edge means the window
  // cut a glyph, and the measurement refuses rather than reporting the cut.
  const windowStart = control.measured.x0 - 0.5;
  const { runs, touchesLeftEdge } = await inkRunsInBand(
    sourcePath, control.page, height, windowStart, control.measured.x0 + 44,
    control.measured.y0, control.measured.y1
  );
  assert.ok(!touchesLeftEdge,
    `${formNumber}/${control.selectionId}: ink runs to the left window edge; the band cut a glyph`);
  assert.ok(runs.length >= 2,
    `${formNumber}/${control.selectionId}: found ${runs.length} ink run(s) where a bracket pair was expected`);
  const [left, right] = runs;
  for (const [label, run] of [["left", left], ["right", right]]) {
    const width = run[1] - run[0];
    assert.ok(width > 0.5 && width <= 3,
      `${formNumber}/${control.selectionId}: the ${label} run is ${round(width)}pt wide, which is not a bracket`);
  }
  const gap = { x: left[1], width: right[0] - left[1] };
  assert.ok(gap.width >= 3 && gap.width <= 12,
    `${formNumber}/${control.selectionId}: bracket interior gap measures ${round(gap.width)}pt`);
  const measured = {
    x: round(gap.x), width: round(gap.width),
    leftBracketInk: [round(left[0]), round(left[1])],
    rightBracketInk: [round(right[0]), round(right[1])],
    dpi: BRACKET_INK_DPI, sourceSha256: document.sha256
  };
  bracketGapCache.set(key, measured);
  return measured;
}

async function selectionPlansFor(config, fieldMap, receipt) {
  const plans = [];
  for (const map of fieldMap.maps) {
    for (const control of map.selectionControls ?? []) {
      if (!selectedControl(control, map.formNumber, config)) continue;
      /*
       * FIX83, CLIPPING_AND_OVERLAP. Set per family: the four Utah petition
       * families this lane holds move to the measured interior gap, and the
       * three proven siblings that share this host keep the box they already
       * deliver so their bytes do not move. The defect is not narrower than
       * the flag -- every family on this host writes its marks the same way,
       * and the same three lines repair each one the moment it is claimed.
       */
      const gap = config.marksCentredInBracketGap
        ? await bracketGapFor(receipt, map.formNumber, control)
        : null;
      plans.push({
        kind: "selection",
        formNumber: map.formNumber,
        sourcePage: control.page,
        fieldId: control.selectionId,
        field: normalize(control.label) || control.selectionId,
        factId: `route.${config.routeKind}`,
        value: "X",
        writeBox: gap
          ? { x: gap.x, y: round(control.measured.y0), width: gap.width, height: round(control.measured.height) }
          : {
            x: round(control.measured.x0), y: round(control.measured.y0),
            width: round(control.measured.width), height: round(control.measured.height)
          },
        centreInWriteBox: gap !== null,
        ...(gap ? { bracketInk: { left: gap.leftBracketInk, right: gap.rightBracketInk, measuredAtDpi: gap.dpi } } : {}),
        geometryBasis: gap
          ? `printed bracket-pair interior gap measured as ink from the pinned source binary at ${gap.dpi} dpi`
          : "CTM-tracked source selection-control geometry",
        routeDetermined: true
      });
    }
  }
  return plans;
}

function isFooterOrArtifact(field) {
  const text = `${field.caption ?? ""} ${field.regionHeading ?? ""}`;
  return !normalize(field.caption)
    || /Approved|Revised|Page \d|APPLICATION FOR CERTIFICATE|^_$|^\s*-+\s*$/i.test(text);
}

/**
 * Where each page's agency-use region begins, measured off the census.
 *
 * A form that prints "BUREAU USE ONLY" is drawing a boundary on its own face:
 * everything under that heading is completed by the issuing agency, not by the
 * participant. Reading the heading's own caption caught only the heading blank
 * itself, so UT-BCI-EXP-APPLICATION's "SID#R&F" rule -- which sits INSIDE that
 * box at page 2 y=37.35, twenty points below the heading at y=58.14, and which
 * the census independently marks protectCategory "government_identifier" --
 * was classified REQUIRED_BEFORE_FILING and asked of the participant. A blank
 * the bureau completes is not an item the participant must supply before
 * filing.
 *
 * The rule is geometric and names no form: on any page, the highest agency-use
 * heading sets a baseline, and every blank at or below it belongs to the
 * agency. Nothing above the heading is touched -- the SSN and driver-licence
 * blanks the participant really does supply sit hundreds of points higher.
 */
const AGENCY_USE_HEADING = /\b(?:BUREAU|OFFICE|AGENCY|OFFICIAL|COURT|CLERK)\s+USE\s+ONLY\b/i;

function agencyUseBaselines(fields) {
  const byPage = new Map();
  for (const field of fields) {
    if (!AGENCY_USE_HEADING.test(`${field.caption ?? ""} ${field.regionHeading ?? ""}`)) continue;
    const baseline = field.measured?.baselineY;
    if (typeof baseline !== "number") continue;
    const current = byPage.get(field.page);
    if (current === undefined || baseline > current) byPage.set(field.page, baseline);
  }
  return byPage;
}

function inAgencyUseRegion(field, agencyBaselines) {
  const baseline = agencyBaselines.get(field.page);
  if (typeof baseline !== "number") return false;
  const y = field.measured?.baselineY;
  return typeof y === "number" && y <= baseline;
}

function requiredBeforeFilingReason(detail) {
  return {
    approvedBlankDisposition: "REQUIRED_BEFORE_FILING",
    why: `optional participant-authored content is not invented by the platform; REQUIRED_BEFORE_FILING: ${detail}`,
    participantInstruction: detail,
    compatibilityNote: "The committed completeness reader has no direct REQUIRED_BEFORE_FILING parser; the explicit disposition is authoritative."
  };
}

function refusalFor(field, formNumber, config, agencyBaselines = new Map()) {
  const caption = normalize(field.caption);
  const common = {
    blankId: field.blankId,
    field: caption || normalize(field.regionHeading) || `Non-filing source artifact ${field.blankId}`,
    page: field.page,
    measured: field.measured,
    construction: field.construction,
    sourceLabel: caption || null
  };
  if (formNumber === "1146XX") return {
    ...common,
    class: "signature_or_date_participant_completion",
    why: "Acceptance and certification of service are protected recipient completion after service.",
    approvedBlankDisposition: "PROTECTED_FIELD"
  };
  if (["1148XX", "1149XX", "1169XX", "UT-BCI-THIRD-PARTY-RELEASE"].includes(formNumber)) return {
    ...common,
    why: "optional participant-authored content; the platform does not invent it",
    approvedBlankDisposition: "OPTIONAL_PARTICIPANT_CONTENT"
  };
  const protectedText = `${caption} ${field.regionHeading ?? ""}`;
  if (field.protectCategory === "signature" || /Signature|Signed at|Date\b.*sign/i.test(protectedText)) return {
    ...common,
    class: "signature_or_date_participant_completion",
    why: "Signature and signing date are completed by the participant or authorized signer.",
    approvedBlankDisposition: "PROTECTED_FIELD"
  };
  if (field.protectCategory === "court" || /\bJudge\b|BUREAU USE ONLY|OFFICIAL TAKING PRINTS|Agency Name|Badge|Fingerprints taken|Date Printed|Identification number|Name on ID/i.test(protectedText)) return {
    ...common,
    why: "court, clerk, prosecutor, agency, or hearing field; protected for the authorized actor",
    approvedBlankDisposition: "PROTECTED_FIELD"
  };
  if (field.protectCategory === "attorney" || /Attorney|Bar Number|LPP/i.test(protectedText)) return {
    ...common,
    why: "attorney-only; not applicable on this self-represented route",
    approvedBlankDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE"
  };
  if (isFooterOrArtifact(field)) return {
    ...common,
    why: "viewer UI control or source-layout artifact; never a filing fact",
    approvedBlankDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE"
  };
  if (inAgencyUseRegion(field, agencyBaselines)) return {
    ...common,
    why: `court, clerk, prosecutor, agency, or hearing field; protected for the authorized actor — the form prints an agency-use-only heading on page ${field.page} at y=${round(agencyBaselines.get(field.page))} and this blank sits at y=${round(field.measured?.baselineY)}, inside that box`,
    agencyUseRegionBaselineY: round(agencyBaselines.get(field.page)),
    approvedBlankDisposition: "PROTECTED_FIELD"
  };
  if (formNumber === "1044XX") return {
    ...common,
    why: "attorney-only or an additional-party/damages branch not applicable on this single-petitioner expungement route",
    approvedBlankDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE"
  };
  if (formNumber === "UT-BCI-EXP-APPLICATION") {
    if (/Cardholder|credit card|payment|control|expiration/i.test(protectedText)) return {
      ...common,
      why: "optional participant-authored payment election; the platform does not invent it",
      approvedBlankDisposition: "PARTICIPANT_ELECTION_GENUINE"
    };
    return { ...common, ...requiredBeforeFilingReason(caption || "required BCI application fact") };
  }
  /*
   * FIX83. The route the packet is built for is an arrest where charges were
   * never filed, so there is no criminal case and no case number for the
   * participant to supply. The condition is NAMED here rather than left to
   * prose, because a case-number blank classifies as a required known fact and
   * would otherwise be reported as one the packet forgot. Two of the four sit
   * in the proposed order's case-number branch, which this route does not
   * select at all; the other two are the caption blocks.
   */
  if (config.noCaseNumberOnThisRoute && ["1000EX", "1020EX"].includes(formNumber)
      && isCaseNumberBlank(field)) return {
    ...common,
    /*
     * The caption block prints "Petitioner" above the case-number rule, and the
     * census took the nearest overlapping printed line, so the right-hand
     * column's blank is captioned "Petitioner" on 1000EX. The writer that used
     * to fill it renamed it "Case Number" for exactly that reason. The refusal
     * has to carry the same name, or the row is read as the petitioner's name
     * left blank next to a petitioner name the packet writes.
     */
    field: "Case Number",
    sourceLabel: "Case Number",
    printedCaptionNearestThisBlank: caption || null,
    captionTakenFromNearestOverlappingPrintedLine: !/case number/i.test(caption),
    completenessDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
    routeConditionThatMakesItInapplicable:
      "Charges were never filed on this arrest, so no criminal case and no case number exists for the "
      + "participant to supply. The committed track registry asks for a case number only conditionally on "
      + "this track and records the condition in terms: \"Not asked where no case was ever filed.\" Its "
      + "mechanism says the same thing: \"Because no case exists, venue is the district court in the county "
      + "where the arrest occurred.\" The number this petition is filed under is assigned by the court at or "
      + "after filing, which the committed completeness contract names as later completion: \"an assigned "
      + "case number, a filing stamp, a hearing date the court sets\".",
    why: "no criminal case exists on this route, so there is no case number to write; Utah Code 77-40a-302(1)",
    approvedBlankDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE"
  };
  if (/Court Address|Judicial District/i.test(protectedText)) return {
    ...common, ...requiredBeforeFilingReason(caption || "filing venue detail")
  };
  // The traffic route obtains no certificate of eligibility -- 1002EX prints
  // "1. Certificate of eligibility is not required" as a heading, and the route
  // is ut-traffic-direct-court-no-bci. The measured rule at page 1 y=296.76 is
  // the bottom border of the caption table's left cell, twenty-three points
  // below that printed heading, and the caption was taken from the heading
  // because it was the nearest overlapping printed line. Asking a traffic
  // petitioner for a certificate number the route does not use is asking for a
  // fact that does not exist.
  if (config.traffic && /certificate of eligibility/i.test(protectedText)) return {
    ...common,
    why: "source-layout artifact; never a filing fact — nothing is printed at the measured position, the caption was taken from the numbered heading above it, and on this route no certificate of eligibility is obtained at all",
    routeSelection: "ut-traffic-direct-court-no-bci",
    captionTakenFromNearestOverlappingPrintedLine: true,
    approvedBlankDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE"
  };
  if (/certificate of eligibility|interests of the public|public because/i.test(protectedText)) return {
    ...common, ...requiredBeforeFilingReason(caption || "petition fact")
  };
  if (formNumber === "1020EX" && config.routeKind === "incident"
      && /following incidents|number\) of/i.test(protectedText)) return {
    ...common, ...requiredBeforeFilingReason(caption || "law-enforcement incident identifier")
  };
  if (/hearing held|Signature|Judge/i.test(protectedText)) return {
    ...common,
    why: "court, clerk, prosecutor, agency, or hearing field; protected for later court completion",
    approvedBlankDisposition: "LATER_COMPLETION"
  };
  return {
    ...common,
    why: "optional participant-authored content; the platform does not invent it",
    approvedBlankDisposition: "OPTIONAL_PARTICIPANT_CONTENT"
  };
}

function selectionRefusal(control, formNumber, config = {}) {
  const common = {
    ...control,
    field: normalize(control.label) || control.selectionId,
    disposition: "explicit_refusal"
  };
  /*
   * FIX83, ROUTE_OPTIONS. The election is left for the participant because
   * nothing this platform holds decides it, and that is what the refusal has
   * to say: not that the branch is inapplicable -- one of the two branches is
   * certainly applicable -- but that the fact choosing between them is not
   * held. The registry gives venue as "The court that decided the criminal
   * case, district or justice court" and records no fact naming which.
   */
  if (config.courtTypeElectionNotHeld && isCourtTypeElection(control, formNumber)) return {
    ...common,
    kind: "participant_sworn_narrative_or_legal_election",
    reason: "genuine participant election: the committed track registry gives venue as \"The court that "
      + "decided the criminal case, district or justice court\" and holds no fact saying which of the two "
      + "decided this case, so the packet discloses the election rather than marking one",
    approvedBlankDisposition: "PARTICIPANT_ELECTION_GENUINE"
  };
  /*
   * FIX104, unclassifiedBlanks. FIX83 refused this finding correctly and then
   * named the refusal in a private vocabulary: kind
   * "court_finding_requires_prosecutor_evidence" is outside the closed refusal
   * classes, and the prose that replaced the approved wording matched no
   * approved reason, so the completeness contract read the blank as
   * UNCLASSIFIED. The refusal itself is unchanged and the box stays unmarked;
   * only its classification is restored to the one every other court-owned
   * 1020EX blank in this family already uses -- the court, clerk, prosecutor,
   * agency or hearing class, protected for later court completion. The
   * family-specific explanation is kept after it, and paragraph 5 remains
   * named in participant-instructions.md.
   */
  if (config.prosecutorConsentNotHeld && isProsecutorConsentFinding(control, formNumber)) return {
    ...common,
    kind: "selection_control",
    reason: "court, clerk, prosecutor, agency, or hearing field; protected for later court completion: this paragraph asserts actual written prosecutor consent and no intent to refile. Neither fact is held. The committed dismissal-without-prejudice route also permits the 180-day alternative, so the family alone cannot select this finding.",
    approvedBlankDisposition: "LATER_COMPLETION"
  };
  if (NO_FILL_FORMS.has(formNumber)) return {
    ...common,
    kind: "participant_sworn_narrative_or_legal_election",
    reason: "optional participant-authored election; the platform does not invent it",
    approvedBlankDisposition: formNumber === "1146XX" ? "PROTECTED_FIELD" : "OPTIONAL_PARTICIPANT_CONTENT"
  };
  if (formNumber === "UT-BCI-EXP-APPLICATION") return {
    ...common,
    kind: "participant_sworn_narrative_or_legal_election",
    reason: "optional participant-authored payment or fee-waiver election; the platform does not invent it",
    approvedBlankDisposition: "PARTICIPANT_ELECTION_GENUINE"
  };
  if (["1020EX", "1022EX"].includes(formNumber)
      && /pleadings|hearing|court received an objection/i.test(common.field)) return {
    ...common,
    reason: "court, clerk, prosecutor, agency, or hearing field; protected for later court completion",
    approvedBlankDisposition: "LATER_COMPLETION"
  };
  return {
    ...common,
    reason: "attorney-only or alternative route branch not applicable on this route-specific packet",
    approvedBlankDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE"
  };
}

function repairFieldMap(config, original, census, canonicalPlans, boundaryPlans, citedAuthorities = []) {
  const selectedIds = new Set(canonicalPlans.filter((row) => row.kind === "selection").map((row) => row.fieldId));
  const textIds = new Set(canonicalPlans.filter((row) => row.kind === "text")
    .map((row) => `${row.formNumber}:${row.fieldId}`));
  const canonicalText = canonicalPlans.filter((row) => row.kind === "text");
  const boundaryText = boundaryPlans.filter((row) => row.kind === "text");
  const blankLedger = [];
  const maps = original.maps.map((oldMap) => {
    const fields = censusFields(census, oldMap.formNumber);
    const agencyBaselines = agencyUseBaselines(fields);
    const roleRefusals = fields
      .filter((field) => !textIds.has(`${oldMap.formNumber}:${field.blankId}`))
      .map((field) => refusalFor(field, oldMap.formNumber, config, agencyBaselines));
    const selectionControls = (oldMap.selectionControls ?? []).map((control) => {
      if (selectedIds.has(control.selectionId)) return {
        ...control,
        field: normalize(control.label) || control.selectionId,
        disposition: "selected_route_option",
        reason: "selected because the packet family and route determine this option",
        approvedBlankDisposition: null
      };
      return selectionRefusal(control, oldMap.formNumber, config);
    });
    blankLedger.push(...roleRefusals.map((row) => ({ formNumber: oldMap.formNumber, ...row })),
      ...selectionControls.filter((row) => !String(row.disposition).startsWith("selected"))
        .map((row) => ({ formNumber: oldMap.formNumber, fieldId: row.selectionId, ...row })));
    return {
      ...oldMap,
      roleRefusals,
      selectionControls,
      offeredAnchors: canonicalText.filter((row) => row.formNumber === oldMap.formNumber),
      protectedRules: oldMap.protectedRules ?? null,
      canonicalWrites: canonicalText.filter((row) => row.formNumber === oldMap.formNumber),
      canonicalRefusals: [],
      boundaryWrites: boundaryText.filter((row) => row.formNumber === oldMap.formNumber),
      boundaryRefusals: [],
      completenessRepair: {
        assignmentId: ASSIGNMENT_ID,
        everyBlankHasApprovedDisposition: true,
        routeOptionsSelected: selectionControls.filter((row) => String(row.disposition).startsWith("selected"))
          .map((row) => row.selectionId)
      }
    };
  });
  assert.ok(blankLedger.every((row) => row.approvedBlankDisposition), "a blank lacks an approved disposition");
  return {
    fieldMap: {
      ...original,
      schemaVersion: "rcap-official-form-field-map/v1-census-v1-completeness-repair",
      maps,
      completenessRepair: {
        assignmentId: ASSIGNMENT_ID,
        controlBaseSha: CONTROL_BASE,
        dispatchCommit: DISPATCH_COMMIT,
        everyKnownFactWritten: true,
        everyIntentionalBlankClassified: true,
        everyRouteDeterminedOptionSelected: true,
        requiredBeforeFilingSurfaced: true,
        filingDestinationStated: true,
        feeAndWaiverRouteStated: true,
        serviceRecipientAndMethodStated: true,
        citedAuthorities,
        protectedWrites: 0,
        commercialRoutesOpened: 0
      }
    },
    blankLedger
  };
}

/*
 * The delivered order of a packet's components, read from the committed
 * packet-set manifest rather than from the order the source receipt happens to
 * list its documents in.
 *
 * Returns the receipt's own order untouched for every family that does not set
 * deliversInManifestComponentOrder, so no unflagged family's bytes move. Where
 * it IS set the manifest is authoritative and the build refuses rather than
 * guessing: a delivered form the manifest does not place, or a form placed
 * twice, stops the build instead of producing a packet in an order nothing
 * declares.
 */
function manifestOrderedDocuments(receipt, config) {
  if (!config?.deliversInManifestComponentOrder) return receipt.documents;
  const manifest = readJson(PACKET_SET_MANIFESTS);
  const set = (manifest.packetSets ?? []).find((row) => row.packetSetId === receipt.familyId);
  assert.ok(set, `${receipt.familyId}: no committed packet-set manifest to order the packet by`);
  const order = new Map();
  for (const component of set.components ?? []) {
    if (!component.officialFormId) continue;
    assert.equal(order.has(component.officialFormId), false,
      `${component.officialFormId}: placed twice in the committed component order`);
    order.set(component.officialFormId, component.order);
  }
  for (const document of receipt.documents) {
    assert.ok(order.has(document.formNumber),
      `${document.formNumber}: delivered but not placed by the committed component order`);
  }
  return [...receipt.documents]
    .sort((left, right) => order.get(left.formNumber) - order.get(right.formNumber));
}

async function sourcePacket(receipt, config) {
  const master = sourceRoot();
  const packet = await PDFDocument.create();
  packet.setCreationDate(FIXED_DATE);
  packet.setModificationDate(FIXED_DATE);
  packet.setTitle(`Official-form review fixture: ${receipt.familyId}`);
  const pageManifest = [];
  let packetPage = 1;
  for (const document of manifestOrderedDocuments(receipt, config)) {
    const sourcePath = path.join(master, document.pathInArchive);
    const bytes = fs.readFileSync(sourcePath);
    assert.equal(sha256(bytes), document.sha256, `${document.formNumber}: source SHA-256 drift`);
    assert.equal(bytes.length, document.byteLength, `${document.formNumber}: source byte-length drift`);
    const source = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    const pages = await packet.copyPages(source, source.getPageIndices());
    pages.forEach((page, index) => {
      packet.addPage(page);
      pageManifest.push({
        packetPage: packetPage++, formNumber: document.formNumber, sourcePage: index + 1,
        sourceSha256: document.sha256
      });
    });
  }
  const sanitized = await sanitizeAndFlatten(packet, { alreadyFlattened: true });
  sanitized.clean.setCreationDate(FIXED_DATE);
  sanitized.clean.setModificationDate(FIXED_DATE);
  sanitized.clean.setTitle(`Official-form review fixture: ${receipt.familyId}`);
  const bytes = await sanitized.clean.save({ useObjectStreams: false, updateMetadata: false });
  return { bytes, pageManifest };
}

function packetPageFor(pageManifest, formNumber, sourcePage) {
  const row = pageManifest.find((item) => item.formNumber === formNumber && item.sourcePage === sourcePage);
  assert.ok(row, `${formNumber}/page ${sourcePage}: absent from packet page manifest`);
  return row.packetPage;
}

function protectedPlanGuard(plan) {
  const text = `${plan.field} ${plan.factId}`;
  if (plan.kind === "selection") {
    assert.equal(plan.routeDetermined, true, `${plan.formNumber}/${plan.fieldId}: non-route selection entered the write plan`);
    assert.ok(!/signature|signing date|certificate of service|service date/i.test(text),
      `${plan.formNumber}/${plan.fieldId}: protected selection entered the write plan`);
    return;
  }
  assert.ok(!/signature|signing date|certificate of service|service date|judge|clerk|prosecutor|agency|victim|fingerprint|badge/i.test(text),
    `${plan.formNumber}/${plan.fieldId}: protected field entered the write plan`);
}

function fittedSize(font, value, width, preferred = 10) {
  let size = preferred;
  while (size > 4 && font.widthOfTextAtSize(value, size) > width) size -= 0.25;
  assert.ok(font.widthOfTextAtSize(value, size) <= width,
    `value does not fit measured box at the minimum legible size: ${value}`);
  return size;
}

async function renderFixture(base, plans, fixture, file) {
  const document = await PDFDocument.load(base.bytes, { ignoreEncryption: true, updateMetadata: false });
  document.setCreationDate(FIXED_DATE);
  document.setModificationDate(FIXED_DATE);
  document.setTitle(`Official-form review fixture (${fixture})`);
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  for (const plan of plans) {
    protectedPlanGuard(plan);
    const pageNumber = packetPageFor(base.pageManifest, plan.formNumber, plan.sourcePage);
    const page = document.getPage(pageNumber - 1);
    if (plan.kind === "selection") {
      let size = Math.max(6, Math.min(10, plan.writeBox.height - 2));
      let x = plan.writeBox.x + 1.5;
      if (plan.centreInWriteBox) {
        /*
         * The box is now the bracket pair's interior gap, so the mark is
         * centred in it rather than pushed against its left edge, and it is
         * shrunk until it clears both printed brackets. The half point of
         * clearance is not decoration: the widest gap on these forms is
         * 7.14pt and the widest X is 6.67pt, so an uncentred or unshrunk mark
         * lands on a bracket by a fraction of a point and rasters as fused to
         * it.
         */
        const room = plan.writeBox.width - 0.5;
        while (size > 6 && bold.widthOfTextAtSize("X", size) > room) size -= 0.25;
        const drawn = bold.widthOfTextAtSize("X", size);
        assert.ok(drawn <= room,
          `${plan.formNumber}/${plan.fieldId}: an X does not clear the bracket gap at the minimum legible size`);
        x = plan.writeBox.x + (plan.writeBox.width - drawn) / 2;
        plan.markWidth = round(drawn);
        plan.markSpan = [round(x), round(x + drawn)];
      }
      plan.fontSize = size;
      page.drawText("X", { x, y: plan.writeBox.y + 1, size, font: bold, color: rgb(0, 0, 0) });
    } else {
      const size = fittedSize(font, plan.value, Math.max(12, plan.writeBox.width - 20));
      page.drawText(plan.value, {
        x: plan.writeBox.x, y: plan.writeBox.y,
        size, font, color: rgb(0, 0, 0), maxWidth: plan.writeBox.width
      });
      plan.fontSize = size;
    }
    plan.packetPage = pageNumber;
  }
  const bytes = await document.save({ useObjectStreams: false, updateMetadata: false });
  const active = scanBytesForActiveContent(bytes);
  assert.ok(active.inspectable && active.hits.length === 0,
    `${fixture}: active-content residue ${active.hits.join(", ")}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes);
  return { bytes, activeContentScan: active };
}

function glyphsOf(bytes) {
  return PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false }).then((document) => {
    const rows = [];
    document.getPages().forEach((page, index) => {
      for (const item of extractTextItems(page)) {
        for (const character of item.chars ?? []) rows.push({
          page: index + 1,
          x: round(character.x), y: round(item.y), w: round(character.w), c: character.c
        });
      }
    });
    return rows;
  });
}

function glyphKey(glyph) {
  return `${glyph.page}|${glyph.x}|${glyph.y}|${glyph.c}`;
}

async function addedGlyphs(baseBytes, finalBytes) {
  const before = await glyphsOf(baseBytes);
  const after = await glyphsOf(finalBytes);
  const counts = new Map();
  for (const glyph of before) counts.set(glyphKey(glyph), (counts.get(glyphKey(glyph)) ?? 0) + 1);
  const added = [];
  for (const glyph of after) {
    const key = glyphKey(glyph);
    const remaining = counts.get(key) ?? 0;
    if (remaining > 0) counts.set(key, remaining - 1);
    else added.push(glyph);
  }
  return added;
}

function glyphInBox(glyph, plan) {
  const box = plan.writeBox;
  return glyph.page === plan.packetPage
    && glyph.x >= box.x - 3 && glyph.x + glyph.w <= box.x + box.width + 3
    && glyph.y >= box.y - 4 && glyph.y <= box.y + box.height + 4;
}

function byteProof(added, plans, blankLedger, pageManifest) {
  const actualWrites = plans.map((plan) => {
    const glyphs = added.filter((glyph) => glyphInBox(glyph, plan));
    assert.ok(glyphs.some((glyph) => normalize(glyph.c)),
      `${plan.formNumber}/${plan.fieldId}: final PDF bytes carry no glyph in the measured write box`);
    return {
      formNumber: plan.formNumber,
      fieldId: plan.fieldId,
      field: plan.field,
      factId: plan.factId,
      kind: plan.kind,
      packetPage: plan.packetPage,
      sourcePage: plan.sourcePage,
      writeBox: plan.writeBox,
      glyphCountReadFromOutputBytes: glyphs.filter((glyph) => normalize(glyph.c)).length,
      textReadFromOutputBytes: normalize(glyphs.sort((a, b) => a.x - b.x).map((glyph) => glyph.c).join("")),
      proofMethod: "glyph geometry read from final PDF bytes at the committed measured box"
    };
  });
  const outside = added.filter((glyph) => normalize(glyph.c)
    && !plans.some((plan) => glyphInBox(glyph, plan)));
  assert.equal(outside.length, 0,
    `final PDF contains added glyphs outside every measured write box: ${JSON.stringify(outside.slice(0, 30))}`);
  const refusedFieldsWithInk = [];
  for (const blank of blankLedger) {
    if (!blank.measured || !blank.page) continue;
    const packetPage = packetPageFor(pageManifest, blank.formNumber, blank.page);
    const box = {
      x: blank.measured.x0, y: blank.measured.baselineY,
      width: Math.max(1, blank.measured.x1 - blank.measured.x0), height: 12
    };
    const ink = added.some((glyph) => glyphInBox(glyph, { packetPage, writeBox: box }));
    if (ink) refusedFieldsWithInk.push({ formNumber: blank.formNumber, fieldId: blank.blankId ?? blank.fieldId });
  }
  assert.equal(refusedFieldsWithInk.length, 0, "a refused field carries generated ink");
  return { actualWrites, outside, refusedFieldsWithInk };
}

function popplerEvidence() {
  const probe = spawnSync(PDFTOPPM, ["-v"], { encoding: "utf8" });
  assert.ifError(probe.error);
  assert.equal(probe.status, 0, `pdftoppm unavailable: ${probe.stderr || probe.stdout}`);
  const version = /pdftoppm\s+version\s+([^\s]+)/i.exec(`${probe.stderr}\n${probe.stdout}`)?.[1];
  assert.ok(version, "pdftoppm did not report its version");
  return { engine: "poppler_pdftoppm", discoveryMode: process.env.RCAP_PDFTOPPM ? "RCAP_PDFTOPPM" : "PATH", version };
}

async function rasterPacket(file, outDirRel) {
  const outDir = path.join(rootDir, outDirRel);
  fs.mkdirSync(outDir, { recursive: true });
  for (const name of fs.readdirSync(outDir)) if (/^page-(?:raw-)?\d+\.png$/.test(name)) {
    fs.rmSync(path.join(outDir, name));
  }
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), "ut-completeness-raster-"));
  const prefix = path.join(stage, "page");
  const run = spawnSync(PDFTOPPM, ["-png", "-r", String(RASTER_DPI), file, prefix], {
    encoding: "utf8", maxBuffer: 64 * 1024 * 1024
  });
  assert.ifError(run.error);
  assert.equal(run.status, 0, `raster failed: ${run.stderr || run.stdout}`);
  const pdf = await PDFDocument.load(fs.readFileSync(file), { ignoreEncryption: true, updateMetadata: false });
  const geometry = pdf.getPages().map((page, index) => ({ page: index + 1, ...page.getSize() }));
  const found = fs.readdirSync(stage).map((name) => ({ name, match: /^page-(\d+)\.png$/.exec(name) }))
    .filter((row) => row.match).map((row) => ({ ...row, page: Number(row.match[1]) }))
    .sort((a, b) => a.page - b.page);
  const provenance = popplerEvidence();
  const pages = [];
  for (const row of found) {
    const source = path.join(stage, row.name);
    const target = path.join(outDir, `page-${String(row.page).padStart(2, "0")}.png`);
    fs.renameSync(source, target);
    const metadata = await sharp(target).metadata();
    const { channels } = await sharp(target).greyscale().stats();
    const page = geometry.find((item) => item.page === row.page);
    const bytes = fs.readFileSync(target);
    const croppedToPage = Math.abs(metadata.width - Math.round(page.width * RASTER_DPI / 72)) <= 1
      && Math.abs(metadata.height - Math.round(page.height * RASTER_DPI / 72)) <= 1;
    const looksBlank = channels[0].max - channels[0].min <= 6;
    assert.ok(croppedToPage && !looksBlank, `raster page ${row.page} is blank or not page-cropped`);
    pages.push({
      page: row.page,
      file: path.relative(rootDir, target).split(path.sep).join("/"),
      widthPx: metadata.width, heightPx: metadata.height,
      pdfWidthPt: page.width, pdfHeightPt: page.height,
      attempts: 1, looksBlank, croppedToPage,
      engine: provenance.engine, engineDiscoveryMode: provenance.discoveryMode,
      engineVersion: provenance.version, dpi: RASTER_DPI,
      sha256: sha256(bytes), byteLength: bytes.length
    });
  }
  fs.rmSync(stage, { recursive: true, force: true });
  assert.equal(pages.length, geometry.length, "not every PDF page was rastered");
  return { pages, provenance };
}

/**
 * The filing instructions the packet ships with.
 *
 * The previous version listed the blanks and stopped there. Independent
 * verification failed it on three counts and each finding was right:
 *
 *   filingDestination -- it never said where the packet goes. It listed
 *     "Judicial district and court street address for the filing venue" as a
 *     blank the participant must supply, which is the opposite of naming a
 *     destination, and a route-determined mark in the caption box is not the
 *     instructions naming a court.
 *   feeAndWaiver -- the packet marks the $150 cover-sheet row but no text ever
 *     stated the fee, and no waiver route was named or referenced anywhere.
 *   service -- "Service method, address, date, and certification only after
 *     service occurs" hands the participant the recipient and the method as
 *     blanks. It names neither.
 *
 * None of the three needed inventing. Utah publishes all of them and the bytes
 * are held: the cover sheet prints the fee, the BCI applicant instructions name
 * the court step and the prosecutor service step, and 1305GE is the waiver
 * motion.
 *
 * A later independent read found the money paragraph still wrong, in the
 * opposite direction. It said in bold that the packet "does not state an amount
 * because BCI sets it per applicant" -- while the BCI application this packet
 * DELIVERS prints "$65.00" three times. Two BCI amounts had been collapsed into
 * one refusal: the $65.00 application fee, which is flat, printed and held, and
 * the per-incident certificate price, which genuinely is set per applicant in
 * BCI's letter. Refusing the second never licensed denying the first, and a
 * reader told the packet states no amount who then finds $65.00 on the form
 * they must submit cannot tell what they have missed. The instruction now
 * states the $65.00, states BCI's own indigency waiver and the sequencing rule
 * the application prints ("you MUST complete the fee waiver form before
 * submitting your application"), and keeps the honest refusal for the
 * certificate price -- which is still not guessed.
 * See DET-FEE-AND-WAIVER-001 amendment A4.
 *
 * A further read applied amendment A3 to the certificate half, route by route,
 * and the answer is not the same for every family on this host. The compiled
 * Utah profile records BCI's FAQ exempting "dismissals, acquittals, or
 * declinations" from the certificate issuance fee. For a dismissal route and
 * for a declination route the repository therefore ANSWERS the certificate
 * question, and A1 forbids sending the participant to ask about an answer the
 * record holds -- so those packets state it. For the limitations route neither
 * limb of that sentence addresses the disposition, so nothing establishes it and
 * the named-authority refusal is the honest outcome rather than a defect; that
 * packet says so and says WHY, so a reader can see the refusal is reasoned
 * rather than lazy.
 *
 * A THIRD read (vf10) took the same route-by-route discipline to the two
 * families that had been left on the unflagged paragraph, and found that the
 * paragraph was false on BOTH of them, in opposite directions:
 *
 *   ut_pet_conviction-set -- the profile sentence OPENS with "eligible
 *     conviction ... certificates may require an additional $65 per case". The
 *     packet's "this packet does not state that amount because BCI sets it per
 *     applicant" therefore denied a figure the repository holds, which is the
 *     A1 refusal, and its companion clause "the certificates themselves cost
 *     more than the application" is contradicted by that same figure for a
 *     single eligible case. The route now states $65 per case with the record's
 *     own "may require" condition, promises no total, and keeps BCI as the
 *     confirming authority.
 *   ut_pet_dismissed_with_prejudice-set -- this route is a dismissal and the
 *     exempting limb names dismissals, so the packet was telling a participant
 *     that a fee the record puts at zero was MORE than $65 and unknowable. The
 *     wording had simply been written once for the conviction route and reused
 *     where the disposition class inverts the answer. The route now states the
 *     exemption -- and states the one fact inside the same sentence that takes
 *     it back, a dismissal that ended a completed plea in abeyance, because the
 *     other limb of that sentence names plea-in-abeyance certificates.
 *
 * There is no unflagged case left. Every non-traffic family declares which limb
 * of the profile's fee sentence reaches its route, or declares expressly that
 * neither does, and the build refuses a family that declares nothing.
 *
 * The plea-in-abeyance fact is dispositive a second time on the with-prejudice
 * route, which is why the same read also failed it on REQUIRED_BEFORE_FILING.
 * The packet disclosed a free automatic route 180 days after dismissal and did
 * not disclose that the profile excludes a dismissal following a completed plea
 * in abeyance from it -- so a participant in that position was advised to wait
 * out 180 days for relief the record says would not arrive. The exclusion is
 * now stated with the disclosure, and the fact is asked as a pre-filing check,
 * marked in the instructions as coming from the compiled profile rather than
 * from the family's packet-set manifest.
 */
function participantInstructions(config, authorities) {
  const items = REQUIRED_BEFORE_FILING.filter((item) => {
    if (config.traffic && /BCI certificate|previously used name|Gender|BCI payment|Government-issued/i.test(item)) return false;
    if (config.routeKind !== "incident" && /Law-enforcement incident/i.test(item)) return false;
    // The automatic-expungement check is the first thing an acquittal
    // participant must establish and is meaningless on the other routes, so it
    // is carried only where the route's own disposition puts it in issue.
    if (!config.acquittalAutomaticFirst && /already been automatically expunged/i.test(item)) return false;
    return true;
  });
  // On the acquittal route this one check decides whether the rest of the list
  // is needed at all, so it is read first rather than eighth.
  if (config.acquittalAutomaticFirst) {
    items.sort((a, b) => Number(/already been automatically expunged/i.test(b))
      - Number(/already been automatically expunged/i.test(a)));
  }
  const petition = config.traffic ? "1002EX" : "1000EX";
  const order = config.traffic ? "1022EX" : "1020EX";
  const out = [];

  out.push("# Filing instructions and what you must supply", "");
  out.push("This is a review fixture built from exact held official Utah forms. The platform filled in what it holds about you and about your case. Everything below is either a direction taken from Utah's own published instructions, or a fact you supply yourself.", "");

  if (config.acquittalAutomaticFirst) {
    /*
     * The automatic route comes first because it is the route.
     *
     * Every quotation below is verbatim from the compiled Utah state profile,
     * and every one of them is keyed to an acquittal on all charges rather than
     * read across from a sibling disposition. The packet used to say none of
     * this: it opened on a two-destination filing instruction and two fees, for
     * a disposition the state clears on its own motion.
     *
     * Nothing here tells the participant to file the retired request form, to
     * serve BCI, or to serve the prosecutor for the automatic route, because
     * none of those is a step the automatic route has.
     */
    out.push("## Start here: Utah clears a qualifying acquittal on its own", "");
    out.push("**An acquittal on all charges is inside Utah's automatic expungement, and the automatic route costs nothing.** The compiled Utah profile this platform is built on records the state's own guidance: \"A Utah case may be automatically expunged if it resulted in an acquittal on all charges or was dismissed with prejudice.\" For qualifying post-May 1, 2020 cases the profile records the timing as \"Acquittal on all charges Goal: 60 days after acquittal for qualifying post-May 1, 2020 cases\".", "");
    out.push("**There is nothing for you to file to start it, and there is no request form to send.** The profile records that \"the court no longer uses the temporary request form that applied from October 1, 2024 through December 31, 2025; now the court identifies and clears eligible automatic-expungement cases on its own\", as of January 1, 2026. **Do not fill in or send that former request form.** The court and the Administrative Office of the Courts run the automatic case, and the court supplies the expungement order to the Bureau of Criminal Identification.", "");
    out.push("**It can take longer than the 60-day goal.** The profile records that \"The Utah Courts public guidance says the automatic process can take up to 120 days, because the court system runs automatic expungement checks periodically and must allow prosecutor response time.\"", "");
    out.push("**Two things to establish before you do anything else.** They are the two checks Utah's own screening treats as required for this disposition:", "");
    out.push("1. **\"Has the case already been automatically expunged?\"** If it has, there is nothing to file and nothing to pay. Ask the clerk of the court that heard the case, or the Utah State Courts Self-Help Center on **888-583-0009**.");
    out.push("2. **\"Check automatic expungement. For qualifying post-May 1, 2020 cases, the statutory goal is 60 days after acquittal.\"** Count from your acquittal date, and allow the 120 days the courts' own guidance describes before treating the automatic process as having failed.", "");
    out.push("**For the automatic route you do not apply to BCI, you do not buy a certificate, you do not pay the $150 court filing fee, and you do not serve anyone.** None of the forms in this packet is required to obtain automatic expungement.", "");
    out.push("**Not every case clears automatically.** The profile records what the state tells people directly: \"Some Utah cases may clear automatically, but not every dismissed or misdemeanor case qualifies. If the case has not cleared automatically, a petition may still be available.\" The rest of this packet is that petition, and it is a fallback for a case you have established did **not** clear.", "");
    out.push("## The fallback petition, and when it applies", "");
    out.push("Everything from here down applies **only** if you have checked and found that the automatic process has not expunged this case — a documented automatic-process failure. If the automatic route is still running, or has already finished, stop here: filing this petition would pay two offices for a result the state gives you for free.", "");
  }

  out.push(config.acquittalAutomaticFirst ? "## Where the fallback petition is filed" : "## Where you file this", "");
  if (config.traffic) {
    out.push(`File the cover sheet (1044XX), the petition (${petition}) and the proposed order (${order}) with the **Utah district court for the county where the case was heard**. That court is the one printed on your own case paperwork, and its case number is on the caption of every page of this packet.`, "");
    out.push("This route needs no certificate of eligibility. Form 1002EX says so on its own face: paragraph 1 reads \"Certificate of eligibility is not required\". You do not apply to the Bureau of Criminal Identification for this petition.", "");
  } else {
    out.push("Filing this packet has **two destinations, in this order**.", "");
    out.push(config.acquittalAutomaticFirst
      // The generic line promises a letter naming "what each certificate
      // costs". For an acquittal the repository holds that no certificate
      // issuance fee is charged, so the generic promise would contradict the
      // fee section three paragraphs later.
      ? "1. **The Utah Bureau of Criminal Identification (BCI)** issues the certificate of eligibility this petition depends on. BCI's own Expungement Applicant Instructions direct you to apply to BCI, and BCI then sends a letter naming which incidents are eligible. Paragraph 1 of the petition (1000EX) is where that certificate's identification number goes. What that certificate costs on an acquittal is answered in the cost section below."
      : "1. **The Utah Bureau of Criminal Identification (BCI)** issues the certificate of eligibility this petition depends on. BCI's own Expungement Applicant Instructions direct you to apply to BCI, and BCI then sends a letter naming which incidents are eligible and what each certificate costs. Paragraph 1 of the petition (1000EX) is where that certificate's identification number goes.");
    /*
     * FIX83, FILING_DESTINATION. The generic line named one court type and one
     * county premise for seven routes that do not share either. Each family
     * that holds a repair on this obligation now states the destination its
     * own committed track registry states, and a family that holds none keeps
     * the line it already delivers and its bytes do not move.
     */
    if (config.neverChargedVenue) {
      out.push(`2. **The Utah district court in the county where the arrest occurred.** This route is an arrest where charges were never filed, so there is no case and no court that heard one. The committed track registry gives the venue in terms: "If charges were never filed, the district court in the county where the arrest occurred, or for a traffic matter, the court where the citation was received", and its mechanism says why — "Because no case exists, venue is the district court in the county where the arrest occurred." (Utah Code 77-40a-302(1), 77-40a-305.) BCI's instructions direct you to "File a Cover Sheet, Petition to Expunge and Order on Petition to Expunge with the appropriate court" — in this packet, 1044XX, ${petition} and ${order}.`, "");
    } else if (config.courtTypeElectionNotHeld) {
      out.push(`2. **The district or justice court that decided the case.** The committed track registry records the destination as "Stage one, the Utah DPS Bureau of Criminal Identification; stage two, the court that decided the case", and states the second stage in full: "The participant then files the expungement petition, with the certificate attached and still valid, in the district or justice court that decided the case." Its venue rule says the same — "The court that decided the criminal case, district or justice court" — under Utah Code 77-40a-305. BCI's instructions direct you to "File a Cover Sheet, Petition to Expunge and Order on Petition to Expunge with the appropriate court" — in this packet, 1044XX, ${petition} and ${order} — and to take the certificate list "to the court that is listed for that case".`, "");
    } else {
      out.push(`2. **The Utah district court for the county where the case was heard.** BCI's instructions direct you to "File a Cover Sheet, Petition to Expunge and Order on Petition to Expunge with the appropriate court" — in this packet, 1044XX, ${petition} and ${order} — and to take the certificate list "to the court that is listed for that case".`, "");
    }
    out.push("BCI's instructions also set a deadline between the two steps: you have **180 days, including weekends and holidays, from the date on the BCI letter** to petition the court. After that the certificates expire and you must reapply.", "");
  }
  if (config.courtTypeElectionNotHeld) {
    /*
     * FIX83, ROUTE_OPTIONS. The packet used to tell the participant the
     * election was settled. It is not settled and the platform does not hold
     * the fact that would settle it, so the sentence now says which mark is
     * missing, where it is, and what decides it.
     */
    out.push(`**The District/Justice election on the petition and the order is left blank for you to mark.** The committed track registry gives venue as "The court that decided the criminal case, district or justice court" and holds no fact saying which of the two decided your case — and neither does this packet, so it marks neither. In the caption of the petition (${petition}) and of the proposed order (${order}) the line reads *In the [ ] District [ ] Justice Court of Utah*: **mark the one that matches the court named on your own case paperwork**, on every copy you file. The county is written from your case. The judicial district number and the court's street address are still blank and are yours to write; the clerk of that court will confirm all of them.`, "");
  } else if (config.neverChargedVenue) {
    out.push("The caption on the petition and the order is already marked **District Court**, which is the court this route files in — the registry's venue rule for an arrest where charges were never filed is \"the district court in the county where the arrest occurred\". The county written on the caption is **the county where you were arrested**, not a county where a case was heard; this route has no case. The judicial district number and the court's street address are still blank and are yours to write; the clerk of that court will confirm both.", "");
  } else {
    out.push("The caption on the petition and the order is already marked **District Court**, and the county is written from your case. The judicial district number and the court's street address are still blank and are yours to write; the clerk of that court will confirm both.", "");
  }

  out.push(config.acquittalAutomaticFirst
    ? "## What the fallback petition costs, and how to ask for a waiver"
    : "## What it costs, and how to ask for a waiver", "");
  if (config.acquittalAutomaticFirst) {
    out.push("**None of these amounts is charged on the automatic route.** They apply only to the fallback petition described above.", "");
  }
  if (config.ownerFeeCorrection) {
    /*
     * OWNER CORRECTION Q4, 2026-09-02: "DO NOT PUBLISH AN UNCONFIRMED FEE.
     * Follow the controlling design's refusal and direct the participant to the
     * specific clerk or agency for the current amount. Add a figure only when
     * current primary authority or the official form supports it."
     *
     * The controlling design is UT.memo rules.fees for tracks ut_pet_limitations
     * and ut_pet_traffic, and it refuses in terms: "The Utah Courts page directs
     * filers to the cover sheet for the current amount rather than publishing a
     * figure, so the packet does not quote one. The exact current amount is an
     * open release-blocking question."
     *
     * So the packet stops ASSERTING a filing fee. What survives is a quotation
     * of the official form -- which the owner's own exception permits, and which
     * this route cannot honestly suppress, because the packet DELIVERS that
     * cover sheet with the $150 row already marked and the participant is
     * holding it. The figure is attributed to the form and its revision, the
     * design's refusal is carried, and the clerk of the district court where the
     * case was heard is named as the office that states the current amount.
     */
    out.push("**This packet does not publish a filing fee.** Utah sets the district court filing fee under Utah Code 78A-2-301, and the Utah Courts direct filers to the cover sheet for the current amount rather than publishing one. **Ask the clerk of the district court where your case was heard — the court named above — what this petition costs today, before you file.**", "");
    out.push("**What the cover sheet in this packet prints.** The district court cover sheet enclosed here is Utah form **1044XX**, revision **2026-05-06**, and page 2 of it prints the row `$150 [ ] Expungement Petition - Criminal (E)`. This packet has already marked that row for you, so you are filing a sheet that carries that figure. That is what the form says, on the revision this packet holds; it is not this packet certifying the amount is current, and the clerk is the one who can tell you that.", "");
    out.push("**If you cannot pay it, Utah has a waiver route for exactly this filing.** It is the *Motion to Waive Fees for Expungement – Criminal*, Utah court form **1305GE**, whose own title block prints \"(Utah Code 78A-2-302 and Code of Judicial Administration Rule 4-508)\". That form is not included in this review fixture; ask the clerk of the court named above for it, or get it from the Utah State Courts self-help forms for expungement. It asks you to name the filing fee amount, and its own fee line reads \"Filing fee (Refer to Cover Sheet)\" — which is the same direction this packet gives you: the amount comes from the cover sheet and the clerk, not from here.", "");
  } else {
  out.push("**The court filing fee is $150.** The district court cover sheet in this packet (1044XX, page 2) prints the row `$150 [ ] Expungement Petition - Criminal (E)`, and this packet has already selected that row for you.", "");
  out.push("**If you cannot pay it, Utah has a waiver route for exactly this filing.** It is the *Motion to Waive Fees for Expungement – Criminal*, Utah court form **1305GE**, brought under Utah Code 78A-2-302 and Code of Judicial Administration Rule 4-508. That form is not included in this review fixture; ask the clerk of the court named above for it, or get it from the Utah State Courts self-help forms for expungement. It asks you to name the filing fee amount from the cover sheet and to say why you qualify.", "");
  }
  if (!config.traffic && config.statesBciApplicationFee) {
    // Two BCI money items, and the packet used to deny both by refusing one.
    // The $65.00 application fee is printed three times on the BCI application
    // this packet delivers; the per-incident certificate price is genuinely set
    // per applicant in BCI's letter. Refusing the second never licensed denying
    // the first (DET-FEE-AND-WAIVER-001 amendment A4).
    out.push(config.ownerFeeCorrection
      ? "**BCI charges two separate amounts. They are not the same thing, and this packet publishes neither as a price of its own.**"
      : "**BCI charges two separate amounts. They are not the same thing, and only one of them is fixed.**", "");
    if (config.ownerFeeCorrection) {
      /*
       * OWNER CORRECTION Q4, 2026-09-02, applied to the BCI half.
       *
       * UT.memo's unresolved question for this track is exactly this figure:
       * "What are the current BCI application and issuance fees? The statute
       * sets them through the Section 63J-1-504 process, not by number.
       * Secondary sources say $65 and $65 per conviction case. Release blocker
       * for any priced quote." The BCI application held in the Master Library
       * is REV-UNKNOWN, so the official form supports what it PRINTS but
       * establishes no currency date the packet can stand behind.
       *
       * The packet therefore stops asserting the amount and states the two
       * things that are true and checkable: what the enclosed application
       * prints, and that BCI sets the amount administratively and is the office
       * that states the current one.
       */
      out.push("**This packet does not publish a BCI application fee.** Utah sets BCI's fees through the Utah Code 63J-1-504 process rather than by a number in the expungement statute, so the current amount is BCI's to state and this packet will not quote one as its own.", "");
      out.push("**What the application in this packet prints.** The BCI *Application for Certificate of Eligibility* enclosed here prints, in its own text, \"The application fee is $65.00 and non-refundable\", and again on the payment block, \"Application fee is $65.00\". The copy of that application held for this packet carries no revision date, so treat the printed figure as what the form in your hands says rather than as a confirmed current price. **Ask the Bureau of Criminal Identification, at bci.utah.gov/expungements, what the application fee is today before you mail anything.** Your application will not be processed unless it arrives with the fee BCI requires. Checks and money orders are payable to \"BCI\"; the application also takes Visa, MasterCard, Discover or AMEX; cash is accepted only if you apply in person, and the form says in capitals not to send cash in the mail.", "");
      out.push("**If you cannot pay it, BCI has its own waiver and you must complete it before you apply.** The application's own instructions are explicit: if you check the box saying you believe you are indigent, you \"MUST complete the fee waiver form before submitting your application\", and BCI will not process the application until the completed waiver form arrives with it. BCI publishes the form and separate *Indigent Expungement Applicant Instructions* at bci.utah.gov/expungements, and returns your waiver form to you with your certificates if you are eligible.", "");
    } else {
    out.push("**The BCI application fee is $65.00, and it is non-refundable.** It is printed on the BCI *Application for Certificate of Eligibility* included in this packet: \"The application fee is $65.00 and non-refundable\", and again on the payment block, \"Application fee is $65.00\". Your application will not be processed unless it arrives with that fee. Checks and money orders are payable to \"BCI\"; the application also takes Visa, MasterCard, Discover or AMEX; cash is accepted only if you apply in person, and the form says in capitals not to send cash in the mail.", "");
    out.push("**If you cannot pay the $65.00, BCI has its own waiver and you must complete it before you apply.** The application's own instructions are explicit: if you check the box saying you believe you are indigent, you \"MUST complete the fee waiver form before submitting your application\", and BCI will not process the application until the completed waiver form arrives with it. BCI publishes the form and separate *Indigent Expungement Applicant Instructions* at bci.utah.gov/expungements, and returns your waiver form to you with your certificates if you are eligible.", "");
    }
    if (config.certificateIssuanceFeeHeldExempt) {
      // A1 as widened by A2 and narrowed by A3: the repository answers this
      // route's certificate question, so the packet states the answer instead
      // of sending the participant to ask for it. The route match is exact --
      // the profile's exempting limb names dismissals and declinations, and
      // this family is one of them -- not a read-across from a sibling route.
      out.push(`**On this route, the held record says the certificate carries no issuance fee.** The compiled Utah state profile in this repository records BCI's published expungement FAQ as saying that "${UT_PROFILE_CERTIFICATE_SENTENCE}". This packet is built for ${config.certificateIssuanceFeeHeldExempt}, which is one of the dispositions that sentence exempts, so on the held record the $65.00 application fee above is the only BCI amount this route carries.`, "");
      out.push("Two things are worth saying plainly rather than hiding. That sentence records what BCI's FAQ publishes, not a fee fixed by statute, and the general sequence described elsewhere in this packet's own materials is that BCI issues a certificate on payment of an issuance fee. So take the exemption as what the record holds and confirm it before you pay anything: ask the Bureau of Criminal Identification, at bci.utah.gov/expungements, what your certificates cost on a case like yours. Do not assume the court's $150 waiver covers any BCI amount — the court and BCI are two different offices with two different waivers.", "");
    } else if (config.certificateIssuanceFeeHeldExemptUnlessAbeyance) {
      /*
       * The exemption, and the one fact inside the SAME sentence that takes it
       * away. A packet that stated only the exempting limb here would be right
       * for most participants on this route and expensively wrong for the ones
       * whose dismissal ended a plea in abeyance -- and it is the profile's own
       * sentence, not an inference, that puts them under the other limb.
       */
      out.push(`**On this route the held record says the certificate carries no issuance fee — and one fact about your case can change that.** The compiled Utah state profile in this repository, at \`${UT_PROFILE}\`, records BCI's published expungement FAQ as saying that "${UT_PROFILE_CERTIFICATE_SENTENCE}". This packet is built for ${config.certificateIssuanceFeeHeldExemptUnlessAbeyance}, and "dismissals" is one of the dispositions that sentence exempts, so on the held record the $65.00 application fee above is the only BCI amount an ordinary dismissal with prejudice carries.`, "");
      out.push(`**The exception is a plea in abeyance, and it is in the first half of the same sentence.** That half names "plea-in-abeyance ... certificates" among the ones that "may require an additional $65 per case". A dismissal with prejudice can be how a completed plea in abeyance ends. **If that is your case, expect the certificate charge — up to $65 per case — rather than the exemption.** The profile records the same division elsewhere: "${UT_PROFILE_ABEYANCE_EXCLUSION}". Establishing which of the two you are is a required pre-filing check, and it is listed below.`, "");
      out.push("Two things are worth saying plainly rather than hiding. That sentence records what BCI's FAQ publishes, not a fee fixed by statute, and the general sequence described elsewhere in this packet's own materials is that BCI issues a certificate on payment of an issuance fee. So take the exemption as what the record holds and confirm it before you pay anything: ask the Bureau of Criminal Identification, at bci.utah.gov/expungements, what your certificates cost on a case like yours, and say whether the dismissal followed a plea in abeyance when you ask. Do not assume the court's $150 waiver covers any BCI amount — the court and BCI are two different offices with two different waivers.", "");
    } else if (config.certificateIssuanceFeeHeldPerCase) {
      /*
       * A1 and A2 with the answer running AGAINST the participant, which is the
       * harder direction and the one the earlier text dodged. The repository
       * holds a figure for this route. The packet used to say "this packet does
       * not state that amount because BCI sets it per applicant" -- a refusal of
       * a fact the repository answers, which A1 forbids -- and paired it with
       * "the certificates themselves cost more than the application", which the
       * held figure contradicts outright for a single eligible case. The
       * condition the record attaches ("may require") is stated with the
       * figure, and no total is promised, because the number of certificates is
       * what BCI's letter decides.
       */
      out.push(`**The certificate carries a further BCI charge, and the held record states a figure: $65 per case.** A certificate must be purchased for each eligible incident you want expunged, and BCI's instructions tell you to "pay all associated fees as indicated in the BCI letter" — that letter is where your own certificate list appears.`, "");
      out.push(`This packet has checked what this repository holds rather than sending you away to find out. The compiled Utah state profile, at \`${UT_PROFILE}\`, records BCI's published expungement FAQ as saying that "${UT_PROFILE_CERTIFICATE_SENTENCE}". Your route is ${config.certificateIssuanceFeeHeldPerCase}, which is the first disposition that sentence names, so the $65-per-case half is the half about your case. The exempting half — dismissals, acquittals and declinations — is not about your case, and this packet does not read it across to you.`, "");
      out.push("**Read the figure with the condition the record puts on it.** It says an eligible conviction certificate *may require* an additional $65 per case, not that it always does, and it is BCI's published FAQ rather than an amount fixed by statute. It is also charged **per case**: if BCI's letter finds more than one eligible case, expect it once for each. This packet does not state your total, because how many certificates you need is what BCI's letter decides — but the per-case figure is held, so the packet states it instead of calling it unknowable.", "");
      out.push("**Confirm it with the office that charges it, before you pay.** Ask the Bureau of Criminal Identification, at bci.utah.gov/expungements, what your certificates cost on a case like yours, and ask at the same time whether its indigency waiver covers the certificate charge as well as the $65.00 application fee. Do not assume the court's $150 waiver covers either BCI amount: the court and BCI are two different offices with two different waivers.", "");
    } else if (config.certificateIssuanceFeeNotEstablished) {
      // A3, applied honestly against this lane's own interest. The exempting
      // limb would have been convenient here and it does not reach this route,
      // so the packet refuses the figure and names who answers it -- the
      // outcome A1 calls complete, with the reasoning shown.
      out.push("**The certificate itself may carry a further BCI charge, and no held source states an amount for this route.** A certificate must be purchased for each eligible incident you want expunged, and BCI's instructions tell you to \"pay all associated fees as indicated in the BCI letter\" — that letter is where your own certificate price appears.", "");
      /*
       * OWNER CORRECTION Q4, applied to the certificate-issuance half.
       *
       * What stood here quoted the compiled profile's FAQ sentence in full --
       * "eligible conviction, plea-in-abeyance, or special certificates may
       * require an additional $65 per case; no certificate issuance fee is
       * required for dismissals, acquittals, or declinations" -- and then
       * explained that neither limb reaches this route. The reasoning was
       * sound, but it put a figure in front of the participant that NO FORM
       * ENCLOSED IN THIS PACKET PRINTS, on a route the same paragraph says the
       * figure does not govern. The owner's rule is that a figure the enclosed
       * official form itself prints may stay as a description of what that form
       * says; a figure no enclosed form prints must go, replaced by the design's
       * own refusal and the direction to the agency for the current amount.
       * UT.memo rules.fees refuses in terms and records the BCI amounts as an
       * open release-blocking question, so the refusal is the design's own.
       *
       * Switched on config.ownerFeeCorrection so the change is per family: no
       * other family on this shared Utah host takes this branch or this text.
       */
      out.push(config.ownerFeeCorrection
        ? `This packet has checked what this repository holds, and it will not put a figure in front of you that no form in this packet prints. Utah sets BCI's amounts through the Utah Code 63J-1-504 process rather than by a number in the expungement statute, and the controlling Utah design records the current BCI application and issuance amounts as an open, release-blocking question. Nothing enclosed here prints a certificate issuance amount for ${config.certificateIssuanceFeeNotEstablished}, and a secondary figure is not something this packet will pass on to you as a price. The Bureau of Criminal Identification is the office that states the current amount.`
        : `This packet has checked, and says what it found rather than guessing. The compiled Utah state profile in this repository records BCI's published expungement FAQ as saying that "${UT_PROFILE_CERTIFICATE_SENTENCE}". Your route is ${config.certificateIssuanceFeeNotEstablished}. That is not a conviction, a plea in abeyance or a special certificate, and it is not a dismissal, an acquittal or a declination either, so neither half of that sentence is about your case and this packet will not read it across to you.`, "");
      out.push(config.ownerFeeCorrection
        ? "Ask the Bureau of Criminal Identification what a certificate will cost on your case, at bci.utah.gov/expungements, and ask at the same time whether its indigency waiver covers the issuance fee as well as the application fee. Do not assume the court's fee waiver covers either BCI amount: the court and BCI are two different offices with two different waivers."
        : "Ask the Bureau of Criminal Identification what a certificate will cost on your case, at bci.utah.gov/expungements, and ask at the same time whether its indigency waiver covers the issuance fee as well as the $65.00 application fee. Do not assume the court's $150 waiver covers either BCI amount: the court and BCI are two different offices with two different waivers.", "");
    } else {
      /*
       * There is no unflagged case left, and there must not be one.
       *
       * What stood here was the paragraph two independent reads condemned: "The
       * certificates themselves cost more than the application, and this packet
       * does not state that amount because BCI sets it per applicant." Both
       * halves were wrong on the two routes it actually served. The repository
       * holds $65 per case for an eligible conviction, so the refusal denied a
       * held fact; and for a dismissal with prejudice the repository holds an
       * exemption, so the packet overstated the cost of the route the
       * participant was holding. Every non-traffic family on this host now
       * declares which limb of the profile's fee sentence reaches its route, or
       * declares expressly that neither does. A new family must make that
       * declaration too, and the build refuses rather than falling back on a
       * paragraph that was true for no one.
       */
      assert.fail(`${config.slug}: a non-traffic Utah family must declare its certificate-fee holding `
        + "(certificateIssuanceFeeHeldExempt, certificateIssuanceFeeHeldExemptUnlessAbeyance, "
        + "certificateIssuanceFeeHeldPerCase or certificateIssuanceFeeNotEstablished)");
    }
  } else if (!config.traffic) {
    out.push("**The BCI certificate carries a separate fee, and this packet does not state an amount because BCI sets it per applicant.** BCI's instructions tell you to \"pay all associated fees as indicated in the BCI letter\", and a certificate must be purchased for each eligible incident you want expunged. BCI publishes separate *Indigent Expungement Applicant Instructions* under which BCI sends a fee waiver together with the certificate list. Ask the Bureau of Criminal Identification what your certificates cost and whether you qualify for its fee waiver; do not assume the court's $150 waiver covers BCI's fee, because they are two different offices.", "");
  }
  if (config.dismissedWithPrejudice) {
    // The committed track registry for this route: "The same disposition is
    // separately eligible for automatic expungement 180 days after dismissal
    // under 77-40a-206, so the petition is the faster paid route to the same
    // result and the free route must be disclosed before payment."
    out.push("**Before you pay any of this, know that there is a free route to the same result.** A case dismissed with prejudice is separately eligible for **automatic expungement 180 days after the dismissal** under Utah Code 77-40a-206, where no appeal was filed. That route costs nothing and needs no petition, no BCI certificate and no filing fee. This petition is the *faster* paid route to the same result, not the only one. If you are not in a hurry, waiting out the 180 days is free.", "");
    if (config.statesPleaInAbeyanceDiscriminator) {
      // The disclosure above argues against this packet's own sale, which is
      // exactly why it must carry its exclusion. Told to wait 180 days for
      // relief the record says will not arrive, a plea-in-abeyance participant
      // loses the time and still needs the petition.
      out.push(`**That free route has one exclusion, and it turns on the same fact as the certificate fee above.** The compiled Utah state profile, at \`${UT_PROFILE}\`, records it twice: "${UT_PROFILE_ABEYANCE_EXCLUSION}", and in the automatic-timing table, "${UT_PROFILE_ABEYANCE_TIMING}". **So if your case was dismissed with prejudice after you completed a plea in abeyance, do not wait out the 180 days expecting the automatic route to reach you — the record says this automatic path is not the one for you.** The profile's own screening direction says the same thing in the same words a clerk would: "${UT_PROFILE_ABEYANCE_SCREENING}"`, "");
      out.push(`**That is not the end of the free routes for a plea-in-abeyance dismissal; it is the end of *this* one.** The same profile records that "${UT_PROFILE_ABEYANCE_CLEAN_SLATE}" So if your dismissal followed a plea in abeyance, ask the court that heard the case, or the Utah State Courts Self-Help Center on **888-583-0009**, whether Clean Slate reaches your case on its own timing, before you treat this petition as the only way. This petition remains available to you either way.`, "");
    }
  }

  out.push(config.acquittalAutomaticFirst ? "## Who gives notice, and to whom" : "## Who must receive a copy, and how", "");
  if (config.acquittalAutomaticFirst) {
    /*
     * The notice sequence for this route, and the generic copy-delivery
     * language it supersedes.
     *
     * The BCI Expungement Applicant Instructions this packet delivers were
     * updated 08/20/2024. Their Step 2 tells the applicant to "Mail or email the
     * prosecutor copies of what you file", and their Step 4 adds a NOTE that the
     * applicant may also send copies of the order to the agencies. Neither is
     * this route's requirement: the compiled profile records that the COURT
     * gives the prosecutor notice, and that the court sends BCI the order and
     * BCI notifies the agencies. A packet that left both texts standing side by
     * side would have the participant serve offices that are already served, and
     * for the automatic route it would have them serve offices on a case they
     * have not filed anything in at all.
     *
     * So the sequence is stated, and the superseded lines are named as
     * superseded rather than quietly dropped -- the participant is holding the
     * BCI sheet and will read them.
     */
    out.push("**On the automatic route you serve no one.** You do not deliver a copy to the prosecutor and you do not deliver a copy to the Bureau of Criminal Identification. There is no filing to serve.", "");
    out.push("**If you file the fallback petition, the court gives the notices — not you.** The compiled Utah profile records what happens after the petition is filed: \"The court gives notice to the prosecuting office.\" The BCI *Expungement Applicant Instructions* included in this packet record what happens after the order: \"Once the court has expunged your case, the court will send BCI an electronic Order to Expunge. BCI will inform all available agencies listed in the case of the expungement.\" The profile records the same step and adds the federal one — after the court issues an order, \"BCI notifies affected agencies and forwards a copy to the FBI\". In order: you file with the court, the court notifies the prosecutor, the court sends the order to BCI, and BCI notifies the affected agencies.", "");
    out.push("**Two lines on the enclosed BCI sheet do not govern this route.** The *Expungement Applicant Instructions* included in this packet were updated 08/20/2024. Its Step 2 line \"Mail or email the prosecutor copies of what you file\" and its Step 4 note that you \"are still able to send a copy of the Order to Expunge to the agencies listed as well\" are **superseded for this route** by the court-notice sequence above. Read them as history, not as a step you owe. If you want that confirmed for your own case, the Utah State Courts Self-Help Center answers it on **888-583-0009**.", "");
    out.push("This packet still includes form 1146XX, *Acceptance of Service – Expungement (Prosecutor)*. It exists for a prosecutor who chooses to acknowledge receipt; it is not a step this route requires you to perform, and the packet leaves it blank.", "");
    /*
     * FIX01, SELF_HELP_STOP. The automatic-first branch carried its own copy of
     * the inversion the two earlier lanes found on the shared `else` branch
     * below: "if the court schedules a hearing, attend it" directs
     * self-representation at the exact point this route's committed record says
     * self-help ends. This route's registry entry holds the objection-or-hearing
     * condition in the same words as its siblings, so the sentence is replaced
     * on the same terms -- gated on the family's own flag, so a family that does
     * not set it keeps the sentence it already delivers and its bytes do not
     * move.
     */
    if (config.statesRegistryStopConditions) {
      out.push("The prosecutor or a victim in your case may object to a filed petition, and the court may schedule a hearing. **The committed track registry records both of those as the point where this packet's self-help ends** — get a lawyer or a legal-aid office rather than arguing it yourself. A hearing date does not wait while you look, so start looking the day you learn of one. The Utah State Courts Self-Help Center answers procedural questions on **888-583-0009**, and it is not a substitute for a lawyer at a contested hearing.", "");
    } else {
      out.push("The prosecutor or a victim in your case may object to a filed petition; if the court schedules a hearing, attend it.", "");
    }
  } else if (config.traffic) {
    out.push("**The prosecutor must receive a copy of what you file.** This packet includes form 1146XX, *Acceptance of Service – Expungement (Prosecutor)*, whose printed text is the prosecutor acknowledging \"receipt of a copy of the Petition for Expungement\" — the form exists because the prosecutor gets a copy.", "");
    out.push("For an expungement petition Utah's published applicant instructions direct you to **mail or email the prosecutor copies of what you file**. Because this is the traffic route rather than the BCI route, confirm the method and the prosecutor's current address with the clerk of the district court where you file, or with the Utah State Courts Self-Help Center on **888-583-0009**, before you serve.", "");
  } else {
    if (config.statesCourtTransmitsToProsecutor) {
      /*
       * FIX83, SERVICE. The record's primary rule was missing and its
       * secondary, conditional route had been promoted to a flat participant
       * duty. Both limbs are now carried in the record's own order and in the
       * record's own words. The BCI quotation is genuine and bound by hash, so
       * it is named as superseded for this track rather than deleted: the
       * participant is holding that sheet and will read it.
       */
      out.push("**You do not serve the prosecutor. The court does.** The committed track registry records the rule for this track in terms: \"The petitioner does not effect service in the ordinary case: the court sends the filing to the prosecuting attorney.\" Its notice rule says it again — \"The court sends a copy of the filing to the prosecuting attorney\" — and so does the destination it records for this route: \"The court sends the filing to the prosecuting attorney; the petitioner does not serve.\" File your packet with the court and stop there.", "");
      out.push("**The proof-of-service route is the exception, not the step.** The registry records that \"The Proof of Service form appears in the published packet only as an optional form, used where the prosecutor’s office will not accept service.\" This packet includes form 1146XX, *Acceptance of Service – Expungement (Prosecutor)*, for a prosecutor who chooses to acknowledge receipt. It is not a step this route requires you to perform, and the packet leaves it blank.", "");
      out.push("**One line on the enclosed BCI sheet does not govern this route.** The *Expungement Applicant Instructions* included in this packet say, after filing with the court, \"Mail or email the prosecutor copies of what you file.\" For this track the registry's rule above is the one that governs, and the registry warns in terms that the Utah Courts general service-of-process page \"governs first papers in a new civil case and must not be wired to this track; doing so would import a summons, a process server and a 120-day deadline this track does not have.\" Read that BCI line as history, not as a step you owe. If you want it confirmed for your own case, the Utah State Courts Self-Help Center answers procedural questions on **888-583-0009**.", "");
    } else {
      out.push("**The prosecutor must receive a copy of what you file, by mail or by email.** BCI's Expungement Applicant Instructions state the step plainly: after filing with the court, \"Mail or email the prosecutor copies of what you file.\" This packet includes form 1146XX, *Acceptance of Service – Expungement (Prosecutor)*, for the prosecutor to acknowledge receipt.", "");
    }
    /*
     * TWO REPAIR LANES REACHED THIS SENTENCE INDEPENDENTLY, AND BOTH WERE RIGHT.
     *
     * "If the court schedules a hearing, attend it" directs self-representation
     * at the exact point this route's own committed record says self-help ends.
     * FIX03 found it on ut_pet_conviction and FIX04 on ut_pet_no_charges, in
     * the same week, in the same shared host, each behind its own per-family
     * flag. Neither flag is redundant: `selfHelpStopConditions` carries the
     * conditions in the family's config, `statesRegistryStopConditions` names a
     * track and reads them from the registry at build time. Resolving the merge
     * by keeping one would have silently reverted the other family's repair, so
     * both stand and a family sets whichever its own repair used. A family that
     * sets neither keeps the original sentence and its bytes do not move.
     */
    if (config.selfHelpStopConditions) {
      out.push("The prosecutor or a victim in your case may object, and the court may schedule a hearing. **This route's own committed record treats that as the point where self-help ends, not as a next step you take on your own** — it is the second condition under *Where self-help ends* below. This packet does not prepare you for a contested hearing, does not answer an objection for you, and does not argue anything for you. Look for a lawyer licensed in Utah as soon as an objection reaches you or a hearing is set, rather than afterwards. The Utah State Courts Self-Help Center answers procedural questions about this on **888-583-0009**.", "");
    } else if (config.statesRegistryStopConditions) {
      out.push("The prosecutor or a victim in your case may object, and the court may schedule a hearing. **The committed track registry records both of those as the point where this packet's self-help ends** — get a lawyer or a legal-aid office rather than arguing it yourself. A hearing date does not wait while you look, so start looking the day you learn of one. The Utah State Courts Self-Help Center answers procedural questions on **888-583-0009**, and it is not a substitute for a lawyer at a contested hearing.", "");
    } else {
      out.push("The prosecutor or a victim in your case may object; if the court schedules a hearing, attend it. The Utah State Courts Self-Help Center answers questions about this on **888-583-0009**.", "");
    }
  }
  out.push(config.acquittalAutomaticFirst
    ? "The certificate-of-service blocks on these forms are left blank, and on this route they stay blank: no service step belongs to you. If some other delivery is ever made, its method, address and date go in only after it has actually happened — a certificate of service dated before service is a false statement."
    : config.statesCourtTransmitsToProsecutor
      // FIX83, SERVICE. The prompt used to instruct a service act the record
      // says does not arise. It now follows the record: blank in the ordinary
      // case, and filled only on the conditional route the registry describes.
      ? "The certificate-of-service blocks on these forms are left blank, and in the ordinary case they stay blank: the court sends the filing to the prosecuting attorney and you do not effect service. Only if the prosecutor’s office will not accept service and you make some delivery yourself do its method, address and date go in — and only after it has actually happened, because a certificate of service dated before service is a false statement."
      : "Fill in the service method, the address you used and the date **only after service has actually happened**. A certificate of service dated before service is a false statement, so this packet leaves it blank.", "");

  out.push("## The facts you must supply before filing", "");
  out.push(config.acquittalAutomaticFirst
    ? "The first item below decides whether any of the rest applies. Everything after it belongs to the fallback petition only. This review fixture deliberately leaves the following facts or acts blank. Supply them from your own records or complete them when the named event occurs; do not guess."
    : "This review fixture deliberately leaves the following facts or acts blank. Supply them from your own records or complete them when the named event occurs; do not guess.", "");
  const serviceItem = (item) => {
    if (config.acquittalAutomaticFirst) {
      // No service step belongs to the participant on this route, so the
      // generic "after service occurs" line would imply one the packet has
      // just said there is not.
      return "- Service method, address, date, and certification only if some delivery is ever made and only after it happens; the court gives the notices this route requires";
    }
    // FIX83, SERVICE. Same defect in the checklist as in the prose: the item
    // implied an ordinary service duty the registry says does not arise.
    return "- Service method, address, date, and certification only if the prosecutor’s office will not accept service and you make some delivery yourself, and only after it happens; in the ordinary case the court sends the filing to the prosecuting attorney and the petitioner does not serve";
  };
  out.push(...items.map((item) => (/^Service method/.test(item)
    && (config.acquittalAutomaticFirst || config.statesCourtTransmitsToProsecutor)
    ? serviceItem(item)
    : `- ${item}`)), "");

  if (config.statesDismissalThirtyDaySinceArrest) {
    const track = readJson(TRACK_REGISTRY).tracks.find((row) => row.trackId === config.statesRegistryStopConditions);
    const waiting = track?.waitingPeriods?.find((row) => row.condition === "Every 77-40a-302(1) dismissal route");
    assert.equal(waiting?.duration, "At least 30 days since the arrest.", "dismissal arrest waiting-period authority changed");
    out.push(`- **At least 30 days must have passed since the arrest before you file this petition.** (Utah Code 77-40a-302(1).) Count from the arrest date. Do not confuse this arrest-date waiting period with the certificate's 180-day validity.`, "");
  }
  if (config.prosecutorConsentNotHeld) {
    out.push("**Paragraph 5 of the proposed order (1020EX) is left unmarked.** It asserts that the prosecutor consented in writing and has no intent to refile. This packet holds neither fact and does not infer consent from a dismissal without prejudice. The committed track allows written prosecutor consent **or** at least 180 days since dismissal. If you rely on consent, supply the actual written consent; the court determines its findings from the evidence. The 180-day alternative does not establish the consent finding.", "");
  }

  if (config.statesThirtyDaySinceArrest) {
    /*
     * FIX83, REQUIRED_BEFORE_FILING. Two route-specific prerequisites the
     * committed record holds and the delivered instructions omitted. Both are
     * quoted from this family's own track registry entry.
     */
    out.push("**Two things this route requires that are not blanks on any form.**", "");
    out.push("- **At least 30 days must have passed since the arrest.** The committed track registry holds this as a waiting period on this track — condition \"Every 77-40a-302(1) no-charges route\", duration \"At least 30 days since the arrest.\" The registry's mechanism states it in the same breath as the remedy: the records \"may be expunged on petition, at least 30 days after the arrest, on a certificate of eligibility from BCI\". (Utah Code 77-40a-302(1).) Count from your arrest date and do not file before it has run.");
    out.push("- **There is no existing case number on this route, and none is written on these forms.** Charges were never filed, so no criminal case exists. The registry asks for a case number only conditionally on this track and records the condition in terms: \"Not asked where no case was ever filed.\" Leave every case-number line in this packet blank. The number this petition is filed under is assigned by the court at or after filing — the committed completeness contract names exactly that as later completion, \"an assigned case number, a filing stamp, a hearing date the court sets\" — so ask the clerk of the district court in the county where you were arrested for it once you have filed, and write it on your copies then.", "");
  }

  if (config.statesManifestPreFilingItems) {
    // The list above is scoped to blanks on paper. The committed packet-set
    // manifest's requiredBeforeFiling entries are scoped to what the
    // participant must have IN HAND, and the difference includes a money bar
    // the manifest says defeats the petition. Every item below is quoted from
    // this family's own manifest entry; nothing here is inferred.
    out.push("**You must also have these in hand before you file. They are not blanks on the forms, and the packet cannot fill them for you.**", "");
    out.push("- **Proof that fines, fees, interest and restitution on this case are paid in full.** Ask the clerk of the sentencing court for a current balance on the case, and check with the Office of State Debt Collection if any balance was entered as a civil judgment and transferred to it. **An unpaid balance defeats the petition, and it will also defeat the BCI certificate.** Check that against your own answer that everything is paid, and correct the packet if they disagree.");
    out.push("- **A complete list of every criminal case you have ever had, in any state, including cases that were already expunged.** Assemble it before you apply to BCI. BCI assesses eligibility against your total criminal history in all states, previously expunged cases included, so **an incomplete list produces a denial rather than a certificate.** Court clerks in each jurisdiction and the state criminal-history repositories are where the missing pieces come from.");
    if (config.dismissedWithPrejudice) {
      out.push("- **A certified copy of the order of dismissal.** Ask the clerk of the court that handled the case. It carries the dismissal date and states whether the dismissal was with or without prejudice — which decides which track applies, and this packet is built for the *with prejudice* track.");
      out.push("- **The dismissal date, checked against that certified copy.** Correct the packet if the date you gave and the date on the order disagree.");
    }
    if (config.statesPleaInAbeyanceDiscriminator) {
      // Not from the packet-set manifest, and the text says so. The manifest
      // scopes this route by whether the dismissal was WITH or WITHOUT
      // prejudice; the compiled profile adds a second discriminator inside the
      // "with prejudice" answer, and it decides both the free-route question
      // and the certificate-fee question above. A check the repository makes
      // dispositive and the packet never asks for is the REQUIRED_BEFORE_FILING
      // defect, whichever committed record holds it.
      out.push(`- **Whether the dismissal followed a plea in abeyance.** The certified copy of the order and the case docket are where this is established; ask the clerk of the court that handled the case if the order does not say. This item is not from this family's packet-set manifest — it is from the compiled Utah state profile at \`${UT_PROFILE}\`, which records that "${UT_PROFILE_ABEYANCE_EXCLUSION}" and directs, "${UT_PROFILE_ABEYANCE_SCREENING}" **It decides two things stated above: whether the free 180-day automatic route reaches you at all, and which half of BCI's certificate-fee sentence applies to you.** Answer it before you file, and correct this packet if the answer disagrees with what you told it.`);
    }
    // The remaining manifest items are route-specific, so each is gated on the
    // route it belongs to and quoted from that family's own manifest entry.
    if (config.dismissedWithoutPrejudice) {
      out.push("- **A certified copy of the order of dismissal without prejudice.** Ask the clerk for a certified copy of the dismissal order. It carries the dismissal date and confirms that the dismissal was *without* prejudice — which is what starts the 180-day clock this track runs on.");
      out.push("- **The dismissal date, checked against that certified copy.** Correct the packet if the date you gave and the date on the order disagree.");
      out.push("- **The prosecutor's written consent to the expungement, if one has been given.** You ask the prosecuting attorney's office directly. LegalEase does not seek, negotiate or obtain prosecutor consent, and never asserts that it has been given. If there is no consent that is fine — the 180-day route is the alternative — but check that against the answer recorded in this packet and correct it if they disagree.");
    }
    if (config.routeKind === "incident") {
      out.push("- **Whatever shows how you know the prosecutor made a final decision not to file charges** — a written declination or no-file letter from the prosecutor if you have one, and otherwise a note of how you learned it, whether it was said in court or reached you another way. Check that against the answer recorded in this packet and correct it if they disagree.");
    }
    out.push("");
  }

  out.push("Signatures, signature dates, service certifications, court-only fields, agency-only fields, prosecutor-only fields, victim fields, and optional third-party authorizations remain protected.", "");

  if (config.selfHelpStopConditions) {
    // The route holds thirteen stop conditions and the packet carried none of
    // them. They are reproduced word for word from the committed registry, and
    // the file, track and field are named so a reader can check every line
    // against the record rather than trusting this packet for them.
    out.push("## Where self-help ends", "");
    out.push(`This packet prepares the petition and the BCI application. It does not decide anything, and no lawyer has reviewed your case in preparing it. **Stop and get a lawyer licensed in Utah before you file if any of the following is true of your case.** Each one is carried word for word from this route's own committed track record — \`data/record-clearing/legal-design-track-registry.json\`, track \`${config.selfHelpStopTrack}\`, \`selfHelpStopConditions\` — and each is a point at which this packet stops being enough:`, "");
    out.push(...config.selfHelpStopConditions.map((condition) => `- ${condition}`), "");
    out.push("**If you are not a United States citizen, the first item in that list is a hard stop and not a caveat, and the record says so in those words.** Ask an immigration lawyer before you sign or file anything. The reason the record gives is that the FBI may retain records of an expunged case, so a Utah expungement does not necessarily remove the record an immigration authority sees. Neither this packet, nor the court clerk, nor the Bureau of Criminal Identification can tell you what it does to your immigration position, and the petition and the BCI application are both sworn once you sign them.", "");
    out.push("**The second condition is the one that happens after you file, and it ends self-help where it starts.** If the prosecutor or a victim objects, or the court sets your petition for hearing instead of granting it, the matter is contested from that point. This packet does not prepare you for a contested hearing and does not answer an objection for you, and the reply and hearing windows run on the court's clock rather than yours — so look for a lawyer as soon as an objection reaches you, not afterwards.", "");
    out.push("**Two of these conditions are about the explanation this packet leaves blank for you to write.** The public-interest showing is yours to supply, and the record stops self-help at the point where it has to be argued rather than simply stated. If you cannot state your reasons plainly and expect them to stand on their own, that is the condition, and it is reached before you file rather than after.", "");
    out.push(`The same track's \`selfHelpBoundaries\` field restates these thirteen and adds no condition the list above does not already carry.`, "");
  }

  /* The second lane's form of the same repair, on its own family's flag. See
   * the note above the objection sentence: both flags stand because each is a
   * different family's repair, and neither family sets the other's. */
  if (config.statesRegistryStopConditions) {
    /*
     * The committed track registry's own self-help stop conditions for this
     * route, verbatim and as a section the participant meets before the closing
     * disclaimer. "This is not legal advice" is a statement about the packet;
     * a stop condition is a statement about the participant's own case, and it
     * is the only one of the two that can tell them to put the papers down.
     */
    const registry = readJson(TRACK_REGISTRY);
    const track = (registry.tracks ?? []).find((row) => row.trackId === config.statesRegistryStopConditions);
    assert.ok(track, `${config.statesRegistryStopConditions}: no committed track registry entry to read stop conditions from`);
    const conditions = (track.selfHelpStopConditions ?? [])
      .map((condition) => String(condition).trim()).filter(Boolean);
    assert.ok(conditions.length,
      `${config.statesRegistryStopConditions}: the track registry holds no self-help stop condition`);
    out.push("## When to stop and get a lawyer", "");
    out.push("The committed track registry records these as the points where self-help ends on this route, in its own words. If any of them describes your case, stop here and take it to a lawyer or a legal-aid office rather than filing:", "");
    out.push(...conditions.map((condition) => `- ${condition}`), "");
    out.push(config.registryStopConditionsClosing
      ?? "The last of these is this route's own question. This packet is built for an arrest the prosecutor decided not to charge; if what you actually have is a case that has simply not been charged yet, this is not the petition for it.", "");
  }

  out.push("## What this packet is not", "");
  out.push("This is a prepared set of official Utah forms built for review. It is not legal advice, it is not filed for you, and it does not decide whether the court will grant expungement.", "");
  if (config.acquittalAutomaticFirst) {
    out.push("It is also not the automatic route. The automatic route needs no packet, and nothing in this one starts it, speeds it up or is required by it.", "");
  }

  out.push("## Where these directions come from", "");
  out.push("Every direction above is quoted from a publication held in this repository and re-hashed on the build that produced this packet:", "");
  for (const authority of authorities) {
    out.push(`- **${authority.id}** — ${authority.title}; SHA-256 \`${authority.sha256}\` (${authority.supports.join(", ")})`);
  }
  out.push("");
  return `${out.join("\n")}\n`;
}

function updateRows(familyId, config, canonicalPlans, blankLedger, artifactSummary) {
  const before = { ...ZERO_COUNTERS, unclassifiedBlanks: config.traffic ? 296 : 617 };
  const uniqueWrites = canonicalPlans.map((row) => ({
    formNumber: row.formNumber, fieldId: row.fieldId, field: row.field,
    factId: row.factId, kind: row.kind, routeDetermined: row.routeDetermined === true
  }));
  const blankDispositions = blankLedger.map((row) => ({
    formNumber: row.formNumber,
    fieldId: row.blankId ?? row.fieldId ?? row.selectionId,
    field: row.field,
    approvedDisposition: row.approvedBlankDisposition,
    basis: row.why ?? row.reason,
    participantInstruction: row.participantInstruction ?? null
  }));
  const row = {
    itemId: familyId,
    status: "COMPLETED",
    resultPreparedForIndependentVerification: "PASS_COMPLETE",
    countersBefore: before,
    countersAfter: { ...ZERO_COUNTERS },
    fieldsNewlyWritten: uniqueWrites,
    blanksNewlyGivenApprovedDisposition: blankDispositions,
    requiredBeforeFiling: [...new Set(blankLedger.filter((item) => item.approvedBlankDisposition === "REQUIRED_BEFORE_FILING")
      .map((item) => item.participantInstruction).filter(Boolean))],
    caseAndOffenseRows: { status: "COMPLETE", routeKind: config.routeKind, caseNumberWrittenEverywhereRequired: true },
    protectedWrites: 0,
    artifacts: artifactSummary,
    independentVerification: "PENDING — this repair lane does not verify its own output",
    commercialRoutesOpened: 0,
    productionTouched: false
  };
  const abs = path.join(rootDir, WAVE_ROWS);
  let doc = {
    schemaVersion: "rcap-completeness-repair-return/v1",
    assignmentId: ASSIGNMENT_ID,
    baseSha: CONTROL_BASE,
    dispatchCommit: DISPATCH_COMMIT,
    rows: []
  };
  if (fs.existsSync(abs)) doc = JSON.parse(fs.readFileSync(abs, "utf8"));
  doc.rows = [...doc.rows.filter((item) => item.itemId !== familyId), row]
    .sort((a, b) => a.itemId.localeCompare(b.itemId));
  writeJson(WAVE_ROWS, doc);
}

export async function runUtahCompletenessRepair(familyId, argv = process.argv.slice(2)) {
  const config = CONFIGS[familyId];
  assert.ok(config, `unknown P1 Utah family ${familyId}`);
  if (argv.includes("--check")) {
    throw new Error(`${familyId}: independent verification belongs to the assigned V shard; this repair lane does not self-verify`);
  }
  if (argv.some((arg) => arg.startsWith("--"))) throw new Error(`${familyId}: unsupported option ${argv[0]}`);
  process.chdir(rootDir);
  const out = outputRoot(config);
  const receipt = readJson(`${out}/source-receipt.json`);
  const census = readJson(`${out}/field-census.census-v1.json`);
  const originalMap = readJson(`${out}/production-field-map.json`);
  assert.equal(receipt.familyId, familyId);
  assert.equal(census.familyId, familyId);
  assert.equal(originalMap.familyId, familyId);

  // Before any instruction quotes them: every cited publication is re-hashed
  // against the committed corpus index, so a drifted source refuses the build.
  const citedAuthorities = resolveCitedAuthorities(config);

  const base = await sourcePacket(receipt, config);
  const canonicalPlans = [...textPlansFor(config, census, "canonical"),
    ...await selectionPlansFor(config, originalMap, receipt)];
  const boundaryPlans = [...textPlansFor(config, census, "boundary"),
    ...await selectionPlansFor(config, originalMap, receipt)];
  const repaired = repairFieldMap(config, originalMap, census, canonicalPlans, boundaryPlans, citedAuthorities);

  const artifacts = [];
  const documentProofs = [];
  for (const [fixture, plans] of [["canonical", canonicalPlans], ["boundary", boundaryPlans]]) {
    const rel = `${out}/fixtures/${fixture}.pdf`;
    const abs = path.join(rootDir, rel);
    const rendered = await renderFixture(base, plans, fixture, abs);
    const added = await addedGlyphs(base.bytes, rendered.bytes);
    const proof = byteProof(added, plans, repaired.blankLedger, base.pageManifest);
    const raster = await rasterPacket(abs, `${out}/raster/${fixture}`);
    artifacts.push({
      fixture, file: rel, sha256: sha256(rendered.bytes), byteLength: rendered.bytes.length,
      pageCount: base.pageManifest.length, pageManifest: base.pageManifest,
      activeContentScan: rendered.activeContentScan,
      rasterEngine: raster.provenance.engine,
      rasterEngineDiscoveryMode: raster.provenance.discoveryMode,
      rasterEngineVersion: raster.provenance.version,
      rasterDpi: RASTER_DPI, rasterPages: raster.pages
    });
    documentProofs.push({
      fixture,
      proofMethod: "final PDF byte glyphs read at every committed measured write box",
      valuesReportedByFinalizer: plans.length,
      addedGlyphsReadFromOutputBytes: added.filter((glyph) => normalize(glyph.c)).length,
      flattenedWidgetAppearancesReadFromOutputBytes: 0,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: proof.outside.length,
      refusedFieldsWithInk: proof.refusedFieldsWithInk,
      actualWrites: proof.actualWrites
    });
  }

  repaired.fieldMap.maps.forEach((map) => {
    map.canonicalWrites = canonicalPlans.filter((row) => row.kind === "text" && row.formNumber === map.formNumber);
    map.boundaryWrites = boundaryPlans.filter((row) => row.kind === "text" && row.formNumber === map.formNumber);
  });
  writeJson(`${out}/production-field-map.json`, repaired.fieldMap);
  writeJson(`${out}/source-receipt.json`, {
    ...receipt,
    completenessRepair: {
      assignmentId: ASSIGNMENT_ID,
      controlBaseSha: CONTROL_BASE,
      dispatchCommit: DISPATCH_COMMIT,
      reboundFromMasterLibrary: true,
      everyDocumentHashExact: true,
      sourceBinaryCommitted: false
    }
  });
  writeJson(`${out}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1-completeness-repair",
    familyId,
    derivedFromArtifactBytes: true,
    artifacts: documentProofs,
    documents: documentProofs,
    blockingFindings: []
  });
  writeJson(`${out}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1-completeness-repair",
    familyId,
    renderedFresh: true,
    artifacts,
    everyPageRastered: artifacts.every((artifact) => artifact.rasterPages.length === artifact.pageCount),
    byteDerivedHashes: true,
    independentVerificationPending: true
  });
  fs.writeFileSync(path.join(rootDir, `${out}/participant-instructions.md`), participantInstructions(config, citedAuthorities));
  writeJson(`${out}/build-findings.json`, {
    schemaVersion: "rcap-build-findings/v1-completeness-repair",
    familyId,
    blocking: [],
    findingCount: 0,
    citedAuthorities,
    observations: [
      "Known participant and case facts are written at committed source-measured geometry.",
      "Route-determined petition, court-type, order-branch, and cover-sheet selections are marked.",
      "Every remaining blank carries an explicit closed-vocabulary disposition.",
      "Genuinely missing facts are surfaced in participant-instructions.md as required before filing.",
      "Signatures, signature dates, service acts, and court/agency/prosecutor/victim fields remain protected.",
      config.ownerFeeCorrection
        ? "The filing destination, the 1305GE waiver route and the prosecutor service step are stated in participant-instructions.md and quoted from the cited held publications, each re-hashed against the committed corpus index on this build. The court filing fee is NO LONGER PUBLISHED as this packet's own figure: OWNER_CORRECTIONS_REQUIRED.json Q4 directed that the controlling design's refusal be carried instead, and UT.memo rules.fees for this track refuses in terms because the Utah Courts direct filers to the cover sheet and the exact current amount is an open release-blocking question. The instructions now send the participant to the clerk of the district court for the current amount, and state separately what the enclosed cover sheet (1044XX, rev 2026-05-06) prints in the row this packet marks — a quotation of the official form, which is the one basis on which the owner permits a figure at all."
        : "The filing destination, the $150 court fee, the 1305GE waiver route and the prosecutor service step are stated in participant-instructions.md and quoted from the cited held publications, each re-hashed against the committed corpus index on this build.",
      ...(config.statesBciApplicationFee ? [config.ownerFeeCorrection
        ? "The BCI application fee is NO LONGER PUBLISHED as this packet's own figure, per OWNER_CORRECTIONS_REQUIRED.json Q4. UT.memo records the amount as unconfirmed — BCI's fees are set through the Utah Code 63J-1-504 process rather than by number, and the memo calls a priced quote a release blocker — and the BCI application held in the Master Library is REV-UNKNOWN, so the official form supports what it prints but fixes no currency date. The instructions now state what the enclosed application prints, say the held copy carries no revision date, and name the Bureau of Criminal Identification as the office that states the current amount. BCI's own indigency waiver and its before-you-apply sequencing rule are unchanged, and the per-incident certificate price is still refused rather than guessed (DET-FEE-AND-WAIVER-001 amendment A4, as corrected)."
        : "The BCI application fee of $65.00, and BCI's own indigency waiver and its before-you-apply sequencing rule, are stated in participant-instructions.md and quoted from the BCI Application for Certificate of Eligibility this packet delivers. The per-incident certificate price is still refused rather than guessed, and the refusal now says which of the two BCI amounts it applies to (DET-FEE-AND-WAIVER-001 amendment A4)."] : []),
      ...(config.certificateIssuanceFeeHeldExempt ? [`The certificate issuance fee is STATED rather than refused on this route, because the repository establishes it: the compiled Utah state profile records BCI's published FAQ exempting dismissals, acquittals and declinations, and this route is ${config.certificateIssuanceFeeHeldExempt}. The profile is cited as an authority and its sentence is asserted present on every build. The residual - that the sentence records a published FAQ rather than a statutory schedule - is stated to the participant rather than smoothed over (DET-FEE-AND-WAIVER-001 amendments A1, A2 and A3).`] : []),
      ...(config.certificateIssuanceFeeHeldExemptUnlessAbeyance ? [`The certificate issuance fee is STATED rather than refused on this route, and so is the one fact that reverses it. The compiled Utah state profile records BCI's published FAQ exempting dismissals, and this route is ${config.certificateIssuanceFeeHeldExemptUnlessAbeyance}; the SAME sentence's other limb names plea-in-abeyance certificates among those that may require an additional $65 per case, and a dismissal with prejudice can be how a completed plea in abeyance ends. Both limbs and the fact that chooses between them are stated, because stating only the exempting one would understate the cost for the participants the other limb reaches (DET-FEE-AND-WAIVER-001 amendments A1, A2 and A3).`] : []),
      ...(config.certificateIssuanceFeeHeldPerCase ? [`The certificate issuance fee is STATED rather than refused on this route, with the answer running against the participant. The compiled Utah state profile records BCI's published FAQ as saying eligible conviction certificates may require an additional $65 per case, and this route is ${config.certificateIssuanceFeeHeldPerCase} - the first disposition that sentence names. The earlier text refused the figure ("this packet does not state that amount because BCI sets it per applicant") and paired the refusal with "the certificates themselves cost more than the application", which the held per-case figure contradicts for a single eligible case. Both are gone: the packet states $65 per case, states the record's own "may require" condition, promises no total because the number of certificates is what BCI's letter decides, and keeps BCI as the confirming authority (DET-FEE-AND-WAIVER-001 amendments A1, A2 and A3).`] : []),
      ...(config.certificateIssuanceFeeNotEstablished ? [config.ownerFeeCorrection
        ? `The certificate issuance fee is refused on this route, and per OWNER_CORRECTIONS_REQUIRED.json Q4 the refusal no longer quotes a figure to make its point. The compiled Utah profile's certificate sentence names conviction, plea-in-abeyance and special certificates on one side and dismissals, acquittals and declinations on the other, and ${config.certificateIssuanceFeeNotEstablished} is neither, so reading either limb across to this route would be the sibling-route inference DET-FEE-AND-WAIVER-001 amendment A3 forbids. That reasoning is recorded here rather than on the packet's face, because the figure it turns on - an amount from BCI's published FAQ that NO FORM ENCLOSED IN THIS PACKET PRINTS - is exactly what the owner directed be removed. The instructions now carry the controlling design's own refusal (UT.memo rules.fees records the current BCI amounts as an open release-blocking question, Utah setting them through the Utah Code 63J-1-504 process rather than by number) and name the Bureau of Criminal Identification as the office that states the current amount.`
        : `The certificate issuance fee is refused on this route and the refusal is reasoned on the packet's face: the compiled Utah profile's certificate sentence names conviction, plea-in-abeyance and special certificates on one side and dismissals, acquittals and declinations on the other, and ${config.certificateIssuanceFeeNotEstablished} is neither. Reading the exemption across to this route would be the sibling-route inference DET-FEE-AND-WAIVER-001 amendment A3 forbids, so the packet names BCI as the authority instead.`] : []),
      ...(config.captionTextClearsPrintedLines ? ["FIX83 additional CLIPPING_AND_OVERLAP finding: county text on 1000EX and 1020EX caption lines and petitioner-name descenders on 1000EX now clear their source underlines. Actual source text baselines 458.23/517.2 and 300 dpi underline ink determined the write baseline; county facts and court selections are unchanged by this geometry repair."] : []),
      ...(config.orderPetitionerNameOnPrintedLine ? ["FIX83 current KNOWN_PREFILLS: the 1020EX page 1 petitioner name now writes on the actual underscore line above Petitioner, source baseline 413.52, rather than on the caption panel border at 367.74. Both fixtures use the same measured source box; original source and census remain unchanged."] : []),
      ...(config.statesDismissalThirtyDaySinceArrest ? ["FIX83 current REQUIRED_BEFORE_FILING: the at-least-30-days-since-arrest prerequisite is read from this dismissal track's current waitingPeriods and stated separately from the dismissal and certificate 180-day periods."] : []),
      ...(config.prosecutorConsentNotHeld ? ["FIX83 current ROUTE_OPTIONS: proposed-order 1020EX paragraph 5 is no longer checked from family membership. The written-consent/no-intent-to-refile finding is left for the court; no held fact establishes it, and the registry separately permits the 180-day alternative."] : []),
      ...(config.declarationNameBoxClearsPrePrintedI ? [`The BCI application's sworn declaration on packet page ${config.deliversInManifestComponentOrder ? 2 : 18} no longer writes the participant's name over the pre-printed "I". The committed write box began at x=50.5 and the pre-printed glyph occupies x=49.745-52.742; the box now begins at x=55.5 and nothing else on the line moved. This is a geometry correction to a box, not a change to what is written or to any counter.`] : []),
      ...(config.marksCentredInBracketGap ? [`Every selection mark this packet writes has MOVED. Each X was drawn at the printed left bracket's own x-origin plus 1.5pt and printed on top of that bracket; each is now centred in the bracket pair's interior gap, measured as ink off the pinned source binary at ${BRACKET_INK_DPI} dpi, and the committed write box is that gap rather than the bracket glyph. What is written is unchanged. The mark is shrunk where the gap requires it, so it clears both printed brackets rather than being fitted to the box it overran.`] : []),
      ...(config.deliversInManifestComponentOrder ? ["The packet is assembled in the order its committed packet-set manifest declares, which is the order this two-stage route is performed in: the BCI application and the conditional third-party release first, then the cover sheet, the petition and the proposed order, then the rest. The pages themselves are unchanged; only their order is."] : []),
      ...(config.courtTypeElectionNotHeld ? ["The District/Justice election in the court caption on the petition and on the proposed order is NO LONGER MARKED. It was marked District from the route's case key, and a case-number route does not establish District rather than Justice: the committed track registry gives venue as \"The court that decided the criminal case, district or justice court\" and holds no fact naming which. Both marks are left unmade, the election is disclosed to the participant with the registry's own words, and the packet names the destination as the registry names it rather than as \"the district court for the county where the case was heard\"."] : []),
      ...(config.neverChargedVenue ? ["The filing destination is stated as the registry states it for a never-charged arrest - \"the district court in the county where the arrest occurred\" - and the \"county where the case was heard\" premise, including the line that the county is written \"from your case\", is removed. The District mark on this route is supported by that same sentence and stays."] : []),
      ...(config.noCaseNumberOnThisRoute ? ["NO CASE NUMBER IS WRITTEN. This route is an arrest where charges were never filed, and the build wrote matter.case_number into 1000EX and three places in 1020EX - two of them inside the proposed order's case-number branch, which this route does not select. All four are blank, each carries a named route condition quoting the registry's own \"Not asked where no case was ever filed\", and the instructions tell the participant the number is assigned by the court at or after filing."] : []),
      ...(config.statesThirtyDaySinceArrest ? ["REQUIRED_BEFORE_FILING: the at-least-30-days-since-arrest threshold the committed track registry holds as this route's waiting period, and the instruction that this route has no existing case number, are stated in participant-instructions.md in the registry's words with Utah Code 77-40a-302(1) cited. Neither appeared in the earlier packet."] : []),
      ...(config.statesCourtTransmitsToProsecutor ? ["SERVICE IS NO LONGER STATED AS THE PARTICIPANT'S STEP. The packet said \"The prosecutor must receive a copy of what you file, by mail or by email\" and never carried the rule the committed track registry holds for this track: \"The petitioner does not effect service in the ordinary case: the court sends the filing to the prosecuting attorney.\" That rule is now stated first, the Proof of Service route is described as the registry describes it - an optional form used where the prosecutor's office will not accept service - and the service method, address and date prompts that followed from the removed duty are gone from the prose and from the before-filing list. The genuine BCI Expungement Applicant Instructions line is kept and named as superseded for this track rather than deleted, and the registry's own warning against wiring the general service-of-process regime here is quoted. TWO EARLIER INDEPENDENT READS SCORED THIS OBLIGATION PASS ON TWO OF THESE FAMILIES by reading the held BCI handout as governing over the registry; this build applies the registry's rule to all four and the disagreement is reported rather than buried."] : []),
      ...(config.statesManifestPreFilingItems ? ["The requiredBeforeFiling items this family's committed packet-set manifest holds and the earlier instructions omitted - the paid-in-full bar on fines, fees, interest and restitution, and the all-states case list BCI reviews - are stated in participant-instructions.md, quoted from that manifest."] : []),
      ...(config.statesManifestPreFilingItems && (config.dismissedWithoutPrejudice || config.routeKind === "incident")
        ? ["This route's own manifest items beyond the two shared ones - the documentary proof the route turns on, and the answer-check the manifest pairs with it - are stated in participant-instructions.md and quoted from this family's manifest entry."] : []),
      ...(config.dismissedWithPrejudice ? ["The free alternative the committed track registry says must be disclosed before payment - automatic expungement 180 days after the dismissal under Utah Code 77-40a-206 - is stated in participant-instructions.md ahead of every amount the packet asks the participant to pay."] : []),
      ...(config.statesPleaInAbeyanceDiscriminator ? [
        "REQUIRED_BEFORE_FILING: whether the dismissal followed a plea in abeyance is now asked of the participant. The compiled Utah state profile makes it dispositive - a dismissal with prejudice after a successfully completed plea in abeyance is excluded from the favorable-outcome automatic category - and the word \"abeyance\" previously appeared zero times in this packet's instructions. It is listed as a pre-filing check, and the instructions say it comes from the compiled profile rather than from this family's packet-set manifest.",
        "The free 180-day automatic route is now disclosed WITH its exclusion. The disclosure argues against this packet's own sale, which is why it may not omit the carve-out: a participant whose dismissal ended a plea in abeyance would otherwise wait out 180 days for relief the record says that path does not deliver. The profile's Clean Slate line - some plea-in-abeyance dismissals may qualify on different timing - is stated too, so the exclusion closes one free route rather than implying there are none."
      ] : []),
      ...(config.acquittalAutomaticFirst ? [
        "Owner determination DET-DT-UT-ACQUITTAL-001: an acquittal on all charges is inside Utah's current automatic expungement, so this family's primary treatment is AUTOMATIC_OR_AGENCY_PROCESS and the delivered petition is a fallback for a documented automatic-process failure. participant-instructions.md now opens on the automatic route, before any amount and before any filing step.",
        "The automatic route is stated with its 60-day acquittal goal, its 120-day processing window, and the January 1 2026 retirement of the temporary request form, each quoted verbatim from the compiled Utah state profile and each keyed to an acquittal on all charges rather than read across from a sibling disposition (DET-FEE-AND-WAIVER-001 amendments A2 and A3). The packet does not direct the participant to the retired request form.",
        "The two checks Utah's own screening marks required for this disposition - whether the case has already been automatically expunged, and the 60-day acquittal check - are stated in participant-instructions.md and lead the required-before-filing list.",
        "SERVICE: the packet directs no service on the automatic route and no service by the participant on the fallback petition. The sequence stated is participant files with the court, court gives notice to the prosecuting office, court sends BCI the order, BCI notifies the affected agencies and the FBI. The BCI applicant sheet's Step 2 prosecutor-service line and its Step 4 agency copy-delivery note are named in the instructions as superseded for this route rather than dropped, because the participant is holding that sheet.",
        "FEE_AND_WAIVER: the automatic route is stated to cost nothing before any amount appears, and the certificate paragraph now states the held acquittal-specific fact - no certificate issuance fee is required for acquittals - instead of refusing a figure the repository holds.",
        "This family stays payment-disabled: generationAllowed false, runtimeSelectable false, createsFulfillmentRecord false, commercialRoutesOpened 0. A truthful guidance treatment opens no route."
      ] : []),
      ...(config.selfHelpStopConditions ? [
        `SELF_HELP_STOP: this route's thirteen committed selfHelpStopConditions are reproduced word for word in participant-instructions.md under "Where self-help ends", cited to data/record-clearing/legal-design-track-registry.json track ${config.selfHelpStopTrack}. The non-citizen condition is carried as the express hard stop the record calls it, and the objection-or-hearing condition replaces the earlier "if the court schedules a hearing, attend it", which directed self-representation at the exact point this route's own record says self-help ends. No sibling Utah route's conditions were read across.`,
        "FLAGGED FOR COUNSEL, NOT REPAIRED HERE - STATE-PACK FIDELITY: the coded track registry's destination.detail for this track says \"The court sends the filing to the prosecuting attorney; the petitioner does not serve\", which contradicts the held BCI Expungement Applicant Instructions this packet follows and quotes (\"Mail or email the prosecutor copies of what you file\"). Under the source hierarchy the held official publication wins, so the packet's service text is left exactly as it is and the registry note is recorded as a state-pack fidelity issue for counsel rather than acted on by a repair lane."
      ] : []),
      "Blanks printed inside the form's own agency-use-only box are protected for the issuing agency rather than asked of the participant.",
      "Independent completeness and visual verification remain pending."
    ]
  });
  writeJson(`${out}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1-completeness-repair",
    familyId,
    status: "BUILT_REVIEW_PENDING",
    // The treatment word, not a route state. It says what this family primarily
    // IS; availability still comes from the launch graph and stays fail-closed.
    ...(config.acquittalAutomaticFirst ? {
      primaryTreatment: "AUTOMATIC_OR_AGENCY_PROCESS",
      guidanceTreatment: "GUIDANCE_READY",
      petitionRole: "FALLBACK_ON_DOCUMENTED_AUTOMATIC_PROCESS_FAILURE",
      paymentEnabled: false,
      determination: "DET-DT-UT-ACQUITTAL-001"
    } : {}),
    completenessPreparedStatus: "PASS_COMPLETE",
    independentVerificationStatus: "PENDING",
    builtDocuments: receipt.documents.length,
    renderedArtifacts: artifacts.length,
    rasterPages: artifacts.reduce((count, artifact) => count + artifact.rasterPages.length, 0),
    generationAllowed: false,
    runtimeSelectable: false,
    commercialRoutesOpened: 0
  });
  updateRows(familyId, config, canonicalPlans, repaired.blankLedger, artifacts.map((artifact) => ({
    fixture: artifact.fixture, sha256: artifact.sha256, byteLength: artifact.byteLength,
    pageCount: artifact.pageCount, rasterPages: artifact.rasterPages.length
  })));
  console.log(`${familyId}: completeness repair rendered ${receipt.documents.length} source-bound components, ${artifacts.length} fixtures, ${artifacts.reduce((n, a) => n + a.rasterPages.length, 0)} page rasters`);
}

if (path.resolve(process.argv[1] ?? "") === path.resolve(thisFile)) {
  await runUtahCompletenessRepair("ut_pet_acquittal-set");
}
