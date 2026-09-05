#!/usr/bin/env node
/**
 * The New Mexico conviction expungement family — `nm_conviction-set`.
 *
 *   node scripts/build-census-v1-nm_conviction-set.mjs [--check] [--no-raster]
 *
 * Seven official documents across two filing stages, in a New Mexico district
 * court, under NMSA 1978, Section 29-3A-5 and Rule 1-077.1 NMRA:
 *
 *   STAGE ONE, filed together and then served
 *     4-953 NMRA                 Petition to expunge; upon conviction
 *     4-956 NMRA                 Certificate of service
 *     4-222 NMRA (+ 4-223)       Application for free process   — conditional
 *
 *   STAGE TWO, at least sixty-three days later
 *     4-960 NMRA                 Notice of completion of briefing
 *     4-960.3 NMRA               Affirmation in support of expungement
 *
 *   FOR THE HEARING, which happens in every case on this track
 *     4-960.1 NMRA               Notice of hearing
 *     NM-LOCAL-CONVICTION-ORDER  Order on petition to expunge   — conditional
 *
 * WHAT DIFFERS FROM THE IDENTITY-THEFT FAMILY, AND WHY IT MATTERS HERE
 *
 * SERVICE IS REQUIRED ON THIS TRACK. The petition and every attachment go by
 * first-class United States mail to the district attorney for the county where
 * the conviction was entered, to the New Mexico Department of Public Safety,
 * and to the law enforcement agency that made the arrest, and Form 4-956 is
 * filed to certify it. That single fact changes the disposition of twenty
 * blanks: Form 4-960.1's four page-2 service blocks are the petitioner's to
 * complete for any party that filed and served an objection under Rule
 * 1-077.1(G)(1) NMRA -- required before filing -- where on the identity-theft
 * track, which serves nobody, the same twenty blanks are on a branch of the
 * form the route does not reach. `serviceBlocksOf` in
 * scripts/rcap-nm-flat-forms/nm-form-4-960-1.mjs takes the route's service
 * posture as a parameter for exactly this reason, and this family passes the
 * other answer.
 *
 * A HEARING HAPPENS IN EVERY CASE, so the packet-set manifest marks the notice
 * of hearing REQUIRED here rather than conditional.
 *
 * THE PACKET IS FILED IN TWO STAGES SIXTY-THREE DAYS APART, and Forms 4-960 and
 * 4-960.3 describe what happened in between: whether each responding party
 * objected, whether anything is pending, whether there has been a conviction.
 * None of that is knowable when the packet is prepared, so every one of those
 * controls and lines belongs to the participant, and the instructions are
 * organised around the sequence rather than around the forms.
 *
 * Rasterization goes through scripts/raster/pdf-page-raster.mjs. Never Poppler.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runNmFamily } from "./rcap-nm-flat-forms/nm-packet-host.mjs";
import { FORM_4_960_1, dictionary4960_1 } from "./rcap-nm-flat-forms/nm-form-4-960-1.mjs";
import { FORM_4_222, DICTIONARY_4_222, PRINTED_BLANKS_4_223, PRINTED_DISTRICT_FINDING, PRINTED_DISTRICT_IN_THE_CAPTION }
  from "./rcap-nm-flat-forms/nm-form-4-222.mjs";
import {
  FORM_4_953, DICTIONARY_4_953, FORM_4_956, DICTIONARY_4_956,
  FORM_4_960, DICTIONARY_4_960, FORM_4_960_3, DICTIONARY_4_960_3,
  NM_LOCAL_CONVICTION_ORDER, DICTIONARY_CONVICTION_ORDER
} from "./rcap-nm-flat-forms/nm-conviction-documents.mjs";

const thisFile = fileURLToPath(import.meta.url);
const FAMILY_ID = "nm_conviction-set";
const OUT = "data/rcap-all50/overlays/census-v1/nm/nm-conviction-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-nm_conviction-set.mjs";

const ROUTE = Object.freeze({
  jurisdiction: "NM",
  routeKey: "obligation:track-pathway:NM:nm_conviction:conviction",
  routeSelectionId: "nm-conviction-set-4-953-4-956-4-960-4-960.1-4-960.3-local-order-4-222",
  publicLabel: "Expunge the records of a New Mexico conviction",
  authority:
    "NMSA 1978, Section 29-3A-5; Rule 1-077.1 NMRA; Forms 4-953, 4-956, 4-960, 4-960.1 and 4-960.3 NMRA. Rule and forms "
    + "approved by Supreme Court Order No. S-1-RCR-2024-00099, effective for all cases filed on or after December 31, 2025."
});

const SERVICE_ON_THIS_TRACK =
  "by first-class United States mail on the district attorney for the county in which the conviction was entered, the "
  + "New Mexico Department of Public Safety, and the law enforcement agency that arrested the petitioner";

/* ------------------------------------------------------------------ */

