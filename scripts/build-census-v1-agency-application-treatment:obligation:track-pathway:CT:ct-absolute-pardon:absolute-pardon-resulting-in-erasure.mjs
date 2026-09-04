#!/usr/bin/env node
import { runIfMain } from "./rcap-custom-pleading/composed-family-host.mjs";
import { makeAgencyGuidanceFamily } from "./build-census-v1-agency-application-treatment:obligation:research-decision-route:AL:al-uncharged-arrest:agency_record_challenge.mjs";

const FAMILY_ID = "agency-application-treatment:obligation:track-pathway:CT:ct-absolute-pardon:absolute-pardon-resulting-in-erasure";
const FAMILY = makeAgencyGuidanceFamily({
  familyId: FAMILY_ID,
  buildScript: "scripts/build-census-v1-agency-application-treatment:obligation:track-pathway:CT:ct-absolute-pardon:absolute-pardon-resulting-in-erasure.mjs",
  outDir: "data/rcap-all50/overlays/census-v1/ct/agency-application-treatment:obligation:track-pathway:ct:ct-absolute-pardon:absolute-pardon-resulting-in-erasure--official-pdf-fill",
  jurisdiction: "CT",
  routeKey: "obligation:track-pathway:CT:ct-absolute-pardon:absolute-pardon-resulting-in-erasure",
  legalName: "Connecticut absolute-pardon application resulting in erasure under C.G.S. Sec. 54-142a(d)",
  routeName: "using the Board of Pardons and Paroles' own absolute-pardon application on the pathway where the pardon results in erasure",
  title: "Connecticut Absolute-Pardon and Erasure Preparation Guide",
  statutes: ["C.G.S. Sec. 54-142a(d)", "C.G.S. Secs. 54-130a to 54-130e"],
  compositionSources: [
    "data/record-clearing/legal-design-intake/CT.memo.json",
    "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
    "data/rcap-ledger/completed-output-counsel-manifest.json"
  ],
  composedFrom: "the committed Connecticut memo, exact census route, and counsel manifest, each hashed into source-receipt.json at build time",
  formIdentityNote: "No stable participant application document is bound. The output is a preparation guide for the Board's own ePardon application, not an application or court petition.",
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
      heading: "Exact pathway",
      paragraphs: [
        "This route is the Board of Pardons and Paroles' absolute-pardon application for convictions Clean Slate erasure cannot reach. It is discretionary and hearing-based, and the participant applies through the Board's own ePardon process. It is not a court filing.",
        "Keep it distinct from a provisional pardon or certificate of employability, which addresses employment or licensing barriers and erases nothing. This exact pathway is the absolute pardon resulting in erasure."
      ]
    },
    {
      heading: "Erasure consequence and process boundary",
      paragraphs: [
        "The committed record states that an absolute pardon received on or after October 1, 1974 results in erasure without a petition under Section 54-142a(d). The pre-October 1, 1974 branch requires a separate Superior Court petition and is not this route.",
        "No stable participant application document has been identified that LegalEase could lawfully generate and submit. Use the Board's own current ePardon application and instructions and sign there personally; this guide is not a substitute.",
        "The waiting-period figures and no-fee claim in the committed review are unverified, so this guide quotes none. Confirm eligibility, timing, fee, and hearing mechanics from the Board's current rules. Stop for counsel if a hearing is set or any immigration issue exists."
      ]
    }
  ],
  requiredFacts: [
    { id: "pardon_date_path", label: "Confirmation that this is the on-or-after-October 1, 1974 absolute-pardon pathway", what: "the pathway confirmation; a pre-October 1, 1974 pardon belongs to the separate Superior Court petition branch", authority: "the Board's records and Connecticut counsel", why: "the route boundary turns on a date the platform cannot assume" },
    { id: "convictions", label: "Every conviction included in the absolute-pardon application", what: "each court, docket number, offense, disposition date, and sentence-completion date", authority: "the court records and the participant's complete criminal-history record", why: "no participant criminal history or court record is held" },
    { id: "clean_slate_check", label: "Clean Slate erasure reach checked before applying", what: "which convictions, if any, are already reached by Clean Slate and which require the pardon route", authority: "the Connecticut Clean Slate channel and Connecticut counsel if uncertain", why: "the platform cannot determine current automated erasure from the participant's unknown record" },
    { id: "board_eligibility", label: "Current Board eligibility and timing requirements", what: "confirmation that the participant may apply now under the Board's current rules", authority: "the Board's own current ePardon materials", why: "the committed waiting-period figures are explicitly unverified" },
    { id: "board_process", label: "Current ePardon application, attachments, hearing rules, and fee", what: "the Board's current instrument, portal steps, attachments, hearing mechanics, and any charge", authority: "the Connecticut Board of Pardons and Paroles", why: "no stable application or verified fee is bound" }
  ],
  instructions: [
    "Use the Board's own ePardon application. This guide is not that application and does not open or prepare the separate pre-October 1, 1974 Superior Court petition branch.",
    "Confirm first whether Clean Slate already reaches the convictions and verify the Board's current eligibility, timing, fee, and process rules; this packet quotes no unverified number.",
    "Stop and obtain counsel if the Board sets a hearing or an immigration issue is pending or possible."
  ],
  buildFindings: [
    { finding: "No stable Board application is bound and every waiting-period and fee figure in the committed review is unverified.", consequence: "The build composes only a preparation guide and quotes no unverified number." },
    { finding: "The exact route is the on-or-after-October 1, 1974 absolute-pardon pathway resulting in erasure without a petition.", consequence: "The guide selects that path and excludes the earlier-pardon Superior Court petition branch." }
  ],
  counselQuestions: [
    "Confirm the Section 54-142a(d) on-or-after-October 1, 1974 erasure framing before promotion.",
    "Verify the Board's current eligibility, timing, fee, application, and hearing rules."
  ],
  receiptLimits: [
    "the current text of C.G.S. Secs. 54-130a to 54-130e",
    "that the Board's current rules match any unverified figures in the committed memo"
  ]
});

export { FAMILY };
runIfMain(FAMILY, import.meta.url);
