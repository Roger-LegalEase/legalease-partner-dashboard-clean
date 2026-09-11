import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { classifyBlank } from "./completeness-contract.mjs";
import {
  NJ_PARTICIPANT_LATER_COMPLETION_FIELDS,
  NJ_PARTICIPANT_LATER_COMPLETION_REGISTRY,
  njParticipantLaterCompletionSourceStage,
} from "./nj-participant-later-completion.mjs";
import { auditFamily, auditPreparedInputs } from "./verify-packet-completeness.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FAMILY_ID = "nj_ordinance-set";
const FAMILY_DIR = "data/rcap-all50/overlays/census-v1/nj/nj-ordinance-set--official-pdf-fill";
const FAMILY = path.join(ROOT, FAMILY_DIR);
const SOURCE_ROOT = "/workspaces/legalease-partner-dashboard-clean/private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
const ORIGINAL_INSTRUCTIONS = fs.readFileSync(path.join(FAMILY, "participant-instructions.md"), "utf8");

const readJson = (name) => JSON.parse(fs.readFileSync(path.join(FAMILY, name), "utf8"));
const clone = (value) => structuredClone(value);
const rowOf = (map, field) => map.documents.flatMap((document) => document.fields)
  .find((row) => row.field === field);

function adoptedInputs() {
  const fieldMap = readJson("production-field-map.json");
  let adopted = 0;
  for (const document of fieldMap.documents) {
    for (const row of document.fields) {
      if (!NJ_PARTICIPANT_LATER_COMPLETION_FIELDS.includes(row.field)) continue;
      const expected = NJ_PARTICIPANT_LATER_COMPLETION_REGISTRY[row.field];
      Object.assign(row, {
        refusalClass: null,
        blankTreatment: "PARTICIPANT_LATER_COMPLETION",
        completenessDisposition: "PARTICIPANT_LATER_COMPLETION",
        requiredBeforeFiling: false,
        routeDetermined: false,
        participantOwnedCompletion: true,
        completionStage: expected.trigger,
        completesAfterService: expected.completesAfterService,
        sourceStage: njParticipantLaterCompletionSourceStage(row.field),
      });
      adopted += 1;
    }
  }
  assert.equal(adopted, 18, "the real NJ map must expose every closed-registry field");
  const disclosures = NJ_PARTICIPANT_LATER_COMPLETION_FIELDS.map((field) => {
    const expected = NJ_PARTICIPANT_LATER_COMPLETION_REGISTRY[field];
    return `- **${expected.trigger}.** Complete this participant task when the source event occurs (source field: \`${field}\`)`;
  }).join("\n");
  return {
    fieldMap,
    actualWrites: readJson("reports/actual-writes.json"),
    rendered: readJson("reports/rendered-artifacts.json"),
    receipt: readJson("source-receipt.json"),
    census: readJson("field-census.census-v1.json"),
    approval: readJson("approval-request.json"),
    instructions: `${ORIGINAL_INSTRUCTIONS}\n\n## Participant tasks after the initial filing\n\n${disclosures}\n`,
  };
}

function audit(inputs, familyId = FAMILY_ID) {
  const prior = process.env.MASTER_LIBRARY_SOURCE_DIR;
  process.env.MASTER_LIBRARY_SOURCE_DIR = SOURCE_ROOT;
  try {
    return auditPreparedInputs(FAMILY_DIR, familyId, inputs);
  } finally {
    if (prior === undefined) delete process.env.MASTER_LIBRARY_SOURCE_DIR;
    else process.env.MASTER_LIBRARY_SOURCE_DIR = prior;
  }
}

function expectFieldFailure(result, field, counter, pattern) {
  const finding = result.findings.find((row) => row.field === field && row.counter === counter);
  assert.ok(finding, `${field}: missing ${counter} finding in ${JSON.stringify(result.findings)}`);
  assert.match(finding.basis ?? finding.why ?? "", pattern);
}

