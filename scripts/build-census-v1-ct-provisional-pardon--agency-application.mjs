#!/usr/bin/env node
/**
 * The Connecticut provisional-pardon agency-application guidance builder.
 *
 *   node scripts/build-census-v1-ct-provisional-pardon--agency-application.mjs [--check]
 *
 * One census-v1 family, one strategy: participant_agency_application.
 *
 *   agency-application-treatment:obligation:track-only:CT:ct-provisional-pardon
 *
 * The Board of Pardons and Paroles grants a provisional pardon or a certificate
 * of employability: relief from employment and licensing barriers that DOES NOT
 * ERASE ANYTHING. The route is served by the participant applying to the Board
 * and signing their own application. No stable participant application document
 * has been identified that LegalEase could lawfully generate and submit — an
 * intake worksheet is not the legal filing packet (CT.memo.json, CT-11/CT-12) —
 * so this build renders instructions that point the participant at the Board's
 * own application and generates nothing.
 *
 * One agency document IS held in the corpus and is bound here by hash:
 * DPS-0846-C, the DESPP-SPBI criminal history record request form the memo names
 * as the way a participant establishes what is on their record before applying.
 *
 * Everything stated is anchored to pinned committed evidence; see the shared
 * builder's contract in scripts/rcap-agency-application/agency-application-build.mjs.
 */
import { runCli } from "./rcap-agency-application/agency-application-build.mjs";

const FAMILY_ID = "agency-application-treatment:obligation:track-only:CT:ct-provisional-pardon";

const EVIDENCE = [
  {
    id: "CT_MEMO",
    path: "data/record-clearing/legal-design-intake/CT.memo.json",
    sha256: "90d96d9d8a25ed7d64b86c3777f753eecfdb651ac083c0f9b53cbda06db5d448",
    role: "legal-design intake memo, track ct-provisional-pardon"
  },
  {
    id: "CT_GUIDANCE",
    path: "data/rcap-all50/guidance-packets/ct.json",
    sha256: "0acfc6fe64c87db98079fa17048c063513665bd27ff269d31a9604216460a023",
    role: "committed complete_guidance record for trackId ct-provisional-pardon (jobId T-B-CT-complete-guidance)"
  },
  {
    id: "CENSUS_ROUTE",
    path: "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
    sha256: "e615283930c6a9aab3be570ca5dd74a8990deb71dc2817733a3d262e48af6816",
    role: "route record for obligation:track-only:CT:ct-provisional-pardon (participant_agency_application, destination the Board)"
  },
  {
    id: "COUNSEL_MANIFEST",
    path: "data/rcap-ledger/completed-output-counsel-manifest.json",
    sha256: "99e8029120d705df8970d0deba651a95b00f4b81097c46a28ac8d0e128f8c93c",
    role: "counsel family rcap-ct-guidance-implementation, tracksServed includes ct-provisional-pardon"
  },
  {
    id: "CORPUS_INDEX",
    path: "data/rcap-all50/local-source-corpus-index.json",
    sha256: "59fb63edc571e8cba54f28c983d8b62add9fdc77a642d82d203f53c5cd16dd6a",
    role: "committed corpus index carrying the held DPS-0846-C support document"
  }
];

const ANCHORS = [
  {
    evidenceId: "CT_MEMO",
    quotes: [
      "Board of Pardons and Paroles relief from employment and licensing barriers. It does not erase anything. Keeping this distinct from an absolute pardon is the most common Connecticut misunderstanding after the erasure terminology.",
      "The Board grants the provisional pardon or certificate of employability. No stable participant application document has been identified that LegalEase could lawfully generate and submit.",
      "Application is made to the Board of Pardons and Paroles. LegalEase does not generate or submit it.",
      "No service. This is an executive-branch application, not a court filing.",
      "The participant signs their own application.",
      "The eligibility rules were not verified in this pass.",
      "SPBI criminal history record search, form DPS-0846-C",
      "Mail form DPS-0846-C with a check or money order to DESPP-SPBI, 1111 Country Club Road, Middletown, CT 06457-2389. LegalEase cannot complete this request.",
      "The participant wants the record erased, which this does not do.",
      "The Board sets a hearing.",
      "The participant has an immigration matter.",
      "An intake worksheet is not the legal filing packet.",
      "https://portal.ct.gov/cleanslate"
    ]
  },
  {
    evidenceId: "CT_GUIDANCE",
    quotes: [
      "we point you at the Board's own application and instructions rather than handing you a substitute",
      "Yes — you make an application to the Board of Pardons and Paroles, and you sign it yourself."
    ]
  },
  {
    evidenceId: "CENSUS_ROUTE",
    quotes: [
      "obligation:track-only:CT:ct-provisional-pardon",
      "participant-signed provisional-pardon application submitted through the Board of Pardons and Paroles portal"
    ]
  },
  {
    evidenceId: "COUNSEL_MANIFEST",
    quotes: [
      "rcap-ct-guidance-implementation",
      "ct-provisional-pardon"
    ]
  },
  {
    evidenceId: "CORPUS_INDEX",
    quotes: [
      "STATES/CT/04_SUPPORTING_PROCESS/CT__SUPPORT__DPS-0846-C__state-of-connecticut-criminal-history-record-request-form__REV-2017-12-01__EN.pdf",
      "8db6e31c03131d94f6ed8383f403b1daf45e9c4d12336cbf0abcebb4e65b588e"
    ]
  }
];

