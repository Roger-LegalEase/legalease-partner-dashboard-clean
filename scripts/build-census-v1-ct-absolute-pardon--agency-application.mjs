#!/usr/bin/env node
/**
 * The Connecticut absolute-pardon agency-application guidance builder.
 *
 *   node scripts/build-census-v1-ct-absolute-pardon--agency-application.mjs [--check]
 *
 * One census-v1 family, one strategy: participant_agency_application.
 *
 *   agency-application-treatment:obligation:track-pathway:CT:ct-absolute-pardon:absolute-pardon-resulting-in-erasure
 *
 * Executive-branch clemency by online application through the Board of Pardons
 * and Paroles ePardon portal — the route for convictions Clean Slate cannot
 * reach. The pathway is absolute-pardon-RESULTING-IN-ERASURE: the memo's
 * ct-pardon-erasure track records the § 54-142a(d) consequence, an absolute
 * pardon received on or after 1 October 1974 results in erasure without a
 * petition.
 *
 * Two disciplines control the drafting. First, no stable participant
 * application document has been identified that LegalEase could lawfully
 * generate and submit (CT-11/CT-12), so nothing is generated and the
 * instructions end at the Board's own portal. Second, the memo records the
 * waiting-period and fee figures as UNVERIFIED and directs in terms that no
 * number be quoted in participant-facing copy — so this packet quotes none and
 * delegates every figure to the Board's published rules by name.
 *
 * Everything stated is anchored to pinned committed evidence; see the shared
 * builder's contract in scripts/rcap-agency-application/agency-application-build.mjs.
 */
import { runCli } from "./rcap-agency-application/agency-application-build.mjs";

const FAMILY_ID = "agency-application-treatment:obligation:track-pathway:CT:ct-absolute-pardon:absolute-pardon-resulting-in-erasure";

