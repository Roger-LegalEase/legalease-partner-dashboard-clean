#!/usr/bin/env node
/**
 * The Connecticut destruction-request agency-application guidance builder.
 *
 *   node scripts/build-census-v1-ct-destruction-request--agency-application.mjs [--check]
 *
 * One census-v1 family, one strategy: participant_agency_application.
 *
 *   agency-application-treatment:obligation:track-only:CT:ct-destruction-request
 *
 * C.G.S. § 54-142a(g)(1): the clerk shall provide security against unauthorized
 * access to erased records, or upon the request of the accused cause the actual
 * physical destruction of such records — except that destruction may not occur
 * until three years have elapsed from the date of final disposition. The route is
 * served by the accused ASKING the Superior Court clerk, not by filing anything:
 * no official form was located, and the accepted destination and format for a
 * written request have not been confirmed by counsel (CT.memo.json, CT-14). This
 * build therefore renders instructions that end at "ask that clerk's office how
 * it wants the request made" and generates no written request — the same boundary
 * the committed guidance-packet record (guidance-packets/ct.json) draws, for the
 * same recorded reason.
 *
 * Everything stated is anchored to pinned committed evidence; see the shared
 * builder's contract in scripts/rcap-agency-application/agency-application-build.mjs.
 */
import { buildAgencyApplicationFamily, runCli } from "./rcap-agency-application/agency-application-build.mjs";

const FAMILY_ID = "agency-application-treatment:obligation:track-only:CT:ct-destruction-request";

const EVIDENCE = [
  {
    id: "CT_MEMO",
    path: "data/record-clearing/legal-design-intake/CT.memo.json",
    sha256: "90d96d9d8a25ed7d64b86c3777f753eecfdb651ac083c0f9b53cbda06db5d448",
    role: "legal-design intake memo, track ct-destruction-request (and ct-missed-erasure for the not-actually-erased handoff)"
  },
  {
    id: "CT_GUIDANCE",
    path: "data/rcap-all50/guidance-packets/ct.json",
    sha256: "0acfc6fe64c87db98079fa17048c063513665bd27ff269d31a9604216460a023",
    role: "committed complete_guidance record for trackId ct-destruction-request (jobId T-B-CT-complete-guidance)"
  },
  {
    id: "CENSUS_ROUTE",
    path: "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
    sha256: "e615283930c6a9aab3be570ca5dd74a8990deb71dc2817733a3d262e48af6816",
    role: "route record for obligation:track-only:CT:ct-destruction-request (participant_agency_application, destination clerk)"
  },
  {
    id: "COUNSEL_MANIFEST",
    path: "data/rcap-ledger/completed-output-counsel-manifest.json",
    sha256: "99e8029120d705df8970d0deba651a95b00f4b81097c46a28ac8d0e128f8c93c",
    role: "counsel family rcap-ct-guidance-implementation, tracksServed includes ct-destruction-request"
  }
];

const ANCHORS = [
  {
    evidenceId: "CT_MEMO",
    quotes: [
      "The clerk shall provide security against unauthorized access to erased records, or upon the request of the accused cause the actual physical destruction of such records, except that destruction may not occur until three years have elapsed from the date of final disposition of the case. No official form was located.",
      "The Superior Court clerk holding the erased records.",
      "The clerk acts on the request of the accused. No official form was located, and the accepted destination and format for a written request have not been confirmed.",
      "The source review does not state a fee for this request.",
      "Fewer than three years have elapsed from final disposition.",
      "The records have not in fact been erased.",
      "The clerk requires something the source review has not established.",
      "Connecticut says erasure. Not expungement, not sealing. This request goes further than erasure, to physical destruction.",
      "records already erased under § 54-142a",
      "An erased case will not appear, which is itself information."
    ]
  },
  {
    evidenceId: "CT_GUIDANCE",
    quotes: [
      "ask that clerk's office how it wants a request under § 54-142a(g)(1) for actual physical destruction to be made, and make the request in exactly that way",
      "handled through a request for review sent to the Department of Emergency Services and Public Protection with a copy of your criminal history record search",
      "under § 54-142a(j), erasure can already make it harder to prove a disposition to federal authorities",
      "The Connecticut review this is built on does not identify any outside deadline by which the request has to be made"
    ]
  },
  {
    evidenceId: "CENSUS_ROUTE",
    quotes: [
      "obligation:track-only:CT:ct-destruction-request",
      "participant request to the clerk for destruction of the eligible record; exact form or format is not recorded",
      "clerk holding the eligible Connecticut record"
    ]
  },
  {
    evidenceId: "COUNSEL_MANIFEST",
    quotes: [
      "rcap-ct-guidance-implementation",
      "ct-destruction-request"
    ]
  }
];