const INSTRUCTIONS = `# Applying to the Board of Pardons and Paroles for a provisional pardon or certificate of employability

This packet is prepared for **Connecticut's provisional pardon and certificate of employability — relief from employment and licensing barriers, without erasure**. It is an agency-application route: you apply to the Board of Pardons and Paroles and sign your own application. This is an executive-branch application, not a court filing — there is no court to file in and nothing to serve on anyone.

## The single most important thing about this relief

A provisional pardon and a certificate of employability **do not erase anything**. The conviction stays on your record. They relieve employment and licensing barriers the conviction creates, and that is all they do. Keeping this distinct from an absolute pardon — a different decision by the same Board — is the most common Connecticut misunderstanding after the erasure terminology itself. So decide first what you actually need:

- **A job, a licence or an occupational barrier is the problem** → this route is aimed at it.
- **You want the record itself cleared** → this route does not do that. Connecticut's erasure routes are separate, and Connecticut says erasure — not expungement, not sealing.

## Which agency decides

The **Connecticut Board of Pardons and Paroles**. The Board grants or denies the provisional pardon or the certificate of employability, under its own rules and on its own application. No court decides this and no prosecutor consents to it.

## What this packet does not draft for you, and why

You make the application to the Board yourself, and you sign it yourself. No stable participant application document has been identified that LegalEase could lawfully generate and submit — an intake worksheet is not the legal filing packet — so this packet points you at **the Board's own application and instructions** rather than handing you a substitute. Connecticut's recorded official channel for record-relief information, including how to reach the Board's process, is the state's Clean Slate portal at https://portal.ct.gov/cleanslate.

## What you gather before you apply

1. **What you are actually trying to do** — clear the record, or remove an employment or licensing barrier. This route only does the second.
2. **Every conviction creating the barrier** — the court, the docket number and the date for each one.
3. **What is on your record**, established from the record itself. The identified instrument for that is Connecticut's criminal history record request, form **DPS-0846-C** (DESPP, Division of State Police, State Police Bureau of Identification). Per the record this packet is built from: mail form DPS-0846-C with a check or money order to DESPP-SPBI, 1111 Country Club Road, Middletown, CT 06457-2389. This packet states no amount for that check because no held source states one — the form and the Bureau are the authorities on the current fee. LegalEase cannot complete this request for you and does not obtain, receive or inspect your record.

## Eligibility and timing

The eligibility rules for this relief were not verified in the review this packet is built from, and this packet will not guess them. The Board's own application materials are the checkable authority for who may apply and when — read them before you apply, and treat anything this packet does not state as a question for the Board, not as something to assume.

## Fees

The review this packet is built from does not establish the Board's fees for this application, and this packet will not guess them. The Board's own application materials are the authority on what, if anything, is charged.

## What happens after you apply

The Board decides. The review this packet is built from does not state the Board's notice rules, so follow the instructions the Board gives you with its application.

## Stop and get help instead of applying

- **You want the record erased.** This relief does not do that — the erasure routes are separate.
- **The Board sets a hearing.** Take the matter to a Connecticut attorney who handles record relief.
- **You have an immigration matter, pending or possible.** Settle it with an immigration attorney first.

## What this packet is not

This is a prepared instruction document for an application you make yourself to the Board. It is not the Board's application, it is not legal advice, it is not submitted for you, and it does not decide whether the Board will grant relief. Nothing in it is signed, and nothing in it needs your signature — the application you sign is the Board's own.

_Route: obligation:track-only:CT:ct-provisional-pardon_
`;

