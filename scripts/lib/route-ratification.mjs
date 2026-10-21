import fs from "node:fs";
import path from "node:path";

/**
 * The one place a script reads per-route legal ratification.
 *
 * Several scripts used to parse the Sets out of evaluator.ts, with a comment
 * explaining that the sets ARE the gate and re-implementing them here would
 * measure the script instead of the runtime. That reasoning was right while the
 * Sets were hand-written literals.
 *
 * They are not any more. The evaluator now builds them by filtering
 * data/record-clearing/legal-decisions/route-ratification-registry.json, so
 * reading the registry IS reading the gate — it is the same list, one step
 * closer to the authority, and it cannot drift from what the evaluator uses
 * because the evaluator has no separate list to drift from. The projection is
 * proven by scripts/generate-route-ratification-projections.mjs.
 */

const REGISTRY_PATH = "data/record-clearing/legal-decisions/route-ratification-registry.json";

let cached = null;
function registry(root = process.cwd()) {
  if (!cached) cached = JSON.parse(fs.readFileSync(path.join(root, REGISTRY_PATH), "utf8"));
  return cached;
}

/** Statuses as the registry records them, keyed by the evaluator's Set name. */
const SET_STATUS = {
  RATIFIED_DEPLOYABLE_ROUTES: "ratified_deployable",
  CORRECTED_AWAITING_RECONFIRM_ROUTES: "corrected_awaiting_reconfirmation",
  HARD_GATE_PENDING_ROUTES: "hard_gate_pending",
  HELD_GUIDANCE_ROUTES: "held_guidance",
  APPROVED_RELEASE_GUIDANCE_ROUTES: "approved_release_guidance",
  INTENTIONAL_UNSUPPORTED_ROUTES: "intentional_unsupported"
};

/**
 * The exact set the evaluator uses for this name.
 *
 * Ratification sets come from the registry. Everything else in evaluator.ts that
 * happens to be a Set of route keys — the administrative-application packet
 * routes, the Hawaii admin-conviction routes — is NOT a ratification decision
 * and is still a literal there, so those are read from the source. The fallback
 * is narrow and named rather than silent: a ratification set that fell back to
 * source parsing would be a second authority reappearing.
 */
export function evaluatorRouteSet(name, root = process.cwd()) {
  if (name === "RATIFIED_CAUTION_OVERRIDE_ROUTES") {
    return new Set(registry(root).routes.filter((entry) => entry.cautionOverride === true).map((entry) => entry.routeKey));
  }
  const status = SET_STATUS[name];
  if (status) {
    return new Set(registry(root).routes.filter((entry) => entry.status === status).map((entry) => entry.routeKey));
  }
  const source = fs.readFileSync(path.join(root, "src/lib/rcap-engine/evaluator.ts"), "utf8");
  const match = source.match(new RegExp(`const ${name} = new Set\\(\\[([\\s\\S]*?)\\]\\)`, "m"));
  if (!match) throw new Error(`${name} is neither a registry-projected ratification set nor a literal Set in evaluator.ts.`);
  return new Set([...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]).filter((key) => /^[A-Z]{2}:/.test(key)));
}

export function routeRatificationStatus(routeKey, root = process.cwd()) {
  return registry(root).routes.find((entry) => entry.routeKey === routeKey)?.status ?? null;
}

export function routeRatificationRegistry(root = process.cwd()) {
  return registry(root);
}

export const ROUTE_RATIFICATION_REGISTRY_PATH = REGISTRY_PATH;
