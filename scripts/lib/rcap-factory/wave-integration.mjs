import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { validateFactoryPlan } from "./schema.mjs";
import { scaffoldKeyFor } from "./scaffold.mjs";
import {
  GLOBAL_GENERATED_PATHS,
  normalizeRepoPath,
  runManifestCommand,
  tokenizeCommand,
  validateChangedPaths
} from "./validation.mjs";
import {
  generateJobReviewArtifacts,
  verifyTrackedReviewManifest
} from "./review-artifacts.mjs";

export const CAPTAIN_GLOBAL_REGENERATION = Object.freeze([
  "node scripts/rcap-legal-design-intake.mjs",
  "node scripts/rcap-reconcile-master-library.mjs",
  // Re-run intake after reconciliation so the derived legal-design registries
  // consume the newly reconciled Master Library records.
  "node scripts/rcap-legal-design-intake.mjs"
]);

const PROTECTED_RUNTIME_PATHS = Object.freeze([
  ".env",
  ".env.development",
  ".env.development.local",
  ".env.local",
  ".env.production",
  ".env.production.local",
  ".env.test",
  ".env.test.local",
  ".github/workflows",
  "scripts/rcap-enable-all51-launch.mjs",
  "scripts/rcap-promote-state.mjs",
  "scripts/rcap-apply-promotion-batch.mjs",
  "src/lib/rcap/jurisdictions/packet-capability.ts",
  "src/lib/rcap/packets/registry.ts",
  "src/lib/rcap/state-promotion-manifest.ts",
  "src/lib/rcap/state-promotion-rules.ts",
  "src/app/api/rcap/documents/mississippi",
  "src/app/api/rcap/documents/illinois",
  "src/app/api/rcap/documents/dc",
  "src/app/api/rcap/documents/pennsylvania",
  "src/app/api/rcap/documents/texas-harris",
  "src/components/rcap/documents",
  "src/lib/rcap/documents/source-repository.ts",
  "src/lib/record-clearing/pennsylvania-config.ts",
  "supabase",
  "vercel.json"
]);

const MASTER_LIBRARY_ROOT = "data/record-clearing/master-library";
const IMMUTABLE_EDITION_PREFIX = `${MASTER_LIBRARY_ROOT}/edition-`;

const UNSAFE_INTEGRATION_PATTERNS = [
  [
    "deployment_command",
    /\b(?:vercel|netlify)\s+(?:deploy|--prod)\b|\bnpm\s+run\s+deploy\b/i
  ],
  ["push_command", /\bgit\s+push\b/i],
  [
    "promotion_command",
    /\brcap-(?:enable-all51-launch|promote-state)\b|\brcap-apply-promotion-batch\b[\s\S]*\s--apply\b/i
  ],
  [
    "live_migration_command",
    /\bsupabase\s+(?:db\s+push|migration|link)\b/i
  ],
  ["destructive_command", /\bgit\s+(?:reset\s+--hard|clean\s+-[a-z]*f)\b|\brm\s+-[a-z]*r[a-z]*f\b/i]
];

