#!/usr/bin/env node
// Byte-preservation proof for the Lane D shared-renderer patch request.
//
//   node scripts/verify-nd-shared-renderer-byte-preservation.mjs
//
// Lane D asks the captain to accept two optional presentation fields on
// `src/lib/record-clearing/renderers/custom-pleading-renderer.ts`:
// `reliefClauses` and `proposedOrderClauses`. The claim attached to that
// request is that a configuration which does not supply them renders exactly
// what it rendered before.
//
// This proves the claim rather than asserting it. It loads BOTH renderers in
// one process — the unmodified one, read out of the base commit with
// `git show`, and the patched one from the working tree — renders every
// existing pleading configuration in the repository through each, and compares
// SHA-256 of the full text, of every section, and of the attachment list.
//
// A single differing byte fails. The proof is therefore not "the tests still
// pass"; it is "the bytes are the same bytes".
//
// The base commit is read from BYTE_PRESERVATION_BASE, defaulting to the Lane D
// Wave 2 base. A base that does not contain the renderer fails loudly rather
// than silently comparing the file against itself.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import Module from "node:module";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// CommonJS, deliberately. The repository's ESM loader cannot resolve the
// directory imports the existing state configurations use ("../rcap/state-packs/
// north-dakota"), and the fix for that would be an edit to a shared loader this
// lane does not own. The CJS hook that scripts/verify-nd-pleading-state.mjs
// already uses resolves them, and it also lets both renderers be loaded as two
// distinct modules in one process, which is what this proof needs.
const require = createRequire(import.meta.url);
const ts = require("typescript");
const originalTsLoader = Module._extensions[".ts"];
Module._extensions[".ts"] = function loadTs(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true
    },
    fileName: filename
  }).outputText;
  module._compile(output, filename);
};
process.once("exit", () => {
  Module._extensions[".ts"] = originalTsLoader;
});

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RENDERER = "src/lib/record-clearing/renderers/custom-pleading-renderer.ts";
const BASE = process.env.BYTE_PRESERVATION_BASE ?? "a25eec4cdc1f2193a591ba9c2991c3c6dd8a03ef";

const failures = [];
let checks = 0;
const check = (condition, message) => {
  checks += 1;
  if (!condition) failures.push(message);
};

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

// --- the unmodified renderer, out of the base commit -------------------------

const baseSource = spawnSync("git", ["show", `${BASE}:${RENDERER}`], {
  cwd: rootDir,
  encoding: "utf8",
  maxBuffer: 32 * 1024 * 1024
});
if (baseSource.status !== 0 || !baseSource.stdout.includes("renderCustomPleading")) {
  console.error(
    `verify-nd-shared-renderer-byte-preservation: could not read ${RENDERER} at ${BASE}; the proof cannot run.`
  );
  process.exit(1);
}
const patchedSource = fs.readFileSync(path.join(rootDir, RENDERER), "utf8");
check(
  baseSource.stdout !== patchedSource,
  "The working-tree renderer is identical to the base renderer; there is no patch to prove anything about."
);

// The base copy is written beside the real one so its own relative imports
// (`../types`) resolve exactly as they do in place.
const baseCopyPath = path.join(rootDir, path.dirname(RENDERER), ".byte-preservation-base-renderer.ts");
fs.writeFileSync(baseCopyPath, baseSource.stdout);

let baseRenderer;
let patchedRenderer;
try {
  baseRenderer = require(baseCopyPath);
  patchedRenderer = require(path.join(rootDir, RENDERER));
} finally {
  fs.rmSync(baseCopyPath, { force: true });
}

// --- every pleading configuration in the repository --------------------------

const configModules = [
  ["ND", "src/lib/record-clearing/north-dakota-config.ts"],
  ["PA", "src/lib/record-clearing/pennsylvania-config.ts"],
  ["DC", "src/lib/record-clearing/dc-config.ts"],
  ["OK", "src/lib/record-clearing/oklahoma-config.ts"],
  ["WY", "src/lib/record-clearing/wyoming-config.ts"]
];

