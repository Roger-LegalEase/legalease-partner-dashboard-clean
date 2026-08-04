#!/usr/bin/env node

import { register } from "node:module";

import { verifyGuidanceFamily } from "./lib/verify-rcap-guidance-family.mjs";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const {
  MICHIGAN_GUIDANCE_TRACKS,
  MICHIGAN_GUIDANCE_TEMPLATES,
  MichiganBranchError,
  MichiganRouteMismatchError,
  MichiganRouteUnavailableError,
  assertMichiganTrackImplemented,
  deriveMichiganFacts
} = await import("@/lib/rcap/packets/jurisdictions/michigan/guidance");

const AUTO = {
  sentenceImpositionDate: "1 January 2018",
  convictionsSince: "no",
  pendingCharges: "no",
  excludedCategory: "no",
  restitutionOutstanding: "no",
  checkedRecord: "yes"
};

const fixtures = {
  mi_auto_felony: { ...AUTO, convictionType: "felony" },
  mi_auto_misd93: {
    ...AUTO,
    convictionType: "misdemeanor_93_or_more"
  },
  mi_auto_misd92: {
    ...AUTO,
    convictionType: "misdemeanor_92_or_less"
  },
  mi_arrest_no_charge: {
    wasFingerprinted: "yes",
    releasedWithoutCharge: "yes",
    arrestingAgency: "Fixture police department",
    dataStillAppears: "yes"
  },
  mi_arrest_acquittal_dismissal: {
    dispositionType: "dismissal",
    orderDate: "2 February 2020",
    priorNonTrafficConviction: "no",
    arraignedEnumeratedOffence: "no",
    dataStillAppears: "yes"
  },
  mi_deferral_status: {
    deferralStatute: "section_7411",
    deferralCompleted: "yes",
    arrestRecordExists: "yes",
    seekingSetAsideElsewhere: "no"
  }
};

try {
  const samples = await verifyGuidanceFamily({
    jurisdiction: "MI",
    familyName: "Michigan",
    tracks: MICHIGAN_GUIDANCE_TRACKS,
    templates: MICHIGAN_GUIDANCE_TEMPLATES,
    deriveFacts: deriveMichiganFacts,
    fixtureForTrack(trackId) {
      return fixtures[trackId];
    },
    verifyTypedStops() {
      expectError(
        () => assertMichiganTrackImplemented("mi_setaside_csc4_pre2015"),
        MichiganRouteUnavailableError,
        "unavailable CSC route"
      );
      expectError(
        () =>
          deriveMichiganFacts("mi_auto_felony", {
            ...fixtures.mi_auto_felony,
            convictionType: "misdemeanor_93_or_more"
          }),
        MichiganRouteMismatchError,
        "route mismatch"
      );
      expectError(
        () =>
          deriveMichiganFacts("mi_auto_felony", {
            ...fixtures.mi_auto_felony,
            excludedCategory: "unknown"
          }),
        MichiganBranchError,
        "closed-list branch"
      );
    }
  });
  console.log("Michigan guidance implementation verification passed.");
  for (const sample of samples) {
    console.log(
      `- ${sample.trackId}: ${sample.pageCount} pages ${sample.sha256}`
    );
  }
  console.log("- mi_setaside_csc4_pre2015 remains an unavailable typed counsel stop");
  console.log("- runtime remains disabled; visual and counsel review remain pending");
} catch (error) {
  console.error("Michigan guidance implementation verification failed:");
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
