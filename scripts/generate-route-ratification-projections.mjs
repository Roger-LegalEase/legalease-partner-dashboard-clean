#!/usr/bin/env node
/**
 * One controlling ratification registry, two generated projections.
 *
 * The repository carried two editable per-route ratification records that
 * disagreed — 80 routes ratified in the evaluator's Sets, 53 in the compiled
 * profiles' lawrenceRatification blocks, 40 in common. Two editable records of
 * the same legal fact is a coin flip, and a route counsel holds to guidance was
 * chosen as a build candidate off the wrong one.
 *
 * data/record-clearing/legal-decisions/route-ratification-registry.json is now
 * the authority. This file proves both structures are projections of it:
 *
 *   1. src/lib/rcap-engine/evaluator.ts builds its Sets by filtering the
 *      registry. This checks that no route literal has crept back in, because a
 *      literal is a second authority wearing a projection's clothes.
 *   2. Every compiled profile's lawrenceRatification block is WRITTEN from the
 *      registry here, so the snapshot cannot drift again.
 *
 * Runtime usage never established legal authority. A status changes when counsel
 * decides it changes, in the registry, and the projections follow.
 *
 * `--check` fails if either projection is out of date.
 */
import fs from "node:fs";
import path from "node:path";

const CHECK = process.argv.includes("--check");
const root = process.cwd();
const REGISTRY = "data/record-clearing/legal-decisions/route-ratification-registry.json";
const EVALUATOR = "src/lib/rcap-engine/evaluator.ts";
const PROFILE_DIR = "src/lib/rcap-engine/compiled/profiles";

const registry = JSON.parse(fs.readFileSync(path.join(root, REGISTRY), "utf8"));
const byRoute = new Map(registry.routes.map((entry) => [entry.routeKey, entry]));

const failures = [];
const fail = (message) => failures.push(message);

/* ---------------------------------------------- projection 1: the evaluator */

const PROJECTED_SETS = {
  RATIFIED_DEPLOYABLE_ROUTES: "ratified_deployable",
  CORRECTED_AWAITING_RECONFIRM_ROUTES: "corrected_awaiting_reconfirmation",
  HARD_GATE_PENDING_ROUTES: "hard_gate_pending",
  HELD_GUIDANCE_ROUTES: "held_guidance",
  APPROVED_RELEASE_GUIDANCE_ROUTES: "approved_release_guidance",
  INTENTIONAL_UNSUPPORTED_ROUTES: "intentional_unsupported"
};

