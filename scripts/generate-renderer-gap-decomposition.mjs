// Decomposes the renderer_unavailable blocker into the distinct problems
// it actually names.
//
// "68 pathways need a renderer" was the headline. The resolver's own statement
// says otherwise: "No packet artifact is produced for this route today
// (resolver refused: routeKind=guidance_only)." A resolver refusing to render a
// packet for a guidance route is working, not missing.
//
// Usage: node scripts/generate-renderer-gap-decomposition.mjs [--check]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");
const OUT_JSON = "data/rcap-ledger/renderer-gap-decomposition.json";
const OUT_MD = "docs/record-clearing/RENDERER_GAP_DECOMPOSITION.md";
const MEMO_DIR = "data/record-clearing/legal-design-intake";

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
const closure = readJson("data/rcap-ledger/sellable-pathway-closure.json");
const legalJoin = readJson("data/rcap-ledger/paid-pathway-legal-join.json");
const launchGraph = readJson("data/rcap-ledger/launch-graph.json");

// The launch graph already records which factory_v2 routes are admitted and then
// deliberately suppressed by a treatment. A suppressed route is a decision, not
// an unwired renderer, and counting it as work would overstate the gap again.
const suppressedBy = new Map(
  (launchGraph.counters?.factoryV2AdmittedButSuppressed ?? []).map((e) => [e.pathwayKey, e.suppressedBy])
);

const memoTracks = new Map();
for (const file of fs.readdirSync(path.join(root, MEMO_DIR)).sort()) {
  if (!file.endsWith(".memo.json") || file === "TEMPLATE.memo.json") continue;
  const memo = JSON.parse(fs.readFileSync(path.join(root, MEMO_DIR, file), "utf8"));
  for (const track of memo.tracks) memoTracks.set(track.trackId, { ...track, jurisdiction: memo.jurisdiction });
}
const joinByKey = new Map(legalJoin.pathways.map((p) => [p.pathwayKey, p]));

// A memo output strategy that means a packet exists to render.
const PACKET_STRATEGIES = new Set(["composed", "official_pdf_fill", "custom_pleading", "official_form_overlay"]);

const rows = closure.pathways
  .filter((p) => (p.openBlockers ?? []).some((b) => b.id === "renderer_unavailable"))
  .map((pathway) => {
    const join = joinByKey.get(pathway.pathwayKey) ?? null;
    const trackIds = join?.registryTrackIds ?? [];
    const tracks = trackIds.map((id) => memoTracks.get(id)).filter(Boolean);
    const strategies = [...new Set(tracks.map((t) => t.outputStrategy).filter(Boolean))];
    const packetIntended = strategies.some((s) => PACKET_STRATEGIES.has(s));
    const statement = (pathway.openBlockers ?? []).find((b) => b.id === "renderer_unavailable")?.statement ?? "";

    let classification;
    let reason;
    let remedy;
    if (trackIds.length === 0) {
      classification = "NO_TRACK_TO_RENDER_FROM";
      reason = "The pathway reaches no registry track, so there is no packet specification for any renderer to consume.";
      remedy = "Bind the pathway to a registry track. This is the same bridge work counted elsewhere; it is not a renderer gap.";
    } else if (!packetIntended) {
      classification = "GUIDANCE_ROUTE_MISCATEGORISED_AS_PAID";
      reason = `The memo records outputStrategy ${strategies.join(", ") || "(none)"}, which produces no packet. The resolver correctly refused; the categorisation of this pathway as paid_packet_intended is what is wrong.`;
      remedy = "Recategorise the pathway as a non-packet service outcome. No renderer is needed or wanted.";
    } else if (suppressedBy.has(pathway.pathwayKey)) {
      classification = "FACTORY_V2_ADMITTED_BUT_DELIBERATELY_SUPPRESSED";
      reason = `factory_v2 admits this route and a recorded treatment suppresses it: ${suppressedBy.get(pathway.pathwayKey)}. The renderer is not missing; the route is held closed on purpose.`;
      remedy = "None as renderer work. Revisit only if the treatment that suppresses it is lifted.";
    } else {
      classification = "PACKET_INTENDED_BUT_ROUTE_RESOLVES_TO_GUIDANCE";
      reason = `The memo records outputStrategy ${strategies.join(", ")}, which is packet-capable, while the runtime resolver reports routeKind=${pathway.route?.routeKind}, and no treatment suppresses it. Memo and runtime disagree.`;
      remedy = "Wire the route to the shared factory_v2 renderer for its packet strategy. This is the real renderer work.";
    }

    return {
      pathwayKey: pathway.pathwayKey,
      jurisdiction: pathway.jurisdiction,
      routeKind: pathway.route?.routeKind ?? null,
      rendererKind: pathway.route?.rendererKind ?? null,
      trackIds,
      memoOutputStrategies: strategies,
      resolverStatement: statement,
      suppressedBy: suppressedBy.get(pathway.pathwayKey) ?? null,
      classification,
      reason,
      remedy
    };
  });

