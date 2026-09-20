import assert from "node:assert/strict";

export const INDIANA_SECTION1_PARTICIPANT_SELECTIONS = Object.freeze({
  CHARGES_FILED: "Check Box17",
  NO_CHARGES_DISPOSITION: "Check Box19",
  AT_LEAST_ONE_YEAR: "Check Box25"
});

const isoDate = (value, label) => {
  assert.match(String(value ?? ""), /^\d{4}-\d{2}-\d{2}$/, `${label} must be an ISO calendar date`);
  const parsed = new Date(`${value}T00:00:00Z`);
  assert.equal(Number.isNaN(parsed.valueOf()), false, `${label} must be a valid calendar date`);
  return parsed;
};

function latestHeldRouteDate(facts) {
  const rows = Array.isArray(facts?.["matter.charges"]) && facts["matter.charges"].length > 0
    ? facts["matter.charges"]
    : [facts ?? {}];
  const dates = rows.flatMap((row) => [row?.arrest_date, row?.disposition_date])
    .filter((value) => value !== undefined && value !== null && String(value).trim() !== "")
    .map((value, index) => isoDate(value, `held route date ${index + 1}`));
  assert.ok(dates.length > 0, "the elapsed-time election needs at least one held arrest or disposition date");
  return new Date(Math.max(...dates.map((date) => date.valueOf())));
}

export function settledIndianaSection1ParticipantSelections({ trackId, dispositions, facts }) {
  assert.ok(trackId === "in_arrest_no_charges" || trackId === "in_section1_petition",
    `unsupported Indiana Section 1 track ${JSON.stringify(trackId)}`);
  assert.ok(Array.isArray(dispositions) && dispositions.length > 0,
    `${trackId}: the governed track must declare at least one disposition`);

  const selected = {};
  if (trackId === "in_arrest_no_charges") {
    assert.deepEqual(dispositions, ["arrested_no_charges_filed"],
      "the no-charges election is settled only by the exact governed no-charges disposition");
    selected[INDIANA_SECTION1_PARTICIPANT_SELECTIONS.NO_CHARGES_DISPOSITION] = {
      checked: true,
      basis:
        "The governed route declares the sole disposition arrested_no_charges_filed. The participant FACTS "
        + "branch says all charges were either not filed or dismissed before trial; this route establishes the "
        + "first alternative. The separate prosecutor-declined branch remains unanswered."
    };
  } else {
    assert.equal(facts?.["matter.disposition"], "all_charges_dismissed_before_trial",
      "the general Section 1 fixture must expressly establish its selected disposition branch");
    selected[INDIANA_SECTION1_PARTICIPANT_SELECTIONS.CHARGES_FILED] = {
      checked: true,
      basis: "The synthetic verification fixture expressly records that criminal charges were filed as an adult."
    };
    selected[INDIANA_SECTION1_PARTICIPANT_SELECTIONS.NO_CHARGES_DISPOSITION] = {
      checked: true,
      basis: "The synthetic verification fixture expressly records that every charge was dismissed before trial."
    };
  }

  const filing = isoDate(facts?.["deterministic.filing_date"], "deterministic.filing_date");
  const anchor = latestHeldRouteDate(facts);
  const anniversary = new Date(anchor.valueOf());
  anniversary.setUTCFullYear(anniversary.getUTCFullYear() + 1);
  if (filing.valueOf() >= anniversary.valueOf()) {
    selected[INDIANA_SECTION1_PARTICIPANT_SELECTIONS.AT_LEAST_ONE_YEAR] = {
      checked: true,
      basis:
        `Held filing date ${facts["deterministic.filing_date"]} is at least one calendar year after the latest `
        + `held arrest/disposition date ${anchor.toISOString().slice(0, 10)}. This marks only the participant's `
        + "elapsed-time statement; the court's separate finding remains blank."
    };
  }
  return selected;
}
