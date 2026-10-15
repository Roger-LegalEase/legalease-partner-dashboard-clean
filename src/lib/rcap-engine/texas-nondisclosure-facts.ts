import type { EngineProfile, PublicQuestion } from "@/lib/rcap-engine/contracts";

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

export const TX_ND_ROUTES = ["automatic-nondisclosure-for-qualifying-nonviolent-misdemeanor-deferred-adjudication-411-07", "petitioned-nondisclosure-after-completed-deferred-adjudication-411-0725", "petitioned-nondisclosure-for-an-eligible-conviction-411-0735", "first-offense-dwi-nondisclosure"] as const;
const TIMING_SOURCE = {
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
  },
  "petitioned-nondisclosure-after-completed-deferred-adjudication-411-0725": {
    "id": "petitioned-nondisclosure-after-completed-deferred-adjudication-411-0725",
    "sourceRef": "section:54-76; section:77-124; section:224-270; section:125-175; section:468-475; section:271-301; corpus-unit:21; corpus-unit:30",
    "ruleClauses": [
      "Statutory shorthand used throughout",
      "CCP Ch. 55A EXPUNCTION of criminal records (record destruction) \u2014 replaced Ch. 55 on 1/1/2025",
      "55A.251 FILING: ex parte petition in a district court for the county of arrest or prosecution",
      "55A acquittal / specialty Streamlined orders (e.g., 30-day) on acquittal or specialty-court dismissal",
      "Gov't Code 411.072 NONDISCLOSURE \u2014 automatic for certain nonviolent misdemeanor deferred adjudications",
      "411.0725 NONDISCLOSURE \u2014 successfully completed DEFERRED ADJUDICATION (petition)",
      "411.0735 NONDISCLOSURE \u2014 certain CONVICTIONS after community supervision / release",
      "411.075(b) Agencies DPS must notify of a nondisclosure order",
      "HB 4504 88th Leg.; recodified expunction into Ch. 55A, eff. Jan 1, 2025",
      "Texas (Statewide) Expunction & Nondisclosure \u2014 Agent Training Reference",
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
      "Available for many situations expunction cannot reach, principally completed deferred adjudication and some",
      "Main subtypes:",
      "\u00a7 411.072 \u2014 automatic nondisclosure: since September 2017, courts must automatically issue a nondisclosure order for certain nonviolent misdemeanors when the person completes deferred adjudication \u2014 often no petition is needed.",
      "\u00a7 411.0725 \u2014 deferred adjudication (petition): after successful completion and discharge/dismissal, seals the record; waiting periods vary by offense (Section 2).",
      "\u00a7 411.0735 \u2014 certain convictions: seals some misdemeanor convictions after completion of the sentence and a waiting period.",
      "\u00a7 411.0731 / DWI: first-offense DWI nondisclosure, with a shorter wait if an ignition interlock was used for the required term."
    ],
    "automatic": false,
    "filingRequired": true,
    "routeType": "court_filing",
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
    "lawrenceRatification": {
      "status": "hard_gate_pending",
      "packet_capable": false,
      "payment_allowed_when_engine_confirms": false,
      "legal_basis": "Lawrence named substantive gate required before selling",
      "lawrence_review": "hard_gate_pending",
      "projectedFrom": "route-ratification-registry"
    }
  },
  "petitioned-nondisclosure-for-an-eligible-conviction-411-0735": {
    "id": "petitioned-nondisclosure-for-an-eligible-conviction-411-0735",
    "sourceRef": "section:77-124; section:125-175; section:176-223; section:224-270; section:54-76; section:271-301; case_outcomes:224-270; corpus-unit:50",
    "ruleClauses": [
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
      "Available for many situations expunction cannot reach, principally completed deferred adjudication and some",
      "Main subtypes:",
      "\u00a7 411.072 \u2014 automatic nondisclosure: since September 2017, courts must automatically issue a nondisclosure order for certain nonviolent misdemeanors when the person completes deferred adjudication \u2014 often no petition is needed.",
      "\u00a7 411.0725 \u2014 deferred adjudication (petition): after successful completion and discharge/dismissal, seals the record; waiting periods vary by offense (Section 2).",
      "\u00a7 411.0735 \u2014 certain convictions: seals some misdemeanor convictions after completion of the sentence and a waiting period.",
      "\u00a7 411.0731 / DWI: first-offense DWI nondisclosure, with a shorter wait if an ignition interlock was used for the required term.",
      "Texas (Statewide) Expunction & Nondisclosure \u2014 Agent Training Reference",
      "Route by disposition first. Acquittal, no-charge arrest, qualifying dismissal, limitations expired, mistaken",
      "identity, or pardon \u2192 expunction (erased). Completed deferred adjudication or an eligible conviction \u2192",
      "nondisclosure (sealed, not erased).",
      "For nonviolent misdemeanor deferred adjudications completed after Sept 2017, check whether automatic",
      "nondisclosure under \u00a7 411.072 already applies before preparing a petition.",
      "Expunction waiting periods for arrest-only (no charge filed) cases run by offense level. Nondisclosure waits run",
      "from discharge/completion and vary by subtype and offense.",
      "Expunction \u2014 arrest with no charge filed (by offense level)",
      "Offense level of arrest Waiting period before expunction"
    ],
    "automatic": false,
    "filingRequired": true,
    "routeType": "court_filing",
    "waitingRules": [
      "Acquittal (found not guilty) \u2014 Ch. 55A provides a streamlined procedure; on request and after notice to the State, the court may enter an expunction order as early as the 30th day after acquittal.",
      "No charges filed \u2014 the person was arrested but the prosecutor never brought a case, and the applicable waiting period (Section 2) has passed.",
      "Expunction waiting periods for arrest-only (no charge filed) cases run by offense level. Nondisclosure waits run",
      "Offense level of arrest Waiting period before expunction",
      "Class C misdemeanor 180 days from arrest",
      "Class A or B misdemeanor 1 year from arrest",
      "These arrest-only waits do not apply where a disposition makes the person immediately entitled (acquittal,",
      "Subtype Waiting period Runs from",
      "411.0725 deferred \u2014 misd. under 5 years Discharge / dismissal",
      "411.0725 deferred \u2014 felony 5 years Discharge / dismissal",
      "411.0735 conviction 5 years Completion of sentence /",
      "411.072 / DWI first offense 2 years (interlock full term) Completion",
      "2-year wait if an ignition interlock device was used for the full required term, but 5 years otherwise. For",
      "deferred adjudication, most ordinary misdemeanors have NO waiting period once discharged, while the",
      "For arrest-only expunctions, compute from the arrest date by level: 180 days (C), 1 year (A/B), 3 years",
      "(felony). For dispositions that confer immediate entitlement, there is no level-based wait.",
      "Expunction \u2014 arrest with no charge filed (by offense level) Offense level of arrest Waiting period before expunction Class C misdemeanor 180 days from arrest Class A or B misdemeanor 1 year from arrest Felony 3 years from arrest These arrest-only waits do not apply where a disposition makes the person immediately entitled (acquittal, qualifying dismissal, prosecutor certification that records are not needed, or limitations expired) \u2014 those can be sought without the level-based wait, and acquittals follow the streamlined ~30-day procedure.",
      "Nondisclosure \u2014 by subtype Subtype Waiting period Runs from 411.072 automatic (nonviolent None (court issues Discharge / dismissal misdemeanor deferred) automatically) 411.0725 deferred \u2014 most None Discharge / dismissal misdemeanors 411.0725 deferred \u2014 misd. under 5 years Discharge / dismissal Penal Code chs."
    ],
    "legalAuthority": null,
    "lawrenceRatification": {
      "status": "hard_gate_pending",
      "packet_capable": false,
      "payment_allowed_when_engine_confirms": false,
      "legal_basis": "Lawrence named substantive gate required before selling",
      "lawrence_review": "hard_gate_pending",
      "projectedFrom": "route-ratification-registry"
    }
  },
  "first-offense-dwi-nondisclosure": {
    "id": "first-offense-dwi-nondisclosure",
    "sourceRef": "section:77-124; section:125-175; section:224-270; pathways:77-124; case_outcomes:224-270; waiting_periods:125-175; corpus-unit:30; corpus-unit:45",
    "ruleClauses": [
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
      "Available for many situations expunction cannot reach, principally completed deferred adjudication and some",
      "Main subtypes:",
      "\u00a7 411.072 \u2014 automatic nondisclosure: since September 2017, courts must automatically issue a nondisclosure order for certain nonviolent misdemeanors when the person completes deferred adjudication \u2014 often no petition is needed.",
      "\u00a7 411.0725 \u2014 deferred adjudication (petition): after successful completion and discharge/dismissal, seals the record; waiting periods vary by offense (Section 2).",
      "\u00a7 411.0735 \u2014 certain convictions: seals some misdemeanor convictions after completion of the sentence and a waiting period.",
      "\u00a7 411.0731 / DWI: first-offense DWI nondisclosure, with a shorter wait if an ignition interlock was used for the required term.",
      "Texas (Statewide) Expunction & Nondisclosure \u2014 Agent Training Reference",
      "Route by disposition first. Acquittal, no-charge arrest, qualifying dismissal, limitations expired, mistaken",
      "identity, or pardon \u2192 expunction (erased). Completed deferred adjudication or an eligible conviction \u2192",
      "nondisclosure (sealed, not erased).",
      "For nonviolent misdemeanor deferred adjudications completed after Sept 2017, check whether automatic",
      "nondisclosure under \u00a7 411.072 already applies before preparing a petition.",
      "Expunction waiting periods for arrest-only (no charge filed) cases run by offense level. Nondisclosure waits run",
      "from discharge/completion and vary by subtype and offense.",
      "Expunction \u2014 arrest with no charge filed (by offense level)",
      "Offense level of arrest Waiting period before expunction"
    ],
    "automatic": false,
    "filingRequired": true,
    "routeType": "court_filing",
    "waitingRules": [
      "Acquittal (found not guilty) \u2014 Ch. 55A provides a streamlined procedure; on request and after notice to the State, the court may enter an expunction order as early as the 30th day after acquittal.",
      "No charges filed \u2014 the person was arrested but the prosecutor never brought a case, and the applicable waiting period (Section 2) has passed.",
      "Expunction waiting periods for arrest-only (no charge filed) cases run by offense level. Nondisclosure waits run",
      "Offense level of arrest Waiting period before expunction",
      "Class C misdemeanor 180 days from arrest",
      "Class A or B misdemeanor 1 year from arrest",
      "These arrest-only waits do not apply where a disposition makes the person immediately entitled (acquittal,",
      "Subtype Waiting period Runs from",
      "411.0725 deferred \u2014 misd. under 5 years Discharge / dismissal",
      "411.0725 deferred \u2014 felony 5 years Discharge / dismissal",
      "411.0735 conviction 5 years Completion of sentence /",
      "411.072 / DWI first offense 2 years (interlock full term) Completion",
      "2-year wait if an ignition interlock device was used for the full required term, but 5 years otherwise. For",
      "deferred adjudication, most ordinary misdemeanors have NO waiting period once discharged, while the",
      "For arrest-only expunctions, compute from the arrest date by level: 180 days (C), 1 year (A/B), 3 years",
      "(felony). For dispositions that confer immediate entitlement, there is no level-based wait.",
      "Expunction \u2014 arrest with no charge filed (by offense level) Offense level of arrest Waiting period before expunction Class C misdemeanor 180 days from arrest Class A or B misdemeanor 1 year from arrest Felony 3 years from arrest These arrest-only waits do not apply where a disposition makes the person immediately entitled (acquittal, qualifying dismissal, prosecutor certification that records are not needed, or limitations expired) \u2014 those can be sought without the level-based wait, and acquittals follow the streamlined ~30-day procedure.",
      "Nondisclosure \u2014 by subtype Subtype Waiting period Runs from 411.072 automatic (nonviolent None (court issues Discharge / dismissal misdemeanor deferred) automatically) 411.0725 deferred \u2014 most None Discharge / dismissal misdemeanors 411.0725 deferred \u2014 misd. under 5 years Discharge / dismissal Penal Code chs."
    ],
    "legalAuthority": null,
    "lawrenceRatification": null
  }
} as const;

