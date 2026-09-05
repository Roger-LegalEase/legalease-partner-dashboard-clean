#!/usr/bin/env node
/**
 * Structural verification of the approved legal route contracts.
 *
 * This is the test that would have caught the three defects the implementation
 * directive names, at the point where they are cheapest to catch — in the data,
 * before any profile is written:
 *
 *   1. a post-filing or agency processing deadline stored as a participant
 *      eligibility clock;
 *   2. one grouped route standing in for several statutory mechanisms;
 *   3. checkout open on relief the participant does not file for.
 *
 * It also proves the registry actually covers the approved decision matrix:
 * every decision present, every approved route key claimed, and the
 * thirteen Mississippi categories plus their stage splits materialised.
 */
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const {
  LEGAL_AUTHORITY,
  assertRouteContractInvariants,
  routePaymentAuthority,
  routeIsAutomaticOrNoFiling,
  routeRuleInForceOn,
  routesForJurisdiction
} = await import("@/lib/legal-authority/index");

const failures = [];
const fail = (message) => failures.push(message);

// ── 1. Structural invariants ────────────────────────────────────────────────
for (const violation of assertRouteContractInvariants(LEGAL_AUTHORITY.routes)) {
  fail(`${violation.routeKey}: ${violation.code} — ${violation.message}`);
}

