// Georgia Superior Court pleading family — implementation Tranche 3.
//
// Ten Georgia record-restriction routes were assigned. Nine are implemented
// here. `ga-jail-k2` is not, and it is registered as an explicit typed stop
// rather than omitted: see GA_JAIL_K2_STOP below.
//
// Every implemented track is `custom_pleading` with `localFormOverride`
// semantics. Georgia publishes no statewide judiciary form for any of these
// routes, which the adopted legal design records for each of them, so a
// statewide neutral pleading drafted to the statute is the controlling output
// rather than a fallback. Where a county publishes its own form, that local
// form governs and the generated pleading is the covering filing.
//
// Georgia restricts and seals. It does not expunge. That is a statutory
// vocabulary difference, not a stylistic one, and the templates and the
// verifier both enforce it.
//
// Each track is `technicalFixture: true` and `runtimeDisabled: true` on
// purpose. That is not a placeholder — it is the state these tracks are in.
// Reviewing counsel approved the legal design, not the produced documents, so
// none of them may fulfil a real participant request and `computeRuntimeStatus`
// cannot return a ready status for any of them. The flag is also what lets the
// packets be generated through the real fulfilment path for review, under an
// explicit `allowTechnicalFixtures` opt-in, instead of being assembled outside
// the renderer to look complete.
//
// This module is not imported by `src/lib/rcap/packets/registry.ts`. Georgia is
// not an enabled jurisdiction and this job does not enable one; wiring the pack
// into the aggregate registry is the integration captain's step, not a worker's.
//
// Authority pins live in
// `data/record-clearing/implementation-tranches/tranche-3-authority-pins.json`.

import { GA_JAIL_K2_UNDRAFTED_GUIDANCE_COMPONENT_ID } from "@/lib/rcap/packets/engines/guidance-templates-ga";
import type { PacketSet, ReliefTrack, RequiredInput } from "@/lib/rcap/packets/types";
import { computeRuntimeStatus } from "@/lib/rcap/packets/types";

const VERSION = "1.0.0";

/** No component here is visually or legally approved. This keeps them out of packet readiness. */
const PENDING_APPROVAL = {
  visual: "not_reviewed",
  legal: "not_submitted"
} as const;

// ---------------------------------------------------------------------------
// ga-jail-k2 — the typed stop
// ---------------------------------------------------------------------------

/**
 * Raised when a Georgia track in this family is asked for but cannot produce a
 * complete packet.
 *
 * A typed error rather than a missing registry entry. "Unknown track" and
 * "known track that is deliberately blocked" are different facts, and a caller
 * that cannot tell them apart will eventually treat the second as the first and
 * ship a partial packet.
 */
export class GeorgiaTrackUnavailableError extends Error {
  constructor(
    readonly trackId: string,
    readonly reason: string,
    readonly blockingComponentId: string
  ) {
    super(reason);
    this.name = "GeorgiaTrackUnavailableError";
  }
}

/**
 * `ga-jail-k2` is assigned, drafted in part, and deliberately not shipped.
 *
 * Its packet has three required components. Two are custom pleadings and both
 * have drafted specifications. The third,
 * `ga-jail-k2-process-guidance-3`, is a required `process_guidance` component
 * whose specification has not been drafted: `legal-design-specifications.json`
 * carries process-guidance specifications for four Georgia tracks and for none
 * in this family.
 *
 * Two components out of three is not a packet. The participant's deliverable on
 * this route is a written request to a jail plus the guidance that tells them
 * where to send it and what to do when the 30 days expire; shipping the letter
 * without the guidance would hand someone a document and no process.
 *
 * Drafting the missing guidance here would be authoring Georgia legal design
 * inside an implementation job, which this job may not do. So the track fails
 * closed and says exactly what is missing.
 */
export const GA_JAIL_K2_STOP = Object.freeze({
  trackId: "ga-jail-k2",
  blockingComponentId: GA_JAIL_K2_UNDRAFTED_GUIDANCE_COMPONENT_ID,
  reason:
    "ga-jail-k2 cannot produce a complete packet: its required process-guidance component " +
    `${GA_JAIL_K2_UNDRAFTED_GUIDANCE_COMPONENT_ID} has no drafted guidance specification. ` +
    "Two of three required components are drafted and a partial packet is not a packet. " +
    "Drafting the missing guidance is legal design, not implementation.",
  unblockedBy:
    "A drafted process-guidance specification for ga-jail-k2 in legal-design-specifications.json."
});

