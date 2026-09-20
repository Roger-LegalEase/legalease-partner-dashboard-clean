#!/usr/bin/env node
/**
 * The shared Georgia record-restriction packet host.
 *
 *   node scripts/build-census-v1-ga-host.mjs <familyId> [--check] [--no-raster]
 *
 * Nine census-v1 families, one strategy: custom_pleading, composed from
 * codified text. Every family is a filing in an EXISTING Georgia criminal
 * case, styled State of Georgia v. Defendant — never a new civil action,
 * never IN RE, never a Civil Action No. (the controlling state review's
 * correction 9). One host serves all nine because the caption structure, the
 * signature block, the certificate of service, the proposed-order
 * requirements and the local-form warning are one shared specification
 * (PART 3 of the state review); only the statutory ground, the allegations,
 * the exhibits and the notice set differ per family.
 *
 *   ga-misd-j4-set               O.C.G.A. § 35-3-37(j)(4)(A) + (m)  (SB 288)
 *   ga-seal-m-set                O.C.G.A. § 35-3-37(m), (m)(1)
 *   ga-pardon-j7-set             O.C.G.A. § 35-3-37(j)(7)
 *   ga-felony-j1-set             O.C.G.A. § 35-3-37(j)(1)
 *   ga-deaddocket-j3-set         O.C.G.A. § 35-3-37(j)(3)
 *   ga-vacated-j2-set            O.C.G.A. § 35-3-37(j)(2)
 *   ga-fugitive-j5-set           O.C.G.A. § 35-3-37(j)(5), § 17-13-4
 *   ga-fo-active-pre2026-set     O.C.G.A. § 42-8-62.1(c)  (Act 403 / HB 162)
 *   ga-fo-discharged-pre2026-set O.C.G.A. § 42-8-62.2(c)  (Act 403 / HB 162)
 *
 * THE SOURCE DETERMINATION, READ FROM THE RECORDS
 *
 * The MASTER_QUEUE rows for all nine families carry sourceStatus
 * CUSTOM_PLEADING_FROM_CODIFIED_TEXT with an EMPTY boundSources list,
 * officialFormFamily NONE and forms []: no statewide judiciary form exists
 * for any of these filings, which the controlling state review states in
 * terms ("No statewide judiciary form exists for any of these"). The
 * codified text this host composes from is HELD, hashable and read on every
 * build: the Georgia record-clearing legal review of 2026-07-30 in the
 * mounted Master Library, verified byte-exact against the SHA-256 its own
 * STATE_MANIFEST.csv records, with the printed statements this build relies
 * on asserted present before anything is composed. The adopted legal-design
 * intake record (data/record-clearing/legal-design-intake/GA.memo.json) and
 * the packet-set manifests
 * (data/record-clearing/legal-design-packet-set-manifests.json) are the
 * committed records that carry the review's Part 3 specification into the
 * per-track components, inputs, rules and limitations; both are read at
 * build time and their tracks are asserted to match this host's families.
 *
 * Two families (ga-fo-active-pre2026-set, ga-fo-discharged-pre2026-set)
 * additionally NAME two content-hash source ids
 * (source-sha256:05e8621c… and source-sha256:91ff699f…) that the factory's
 * own source-custody reconciliation records as
 * named_content_hash_not_in_corpus / SOURCE_GENUINELY_MISSING. No bytes for
 * either hash exist anywhere in this container — the whole Master Library
 * was hashed file-by-file and neither hash matched. That absence is STATED
 * in each family's source receipt and build findings rather than guessed
 * around; the MASTER_QUEUE marks both families source-ready on the codified
 * text alone (boundCount 0, ready true), and that is what this build uses.
 *
 * WHAT THIS BUILD WRITES, AND WHAT IT CARRIES
 *
 * The platform holds the participant's own identity and contact facts and
 * writes only those: name, mailing address, telephone, email. Every case
 * fact — court, county, case number, OTN, arrest date, code sections,
 * dispositions, dates — belongs to a court record the platform has not
 * seen, so each is a labelled dotted blank declared REQUIRED_BEFORE_FILING
 * and disclosed by its printed label in participant-instructions.md, with
 * the clerk of the named court (or GCIC/GBI for the criminal history, or
 * the State Board of Pardons and Paroles for the pardon certificate) as the
 * checkable authority. No signature, no signature date, no judge, no clerk,
 * no hearing-date field is ever written. Fee, fee waiver and e-filing for a
 * motion in an existing Georgia criminal case are UNRESOLVED and
 * county-specific in the controlling review; no figure is quoted and the
 * clerk of the named court is delegated by name.
 *
 * TERMINOLOGY DISCIPLINE (consumer-harm-grade, per the review's corrections
 * 6): the composed pages say RESTRICT and, separately, SEAL; they never say
 * the record will be erased, destroyed, deleted or otherwise removed, and
 * they never tell a participant they may deny the record exists — the
 * packet states the § 35-3-37(u) qualification instead. The build enforces
 * this with negative anchors over its own output bytes.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this host issues no verdict on its own packets.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { createTokenSplitter, fitsByFontMetrics } from "./rcap-custom-pleading/split-token.mjs";
import { classifyField, classifyBlank, rowKeyOf, PASS_COUNTERS, BLANK_DISPOSITIONS } from "./rcap-packet-completeness/completeness-contract.mjs";
import { preserveIdentityRefresh } from "./rcap-packet-completeness/identity-refresh.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const BUILD_HOST = "scripts/build-census-v1-ga-host.mjs";

/* The machine trailer, recognised the way the Oklahoma composer recognises it.
 * It is the last line every composed component draws. */
const TRAILER_LINE = /^(Route: |Route:$|Routes this set serves \()/;
const MEMO_PATH = "data/record-clearing/legal-design-intake/GA.memo.json";
const MANIFESTS_PATH = "data/record-clearing/legal-design-packet-set-manifests.json";

/* The held codified-text source: the Georgia legal review inside the mounted
 * Master Library, pinned by the SHA-256 its own STATE_MANIFEST.csv records. */
const SOURCE_DOC_ID = "GA-LEGAL-REVIEW-2026-07-30";
const SOURCE_REL = "STATES/GA/01_LEGAL_REVIEW/GA__LEGAL-REVIEW__STATEWIDE__georgia-record-clearing-legal-review__ASOF-2026-07-30__EN.md";
const SOURCE_MANIFEST_REL = "STATES/GA/STATE_MANIFEST.csv";
const PINNED_SHA256 = "85e22768a4cfc27dd0633791fe6ed8a020682c39899144239bbcb95727d6fd22";
const SOURCE_TITLE = "Georgia Record-Clearing Legal Review, as of 2026-07-30 (Master Library Edition 1, controlling state review)";

/* Content-hash source ids named by the two first-offender rows and held
 * NOWHERE in this container (source-custody reconciliation:
 * named_content_hash_not_in_corpus). Stated, never guessed. */
const UNRESOLVABLE_FO_SOURCE_IDS = [
  "source-sha256:05e8621c5addcf06a7e2c52e909035c54ce55a3df5e8894bef06973a98ad8be5",
  "source-sha256:91ff699f809ee9c78e9c0fe1e99a392624b01e0173f4754bf80a8bd3410cdec8"
];

function corpusRoot() {
  const configured = process.env.MASTER_LIBRARY_SOURCE_DIR
    ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
  // The VT corpusRoot() defect class: an env-var path must never be joined
  // onto ROOT when it is already absolute.
  const resolved = path.isAbsolute(configured) ? configured : path.resolve(ROOT, configured);
  assert.ok(fs.existsSync(resolved), `the Master Library is not mounted at ${resolved}`);
  return resolved;
}

/* Statements of the shared specification this build RELIES ON, asserted
 * present in the held source bytes before anything is composed. */
const FACE_ANCHORS = [
  "PART 3: CUSTOM-PLEADING SPECIFICATION",
  "IN THE [COURT] OF [COUNTY] COUNTY",
  "It must not default to Superior Court.",
  "Defendant's Motion to Restrict and Seal Records of a Misdemeanor Conviction",
  "Defendant's Motion to Seal Clerk of Court Records",
  "Petition to Restrict Access to Criminal History Record Information Following Pardon",
  "Petition to Restrict Access to Criminal History Record Information (Felony Charge)",
  "Petition to Restrict Access to Criminal History Record Information (Dead Docket)",
  "Petition to Restrict and Seal First Offender Records (Active) / (Completed)",
  "A restriction order that does not name GCIC is not actionable.",
  "confirm the filing method with the clerk before filing",
  "Defendant, Pro Se",
  "identified as District Attorney or Solicitor-General",
  "registered mail, certified mail or statutory overnight delivery",
  "Include the OTN wherever known.",
  "limit disclosure to what § 35-3-37(t) and (v) permit",
  "the arresting agency and the jail or detention center",
  "record restriction",
  "35-3-37(u)",
  "42-8-62.1",
  "42-8-62.2",
  "fugitive from justice warrant",
  "within four years of the arrest",
  "dead docket"
];

/* Words the composed pages must NEVER carry: Georgia stopped saying
 * "expungement" in 2013 and neither remedy destroys the record; telling a
 * participant a record is erased or deniable is the review's
 * consumer-harm-grade error 6. Checked over the extracted text of every
 * rendered page. */
const NEGATIVE_ANCHORS = ["expunge", "expunged", "expungement", "erased", "destroyed", "deleted", "record does not exist"];

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";

const DOTS = (n = 84) => ".".repeat(n);

/* ---- fixtures ---------------------------------------------------------------- *
 * Two participants. The boundary one carries a long hyphenated name with an
 * apostrophe, a long one-line mailing address, a long email and a phone
 * extension, because a value that fits the line is not evidence that every
 * value does. No case fact is held: every one lives on a court record the
 * platform has not seen. */
const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.street_address": "42 Peachtree Lane, Atlanta, GA 30303",
    "participant.phone": "404-555-0142",
    "participant.email": "jordan.reyes@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B, Savannah, Georgia 31401-2214",
    "participant.phone": "(912) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
  }
};

const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";

/* ---- shared field helpers ----------------------------------------------------- */
const rbf = (id, label, supply, why) => ({ kind: "rbf", id, label, supply, why });
const sig = (id, label, why) => ({ kind: "sig", id, label, why });
const court = (id, label, why) => ({ kind: "court", id, label, why });
/* A recipient block whose label names the prosecuting ATTORNEY: the shared
 * completeness contract routes it through the attorney-block path on the
 * reason text, exactly as the proven Virginia service page does. */
const attorneyBlock = (id, label, supply, why) => ({ kind: "attorney", id, label, supply, why });

/* Caption facts shared by every family. The caption parenthetical is the
 * printed label; each family words its own venue formula. */
const captionFacts = (F) => [
  rbf("caption_court_and_county", F.captionLabel,
    F.captionSupply,
    "which court handled the case, and its level - State, Superior, Magistrate, Probate or Municipal - is data the participant's own case papers carry; the packet must not default to Superior Court"),
  rbf("case_number", "Case number of the existing criminal case, exactly as it appears on the court record" + (F.caseNumberOptional ? ", if one was given" : ""),
    F.caseNumberSupply ?? `the case number of the existing criminal case, copied exactly from the court record - ${F.clerkAuthority} holds the case papers`,
    "the filing is made in the existing criminal case under the existing case number, and that number lives on a record the platform has not seen"),
  rbf("otn", "GCIC Offender Tracking Number (OTN) for the case, where known",
    "the GCIC OTN for the case, copied from your Georgia criminal history report where it appears - the proposed order needs it to be actionable by GCIC, and the packet is usable without it",
    "the OTN lives on the criminal history record, which the platform never collects, inspects or authenticates")
];

const captionJudgeBlank = court("caption_judge", "Judge assigned to the case, shown in the caption",
  "the court assigns the judge after filing");

const signatureBlanks = (instrument) => [
  sig("defendant_signature", `Signature of the defendant on the ${instrument}`,
    `the ${instrument} is the participant's own filing and is signed personally, "Defendant, Pro Se" where unrepresented`),
  sig("signature_date", `Date beside the defendant's signature on the ${instrument}`,
    `a date written before the ${instrument} is signed would be false`)
];

/* ---- the nine family specifications ------------------------------------------- *
 * Every sentence below is traceable to one of three records, named in the
 * source receipt: [REVIEW] the pinned Georgia legal review's own text,
 * [MEMO] GA.memo.json track by trackId, [MANIFEST] the packet-set manifest
 * by packetSetId. Nothing is stated that none of the three records. */
