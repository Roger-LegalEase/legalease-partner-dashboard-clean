#!/usr/bin/env node
/**
 * The case-determined exception, exercised in both directions.
 *
 * WHY IT EXISTS. `classifyBlank` refuses a declared required-before-filing
 * field whenever its printed caption matches FIELD_CLASSES.ROUTE_ELECTION, and
 * that is right in general: a packet built for one statutory route states which
 * route it is rather than asking the participant. It is wrong for a cell the
 * CASE determines rather than the route.
 *
 * California CR-180 is the measured instance. Its per-offence "under Penal
 * Code, § 17(b) — yes or no" cells ask, of each listed conviction, whether that
 * offence is a wobbler. The route does not decide that; the offence does. A
 * repair lane proved the counter could not be cleared by any declaration and
 * stopped rather than clearing it the only remaining way — writing a yes or no
 * that no held record establishes, onto a petition sworn under penalty of
 * perjury. A counter satisfiable only by guessing a legal conclusion is
 * pressure to ship an unsafe filing.
 *
 * WHAT THIS PINS. The exception is narrow and it is auditable, and both halves
 * are load-bearing:
 *   - it needs a stated reason, so it cannot be switched on silently;
 *   - it overrides the CLASS inference and never an explicit routeDetermined,
 *     so a family cannot declare both and have the permissive half win;
 *   - and it carries through the participant-completable check, or the family
 *     would trade requiredOptionsMissing for unclassifiedBlanks and call it a
 *     repair.
 *
 *   node scripts/rcap-packet-completeness/verify-case-determined-exception.mjs
 */
import { classifyBlank } from "./completeness-contract.mjs";

/* A caption FIELD_CLASSES.ROUTE_ELECTION actually matches. Using a caption that
 * does not match would pass every case below without testing anything. */
const FIELD = { name: "pc17b_row1", id: "pc17b_row1", label: "under Penal Code, § 17(b) — yes or no" };
const REASON = "Whether a listed offence is a wobbler is a characterisation of that offence under Penal Code 17(b), not a property of the 1203.4 route; the route is identical whichever way it resolves.";

const cases = [
  ["an undeclared route-election cell is still a route election",
    null, "ROUTE_OPTION_NOT_SELECTED"],
  ["required-before-filing alone does not beat the class",
    { requiredBeforeFiling: true, identity: "matter.charges[].isWobbler" }, "ROUTE_OPTION_NOT_SELECTED"],
  ["routeDetermined:false alone does not beat the class either",
    { requiredBeforeFiling: true, routeDetermined: false, identity: "matter.charges[].isWobbler" }, "ROUTE_OPTION_NOT_SELECTED"],
  ["the exception without a stated reason is refused",
    { requiredBeforeFiling: true, identity: "matter.charges[].isWobbler", determinedByTheCaseNotTheRoute: true }, "ROUTE_OPTION_NOT_SELECTED"],
  ["the exception with a stated reason is a participant blank",
    { requiredBeforeFiling: true, identity: "matter.charges[].isWobbler", determinedByTheCaseNotTheRoute: true, whyTheRouteCannotDetermineIt: REASON }, "REQUIRED_BEFORE_FILING"],
  ["an explicit routeDetermined still refuses, exception or not",
    { requiredBeforeFiling: true, routeDetermined: true, identity: "matter.charges[].isWobbler", determinedByTheCaseNotTheRoute: true, whyTheRouteCannotDetermineIt: REASON }, "ROUTE_OPTION_NOT_SELECTED"],
  ["an empty reason is not a reason",
    { requiredBeforeFiling: true, identity: "matter.charges[].isWobbler", determinedByTheCaseNotTheRoute: true, whyTheRouteCannotDetermineIt: "   " }, "ROUTE_OPTION_NOT_SELECTED"],
  ["a held fact is still a known fact not written, exception or not",
    { requiredBeforeFiling: true, identity: "matter.charges[].isWobbler", factAvailable: true, factId: "matter.charges[].isWobbler", determinedByTheCaseNotTheRoute: true, whyTheRouteCannotDetermineIt: REASON }, "KNOWN_FACT_NOT_WRITTEN"]
];

const problems = [];
for (const [name, declared, expected] of cases) {
  const got = classifyBlank(FIELD, "route election not selected", null, declared).disposition;
  if (got !== expected) problems.push(`${name}: expected ${expected}, got ${got}`);
}

/* The positive direction has to be reachable at all, or every case above could
 * be satisfied by a contract that refuses everything. */
const reachable = classifyBlank(FIELD, "route election not selected", null,
  { requiredBeforeFiling: true, identity: "x", determinedByTheCaseNotTheRoute: true, whyTheRouteCannotDetermineIt: REASON }
).disposition === "REQUIRED_BEFORE_FILING";
if (!reachable) problems.push("the exception is unreachable; a contract that refuses everything passes every negative case");

for (const p of problems) console.error(` - ${p}`);
console.log(problems.length === 0
  ? `Case-determined exception holds: ${cases.length} cases, both directions.`
  : `${problems.length} case-determined exception problem(s).`);
process.exit(problems.length === 0 ? 0 : 1);