// ── 2. Coverage of the approved decision matrix ─────────────────────────────
//
// The 2026-08-24 matrix carried 50 decisions over 113 route keys. It may grow,
// but only by decisions named here: a decision index that expands quietly is
// one nobody can audit, and the point of a fixed denominator was never the
// number itself.
const DECISION_BASELINE = {
  matrixVersion: "2026-08-24",
  decisions: 50,
  routeKeys: 113,
  additions: [
    {
      decisionId: "NATIONAL-2026-08-28-LA-IMM-03",
      routeKeys: 1,
      reason: "North Dakota § 12-60.1-05 automatic non-conviction closure, from the national legal decision report of 2026-08-28."
    },
    {
      decisionId: "NATIONAL-2026-08-28-LA-IMM-01",
      routeKeys: 1,
      reason: "Georgia O.C.G.A. § 42-8-66 retroactive First Offender petition, gated on verified written prosecutorial consent. A new route rather than a supersession: § 42-8-66 is a different mechanism from the § 42-8-62.1 restriction contracted under LD-GA-01."
    },
    {
      decisionId: "NATIONAL-2026-08-28-LA-IMM-02",
      routeKeys: 1,
      reason: "Missouri § 311.326 merits petition with the receiving-clerk configuration gate, from the national legal decision report of 2026-08-28. Supersedes the LD-MO-01 contract for the same route."
    },
    {
      decisionId: "NATIONAL-2026-08-28-LA-IMM-04",
      routeKeys: 1,
      reason: "South Carolina § 17-22-150 pretrial intervention as solicitor-administered guidance, from the same report."
    },
    // ---- Batch B: Louisiana, Maine, Alaska ----
    // The report's conditions on these routes existed and had never been
    // projected into anything that runs. Eight Louisiana contracts and one
    // Maine contract carried a derived packet_checkout with zero delivery gates
    // while the report's own implementation matrix recorded four of these
    // questions as CONDITIONAL — SOURCE GATE, one as ARTIFACT REVIEW STILL
    // REQUIRED and one as a FORM-CONFLICT GATE.
    {
      decisionId: "NATIONAL-2026-08-28-B-LA-01",
      routeKeys: 1,
      reason: "Louisiana Article 977(D)/998 first-offense marijuana expungement, held on the post-sunset parish fee practice. A new route: it carried no contract at all."
    },
    {
      decisionId: "NATIONAL-2026-08-28-B-LA-02",
      routeKeys: 1,
      reason: "Louisiana Article 985 redaction, held on artifact review. Supersedes the ungated LD-LA-05 contract for the same route."
    },
    {
      decisionId: "NATIONAL-2026-08-28-B-LA-03",
      routeKeys: 1,
      reason: "Louisiana Article 985.3 immediate expungement, released as a packet with contested timing routed to counsel. Supersedes the LD-LA-05 contract for the same route, which carried no handoff."
    },
    {
      decisionId: "NATIONAL-2026-08-28-B-ME-01",
      routeKeys: 1,
      reason: "Maine § 2264 adult conviction sealing, held on the prosecutor-notice method. A new route: it carried no contract at all."
    },
    {
      decisionId: "NATIONAL-2026-08-28-B-ME-02",
      routeKeys: 1,
      reason: "Maine § 2264(7) survivor sealing, held on two independent source gates — the CR-308 form conflict and the notice method. A new route."
    },
    {
      decisionId: "NATIONAL-2026-08-28-B-ME-03",
      routeKeys: 1,
      reason: "Maine § 703(2) adult non-conviction relief, released as guidance that may not promise confidentiality follows automatically. A new route."
    },
    {
      decisionId: "NATIONAL-2026-08-28-B-AK-01",
      routeKeys: 1,
      reason: "Alaska AS 12.55.085(e) belated set-aside motion. Alaska carried no route contract of any kind before this."
    },
    // ---- Batch C: West Virginia, Ohio, New York ----
    // West Virginia carried ten of the report's decisions across three routes
    // and had a contract on none of them. Ohio and New York carried no register
    // questions at all and one research-track decision each.
    {
      decisionId: "NATIONAL-2026-08-28-C-WV-01",
      routeKeys: 1,
      reason: "W. Va. § 61-11-26a accelerated expungement: job readiness is an alternative trigger to ninety days of compliance, for a single misdemeanour only."
    },
    {
      decisionId: "NATIONAL-2026-08-28-C-WV-02",
      routeKeys: 1,
      reason: "W. Va. § 61-11-26 conviction expungement: four decisions on one route — no residence-county venue, no single receiving court for a multi-county group, sever an excluded conviction, and a thirty-day reply period the published instruction sheet prints as ten."
    },
    {
      decisionId: "NATIONAL-2026-08-28-C-WV-03",
      routeKeys: 1,
      reason: "W. Va. § 61-11-25 no-conviction expungement: SCA-C903 predates five amendments to the section and is held on artifact review."
    },
    {
      decisionId: "NATIONAL-2026-08-28-C-WV-04",
      routeKeys: 1,
      reason: "W. Va. § 5-1-16a(b) pardon expungement released as guidance with a narrow statutory effect and no universal nondisclosure."
    },
    {
      decisionId: "NATIONAL-2026-08-28-C-OH-01",
      routeKeys: 1,
      reason: "Ohio R.C. 2953.321 marijuana and hashish possession expungement. Ohio carried no route contract of any kind before this."
    },
    {
      decisionId: "NATIONAL-2026-08-28-C-NY-01",
      routeKeys: 1,
      reason: "N.Y. CPL § 160.55 automatic partial sealing, served as a correction workflow. New York carried no route contract of any kind before this."
    },
    // ---- Kansas municipal runtime representation ----
    // Both routes are approved legal design that had no compiled runtime
    // representation at all, so the census recorded them as
    // missing_from_compiled_runtime with a null pathway and a null contract.
    // These contracts add the representation and nothing else: both are held
    // by a local filing configuration gate and an artifact review gate, and
    // both declare a closed commercial posture.
    {
      decisionId: "LEGAL-DESIGN-2026-08-02-KS-01",
      routeKeys: 1,
      reason: "K.S.A. 12-4516 municipal conviction or diversion expungement, from the adopted Kansas legal-design memorandum of 2026-08-02. A new route: it is a municipal-court mechanism and no district-court § 21-6614 pathway may serve it."
    },
    {
      decisionId: "LEGAL-DESIGN-2026-08-02-KS-02",
      routeKeys: 1,
      reason: "K.S.A. 12-4516a municipal arrest-record expungement, from the same memorandum. A separate route rather than a branch of § 12-4516: a different statute, a different record type and five statutory grounds of its own."
    },
    // ---- Route productization, first pathway cohort ----
    // Five COMPLETE_PACKET_PROVEN families whose single obligation resolved to
    // no runtime route id at all, so nothing downstream of the first link of
    // the productization chain could be attempted for them. Each track's
    // operative citation is unique in its jurisdiction and no compiled pathway
    // carries it. Each contract adds representation and nothing else: every one
    // declares a closed commercial posture, requires artifact approval, and
    // holds at least one open delivery gate.
    {
      decisionId: "LEGAL-DESIGN-2026-07-30-AZ-01",
      routeKeys: 1,
      reason: "A.R.S. § 13-4051 notation of clearance after a wrongful arrest, indictment or charge, from the adopted Arizona legal-design memorandum reviewed 2026-07-30. Arizona carried no route contract of any kind before this, and the three compiled Arizona pathways are the § 13-911 sealing, the § 13-905 set-aside and the § 36-2862 marijuana expungement."
    },
    {
      decisionId: "LEGAL-DESIGN-2026-07-30-CA-01",
      routeKeys: 1,
      reason: "Cal. Penal Code § 1203.4a dismissal and set-aside where probation was not granted, from the adopted California memorandum reviewed 2026-07-30. A new route: the legacy \"Tool 1\" pathway carries § 1203.4, the probation branch, and serving the no-probation branch from it would state the wrong eligibility clock."
    },
    {
      decisionId: "LEGAL-DESIGN-2026-07-30-CT-01",
      routeKeys: 1,
      reason: "C.G.S. § 54-142v petition for erasure of cannabis conviction records, from the adopted Connecticut memorandum reviewed 2026-07-30. A new route on the authority of the E4-R2 crosswalk resolution adjudication, which holds that the compiled CT:cannabis-conviction-erasure pathway is the automatic § 54-142u branch bound to ct-cannabis-auto and that ct-cannabis-petition is not co-mapped."
    },
    {
      decisionId: "LEGAL-DESIGN-2026-08-06-KY-01",
      routeKeys: 1,
      reason: "KRS 218A.276 void-and-seal of a first marijuana, synthetic drug or salvia possession conviction, from the adopted Kentucky memorandum reviewed 2026-08-06. A new route: it is once in a lifetime, limited to three possession offences and keyed to completion rather than to an elapsed period, so neither the KRS 431.078 nor the KRS 431.073 expungement pathway may serve it."
    },
    {
      decisionId: "LEGAL-DESIGN-2026-08-06-NV-01",
      routeKeys: 1,
      reason: "NRS 179A.160 removal of a record from the Central Repository after a favourable disposition, from the adopted Nevada memorandum reviewed 2026-08-06. A new route: it is an agency application to two recipients with five statutory exclusions of its own, and the NRS 179.245 and NRS 179.255 court sealing pathways reach the court record it does not."
    }
  ]
};

