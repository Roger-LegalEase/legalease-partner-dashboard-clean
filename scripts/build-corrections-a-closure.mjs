import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROFILE_DIRECTORY = path.join(ROOT, "src/lib/rcap-engine/compiled/profiles");
const OUTPUT_PATH = path.join(ROOT, "data/expungement-ai/corrections-a/closure.json");
const AUTHORITY_SHA = "714f4d51f93461855b24c8644b6ea6ddad6d15f2";
const AUTHORITY_PATH =
  "data/expungement-ai/flow-audit/phase4-corrections/waiting-rule-authority.json";

const authority = JSON.parse(
  execFileSync("git", ["show", `${AUTHORITY_SHA}:${AUTHORITY_PATH}`], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024
  })
);
const routeKeys = Object.entries(authority.proposals.perProposal)
  .filter(([, proposal]) => proposal.decision === "HELD")
  .map(([routeKey]) => routeKey)
  .sort()
  .slice(0, 36);
const profileFiles = fs.readdirSync(PROFILE_DIRECTORY).filter((file) => file.endsWith(".json"));

const paidRoutes = new Set([
  "AK:confidentiality-of-acquittals-and-dismissals-as-22-35-030-administrative-rule-40",
  "LA:first-offense-marijuana-expungement-after-90-days-art-998",
  "MS:first-offense-dui-expungement",
  "MS:minor-in-possession-underage-alcohol-expungement"
]);
const automaticRoutes = new Set([
  "CT:automatic-clean-slate-erasure-for-eligible-post-2000-convictions",
  "DC:dc_auto_expungement_16_802",
  "DC:dc_auto_sealing_16_805",
  "MD:automatic-expungement-under-crim-proc-10-105-1"
]);
const guidanceRoutes = new Set([
  "CT:absolute-pardon-resulting-in-erasure",
  "DC:dc_juvenile_sealing_16_2335",
  "DE:pardon-based-discretionary-expungement-under-11-del-c-4375"
]);
const attorneyReviewRoutes = new Set([
  "MS:additional-justice-or-municipal-court-misdemeanor-relief"
]);
const intentionalUnsupportedRoutes = new Set(routeKeys.filter((routeKey) =>
  !paidRoutes.has(routeKey)
  && !automaticRoutes.has(routeKey)
  && !guidanceRoutes.has(routeKey)
  && !attorneyReviewRoutes.has(routeKey)
));

function getServiceBehavior(routeKey) {
  if (paidRoutes.has(routeKey)) return "packet";
  if (automaticRoutes.has(routeKey)) return "automatic";
  if (guidanceRoutes.has(routeKey)) return "guidance";
  if (attorneyReviewRoutes.has(routeKey)) return "attorney_review";
  return "intentional_unsupported";
}

const timingResolutions = {
  "AK:confidentiality-of-acquittals-and-dismissals-as-22-35-030-administrative-rule-40":
    "60 days after the qualifying acquittal or dismissal, anchored to disposition_date",
  "AR:situation-a-non-convictions":
    "eligible immediately after a qualifying non-conviction disposition; no elapsed waiting period",
  "DC:dc_motion_seal_felony_conviction_8yr_16_806":
    "8 years after sentence completion, with the Offense Severity Group exclusion gate",
  "DC:dc_motion_seal_misdemeanor_conviction_5yr_16_806":
    "5 years after sentence completion",
  "DC:dc_motion_seal_nonconviction_16_806":
    "no ordinary elapsed waiting period after the qualifying non-conviction disposition",
  "IL:adult-non-conviction-expungement":
    "eligible immediately for a qualifying acquittal, dismissal, release-without-charge, or vacatur disposition",
  "KY:misdemeanor-violation-traffic-conviction":
    "5 years after the later of sentence completion or successful probation completion",
  "LA:felony-ten-year-clean-period-expungement":
    "10 years after completion of sentence, probation, or parole",
  "LA:first-offense-marijuana-expungement-after-90-days-art-998":
    "90 days after conviction",
  "LA:misdemeanor-five-year-clean-period-expungement":
    "5 years after completion of sentence, probation, or parole",
  "MA:adult-conviction-sealing-under-m-g-l-c-276-100a":
    "3 years for a misdemeanor or 7 years for a felony, measured from the later available disposition or custody/supervision release anchor",
  "MO:first-intoxication-related-traffic-or-boating-expungement-under-610-130":
    "10 years from completion of the authorized disposition"
};