const FAMILIES = {
  "ga-misd-j4-set": {
    trackId: "ga-misd-j4",
    routeKeys: ["obligation:track-pathway:GA:ga-misd-j4:sb-288-misdemeanor-conviction-restriction-and-sealing"],
    legalName: "Motion to Restrict and Seal Records of a Misdemeanor Conviction under the Georgia Second Chance Act",
    routeName: "restricting and sealing a Georgia misdemeanor conviction under the Second Chance Act, O.C.G.A. Sec. 35-3-37(j)(4)(A) and Sec. 35-3-37(m)",
    citations: ["O.C.G.A. § 35-3-37(j)(4)(A)", "O.C.G.A. § 35-3-37(j)(4)(B)", "O.C.G.A. § 35-3-37(j)(4)(C)", "O.C.G.A. § 35-3-37(m)", "2020 Ga. Laws 582, § 1-1 (SB 288)"],
    statute: "O.C.G.A. § 35-3-37(j)(4)(A) and § 35-3-37(m)",
    instrument: "motion",
    title: "Defendant's Motion to Restrict and Seal Records of a Misdemeanor Conviction",
    orderTitle: "Order Restricting Access to Criminal History Record Information and Sealing the Record of the Case",
    captionLabel: "Court and county named in the caption - the court that entered the conviction, and its county (State, Superior, Magistrate, Probate or Municipal; your own case papers name both, and the instructions page says who can confirm them)",
    captionSupply: "the name and level of the court that entered the conviction, and its county, from your case papers - the clerk of the convicting court can confirm both",
    clerkAuthority: "the clerk of the convicting court",
    venueLine: "Filed with the clerk of the convicting court, in the existing criminal case under the existing case number.",
    serviceMethods: "certified mail, e-filing or hand delivery",
    certAgency: false,
    hearingPrayer: "and, in the alternative, that the motion be set for hearing within 90 days of filing",
    allegations: [
      "The defendant was convicted of a misdemeanor offense, or of a series of misdemeanor offenses arising from a single incident, in the above-styled case.",
      "The defendant has completed the terms of the sentence, including any probation, fines and restitution.",
      "The defendant has not been convicted of any crime in any jurisdiction, excluding nonserious traffic offenses, for at least four years immediately preceding the filing of this motion.",
      "The defendant has no pending charged offenses in any jurisdiction.",
      "The offense of conviction is not an offense excluded by O.C.G.A. Sec. 35-3-37(j)(4)(B), and the lifetime maximum of two restrictions under O.C.G.A. Sec. 35-3-37(j)(4)(C) has not been reached. The exclusions turn on the exact Code section of conviction, which the defendant states below.",
      "The harm otherwise resulting to the defendant clearly outweighs the public interest in the criminal history record information being publicly available."
    ],
    petitionFacts: [
      rbf("arrest_date", "Date of arrest in this case", "the date of arrest, taken from the case papers or your Georgia criminal history report", "no arrest fact is held for a record the platform has not seen"),
      rbf("adjudication_date", "Date the adjudication of guilt was entered", "the date the adjudication of guilt was entered, from the final disposition - the clerk of the convicting court holds it", "no disposition fact is held for a record the platform has not seen"),
      rbf("offense_code_section", "Exact O.C.G.A. Code section of the misdemeanor conviction to be restricted", "the exact O.C.G.A. Code section you were convicted under, from the final disposition - the offense label is not enough; the exclusions turn on the exact Code section", "no charge fact is held for a record the platform has not seen"),
      rbf("sentence_terms_and_completion", "Terms of the sentence, itemized, and the date every term was completed", "each term of the sentence - probation, fines, restitution - and the date you finished the last of them, checked against the final disposition or a probation termination order", "no sentence fact is held for a record the platform has not seen")
    ],
    narrative: rbf("participant_narrative", "Your own statement of what has changed in your life and how this record has been a barrier",
      "your own first-hand account of what has changed and how the record has been a barrier - these lines are yours alone and nothing on them is written for you",
      "the platform prompts for and formats the participant's own account; it does not write the privacy-harm narrative"),
    prayerLines: [
      "WHEREFORE, the defendant asks the Court to enter an order directing the Georgia Crime Information Center (GCIC) and every agency in the county named in the caption, including the arresting agency and the jail or detention center, to restrict all criminal history record information pertaining to this case, pursuant to O.C.G.A. Sec. 35-3-37(j)(4)(A); directing the Clerk of the named court to seal the record of the case, including index references and online records, pursuant to O.C.G.A. Sec. 35-3-37(m), with disclosure limited to what O.C.G.A. Sec. 35-3-37(t) and (v) permit"
    ],
    orderLines: [
      "Before the Court is the Defendant's Motion to Restrict and Seal Records of a Misdemeanor Conviction under O.C.G.A. Sec. 35-3-37(j)(4)(A) and Sec. 35-3-37(m).",
      "IT IS ORDERED that the Georgia Crime Information Center (GCIC) and every agency in the county named in the caption, including the arresting agency and the jail or detention center, restrict all criminal history record information pertaining to this case, identified by the OTN and the date of arrest stated below, pursuant to O.C.G.A. Sec. 35-3-37(j)(4)(A).",
      "IT IS FURTHER ORDERED that the Clerk of the court named in the caption seal the record of this case, including index references and online records, pursuant to O.C.G.A. Sec. 35-3-37(m).",
      "Disclosure of the restricted and sealed information remains limited to what O.C.G.A. Sec. 35-3-37(t) and (v) permit."
    ],
    exhibits: [
      { id: "exhibit_a_final_disposition", letter: "A", name: "Final disposition", requirement: "required", condition: null,
        attach: "a copy of the final disposition of this case", from: "the clerk of the convicting court",
        how: "Ask the clerk of the convicting court for a copy of the final disposition and attach it behind this page." },
      { id: "exhibit_b_criminal_history", letter: "B", name: "Georgia criminal history report", requirement: "conditional",
        condition: "Attach this only where you rely on it or the court expects it.",
        attach: "your own Georgia criminal history report", from: "most Georgia sheriff's offices and police departments, or GCIC",
        how: "GBI's guidance says a Georgia criminal history record can be obtained from most sheriff's offices or police departments, with requirements varying by agency. Bring government photo identification and the agency's fee." },
      { id: "exhibit_c_sentence_completion", letter: "C", name: "Proof of sentence completion", requirement: "conditional",
        condition: "Attach this only where you have it, such as a probation termination order.",
        attach: "proof that every term of the sentence was completed, such as a probation termination order", from: "the clerk of the convicting court, or the supervising probation office",
        how: "Ask the clerk of the convicting court or the supervising probation office for the order terminating probation or documentation that the sentence was completed." },
      { id: "exhibit_d_supporting_exhibits", letter: "D", name: "Participant-supplied supporting exhibits", requirement: "conditional",
        condition: "Attach these only where you choose to supply them.",
        attach: "supporting exhibits you choose to supply: diplomas, certificates, letters of support, treatment records, evidence of community involvement", from: "your own records",
        how: "The packet formats what you supply and assesses none of it." }
    ],
    stopConditions: [
      "The prosecuting attorney opposes the filing.",
      "The court sets a contested hearing or takes evidence on disputed facts.",
      "Any immigration consequence is in play.",
      "You want to attack the underlying conviction itself.",
      "Venue is unclear because the trial court no longer exists or the records cannot be located.",
      "The offense classification under the O.C.G.A. Sec. 35-3-37(j)(4)(B) exclusion list is disputed.",
      "You have an out-of-state conviction inside the four-year window.",
      "You may have already used both lifetime restriction slots.",
      "You have pending charges."
    ],
    timingNotes: [
      "The four-year rule measures four conviction-free years BACKWARD from the day you file, and separately requires that every term of the sentence is complete. Any intervening conviction resets it.",
      "A petition on the same conviction denied less than two years ago, measured from the final order, cannot be refiled yet.",
      "Where a hearing is requested, it must be held within 90 days of filing."
    ],
    familyCounselQuestions: [
      "Whether any Georgia court treats a combined § 35-3-37(j)(4) and § 35-3-37(m) motion as premature, given that (m)(1) applies on its face to an individual who already has a record restricted. No adverse decision was found and the leading pro se practice combines them; counsel is asked to ratify the combined instrument expressly.",
      "Whether restriction under § 35-3-37 reaches Municipal Court records where a state-law offense was tried in a court that is not a court of record."
    ],
    familyFindings: [
      {
        finding: "The motion combines restriction under § 35-3-37(j)(4)(A) with clerk sealing under § 35-3-37(m) in one instrument, as the adopted legal-design record and the leading Georgia pro se practice direct, while (m)(1) on its face reads sequentially.",
        consequence: "The combined instrument is rendered as the record directs, and the sequencing question travels to counsel review as an express ratification request in approval-request.json."
      }
    ]
  },

  "ga-seal-m-set": {
    trackId: "ga-seal-m",
    routeKeys: [
      "obligation:track-pathway:GA:ga-seal-m:restriction-and-sealing-of-a-pardoned-felony",
      "obligation:track-pathway:GA:ga-seal-m:sb-288-misdemeanor-conviction-restriction-and-sealing"
    ],
    legalName: "Motion to Seal Clerk of Court Records under O.C.G.A. § 35-3-37(m)",
    routeName: "sealing the clerk of court's file for a Georgia case whose record is already restricted, under O.C.G.A. Sec. 35-3-37(m)",
    citations: ["O.C.G.A. § 35-3-37(m)", "O.C.G.A. § 35-3-37(m)(1)", "O.C.G.A. § 35-3-37(t)", "O.C.G.A. § 35-3-37(v)"],
    statute: "O.C.G.A. § 35-3-37(m)",
    instrument: "motion",
    title: "Defendant's Motion to Seal Clerk of Court Records",
    orderTitle: "Order Sealing the Clerk of Court's Records of the Case",
    captionLabel: "Court and county named in the caption - the court with original jurisdiction over the offenses, in the county where the clerk of court that holds the file is located (State, Superior, Magistrate, Probate or Municipal)",
    captionSupply: "the name and level of the court with original jurisdiction over the offenses, and the county where the clerk of court that holds the file is located - the clerk's office can confirm both",
    clerkAuthority: "the clerk of the court that holds the file",
    venueLine: "Filed in the underlying criminal case with the clerk of the court with original jurisdiction over the offenses, in the county where that clerk is located.",
    serviceMethods: "registered mail, certified mail or statutory overnight delivery (statutorily sufficient under O.C.G.A. Sec. 35-3-37(m)(1))",
    certAgency: false,
    hearingPrayer: "and, in the alternative, that the motion be set for hearing",
    allegations: [
      "The record of the above-styled case has been restricted under O.C.G.A. Sec. 35-3-37. The defendant's Georgia criminal history report showing the case as restricted is attached as Exhibit B; it is the proof of this element.",
      "The harm otherwise resulting to the privacy of the defendant clearly outweighs the public interest in the criminal history record information being publicly available."
    ],
    petitionFacts: [
      rbf("arrest_date", "Date of arrest in this case", "the date of arrest, taken from the case papers or your Georgia criminal history report", "no arrest fact is held for a record the platform has not seen"),
      rbf("case_disposition", "How the case ended, worded as the court record words it", "how the case ended, copied from the final disposition - the clerk of the court that holds the file can provide it", "no disposition fact is held for a record the platform has not seen"),
      rbf("restriction_route", "The route under which the record was restricted - automatically on a non-conviction, on a pre-2013 application, or by court order", "how the record came to be restricted, checked against your Georgia criminal history report; if the report does not show the case as restricted, stop - a restriction route comes first, and this motion is premature", "which restriction mechanism ran is a fact of the participant's own record, which the platform never collects, inspects or authenticates")
    ],
    narrative: rbf("participant_narrative", "Your own statement of how this court file being public has harmed you",
      "your own first-hand account of how the public court file has harmed you - these lines are yours alone and nothing on them is written for you",
      "the platform prompts for and formats the participant's own account; it does not write the privacy-harm narrative"),
    prayerLines: [
      "WHEREFORE, the defendant asks the Court to enter an order directing the Clerk of the court named in the caption to seal the criminal history record information in the clerk's custody, possession or control, including any index, and make it unavailable to the public, pursuant to O.C.G.A. Sec. 35-3-37(m), with disclosure limited to what O.C.G.A. Sec. 35-3-37(t) and (v) permit"
    ],
    orderLines: [
      "Before the Court is the Defendant's Motion to Seal Clerk of Court Records under O.C.G.A. Sec. 35-3-37(m).",
      "The Court finds by a preponderance of the evidence that the record of this case has been restricted under O.C.G.A. Sec. 35-3-37 and that the harm otherwise resulting to the privacy of the defendant clearly outweighs the public interest in the information being publicly available.",
      "IT IS ORDERED that the Clerk of the court named in the caption seal the criminal history record information of this case in the clerk's custody, possession or control, including any index and any online record, identified by the OTN and the date of arrest stated below, and make it unavailable to the public, pursuant to O.C.G.A. Sec. 35-3-37(m). The clerk has 60 days after this order to restrict every document in the clerk's custody, possession or control.",
      "Disclosure of the sealed information remains limited to what O.C.G.A. Sec. 35-3-37(t) and (v) permit."
    ],
    exhibits: [
      { id: "exhibit_a_final_disposition", letter: "A", name: "Final disposition", requirement: "required", condition: null,
        attach: "a copy of the final disposition of this case", from: "the clerk of the court that handled the case",
        how: "Ask the clerk for a copy of the final disposition and attach it behind this page." },
      { id: "exhibit_b_criminal_history_restricted", letter: "B", name: "Georgia criminal history report showing the case is restricted", requirement: "required", condition: null,
        attach: "your own Georgia criminal history report showing this case as restricted - it is the proof of the first statutory element", from: "most Georgia sheriff's offices and police departments, or GCIC",
        how: "Obtain the report and confirm the cycle shows as restricted before filing. If it does not, stop: a restriction route comes first, and this motion is premature." },
      { id: "exhibit_c_privacy_exhibits", letter: "C", name: "Exhibits supporting your own privacy-harm account", requirement: "conditional",
        condition: "Attach these only where you choose to supply them.",
        attach: "exhibits supporting your own privacy-harm account", from: "your own records",
        how: "The packet formats what you supply and assesses none of it." }
    ],
    stopConditions: [
      "The prosecuting attorney opposes the filing.",
      "The court sets a contested hearing or takes evidence on disputed facts.",
      "Any immigration consequence is in play.",
      "You want to attack the underlying conviction or charge itself.",
      "Venue is unclear because the trial court no longer exists or the records cannot be located.",
      "Your criminal history does not show the case as restricted - a restriction route comes first.",
      "The clerk objects.",
      "The county maintains parallel online records the order may not reach."
    ],
    timingNotes: [
      "After the order, the clerk has 60 days to restrict every document, physical or electronic, in the clerk's custody, possession or control.",
      "O.C.G.A. Sec. 35-3-37(t) and (v) keep sealed files available for the enumerated purposes.",
      "The order may not reach parallel online records some counties maintain. This packet says so rather than promising a clean public search result."
    ],
    familyCounselQuestions: [
      "Whether the § 35-3-37(m) clerk-sealing venue formula reaches a Municipal Court file where a state-law offense was tried in a court that is not a court of record."
    ],
    familyFindings: [
      {
        finding: "Prior restriction is the defining gate of this route: (m)(1) applies to an individual who has a record restricted under the Code section, and the criminal history report showing the restriction is the proof of that element.",
        consequence: "The report is a REQUIRED exhibit, the motion pleads it as the proof of element one, and the instructions tell the participant to stop and pursue a restriction route first where the report does not show the case as restricted."
      }
    ]
  },

  "ga-pardon-j7-set": {
    trackId: "ga-pardon-j7",
    routeKeys: ["obligation:track-pathway:GA:ga-pardon-j7:restriction-and-sealing-of-a-pardoned-felony"],
    legalName: "Petition to Restrict Access to Criminal History Record Information Following a Pardon",
    routeName: "restricting a pardoned Georgia conviction under O.C.G.A. Sec. 35-3-37(j)(7)",
    citations: ["O.C.G.A. § 35-3-37(j)(7)", "O.C.G.A. § 42-9-42", "O.C.G.A. § 17-10-6.1", "O.C.G.A. § 17-10-6.2"],
    statute: "O.C.G.A. § 35-3-37(j)(7)",
    instrument: "petition",
    title: "Petition to Restrict Access to Criminal History Record Information Following Pardon",
    orderTitle: "Order Restricting Access to Criminal History Record Information",
    captionLabel: "Court and county named in the caption - the court in which the conviction occurred, and its county (State, Superior, Magistrate, Probate or Municipal; your own case papers name both, and the instructions page says who can confirm them)",
    captionSupply: "the name and level of the court in which the conviction occurred, and its county, from your case papers - the clerk of the convicting court can confirm both",
    clerkAuthority: "the clerk of the convicting court",
    venueLine: "Filed in the existing criminal case with the clerk of the convicting court.",
    serviceMethods: "certified mail, e-filing or hand delivery",
    certAgency: false,
    hearingPrayer: "and, in the alternative, that the petition be set for hearing within 90 days of filing",
    allegations: [
      "The defendant was convicted of an offense in the above-styled case, and the State Board of Pardons and Paroles has pardoned that conviction. The pardon certificate is attached as Exhibit B.",
      "The offense of conviction was not a serious violent felony as defined in O.C.G.A. Sec. 17-10-6.1 and was not a sexual offense as defined in O.C.G.A. Sec. 17-10-6.2. Those exclusions turn on the exact Code section of conviction, which the defendant states below.",
      "The defendant has not been convicted of any crime in any jurisdiction, excluding nonserious traffic offenses, since the pardon was granted.",
      "The defendant has no pending charged offenses in any jurisdiction.",
      "The harm otherwise resulting to the defendant clearly outweighs the public interest in the criminal history record information being publicly available."
    ],
    petitionFacts: [
      rbf("arrest_date", "Date of arrest in this case", "the date of arrest, taken from the case papers or your Georgia criminal history report", "no arrest fact is held for a record the platform has not seen"),
      rbf("offense_code_section", "Exact O.C.G.A. Code section of the conviction that was pardoned", "the exact O.C.G.A. Code section you were convicted under, from the final disposition - the Sec. 17-10-6.1 and Sec. 17-10-6.2 exclusions are applied to a Code section, not to an offense label", "no charge fact is held for a record the platform has not seen"),
      rbf("pardon_date", "Date the State Board of Pardons and Paroles granted the pardon", "the date on the pardon certificate - the State Board of Pardons and Paroles issued it and can provide a copy", "the pardon certificate is obtained by the participant and the platform never collects, inspects or authenticates it")
    ],
    narrative: rbf("participant_narrative", "Your own statement of what has changed and how this record has been a barrier",
      "your own first-hand account of what has changed and how the record has been a barrier - these lines are yours alone and nothing on them is written for you",
      "the platform prompts for and formats the participant's own account; it does not write the privacy-harm narrative"),
    prayerLines: [
      "WHEREFORE, the defendant asks the Court to enter an order directing the Georgia Crime Information Center (GCIC) and every agency in the county named in the caption, including the arresting agency and the jail or detention center, to restrict all criminal history record information pertaining to this case, pursuant to O.C.G.A. Sec. 35-3-37(j)(7), with disclosure limited to what O.C.G.A. Sec. 35-3-37(t) and (v) permit"
    ],
    orderLines: [
      "Before the Court is the defendant's Petition to Restrict Access to Criminal History Record Information Following Pardon under O.C.G.A. Sec. 35-3-37(j)(7).",
      "IT IS ORDERED that the Georgia Crime Information Center (GCIC) and every agency in the county named in the caption, including the arresting agency and the jail or detention center, restrict all criminal history record information pertaining to this case, identified by the OTN and the date of arrest stated below, pursuant to O.C.G.A. Sec. 35-3-37(j)(7).",
      "Disclosure of the restricted information remains limited to what O.C.G.A. Sec. 35-3-37(t) and (v) permit."
    ],
    exhibits: [
      { id: "exhibit_a_final_disposition", letter: "A", name: "Final disposition", requirement: "required", condition: null,
        attach: "a copy of the final disposition of this case", from: "the clerk of the convicting court",
        how: "Ask the clerk of the convicting court for a copy of the final disposition and attach it behind this page." },
      { id: "exhibit_b_pardon_certificate", letter: "B", name: "Pardon certificate", requirement: "required", condition: null,
        attach: "the pardon certificate for this conviction", from: "the State Board of Pardons and Paroles",
        how: "Request a copy of the pardon certificate from the State Board of Pardons and Paroles and attach it behind this page." },
      { id: "exhibit_c_supporting_exhibits", letter: "C", name: "Participant-supplied supporting exhibits", requirement: "conditional",
        condition: "Attach these only where you choose to supply them.",
        attach: "supporting exhibits you choose to supply", from: "your own records",
        how: "The packet formats what you supply and assesses none of it." }
    ],
    stopConditions: [
      "The prosecuting attorney opposes the filing.",
      "The court sets a contested hearing or takes evidence on disputed facts.",
      "Any immigration consequence is in play.",
      "You want to attack the underlying conviction itself.",
      "Venue is unclear because the trial court no longer exists or the records cannot be located.",
      "The pardon status is unclear.",
      "The offense classification under O.C.G.A. Sec. 17-10-6.1 or Sec. 17-10-6.2 is disputed.",
      "You are still seeking the pardon - the pardon application itself is outside this packet's scope; this route begins once a pardon exists."
    ],
    timingNotes: [
      "The pardon is the starting event; there is no waiting period independent of it. There must be no conviction of any crime in any jurisdiction, excluding nonserious traffic offenses, at any time since the pardon was granted.",
      "Where a hearing is requested, it must be held within 90 days of filing."
    ],
    familyCounselQuestions: [
      "Whether the § 17-10-6.1 serious-violent-felony and § 17-10-6.2 sexual-offense exclusions, applied here to the exact Code section the participant states, need any additional per-offense analysis before promotion."
    ],
    familyFindings: [
      {
        finding: "The pardon application to the State Board of Pardons and Paroles is outside scope; this route begins once a pardon exists, and the pardon certificate is a required exhibit obtained by the participant.",
        consequence: "The petition pleads the pardon from the participant's own certificate, attached as Exhibit B, and the packet directs a participant still seeking a pardon to stop."
      }
    ]
  },

  "ga-felony-j1-set": {
    trackId: "ga-felony-j1",
    routeKeys: ["obligation:track-only:GA:ga-felony-j1"],
    legalName: "Petition to Restrict Access to Criminal History Record Information for a Felony Charge Resolved Without Conviction",
    routeName: "restricting a Georgia felony charge that was resolved without conviction while you were convicted only of a separate misdemeanor, under O.C.G.A. Sec. 35-3-37(j)(1)",
    citations: ["O.C.G.A. § 35-3-37(j)(1)"],
    statute: "O.C.G.A. § 35-3-37(j)(1)",
    instrument: "petition",
    title: "Petition to Restrict Access to Criminal History Record Information (Felony Charge)",
    orderTitle: "Order Restricting Access to Criminal History Record Information (Felony Charge Only)",
    captionLabel: "Court and county named in the caption - the court in which you were accused or convicted, and its county; or, where the felony charge was dismissed, the Superior Court of the county where the arrest occurred (State, Superior, Magistrate, Probate or Municipal; your own case papers name it, and the instructions page says who can confirm it)",
    captionSupply: "the name and level of the court in which you were accused or convicted and its county - or, where the felony charge was dismissed, the Superior Court of the county of arrest; the clerk's office can confirm which court is right",
    clerkAuthority: "the clerk of the accusing or convicting court (or of the Superior Court of the county of arrest, where the charge was dismissed)",
    venueLine: "Filed in the existing criminal case, in the court in which you were accused or convicted; or, where the felony charge was dismissed, in the Superior Court of the county where the arrest occurred. The petition must be filed within four years of the arrest.",
    serviceMethods: "certified mail, e-filing or hand delivery",
    certAgency: true,
    hearingPrayer: "and, in the alternative, that the petition be set for hearing within 90 days of filing",
    allegations: [
      "The defendant was charged with a felony offense in the above-styled case. That felony charge was dismissed or nolle prossed, or the defendant was found not guilty of it, while the defendant was convicted of a misdemeanor offense.",
      "The defendant asserts that the misdemeanor offense of conviction was not a lesser included offense of the felony charge. This is the defendant's own assertion, or defendant's counsel's; this packet does not generate that conclusion, and attorney review of it is recommended before filing.",
      "This petition is filed within four years of the date of arrest stated below. The four-year period is a filing deadline running from the arrest.",
      "The harm otherwise resulting to the defendant clearly outweighs the public interest in the criminal history record information being publicly available.",
      "The relief requested restricts the felony charge only and does not reach the misdemeanor conviction."
    ],
    petitionFacts: [
      rbf("arrest_date", "Date of arrest in this case - the four-year filing deadline runs from this date", "the date of arrest, from the case papers or your Georgia criminal history report - the petition must be filed within four years of it", "no arrest fact is held for a record the platform has not seen"),
      rbf("county_of_arrest", "Georgia county in which the arrest occurred", "the county where you were arrested, from the case papers", "no arrest fact is held for a record the platform has not seen"),
      rbf("felony_code_section", "Exact O.C.G.A. Code section of the felony charge to be restricted", "the exact O.C.G.A. Code section of the felony charge, from the case papers", "no charge fact is held for a record the platform has not seen"),
      rbf("felony_disposition", "How the felony charge was resolved - dismissed, nolle prossed, or found not guilty", "how the felony charge was resolved, checked against the final disposition and corrected where they disagree", "no disposition fact is held for a record the platform has not seen"),
      rbf("misdemeanor_code_section", "Exact O.C.G.A. Code section of the misdemeanor conviction", "the exact O.C.G.A. Code section of the misdemeanor you were convicted of, from the final disposition - the lesser-included assertion is applied to the two Code sections", "no charge fact is held for a record the platform has not seen")
    ],
    narrative: rbf("participant_narrative", "Your own statement of what has changed and how this felony charge on your record has been a barrier",
      "your own first-hand account of what has changed and how the felony charge on your record has been a barrier - these lines are yours alone and nothing on them is written for you",
      "the platform prompts for and formats the participant's own account; it does not write the privacy-harm narrative"),
    prayerLines: [
      "WHEREFORE, the defendant asks the Court to enter an order directing the Georgia Crime Information Center (GCIC) and every agency in the county named in the caption, including the arresting agency and the jail or detention center, to restrict all criminal history record information pertaining to the felony charge only, pursuant to O.C.G.A. Sec. 35-3-37(j)(1), with disclosure limited to what O.C.G.A. Sec. 35-3-37(t) and (v) permit"
    ],
    orderLines: [
      "Before the Court is the defendant's Petition to Restrict Access to Criminal History Record Information (Felony Charge) under O.C.G.A. Sec. 35-3-37(j)(1).",
      "IT IS ORDERED that the Georgia Crime Information Center (GCIC) and every agency in the county named in the caption, including the arresting agency and the jail or detention center, restrict all criminal history record information pertaining to the felony charge in this case, identified by the OTN and the date of arrest stated below, pursuant to O.C.G.A. Sec. 35-3-37(j)(1).",
      "This order restricts the felony charge only. It does not reach the misdemeanor conviction.",
      "Disclosure of the restricted information remains limited to what O.C.G.A. Sec. 35-3-37(t) and (v) permit."
    ],
    exhibits: [
      { id: "exhibit_a_final_disposition", letter: "A", name: "Final disposition", requirement: "required", condition: null,
        attach: "a copy of the final disposition of this case", from: "the clerk of the court that handled the case",
        how: "Ask the clerk of the convicting or accusing court for a copy of the final disposition and attach it behind this page." },
      { id: "exhibit_b_criminal_history", letter: "B", name: "Georgia criminal history report", requirement: "conditional",
        condition: "Attach this only where you rely on it or the court expects it.",
        attach: "your own Georgia criminal history report", from: "most Georgia sheriff's offices and police departments, or GCIC",
        how: "GBI's guidance says a Georgia criminal history record can be obtained from most sheriff's offices or police departments, with requirements varying by agency." }
    ],
    stopConditions: [
      "The prosecuting attorney opposes the filing.",
      "The court sets a contested hearing or takes evidence on disputed facts.",
      "Any immigration consequence is in play.",
      "You want to attack the underlying conviction or charge itself.",
      "Venue is unclear because the trial court no longer exists or the records cannot be located.",
      "The lesser-included analysis is not obvious on the face of the two Code sections.",
      "The four-year filing window from the arrest is close.",
      "The arresting agency disputes service or the record."
    ],
    timingNotes: [
      "The petition must be filed WITHIN FOUR YEARS OF THE ARREST. This is a hard filing deadline running from the arrest date - not a waiting period - and it is the opposite of every other Georgia route.",
      "Notice goes to the arresting law enforcement agency AND the prosecuting attorney - broader than the other Sec. 35-3-37(j) routes.",
      "The relief restricts the felony charge only and does not reach the misdemeanor conviction.",
      "Where a hearing is requested, it must be held within 90 days of filing."
    ],
    familyCounselQuestions: [
      "The petition pleads the participant's own assertion that the misdemeanor of conviction was not a lesser included offense of the felony charge, and the engine routes to attorney review by default. Confirm that presentation.",
      "The four-year limitations period runs from arrest; confirm the packet's deadline warnings are sufficient where the window is close."
    ],
    familyFindings: [
      {
        finding: "The one conclusion this packet must not generate - that the misdemeanor of conviction was not a lesser included offense of the felony charge - is a legal conclusion the participant or counsel asserts.",
        consequence: "The petition pleads it expressly as the defendant's own assertion, prints the recommendation of attorney review on its face, and the engine routes to attorney review by default."
      },
      {
        finding: "The four-year period is a limitations deadline running from arrest, not a waiting period, and an eligibility engine that conflates them silently produces false positives.",
        consequence: "The packet states the deadline as a deadline everywhere it appears, and the arrest-date blank's own label carries the warning."
      }
    ]
  },

  "ga-deaddocket-j3-set": {
    trackId: "ga-deaddocket-j3",
    routeKeys: ["obligation:track-only:GA:ga-deaddocket-j3"],
    legalName: "Petition to Restrict Access to Criminal History Record Information for a Charge Dead Docketed for More Than 12 Months",
    routeName: "restricting a Georgia charge that has been on the dead docket for more than 12 months, under O.C.G.A. Sec. 35-3-37(j)(3)",
    citations: ["O.C.G.A. § 35-3-37(j)(3)"],
    statute: "O.C.G.A. § 35-3-37(j)(3)",
    instrument: "petition",
    title: "Petition to Restrict Access to Criminal History Record Information (Dead Docket)",
    orderTitle: "Order Restricting Access to Criminal History Record Information",
    captionLabel: "Court and county named in the caption - the court in which the charged offense is pending, and its county (State, Superior, Magistrate, Probate or Municipal; your own case papers name both, and the instructions page says who can confirm them)",
    captionSupply: "the name and level of the court in which the charge is pending, and its county, from your case papers - the clerk of that court can confirm both",
    clerkAuthority: "the clerk of the court in which the charge is pending",
    venueLine: "Filed in the pending criminal case with the clerk of the court in which the charged offense is pending.",
    serviceMethods: "certified mail, e-filing or hand delivery",
    certAgency: false,
    hearingPrayer: "and, in the alternative, that the petition be set for hearing within 90 days of filing",
    allegations: [
      "The charged offense in the above-styled case has been placed on the dead docket and has remained on the dead docket for more than 12 months, as of the filing of this petition.",
      "No active warrant is pending for the defendant in any jurisdiction. An active warrant is an absolute bar to this relief: the court shall not grant the petition if one is pending.",
      "The Court gives due consideration to the reason the offense was placed on the dead docket, which the defendant states below as far as the defendant knows it."
    ],
    petitionFacts: [
      rbf("dead_docket_date", "Date the charge was placed on the dead docket", "the date the charge was placed on the dead docket, from the docket - the clerk of the court where the charge is pending holds it, and it is what starts the 12 months", "no docket fact is held for a record the platform has not seen"),
      rbf("charge_code_section", "Exact O.C.G.A. Code section of the charge", "the exact O.C.G.A. Code section of the charge, from the case papers", "no charge fact is held for a record the platform has not seen"),
      rbf("arrest_date", "Date of arrest in this case", "the date of arrest, from the case papers or your Georgia criminal history report", "no arrest fact is held for a record the platform has not seen"),
      rbf("reason_dead_docketed", "The reason the case was placed on the dead docket, as far as you know it", "why the case was dead docketed, as far as you know - the court gives due consideration to the reason; if you do not know it, stop and get help before filing", "the reason lives in the court's own record and the participant's knowledge; the platform holds neither")
    ],
    narrative: rbf("participant_narrative", "Your own statement of how this pending charge on your record has been a barrier",
      "your own first-hand account of how the pending charge has been a barrier - these lines are yours alone and nothing on them is written for you",
      "the platform prompts for and formats the participant's own account; it does not write the privacy-harm narrative"),
    prayerLines: [
      "WHEREFORE, the defendant asks the Court to enter an order directing the Georgia Crime Information Center (GCIC) and every agency in the county named in the caption, including the arresting agency and the jail or detention center, to restrict all criminal history record information pertaining to the charged offense, pursuant to O.C.G.A. Sec. 35-3-37(j)(3), with disclosure limited to what O.C.G.A. Sec. 35-3-37(t) and (v) permit"
    ],
    orderLines: [
      "Before the Court is the defendant's Petition to Restrict Access to Criminal History Record Information (Dead Docket) under O.C.G.A. Sec. 35-3-37(j)(3).",
      "The Court has given due consideration to the reason the charged offense was placed on the dead docket, and finds that no active warrant is pending for the defendant.",
      "IT IS ORDERED that the Georgia Crime Information Center (GCIC) and every agency in the county named in the caption, including the arresting agency and the jail or detention center, restrict all criminal history record information pertaining to the charged offense, identified by the OTN and the date of arrest stated below, pursuant to O.C.G.A. Sec. 35-3-37(j)(3).",
      "Disclosure of the restricted information remains limited to what O.C.G.A. Sec. 35-3-37(t) and (v) permit."
    ],
    exhibits: [
      { id: "exhibit_a_dead_docket_entry", letter: "A", name: "Docket showing the dead docket entry and its date", requirement: "required", condition: null,
        attach: "a copy of the dead docket entry, or of the case docket showing the date the charge was placed on the dead docket", from: "the clerk of the court in which the charge is pending",
        how: "Ask the clerk of the court where the charge is pending for the docket showing when the charge was placed on the dead docket, and attach it behind this page. The date on it is what starts the 12 months." }
    ],
    stopConditions: [
      "The prosecuting attorney opposes the filing.",
      "The court sets a contested hearing or takes evidence on disputed facts.",
      "Any immigration consequence is in play.",
      "You want to attack the underlying charge itself.",
      "Venue is unclear because the trial court no longer exists or the records cannot be located.",
      "A warrant may be outstanding for you - an active warrant is an absolute bar, and finding out safely may itself need counsel.",
      "You do not know why the case was dead docketed.",
      "The prosecuting attorney signals an intent to revive the case."
    ],
    timingNotes: [
      "The charge must have been on the dead docket for MORE THAN 12 months, measured from the date it was placed there.",
      "A DEAD DOCKET IS NOT A DISMISSAL. The case is still pending and has not been resolved, and this petition does not resolve it - it restricts access to the criminal history record information only.",
      "Where a hearing is requested, it must be held within 90 days of filing."
    ],
    familyCounselQuestions: [
      "The active-warrant bar is absolute and the packet asks the participant to confirm no warrant is pending before filing; confirm that a self-help warrant check is an acceptable gate, given that checking safely may itself need counsel."
    ],
    familyFindings: [
      {
        finding: "The adopted track record's component note names 'Final disposition' as the required attachment, while its own supporting-documents list requires the docket showing the dead docket entry - and a dead-docketed case has no final disposition, because it is still pending.",
        consequence: "The exhibit page attaches the dead docket entry per the supporting-documents list, the more specific and legally coherent record; the discrepancy is recorded here for the reviewers."
      },
      {
        finding: "A participant who believes a dead docket is the same as a dismissal is wrong, and the controlling review says the copy must say so.",
        consequence: "The petition, the instructions and the timing notes each state that the case is still pending and that this filing does not resolve it."
      }
    ]
  },

  "ga-vacated-j2-set": {
    trackId: "ga-vacated-j2",
    routeKeys: ["obligation:track-only:GA:ga-vacated-j2"],
    legalName: "Petition to Restrict Access to Criminal History Record Information for a Vacated or Reversed Conviction Not Retried",
    routeName: "restricting a Georgia conviction that was vacated or reversed and never retried, under O.C.G.A. Sec. 35-3-37(j)(2)",
    citations: ["O.C.G.A. § 35-3-37(j)(2)"],
    statute: "O.C.G.A. § 35-3-37(j)(2)",
    instrument: "petition",
    title: "Petition to Restrict Access to Criminal History Record Information (Vacated or Reversed Conviction)",
    orderTitle: "Order Restricting Access to Criminal History Record Information",
    captionLabel: "Court and county named in the caption - the court in which the defendant was convicted, and its county (State, Superior, Magistrate, Probate or Municipal; your own case papers name both, and the instructions page says who can confirm them)",
    captionSupply: "the name and level of the court in which you were convicted, and its county, from your case papers - the clerk of the convicting court can confirm both",
    clerkAuthority: "the clerk of the convicting court",
    venueLine: "Filed in the existing criminal case with the clerk of the convicting court.",
    serviceMethods: "certified mail, e-filing or hand delivery",
    certAgency: false,
    hearingPrayer: "and, in the alternative, that the petition be set for hearing within 90 days of filing",
    allegations: [
      "The defendant was convicted of an offense in the above-styled case and sentenced to a punishment other than the death penalty.",
      "The conviction was vacated by the trial court or reversed by an appellate or other post-conviction court, and that decision became final by the completion of the appellate process. The order and the record showing finality are attached as Exhibit B.",
      "The prosecuting attorney has not retried the case within two years of the date the vacating or reversing order became final."
    ],
    petitionFacts: [
      rbf("offense_code_section", "Exact O.C.G.A. Code section of the conviction that was vacated or reversed", "the exact O.C.G.A. Code section you were convicted under, from the case papers", "no charge fact is held for a record the platform has not seen"),
      rbf("arrest_date", "Date of arrest in this case", "the date of arrest, from the case papers or your Georgia criminal history report", "no arrest fact is held for a record the platform has not seen"),
      rbf("vacating_court", "Court that vacated or reversed the conviction", "which court vacated or reversed the conviction, from the order itself - the clerk of that court can provide a copy", "no post-conviction fact is held for a record the platform has not seen"),
      rbf("vacating_order_date", "Date the order vacating or reversing the conviction was entered", "the date on the vacating or reversing order", "no post-conviction fact is held for a record the platform has not seen"),
      rbf("finality_date", "Date the decision became final by completion of the appellate process", "the date the decision became final through completion of the appellate process, from the docket entries - the clerk of the convicting court holds them; if finality is unclear or disputed, stop and get help before filing", "finality is shown by the court's own docket, which the platform has not seen")
    ],
    narrative: rbf("participant_narrative", "Your own statement of how this record has been a barrier since the conviction was set aside",
      "your own first-hand account of how the record has been a barrier since the conviction was set aside - these lines are yours alone and nothing on them is written for you",
      "the platform prompts for and formats the participant's own account; it does not write the privacy-harm narrative, and it does not analyse or argue why the conviction was vacated or why the case was not retried"),
    prayerLines: [
      "WHEREFORE, the defendant asks the Court to enter an order directing the Georgia Crime Information Center (GCIC) and every agency in the county named in the caption, including the arresting agency and the jail or detention center, to restrict all criminal history record information pertaining to the offense, pursuant to O.C.G.A. Sec. 35-3-37(j)(2), with disclosure limited to what O.C.G.A. Sec. 35-3-37(t) and (v) permit"
    ],
    orderLines: [
      "Before the Court is the defendant's Petition to Restrict Access to Criminal History Record Information (Vacated or Reversed Conviction) under O.C.G.A. Sec. 35-3-37(j)(2).",
      "IT IS ORDERED that the Georgia Crime Information Center (GCIC) and every agency in the county named in the caption, including the arresting agency and the jail or detention center, restrict all criminal history record information pertaining to the offense, identified by the OTN and the date of arrest stated below, pursuant to O.C.G.A. Sec. 35-3-37(j)(2).",
      "Disclosure of the restricted information remains limited to what O.C.G.A. Sec. 35-3-37(t) and (v) permit."
    ],
    exhibits: [
      { id: "exhibit_a_final_disposition", letter: "A", name: "Final disposition", requirement: "required", condition: null,
        attach: "a copy of the final disposition of this case", from: "the clerk of the convicting court",
        how: "Ask the clerk of the convicting court for a copy of the final disposition and attach it behind this page." },
      { id: "exhibit_b_vacating_order_and_finality", letter: "B", name: "The vacating or reversing order, and proof the decision became final", requirement: "required", condition: null,
        attach: "the order vacating or reversing the conviction, and the record showing the decision became final by completion of the appellate process", from: "the clerk of the court that vacated or reversed the conviction, and the clerk of the convicting court",
        how: "Ask the clerk of the court that vacated or reversed the conviction for a copy of the order, and the clerk of the convicting court for the docket entries showing the appellate process is complete, and attach both behind this page." }
    ],
    stopConditions: [
      "The prosecuting attorney opposes the filing, or signals an intent to retry the case.",
      "The court sets a contested hearing or takes evidence on disputed facts.",
      "Any immigration consequence is in play.",
      "Whether the vacating or reversing decision is final through completion of the appellate process is unclear or disputed.",
      "You are pursuing, or want to pursue, actual-innocence or other contested post-conviction litigation - that remains outside this packet's scope.",
      "The reason for the vacatur is itself in dispute.",
      "Venue is unclear because the trial court no longer exists or the records cannot be located."
    ],
    timingNotes: [
      "Two years must have passed from the date the vacating or reversing order became final by completion of the appellate process, without the prosecuting attorney retrying the case.",
      "The court weighs why the judgment was reversed or vacated, why the prosecuting attorney has not retried it, and the public interest. That weighing is the court's function; this packet pleads the procedural history and attaches the order, and argues none of it.",
      "Attorney review is recommended before filing wherever the finality of the appellate process, the reason for the vacatur, or the prosecuting attorney's retrial posture is unclear.",
      "Where a hearing is requested, it must be held within 90 days of filing."
    ],
    familyCounselQuestions: [
      "The controlling state review classified this track process_guidance and the adopted legal-design record reclassified it custom_pleading on the packet-only amendment; confirm the reclassification and the pleading's no-argument posture.",
      "Attorney review is recommended on unclear finality; confirm the participant-facing recommendation (no upload, no review gate) is the intended shape."
    ],
    familyFindings: [
      {
        finding: "The state review's Track I marked this route process_guidance; the adopted legal-design record reclassified it to custom_pleading because its elements are objective and participant-knowable and the petition attacks nothing, and the MASTER_QUEUE row agrees.",
        consequence: "The petition is composed under the adopted record, pleads only the procedural history, attaches the order and the finality proof, and argues neither the reason for the vacatur nor the public interest."
      }
    ]
  },

  "ga-fugitive-j5-set": {
    trackId: "ga-fugitive-j5",
    routeKeys: ["obligation:track-only:GA:ga-fugitive-j5"],
    legalName: "Petition to Restrict Access to Criminal History Record Information for an Arrest on a Fugitive From Justice Warrant",
    routeName: "restricting a Georgia arrest made on an out-of-state fugitive from justice warrant, under O.C.G.A. Sec. 35-3-37(j)(5)",
    citations: ["O.C.G.A. § 35-3-37(j)(5)", "O.C.G.A. § 17-13-4"],
    statute: "O.C.G.A. § 35-3-37(j)(5)",
    instrument: "petition",
    title: "Petition to Restrict Access to Criminal History Record Information (Fugitive From Justice Warrant)",
    orderTitle: "Order Restricting Access to Criminal History Record Information",
    captionKind: "superior",
    captionLabel: "County named in the caption - the county where the arrest on the fugitive warrant occurred; this petition is filed in the Superior Court of that county",
    captionSupply: "the Georgia county where you were arrested on the fugitive warrant - O.C.G.A. Sec. 35-3-37(j)(5) sends this petition to the Superior Court of that county",
    caseNumberOptional: true,
    caseNumberSupply: "the Georgia case number given to the fugitive warrant matter, if one was given - it helps the clerk locate the matter, and the packet is usable without it",
    clerkAuthority: "the clerk of the Superior Court of the county where the arrest occurred",
    venueLine: "Filed in the Superior Court of the county where the arrest occurred - this route names the Superior Court expressly.",
    serviceMethods: "certified mail, e-filing or hand delivery",
    certAgency: true,
    hearingPrayer: "and, in the alternative, that the petition be set for hearing within 90 days of filing",
    allegations: [
      "The defendant was arrested on a fugitive from justice warrant as provided in O.C.G.A. Sec. 17-13-4, in the county named in the caption.",
      "The circumstances warrant restriction, and the harm otherwise resulting to the defendant clearly outweighs the public interest in the criminal history record information being publicly available."
    ],
    petitionFacts: [
      rbf("arrest_date", "Date of the arrest on the fugitive warrant", "the date you were arrested on the fugitive warrant, from your Georgia criminal history report - the report identifies the arrest cycle", "no arrest fact is held for a record the platform has not seen"),
      rbf("demanding_jurisdiction", "The state or jurisdiction that had asked for the defendant to be held", "which other state or jurisdiction had asked for you to be held, from the warrant papers or the court record of the fugitive warrant proceeding", "no interstate fact is held for a record the platform has not seen"),
      rbf("warrant_outcome_account", "Your own statement of what happened with the fugitive warrant and any extradition", "in your own words, what happened with the fugitive warrant and any extradition - this is your own account; the packet does not analyse the extradition posture and does not advise on the demanding state's case", "the interstate posture is the participant's own account, not a legal conclusion the platform generates")
    ],
    narrative: rbf("participant_narrative", "Your own statement of how this arrest on your record has been a barrier",
      "your own first-hand account of how the arrest has been a barrier - these lines are yours alone and nothing on them is written for you",
      "the platform prompts for and formats the participant's own account; it does not write the privacy-harm narrative"),
    prayerLines: [
      "WHEREFORE, the defendant asks the Court to enter an order directing the Georgia Crime Information Center (GCIC) and every agency in the county named in the caption, including the arresting agency and the jail or detention center, to restrict all criminal history record information pertaining to the fugitive from justice warrant arrest, pursuant to O.C.G.A. Sec. 35-3-37(j)(5), with disclosure limited to what O.C.G.A. Sec. 35-3-37(t) and (v) permit"
    ],
    orderLines: [
      "Before the Court is the defendant's Petition to Restrict Access to Criminal History Record Information (Fugitive From Justice Warrant) under O.C.G.A. Sec. 35-3-37(j)(5), referencing O.C.G.A. Sec. 17-13-4.",
      "IT IS ORDERED that the Georgia Crime Information Center (GCIC) and every agency in the county named in the caption, including the arresting agency and the jail or detention center, restrict all criminal history record information pertaining to the fugitive from justice warrant arrest, identified by the OTN and the date of arrest stated below, pursuant to O.C.G.A. Sec. 35-3-37(j)(5).",
      "Disclosure of the restricted information remains limited to what O.C.G.A. Sec. 35-3-37(t) and (v) permit."
    ],
    exhibits: [
      { id: "exhibit_a_criminal_history_cycle", letter: "A", name: "Georgia criminal history report showing the fugitive warrant arrest cycle", requirement: "required", condition: null,
        attach: "your own Georgia criminal history report, with the fugitive warrant arrest cycle identified - and any Georgia court record of the fugitive warrant proceeding, where one exists", from: "most Georgia sheriff's offices and police departments, or GCIC; the clerk of the court where the fugitive warrant matter was heard, for the court record",
        how: "Obtain the report and identify the arrest cycle for the fugitive warrant. Where the fugitive warrant matter was heard in a Georgia court, ask that clerk for the docket or disposition as well." }
    ],
    stopConditions: [
      "The prosecuting attorney opposes the filing.",
      "The court sets a contested hearing or takes evidence on disputed facts.",
      "Any immigration consequence is in play.",
      "The underlying out-of-state matter is unresolved, or the demanding state still seeks you.",
      "You are subject to a pending extradition demand.",
      "The out-of-state record itself is your real concern - Georgia restriction does not reach it.",
      "Attorney review is recommended before filing where the underlying extradition posture is unresolved."
    ],
    timingNotes: [
      "O.C.G.A. Sec. 35-3-37(j)(5) states no waiting period.",
      "GEORGIA RESTRICTION REACHES GEORGIA RECORDS ONLY. It does not touch the demanding state's records or the FBI Identity History Summary.",
      "Notice goes to the arresting law enforcement agency AND the prosecuting attorney.",
      "Where a hearing is requested, it must be held within 90 days of filing."
    ],
    familyCounselQuestions: [
      "The controlling state review classified this track process_guidance for v1 and the adopted legal-design record reclassified it custom_pleading; confirm the reclassification.",
      "The attorney-review recommendation where the extradition posture is unresolved is participant-facing only; confirm that shape."
    ],
    familyFindings: [
      {
        finding: "The state review's Track J marked this route process_guidance for v1 (low volume, interstate facts); the adopted legal-design record reclassified it to custom_pleading because the statute supplies a definite venue, notice set, contents, standard and relief, and the MASTER_QUEUE row agrees.",
        consequence: "The petition is composed under the adopted record. Low volume and interstate posture are carried as scope warnings - Georgia records only, stop on any pending extradition demand - not as reasons to withhold the packet."
      },
      {
        finding: "The adopted track record's component note names 'Final disposition' as the required attachment, while its own supporting-documents list requires the Georgia criminal history report showing the fugitive-warrant arrest cycle - a fugitive warrant matter frequently has no final disposition of its own.",
        consequence: "The exhibit page attaches the criminal history report identifying the arrest cycle, with the court record of the fugitive warrant proceeding added where one exists; the discrepancy is recorded here for the reviewers."
      }
    ]
  },

  "ga-fo-active-pre2026-set": {
    trackId: "ga-fo-active-pre2026",
    routeKeys: ["obligation:track-only:GA:ga-fo-active-pre2026"],
    legalName: "Petition to Restrict and Seal First Offender Records for a Sentence Imposed Before July 1, 2026 That Has Not Been Revoked",
    routeName: "restricting and sealing an active Georgia First Offender case sentenced before July 1, 2026, under O.C.G.A. Sec. 42-8-62.1(c)",
    citations: ["O.C.G.A. § 42-8-62.1(c)", "O.C.G.A. § 42-8-62.1(b)", "O.C.G.A. § 42-8-62.1(d)", "O.C.G.A. § 42-8-62.1(e)", "O.C.G.A. § 42-8-62.1(f)", "O.C.G.A. § 42-8-62.1(h)", "O.C.G.A. § 42-8-60 et seq.", "2026 Ga. Laws Act 403 (HB 162), § 3"],
    statute: "O.C.G.A. § 42-8-62.1(c)",
    instrument: "petition",
    title: "Petition to Restrict and Seal First Offender Records",
    orderTitle: "Order Restricting and Sealing First Offender Records",
    captionLabel: "Court and county named in the caption - the court that ordered the First Offender sentence, and its county (State, Superior, Magistrate, Probate or Municipal; your own case papers name both, and the instructions page says who can confirm them)",
    captionSupply: "the name and level of the court that ordered the First Offender sentence, and its county, from your case papers - the clerk of the sentencing court can confirm both",
    clerkAuthority: "the clerk of the court that ordered the First Offender sentence",
    venueLine: "Filed as a criminal petition in the existing case with the clerk of the court that ordered the First Offender sentence.",
    serviceMethods: "registered or certified mail or statutory overnight delivery (statutorily sufficient under O.C.G.A. Sec. 42-8-62.1(c)); hand delivery or e-filing may also be used",
    certAgency: false,
    hearingPrayer: null,
    allegations: [
      "The defendant was sentenced pursuant to Article 3 of Chapter 8 of Title 42 of the O.C.G.A. (the First Offender Act, O.C.G.A. Sec. 42-8-60 et seq.) in the above-styled case, prior to July 1, 2026. The final disposition showing the First Offender sentence is attached as Exhibit A.",
      "The defendant's First Offender sentence has not been revoked, and the defendant has not been adjudicated guilty in this case.",
      "The defendant petitions the court that ordered the sentence to limit public access to the defendant's case information pursuant to O.C.G.A. Sec. 42-8-62.1(b), as O.C.G.A. Sec. 42-8-62.1(c) provides. Under O.C.G.A. Sec. 42-8-62.1(d), within 90 days of this filing the court shall order restriction and sealing; no balancing showing is required on a properly filed petition."
    ],
    petitionFacts: [
      rbf("sentencing_date", "Date the First Offender sentence was imposed - it must be before July 1, 2026 for this route", "the date you were sentenced under the First Offender Act, from the final disposition - the clerk of the sentencing court holds it", "no sentence fact is held for a record the platform has not seen"),
      rbf("sentence_terms", "The sentence imposed under the First Offender Act", "the sentence you received, from the final disposition", "no sentence fact is held for a record the platform has not seen"),
      rbf("arrest_date", "Date of arrest in this case", "the date of arrest, from the case papers or your Georgia criminal history report", "no arrest fact is held for a record the platform has not seen")
    ],
    narrative: null,
    prayerLines: [
      "WHEREFORE, the defendant asks the Court to enter an order, within 90 days of this filing as O.C.G.A. Sec. 42-8-62.1(d) provides, directing the clerk of court to restrict the defendant's criminal history record information and to seal every document in the clerk's possession, custody or control pertaining to this case, whether physical or electronic, including index references, within 60 days as O.C.G.A. Sec. 42-8-62.1(e) provides; and directing all law enforcement agencies, jails and detention centers, including the arresting agency and the jail or detention center, to restrict their records of this case and make them unavailable to the public within 30 days of receiving a copy of the order, as O.C.G.A. Sec. 42-8-62.1(f) provides; with disclosure limited as O.C.G.A. Sec. 42-8-62.1(h) sets out"
    ],
    orderLines: [
      "Before the Court is the defendant's Petition to Restrict and Seal First Offender Records under O.C.G.A. Sec. 42-8-62.1(c).",
      "IT IS ORDERED that the Clerk of the court named in the caption restrict the defendant's criminal history record information and seal every document in the clerk's possession, custody or control pertaining to this case, whether physical or electronic, including index references, within 60 days of this order, pursuant to O.C.G.A. Sec. 42-8-62.1(d) and (e).",
      "IT IS FURTHER ORDERED that all law enforcement agencies, jails and detention centers, including the arresting agency and the jail or detention center, restrict their records of this case, identified by the OTN and the date of arrest stated below, and make them unavailable to the public within 30 days of receiving a copy of this order, pursuant to O.C.G.A. Sec. 42-8-62.1(f).",
      "Disclosure of the restricted and sealed information remains limited as O.C.G.A. Sec. 42-8-62.1(h) sets out."
    ],
    exhibits: [
      { id: "exhibit_a_fo_final_disposition", letter: "A", name: "Final disposition showing the First Offender sentence", requirement: "required", condition: null,
        attach: "the final disposition showing that you were sentenced under the First Offender Act", from: "the clerk of the court that sentenced you",
        how: "Ask the clerk of the sentencing court for the final disposition showing that you were sentenced under the First Offender Act, and attach it behind this page." }
    ],
    stopConditions: [
      "Your First Offender status was revoked and an adjudication of guilt was entered - that takes the protection off and removes you from this route.",
      "You are unsure whether you were sentenced as a first offender at all.",
      "You have been exonerated and discharged already - the companion route under O.C.G.A. Sec. 42-8-62.2(c) is yours instead.",
      "The prosecuting attorney opposes the petition.",
      "The court sets a contested or evidentiary hearing.",
      "Any immigration consequence is in play.",
      "You want to attack the underlying case."
    ],
    timingNotes: [
      "There is no waiting period. The court shall order restriction and sealing within 90 days of the filing under O.C.G.A. Sec. 42-8-62.1(d).",
      "The clerk then seals every document in its custody within 60 days under Sec. 42-8-62.1(e)(1), and law enforcement agencies, jails and detention centers restrict within 30 days of receiving a copy of the order under Sec. 42-8-62.1(f).",
      "The prosecuting attorney receives NOTICE of the petition. Notice is not a request for consent, there is no advance-consent gate on this route, and the statute creates no objection period and no objection-triggered hearing branch.",
      "Act 403 struck the former preponderance findings, so no privacy-harm or interests-of-justice narrative is pleaded and none is requested of you."
    ],
    familyCounselQuestions: [
      "The controlling state review recorded Track L as new and not yet verified against the enrolled text of Act 403 (HB 162); the adopted legal-design record states the amended § 42-8-62.1 as settled. Confirm the enrolled Act text before promotion.",
      "As amended, § 42-8-62.1(c) textually includes a person already exonerated and discharged, while § 42-8-62.2(c) provides that person a dedicated petition; the adopted memorandum allocates the discharged population to § 42-8-62.2. Confirm the crosswalk.",
      "Whether a Georgia clerk charges a filing fee for a petition in an existing criminal case, whether § 9-15-2 pauper's-affidavit practice reaches it, and whether e-filing is available, remain county-specific and unresolved; no figure is quoted."
    ],
    familyFindings: [
      {
        finding: "The MASTER_QUEUE row names two content-hash source ids (05e8621c…, 91ff699f…) that the factory's source-custody reconciliation records as named_content_hash_not_in_corpus; hashing every file in the mounted Master Library found neither.",
        consequence: "No bytes for either hash exist in this container, which is stated here and in the source receipt rather than guessed around. The queue marks this family source-ready on the codified text alone (boundCount 0, ready true), and the build composes from the pinned Georgia legal review, the adopted intake record and the packet-set manifest."
      },
      {
        finding: "Act 403 (HB 162, 2026) struck the former preponderance findings from § 42-8-62.1(d): on a properly filed petition the court shall order restriction and sealing within 90 days, with no balancing.",
        consequence: "No privacy-harm narrative is pleaded, prompted or formatted on this route, and the petition states the mandatory 90-day order, the 60-day clerk seal and the 30-day agency compliance exactly as the record states them."
      }
    ]
  },

  "ga-fo-discharged-pre2026-set": {
    trackId: "ga-fo-discharged-pre2026",
    routeKeys: ["obligation:track-only:GA:ga-fo-discharged-pre2026"],
    legalName: "Petition to Restrict and Seal First Offender Records Where the Participant Was Exonerated and Discharged Before July 1, 2026",
    routeName: "restricting and sealing a completed Georgia First Offender case discharged before July 1, 2026, under O.C.G.A. Sec. 42-8-62.2(c)",
    citations: ["O.C.G.A. § 42-8-62.2(c)", "O.C.G.A. § 42-8-62.2(b)", "O.C.G.A. § 42-8-62.2(d)", "O.C.G.A. § 42-8-62.2(e)", "O.C.G.A. § 42-8-62.2(f)", "O.C.G.A. § 42-8-62.2(g)", "O.C.G.A. § 42-8-60 et seq.", "2026 Ga. Laws Act 403 (HB 162), § 4"],
    statute: "O.C.G.A. § 42-8-62.2(c)",
    instrument: "petition",
    title: "Petition to Restrict and Seal Discharged First Offender Records",
    orderTitle: "Order Sealing First Offender Records and Directing Restriction",
    captionLabel: "Court and county named in the caption - the court that granted the discharge, and its county (State, Superior, Magistrate, Probate or Municipal; your own case papers name both, and the instructions page says who can confirm them)",
    captionSupply: "the name and level of the court that sentenced you and granted the discharge, and its county, from your case papers - the clerk of that court can confirm both",
    clerkAuthority: "the clerk of the court that granted the discharge",
    venueLine: "Filed as a criminal petition in the existing case with the clerk of the court that granted the discharge.",
    serviceMethods: "registered or certified mail or statutory overnight delivery (statutorily sufficient under O.C.G.A. Sec. 42-8-62.2(c)); hand delivery or e-filing may also be used",
    certAgency: false,
    hearingPrayer: null,
    allegations: [
      "The defendant was sentenced pursuant to Article 3 of Chapter 8 of Title 42 of the O.C.G.A. (the First Offender Act, O.C.G.A. Sec. 42-8-60 et seq.) in the above-styled case, prior to July 1, 2026. The final disposition showing the First Offender sentence, and the discharge order where one was entered, are attached as Exhibit A.",
      "The defendant was exonerated of guilt and discharged, without court adjudication of guilt, as a matter of law or pursuant to a court order, prior to July 1, 2026. Where no discharge order was entered despite the completed sentence, the defendant was discharged as a matter of law, which O.C.G.A. Sec. 42-8-62.2(c) reaches equally.",
      "The defendant petitions the court that granted the discharge for an order to seal and make unavailable to the public the criminal file, docket books, criminal minutes, final record, all other records of the court and the defendant's criminal history record information in the custody of the clerk of court, including within any index, as O.C.G.A. Sec. 42-8-62.2(c) provides. Under O.C.G.A. Sec. 42-8-62.2(d), the court shall order sealing within 90 days of this filing, with no findings required."
    ],
    petitionFacts: [
      rbf("sentencing_date", "Date the First Offender sentence was imposed", "the date you were sentenced under the First Offender Act, from the final disposition - the clerk of the sentencing court holds it", "no sentence fact is held for a record the platform has not seen"),
      rbf("sentence_terms", "The sentence imposed under the First Offender Act", "the sentence you received, from the final disposition", "no sentence fact is held for a record the platform has not seen"),
      rbf("discharge_date", "Date of the exoneration and discharge - it must be before July 1, 2026 for this route", "the date you were exonerated and discharged, from the discharge order where one was entered, or the date your sentence was completed where you were discharged as a matter of law - the clerk of the court that granted the discharge can help you locate it; if you are unsure whether you were discharged at all, stop and get help before filing", "no discharge fact is held for a record the platform has not seen"),
      rbf("discharge_mode", "Whether a discharge order was entered, or the discharge occurred as a matter of law without an order", "whether the court entered a discharge order, or you were discharged as a matter of law without one - a discharge frequently was never entered despite completed probation, and the statute reaches both", "which happened lives on the court's own record, which the platform has not seen"),
      rbf("arrest_date", "Date of arrest in this case", "the date of arrest, from the case papers or your Georgia criminal history report", "no arrest fact is held for a record the platform has not seen")
    ],
    narrative: null,
    prayerLines: [
      "WHEREFORE, the defendant asks the Court to enter an order, within 90 days of this filing as O.C.G.A. Sec. 42-8-62.2(d) provides, sealing and making unavailable to the public the criminal file, docket books, criminal minutes, final record, all other records of the court and the defendant's criminal history record information in the custody of the clerk of court, including within any index, with the clerk to seal within 60 days as O.C.G.A. Sec. 42-8-62.2(e) provides; and further ordering all law enforcement agencies, jails and detention centers, including the arresting agency and the jail or detention center, to restrict their records of this case with 30 days to comply after receiving a copy of the order, as O.C.G.A. Sec. 42-8-62.2(f) provides; with disclosure limited as O.C.G.A. Sec. 42-8-62.2(g) sets out"
    ],
    orderLines: [
      "Before the Court is the defendant's Petition to Restrict and Seal Discharged First Offender Records under O.C.G.A. Sec. 42-8-62.2(c).",
      "IT IS ORDERED that the Clerk of the court named in the caption seal and make unavailable to the public the criminal file, docket books, criminal minutes, final record, all other records of the court and the defendant's criminal history record information in the clerk's custody, including within any index, within 60 days of this order, pursuant to O.C.G.A. Sec. 42-8-62.2(d) and (e).",
      "IT IS FURTHER ORDERED that all law enforcement agencies, jails and detention centers, including the arresting agency and the jail or detention center, restrict their records of this case, identified by the OTN and the date of arrest stated below, and make them unavailable to the public within 30 days of receiving a copy of this order, pursuant to O.C.G.A. Sec. 42-8-62.2(f).",
      "Disclosure of the sealed and restricted information remains limited as O.C.G.A. Sec. 42-8-62.2(g) sets out."
    ],
    exhibits: [
      { id: "exhibit_a_fo_disposition_and_discharge", letter: "A", name: "Final disposition showing the First Offender sentence, and the discharge order where one was entered", requirement: "required", condition: null,
        attach: "the final disposition showing that you were sentenced under the First Offender Act, and the discharge order where one was entered", from: "the clerk of the court that sentenced you and granted the discharge",
        how: "Ask the clerk for the final disposition showing the First Offender sentence, and for the discharge order if one was entered. A discharge frequently was never entered; where that is so, the petition says you were discharged as a matter of law, and you attach the disposition alone." }
    ],
    stopConditions: [
      "Your First Offender status was revoked and an adjudication of guilt was entered, so no exoneration and discharge occurred.",
      "No discharge was entered despite completed probation and you are unsure whether you were discharged as a matter of law.",
      "You are unsure whether you were sentenced as a first offender at all.",
      "Your case is still active or your discharge never occurred - the companion route under O.C.G.A. Sec. 42-8-62.1(c) is yours instead.",
      "The prosecuting attorney opposes the petition.",
      "The court sets a contested or evidentiary hearing.",
      "Any immigration consequence is in play."
    ],
    timingNotes: [
      "There is no waiting period beyond the exoneration and discharge itself. The court shall order sealing within 90 days of the filing under O.C.G.A. Sec. 42-8-62.2(d), with no findings required.",
      "The clerk seals within 60 days under Sec. 42-8-62.2(e), and the court also orders law enforcement agencies, jails and detention centers to restrict, with 30 days to comply after receiving a copy, under Sec. 42-8-62.2(f).",
      "The prosecuting attorney receives NOTICE of the petition. Notice is not a request for consent, there is no advance-consent gate on this route, and the statute creates no objection period and no objection-triggered hearing branch.",
      "No privacy-harm or interests-of-justice narrative is pleaded and none is requested of you; Sec. 42-8-62.2(d) requires no findings."
    ],
    familyCounselQuestions: [
      "The controlling state review recorded Track L as new and not yet verified against the enrolled text of Act 403 (HB 162); the adopted legal-design record states § 42-8-62.2 as enacted and settled. Confirm the enrolled Act text before promotion.",
      "As amended, § 42-8-62.1(c) textually includes a person already exonerated and discharged, while § 42-8-62.2(c) provides that person this dedicated petition; the adopted memorandum allocates the discharged population here. Confirm the crosswalk.",
      "Whether a Georgia clerk charges a filing fee for a petition in an existing criminal case, whether § 9-15-2 pauper's-affidavit practice reaches it, and whether e-filing is available, remain county-specific and unresolved; no figure is quoted."
    ],
    familyFindings: [
      {
        finding: "The MASTER_QUEUE row names two content-hash source ids (05e8621c…, 91ff699f…) that the factory's source-custody reconciliation records as named_content_hash_not_in_corpus; hashing every file in the mounted Master Library found neither.",
        consequence: "No bytes for either hash exist in this container, which is stated here and in the source receipt rather than guessed around. The queue marks this family source-ready on the codified text alone (boundCount 0, ready true), and the build composes from the pinned Georgia legal review, the adopted intake record and the packet-set manifest."
      },
      {
        finding: "A discharge frequently was never entered despite completed probation, and § 42-8-62.2(c) reaches a person discharged as a matter of law as well as one discharged pursuant to a court order.",
        consequence: "The petition carries a discharge-mode blank stating which happened, the exhibit page explains the matter-of-law case, and the instructions tell a participant who is unsure to stop and get help."
      }
    ]
  }
};