const expectedDecisions = DECISION_BASELINE.decisions + DECISION_BASELINE.additions.length;
const expectedRouteKeys = DECISION_BASELINE.routeKeys
  + DECISION_BASELINE.additions.reduce((total, addition) => total + addition.routeKeys, 0);

if (LEGAL_AUTHORITY.decisions.length !== expectedDecisions) {
  fail(`expected ${expectedDecisions} approved decisions (${DECISION_BASELINE.decisions} in the ${DECISION_BASELINE.matrixVersion} matrix plus ${DECISION_BASELINE.additions.length} named addition(s)), found ${LEGAL_AUTHORITY.decisions.length}`);
}
for (const addition of DECISION_BASELINE.additions) {
  const decision = LEGAL_AUTHORITY.decisions.find((entry) => entry.id === addition.decisionId);
  if (!decision) { fail(`${addition.decisionId} is recorded as an addition but is not in the decision index`); continue; }
  if (decision.routeKeys.length !== addition.routeKeys) {
    fail(`${addition.decisionId} claims ${decision.routeKeys.length} route key(s), recorded as ${addition.routeKeys}`);
  }
}

const claimed = new Set(LEGAL_AUTHORITY.routes.map((route) => route.routeKey));
const approvedKeys = LEGAL_AUTHORITY.decisions.flatMap((decision) => decision.routeKeys);
if (approvedKeys.length !== expectedRouteKeys) {
  fail(`expected ${expectedRouteKeys} approved route keys in the decision index, found ${approvedKeys.length}`);
}
// The Mississippi register uses a shorter alias for one route than the compiled
// engine does; the contract carries the engine id and records the alias.
const ROUTE_KEY_ALIASES = {
  "MS:uncharged-or-unprosecuted-misdemeanor-after-12-months":
    "MS:uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59"
};
for (const key of approvedKeys) {
  const resolved = ROUTE_KEY_ALIASES[key] ?? key;
  if (!claimed.has(resolved)) fail(`approved route key has no contract: ${key}`);
}

const decisionIds = new Set(LEGAL_AUTHORITY.decisions.map((decision) => decision.id));
for (const route of LEGAL_AUTHORITY.routes) {
  if (!decisionIds.has(route.decisionId)) fail(`${route.routeKey}: unknown decision ${route.decisionId}`);
}