const preferredEvidenceQuotes = {
  "AK:confidentiality-of-acquittals-and-dismissals-as-22-35-030-administrative-rule-40": [
    "The court system may NOT publish on the public Courtview website a criminal case if 60 days have passed and the person was acquitted of all charges, all charges were dismissed (not as part of a Rule 11 plea in another case), some were acquitted and the rest dismissed, or all were dismissed after a suspended entry of judgment (AS 12.55.078)."
  ],
  "LA:first-offense-marijuana-expungement-after-90-days-art-998": [
    "Special marijuana rule: A first-offense misdemeanor conviction for possession of marijuana, THC, or chemical derivatives may be filed 90 days after conviction."
  ],
  "AR:situation-a-non-convictions": [
    "These are the most accessible filings and generally carry no waiting period."
  ],
  "DC:dc_motion_seal_felony_conviction_8yr_16_806": [
    "Felony conviction motion sealing under D.C. Code § 16-806: 8 years from completion of sentence; unavailable for Offense Severity Group 1, 2, or 3."
  ],
  "DC:dc_motion_seal_misdemeanor_conviction_5yr_16_806": [
    "Misdemeanor conviction motion sealing under D.C. Code § 16-806: 5 years from completion of sentence."
  ],
  "DC:dc_motion_seal_nonconviction_16_806": [
    "No ordinary waiting period for the motion route; packet still requires the § 16-806 motion facts and no exclusion/review flag."
  ],
  "DC:dc_auto_expungement_16_802": [
    "DC has an automatic sealing law, but the court says automatic sealing is not currently operating. You may still have a motion-based option."
  ],
  "DC:dc_auto_sealing_16_805": [
    "DC has an automatic sealing law, but the court says automatic sealing is not currently operating. You may still have a motion-based option."
  ],
  "DC:dc_juvenile_sealing_16_2335": [
    "Two years have passed since final discharge from custody/supervision, or since entry of another Division order not involving custody/supervision; and"
  ],
  "IL:adult-non-conviction-expungement": [
    "Acquittal Eligible immediately unless excluded",
    "Dismissal Eligible immediately unless excluded",
    "Released without charging Eligible immediately unless excluded",
    "Conviction reversed or vacated Eligible immediately unless excluded"
  ],
  "KY:misdemeanor-violation-traffic-conviction": [
    "The petition is filed no sooner than five years after sentence completion or successful completion of probation, whichever is later, except the named voided first-possession routes."
  ],
  "LA:felony-ten-year-clean-period-expungement": [
    "2 More than ten years have passed since completion of sentence, deferred adjudication, probation, or parole; the person has no other criminal conviction during the ten-year period before filing; and no criminal charge is pending. A DA certification is required."
  ],
  "LA:misdemeanor-five-year-clean-period-expungement": [
    "2 More than five years have passed since completion of sentence, deferred adjudication, probation, or parole, and the person has had no felony conviction during that five-year period and has no pending felony charge. A DA certification is required for the five-year route. (\"https://www.legis.la.gov/legis/Law.aspx?d=919669\")"
  ],
  "MA:adult-conviction-sealing-under-m-g-l-c-276-100a": [
    "Misdemeanor 3 years Court appearance/disposition, including incarceration or custody, must be at least 3 years before request",
    "Felony 7 years Court appearance/disposition, including incarceration or custody, must be at least 7 years before request"
  ],
  "MO:first-intoxication-related-traffic-or-boating-expungement-under-610-130": [
    "610.130 first intoxication-related traffic/boating offense A person may apply after at least 10 years to expunge a first intoxication-related traffic or boating offense if it was a misdemeanor or county/city ordinance violation, was not a commercial-motor-vehicle DUI conviction, and the person has not had another intoxication-related traffic/boating conviction since. (\"https://revisor.mo.gov/main/OneSection.aspx?section=610.130\")"
  ],
  "MS:additional-justice-or-municipal-court-misdemeanor-relief": [
    "Two years of good conduct must run from the person's last conviction in any court."
  ],
  "MS:first-offense-dui-expungement": [
    "Five years must run after successful completion of every term and condition of the sentence."
  ],
  "MS:minor-in-possession-underage-alcohol-expungement": [
    "The dismissal branch opens one year after dismissal and discharge.",
    "The conviction branch opens one year after the latest applicable sentence-completion or fine-payment date."
  ]
};
const STATE_LOCAL_EVIDENCE_PATH =
  "src/lib/rcap/state-packs/mississippi/correction-closures.ts";

