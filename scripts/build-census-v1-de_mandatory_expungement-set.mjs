#!/usr/bin/env node
/**
 * PF21 Delaware mandatory/automatic-expungement process guidance.
 *
 * Delaware exposes no public application binary for this route. The repository
 * label DE-SBI-MANDATORY-EXPUNGEMENT-APPLICATION is descriptive, not an
 * issuer-assigned title or form number. This builder therefore uses the
 * participant_agency_application treatment to compose process guidance only;
 * it never creates or substitutes an agency application or court form.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runComposedFamily } from "./rcap-custom-pleading/composed-family-host.mjs";
import { makeAgencyGuidanceFamily } from "./build-census-v1-agency-application-treatment:obligation:research-decision-route:AL:al-uncharged-arrest:agency_record_challenge.mjs";

const FAMILY_ID = "de_mandatory_expungement-set";
const ROUTE_KEY = "obligation:track-pathway:DE:de_mandatory_expungement:mandatory-and-automatic-expungement-under-11-del-c-4373-and-4373a";
const OUT_DIR = "data/rcap-all50/overlays/census-v1/de/de-mandatory-expungement-set--official-pdf-fill";

const FAMILY = makeAgencyGuidanceFamily({
  familyId: FAMILY_ID,
  buildScript: "scripts/build-census-v1-de_mandatory_expungement-set.mjs",
  outDir: OUT_DIR,
  jurisdiction: "DE",
  routeKey: ROUTE_KEY,
  legalName: "Delaware mandatory and automatic expungement under 11 Del. C. Secs. 4373 and 4373A",
  routeName: "checking the automatic process and contacting the Delaware State Bureau of Identification for mandatory-expungement eligibility and instructions",
  title: "Delaware SBI Mandatory/Automatic Expungement Process Guide",
  statutes: ["11 Del. C. Sec. 4373", "11 Del. C. Sec. 4373A"],
  compositionSources: [
    "data/rcap-grade-a/source-wave-integration/CAPTAIN_SOURCE_IDENTITY_DETERMINATIONS.json",
    "data/rcap-codex/source-acquisition-2026-09-04/results/supplement-ledger/sources/DE-SBI-MANDATORY/receipt.json",
    "data/record-clearing/legal-design-intake/DE.memo.json",
    "src/lib/rcap-engine/compiled/profiles/DE-delaware.json",
    "data/expungement-ai/route-product-metadata.json",
    "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json"
  ],
  composedFrom: "the committed Delaware SBI source-identity determination, no-public-binary receipt, legal-design memo, compiled pathway, guidance-only product metadata, and exact census route, each hashed into source-receipt.json at build time",
  formIdentityNote: "DE-SBI-MANDATORY-EXPUNGEMENT-APPLICATION is a descriptive repository label, not an issuer-assigned form title or number. Current official materials expose no public application binary. The output is process guidance, not an official application, a substitute form, or a court pleading.",
  fixtures: {
    canonical: {
      "participant.full_legal_name": "Jordan Avery Reyes",
      "participant.date_of_birth": "1991-04-17",
      "participant.street_address": "42 Larkspur Street, Dover, DE 19901",
      "participant.phone": "302-555-0142",
      "participant.email": "jordan.reyes@example.org"
    },
    boundary: {
      "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
      "participant.date_of_birth": "1968-12-31",
      "participant.street_address": "1188 Brandywine Creek Crossing Road, Apartment 14B, Wilmington, Delaware 19810-2214",
      "participant.phone": "(302) 555-0199 ext. 4417",
      "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
    }
  },
  sections: [
    {
      heading: "What this guide is - and is not",
      paragraphs: [
        "This is route-scoped process guidance only. It is not a Delaware SBI application, is not a court form, and is not filed or submitted anywhere. LegalEase does not offer checkout or a filing packet on this route.",
        "The label DE-SBI-MANDATORY-EXPUNGEMENT-APPLICATION is an internal repository description, not a title or form number assigned by Delaware. Do not print, sign, mail, upload, or file this guide as a substitute application.",
        "Under the committed Delaware record, SBI identifies mandatory-eligible cases monthly for automatic expungement under Sec. 4373A. That automatic branch requires no participant filing. This guide does not decide whether a person or case is eligible."
      ]
    },
    {
      heading: "Exact SBI destination and next steps",
      paragraphs: [
        "Start with the Delaware State Police, State Bureau of Identification, Expungement Section. Call 302-739-5884. The official process page is https://dsp.delaware.gov/expungements/.",
        "Tell SBI you are checking mandatory or automatic expungement under 11 Del. C. Secs. 4373 and 4373A. Ask whether the automatic process has reached the case and what identifying or case information SBI needs to review it.",
        "If SBI determines that the person is eligible, SBI provides an eligibility letter and instructions. Wait for that letter and follow only the current directions it contains. Do not send this guide, invent an application, or send a payment based on this guide. No mailing address, portal, or submission method is asserted here.",
        "Cost, as the committed Delaware record states it: the court instructions state a $75 filing fee on the mandatory path after the SBI letter. The SBI's own current fee is not source-approved and is not stated here; confirm it with SBI.",
        "Fee waiver and conversion, as the same record states it: under 11 Del. C. Sec. 4372(l), if an outstanding fine or fee is unpaid for reasons other than wilful noncompliance and the person is otherwise eligible, the court may grant the expungement and waive the fines or fees or convert them to a civil judgment. Unpaid fines, fees, or restitution where that waiver or conversion is needed is a stop condition on this route, not a step to take from this guide."
      ]
    },
    {
      heading: "Self-help stop",
      paragraphs: [
        "Stop and get help before taking another step if SBI says the case is not mandatory-eligible, directs you to a court petition, or the record does not clear after SBI's process. Those events leave this guidance-only route.",
        "Stop and get help if there is uncertainty about every charge in a case, waiting-period dates, prior or later convictions, pending charges, incarceration, probation or parole, unpaid fines, fees or restitution, or an offense involving domestic violence, a child, a vulnerable adult, a violent felony, or mixed traffic and nontraffic charges.",
        "Stop and obtain appropriate legal advice if the goal is to attack the conviction rather than clear the record, or if immigration, firearms, professional licensing, a registry, or law-enforcement employment may be affected."
      ]
    }
  ],
  requiredFacts: [
    {
      id: "record_status",
      label: "Current record and automatic-expungement status",
      what: "the exact record that still appears and whether SBI says the monthly automatic process has reached it",
      authority: "the participant's current record and the Delaware SBI Expungement Section at 302-739-5884",
      why: "the platform cannot see the participant's current record or SBI processing status"
    },
    {
      id: "case_identity",
      label: "Every case number, court, county, charge, and statute section",
      what: "the identifiers and every charge in each case exactly as the official records state them",
      authority: "the court records and the participant's current Delaware criminal-history record",
      why: "no participant case or criminal-history record is held"
    },
    {
      id: "outcome_and_dates",
      label: "Disposition, conviction, release, and sentence-completion dates",
      what: "the exact outcome and all dates SBI needs to evaluate the applicable branch and waiting period",
      authority: "certified court and correctional records",
      why: "the platform cannot determine the case outcome or calculate a participant-specific waiting period"
    },
    {
      id: "other_and_pending_matters",
      label: "Prior, later, and pending criminal matters",
      what: "a complete account of other convictions and pending charges, including the offense and disposition of each",
      authority: "the participant's complete criminal-history and court records and SBI",
      why: "the platform does not hold a complete criminal history and cannot decide the statutory tier"
    },
    {
      id: "custody_and_supervision",
      label: "Current incarceration, parole, or probation status",
      what: "whether any incarceration, parole, or probation is still being served and its completion date",
      authority: "the supervising or correctional agency and the sentencing court",
      why: "the platform cannot know the participant's current custody or supervision status"
    },
    {
      id: "financial_obligations",
      label: "Fines, fees, and restitution status",
      what: "whether all financial obligations associated with the conviction are paid and, if not, the exact balance and reason",
      authority: "the court clerk or agency maintaining the official balance",
      why: "the platform cannot see or certify the participant's financial-obligation status"
    },
    {
      id: "sbi_letter_and_instructions",
      label: "SBI eligibility letter and current instructions",
      what: "the eligibility determination, next steps, destination, required materials, and any fee stated by SBI after its review",
      authority: "the eligibility letter and instructions supplied directly by Delaware SBI",
      why: "SBI supplies these participant-specific instructions only after determining eligibility"
    }
  ],
  instructions: [
    "There is no checkout and nothing to file from this guide. Do not submit it to a court or agency. Contact the Delaware SBI Expungement Section at 302-739-5884 and use https://dsp.delaware.gov/expungements/ to confirm the current process.",
    "Have the listed record and case facts available. Ask whether the automatic process has reached the case. If SBI determines eligibility, wait for its letter and follow only the current instructions and any fee information SBI provides.",
    "Cost: the court instructions state a $75 filing fee on the mandatory path after the SBI letter. The SBI's own current fee is not source-approved and is not stated here. Under 11 Del. C. Sec. 4372(l), if an outstanding fine or fee is unpaid for reasons other than wilful noncompliance and the person is otherwise eligible, the court may grant the expungement and waive the fines or fees or convert them to a civil judgment.",
    "Stop and get help if SBI denies mandatory eligibility, directs a court petition, the record remains uncleared, a listed case fact is uncertain, or immigration, firearms, licensing, registry, or law-enforcement-employment consequences may be involved."
  ],
  buildFindings: [
    {
      finding: "The controlling source disposition identifies no public application binary and says the repository application label is descriptive rather than issuer-assigned.",
      consequence: "The family composes route-scoped SBI process guidance and does not create, name, or substitute an application or court form."
    },
    {
      finding: "The committed route metadata is guidance-only, userFiled false, checkout-ineligible, and payment-product-ineligible.",
      consequence: "The guide makes no checkout, filing, service, portal, or mailing-address claim. It states the $75 mandatory-path filing fee and the Sec. 4372(l) waiver-or-conversion limb exactly as the committed Delaware memo states them, and asserts no SBI fee of its own."
    },
    {
      finding: "The committed Delaware profile directs the participant to SBI at 302-739-5884 and records that SBI supplies an eligibility letter and instructions if eligible.",
      consequence: "Those are the only destination and action mechanics stated as fixed; participant-specific case facts and SBI's later directions remain required before action."
    }
  ],
  counselQuestions: [
    "Confirm before promotion that the no-public-binary disposition, SBI phone number, and eligibility-letter handoff remain current.",
    "Confirm that the self-help stops preserve the boundary between the mandatory/automatic SBI process and every discretionary court route."
  ],
  reviewerAttention: [
    "The output must remain process guidance even though the factory strategy is participant_agency_application.",
    "No participant-facing text may present the descriptive repository label as an issuer form title."
  ],
  receiptLimits: [
    "that a publicly downloadable application has since been issued",
    "that the SBI telephone number or process page will remain unchanged",
    "that SBI will find this participant or case eligible"
  ]
});

async function run(argv = process.argv.slice(2)) {
  const result = await runComposedFamily(FAMILY, argv);
  if (result.status !== "CHECK_ONLY") {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const receiptPath = path.join(root, OUT_DIR, "source-receipt.json");
    const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
    receipt.bindingMethod = "no public downloadable participant application binary is exposed or bound for this route; the descriptive repository label is not an issuer form title; every composed page is process guidance grounded on the committed authority and source-disposition records hashed below";
    fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  }
  return result;
}

export { FAMILY, run };

const invoked = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invoked) {
  run()
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => { console.error(error); process.exit(1); });
}