// ── 3. Mississippi is the controlling override ──────────────────────────────
const mississippi = routesForJurisdiction("MS");
if (mississippi.length < 13) {
  fail(`Mississippi must implement at least its thirteen route categories, found ${mississippi.length}`);
}
const msStatutes = new Set(mississippi.map((route) => route.statute));
if (msStatutes.size !== mississippi.length) {
  const counts = new Map();
  for (const route of mississippi) counts.set(route.statute, (counts.get(route.statute) ?? 0) + 1);
  // Sharing a statute is legitimate only where the decision splits one statute
  // into stages or branches; every such pair must differ in stage or mechanism.
  for (const [statute, count] of counts) {
    if (count === 1) continue;
    const sharing = mississippi.filter((route) => route.statute === statute);
    const distinct = new Set(sharing.map((route) => `${route.stage}|${route.mechanism}`));
    if (distinct.size !== sharing.length) {
      fail(`MS: ${statute} is claimed by ${count} contracts that do not differ in stage or mechanism`);
    }
  }
}
for (const stage of ["active_case_admission", "post_completion", "automatic", "enforcement"]) {
  if (!mississippi.some((route) => route.stage === stage)) {
    fail(`MS: the approved stage splits require at least one ${stage} route`);
  }
}

// ── 4. The three named defects, asserted directly ───────────────────────────

// 4a. No processing deadline is stored as an eligibility clock.
const PROCESSING_WORDS = /processing|response window|agency period|court deadline|transmission|notice period|implementation deadline/i;
for (const route of LEGAL_AUTHORITY.routes) {
  if (route.timing.kind !== "elapsed_eligibility_clock") continue;
  if (PROCESSING_WORDS.test(route.timing.anchorText)) {
    fail(`${route.routeKey}: an eligibility clock is described in processing-deadline language`);
  }
}
// Every route the decisions flagged for processing deadlines must actually hold
// them in `processingDeadlines`, where they cannot be read as a wait.
const MUST_HOLD_PROCESSING_DEADLINES = [
  "DE:juvenile-expungement-under-10-del-c-1017-1019-1017a",
  "MD:police-record-expungement-when-no-charge-was-filed-under-10-103",
  "NM:dna-sample-profile-expungement",
  "RI:path-d-non-conviction-sealing-expungement",
  "TX:expunction-after-pardon-or-actual-innocence-relief",
  "OK:clean-slate-automatic-expungement",
  "NV:trafficking-victim-vacatur-and-sealing-under-nrs-179-247",
  "HI:nonconviction-arrest-expungement",
  "MS:eligible-felony-conviction-expungement-99-19-71"
];
const byKey = new Map(LEGAL_AUTHORITY.routes.map((route) => [route.routeKey, route]));
for (const routeKey of MUST_HOLD_PROCESSING_DEADLINES) {
  const route = byKey.get(routeKey);
  if (!route) { fail(`missing contract for ${routeKey}`); continue; }
  if (!(route.processingDeadlines ?? []).length) {
    fail(`${routeKey}: the approved decision names a processing deadline, but the contract records none`);
  }
}

// 4b. No route bundles several statutory mechanisms. A statute may recur across
// contracts, but never twice inside one contract, and never with two mechanisms
// sharing a single contract's identity.
for (const route of LEGAL_AUTHORITY.routes) {
  if (/\band\b.*\bor\b/i.test(route.mechanism) && route.outcomeMode !== "referral") {
    fail(`${route.routeKey}: mechanism reads as a group; split it or mark the route a referral selector`);
  }
}