const evaluatorSource = fs.readFileSync(path.join(root, EVALUATOR), "utf8");
for (const [name, status] of Object.entries(PROJECTED_SETS)) {
  const match = evaluatorSource.match(new RegExp(`const ${name} = new Set<string>\\(([\\s\\S]*?)\\n\\);`));
  if (!match) {
    fail(`${name} is not a projection of the registry — it is declared some other way`);
    continue;
  }
  if (!match[1].includes(`entry.status === "${status}"`)) {
    fail(`${name} does not filter the registry on status ${status}`);
  }
  const literals = match[1].match(/"[A-Z]{2}:/g) ?? [];
  if (literals.length > 0) {
    fail(`${name} carries ${literals.length} route literal(s); a literal is a second authority wearing a projection's clothes`);
  }
}
const cautionMatch = evaluatorSource.match(/const RATIFIED_CAUTION_OVERRIDE_ROUTES = new Set<string>\(([\s\S]*?)\n\);/);
if (!cautionMatch || !cautionMatch[1].includes("entry.cautionOverride === true")) {
  fail("RATIFIED_CAUTION_OVERRIDE_ROUTES is not projected from the registry's cautionOverride modifier");
}

/* --------------------------------- projection 2: the compiled profile blocks */

/**
 * A status that projects into a runtime, and a status that does not.
 *
 * stale_snapshot_only exists because eleven routes carried a ratification in
 * the compiled snapshot and in no counsel decision the evaluator records.
 * Promoting them would ratify routes on the strength of a snapshot, which is
 * the same mistake this registry exists to end, in the other direction. They
 * are listed and they project into nothing.
 */
const COMPILED_STATUS = {
  ratified_deployable: { status: "ratified_deployable", packet_capable: true, payment_allowed_when_engine_confirms: true },
  corrected_awaiting_reconfirmation: { status: "corrected_awaiting_reconfirmation", packet_capable: true, payment_allowed_when_engine_confirms: false },
  hard_gate_pending: { status: "hard_gate_pending", packet_capable: false, payment_allowed_when_engine_confirms: false },
  held_guidance: { status: "hold_guidance", packet_capable: false, payment_allowed_when_engine_confirms: false },
  approved_release_guidance: { status: "approved_release_behavior", packet_capable: false, payment_allowed_when_engine_confirms: false },
  intentional_unsupported: { status: "intentional_unsupported", packet_capable: false, payment_allowed_when_engine_confirms: false }
};

let written = 0;
let blocks = 0;
let cleared = 0;
const stale = [];

for (const fileName of fs.readdirSync(path.join(root, PROFILE_DIR)).sort()) {
  if (!fileName.endsWith(".json")) continue;
  const filePath = path.join(root, PROFILE_DIR, fileName);
  const original = fs.readFileSync(filePath, "utf8");
  const profile = JSON.parse(original);
  const code = profile.jurisdiction.code;
  let touched = false;

  for (const pathway of profile.pathways ?? []) {
    const entry = byRoute.get(`${code}:${pathway.id}`);
    const projected = entry && COMPILED_STATUS[entry.status];
    if (!projected) {
      // No counsel decision, or a status that projects into nothing. The block
      // is removed rather than left saying something the registry does not.
      if (pathway.lawrenceRatification) {
        if (entry?.status === "stale_snapshot_only") stale.push(`${code}:${pathway.id}`);
        delete pathway.lawrenceRatification;
        cleared += 1;
        touched = true;
      }
      continue;
    }
    const block = {
      ...projected,
      // The route's own legal basis, not a sentence about projection. It is part
      // of the counsel decision: replacing it with boilerplate would delete the
      // citation the route was ratified on.
      legal_basis: entry.legalBasis ?? `Projected from ${REGISTRY}. Decision authority: ${entry.decisionAuthority}.`,
      lawrence_review: projected.status,
      projectedFrom: "route-ratification-registry"
    };
    if (JSON.stringify(pathway.lawrenceRatification) !== JSON.stringify(block)) {
      pathway.lawrenceRatification = block;
      touched = true;
    }
    blocks += 1;
  }

  const serialized = `${JSON.stringify(profile, null, 2)}\n`;
  if (serialized !== original) {
    if (CHECK) {
      fail(`${fileName} lawrenceRatification blocks are out of date with the registry`);
    } else {
      fs.writeFileSync(filePath, serialized);
      written += 1;
    }
    void touched;
  }
}

if (failures.length > 0) {
  console.error(`route ratification projections FAILED — ${failures.length} problem(s):`);
  for (const failure of failures) console.error(` - ${failure}`);
  if (CHECK) console.error("Regenerate with: node scripts/generate-route-ratification-projections.mjs");
  process.exit(1);
}

console.log(`Route ratification: one registry, two projections.`);
console.log(`  registry routes ${registry.routes.length}; ${registry.totals.commerciallyDeployableCandidates} ratified deployable, ${registry.totals.heldRoutes} held, ${registry.totals.staleRecordsNotProjected} stale and projected into nothing`);
console.log(`  evaluator: 7 Sets, all projections, 0 route literals`);
console.log(`  compiled profiles: ${blocks} lawrenceRatification block(s)${cleared ? `, ${cleared} removed as unbacked` : ""}${CHECK ? "" : `, ${written} file(s) written`}`);
if (stale.length > 0) console.log(`  stale snapshot records cleared: ${stale.length}`);