/** Track ids assigned to this job that this module deliberately does not build. */
export const GEORGIA_BLOCKED_TRACK_IDS: readonly string[] = [GA_JAIL_K2_STOP.trackId];

/**
 * Fails closed for an assigned-but-blocked track.
 *
 * Call before resolving. Returns for every implemented track, throws for
 * `ga-jail-k2`.
 */
export function assertGeorgiaTrackImplemented(trackId: string): void {
  if (trackId === GA_JAIL_K2_STOP.trackId) {
    throw new GeorgiaTrackUnavailableError(
      GA_JAIL_K2_STOP.trackId,
      GA_JAIL_K2_STOP.reason,
      GA_JAIL_K2_STOP.blockingComponentId
    );
  }
}

// ---------------------------------------------------------------------------
// Participant facts
// ---------------------------------------------------------------------------

/** Raised when a participant answer is outside the approved closed list. */
export class GeorgiaBranchError extends Error {
  constructor(
    readonly trackId: string,
    readonly key: string,
    readonly value: string
  ) {
    super(`${trackId}: "${value}" is not an approved value for ${key}.`);
    this.name = "GeorgiaBranchError";
  }
}

/**
 * How the felony charge in a § 35-3-37(j)(1) case was resolved.
 *
 * A closed list. The allegation sentence is approved language per branch, so an
 * unapproved disposition fails rather than being described in words nobody
 * reviewed.
 */
export const GA_FELONY_DISPOSITIONS: Readonly<Record<string, string>> = {
  dismissed: "the felony charge was dismissed",
  nolle_prossed: "the felony charge was nolle prossed",
  found_not_guilty: "Defendant was found not guilty of the felony charge"
};

/** § 35-3-37(j)(2) reaches a conviction vacated by the trial court or reversed on review. */
export const GA_VACATED_BRANCHES: Readonly<Record<string, string>> = {
  vacated: "vacated by the trial court",
  reversed: "reversed by an appellate or other post-conviction court"
};

/** § 35-3-37(j)(4)(A) reaches one misdemeanour or a series from a single incident. */
export const GA_MISDEMEANOR_SCOPES: Readonly<Record<string, string>> = {
  single_offense:
    "This motion concerns the single misdemeanour conviction identified above.",
  series_from_single_incident:
    "This motion concerns a series of misdemeanour convictions arising from a single incident, as O.C.G.A. § 35-3-37(j)(4)(A) permits."
};

/** § 35-3-37(j)(4)(C) allows two in a lifetime. Which one this is, is pleaded. */
export const GA_LIFETIME_USE: Readonly<Record<string, string>> = {
  first: "one",
  second: "two"
};

/** How the record came to be restricted, for the § 35-3-37(m) sealing route. */
export const GA_RESTRICTION_BASES: Readonly<Record<string, string>> = {
  automatically: "automatically, on the qualifying disposition",
  pre_2013_application: "on an application made before 1 July 2013",
  court_order: "by order of a court"
};

/** § 42-8-62.2(c) reaches a discharge as a matter of law or by court order. */
export const GA_DISCHARGE_BASES: Readonly<Record<string, string>> = {
  as_a_matter_of_law: "as a matter of law",
  court_order: "pursuant to a court order"
};

function branch(
  trackId: string,
  key: string,
  table: Readonly<Record<string, string>>,
  raw: unknown
): string {
  const value = typeof raw === "string" ? raw.trim() : "";
  const resolved = table[value];
  if (!resolved) throw new GeorgiaBranchError(trackId, key, value);
  return resolved;
}

/**
 * Derives the values the templates reference but the participant is never asked
 * for: upper-case caption forms, and the approved allegation sentence for each
 * closed-list branch.
 *
 * Fails closed. A branch value outside its approved list throws rather than
 * rendering an unreviewed sentence or leaving a placeholder on a court filing.
 */