// 4c. Checkout is closed wherever the participant files nothing.
for (const route of LEGAL_AUTHORITY.routes) {
  const payment = routePaymentAuthority(route);
  if (routeIsAutomaticOrNoFiling(route) && payment !== "closed") {
    fail(`${route.routeKey}: automatic or no-filing relief must not open checkout (got ${payment})`);
  }
  if (route.stage === "active_case_admission" && payment !== "closed") {
    fail(`${route.routeKey}: active-case admission must not open checkout (got ${payment})`);
  }
}
// The routes the authority names explicitly as no-checkout.
const MUST_BE_CLOSED = [
  "MS:dui-nonadjudication",
  "MS:intervention-court-completion-expungement",
  "MS:nonadjudication-99-15-26-active-case-admission",
  "MS:pretrial-intervention-active-case-admission",
  "MS:controlled-substance-conditional-discharge-active-case-admission",
  "FL:automatic-sealing-943-0595",
  "GA:automatic-restriction-of-qualifying-post-july-1-2013-non-convictions",
  "KY:juvenile-automatic-dismissal",
  "MA:automatic-non-conviction-sealing-for-not-guilty-no-bill-or-no-probable-cause-outcomes-100c",
  "MN:automatic-clean-slate-expungement-under-609a-015",
  "MN:automatic-mistaken-identity-expungement-under-609a-017",
  "MO:marijuana-expungement-under-missouri-constitution-article-xiv",
  "MO:closed-record-outcome-under-rsmo-610-105",
  "NJ:marijuana-hashish-expungement-under-n-j-s-a-2c-52-5-1-5-2-and-6-1",
  "OK:clean-slate-automatic-expungement",
  "RI:path-f-marijuana-possession-expungement",
  "SC:pardon-guidance-for-otherwise-ineligible-convictions",
  "SD:pardon-based-sealing",
  "UT:path-a-automatic-clean-slate-expungement",
  "LA:automated-expungement-status-verification-art-985-2",
  "MT:non-conviction-criminal-history-removal-through-criss"
];
for (const routeKey of MUST_BE_CLOSED) {
  const route = byKey.get(routeKey);
  if (!route) { fail(`missing contract for ${routeKey}`); continue; }
  if (routePaymentAuthority(route) !== "closed") {
    fail(`${routeKey}: the approved decision closes checkout on this route`);
  }
}

// ── 5. Effective-date gating is real, not a comment ─────────────────────────
const EFFECTIVE_DATE_ROUTES = {
  "MS:eligible-felony-conviction-expungement-99-19-71": "2026-07-01",
  "GA:youthful-first-offender-restriction-route": "2026-07-01",
  "OK:clean-slate-automatic-expungement": "2026-07-01",
  "HI:nonconviction-arrest-expungement": "2025-07-01",
  "NH:annulment-of-a-vacated-conviction": "2019-01-01",
  "RI:path-d-non-conviction-sealing-expungement": "2023-01-01",
  "MT:non-conviction-criminal-history-removal-through-criss": "2017-07-01"
};
for (const [routeKey, expected] of Object.entries(EFFECTIVE_DATE_ROUTES)) {
  const route = byKey.get(routeKey);
  if (!route) { fail(`missing contract for ${routeKey}`); continue; }
  if (route.effectiveFrom !== expected) {
    fail(`${routeKey}: expected effectiveFrom ${expected}, found ${route.effectiveFrom ?? "none"}`);
  }
  const dayBefore = new Date(`${expected}T00:00:00.000Z`);
  dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
  if (routeRuleInForceOn(route, dayBefore)) {
    fail(`${routeKey}: the rule reports itself in force the day before ${expected}`);
  }
  if (!routeRuleInForceOn(route, new Date(`${expected}T00:00:00.000Z`))) {
    fail(`${routeKey}: the rule does not report itself in force on ${expected}`);
  }
}

// The Mississippi three-year felony rule must supersede the stale five-year one.
const msFelony = byKey.get("MS:eligible-felony-conviction-expungement-99-19-71");
if (msFelony) {
  if (msFelony.timing.value !== 3 || msFelony.timing.unit !== "years") {
    fail("MS eligible-felony relief must use three years, not the stale five-year rule");
  }
  if (msFelony.supersedes?.value !== 5) {
    fail("MS eligible-felony relief must record that it supersedes the five-year rule");
  }
}
// The five-year DUI rule must stay on first-offense DUI expungement only.
for (const route of routesForJurisdiction("MS")) {
  const isFiveYear = route.timing.value === 5 && route.timing.unit === "years";
  if (isFiveYear && route.pathwayId !== "first-offense-dui-expungement") {
    fail(`${route.routeKey}: the five-year rule belongs only to first-offense DUI expungement`);
  }
}

// Missouri's automatic-closure provision is not in force yet and must not be
// described as available.
const moClosed = byKey.get("MO:closed-record-outcome-under-rsmo-610-105");
if (moClosed && !/2026-08-28/.test(moClosed.notes ?? "")) {
  fail("MO closed-record contract must record the 2026-08-28 gate on the new automatic-closure provision");
}

// ── Report ──────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error("Legal authority contract verification failed:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`Legal authority contracts OK: ${LEGAL_AUTHORITY.decisions.length} decisions, ${LEGAL_AUTHORITY.routes.length} route contracts.`);
