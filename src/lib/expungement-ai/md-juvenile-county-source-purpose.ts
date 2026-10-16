import type { EngineProfile } from "@/lib/rcap-engine/contracts";
import { mdFilingInstructions } from "@/lib/rcap/state-packs/maryland/filing-instructions";
import { mdRequiredFields } from "@/lib/rcap/state-packs/maryland/required-fields";

// Original GA14 Q-d7118400a5658cf4acb7. This describes a held fact's source
// purpose; it neither verifies a court nor changes collection or authority.
export const MD_JUVENILE_COUNTY_SOURCE_PURPOSE = {
  "kind": "held_case_location_context",
  "factId": "county",
  "originalQuestionId": "Q-d7118400a5658cf4acb7",
  "sourceRef": "CJP3-8A-27.1;Md.Rule11-506;maryland/filing-instructions:juvenile",
  "purpose": "Case-location context identifying the court where the original juvenile petition or citation was filed, or the court to which the juvenile case was transferred.",
  "currentCourtConsumer": "deferred_under_current_juvenile_source_hold",
  "futureCourtIdentificationRequired": true,
  "doesNotEstablish": [
    "residence",
    "guardianship",
    "eligibility",
    "adult_automatic_effective_date",
    "verified_court_or_filing_destination"
  ]
} as const;
export type MdJuvenileCountySourcePurpose = typeof MD_JUVENILE_COUNTY_SOURCE_PURPOSE;
const expectedPathway = {
  "id": "juvenile-expungement",
  "label": "Juvenile expungement",
  "summary": "Maryland juvenile record expungement is separate from adult expungement. Maryland Courts says a person may be eligible if a CINS petition, juvenile delinquency petition, or juvenile citation was filed concerning them, but specific eligibility grounds apply. There is no filing fee for juvenile expungement petitions. (\"https://www.mdcourts.gov/family/juvrecordexpungement?utm_source=chatgpt.com\") People\u0019s Law Library says the juvenile petition is filed in the court where the juvenile petition or citation was filed, or in the court to which the case was transferred, and identifies the governing law as Courts & Judicial Proceedings 3-8A-27.1 and…",
  "sourceRef": "section:171-180; overview:9-28; section:9-28; section:39-52; section:197-208; section:308-351; summary:308-351; corpus-unit:3",
  "sourceEvidenceRefs": [
    "section:171-180",
    "overview:9-28",
    "section:9-28",
    "section:39-52",
    "section:197-208",
    "section:308-351",
    "summary:308-351",
    "corpus-unit:3",
    "corpus-unit:10",
    "corpus-unit:19",
    "corpus-unit:51",
    "corpus-unit:53",
    "corpus-unit:68",
    "corpus-unit:95"
  ],
  "ruleClauses": [
    "Maryland juvenile record expungement is separate from adult expungement. Maryland Courts says a person may be eligible if a CINS petition, juvenile delinquency petition, or juvenile citation was filed concerning them, but specific eligibility grounds apply. There is no filing fee for juvenile expungement petitions. (\"https://www.mdcourts.gov/family/juvrecordexpungement?utm_source=chatgpt.com\")",
    "People\u0019s Law Library says the juvenile petition is filed in the court where the juvenile petition or citation was filed, or in the court to which the case was transferred, and identifies the governing law as Courts & Judicial Proceedings 3-8A-27.1 and Maryland Rule 11-506. (\"https://www.peoples-law.org/steps-juvenile-record-expungement-process?utm_source=chatgpt.com\")",
    "Common juvenile eligibility checks include:",
    "at least 2 years have passed since the last official action in the juvenile record;",
    "no more than one delinquency adjudication;",
    "no pending delinquency petition or criminal charge;",
    "the adjudication was not for an offense that would be a felony, crime of violence, or sex-offender-registration offense if committed by an adult. (\"https://www.courts.state.md.us/sites/default/files/import/courtforms/circuit/juv11601.pdf?utm_source=chatgpt.com\")",
    "Maryland courts explain expungement as removing information about a case from court and law-enforcement records, and warn people to keep copies because case records may be unavailable after expungement. (",
    "User\u0019s case outcome First Wilma route Maryland treatment",
    "Arrest after Oct. 1, 2007, no charge filed Police-record expungement / automatic route Usually automatically expunged within 60 days of release; older cases may require agency request",
    "Acquittal / not guilty 10-105 expungement Generally 3-year wait unless waiver/release or good cause",
    "Dismissal 10-105 expungement Generally 3-year wait unless waiver/release or good cause",
    "Nolle prosequi 10-105 expungement Generally 3-year wait unless waiver/release; treatment nolle waits until treatment completion",
    "All charges acquittal/dismissal/not guilty/nolle after Oct. 1, 2021 Automatic expungement under 10-105.1 Court-initiated after 3 years if all charges qualify",
    "Probation before judgment, or PBJ 10-105 expungement Usually later of probation discharge or 3 years after PBJ; DUI PBJ has 15-year rule",
    "Stet 10-105 expungement Usually 3 years after stet; treatment stet waits for completion/3-year later date",
    "Eligible guilty conviction 10-110 expungement Waiting period depends on offense: 5, 7, 10, or 15 years after sentence completion",
    "Cannabis possession conviction 10-105 cannabis route / Form 072D May petition after sentence completion",
    "Cannabis possession with intent to distribute 10-110 cannabis route / Form 072D 3 years after sentence completion",
    "Full and unconditional governor pardon 10-105 route Only if one criminal act and not crime of violence; timing constraints apply",
    "Conviction vacated by writ of actual innocence 10-105 route Expungement route after vacatur",
    "Eligible conviction not expungeable but shieldable Maryland Second Chance Act shielding Public shielding only, one lifetime petition",
    "Juvenile record Juvenile expungement Separate juvenile process; no filing fee",
    "\"https://www.mdcourts.gov/legalhelp/expungement?utm_source=chatgpt.com\")",
    "Acquittal, dismissal, PBJ, nolle prosequi, stet, not criminally responsible, juvenile transfer CC-DC-CR-072A - Petition for Expungement of Records",
    "Eligible guilty disposition, non-cannabis CC-DC-CR-072B - Petition for Expungement of Records - Guilty Disposition",
    "Early filing for all acquittal/dismissal/not guilty/nolle, less than 3 years CC-DC-CR-072C",
    "Marijuana/cannabis-related offenses CC-DC-CR-072D"
  ],
  "triggerFields": [
    "case_outcome",
    "offense_level",
    "age_at_offense",
    "record_type",
    "offense_category",
    "sentence_completion_date",
    "prior_relief",
    "pardon_status"
  ],
  "caseOutcomes": [
    "juvenile",
    "arrest_no_charge",
    "dismissed",
    "acquitted",
    "diversion_or_deferred",
    "convicted_felony",
    "convicted_other"
  ],
  "automatic": false,
  "filingRequired": true,
  "routeType": "juvenile",
  "suggestedResultCode": "packet_ready_with_caution",
  "waitingRules": [
    "at least 2 years have passed since the last official action in the juvenile record;",
    "PBJ Expungement route unless excluded; waiting period applies",
    "Stet Expungement route; waiting period applies",
    "Acquittal, nolle prosequi, dismissal 3 years after disposition, unless the person files a General Waiver and Release of tort claims arising from the charge",
    "PBJ Later of discharge from probation or 3 years after PBJ was granted",
    "PBJ for DUI/DWI under Transportation 21-902(a) or (b) 15 years after discharge from probation",
    "Stet / compromise 3 years after stet or compromise",
    "Nuisance/transit-type convictions listed in 10-105(a)(9) 3 years after sentence completion",
    "Not criminally responsible route under 10-105(a)(9) or (10) 3 years after NCR finding",
    "Maryland\u0019s automatic expungement applies to certain all-favorable cases after 3 years. It covers records relating to a qualifying civil cannabis offense or non-must-appear criminal charge when no charge in the case resulted in anything other than acquittal, dismissal, not guilty, or nolle prosequi, except treatment-related nolle prosequi is excluded. (\"https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gcp&section=10-105.1\")",
    "Maryland Courts also states that for cases where all charges have acquittal, not guilty, dismissal, or nolle prosequi entered on or after October 1, 2021, the court will automatically expunge the case after 3 years; a person can request expungement earlier using CC-DC-CR-072C with no fee. (\"https://www.mdcourts.gov/legalhelp/expungement\")",
    "Wilma rule: If the case qualifies for automatic expungement but the person wants faster relief before 3 years, route to CC-DC-CR-072C, not the ordinary 072A packet.",
    "Most listed misdemeanors 5 years after completion of sentence",
    "Second-degree assault / common law battery 7 years after completion of sentence",
    "Most eligible felonies 7 years after completion of sentence",
    "Possession with intent to distribute cannabis 3 years after completion of sentence",
    "First-degree burglary, second-degree burglary, felony theft 10 years after completion of sentence",
    "Domestically related crime 15 years after completion of sentence"
  ],
  "exclusionRules": [
    "Eligibility is offense- and record-specific, and three structural rules in § 10-110(d) do a lot of the work.",
    "The unit rule. If one conviction arising from a single incident/charging document is NOT eligible, then NO conviction from that incident may be expunged. This is the most important Maryland-specific trap.",
    "New conviction during the waiting period. A new conviction (other than a minor traffic offense) during the wait makes the original ineligible — unless the new conviction is itself eligible (the “chain reaction” rule).",
    "Pending criminal proceeding. A person who is a defendant in a pending case is not eligible while it is pending.",
    "Offense categories generally not expungeable",
    "Convictions NOT on the § 10-110 enumerated list (most serious felonies, violent crimes, and offenses requiring sex-offender registration are excluded).",
    "DUI/DWI convictions themselves rarely vanish; only outcomes short of conviction (e.g., a PBJ, with its 15-year rule) may be expunged.",
    "The narrow § 10-105(a-1) carve-out: no expungement under the “no-longer-a-crime” provision for pre-October-2020 sodomy or pre-October-2023 § 3-322 offenses committed in certain aggravating circumstances (against a minor, by force, etc.).",
    "Court debt is NOT a bar (2023). Unpaid court fees/costs do not bar expungement; the court must waive them — but this is separate from restitution.",
    "Shielding limits. Once per lifetime; not for domestically related convictions; barred by an unresolved matter or a new conviction in the 3-year window (unless the new conviction is itself shieldable).",
    "The § 10-110 eligible-offense list is long and enumerated by Criminal Law Article section, the unit",
    "rule can disqualify an entire incident based on one charge, and the 2025 SB 432 restitution rule",
    "charge in the incident to its statute, apply the unit rule across the whole incident, and verify the",
    "current waiting period and SB 432 status before declaring eligibility.",
    "Always run the UNIT RULE first: pull every charge from the same incident and confirm each is eligible",
    "DUI is the classic Maryland disappointment: a DUI conviction generally cannot be expunged; only a PBJ",
    "or other non-conviction outcome can, and the DUI PBJ carries a 15-year wait.",
    "If one conviction arising from a single incident/charging document is NOT eligible, then NO conviction from that incident may be expunged."
  ],
  "frontendBranch": {
    "entryCondition": "Backend matched this jurisdiction-specific route after evaluating the cited source rules.",
    "missingFactsResult": "needs_more_info",
    "unmetTimingResult": "not_yet",
    "exclusionOrAmbiguityResult": "likely_not_eligible",
    "matchedResult": "packet_ready_with_caution",
    "paymentAllowed": true
  },
  "lawrenceRatification": {
    "status": "intentional_unsupported",
    "packet_capable": false,
    "payment_allowed_when_engine_confirms": false,
    "legal_basis": "Lawrence first-pass hold; show substantive guidance only for this release",
    "lawrence_review": "intentional_unsupported",
    "projectedFrom": "route-ratification-registry"
  }
};
const expectedPlan = {
  "pathwayId": "juvenile-expungement",
  "pathwayLabel": "Juvenile expungement",
  "mode": "official_form_overlay_or_source_form_set",
  "formCandidates": [
    {
      "fileName": "ccdccr072d.pdf",
      "relativePath": "LegalEase Maryland/LegalEase Maryland forms /ccdccr072d.pdf",
      "extension": ".pdf",
      "kind": "official_form_or_packet",
      "sha256": "6a5337a5d142c8ae1cc41845bd4c5efb5598e7a64acbda17c9ab70134773f147",
      "sizeBytes": 166429
    },
    {
      "fileName": "ccdccr072c.pdf",
      "relativePath": "LegalEase Maryland/LegalEase Maryland forms /ccdccr072c.pdf",
      "extension": ".pdf",
      "kind": "official_form_or_packet",
      "sha256": "9faa52511adfce4c33a63fbc983f5999d288af2579c63f4425dd39714607c5ac",
      "sizeBytes": 888008
    },
    {
      "fileName": "ccdccr072B.pdf",
      "relativePath": "LegalEase Maryland/LegalEase Maryland forms /ccdccr072B.pdf",
      "extension": ".pdf",
      "kind": "official_form_or_packet",
      "sha256": "3a61136ead74ffc9a09652edf0ad4a113538f3e172c0ddea4df618cb3c0a4469",
      "sizeBytes": 764936
    },
    {
      "fileName": "ccdccr072A.pdf",
      "relativePath": "LegalEase Maryland/LegalEase Maryland forms /ccdccr072A.pdf",
      "extension": ".pdf",
      "kind": "official_form_or_packet",
      "sha256": "8dcb7b177cfb8900edc03158b064a57121170761e6f34e2456f08fdc68f82db2",
      "sizeBytes": 195791
    }
  ],
  "formMappingStatus": "source_candidate_identified",
  "sourceRuleRefs": [
    "section:171-180",
    "overview:9-28",
    "section:9-28",
    "section:39-52",
    "section:197-208",
    "section:308-351",
    "summary:308-351",
    "corpus-unit:3",
    "corpus-unit:10",
    "corpus-unit:19",
    "corpus-unit:51",
    "corpus-unit:53",
    "corpus-unit:68",
    "corpus-unit:95"
  ],
  "selectionRule": "Use only the source documents and assembly rules tied to the backend-returned jurisdiction pathway. Never substitute another state or an old MVP generator.",
  "packetReadyWhen": [
    "backend result is packet_ready or packet_ready_with_caution",
    "every source-defined pathway fact is answered",
    "all waiting and completion conditions are satisfied",
    "no exclusion, ambiguity, or required-review flag remains",
    "the selected form revision and filing location pass source-freshness checks"
  ],
  "noPacketWhen": [
    "automatic or no-filing route",
    "needs_more_info",
    "not_yet",
    "needs_review",
    "likely_not_eligible",
    "hard_stop"
  ]
};
const expectedRules = [
  {
    "id": "rule-14-juvenile-record-juvenile-expungement-separate-juvenile-",
    "priority": 60,
    "stage": "pathway_routing",
    "when": {
      "fieldsReferenced": [
        "age_at_offense",
        "record_type"
      ],
      "caseOutcomes": [
        "juvenile"
      ],
      "sourceConditionText": "Juvenile record Juvenile expungement Separate juvenile process; no filing fee"
    },
    "then": {
      "suggestedResultCode": "guidance_only",
      "frontendAction": "save_state_guidance_no_checkout"
    },
    "sourceRef": "overview:9-28",
    "candidatePathwayIds": [
      "juvenile-expungement"
    ]
  },
  {
    "id": "rule-51-may-make-them-expungement-eligible",
    "priority": 70,
    "stage": "pathway_routing",
    "when": {
      "fieldsReferenced": [],
      "caseOutcomes": [],
      "sourceConditionText": "may make them expungement-eligible."
    },
    "then": {
      "suggestedResultCode": "packet_ready_with_caution",
      "frontendAction": "show_cautions_then_allow_packet_checkout"
    },
    "sourceRef": "case_outcomes:516-562",
    "candidatePathwayIds": [
      "juvenile-expungement"
    ]
  },
  {
    "id": "route-juvenile-expungement",
    "priority": 86,
    "stage": "evaluation",
    "when": {
      "backendPathwayId": "juvenile-expungement",
      "requiredFields": [
        "case_outcome",
        "offense_level",
        "age_at_offense",
        "record_type",
        "offense_category",
        "sentence_completion_date",
        "prior_relief",
        "pardon_status"
      ],
      "fieldsReferenced": [
        "case_outcome",
        "offense_level",
        "age_at_offense",
        "record_type",
        "offense_category",
        "sentence_completion_date",
        "prior_relief",
        "pardon_status"
      ],
      "caseOutcomes": [
        "juvenile",
        "arrest_no_charge",
        "dismissed",
        "acquitted",
        "diversion_or_deferred",
        "convicted_felony",
        "convicted_other"
      ],
      "sourceConditionText": "Juvenile expungement"
    },
    "then": {
      "suggestedResultCode": "packet_ready_with_caution",
      "frontendAction": "render_jurisdiction_pathway_result",
      "paymentAllowed": true
    },
    "sourceRef": "section:171-180; overview:9-28; section:9-28; section:39-52; section:197-208; section:308-351; summary:308-351; corpus-unit:3",
    "candidatePathwayIds": [
      "juvenile-expungement"
    ]
  }
];
const expectedInstruction = "Juvenile expungement is a separate process filed in the court where the juvenile petition or citation was filed (or the court to which the case was transferred), governed by Cts. & Jud. Proc. § 3-8A-27.1 and Md. Rule 11-506, with no filing fee.";
const expectedRequiredInputIds = ["age_at_offense", "case_outcome", "charge", "contact_information", "county", "court", "financial_obligations", "jurisdiction", "offense_category", "offense_level", "pardon_status", "participant_full_legal_name", "pathway_id", "pending_cases", "prior_relief", "record_type", "residency_or_location", "sentence_completion_date"];
const expectedFields = [
  "petitionerName",
  "dateOfBirth",
  "adultOrJuvenile",
  "countyOrCity",
  "courtType",
  "caseNumber",
  "perChargeDisposition",
  "newConvictionDuringWaitCheck",
  "pendingChargesCheck"
];
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

