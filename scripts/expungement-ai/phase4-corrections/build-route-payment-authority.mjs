#!/usr/bin/env node
/**
 * Phase 4 correction: the per-route payment authority the runtime reads.
 *
 * One row per compiled route, derived from the corrected binding table and the
 * six frozen shard dispositions. The runtime never re-derives any of this; it
 * looks a route up and fails closed when the route is absent.
 */
import fs from "node:fs";
import path from "node:path";
import { getAllJurisdictionProfiles, getProfileByJurisdiction, readJson, ROOT_DIR, writeArtifact, gitSha } from "../flow-audit/lib/engine.mjs";

const BINDINGS = readJson("src/lib/rcap-engine/waiting-rule-bindings.json");
const DISPOSITIONS = {};
for (let index = 1; index <= 6; index += 1) {
  const shard = readJson(`data/expungement-ai/flow-audit/shard-results/SHARD-${index}.json`);
  for (const [route, value] of Object.entries(shard.waitingRuleDispositions ?? {})) DISPOSITIONS[route] = { shard: `SHARD-${index}`, disposition: value.disposition };
}

/**
 * Routes whose source expressly permits a packet while the case is unresolved.
 * Empty by construction: no committed source in this repository says so, and a
 * route is added here only with a quote that does. Everything else is refused.
 */
const CASE_OPEN_PERMITTED = {};

/**
 * Routes whose payment authority is a named, dated, hash-pinned counsel approval
 * rather than the binding table.
 *
 * Maryland's pardon route is the only one. Counsel approved its timing treatment
 * on 2026-08-11 — Crim. Proc. 10-105(a)(8) carries no minimum wait and
 * 10-105(c)(4) is a ten-year filing DEADLINE, which the generic engine cannot
 * express as a minimum-wait rule — and the approval pins the evaluator, the
 * compiled profile and the fixture by sha256, with
 * scripts/verify-rcap-md-pardon-pathway.mjs as its behavioural proof. A Phase 3
 * shard later marked the route HELD_FOR_CORRECTION over its waiting-rule
 * binding, which is a different question from the one counsel answered.
 *
 * Withdrawing payment here would change approved behaviour on the strength of a
 * hold about something else, so the approval is recorded as this route's
 * authority instead. Every other gate condition still applies to it: the wait
 * must still run against the participant's own pardon date, and the deadline bar
 * in mdPardonDeadlineSafetyGate still refuses a pardon older than ten years.
 */
const COUNSEL_APPROVED_PAYMENT_AUTHORITY = {
  "MD:pardoned-conviction-expungement-under-crim-proc-10-105-a-8": {
    approvalId: "md-pardon-signed-date-2026-08-11",
    approvedBy: "Roger, 2026-08-11",
    behaviouralProof: "scripts/verify-rcap-md-pardon-pathway.mjs",
    statutoryAuthority: "Md. Crim. Proc. 10-105(a)(8) and 10-105(c)(4)",
    note: "The shard's HELD_FOR_CORRECTION is recorded and still stands as a waiting-rule question for the legal owner; it does not withdraw this approval."
  }
};

const routes = {};
let purchasableEligible = 0;
for (const entry of getAllJurisdictionProfiles()) {
  const code = entry.jurisdiction?.code ?? entry.code;
  if (!code) continue;
  let profile;
  try { profile = getProfileByJurisdiction(code); } catch { continue; }
  for (const pathway of profile.pathways ?? []) {
    const key = `${code}:${pathway.id}`;
    const binding = BINDINGS.bindings?.[key];
    const disposition = DISPOSITIONS[key]?.disposition ?? null;
    const denials = [];

    if (!binding) denials.push("NO_AUTHORED_BINDING_ROUTE_RESOLVES_THROUGH_THE_PROVISIONAL_PROSE_FALLBACK");
    else if (binding.resolution === "legal_review_required") denials.push("BINDING_HELD_FOR_LEGAL_REVIEW");
    else if (!String(binding.phase4Classification ?? "").startsWith("VALIDATED")) {
      denials.push(`BINDING_NOT_DURATION_PROVENANCE_VALIDATED:${binding.phase4Classification ?? "unclassified"}`);
    }
    if (disposition === "HELD_FOR_CORRECTION") denials.push("ROUTE_HELD_FOR_CORRECTION");
    if (disposition === "LEGAL_OWNER_DECISION_REQUIRED") denials.push("ROUTE_LEGAL_OWNER_DECISION_REQUIRED");

    const counselApproval = COUNSEL_APPROVED_PAYMENT_AUTHORITY[key];
    const eligible = denials.length === 0 || counselApproval !== undefined;
    if (eligible) purchasableEligible += 1;
    routes[key] = {
      jurisdiction: code,
      pathwayId: pathway.id,
      waitingRuleResolution: binding
        ? (binding.resolution === "legal_review_required" ? "committed_legal_review_required"
          : binding.resolution === "no_waiting_period" ? "committed_authored_no_waiting_rule"
            : binding.resolution === "inline" ? "committed_inline_structured_rule" : "committed_explicit_binding")
        : "provisional_prose_fallback",
      bindingClassification: binding?.phase4Classification ?? null,
      shardDisposition: disposition,
      caseOpenExpresslyPermitted: CASE_OPEN_PERMITTED[key] ?? false,
      paymentEligible: eligible,
      // Kept verbatim even when a counsel approval carries the route, so the
      // open waiting-rule question stays visible rather than being erased.
      denials: counselApproval ? [] : denials,
      denialsWaivedByCounselApproval: counselApproval ? denials : undefined,
      counselApproval
    };
  }
}

const output = {
  schemaVersion: "rcap-route-payment-authority/v1",
  generatedBy: "scripts/expungement-ai/phase4-corrections/build-route-payment-authority.mjs",
  head: gitSha("HEAD"),
  contract: {
    purpose: "The server-side answer to 'may this route take money'. src/lib/rcap-engine/checkout-authority.ts reads it and fails closed on anything it does not find.",
    failClosed: "A route absent from `routes` is not purchasable. This is deliberate: a new compiled pathway must be audited before it can sell.",
    notSufficient: "paymentEligible true is a necessary condition, never a sufficient one. The evaluator must still satisfy the operative waiting period against a participant timing fact before payment opens.",
    caseOpen: "caseOpenExpresslyPermitted is false everywhere until a committed source quote says otherwise for a named route."
  },
  totals: { routes: Object.keys(routes).length, paymentEligible: purchasableEligible, refused: Object.keys(routes).length - purchasableEligible },
  routes: Object.fromEntries(Object.keys(routes).sort().map((key) => [key, routes[key]]))
};
fs.writeFileSync(path.join(ROOT_DIR, "src/lib/rcap-engine/route-payment-authority.json"), `${JSON.stringify(output, null, 2)}\n`);
writeArtifact("data/expungement-ai/flow-audit/phase4-corrections/route-payment-authority-summary.json", { schemaVersion: "expai-phase4-route-payment-authority-summary/v1", totals: output.totals, denialCounts: Object.values(routes).flatMap((route) => route.denials).reduce((accumulator, code) => { const key = code.split(":")[0]; accumulator[key] = (accumulator[key] ?? 0) + 1; return accumulator; }, {}) });
console.log(JSON.stringify(output.totals, null, 1));
