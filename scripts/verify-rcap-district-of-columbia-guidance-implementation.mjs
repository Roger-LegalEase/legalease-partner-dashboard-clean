#!/usr/bin/env node

import { register } from "node:module";

import { verifyGuidanceFamily } from "./lib/verify-rcap-guidance-family.mjs";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const {
  DISTRICT_OF_COLUMBIA_GUIDANCE_TRACKS,
  DISTRICT_OF_COLUMBIA_GUIDANCE_TEMPLATES,
  DistrictOfColumbiaGuidanceBranchError,
  DistrictOfColumbiaGuidanceStopError,
  DistrictOfColumbiaRouteMismatchError,
  deriveDistrictOfColumbiaGuidanceFacts
} = await import(
  "@/lib/rcap/packets/jurisdictions/district-of-columbia/guidance"
);

const SHARED = {
  recordJurisdiction: "district_of_columbia",
  collateralConsequencesInPlay: "no",
  caseNumber: "2024 CMD 000001",
  recordStillVisible: "yes"
};
const fixtures = {
  dc_auto_expungement: {
    ...SHARED,
    offenceDecriminalized: "yes",
    marijuanaPossessionPre2015: "no"
  },
  dc_auto_sealing: {
    ...SHARED,
    caseOutcome: "non_conviction",
    offenceOnExclusionList: "not_on_the_list"
  }
};

try {
  const samples = await verifyGuidanceFamily({
    jurisdiction: "DC",
    familyName: "District of Columbia",
    tracks: DISTRICT_OF_COLUMBIA_GUIDANCE_TRACKS,
    templates: DISTRICT_OF_COLUMBIA_GUIDANCE_TEMPLATES,
    deriveFacts: deriveDistrictOfColumbiaGuidanceFacts,
    fixtureForTrack(trackId) {
      return fixtures[trackId];
    },
    verifyTypedStops() {
      expectError(
        () =>
          deriveDistrictOfColumbiaGuidanceFacts("dc_auto_expungement", {
            ...fixtures.dc_auto_expungement,
            recordJurisdiction: "federal_military_tribal_or_other_state"
          }),
        DistrictOfColumbiaGuidanceStopError,
        "non-District record stop"
      );
      expectError(
        () =>
          deriveDistrictOfColumbiaGuidanceFacts("dc_auto_sealing", {
            ...fixtures.dc_auto_sealing,
            offenceOnExclusionList: "on_the_list"
          }),
        DistrictOfColumbiaRouteMismatchError,
        "motion-route mismatch"
      );
      expectError(
        () =>
          deriveDistrictOfColumbiaGuidanceFacts("dc_auto_sealing", {
            ...fixtures.dc_auto_sealing,
            offenceOnExclusionList: "unknown"
          }),
        DistrictOfColumbiaGuidanceBranchError,
        "closed-list branch"
      );
    }
  });
  console.log("District of Columbia guidance implementation verification passed.");
  for (const sample of samples) {
    console.log(
      `- ${sample.trackId}: ${sample.pageCount} pages ${sample.sha256}`
    );
  }
  console.log("- hard stops and route mismatches remain typed and fail closed");
  console.log("- runtime remains disabled; visual and counsel review remain pending");
} catch (error) {
  console.error(
    "District of Columbia guidance implementation verification failed:"
  );
  console.error(error.message);
  process.exit(1);
}

function expectError(action, ErrorType, label) {
  let caught = null;
  try {
    action();
  } catch (error) {
    caught = error;
  }
  if (!(caught instanceof ErrorType)) {
    throw new Error(`${label} did not fail with ${ErrorType.name}.`);
  }
}
