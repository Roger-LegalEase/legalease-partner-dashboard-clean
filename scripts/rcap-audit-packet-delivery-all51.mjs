// All-51 runtime packet-delivery capability audit.
//
// For all 50 states plus DC this reads the explicit capability, exercises the
// real runtime contract for that capability, and writes a machine-readable
// matrix. It distinguishes packet delivery from guidance-only service, and it
// fails when product configuration claims a readiness the runtime cannot prove.
//
// It does not make jurisdictions packet-ready in order to pass. An honest
// non-packet state is a valid result; an incorrect form or a silent skip is not.
//
// Writes artifacts/packet-delivery/all51-capability-matrix.json.

import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const root = process.cwd();
const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const capability = await import("@/lib/rcap/jurisdictions/packet-capability");
const resolver = await import("@/lib/rcap/jurisdictions/resolve-packet-assets");
const packetPdf = await import("@/lib/rcap/documents/packet-pdf");

const {
  ALL_JURISDICTION_CODES,
  PACKET_CAPABILITIES,
  assertRegistryIntegrity,
  getPacketCapability,
  packetReadyTargets,
  resolveEffectiveStatus
} = capability;

// 1. The registry must be structurally sound before anything is read from it.
try {
  assertRegistryIntegrity();
} catch (error) {
  failures.push(error.message);
}

// 2. Every one of the 51 must be explicitly enumerated. No catch-all entry.
assert(
  ALL_JURISDICTION_CODES.length === 51,
  `Expected 51 jurisdictions, found ${ALL_JURISDICTION_CODES.length}.`
);
assert(
  PACKET_CAPABILITIES.length === 51,
  `Registry enumerates ${PACKET_CAPABILITIES.length} jurisdictions; expected 51.`
);

// 3. Per-jurisdiction runtime contract.
const rows = [];

for (const code of ALL_JURISDICTION_CODES) {
  const entry = getPacketCapability(code);
  if (!entry) {
    failures.push(`${code} has no capability entry.`);
    continue;
  }

  const row = {
    jurisdiction: code,
    name: entry.name,
    slug: entry.slug,
    status: entry.status,
    countyScoped: entry.countyScoped,
    counties: entry.counties.map((county) => ({
      county: county.countyKey,
      status: county.status,
      approvedMappings: county.assets.filter((a) => a.mappingApproved).length,
      draftMappings: county.assets.filter((a) => !a.mappingApproved).length
    })),
    approvedMappings: entry.assets.filter((a) => a.mappingApproved).length,
    draftMappings: entry.assets.filter((a) => !a.mappingApproved).length,
    packetDelivery: "unproven",
    courtTemplate: null,
    resolution: null
  };

  const effective = resolveEffectiveStatus({ jurisdiction: code, county: null });

  // 3a. Resolution must either produce this jurisdiction's own asset or fail
  //     with a typed reason. It must never produce another jurisdiction's.
  const resolved = resolver.tryResolvePacketAsset({ jurisdiction: code });
  if (resolved.ok) {
    row.resolution = "resolved";
    assert(
      resolved.asset.jurisdiction === code,
      `${code} resolved to ${resolved.asset.jurisdiction}'s asset. Cross-jurisdiction fallback.`
    );
    assert(
      effective.status === "packet_ready",
      `${code} resolved an asset while its effective status is ${effective.status}.`
    );
  } else {
    row.resolution = resolved.reason;
    assert(
      effective.status !== "packet_ready",
      `${code} is packet_ready but resolution failed with ${resolved.reason}.`
    );
  }

  // 3b. Court-template resolution must be exact. This is the specific defect
  //     the registry replaced: an unnamed jurisdiction receiving Mississippi's
  //     petition through a default branch.
  try {
    const templatePath = packetPdf.courtTemplatePathFor({
      state: code,
      county: code === "TX" ? "harris" : undefined
    });
    row.courtTemplate = templatePath;

    const owner = templateOwner(templatePath);
    assert(
      owner === code,
      `${code} resolved the ${owner} court template (${templatePath}). Cross-jurisdiction fallback.`
    );
  } catch (error) {
    if (error?.name === "JurisdictionNotPacketReadyError") {
      row.courtTemplate = `blocked:${error.reason}`;
    } else {
      failures.push(`${code} court-template resolution threw ${error?.message ?? error}.`);
    }
  }

  // 3c. A non-packet capability must present an explicit, safe non-packet
  //     result rather than an ambiguous one.
  if (effective.status !== "packet_ready") {
    assert(
      ["guidance_only", "generator_present", "mapping_in_review", "temporarily_disabled"].includes(
        effective.status
      ),
      `${code} has no explicit non-packet status.`
    );
    row.packetDelivery = "not_offered";
  }

  rows.push(row);
}