/* ---- source binding ------------------------------------------------------------ */
function resolveSource() {
  const root = corpusRoot();
  const abs = path.join(root, SOURCE_REL);
  const failures = [];
  if (!fs.existsSync(abs)) {
    return { failures: [{ sourceId: SOURCE_DOC_ID, pathInArchive: SOURCE_REL, why: "the held codified-text source does not exist on disk" }] };
  }
  const bytes = fs.readFileSync(abs);
  const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  if (sha256 !== PINNED_SHA256) {
    failures.push({ sourceId: SOURCE_DOC_ID, pathInArchive: SOURCE_REL, why: `SHA-256 drift against this host's pin: pinned ${PINNED_SHA256}, on disk ${sha256}` });
  }
  const manifestAbs = path.join(root, SOURCE_MANIFEST_REL);
  let manifestSha = null;
  if (!fs.existsSync(manifestAbs)) {
    failures.push({ sourceId: "GA-STATE-MANIFEST", pathInArchive: SOURCE_MANIFEST_REL, why: "the Master Library's own GA STATE_MANIFEST.csv is missing, so the recorded SHA-256 cannot be cross-checked" });
  } else {
    const csv = fs.readFileSync(manifestAbs, "utf8");
    manifestSha = crypto.createHash("sha256").update(csv).digest("hex");
    if (!csv.includes(PINNED_SHA256)) {
      failures.push({ sourceId: "GA-STATE-MANIFEST", pathInArchive: SOURCE_MANIFEST_REL, why: "the STATE_MANIFEST.csv does not record the pinned SHA-256 for the legal review, so three records no longer agree" });
    }
  }
  if (failures.length > 0) return { failures };
  const text = bytes.toString("utf8");
  const missing = FACE_ANCHORS.filter((a) => !text.includes(a));
  return {
    failures: [],
    source: {
      documentId: SOURCE_DOC_ID, title: SOURCE_TITLE, pathInArchive: SOURCE_REL,
      sha256, byteLength: bytes.length, manifestSha256: manifestSha, text, missingAnchors: missing
    }
  };
}

