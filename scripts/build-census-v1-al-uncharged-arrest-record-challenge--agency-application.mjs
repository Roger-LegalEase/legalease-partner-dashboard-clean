#!/usr/bin/env node
/**
 * The Alabama uncharged-arrest agency record-challenge guidance builder.
 *
 *   node scripts/build-census-v1-al-uncharged-arrest-record-challenge--agency-application.mjs [--check]
 *
 * One census-v1 family, one strategy: participant_agency_application.
 *
 *   agency-application-treatment:obligation:research-decision-route:AL:al-uncharged-arrest:agency_record_challenge
 *
 * The AL.memo.json track carries a historical build blocker ("no route
 * established"). That blocker was resolved by the recorded research-track
 * decision in data/record-clearing/legal-decisions/2026-08-28-national-legal-
 * decisions.json (#al-uncharged-arrest), whose product disposition is in terms
 * "OUTPUT: AGENCY RECORD-CHALLENGE PACKET": Ala. Code §§ 41-9-645 and 41-9-646
 * provide a process to inspect and correct or supplement inaccurate,
 * incomplete, or misleading criminal justice information, beginning with an
 * administrative challenge to ALEA/ACJIC or the originating criminal justice
 * agency. The census route record binds this family to exactly that decision
 * branch. The de novo circuit-court appeal after a final denial is a SEPARATE
 * route (LWD-2026-08-30-AL-Q4, registry status hard_gate_pending) and this
 * packet does not open or draft it.
 *
 * One agency document IS held in the corpus and is bound here by hash:
 * SBI-FORM-46, the Application to Review Alabama Criminal History Record
 * Information — the instrument of the § 41-9-645 review step the counsel
 * record places first.
 *
 * Everything stated is anchored to pinned committed evidence; see the shared
 * builder's contract in scripts/rcap-agency-application/agency-application-build.mjs.
 */
import { runCli } from "./rcap-agency-application/agency-application-build.mjs";

const FAMILY_ID = "agency-application-treatment:obligation:research-decision-route:AL:al-uncharged-arrest:agency_record_challenge";

const EVIDENCE = [
  {
    id: "AL_DECISION_2026_08_28",
    path: "data/record-clearing/legal-decisions/2026-08-28-national-legal-decisions.json",
    sha256: "0aad88eff0e3d12ea9b10de9c80edcc5b3134508f097c9e85f0e35d34a9c74ef",
    role: "research-track decision al-uncharged-arrest: governing mechanism, route distinction, product disposition (AGENCY RECORD-CHALLENGE PACKET)"
  },
  {
    id: "AL_LWD_2026_08_30",
    path: "data/record-clearing/legal-decisions/2026-08-30-lawrence-four-counsel-determinations.json",
    sha256: "764d59c2965e5cfe272edbe5648be84e45194343865d3fbc43e45aa8751a49da",
    role: "LWD-2026-08-30-AL-Q4: the administrative-step sequence (trigger chain), the one-calendar-year note, and the 30-day court window after a final Commission decision"
  },
  {
    id: "AL_MEMO",
    path: "data/record-clearing/legal-design-intake/AL.memo.json",
    sha256: "7d484d636a1612c8a6c4648d1f070e1a21d2e3c0a0255afadd7780949e353391",
    role: "legal-design intake memo, track al-uncharged-arrest (citations; the historical blocker the 2026-08-28 decision resolved)"
  },
  {
    id: "CENSUS_ROUTE",
    path: "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
    sha256: "e615283930c6a9aab3be570ca5dd74a8990deb71dc2817733a3d262e48af6816",
    role: "route record binding this family to the agency_record_challenge decision branch, destination ALEA/ACJIC or the originating agency"
  },
  {
    id: "CORPUS_INDEX",
    path: "data/rcap-all50/local-source-corpus-index.json",
    sha256: "59fb63edc571e8cba54f28c983d8b62add9fdc77a642d82d203f53c5cd16dd6a",
    role: "committed corpus index carrying the held SBI-FORM-46 support document"
  },
  {
    id: "SBI46_SOURCE_RECORD",
    path: "data/rcap-all50/overlays/production/alabama/sbi-form-46-support-en/source-record.json",
    sha256: "c686a259c18ad84795f4d4a05312d4a2b7139f31836dc341369fc2af124742fc",
    role: "verified-binary source record for SBI-FORM-46 (title, revision, hash, byte length agreeing with the corpus index)"
  }
];

