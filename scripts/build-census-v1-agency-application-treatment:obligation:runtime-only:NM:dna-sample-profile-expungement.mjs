#!/usr/bin/env node
import { runIfMain } from "./rcap-custom-pleading/composed-family-host.mjs";
import { makeAgencyGuidanceFamily } from "./build-census-v1-agency-application-treatment:obligation:research-decision-route:AL:al-uncharged-arrest:agency_record_challenge.mjs";

const FAMILY_ID = "agency-application-treatment:obligation:runtime-only:NM:dna-sample-profile-expungement";
const FAMILY = makeAgencyGuidanceFamily({
  familyId: FAMILY_ID,
  buildScript: "scripts/build-census-v1-agency-application-treatment:obligation:runtime-only:NM:dna-sample-profile-expungement.mjs",
  outDir: "data/rcap-all50/overlays/census-v1/nm/agency-application-treatment:obligation:runtime-only:nm:dna-sample-profile-expungement--official-pdf-fill",
  jurisdiction: "NM",
  routeKey: "obligation:runtime-only:NM:dna-sample-profile-expungement",
  legalName: "New Mexico DNA sample and profile expungement under NMSA 1978, Section 29-16-10",
  routeName: "making the written administrative request to remove a qualifying DNA sample and DNA records from New Mexico's system and CODIS",
  title: "New Mexico DNA Expungement Agency-Request Preparation Guide",
  statutes: ["NMSA 1978, Section 29-16-10"],
  compositionSources: [
    "data/record-clearing/legal-design-intake/NM.memo.json",
    "src/lib/rcap-engine/compiled/profiles/NM-new-mexico.json",
    "src/lib/legal-authority/routes/single-routes.json",
    "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json"
  ],
  composedFrom: "the committed New Mexico legal-design memo, compiled pathway, route contract, and exact census route record, each hashed into source-receipt.json at build time",
  formIdentityNote: "No official request format or receiving-office document is bound. The PDF is a source-free preparation guide, not the written request, an affidavit, a court petition, or a Rule 1-077.1 NMRA form.",
  fixtures: {
    canonical: {
      "participant.full_legal_name": "Jordan Avery Reyes",
      "participant.date_of_birth": "1991-04-17",
      "participant.street_address": "42 Larkspur Street, Santa Fe, NM 87501",
      "participant.phone": "505-555-0142",
      "participant.email": "jordan.reyes@example.org"
    },
    boundary: {
      "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
      "participant.date_of_birth": "1968-12-31",
      "participant.street_address": "1188 Upper Rio Grande Crossing Road, Apartment 14B, Truth or Consequences, New Mexico 87901-2214",
      "participant.phone": "(575) 555-0199 ext. 4417",
      "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
    }
  },
  sections: [
    {
      heading: "What this route is",
      paragraphs: [
        "This is an administrative written request to an agency, not a court filing, and it does not use the Rule 1-077.1 NMRA form set. The request seeks expungement of the participant's DNA sample and DNA records from the state DNA identification system; the committed record says the administrative center must ensure corresponding expungement from CODIS.",
        "The recorded qualifying branches are a reversed conviction, or an arrest ending in dismissal, nolle prosequi, successful preprosecution diversion, conditional discharge, misdemeanor conviction, acquittal, or no felony charge within one year. That one-year condition is a substantive lookback only for the no-felony-charge branch, not a universal wait."
      ]
    },
    {
      heading: "Documents and stop conditions",
      paragraphs: [
        "The recorded request must be written and supported by certified documentation or a sworn affirmation. Obtain the certified disposition for the applicable branch; on the no-felony-charge branch the record calls for a sworn affidavit that no felony charges were filed within one year.",
        "Relief is unavailable where the person has a prior felony conviction or a pending felony charge for which DNA collection is authorized. Stop and obtain New Mexico counsel if either may apply.",
        "No held source identifies the administrative center, receiving unit, destination, accepted request format, or fee. Confirm every one with the New Mexico Department of Public Safety before sending anything; this guide deliberately supplies no address."
      ]
    }
  ],
  requiredFacts: [
    { id: "qualifying_branch", label: "Qualifying Section 29-16-10 branch", what: "the exact qualifying event - reversal, dismissal, nolle prosequi, successful diversion, conditional discharge, misdemeanor conviction, acquittal, or the no-felony-charge-within-one-year branch", authority: "the certified court disposition and a New Mexico attorney if classification is uncertain", why: "the platform cannot elect a statutory branch from a participant's unknown case" },
    { id: "case_identity", label: "Case court, county, case number, and disposition date", what: "all identifiers exactly as the certified disposition states them", authority: "the clerk of the court that disposed of the case", why: "no participant case record is held" },
    { id: "arrest_identity", label: "Arresting agency and arrest date tied to the DNA collection", what: "the agency and date from the arrest and DNA records", authority: "the arresting agency and the participant's criminal-history record", why: "no participant arrest or DNA-collection record is held" },
    { id: "support_document", label: "Certified disposition or sworn no-felony-charge affirmation", what: "the certified disposition for the selected branch, or the sworn affirmation if the receiving office confirms that branch and format", authority: "the court clerk and the confirmed administrative center", why: "the required supporting proof is participant-specific and is not held" },
    { id: "receiving_office", label: "Confirmed administrative center, destination, and accepted request format", what: "the exact office, address or portal, required format, attachments, and fee if any", authority: "the New Mexico Department of Public Safety", why: "the committed record expressly does not identify the receiving unit or its mechanics" },
    { id: "felony_screen", label: "Prior-felony and pending-authorized-felony screen", what: "confirmation that no disqualifying prior felony conviction or pending felony charge for which DNA collection is authorized exists", authority: "the participant's complete criminal-history records and New Mexico counsel", why: "the platform does not hold a complete criminal history and cannot certify eligibility" }
  ],
  instructions: [
    "Do not use a Rule 1-077.1 court form and do not file this guide with a court. Confirm the state DNA identification system's administrative center and its accepted written-request format with DPS first.",
    "Do not apply if a prior felony conviction or a pending felony charge authorizing DNA collection may exist; obtain counsel. Obtain certified documentation, or use a sworn affirmation only in the branch and form the confirmed receiving office accepts.",
    "The recorded 30- or 45-day agency periods are post-request processing periods, never prefiling waits."
  ],
  buildFindings: [
    { finding: "The exact PF17 family is source-free CUSTOM_PLEADING_FROM_CODIFIED_TEXT and the receiving office remains unidentified in the committed record.", consequence: "The build produces a preparation guide and refuses to invent a destination, official form, court petition, or fee." },
    { finding: "The route is an agency application with a statutory disqualifier for prior or pending qualifying felony matters.", consequence: "The guide makes that screen a required participant fact and a stop condition." }
  ],
  counselQuestions: [
    "Identify the current administrative center, receiving unit, destination, and accepted format for Section 29-16-10 requests.",
    "Confirm the recorded eligibility branches, documentation rule, and CODIS consequence against current official text before promotion."
  ],
  receiptLimits: [
    "the current official text of NMSA 1978, Section 29-16-10",
    "the identity of the administrative center of the state DNA identification system"
  ]
});

export { FAMILY };
runIfMain(FAMILY, import.meta.url);