/* The two committed legal-design records, read and asserted to carry this
 * family before composing against them. */
function resolveCommittedRecords(F, familyId) {
  const memoBytes = fs.readFileSync(path.join(ROOT, MEMO_PATH));
  const memo = JSON.parse(memoBytes.toString("utf8"));
  const track = (memo.tracks ?? []).find((t) => t.trackId === F.trackId);
  assert.ok(track, `${MEMO_PATH} carries no track ${F.trackId}`);
  assert.equal(track.outputStrategy, "custom_pleading", `${F.trackId}: the adopted record's strategy is ${track.outputStrategy}, not custom_pleading`);
  const manifestsBytes = fs.readFileSync(path.join(ROOT, MANIFESTS_PATH));
  const manifests = JSON.parse(manifestsBytes.toString("utf8"));
  const packetSet = (manifests.packetSets ?? []).find((p) => p.packetSetId === familyId);
  assert.ok(packetSet, `${MANIFESTS_PATH} carries no packetSetId ${familyId}`);
  const requiredRoles = packetSet.components.map((c) => c.role);
  for (const role of ["primary_filing", "proposed_order", "certificate_of_service", "attachment"]) {
    assert.ok(requiredRoles.includes(role), `${familyId}: the packet-set manifest lacks a ${role} component`);
  }
  const attachmentCount = requiredRoles.filter((r) => r === "attachment").length;
  assert.equal(F.exhibits.length, attachmentCount,
    `${familyId}: this host renders ${F.exhibits.length} exhibit page(s) but the manifest names ${attachmentCount} attachment component(s)`);
  return {
    memoSha256: crypto.createHash("sha256").update(memoBytes).digest("hex"),
    manifestsSha256: crypto.createHash("sha256").update(manifestsBytes).digest("hex"),
    track, packetSet
  };
}

