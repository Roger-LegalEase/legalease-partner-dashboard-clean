#!/usr/bin/env node
/**
 * PF17 source-free agency-treatment host, and the Alabama record-challenge row.
 *
 * These rows are CUSTOM_PLEADING_FROM_CODIFIED_TEXT: they bind no private
 * document byte.  The artifact is a plainly labelled preparation guide for an
 * agency application, never a substitute official form or a court pleading.
 */
import {
  mapHelpers, composedMapOf, runComposedFamily, runIfMain, DOTS
} from "./rcap-custom-pleading/composed-family-host.mjs";

const FIXTURES = Object.freeze({
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.street_address": "42 Larkspur Street, Montgomery, AL 36104",
    "participant.phone": "334-555-0142",
    "participant.email": "jordan.reyes@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "1188 Upper Tallapoosa Crossing Road, Apartment 14B, Muscle Shoals, Alabama 35661-2214",
    "participant.phone": "(256) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
  }
});

const clean = (text) => String(text).replaceAll("|", "-").replaceAll("\n", " ");

/** Build the declarative object consumed by the repository's composed host. */
export function makeAgencyGuidanceFamily(config) {
  const componentId = "agency_preparation_guide";
  const components = [{
    id: componentId,
    role: "instructions",
    title: config.title
  }];
  let family;

  const composedBody = (_componentId, facts) => {
    const lines = [
      config.title.toUpperCase(),
      "",
      `ROUTE: ${config.routeKey}`,
      "THIS IS AN AGENCY-APPLICATION PREPARATION GUIDE, NOT AN OFFICIAL FORM AND NOT A COURT FILING.",
      "",
      `Prepared for: ${facts["participant.full_legal_name"]}`,
      `Date of birth: ${facts["participant.date_of_birth"]}`,
      `Mailing address: ${facts["participant.street_address"]}`,
      `Telephone: ${facts["participant.phone"]}`,
      `Email: ${facts["participant.email"]}`,
      ""
    ];
    for (const section of config.sections) {
      lines.push(section.heading.toUpperCase(), "", ...section.paragraphs, "");
    }
    lines.push("FACTS YOU MUST CONFIRM BEFORE ACTING", "");
    for (const fact of config.requiredFacts) {
      lines.push(`${fact.label}:`, DOTS(88), `Check with: ${fact.authority}`, "");
    }
    lines.push("PROTECTED ITEMS", "");
    lines.push("Do not sign or date this guide. Sign and date only the agency's own request or application, in the manner that agency directs.");
    lines.push("No court, clerk, prosecutor, agency, notary, or hearing-officer field is completed anywhere in this guide.");
    lines.push("", `Route: ${config.routeKey}`);
    return lines.join("\n");
  };

  const maps = () => {
    const h = mapHelpers(componentId);
    const writes = [
      h.write("participant_name", "Participant full legal name printed on the preparation guide", "participant.full_legal_name"),
      h.write("participant_dob", "Participant date of birth printed on the preparation guide", "participant.date_of_birth"),
      h.write("participant_address", "Participant mailing address printed on the preparation guide", "participant.street_address"),
      h.write("participant_phone", "Participant telephone printed on the preparation guide", "participant.phone"),
      h.write("participant_email", "Participant email printed on the preparation guide", "participant.email")
    ];
    const refusals = config.requiredFacts.map((fact) => h.rbf(
      fact.id,
      fact.label,
      `${fact.what}; confirm it with ${fact.authority}`,
      fact.why
    ));
    return [composedMapOf(componentId, family, writes, refusals)];
  };

  const participantInstructions = (requiredBeforeFiling) => {
    const out = [
      `# Before you act - ${config.routeName}`,
      "",
      `This packet is prepared for **${config.legalName}**.`,
      "",
      "The PDF is a preparation guide composed from the committed legal records listed in the source receipt. It is not an official agency form, is not filed with a court, and does not replace any current form, portal, address, fee, or submission rule the receiving agency requires.",
      "",
      "The platform wrote only the identity and contact facts it holds: full legal name, date of birth, mailing address, telephone, and email. It did not sign, date, notarize, or make a legal election for you.",
      "",
      "## Required before you use the agency process",
      "",
      "| Blank printed in the guide | What you must supply |",
      "| --- | --- |"
    ];
    for (const item of requiredBeforeFiling) {
      out.push(`| ${clean(item.disclosureLabel)} | ${clean(item.participantMustSupply)} |`);
    }
    out.push(
      "",
      "## Route boundary",
      "",
      ...config.instructions,
      "",
      "## Protected items left blank",
      "",
      "Your signature, signature date, any notarization, and every agency-, clerk-, prosecutor-, court-, or hearing-officer field remain blank. Complete them only on the receiving authority's own instrument and only when that authority directs.",
      "",
      `Route: ${config.routeKey}`,
      ""
    );
    return out.join("\n");
  };

  family = {
    familyId: config.familyId,
    buildScript: config.buildScript,
    outDir: config.outDir,
    jurisdiction: config.jurisdiction,
    route: {
      routeKeys: [config.routeKey],
      legalName: config.legalName,
      routeName: config.routeName,
      statutes: config.statutes
    },
    components,
    fixtures: config.fixtures ?? FIXTURES,
    compositionSources: config.compositionSources,
    composedFrom: config.composedFrom,
    formIdentityNote: config.formIdentityNote,
    routeSelectionNote: `The exact route is fixed as ${config.routeKey}. The guide selects that agency route and presents no alternate instrument for the participant to elect.`,
    whatThisReceiptDoesNotEstablish: [
      "that the receiving authority has not changed its current form, portal, destination, fee, or procedure",
      "that the participant satisfies every eligibility condition",
      ...(config.receiptLimits ?? [])
    ],
    buildFindings: config.buildFindings,
    counselQuestions: config.counselQuestions,
    reviewerAttention: [
      "This source-free build composes only a preparation guide; no document is represented as an official form.",
      "The canonical and boundary PDFs remain review artifacts with independent verification and raster review pending.",
      ...(config.reviewerAttention ?? [])
    ],
    maps,
    composedBody,
    participantInstructions
  };
  return family;
}