const routeProductMetadata = {
  "AK:juvenile-record-sealing-as-47-12-300": {
    legalSignoffStatus: "needs_reconfirm",
    evaluatorTier: "HELD_GUIDANCE_ROUTES"
  },
  "AK:sealing-for-mistaken-identity-or-false-accusation-as-12-62-180": {
    evaluatorTier: "HELD_GUIDANCE_ROUTES"
  },
  "AL:eligible-conviction-expungement-under-the-redeemer-act": {
    paymentProductEligible: false,
    legalSignoffStatus: "needs_reconfirm",
    packetFulfillmentStatus: "needs_custom_packet",
    paidRouteBlocker: "intake_fix",
    evaluatorTier: "HELD_GUIDANCE_ROUTES",
    checkoutEligibility: "not_eligible",
    filingReadiness: "guidance_only"
  },
  "IL:juvenile-automatic-or-petition-expungement": {
    paymentProductEligible: false,
    legalSignoffStatus: "needs_reconfirm",
    packetFulfillmentStatus: "needs_custom_packet",
    paidRouteBlocker: "intake_fix",
    evaluatorTier: "HELD_GUIDANCE_ROUTES",
    checkoutEligibility: "not_eligible",
    filingReadiness: "guidance_only"
  },
  "MS:additional-justice-or-municipal-court-misdemeanor-relief": {
    paymentProductEligible: false,
    legalSignoffStatus: "needs_reconfirm",
    packetFulfillmentStatus: "needs_custom_packet",
    paidRouteBlocker: "legal_reconfirmation",
    evaluatorTier: "CORRECTED_AWAITING_RECONFIRM_ROUTES",
    checkoutEligibility: "not_eligible",
    filingReadiness: "guidance_only"
  },
  "MS:first-offense-dui-expungement": {
    paymentProductEligible: false,
    legalSignoffStatus: "needs_reconfirm",
    packetFulfillmentStatus: "needs_custom_packet",
    paidRouteBlocker: "legal_reconfirmation",
    evaluatorTier: "CORRECTED_AWAITING_RECONFIRM_ROUTES",
    checkoutEligibility: "not_eligible",
    filingReadiness: "guidance_only"
  },
  "MS:minor-in-possession-underage-alcohol-expungement": {
    paymentProductEligible: false,
    legalSignoffStatus: "needs_reconfirm",
    packetFulfillmentStatus: "needs_custom_packet",
    paidRouteBlocker: "legal_reconfirmation",
    evaluatorTier: "CORRECTED_AWAITING_RECONFIRM_ROUTES",
    checkoutEligibility: "not_eligible",
    filingReadiness: "guidance_only"
  }
};
const sharedWaitAnchorHolds = [
  "AR:situation-a-non-convictions",
  "DC:dc_motion_seal_felony_conviction_8yr_16_806",
  "DC:dc_motion_seal_misdemeanor_conviction_5yr_16_806",
  "DC:dc_motion_seal_nonconviction_16_806",
  "IL:adult-non-conviction-expungement",
  "KY:misdemeanor-violation-traffic-conviction",
  "LA:felony-ten-year-clean-period-expungement",
  "LA:misdemeanor-five-year-clean-period-expungement",
  "MA:adult-conviction-sealing-under-m-g-l-c-276-100a",
  "MO:first-intoxication-related-traffic-or-boating-expungement-under-610-130"
];
for (const routeKey of sharedWaitAnchorHolds) {
  routeProductMetadata[routeKey] = {
    paymentProductEligible: false,
    legalSignoffStatus: "needs_reconfirm",
    paidRouteBlocker: "wait_anchor_fix",
    evaluatorTier: "HELD_GUIDANCE_ROUTES",
    checkoutEligibility: "not_eligible",
    filingReadiness: "guidance_only"
  };
}
const removeFromRatifiedDeployable = [
  "AL:eligible-conviction-expungement-under-the-redeemer-act",
  "IL:juvenile-automatic-or-petition-expungement",
  "MS:additional-justice-or-municipal-court-misdemeanor-relief",
  "MS:first-offense-dui-expungement",
  "MS:minor-in-possession-underage-alcohol-expungement",
  ...sharedWaitAnchorHolds
].sort();
const addToCorrectedAwaitingReconfirm = Object.entries(routeProductMetadata)
  .filter(([, patch]) => patch.evaluatorTier === "CORRECTED_AWAITING_RECONFIRM_ROUTES")
  .map(([routeKey]) => routeKey)
  .sort();
