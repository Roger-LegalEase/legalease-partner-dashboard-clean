import { describe, expect, it } from "vitest";
import { evaluateExpungementReadiness, type NormalizedRecordItem } from "@/lib/expungement";

type Case = {
  name: string;
  state: string;
  record: NormalizedRecordItem;
};

const supportedPaths: Case[] = [
  {
    name: "IL non-conviction",
    state: "IL",
    record: { recordType: "arrest", dispositionCategory: "dismissed", offenseDate: "2020-01-01" }
  },
  {
    name: "IL completed supervision",
    state: "IL",
    record: {
      recordType: "charge",
      diversionProgram: "supervision",
      supervisionCompleted: true,
      waitingPeriodSatisfied: true,
      offenseDate: "2020-01-01"
    }
  },
  {
    name: "IL conviction sealing",
    state: "IL",
    record: {
      recordType: "conviction",
      dispositionCategory: "conviction",
      offenseLevel: "misdemeanor",
      sentenceCompleted: true,
      waitingPeriodSatisfied: true,
      offenseDate: "2018-01-01"
    }
  },
  {
    name: "PA non-conviction",
    state: "PA",
    record: { recordType: "arrest", dispositionCategory: "acquitted", offenseDate: "2020-01-01" }
  },
  {
    name: "PA ARD completion",
    state: "PA",
    record: { recordType: "charge", diversionProgram: "ard", supervisionCompleted: true, offenseDate: "2020-01-01" }
  },
  {
    name: "PA summary conviction",
    state: "PA",
    record: {
      recordType: "conviction",
      dispositionCategory: "conviction",
      offenseLevel: "summary",
      sentenceCompleted: true,
      waitingPeriodSatisfied: true,
      offenseDate: "2015-01-01"
    }
  },
  {
    name: "PA Clean Slate conviction",
    state: "PA",
    record: {
      recordType: "conviction",
      dispositionCategory: "conviction",
      offenseLevel: "misdemeanor",
      sentenceCompleted: true,
      waitingPeriodSatisfied: true,
      offenseDate: "2012-01-01"
    }
  },
  {
    name: "MD dismissal",
    state: "MD",
    record: { recordType: "charge", dispositionCategory: "dismissed", offenseDate: "2020-01-01" }
  },
  {
    name: "MD nolle prosequi",
    state: "MD",
    record: { recordType: "charge", diversionProgram: "nolle_prosequi", waiverSubmitted: true, offenseDate: "2020-01-01" }
  },
  {
    name: "MD PBJ",
    state: "MD",
    record: {
      recordType: "charge",
      diversionProgram: "pbj",
      supervisionCompleted: true,
      waitingPeriodSatisfied: true,
      offenseDate: "2018-01-01"
    }
  },
  {
    name: "MD eligible conviction",
    state: "MD",
    record: {
      recordType: "conviction",
      dispositionCategory: "conviction",
      offenseLevel: "misdemeanor",
      sentenceCompleted: true,
      waitingPeriodSatisfied: true,
      tags: ["md_section_10_110_eligible"],
      offenseDate: "2016-01-01"
    }
  },
  {
    name: "DC non-conviction",
    state: "DC",
    record: { recordType: "arrest", dispositionCategory: "no_charges", offenseDate: "2020-01-01" }
  },
  {
    name: "DC misdemeanor conviction",
    state: "DC",
    record: {
      recordType: "conviction",
      dispositionCategory: "conviction",
      offenseLevel: "misdemeanor",
      sentenceCompleted: true,
      waitingPeriodSatisfied: true,
      offenseDate: "2010-01-01"
    }
  },
  {
    name: "MS non-conviction",
    state: "MS",
    record: { recordType: "arrest", dispositionCategory: "dropped", offenseDate: "2020-01-01" }
  },
  {
    name: "MS misdemeanor first offender",
    state: "MS",
    record: {
      recordType: "conviction",
      dispositionCategory: "conviction",
      offenseLevel: "misdemeanor",
      firstOffender: true,
      sentenceCompleted: true,
      offenseDate: "2020-01-01"
    }
  },
  {
    name: "MS felony single conviction",
    state: "MS",
    record: {
      recordType: "conviction",
      dispositionCategory: "conviction",
      offenseLevel: "felony",
      sentenceCompleted: true,
      finesAndCostsPaid: true,
      waitingPeriodSatisfied: true,
      offenseDate: "2015-01-01"
    }
  },
  {
    name: "MS non-adjudication",
    state: "MS",
    record: {
      recordType: "charge",
      diversionProgram: "non_adjudication",
      supervisionCompleted: true,
      offenseDate: "2020-01-01"
    }
  }
];

const outOfScopePaths: Case[] = [
  {
    name: "IL DUI",
    state: "IL",
    record: { recordType: "conviction", dispositionCategory: "conviction", tags: ["dui"], offenseDate: "2020-01-01" }
  },
  {
    name: "PA sex registration",
    state: "PA",
    record: {
      recordType: "conviction",
      dispositionCategory: "conviction",
      offenseLevel: "misdemeanor",
      tags: ["sex_registration"],
      offenseDate: "2020-01-01"
    }
  },
  {
    name: "MD unit-rule blocker",
    state: "MD",
    record: { recordType: "charge", dispositionCategory: "dismissed", tags: ["unit_rule_block"], offenseDate: "2020-01-01" }
  },
  {
    name: "DC intrafamily offense",
    state: "DC",
    record: {
      recordType: "conviction",
      dispositionCategory: "conviction",
      offenseLevel: "misdemeanor",
      tags: ["intrafamily"],
      offenseDate: "2020-01-01"
    }
  },
  {
    name: "MS violent felony",
    state: "MS",
    record: {
      recordType: "conviction",
      dispositionCategory: "conviction",
      offenseLevel: "felony",
      tags: ["crime_of_violence"],
      offenseDate: "2020-01-01"
    }
  }
];

describe("state rule tables", () => {
  it.each(supportedPaths)("screens supported path: $name", ({ state, record }) => {
    const result = evaluateExpungementReadiness({
      state,
      normalizedReport: { records: [record] }
    });

    expect(result.status).toBe("possibly_ready");
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.disqualifiers).toEqual([]);
  });

  it.each(outOfScopePaths)("flags out-of-scope path: $name", ({ state, record }) => {
    const result = evaluateExpungementReadiness({
      state,
      normalizedReport: { records: [record] }
    });

    expect(result.status).toBe("out_of_scope");
    expect(result.disqualifiers.length).toBeGreaterThan(0);
  });

  it("returns insufficient information when a supported path is missing required facts", () => {
    const result = evaluateExpungementReadiness({
      state: "PA",
      normalizedReport: {
        records: [
          {
            recordType: "conviction",
            dispositionCategory: "conviction",
            offenseLevel: "summary",
            sentenceCompleted: true
          }
        ]
      }
    });

    expect(result.status).toBe("insufficient_information");
    expect(result.missingInformation).toEqual(
      expect.arrayContaining(["Record 1: five-year Pennsylvania summary-offense waiting period must be satisfied."])
    );
  });

  it("flags unsupported states as out of scope", () => {
    const result = evaluateExpungementReadiness({
      state: "NY",
      normalizedReport: {
        records: [{ recordType: "arrest", dispositionCategory: "dismissed" }]
      }
    });

    expect(result.status).toBe("out_of_scope");
  });
});