/** Every exported value that looks like a PleadingTrackConfig. */
function configsFrom(moduleNamespace) {
  const found = [];
  for (const [name, value] of Object.entries(moduleNamespace)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if ("jurisdictionCode" in value && "documentTitleFull" in value && "primaryStatutoryAuthority" in value) {
        found.push([name, value]);
      }
      // Configs are also exported grouped in a record keyed by track id.
      for (const [innerName, inner] of Object.entries(value)) {
        if (
          inner && typeof inner === "object" && !Array.isArray(inner)
          && "jurisdictionCode" in inner && "documentTitleFull" in inner
          && "primaryStatutoryAuthority" in inner
        ) {
          found.push([`${name}.${innerName}`, inner]);
        }
      }
    }
  }
  return found;
}

const configs = new Map();
for (const [label, specifier] of configModules) {
  let namespace;
  try {
    namespace = require(path.join(rootDir, specifier));
  } catch (error) {
    failures.push(`Could not load ${label} configuration module ${specifier}: ${error.message}`);
    checks += 1;
    continue;
  }
  for (const [name, config] of configsFrom(namespace)) {
    configs.set(`${config.jurisdictionCode}:${config.trackId}:${name}`, config);
  }
}
check(configs.size >= 6, `Expected at least six pleading configurations to compare, found ${configs.size}.`);

// --- input matrix ------------------------------------------------------------

// Several shapes, not one: an optional field that is absent in the reference
// input could hide a difference that only appears when it is present.
const inputVariants = [
  {
    label: "full",
    partyData: {
      petitionerName: "JORDAN AVERY SAMPLE",
      petitionerAddress: "412 North Sample Avenue, Bismarck, ND 58501",
      otherNamesUsed: "Jordan A. Sample"
    },
    caseData: {
      countyName: "Burleigh",
      judicialDistrict: "South Central Judicial District",
      docketNumber: "08-2018-CR-00123",
      otn: "OTN-000123",
      judgeName: "Hon. Sample Judge",
      judgeAddress: "514 East Thayer Avenue, Bismarck, ND 58501"
    },
    chargeData: {
      chargeDescription: "Theft of property",
      offenseGrade: "Class A misdemeanor",
      disposition: "Convicted (guilty plea)",
      dispositionDate: "06/01/2018",
      arrestDate: "02/01/2018",
      complaintDate: "02/15/2018",
      arrestingAgency: "Bismarck Police Department",
      affiantName: "Sample Affiant",
      affiantAddress: "1 Sample Way",
      statuteTitle: "12.1",
      statuteSection: "23-02",
      statuteSubsection: "(1)"
    },
    eligibilityData: {
      eligibilityBasisLabel: "Sample eligibility basis",
      restitutionText: "All restitution has been paid.",
      patchText: "PATCH report attached.",
      waitingPeriodText: "Sample waiting period.",
      additionalFacts: ["Sample additional fact one.", "Sample additional fact two."]
    },
    attachments: ["Sample Attachment A", "Sample Attachment B"]
  },
  {
    label: "minimal",
    partyData: { petitionerName: "JORDAN AVERY SAMPLE" },
    caseData: { countyName: "Burleigh" },
    chargeData: {},
    eligibilityData: { eligibilityBasisLabel: "" },
    attachments: undefined
  },
  {
    label: "long-values",
    partyData: {
      petitionerName:
        "MAXIMILIANA GENEVIEVE OKONKWO-VANDERSTEEN RASMUSSEN THORBJORNSDOTTIR",
      petitionerAddress:
        "Apartment 14C, 18827 Northwest Meadowlark Prairie Boulevard, Post Office Box 448827, Grand Forks, North Dakota 58203-4488",
      otherNamesUsed: "Maximiliana G. Okonkwo-Vandersteen; Maxie Rasmussen"
    },
    caseData: {
      countyName: "Grand Forks",
      judicialDistrict: "Northeast Central Judicial District",
      docketNumber: "18-2018-CR-00001234567890123456789012345678901234567890"
    },
    chargeData: {
      chargeDescription:
        "Criminal trespass in a dwelling and disorderly conduct and preventing arrest in a single continuous course of conduct",
      disposition: "Convicted (guilty finding)",
      dispositionDate: "11/30/2020"
    },
    eligibilityData: {
      eligibilityBasisLabel: "A very long eligibility basis label that keeps going for a while",
      additionalFacts: ["A long additional fact that keeps going for a while and then some more."]
    },
    attachments: ["A Very Long Attachment Title That Keeps Going For A While"]
  }
];

