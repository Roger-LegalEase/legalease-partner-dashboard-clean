#!/usr/bin/env node
import { runIfMain, KEEP_ON_ONE_PAGE } from "./rcap-custom-pleading/composed-family-host.mjs";
import { makeAgencyGuidanceFamily } from "./build-census-v1-agency-application-treatment:obligation:research-decision-route:AL:al-uncharged-arrest:agency_record_challenge.mjs";

const FAMILY_ID = "agency-application-treatment:obligation:track-only:CT:ct-provisional-pardon";
const FAMILY = makeAgencyGuidanceFamily({
  familyId: FAMILY_ID,
  buildScript: "scripts/build-census-v1-agency-application-treatment:obligation:track-only:CT:ct-provisional-pardon.mjs",
  outDir: "data/rcap-all50/overlays/census-v1/ct/agency-application-treatment:obligation:track-only:ct:ct-provisional-pardon--official-pdf-fill",
  jurisdiction: "CT",
  routeKey: "obligation:track-only:CT:ct-provisional-pardon",
  legalName: "Connecticut provisional pardon or certificate of employability application to the Board of Pardons and Paroles",
  routeName: "using the Board's own application for relief from employment or licensing barriers without erasure",
  title: "Connecticut Provisional-Pardon Preparation Guide",
  participantPresentation: "direct",
  statutes: ["Connecticut provisional pardon and certificate of employability process"],
  compositionSources: [
    "data/record-clearing/legal-design-intake/CT.memo.json",
    "data/rcap-all50/guidance-packets/ct.json",
    "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
    "data/rcap-ledger/completed-output-counsel-manifest.json",
    "data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session10/treatment-reconciliation/ct-coe-eligibility.html.gz",
    "data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session10/treatment-reconciliation/ct-coe-required-documents.html.gz",
    "data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session10/treatment-reconciliation/ct-pardon-faq.html.gz"
  ],
  composedFrom: "the committed Connecticut memo, guidance record, exact census route, counsel manifest, and captured current official Board eligibility, document and FAQ pages, each hashed into source-receipt.json at build time",
  formIdentityNote: "No stable participant application document is bound. An intake worksheet is not the legal application, so the output is a preparation guide pointing to the Board's own process.",
  fixtures: {
    canonical: {
      "participant.full_legal_name": "Jordan Avery Reyes",
      "participant.date_of_birth": "1991-04-17",
      "participant.street_address": "42 Larkspur Street, Hartford, CT 06103",
      "participant.phone": "860-555-0142",
      "participant.email": "jordan.reyes@example.org"
    },
    boundary: {
      "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
      "participant.date_of_birth": "1968-12-31",
      "participant.street_address": "1188 Upper Connecticut River Crossing Road, Apartment 14B, West Hartford, Connecticut 06119-2214",
      "participant.phone": "(203) 555-0199 ext. 4417",
      "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
    }
  },
  sections: [
    {
      heading: "What this relief does",
      paragraphs: [
        "A provisional pardon or certificate of employability addresses employment and licensing barriers. It does not erase anything: the conviction remains on the record. A participant seeking erasure is on a different Connecticut route.",
        "The Board of Pardons and Paroles application process is not a court filing; there is no prosecutor consent and nobody to serve. First check the supervision handoff below."
      ]
    },
    {
      heading: "Use the Board's own process",
      paragraphs: [
        "Obtain and use the Board's own current application and instructions, and sign that application personally. This preparation guide and any intake worksheet are not the legal application and must not be submitted in its place.",
        "If you are currently on probation with more than 90 days of supervision remaining, apply through your probation officer. If your supervision status or remaining period is unknown, verify it with your supervising officer before choosing the destination. Exactly 90 days does not satisfy this more-than-90-day handoff; it does not itself establish eligibility.",
        "For the Board application route, use https://epardonportal.ct.gov/portal . Check current Certificate of Employability eligibility at https://portal.ct.gov/bopp/pardon-division/pardon/coe-eligibility .",
        "Check the current required-document list at https://portal.ct.gov/bopp/pardon-division/pardon/coe-documents-required-for-certificate-of-employability . The Background Investigation Authorization is a supporting document, not the whole application. Take it unsigned to a notary and sign in the notary's presence. If under supervision, the supervising officer must complete the required questionnaire; do not complete the officer's answers yourself.",
        "Confirm the current eligibility, timing, fee, and notice rules from the Board's own materials before applying; no unverified figure is supplied here.",
        "Gather the complete record and every conviction creating the employment or licensing barrier. Stop for counsel if the Board sets a hearing or any immigration issue exists."
      ]
    }
  ],
  requiredFacts: [
    { id: "relief_goal", label: "Employment or licensing barrier this relief is intended to address", what: "the specific job, license, credential, or occupational barrier and how the conviction creates it", authority: "the employer or licensing authority and the Board's application", why: "the platform cannot know the participant's relief goal" },
    { id: "convictions", label: "Every conviction relevant to the Board application", what: "each court, docket number, offense, disposition date, and sentence-completion date", authority: "the court records and the participant's complete criminal-history record", why: "no participant criminal history or court record is held" },
    { id: "supervision_destination", label: "Current supervision status, remaining days, and supervising officer contact", what: "whether currently on probation and whether more than 90 days remain; if so, apply through the probation officer; verify unknown status or remaining time before selecting the destination", authority: "the supervising officer and the Board's current Certificate of Employability eligibility page", why: "no current supervision record or officer contact is held" },
    { id: "board_eligibility", label: "Current Board eligibility and timing requirements", what: "confirmation that the participant may apply now under the Board's current rules", authority: "the Board's own current application and instructions", why: "the committed review records the eligibility rules as unverified" },
    { id: "board_process", label: "Current Board application, portal, attachments, and fee", what: "the Board's current instrument, submission method, attachments, and any charge", authority: "the Connecticut Board of Pardons and Paroles", why: "no stable application or verified fee is bound" }
  ],
  instructions: [
    "Use this route only for employment or licensing relief. It does not erase the record; an erasure goal belongs to another route.",
    "Use the Board's own current application and instructions. This guide is not that application and must not be uploaded or filed as a substitute.",
    "If currently on probation with more than 90 days of supervision remaining, apply through your probation officer. Verify unknown supervision status or remaining time with your supervising officer first. Exactly 90 days does not satisfy this more-than-90-day handoff and does not establish eligibility.",
    "For the Board application route, use https://epardonportal.ct.gov/portal . Review current eligibility at https://portal.ct.gov/bopp/pardon-division/pardon/coe-eligibility .",
    "Use the required-document list at https://portal.ct.gov/bopp/pardon-division/pardon/coe-documents-required-for-certificate-of-employability . The Background Investigation Authorization supports the application; it is not the application. Bring it unsigned to a notary and sign in the notary's presence. If under supervision, have your supervising officer complete the required questionnaire; leave officer answers to that officer.",
    "Stop and obtain counsel if the Board sets a hearing or an immigration issue is pending or possible."
  ],
  buildFindings: [
    { finding: "No stable Board application document is bound and the recorded eligibility and fee rules are unverified.", consequence: "The build composes a preparation guide, quotes no unverified figure, and delegates current mechanics to the Board." },
    { finding: "A provisional pardon or certificate of employability does not erase the conviction.", consequence: "The guide states the limitation on its face and routes an erasure goal elsewhere." }
  ],
  counselQuestions: [
    "Confirm whether the Board now exposes a stable participant application LegalEase may generate or submit.",
    "Verify the Board's current eligibility, timing, fee, and hearing rules before promotion."
  ]
});

// Keep the facts and their blank lines together using the existing renderer control.
const composedBody = FAMILY.composedBody;
FAMILY.composedBody = (...args) => composedBody(...args)
  .replace("\nFACTS YOU MUST CONFIRM BEFORE ACTING\n", `\n${KEEP_ON_ONE_PAGE}\nFACTS YOU MUST CONFIRM BEFORE ACTING\n`);

export { FAMILY };
runIfMain(FAMILY, import.meta.url);
