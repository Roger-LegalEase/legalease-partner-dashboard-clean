#!/usr/bin/env node
/**
 * A render job may only open for a route counsel ratified, or for one counsel
 * has not ruled on. Proved in BOTH directions, by calling the real function.
 *
 * WHY THIS EXISTS. An independent read of the terminal treatments found that
 * buildRenderJobSpec never consulted counsel's ratification at all. It refused
 * component_deferral, exact_supported_deferral and rendererKind "none", and
 * nothing else -- so a route counsel had marked "Deliberately out of scope."
 * still built a real RenderJobSpec with rendererKind packet_document_v1.
 * Measured over the registry's own 201 rows: 63 routes counsel had not cleared
 * built a job, including all four retired PA legacy paths and the three DC
 * sealing motions under 16-806 that ADR-0004 retired on 2026-08-28.
 *
 * WHY IT IS WRITTEN THIS WAY. The record that was supposed to catch it carried
 * 64 assertions about checkout, every one of which read the record's own
 * `checkout` block and compared it to itself. `renderJobAllowed: false` sat
 * inside that block and was asserted true of itself while the code did the
 * opposite. So this verifier states no fact of its own and reads no summary: it
 * calls buildRenderJobSpec on every route in the registry and looks at what
 * comes back. A mirror cannot fail; this can.
 *
 * BOTH DIRECTIONS MATTER EQUALLY. A gate that refuses everything passes the
 * negative direction perfectly and has closed the product. So the positive
 * direction is asserted just as hard: ratified routes must still build, and a
 * floor is required, because a corpus that silently stopped resolving would
 * otherwise read as a clean pass.
 *
 *   node scripts/verify-rcap-render-job-requires-ratification.mjs
 */
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const fs = await import("node:fs");
const { buildRenderJobSpec } = await import("@/lib/rcap/render/job-contract");
const { resolvePacketRoute } = await import("@/lib/rcap/documents/packet-route-resolver");

const REGISTRY = "data/record-clearing/legal-decisions/route-ratification-registry.json";
const registry = JSON.parse(fs.readFileSync(REGISTRY, "utf8"));
const rows = registry.routes ?? [];

/* A scan of an empty set passes every content check it applies. */
const MINIMUM_REGISTRY_ROWS = 190;
/* The product has to still exist. If ratified routes stop building, this gate
 * has become an outage and must fail rather than congratulate itself. */
const MINIMUM_RATIFIED_THAT_BUILD = 40;

const problems = [];
let checks = 0;

if (rows.length < MINIMUM_REGISTRY_ROWS) {
  problems.push(`the registry carries ${rows.length} rows, below the floor of ${MINIMUM_REGISTRY_ROWS}; this scan is reading the wrong file`);
}

const specFor = (routeKey) => {
  const i = String(routeKey).indexOf(":");
  const state = String(routeKey).slice(0, i);
  const pathway = String(routeKey).slice(i + 1);
  try {
    const { spec } = buildRenderJobSpec({ packetId: "verify", state, pathway, trackId: null, packetFields: {} });
    return { spec, route: resolvePacketRoute({ state, pathway, trackId: null }) };
  } catch {
    /* A throw is a refusal to build an unverifiable job, which is this gate's
     * side of the argument; it is not a job. */
    return { spec: null, route: resolvePacketRoute({ state, pathway, trackId: null }) };
  }
};

let ratifiedThatBuild = 0;
const builtWithoutRatification = [];

for (const row of rows) {
  const { spec, route } = specFor(row.routeKey);
  const built = Boolean(spec) && typeof spec === "object";
  checks += 1;

  if (row.status === "ratified_deployable") {
    if (built) ratifiedThatBuild += 1;
    /* A ratified route that does not build is not asserted per-route: it may be
     * legitimately deferred, correction-held or handed off. The floor below is
     * what proves the positive direction. */
  } else if (built) {
    builtWithoutRatification.push(`${row.routeKey} (${row.status}, routeKind ${route.routeKind})`);
  }

  /* ADR-0004: a retired legacy renderer authorizes nothing. Asserted
   * independently of the registry, because the retirement is a separate
   * decision and either one alone must be enough to refuse. */
  checks += 1;
  if (route.routeKind === "legacy_retired" && built) {
    problems.push(`${row.routeKey} is legacy_retired and still builds a render job; ADR-0004 retired its authority`);
  }
}

if (builtWithoutRatification.length) {
  problems.push(`${builtWithoutRatification.length} route(s) counsel has not ratified still build a render job: ${builtWithoutRatification.slice(0, 3).join(" | ")}`);
}
if (ratifiedThatBuild < MINIMUM_RATIFIED_THAT_BUILD) {
  problems.push(`only ${ratifiedThatBuild} ratified route(s) build a render job, below the floor of ${MINIMUM_RATIFIED_THAT_BUILD}; this gate has closed the product rather than gated it`);
}

/*
 * The gate must read the REGISTRY, not a status copied into the render module.
 * A retyped copy is the failure that made the terminal-treatment verifier's
 * mapping unfalsifiable, and it would drift the first time counsel changed a
 * status.
 */
checks += 1;
const contractText = fs.readFileSync("src/lib/rcap/render/job-contract.ts", "utf8");
if (!/route-ratification-registry\.json/.test(contractText)) {
  problems.push("the render contract does not read the ratification registry, so its gate is a copy of counsel's decision rather than counsel's decision");
}
/*
 * Comments are stripped first. The check is about what the code branches on,
 * and this file's own prose explains why `sellable` is the wrong gate -- which
 * a naive substring search read as the code doing it. A check that fires on an
 * explanation of itself is measuring the wrong thing.
 */
checks += 1;
const contractCode = contractText
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n").map((l) => l.replace(/\/\/.*$/, "")).join("\n");
if (/\bsellable\b/.test(contractCode)) {
  problems.push("the render contract branches on `sellable`; sellability is a readiness measurement and every route in the corpus is currently false, so gating on it would refuse every render including the ratified ones");
}

for (const p of problems) console.error(` - ${p}`);
console.log(problems.length === 0
  ? `Render-job ratification gate holds: ${checks} checks over ${rows.length} registry routes; ${ratifiedThatBuild} ratified route(s) build, 0 unratified route(s) do.`
  : `${problems.length} render-job ratification problem(s).`);
process.exit(problems.length === 0 ? 0 : 1);