const ANCHORS = [
  {
    evidenceId: "AL_DECISION_2026_08_28",
    quotes: [
      "Sections 41-9-645 and 41-9-646 provide a process to inspect and correct or supplement inaccurate, incomplete, or misleading criminal justice information. They are not a general expungement remedy for an accurate arrest merely because no charge followed.",
      "The first step is an administrative challenge to ALEA/ACJIC or the originating criminal justice agency under the current record-challenge procedure. The participant supplies identity verification, fingerprints if required, the challenged entry, and certified proof of the correct disposition.",
      "If the agency denies the challenge, the individual may seek de novo review in circuit court within the statutory period.",
      "OUTPUT: AGENCY RECORD-CHALLENGE PACKET",
      "COURT OUTPUT: CUSTOM APPEAL ONLY AFTER FINAL DENIAL",
      "**record is wrong, incomplete, or assigned to the wrong person:** §§ 41-9-645 to -646 correction route;",
      "**record is accurate, but the participant seeks expungement of an uncharged arrest:** assess the separate Alabama expungement statute in Title 15;",
      "**identity theft or disputed biometrics:** agency correction first, counsel if unresolved."
    ]
  },
  {
    evidenceId: "AL_LWD_2026_08_30",
    quotes: [
      "The participant obtained and reviewed the Alabama criminal-history record.",
      "The participant timely submitted the AJIC challenge application and supporting official documentation.",
      "The original agency of record denied the requested correction or removal.",
      "The participant filed the required written administrative appeal to the AJIC Director.",
      "The Commission completed its review and issued a final decision.",
      "The underlying AJIC challenge ordinarily must have been initiated within one calendar year after AJIC's response to the participant's criminal-history application.",
      "File both documents on the same day and no later than 30 days after the participant received or was served with the final Commission decision.",
      "the agency disputes a material fact concerning identity, disposition, release or clearance"
    ]
  },
  {
    evidenceId: "AL_MEMO",
    quotes: [
      "Ala. Code § 41-9-645",
      "Ala. Code § 41-9-646",
      "al-uncharged-arrest"
    ]
  },
  {
    evidenceId: "CENSUS_ROUTE",
    quotes: [
      "obligation:research-decision-route:AL:al-uncharged-arrest:agency_record_challenge",
      "agency record-challenge packet",
      "ALEA/ACJIC or the originating criminal justice agency",
      "research-track-decision:al-uncharged-arrest"
    ]
  },
  {
    evidenceId: "CORPUS_INDEX",
    quotes: [
      "STATES/AL/04_SUPPORTING_PROCESS/AL__SUPPORT__SBI-FORM-46__application-to-review-alabama-criminal-history-record-information__REV-2017-10-01__EN.pdf",
      "02ce19decc585903f73456371c2f51f8c01b39befa9b9b80560454e901bfb5e7"
    ]
  },
  {
    evidenceId: "SBI46_SOURCE_RECORD",
    quotes: [
      "Application to Review Alabama Criminal History Record Information",
      "02ce19decc585903f73456371c2f51f8c01b39befa9b9b80560454e901bfb5e7",
      "REV-2017-10-01"
    ]
  }
];