export function buildWaveIntegrationPlan(
  factoryPlan,
  waveId,
  { rootDir = process.cwd() } = {}
) {
  const planValidation = validateFactoryPlan(factoryPlan);
  if (!planValidation.ok) {
    throw new Error(
      `Factory plan is invalid:\n- ${planValidation.issues.join("\n- ")}`
    );
  }
  const wave = factoryPlan.waves.find((entry) => entry.waveId === waveId);
  if (!wave) {
    throw new Error(
      `Unknown wave ${waveId}. Available waves: ${factoryPlan.waves
        .map((entry) => entry.waveId)
        .join(", ")}`
    );
  }
  const jobById = new Map(factoryPlan.jobs.map((job) => [job.jobId, job]));
  const referencedJobs = wave.jobIds.map((jobId) => {
    const job = jobById.get(jobId);
    if (!job) throw new Error(`${waveId} references missing job ${jobId}`);
    return job;
  });
  const completedJobs = referencedJobs.filter((job) => job.status === "completed");
  const activeJobs = referencedJobs.filter(
    (job) => !["completed", "cancelled"].includes(job.status)
  );
  const jobs = activeJobs.filter((job) => job.executionScope === "worker");
  const captainJobs = activeJobs.filter((job) => job.executionScope === "captain");
  const humanJobs = activeJobs.filter((job) => job.executionScope === "human");
  const integrationValidation = dedupeStrings([
    ...(wave.integrationValidation ?? []),
    ...referencedJobs.flatMap((job) => job.integrationValidation ?? [])
  ]);
  const commandFailures = [];
  for (const command of [
    ...CAPTAIN_GLOBAL_REGENERATION,
    ...integrationValidation
  ]) {
    const safety = validateIntegrationCommand(command);
    if (!safety.ok) {
      commandFailures.push(
        ...safety.violations.map(
          (violation) => `${command}: [${violation.code}] ${violation.message}`
        )
      );
    }
  }
  if (commandFailures.length > 0) {
    throw new Error(
      `Unsafe wave integration command(s):\n- ${commandFailures.join("\n- ")}`
    );
  }

  const root = path.resolve(rootDir);
  const immutableEditionRoots = listImmutableEditionRoots(root);
  const branchInspections = jobs.map((job) =>
    inspectWorkerBranch(root, job)
  );
  const readinessBlockers = branchInspections.flatMap((entry) =>
    entry.blockers.map((blocker) => `${entry.jobId}: ${blocker}`)
  );

  return {
    schemaVersion: "rcap-factory-wave-integration-plan/v1",
    waveId,
    authorityVersion: factoryPlan.authorityVersion,
    authorityEdition: factoryPlan.authorityEdition,
    baseCommit: factoryPlan.baseCommit,
    jobs: branchInspections,
    captainJobs: captainJobs.map((job) => job.jobId),
    humanJobs: humanJobs.map((job) => job.jobId),
    completedJobs: completedJobs.map((job) => job.jobId),
    captainRegeneration: [...CAPTAIN_GLOBAL_REGENERATION],
    integrationValidation,
    protectedRuntimePaths: [...PROTECTED_RUNTIME_PATHS],
    immutableEditionRoots,
    readinessBlockers,
    readyForExecution: readinessBlockers.length === 0,
    safety: {
      dryRunDefault: true,
      explicitExecuteRequired: true,
      workerPathValidationRequired: true,
      oneCommitPerJobRequired: true,
      trackedReviewManifestRequired: true,
      broadStaging: false,
      deployment: false,
      runtimePromotion: false,
      packetReadyChanges: false,
      enabledJurisdictionChanges: false,
      fullSuiteScope: "wave_integration_only"
    },
    steps: [
      "Resolve exactly one unintegrated worker commit for each job branch.",
      "Revalidate every worker commit against owned and forbidden paths.",
      "Cherry-pick worker commits without broad staging.",
      "Reproduce packet and page hashes from each tracked review manifest.",
      "Regenerate global outputs only in the captain worktree.",
      "Run the wave integration validation suite.",
      "Verify runtime, promotion, legacy-generator, and Master Library edition hashes are unchanged."
    ]
  };
}

