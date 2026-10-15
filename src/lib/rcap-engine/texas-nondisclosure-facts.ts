import type { EngineProfile } from "@/lib/rcap-engine/contracts";

// Exact retained TX §411.072 informational guidance. Generic court balances do
// not gate information; actual discharge/placement and $28/Rule145 issuance
// conditions are separate. This does not authorize a petition or checkout.
export const TX_GUIDANCE_FINANCIAL_ROUTES = ["automatic-nondisclosure-for-qualifying-nonviolent-misdemeanor-deferred-adjudication-411-07"] as const;
const EXPECTED = {
  "automatic-nondisclosure-for-qualifying-nonviolent-misdemeanor-deferred-adjudication-411-07": {
    "id": "automatic-nondisclosure-for-qualifying-nonviolent-misdemeanor-deferred-adjudication-411-07",
    "sourceRef": "section:486-504; pathways:77-124; section:77-124; section:125-175; section:54-76; section:224-270; section:468-475; section:337-362",
    "ruleClauses": [
      "For many nonviolent misdemeanor deferred adjudications",
      "completed since Sept. 2017, the court issues a nondisclosure",
      "order AUTOMATICALLY -- the person need not petition. Confirm",
      "Each petition is accompanied by a proposed Order. The Order of Expunction lists every named agency and",
      "directs each to destroy or return all records of the arrest under Chapter 55A. The Order of Nondisclosure directs",
      "the Department of Public Safety to seal the record and to notify the agencies enumerated in Government Code \u00a7",
      "This reference is an internal training and retrieval aid for the Wilma assistant covering Texas statewide; a separate document",
      "expunction into Chapter 55A effective January 1, 2025; the agent must verify the current Chapter 55A article numbers, the",
      "Government Code Ch. 411 nondisclosure subtypes and exclusion lists, the specific county's filing and notice procedures, and DPS",
      "request processes before relying on any rule here.",
      "Texas (Statewide) Expunction & Nondisclosure \u2014 Agent Training Reference",
      "Available for many situations expunction cannot reach, principally completed deferred adjudication and some",
      "Main subtypes:",
      "\u00a7 411.072 \u2014 automatic nondisclosure: since September 2017, courts must automatically issue a",
      "Two tools, considered by disposition.",
      "Expunction (Chapter 55A) \u2014 erases the record, non-convictions",
      "Available, generally, where the case did NOT end in a conviction or completed deferred adjudication (with",
      "limited exceptions). Eligible categories:",
      "Acquittal (found not guilty) \u2014 Ch. 55A provides a streamlined procedure; on request and after notice to the State, the court may enter an expunction order as early as the 30th day after acquittal.",
      "Pardon \u2014 a full pardon by the Governor of Texas or the President, including a pardon based on actual innocence (and certain other pardons).",
      "Dismissal \u2014 the charge was dismissed and the person was never placed on court-ordered community supervision for that offense (limited exceptions for certain Class C deferred dispositions).",
      "No charges filed \u2014 the person was arrested but the prosecutor never brought a case, and the applicable waiting period (Section 2) has passed.",
      "Mistaken identity \u2014 the person was arrested, or their identifiers ended up in an arrest record, due to a clerical error or identity theft.",
      "Statute of limitations expired with no charge, or a void/quashed charging instrument.",
      "Specialty-court dismissal (e.g., veterans treatment court) \u2014 a streamlined ~30-day expunction order with the State's consent.",
      "Order of nondisclosure (Gov't Code Ch. 411) \u2014 seals from public, broader reach",
      "\u00a7 411.072 \u2014 automatic nondisclosure: since September 2017, courts must automatically issue a nondisclosure order for certain nonviolent misdemeanors when the person completes deferred adjudication \u2014 often no petition is needed.",
      "\u00a7 411.0725 \u2014 deferred adjudication (petition): after successful completion and discharge/dismissal, seals the record; waiting periods vary by offense (Section 2)."
    ],
    "automatic": true,
    "filingRequired": false,
    "routeType": "automatic",
    "waitingRules": [
      "Acquittal (found not guilty) \u2014 Ch. 55A provides a streamlined procedure; on request and after notice to the State, the court may enter an expunction order as early as the 30th day after acquittal.",
      "No charges filed \u2014 the person was arrested but the prosecutor never brought a case, and the applicable waiting period (Section 2) has passed.",
      "Expunction waiting periods for arrest-only (no charge filed) cases run by offense level. Nondisclosure waits run",
      "Offense level of arrest Waiting period before expunction",
      "Class C misdemeanor 180 days from arrest",
      "Class A or B misdemeanor 1 year from arrest",
      "These arrest-only waits do not apply where a disposition makes the person immediately entitled (acquittal,",
      "411.0725 deferred \u2014 misd. under 5 years Discharge / dismissal",
      "411.0725 deferred \u2014 felony 5 years Discharge / dismissal",
      "411.0735 conviction 5 years Completion of sentence /",
      "411.072 / DWI first offense 2 years (interlock full term) Completion",
      "2-year wait if an ignition interlock device was used for the full required term, but 5 years otherwise. For",
      "deferred adjudication, most ordinary misdemeanors have NO waiting period once discharged, while the",
      "(felony). For dispositions that confer immediate entitlement, there is no level-based wait.",
      "Expunction \u2014 arrest with no charge filed (by offense level) Offense level of arrest Waiting period before expunction Class C misdemeanor 180 days from arrest Class A or B misdemeanor 1 year from arrest Felony 3 years from arrest These arrest-only waits do not apply where a disposition makes the person immediately entitled (acquittal, qualifying dismissal, prosecutor certification that records are not needed, or limitations expired) \u2014 those can be sought without the level-based wait, and acquittals follow the streamlined ~30-day procedure.",
      "Nondisclosure \u2014 by subtype Subtype Waiting period Runs from 411.072 automatic (nonviolent None (court issues Discharge / dismissal misdemeanor deferred) automatically) 411.0725 deferred \u2014 most None Discharge / dismissal misdemeanors 411.0725 deferred \u2014 misd. under 5 years Discharge / dismissal Penal Code chs.",
      "20,21,22,25,42,43,46,71 411.0725 deferred \u2014 felony 5 years Discharge / dismissal 411.0735 conviction 5 years Completion of sentence / (eligible misdemeanors) release 411.072 / DWI first offense 2 years (interlock full term) Completion or 5 years otherwise The DWI distinction is the most consequential: a first-offense DWI nondisclosure typically requires only a 2-year wait if an ignition interlock device was used for the full required term, but 5 years otherwise.",
      "For deferred adjudication, most ordinary misdemeanors have NO waiting period once discharged, while the enumerated chapters (assaultive, sexual, family, weapons, organized crime, etc.) carry a 5-year wait."
    ],
    "legalAuthority": null,
    "lawrenceRatification": null
  }
} as const;
export function texasGuidanceFinancialContract(profile: EngineProfile, pathwayId: string | null | undefined): boolean {
  if (profile.jurisdiction.code !== "TX" || !pathwayId || !Object.hasOwn(EXPECTED, pathwayId)
    || profile.profileVersion !== "2026-06-19-source-conversion-1"
    || profile.source?.sourceCorpusSha256 !== "6ebeb77ec65477dff0d2be6d150dba45b51f5a1984841ac520759c1e262d6928") return false;
  const question = profile.questions.find(q => q.id === "financial_obligations");
  if (question?.type !== "yes_no_unsure" || question.required !== true
    || question.prompt !== "Have you paid off everything the court charged?"
    || question.helperText !== "fines, court costs, restitution") return false;
  const route = profile.pathways.find(p => p.id === pathwayId);
  return Boolean(route && Object.entries(EXPECTED[pathwayId as keyof typeof EXPECTED]).every(([key, value]) =>
    JSON.stringify((route as unknown as Record<string, unknown>)[key] ?? null) === JSON.stringify(value)));
}
export function texasGuidanceFinancialApplies(profile: EngineProfile, pathwayId: string | null | undefined,
  _answers: Readonly<Record<string, unknown>>, id: string): boolean {
  return id !== "financial_obligations" || !texasGuidanceFinancialContract(profile, pathwayId);
}