const INSTRUCTIONS = `# Challenging an Alabama criminal-justice record with the agency — Ala. Code §§ 41-9-645 and 41-9-646

This packet is prepared for **the Alabama agency record challenge for an uncharged arrest**, under Ala. Code §§ 41-9-645 and 41-9-646. It is an agency-application route: you apply to the record-holding agency, not to a court. This packet contains nothing to file in court and nothing to sign.

## Is this the right route? Read this first

Sections 41-9-645 and 41-9-646 provide a process to **inspect and correct or supplement inaccurate, incomplete, or misleading criminal justice information**. They are **not** a general expungement remedy for an accurate arrest merely because no charge followed. The recorded route distinction:

- **The record is wrong, incomplete, or assigned to the wrong person** → this route (the §§ 41-9-645 to -646 correction route).
- **The record is accurate, but you want an uncharged arrest expunged** → that is a different question, under Alabama's separate expungement statute in Title 15. This packet does not answer it — have that route assessed instead of using this one.
- **Identity theft or disputed biometrics** → agency correction first (this route), and counsel if it does not resolve.

## Which agency decides

**ALEA/ACJIC** (the Alabama Law Enforcement Agency / Alabama Criminal Justice Information Center) **or the originating criminal justice agency** — the agency whose record you are challenging — under the current record-challenge procedure. The de novo court review that exists after a final denial is a separate, later matter; nothing in this packet starts it.

## The steps, in the recorded order

**STEP ONE — obtain and review your Alabama criminal-history record.** The held instrument for this step is **SBI Form 46, "Application to Review Alabama Criminal History Record Information"** (revision 2017-10-01 is the edition held in this packet's source corpus). Obtain the current form from ALEA, complete it yourself, and follow the instructions printed on the form itself — including whatever fee the form states. This packet states no fee amount because no held source states one; the form and ALEA are the authorities on the current charge.

**STEP TWO — identify the challenged entry.** From the record you receive, identify exactly which entry about the uncharged arrest is inaccurate, incomplete or misleading, and how — for example, that you were released without charge or cleared through criminal proceedings and the entry does not show it.

**STEP THREE — submit the challenge.** Per the recorded procedure, the participant supplies: **identity verification, fingerprints if required, the challenged entry, and certified proof of the correct disposition.** Submit the challenge to ALEA/ACJIC or the originating criminal justice agency under the current record-challenge procedure — ask the agency that holds the record for its current challenge process and use exactly that process. Mind the recorded timing rule: the challenge ordinarily must be initiated **within one calendar year** after AJIC's response to your criminal-history application, so do not sit on the record once you receive it.

**STEP FOUR — if the agency denies the challenge, the administrative appeal.** The recorded sequence continues: a **written administrative appeal to the AJIC Director**, followed by the Commission's review and a **final decision**. Keep every response, every denial and every date in writing.

## After a final decision

If the Commission's final decision still leaves the record wrong, a **de novo review in circuit court** exists — but it is a separate route with its own packet, and the recorded deadline is short: the recorded rule is to file the required documents **no later than 30 days after you received or were served with the final Commission decision**. If you reach a final denial, take the complete written record of your challenge to an Alabama attorney, or return for that separate route, immediately — within days, not weeks.

## What to keep, from the first step on

- your criminal-history application and AJIC's response, with dates;
- the challenged record itself;
- your challenge submission and everything you attached;
- every agency response and its envelope or delivery record;
- your written administrative appeal and the final Commission decision, with the date you received it.

## Stop and get help instead of continuing

- **The agency disputes a material fact concerning identity, disposition, release or clearance.** That is a contested matter — take it to an Alabama attorney.
- **The record is accurate and your goal is expungement.** Wrong route; the Title 15 expungement question is assessed separately.
- **Any step's current procedure, form or fee is unclear.** Ask ALEA/ACJIC or the originating agency directly, and follow what they tell you in writing. Do not guess, and do not draft around a requirement you have not confirmed.

## What this packet is not

This is a prepared instruction document for a challenge you make yourself to the agency. It is not a court filing, it is not the de novo appeal, it is not legal advice, it is not submitted for you, and it does not decide whether the agency will correct the record. Nothing in it is signed, and nothing in it needs your signature — anything you sign is the agency's own form or your own challenge submission.

_Route: obligation:research-decision-route:AL:al-uncharged-arrest:agency_record_challenge_
`;

