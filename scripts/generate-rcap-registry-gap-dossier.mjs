#!/usr/bin/env node
// Registry-gap dossier: the 41 compiled pathways with no registry track.
//
//   node scripts/generate-rcap-registry-gap-dossier.mjs
//   node scripts/generate-rcap-registry-gap-dossier.mjs --check
//
// Session A's canonical graph disposes 41 intended-paid pathways as
// family_bridge_missing_no_track: no registry track maps to them, so no
// track-keyed packet set can be reached and no track-level adoption applies.
//
// A pathway with no track is a gap in the registry, not an absence of product
// intent. Every one of them stays in the intended-paid denominator. This dossier
// gives each one what it can be given without a track:
//
//   * the compiled pathway preserved verbatim, so nothing is lost if the
//     registry is rebuilt around it;
//   * its PATHWAY-LEVEL packet set, read from the compiled packetGenerator
//     rather than from a track;
//   * the legal-design evidence that already covers its jurisdiction;
//   * the exact action the registry owner has to take, named per pathway.
//
// It creates no denominator, drops nothing, and changes no runtime.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);

const CHECK = process.argv.includes("--check");
const SESSION_A_COMMIT = process.env.RCAP_SESSION_A_COMMIT ?? "a28ad8c1c41685eb68f42325ce694679d5db53dd";
const GRAPH_PATH = "data/rcap-ledger/paid-pathway-legal-join.json";
const ADOPTION_PATH = "data/record-clearing/template-families/EXT-ADOPT-01-standing-external-counsel-adoption.json";

const JSON_OUT = "data/rcap-ledger/registry-gap-dossier.json";
const MD_OUT = "docs/record-clearing/registry-gap-dossier.md";

