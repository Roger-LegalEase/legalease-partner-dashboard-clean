import { WA_AUTOMATIC, WA_GUIDANCE_DIRECTORY, WA_GUIDANCE_ROUTES, WA_MOTION_ROUTE } from "./treatment-reconciliation.mjs";

export const WASHINGTON_GUIDANCE_DIRECTORY = WA_GUIDANCE_DIRECTORY;

const yesNoUnknown = value => [true, false].includes(value) ? value : "unknown";
const inline = value => typeof value === "string" && value.trim()
  ? value.replace(/[\r\n]+/g, " ").replace(/[\\`*_{}\[\]<>]/g, "").trim() : null;

// This prepares guidance for the two existing court-initiated cohorts. It
// neither verifies legal eligibility nor creates a judicial act or a packet.
export function prepareWashingtonCourtInitiatedGuidance(facts = {}) {
  const cohort = facts.cohort;
  if (!["scheduled_administrative_hearing_automatic", "acquittal_or_dismissal_immediate_automatic"].includes(cohort)) {
    return {
      familyId: WA_AUTOMATIC, status: "separate_route_handoff", routeKey: null,
      handoffRouteKey: cohort === "participant_motion_branch" ? WA_MOTION_ROUTE : null,
      message: "Confirm the applicable juvenile-record process with the court or a legal-aid professional. A participant motion is a separate route.",
      documents: [], petitionPrepared: false, sealingConfirmed: false
    };
  }
  const routeKey = WA_GUIDANCE_ROUTES.find(key => key.endsWith(`:${cohort}`));
  const court = inline(facts.courtName);
  const number = inline(facts.caseNumber);
  const courtContact = inline(facts.courtContact);
  const departmentContact = inline(facts.juvenileDepartmentContact);
  const missing = [];
  if (!court) missing.push("The juvenile court holding this case, from the actual case record.");
  if (!number) missing.push("The juvenile case number, from the actual case record.");
  if (!courtContact) missing.push("The court clerk's current contact details, from that court's official directory.");
  let status = "verify_court_status";
  let action;
  const reminders = [];
  if (facts.contested === true || facts.appealPending === true) {
    status = "professional_handoff";
    action = "Take the actual court order and the stated dispute or appeal to a legal-aid professional. This guide does not prepare a motion or an appeal.";
  } else if (cohort === "acquittal_or_dismissal_immediate_automatic") {
    if (!["acquittal_after_fact_finding", "dismissal_with_prejudice"].includes(facts.disposition)
      || (facts.disposition === "dismissal_with_prejudice" && yesNoUnknown(facts.deferredDispositionDismissal) !== false)) {
      status = facts.deferredDispositionDismissal === true ? "professional_handoff" : "confirm_route_facts";
      action = "Obtain the disposition from the juvenile court. Confirm acquittal after fact-finding or dismissal with prejudice and whether a dismissal followed deferred disposition; the deferred-disposition exception has a separate process.";
      missing.push("The actual disposition and any deferred-disposition basis; do not infer these from a missing public docket.");
    } else {
      action = "Ask the juvenile court clerk for the status and a copy of the written sealing order. This court-initiated route requires no participant sealing motion; dismissal remains subject to any State appeal right.";
    }
  } else if (yesNoUnknown(facts.excludedOffense) !== false) {
    status = facts.excludedOffense === true ? "professional_handoff" : "confirm_route_facts";
    action = "Confirm the offense and administrative-hearing cohort from the actual disposition. A most-serious offense, sex offense or specified drug offense is excluded from this administrative route. Ask for a separate supported-route review if an exclusion applies.";
    if (facts.excludedOffense !== true) missing.push("The offense classification relevant to the administrative-hearing exclusions.");
  } else if (facts.onSupervision === true) {
    status = "await_continued_administrative_hearing";
    action = "Ask the juvenile court for the continued administrative sealing hearing date. If supervision continues at review, the court continues the hearing to a date within 30 days after its anticipated end and checks again.";
  } else if (yesNoUnknown(facts.onSupervision) === "unknown") {
    status = "confirm_route_facts";
    action = "Confirm the current supervision status with the juvenile court or juvenile department before assuming the court can seal the record.";
    missing.push("Current supervision status for this case.");
  } else if (facts.remainingIndividualVictimRestitutionPaid === true && facts.individualVictimRestitutionOutstanding === true) {
    status = "confirm_route_facts";
    action = "The payment information conflicts with the outstanding-balance information. Ask the juvenile department to verify the current individual-victim restitution balance using the actual denial, payment records and court ledger before requesting payment-based follow-up.";
    missing.push("Reconcile the conflicting paid and outstanding individual-victim restitution information with the juvenile department.");
  } else if (facts.writtenRestitutionDenial === true && facts.remainingIndividualVictimRestitutionPaid === true) {
    status = "request_administrative_follow_up";
    action = "Contact the juvenile department named in the denial, provide actual payment proof for the remaining individual-victim restitution and request administrative sealing follow-up. The department verifies payment and circulates the order for signature; the clerk seals after receiving the signed order.";
    if (!departmentContact) missing.push("The juvenile department's contact details from the written denial or the court's official directory.");
    if (facts.paymentProofAvailable !== true) missing.push("Actual proof of payment of the remaining individual-victim restitution, before requesting payment-based follow-up.");
  } else if (facts.individualVictimRestitutionOutstanding === true) {
    status = "obtain_restitution_denial_and_balance";
    action = "Obtain the written denial and the remaining amount owed to the original individual victim. The juvenile department must provide notice of the denial within five business days. Once that amount is paid, provide payment proof to the department and request administrative follow-up.";
    reminders.push("This condition concerns restitution owed to the individual victim. Do not substitute an insurance or health-care provider balance.");
  } else if (yesNoUnknown(facts.individualVictimRestitutionOutstanding) === "unknown") {
    status = "confirm_route_facts";
    action = "Ask the juvenile court or department whether individual-victim restitution remains and obtain the recorded balance or order. An unknown balance is not a zero balance.";
    missing.push("The actual individual-victim restitution status for this case.");
  } else {
    action = "Ask the juvenile court for the scheduled administrative review and written sealing-order status. The review follows the latest applicable age-18, probation-end, confinement-release or parole-completion event. Your presence is not required at an administrative sealing hearing.";
  }
  const sections = [
    "# Washington court-initiated juvenile sealing guide",
    "This guide helps you check the court's action under RCW 13.50.260(1)-(2). It does not confirm that your record is sealed.",
    `Court: ${court ?? "Obtain from your case record"}\n\nCase number: ${number ?? "Obtain from your case record"}\n\nCourt contact: ${courtContact ?? "Use your court's official directory"}`,
    ...(departmentContact && ["request_administrative_follow_up", "obtain_restitution_denial_and_balance", "confirm_route_facts"].includes(status)
      ? [`Juvenile department contact: ${departmentContact}`] : []),
    "## Your next step\n\n" + action,
    ...(missing.length ? ["## Information to obtain before taking that step\n\n" + missing.map(item => `- ${item}`).join("\n")] : []),
    ...(reminders.length ? reminders : []),
    "## Keep a record of the response\n\nRecord when you contacted the court or juvenile department, whom you contacted and what they said. Obtain the actual written order and check which case and records it covers. A missing public search result alone does not establish sealing.",
    "This guide starts no participant court filing and quotes no filing fee or fee waiver. Ask the relevant office about any copy or record-request charge. The separate subsection (3) motion and its notice requirements are not supplied by this guide.",
    "For contested eligibility, a disputed restitution amount, an appeal or a denial outside the payment follow-up described here, take the actual records to a legal-aid professional. Do not sign for a court, certify notice or assume a judge has ruled.",
    "[Official law: RCW 13.50.260](https://app.leg.wa.gov/rcw/default.aspx?cite=13.50.260)"
  ];
  return { familyId: WA_AUTOMATIC, routeKey, status, nextAction: action,
    requiredBeforeAction: missing, petitionPrepared: false, sealingConfirmed: false,
    source: "RCW 13.50.260(1)-(2)",
    documents: [{ documentId: "court_initiated_status_guide", mediaType: "text/markdown", text: sections.join("\n\n") + "\n" }] };
}
