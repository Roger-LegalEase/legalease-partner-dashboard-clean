#!/usr/bin/env node
/**
 * The New Mexico DNA sample/profile expungement agency-application guidance builder.
 *
 *   node scripts/build-census-v1-nm-dna-sample-profile-expungement--agency-application.mjs [--check]
 *
 * One census-v1 family, one strategy: participant_agency_application.
 *
 *   agency-application-treatment:obligation:runtime-only:NM:dna-sample-profile-expungement
 *
 * NMSA 1978, Section 29-16-10: a written request to the administrative center of
 * the state DNA identification system for expungement of the participant's DNA
 * sample and DNA records — an administrative request to an agency, not a court
 * filing, and it does not use the Rule 1-077.1 NMRA form set. The runtime
 * authority is LD-NM-02 (outcomeMode agency_application), and the compiled
 * profile's Lawrence ratification is hold_guidance: show substantive guidance
 * only for this release. That is exactly what this build renders.
 *
 * The hardest fact on this route is a NEGATIVE one, recorded in the memo: the
 * receiving office is NOT identified in any held source, and the Department of
 * Public Safety's published expungement page carries no DNA procedure and names
 * no receiving unit (confirmed 2026-08-06). So the instructions carry an
 * explicit self-help stop — confirm the receiving office with DPS before
 * sending anything — and this packet names no address, because it holds none.
 *
 * Everything stated is anchored to pinned committed evidence; see the shared
 * builder's contract in scripts/rcap-agency-application/agency-application-build.mjs.
 */
import { runCli } from "./rcap-agency-application/agency-application-build.mjs";

const FAMILY_ID = "agency-application-treatment:obligation:runtime-only:NM:dna-sample-profile-expungement";

const EVIDENCE = [
  {
    id: "NM_MEMO",
    path: "data/record-clearing/legal-design-intake/NM.memo.json",
    sha256: "94fe9d381be4e2b03e78397bb67a76c30c5005854d178606604689d19e002f25",
    role: "legal-design intake memo, track nm_dna_expungement (controlling summary, exclusions, self-help limits, the unresolved receiving-office question)"
  },
  {
    id: "NM_PROFILE",
    path: "src/lib/rcap-engine/compiled/profiles/NM-new-mexico.json",
    sha256: "ec03515fa44ddab02dd1b4d2be31c42752f145f142d2f46841fa73c052634086",
    role: "compiled runtime pathway dna-sample-profile-expungement: LD-NM-02 authority block, packet components, processing-period rule, Lawrence hold_guidance ratification"
  },
  {
    id: "NM_ROUTE_CONTRACT",
    path: "src/lib/legal-authority/routes/single-routes.json",
    sha256: "3c96528143c0e86363873c68dc64bcb8704241900681731e6d24c7c3e8ab5a36",
    role: "route contract NM:dna-sample-profile-expungement (decisionId LD-NM-02, outcomeMode agency_application)"
  },
  {
    id: "CENSUS_ROUTE",
    path: "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
    sha256: "e615283930c6a9aab3be570ca5dd74a8990deb71dc2817733a3d262e48af6816",
    role: "route record for obligation:runtime-only:NM:dna-sample-profile-expungement (participant_agency_application)"
  }
];

const ANCHORS = [
  {
    evidenceId: "NM_MEMO",
    quotes: [
      "NMSA 1978, Section 29-16-10",
      "or where the arrest that led to it ended in dismissal, nolle prosequi, successful preprosecution diversion, conditional discharge, misdemeanor conviction or acquittal, or did not result in a felony charge within one year",
      "the request must be written and supported by certified documentation or a sworn affirmation",
      "expungement from the state system carries expungement from CODIS",
      "relief is unavailable where the person has a prior felony conviction or a pending felony charge for which DNA collection is authorized",
      "This is an administrative written request to an agency and not a court filing",
      "it does not use the Rule 1-077.1 NMRA form set",
      "No court venue. The review describes a written request to the administrative center of the state DNA identification system, and does not name the office, unit or destination.",
      "The New Mexico Department of Public Safety's published expungement page carries no DNA procedure and names no receiving unit, confirmed on 2026-08-06.",
      "Any prior felony conviction or pending felony charge for which DNA collection is authorized.",
      "Obtaining certified dispositions.",
      "https://www.dps.nm.gov/law-enforcement-records-bureau/expungements/"
    ]
  },
  {
    evidenceId: "NM_PROFILE",
    quotes: [
      "or a sworn affidavit that no felony charges were filed within one year",
      "the administrative center must ensure expungement from CODIS",
      "Agency 30- or 45-day processing periods",
      "never shown as prefiling waits",
      "hold_guidance",
      "show substantive guidance only for this release",
      "dna_block_prior_felony_or_pending_felony",
      "Request to the administrative centre",
      "Disposition documentation",
      "Affidavit where the no-charge branch applies",
      "The one-year condition is a substantive lookback for the arrest-with-no-felony-charge branch, not a universal waiting period.",
      "LD-NM-02"
    ]
  },
  {
    evidenceId: "NM_ROUTE_CONTRACT",
    quotes: [
      "NM:dna-sample-profile-expungement",
      "LD-NM-02",
      "agency_application"
    ]
  },
  {
    evidenceId: "CENSUS_ROUTE",
    quotes: [
      "obligation:runtime-only:NM:dna-sample-profile-expungement",
      "New Mexico DNA Expungement Request under § 29-16-10",
      "Implement the participant-facing agency application workflow without representing it as a court petition."
    ]
  }
];

