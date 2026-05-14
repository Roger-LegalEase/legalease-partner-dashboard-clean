import type {
  ExpungementReadinessInput,
  ExpungementReadinessOutput,
  ExpungementReadinessStatus,
  NormalizedRecordItem
} from "@/lib/expungement/types";

const disclaimer =
  "This deterministic readiness screen is not legal advice, does not determine eligibility, and should be reviewed by a qualified attorney.";

const documents = [
  "Certified court docket or case summary",
  "Final disposition document",
  "Charging document or complaint",
  "Proof of sentence completion, if any sentence was imposed"
];

type SupportedStateRuleCode = "IL" | "PA" | "MD" | "DC" | "MS";

type StateRuleTable = {
  state: SupportedStateRuleCode;
  ruleVersion: string;
  supportedPaths: RulePath[];
  outOfScopeTags: Record<string, string>;
  pendingReason: string;
};

type RulePath = {
  code: string;
  description: string;
  status: ExpungementReadinessStatus;
  match(record: NormalizedRecordItem): boolean;
  missing(record: NormalizedRecordItem): string[];
};

export const supportedStateRuleCodes: string[] = ["IL", "PA", "MD", "DC", "MS"];

export function evaluateStateTableExpungementReadiness(
  input: ExpungementReadinessInput
): ExpungementReadinessOutput {
  const state = (input.state ?? "").toUpperCase() as SupportedStateRuleCode;
  const table = stateRuleTables[state];
  const records = input.normalizedReport.records;
  const reasons: string[] = [];
  const missingInformation: string[] = [];
  const disqualifiers: string[] = [];
  let hasPossiblePath = false;
  let hasNotReadyPath = false;

  if (!table) {
    return outOfScope(input.state ?? "unknown", "State rule table is not supported.");
  }

  if (records.length === 0) {
    return {
      state,
      status: "insufficient_information",
      reasons: [`${table.ruleVersion}: no record items were provided for deterministic review.`],
      missingInformation: ["At least one normalized record item is required."],
      disqualifiers,
      recommendedDocuments: documents,
      disclaimer
    };
  }

  records.forEach((record, index) => {
    const label = labelRecord(record, index);
    const outOfScope = collectOutOfScope(record, table, label);

    if (outOfScope.length > 0) {
      disqualifiers.push(...outOfScope);
      return;
    }

    for (const path of table.supportedPaths) {
      if (!path.match(record)) {
        continue;
      }

      const missing = path.missing(record).map((message) => `${label}: ${message}`);

      if (missing.length > 0) {
        missingInformation.push(...missing);
        hasNotReadyPath = true;
      } else {
        reasons.push(`${label}: ${path.description}`);
        hasPossiblePath = path.status === "possibly_ready" || hasPossiblePath;
        hasNotReadyPath = path.status === "likely_not_ready" || hasNotReadyPath;
      }
      return;
    }

    missingInformation.push(`${label}: no supported ${state} rule-table path matched the normalized record facts.`);
  });

  return {
    state,
    status: selectStatus({ disqualifiers, missingInformation, hasPossiblePath, hasNotReadyPath }),
    reasons,
    missingInformation,
    disqualifiers,
    recommendedDocuments: documents,
    disclaimer
  };
}

function outOfScope(state: string, reason: string): ExpungementReadinessOutput {
  return {
    state: state.toUpperCase(),
    status: "out_of_scope",
    reasons: [reason],
    missingInformation: [],
    disqualifiers: [reason],
    recommendedDocuments: documents,
    disclaimer
  };
}

function selectStatus(input: {
  disqualifiers: string[];
  missingInformation: string[];
  hasPossiblePath: boolean;
  hasNotReadyPath: boolean;
}): ExpungementReadinessStatus {
  if (input.disqualifiers.length > 0) {
    return "out_of_scope";
  }

  if (input.missingInformation.length > 0) {
    return "insufficient_information";
  }

  if (input.hasNotReadyPath) {
    return "likely_not_ready";
  }

  return input.hasPossiblePath ? "possibly_ready" : "needs_attorney_review";
}