test("the real reader verifies all 18 participant later-completion declarations from source", () => {
  const result = audit(adoptedInputs());
  assert.equal(result.result, "PASS_COMPLETE");
  assert.equal(result.totals.blanksByDisposition.PARTICIPANT_LATER_COMPLETION, 18);
  assert.equal(result.sourceStageMeasurements?.length, 18);
  assert.deepEqual(result.sourceStageMeasurements.map((row) => row.field).sort(),
    [...NJ_PARTICIPANT_LATER_COMPLETION_FIELDS].sort());
  assert.ok(result.sourceStageMeasurements.every((row) => row.actor === "participant"));
  assert.ok(result.sourceStageMeasurements.every((row) => row.sourceByteLength === 1924831));
  assert.ok(result.sourceStageMeasurements.every((row) => row.widgetCount >= 1));
});

test("source-stage claims fail closed for forged identity, stage, actor and family", async (t) => {
  const cases = [
    ["caller verified plus wrong source", (inputs) => {
      Object.assign(rowOf(inputs.fieldMap, "CoverLtrEDt").sourceStage,
        { verified: true, sourceSha256: "0".repeat(64) });
    }, /closed field, actor, trigger and instruction-page registry/],
    ["wrong field", (inputs) => { rowOf(inputs.fieldMap, "CoverLtrEDt").sourceStage.field = "mailPetition"; }, /closed field/],
    ["wrong stage", (inputs) => { rowOf(inputs.fieldMap, "CoverLtrEDt").sourceStage.trigger = "BEFORE_INITIAL_FILING"; }, /closed field/],
    ["wrong actor", (inputs) => { rowOf(inputs.fieldMap, "CoverLtrEDt").sourceStage.actor = "court"; }, /closed field/],
  ];
  for (const [name, mutate, pattern] of cases) await t.test(name, () => {
    const inputs = adoptedInputs(); mutate(inputs);
    expectFieldFailure(audit(inputs), "CoverLtrEDt", "unclassifiedBlanks", pattern);
  });
  await t.test("unknown family opt-in", () => {
    const result = audit(adoptedInputs(), "unknown-family");
    expectFieldFailure(result, "CoverLtrEDt", "unclassifiedBlanks", /no closed source-stage opt-in/);
  });
});

test("receipt, census, widgets and participant disclosure are independently required", async (t) => {
  const cases = [
    ["receipt SHA mismatch", (inputs) => { inputs.receipt.documents[0].sha256 = "0".repeat(64); }, /exact NJ receipt/],
    ["census SHA mismatch", (inputs) => { inputs.census.documents[0].sourceSha256 = "0".repeat(64); }, /exact NJ receipt/],
    ["widget mismatch", (inputs) => { rowOf(inputs.fieldMap, "CoverLtrEDt").widgets[0].rect.x += 1; }, /widgets do not match/],
    ["missing exact disclosure", (inputs) => {
      inputs.instructions = inputs.instructions.split(/\r?\n/)
        .filter((line) => !line.includes("source field: `CoverLtrEDt`")).join("\n");
    }, /missing its exact source-field and stage disclosure/],
  ];
  for (const [name, mutate, pattern] of cases) await t.test(name, () => {
    const inputs = adoptedInputs(); mutate(inputs);
    expectFieldFailure(audit(inputs), "CoverLtrEDt", "unclassifiedBlanks", pattern);
  });
});

test("contradictory timing, available facts and route elections remain defects", async (t) => {
  await t.test("requiredBeforeFiling=true", () => {
    const inputs = adoptedInputs(); rowOf(inputs.fieldMap, "CoverLtrEDt").requiredBeforeFiling = true;
    expectFieldFailure(audit(inputs), "CoverLtrEDt", "unclassifiedBlanks", /contradicts/);
  });
  await t.test("available fact", () => {
    const inputs = adoptedInputs(); rowOf(inputs.fieldMap, "CoverLtrEDt").factId = "participant.full_legal_name";
    expectFieldFailure(audit(inputs), "CoverLtrEDt", "knownRequiredFieldsMissing", /cannot excuse an available fact/);
  });
  await t.test("route-determined election", () => {
    const inputs = adoptedInputs(); rowOf(inputs.fieldMap, "CoverLtrEDt").routeDetermined = true;
    expectFieldFailure(audit(inputs), "CoverLtrEDt", "requiredOptionsMissing", /cannot excuse a route-determined election/);
  });
  await t.test("selection control", () => {
    const inputs = adoptedInputs(); rowOf(inputs.fieldMap, "CoverLtrEDt").isSelectionControl = true;
    expectFieldFailure(audit(inputs), "CoverLtrEDt", "requiredOptionsMissing", /cannot excuse a route-determined election/);
  });
});

