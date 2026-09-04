#!/usr/bin/env node
/**
 * Florida administrative-expunction applicant packet, section 943.0581.
 *
 * This is the applicant-written branch recorded in the Captain's source-
 * identity determination for Rule 11C-7.008.  No uniform FDLE application
 * form exists for this route, so no public or private source binary is read,
 * copied, substituted, or represented as an official form.  The one required
 * packet component is composed from the committed legal-design records.  Its
 * endorsement fields remain for the arresting-agency head or State Attorney.
 *
 * A build is review evidence only.  It neither verifies itself nor opens a
 * route.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  mapHelpers, composedMapOf, runComposedFamily, DOTS
} from "./rcap-custom-pleading/composed-family-host.mjs";

const FAMILY_ID = "fl-administrative-set";
const COMPONENT_ID = "fl-administrative-primary-filing-1";
const OUT = "data/rcap-all50/overlays/census-v1/fl/fl-administrative-set--official-pdf-fill";

const ROUTE = Object.freeze({
  routeKeys: [
    "obligation:track-pathway:FL:fl-administrative:administrative-expunction-mistaken-or-unlawful-arrest"
  ],
  legalName: "Written Application for Administrative Expunction under section 943.0581, Florida Statutes",
  routeName: "Florida administrative expunction for an arrest made contrary to law or by mistake",
  statutes: ["section 943.0581, Florida Statutes", "Florida Administrative Code Rule 11C-7.008"]
});

const COMPONENTS = [{
  id: COMPONENT_ID,
  role: "primary_filing",
  title: "Written Application for Administrative Expunction and Written Endorsement",
  routeKey: ROUTE.routeKeys[0]
}];

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.street_address": "42 Magnolia Street, Tallahassee, FL 32301",
    "participant.phone": "850-555-0142",
    "participant.email": "jordan.reyes@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "1188 Upper Caloosahatchee Crossing Road, Apartment 14B, Fort Lauderdale, Florida 33301-2214",
    "participant.phone": "(954) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
  }
};

function composedBody(componentId, facts) {
  if (componentId !== COMPONENT_ID) throw new Error(`unexpected component ${componentId}`);
  const name = facts["participant.full_legal_name"];
  const dob = facts["participant.date_of_birth"];
  const address = facts["participant.street_address"];
  const phone = facts["participant.phone"];
  const email = facts["participant.email"];
  const L = [];

  L.push("WRITTEN APPLICATION FOR ADMINISTRATIVE EXPUNCTION", "");
  L.push("Section 943.0581, Florida Statutes; Florida Administrative Code Rule 11C-7.008", "");
  L.push("TO: Florida Department of Law Enforcement", "");
  L.push("IMPORTANT IDENTITY OF THIS DOCUMENT", "");
  L.push("This is a composed written application for the applicant-submitted route recorded under Rule 11C-7.008. It is not an FDLE-issued uniform form. The committed source-identity determination states that no uniform FDLE form exists and that an applicant's written request must carry a written endorsement from the head of the arresting agency or the State Attorney. The alternate agency-letterhead route is not this document.", "");

  L.push("1. APPLICANT", "");
  L.push(`Full legal name: ${name}`);
  L.push(`Date of birth: ${dob}`);
  L.push(`Mailing address: ${address}`);
  L.push(`Telephone: ${phone}`);
  L.push(`Email: ${email}`, "");

  L.push("2. ARREST TO BE ADMINISTRATIVELY EXPUNGED", "");
  L.push("Arresting agency:");
  L.push(DOTS(), "");
  L.push("Date of arrest:");
  L.push(DOTS(), "");
  L.push("What the applicant was accused of, using the wording in the arrest record:");
  L.push(DOTS(), DOTS(), "");
  L.push("Agency incident, booking, or arrest number, if the record assigns one:");
  L.push(DOTS(), "");

  L.push("3. WHY THE ARREST WAS CONTRARY TO LAW OR BY MISTAKE", "");
  L.push("In the applicant's own words, state why the arrest was made contrary to law or by mistake. State facts from the record; do not make an argument the record cannot support.");
  L.push(DOTS(), DOTS(), DOTS(), DOTS(), "");

  L.push("4. CONTACT WITH THE ARRESTING AGENCY OR STATE ATTORNEY", "");
  L.push("Office contacted about the required written endorsement:");
  L.push(DOTS(), "");
  L.push("Date and result of that contact, including whether the office agreed to consider or provide the endorsement:");
  L.push(DOTS(), DOTS(), "");

  L.push("5. APPLICATION", "");
  L.push(`I, ${name}, apply to the Florida Department of Law Enforcement for administrative expunction of the arrest identified above under section 943.0581, Florida Statutes. I state that the facts written in this application are true to the best of my knowledge. I understand that this applicant-written route requires the written endorsement of the head of the arresting agency or the State Attorney before submission.`, "");
  L.push("Applicant signature: " + DOTS(44));
  L.push("Date signed: " + DOTS(30), "");

  L.push("WRITTEN ENDORSEMENT - FOR THE AGENCY HEAD OR STATE ATTORNEY", "");
  L.push("The applicant does not complete or sign this section. The certifying official may use this section or provide a separate written endorsement acceptable to FDLE.", "");
  L.push(`I certify that the arrest of ${name} identified in this application was made contrary to law or by mistake, and I provide the written endorsement required for this applicant-submitted administrative-expunction request under Rule 11C-7.008.`, "");
  L.push("Name of endorsing official: " + DOTS(45));
  L.push("Official title: " + DOTS(57));
  L.push("Arresting agency or State Attorney office: " + DOTS(36));
  L.push("Official mailing address: " + DOTS(47));
  L.push("Official telephone or email: " + DOTS(43));
  L.push("Signature of endorsing official: " + DOTS(42));
  L.push("Date signed by endorsing official: " + DOTS(38), "");

  L.push("BEFORE SUBMISSION", "");
  L.push("Do not submit this application without the completed written endorsement. Confirm FDLE's current submission address or channel and any current instructions directly with FDLE; no address or submission method is established by the committed record this packet binds. The source review states no fee, notarization, service, or fee-waiver process for this application, so this packet does not invent one.", "");
  L.push("STOP: If the agency head or State Attorney declines to endorse the application, automated assistance ends. Stop and get legal help for a disputed fact, anything you need to argue rather than assert, or any immigration issue.", "");
  L.push(`Route: ${ROUTE.routeKeys[0]}`);
  return L.join("\n");
}

function maps() {
  const h = mapHelpers(COMPONENT_ID);
  const writes = [
    h.write("applicant_name", "Applicant full legal name", "participant.full_legal_name"),
    h.write("applicant_date_of_birth", "Applicant date of birth", "participant.date_of_birth"),
    h.write("applicant_mailing_address", "Applicant mailing address", "participant.street_address"),
    h.write("applicant_telephone", "Applicant telephone", "participant.phone"),
    h.write("applicant_email", "Applicant email", "participant.email")
  ];
  const refusals = [
    h.rbf(
      "arresting_agency",
      "Arresting agency",
      "the name of the agency that made the arrest, copied from the arrest record",
      "the committed legal-design registry asks which agency made the arrest and the platform holds no case-specific agency"
    ),
    h.rbf(
      "arrest_date",
      "Date of arrest",
      "the arrest date exactly as the arrest record states it",
      "the committed legal-design registry requires the arrest date and the platform holds no case-specific arrest date"
    ),
    h.rbf(
      "accusation",
      "What the applicant was accused of",
      "the accusation exactly as the arrest record describes it",
      "the committed legal-design registry requires the accusation and the platform holds no case-specific offense wording"
    ),
    h.rbf(
      "arrest_record_number",
      "Agency incident, booking, or arrest number, if the record assigns one",
      "the incident, booking, or arrest number shown on the arrest record, if one exists",
      "a record number is case-specific and must be copied from the applicant's own arrest record rather than guessed"
    ),
    h.rbf(
      "contrary_or_mistake_facts",
      "Why the arrest was contrary to law or by mistake",
      "the facts, in the applicant's own words and grounded in the record, showing why the arrest was contrary to law or by mistake",
      "the committed legal-design registry requires this account and the platform holds no case-specific narrative"
    ),
    h.rbf(
      "office_contacted",
      "Office contacted about the required written endorsement",
      "the arresting agency or State Attorney office contacted about endorsement",
      "the committed legal-design registry requires the agency contact and the platform holds no case-specific contact result"
    ),
    h.rbf(
      "endorsement_contact_result",
      "Date and result of the endorsement contact",
      "the contact date and what the agency or State Attorney office said about considering or providing the endorsement",
      "the contact result is an applicant event that the route cannot determine"
    ),
    h.protectedBlank(
      "applicant_signature",
      "Applicant signature",
      "the applicant signs personally after checking the completed application"
    ),
    h.protectedBlank(
      "applicant_signature_date",
      "Date signed by the applicant",
      "a date written before the applicant signs would be false"
    ),
    h.courtBlank(
      "endorsing_official_name",
      "Name of endorsing official",
      "the agency head or State Attorney identifies themself when supplying the required written endorsement"
    ),
    h.courtBlank(
      "endorsing_official_title",
      "Official title of endorsing official",
      "the agency head or State Attorney supplies the official title"
    ),
    h.courtBlank(
      "endorsing_official_office",
      "Arresting agency or State Attorney office",
      "the endorsing official identifies the government office on whose behalf the endorsement is supplied"
    ),
    h.courtBlank(
      "endorsing_official_address",
      "Official mailing address of endorsing office",
      "the endorsing government office supplies its current official address"
    ),
    h.courtBlank(
      "endorsing_official_contact",
      "Official telephone or email of endorsing office",
      "the endorsing government office supplies its current contact information"
    ),
    h.courtBlank(
      "endorsing_official_signature",
      "Signature of endorsing official",
      "only the agency head or State Attorney may execute the written endorsement"
    ),
    h.courtBlank(
      "endorsing_official_signature_date",
      "Date signed by endorsing official",
      "only the endorsing official supplies the true execution date"
    )
  ];
  return [composedMapOf(COMPONENT_ID, FAMILY, writes, refusals)];
}

function participantInstructions(rbf) {
  const out = [];
  out.push("# Before you submit this Florida administrative-expunction application", "");
  out.push(`This packet is prepared for **${ROUTE.legalName}**. It is an applicant-written agency application, not a court petition and not an FDLE-issued uniform form.`, "");
  out.push("The Captain's source-identity determination records that current Rule 11C-7.008 prescribes no uniform FDLE form. It permits an agency-letterhead route or an applicant's written request with the written endorsement of the head of the arresting agency or the State Attorney. This packet implements only that applicant-written route.", "");
  out.push("The platform filled the identity and contact facts it holds: your name, date of birth, mailing address, telephone number, and email. It did not sign, date, endorse, or certify anything.", "");

  out.push("## The required component", "");
  out.push(`- \`${COMPONENT_ID}\`: your written application, followed by the endorsement section that the agency head or State Attorney completes or replaces with a separate acceptable written endorsement.`, "");

  out.push("## The items you must supply before submission", "");
  out.push("Copy the arrest facts from the arrest record. Do not work from memory. Every item below is printed as a labelled dotted blank in the application.", "");
  out.push("| Blank in the application | What you supply |", "| --- | --- |");
  for (const item of rbf) out.push(`| ${item.disclosureLabel} | ${item.participantMustSupply} |`);
  out.push("");

  out.push("## What you do, in order", "");
  out.push("1. Obtain and read the arrest record. Confirm the arresting agency, date, accusation, and any incident, booking, or arrest number.");
  out.push("2. Complete every labelled applicant blank. Describe why the arrest was contrary to law or by mistake using facts the record supports; do not turn the blank into legal argument.");
  out.push("3. Ask the head of the arresting agency or the State Attorney to supply the required written endorsement. The official may complete this packet's endorsement section or provide a separate written endorsement acceptable to FDLE.");
  out.push("4. Review the complete application and endorsement. Then sign and date the applicant lines personally. The platform never signs or dates them.");
  out.push("5. Before sending anything, confirm FDLE's current submission address or channel and current instructions directly with FDLE. The committed record does not establish an address or submission method, so this packet does not guess one.");
  out.push("6. Submit the written application and completed written endorsement together to FDLE using the current instructions FDLE confirms.", "");

  out.push("## Deliberately blank", "");
  out.push("- Your signature and signature date remain blank for you.");
  out.push("- The endorsing official's name, title, office, contact information, signature, and date remain blank for the agency head or State Attorney.");
  out.push("- No notarization block is added: the source review does not state a notarization requirement.");
  out.push("- No fee or fee-waiver amount is stated: the source review states no fee and does not address a fee waiver.");
  out.push("- No service instruction is invented: the source review states no service requirement.", "");

  out.push("## Stop and get help", "");
  out.push("- The agency head or State Attorney declines to certify or endorse the request. Automated assistance ends.");
  out.push("- A material fact is disputed, or you need to argue rather than state what the record shows.");
  out.push("- Any immigration matter is involved.");
  out.push("- FDLE requests a different form, document, or procedure than this packet describes. Follow the current official instruction and get legal help rather than improvising.", "");

  out.push("## What this packet is not", "");
  out.push("It is a composed written agency application, not an official FDLE form, not a court petition, not legal advice, not submitted for you, and not a promise that FDLE will grant administrative expunction.", "");
  out.push(`_Route: ${ROUTE.routeKeys[0]}_`);
  return `${out.join("\n")}\n`;
}

const FAMILY = {
  familyId: FAMILY_ID,
  outDir: OUT,
  buildScript: "scripts/build-census-v1-fl-administrative-set.mjs",
  jurisdiction: "FL",
  route: ROUTE,
  components: COMPONENTS,
  composedFrom:
    "the committed Florida legal-design registry and specifications, the route-obligation census, and the Captain's source-identity determination for Rule 11C-7.008",
  compositionSources: [
    "data/record-clearing/legal-design-track-registry.json",
    "data/record-clearing/legal-design-specifications.json",
    "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
    "data/rcap-grade-a/source-wave-integration/CAPTAIN_SOURCE_IDENTITY_DETERMINATIONS.json"
  ],
  composedBody,
  maps,
  fixtures: FIXTURES,
  participantInstructions,
  formIdentityNote:
    "The Captain's source-identity determination replaces the descriptive FDLE-form label with COMPOSE_FROM_AUTHORITY: Rule 11C-7.008 prescribes no uniform FDLE form. This build composes the applicant's written request and a written-endorsement section; no source binary is acquired, substituted, or represented as an official form.",
  routeSelectionNote:
    "There is one route and one required primary-filing component. The packet expressly selects the applicant-written branch, not the alternate agency-letterhead branch, and requires the agency-head or State Attorney written endorsement that branch needs.",
  whatThisReceiptDoesNotEstablish: [
    "that FDLE has accepted this composed layout or approved it for participant delivery",
    "that any arrest was contrary to law or by mistake",
    "that an agency head or State Attorney will provide the required written endorsement",
    "FDLE's current submission address, channel, fee, notarization rule, or processing time"
  ],
  buildFindings: [
    {
      finding:
        "The current source-identity determination records that Rule 11C-7.008 neither prescribes nor incorporates a uniform FDLE application. It requires a written application, using either an agency-letterhead route or an applicant-written request with a written agency or State Attorney endorsement.",
      consequence:
        "No external source is acquired or substituted. This build composes only the applicant-written branch, names itself as a composed document, and carries an endorsement section for the authorized official."
    },
    {
      finding:
        "The legal-design registry requires three applicant inputs: arrest agency/date/accusation, why the arrest was contrary to law or by mistake, and contact with the agency about certification. It leaves certification and signature fields for later completion.",
      consequence:
        "Known identity/contact facts are visibly written; every case fact is a labelled REQUIRED_BEFORE_FILING blank, and all applicant-signature and government-endorsement fields remain protected."
    },
    {
      finding:
        "The committed record identifies FDLE as the statewide destination but establishes no submission address or method and states no fee, fee waiver, notarization, or service procedure.",
      consequence:
        "The packet names FDLE but requires confirmation of the current submission channel directly with FDLE and invents none of the unrecorded mechanics."
    }
  ],
  counselQuestions: [
    "Confirm that the composed applicant-written request and endorsement statement express the Rule 11C-7.008 applicant branch without adding a requirement beyond the current rule.",
    "Confirm whether FDLE has any current submission address, channel, identity attachment, or other instruction that should be added before release."
  ],
  reviewerAttention: [
    "The document must remain visibly identified as composed and not an FDLE-issued uniform form.",
    "The applicant and endorsing-official signature/date lines must remain blank, and the endorsement must never appear pre-executed.",
    "The current-submission-channel stop is deliberate because no committed record establishes an address or method."
  ]
};

async function runFamily(argv = process.argv.slice(2)) {
  const result = await runComposedFamily(FAMILY, argv);
  if (argv.includes("--check") || !["COMPLETED", "STOPPED"].includes(result.status)) return result;

  /*
   * This is an agency application composed from codified authority, not a
   * court pleading.  The shared host supplies the deterministic PDF and field-
   * completeness machinery; these family-level labels retain the governing
   * delivery strategy.  The route artifact is byte-identical to the one-route
   * family assembly, declared explicitly so route completeness can be measured
   * before the family becomes COMPLETE_PACKET_PROVEN.
   */
  const receiptPath = `${OUT}/source-receipt.json`;
  const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
  receipt.implementationStrategy = "participant_agency_application";
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);

  const mapPath = `${OUT}/production-field-map.json`;
  const fieldMap = JSON.parse(fs.readFileSync(mapPath, "utf8"));
  fieldMap.renderStrategy = "composed_agency_application";
  fieldMap.implementationStrategy = "participant_agency_application";
  fieldMap.componentRoutes = { [COMPONENT_ID]: ROUTE.routeKeys[0] };
  fieldMap.routeSelectionsMade = [{
    routeKey: ROUTE.routeKeys[0],
    instrument: `primary_filing: ${COMPONENT_ID}`,
    selectedBranch: "applicant-written request with written agency-head or State Attorney endorsement",
    statedOn: "the application title, document-identity notice, application paragraph, and endorsement section"
  }];
  fs.writeFileSync(mapPath, `${JSON.stringify(fieldMap, null, 2)}\n`);

  const renderedPath = `${OUT}/reports/rendered-artifacts.json`;
  const rendered = JSON.parse(fs.readFileSync(renderedPath, "utf8"));
  rendered.pdfs = rendered.pdfs.map((pdf) => ({
    ...pdf,
    role: "assembled_packet_of_composed_agency_application"
  }));
  rendered.routeArtifacts = rendered.artifacts.map((artifact) => ({
    ...artifact,
    routeKey: ROUTE.routeKeys[0],
    route: "administrative-expunction-mistaken-or-unlawful-arrest",
    customerRouteId: null,
    unitOfDelivery: "single_route_family_assembly",
    familyAssemblyIsRouteArtifact: true,
    equivalenceBasis: {
      family: "one family route and one component assigned to that route",
      bytes: "the route artifact is the family assembly itself; no copy or rewritten PDF exists"
    },
    role: "route_packet_of_composed_agency_application",
    deliveryRole: "participant_deliverable_for_this_route_only",
    valuesReadBackFromTheseBytes: 5,
    rasterPending: true,
    independentVerificationPending: true
  }));
  fs.writeFileSync(renderedPath, `${JSON.stringify(rendered, null, 2)}\n`);

  return { ...result, implementationStrategy: "participant_agency_application" };
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((result) => { console.log(JSON.stringify(result, null, 2)); })
    .catch((error) => { console.error(error); process.exit(1); });
}

export { FAMILY };
