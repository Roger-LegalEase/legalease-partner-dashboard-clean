#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import {
  FACTORY_LANES,
  REQUIRED_JOB_FIELDS,
  buildFactoryPlan,
  findOwnedPathOverlaps,
  loadFactoryPlan,
  loadJob,
  serializeFactoryPlan,
  validateFactoryPlan,
  validateJob
} from "./lib/rcap-factory/index.mjs";
import {
  compileWorkerPrompt
} from "./lib/rcap-factory/prompt.mjs";
import {
  buildScaffoldPlan
} from "./lib/rcap-factory/scaffold.mjs";
import {
  inspectPdfBytes
} from "./lib/rcap-factory/pdf-inspection.mjs";
import {
  generateJobReviewArtifacts,
  verifyTrackedReviewManifest
} from "./lib/rcap-factory/review-artifacts.mjs";
import {
  validateChangedPaths,
  validateJobWorkspace,
  validateWorkerCommand
} from "./lib/rcap-factory/validation.mjs";
import {
  buildFactoryStatus
} from "./rcap-factory-status.mjs";
import {
  buildWaveIntegrationPlan,
  integrateWave
} from "./lib/rcap-factory/wave-integration.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const EXPECTED_BASE = "8df94fbaa66c06bf0ba677ee4f5fb417ad08cdc8";
const results = [];
const failures = [];

await check("job JSON Schema and manifest contract", () => {
  const schema = readJson(
    "data/record-clearing/production-factory/job-schema.json"
  );
  assert.deepEqual(schema.required, REQUIRED_JOB_FIELDS);
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.properties.lane.enum, FACTORY_LANES);
});

let plan;
await check("deterministic plan covers all lanes and jurisdictions", () => {
  const first = buildFactoryPlan({ rootDir: ROOT });
  const second = buildFactoryPlan({ rootDir: ROOT });
  const firstBytes = serializeFactoryPlan(first);
  const secondBytes = serializeFactoryPlan(second);
  assert.equal(firstBytes, secondBytes);

  const validation = validateFactoryPlan(first);
  assert.equal(validation.ok, true, validation.issues.join("\n"));
  assert.equal(new Set(first.jobs.map((job) => job.jurisdiction)).size, 51);
  assert.deepEqual(first.lanes.map((entry) => entry.lane), FACTORY_LANES);
  assert.ok(first.lanes.every((entry) => entry.jobIds.length > 0));
  assert.equal(first.waves.length, FACTORY_LANES.length);
  assert.equal(findOwnedPathOverlaps(first.jobs).length, 0);
  assert.ok(first.generatedFrom.length >= 8);
  assert.ok(first.generatedFrom.every((entry) => /^[0-9a-f]{64}$/.test(entry.sha256)));
  assert.equal(first.sourceSummary.runtime.normalizedPacketReadyTracks, 0);
  assert.equal(first.sourceSummary.runtime.enabledJurisdictions, 0);
  assert.deepEqual(first.sourceSummary.runtime.launchGates, ["red"]);
  for (const job of first.jobs) {
    for (const field of REQUIRED_JOB_FIELDS) assert.ok(field in job, `${job.jobId}: ${field}`);
  }
  plan = first;
});

await check("overlap and owned/forbidden conflicts fail closed", () => {
  const overlapping = structuredClone(plan);
  overlapping.jobs[1].ownedPaths[0] = overlapping.jobs[0].ownedPaths[0];
  assert.ok(findOwnedPathOverlaps(overlapping.jobs).length > 0);
  const result = validateFactoryPlan(overlapping);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.includes("overlapping owned paths")));

  const conflicted = structuredClone(plan.jobs[0]);
  conflicted.forbiddenPaths.push(conflicted.ownedPaths[0]);
  const jobResult = validateJob(conflicted);
  assert.equal(jobResult.ok, false);
  assert.ok(jobResult.issues.some((issue) => issue.includes("overlaps forbidden path")));
});

