import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VERIFIER_PATH = path.join(ROOT, "scripts/verify-corrections-a-closure.mjs");
const PROFILE_DIRECTORY = path.join(ROOT, "src/lib/rcap-engine/compiled/profiles");
const OUTPUT_PATH = path.join(ROOT, "data/expungement-ai/corrections-a/closure.json");
const AUTHORITY_SHA = "714f4d51f93461855b24c8644b6ea6ddad6d15f2";
const AUTHORITY_PATH =
  "data/expungement-ai/flow-audit/phase4-corrections/waiting-rule-authority.json";

const verifier = fs.readFileSync(VERIFIER_PATH, "utf8");
const routeKeys = verifier
  .match(/const EXPECTED_ROUTE_KEYS = \[([\s\S]*?)\];/)[1]
  .match(/"([^"]+)"/g)
  .map((value) => JSON.parse(value));
const authority = JSON.parse(
  execFileSync("git", ["show", `${AUTHORITY_SHA}:${AUTHORITY_PATH}`], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024
  })
);
const profileFiles = fs.readdirSync(PROFILE_DIRECTORY).filter((file) => file.endsWith(".json"));

const paidRoutes = new Set([
  "AK:confidentiality-of-acquittals-and-dismissals-as-22-35-030-administrative-rule-40",
  "AR:situation-a-non-convictions",
  "DC:dc_motion_seal_felony_conviction_8yr_16_806",
  "DC:dc_motion_seal_misdemeanor_conviction_5yr_16_806",
  "DC:dc_motion_seal_nonconviction_16_806",
  "IL:adult-non-conviction-expungement",
  "KY:misdemeanor-violation-traffic-conviction",
  "LA:felony-ten-year-clean-period-expungement",
  "LA:first-offense-marijuana-expungement-after-90-days-art-998",
  "LA:misdemeanor-five-year-clean-period-expungement",
  "MA:adult-conviction-sealing-under-m-g-l-c-276-100a",
  "MO:first-intoxication-related-traffic-or-boating-expungement-under-610-130"
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
    evaluatorTier: "HELD_GUIDANCE_ROUTES",
    checkoutEligibility: "not_eligible",
    filingReadiness: "guidance_only"
  },
  "MS:first-offense-dui-expungement": {
    paymentProductEligible: false,
    legalSignoffStatus: "needs_reconfirm",
    packetFulfillmentStatus: "needs_custom_packet",
    paidRouteBlocker: "legal_reconfirmation",
    evaluatorTier: "HELD_GUIDANCE_ROUTES",
    checkoutEligibility: "not_eligible",
    filingReadiness: "guidance_only"
  },
  "MS:minor-in-possession-underage-alcohol-expungement": {
    paymentProductEligible: false,
    legalSignoffStatus: "needs_reconfirm",
    packetFulfillmentStatus: "needs_custom_packet",
    paidRouteBlocker: "legal_reconfirmation",
    evaluatorTier: "HELD_GUIDANCE_ROUTES",
    checkoutEligibility: "not_eligible",
    filingReadiness: "guidance_only"
  }
};
const removeFromRatifiedDeployable = [
  "AL:eligible-conviction-expungement-under-the-redeemer-act",
  "IL:juvenile-automatic-or-petition-expungement",
  "MS:additional-justice-or-municipal-court-misdemeanor-relief",
  "MS:first-offense-dui-expungement",
  "MS:minor-in-possession-underage-alcohol-expungement"
];
const addToHeldGuidance = Object.keys(routeProductMetadata).sort();

function getClosureCategory(routeKey) {
  if (paidRoutes.has(routeKey)) return "paid_packet";
  if (automaticRoutes.has(routeKey)) return "automatic_or_no_filing";
  if (guidanceRoutes.has(routeKey)) return "guidance_only";
  return "legal_hold_guidance";
}

function getTimingResolution(routeKey, priorBlockers) {
  if (timingResolutions[routeKey]) return timingResolutions[routeKey];
  if (automaticRoutes.has(routeKey)) {
    return "automatic relief or erasure; no user-filed paid packet and checkout remains closed";
  }
  if (guidanceRoutes.has(routeKey)) {
    return "guidance-only route; no paid court-filing packet and checkout remains closed";
  }
  return `defective proposal remains withdrawn and checkout stays fail closed: ${priorBlockers.join("; ")}`;
}

const routes = routeKeys.map((routeKey) => {
  const [state, pathwayId] = routeKey.split(/:(.+)/);
  const profileFile = profileFiles.find((file) => file.startsWith(`${state}-`));
  const profile = JSON.parse(fs.readFileSync(path.join(PROFILE_DIRECTORY, profileFile), "utf8"));
  const pathway = profile.pathways.find((candidate) => candidate.id === pathwayId);
  const prior = authority.proposals.perProposal[routeKey];
  if (!prior || prior.decision !== "HELD") throw new Error(`Missing HELD authority for ${routeKey}`);
  if (!pathway) throw new Error(`Missing compiled pathway for ${routeKey}`);

  const sourceCorpus = [pathway.summary, ...(pathway.waitingRules ?? [])].filter(Boolean).join(" ");
  const sourceQuote = sourceCorpus.match(/[A-Za-z][^"\\\u0000-\u001f]{50,170}/)?.[0];
  if (!sourceQuote) throw new Error(`Missing safe source quote for ${routeKey}`);

  return {
    routeKey,
    priorDecision: "HELD",
    priorBlockers: prior.blockers,
    closureCategory: getClosureCategory(routeKey),
    checkoutExpected: paidRoutes.has(routeKey),
    timingResolution: getTimingResolution(routeKey, prior.blockers),
    evidence: {
      profilePath: `src/lib/rcap-engine/compiled/profiles/${profileFile}`,
      pathwaySourceRef: pathway.sourceRef,
      sourceQuotes: [sourceQuote]
    }
  };
});

const closure = {
  schemaVersion: "expai-corrections-a-closure/v1",
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
    legalHoldGuidance:
      "A defective or branch-ambiguous waiting proposal is withdrawn; checkout remains fail closed until exact shared integration and any required legal reconfirmation."
  },
  sharedHandoff: {
    removeFromRatifiedDeployable,
    addToHeldGuidance,
    routeProductMetadata
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