const EVIDENCE = [
  {
    id: "CT_MEMO",
    path: "data/record-clearing/legal-design-intake/CT.memo.json",
    sha256: "90d96d9d8a25ed7d64b86c3777f753eecfdb651ac083c0f9b53cbda06db5d448",
    role: "legal-design intake memo, tracks ct-absolute-pardon and ct-pardon-erasure (the § 54-142a(d) erasure consequence)"
  },
  {
    id: "CENSUS_ROUTE",
    path: "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
    sha256: "e615283930c6a9aab3be570ca5dd74a8990deb71dc2817733a3d262e48af6816",
    role: "route record for obligation:track-pathway:CT:ct-absolute-pardon:absolute-pardon-resulting-in-erasure"
  },
  {
    id: "COUNSEL_MANIFEST",
    path: "data/rcap-ledger/completed-output-counsel-manifest.json",
    sha256: "99e8029120d705df8970d0deba651a95b00f4b81097c46a28ac8d0e128f8c93c",
    role: "counsel family rcap-ct-guidance-implementation, tracksServed includes ct-absolute-pardon"
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
      "Executive-branch clemency by online application through the Board's ePardon portal. This is the route for convictions Clean Slate cannot reach and for a person who does not want to wait out the clock. Discretionary and hearing-based.",
      "An online application through the Board's portal. No stable participant application document has been identified that LegalEase could lawfully generate and submit; an intake worksheet is not the legal filing packet.",
      "Application is made online through the Board's ePardon portal. LegalEase does not generate or submit it.",
      "Claimed to be none by the internal reference. Not verified.",
      "Three years from disposition, unverified",
      "Five years from disposition, unverified",
      "The Board's process is hearing-based. The source review does not state the notice rules.",
      "The Board sets a hearing, which is a lawyer's proceeding.",
      "The participant has an immigration matter.",
      "The waiting-period and fee figures are unverified, so no number is quoted.",
      "The three-year and five-year figures and the no-fee claim in the internal reference are unverified. Verify every number before it appears in participant-facing copy.",
      "A pardon is the route for what Clean Slate cannot reach.",
      "Mail form DPS-0846-C with a check or money order to DESPP-SPBI, 1111 Country Club Road, Middletown, CT 06457-2389. LegalEase cannot complete this request and does not obtain, receive or inspect the record.",
      "Two branches turning on the pardon date. An absolute pardon received before 1 October 1974 requires a petition to the Superior Court, which shall direct erasure. An absolute pardon received on or after 1 October 1974 results in erasure without a petition: such records shall be erased.",
      "https://portal.ct.gov/cleanslate"
    ]
  },
  {
    evidenceId: "CENSUS_ROUTE",
    quotes: [
      "obligation:track-pathway:CT:ct-absolute-pardon:absolute-pardon-resulting-in-erasure",
      "participant-signed absolute-pardon application submitted through the Board of Pardons and Paroles portal"
    ]
  },
  {
    evidenceId: "COUNSEL_MANIFEST",
    quotes: [
      "rcap-ct-guidance-implementation",
      "ct-absolute-pardon",
      "CT:absolute-pardon-resulting-in-erasure"
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

const INSTRUCTIONS = `# Applying to the Board of Pardons and Paroles for an absolute pardon

This packet is prepared for **Connecticut's absolute pardon application through the Board of Pardons and Paroles ePardon portal**, on the pathway where an absolute pardon results in erasure of the record. It is an agency-application route: executive-branch clemency, applied for online by you, decided by the Board. It is discretionary and hearing-based. There is no court filing on this route, and this packet contains nothing to file and nothing to sign.

## Which agency decides

The **Connecticut Board of Pardons and Paroles**, through its **ePardon portal**. The Board grants or denies the pardon under its own rules and on its own online application. No court decides this.

## What an absolute pardon is, and when it is the right route

An absolute pardon is the route for **convictions Clean Slate erasure cannot reach**, and for a person who does not want to wait out the automatic clock. Before applying, check whether Clean Slate erasure already reaches your convictions — a pardon is the route for what Clean Slate cannot reach. Connecticut's recorded official channel for that check is the Clean Slate portal at https://portal.ct.gov/cleanslate.

Keep this distinct from a **provisional pardon or certificate of employability**, which relieve employment and licensing barriers and erase nothing. An absolute pardon is the record-clearing decision.

## How a pardon becomes erasure

Per the record this packet is built from (C.G.S. § 54-142a(d)): an absolute pardon received **on or after 1 October 1974** results in erasure **without a petition** — such records shall be erased. (A pardon received before 1 October 1974 requires a separate petition to the Superior Court; that older branch is not this pathway.) So on this pathway, the application to the Board is the whole of what you initiate: the erasure follows the pardon rather than requiring a second filing from you.

## What this packet does not draft for you, and why

The application is made online through the Board's ePardon portal, and you sign it there yourself. No stable participant application document has been identified that LegalEase could lawfully generate and submit — an intake worksheet is not the legal filing packet — so this packet generates nothing and points you at the Board's own portal and instructions.

## What you gather before you apply

1. **Every conviction you want pardoned** — the court, the docket number and the date for each.
2. **The date the sentence was completed or the case disposed**, for each conviction.
3. **Whether Clean Slate erasure already reaches these convictions** — checked before you apply.
4. **What is on your record**, established from the record itself. The identified instrument is Connecticut's criminal history record request, form **DPS-0846-C** (DESPP, State Police Bureau of Identification). Per the record this packet is built from: mail form DPS-0846-C with a check or money order to DESPP-SPBI, 1111 Country Club Road, Middletown, CT 06457-2389. This packet states no amount for that check because no held source states one — the form and the Bureau are the authorities on the current fee. LegalEase cannot complete this request and does not obtain, receive or inspect the record.

## Waiting periods and fees — deliberately not quoted here

The record this packet is built from carries waiting-period figures and a no-fee claim for the Board's process, and records every one of them as **unverified**, with an instruction that no unverified number appear in participant-facing copy. So this packet quotes none of them. Before you apply, read the Board's own published eligibility rules on the ePardon portal for the current waiting periods and any charge — the Board is the checkable authority, and its published rules control over anything summarized elsewhere.

## What happens after you apply

The Board's process is hearing-based and discretionary. The record this packet is built from does not state the Board's notice rules, so follow the instructions the portal gives you with your application.

## Stop and get help instead of applying

- **The Board sets a hearing.** A Board hearing is a lawyer's proceeding — take the matter to a Connecticut attorney who handles pardons before the hearing.
- **You have an immigration matter, pending or possible.** Settle it with an immigration attorney first.
- **Any waiting-period or fee question you cannot answer from the Board's published rules.** Ask the Board or an attorney; do not assume a figure.

## What this packet is not

This is a prepared instruction document for an application you make yourself in the Board's portal. It is not the application, it is not legal advice, it is not submitted for you, and it does not decide whether the Board will grant a pardon. Nothing in it is signed, and nothing in it needs your signature — the application you sign is the Board's own, in its portal.

_Route: obligation:track-pathway:CT:ct-absolute-pardon:absolute-pardon-resulting-in-erasure_
`;

const SPEC = {
  familyId: FAMILY_ID,
  worklistGroupId: FAMILY_ID,
  jurisdiction: "CT",
  routeKey: "obligation:track-pathway:CT:ct-absolute-pardon:absolute-pardon-resulting-in-erasure",
  legalName: "Absolute Pardon Application, Board of Pardons and Paroles, C.G.S. §§ 54-130a to 54-130e",
  outDir: "data/rcap-all50/overlays/census-v1/ct/ct-absolute-pardon--agency-application",
  buildScript: "scripts/build-census-v1-ct-absolute-pardon--agency-application.mjs",
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
    "ePardon portal",
    "an intake worksheet is not the legal filing packet",
    "records every one of them as **unverified**",
    "So this packet quotes none of them",
    "read the Board's own published eligibility rules on the ePardon portal",
    "This packet states no amount for that check because no held source states one",
    "The Board sets a hearing.",
    "You have an immigration matter, pending or possible."
  ],
  notHeld: [
    "the Board's waiting periods for misdemeanor and felony pardons (carried as unverified in the record; deliberately not quoted; the Board's published rules are the checkable authority)",
    "whether the Board charges a fee (the no-fee claim is unverified; deliberately not quoted; the Board's published rules are the checkable authority)",
    "the Board's notice and hearing mechanics (not stated in the reviewed record; the portal's instructions govern)",
    "the DESPP-SPBI record-request fee amount (not stated in any held source; the form and the Bureau are the checkable authorities)"
  ],
  findings: [
    {
      finding: "The memo records the Board's three-year and five-year waiting-period figures and the no-fee claim "
        + "as unverified release blockers, and directs that every number be verified before it appears in "
        + "participant-facing copy.",
      consequence: "The instructions quote no waiting period and no fee figure at all — not even labelled as "
        + "unverified — and delegate every figure to the Board's published eligibility rules on the ePardon "
        + "portal by name. A lookup instruction beats an unverified number."
    },
    {
      finding: "No stable participant application document has been identified that LegalEase could lawfully "
        + "generate and submit (CT-11/CT-12); the application is the Board's own, in its portal.",
      consequence: "The packet generates nothing and ends at the portal handoff, which is the boundary the "
        + "counsel family record draws for this track."
    },
    {
      finding: "The pathway is absolute-pardon-resulting-in-erasure, and the erasure consequence is recorded in "
        + "the memo's ct-pardon-erasure track: a pardon received on or after 1 October 1974 results in erasure "
        + "without a petition (C.G.S. § 54-142a(d)); the pre-1974 branch requires a Superior Court petition.",
      consequence: "The instructions state the on-or-after-1974 consequence as the pathway's mechanism and "
        + "explicitly exclude the pre-1974 petition branch as a different route."
    }
  ],
  counselQuestions: [
    "The Board's waiting periods and fees are unverified in the record (memo OPEN QUESTIONS / 8). Verify the "
      + "figures so participant-facing copy can carry them; until then this packet quotes none.",
    "CT-11/CT-12 remain open: does the Board expose a stable participant application document LegalEase can "
      + "lawfully generate and submit through ePardon? Until confirmed, this family stays a guidance deliverable.",
    "Confirm the § 54-142a(d) statement — pardon on or after 1 October 1974 results in erasure without a "
      + "petition — is the correct participant-facing framing for the absolute-pardon-resulting-in-erasure pathway."
  ],
  reviewerAttention: [
    "The route record marks this pathway paid_packet_intended with commercial state LAUNCH_GRAPH_CLOSED; this "
      + "build opens nothing and the deliverable stays non-commercial review evidence.",
    "The DESPP-SPBI mailing address stated in the instructions is quoted from the pinned CT.memo.json "
      + "supportingDocuments entry; source-freshness review should confirm it.",
    "This family renders no PDF and no field map, so the packet-completeness verifier does not audit it; "
      + "reports/rendered-artifacts.json states the audit boundary."
  ],
  receiptDoesNotEstablish: [
    "that DPS-0846-C REV-2017-12-01 is the current published edition of the record-request form",
    "that the Board's current eligibility rules match the unverified figures carried in the pinned memo",
    "the current text of C.G.S. §§ 54-130a to 54-130e, which the memo records as not read in its pass"
  ]
};

runCli(SPEC);