const addToHeldGuidance = Object.entries(routeProductMetadata)
  .filter(([, patch]) => patch.evaluatorTier === "HELD_GUIDANCE_ROUTES")
  .map(([routeKey]) => routeKey)
  .sort();

function getClosureCategory(routeKey) {
  return getServiceBehavior(routeKey);
}

function getTimingResolution(routeKey, priorBlockers) {
  if (paidRoutes.has(routeKey)) return timingResolutions[routeKey];
  if (automaticRoutes.has(routeKey)) {
    return "automatic relief or erasure; no user-filed paid packet and checkout remains closed";
  }
  if (guidanceRoutes.has(routeKey)) {
    return "guidance-only route; no paid court-filing packet and checkout remains closed";
  }
  if (attorneyReviewRoutes.has(routeKey)) {
    return `${timingResolutions[routeKey]}; after the clock is satisfied, the approved service is attorney-review referral and checkout remains closed`;
  }
  return `The prior defective proposal is withdrawn. LegalEase intentionally does not support this participant route; checkout remains closed. Prior evidence: ${priorBlockers.join("; ")}`;
}

function selectRouteSpecificQuote(pathwayId, pathway) {
  const ignoredTokens = new Set([
    "after",
    "automatic",
    "based",
    "conviction",
    "court",
    "expungement",
    "record",
    "relief",
    "sealing",
    "under"
  ]);
  const tokens = pathwayId
    .split("-")
    .filter((token) => token.length >= 4 && !ignoredTokens.has(token));
  const candidates = [...(pathway.waitingRules ?? []), pathway.summary].filter(Boolean);
  const ranked = candidates
    .map((candidate, index) => ({
      candidate,
      index,
      score: tokens.reduce(
        (total, token) => total + (candidate.toLowerCase().includes(token) ? 1 : 0),
        0
      )
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index);
  const selected = ranked[0]?.candidate;
  const score = ranked[0]?.score ?? 0;
  if (!selected || selected.length < 12 || score === 0) {
    throw new Error(`Missing route-specific evidence for ${pathwayId}`);
  }
  if (selected.length <= 320) return selected;
  const clipped = selected.slice(0, 320);
  const lastWordBoundary = clipped.lastIndexOf(" ");
  return clipped.slice(0, Math.max(lastWordBoundary, 12));
}

const routes = routeKeys.map((routeKey) => {
  const [state, pathwayId] = routeKey.split(/:(.+)/);
  const profileFile = profileFiles.find((file) => file.startsWith(`${state}-`));
  const profile = JSON.parse(fs.readFileSync(path.join(PROFILE_DIRECTORY, profileFile), "utf8"));
  const pathway = profile.pathways.find((candidate) => candidate.id === pathwayId);
  const prior = authority.proposals.perProposal[routeKey];
  if (!prior || prior.decision !== "HELD") throw new Error(`Missing HELD authority for ${routeKey}`);
  if (!pathway) throw new Error(`Missing compiled pathway for ${routeKey}`);

  const sourceQuotes =
    preferredEvidenceQuotes[routeKey] ?? [selectRouteSpecificQuote(pathwayId, pathway)];
  const usesStateLocalEvidence = routeKey.startsWith("MS:");

  return {
    routeKey,
    priorDecision: "HELD",
    priorBlockers: prior.blockers,
    serviceBehavior: getServiceBehavior(routeKey),
    closureCategory: getClosureCategory(routeKey),
    checkoutExpected: paidRoutes.has(routeKey),
    timingResolution: getTimingResolution(routeKey, prior.blockers),
    evidence: {
      profilePath: `src/lib/rcap-engine/compiled/profiles/${profileFile}`,
      pathwaySourceRef: pathway.sourceRef,
      ...(usesStateLocalEvidence ? { stateLocalPath: STATE_LOCAL_EVIDENCE_PATH } : {}),
      sourceQuotes
    }
  };
});

const closure = {
  schemaVersion: "expai-corrections-a-closure/v2",
  authority: {
    sourceCandidateSha: AUTHORITY_SHA,
    assignmentBaseSha: "07675789a80e732d2b835c1e8ba2092b39201b79",
    ownershipSlice: "corrections-a:1-36",
    sourcePath: AUTHORITY_PATH
  },
  policy: {
    paidPacket:
      "Only already-ratified, signed-off, user-filed routes with exact operative timing remain checkout eligible.",
    automaticOrNoFiling: "Automatic relief never enters paid checkout.",
    guidanceOnly: "Board, pardon, and other non-product filing routes remain guidance only.",
    attorneyReview: "The approved referral route evaluates its exact clock, then routes to attorney review without checkout.",
    intentionalUnsupported: "The prior defective proposal is withdrawn and the route is explicitly unsupported, not held or awaiting reconfirmation."
  },
  sharedHandoff: {
    removeFromRatifiedDeployable: [...intentionalUnsupportedRoutes].sort(),
    addToIntentionalUnsupported: [...intentionalUnsupportedRoutes].sort(),
    routeProductMetadata: Object.fromEntries(routeKeys.map((routeKey) => [routeKey, {
      serviceBehavior: getServiceBehavior(routeKey),
      paymentProductEligible: paidRoutes.has(routeKey),
      checkoutEligibility: paidRoutes.has(routeKey) ? "eligible" : "not_eligible",
      evaluatorTier: paidRoutes.has(routeKey) ? "RATIFIED_DEPLOYABLE_ROUTES"
        : intentionalUnsupportedRoutes.has(routeKey) ? "INTENTIONAL_UNSUPPORTED_ROUTES"
          : attorneyReviewRoutes.has(routeKey) ? "LEGAL_AUTHORITY_REFERRAL"
            : "STRUCTURAL_NON_PACKET"
    }]))
  },
  routes
};

const output = `${JSON.stringify(closure, null, 2)}\n`;
if (process.argv.includes("--write")) {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, output);
  console.log(path.relative(ROOT, OUTPUT_PATH));
} else {
  process.stdout.write(output);
}