test("protected signatures and court acts keep their protected meaning", () => {
  const inputs = adoptedInputs();
  for (const field of ["sigHearJdg", "orderHearMnth"]) {
    const row = rowOf(inputs.fieldMap, field);
    Object.assign(row, {
      blankTreatment: "PARTICIPANT_LATER_COMPLETION",
      completenessDisposition: "PARTICIPANT_LATER_COMPLETION",
      requiredBeforeFiling: false,
      routeDetermined: false,
      participantOwnedCompletion: true,
      completionStage: "NOTICE_OF_HEARING_MAILING",
      completesAfterService: true,
      sourceStage: { ...njParticipantLaterCompletionSourceStage("CoverLtrEDt"), field },
    });
  }
  const result = audit(inputs);
  for (const field of ["sigHearJdg", "orderHearMnth"]) {
    assert.equal(result.findings.some((row) => row.field === field), false, `${field}: protected act became a defect`);
  }
});

test("a serialized verified flag cannot be passed directly to the contract", () => {
  const verdict = classifyBlank({ name: "CoverLtrEDt", label: "date Form E is mailed" }, "", null, {
    disposition: "PARTICIPANT_LATER_COMPLETION",
    blankTreatment: "PARTICIPANT_LATER_COMPLETION",
    requiredBeforeFiling: false,
    requiredBeforeFilingDeclared: true,
    routeDetermined: false,
    routeDeterminedDeclared: true,
    participantOwnedCompletion: true,
    factAvailable: false,
    sourceStage: { ...njParticipantLaterCompletionSourceStage("CoverLtrEDt"), verified: true },
  });
  assert.equal(verdict.disposition, "UNCLASSIFIED_BLANK");
  assert.match(verdict.basis, /no independently verified source-stage proof/);
});

test("the real CLI accepts a transient adopted NJ map and restores tracked files", () => {
  const mapPath = path.join(FAMILY, "production-field-map.json");
  const instructionsPath = path.join(FAMILY, "participant-instructions.md");
  const originalMap = fs.readFileSync(mapPath);
  const originalGuide = fs.readFileSync(instructionsPath);
  const inputs = adoptedInputs();
  let run;
  try {
    fs.writeFileSync(mapPath, JSON.stringify(inputs.fieldMap, null, 2) + "\n");
    fs.writeFileSync(instructionsPath, inputs.instructions);
    run = spawnSync(process.execPath,
      [path.join(ROOT, "scripts/rcap-packet-completeness/verify-packet-completeness.mjs"), "--family", FAMILY_ID],
      { cwd: ROOT, encoding: "utf8", timeout: 60_000,
        env: { ...process.env, MASTER_LIBRARY_SOURCE_DIR: SOURCE_ROOT } });
  } finally {
    fs.writeFileSync(mapPath, originalMap);
    fs.writeFileSync(instructionsPath, originalGuide);
  }
  assert.equal(run?.status, 0, run?.stderr || run?.stdout);
  assert.match(run.stdout, /nj_ordinance-set\s+PASS_COMPLETE\s+18\/179 written/);
  assert.ok(fs.readFileSync(mapPath).equals(originalMap));
  assert.ok(fs.readFileSync(instructionsPath).equals(originalGuide));
});

test("an unopted non-NJ family preserves its full normalized audit object", () => {
  const result = auditFamily(
    "data/rcap-all50/overlays/census-v1/ca/ca-1203-4a-set--official-pdf-fill",
    "ca-1203-4a-set");
  const digest = crypto.createHash("sha256").update(JSON.stringify(result)).digest("hex");
  assert.equal(digest, "49e81a90d4be20873d7eaa7ae0e8d8ef670a628a0f00a2b1a373748df0809b96");
});