// --- compare ------------------------------------------------------------------

let comparisons = 0;
for (const [configKey, config] of [...configs.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
  for (const variant of inputVariants) {
    const input = {
      config,
      partyData: variant.partyData,
      caseData: variant.caseData,
      chargeData: variant.chargeData,
      eligibilityData: variant.eligibilityData,
      attachments: variant.attachments,
      productName: "LegalEase RCAP",
      shadowMode: true
    };
    const before = baseRenderer.renderCustomPleading(structuredClone(input));
    const after = patchedRenderer.renderCustomPleading(structuredClone(input));
    const label = `${configKey} / ${variant.label}`;
    comparisons += 1;

    check(
      sha256(before.fullText) === sha256(after.fullText),
      `${label}: full text changed (${sha256(before.fullText).slice(0, 12)} -> ${sha256(after.fullText).slice(0, 12)}).`
    );
    check(
      JSON.stringify(before.sections) === JSON.stringify(after.sections),
      `${label}: section list changed.`
    );
    check(
      JSON.stringify(before.attachmentList) === JSON.stringify(after.attachmentList),
      `${label}: attachment list changed.`
    );
    check(
      JSON.stringify(before.warnings) === JSON.stringify(after.warnings),
      `${label}: warnings changed.`
    );
    check(
      before.templateGrade === after.templateGrade
        && before.templateLifecycle === after.templateLifecycle
        && before.rendered === after.rendered,
      `${label}: render result metadata changed.`
    );
  }
}
check(comparisons >= 18, `Expected at least eighteen comparisons, ran ${comparisons}.`);

// --- and the new fields must actually do something ---------------------------
//
// A patch that preserved bytes by doing nothing at all would pass everything
// above. These two assertions are the other half of the proof.

const [, referenceConfig] = [...configs.entries()][0];
const withClauses = patchedRenderer.renderCustomPleading({
  config: {
    ...referenceConfig,
    presentation: {
      ...(referenceConfig.presentation ?? patchedRenderer.PA_DEFAULT_PRESENTATION),
      reliefClauses: ["(a) A lane-supplied relief clause;"],
      proposedOrderClauses: ["A lane-supplied operative paragraph."]
    }
  },
  partyData: inputVariants[0].partyData,
  caseData: inputVariants[0].caseData,
  chargeData: inputVariants[0].chargeData,
  eligibilityData: inputVariants[0].eligibilityData,
  productName: "LegalEase RCAP",
  shadowMode: true
});
check(
  withClauses.fullText.includes("(a) A lane-supplied relief clause;"),
  "A supplied reliefClauses entry must replace the default requested-relief clauses."
);
check(
  !withClauses.fullText.includes("Direct all criminal justice agencies having custody of such records"),
  "A supplied reliefClauses entry must remove the default agency-wide relief clause."
);
check(
  withClauses.fullText.includes("A lane-supplied operative paragraph."),
  "A supplied proposedOrderClauses entry must replace the default operative paragraph."
);
check(
  !withClauses.fullText.includes("and all other criminal justice agencies with records pertaining to this matter"),
  "A supplied proposedOrderClauses entry must remove the default agency-wide order paragraph."
);

// --- report -------------------------------------------------------------------

if (failures.length > 0) {
  console.error(`Shared-renderer byte preservation FAILED (${failures.length} of ${checks} checks).`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`Shared-renderer byte preservation PASSED (${checks} checks).`);
console.log(`  base commit:        ${BASE}`);
console.log(`  configurations:     ${configs.size}`);
console.log(`  input variants:     ${inputVariants.length}`);
console.log(`  comparisons:        ${comparisons}`);
console.log("  result:             every existing configuration renders byte for byte as before");
console.log("  new fields:         replace the default clauses only when supplied");