const compose = (f) => ({
  ...f,
  "participant.city_state_zip": `${f["participant.city"]}, ${f["participant.state"]} ${f["participant.zip"]}`
});

const FIXTURES = {
  canonical: compose({
    "participant.full_legal_name": "Dana Marie Sandoval",
    "participant.date_of_birth": "1985-09-02",
    "participant.street_address": "2210 Camino de Salud NE",
    "participant.city": "Albuquerque",
    "participant.state": "NM",
    "participant.zip": "87106",
    "matter.county": "Bernalillo",
    "matter.court": "Second",
    "matter.case_number": "D-202-CR-2016-02885"
  }),
  boundary: compose({
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1961-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Rd Apt 14B",
    "participant.city": "Truth or Consequences",
    "participant.state": "NM",
    "participant.zip": "87901",
    "matter.county": "Sierra",
    "matter.court": "Seventh",
    "matter.case_number": "D-721-CR-2011-00094"
  })
};

/* ------------------------------------------------------------------ */

function participantInstructions({ rbf, controls, inapplicable }) {
  const byDoc = new Map();
  for (const i of rbf) byDoc.set(i.document, [...(byDoc.get(i.document) ?? []), i]);
  const controlsByDoc = new Map();
  for (const c of controls) controlsByDoc.set(c.document, [...(controlsByDoc.get(c.document) ?? []), c]);

  const out = [];
  out.push(`# Filing instructions — ${ROUTE.publicLabel}`, "");
  out.push(
    "This packet is seven official New Mexico forms for a petition to expunge the records of a conviction, under NMSA "
    + "1978, Section 29-3A-5 and Rule 1-077.1 NMRA. **You do not file them all at once.** They go in two stages, at "
    + "least sixty-three days apart, and there is a hearing in every case on this track.", ""
  );

  out.push("## How to gather your records first", "");
  out.push(
    "Do this before you fill anything in. The petition has to have your records attached to it, and two of them take "
    + "time to arrive:", "",
    "1. **Your DPS Record of Arrest and Prosecution (RAP) sheet.** The New Mexico Department of Public Safety charges "
    + "**$15.00** per record check. The DPS Authorization for Release of Information must carry your **original "
    + "signature and be notarized**. **None of the court filings needs a notary** — only this authorisation does, and the "
    + "notary block on page 4 of Form 4-222 if you file that.",
    "2. **Your FBI Identity History Summary.** The FBI charges its own fee and takes longer than DPS.",
    "3. **Both RAP sheets must be dated no more than ninety (90) days before you file**, so do not order them and then "
    + "wait months to file.",
    "4. **Your sentence, fines, fees and restitution paperwork** — documents showing you completed the sentence for "
    + "each conviction you are asking to expunge, completed the sentence for any other conviction, paid the fines and "
    + "fees, and completed any victim restitution.",
    "5. **Your court records**, so you can state the case numbers, the offence names and statute numbers, and the dates "
    + "exactly as the record has them.", ""
  );

  out.push("## Stage one: file, then mail", "");
  out.push(
    "1. **Fill in and sign Form 4-953**, the petition, and attach the RAP sheets and the sentence, fines, fees and "
    + "restitution documentation.",
    "2. **File it with the clerk of the New Mexico district court for the county where the conviction was entered.** "
    + "The filing fee is **$132.00**, and most courts want a money order or cashier's check rather than a card or a "
    + "personal check. If you cannot pay it, file Form 4-222 instead.",
    "3. **Then mail an endorsed (file-stamped) copy of the petition and everything attached to it** " + SERVICE_ON_THIS_TRACK
    + ". The Department of Public Safety's address is printed on the forms for you: P.O. Box 1628, Santa Fe, New Mexico "
    + "87504-1628.",
    "4. **Then fill in Form 4-956, the certificate of service, and file it with the court.** Only after you have "
    + "actually posted the copies — it is a statement under penalty of perjury about something you did.", "",
    "**This petition is not filed under seal.** If you combine it with a release-without-conviction request the whole "
    + "filing is treated as a conviction petition and loses the seal that a non-conviction petition would have had. "
    + "Keep them separate.", ""
  );

  out.push("## The sixty-three day wait", "");
  out.push(
    "The three parties you served have **sixty days from service** to file a specific objection on Form 4-957 NMRA or a "
    + "notice of non-objection on Form 4-958 NMRA. Rule 1-077.1(G) NMRA controls, not the thirty days written in the "
    + "statute, and Rule 1-006(C) adds three days because you served by mail — **sixty-three days in total**. If your "
    + "affirmation later discloses new arrests, charges or convictions, a further twenty days runs.", ""
  );

  out.push("## Stage two: tell the court briefing is complete", "");
  out.push(
    "Once the sixty-three days have passed:", "",
    "1. **Fill in Form 4-960**, the notice of completion of briefing, saying what each of the three parties did — "
    + "filed a non-objection, filed an objection, or did nothing.",
    "2. **Fill in Form 4-960.3**, the affirmation, which states under penalty of perjury that nothing is pending "
    + "against you and what your most recent conviction was. **It describes your situation on the day you sign it**, "
    + "not the day this packet was prepared.",
    "3. **Attach the affirmation to the notice, file both, and serve them on any party that objected.**", ""
  );

  out.push("## The hearing", "");
  out.push(
    "**A hearing follows in every case on this track.** The court sets the date and completes Form 4-960.1, the notice "
    + "of hearing — you give it to the court with the caption and your own contact details filled in and leave the "
    + "hearing details blank.", "",
    "**Form 4-960.1 page 2 is for parties entitled to notice of the hearing.** On this track that is you and any party "
    + "that filed and served an objection to your petition. If nobody objected, leave page 2 empty. If someone did, put "
    + "their name, agency, address, telephone number and e-mail in one of the four blocks.", "",
    "At the hearing you may be asked about the petition and about any objection. The court decides whether justice will "
    + "be served by expungement, weighing the nature and gravity of the offence, your age, your criminal history and "
    + "your employment history, how long it has been since the offence and since you completed the sentence, and what "
    + "happens to you if the petition is refused. **That is what paragraph 12 of the petition is for, and it is the part "
    + "only you can write.**", ""
  );

  out.push("## Which district's order form you need", "");
  out.push(
    "There is **no statewide Supreme Court order form** in the mandatory 4-951 to 4-960.3 set. Each judicial district "
    + "publishes its own _Order on Petition to Expunge_ in its expungement packet, and the order in this packet is one "
    + "district's copy. **Before your hearing, check the expungement packet published by the judicial district you filed "
    + "in and use that district's order form if it has one.** Either way, **complete only the caption** — your county, "
    + "your judicial district and your name — and leave the rest blank, because the court fills in its findings and what "
    + "it is ordering.", ""
  );

  out.push("## The court name printed on the fee-waiver form", "");
  out.push(
    `**Form 4-222 and the order bound with it print \`${PRINTED_DISTRICT_IN_THE_CAPTION}\` in the caption.** That is `
    + "printed on the form itself, not a blank, so nothing can change it. If you are filing anywhere other than the Sixth "
    + "Judicial District (Grant, Hidalgo or Luna County), **cross out that line by hand and write your own judicial "
    + "district**, or ask the district court clerk for their copy of Form 4-222 NMRA. Do not file it with the wrong court "
    + "named on it.", ""
  );

  out.push("## Boxes you tick with a pen", "");
  out.push(
    "These New Mexico forms draw their tick boxes as **printed characters, not as fillable fields**, so nothing can mark "
    + "them for you. Mark these by hand, and only the ones that are true for you **on the day you sign that form**:", ""
  );
  for (const [doc, items] of controlsByDoc) {
    out.push(`### ${doc}`, "");
    for (const c of items) out.push(`- **Page ${c.page}, ${c.section}** — ${c.label}.`);
    out.push("");
  }

  out.push("## What you must do before you file", "");
  out.push("1. **Gather your records first.** See the section above; the RAP sheets take the longest and expire in ninety days.");
  out.push("2. **Fill in every item in the tables below**, for the stage you are at. Each names the form, the section and the blank.");
  out.push("3. **Tick every box under _Boxes you tick with a pen_ that applies to you.**");
  out.push("4. **Sign and date Form 4-953 and Form 4-960.3 yourself.** Both are affirmed under penalty of perjury; the dates are the dates you sign, and they are different dates.");
  out.push("5. **Do not fill in Form 4-956 until you have actually posted the copies.** It certifies something you did.");
  out.push("6. **Leave the hearing date, time and place on Form 4-960.1 blank.** The court fills those in.");
  out.push("7. **Leave everything below the caption of the order blank.** The court fills that in.");
  out.push("");

  for (const [doc, items] of byDoc) {
    out.push(`## ${doc} — the items you must supply`, "");
    out.push("| Section | The blank on the form | What to write |", "| --- | --- | --- |");
    for (const i of items) out.push(`| ${i.section} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## What the platform deliberately left blank", "");
  out.push("- **Every signature and every signature date.** Forms 4-953 and 4-960.3 are affirmed under penalty of perjury.");
  out.push("- **Everything below the caption of Form 4-956.** The certificate of service states, under penalty of perjury, when you posted the petition and to whom. Service has not happened when this packet is prepared and the platform knows nothing about it.");
  out.push("- **Everything Form 4-960 and Form 4-960.3 assert about the sixty-three day period** — whether each party objected, whether anything is pending against you, what your most recent conviction was. None of it is knowable now.");
  out.push("- **Every agency, sheriff, police and district-attorney line.** Naming the agencies is yours to do — the packet does not do it for you, because a list of agencies on a court form is more often the court's than yours, and getting it wrong is the kind of mistake that is hard to undo. Your answers are the source; copy them onto the lines the tables below name.");
  out.push("- **The hearing details, the judge's name and the court's signature block on Form 4-960.1.**");
  out.push("- **Everything below the caption of the order.**");
  out.push("- **Every attorney block, and the whole attorney certificate on page 5 of Form 4-222.** This packet is prepared for someone filing without a lawyer.");
  out.push("- **The notary block on page 4 of Form 4-222, and every financial answer on it.** That form is sworn under oath and the platform holds none of your financial facts.");
  out.push("");

  if (inapplicable.length > 0) {
    out.push("## Blanks that do not apply on this route", "");
    out.push("| Form | Page | The blank | Why it does not apply |", "| --- | --- | --- | --- |");
    for (const i of inapplicable) out.push(`| ${i.document} | ${i.page} | ${i.label} | ${i.why} |`);
    out.push("");
  }

  out.push("## After the order is signed", "");
  out.push(
    "Any expungement order must **allow at least sixty days** for the expungement to be carried out, and the court **may "
    + "not expunge court records earlier than thirty days** from the day the order is entered. An order granting the "
    + "petition must also require that **this expungement case itself be expunged**.", ""
  );

  out.push("## What this packet is not", "");
  out.push(
    "This is a prepared set of official New Mexico forms. It is not legal advice, it is not filed for you, and it does "
    + "not decide whether your records will be expunged. **Get a lawyer's help** if any charge or proceeding is pending "
    + "against you anywhere, if any party objects, if any of the records are federal, tribal, military or from outside "
    + "New Mexico, or if you are not a United States citizen. Section 29-3A-5 does not reach a conviction for an offence "
    + "committed against a child, an offence causing great bodily harm or death, a sex offence under Section 29-11A-3, "
    + "embezzlement under Section 30-16-8, or driving under the influence. Expungement does not destroy records, and it "
    + "does not remove the disclosure obligations that FINRA and the SEC impose on people who work in securities."
  );
  out.push("");
  out.push(`_Route: ${ROUTE.routeKey} — ${ROUTE.authority}_`);
  return `${out.join("\n")}\n`;
}

/* ------------------------------------------------------------------ */

const FAMILY = {
  familyId: FAMILY_ID,
  out: OUT,
  buildScript: BUILD_SCRIPT,
  route: ROUTE,
  fixtures: FIXTURES,
  participantInstructions,
  documents: [
    { ...FORM_4_953, dictionary: DICTIONARY_4_953 },
    { ...FORM_4_956, dictionary: DICTIONARY_4_956 },
    { ...FORM_4_960, dictionary: DICTIONARY_4_960 },
    { ...FORM_4_960_3, dictionary: DICTIONARY_4_960_3 },
    {
      ...FORM_4_960_1, instrumentKind: "notice_of_hearing",
      dictionary: dictionary4960_1({ service: SERVICE_ON_THIS_TRACK, trackName: "conviction" })
    },
    { ...NM_LOCAL_CONVICTION_ORDER, dictionary: DICTIONARY_CONVICTION_ORDER },
    {
      ...FORM_4_222, instrumentKind: "fee_waiver_application",
      dictionary: DICTIONARY_4_222, printedBlankDictionary: PRINTED_BLANKS_4_223
    }
  ],
  componentDelivery: {
    "nm_conviction-primary-filing-1": { deliveredAs: "official_pdf_fill", deliveredBy: "NM-4-953, the first five pages of both fixtures" },
    "nm_conviction-certificate-of-service-2": { deliveredAs: "official_pdf_fill", deliveredBy: "NM-4-956, two pages" },
    "nm_conviction-second-stage-notice-3": { deliveredAs: "official_pdf_fill", deliveredBy: "NM-4-960, three pages" },
    "nm_conviction-second-stage-affirmation-4": { deliveredAs: "official_pdf_fill", deliveredBy: "NM-4-960.3, two pages" },
    "nm_conviction-notice-of-hearing-5": { deliveredAs: "official_pdf_fill", deliveredBy: "NM-4-960.1, three pages", note: "the manifest marks this REQUIRED on the conviction track, not conditional, because a hearing follows in every case." },
    "nm_conviction-proposed-order-6": {
      deliveredAs: "official_pdf_fill", deliveredBy: "NM-LOCAL-CONVICTION-ORDER, four pages",
      note: "the manifest marks this conditional on the participant filing in the judicial district that published the retained order. The instructions tell every other district's participant to obtain their own district's order form."
    },
    "nm_conviction-local-order-form-instructions-7": {
      deliveredAs: "process_guidance", deliveredBy: "participant-instructions.md",
      section: "## Which district's order form you need",
      note: "required by the manifest and by the track's own record, because no statewide Supreme Court order form exists in the mandatory 4-951 to 4-960.3 set."
    },
    "nm_conviction-fee-waiver-application-8": {
      deliveredAs: "official_pdf_fill", deliveredBy: "NM-4-222 with Form 4-223, seven pages",
      note: "conditional on the participant being unable to pay the $132.00 district court filing fee. See the blocking finding about the district printed in its caption."
    },
    "nm_conviction-record-gathering-instructions-9": {
      deliveredAs: "process_guidance", deliveredBy: "participant-instructions.md",
      section: "## How to gather your records first",
      note: "the FBI and DPS RAP sheets, the ninety-day currency rule, the $15.00 DPS fee, the notarised DPS authorisation, and the sentence, fines, fees and restitution documentation."
    },
    "nm_conviction-hearing-expectation-instructions-10": {
      deliveredAs: "process_guidance", deliveredBy: "participant-instructions.md",
      section: "## The hearing",
      note: "that a hearing follows in every case on this track, who is entitled to notice of it, and what the court weighs."
    }
  },
  routeSelectionNote:
    "Nothing in this packet is a route election. Section 29-3A-5 is one section and Rule 1-077.1 is one procedure. The "
    + "waiting period in paragraph 9 of Form 4-953 looks like an election and is not one the ROUTE makes: it is set by "
    + "the degree of the most serious conviction the participant is asking to expunge, which is a fact about their case "
    + "and a legal characterisation of a code section, and the packet asks them to mark the period that matches rather "
    + "than asserting one. Everything the second-stage forms state is a fact about the sixty-three days after the "
    + "petition is served, which have not happened when the packet is prepared.",
  whatToLookAt: [
    "Form 4-953 page 1, the caption and paragraph 1: county, judicial district and name in the caption; date of birth, "
      + "mailing address, city, state and ZIP on their own rules; all three phone boxes and all three alias lines empty.",
    "Form 4-953 page 1, paragraph 2: the judicial district written on all three of its lines, and both printed boxes "
      + "unmarked.",
    "Form 4-953 page 2, paragraph 4: the district court case number written and the other three record lines empty.",
    "Form 4-953 page 2, paragraph 6 and paragraph 9: every conviction detail empty and every one of the five waiting-"
      + "period boxes unmarked. Nothing in this packet asserts a waiting period.",
    "Form 4-953 page 3, paragraph 12: five empty lines. This is the part of the petition that decides it and the "
      + "platform writes none of it.",
    "Form 4-953 page 3, paragraph 13: the judicial district written on the District Court line and on the "
      + "originating-court line, and every sheriff, district-attorney and agency line empty.",
    "Form 4-953 page 4, the SIGNATURE SECTION: the printed name written, the date beside it empty, the signature line "
      + "empty, and nothing written on the full-width divider above the heading.",
    "Form 4-956: the caption written and EVERYTHING ELSE EMPTY. This is a certificate of service and service has not "
      + "happened.",
    "Form 4-960 pages 1 and 2: the caption written, the printed name written, and every one of the eighteen response "
      + "boxes unmarked. The certificate of service at the foot of page 2 and on page 3 entirely empty.",
    "Form 4-960.3: the caption written, the petitioner's name written in the 'I, ____' line and in the signature block, "
      + "and every pending-charge and conviction line empty.",
    "Form 4-960.1 page 1: county, district and name in the caption, the petitioner's name in the notice block; items 1 "
      + "to 5, the judge's name and the TCAA signature block empty.",
    "Form 4-960.1 page 2: EMPTY, but for a DIFFERENT reason than on the identity-theft family. Here the four service "
      + "blocks are the petitioner's to complete for any party that objected; they are required-before-filing rather "
      + "than not-applicable, and they are listed in the instructions.",
    "The Order on Petition to Expunge: the caption written on page 1 and NOTHING ELSE on the four pages.",
    "Form 4-222 pages 1 and 6: the printed \"SIXTH JUDICIAL DISTRICT COURT\" caption, which no field covers and which "
      + "this build cannot change."
  ],
  blockingFindings: [PRINTED_DISTRICT_FINDING],
  findings: [
    {
      finding:
        "SERVICE IS REQUIRED ON THIS TRACK, and that changes the disposition of twenty blanks relative to the "
        + "identity-theft family. Form 4-960.1's four page-2 service blocks are for parties entitled to notice of the "
        + "hearing, which the form's own USE NOTES limit to the petitioner and any party that filed and served an "
        + "objection under Rule 1-077.1(G)(1) NMRA within sixty-three days of the date of service.",
      consequence:
        "On the identity-theft track, where Rule 1-077.1(E) NMRA entitles no responding party to notice, those twenty "
        + "blanks are NOT_APPLICABLE_ON_THIS_ROUTE. Here the petition is served on three parties, an objection can be "
        + "filed, and the same twenty blanks are REQUIRED_BEFORE_FILING and named in participant-instructions.md. The "
        + "shared dictionary takes the route's service posture as a parameter so the two answers cannot be confused, and "
        + "neither was copied from the other."
    },
    {
      finding:
        "Form 4-956 is a certificate of service from end to end, and Form 4-960 carries one at its foot.",
      consequence:
        "The caption of Form 4-956 is written and nothing else on it is. Everything below that caption is the petitioner "
        + "certifying under penalty of perjury when they posted the petition and to whom; service has not happened when "
        + "this packet is prepared and the platform has no knowledge of it. The shared field semantics protect a service "
        + "block for the same reason, and this build agrees with that rather than working round it."
    },
    {
      finding:
        "Forms 4-960 and 4-960.3 are the SECOND STAGE, filed sixty-three days or more after the petition is served. "
        + "Form 4-960 states whether each of the three responding parties filed a non-objection, filed an objection, or "
        + "did nothing; Form 4-960.3 affirms under penalty of perjury that nothing is pending and what the most recent "
        + "conviction was.",
      consequence:
        "Every one of those eighteen response controls and every pending-charge line is the participant's. Nothing about "
        + "the sixty-three day period is knowable when the packet is prepared, and the instructions are organised around "
        + "the sequence -- gather, file, mail, wait, then the second stage -- rather than around the forms."
    },
    {
      finding:
        "The waiting period in paragraph 9 of Form 4-953 offers five boxes: two, four, six, eight or ten or more years. "
        + "Which applies is set by the degree of the most serious conviction being expunged.",
      consequence:
        "The packet asserts none of them. Choosing one is a legal characterisation of a code section, and the platform "
        + "holds no charge degree for this route's intake; the instructions set out which period goes with which class "
        + "of offence and the participant marks the box. Writing a period the record does not establish onto a petition "
        + "sworn under penalty of perjury is the defect this refuses."
    },
    {
      finding:
        "Every glyph on Form 4-222 reports inexact metrics, and Form 4-953 page 3 prints five bullet characters that do "
        + "the same.",
      consequence:
        "Measurability is decided per BASELINE rather than per page: a glyph positioned by a fallback advance shifts "
        + "everything after it on its own line and nothing else. The bullets sit on the five lines of the statutory "
        + "exclusions list, which carry no blanks, so Form 4-953 measures cleanly; every line of Form 4-222 is affected, "
        + "so nothing on it is positioned from text geometry and only its exact AcroForm widget rectangles are used. The "
        + "retained conviction order draws its tick boxes as a symbol-font glyph, so blanks to the right of one on the "
        + "same baseline are recorded with no coordinate at all -- and none of them is a place this build writes."
    },
    {
      finding:
        "The shared fact registry has no descriptor for other names or aliases, and Form 4-953 asks for them on three "
        + "lines. The only name descriptor whose pattern reaches such a line is participant.full_legal_name.",
      consequence:
        "The alias lines are left to the participant and named in the instructions. Binding them to full_legal_name "
        + "would put the petitioner's own legal name on the alias line of a petition sworn under penalty of perjury, and "
        + "adding a descriptor is a change to machinery forty-odd builders share, which a packet-build lane does not make "
        + "mid-cohort. The gap is reported for the owner of the registry."
    },
    {
      finding:
        "The shared fact registry has no one-line mailing-address fact. Its only address descriptor is the street line, "
        + "and four blanks in this packet -- Form 4-953 page 4, Form 4-960 page 2, Form 4-960.3 page 2 and Form 4-960.1 "
        + "page 1 -- give a single line for a whole mailing address.",
      consequence:
        "Those four are left to the participant with the reason stated. A street with no city, on the line the court "
        + "writes to, is worse than a line the participant completes. Reported for the owner of the registry alongside "
        + "the alias gap."
    },
    {
      finding:
        "Form 4-222's caption prints a judicial district that no field covers. See the blocking finding above.",
      consequence:
        "Recorded as blocking, named for visual review, and stated to the participant. The same finding is carried by "
        + "every New Mexico family that binds this fee-waiver component."
    }
  ],
  mattersForTheReviewersAttention: [
    "BLOCKING: Form 4-222 and Form 4-223 print \"SIXTH JUDICIAL DISTRICT COURT\" in their captions with no field over it.",
    "Twenty blanks on Form 4-960.1 page 2 are REQUIRED_BEFORE_FILING here and NOT_APPLICABLE_ON_THIS_ROUTE on "
      + "nm_identity_theft-set. The difference is that this track serves three parties and that one serves nobody. The "
      + "two dispositions should be read together, and the shared dictionary that produces both is "
      + "scripts/rcap-nm-flat-forms/nm-form-4-960-1.mjs.",
    "Form 4-956 is written in its caption only. Counsel should confirm that a caption is not a certification.",
    "Paragraph 9 of Form 4-953 asks the participant to characterise the degree of their own conviction in order to pick "
      + "a waiting period. The packet explains the mapping and asserts nothing. Counsel should confirm the explanation.",
    "The retained Order on Petition to Expunge is one district's form and the packet-set manifest already makes it "
      + "conditional."
  ]
};

export async function runFamily(argv = process.argv.slice(2)) {
  return runNmFamily(FAMILY, argv);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