/* ---- component sets ------------------------------------------------------------ */
const componentIds = (F) => [
  "primary_filing", "proposed_order", "certificate_of_service",
  ...F.exhibits.map((e) => e.id)
];

const componentTitles = (F) => ({
  primary_filing: F.title,
  proposed_order: `Proposed ${F.orderTitle}`,
  certificate_of_service: "Certificate of Service",
  ...Object.fromEntries(F.exhibits.map((e) => [e.id, `Exhibit ${e.letter} - ${e.name}`]))
});

const componentConditions = (F) => Object.fromEntries(
  F.exhibits.filter((e) => e.requirement === "conditional")
    .map((e) => [e.id, e.condition])
);

/* ---- composed documents --------------------------------------------------------- */
function captionLines(F, facts, { judge } = { judge: true }) {
  const name = facts["participant.full_legal_name"];
  const L = [];
  if (F.captionKind === "superior") {
    L.push("IN THE SUPERIOR COURT OF " + DOTS(40) + " COUNTY");
  } else {
    L.push("IN THE " + DOTS(34) + " COURT OF " + DOTS(34) + " COUNTY");
  }
  L.push(`(${F.captionLabel.toUpperCase()})`);
  L.push("STATE OF GEORGIA", "");
  L.push("STATE OF GEORGIA,");
  L.push("");
  L.push("        v." + "                                   CASE NO.: " + DOTS(28));
  L.push("");
  L.push(`${name.toUpperCase()},` + "                 OTN: " + DOTS(28) + "  (if known)");
  if (judge) L.push("        Defendant." + "                            JUDGE: " + DOTS(28) + "  (assigned by the court)");
  else L.push("        Defendant.");
  L.push("");
  return L;
}