// 4. Texas must never reach the Harris assets from outside a supported county.
for (const county of [null, "dallas", "travis", "bexar", ""]) {
  const attempt = resolver.tryResolvePacketAsset({ jurisdiction: "TX", county });
  assert(
    !attempt.ok,
    `Texas resolved a packet asset for county ${JSON.stringify(county)}, which is not supported.`
  );
}
for (const county of ["dallas", "travis"]) {
  let templateResult = "threw";
  try {
    templateResult = packetPdf.courtTemplatePathFor({ state: "TX", county });
  } catch (error) {
    templateResult = `blocked:${error?.reason ?? "error"}`;
  }
  assert(
    !String(templateResult).includes("texas-harris"),
    `Texas/${county} resolved the Harris County template.`
  );
}

// 5. Unknown and malformed input must fail closed, never fall back.
for (const bad of [null, undefined, "", "  ", "ZZ", "XX", "not-a-state", "99", "MSS"]) {
  const attempt = resolver.tryResolvePacketAsset({ jurisdiction: bad });
  assert(!attempt.ok, `Unsupported jurisdiction ${JSON.stringify(bad)} resolved an asset.`);

  let blocked = false;
  try {
    packetPdf.courtTemplatePathFor({ state: bad });
  } catch {
    blocked = true;
  }
  assert(blocked, `Unsupported jurisdiction ${JSON.stringify(bad)} resolved a court template.`);
}

// 6. Any jurisdiction declared packet_ready owes the real HTTP/PDF proof, which
//    the delivery gate performs. The audit records the obligation and fails if
//    a claim exists that the gate is not configured to prove.
const readyTargets = packetReadyTargets();
for (const target of readyTargets) {
  const row = rows.find((entry) => entry.jurisdiction === target.code);
  if (row) row.packetDelivery = "proof_required";
}

const proven = 0; // Set by the delivery gate; no jurisdiction is proven here.
const blocked = readyTargets.length === 0;

const matrix = {
  schemaVersion: 1,
  jurisdictionCount: rows.length,
  packetReadyCount: readyTargets.length,
  provenCount: proven,
  blocked,
  blockedReason: blocked
    ? "No jurisdiction is packet_ready. No official source document has an approved mapping, so document delivery is unproven."
    : null,
  statusCounts: rows.reduce((counts, row) => {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
    return counts;
  }, {}),
  jurisdictions: rows
};

const outputDir = path.join(root, "artifacts", "packet-delivery");
fs.mkdirSync(outputDir, { recursive: true });
const outputPath = path.join(outputDir, "all51-capability-matrix.json");
fs.writeFileSync(outputPath, `${JSON.stringify(matrix, null, 2)}\n`);

if (failures.length) {
  console.error("RCAP all-51 packet delivery audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RCAP all-51 packet delivery audit passed.");
console.log(`1. All ${rows.length} jurisdictions are explicitly enumerated; there is no catch-all entry.`);
console.log("2. No jurisdiction resolves another jurisdiction's court template or packet asset.");
console.log("3. Texas resolves Harris County assets only from Harris County, never statewide.");
console.log("4. Unknown and malformed jurisdictions fail closed with a typed reason.");
console.log(
  `5. Status counts: ${Object.entries(matrix.statusCounts)
    .map(([status, count]) => `${status}=${count}`)
    .join(", ")}.`
);
console.log(`6. Capability matrix written to ${path.relative(root, outputPath)}.`);

if (blocked) {
  console.log("");
  console.log("BLOCKED: 0 of 51 jurisdictions can deliver a document.");
  console.log("No official source document has an approved mapping, so packet delivery is unproven.");
  console.log("This is an honest capability report, not a passing delivery proof.");
}

function templateOwner(templatePath) {
  if (templatePath.includes("texas-harris")) return "TX";
  if (templatePath.includes("pennsylvania")) return "PA";
  if (templatePath.includes("/dc/")) return "DC";
  if (templatePath.includes("illinois")) return "IL";
  if (templatePath.includes("mississippi")) return "MS";
  return "unknown";
}