const counts = {};
for (const row of rows) counts[row.classification] = (counts[row.classification] ?? 0) + 1;

const register = {
  schemaVersion: 1,
  generatedBy: "scripts/generate-renderer-gap-decomposition.mjs",
  question: "The closure ledger holds 68 pathways open on renderer_unavailable. How many of them actually need a renderer?",
  lineageDecision: {
    decision: "factory_v2 is the successor renderer. The packet engines on feat/record-clearing-production-integration are its predecessor and are not ported.",
    evidence: [
      "src/lib/rcap/documents/packet-document-renderer.ts and factory-v2-registry.ts landed in mainline on 2026-08-10 and were wired into the authoritative resolver on 2026-08-19.",
      "The branch's src/lib/rcap/packets/engines was last touched on 2026-08-09, one day before factory_v2 landed.",
      "The branch carries no factory_v2 at all, so it forked before the successor existed.",
      "The engines were never present in mainline history, so nothing was removed from mainline to make room for factory_v2."
    ],
    consequence: "Porting the engines would move the renderer backwards. The remaining renderer work is wiring routes to the shared factory_v2 renderer."
  },
  total: rows.length,
  counts,
  rows
};

const markdown = renderMarkdown(register);
const serialized = `${JSON.stringify(register, null, 2)}\n`;

if (CHECK) {
  const problems = [];
  if (Object.values(counts).reduce((a, b) => a + b, 0) !== rows.length) problems.push("classifications do not sum");
  for (const [rel, expected] of [[OUT_JSON, serialized], [OUT_MD, markdown]]) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) problems.push(`${rel} has not been generated`);
    else if (fs.readFileSync(abs, "utf8") !== expected) problems.push(`${rel} is stale; regenerate it`);
  }
  if (problems.length > 0) {
    console.error("Renderer gap decomposition failed:");
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(`Renderer gap decomposition verified: ${rows.length} pathways.`);
  process.exit(0);
}

fs.mkdirSync(path.join(root, path.dirname(OUT_JSON)), { recursive: true });
fs.writeFileSync(path.join(root, OUT_JSON), serialized);
fs.writeFileSync(path.join(root, OUT_MD), markdown);
console.log(`Wrote ${OUT_JSON} and ${OUT_MD}`);
console.log(`renderer_unavailable pathways: ${rows.length}`);
for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${v}`);

function renderMarkdown(data) {
  const L = [];
  L.push("# What `renderer_unavailable` actually names");
  L.push("");
  L.push("**Generated by** `scripts/generate-renderer-gap-decomposition.mjs`. Do not edit by hand.");
  L.push("");
  L.push(`${data.total} pathways carry the blocker. They are ${Object.keys(data.counts).length} different problems, and only one of them is a renderer.`);
  L.push("");
  L.push("| Classification | Pathways |");
  L.push("|---|---:|");
  for (const [k, v] of Object.entries(data.counts).sort((a, b) => b[1] - a[1])) L.push(`| ${k} | ${v} |`);
  L.push(`| **TOTAL** | **${data.total}** |`);
  L.push("");
  L.push("## Renderer lineage");
  L.push("");
  L.push(`**${data.lineageDecision.decision}**`);
  L.push("");
  for (const line of data.lineageDecision.evidence) L.push(`- ${line}`);
  L.push("");
  L.push(data.lineageDecision.consequence);
  L.push("");
  L.push("## Every pathway");
  L.push("");
  L.push("| Pathway | Route kind | Memo output strategy | Classification |");
  L.push("|---|---|---|---|");
  for (const r of data.rows) {
    L.push(`| \`${r.pathwayKey}\` | ${r.routeKind} | ${r.memoOutputStrategies.join(", ") || "—"} | ${r.classification} |`);
  }
  L.push("");
  return `${L.join("\n")}\n`;
}
