/**
 * Focused contract verifier for template-family hash inheritance.
 *
 * It hashes the registered in-repository template objects and mapping objects
 * only. It never opens an official source binary or the external Master Library
 * archive, so source availability cannot be confused with this mechanical
 * foundation.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import { register } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const [
  templateHash,
  { PLEADING_TEMPLATES },
  { GUIDANCE_TEMPLATES },
  { RELIEF_TRACKS },
  capability,
] = await Promise.all([
  import("../src/lib/rcap/packets/template-hash.ts"),
  import("../src/lib/rcap/packets/engines/pleading-templates.ts"),
  import("../src/lib/rcap/packets/engines/process-guidance.ts"),
  import("../src/lib/rcap/packets/registry.ts"),
  import("../src/lib/rcap/jurisdictions/packet-capability.ts"),
]);

const failures = [];
let checks = 0;

function check(name, fn) {
  try {
    fn();
    checks += 1;
  } catch (error) {
    failures.push(
      `${name}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

const registeredEntries = [
  ...Object.entries(PLEADING_TEMPLATES).map(([templateId, value]) => ({
    templateId,
    kind: "custom_pleading",
    value,
  })),
  ...Object.entries(GUIDANCE_TEMPLATES).map(([templateId, value]) => ({
    templateId,
    kind: "process_guidance",
    value,
  })),
].sort((left, right) => left.templateId.localeCompare(right.templateId));
const registeredIds = registeredEntries.map(({ templateId }) => templateId);
const registeredIdSet = new Set(registeredIds);
const records = templateHash.registeredTemplateHashRecords();
const recordById = new Map(
  records.map((record) => [record.templateId, record]),
);

// --- Canonical serialization and hashing -----------------------------------

check("canonical JSON has a fixed test vector", () => {
  const value = { z: [3, { b: true, a: "x" }], a: null };
  assert.equal(
    templateHash.canonicalJson(value),
    '{"a":null,"z":[3,{"a":"x","b":true}]}',
  );
  assert.equal(
    templateHash.canonicalJsonSha256(value),
    "f39f20b5b275a590ffdbf04446b233ed928b40757f744e70a5e1c0a385aa83f9",
  );
});

check("object-key order does not change a hash", () => {
  assert.equal(
    templateHash.canonicalJsonSha256({
      second: { z: 2, a: 1 },
      first: ["a", "b"],
    }),
    templateHash.canonicalJsonSha256({
      first: ["a", "b"],
      second: { a: 1, z: 2 },
    }),
  );
});

check("array order and authored values do change a hash", () => {
  const baseline = templateHash.canonicalJsonSha256({
    title: "Petition",
    sections: ["first", "second"],
  });
  assert.notEqual(
    baseline,
    templateHash.canonicalJsonSha256({
      title: "Petition",
      sections: ["second", "first"],
    }),
  );
  assert.notEqual(
    baseline,
    templateHash.canonicalJsonSha256({
      title: "Changed petition",
      sections: ["first", "second"],
    }),
  );
});

check("lossy and non-deterministic values are rejected", () => {
  const cyclic = {};
  cyclic.self = cyclic;
  const sparse = [];
  sparse[1] = "value";
  const invalid = [
    undefined,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    () => null,
    Symbol("x"),
    1n,
    new Date("2026-01-01T00:00:00Z"),
    cyclic,
    sparse,
  ];
  for (const value of invalid) {
    assert.throws(
      () => templateHash.canonicalJson(value),
      (error) => error?.code === "non_canonical_value",
    );
  }
});

check(
  "canonical hashing rejects array accessors without evaluating them",
  () => {
    let getterCalls = 0;
    const accessorArray = ["placeholder"];
    Object.defineProperty(accessorArray, "0", {
      configurable: true,
      enumerable: true,
      get() {
        getterCalls += 1;
        return "unstable";
      },
    });
    assert.throws(
      () => templateHash.canonicalJson(accessorArray),
      (error) => error?.code === "non_canonical_value",
    );
    assert.equal(getterCalls, 0);

    const hiddenArray = ["hidden"];
    Object.defineProperty(hiddenArray, "0", {
      configurable: true,
      enumerable: false,
      value: "hidden",
    });
    assert.throws(
      () => templateHash.canonicalJson(hiddenArray),
      (error) => error?.code === "non_canonical_value",
    );
  },
);

check("mapping objects use the same strict canonical contract", () => {
  assert.equal(
    templateHash.canonicalMappingSha256([
      { fieldKey: "name", pdfFieldName: "Name", kind: "text" },
      { fieldKey: "case", pdfFieldName: "Case Number", kind: "text" },
    ]),
    templateHash.canonicalMappingSha256([
      { kind: "text", pdfFieldName: "Name", fieldKey: "name" },
      { pdfFieldName: "Case Number", fieldKey: "case", kind: "text" },
    ]),
  );
});

// --- Static template registry ----------------------------------------------

check(
  "template IDs are globally unique across the two static registries",
  () => {
    assert.equal(registeredIdSet.size, registeredIds.length);
  },
);

check("registry keys equal each template object's own ID", () => {
  for (const { templateId, value } of registeredEntries) {
    assert.equal(value.templateId, templateId, templateId);
    assert.equal(typeof value.version, "string", templateId);
    assert.ok(value.version.length > 0, templateId);
  }
});

check(
  "the hash catalog exactly covers every registered static template",
  () => {
    assert.deepEqual(
      records.map(({ templateId }) => templateId),
      [...registeredIds].sort(),
    );
    assert.equal(recordById.size, registeredIds.length);
  },
);

check("each template hash is deterministic and hashes only its object", () => {
  for (const { templateId, kind, value } of registeredEntries) {
    const record = recordById.get(templateId);
    assert.ok(record, templateId);
    assert.equal(record.templateKind, kind, templateId);
    assert.match(record.sha256, /^[0-9a-f]{64}$/, templateId);
    assert.equal(
      record.sha256,
      templateHash.canonicalTemplateHash(templateId),
      templateId,
    );
    assert.equal(
      record.sha256,
      templateHash.canonicalJsonSha256(value),
      templateId,
    );
    assert.equal(
      templateHash.templateHashMatches(templateId, record.sha256),
      true,
      templateId,
    );
    templateHash.assertTemplateHashMatches(templateId, record.sha256);
  }
});

check(
  "an unrelated template object cannot change another template's hash",
  () => {
    assert.ok(registeredEntries.length >= 2);
    const target = registeredEntries[0];
    const unrelated = registeredEntries[1];
    const before = templateHash.canonicalTemplateHash(target.templateId);
    const alteredUnrelated = {
      ...JSON.parse(JSON.stringify(unrelated.value)),
      version: `${unrelated.value.version}-changed`,
    };
    assert.notEqual(
      templateHash.canonicalJsonSha256(unrelated.value),
      templateHash.canonicalJsonSha256(alteredUnrelated),
    );
    assert.equal(templateHash.canonicalTemplateHash(target.templateId), before);
  },
);

check("unknown, malformed and drifted template claims fail closed", () => {
  for (const templateId of ["", " leading-space", "missing-template"]) {
    assert.throws(() => templateHash.canonicalTemplateHash(templateId));
  }
  const known = records[0];
  assert.equal(
    templateHash.templateHashMatches(known.templateId, "0".repeat(64)),
    false,
  );
  assert.equal(
    templateHash.templateHashMatches(
      known.templateId,
      known.sha256.toUpperCase(),
    ),
    false,
  );
  assert.equal(
    templateHash.templateHashMatches("missing-template", known.sha256),
    false,
  );
  assert.throws(
    () =>
      templateHash.assertTemplateHashMatches(known.templateId, "0".repeat(64)),
    (error) => error?.code === "template_hash_mismatch",
  );
});

// --- Runtime component coverage --------------------------------------------

const staticTemplateUses = new Set();
const explicitDynamicFixtureUses = [];
const runtimeTemplateClaims = [];

for (const track of RELIEF_TRACKS) {
  for (const component of track.packetSet.components) {
    if (!component.templateId) continue;
    if (registeredIdSet.has(component.templateId)) {
      staticTemplateUses.add(component.templateId);
      if (Object.prototype.hasOwnProperty.call(component, "templateSha256")) {
        runtimeTemplateClaims.push({
          trackId: track.trackId,
          componentId: component.componentId,
          templateId: component.templateId,
          sha256: component.templateSha256,
        });
      }
      if (component.approval.legal === "legal_approved") {
        assert.match(
          component.templateSha256 ?? "",
          /^[0-9a-f]{64}$/,
          `${track.trackId}/${component.componentId} is legally approved without a template pin`,
        );
      }
      continue;
    }
    explicitDynamicFixtureUses.push({ track, component });
  }
}

check("every registered static template is used by a runtime component", () => {
  assert.deepEqual([...staticTemplateUses].sort(), [...registeredIdSet].sort());
});

check(
  "the only dynamic template is the non-adoptable technical instructions fixture",
  () => {
    assert.ok(explicitDynamicFixtureUses.length > 0);
    for (const { track, component } of explicitDynamicFixtureUses) {
      assert.equal(component.templateId, "technical-fixture-instructions");
      assert.equal(track.technicalFixture, true);
      assert.equal(track.runtimeDisabled, true);
      assert.equal(component.rendererStrategy, "process_guidance");
    }
  },
);

check("every authored runtime template-hash claim is recomputed", () => {
  for (const claim of runtimeTemplateClaims) {
    assert.equal(
      templateHash.templateHashMatches(claim.templateId, claim.sha256),
      true,
      `${claim.trackId}/${claim.componentId}`,
    );
  }
});

// --- Canonical normalized-track inputs -------------------------------------

const normalizedRegistry = readJson(
  "data/record-clearing/legal-design-track-registry.json",
);
const packetSetRegistry = readJson(
  "data/record-clearing/legal-design-packet-set-manifests.json",
);
const normalizedTrackIds = normalizedRegistry.tracks.map(
  ({ trackId }) => trackId,
);
const packetSetTrackIds = packetSetRegistry.packetSets.map(
  ({ trackId }) => trackId,
);
const normalizedTrackIdSet = new Set(normalizedTrackIds);

check("the two canonical inputs still describe the same 250 tracks", () => {
  assert.equal(normalizedTrackIds.length, 250);
  assert.equal(normalizedTrackIdSet.size, 250);
  assert.equal(packetSetTrackIds.length, 250);
  assert.equal(new Set(packetSetTrackIds).size, 250);
  assert.deepEqual(
    [...normalizedTrackIds].sort(),
    [...packetSetTrackIds].sort(),
  );
});

const implementedNormalizedTracks = RELIEF_TRACKS.filter((track) =>
  normalizedTrackIdSet.has(track.trackId),
);

check(
  "every implemented normalized track uses only covered static templates",
  () => {
    assert.ok(implementedNormalizedTracks.length > 0);
    for (const track of implementedNormalizedTracks) {
      for (const component of track.packetSet.components) {
        if (!component.templateId) continue;
        assert.ok(
          registeredIdSet.has(component.templateId),
          `${track.trackId}/${component.componentId} uses unhashable template ${component.templateId}`,
        );
        assert.match(
          templateHash.canonicalTemplateHash(component.templateId),
          /^[0-9a-f]{64}$/,
        );
      }
    }
  },
);

// --- Family inheritance -----------------------------------------------------

const primaryTemplate = records[0];
const secondaryTemplate = records[1];
const sourcePin = { id: "official-source-a", sha256: "a".repeat(64) };
const mappingObject = [
  { fieldKey: "participantName", pdfFieldName: "Name", kind: "text" },
];
const mappingPin = {
  id: "mapping-a",
  sha256: templateHash.canonicalMappingSha256(mappingObject),
};
const coveredException = {
  exceptionId: "counsel-covered-exception",
  classification: "legal_design_blocker",
  content: {
    question: "Which branch controls?",
    affectedElement: "eligibility_branch",
  },
};
const adoptedFamily = {
  schemaVersion: templateHash.TEMPLATE_FAMILY_SCHEMA_VERSION,
  familyId: "synthetic-family",
  templates: [
    { id: primaryTemplate.templateId, sha256: primaryTemplate.sha256 },
    { id: secondaryTemplate.templateId, sha256: secondaryTemplate.sha256 },
  ],
  sources: [sourcePin],
  mappings: [mappingPin],
  components: [
    {
      componentId: "primary-filing",
      order: 1,
      role: "primary_filing",
      requirement: "required",
      conditionKey: null,
      outputStrategy: primaryTemplate.templateKind,
      rendererStrategy: primaryTemplate.templateKind,
      templateId: primaryTemplate.templateId,
      sourceId: null,
      mappingId: null,
    },
    {
      componentId: "instructions",
      order: 2,
      role: "instructions",
      requirement: "required",
      conditionKey: null,
      outputStrategy: secondaryTemplate.templateKind,
      rendererStrategy: secondaryTemplate.templateKind,
      templateId: secondaryTemplate.templateId,
      sourceId: null,
      mappingId: null,
    },
    {
      componentId: "official-form",
      order: 3,
      role: "official_form",
      requirement: "conditional",
      conditionKey: "includeOfficialForm",
      outputStrategy: "official_pdf_fill",
      rendererStrategy: "acroform_fill",
      templateId: null,
      sourceId: "official-source-a",
      mappingId: "mapping-a",
    },
  ],
  branchVariants: ["default", "alternate"],
  authorityArchiveSha256: "b".repeat(64),
  controllingReviewSha256: "c".repeat(64),
  coveredExceptions: [
    {
      id: coveredException.exceptionId,
      sha256: templateHash.canonicalJsonSha256(coveredException),
    },
  ],
};
const coveredCandidate = {
  schemaVersion: templateHash.TEMPLATE_FAMILY_SCHEMA_VERSION,
  familyId: adoptedFamily.familyId,
  templates: adoptedFamily.templates,
  sources: adoptedFamily.sources,
  mappings: adoptedFamily.mappings,
  components: adoptedFamily.components,
  branchVariants: ["default"],
  authorityArchiveSha256: adoptedFamily.authorityArchiveSha256,
  controllingReviewSha256: adoptedFamily.controllingReviewSha256,
  exceptions: [
    coveredException,
    {
      exceptionId: "participant-supplied-answer",
      classification: "participant_question",
      content: {
        questionKey: "hasDisposition",
        packetBehavior: "select applicable branch",
      },
    },
  ],
  releaseBlockers: [],
};
const observedFamily = {
  sources: adoptedFamily.sources,
  mappings: adoptedFamily.mappings,
};

check("an exact family with a branch subset inherits coverage", () => {
  assert.deepEqual(
    templateHash.verifyTemplateFamilyCoverage(
      adoptedFamily,
      coveredCandidate,
      observedFamily,
    ),
    {
      covered: true,
      familyId: adoptedFamily.familyId,
      deltas: [],
    },
  );
});

function expectDelta(name, mutate, expectedCode) {
  check(name, () => {
    const candidate = mutate(JSON.parse(JSON.stringify(coveredCandidate)));
    const result = templateHash.verifyTemplateFamilyCoverage(
      adoptedFamily,
      candidate,
      observedFamily,
    );
    assert.equal(result.covered, false);
    assert.ok(
      result.deltas.some(({ code }) => code === expectedCode),
      `expected ${expectedCode}; got ${result.deltas.map(({ code }) => code).join(", ")}`,
    );
  });
}

function expectObservedDelta(name, mutate, expectedCode) {
  check(name, () => {
    const observed = mutate(JSON.parse(JSON.stringify(observedFamily)));
    const result = templateHash.verifyTemplateFamilyCoverage(
      adoptedFamily,
      coveredCandidate,
      observed,
    );
    assert.equal(result.covered, false);
    assert.ok(
      result.deltas.some(({ code }) => code === expectedCode),
      `expected ${expectedCode}; got ${result.deltas.map(({ code }) => code).join(", ")}`,
    );
  });
}

expectDelta(
  "template drift creates a named delta",
  (candidate) => {
    candidate.templates[0].sha256 = "d".repeat(64);
    return candidate;
  },
  "hash_mismatch",
);
expectDelta(
  "a template pin that differs from its current object fails coverage",
  (candidate) => {
    candidate.templates[0].sha256 = "d".repeat(64);
    return candidate;
  },
  "current_template_hash_mismatch",
);
expectDelta(
  "source drift creates a named delta",
  (candidate) => {
    candidate.sources[0].sha256 = "d".repeat(64);
    return candidate;
  },
  "hash_mismatch",
);
expectObservedDelta(
  "current official-source drift creates a named delta",
  (observed) => {
    observed.sources[0].sha256 = "d".repeat(64);
    return observed;
  },
  "current_source_hash_mismatch",
);
expectDelta(
  "mapping drift creates a named delta",
  (candidate) => {
    candidate.mappings[0].sha256 = "d".repeat(64);
    return candidate;
  },
  "hash_mismatch",
);
expectObservedDelta(
  "current mapping drift creates a named delta",
  (observed) => {
    observed.mappings[0].sha256 = "d".repeat(64);
    return observed;
  },
  "current_mapping_hash_mismatch",
);
expectDelta(
  "a missing pin creates a named delta",
  (candidate) => {
    candidate.templates.pop();
    return candidate;
  },
  "missing_hash_pin",
);
expectDelta(
  "an extra pin creates a named delta",
  (candidate) => {
    candidate.sources.push({ id: "unexpected-source", sha256: "e".repeat(64) });
    return candidate;
  },
  "extra_hash_pin",
);
expectDelta(
  "duplicate pin identities fail closed",
  (candidate) => {
    candidate.mappings.push({ ...candidate.mappings[0] });
    return candidate;
  },
  "duplicate_hash_pin",
);
expectDelta(
  "a component cannot reference an unpinned source",
  (candidate) => {
    candidate.components[2].sourceId = "not-pinned";
    return candidate;
  },
  "unpinned_component_reference",
);
expectDelta(
  "every family pin must be consumed by the component closure",
  (candidate) => {
    candidate.components.pop();
    return candidate;
  },
  "unconsumed_hash_pin",
);
expectDelta(
  "malformed conditional component shape fails closed",
  (candidate) => {
    candidate.components[2].conditionKey = null;
    return candidate;
  },
  "invalid_component_shape",
);
expectDelta(
  "ordered component-shape drift fails coverage",
  (candidate) => {
    candidate.components.reverse();
    return candidate;
  },
  "component_shape_mismatch",
);
expectDelta(
  "a branch outside the adopted space fails coverage",
  (candidate) => {
    candidate.branchVariants.push("not-adopted");
    return candidate;
  },
  "branch_variant_not_adopted",
);
expectDelta(
  "authority archive drift fails coverage",
  (candidate) => {
    candidate.authorityArchiveSha256 = "d".repeat(64);
    return candidate;
  },
  "authority_archive_hash_mismatch",
);
expectDelta(
  "controlling-review drift fails coverage",
  (candidate) => {
    candidate.controllingReviewSha256 = "d".repeat(64);
    return candidate;
  },
  "controlling_review_hash_mismatch",
);
expectDelta(
  "covered exception content drift requires delta review",
  (candidate) => {
    candidate.exceptions[0].content.question = "Changed controlling question";
    return candidate;
  },
  "covered_exception_hash_mismatch",
);
expectDelta(
  "an uncovered legal-design blocker fails coverage",
  (candidate) => {
    candidate.exceptions.push({
      exceptionId: "new-withholding-exception",
      classification: "legal_design_blocker",
      content: {
        question: "Which output strategy controls?",
      },
    });
    return candidate;
  },
  "uncovered_legal_design_blocker",
);
expectDelta(
  "an open release blocker fails coverage",
  (candidate) => {
    candidate.releaseBlockers.push("Source permission remains open.");
    return candidate;
  },
  "release_blocker_open",
);

check(
  "mapping approval is pinned to the exact canonical mapping object",
  () => {
    assert.doesNotThrow(() =>
      templateHash.assertMappingApprovalPinned(
        { mappingApproved: false },
        null,
      ),
    );
    assert.doesNotThrow(() =>
      templateHash.assertMappingApprovalPinned(
        {
          mappingApproved: true,
          mappingSha256: mappingPin.sha256,
        },
        mappingObject,
      ),
    );
    assert.throws(
      () =>
        templateHash.assertMappingApprovalPinned(
          { mappingApproved: true },
          mappingObject,
        ),
      (error) => error?.code === "mapping_hash_missing",
    );
    assert.throws(
      () =>
        templateHash.assertMappingApprovalPinned(
          {
            mappingApproved: false,
            mappingSha256: mappingPin.sha256,
          },
          [...mappingObject, { fieldKey: "caseNumber", kind: "text" }],
        ),
      (error) => error?.code === "mapping_hash_mismatch",
    );
  },
);

// --- Capability mapping pins ------------------------------------------------

const capabilityAssets = capability.PACKET_CAPABILITIES.flatMap((entry) => [
  ...entry.assets.map((asset) => ({ jurisdiction: entry.code, asset })),
  ...entry.counties.flatMap((county) =>
    county.assets.map((asset) => ({
      jurisdiction: `${entry.code}/${county.countyKey}`,
      asset,
    })),
  ),
]);
let mappingClaimsVerified = 0;
const verifiedMappingAssets = new Set();

check("every capability mapping claim is pinned and recomputed", () => {
  for (const { jurisdiction, asset } of capabilityAssets) {
    const mappingSha256 = asset.mappingSha256;
    if (mappingSha256 === undefined || mappingSha256 === null) {
      assert.doesNotThrow(
        () => templateHash.assertMappingApprovalPinned(asset, null),
        `${jurisdiction}/${asset.formId}`,
      );
      continue;
    }
    const mappingPath = repositoryFile(asset.mappingPath);
    const mapping = JSON.parse(fs.readFileSync(mappingPath, "utf8"));
    assert.doesNotThrow(
      () => templateHash.assertMappingApprovalPinned(asset, mapping),
      `${jurisdiction}/${asset.formId}`,
    );
    verifiedMappingAssets.add(asset);
    mappingClaimsVerified += 1;
  }
});

check("every packet-ready target depends on a verified mapping pin", () => {
  capability.assertRegistryIntegrity();
  for (const target of capability.packetReadyTargets()) {
    const approved = capability.approvedAssets({
      jurisdiction: target.code,
      county: target.county,
    });
    assert.ok(
      approved.length > 0,
      `${target.code}/${target.county ?? "statewide"}`,
    );
    for (const asset of approved) {
      assert.ok(
        verifiedMappingAssets.has(asset),
        `${target.code}/${target.county ?? "statewide"}/${asset.formId}`,
      );
    }
  }
});

if (failures.length > 0) {
  console.error("RCAP template-family coverage verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RCAP template-family coverage verification passed.");
console.log(
  `1. ${checks} contract checks; ${records.length} static template objects hashed independently.`,
);
console.log(
  `2. ${implementedNormalizedTracks.length} implemented normalized tracks use only hashable static templates.`,
);
console.log(
  `3. ${runtimeTemplateClaims.length} template claims and ${mappingClaimsVerified} mapping claims recomputed; no drift.`,
);
console.log(
  "4. Family inheritance fails on template/source/mapping drift, shape drift, branch expansion, authority drift, uncovered legal-design blockers and release blockers.",
);
console.log(
  "5. No official source binary or external Master Library archive was read.",
);

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), "utf8"));
}

function repositoryFile(relativePath) {
  const absolutePath = path.resolve(rootDir, relativePath);
  const relative = path.relative(rootDir, absolutePath);
  assert.ok(
    relative && !relative.startsWith("..") && !path.isAbsolute(relative),
    `${relativePath} escapes the repository`,
  );
  assert.equal(fs.statSync(absolutePath).isFile(), true, relativePath);
  const realPath = fs.realpathSync(absolutePath);
  const realRelative = path.relative(rootDir, realPath);
  assert.ok(
    realRelative &&
      !realRelative.startsWith("..") &&
      !path.isAbsolute(realRelative),
    `${relativePath} resolves outside the repository`,
  );
  return absolutePath;
}