const INSTRUCTIONS = `# Asking the Superior Court clerk to physically destroy records that were already erased — C.G.S. § 54-142a(g)(1)

This packet is prepared for **the Connecticut request for physical destruction of erased records under C.G.S. § 54-142a(g)(1)**. It is an agency-application route: you apply to the Superior Court clerk who holds the records. There is no court petition, no hearing and no judge on this route, and this packet contains nothing to file and nothing to sign.

## Which agency decides

The **Superior Court clerk's office at the court location that holds the erased records**. Under § 54-142a(g)(1) the clerk's ordinary duty is to provide security against unauthorized access to erased records; on the request of the accused, the clerk may instead cause the actual physical destruction of those records. The clerk acts on your request — nothing happens on its own.

## What this application is

A request by the accused for the **actual physical destruction** of records that have **already been erased** under § 54-142a. Two things follow:

- This is the step that comes **after** erasure, not instead of it. It is not a way to get records erased.
- Connecticut's word for the underlying relief is **erasure** — not expungement, not sealing — and this request goes a step further than erasure, to the physical destruction of the records. Before you ask, decide whether you might ever need to show what happened in this case: destruction goes further than the erasure that has already occurred.

## The one timing rule

Destruction may not occur until **three years have elapsed from the date of final disposition of the case**. Count three years forward from that date. Inside that window the step is to wait, not to ask — the clerk cannot destroy the records before then even if you request it. The Connecticut review this packet is built on identifies no outside deadline by which the request must be made, so this packet does not impose one.

## What you confirm before you apply

1. **That the records were already erased under § 54-142a.** This request applies only to records that are already erased.
2. **The date of final disposition of the case**, and that at least three years have passed since it.
3. **Which Superior Court location holds the records.**

Use the Connecticut Judicial Branch online case look-up to confirm the final disposition date and the court location. An erased case will not appear on the look-up — and that absence is itself information about what has already happened.

## What you send, and why this packet does not draft it for you

No official statewide form for this request was located, and the accepted destination and format for a written request to the clerk **have not been confirmed**. This packet therefore does not hand you a written request to sign — a document drafted to guess at the clerk's format could go to the wrong place in the wrong form. Instead:

- Contact the clerk's office at the Superior Court location that holds the records and **ask how they want a request under C.G.S. § 54-142a(g)(1) for actual physical destruction to be made** — in person, by letter, or otherwise.
- Make the request in exactly the way the clerk's office tells you, and write down who you spoke to, what they told you and the date you asked.

## Fees

The source review this packet is built from does not state a fee for this request, and this packet will not guess one. The clerk's office you contact is the authority that can say whether anything is charged.

## What happens after you apply

The clerk either causes the actual physical destruction of the erased records, or continues to provide security against unauthorized access to them — that is the clerk's alternative duty under the same subsection. The review does not state a notice requirement for this request, so do not expect a confirmation letter as a matter of course: ask the clerk's office at the time how you will know the destruction happened.

## Stop and get help instead of applying

- **Fewer than three years have elapsed from final disposition.** The answer is to wait, not to escalate.
- **The records have not in fact been erased.** Physical destruction is then not your question. A record that should have been erased and was not is a separate Connecticut route — a request for review sent to the Department of Emergency Services and Public Protection with a copy of your criminal history record search.
- **The clerk requires something the source review has not established.** Write down exactly what was asked, word for word, and take it to a Connecticut attorney who handles record clearing rather than improvising a document.
- **Any immigration matter, pending or possible.** Under § 54-142a(j), erasure can already make it harder to prove a disposition to federal authorities, and physical destruction goes further than erasure. Settle this with an immigration attorney first.

## What this packet is not

This is a prepared instruction document for an application you make yourself to the clerk. It is not a court filing, it is not legal advice, it is not submitted for you, and it does not decide whether the clerk will destroy the records. Nothing in it is signed, and nothing in it needs your signature.

_Route: obligation:track-only:CT:ct-destruction-request_
`;

