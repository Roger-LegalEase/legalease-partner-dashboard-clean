#!/usr/bin/env node
import { runIfMain } from "./rcap-custom-pleading/composed-family-host.mjs";
import { makeAgencyGuidanceFamily } from "./build-census-v1-agency-application-treatment:obligation:research-decision-route:AL:al-uncharged-arrest:agency_record_challenge.mjs";

const FAMILY_ID = "agency-application-treatment:obligation:track-only:CT:ct-destruction-request";
const FAMILY = makeAgencyGuidanceFamily({
  familyId: FAMILY_ID,
  buildScript: "scripts/build-census-v1-agency-application-treatment:obligation:track-only:CT:ct-destruction-request.mjs",
  outDir: "data/rcap-all50/overlays/census-v1/ct/agency-application-treatment:obligation:track-only:ct:ct-destruction-request--official-pdf-fill",
  jurisdiction: "CT",
  routeKey: "obligation:track-only:CT:ct-destruction-request",
  legalName: "Connecticut request for physical destruction of already-erased records under C.G.S. Sec. 54-142a(g)(1)",
  routeName: "asking the Superior Court clerk that holds an already-erased record to cause its physical destruction after the statutory three-year period",
  title: "Connecticut Erased-Record Destruction Request Preparation Guide",
  statutes: ["C.G.S. Sec. 54-142a(g)(1)", "C.G.S. Sec. 54-142a(j)"],
  compositionSources: [
    "data/record-clearing/legal-design-intake/CT.memo.json",
    "data/rcap-all50/guidance-packets/ct.json",
    "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
    "data/rcap-ledger/completed-output-counsel-manifest.json"
  ],
  composedFrom: "the committed Connecticut memo, guidance record, exact census route, and counsel manifest, each hashed into source-receipt.json at build time",
  formIdentityNote: "No official form or accepted request format is bound. The output is a preparation guide and not a written destruction request.",
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
      heading: "Route boundary",
      paragraphs: [
        "This route is only for the actual physical destruction of records already erased under Section 54-142a. It does not erase a record, does not seal a record, and is not a court petition. Connecticut's word for the underlying relief is erasure; physical destruction goes further.",
        "The receiving office is the Superior Court clerk at the court location holding the erased records. The clerk acts on the accused's request, but the committed review does not confirm an accepted statewide form, written-request format, or destination."
      ]
    },
    {
      heading: "Timing and safety",
      paragraphs: [
        "Physical destruction may not occur until three years have elapsed from the date of final disposition. If fewer than three years have elapsed, wait; the committed review identifies no outside deadline by which the later request must be made.",
        "Confirm first that the record was actually erased, the final-disposition date, and the court location holding the erased record. Ask that clerk's office exactly how it wants a request under Section 54-142a(g)(1) made, and follow that answer.",
        "Stop for counsel if the record was not erased, the clerk requires something the committed review does not establish, or any immigration issue exists. Section 54-142a(j) warns that erasure can make it harder to prove a disposition to federal authorities; destruction goes further."
      ]
    }
  ],
  requiredFacts: [
    { id: "case_identity", label: "Case court, location, docket number, and final-disposition date", what: "the court location, docket number, and final-disposition date exactly as the case record states them", authority: "the Superior Court clerk that handled the case", why: "no participant case record is held" },
    { id: "erasure_status", label: "Confirmation that the records were already erased under Section 54-142a", what: "written or clerk-confirmed evidence that the record has already been erased", authority: "the Superior Court clerk holding the record", why: "existing erasure is a route precondition the platform cannot assume" },
    { id: "three_year_date", label: "Date the three-year destruction bar expires", what: "three years after the final-disposition date, calculated only after that date is confirmed", authority: "the case record and the clerk", why: "the platform does not hold the final-disposition date" },
    { id: "clerk_process", label: "Clerk-confirmed request form, method, destination, and fee", what: "the exact way that clerk wants the request made, where it goes, required attachments, and any fee", authority: "the Superior Court clerk's office holding the erased records", why: "the committed review does not establish a statewide request format or fee" }
  ],
  instructions: [
    "Do not use this route until the clerk confirms the records are already erased and the three-year period has passed.",
    "Ask the clerk holding the erased records how it wants the request made. This packet deliberately does not draft a request against an unconfirmed format or destination.",
    "Stop and obtain counsel if the record is not erased, the clerk asks for something not established here, or any immigration matter is pending or possible."
  ],
  buildFindings: [
    { finding: "The committed record confirms no statewide form or accepted request format.", consequence: "The build renders only a preparation guide and names the clerk as the authority for mechanics and any fee." },
    { finding: "Already-erased status and three elapsed years are route preconditions.", consequence: "Both are explicit required-before-acting facts rather than assumptions." }
  ],
  counselQuestions: [
    "Confirm the accepted destination and format for a Section 54-142a(g)(1) destruction request before any instrument is generated.",
    "Confirm the three-year timing and immigration warning before promotion."
  ]
});

// This guide's ordinary spacer lines pushed one required-fact triplet across a
// page boundary: the label, dotted response, and check authority did not travel
// together.  Compact only this family's discretionary blank lines.  Every
// substantive line remains byte-for-byte the same before the shared renderer
// wraps it, and both fixtures fit on one page.
const standardComposedBody = FAMILY.composedBody;
FAMILY.composedBody = (componentId, facts) => standardComposedBody(componentId, facts)
  .replace(/\n{2,}/g, "\n");

export { FAMILY };
runIfMain(FAMILY, import.meta.url);