const INSTRUCTIONS = `# Asking New Mexico to remove your DNA sample and profile — NMSA 1978, Section 29-16-10

This packet is prepared for **New Mexico DNA sample and profile expungement under NMSA 1978, Section 29-16-10**. It is an agency-application route: an administrative **written request to an agency, not a court filing**. It does not use the court expungement forms (the Rule 1-077.1 NMRA form set), and it is separate from the ordinary court-record expungement — removing your DNA sample and records is its own relief with its own rules. This packet contains nothing to file in court.

## What this application is

A written request for expungement of your **DNA sample and DNA records from the state DNA identification system**. Per the record this packet is built from, expungement from the state system carries expungement from **CODIS** — the administrative center must ensure it.

## Who qualifies, per the record

The request is available where the **conviction** that led to the sample was **reversed**, or where the **arrest** that led to it ended in **dismissal, nolle prosequi, successful preprosecution diversion, conditional discharge, misdemeanor conviction or acquittal, or did not result in a felony charge within one year**. The one-year condition is a substantive lookback for the arrest-with-no-felony-charge branch, not a universal waiting period — on the other branches there is no recorded prefiling wait.

**Relief is unavailable where the person has a prior felony conviction or a pending felony charge for which DNA collection is authorized.** If that describes you, stop here — this route is closed to you by the statute as recorded.

## What you send

Per the record, the request must be **written** and supported by **certified documentation or a sworn affirmation**:

1. **The written request** for expungement of your DNA sample and DNA records.
2. **Certified disposition documentation** — a certified copy of the reversal, dismissal, nolle prosequi, diversion or conditional discharge completion, misdemeanor conviction or acquittal, obtained from the court that disposed of the matter; **or**, on the no-felony-charge branch, **a sworn affidavit that no felony charges were filed within one year** of the arrest.

This packet does not draft the request or the affidavit for you: the receiving office and its accepted request format are not established by any held source (see the stop below), and a document drafted to a guessed format for an unconfirmed office would be worse than none.

## Where it goes — stop here first

The record describes the request as going to **the administrative center of the state DNA identification system**, and **no held source identifies that office, its unit or its address**. The New Mexico Department of Public Safety's published expungement page carries no DNA procedure and names no receiving unit (confirmed 2026-08-06, at https://www.dps.nm.gov/law-enforcement-records-bureau/expungements/).

So, before you send anything: **contact the New Mexico Department of Public Safety and ask which office administers the state DNA identification system for Section 29-16-10 expungement requests, and in what form it accepts the written request and supporting documentation.** This packet deliberately names no mailing address, because it holds none — do not send your request or your certified documents anywhere you have not confirmed with the agency itself.

## Fees and processing times

No held source states a fee for this request, and this packet will not guess one — ask the receiving office when you confirm it. The record notes agency 30- or 45-day processing periods; those are **processing after the request**, never a wait you must serve before applying.

## Stop and get help instead of applying

- **You have any prior felony conviction or pending felony charge for which DNA collection is authorized.** The relief is recorded as unavailable; do not apply — talk to a New Mexico attorney about what, if anything, is open to you.
- **The receiving office cannot be confirmed**, or it asks for something this packet does not describe. Write down exactly what was asked and take it to a New Mexico attorney rather than improvising.
- **Obtaining certified dispositions is proving difficult.** That step is a recorded self-help limit — a court clerk or an attorney can help you get the certified copy this request needs.
- **Your DNA records involve another state or federal holdings outside CODIS.** The record covers the New Mexico system and CODIS through it, not other states' records.

## What this packet is not

This is a prepared instruction document for a request you make yourself to the agency. It is not a court petition and must never be represented as one, it is not the written request itself, it is not legal advice, it is not submitted for you, and it does not decide whether the agency will expunge your sample and records. Nothing in it is signed, and nothing in it needs your signature — the sworn affirmation, where that branch applies, is executed by you before a notary or as the receiving office directs, not on any page of this packet.

_Route: obligation:runtime-only:NM:dna-sample-profile-expungement_
`;

