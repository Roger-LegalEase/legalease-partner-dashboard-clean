// Mississippi relief tracks — implementation Tranche 1.
//
// Five participant petition routes, every one `custom_pleading` with
// `localFormOverride` semantics: Mississippi publishes no statewide expungement
// form, so a statewide neutral pleading drafted to the statute is the
// controlling output rather than a fallback.
//
// Each track is `technicalFixture: true` and `runtimeDisabled: true` on purpose.
// That is not a placeholder — it is the state these tracks are actually in.
// Reviewing counsel has not approved the pleadings, so they may not fulfil a
// real participant request, and `computeRuntimeStatus` cannot return a ready
// status for any of them. The flag is also what lets the packets be generated
// through the real fulfilment path for review, under an explicit
// `allowTechnicalFixtures` opt-in, instead of being assembled outside the
// renderer to look complete.
//
// Authority pins live in
// `data/record-clearing/implementation-tranches/tranche-1-authority-pins.json`.

import type { PacketSet, ReliefTrack } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

/** No component here is visually or legally approved. This is what keeps them out of packet_ready. */
const PENDING_APPROVAL = {
  visual: "not_reviewed",
  legal: "not_submitted"
} as const;

type ComponentSpec = {
  suffix: string;
  role: PacketSet["components"][number]["role"];
  strategy: "custom_pleading" | "process_guidance";
  templateId: string;
  order: number;
};

function packetSet(trackId: string, specs: readonly ComponentSpec[]): PacketSet {
  return {
    packetSetId: `${trackId}-set`,
    version: VERSION,
    components: specs.map((spec) => ({
      componentId: `${trackId}-${spec.suffix}`,
      role: spec.role,
      outputStrategy: spec.strategy,
      rendererStrategy: spec.strategy,
      templateId: spec.templateId,
      // A custom pleading has no official source binary, and inventing one would
      // assert a source identity that does not exist.
      sourcePath: null,
      sourceSha256: null,
      geographicScope: "statewide",
      requirement: "required",
      order: spec.order,
      approval: PENDING_APPROVAL,
      version: VERSION
    }))
  };
}

const COMMON_INPUTS: readonly ReliefTrack["requiredInputs"][number][] = [
  { key: "petitionerName", label: "Full legal name", required: true },
  { key: "dateOfBirth", label: "Date of birth", required: true },
  { key: "mailingAddress", label: "Mailing address", required: true },
  { key: "countyOfResidence", label: "County of residence", required: true },
  { key: "courtName", label: "Name of the court", required: true },
  { key: "courtCounty", label: "County or city of the court", required: true },
  { key: "causeNumber", label: "Cause or case number", required: true },
  { key: "chargeName", label: "Charge", required: true },
  { key: "offenceDate", label: "Date of the offence or arrest", required: true },
  { key: "prosecutingAuthorityName", label: "Prosecuting authority", required: true },
  { key: "prosecutingAuthorityAddress", label: "Prosecuting authority address", required: true },
  { key: "arrestingAgencyName", label: "Arresting agency", required: true },
  { key: "serviceMethod", label: "How the copy will be delivered", required: true },
  { key: "petitionerStatement", label: "Petitioner's own statement", required: true },
  { key: "chargeStatute", label: "Mississippi Code section, if known", required: false },
  { key: "contactPhone", label: "Telephone number", required: false },
  { key: "contactEmail", label: "Email address", required: false }
];

function mississippiTrack(input: {
  trackId: string;
  publicName: string;
  mechanism: string;
  authority: string;
  recordTypes: readonly string[];
  dispositions: readonly string[];
  courtLevel: string;
  packetSet: PacketSet;
  extraInputs: readonly ReliefTrack["requiredInputs"][number][];
  customerDeliverableDescription: string;
  notes: string;
}): ReliefTrack {
  const statuses = {
    // The research is complete: the normalization is accepted and Edition 1.2
    // retains the controlling review and the addendum.
    research: "research_draft_complete",
    // Set by the tranche's own generation and review run, not asserted here.
    technical: "renderer_ready",
    visual: "not_reviewed",
    legal: "not_submitted"
  } as const;

  return {
    jurisdiction: "MS",
    trackId: input.trackId,
    publicName: input.publicName,
    mechanism: input.mechanism,
    authority: input.authority,
    recordTypes: input.recordTypes,
    dispositions: input.dispositions,
    courtLevel: input.courtLevel,
    geographicScope: "statewide",
    geographyKeys: [],
    outputStrategy: "custom_pleading",
    packetSet: input.packetSet,
    requiredInputs: [...COMMON_INPUTS, ...input.extraInputs],
    statuses: {
      ...statuses,
      runtime: computeRuntimeStatus({
        statuses,
        sourceCurrent: true,
        runtimeDisabled: true,
        outputStrategy: "custom_pleading"
      })
    },
    sourceCurrent: true,
    technicalFixture: true,
    runtimeDisabled: true,
    customerDeliverableDescription: input.customerDeliverableDescription,
    notes: input.notes
  };
}