const SPEC = {
  familyId: FAMILY_ID,
  worklistGroupId: FAMILY_ID,
  jurisdiction: "CT",
  routeKey: "obligation:track-only:CT:ct-provisional-pardon",
  legalName: "Provisional Pardon and Certificate of Employability, Board of Pardons and Paroles",
  outDir: "data/rcap-all50/overlays/census-v1/ct/ct-provisional-pardon--agency-application",
  buildScript: "scripts/build-census-v1-ct-provisional-pardon--agency-application.mjs",
  evidence: EVIDENCE,
  anchors: ANCHORS,
  heldForms: [
    {
      formNumber: "DPS-0846-C",
      state: "CT",
      title: "State of Connecticut Criminal History Record Request Form",
      revision: "REV-2017-12-01",
      role: "criminal_history_record_request_support",
      pathInArchive: "STATES/CT/04_SUPPORTING_PROCESS/CT__SUPPORT__DPS-0846-C__state-of-connecticut-criminal-history-record-request-form__REV-2017-12-01__EN.pdf",
      committedSha256: "8db6e31c03131d94f6ed8383f403b1daf45e9c4d12336cbf0abcebb4e65b588e",
      byteLength: 104351
    }
  ],
  instructions: INSTRUCTIONS,
  declaredAmounts: [],
  mustState: [
    "do not erase anything",
    "an intake worksheet is not the legal filing packet",
    "the Board's own application and instructions",
    "DPS-0846-C with a check or money order to DESPP-SPBI, 1111 Country Club Road, Middletown, CT 06457-2389",
    "This packet states no amount for that check because no held source states one",
    "does not establish the Board's fees for this application, and this packet will not guess them",
    "The eligibility rules for this relief were not verified",
    "The Board sets a hearing.",
    "You have an immigration matter, pending or possible."
  ],
  notHeld: [
    "the Board's eligibility rules for this relief (not verified in the reviewed record; the Board's application materials are the checkable authority)",
    "the Board's fees for this application (not established; the Board's application materials are the checkable authority)",
    "the DESPP-SPBI record-request fee amount (not stated in any held source; the form and the Bureau are the checkable authorities)",
    "the Board's notice rules after application (not stated; the Board's own instructions govern)"
  ],
  findings: [
    {
      finding: "No stable participant application document has been identified that LegalEase could lawfully "
        + "generate and submit for the Board of Pardons and Paroles, and the controlling addendum (CT-11/CT-12) "
        + "keeps this route guidance/portal-assistance until the Board exposes one. An intake worksheet is not "
        + "the legal filing packet.",
      consequence: "The packet generates no application. It directs the participant to the Board's own application "
        + "and instructions, reached through the state's recorded Clean Slate portal, and to nothing else."
    },
    {
      finding: "The substance of this route, per the memo, is the distinction from an absolute pardon: a "
        + "provisional pardon and a certificate of employability relieve employment and licensing barriers and "
        + "erase nothing.",
      consequence: "The distinction is the first section of the instructions, and wanting erasure is a stop "
        + "condition that routes the participant out rather than onward."
    },
    {
      finding: "One agency support document is held in the corpus and bound by hash: DPS-0846-C, the DESPP-SPBI "
        + "criminal history record request the memo names for establishing what is on the record, with a committed "
        + "mailing destination. No held source states the fee amount.",
      consequence: "The form is referenced by exact hash as a source-referenced component with the memo's mailing "
        + "instruction quoted; the fee amount is delegated to the form and the Bureau rather than guessed."
    }
  ],
  counselQuestions: [
    "CT-11/CT-12 remain open: does the Board expose a stable participant application document LegalEase can "
      + "lawfully generate and submit? Until confirmed, this family stays a guidance deliverable.",
    "The eligibility rules for provisional pardons and certificates of employability were not verified in the "
      + "reviewed record; confirm the delegation to the Board's application materials is the intended treatment.",
    "Confirm the held DPS-0846-C edition (REV-2017-12-01) may continue to be named as the record-request "
      + "instrument, or supply the current edition for the corpus."
  ],
  reviewerAttention: [
    "The DESPP-SPBI mailing address stated in the instructions is quoted from the pinned CT.memo.json "
      + "supportingDocuments entry, not gathered fresh; source-freshness review should confirm it.",
    "This family renders no PDF and no field map, so the packet-completeness verifier does not audit it; "
      + "reports/rendered-artifacts.json states the audit boundary."
  ],
  receiptDoesNotEstablish: [
    "that DPS-0846-C REV-2017-12-01 is the current published edition of the record-request form",
    "that the DESPP-SPBI mailing address in the memo is still current"
  ]
};

runCli(SPEC);