export async function integrateWave(
  factoryPlan,
  waveId,
  { rootDir = process.cwd(), execute = false } = {}
) {
  const root = path.resolve(rootDir);
  const integrationPlan = buildWaveIntegrationPlan(factoryPlan, waveId, {
    rootDir: root
  });
  if (!execute) {
    return {
      schemaVersion: "rcap-factory-wave-integration-result/v1",
      waveId,
      dryRun: true,
      executed: false,
      passed: true,
      readyForExecution: integrationPlan.readyForExecution,
      readinessBlockers: integrationPlan.readinessBlockers,
      plan: integrationPlan,
      commandResults: [],
      integratedJobs: []
    };
  }
  if (!integrationPlan.readyForExecution) {
    throw new Error(
      `Wave is not ready for execution:\n- ${integrationPlan.readinessBlockers.join("\n- ")}`
    );
  }
  assertCaptainBranch(root);
  assertCleanWorktree(root);

  const protectedBefore = snapshotPaths(root, PROTECTED_RUNTIME_PATHS);
  const editionBefore = snapshotPaths(
    root,
    integrationPlan.immutableEditionRoots
  );
  const integratedJobs = [];
  const commandResults = [];

  for (const inspection of integrationPlan.jobs) {
    if (inspection.alreadyIntegrated) {
      integratedJobs.push({
        jobId: inspection.jobId,
        commit: inspection.commit,
        action: "already_integrated"
      });
      continue;
    }
    const result = runGit(root, ["cherry-pick", inspection.commit]);
    if (result.status !== 0) {
      // Restore the pre-pick state rather than strand the captain in a conflict.
      runGit(root, ["cherry-pick", "--abort"]);
      throw new Error(
        `Cherry-pick failed for ${inspection.jobId}: ${result.stderr.trim() || result.stdout.trim()}`
      );
    }
    integratedJobs.push({
      jobId: inspection.jobId,
      commit: inspection.commit,
      action: "cherry_picked"
    });
  }

  const jobById = new Map(factoryPlan.jobs.map((job) => [job.jobId, job]));
  for (const jobId of integrationPlan.jobs.map((entry) => entry.jobId)) {
    const job = jobById.get(jobId);
    assertExpectedOutputsPresent(root, job);
    const review = verifyTrackedReviewManifest(root, job);
    if (!review.passed) {
      throw new Error(
        `${jobId} review manifest failed:\n- ${review.failures.join("\n- ")}`
      );
    }
    const reproduction = await generateJobReviewArtifacts(job, {
      rootDir: root,
      authorityVersion: factoryPlan.authorityVersion,
      authorityEdition: factoryPlan.authorityEdition,
      performValidation: false,
      write: false
    });
    if (reproduction.manifest.packet.sha256 !== review.manifest.packet.sha256) {
      throw new Error(`${jobId} synthetic packet hash did not reproduce`);
    }
    const expectedPageHashes = review.manifest.renderedPages.map(
      (page) => page.sha256
    );
    const reproducedPageHashes = reproduction.manifest.renderedPages.map(
      (page) => page.sha256
    );
    if (
      JSON.stringify(expectedPageHashes) !== JSON.stringify(reproducedPageHashes)
    ) {
      throw new Error(`${jobId} rendered page hashes did not reproduce`);
    }
  }

  for (const command of integrationPlan.captainRegeneration) {
    const result = runManifestCommand(root, command, {
      RCAP_FACTORY_INTEGRATION_SCOPE: "wave",
      RCAP_FACTORY_WAVE_ID: waveId
    });
    commandResults.push({ phase: "global_regeneration", ...result });
    if (!result.passed) {
      return failedIntegrationResult({
        waveId,
        integrationPlan,
        integratedJobs,
        commandResults,
        failure: `captain regeneration failed: ${command}`
      });
    }
  }

  for (const command of integrationPlan.integrationValidation) {
    const result = runManifestCommand(root, command, {
      RCAP_FACTORY_INTEGRATION_SCOPE: "wave",
      RCAP_FACTORY_WAVE_ID: waveId
    });
    commandResults.push({ phase: "integration_validation", ...result });
    if (!result.passed) {
      return failedIntegrationResult({
        waveId,
        integrationPlan,
        integratedJobs,
        commandResults,
        failure: `integration validation failed: ${command}`
      });
    }
  }

  const protectedAfter = snapshotPaths(root, PROTECTED_RUNTIME_PATHS);
  const editionAfter = snapshotPaths(
    root,
    integrationPlan.immutableEditionRoots
  );
  const invariantFailures = [];
  if (protectedBefore.sha256 !== protectedAfter.sha256) {
    invariantFailures.push(
      "runtime, promotion, deployment, or preserved legacy-generator paths changed"
    );
  }
  if (editionBefore.sha256 !== editionAfter.sha256) {
    invariantFailures.push("an existing Master Library edition changed");
  }
  const unexpectedRegeneration = unexpectedCaptainChanges(
    root,
    integrationPlan.immutableEditionRoots
  );
  if (unexpectedRegeneration.length > 0) {
    invariantFailures.push(
      `captain regeneration changed unexpected paths: ${unexpectedRegeneration.join(", ")}`
    );
  }

  return {
    schemaVersion: "rcap-factory-wave-integration-result/v1",
    waveId,
    dryRun: false,
    executed: true,
    passed: invariantFailures.length === 0,
    readyForExecution: true,
    readinessBlockers: [],
    plan: integrationPlan,
    integratedJobs,
    commandResults,
    invariantFailures,
    captainChanges: gitLines(root, ["status", "--short"])
  };
}