/** Current approved memo facts, preserving six distinct existing family tracks.
 * Passing a clock is not a legal qualification or fulfillment decision. */
export function texasNondisclosureTimingContract(profile: EngineProfile, pathway: string | null | undefined): boolean {
  if (profile.jurisdiction.code !== "TX" || !pathway || !Object.hasOwn(TIMING_SOURCE, pathway)
    || profile.profileVersion !== "2026-06-19-source-conversion-1"
    || profile.source?.sourceCorpusSha256 !== "6ebeb77ec65477dff0d2be6d150dba45b51f5a1984841ac520759c1e262d6928") return false;
  const actual = profile.pathways.find(p => p.id === pathway);
  return Boolean(actual && Object.entries(TIMING_SOURCE[pathway as keyof typeof TIMING_SOURCE]).every(([key,value]) =>
    JSON.stringify((actual as unknown as Record<string, unknown>)[key] ?? null) === JSON.stringify(value)));
}
const question = (id: string, prompt: string, es: string, type = "date_or_unknown", options: string[] | null = null): PublicQuestion & { options: string[] | null } => ({
  id, prompt, type, options, stage: "timing_and_completion", required: false,
  contextOnly: false, doesNotSelectPathway: true, lifecyclePhase: "prepay_timing_gate",
  translations: { es: { prompt: es } }
});
export const TX_ND_QUESTIONS: Array<PublicQuestion & { options: string[] | null }> = [
  question("tx_nd_supervision_type", "What does the final court record show: deferred adjudication, a conviction with completed probation, no probation, or revoked probation?", "¿Qué indica el expediente judicial final: adjudicación diferida, condena con libertad condicional cumplida, sin libertad condicional o con libertad condicional revocada?", "single_choice", ["deferred_adjudication", "conviction_probation", "conviction_no_probation", "conviction_revoked_probation", "not_sure"]),
  question("tx_nd_placement_date", "On what date were you placed on deferred adjudication? This is not your arrest or discharge date.", "¿En qué fecha comenzó la adjudicación diferida? No es la fecha del arresto ni la del descargo."),
  question("tx_nd_discharge_dismissal_date", "On what date did the court discharge you from deferred adjudication and dismiss the case?", "¿En qué fecha le concedió el tribunal el descargo de la adjudicación diferida y desestimó el caso?"),
  question("tx_nd_supervision_completion_date", "On what date did you complete every condition of probation after your conviction?", "¿En qué fecha cumplió todas las condiciones de la libertad condicional después de la condena?"),
  question("tx_nd_sentence_completion_date", "On what date did you complete every sentence requirement, including applicable confinement, fines, court costs and restitution? A filing-fee waiver does not answer this question.", "¿En qué fecha cumplió todos los requisitos de la sentencia, incluidos el encarcelamiento, las multas, las costas judiciales y la restitución que correspondan? Una exención de la tasa de presentación no responde esta pregunta."),
  question("tx_nd_completion_confirmed", "Does the court record confirm completion of every applicable sentence or supervision requirement, including confinement, fines, costs and restitution?", "¿Confirma el expediente judicial el cumplimiento de todos los requisitos aplicables de la sentencia o de la libertad condicional, incluidos el encarcelamiento, las multas, las costas y la restitución?", "yes_no_unsure"),
  question("tx_nd_interlock_six_months", "Did you comply with a court-ordered ignition-interlock condition for at least six months? Check the judgment and supervision conditions.", "¿Cumplió durante al menos seis meses una condición judicial de usar un dispositivo de bloqueo de encendido? Consulte la sentencia y las condiciones de supervisión.", "yes_no_unsure"),
  question("tx_nd_deferred_offense_class", "Which category does the statute for this deferred-adjudication offense fall into?", "¿En qué categoría legal se encuentra este delito con adjudicación diferida?", "single_choice", ["misdemeanor_other_chapter", "misdemeanor_chapter_20_21_22_25_42_43_46", "felony", "not_sure"]),
  question("tx_nd_fine_only", "Was this misdemeanor punishable by a fine only, with no possible jail sentence?", "¿Este delito menor se castigaba únicamente con una multa, sin posibilidad de encarcelamiento?", "yes_no_unsure")
];
const displays: Record<string, [string,string]> = {
  deferred_adjudication: ["Deferred adjudication", "Adjudicación diferida"],
  conviction_probation: ["Conviction with completed probation", "Condena con libertad condicional cumplida"],
  conviction_revoked_probation: ["Conviction with revoked probation", "Condena con libertad condicional revocada"],
  conviction_no_probation: ["Conviction without probation", "Condena sin libertad condicional"],
  misdemeanor_other_chapter: ["Misdemeanor outside Penal Code Chapters 20, 21, 22, 25, 42, 43 and 46", "Delito menor fuera de los capítulos 20, 21, 22, 25, 42, 43 y 46 del Código Penal"],
  misdemeanor_chapter_20_21_22_25_42_43_46: ["Misdemeanor under one of those Penal Code chapters", "Delito menor incluido en uno de esos capítulos del Código Penal"],
  felony: ["Felony", "Delito grave"], not_sure: ["I am not sure", "No estoy seguro"]
};
for (const q of TX_ND_QUESTIONS) if (q.options) q.optionDisplay = Object.fromEntries(q.options.map(value => [value, { label: displays[value][0], translations: { es: { label: displays[value][1] } } }]));
export const TX_ND_FACT_IDS = TX_ND_QUESTIONS.map(q => q.id);
export function texasNondisclosureFactIds(profile: EngineProfile, pathway: string | null | undefined, answers: Readonly<Record<string, unknown>>, includeInactive = false): string[] {
  if (!texasNondisclosureTimingContract(profile, pathway)) return [];
  if (includeInactive && pathway !== TX_ND_ROUTES[0]) return pathway === TX_ND_ROUTES[1] ? ["tx_nd_supervision_type","tx_nd_discharge_dismissal_date","tx_nd_deferred_offense_class"] : pathway === TX_ND_ROUTES[2] ? ["tx_nd_supervision_type","tx_nd_completion_confirmed","tx_nd_sentence_completion_date","tx_nd_fine_only"] : ["tx_nd_supervision_type","tx_nd_discharge_dismissal_date","tx_nd_completion_confirmed","tx_nd_supervision_completion_date","tx_nd_sentence_completion_date","tx_nd_interlock_six_months"];
  if (pathway === TX_ND_ROUTES[0]) return ["tx_nd_placement_date", "tx_nd_discharge_dismissal_date"];
  const subtype = answers.tx_nd_supervision_type;
  const ids = ["tx_nd_supervision_type"];
  if (pathway === TX_ND_ROUTES[1]) return subtype === "deferred_adjudication" ? [...ids,"tx_nd_discharge_dismissal_date","tx_nd_deferred_offense_class"] : ids;
  if (pathway === TX_ND_ROUTES[2]) return subtype === "conviction_no_probation" ? [...ids,"tx_nd_completion_confirmed","tx_nd_sentence_completion_date","tx_nd_fine_only"] : ids;
  if (subtype === "deferred_adjudication") return [...ids,"tx_nd_discharge_dismissal_date"];
  if (subtype === "conviction_probation") return [...ids,"tx_nd_completion_confirmed","tx_nd_supervision_completion_date","tx_nd_interlock_six_months"];
  if (subtype === "conviction_no_probation" || subtype === "conviction_revoked_probation") return [...ids,"tx_nd_completion_confirmed","tx_nd_sentence_completion_date","tx_nd_interlock_six_months"];
  return ids;
}
function exactDate(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value+"T00:00:00.000Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value ? date : null;
}
function yn(value: unknown): boolean | undefined { return value === "Yes" || value === "yes" ? true : value === "No" || value === "no" ? false : undefined; }
export type TexasNondisclosureClock = { status: "missing" | "review" | "not_yet" | "elapsed"; ids: string[]; section: string; earliest?: string; code: string };
export function texasNondisclosureClock(profile: EngineProfile, pathway: string | null | undefined, answers: Readonly<Record<string, unknown>>, today: string): TexasNondisclosureClock | null {
  if (!texasNondisclosureTimingContract(profile,pathway)) return null;
  const now=exactDate(today), active=texasNondisclosureFactIds(profile,pathway,answers);
  const section=pathway === TX_ND_ROUTES[0] ? "411.072" : pathway === TX_ND_ROUTES[1] ? "411.0725" : pathway === TX_ND_ROUTES[2] ? "411.0735" : answers.tx_nd_supervision_type === "deferred_adjudication" ? "411.0726" : answers.tx_nd_supervision_type === "conviction_probation" ? "411.0731" : "411.0736";
  const response=(status: TexasNondisclosureClock["status"],code: string,ids: string[] = []): TexasNondisclosureClock => ({status,code,ids,section});
  if (!now) return response("review","invalid_evaluation_date");
  const missing=active.filter(id=> {const q=TX_ND_QUESTIONS.find(q=>q.id===id)!;return q.type === "date_or_unknown" ? !exactDate(answers[id]) : q.type === "yes_no_unsure" ? yn(answers[id]) === undefined : !q.options?.includes(String(answers[id])) || answers[id] === "not_sure";});
  if (missing.length) return response("missing","exact_facts_missing",missing);
  if (pathway === TX_ND_ROUTES[1] && answers.tx_nd_supervision_type !== "deferred_adjudication"
    || pathway === TX_ND_ROUTES[2] && answers.tx_nd_supervision_type !== "conviction_no_probation") return response("review","subtype_conflict",["tx_nd_supervision_type"]);
  const subtype=answers.tx_nd_supervision_type, outcome=answers.case_outcome, level=answers.offense_level;
  if (subtype === "deferred_adjudication" && ["Misdemeanor conviction","Felony conviction"].includes(String(outcome)))
    return response("review","subtype_record_conflict",["tx_nd_supervision_type","case_outcome"]);
  if (pathway === TX_ND_ROUTES[1] && (level === "Felony" && String(answers.tx_nd_deferred_offense_class).startsWith("misdemeanor_")
    || level === "Misdemeanor" && answers.tx_nd_deferred_offense_class === "felony")
    || pathway === TX_ND_ROUTES[2] && level === "Felony") return response("review","offense_class_conflict",["offense_level",...(pathway===TX_ND_ROUTES[1]?["tx_nd_deferred_offense_class"]:[])]);
  let anchor: Date, years=0;
  if (pathway === TX_ND_ROUTES[0]) {
    const placement=exactDate(answers.tx_nd_placement_date)!, discharge=exactDate(answers.tx_nd_discharge_dismissal_date)!;
    if(discharge < placement) return response("review","event_order_conflict",active);
    if(discharge < exactDate("2017-09-01")!) return response("review","discharge_before_applicability",["tx_nd_discharge_dismissal_date"]);
    anchor=new Date(placement.getTime());anchor.setUTCDate(anchor.getUTCDate()+180);if(discharge>anchor)anchor=discharge;
  } else {
    if(active.includes("tx_nd_completion_confirmed") && yn(answers.tx_nd_completion_confirmed) === false) return response("not_yet","completion_not_confirmed",["tx_nd_completion_confirmed"]);
    const dateId=active.find(id=>id.endsWith("_date"))!;anchor=exactDate(answers[dateId])!;
    if(pathway===TX_ND_ROUTES[1]) years=answers.tx_nd_deferred_offense_class === "felony" ? 5 : answers.tx_nd_deferred_offense_class === "misdemeanor_chapter_20_21_22_25_42_43_46" ? 2 : 0;
    else if(pathway===TX_ND_ROUTES[2]) years=yn(answers.tx_nd_fine_only) ? 0 : 2;
    else years=answers.tx_nd_supervision_type === "deferred_adjudication" ? 2 : answers.tx_nd_supervision_type === "conviction_probation" ? yn(answers.tx_nd_interlock_six_months) ? 2 : 5 : yn(answers.tx_nd_interlock_six_months) ? 3 : 5;
  }
  const earliest=new Date(anchor.getTime());earliest.setUTCFullYear(earliest.getUTCFullYear()+years);
  return {...response(earliest>now ? "not_yet" : "elapsed",earliest>now ? "waiting_period_not_satisfied" : "timing_only_elapsed"),earliest:earliest.toISOString().slice(0,10)};
}

