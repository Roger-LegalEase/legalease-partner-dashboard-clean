#!/usr/bin/env node
/**
 * A complete participant for the Mississippi non-conviction route.
 *
 * `MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal` is
 * one of the routes a Grade-A fulfillment record actually proves, so it is the
 * route a delivery test should exercise: a test that invents authority for a
 * convenient fixture proves nothing about what this product may sell.
 *
 * Exercising it means answering it. The route's collection asks for 47 facts,
 * and the verification hash is taken over all of them, so a fixture that
 * supplies a handful and hand-writes a snapshot is not this route — it is a
 * shape that resembles it. Everything here therefore goes through the same
 * path a participant takes:
 *
 *   screening answers -> authoritative evaluation -> protected draft seed
 *   -> packetInformationPatch({ verify: true }) -> a real verification
 *
 * The hash that comes out is the one the product would have computed, over
 * facts the route really asked for. Nothing is hand-assembled, so nothing can
 * drift from what the collection resolver decides this route needs: add a
 * required fact to the route and this fixture stops verifying until the fact
 * is answered honestly, which is the correct failure.
 *
 * The values are synthetic but internally consistent: one misdemeanor charge,
 * dismissed in Hinds County in 2015, with the exhibits, service details and
 * agency identifiers the Mississippi petition needs. Where the route asks a
 * question the participant would answer "no" to, it says no, rather than
 * saying whatever makes a check pass.
 */

const JURISDICTION = "MS";
const PATHWAY = "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal";

export const MS_NONCONVICTION_ROUTE = {
  jurisdiction: JURISDICTION,
  pathwayId: PATHWAY,
  routeId: `${JURISDICTION}:${PATHWAY}`,
  profileVersion: "2026-06-19-source-conversion-1"
};

/** What the participant said during the free check, and nothing more. */
export const MS_NONCONVICTION_SCREENING_ANSWERS = {
  ownership_scope: "Yes",
  jurisdiction_scope: "State or local",
  case_outcome: "Dismissed, no-billed, nolle prosequi, or not prosecuted",
  offense_level: "Misdemeanor",
  possible_pathway_context: "Non-conviction expungement for dismissal, no disposition, or acquittal",
  resolved_timing_bucket: "gt_10_years",
  court_requirements_completed: "yes"
};

const said = (value) => ({ value, unknown: false });

/**
 * Every fact the route's own collection asks the participant for.
 *
 * Grouped as the builder groups them, so a fact added to a section here is
 * visibly a fact that section asks for.
 */
export const MS_NONCONVICTION_PACKET_ANSWERS = {
  // About you
  participant_full_legal_name: "Acceptance Consumer",
  residency_or_location: said("Jackson, Mississippi"),
  aliases: said("None"),
  date_of_birth: said("1985-04-02"),
  social_security_number: said("000-00-0000"),
  race: said("Declined to state"),
  sex: said("Declined to state"),
  mailing_address: said("100 Acceptance Way, Jackson, MS 39201"),
  phone_number: said("601-555-0134"),
  email_address: said("acceptance.consumer@example.test"),
  contact_information: "100 Acceptance Way, Jackson, MS 39201",

  // Your case
  charge: said("Synthetic misdemeanor charge"),
  pathway_id: said(PATHWAY),
  record_type: "Arrest or charge",
  name_used_at_arrest: said("Acceptance Consumer"),
  charge_legal_citation: said("Miss. Code Ann. 97-17-41"),
  offense_date: said("2014-11-03"),
  actual_arrest: said("Yes"),
  arrest_date: said("2014-11-03"),
  arrest_location: said("Jackson, Hinds County, Mississippi"),
  arresting_agency: said("Jackson Police Department"),
  release_confirmed: said("Yes, released the same day on bond"),
  offense_category: said("Misdemeanor"),
  offense_level: "Misdemeanor",
  case_outcome: "Dismissed, no-billed, nolle prosequi, or not prosecuted",
  age_at_offense: said("29"),

  // Court and case number
  county: said("Hinds County"),
  court: said("Hinds County Circuit Court"),
  case_caption_plaintiff_name: said("State of Mississippi"),
  case_caption_defendant_name: said("Acceptance Consumer"),
  case_number: said("2014-0451-CR"),
  agency_case_number: said("JPD-2014-88213"),

  // Outcome and dates
  disposition_date: said("2015-01-15"),
  statutory_disposition_category: said("Dismissed"),
  disposition_record_wording: said("Nolle prosequi entered on the State's motion"),

  // Sentence or program completion
  nonadjudication_or_diversion: said("No"),
  sentence_completion_date: "Yes",

  // Financial obligations
  financial_obligations: "Yes",

  // Other cases and prior relief
  pending_cases: "No",
  prior_relief: "No",
  trafficking_status: "No",
  open_co_defendant_matter: said("No"),

  // Required documents
  release_date_or_record_source: said("Hinds County Sheriff's Department release record, 2014-11-03"),
  other_recordkeeping_agencies: said("Mississippi Criminal Information Center"),
  certified_disposition_exhibit_status: said("Obtained from the Hinds County Circuit Clerk"),
  docket_sheet_exhibit_status: said("Obtained from the Hinds County Circuit Clerk"),

  // Filing details
  prosecuting_authority_name: said("Hinds County District Attorney"),
  prosecuting_authority_service_address: said("407 E Pascagoula St, Jackson, MS 39205"),
  service_address_confirmation_status: said("Confirmed against the district attorney's published address"),
  mcic_identifier_delivery_method: said("Certified mail to the Mississippi Criminal Information Center"),
  mcic_identifier_method_confirmation_source: said("Mississippi Department of Public Safety filing instructions"),
  personal_impact_confirmed: said("Yes"),
  personal_impact_statement: said("The record has repeatedly cost me housing and employment opportunities.")
};