const SPEC = {
  familyId: FAMILY_ID,
  worklistGroupId: FAMILY_ID,
  jurisdiction: "CT",
  routeKey: "obligation:track-only:CT:ct-destruction-request",
  legalName: "Request for Physical Destruction of Erased Records, C.G.S. § 54-142a(g)(1)",
  outDir: "data/rcap-all50/overlays/census-v1/ct/ct-destruction-request--agency-application",
  buildScript: "scripts/build-census-v1-ct-destruction-request--agency-application.mjs",
  evidence: EVIDENCE,
  anchors: ANCHORS,
  heldForms: [],
  instructions: INSTRUCTIONS,
  declaredAmounts: [],
  mustState: [
    "ask how they want a request under C.G.S. § 54-142a(g)(1) for actual physical destruction to be made",
    "does not state a fee for this request, and this packet will not guess one",
    "Fewer than three years have elapsed from final disposition.",
    "The records have not in fact been erased.",
    "The clerk requires something the source review has not established.",
    "Any immigration matter, pending or possible."
  ],
  notHeld: [
    "the accepted destination and format for a written request to the clerk (unconfirmed; the clerk's office is the checkable authority)",
    "any fee for the request (the source review states none and none is asserted; the clerk's office is the checkable authority)",
    "any notice or confirmation mechanics after the request (not stated in the source review; ask the clerk's office)"
  ],
  findings: [
    {
      finding: "No official statewide form for a § 54-142a(g)(1) destruction request was located, and the accepted "
        + "destination and format for a written request have not been confirmed by counsel (CT.memo.json, "
        + "unresolvedQuestions CT-14, impact release_blocker).",
      consequence: "The packet generates no written request. The instructions end at asking the clerk's office how "
        + "it accepts the request and making it exactly that way — the same boundary the committed complete_guidance "
        + "record draws, for the same recorded reason. The absence of a statewide form alone is not the blocker; the "
        + "unconfirmed destination and format is."
    },
    {
      finding: "The source review states no fee, no notice requirement and no outside deadline for this request.",
      consequence: "The packet asserts none of the three and delegates each to the clerk's office by name instead of "
        + "guessing."
    },
    {
      finding: "A record that should have been erased and was not is a separate Connecticut route (DESPP request for "
        + "review, per the committed guidance record's handoff and the ct-missed-erasure track).",
      consequence: "The packet routes that situation out as a stop condition rather than absorbing it."
    }
  ],
  counselQuestions: [
    "CT-14 remains open: may LegalEase generate a written destruction request once the accepted destination and "
      + "format are confirmed? Until confirmation, this family stays a guidance deliverable.",
    "Confirm that directing the participant to the clerk's office for the request format, with no generated "
      + "instrument, is the intended participant experience for this route."
  ],
  reviewerAttention: [
    "Every factual statement in participant-instructions.md is anchored to pinned committed evidence; the build "
      + "refuses on any evidence drift.",
    "This family renders no PDF and no field map, so the packet-completeness verifier does not audit it; "
      + "reports/rendered-artifacts.json states the audit boundary."
  ]
};

runCli(SPEC);