export const TX_ND_TIMING_COPY = {
  dwi_source_review: ["The timing calculation is complete. The saved answers do not yet establish the other DWI nondisclosure conditions, including the qualifying offense, prior record and whether a collision involved another person. Review the court record before a packet decision.", "El cálculo del plazo está completo. Las respuestas guardadas aún no acreditan las demás condiciones de no divulgación por conducir en estado de ebriedad, incluidos el delito que reúne los requisitos, los antecedentes y si una colisión involucró a otra persona. Revise el expediente judicial antes de decidir sobre un paquete."],
  missing: ["Confirm the court-record event and the applicable nondisclosure category so we can check the timing. An arrest date or a general statement that the case ended does not establish these facts.", "Confirme el acto que consta en el expediente judicial y la categoría de no divulgación aplicable para que podamos comprobar el plazo. La fecha del arresto o una afirmación general de que el caso terminó no acredita estos datos."],
  review: ["The saved facts do not establish this nondisclosure timing branch. Review the actual court record; another procedure may apply.", "Los datos guardados no acreditan esta modalidad del plazo de no divulgación. Revise el expediente judicial real; puede corresponder otro procedimiento."],
  not_yet: ["The source-specific completion or waiting condition is not yet satisfied. This is separate from paying or waiving a filing fee.", "Aún no se cumple la condición específica de cumplimiento o espera. Esto es distinto de pagar una tasa de presentación u obtener su exención."],
  elapsed: ["The supplied dates satisfy this timing calculation only. Other statutory conditions and the court's decision remain; this does not establish eligibility, an issued order or packet availability.", "Las fechas proporcionadas satisfacen únicamente este cálculo del plazo. Aún deben cumplirse las demás condiciones legales y obtenerse la decisión judicial; esto no acredita la elegibilidad, una orden emitida ni la disponibilidad de un paquete."]
} as const;