const read = (p) => fs.readFileSync(path.join(rootDir, p), "utf8");
const sha256 = (v) => crypto.createHash("sha256").update(v).digest("hex");
const git = (args) => execFileSync("git", args, { cwd: rootDir, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
const sessionA = (p) => (fs.existsSync(path.join(rootDir, p)) ? read(p) : git(["show", `${SESSION_A_COMMIT}:${p}`]));

const graphRaw = sessionA(GRAPH_PATH);
const graph = JSON.parse(graphRaw);
const adoptionRaw = sessionA(ADOPTION_PATH);
const adoption = JSON.parse(adoptionRaw);
const boundByJurisdiction = new Map();
for (const family of adoption.boundFamilies ?? []) {
  if (!boundByJurisdiction.has(family.jurisdiction)) boundByJurisdiction.set(family.jurisdiction, []);
  boundByJurisdiction.get(family.jurisdiction).push(family);
}

const profilesDir = "src/lib/rcap-engine/compiled/profiles";
const profileByCode = new Map();
for (const file of fs.readdirSync(path.join(rootDir, profilesDir))) {
  if (!file.endsWith(".json")) continue;
  const profile = JSON.parse(read(`${profilesDir}/${file}`));
  profileByCode.set(profile.jurisdiction.code, profile);
}

const gaps = graph.pathways.filter((p) => p.disposition === "family_bridge_missing_no_track");

const records = gaps.map((pathway) => {
  const profile = profileByCode.get(pathway.jurisdiction);
  const compiled = profile?.pathways.find((p) => p.id === pathway.pathwayId) ?? null;
  const plan = profile?.packetGenerator?.pathways?.find((p) => p.pathwayId === pathway.pathwayId) ?? null;
  const bound = boundByJurisdiction.get(pathway.jurisdiction) ?? [];
  const rules = (profile?.orderedDecisionRules ?? []).filter((r) => (r.candidatePathwayIds ?? []).includes(pathway.pathwayId));

  return {
    pathwayKey: pathway.pathwayKey,
    jurisdiction: pathway.jurisdiction,
    pathwayId: pathway.pathwayId,
    pathwayLabel: pathway.pathwayLabel,
    sessionADisposition: pathway.disposition,
    stillInIntendedPaidDenominator: true,

    compiledPathwayPreserved: compiled
      ? {
        id: compiled.id,
        label: compiled.label,
        summary: compiled.summary,
        sourceRef: compiled.sourceRef,
        routeType: compiled.routeType ?? null,
        suggestedResultCode: compiled.suggestedResultCode ?? null,
        lawrenceRatification: compiled.lawrenceRatification ?? null,
        sourceEvidenceRefs: compiled.sourceEvidenceRefs ?? []
      }
      : null,

    // A pathway with no track still has a packet set — it is just declared at
    // the pathway level in the compiled packetGenerator rather than keyed by a
    // track in the registry manifest.
    pathwayLevelPacketSet: plan
      ? {
        source: `${profilesDir}/${pathway.jurisdiction}-*.json:packetGenerator.pathways[pathwayId=${pathway.pathwayId}]`,
        mode: plan.mode,
        formMappingStatus: plan.formMappingStatus,
        sourceFormCandidates: (plan.formCandidates ?? []).map((c) => ({ fileName: c.fileName, relativePath: c.relativePath, sha256: c.sha256 })),
        requiredInputIds: plan.requiredInputIds ?? [],
        sourceRuleRefs: plan.sourceRuleRefs ?? []
      }
      : null,

    legalDesignEvidence: {
      jurisdictionBoundInAdoption: bound.length > 0,
      adoptionRecordId: adoption.recordId,
      adoptionRecordSha256: sha256(adoptionRaw),
      adoptedOn: adoption.adoptedOn,
      boundFamiliesInJurisdiction: bound.map((f) => ({
        familyJobId: f.familyJobId,
        legalDesignMemoPath: f.legalDesignMemoPath,
        legalDesignMemoSha256: f.legalDesignMemoSha256,
        packetProofSha256: f.packetProofSha256
      })),
      compiledDecisionRules: rules.map((r) => ({ id: r.id, priority: r.priority, sourceRef: r.sourceRef })),
      counselRatification: compiled?.lawrenceRatification ?? null
    },

    exactFutureRegistryOwnerAction: {
      owner: "registry owner (track-to-pathway crosswalk)",
      action: `Create a registry track for ${pathway.jurisdiction} ${pathway.pathwayId} and map it to this compiled pathway id in the track-to-pathway crosswalk, then give it a packet set in data/record-clearing/legal-design-packet-set-manifests.json keyed by that track.`,
      whyItIsNotSomethingThisLaneCanDo: "Minting a registry track is an authority decision about what the registry contains. Inventing one here would put a track in the denominator that no source inventory produced.",
      whatUnblocksWhenDone: [
        "the pathway becomes bridgeable to a packet family instead of family_bridge_missing_no_track",
        "track-level counsel adoption can reach it rather than family-level inference",
        "a composed route or official-form package can be attached to it"
      ],
      doNotDoInstead: "Do not drop the pathway from the intended-paid denominator to clear the disposition. The absence of a registry track is a registry gap, not evidence that LegalEase does not intend to sell this route."
    }
  };
});

const withPacketSet = records.filter((r) => r.pathwayLevelPacketSet !== null);
const withAdoption = records.filter((r) => r.legalDesignEvidence.jurisdictionBoundInAdoption);
const withRatification = records.filter((r) => r.legalDesignEvidence.counselRatification);
const tally = (list, fn) => list.reduce((m, x) => { const k = fn(x); m[k] = (m[k] ?? 0) + 1; return m; }, {});

const dossier = {
  schemaVersion: "rcap-registry-gap-dossier/v1",
  generatedBy: "scripts/generate-rcap-registry-gap-dossier.mjs",
  canonicalGraph: { path: GRAPH_PATH, sha256: sha256(graphRaw), pathways: graph.pathways.length },
  createsNoDenominator: "Every pathway here stays in Session A's intended-paid denominator. Nothing is dropped, reclassified or invented.",
  changesNoRuntime: true,
  totals: {
    registryGapPathways: records.length,
    withAPathwayLevelPacketSet: withPacketSet.length,
    withoutAPathwayLevelPacketSet: records.length - withPacketSet.length,
    inAJurisdictionBoundByTheAdoption: withAdoption.length,
    carryingACounselRatification: withRatification.length,
    byJurisdiction: tally(records, (r) => r.jurisdiction),
    packetPlanModes: tally(withPacketSet, (r) => r.pathwayLevelPacketSet.mode)
  },
  records
};

function md() {
  const l = [];
  l.push("# Registry-gap dossier");
  l.push("");
  l.push(`The **${records.length}** compiled pathways Session A's graph disposes as`);
  l.push("`family_bridge_missing_no_track`. No registry track maps to them, so no track-keyed packet");
  l.push("set can be reached and no track-level adoption applies.");
  l.push("");
  l.push("**Every one stays in the intended-paid denominator.** A pathway with no track is a gap in");
  l.push("the registry, not evidence that LegalEase does not intend to sell the route.");
  l.push("");
  l.push("| | |");
  l.push("|---|---|");
  l.push(`| Registry-gap pathways | ${records.length} |`);
  l.push(`| With a pathway-level packet set | ${withPacketSet.length} |`);
  l.push(`| In a jurisdiction bound by EXT-ADOPT-01 | ${withAdoption.length} |`);
  l.push(`| Carrying a counsel ratification | ${withRatification.length} |`);
  l.push("");
  l.push("## What each record carries");
  l.push("");
  l.push("- **The compiled pathway, preserved verbatim** — id, label, summary, source ref, route type,");
  l.push("  counsel ratification — so nothing is lost if the registry is rebuilt around it.");
  l.push("- **Its pathway-level packet set**, read from the compiled `packetGenerator` rather than from");
  l.push("  a track: mode, form-mapping status, source form candidates with hashes, required inputs,");
  l.push("  source rule refs.");
  l.push("- **The legal-design evidence** already covering its jurisdiction: the adoption record and");
  l.push("  hash, the bound families with their memo and proof hashes, and the compiled decision rules");
  l.push("  that name the pathway.");
  l.push("- **The exact future registry-owner action**, and what unblocks when it lands.");
  l.push("");
  l.push("## Packet plan modes");
  l.push("");
  l.push("| Mode | Pathways |");
  l.push("|---|---|");
  for (const [k, v] of Object.entries(dossier.totals.packetPlanModes).sort((a, b) => b[1] - a[1])) l.push(`| \`${k}\` | ${v} |`);
  l.push("");
  l.push("## By jurisdiction");
  l.push("");
  l.push("| Jurisdiction | Pathways |");
  l.push("|---|---|");
  for (const [k, v] of Object.entries(dossier.totals.byJurisdiction).sort()) l.push(`| ${k} | ${v} |`);
  l.push("");
  l.push("Regenerate with `node scripts/generate-rcap-registry-gap-dossier.mjs`.");
  return l.join("\n") + "\n";
}

const jsonText = JSON.stringify(dossier, null, 2) + "\n";
const mdText = md();

if (CHECK) {
  const problems = [];
  if (read(JSON_OUT) !== jsonText) problems.push(`${JSON_OUT} is stale.`);
  if (read(MD_OUT) !== mdText) problems.push(`${MD_OUT} is stale.`);
  if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
  console.log(`registry-gap dossier current: ${records.length} pathway(s).`);
  process.exit(0);
}

fs.writeFileSync(path.join(rootDir, JSON_OUT), jsonText);
fs.writeFileSync(path.join(rootDir, MD_OUT), mdText);
console.log(`wrote ${JSON_OUT} and ${MD_OUT}`);
console.log(`  ${records.length} registry-gap pathways; ${withPacketSet.length} with a pathway-level packet set; ${withAdoption.length} in a bound jurisdiction; ${withRatification.length} counsel-ratified`);