/**
 * Drive the real product path to a verified matter.
 *
 * Returns the Briefcase item and the protected verification record the
 * delivery gate reads, with the hash and snapshot the product itself computed.
 * `modules` is injected so callers can use whichever loader they already have
 * registered rather than this file assuming one.
 */
export function buildMsNonConvictionVerification({
  evaluateAuthoritativeScreeningResult,
  protectedPacketDraftSeedFromAuthoritative,
  packetInformationPatch,
  matterId,
  /**
   * Facts that differ for this participant.
   *
   * Two people on the same route answer the same questions with different
   * answers, and their verification hashes differ because of it. A caller
   * that needs a second, distinguishable participant changes their facts here
   * rather than perturbing the hash directly, so the difference stays a
   * difference in what was said.
   */
  answerOverrides = {},
  capturedAt = "2026-09-01T00:00:00.000Z"
}) {
  const authoritative = evaluateAuthoritativeScreeningResult({
    jurisdiction: JURISDICTION,
    profileVersion: MS_NONCONVICTION_ROUTE.profileVersion,
    matterId,
    answers: MS_NONCONVICTION_SCREENING_ANSWERS
  });
  if (!authoritative || authoritative.evaluation.pathwayId !== PATHWAY) {
    throw new Error(
      `the MS non-conviction fixture no longer screens onto its own route (got ${authoritative?.evaluation?.pathwayId ?? "nothing"})`
    );
  }

  const seed = protectedPacketDraftSeedFromAuthoritative({
    authoritative,
    screeningAnswers: MS_NONCONVICTION_SCREENING_ANSWERS,
    dependencies: {
      commercialFlowVersion: 1,
      entitlementSource: "consumer_payment",
      productId: "expungement_packet"
    },
    capturedAt
  });
  if (!seed) throw new Error("the MS non-conviction fixture could not seed protected draft authority");

  const item = {
    id: matterId,
    type: "result",
    title: "Matter",
    state: JURISDICTION,
    status: "packet_ready",
    resultCode: authoritative.evaluation.resultCode,
    createdAt: capturedAt,
    summary: "Possible path",
    nextSteps: [],
    paymentAllowed: true,
    packetReady: false,
    pathwayLabel: authoritative.pathwayLabel,
    packetType: authoritative.packetType,
    paymentStatus: "paid",
    packetStatus: "not_started",
    artifactRefs: { commercialFlow: { version: 1, entitlementSource: "consumer_payment" } }
  };

  const answers = { ...MS_NONCONVICTION_PACKET_ANSWERS, ...answerOverrides };
  const verifying = packetInformationPatch({
    existingItem: item,
    answers,
    verify: true,
    protectedVerification: {
      status: "unverified",
      reason: "final_verification_not_completed",
      revision: 0,
      draftHash: seed.hash,
      draftSnapshot: seed.snapshot
    }
  });
  const state = verifying?.patch?.commercialFlow?.verification;
  if (state?.status !== "verified") {
    // The route asked for a fact this fixture does not answer. That is a
    // fixture defect: seed the fact honestly rather than relaxing the route.
    const missing = verifying?.patch?.commercialFlow?.packetInformation?.missingInputIds ?? [];
    throw new Error(
      `the MS non-conviction fixture did not reach a real verification (${state?.status ?? "no state"}: ${state?.reason ?? "no reason"})`
      + (missing.length > 0 ? `; the route still asks for ${missing.length} fact(s): ${missing.join(", ")}` : "")
    );
  }

  return {
    item,
    answers,
    authoritative,
    verification: verifying.protectedTransition.nextVerification,
    hash: verifying.protectedTransition.nextVerification.hash,
    snapshot: verifying.protectedTransition.nextVerification.snapshot
  };
}