export function mdJuvenileCountySourcePurpose(profile: EngineProfile | undefined,
  pathwayId: string | null, input: { specification: unknown; requiredInputIds: string[];
    decidingFactIds: ReadonlySet<string>; unresolvedFactIds: ReadonlySet<string> },
  source = { instruction: mdFilingInstructions.at(-1), fields: mdRequiredFields.juvenile_expungement }
): MdJuvenileCountySourcePurpose | undefined {
  if (profile?.jurisdiction.code !== "MD" || pathwayId !== "juvenile-expungement"
    || profile.profileVersion !== "2026-06-19-source-conversion-1" || profile.source?.sourceCorpusSha256 !== "a88bc998d56cda93130e6f3db92e2545c7a98f87bd4940975c85b68ec664f64c"
    || input.specification != null || !same(input.requiredInputIds, expectedRequiredInputIds)
    || input.decidingFactIds.has("county") || !input.unresolvedFactIds.has("county")
    || !same(profile.pathways.find(row => row.id === pathwayId), expectedPathway)
    || !same(profile.packetGenerator.pathways.find(row => row.pathwayId === pathwayId), expectedPlan)
    || !same(profile.orderedDecisionRules.filter(row => row.candidatePathwayIds?.length === 1 && row.candidatePathwayIds[0] === pathwayId), expectedRules)
    || !same(source.instruction, expectedInstruction) || !same(source.fields, expectedFields)) return undefined;
  return MD_JUVENILE_COUNTY_SOURCE_PURPOSE;
}