function signatureBlockLines(F, facts, instrument) {
  const name = facts["participant.full_legal_name"];
  const address = facts["participant.street_address"];
  const phone = facts["participant.phone"];
  const email = facts["participant.email"];
  return [
    "",
    "DATE " + DOTS(30) + "   SIGNATURE OF DEFENDANT " + DOTS(38),
    "",
    `(The defendant signs and dates this ${instrument} personally. Nothing on this page is signed or dated for the defendant. No verification and no notary block is required by statute, and none is added.)`,
    "",
    `PRINTED NAME: ${name}`,
    `MAILING ADDRESS: ${address}`,
    `TELEPHONE: ${phone}`,
    `EMAIL: ${email}`,
    "Defendant, Pro Se (where unrepresented)"
  ];
}

function composedBody(F, componentId, facts) {
  const name = facts["participant.full_legal_name"];
  const titles = componentTitles(F);
  const L = [];
  if (componentId === "primary_filing") {
    L.push(...captionLines(F, facts));
    L.push(F.title.toUpperCase());
    L.push(`(${F.statute})`, "");
    L.push(`The defendant, ${name}, files this ${F.instrument} in the above-styled criminal case, in the existing case under the existing case number, under ${F.statute}. The defendant states:`, "");
    F.allegations.forEach((a, i) => { L.push(`${i + 1}. ${a}`, ""); });
    L.push("CASE FACTS THE DEFENDANT SUPPLIES (fill each blank from the court record, never from memory; the instructions page lists where each record lives):", "");
    for (const f of F.petitionFacts) {
      L.push(`${f.label}:`);
      L.push(DOTS(), "");
    }
    if (F.narrative) {
      L.push(`${F.narrative.label} (state only what you know first-hand; nothing on these lines is written for you):`);
      L.push(DOTS());
      L.push(DOTS());
      L.push(DOTS(), "");
    }
    L.push("READ EACH NUMBERED STATEMENT BEFORE SIGNING. Each is pleaded as your own statement. If any numbered statement is not true of your case, do not file this " + F.instrument + "; the instructions page tells you where to get help instead.", "");
    for (const p of F.prayerLines) {
      L.push(`${p}${F.hearingPrayer ? `; ${F.hearingPrayer}` : ""}.`, "");
    }
    L.push(...signatureBlockLines(F, facts, F.instrument));
  } else if (componentId === "proposed_order") {
    L.push(...captionLines(F, facts));
    L.push(`PROPOSED ${F.orderTitle.toUpperCase()}`);
    L.push(`(${F.statute})`, "");
    L.push("(This page is proposed by the defendant for the Court's consideration, as the controlling practice directs a proposed order always accompany the filing. Every order line below is completed, signed and dated only by the Court.)", "");
    for (const o of F.orderLines) L.push(o, "");
    L.push("OTN of the case (needed for this order to be actionable by GCIC):");
    L.push(DOTS(), "");
    L.push("Date of arrest identified in this order:");
    L.push(DOTS(), "");
    L.push("SO ORDERED, this " + DOTS(12) + " day of " + DOTS(24) + ", 20" + DOTS(6) + ".", "");
    L.push("");
    L.push(DOTS(56));
    L.push("JUDGE, " + (F.captionKind === "superior" ? "SUPERIOR COURT" : "COURT NAMED IN THE CAPTION"));
    L.push("(The judge's signature block is a third-party block. It is never prefilled, and the court dates its own order.)");
  } else if (componentId === "certificate_of_service") {
    L.push(...captionLines(F, facts, { judge: false }));
    L.push("CERTIFICATE OF SERVICE", "");
    L.push(`I, ${name}, certify that on the date stated below I served a copy of the ${F.title} and the accompanying proposed order on each person listed below, by ${F.serviceMethods}.`, "");
    L.push("NAME AND MAILING ADDRESS OF THE PROSECUTING ATTORNEY SERVED, IDENTIFIED AS DISTRICT ATTORNEY OR SOLICITOR-GENERAL FOR THE COUNTY (you write it here before service; the clerk's office can provide it):");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("OFFICE OF THE CLERK OF COURT SERVED (the clerk of the court named in the caption; the clerk's office can confirm its service address):");
    L.push(DOTS());
    L.push(DOTS(), "");
    if (F.certAgency) {
      L.push("NAME AND SERVICE ADDRESS OF THE ARRESTING LAW ENFORCEMENT AGENCY (this route requires notice to the arresting agency as well; confirm the service destination with that agency before serving):");
      L.push(DOTS());
      L.push(DOTS(), "");
    }
    L.push("Method used to serve each recipient (chosen from those listed above, as the clerk directs):");
    L.push(DOTS(), "");
    L.push("DATE OF SERVICE " + DOTS(40));
    L.push("SIGNATURE OF DEFENDANT " + DOTS(48), "");
    L.push("This page is not proof of service and does not say that anything has been served. It is completed and signed when the copies actually go out. A date or a signature written before the copies go out would be false.");
  } else {
    const ex = F.exhibits.find((e) => e.id === componentId);
    L.push(titles[componentId].toUpperCase(), "");
    if (ex.condition) L.push(ex.condition.toUpperCase(), "");
    L.push(`For: ${name}`);
    L.push(`Filing: the ${F.title} in this packet.`, "");
    L.push(`ATTACH BEHIND THIS PAGE: ${ex.attach}.`, "");
    L.push(`WHERE YOU GET IT: ${ex.from}.`, "");
    L.push(`HOW: ${ex.how}`, "");
    L.push("The platform never collects, inspects or authenticates this record. You obtain it, you check your answers against it, and you correct the packet where they disagree.");
  }
  L.push("", `Route: ${F.routeKeys[0]}`);
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
  /* The shared separator-aware splitter. The private char-by-char copy that
   * stood here cut an over-long token at whichever character first reached the
   * margin; this one breaks at the token's own separators and chops only a run
   * that has none. It is inert for all nine Georgia families -- SCAN01 measured
   * the widest delivered token in the cohort at 428.05pt against a 468pt
   * column, so no token here is ever long enough to be split -- and the
   * assertion below proves that on every build rather than asserting it here. */
  const splitToken = createTokenSplitter({ fits: fitsByFontMetrics(font, fontSize, maxWidth) });
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
  /* THE SOLE-OCCUPANT TRAILER PULL-DOWN.
   *
   * The route trailer is internal machine metadata rather than pleading text,
   * so it is never left as the sole occupant of a participant-facing page:
   * where the body ends flush with a page boundary the last content block is
   * pulled down to keep it company. Ported from the Oklahoma composer
   * (scripts/build-census-v1-rcap-ok-custom-pleading.mjs) onto this host's own
   * pagination rather than invented here -- same soleOccupant predicate, same
   * whole-block move, same refusal to move a block that would not fit, same
   * guard.
   *
   * The row flow underneath it is the one this host already had. The loop it
   * replaces drew row by row and started a new page when y fell below the
   * margin, which is exactly rowsPerPage = floor((height - 2 * margin) /
   * lineHeight) + 1 = 45 rows a page; rows are now laid into that same grid
   * before anything is drawn, purely so the trailer can be caught sitting
   * alone while the layout is still a plan. No block-cohesion rule is added,
   * no constant moves, and pages are still created and drawn one at a time in
   * the same order, so every component that did not end on a trailer-only page
   * is paginated row for row and byte for byte as before. */
  const rowsPerPage = Math.floor((height - 2 * margin) / lineHeight) + 1;
  const blocks = [];
  for (const raw of sanitizePdfText(fullText).split("\n")) {
    blocks.push({ index: blocks.length, rows: wrap(raw), trailer: TRAILER_LINE.test(raw) });
  }
  const pages = [[]];
  for (const block of blocks) {
    for (const text of block.rows) {
      let target = pages[pages.length - 1];
      if (target.length === rowsPerPage) { pages.push([]); target = pages[pages.length - 1]; }
      target.push({ text, block: block.index, trailer: block.trailer });
    }
  }
  const soleOccupant = (rows) => rows.length > 0 && rows.every((r) => r.trailer || r.text === "");
  for (let guard = 0; guard < blocks.length && pages.length > 1 && soleOccupant(pages[pages.length - 1]); guard++) {
    const last = pages[pages.length - 1];
    const previous = pages[pages.length - 2];
    const moving = previous[previous.length - 1].block;
    const moved = [];
    while (previous.length > 0 && previous[previous.length - 1].block === moving) moved.unshift(previous.pop());
    if (moved.length === 0 || moved.length + last.length > rowsPerPage) { previous.push(...moved); break; }
    last.unshift(...moved);
    if (previous.length === 0) pages.splice(pages.length - 2, 1);
  }
  for (const rows of pages) {
    const page = pdf.addPage([width, height]);
    let y = height - margin;
    for (const row of rows) {
      if (row.text) page.drawText(row.text, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
      y -= lineHeight;
    }
  }
  /* Proof, not intention: no delivered page of this document carries the
   * trailer and nothing else. */
  assert.ok(!pages.some(soleOccupant),
    `renderComposedPdf left a page carrying only the route trailer in "${title}"`);
  /* No Georgia token reaches the column, so the splitter must never have run.
   * If a future edit lengthens a route key past 468pt this fails loudly here
   * instead of shipping a page whose text a participant cannot read. */
  assert.equal(splitToken.hardSplits, 0,
    `renderComposedPdf hard-split a token with no separator to break on in "${title}"`);
  return Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
}

/* ---- the field maps -------------------------------------------------------------- */
function composedMap(F, componentId, familyId) {
  const base = (id, label) => ({
    field: `${componentId}.${id}`, fieldName: `${componentId}.${id}`, page: 1,
    printedLabel: label, printedLine: label,
    effectiveLabel: label, regionHeading: label, sectionHeading: null,
    rectBasis: "composed_document_authored_by_this_build"
  });
  const write = (id, label, factId) => ({ ...base(id, label), factId, kind: "composed_text", document: componentId });
  const protectedBlank = (id, label, why) => ({
    ...base(id, label),
    reason: "signature or date field; never prefilled by this build",
    category: SIGNATURE, completenessClass: SIGNATURE, class: SIGNATURE,
    requiredBeforeFiling: false, document: componentId, why
  });
  const clerkBlank = (id, label, why) => ({
    ...base(id, label),
    reason: "court, clerk, prosecutor, agency, or hearing field; the court completes it",
    category: COURT_OWNED, completenessClass: COURT_OWNED, class: COURT_OWNED,
    requiredBeforeFiling: false, document: componentId, why
  });
  const rbfRow = (item) => ({
    ...base(item.id, item.label),
    reason: `the participant supplies this before filing: ${item.supply}`,
    category: null, completenessClass: null, class: null,
    disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
    requiredBeforeFiling: true, identity: `${componentId} field ${item.id}`, factId: null, routeDetermined: false,
    document: componentId, why: item.why, participantMustSupply: item.supply
  });
  const attorneyRow = (item) => ({
    ...base(item.id, item.label),
    reason: `the participant supplies this before filing: ${item.supply}. The prosecuting attorney's identity and address are that office's own facts; the clerk's office can provide them.`,
    category: null, completenessClass: null, class: null,
    disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
    requiredBeforeFiling: true, identity: `${componentId} field ${item.id}`, factId: null, routeDetermined: false,
    document: componentId, why: item.why, participantMustSupply: item.supply
  });
  const rowOf = (item) => {
    if (item.kind === "rbf") return rbfRow(item);
    if (item.kind === "attorney") return attorneyRow(item);
    if (item.kind === "sig") return protectedBlank(item.id, item.label, item.why);
    return clerkBlank(item.id, item.label, item.why);
  };

  const writes = [];
  const refusals = [];
  if (componentId === "primary_filing") {
    writes.push(
      write("caption_defendant_name", `Defendant named in the caption of this ${F.instrument}`, "participant.full_legal_name"),
      write("printed_name", `Printed name of the defendant in the contact block at the foot of the ${F.instrument}`, "participant.full_legal_name"),
      write("mailing_address", "Mailing address of the defendant in the contact block at the foot", "participant.street_address"),
      write("telephone", "Telephone number of the defendant in the contact block at the foot", "participant.phone"),
      write("email", "Email address of the defendant in the contact block at the foot", "participant.email")
    );
    refusals.push(
      ...captionFacts(F).map(rowOf),
      rowOf(captionJudgeBlank),
      ...F.petitionFacts.map(rowOf),
      ...(F.narrative ? [rowOf(F.narrative)] : []),
      ...signatureBlanks(F.instrument).map(rowOf)
    );
  } else if (componentId === "proposed_order") {
    writes.push(write("caption_defendant_name", "Defendant named in the caption of the proposed order", "participant.full_legal_name"));
    refusals.push(
      ...captionFacts(F).map((i) => rowOf({ ...i, id: `order_${i.id}`, label: `${i.label} - proposed order caption` })),
      rowOf({ ...captionJudgeBlank, id: "order_caption_judge", label: "Judge assigned to the case, shown in the proposed order caption" }),
      rowOf(rbf("order_otn", "OTN of the case, stated in the proposed order so the order is actionable by GCIC",
        "the GCIC OTN, copied from your Georgia criminal history report where it appears - a restriction order that does not identify the case for GCIC is not actionable",
        "the OTN lives on the criminal history record, which the platform never collects, inspects or authenticates")),
      rowOf(rbf("order_arrest_date", "Date of arrest identified in the proposed order",
        "the date of arrest, from the case papers or your Georgia criminal history report - the order names it so the agencies can identify the cycle",
        "no arrest fact is held for a record the platform has not seen")),
      rowOf(court("order_date", "Date of the Court's order (the SO ORDERED line)", "the court dates its own order")),
      rowOf(court("judge_signature", "Judge's signature line on the proposed order", "a third-party block; it is never prefilled"))
    );
  } else if (componentId === "certificate_of_service") {
    writes.push(write("certifier_name", "Defendant named as the certifier on the certificate of service", "participant.full_legal_name"));
    refusals.push(
      rowOf(attorneyBlock("prosecutor_name_address", "Name and mailing address of the prosecuting attorney served, identified as District Attorney or Solicitor-General for the county",
        "the name and mailing address of the prosecuting attorney - District Attorney or Solicitor-General - for the county where you file; the clerk's office can provide it",
        "the platform holds no address for the prosecuting attorney and the participant writes it before service")),
      rowOf(court("clerk_office_address", "Office of the Clerk of Court served with this filing",
        "the clerk's own office; the clerk's office confirms its service address")),
      ...(F.certAgency ? [rowOf(rbf("arresting_agency_service", "Name and service address of the arresting law enforcement agency served",
        "the name of the agency that arrested you and its service address - confirm the service destination with that agency before serving; this route requires notice to the arresting agency as well as the prosecuting attorney",
        "an agency name and destination are case facts the participant can obtain, not fields the court owns"))] : []),
      rowOf(rbf("service_method", "Method used to serve each recipient, chosen from those the certificate lists",
        `how you actually served each recipient - ${F.serviceMethods} - confirmed with the clerk of the court named in the caption before filing, because local courts control their own filing and e-filing practice`,
        "which method the participant uses is settled only when service actually happens")),
      rowOf(sig("service_date", "Date of service on the certificate of service", "a date written before the copies actually go out would be false")),
      rowOf(sig("certificate_signature", "Signature of the defendant on the certificate of service", "the defendant signs the certificate when the copies actually go out"))
    );
  } else {
    writes.push(write("participant_name", "Defendant named on this exhibit page", "participant.full_legal_name"));
  }
  const conditions = componentConditions(F);
  return {
    formNumber: componentId, documentId: componentId, documentRole: componentId,
    documentPolicy: {
      mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: F.routeKeys[0],
      ...(conditions[componentId] ? { conditional: true, conditionDescription: conditions[componentId] } : {})
    },
    structuralClass: "composed_document",
    composedFrom:
      `the pinned Georgia legal review (${SOURCE_DOC_ID}, Master Library ${SOURCE_REL}), the adopted legal-design intake record (${MEMO_PATH}, track ${F.trackId}), and the packet-set manifest (${MANIFESTS_PATH}, packetSetId ${familyId})`,
    explicitMappings: {}, roleRefusals: [], selectionControls: [],
    canonicalWrites: writes, canonicalRefusals: refusals,
    boundaryWrites: writes, boundaryRefusals: refusals
  };
}

/* ---- byte proof of the composed writes -------------------------------------------- */
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
      const found = componentText.includes(value) || componentText.includes(value.toUpperCase());
      assert.ok(found, `${fixtureName} ${map.formNumber}/${w.field}: the value bound to ${w.factId} is not readable from the output bytes`);
      glyphs += value.replace(/\s+/g, "").length;
      actualWrites.push({
        field: w.field, document: map.formNumber, factId: w.factId,
        expected: value, foundInOutputBytes: true,
        proof: "value read back from the extracted text of the component's own pages in the saved packet bytes"
      });
    }
  }
  // Terminology discipline, proved from the output bytes: no page may say the
  // record is erased, destroyed, deleted or otherwise gone, and none may use
  // the pre-2013 vocabulary the review retired.
  for (const [i, t] of textOfPage.entries()) {
    const lower = t.toLowerCase();
    for (const banned of NEGATIVE_ANCHORS) {
      assert.ok(!lower.includes(banned),
        `packet page ${i + 1} carries the prohibited term "${banned}"; Georgia copy says restrict and seal, and never promises removal`);
    }
  }
  return { actualWrites, glyphs, pagesRead: pages.length };
}