export function validateIntegrationCommand(commandEntry) {
  const command =
    typeof commandEntry === "string"
      ? commandEntry.trim()
      : commandEntry?.command?.trim() ?? "";
  const violations = [];
  if (!command) {
    return {
      ok: false,
      command,
      violations: [
        { code: "invalid_command", message: "integration command is empty" }
      ]
    };
  }
  for (const [code, pattern] of UNSAFE_INTEGRATION_PATTERNS) {
    if (pattern.test(command)) {
      violations.push({ code, message: "command crosses the integration safety boundary" });
    }
  }
  try {
    const argv = tokenizeCommand(command);
    const executable = path.basename(argv[0]);
    if (/^(?:ba|z|c|k)?sh$|^(?:cmd|powershell|pwsh)(?:\.exe)?$/i.test(executable)) {
      violations.push({
        code: "shell_wrapper",
        message: "integration validation may not invoke a shell wrapper"
      });
    }
    if (!["node", "npm", "pnpm", "yarn", "bun"].includes(executable)) {
      violations.push({
        code: "executable_not_allowed",
        message: `integration validation executable is not allowlisted: ${executable}`
      });
    }
  } catch (error) {
    violations.push({ code: "shell_syntax", message: error.message });
  }
  return { ok: violations.length === 0, command, violations };
}