const FAMILY_ID = "agency-application-treatment:obligation:research-decision-route:AL:al-uncharged-arrest:agency_record_challenge";

const FAMILY = makeAgencyGuidanceFamily({
  familyId: FAMILY_ID,
  buildScript: "scripts/build-census-v1-agency-application-treatment:obligation:research-decision-route:AL:al-uncharged-arrest:agency_record_challenge.mjs",
  outDir: "data/rcap-all50/overlays/census-v1/al/agency-application-treatment:obligation:research-decision-route:al:al-uncharged-arrest:agency-record-challenge--official-pdf-fill",
  jurisdiction: "AL",
  routeKey: "obligation:research-decision-route:AL:al-uncharged-arrest:agency_record_challenge",
  legalName: "Alabama criminal-justice-information agency record challenge under Ala. Code Secs. 41-9-645 to 41-9-646",
  routeName: "challenging inaccurate, incomplete, misleading, or misassigned Alabama criminal-justice information with ALEA/ACJIC or the originating agency",
  title: "Alabama Agency Record-Challenge Preparation Guide",
  statutes: ["Ala. Code Sec. 41-9-645", "Ala. Code Sec. 41-9-646"],
  compositionSources: [
    "data/record-clearing/legal-decisions/2026-08-28-national-legal-decisions.json",
    "data/record-clearing/legal-decisions/2026-08-30-lawrence-four-counsel-determinations.json",
    "data/record-clearing/legal-design-intake/AL.memo.json",
    "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json"
  ],
  composedFrom: "the committed Alabama research-track decision, counsel determination, legal-design memo, and exact census route record, each hashed into source-receipt.json at build time",
  formIdentityNote: "No private source byte is bound to this PF17 family. The output is plainly labelled as a preparation guide and is not assigned an Alabama form number.",
  sections: [
    {
      heading: "Use this route only for a record error",
      paragraphs: [
        "This route corrects or supplements inaccurate, incomplete, misleading, or misassigned criminal-justice information. It is not a general expungement remedy for an accurate arrest merely because no charge followed.",
        "If the record is accurate and the goal is expungement, stop: Alabama's separate Title 15 expungement route must be assessed instead. Identity theft or disputed biometrics begins with agency correction and moves to counsel if unresolved."
      ]
    },
    {
      heading: "Agency sequence",
      paragraphs: [
        "Obtain and review the Alabama criminal-history record. Identify the precise challenged entry and assemble identity verification, fingerprints if the agency requires them, and certified proof of the correct disposition.",
        "Confirm the current challenge procedure with ALEA/ACJIC or the originating criminal-justice agency and use exactly that procedure. The committed record says the challenge ordinarily must begin within one calendar year after AJIC's response to the criminal-history application.",
        "If the agency denies the challenge, keep the denial and follow the recorded written administrative appeal to the AJIC Director. A de novo circuit-court route exists only after a final Commission decision and is a separate packet; the recorded court window is 30 days after receipt or service of that final decision."
      ]
    }
  ],
  requiredFacts: [
    { id: "record_holding_agency", label: "ALEA/ACJIC or originating agency that holds the challenged entry", what: "the exact record-holding agency and its current challenge destination", authority: "the criminal-history record and that agency's records unit", why: "the repository cannot know which originating agency owns this participant's entry" },
    { id: "challenged_entry", label: "Challenged criminal-history entry", what: "the exact entry, identifiers, and wording being challenged", authority: "the participant's Alabama criminal-history record", why: "no participant criminal-history record is held" },
    { id: "error_description", label: "Why the entry is inaccurate, incomplete, misleading, or misassigned", what: "a precise description of the error and the correction requested", authority: "the record itself and the participant's certified disposition or identity proof", why: "the platform cannot assert the facts of a participant's record dispute" },
    { id: "certified_disposition", label: "Certified proof of the correct disposition", what: "the issuing court, case number, disposition, and certification date", authority: "the clerk of the court that disposed of the matter", why: "no certified participant disposition is held" },
    { id: "current_agency_process", label: "Current agency submission method and destination", what: "the current form, address or portal, attachments, and fee if any", authority: "ALEA/ACJIC or the originating agency", why: "no held source establishes the current submission mechanics or fee" }
  ],
  instructions: [
    "Use this route only when the record is wrong, incomplete, misleading, or assigned to the wrong person. An accurate arrest that the participant wants expunged belongs to a different Alabama route.",
    "Confirm the receiving agency's current procedure before sending anything. Keep every submission, delivery record, response, denial, appeal, final decision, and the date it was received.",
    "A disputed material fact or a final agency denial is an attorney handoff. This packet does not prepare or open the separate circuit-court appeal."
  ],
  buildFindings: [
    { finding: "The exact PF17 family is source-free CUSTOM_PLEADING_FROM_CODIFIED_TEXT.", consequence: "The build binds committed legal records, composes a preparation guide, and embeds no or substituted official source byte." },
    { finding: "The administrative challenge and later circuit-court appeal are separate routes.", consequence: "The guide stops at the agency process and opens no court route." }
  ],
  counselQuestions: [
    "Confirm the one-calendar-year agency-challenge timing statement and the 30-day post-final-decision court window before promotion.",
    "Confirm that the boundary between this agency challenge and the separate Title 15 expungement and de novo appeal routes remains correct."
  ]
});

export { FAMILY };
runIfMain(FAMILY, import.meta.url);
