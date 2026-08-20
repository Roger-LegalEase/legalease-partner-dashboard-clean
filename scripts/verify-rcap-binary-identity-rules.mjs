#!/usr/bin/env node
// Mutations for the binary-identity rules.
//
//   node scripts/verify-rcap-binary-identity-rules.mjs
//
// The ledger's rules only mean something if breaking each one changes the
// answer. These are synthetic groups — the real corpus does not contain a
// proven, fully repointed alias yet, and waiting for one before testing the
// rule that governs it would be testing nothing.
//
// Each case states the group, the rule under test, and the disposition the rule
// must produce. The last one is the positive control: a proven alias with every
// reference repointed DOES retire, because a rule set that never permits
// anything is a rule set nobody will follow.

import { resolveGroup } from "./rcap-official-forms/rcap-binary-identity-rules.mjs";

const DIGEST = "a".repeat(64);

const asset = (id, { refs = [], role = "PETITION", folder = "02_PACKET_FORMS", marker = null } = {}) => ({
  assetId: `XX|${id}|${DIGEST}`,
  jurisdiction: "XX",
  formNumber: id,
  documentRole: role,
  libraryFolder: folder,
  operationalReferenceCount: refs.length,
  surfaces: refs,
  retirementMarker: marker,
  determination: refs.length ? "retain_and_remediate" : "retirement_candidate"
});

const CASES = [
  {
    id: "un-repointed alias cannot retire",
    rule: 2,
    members: [asset("canonical", { refs: ["overlay_factory_manifest"] }), asset("alias")],
    expect: (r) => r.dispositions.find((d) => d.assetId.includes("alias")).disposition === "retained_until_repointed"
  },
  {
    id: "runtime-referenced alias cannot retire",
    rule: 3,
    members: [asset("canonical", { refs: ["overlay_factory_manifest"] }), asset("alias", { refs: ["application_source"] })],
    expect: (r) => r.dispositions.every((d) => d.disposition === "retained")
  },
  {
    id: "canonical cannot be removed while an alias depends on it",
    rule: 3,
    members: [asset("canonical", { refs: ["application_source"] }), asset("alias")],
    expect: (r) => r.dispositions.find((d) => d.assetId.includes("canonical")).disposition === "retained"
  },
  {
    id: "same digest does not collapse distinct roles",
    rule: 4,
    members: [
      asset("petition", { refs: ["overlay_factory_manifest"], role: "PETITION", folder: "02_PACKET_FORMS" }),
      asset("gated", { role: "SOURCE-GATED", folder: "05_SOURCE_GATED" })
    ],
    expect: (r) => r.relationship === "distinct_operational_roles"
  },
  {
    id: "a proven alias with every reference repointed CAN retire",
    rule: 2,
    members: [asset("canonical", { refs: ["overlay_factory_manifest"] }), asset("alias", { marker: "repointed" })],
    repointed: true,
    expect: (r) => r.dispositions.find((d) => d.assetId.includes("alias")).disposition === "retired_alias_repointed"
  },
  {
    id: "an unproven conflicted group stays retained whole",
    rule: 5,
    members: [
      asset("one", { refs: ["overlay_factory_manifest"], role: null, folder: null }),
      asset("two", { refs: ["application_source"], role: null, folder: null })
    ],
    expect: (r) => r.relationship === "unproven" || r.dispositions.every((d) => d.disposition === "retained")
  }
];

const failures = [];
for (const testCase of CASES) {
  const result = resolveGroup({ digest: DIGEST, members: testCase.members, repointProven: testCase.repointed === true });
  const passed = testCase.expect(result);
  console.log(`  ${passed ? "ok  " : "FAIL"} rule ${testCase.rule}: ${testCase.id}`);
  if (!passed) {
    failures.push(`${testCase.id} — got ${result.relationship} / ${result.dispositions.map((d) => `${d.assetId.split("|")[1]}=${d.disposition}`).join(", ")}`);
  }
}

if (failures.length) {
  console.error(`FAIL binary identity rules — ${failures.length} case(s)`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`OK binary identity rules — ${CASES.length} cases, including the positive control that lets a fully repointed alias retire`);