export const MISSISSIPPI_TRANCHE_1_TRACKS: readonly ReliefTrack[] = [
  mississippiTrack({
    trackId: "ms-fel",
    publicName: "Clearing one felony conviction",
    mechanism: "felony_conviction_expungement",
    authority: "Miss. Code Ann. § 99-19-71(2), as amended by 2026 HB 1546",
    recordTypes: ["felony_conviction"],
    dispositions: ["convicted"],
    courtLevel: "circuit",
    packetSet: packetSet("ms-fel", [
      { suffix: "primary-filing-1", role: "primary_filing", strategy: "custom_pleading", templateId: "ms-fel-petition", order: 1 },
      { suffix: "proposed-order-2", role: "proposed_order", strategy: "custom_pleading", templateId: "ms-fel-proposed-order", order: 2 },
      { suffix: "certificate-of-service-3", role: "certificate_of_service", strategy: "custom_pleading", templateId: "ms-fel-certificate-of-service", order: 3 },
      { suffix: "notice-6", role: "notice", strategy: "custom_pleading", templateId: "ms-fel-da-notice", order: 4 },
      { suffix: "attachment-4", role: "attachment", strategy: "process_guidance", templateId: "ms-fel-records-checklist", order: 5 },
      { suffix: "instructions-5", role: "instructions", strategy: "process_guidance", templateId: "ms-fel-filing-instructions", order: 6 }
    ]),
    extraInputs: [
      { key: "convictionDate", label: "Date of conviction", required: true },
      { key: "sentenceCompletionDate", label: "Date all sentence terms were completed", required: true }
    ],
    customerDeliverableDescription:
      "A petition to expunge one felony conviction, a proposed order, a certificate of service, the ten days' written notice to the district attorney, a records checklist and filing instructions.",
    notes:
      "Three-year waiting period under § 99-19-71(2)(a) as amended by 2026 HB 1546. The § 99-19-71(2)(b) notice is a separate packet component."
  }),

  mississippiTrack({
    trackId: "ms-misd-1st",
    publicName: "Clearing a first misdemeanor conviction",
    mechanism: "first_offender_misdemeanor_expungement",
    authority: "Miss. Code Ann. § 99-19-71(1)",
    recordTypes: ["misdemeanor_conviction"],
    dispositions: ["convicted"],
    courtLevel: "any_trial_court",
    packetSet: packetSet("ms-misd-1st", [
      { suffix: "primary-filing-1", role: "primary_filing", strategy: "custom_pleading", templateId: "ms-misd-1st-petition", order: 1 },
      { suffix: "proposed-order-2", role: "proposed_order", strategy: "custom_pleading", templateId: "ms-misd-1st-proposed-order", order: 2 },
      { suffix: "certificate-of-service-3", role: "certificate_of_service", strategy: "custom_pleading", templateId: "ms-misd-1st-certificate-of-service", order: 3 },
      { suffix: "attachment-4", role: "attachment", strategy: "process_guidance", templateId: "ms-misd-1st-records-checklist", order: 4 },
      { suffix: "instructions-5", role: "instructions", strategy: "process_guidance", templateId: "ms-misd-1st-filing-instructions", order: 5 }
    ]),
    extraInputs: [{ key: "convictionDate", label: "Date of conviction", required: true }],
    customerDeliverableDescription:
      "A petition to expunge a first misdemeanor conviction, a proposed order, a certificate of service, a records checklist and filing instructions.",
    notes: "Mississippi has four trial court levels that all handle expungements; the convicting court controls venue."
  }),

  mississippiTrack({
    trackId: "ms-misd-addl",
    publicName: "Clearing additional misdemeanors in city or justice court",
    mechanism: "additional_misdemeanor_expungement",
    authority: "Miss. Code Ann. §§ 9-11-15(3), 21-23-7(6)",
    recordTypes: ["misdemeanor_conviction"],
    dispositions: ["convicted"],
    courtLevel: "justice_or_municipal",
    packetSet: packetSet("ms-misd-addl", [
      { suffix: "primary-filing-1", role: "primary_filing", strategy: "custom_pleading", templateId: "ms-misd-addl-petition", order: 1 },
      { suffix: "proposed-order-2", role: "proposed_order", strategy: "custom_pleading", templateId: "ms-misd-addl-proposed-order", order: 2 },
      { suffix: "certificate-of-service-3", role: "certificate_of_service", strategy: "custom_pleading", templateId: "ms-misd-addl-certificate-of-service", order: 3 },
      { suffix: "attachment-4", role: "attachment", strategy: "process_guidance", templateId: "ms-misd-addl-records-checklist", order: 4 },
      { suffix: "instructions-5", role: "instructions", strategy: "process_guidance", templateId: "ms-misd-addl-filing-instructions", order: 5 }
    ]),
    extraInputs: [
      { key: "convictionDate", label: "Date of conviction", required: true },
      { key: "sentenceCompletionDate", label: "Date all sentence terms were satisfied", required: true },
      { key: "courtVenue", label: "Justice court or municipal court", required: true }
    ],
    customerDeliverableDescription:
      "A petition to expunge an additional justice-court or municipal-court misdemeanor conviction, a proposed order, a certificate of service, a records checklist and filing instructions.",
    notes:
      "One mechanism, two venues. §§ 9-11-15(3) and 21-23-7(6) are word-for-word identical on every operative element, so the venue is a branch rather than a second track."
  }),

  mississippiTrack({
    trackId: "ms-nonconv",
    publicName: "Clearing a case that did not end in a conviction",
    mechanism: "non_conviction_expungement",
    authority: "Miss. Code Ann. § 99-19-71(4)",
    recordTypes: ["arrest", "charge_no_conviction"],
    dispositions: ["dismissed", "nolle_prosequi", "acquitted", "no_charge_filed"],
    courtLevel: "any_trial_court",
    packetSet: packetSet("ms-nonconv", [
      { suffix: "primary-filing-1", role: "primary_filing", strategy: "custom_pleading", templateId: "ms-nonconv-petition", order: 1 },
      { suffix: "proposed-order-2", role: "proposed_order", strategy: "custom_pleading", templateId: "ms-nonconv-proposed-order", order: 2 },
      { suffix: "certificate-of-service-3", role: "certificate_of_service", strategy: "custom_pleading", templateId: "ms-nonconv-certificate-of-service", order: 3 },
      { suffix: "attachment-4", role: "attachment", strategy: "process_guidance", templateId: "ms-nonconv-records-checklist", order: 4 },
      { suffix: "instructions-5", role: "instructions", strategy: "process_guidance", templateId: "ms-nonconv-filing-instructions", order: 5 }
    ]),
    extraInputs: [
      { key: "arrestDate", label: "Date of arrest", required: true },
      { key: "disposition", label: "How the case ended", required: true },
      { key: "dispositionDate", label: "Date the case ended", required: false }
    ],
    customerDeliverableDescription:
      "A petition to expunge the record of a case that did not end in a conviction, a proposed order, a certificate of service, a records checklist and filing instructions.",
    notes:
      "One mechanism, four dispositional branches: dismissed, nolle prosequi, acquitted, or never charged. The branch selects an approved allegation sentence and is never inferred."
  }),

  mississippiTrack({
    trackId: "ms-nonadj",
    publicName: "Cases where the court withheld your guilty plea",
    mechanism: "nonadjudication_expungement",
    authority: "Miss. Code Ann. § 99-15-26(5)",
    recordTypes: ["nonadjudicated_charge"],
    dispositions: ["nonadjudicated"],
    courtLevel: "any_trial_court",
    packetSet: packetSet("ms-nonadj", [
      { suffix: "primary-filing-1", role: "primary_filing", strategy: "custom_pleading", templateId: "ms-nonadj-petition", order: 1 },
      { suffix: "proposed-order-2", role: "proposed_order", strategy: "custom_pleading", templateId: "ms-nonadj-proposed-order", order: 2 },
      { suffix: "certificate-of-service-3", role: "certificate_of_service", strategy: "custom_pleading", templateId: "ms-nonadj-certificate-of-service", order: 3 },
      { suffix: "attachment-4", role: "attachment", strategy: "process_guidance", templateId: "ms-nonadj-records-checklist", order: 4 },
      { suffix: "instructions-5", role: "instructions", strategy: "process_guidance", templateId: "ms-nonadj-filing-instructions", order: 5 }
    ]),
    extraInputs: [
      { key: "nonadjudicationOrderDate", label: "Date of the nonadjudication order", required: true },
      { key: "completionDate", label: "Date the conditions were completed", required: true }
    ],
    customerDeliverableDescription:
      "A petition to expunge after nonadjudication, a proposed order, a certificate of service, a records checklist and filing instructions.",
    notes:
      "Brought under § 99-15-26 alone. The petition does not carry the § 99-15-26 / § 99-19-71 dual citation the archived local models use."
  })
];