function collectOutOfScope(record: NormalizedRecordItem, table: StateRuleTable, label: string): string[] {
  const reasons: string[] = [];
  const tags = new Set(record.tags ?? []);

  if (record.pendingCase || record.dispositionCategory === "pending") {
    reasons.push(`${label}: ${table.pendingReason}`);
  }

  for (const [tag, reason] of Object.entries(table.outOfScopeTags)) {
    if (tags.has(tag)) {
      reasons.push(`${label}: ${reason}`);
    }
  }

  return reasons;
}

function labelRecord(record: NormalizedRecordItem, index: number): string {
  return record.charge ? `Record ${index + 1} (${record.charge})` : `Record ${index + 1}`;
}

function isNonConviction(record: NormalizedRecordItem): boolean {
  return (
    record.recordType === "arrest" ||
    record.dispositionCategory === "dismissed" ||
    record.dispositionCategory === "acquitted" ||
    record.dispositionCategory === "not_guilty" ||
    record.dispositionCategory === "dropped" ||
    record.dispositionCategory === "no_charges"
  );
}

function hasProgram(program: NonNullable<NormalizedRecordItem["diversionProgram"]>) {
  return (record: NormalizedRecordItem) => record.diversionProgram === program;
}

function isConviction(record: NormalizedRecordItem): boolean {
  return record.recordType === "conviction" || record.dispositionCategory === "conviction";
}

function isMisdemeanorConviction(record: NormalizedRecordItem): boolean {
  return isConviction(record) && record.offenseLevel === "misdemeanor";
}

function isFelonyConviction(record: NormalizedRecordItem): boolean {
  return isConviction(record) && record.offenseLevel === "felony";
}

function missingDisposition(record: NormalizedRecordItem): string[] {
  return record.dispositionCategory || record.disposition || record.diversionProgram
    ? []
    : ["disposition information is required."];
}

function missingSentenceComplete(record: NormalizedRecordItem): string[] {
  return record.sentenceCompleted ? [] : ["sentence completion must be confirmed."];
}

function missingWaitingPeriod(record: NormalizedRecordItem, message: string): string[] {
  return record.waitingPeriodSatisfied ? [] : [message];
}

function missingFirstOffender(record: NormalizedRecordItem): string[] {
  return record.firstOffender ? [] : ["first-offender status must be confirmed."];
}

function missingFinesPaid(record: NormalizedRecordItem): string[] {
  return record.finesAndCostsPaid ? [] : ["payment of fines and court costs must be confirmed."];
}

function missingProgramComplete(record: NormalizedRecordItem): string[] {
  return record.supervisionCompleted || record.sentenceCompleted
    ? []
    : ["program or supervision completion must be confirmed."];
}