await check("worker prompt is short, stable, and contains only contract sections", () => {
  const job = plan.jobs.find((entry) => entry.status === "ready") ?? plan.jobs[0];
  const options = {
    job,
    authorityVersion: plan.authorityVersion,
    model: "codex"
  };
  const first = compileWorkerPrompt(options);
  const second = compileWorkerPrompt(options);
  assert.equal(first, second);
  assert.ok(Buffer.byteLength(first) < 12_000);

  const headings = [...first.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
  assert.deepEqual(headings, [
    "Mission",
    "Authority version",
    "Assigned job manifest",
    "Owned paths",
    "Forbidden paths",
    "Required outputs",
    "Focused acceptance command",
    "Commit subject",
    "Stop condition"
  ]);
  assert.ok(
    first.includes(`npm run rcap:factory:validate-job -- ${job.jobId}`)
  );
  assert.equal(
    (first.match(/npm run rcap:factory:validate-job/g) ?? []).length,
    1
  );
  assert.equal(first.includes("npm test"), false);
});

await check("scaffold is deterministic, isolated, and dry-run by default", () => {
  const job = plan.jobs.find((entry) => entry.status === "ready") ?? plan.jobs[0];
  const options = {
    rootDir: ROOT,
    job,
    authorityVersion: plan.authorityVersion,
    model: job.model
  };
  const first = buildScaffoldPlan(options);
  const second = buildScaffoldPlan(options);
  assert.deepEqual(first, second);
  assert.equal(first.safety.explicitApplyRequired, true);
  assert.equal(first.safety.staging, false);
  assert.equal(first.safety.deployment, false);
  assert.ok(first.worktreePath.startsWith("tmp/rcap-factory/worktrees/"));
  assert.ok(first.artifacts.worktreeMarker.endsWith("/tmp/rcap-factory/job.json"));
  assert.equal(first.manifestBaseCommit, job.baseCommit);
  assert.equal(first.scaffoldBaseCommit, git(["rev-parse", "HEAD"]).trim());
  assert.equal(first.command.at(-1), first.scaffoldBaseCommit);
});

await check("scaffold marker pins plan and job provenance", () => {
  const job = plan.jobs.find((entry) => entry.status === "ready") ?? plan.jobs[0];
  const markerPath = path.join(ROOT, "tmp/rcap-factory/job.json");
  assert.equal(fs.existsSync(markerPath), false, `${markerPath} already exists`);
  fs.mkdirSync(path.dirname(markerPath), { recursive: true });
  try {
    fs.writeFileSync(
      markerPath,
      `${JSON.stringify({
        jobId: job.jobId,
        manifestBaseCommit: EXPECTED_BASE
      })}\n`
    );
    assert.equal(
      loadFactoryPlan({ rootDir: ROOT }).baseCommit,
      EXPECTED_BASE
    );
    assert.equal(
      loadJob(job.jobId, { rootDir: ROOT }).baseCommit,
      EXPECTED_BASE
    );
    assert.throws(
      () => loadJob("rcap-wy-staging-promotion", { rootDir: ROOT }),
      /scaffold is assigned/i
    );
  } finally {
    fs.rmSync(markerPath, { force: true });
  }
});

await check("path and command safeguards reject forbidden worker behavior", () => {
  const job = plan.jobs.find((entry) => entry.jurisdiction === "AK") ?? plan.jobs[0];
  const owned = validateChangedPaths(job, [job.ownedPaths[0]]);
  assert.equal(owned.ok, true);

  const otherMemo = validateChangedPaths(job, [
    "data/record-clearing/legal-design-intake/WY.memo.json"
  ]);
  assert.equal(otherMemo.ok, false);
  assert.ok(
    otherMemo.violations.some((entry) => entry.code === "other_jurisdiction_memo")
  );

  for (const changedPath of [
    "data/record-clearing/legal-design-track-registry.json",
    "data/record-clearing/master-library/edition-1-2/edition.json",
    "src/lib/rcap/jurisdictions/packet-capability.ts",
    "src/app/api/rcap/documents/mississippi/create/route.ts"
  ]) {
    assert.equal(validateChangedPaths(job, [changedPath]).ok, false, changedPath);
  }

  assert.equal(validateWorkerCommand("git add .").ok, false);
  assert.equal(validateWorkerCommand("npm test").ok, false);
  assert.equal(
    validateWorkerCommand(
      `node scripts/rcap-factory-validate-job.mjs ${job.jobId}`
    ).ok,
    false
  );
  assert.equal(
    validateWorkerCommand(
      `node scripts/rcap-factory-plan.mjs --check-job ${job.jobId}`
    ).ok,
    true
  );

  const baselineOverride = validateJobWorkspace(
    {
      jobId: "factory-baseline-proof",
      jurisdiction: "AK",
      baseCommit: plan.baseCommit,
      ownedPaths: ["docs/record-clearing/RCAP_PRODUCTION_FACTORY.md"],
      forbiddenPaths: [],
      requiredInputs: [],
      expectedOutputs: [],
      focusedValidation: []
    },
    {
      rootDir: ROOT,
      baselineCommit: "dfbae78102e6bc9c4202b34a60a547bd7bdb0837",
      changedPaths: [],
      runCommands: false,
      requireExpectedOutputs: false
    }
  );
  assert.equal(baselineOverride.passed, false);
  assert.ok(
    baselineOverride.failures.some(
      (entry) => entry.code === "baseline_override_rejected"
    )
  );
});

await check("focused validation runs only its bounded command", () => {
  const job = {
    jobId: "factory-focused-proof",
    jurisdiction: "AK",
    baseCommit: plan.baseCommit,
    ownedPaths: ["docs/record-clearing/RCAP_PRODUCTION_FACTORY.md"],
    forbiddenPaths: [],
    requiredInputs: ["docs/record-clearing/RCAP_PRODUCTION_FACTORY.md"],
    expectedOutputs: ["docs/record-clearing/RCAP_PRODUCTION_FACTORY.md"],
    focusedValidation: [
      "node -e \"if (process.env.RCAP_FACTORY_VALIDATION_SCOPE !== 'focused') process.exit(7)\""
    ]
  };
  const report = validateJobWorkspace(job, {
    rootDir: ROOT,
    changedPaths: ["docs/record-clearing/RCAP_PRODUCTION_FACTORY.md"],
    runCommands: true
  });
  assert.equal(report.passed, true, JSON.stringify(report.failures));
  assert.equal(report.scope, "focused");
  assert.equal(report.commandResults.length, 1);
  assert.equal(report.commandResults[0].passed, true);
});

await check("PDF inspection is deterministic and ownership remains proposed", async () => {
  const bytes = await createInspectionFixture();
  const source = {
    kind: "fixture",
    value: "synthetic-inspection.pdf",
    fileName: "synthetic-inspection.pdf"
  };
  const first = await inspectPdfBytes(bytes, { source });
  const second = await inspectPdfBytes(bytes, { source });
  assert.deepEqual(first, second);
  assert.equal(first.structureClass, "clean_acroform");
  assert.equal(first.pageCount, 1);
  assert.ok(first.acroFormFieldCount >= 4);
  assert.ok(first.pageCoordinates.length >= 4);
  assert.ok(first.widgetTypes.includes("checkbox"));
  assert.ok(first.widgetTypes.includes("radio"));
  assert.ok(first.multilineFields.includes("Petitioner.Statement"));
  assert.ok(first.probableParticipantFields.length >= 2);
  assert.ok(first.probableThirdPartyFields.length >= 1);
  assert.ok(first.signatureBlocks.some((entry) => entry.fieldName === "Judge.Signature"));
  assert.equal(first.ownershipProposal.approved, false);
  assert.equal(first.ownershipProposal.requiresHumanApproval, true);
  assert.match(first.sha256, /^[0-9a-f]{64}$/);
});

await check("review PDFs, page images, hashes, and checklists reproduce", async () => {
  const temporaryRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "rcap-factory-review-test-")
  );
  try {
    const expectedOutput = "expected/sample-output.ts";
    fs.mkdirSync(path.join(temporaryRoot, "expected"), { recursive: true });
    fs.writeFileSync(
      path.join(temporaryRoot, expectedOutput),
      "export const reviewFixture = true;\n"
    );
    const job = {
      jobId: "factory-review-proof",
      lane: "custom_pleading",
      jurisdiction: "AK",
      trackIds: ["ak-fixture-one", "ak-fixture-two"],
      strategyFamily: "custom_pleading",
      baseCommit: plan.baseCommit,
      ownedPaths: [
        expectedOutput,
        "data/record-clearing/production-factory/review-manifests/factory-review-proof.json"
      ],
      expectedOutputs: [expectedOutput]
    };
    const options = {
      rootDir: temporaryRoot,
      authorityVersion: plan.authorityVersion,
      authorityEdition: plan.authorityEdition,
      validationReport: {
        passed: true,
        commandResults: [],
        failures: []
      },
      performValidation: false,
      write: true
    };
    const first = await generateJobReviewArtifacts(job, options);
    const firstManifestBytes = fs.readFileSync(
      path.join(temporaryRoot, first.manifestPath)
    );
    const second = await generateJobReviewArtifacts(job, options);
    const secondManifestBytes = fs.readFileSync(
      path.join(temporaryRoot, second.manifestPath)
    );

    assert.deepEqual(first.manifest, second.manifest);
    assert.deepEqual(firstManifestBytes, secondManifestBytes);
    assert.equal(first.manifest.packet.pageCount, 2);
    assert.equal(first.renderedPages.length, 2);
    assert.equal(first.manifest.technicalProofPassed, true);
    assert.equal(first.manifest.visualProofPassed, false);
    assert.equal(first.manifest.counselAdopted, false);
    assert.match(first.manifest.packet.sha256, /^[0-9a-f]{64}$/);

    const pdfPath = path.join(
      temporaryRoot,
      first.artifactDirectory,
      "synthetic-review.pdf"
    );
    assert.equal(fs.readFileSync(pdfPath, { encoding: null }).subarray(0, 5).toString(), "%PDF-");
    for (const page of first.renderedPages) {
      const signature = fs
        .readFileSync(path.join(temporaryRoot, page.relativePath))
        .subarray(0, 8);
      assert.deepEqual(
        signature,
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      );
    }
    const verified = verifyTrackedReviewManifest(
      temporaryRoot,
      job,
      first.manifestPath
    );
    assert.equal(verified.passed, true, verified.failures.join("\n"));
    assert.equal(
      spawnSync(
        "git",
        [
          "check-ignore",
          "--quiet",
          "--no-index",
          "artifacts/rcap-factory/reviews/factory-review-proof/synthetic-review.pdf"
        ],
        { cwd: ROOT }
      ).status,
      0
    );
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

await check("dashboard reports all 51 and preserves the red launch posture", () => {
  const status = buildFactoryStatus({ rootDir: ROOT });
  assert.equal(status.totals.jurisdictions, 51);
  assert.equal(status.totals.tracks, 250);
  assert.equal(status.totals.normalized, 250);
  assert.equal(status.totals.packetReady, 0);
  assert.equal(status.totals.enabledJurisdictions, 0);
  assert.equal(status.totals.productionEnabled, 0);
  assert.equal(status.totals.launchGate, "red");
  assert.equal(status.tracks.filter((track) => track.normalized).length, 250);
  assert.equal(
    status.tracks.filter((track) => track.productionEnabled).length,
    0
  );
  assert.ok(status.jurisdictions.every((entry) => entry.exactBlocker));
  assert.match(status.definitionOfComplete, /every track.*terminal disposition/i);
});

await check("wave integration dry run is stable and captain-only", async () => {
  const wave = plan.waves.find((entry) => entry.jobIds.length > 0);
  const statusBefore = git(["status", "--porcelain=v1"]);
  const first = buildWaveIntegrationPlan(plan, wave.waveId, {
    rootDir: ROOT
  });
  const second = buildWaveIntegrationPlan(plan, wave.waveId, {
    rootDir: ROOT
  });
  assert.deepEqual(first, second);
  assert.ok(first.captainRegeneration.length > 0);
  assert.ok(first.integrationValidation.includes("npm test"));
  assert.equal(first.captainRegeneration.includes("npm test"), false);
  assert.equal(first.safety.fullSuiteScope, "wave_integration_only");

  const result = await integrateWave(plan, wave.waveId, {
    rootDir: ROOT,
    execute: false
  });
  assert.equal(result.dryRun, true);
  assert.equal(result.executed, false);
  assert.equal(result.passed, true);
  assert.deepEqual(result.commandResults, []);
  assert.deepEqual(result.integratedJobs, []);
  assert.equal(git(["status", "--porcelain=v1"]), statusBefore);
});

await check("existing legal registries and runtime status are byte-unchanged", () => {
  const protectedPaths = [
    "data/record-clearing/implementation-tranches",
    "data/record-clearing/legal-design-implementation-queue.json",
    "data/record-clearing/legal-design-packet-set-manifests.json",
    "data/record-clearing/legal-design-track-registry.json",
    "data/record-clearing/legal-design-track-source-relationships.json",
    "data/record-clearing/master-library",
    "data/record-clearing/relief-track-registry.json",
    "data/record-clearing/source-artifact-registry.json",
    "docs/rcap-promotion",
    "src/app/api/rcap",
    "src/lib/rcap/jurisdictions/packet-capability.ts",
    "src/lib/rcap/packets/registry.ts",
    "src/lib/rcap/state-promotion-manifest.ts"
  ];
  const result = spawnSync(
    "git",
    ["diff", "--quiet", EXPECTED_BASE, "--", ...protectedPaths],
    { cwd: ROOT, encoding: "utf8" }
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

if (failures.length > 0) {
  console.error("RCAP production factory tests failed:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("RCAP production factory tests passed.");
for (const result of results) console.log(`  PASS ${result}`);

async function check(name, callback) {
  try {
    await callback();
    results.push(name);
  } catch (error) {
    failures.push(`${name}: ${error.stack ?? error.message ?? error}`);
  }
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
}

function git(args) {
  const result = spawnSync("git", args, {
    cwd: ROOT,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `git ${args.join(" ")} failed`);
  }
  return result.stdout;
}

async function createInspectionFixture() {
  const document = await PDFDocument.create();
  document.setTitle("RCAP deterministic inspection fixture");
  document.setAuthor("LegalEase");
  document.setCreator("RCAP production factory test");
  document.setProducer("RCAP production factory test");
  document.setCreationDate(new Date("2000-01-01T00:00:00.000Z"));
  document.setModificationDate(new Date("2000-01-01T00:00:00.000Z"));

  const page = document.addPage([612, 792]);
  const font = await document.embedFont(StandardFonts.Helvetica);
  page.drawText("RCAP PDF inspection fixture", {
    x: 48,
    y: 744,
    size: 14,
    font,
    color: rgb(0, 0, 0)
  });

  const form = document.getForm();
  const participantName = form.createTextField("Petitioner.FullName");
  participantName.addToPage(page, {
    x: 48,
    y: 690,
    width: 240,
    height: 24
  });

  const statement = form.createTextField("Petitioner.Statement");
  statement.enableMultiline();
  statement.addToPage(page, {
    x: 48,
    y: 590,
    width: 300,
    height: 80
  });

  const consent = form.createCheckBox("Applicant.Consent");
  consent.addToPage(page, {
    x: 48,
    y: 548,
    width: 18,
    height: 18
  });

  const decision = form.createRadioGroup("Judge.Decision");
  decision.addOptionToPage("Granted", page, {
    x: 48,
    y: 506,
    width: 18,
    height: 18
  });
  decision.addOptionToPage("Denied", page, {
    x: 98,
    y: 506,
    width: 18,
    height: 18
  });

  const signature = form.createTextField("Judge.Signature");
  signature.addToPage(page, {
    x: 48,
    y: 450,
    width: 240,
    height: 24
  });

  form.updateFieldAppearances(font);
  return Buffer.from(
    await document.save({
      addDefaultPage: false,
      objectsPerTick: 50,
      updateFieldAppearances: false,
      useObjectStreams: false
    })
  );
}
