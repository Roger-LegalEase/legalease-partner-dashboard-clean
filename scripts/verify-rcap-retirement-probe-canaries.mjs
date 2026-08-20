#!/usr/bin/env node
// Canaries for the retirement determination's application-source probe.
//
//   node scripts/verify-rcap-retirement-probe-canaries.mjs
//
// The probe read .ts, .tsx, .mjs and .js and not .json, so a form named only
// from a compiled state-flow profile was invisible to it — and an asset no
// probe can see is eligible for retirement. src/lib/rcap-engine/packet-planner.ts
// reads `formCandidates` out of those profiles and turns them into the packet's
// `sourceFormIds`, so "invisible" and "unused" were very different things.
//
// Four assets are named here because they were actually retired under the old
// probe and are actually selected at runtime. They are pinned by canonical
// asset id, not by display name, so a renamed form cannot quietly drop out of
// the canary set.
//
// The mutation is the part that keeps this honest: it re-runs the probe with
// .json excluded again and requires every canary to become retirable. A canary
// that passes under both the corrected and the broken probe is testing nothing.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DETERMINATION = path.join(rootDir, "data/rcap-all50/pdf-retirement-determination.json");

const normalize = (value) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Canonical asset ids that must never be retirable while a compiled profile names them. */
const CANARIES = [
  { id: "AR|7_Nolle_Prosequi_Dismissed_Acquittal_Petition_2020_F.pdf|09f323174881934239734e3a418eb4fec0b4bd0f7e199e8698c3af95a659fa61", display: "AR 7-nolle-prosequi" },
  { id: "AR|3-Misdemeanor-Petition-8_01_2023.pdf|63a308c4fd36a35918249574675c3e83ed47e677cffeae30e09c7e344cfcda23", display: "AR 3-misdemeanor-petition" },
  { id: "AR|Felony-Petition-Form-f.pdf|6065fe0248e9022c866ac2506c02df35b533439f6d15fc40843b709eea375d9b", display: "AR felony-petition-form-f" },
  { id: "VA|CC-1473|6176c2f55bdb320682acecf0a79931bd5e496c4c93b5696645d4ef447fa67219", display: "VA CC-1473" }
];

const failures = [];
const determination = fs.existsSync(DETERMINATION)
  ? JSON.parse(fs.readFileSync(DETERMINATION, "utf8"))
  : null;
if (!determination) {
  console.error("FAIL retirement probe canaries — the determination has not been generated");
  process.exit(1);
}

const byId = new Map(determination.assets.map((a) => [a.assetId, a]));

console.log("  canaries");
for (const canary of CANARIES) {
  const asset = byId.get(canary.id);
  if (!asset) {
    failures.push(`${canary.display}: no asset carries the canonical id ${canary.id}`);
    console.log(`    FAIL ${canary.display.padEnd(28)} — not present under its pinned id`);
    continue;
  }
  const retained = asset.determination === "retain_and_remediate";
  const viaApplicationSource = asset.useSites.some((s) => s.surface === "application_source");
  const ok = retained && viaApplicationSource;
  console.log(`    ${ok ? "ok  " : "FAIL"} ${canary.display.padEnd(28)} ${asset.determination} via ${asset.useSites.map((s) => s.surface).join(", ") || "nothing"}`);
  if (!retained) failures.push(`${canary.display}: is a retirement candidate while a compiled profile names it`);
  else if (!viaApplicationSource) failures.push(`${canary.display}: retained, but not by application_source — the probe is not seeing the compiled profile`);
}

// ---------------------------------------------------------------------------
// The mutation: the probe as it was, without .json.
// ---------------------------------------------------------------------------

function applicationSourceIds({ includeJson }) {
  const ids = new Set();
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      const isJson = entry.name.endsWith(".json");
      if (isJson && !includeJson) continue;
      if (!/\.(ts|tsx|mjs|js|json)$/.test(entry.name)) continue;
      const text = fs.readFileSync(full, "utf8");
      for (const match of text.match(/[A-Za-z]{2,8}-\d[\dA-Za-z.-]*/g) ?? []) ids.add(normalize(match));
      if (!isJson) continue;
      for (const match of text.match(/"(?:relativePath|sourcePath|fileName|formId|documentId)"\s*:\s*"([^"]+)"/g) ?? []) {
        const value = /:\s*"([^"]+)"/.exec(match)?.[1];
        if (!value) continue;
        const leaf = value.split("/").pop() ?? value;
        ids.add(normalize(value));
        ids.add(normalize(leaf));
        ids.add(normalize(leaf.replace(/\.[a-z0-9]+$/i, "")));
      }
    }
  };
  walk(path.join(rootDir, "src"));
  return ids;
}

const withJson = applicationSourceIds({ includeJson: true });
const withoutJson = applicationSourceIds({ includeJson: false });

console.log("  mutation — the probe without .json");
for (const canary of CANARIES) {
  const asset = byId.get(canary.id);
  if (!asset) continue;
  const probes = (asset.probedIdentifiers ?? []).map(normalize).filter(Boolean);
  const seenNow = probes.some((p) => withJson.has(p));
  const seenBefore = probes.some((p) => withoutJson.has(p));
  const discriminates = seenNow && !seenBefore;
  console.log(`    ${discriminates ? "ok  " : "FAIL"} ${canary.display.padEnd(28)} corrected: ${seenNow ? "seen" : "invisible"} / original: ${seenBefore ? "seen" : "invisible"}`);
  if (!discriminates) {
    failures.push(
      seenBefore
        ? `${canary.display}: the original probe already saw it, so it is not evidence that .json mattered`
        : `${canary.display}: the corrected probe still cannot see it`
    );
  }
}

// A form referenced ONLY from a compiled profile must be invisible to the old
// probe and visible to the new one. Stated as a set difference so it holds for
// every such form, not only the four named here.
const onlyInJson = [...withJson].filter((id) => !withoutJson.has(id));
console.log(`  identifiers reachable only through src/**/*.json: ${onlyInJson.length}`);
if (onlyInJson.length === 0) {
  failures.push("no identifier is reachable only through .json — either the compiled profiles moved or the probe is not reading them");
}

// Same bytes, same disposition. Two asset ids over one SHA-256 that disagree
// mean the corpus is retiring a file and keeping it at once.
const byDigest = new Map();
for (const asset of determination.assets) {
  const digest = asset.assetId.split("|").pop();
  if (!digest || digest.length !== 64) continue;
  if (!byDigest.has(digest)) byDigest.set(digest, []);
  byDigest.get(digest).push(asset);
}
const split = [...byDigest.entries()].filter(([, assets]) =>
  assets.length > 1 && new Set(assets.map((a) => a.determination)).size > 1);
console.log(`  digests whose assets disagree on disposition: ${split.length}`);
for (const [digest, assets] of split) {
  console.log(`    !!   ${digest.slice(0, 12)}… ${assets.map((a) => `${a.assetId.split("|")[1]}=${a.determination}`).join(" / ")}`);
}

if (failures.length) {
  console.error(`FAIL retirement probe canaries — ${failures.length} problem(s)`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log(
  `OK retirement probe canaries — ${CANARIES.length} assets retained through compiled runtime data, ` +
    `each invisible to the probe without .json; ${onlyInJson.length} identifiers reachable only through .json` +
    (split.length ? `; ${split.length} digest(s) still disagree on disposition — reported, not failed` : "")
);