export function deriveGeorgiaFacts(
  trackId: string,
  facts: Record<string, unknown>
): Record<string, unknown> {
  assertGeorgiaTrackImplemented(trackId);

  const upper = (value: unknown) => String(value ?? "").trim().toUpperCase();
  const derived: Record<string, unknown> = {
    ...facts,
    courtNameUpper: upper(facts.courtName),
    courtCountyUpper: upper(facts.courtCounty),
    arrestCountyUpper: upper(facts.arrestCounty ?? facts.courtCounty)
  };

  switch (trackId) {
    case "ga-felony-j1":
      derived.felonyDisposition = branch(
        trackId,
        "felonyDisposition",
        GA_FELONY_DISPOSITIONS,
        facts.felonyDisposition
      );
      break;
    case "ga-vacated-j2":
      derived.vacatedOrReversed = branch(
        trackId,
        "vacatedOrReversed",
        GA_VACATED_BRANCHES,
        facts.vacatedOrReversed
      );
      break;
    case "ga-misd-j4":
      derived.singleIncidentAllegation = branch(
        trackId,
        "misdemeanorScope",
        GA_MISDEMEANOR_SCOPES,
        facts.misdemeanorScope
      );
      derived.lifetimeUseNumber = branch(
        trackId,
        "lifetimeUse",
        GA_LIFETIME_USE,
        facts.lifetimeUse
      );
      break;
    case "ga-seal-m":
      derived.restrictionBasis = branch(
        trackId,
        "restrictionBasis",
        GA_RESTRICTION_BASES,
        facts.restrictionBasis
      );
      break;
    case "ga-fo-discharged-pre2026":
      derived.dischargeBasis = branch(
        trackId,
        "dischargeBasis",
        GA_DISCHARGE_BASES,
        facts.dischargeBasis
      );
      break;
    default:
      break;
  }

  return derived;
}

// ---------------------------------------------------------------------------
// Packet construction
// ---------------------------------------------------------------------------

type ComponentSpec = {
  /** The component id from the adopted legal design. Not derived — pinned. */
  componentId: string;
  role: PacketSet["components"][number]["role"];
  templateId: string;
  order: number;
  conditional?: string;
};

function packetSet(trackId: string, specs: readonly ComponentSpec[]): PacketSet {
  return {
    packetSetId: `${trackId}-set`,
    version: VERSION,
    components: specs.map((spec) => ({
      componentId: spec.componentId,
      role: spec.role,
      outputStrategy: "custom_pleading",
      rendererStrategy: "custom_pleading",
      templateId: spec.templateId,
      // A custom pleading has no official source binary, and inventing one
      // would assert a source identity that does not exist.
      sourcePath: null,
      sourceSha256: null,
      geographicScope: "statewide",
      requirement: spec.conditional ? "conditional" : "required",
      ...(spec.conditional ? { conditionKey: spec.conditional } : {}),
      order: spec.order,
      approval: PENDING_APPROVAL,
      version: VERSION
    }))
  };
}

/** Asked on every route in this family. */
const COMMON_INPUTS: readonly RequiredInput[] = [
  { key: "defendantName", label: "Full legal name", required: true },
  { key: "dateOfBirth", label: "Date of birth", required: true },
  { key: "mailingAddress", label: "Mailing address", required: true },
  { key: "countyOfResidence", label: "County of residence", required: true },
  { key: "courtName", label: "Court that handled the case", required: true },
  { key: "courtCounty", label: "County of that court", required: true },
  { key: "caseNumber", label: "Case number", required: true },
  { key: "offenseDescription", label: "Offence", required: true },
  { key: "offenseCodeSection", label: "O.C.G.A. Code section of the offence", required: true },
  { key: "arrestDate", label: "Date of arrest", required: true },
  { key: "arrestingAgencyName", label: "Arresting law enforcement agency", required: true },
  { key: "prosecutingAuthorityName", label: "Prosecuting attorney", required: true },
  { key: "prosecutingAuthorityAddress", label: "Prosecuting attorney's address", required: true },
  { key: "serviceMethod", label: "How the copy will be delivered", required: true },
  { key: "participantNarrative", label: "Your own statement", required: true },
  // Wanted on every order so GCIC can act on it, but the packet generates
  // without it and the participant adds it from the criminal history.
  { key: "otn", label: "Offender tracking number (OTN), if you know it", required: false },
  { key: "contactPhone", label: "Telephone number", required: false },
  { key: "contactEmail", label: "Email address", required: false }
];

/** Where the certificate of service names the arresting agency as well. */
const AGENCY_SERVICE_INPUT: RequiredInput = {
  key: "arrestingAgencyAddress",
  label: "Arresting agency's address",
  required: true
};

/** Where the statute directs notice to the clerk of court as well. */
const CLERK_SERVICE_INPUTS: readonly RequiredInput[] = [
  { key: "clerkOfCourtName", label: "Clerk of court", required: true },
  { key: "clerkOfCourtAddress", label: "Clerk of court's address", required: true }
];