const SPEC = {
  familyId: FAMILY_ID,
  worklistGroupId: FAMILY_ID,
  jurisdiction: "AL",
  routeKey: "obligation:research-decision-route:AL:al-uncharged-arrest:agency_record_challenge",
  legalName: "Alabama Criminal-Justice-Information Agency Record Challenge, Ala. Code §§ 41-9-645 to 41-9-646",
  outDir: "data/rcap-all50/overlays/census-v1/al/al-uncharged-arrest-record-challenge--agency-application",
  buildScript: "scripts/build-census-v1-al-uncharged-arrest-record-challenge--agency-application.mjs",
  evidence: EVIDENCE,
  anchors: ANCHORS,
  heldForms: [
    {
      formNumber: "SBI-FORM-46",
      state: "AL",
      title: "Application to Review Alabama Criminal History Record Information",
      revision: "REV-2017-10-01",
      role: "criminal_history_review_application",
      pathInArchive: "STATES/AL/04_SUPPORTING_PROCESS/AL__SUPPORT__SBI-FORM-46__application-to-review-alabama-criminal-history-record-information__REV-2017-10-01__EN.pdf",
      committedSha256: "02ce19decc585903f73456371c2f51f8c01b39befa9b9b80560454e901bfb5e7",
      byteLength: 438712
    }
  ],
  instructions: INSTRUCTIONS,
  declaredAmounts: [],
  mustState: [
    "not** a general expungement remedy for an accurate arrest merely because no charge followed",
    "identity verification, fingerprints if required, the challenged entry, and certified proof of the correct disposition",
    "within one calendar year",
    "written administrative appeal to the AJIC Director",
    "no later than 30 days after you received or were served with the final Commission decision",
    "This packet states no fee amount because no held source states one",
    "ask the agency that holds the record for its current challenge process and use exactly that process",
    "The agency disputes a material fact concerning identity, disposition, release or clearance."
  ],
  notHeld: [
    "the current record-challenge submission mechanics, address and format (the agency's current procedure governs; ALEA/ACJIC or the originating agency is the checkable authority)",
    "any fee for the record review or the challenge (no held source states one; SBI Form 46's own instructions and ALEA are the checkable authorities)",
    "processing times at any step (none recorded; the agency is the checkable authority)"
  ],
  findings: [
    {
      finding: "The AL.memo.json track records a build blocker (route existence unresolved as of 2026-07-30). The "
        + "recorded research-track decision of 2026-08-28 resolved it: the §§ 41-9-645 to -646 correction route "
        + "exists for inaccurate, incomplete or misleading information, with product disposition OUTPUT: AGENCY "
        + "RECORD-CHALLENGE PACKET, and the census route record binds this family to exactly that branch.",
      consequence: "The build proceeds on the decision record, and the packet's first section carries the "
        + "decision's own route distinction so an accurate-record participant is routed out, not promised relief."
    },
    {
      finding: "The de novo circuit-court review after a final Commission denial is a separate route "
        + "(LWD-2026-08-30-AL-Q4), registered hard_gate_pending with exhaustion gates not yet in code.",
      consequence: "This packet drafts nothing for the court route and opens nothing; it states only the recorded "
        + "30-day urgency and directs the participant to an attorney or the separate route at final denial."
    },
    {
      finding: "SBI-FORM-46 is held in the corpus with two agreeing committed records (corpus index and "
        + "verified-binary source record) and is the identified instrument of the review step the counsel record "
        + "places first. Its retirement record retired it only for having no naming surface, with reversal defined "
        + "as being named by a guidance packet.",
      consequence: "The form is bound by committed hash as a source-referenced component and named as the "
        + "review-step instrument; the participant is directed to obtain the current edition from ALEA and follow "
        + "the form's own printed instructions, including its fee."
    },
    {
      finding: "No held source states the challenge submission address, format or fee, and the counsel record "
        + "describes the procedure generically (\"under the current record-challenge procedure\").",
      consequence: "Every such mechanic is delegated to ALEA/ACJIC or the originating agency by name. Nothing is "
        + "guessed."
    }
  ],
  counselQuestions: [
    "Confirm that naming held SBI-FORM-46 REV-2017-10-01 as the review-step instrument is correct, or supply the "
      + "current ALEA edition for the corpus.",
    "The recorded one-calendar-year initiation window and the 30-day post-decision court window are stated from "
      + "the counsel record; confirm both figures for participant-facing copy.",
    "Confirm the boundary drawn here between this agency-challenge packet and the separate hard-gated de novo "
      + "court route (LWD-2026-08-30-AL-Q4) matches counsel's intent."
  ],
  reviewerAttention: [
    "The memo's historical build blocker and the 2026-08-28 decision that resolved it are both pinned as "
      + "evidence; the packet is grounded on the later, controlling record.",
    "This family renders no PDF and no field map, so the packet-completeness verifier does not audit it; "
      + "reports/rendered-artifacts.json states the audit boundary."
  ],
  receiptDoesNotEstablish: [
    "that SBI-FORM-46 REV-2017-10-01 is the current published edition of the review application",
    "the current text of Ala. Code §§ 41-9-645, 41-9-646 or 41-9-625",
    "any element of the separate de novo court route, which stays hard_gate_pending"
  ]
};

runCli(SPEC);