const stateRuleTables: Record<SupportedStateRuleCode, StateRuleTable> = {
  IL: {
    state: "IL",
    ruleVersion: "IL_attorney_reviewed_2026_05",
    pendingReason: "pending cases or pending dispositions are outside the automated Illinois screen.",
    outOfScopeTags: {
      minor_traffic: "minor traffic offenses are outside the Illinois expungement/sealing automation.",
      dui: "DUI outcomes require attorney review and are outside the automated Illinois path.",
      sex_offense_against_minor: "sex offense against a minor is excluded from the automated Illinois path.",
      sex_registration: "sex-offender registration cases are outside the automated Illinois path.",
      domestic_battery: "domestic battery is excluded from the automated Illinois sealing path.",
      order_of_protection: "order-of-protection offenses are outside the automated Illinois path.",
      stalking: "stalking offenses are outside the automated Illinois path.",
      animal_cruelty: "animal-cruelty offenses are outside the automated Illinois path.",
      dog_fighting: "dog-fighting offenses are outside the automated Illinois path."
    },
    supportedPaths: [
      {
        code: "il_non_conviction",
        description: "Illinois non-conviction record may be ready to expunge or seal.",
        status: "possibly_ready",
        match: isNonConviction,
        missing: missingDisposition
      },
      {
        code: "il_supervision_completed",
        description: "Illinois completed supervision path may be ready after the applicable waiting period.",
        status: "possibly_ready",
        match: hasProgram("supervision"),
        missing: (record) => [
          ...missingProgramComplete(record),
          ...missingWaitingPeriod(record, "applicable Illinois supervision waiting period must be satisfied.")
        ]
      },
      {
        code: "il_conviction_sealing",
        description: "Illinois conviction sealing path may be ready after sentence completion and the waiting period.",
        status: "possibly_ready",
        match: isConviction,
        missing: (record) => [
          ...missingSentenceComplete(record),
          ...missingWaitingPeriod(record, "Illinois conviction sealing waiting period must be satisfied.")
        ]
      }
    ]
  },
  PA: {
    state: "PA",
    ruleVersion: "PA_attorney_reviewed_2026_05",
    pendingReason: "pending charges are outside the automated Pennsylvania screen.",
    outOfScopeTags: {
      violent: "violent offenses are outside the automated Pennsylvania Clean Slate path.",
      sex_registration: "Megan's Law registration cases are outside the automated Pennsylvania path.",
      dui: "DUI convictions require attorney review and are outside the automated Pennsylvania path.",
      firearms: "firearms offenses are outside the automated Pennsylvania Clean Slate path.",
      animal_cruelty: "animal-cruelty offenses are outside the automated Pennsylvania path.",
      corruption_minors_sexual: "sexual corruption-of-minors offenses are outside the automated Pennsylvania path."
    },
    supportedPaths: [
      {
        code: "pa_non_conviction",
        description: "Pennsylvania non-conviction record may be ready for expungement.",
        status: "possibly_ready",
        match: isNonConviction,
        missing: missingDisposition
      },
      {
        code: "pa_ard_completed",
        description: "Pennsylvania ARD completion may be ready for expungement.",
        status: "possibly_ready",
        match: hasProgram("ard"),
        missing: missingProgramComplete
      },
      {
        code: "pa_summary_conviction",
        description: "Pennsylvania summary conviction path may be ready after sentence completion and the five-year arrest-free period.",
        status: "possibly_ready",
        match: (record) => isConviction(record) && record.offenseLevel === "summary",
        missing: (record) => [
          ...missingSentenceComplete(record),
          ...missingWaitingPeriod(record, "five-year Pennsylvania summary-offense waiting period must be satisfied.")
        ]
      },
      {
        code: "pa_clean_slate",
        description: "Pennsylvania Clean Slate path may be ready for a non-excluded misdemeanor or felony after the applicable waiting period.",
        status: "possibly_ready",
        match: (record) => isMisdemeanorConviction(record) || isFelonyConviction(record),
        missing: (record) => [
          ...missingSentenceComplete(record),
          ...missingWaitingPeriod(record, "Pennsylvania Clean Slate waiting period must be satisfied.")
        ]
      }
    ]
  },
  MD: {
    state: "MD",
    ruleVersion: "MD_attorney_reviewed_2026_05",
    pendingReason: "pending Maryland cases are outside the automated screen.",
    outOfScopeTags: {
      dui_conviction: "DUI/DWI convictions are outside the automated Maryland expungement path.",
      sex_registration: "sex-offender registration cases are outside the automated Maryland path.",
      unit_rule_block: "Maryland unit-rule blockers require attorney review.",
      immigration_risk: "immigration-sensitive cases require attorney review before filing."
    },
    supportedPaths: [
      {
        code: "md_non_conviction",
        description: "Maryland acquittal, dismissal, or not-guilty path may be ready for expungement.",
        status: "possibly_ready",
        match: (record) =>
          record.dispositionCategory === "dismissed" ||
          record.dispositionCategory === "acquitted" ||
          record.dispositionCategory === "not_guilty",
        missing: missingDisposition
      },
      {
        code: "md_nolle_stet",
        description: "Maryland nolle prosequi or stet path may be ready after the waiting period or waiver.",
        status: "possibly_ready",
        match: (record) => record.diversionProgram === "nolle_prosequi" || record.diversionProgram === "stet",
        missing: (record) =>
          record.waitingPeriodSatisfied || record.waiverSubmitted
            ? []
            : ["Maryland nolle prosequi/stet waiting period or waiver must be confirmed."]
      },
      {
        code: "md_pbj",
        description: "Maryland PBJ path may be ready after the applicable waiting period.",
        status: "possibly_ready",
        match: hasProgram("pbj"),
        missing: (record) => [
          ...missingProgramComplete(record),
          ...missingWaitingPeriod(record, "Maryland PBJ waiting period must be satisfied.")
        ]
      },
      {
        code: "md_eligible_conviction",
        description: "Maryland attorney-reviewed eligible conviction path may be ready after sentence completion and the waiting period.",
        status: "possibly_ready",
        match: (record) => isConviction(record) && Boolean(record.tags?.includes("md_section_10_110_eligible")),
        missing: (record) => [
          ...missingSentenceComplete(record),
          ...missingWaitingPeriod(record, "Maryland conviction waiting period must be satisfied.")
        ]
      }
    ]
  },
  DC: {
    state: "DC",
    ruleVersion: "DC_attorney_reviewed_2026_05",
    pendingReason: "pending District of Columbia matters are outside the automated screen.",
    outOfScopeTags: {
      intrafamily: "intrafamily offenses are excluded from the automated D.C. sealing path.",
      parental_kidnapping: "parental kidnapping is excluded from the automated D.C. sealing path.",
      vulnerable_adult_abuse: "abuse of a vulnerable adult or elderly person is outside the automated D.C. path.",
      sex_registration: "sex-offender registration cases are outside the automated D.C. path.",
      felony_conviction: "D.C. felony conviction sealing requires attorney review in this product path."
    },
    supportedPaths: [
      {
        code: "dc_non_conviction",
        description: "D.C. non-conviction record may be ready for sealing.",
        status: "possibly_ready",
        match: isNonConviction,
        missing: missingDisposition
      },
      {
        code: "dc_misdemeanor_conviction",
        description: "D.C. misdemeanor conviction path may be ready after sentence completion and the 10-year waiting period.",
        status: "possibly_ready",
        match: isMisdemeanorConviction,
        missing: (record) => [
          ...missingSentenceComplete(record),
          ...missingWaitingPeriod(record, "D.C. misdemeanor conviction waiting period must be satisfied.")
        ]
      }
    ]
  },
  MS: {
    state: "MS",
    ruleVersion: "MS_attorney_reviewed_2026_05",
    pendingReason: "pending Mississippi cases are outside the automated expunction screen.",
    outOfScopeTags: {
      traffic: "traffic convictions are outside the Mississippi misdemeanor expunction path.",
      crime_of_violence: "crimes of violence are excluded from the automated Mississippi felony path.",
      arson_first: "first-degree arson is excluded from the automated Mississippi felony path.",
      drug_trafficking: "drug trafficking is excluded from the automated Mississippi felony path.",
      dui_3_plus: "third or subsequent DUI is excluded from the automated Mississippi felony path.",
      felon_firearm: "felon-in-possession offenses are excluded from the automated Mississippi felony path.",
      sex_registration: "failure to register or sex-registration matters are outside the automated Mississippi path.",
      vulnerable_person_abuse: "abuse, neglect, or exploitation of a vulnerable person is outside the automated Mississippi path.",
      embezzlement: "embezzlement is outside the automated Mississippi felony path.",
      public_official_duty: "public-official convictions related to official duties are outside the Mississippi expunction path."
    },
    supportedPaths: [
      {
        code: "ms_non_conviction",
        description: "Mississippi dismissed, dropped, no-disposition, or not-guilty path may be ready for expunction.",
        status: "possibly_ready",
        match: isNonConviction,
        missing: missingDisposition
      },
      {
        code: "ms_misdemeanor_first_offender",
        description: "Mississippi first-offender misdemeanor conviction path may be ready for expunction.",
        status: "possibly_ready",
        match: isMisdemeanorConviction,
        missing: (record) => [...missingFirstOffender(record), ...missingSentenceComplete(record)]
      },
      {
        code: "ms_felony_single_conviction",
        description: "Mississippi eligible felony conviction path may be ready after sentence completion, payment, and the five-year waiting period.",
        status: "possibly_ready",
        match: isFelonyConviction,
        missing: (record) => [
          ...missingSentenceComplete(record),
          ...missingFinesPaid(record),
          ...missingWaitingPeriod(record, "Mississippi felony expunction waiting period must be satisfied.")
        ]
      },
      {
        code: "ms_non_adjudication",
        description: "Mississippi non-adjudication or pretrial intervention completion may be ready for expunction.",
        status: "possibly_ready",
        match: (record) =>
          record.diversionProgram === "non_adjudication" || record.diversionProgram === "pretrial_intervention",
        missing: missingProgramComplete
      }
    ]
  }
};