function inspectWorkerBranch(rootDir, job) {
  const branch = `rcap-factory/${scaffoldKeyFor(job.jobId)}`;
  const blockers = [];
  if (!gitRefExists(rootDir, `refs/heads/${branch}`)) {
    return {
      jobId: job.jobId,
      jurisdiction: job.jurisdiction,
      branch,
      commit: null,
      commitSubject: null,
      alreadyIntegrated: false,
      changedPaths: [],
      blockers: [`worker branch is missing (${branch})`]
    };
  }

  const cherry = gitLines(rootDir, ["cherry", "HEAD", branch]);
  const pending = cherry
    .filter((line) => line.startsWith("+ "))
    .map((line) => line.slice(2).trim());
  const equivalent = cherry
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim());
  const branchTip = gitOneLine(rootDir, ["rev-parse", branch]);
  const alreadyIntegrated = pending.length === 0 && equivalent.length > 0;
  const commit = alreadyIntegrated
    ? equivalent[equivalent.length - 1]
    : pending.length === 1
      ? pending[0]
      : branchTip;
  if (!alreadyIntegrated && pending.length !== 1) {
    blockers.push(
      `expected exactly one unintegrated worker commit, found ${pending.length}`
    );
  }

  const commitSubject = commit
    ? gitOneLine(rootDir, ["show", "-s", "--format=%s", commit])
    : null;
  if (commitSubject !== job.commitSubject) {
    blockers.push(
      `commit subject mismatch (expected ${JSON.stringify(job.commitSubject)}, found ${JSON.stringify(commitSubject)})`
    );
  }
  const parentCount = commit
    ? Number(gitOneLine(rootDir, ["show", "-s", "--format=%P", commit])?.split(/\s+/).filter(Boolean).length ?? 0)
    : 0;
  if (parentCount !== 1) blockers.push("worker commit must have exactly one parent");
  if (commit) {
    const parent = gitOneLine(rootDir, ["rev-parse", `${commit}^`]);
    if (parent !== job.baseCommit) {
      blockers.push(
        `worker commit parent mismatch (expected ${job.baseCommit}, found ${parent})`
      );
    }
  }

  const changedPaths = commit
    ? gitNullList(rootDir, [
        "diff-tree",
        "--no-commit-id",
        "--name-only",
        "--diff-filter=ACDMRTUXB",
        "-r",
        "-z",
        commit
      ])
        .map(normalizeRepoPath)
        .sort((left, right) => left.localeCompare(right))
    : [];
  const pathValidation = validateChangedPaths(job, changedPaths);
  blockers.push(...pathValidation.violations.map((entry) => entry.message));

  for (const output of job.expectedOutputs ?? []) {
    const normalized = normalizeRepoPath(output);
    if (!commit || !gitObjectExists(rootDir, `${commit}:${normalized}`)) {
      blockers.push(`expected output is absent from worker commit: ${normalized}`);
    }
  }
  const reviewPath =
    `data/record-clearing/production-factory/review-manifests/${job.jobId}.json`;
  if (!commit || !gitObjectExists(rootDir, `${commit}:${reviewPath}`)) {
    blockers.push(`tracked review manifest is absent from worker commit: ${reviewPath}`);
  } else {
    try {
      const review = JSON.parse(gitOneBlob(rootDir, `${commit}:${reviewPath}`));
      if (review.jobId !== job.jobId) blockers.push("review manifest jobId mismatch");
      if (review.baseCommit !== job.baseCommit) blockers.push("review manifest baseCommit mismatch");
      if (!/^[0-9a-f]{64}$/.test(review.packet?.sha256 ?? "")) {
        blockers.push("review manifest packet hash is invalid");
      }
      if (review.technicalProofPassed !== true) {
        blockers.push("review manifest technical proof is not passed");
      }
      if (
        !Array.isArray(review.renderedPages) ||
        review.renderedPages.length !== review.packet?.pageCount ||
        review.renderedPages.some(
          (page) => !/^[0-9a-f]{64}$/.test(page.sha256 ?? "")
        )
      ) {
        blockers.push("review manifest rendered-page proof is invalid");
      }
      if (review.visualProofPassed !== false) {
        blockers.push("worker review manifest may not approve visual proof");
      }
      if (review.counselAdopted !== false) {
        blockers.push("worker review manifest may not adopt counsel approval");
      }
    } catch (error) {
      blockers.push(`review manifest is unreadable: ${error.message}`);
    }
  }

  return {
    jobId: job.jobId,
    jurisdiction: job.jurisdiction,
    branch,
    commit,
    commitSubject,
    alreadyIntegrated,
    changedPaths,
    blockers: [...new Set(blockers)].sort((left, right) =>
      left.localeCompare(right)
    )
  };
}

function assertExpectedOutputsPresent(rootDir, job) {
  for (const output of job.expectedOutputs ?? []) {
    const normalized = normalizeRepoPath(output);
    if (!fs.existsSync(path.join(rootDir, normalized))) {
      throw new Error(`${job.jobId} expected output missing after integration: ${normalized}`);
    }
  }
}

function assertCaptainBranch(rootDir) {
  const branch = gitOneLine(rootDir, ["branch", "--show-current"]);
  if (!branch) throw new Error("Wave integration requires a named captain branch");
  if (["main", "master"].includes(branch)) {
    throw new Error(`Refusing wave integration directly on ${branch}`);
  }
}

function assertCleanWorktree(rootDir) {
  const status = gitLines(rootDir, ["status", "--porcelain"]);
  if (status.length > 0) {
    throw new Error(
      `Wave execution requires a clean captain worktree; found ${status.length} change(s)`
    );
  }
}

