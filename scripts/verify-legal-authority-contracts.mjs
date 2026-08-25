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
 * all fifty decisions present, all 113 approved route keys claimed, and the
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
if (LEGAL_AUTHORITY.decisions.length !== 50) {
  fail(`expected 50 approved decisions, found ${LEGAL_AUTHORITY.decisions.length}`);
}

const claimed = new Set(LEGAL_AUTHORITY.routes.map((route) => route.routeKey));
const approvedKeys = LEGAL_AUTHORITY.decisions.flatMap((decision) => decision.routeKeys);
if (approvedKeys.length !== 113) {
  fail(`expected 113 approved route keys in the decision index, found ${approvedKeys.length}`);
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