/* ---- the builder's own count of the nine counters ---------------------------------- */
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
    const declared = {
      ...blank.declared,
      factAvailable: (blank.declared?.factId ? availableFacts.has(String(blank.declared.factId)) : false)
        || writtenInDocument.get(blank.document)?.has(normLabel(blank.label))
        || writtenInDocument.get(blank.document)?.has(normLabel(blank.name)) || false
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

/* ---- outputs ---------------------------------------------------------------------- */
function writeJson(rel, value) {
  const absolute = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  /* A hand-written identityRefresh on a source pin this build did not move
   * survives the rebuild; one whose source moved again does not. See
   * scripts/rcap-packet-completeness/identity-refresh.mjs. */
  fs.writeFileSync(absolute, `${JSON.stringify(preserveIdentityRefresh(fs, absolute, value), null, 2)}\n`);
}

function requiredBeforeFilingItems(F, maps) {
  const order = Object.fromEntries(componentIds(F).map((c, i) => [c, i]));
  return maps.flatMap((m) => (m.canonicalRefusals ?? [])
    .filter((r) => r.requiredBeforeFiling === true)
    .map((r) => ({
      document: m.formNumber, field: r.field, page: r.page,
      printedContext: r.printedLabel, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply
    })))
    .sort((a, b) => (order[a.document] - order[b.document]) || a.field.localeCompare(b.field));
}

function participantInstructions(F, maps, rbfItems) {
  const titles = componentTitles(F);
  const byDoc = new Map();
  for (const item of rbfItems) byDoc.set(item.document, [...(byDoc.get(item.document) ?? []), item]);
  const out = [];
  out.push(`# What you must do before you file — ${F.routeName}`, "");
  out.push(`This packet is prepared for **${F.legalName}**.`, "");
  out.push("No statewide Georgia judiciary form exists for this filing, so the pages in this packet are composed pleadings, grounded on the controlling Georgia legal review's own custom-pleading specification and on the adopted legal-design record for this track.", "");
  out.push("The platform filled in what it holds about you: your name, your mailing address, your telephone number and your email. Every case fact lives on a court record the platform has not seen, so every one of them is a labelled dotted blank listed below, and you fill it from the record itself, never from memory.", "");

  out.push("## Restrict and seal — the words matter", "");
  out.push("Georgia law provides **record restriction** (limiting who may see criminal history record information) and, separately, **sealing** (closing the clerk of court's file). Neither remedy destroys the record, and this packet never says otherwise.", "");
  out.push("**A restriction or sealing may still be used to disqualify you from employment or office** in the same manner as a first offender discharge under O.C.G.A. § 42-8-63.1, and it does not supersede disclosure required by federal law. Nothing in § 35-3-37 gives you the right to deny that a restricted arrest or conviction exists, and this packet never tells you that you may.", "");

  out.push("## What is in this packet", "");
  out.push("| Component | What it is |", "| --- | --- |");
  out.push(`| \`primary_filing\` | ${titles.primary_filing} — the composed ${F.instrument}, filed in the existing criminal case under the existing case number, styled State of Georgia v. Defendant |`);
  out.push(`| \`proposed_order\` | ${titles.proposed_order} — always filed with the ${F.instrument}; a restriction order that does not name GCIC is not actionable |`);
  out.push(`| \`certificate_of_service\` | ${titles.certificate_of_service} — certifies service on ${F.certAgency ? "the prosecuting attorney, the clerk of court AND the arresting law enforcement agency" : "the prosecuting attorney and the clerk of court"} |`);
  for (const e of F.exhibits) {
    out.push(`| \`${e.id}\` | Exhibit ${e.letter} — ${e.name}${e.requirement === "conditional" ? ` (conditional: ${e.condition})` : ""} |`);
  }
  out.push("");

  out.push("## Documents you must obtain before filing", "");
  out.push("| Document | Where you get it |", "| --- | --- |");
  for (const e of F.exhibits) out.push(`| ${e.name}${e.requirement === "conditional" ? " (conditional)" : ""} | ${e.from} |`);
  out.push("");
  out.push("GBI's guidance says a Georgia criminal history record can be obtained from most sheriff's offices or police departments, with requirements varying by agency. Bring government photo identification and the agency's fee; the GCIC lobby office is by appointment only.", "");

  out.push("## The items you must supply", "");
  out.push("Each is printed on its page as a labelled dotted blank. Fill every one, from the records above.", "");
  for (const [doc, items] of byDoc) {
    out.push(`### ${doc} — ${titles[doc] ?? doc}`, "");
    out.push("| The blank on the document | What to write |", "| --- | --- |");
    for (const i of items) out.push(`| ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }
  out.push("Also written by you before service, on the certificate of service: the name and mailing address of the prosecuting attorney (District Attorney or Solicitor-General) for the county, and the office of the Clerk of Court served — the clerk's office can provide both.", "");

  out.push("## What you do, in order", "");
  out.push("1. **Gather the records** listed above, and fill in every dotted blank from them. Do not guess a date, a Code section or a case number.");
  out.push(`2. **Read every numbered statement in the ${F.instrument}.** Each is pleaded as your own statement. If any is not true of your case, do not file; see the help section below.`);
  out.push(`3. **Confirm the filing method with the clerk before filing.** ${F.venueLine} No statewide judiciary form exists, local courts control their own filing and e-filing practice, some clerks resist accepting motions in closed criminal cases, and some judges have standing preferences on proposed orders — ask the clerk before you file.`);
  out.push(`4. **Sign and date the ${F.instrument} yourself.** The platform never signs for you and never dates a signature. Sign "Defendant, Pro Se" where unrepresented. No notarization is required by statute, and none is added.`);
  out.push(`5. **File with ${F.clerkAuthority}**, in the existing criminal case under the existing case number.`);
  out.push(`6. **Serve every recipient the certificate of service names**, by ${F.serviceMethods}, and complete the certificate only when the copies actually go out.`);
  out.push("");

  out.push("## Money", "");
  out.push(`No statutory filing fee is identified for this ${F.instrument}: it is a filing in an existing criminal case, not a new civil action, and the leading Georgia pro se practice does not budget one. **Whether any Georgia clerk charges a fee for such a filing is unresolved and county-specific, so this packet quotes no figure — ask ${F.clerkAuthority} before filing.** Whether the O.C.G.A. § 9-15-2 pauper's-affidavit practice reaches a filing in a criminal case is likewise unresolved; ask the same clerk. Local agency fees for obtaining a criminal history report vary by agency.`, "");

  out.push("## Timing on this route", "");
  for (const t of F.timingNotes) out.push(`- ${t}`);
  out.push("");

  out.push("## Things the platform deliberately left blank", "");
  out.push("- **Your signature, and every date beside a signature.** A signature is yours alone, and a date written before you sign — or before a copy is actually served — would be false.");
  out.push("- **The judge's name, the SO ORDERED date and the judge's signature block.** The court assigns the judge, sets any hearing and dates its own order after filing. Third-party blocks are never prefilled.");
  if (F.narrative) out.push("- **Every line of your own statement.** The packet prompts for and formats your account; it never writes it.");
  out.push("");

  out.push("## When to stop and get help instead of filing", "");
  for (const s of F.stopConditions) out.push(`- ${s}`);
  out.push("");
  out.push("Where any of these is true, take this packet to a Georgia records-restriction desk or a lawyer: the Georgia Justice Project, the Cobb County Second Chance Desk, the Henry County Records Restriction Desk, or Middle Georgia Justice (\"The Desk\") — the four desks named by the Judicial Council of Georgia's Access to Justice self-help resources.", "");

  out.push("## What this packet is not", "");
  out.push(`This is a prepared set of composed pleadings and process pages. It is not an official Georgia court form — no statewide judiciary form exists for this filing, which is why these pages are composed — and it is not legal advice, it is not filed for you, and it does not decide whether the court will grant relief. Restriction limits access; sealing closes the clerk's file; neither destroys the record.`, "");
  out.push(`_Route(s): ${F.routeKeys.join(" · ")}_`);
  return `${out.join("\n")}\n`;
}

/* ---- the entry point ----------------------------------------------------------------- */
export async function runGaFamily(familyId, argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");
  const F = FAMILIES[familyId];
  assert.ok(F, `this host serves no family named ${familyId}`);
  const OUT = `data/rcap-all50/overlays/census-v1/ga/${familyId}--custom-pleading`;
  const BUILD_SCRIPT = `scripts/build-census-v1-${familyId}.mjs`;
  const COMPONENTS = componentIds(F);
  const TITLES = componentTitles(F);

  const { failures, source } = resolveSource();
  if (failures?.length > 0) {
    return {
      familyId, status: "BLOCKED_SOURCE", failedSourceIdentities: failures,
      why: "the held codified-text source did not bind by exact SHA-256, so nothing may be composed against it",
      overlayDirectoryTouched: false
    };
  }
  assert.equal(source.missingAnchors.length, 0,
    `the held source no longer prints ${source.missingAnchors.length} statement(s) this build relies on: ${JSON.stringify(source.missingAnchors)}`);

  const records = resolveCommittedRecords(F, familyId);

  if (checkOnly) {
    const maps = COMPONENTS.map((c) => composedMap(F, c, familyId));
    return {
      familyId, status: "CHECK_ONLY",
      boundSource: SOURCE_DOC_ID, sha256: source.sha256, faceAnchorsVerified: FACE_ANCHORS.length,
      components: COMPONENTS,
      writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
      blanks: maps.reduce((n, m) => n + m.canonicalRefusals.length, 0)
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  const maps = COMPONENTS.map((c) => composedMap(F, c, familyId));
  const artifacts = [];
  const writeProofs = [];
  const rasterPages = [];
  const pdfsDeclared = [];

  for (const fixtureName of ["canonical", "boundary"]) {
    const facts = FIXTURES[fixtureName];
    const packet = await PDFDocument.create();
    stampDeterministic(packet);
    packet.setTitle(`${F.legalName} — ${fixtureName} fixture`);
    const pageManifest = [];
    const documents = [];

    for (const componentId of COMPONENTS) {
      const body = composedBody(F, componentId, facts);
      assert.ok(body.includes(facts["participant.full_legal_name"]) || body.includes(facts["participant.full_legal_name"].toUpperCase()),
        `${componentId}: the composed page must carry the participant's name`);
      const composedBytes = await renderComposedPdf(body, TITLES[componentId]);
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
      proofMethod: "every written fact value read back from the extracted text of its component's own pages in the saved packet bytes; every page asserted free of the prohibited removal vocabulary",
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

  const rbfItems = requiredBeforeFilingItems(F, maps);
  const instructionsText = participantInstructions(F, maps, rbfItems);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);

  const isFo = familyId.startsWith("ga-fo-");
  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId, worklistGroupId: familyId,
    jurisdiction: "GA", implementationStrategy: "custom_pleading",
    custodyClass: "CUSTOM_PLEADING_FROM_CODIFIED_TEXT", acquisitionCommissioned: false,
    corpusRootFromEnvironment: "MASTER_LIBRARY_SOURCE_DIR",
    bindingMethod: "held Master Library bytes hashed on every build + the archive's own STATE_MANIFEST.csv recorded SHA-256 + this host's pinned SHA-256 + printed-statement anchor verification, with the committed legal-design records hashed alongside",
    routeKeys: F.routeKeys, statutoryAuthority: F.statute, legalName: F.legalName,
    allSourcesExact: true,
    formIdentityNote:
      "The MASTER_QUEUE row binds NO official form (officialFormFamily NONE, forms [], boundSources []): no statewide "
      + "Georgia judiciary form exists for this filing, which the controlling state review states in terms. The packet is "
      + "composed from codified text exactly as the row's sourceStatus (CUSTOM_PLEADING_FROM_CODIFIED_TEXT) directs. The "
      + "held, hashable codified-text source is the Georgia legal review of 2026-07-30 in the mounted Master Library; its "
      + "Part 3 custom-pleading specification supplies the caption structure, the pleading titles, the controlling "
      + "citations, the proposed-order requirements, the certificate-of-service form and the local-form warning this "
      + "packet renders. The adopted legal-design intake record and the packet-set manifest carry that specification into "
      + "this track's components, inputs, rules and limitations; both are committed in this repository and hashed below.",
    ...(isFo ? {
      unresolvableNamedSourceIds: UNRESOLVABLE_FO_SOURCE_IDS,
      unresolvableNamedSourceNote:
        "The MASTER_QUEUE row's sourceIds name these two content hashes; the factory's source-custody reconciliation "
        + "records both as named_content_hash_not_in_corpus (SOURCE_GENUINELY_MISSING), and hashing every file in the "
        + "mounted Master Library found neither. No bytes for either hash exist in this container. Stated, not guessed: "
        + "the row itself marks the family source-ready on the codified text alone (boundCount 0, ready true), and this "
        + "build binds nothing to either hash."
    } : {}),
    documents: [
      {
        sourceIds: [`source-sha256:${source.sha256}`], documentId: SOURCE_DOC_ID, formNumber: SOURCE_DOC_ID,
        revision: "ASOF-2026-07-30", pathInArchive: SOURCE_REL, sha256: source.sha256, byteLength: source.byteLength,
        instrumentKind: "codified_text_source",
        role: "held codified-text source; grounds the composed pleadings and is NOT included in the rendered packet",
        faceAnchorsVerified: FACE_ANCHORS,
        archiveManifestSha256: source.manifestSha256
      },
      {
        sourceIds: [`source-sha256:${records.memoSha256}`], documentId: "GA-LEGAL-DESIGN-INTAKE-MEMO", formNumber: "GA-LEGAL-DESIGN-INTAKE-MEMO",
        revision: "1.0.0", pathInArchive: MEMO_PATH, sha256: records.memoSha256, byteLength: null,
        instrumentKind: "committed_legal_design_record",
        role: `adopted legal-design intake record, track ${F.trackId}; committed in this repository and read at build time`
      },
      {
        sourceIds: [`source-sha256:${records.manifestsSha256}`], documentId: "GA-PACKET-SET-MANIFEST", formNumber: "GA-PACKET-SET-MANIFEST",
        revision: null, pathInArchive: MANIFESTS_PATH, sha256: records.manifestsSha256, byteLength: null,
        instrumentKind: "committed_legal_design_record",
        role: `packet-set manifest, packetSetId ${familyId}; committed in this repository and read at build time`
      }
    ],
    composedComponentsAuthoredByThisBuild: COMPONENTS,
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "that the Georgia legal review of 2026-07-30 reflects the law on any later date",
      "that the enrolled text of 2026 Ga. Laws Act 403 (HB 162) has been verified against the review's summary of it",
      "that any output is approved for participant delivery",
      "that any record is eligible for relief under the cited Code sections"
    ]
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId,
    routeKeys: F.routeKeys, renderStrategy: "composed_pleading",
    jurisdiction: "GA", statute: F.statute, legalName: F.legalName,
    implementationStrategy: "custom_pleading",
    officialForm: null,
    boundCodifiedTextSource: SOURCE_DOC_ID,
    boundCodifiedTextRole:
      "codified-text source only - the controlling Georgia legal review, whose Part 3 custom-pleading specification "
      + "grounds the caption structure, pleading title, citations, proposed-order requirements and certificate of "
      + "service; it is not included in the packet",
    componentSet: COMPONENTS,
    componentConditions: componentConditions(F),
    dispositionVocabulary: [SIGNATURE, COURT_OWNED],
    routeSelectionsMade: [],
    routeSelectionNote:
      "The composed pages carry no election control. The statutory route is stated in the instrument's own title and "
      + "body, which is where this family's route determination lives. "
      + (F.routeKeys.length > 1
        ? "This family serves more than one route key; every route key names the same instrument under the same Code section, so no election arises."
        : "No participant-facing election is route-determined on this family."),
    requiredBeforeFilingCount: rbfItems.length,
    requiredBeforeFiling: rbfItems,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId,
    renderedFresh: true, derivedFromBytes: true,
    componentSet: COMPONENTS,
    componentConditions: componentConditions(F),
    boundCodifiedTextSource: {
      documentId: SOURCE_DOC_ID, formNumber: SOURCE_DOC_ID, sha256: source.sha256, byteLength: source.byteLength,
      role: "held codified-text source read for the pleading specification; not included in any rendered artifact"
    },
    committedLegalDesignRecords: [
      { documentId: "GA-LEGAL-DESIGN-INTAKE-MEMO", formNumber: "GA-LEGAL-DESIGN-INTAKE-MEMO", path: MEMO_PATH, sha256: records.memoSha256 },
      { documentId: "GA-PACKET-SET-MANIFEST", formNumber: "GA-PACKET-SET-MANIFEST", path: MANIFESTS_PATH, sha256: records.manifestsSha256 }
    ],
    pdfs: pdfsDeclared,
    artifacts,
    packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    everyPageRastered: rasterPages.length === artifacts.reduce((n, a) => n + a.pageCount, 0),
    byteDerivedHashes: true,
    rasterEngine: skipRaster ? null : RASTER_ENGINE, rasterSkipped: skipRaster, rasterPages,
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId, derivedFromArtifactBytes: true,
    note:
      "Every written fact value was read back from the extracted text of its component's own pages in the saved packet "
      + "bytes, not from this builder's intent; every packet page was asserted free of the prohibited removal vocabulary "
      + "(the review's consumer-harm-grade correction), and the codified-text source is not part of the packet.",
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
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId,
    requiredBeforeFiling: rbfItems,
    protectedBlanks: maps.flatMap((m) => (m.canonicalRefusals ?? [])
      .filter((r) => r.requiredBeforeFiling !== true)
      .map((r) => ({ document: m.formNumber, field: r.field, label: r.effectiveLabel, refusalClass: r.category ?? null, why: r.why ?? r.reason }))),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  const counted = countCompleteness(maps, writeProofs, instructionsText);
  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId,
    whatThisIs:
      "The BUILDER's own count of the nine completeness counters, computed with the repository's own contract functions "
      + "over this family's field map, byte proof and participant-instructions.md.",
    whatThisIsNot:
      "A verdict. This lane does not verify its own packets, and PASS_COMPLETE additionally requires a hash-bound "
      + "RASTER_PASS from the central raster workflow.",
    counters: counted.counters,
    allNineZero: PASS_COUNTERS.every((c) => counted.counters[c] === 0),
    findings: counted.findings,
    blankDispositions: counted.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {})
  });

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId,
    buildStatus: "state_built", reviewStatus: "qa_review_pending", builtBy: BUILD_SCRIPT, sharedBuildHost: BUILD_HOST,
    rasterEngine: skipRaster ? "not rendered in this run" : "chromium_calibrated", popplerUsed: false,
    renderedArtifacts: artifacts.length, rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RASTER_LOCAL_PENDING_CENTRAL",
    independentVerificationStatus: "PENDING", selfVerified: false,
    generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1", familyId, blocking: [],
    findings: [
      {
        finding:
          "No statewide Georgia judiciary form exists for this filing, and the MASTER_QUEUE row binds no official form: "
          + "officialFormFamily NONE, forms [], boundSources [], sourceStatus CUSTOM_PLEADING_FROM_CODIFIED_TEXT.",
        consequence:
          "The packet is a controlled custom pleading composed from the pinned Georgia legal review's Part 3 "
          + "specification, the adopted legal-design intake record and the packet-set manifest — caption in the existing "
          + "criminal case styled State of Georgia v. Defendant, the specified pleading title, the specified citations "
          + "and nothing else, the proposed order that names GCIC, the OTN and the arrest date, and the certificate of "
          + "service naming the specified recipients. No form was substituted and none was invented."
      },
      {
        finding:
          "The court level is data: a state-law offense may have been tried in a State, Superior, Magistrate, Probate or "
          + "Municipal court, and the engine must not default to Superior Court."
          + (F.captionKind === "superior" ? " This route is the exception: § 35-3-37(j)(5) names the superior court of the county of arrest expressly." : ""),
        consequence:
          F.captionKind === "superior"
            ? "The caption prints SUPERIOR COURT as the statute directs, and only the county is carried to the participant."
            : "The caption's court-and-county blank asks for the court's name AND level, its printed label lists the five levels, and nothing defaults to Superior Court."
      },
      {
        finding:
          "Fee, fee waiver and e-filing for a filing in an existing Georgia criminal case are unresolved and "
          + "county-specific in the controlling review (a release blocker there), and no held source states a figure.",
        consequence:
          "The packet quotes no figure, states the unresolved status in terms, and delegates both questions to the clerk "
          + "of the named court by name. The unresolved questions travel to counsel review in approval-request.json."
      },
      {
        finding:
          "Georgia terminology discipline is consumer-harm-grade: the statute says restriction and sealing, neither "
          + "remedy destroys the record, § 35-3-37(u) lets a restriction still be used in the same manner as a first "
          + "offender discharge under § 42-8-63.1, and nothing gives a person the right to deny a restricted record.",
        consequence:
          "The composed pages never use the removal vocabulary (asserted over the output bytes on every build), the "
          + "instructions state the § 35-3-37(u) qualification in terms, and no page tells the participant they may say "
          + "the record does not exist."
      },
      ...F.familyFindings
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    counselQuestionsRaised: [
      "Whether a Georgia clerk charges a filing fee for a motion or petition filed in an existing criminal case, whether the O.C.G.A. § 9-15-2 pauper's affidavit practice reaches such a filing, and whether e-filing is available for a filing in a closed or pending criminal case — all three county-specific, unresolved, and release blockers in the controlling review. No figure is quoted anywhere in this packet.",
      `The composed ${F.instrument} pleads the ${F.statute} elements in the record's own words and mirrors the review's Part 3 caption, title, citation, proposed-order and service specification. Confirm the composed instrument is sufficient where no statewide judiciary form exists.`,
      ...F.familyCounselQuestions
    ],
    mattersForTheReviewersAttention: [
      "source-receipt.json formIdentityNote — the packet is composed from codified text with no official form bound; confirm that is legible to reviewers.",
      "Every case fact is required-before-filing; confirm the disclosure table in participant-instructions.md is complete against the dotted blanks on the paper.",
      "The proposed order names GCIC, the OTN and the arrest date because a restriction order that does not name GCIC is not actionable; confirm the order's agency-by-category naming."
    ]
  });

  const allZero = PASS_COUNTERS.every((c) => counted.counters[c] === 0);
  return {
    familyId,
    status: allZero ? "COMPLETED" : "STOPPED",
    ...(allZero ? {} : {
      stopClass: "COMPLETENESS_COUNTER_NOT_ZERO",
      nonZeroCounters: PASS_COUNTERS.filter((c) => counted.counters[c] > 0),
      firstFindings: counted.findings.slice(0, 6)
    }),
    counters: counted.counters,
    directory: OUT,
    implementationStrategy: "custom_pleading",
    boundCodifiedTextSource: SOURCE_DOC_ID,
    sourceSha256: source.sha256,
    committedRecordHashes: { memo: records.memoSha256, packetSetManifests: records.manifestsSha256 },
    components: COMPONENTS,
    documents: COMPONENTS,
    writes: maps.reduce((n, m) => n + (m.canonicalWrites ?? []).length, 0),
    requiredBeforeFiling: rbfItems.length,
    artifactHashes: artifacts.map((a) => ({ fixture: a.fixture, packetSha256: a.sha256, pages: a.pageCount })),
    rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RASTER_LOCAL_PENDING_CENTRAL",
    nineCountersZero: allZero,
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  const familyId = process.argv[2];
  runGaFamily(familyId, process.argv.slice(3))
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