function georgiaTrack(input: {
  trackId: string;
  publicName: string;
  mechanism: string;
  authority: string;
  recordTypes: readonly string[];
  dispositions: readonly string[];
  courtLevel: string;
  packetSet: PacketSet;
  extraInputs: readonly RequiredInput[];
  assembledPacketName: string;
  assembledPacketTitle: string;
  customerDeliverableDescription: string;
  notes: string;
}): ReliefTrack {
  const statuses = {
    // Counsel approved the legal design with limitations; the produced
    // documents are what remain under review.
    research: "research_draft_complete",
    // Set by this tranche's own generation and review run, not asserted here.
    technical: "renderer_ready",
    visual: "not_reviewed",
    legal: "not_submitted"
  } as const;

  return {
    jurisdiction: "GA",
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
    assembledPacketName: input.assembledPacketName,
    assembledPacketTitle: input.assembledPacketTitle,
    customerDeliverableDescription: input.customerDeliverableDescription,
    notes: input.notes
  };
}

export const GEORGIA_PLEADING_FAMILY_TRACKS: readonly ReliefTrack[] = [
  georgiaTrack({
    trackId: "ga-felony-j1",
    publicName: "Restricting a felony charge where you were convicted only of a separate misdemeanour",
    mechanism: "felony_charge_resolved_without_conviction_restriction",
    authority: "O.C.G.A. § 35-3-37(j)(1)",
    recordTypes: ["felony_charge_resolved_without_conviction"],
    dispositions: ["felony_charge_dismissed", "felony_charge_nolle_prossed", "found_not_guilty_of_the_felony_charge"],
    courtLevel: "accusing_or_convicting_court",
    packetSet: packetSet("ga-felony-j1", [
      { componentId: "ga-felony-j1-primary-filing-1", role: "primary_filing", templateId: "ga-felony-j1-petition", order: 1 },
      { componentId: "ga-felony-j1-proposed-order-2", role: "proposed_order", templateId: "ga-felony-j1-proposed-order", order: 2 },
      { componentId: "ga-felony-j1-certificate-of-service-3", role: "certificate_of_service", templateId: "ga-felony-j1-certificate-of-service", order: 3 },
      { componentId: "ga-felony-j1-attachment-4", role: "attachment", templateId: "ga-felony-j1-exhibit-disposition", order: 4 },
      { componentId: "ga-felony-j1-attachment-5", role: "attachment", templateId: "ga-felony-j1-exhibit-criminal-history", order: 5, conditional: "includeCriminalHistoryExhibit" }
    ]),
    extraInputs: [
      AGENCY_SERVICE_INPUT,
      { key: "felonyChargeDescription", label: "The felony charge you want restricted", required: true },
      { key: "felonyDisposition", label: "How the felony charge was resolved", required: true },
      { key: "felonyDispositionDate", label: "Date the felony charge was resolved", required: true },
      { key: "misdemeanorConvictionDescription", label: "The misdemeanour you were convicted of", required: true }
    ],
    assembledPacketName: "Felony-Charge-Restriction",
    assembledPacketTitle: "Petition to Restrict Access to Criminal History Record Information",
    customerDeliverableDescription:
      "A petition to restrict access to the record of a felony charge that did not end in a conviction, a proposed order, a certificate of service naming both the prosecuting attorney and the arresting agency, and exhibit cover sheets.",
    notes:
      "Filed within four years of arrest. Notice runs to the arresting agency as well as the prosecuting attorney, which is broader than the other § 35-3-37(j) routes. The relief reaches the felony charge only."
  }),

  georgiaTrack({
    trackId: "ga-vacated-j2",
    publicName: "Restricting a conviction that was thrown out and never retried",
    mechanism: "vacated_or_reversed_conviction_restriction",
    authority: "O.C.G.A. § 35-3-37(j)(2)",
    recordTypes: ["vacated_conviction", "reversed_conviction"],
    dispositions: [
      "conviction_vacated_by_the_trial_court",
      "conviction_reversed_by_an_appellate_or_other_post_conviction_court"
    ],
    courtLevel: "convicting_court",
    packetSet: packetSet("ga-vacated-j2", [
      { componentId: "ga-vacated-j2-primary-filing-1", role: "primary_filing", templateId: "ga-vacated-j2-petition", order: 1 },
      { componentId: "ga-vacated-j2-proposed-order-2", role: "proposed_order", templateId: "ga-vacated-j2-proposed-order", order: 2 },
      { componentId: "ga-vacated-j2-certificate-of-service-3", role: "certificate_of_service", templateId: "ga-vacated-j2-certificate-of-service", order: 3 },
      { componentId: "ga-vacated-j2-attachment-4", role: "attachment", templateId: "ga-vacated-j2-exhibit-vacating-order", order: 4 },
      { componentId: "ga-vacated-j2-attachment-5", role: "attachment", templateId: "ga-vacated-j2-exhibit-finality", order: 5 }
    ]),
    extraInputs: [
      { key: "vacatedOrReversed", label: "Was the conviction vacated or reversed?", required: true },
      { key: "vacatingCourtName", label: "Court that vacated or reversed the conviction", required: true },
      { key: "vacatingOrderDate", label: "Date of the vacating or reversing order", required: true },
      { key: "finalityDate", label: "Date the decision became final", required: true }
    ],
    assembledPacketName: "Vacated-Conviction-Restriction",
    assembledPacketTitle: "Petition to Restrict Access to Criminal History Record Information",
    customerDeliverableDescription:
      "A petition to restrict access to the record of a vacated or reversed conviction that was not retried, a proposed order, a certificate of service and exhibit cover sheets.",
    notes:
      "The two years runs from the date the order became final by completion of the appellate process, not from the date it was signed. Both dates are asked for separately."
  }),

  georgiaTrack({
    trackId: "ga-deaddocket-j3",
    publicName: "Restricting a charge that has been on the dead docket for more than a year",
    mechanism: "dead_docketed_charge_restriction",
    authority: "O.C.G.A. § 35-3-37(j)(3)",
    recordTypes: ["charged_offense_on_the_dead_docket"],
    dispositions: ["dead_docketed_and_still_pending"],
    courtLevel: "court_where_the_charge_is_pending",
    packetSet: packetSet("ga-deaddocket-j3", [
      { componentId: "ga-deaddocket-j3-primary-filing-1", role: "primary_filing", templateId: "ga-deaddocket-j3-petition", order: 1 },
      { componentId: "ga-deaddocket-j3-proposed-order-2", role: "proposed_order", templateId: "ga-deaddocket-j3-proposed-order", order: 2 },
      { componentId: "ga-deaddocket-j3-certificate-of-service-3", role: "certificate_of_service", templateId: "ga-deaddocket-j3-certificate-of-service", order: 3 },
      { componentId: "ga-deaddocket-j3-attachment-4", role: "attachment", templateId: "ga-deaddocket-j3-exhibit-dead-docket", order: 4 }
    ]),
    extraInputs: [
      { key: "deadDocketDate", label: "Date the charge was placed on the dead docket", required: true }
    ],
    assembledPacketName: "Dead-Docket-Restriction",
    assembledPacketTitle: "Petition to Restrict Access to Criminal History Record Information",
    customerDeliverableDescription:
      "A petition to restrict access to the record of a charge that has been on the dead docket for more than 12 months, a proposed order, a certificate of service and an exhibit cover sheet.",
    notes:
      "The charge is still pending. The petition says so expressly: a participant who believes a dead docket is a dismissal is wrong, and the packet must not let that belief stand. The court shall not grant it if an active warrant is pending."
  }),

  georgiaTrack({
    trackId: "ga-misd-j4",
    publicName: "Restricting a misdemeanour conviction (Second Chance Act)",
    mechanism: "misdemeanor_conviction_restriction_and_sealing",
    authority: "O.C.G.A. § 35-3-37(j)(4), § 35-3-37(m), § 35-3-37(w)",
    recordTypes: ["misdemeanor_conviction", "series_of_misdemeanors_arising_from_a_single_incident"],
    dispositions: ["conviction_meaning_adjudication_of_guilt"],
    courtLevel: "convicting_court",
    packetSet: packetSet("ga-misd-j4", [
      { componentId: "ga-misd-j4-primary-filing-1", role: "primary_filing", templateId: "ga-misd-j4-motion", order: 1 },
      { componentId: "ga-misd-j4-proposed-order-2", role: "proposed_order", templateId: "ga-misd-j4-proposed-order", order: 2 },
      { componentId: "ga-misd-j4-certificate-of-service-3", role: "certificate_of_service", templateId: "ga-misd-j4-certificate-of-service", order: 3 },
      { componentId: "ga-misd-j4-attachment-4", role: "attachment", templateId: "ga-misd-j4-exhibit-disposition", order: 4 },
      { componentId: "ga-misd-j4-attachment-5", role: "attachment", templateId: "ga-misd-j4-exhibit-criminal-history", order: 5, conditional: "includeCriminalHistoryExhibit" },
      { componentId: "ga-misd-j4-attachment-6", role: "attachment", templateId: "ga-misd-j4-exhibit-sentence-completion", order: 6, conditional: "includeSentenceCompletionExhibit" },
      { componentId: "ga-misd-j4-attachment-7", role: "attachment", templateId: "ga-misd-j4-exhibit-supporting", order: 7, conditional: "includeSupportingExhibits" }
    ]),
    extraInputs: [
      { key: "adjudicationDate", label: "Date the adjudication of guilt was entered", required: true },
      { key: "sentenceCompletionDate", label: "Date every term of the sentence was completed", required: true },
      { key: "misdemeanorScope", label: "One misdemeanour, or a series from a single incident?", required: true },
      { key: "lifetimeUse", label: "Is this your first or second use of this relief?", required: true }
    ],
    assembledPacketName: "Misdemeanor-Restriction-And-Sealing",
    assembledPacketTitle: "Motion to Restrict Access to and Seal Records of a Misdemeanor Conviction",
    customerDeliverableDescription:
      "A motion to restrict access to the record of a misdemeanour conviction and to seal the clerk's records of the case, a proposed order, a certificate of service and exhibit cover sheets.",
    notes:
      "The flagship Second Chance Act route. § 35-3-37(j)(4)(C) caps this relief at two convictions in a lifetime, so which use this is, is pleaded. § 35-3-37(w) makes it available for sentences imposed before, on or after 1 July 2020. Restriction and sealing are sought together."
  }),

  georgiaTrack({
    trackId: "ga-fugitive-j5",
    publicName: "Restricting an arrest made on an out-of-state fugitive warrant",
    mechanism: "fugitive_from_justice_warrant_arrest_restriction",
    authority: "O.C.G.A. § 35-3-37(j)(5), § 17-13-4",
    recordTypes: ["arrest_on_a_fugitive_from_justice_warrant"],
    dispositions: ["arrest_on_a_fugitive_from_justice_warrant_under_17_13_4"],
    courtLevel: "superior_court_of_the_county_of_arrest",
    packetSet: packetSet("ga-fugitive-j5", [
      { componentId: "ga-fugitive-j5-primary-filing-1", role: "primary_filing", templateId: "ga-fugitive-j5-petition", order: 1 },
      { componentId: "ga-fugitive-j5-proposed-order-2", role: "proposed_order", templateId: "ga-fugitive-j5-proposed-order", order: 2 },
      { componentId: "ga-fugitive-j5-certificate-of-service-3", role: "certificate_of_service", templateId: "ga-fugitive-j5-certificate-of-service", order: 3 },
      { componentId: "ga-fugitive-j5-attachment-4", role: "attachment", templateId: "ga-fugitive-j5-exhibit-criminal-history", order: 4 }
    ]),
    extraInputs: [
      AGENCY_SERVICE_INPUT,
      { key: "arrestCounty", label: "County where the arrest occurred", required: true },
      { key: "demandingState", label: "State that demanded your return", required: true }
    ],
    assembledPacketName: "Fugitive-Warrant-Restriction",
    assembledPacketTitle: "Petition to Restrict Access to Criminal History Record Information",
    customerDeliverableDescription:
      "A petition to restrict access to the record of an arrest made on a fugitive from justice warrant, a proposed order, a certificate of service naming both the prosecuting attorney and the arresting agency, and an exhibit cover sheet.",
    notes:
      "The one route in this family that names the superior court of the county of arrest expressly, rather than following the accusing or convicting court. The packet says plainly that Georgia restriction does not reach the demanding state's records or the FBI Identity History Summary."
  }),

  georgiaTrack({
    trackId: "ga-pardon-j7",
    publicName: "Restricting a conviction after a pardon",
    mechanism: "pardoned_conviction_restriction",
    authority: "O.C.G.A. § 35-3-37(j)(7), § 42-9-42",
    recordTypes: ["pardoned_georgia_conviction"],
    dispositions: ["conviction_subsequently_pardoned_by_the_state_board_of_pardons_and_paroles"],
    courtLevel: "convicting_court",
    packetSet: packetSet("ga-pardon-j7", [
      { componentId: "ga-pardon-j7-primary-filing-1", role: "primary_filing", templateId: "ga-pardon-j7-petition", order: 1 },
      { componentId: "ga-pardon-j7-proposed-order-2", role: "proposed_order", templateId: "ga-pardon-j7-proposed-order", order: 2 },
      { componentId: "ga-pardon-j7-certificate-of-service-3", role: "certificate_of_service", templateId: "ga-pardon-j7-certificate-of-service", order: 3 },
      { componentId: "ga-pardon-j7-attachment-4", role: "attachment", templateId: "ga-pardon-j7-exhibit-pardon", order: 4 },
      { componentId: "ga-pardon-j7-attachment-5", role: "attachment", templateId: "ga-pardon-j7-exhibit-disposition", order: 5 },
      { componentId: "ga-pardon-j7-attachment-6", role: "attachment", templateId: "ga-pardon-j7-exhibit-supporting", order: 6, conditional: "includeSupportingExhibits" }
    ]),
    extraInputs: [{ key: "pardonDate", label: "Date the pardon was granted", required: true }],
    assembledPacketName: "Pardoned-Conviction-Restriction",
    assembledPacketTitle: "Petition to Restrict Access to Criminal History Record Information Following a Pardon",
    customerDeliverableDescription:
      "A petition to restrict access to the record of a pardoned conviction, a proposed order, a certificate of service and exhibit cover sheets.",
    notes:
      "Excluded where the offence was a serious violent felony under § 17-10-6.1 or a sexual offence under § 17-10-6.2, which is why the exact Code section of the offence is required rather than the offence label."
  }),

  georgiaTrack({
    trackId: "ga-seal-m",
    publicName: "Sealing the court file",
    mechanism: "clerk_of_court_record_sealing",
    authority: "O.C.G.A. § 35-3-37(m), § 35-3-37(t), § 35-3-37(v)",
    recordTypes: ["clerk_of_court_criminal_history_record_information", "court_index_entry"],
    dispositions: ["any_disposition_already_restricted_under_any_subsection_of_35_3_37"],
    courtLevel: "court_with_original_jurisdiction_in_the_county_of_the_clerk",
    packetSet: packetSet("ga-seal-m", [
      { componentId: "ga-seal-m-primary-filing-1", role: "primary_filing", templateId: "ga-seal-m-petition", order: 1 },
      { componentId: "ga-seal-m-proposed-order-2", role: "proposed_order", templateId: "ga-seal-m-proposed-order", order: 2 },
      { componentId: "ga-seal-m-certificate-of-service-3", role: "certificate_of_service", templateId: "ga-seal-m-certificate-of-service", order: 3 },
      { componentId: "ga-seal-m-attachment-4", role: "attachment", templateId: "ga-seal-m-exhibit-criminal-history", order: 4 },
      { componentId: "ga-seal-m-attachment-5", role: "attachment", templateId: "ga-seal-m-exhibit-disposition", order: 5 },
      { componentId: "ga-seal-m-attachment-6", role: "attachment", templateId: "ga-seal-m-exhibit-supporting", order: 6, conditional: "includeSupportingExhibits" }
    ]),
    extraInputs: [
      ...CLERK_SERVICE_INPUTS,
      { key: "restrictionBasis", label: "How the record came to be restricted", required: true }
    ],
    assembledPacketName: "Court-File-Sealing",
    assembledPacketTitle: "Petition to Seal the Records of the Clerk of Court",
    customerDeliverableDescription:
      "A petition to seal the clerk of court's records of a case whose criminal history record information is already restricted, a proposed order, a certificate of service naming the clerk and the prosecuting attorney, and exhibit cover sheets.",
    notes:
      "Venue is the court with original jurisdiction over the offences in the county where the clerk sits, which is a different formula from the convicting-court routes. Notice by registered mail, certified mail or statutory overnight delivery is sufficient under § 35-3-37(m)(1). The clerk has 60 days after the order."
  }),

  georgiaTrack({
    trackId: "ga-fo-active-pre2026",
    publicName: "Restricting and sealing an active First Offender case",
    mechanism: "first_offender_unrevoked_sentence_restriction_and_sealing",
    authority: "O.C.G.A. § 42-8-62.1, 2026 Ga. Laws Act 403 (HB 162), § 3",
    recordTypes: [
      "first_offender_court_file",
      "clerk_criminal_history_record_information",
      "law_enforcement_jail_and_detention_center_arrest_records"
    ],
    dispositions: [
      "first_offender_treatment_imposed_before_july_1_2026_and_not_revoked_with_adjudication_of_guilt"
    ],
    courtLevel: "sentencing_court",
    packetSet: packetSet("ga-fo-active-pre2026", [
      { componentId: "ga-fo-active-pre2026-primary-filing-1", role: "primary_filing", templateId: "ga-fo-active-pre2026-petition", order: 1 },
      { componentId: "ga-fo-active-pre2026-proposed-order-2", role: "proposed_order", templateId: "ga-fo-active-pre2026-proposed-order", order: 2 },
      { componentId: "ga-fo-active-pre2026-certificate-of-service-3", role: "certificate_of_service", templateId: "ga-fo-active-pre2026-certificate-of-service", order: 3 },
      { componentId: "ga-fo-active-pre2026-attachment-4", role: "attachment", templateId: "ga-fo-active-pre2026-exhibit-disposition", order: 4 }
    ]),
    extraInputs: [
      ...CLERK_SERVICE_INPUTS,
      { key: "firstOffenderSentenceDate", label: "Date of the First Offender sentence", required: true }
    ],
    assembledPacketName: "First-Offender-Active-Restriction",
    assembledPacketTitle: "Petition to Restrict and Seal First Offender Records",
    customerDeliverableDescription:
      "A petition to limit public access to the case information for an unrevoked First Offender sentence imposed before 1 July 2026, a proposed order, a certificate of service naming the clerk and the prosecuting attorney, and an exhibit cover sheet.",
    notes:
      "Act 403 struck the former preponderance finding, so relief on a properly filed petition is mandatory and the petition asks the court to make no balancing finding. Notice is not a request for consent and the packet says so: there is no advance-consent gate and no objection period on this route."
  }),

  georgiaTrack({
    trackId: "ga-fo-discharged-pre2026",
    publicName: "Restricting and sealing a completed First Offender case",
    mechanism: "first_offender_discharge_sealing",
    authority: "O.C.G.A. § 42-8-62.2, 2026 Ga. Laws Act 403 (HB 162), § 4",
    recordTypes: [
      "first_offender_court_file",
      "clerk_criminal_history_record_information",
      "law_enforcement_jail_and_detention_center_arrest_records"
    ],
    dispositions: [
      "first_offender_treatment_imposed_and_the_participant_exonerated_and_discharged_before_july_1_2026"
    ],
    courtLevel: "discharging_court",
    packetSet: packetSet("ga-fo-discharged-pre2026", [
      { componentId: "ga-fo-discharged-pre2026-primary-filing-1", role: "primary_filing", templateId: "ga-fo-discharged-pre2026-petition", order: 1 },
      { componentId: "ga-fo-discharged-pre2026-proposed-order-2", role: "proposed_order", templateId: "ga-fo-discharged-pre2026-proposed-order", order: 2 },
      { componentId: "ga-fo-discharged-pre2026-certificate-of-service-3", role: "certificate_of_service", templateId: "ga-fo-discharged-pre2026-certificate-of-service", order: 3 },
      { componentId: "ga-fo-discharged-pre2026-attachment-4", role: "attachment", templateId: "ga-fo-discharged-pre2026-exhibit-disposition", order: 4 }
    ]),
    extraInputs: [
      ...CLERK_SERVICE_INPUTS,
      { key: "firstOffenderSentenceDate", label: "Date of the First Offender sentence", required: true },
      { key: "dischargeDate", label: "Date you were exonerated and discharged", required: true },
      { key: "dischargeBasis", label: "Discharged as a matter of law, or by court order?", required: true }
    ],
    assembledPacketName: "First-Offender-Discharge-Sealing",
    assembledPacketTitle: "Petition to Seal First Offender Records",
    customerDeliverableDescription:
      "A petition to seal and make unavailable to the public the court and clerk records of a First Offender case discharged before 1 July 2026, a proposed order, a certificate of service naming the clerk and the prosecuting attorney, and an exhibit cover sheet.",
    notes:
      "Section 42-8-62.2 is new law under Act 403. The court shall order sealing within 90 days with no findings required, the clerk seals within 60 days under (e), and the court also orders law enforcement, jails and detention centers to restrict within 30 days under (f)."
  })
];
