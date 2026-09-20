#!/usr/bin/env node
/**
 * PF20 deterministic builder for Florida administrative expunction.
 *
 * There is no uniform downloadable FDLE form for this route.  The committed
 * source-identity determination changes the obsolete form dependency to a
 * composition from authority: a written applicant request containing a
 * separate endorsement section for the arresting-agency head/designee or the
 * State Attorney/designee.  This builder does not research, acquire, or
 * represent the composed document as an official form.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  COURT_OWNED,
  DOTS,
  composedMapOf,
  mapHelpers,
  runComposedFamily
} from "./rcap-custom-pleading/composed-family-host.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FAMILY_ID = "fl-administrative-set";
const ROUTE_KEY = "obligation:track-pathway:FL:fl-administrative:administrative-expunction-mistaken-or-unlawful-arrest";
const COMPONENT_ID = "FDLE-ADMINISTRATIVE-WRITTEN-APPLICATION";
const OUT = "data/rcap-all50/overlays/census-v1/fl/fl-administrative-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-fl-administrative-set.mjs";

const FIXTURES = Object.freeze({
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.street_address": "42 Larkspur Street, Tallahassee, FL 32301",
    "participant.phone": "850-555-0142",
    "participant.email": "jordan.reyes@example.org",
    "matter.arresting_agency": "Tallahassee Police Department",
    "matter.arrest_date": "2019-06-11",
    "matter.arrest_location": "Tallahassee, Leon County, Florida",
    "matter.alleged_offense": "Petit theft, Fla. Stat. 812.014",
    "matter.record_identifier": "TPD arrest event 2019-00012345"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "1188 Upper Coastal Crossing Road, Apartment 14B, Fort Walton Beach, FL 32548-2214",
    "participant.phone": "850-555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org",
    "matter.arresting_agency": "Okaloosa County Sheriff's Office",
    "matter.arrest_date": "2018-01-02",
    "matter.arrest_location": "Fort Walton Beach, Okaloosa County, Florida",
    "matter.alleged_offense": "Trespass in a structure or conveyance, Fla. Stat. 810.08",
    "matter.record_identifier": "OCSO arrest event 2018-000000000001"
  }
});

const COMPONENTS = [{
  id: COMPONENT_ID,
  role: "primary_filing",
  title: "Written Application for Florida Administrative Expunction"
}];

let FAMILY;

function maps() {
  const h = mapHelpers(COMPONENT_ID);
  const writes = [
    h.write("applicant_name", "Applicant full legal name", "participant.full_legal_name"),
    h.write("applicant_dob", "Applicant date of birth", "participant.date_of_birth"),
    h.write("applicant_address", "Applicant mailing address", "participant.street_address"),
    h.write("applicant_phone", "Applicant telephone", "participant.phone"),
    h.write("applicant_email", "Applicant email", "participant.email"),
    h.write("arresting_agency", "Arresting agency", "matter.arresting_agency"),
    h.write("arrest_date", "Date of arrest", "matter.arrest_date"),
    h.write("arrest_location", "Location of arrest", "matter.arrest_location"),
    h.write("alleged_offense", "Alleged offense or charge", "matter.alleged_offense"),
    h.write("record_identifier", "Arrest or record identifier", "matter.record_identifier")
  ];
  const blanks = [
    h.rbf(
      "why_contrary_to_law_or_mistake",
      "Applicant's factual statement explaining why the arrest was contrary to law or by mistake",
      "the applicant's own complete factual statement, without legal conclusions invented by the platform",
      "the route requires a participant-specific account and the fixture holds no sworn narrative"
    ),
    h.rbf(
      "records_attached",
      "Official records attached in support of the application",
      "a list of the arrest, disposition, identity, or other official records actually attached",
      "the platform does not know which official records the applicant possesses"
    ),
    h.rbf(
      "current_fdle_submission_process",
      "Current FDLE submission method, destination, attachments, and fee if any",
      "the current submission method, destination, required attachments, and any fee confirmed by FDLE",
      "the committed authority does not establish current submission mechanics or a fee"
    ),
    h.protectedBlank(
      "applicant_signature",
      "Applicant signature",
      "the applicant signs only after the request and attachments are complete"
    ),
    h.protectedBlank(
      "applicant_signature_date",
      "Date beside applicant signature",
      "the applicant enters the true signing date when signing"
    ),
    h.courtBlank(
      "endorser_name",
      "Endorser printed name",
      "the arresting-agency head/designee or State Attorney/designee owns this field"
    ),
    h.rbf(
      "endorser_title_and_office",
      "Endorser title and agency or office",
      "the endorsing official's exact title and agency or office, completed by that official",
      "the fixture does not hold the official identity and the applicant must obtain the completed endorsement before submission"
    ),
    {
      ...h.courtBlank(
        "endorsement_support_selection",
        "[ ] Endorser supports administrative expunction",
        "only the endorsing official makes this determination"
      ),
      kind: "selection_control",
      isSelectionControl: true,
      category: COURT_OWNED,
      completenessClass: COURT_OWNED,
      class: COURT_OWNED
    },
    {
      ...h.courtBlank(
        "endorsement_decline_selection",
        "[ ] Endorser does not support administrative expunction",
        "only the endorsing official makes this determination"
      ),
      kind: "selection_control",
      isSelectionControl: true,
      category: COURT_OWNED,
      completenessClass: COURT_OWNED,
      class: COURT_OWNED
    },
    h.courtBlank(
      "endorsement_statement",
      "Written endorsement statement",
      "the endorsing official supplies the endorsement required for an applicant-submitted request"
    ),
    h.courtBlank(
      "endorser_signature",
      "Endorser signature",
      "the arresting-agency head/designee or State Attorney/designee signs"
    ),
    h.courtBlank(
      "endorser_date",
      "Date beside endorser signature",
      "the endorsing official supplies the true signing date"
    )
  ];
  return [composedMapOf(COMPONENT_ID, FAMILY, writes, blanks)];
}

function composedBody(_componentId, facts) {
  return [
    "WRITTEN APPLICATION FOR FLORIDA ADMINISTRATIVE EXPUNCTION",
    "Fla. Stat. Sec. 943.0581; Fla. Admin. Code R. 11C-7.008",
    "",
    "COMPOSED APPLICATION - NOT AN OFFICIAL FDLE FORM AND NOT A COURT FILING",
    `Route: ${ROUTE_KEY}`,
    "",
    "APPLICANT",
    `Applicant full legal name: ${facts["participant.full_legal_name"]}`,
    `Applicant date of birth: ${facts["participant.date_of_birth"]}`,
    `Applicant mailing address: ${facts["participant.street_address"]}`,
    `Applicant telephone: ${facts["participant.phone"]}`,
    `Applicant email: ${facts["participant.email"]}`,
    "",
    "ARREST RECORD IDENTIFIED FOR THIS REQUEST",
    `Arresting agency: ${facts["matter.arresting_agency"]}`,
    `Date of arrest: ${facts["matter.arrest_date"]}`,
    `Location of arrest: ${facts["matter.arrest_location"]}`,
    `Alleged offense or charge: ${facts["matter.alleged_offense"]}`,
    `Arrest or record identifier: ${facts["matter.record_identifier"]}`,
    "",
    "APPLICANT'S FACTUAL STATEMENT",
    "Applicant's factual statement explaining why the arrest was contrary to law or by mistake:",
    DOTS(88), DOTS(88), DOTS(88), DOTS(88),
    "",
    "Official records attached in support of the application:",
    DOTS(88), DOTS(88),
    "",
    "Applicant signature: " + DOTS(54),
    "Date beside applicant signature: " + DOTS(42),
    "",
    "WRITTEN ENDORSEMENT - COMPLETED BY THE ENDORSING OFFICIAL, NOT THE APPLICANT",
    "For an applicant-submitted request, the committed treatment requires a written endorsement by the head of",
    "the arresting agency/designee or the State Attorney/designee. The applicant must not complete this section.",
    "",
    "Endorser printed name: " + DOTS(58),
    "Endorser title and agency or office: " + DOTS(44),
    "[ ] Endorser supports administrative expunction",
    "[ ] Endorser does not support administrative expunction",
    "Written endorsement statement:", DOTS(88), DOTS(88), DOTS(88),
    "Endorser signature: " + DOTS(61),
    "Date beside endorser signature: " + DOTS(43),
    "",
    "SUBMISSION MECHANICS TO CONFIRM WITH FDLE BEFORE SENDING",
    "Current FDLE submission method, destination, attachments, and fee if any:",
    DOTS(88), DOTS(88),
    "",
    `Route: ${ROUTE_KEY}`
  ].join("\n");
}

function participantInstructions(requiredBeforeFiling) {
  const lines = [
    "# Before you submit the Florida administrative-expunction application",
    "",
    "This packet is for the Florida administrative route for an arrest made contrary to law or by mistake. It is not the ordinary dismissed-case expunction route, is not a court petition, and does not promise that FDLE will expunge the record.",
    "",
    "No uniform downloadable FDLE application exists for this route. The PDF is a written application composed from the committed authority records listed in source-receipt.json. It contains a separate endorsement section because an applicant-submitted request requires written support from the head of the arresting agency or designee, or the State Attorney or designee.",
    "",
    "The platform filled only identity, contact, and arrest-record facts held in the fixture. It did not write the applicant's factual narrative, select an endorsement outcome, sign, date, or complete any official-owned field.",
    "",
    "## Required before submission",
    "",
    "| Blank printed in the application | What you must supply |",
    "| --- | --- |"
  ];
  for (const item of requiredBeforeFiling) {
    lines.push(`| ${item.disclosureLabel.replaceAll("|", "-")} | ${item.participantMustSupply.replaceAll("|", "-")} |`);
  }
  lines.push(
    "",
    "## Obtain the written endorsement",
    "",
    "Give the completed applicant section and the supporting official records to the head of the arresting agency or designee, or the State Attorney or designee. That official decides whether to endorse the request and completes every field in the endorsement section. Do not fill, select, sign, or date that section yourself.",
    "",
    "## Stop conditions",
    "",
    "Stop automated self-help if the official declines to endorse, disputes a material fact, the issue requires advocacy rather than a factual application, or any immigration matter is pending or possible.",
    "",
    "## Protected fields left blank",
    "",
    "The applicant signature and signature date remain blank until signing. The endorser name, title, office, support decision, written statement, signature, and date remain blank for the endorsing official.",
    "",
    `Route: ${ROUTE_KEY}`,
    ""
  );
  return lines.join("\n");
}

FAMILY = {
  familyId: FAMILY_ID,
  buildScript: BUILD_SCRIPT,
  outDir: OUT,
  jurisdiction: "FL",
  route: {
    routeKeys: [ROUTE_KEY],
    legalName: "Florida Administrative Expunction under Fla. Stat. Sec. 943.0581",
    routeName: "applying to FDLE for administrative expunction of an arrest made contrary to law or by mistake",
    statutes: ["Fla. Stat. Sec. 943.0581", "Fla. Admin. Code R. 11C-7.008"]
  },
  components: COMPONENTS,
  fixtures: FIXTURES,
  compositionSources: [
    "data/rcap-grade-a/source-wave-integration/CAPTAIN_SOURCE_IDENTITY_DETERMINATIONS.json",
    "data/rcap-grade-a/packet-factory-24h/SOURCE_RELATIONSHIP_REGISTRY.json",
    "data/rcap-grade-a/packet-factory-24h/disc03/CODEX_CS2_SRC2_ACQUISITION.json",
    "data/record-clearing/legal-design-intake/FL.memo.json",
    "src/lib/rcap-engine/compiled/profiles/FL-florida.json",
    "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json"
  ],
  composedFrom: "the committed no-uniform-form determination, Rule 11C-7.008 acquisition finding, Florida legal-design track, compiled pathway, and exact census route, each hashed in source-receipt.json",
  formIdentityNote: "FDLE-ADMINISTRATIVE-WRITTEN-APPLICATION is a composed written request with endorsement section. It is not represented as an FDLE form number or downloadable official form.",
  routeSelectionNote: `The packet is fixed to ${ROUTE_KEY}: administrative expunction for an arrest made contrary to law or by mistake. It offers no ordinary court-expunction election.`,
  whatThisReceiptDoesNotEstablish: [
    "participant eligibility or that the arrest was in fact contrary to law or by mistake",
    "the current FDLE submission method, destination, attachments, or fee",
    "endorsement by any agency head, designee, State Attorney, or designee",
    "independent verification, raster acceptance, counsel approval, or fulfillment authority"
  ],
  buildFindings: [
    {
      finding: "The committed source-identity determination says no uniform FDLE administrative-expunction form exists.",
      consequence: "The build composes a written application and endorsement section from committed authority and labels it non-official."
    },
    {
      finding: "An applicant-submitted written request requires a separate written endorsement.",
      consequence: "Every endorsement field is protected for the arresting-agency head/designee or State Attorney/designee."
    },
    {
      finding: "The current submission mechanics and any fee are not established by the committed records.",
      consequence: "They are disclosed as required-before-submission facts to confirm with FDLE, not guessed."
    }
  ],
  counselQuestions: [
    "Confirm the composed application and endorsement treatment against Rule 11C-7.008 before any promotion.",
    "Confirm the current FDLE submission destination, method, required attachments, and fee before participant use."
  ],
  reviewerAttention: [
    "The composed document is an agency application, not an official form or court filing.",
    "The canonical and boundary PDFs remain BUILT_RASTER_PENDING and have not been independently verified."
  ],
  maps,
  composedBody,
  participantInstructions
};

function writeJson(rel, value) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  const result = await runComposedFamily(FAMILY);
  if (result.status === "CHECK_ONLY") return result;

  for (const rel of ["source-receipt.json", "production-field-map.json"]) {
    const file = path.join(ROOT, OUT, rel);
    const doc = JSON.parse(fs.readFileSync(file, "utf8"));
    doc.implementationStrategy = "participant_agency_application";
    if (rel === "production-field-map.json") {
      doc.renderStrategy = "composed_agency_application";
      doc.routeSelectionsMade = [{
        routeKey: ROUTE_KEY,
        selection: "Florida administrative expunction for an arrest made contrary to law or by mistake",
        sourceSupport: "the committed FL legal-design track, compiled pathway, census route, and Rule 11C-7.008 source-identity determination"
      }];
    }
    writeJson(`${OUT}/${rel}`, doc);
  }

  fs.writeFileSync(path.join(ROOT, OUT, "filing-instructions.md"), [
    "# Submission instructions - Florida administrative expunction",
    "",
    "1. Confirm this is the administrative route for an arrest made contrary to law or by mistake, not an ordinary dismissed-case court expunction.",
    "2. Complete and review the applicant section, the factual statement, and the list of supporting official records. Do not sign or date until the request is final.",
    "3. Ask the head of the arresting agency or designee, or the State Attorney or designee, to complete the written endorsement section. The applicant must not complete that section.",
    "4. Before sending, confirm FDLE's current submission method, destination, required attachments, and any fee. The committed record does not establish those mechanics, so this packet does not guess them.",
    "5. Submit the application and completed written endorsement through the process FDLE confirms. Keep a copy of the complete submission and proof of delivery.",
    "",
    "This is an FDLE agency process, not a court filing. No route is opened by this review artifact.",
    "",
    `Route: ${ROUTE_KEY}`,
    ""
  ].join("\n"));

  writeJson(`${OUT}/packet-set-manifest.json`, {
    schemaVersion: "rcap-packet-set-manifest/v1",
    familyId: FAMILY_ID,
    routeKey: ROUTE_KEY,
    implementationStrategy: "participant_agency_application",
    noDownloadableOfficialForm: true,
    components: [{
      documentId: COMPONENT_ID,
      role: "primary_filing",
      treatment: "composed written applicant request with protected written-endorsement section"
    }],
    instructions: ["participant-instructions.md", "filing-instructions.md"],
    rasterState: "BUILT_RASTER_PENDING",
    selfVerified: false,
    commercialRoutesOpened: 0
  });

  return { ...result, implementationStrategy: "participant_agency_application" };
}

main()
  .then((result) => console.log(JSON.stringify(result, null, 2)))
  .catch((error) => { console.error(error); process.exit(1); });