const SPEC = {
  familyId: FAMILY_ID,
  worklistGroupId: FAMILY_ID,
  jurisdiction: "NM",
  routeKey: "obligation:runtime-only:NM:dna-sample-profile-expungement",
  legalName: "Expungement of Samples and DNA Records from the DNA Identification System and CODIS, NMSA 1978, Section 29-16-10",
  outDir: "data/rcap-all50/overlays/census-v1/nm/nm-dna-sample-profile-expungement--agency-application",
  buildScript: "scripts/build-census-v1-nm-dna-sample-profile-expungement--agency-application.mjs",
  evidence: EVIDENCE,
  anchors: ANCHORS,
  heldForms: [],
  instructions: INSTRUCTIONS,
  declaredAmounts: [],
  mustState: [
    "written request to an agency, not a court filing",
    "certified documentation or a sworn affirmation",
    "a sworn affidavit that no felony charges were filed within one year",
    "Relief is unavailable where the person has a prior felony conviction or a pending felony charge for which DNA collection is authorized.",
    "no held source identifies that office, its unit or its address",
    "contact the New Mexico Department of Public Safety and ask which office administers the state DNA identification system",
    "This packet deliberately names no mailing address, because it holds none",
    "No held source states a fee for this request, and this packet will not guess one",
    "processing after the request",
    "never a wait you must serve before applying",
    "not a court petition and must never be represented as one"
  ],
  notHeld: [
    "the receiving office, unit and address for a Section 29-16-10 request (no held source identifies it; DPS is the checkable authority and the instructions stop the participant until it is confirmed)",
    "the accepted request format and any required form (none established; the receiving office is the checkable authority)",
    "any fee for the request (none stated in any held source; the receiving office is the checkable authority)",
    "the full statutory text of Section 29-16-10, which the memo records as not read at any official New Mexico channel"
  ],
  findings: [
    {
      finding: "The compiled profile's Lawrence ratification for this pathway is hold_guidance — show substantive "
        + "guidance only for this release, packet_capable false — and the memo records two build blockers: the "
        + "statute unread at any official channel, and the receiving office unidentified.",
      consequence: "The deliverable is exactly the substantive guidance the ratification permits: eligibility, "
        + "components and CODIS consequence stated from the recorded rules, with the receiving-office gap carried "
        + "as an explicit participant stop instead of an invented destination. No request instrument is drafted."
    },
    {
      finding: "The route record and route contract bind this family to LD-NM-02 with outcomeMode "
        + "agency_application, and the census obligation directs implementing it without representing it as a "
        + "court petition.",
      consequence: "The instructions open and close on the administrative character of the request and state "
        + "in terms that it is not a court petition and does not use the Rule 1-077.1 NMRA form set."
    },
    {
      finding: "LD-NM-02 carries the effective note that agency 30- or 45-day processing periods must not be "
        + "shown as prefiling waits, and the profile records the one-year condition as a substantive lookback "
        + "for one branch only.",
      consequence: "The instructions state the processing periods as post-request processing only, and the "
        + "one-year condition as the no-felony-charge branch's lookback rather than a universal waiting period."
    },
    {
      finding: "No New Mexico corpus document is bound to this route by any committed record; the held DPS "
        + "release-of-information and court expungement forms belong to other routes.",
      consequence: "No held form is referenced. The participant is directed to the receiving office for the "
        + "accepted format once that office is confirmed."
    }
  ],
  counselQuestions: [
    "The memo's counsel question stands: which New Mexico office is the administrative center of the state DNA "
      + "identification system for Section 29-16-10 requests, and in what form must the written request and "
      + "supporting documentation be made?",
    "Section 29-16-10 has not been read at an official New Mexico channel (nmonesource.com returns HTTP 403; DPS "
      + "publishes no DNA procedure). Confirm the recorded eligibility and documentation rules against the "
      + "official text before any promotion.",
    "Confirm that rendering substantive guidance for this hold_guidance pathway, with the receiving-office stop, "
      + "is the intended participant experience for this release."
  ],
  reviewerAttention: [
    "The instructions deliberately name no receiving address and no fee; the receiving-office stop is the "
      + "load-bearing safety feature of this packet and should survive any edit.",
    "This family renders no PDF and no field map, so the packet-completeness verifier does not audit it; "
      + "reports/rendered-artifacts.json states the audit boundary."
  ],
  receiptDoesNotEstablish: [
    "the current official text of NMSA 1978, Section 29-16-10",
    "the identity of the administrative center of the state DNA identification system",
    "that the recorded eligibility branches match the statute as currently in force"
  ]
};

runCli(SPEC);