function snapshotPaths(rootDir, relativePaths) {
  const digest = crypto.createHash("sha256");
  const files = relativePaths
    .flatMap((relativePath) => {
      const absolutePath = path.join(rootDir, relativePath);
      if (!fs.existsSync(absolutePath)) return [];
      if (fs.statSync(absolutePath).isDirectory()) return listFiles(absolutePath);
      return [absolutePath];
    })
    .sort((left, right) => left.localeCompare(right));
  for (const file of files) {
    digest.update(path.relative(rootDir, file).replaceAll(path.sep, "/"));
    digest.update("\0");
    digest.update(fs.readFileSync(file));
    digest.update("\0");
  }
  return { sha256: digest.digest("hex"), fileCount: files.length };
}

function unexpectedCaptainChanges(rootDir, immutableEditionRoots) {
  const changed = [
    ...gitLines(rootDir, ["diff", "--name-only"]),
    ...gitLines(rootDir, ["diff", "--cached", "--name-only"])
  ];
  return [...new Set(changed.map(normalizeRepoPath))]
    .filter((changedPath) => {
      if (GLOBAL_GENERATED_PATHS.includes(changedPath)) return false;
      if (
        changedPath.startsWith("data/record-clearing/master-library/") &&
        !immutableEditionRoots.some(
          (editionRoot) =>
            changedPath === editionRoot ||
            changedPath.startsWith(`${editionRoot}/`)
        )
      ) {
        return false;
      }
      return true;
    })
    .sort((left, right) => left.localeCompare(right));
}

function listImmutableEditionRoots(rootDir) {
  const absoluteMasterLibrary = path.join(rootDir, MASTER_LIBRARY_ROOT);
  if (!fs.existsSync(absoluteMasterLibrary)) return [];
  return fs
    .readdirSync(absoluteMasterLibrary, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        `${MASTER_LIBRARY_ROOT}/${entry.name}`.startsWith(
          IMMUTABLE_EDITION_PREFIX
        )
    )
    .map((entry) => `${MASTER_LIBRARY_ROOT}/${entry.name}`)
    .sort((left, right) => left.localeCompare(right));
}

function failedIntegrationResult({
  waveId,
  integrationPlan,
  integratedJobs,
  commandResults,
  failure
}) {
  return {
    schemaVersion: "rcap-factory-wave-integration-result/v1",
    waveId,
    dryRun: false,
    executed: true,
    passed: false,
    readyForExecution: true,
    readinessBlockers: [],
    plan: integrationPlan,
    integratedJobs,
    commandResults,
    invariantFailures: [failure],
    captainChanges: []
  };
}

function dedupeStrings(values) {
  return [...new Set(values)].filter(Boolean);
}

function listFiles(directory) {
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...listFiles(absolutePath));
    else if (entry.isFile()) output.push(absolutePath);
  }
  return output;
}

function gitRefExists(rootDir, ref) {
  return (
    spawnSync("git", ["show-ref", "--verify", "--quiet", ref], {
      cwd: rootDir,
      encoding: "utf8"
    }).status === 0
  );
}

function gitObjectExists(rootDir, object) {
  return (
    spawnSync("git", ["cat-file", "-e", object], {
      cwd: rootDir,
      encoding: "utf8"
    }).status === 0
  );
}

function gitOneBlob(rootDir, object) {
  const result = spawnSync("git", ["show", object], {
    cwd: rootDir,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024
  });
  if (result.status !== 0) throw new Error(result.stderr.trim() || `cannot read ${object}`);
  return result.stdout;
}

function gitOneLine(rootDir, args) {
  const result = spawnSync("git", args, { cwd: rootDir, encoding: "utf8" });
  if (result.status !== 0) return null;
  return result.stdout.trim() || null;
}

function gitLines(rootDir, args) {
  const result = spawnSync("git", args, {
    cwd: rootDir,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024
  });
  if (result.status !== 0) return [];
  return result.stdout.split(/\r?\n/).filter(Boolean);
}

function gitNullList(rootDir, args) {
  const result = spawnSync("git", args, {
    cwd: rootDir,
    encoding: "buffer",
    maxBuffer: 32 * 1024 * 1024
  });
  if (result.status !== 0) return [];
  return Buffer.from(result.stdout ?? [])
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
}

function runGit(rootDir, args) {
  return spawnSync("git", args, {
    cwd: rootDir,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024
  });
}
