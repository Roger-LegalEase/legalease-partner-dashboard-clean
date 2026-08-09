import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

import { scaffoldKeyFor } from "./scaffold.mjs";

const MAX_COMMAND_OUTPUT = 32 * 1024 * 1024;

/**
 * Outputs which are regenerated only by the integration captain.  A worker may
 * read them, but listing one in ownedPaths does not make it writable.
 */
export const GLOBAL_GENERATED_PATHS = Object.freeze([
  "data/rcap-all50/all-state-build-manifest.json",
  "data/record-clearing/source-artifact-registry.json",
  "data/record-clearing/relief-track-registry.json",
  "data/record-clearing/relief-track-artifact-reconciliation.json",
  "data/record-clearing/legal-design-batch-delta-report.json",
  "data/record-clearing/legal-design-legal-research-queue.json",
  "data/record-clearing/legal-design-guidance-rereview-queue.json",
  "data/record-clearing/legal-design-track-registry.json",
  "data/record-clearing/legal-design-packet-set-manifests.json",
  "data/record-clearing/legal-design-track-source-relationships.json",
  "data/record-clearing/legal-design-specifications.json",
  "data/record-clearing/legal-design-implementation-queue.json",
  "data/record-clearing/master-library/authority.json",
  "data/record-clearing/master-library/authoritative-blocker-ledger.json",
  "data/record-clearing/master-library/reconciliation.json",
  "data/record-clearing/master-library/repository-asset-audit.json",
  "data/record-clearing/master-library/track-source-audit.json",
  "data/record-clearing/master-library/pending-edition-amendments.json",
  "data/record-clearing/master-library/source-acquisition-queue.json",
  "data/record-clearing/master-library/edition-1-2-legal-design-reconciliation-queue.json",
  "data/record-clearing/production-factory/packet-proofs",
  "data/record-clearing/production-factory/official-pdf-proofs",
  "data/record-clearing/production-factory/review-manifests",
  "data/record-clearing/production-factory/legal-review-materialization-contract.json",
  "data/record-clearing/production-factory/official-pdf-source-assignment-projection.json",
  "docs/record-clearing/MASTER_LIBRARY_AUTHORITY.md",
  "src/lib/rcap/legal-design/master-library-authority.ts",
  "src/lib/rcap/packets/registry.ts"
]);

/**
 * Runtime, promotion, deployment, billing, auth, and live-generator surfaces
 * are outside every factory worker assignment.
 */
export const ALWAYS_FORBIDDEN_PATHS = Object.freeze([
  ".env",
  ".env.development",
  ".env.development.local",
  ".env.local",
  ".env.production",
  ".env.production.local",
  ".env.test",
  ".env.test.local",
  ".github/workflows",
  ".vercel",
  "package-lock.json",
  "package.json",
  "supabase",
  "vercel.json",
  "src/lib/rcap/jurisdictions/packet-capability.ts",
  "src/lib/rcap/state-promotion-manifest.ts",
  "src/lib/rcap/state-promotion-rules.ts",
  "scripts/rcap-enable-all51-launch.mjs",
  "scripts/rcap-promote-state.mjs",
  "scripts/rcap-apply-promotion-batch.mjs",
  "src/app/api/rcap/documents/mississippi",
  "src/app/api/rcap/documents/illinois",
  "src/app/api/rcap/documents/dc",
  "src/app/api/rcap/documents/pennsylvania",
  "src/app/api/rcap/documents/texas-harris",
  "src/app/documents/[partnerSlug]/form/MississippiPetitionInformationForm.tsx",
  "src/app/documents/[partnerSlug]/form/IllinoisPetitionInformationForm.tsx",
  "src/app/documents/[partnerSlug]/form/PennsylvaniaPetitionInformationForm.tsx",
  "src/components/rcap/documents",
  "src/lib/rcap/documents/source-repository.ts",
  "src/lib/record-clearing/pennsylvania-config.ts"
]);

const REVIEW_MANIFEST_PREFIX =
  "data/record-clearing/production-factory/review-manifests/";
const EXISTING_EDITION_PATTERN =
  /^data\/record-clearing\/master-library\/edition-[^/]+(?:\/|$)/;
const MEMO_PATTERNS = [
  /^data\/record-clearing\/legal-design-intake\/([A-Z]{2})\.memo\.json$/,
  /\/legal-review-addenda\/([A-Z]{2})\.md$/
];

const JURISDICTION_CODES = new Map(
  [
    ["alabama", "AL"],
    ["alaska", "AK"],
    ["arizona", "AZ"],
    ["arkansas", "AR"],
    ["california", "CA"],
    ["colorado", "CO"],
    ["connecticut", "CT"],
    ["delaware", "DE"],
    ["district of columbia", "DC"],
    ["dc", "DC"],
    ["florida", "FL"],
    ["georgia", "GA"],
    ["hawaii", "HI"],
    ["idaho", "ID"],
    ["illinois", "IL"],
    ["indiana", "IN"],
    ["iowa", "IA"],
    ["kansas", "KS"],
    ["kentucky", "KY"],
    ["louisiana", "LA"],
    ["maine", "ME"],
    ["maryland", "MD"],
    ["massachusetts", "MA"],
    ["michigan", "MI"],
    ["minnesota", "MN"],
    ["mississippi", "MS"],
    ["missouri", "MO"],
    ["montana", "MT"],
    ["nebraska", "NE"],
    ["nevada", "NV"],
    ["new hampshire", "NH"],
    ["new jersey", "NJ"],
    ["new mexico", "NM"],
    ["new york", "NY"],
    ["north carolina", "NC"],
    ["north dakota", "ND"],
    ["ohio", "OH"],
    ["oklahoma", "OK"],
    ["oregon", "OR"],
    ["pennsylvania", "PA"],
    ["rhode island", "RI"],
    ["south carolina", "SC"],
    ["south dakota", "SD"],
    ["tennessee", "TN"],
    ["texas", "TX"],
    ["utah", "UT"],
    ["vermont", "VT"],
    ["virginia", "VA"],
    ["washington", "WA"],
    ["west virginia", "WV"],
    ["wisconsin", "WI"],
    ["wyoming", "WY"]
  ]
);

const UNSAFE_WORKER_COMMANDS = [
  {
    code: "recursive_validation",
    pattern: /\brcap-factory-validate-job(?:\.mjs)?\b/i,
    message: "focused validation may not invoke its own factory wrapper"
  },
  {
    code: "full_suite_worker_command",
    pattern:
      /(?:^|[;&|]\s*)(?:(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?test(?:\s|$)|node\s+--test(?:\s|$))/i,
    message: "the full test suite may run only during wave integration"
  },
  {
    code: "broad_staging",
    pattern: /(?:^|[;&|]\s*)git\s+add\s+(?:-A|--all|\.(?:\s|$))/i,
    message: "broad git staging is forbidden"
  },
  {
    code: "deployment_command",
    pattern: /\b(?:vercel|netlify)\s+(?:deploy|--prod)\b|\bnpm\s+run\s+deploy\b/i,
    message: "deployment commands are forbidden"
  },
  {
    code: "push_command",
    pattern: /(?:^|[;&|]\s*)git\s+push\b/i,
    message: "workers may not push"
  },
  {
    code: "promotion_command",
    pattern:
      /\brcap-(?:enable-all51-launch|promote-state)\b|\brcap-apply-promotion-batch\b[\s\S]*\s--apply\b/i,
    message: "runtime promotion commands are forbidden"
  },
  {
    code: "live_migration_command",
    pattern: /\bsupabase\s+(?:db\s+push|migration|link)\b/i,
    message: "live Supabase operations are forbidden"
  },
  {
    code: "destructive_git_command",
    pattern: /(?:^|[;&|]\s*)git\s+(?:reset\s+--hard|clean\s+-[a-z]*f)/i,
    message: "destructive git commands are forbidden"
  },
  {
    code: "destructive_file_command",
    pattern: /(?:^|[;&|]\s*)rm\s+-[a-z]*r[a-z]*f|(?:^|[;&|]\s*)rm\s+-[a-z]*f[a-z]*r/i,
    message: "destructive recursive removal is forbidden"
  }
];

/**
 * Return one deterministic classification record per changed path.
 *
 * This is deliberately pure: focused tests can prove that a path is accepted
 * or rejected without creating a git worktree.
 */
export function classifyJobChanges(job, changedPaths) {
  const ownedPaths = normalizePathList(job?.ownedPaths ?? []);
  const forbiddenPaths = normalizePathList(job?.forbiddenPaths ?? []);
  const jurisdictionCode = normalizeJurisdictionCode(job?.jurisdiction);
  const uniquePaths = [...new Set((changedPaths ?? []).map(normalizeRepoPath))].sort(
    (a, b) => a.localeCompare(b)
  );

  return uniquePaths.map((changedPath) => {
    const reasons = [];

    if (!ownedPaths.some((ownedPath) => pathRuleMatches(ownedPath, changedPath))) {
      reasons.push({
        code: "outside_owned_paths",
        message: `${changedPath} is outside the job's ownedPaths`
      });
    }

    const explicitForbidden = forbiddenPaths.find((forbiddenPath) =>
      pathRuleMatches(forbiddenPath, changedPath)
    );
    if (explicitForbidden) {
      reasons.push({
        code: "forbidden_path",
        message: `${changedPath} matches forbidden path ${explicitForbidden}`
      });
    }

    const alwaysForbidden = ALWAYS_FORBIDDEN_PATHS.find((forbiddenPath) =>
      pathRuleMatches(forbiddenPath, changedPath)
    );
    if (alwaysForbidden) {
      reasons.push({
        code: "factory_boundary",
        message: `${changedPath} is outside the production-factory worker boundary`
      });
    }

    if (
      GLOBAL_GENERATED_PATHS.some((generatedPath) =>
        pathRuleMatches(generatedPath, changedPath)
      )
    ) {
      reasons.push({
        code: "global_generated_output",
        message: `${changedPath} is regenerated only by the integration captain`
      });
    }

    if (/^\.env(?:\.|$)/.test(changedPath)) {
      reasons.push({
        code: "production_environment_path",
        message: `${changedPath} is an environment or secret-bearing path`
      });
    }

    if (EXISTING_EDITION_PATTERN.test(changedPath)) {
      reasons.push({
        code: "immutable_master_library_edition",
        message: `${changedPath} belongs to an existing immutable Master Library edition`
      });
    }

    const memoJurisdiction = jurisdictionFromMemoPath(changedPath);
    if (
      memoJurisdiction &&
      (!jurisdictionCode || memoJurisdiction !== jurisdictionCode)
    ) {
      reasons.push({
        code: "other_jurisdiction_memo",
        message: `${changedPath} is ${memoJurisdiction}'s memo, not ${jurisdictionCode ?? "this job's jurisdiction"}`
      });
    }

    if (
      changedPath.startsWith("artifacts/") &&
      /\.(?:pdf|png|jpe?g|webp|tiff?|zip)$/i.test(changedPath)
    ) {
      reasons.push({
        code: "generated_binary_tracked",
        message: `${changedPath} is a reproducible binary and must remain ignored`
      });
    }

    return {
      path: changedPath,
      allowed: reasons.length === 0,
      classification: reasons.length === 0 ? "owned" : "rejected",
      reasons
    };
  });
}

export function validateChangedPaths(job, changedPaths) {
  let classified;
  try {
    classified = classifyJobChanges(job, changedPaths);
  } catch (error) {
    return {
      ok: false,
      changedPaths: [],
      allowedPaths: [],
      violations: [
        {
          code: "invalid_path",
          path: null,
          message: error.message
        }
      ],
      classified: []
    };
  }

  const violations = classified.flatMap((entry) =>
    entry.reasons.map((reason) => ({ ...reason, path: entry.path }))
  );
  return {
    ok: violations.length === 0,
    changedPaths: classified.map((entry) => entry.path),
    allowedPaths: classified
      .filter((entry) => entry.allowed)
      .map((entry) => entry.path),
    violations,
    classified
  };
}

export function validateWorkerCommand(commandEntry) {
  const command = commandFromEntry(commandEntry);
  if (!command) {
    return {
      ok: false,
      command: "",
      violations: [
        {
          code: "invalid_command",
          message: "validation command must be a non-empty string or { command }"
        }
      ]
    };
  }

  const violations = UNSAFE_WORKER_COMMANDS.filter(({ pattern }) =>
    pattern.test(command)
  ).map(({ code, message }) => ({ code, message }));
  try {
    const argv = tokenizeCommand(command);
    if (/^(?:ba|z|c|k)?sh$|^(?:cmd|powershell|pwsh)(?:\.exe)?$/i.test(path.basename(argv[0]))) {
      violations.push({
        code: "shell_wrapper",
        message: "validation commands may not invoke a shell wrapper"
      });
    }
  } catch (error) {
    violations.push({
      code: "shell_syntax",
      message: error.message
    });
  }
  return { ok: violations.length === 0, command, violations };
}

/**
 * Inspect a real worker worktree and, only after every boundary check passes,
 * run the job's focused validation commands.  Integration commands are never
 * read or executed here.
 */
export function validateJobWorkspace(
  job,
  {
    rootDir = process.cwd(),
    baselineCommit,
    changedPaths,
    validationScope = "focused",
    runCommands = true,
    requireExpectedOutputs = true
  } = {}
) {
  const failures = [];
  const notes = [];
  const root = path.resolve(rootDir);
  const scaffoldMarker = readWorkerMarker(root);
  const resolvedBaseline =
    baselineCommit ?? scaffoldMarker?.workerBaseCommit ?? job?.baseCommit;
  const scaffoldBaseline = scaffoldMarker?.workerBaseCommit ?? null;

  if (!job || typeof job !== "object") {
    return failedWorkspaceReport("unknown", [
      failure("invalid_job", null, "job manifest is required")
    ]);
  }

  failures.push(...validateWorkerMarker(root, job, scaffoldMarker));

  if (!resolvedBaseline || typeof resolvedBaseline !== "string") {
    failures.push(
      failure(
        "missing_baseline",
        null,
        "job has no baseCommit and no scaffold baseline could be resolved"
      )
    );
  } else if (!gitCommitExists(root, resolvedBaseline)) {
    failures.push(
      failure(
        "unknown_baseline",
        null,
        `validation baseline does not resolve to a commit: ${resolvedBaseline}`
      )
    );
  } else if (
    baselineCommit &&
    baselineCommit !== job.baseCommit &&
    baselineCommit !== scaffoldBaseline
  ) {
    failures.push(
      failure(
        "baseline_override_rejected",
        null,
        "an explicit baseline must equal the job or scaffold baseline"
      )
    );
  } else if (!gitIsAncestor(root, resolvedBaseline, "HEAD")) {
    failures.push(
      failure(
        "baseline_not_ancestor",
        null,
        `validation baseline ${resolvedBaseline} is not an ancestor of HEAD`
      )
    );
  } else if (!gitIsAncestor(root, job.baseCommit, "HEAD")) {
    failures.push(
      failure(
        "base_not_ancestor",
        null,
        `job baseCommit ${job.baseCommit} is not an ancestor of HEAD`
      )
    );
  }

  const materializedInputsByDestination = new Map(
    (job.sourceMaterializationInputs ?? []).map((input) => [
      input.materializationDestination,
      input
    ])
  );
  const inputReport = checkManifestPaths(
    root,
    (job.requiredInputs ?? []).filter(
      (input) => !materializedInputsByDestination.has(input)
    ),
    "required_input_missing"
  );
  failures.push(...inputReport.failures);
  failures.push(
    ...checkExternalMaterializedInputs(
      root,
      [...materializedInputsByDestination.values()]
    )
  );

  if (requireExpectedOutputs) {
    const outputReport = checkManifestPaths(
      root,
      job.expectedOutputs ?? [],
      "expected_output_missing"
    );
    failures.push(...outputReport.failures);
  }

  let gitChanges = {
    changedPaths: [],
    stagedPaths: [],
    untrackedPaths: []
  };
  if (changedPaths) {
    gitChanges.changedPaths = [...new Set(changedPaths.map(normalizeRepoPath))].sort(
      (a, b) => a.localeCompare(b)
    );
  } else if (resolvedBaseline && gitCommitExists(root, resolvedBaseline)) {
    try {
      gitChanges = collectGitChanges(root, resolvedBaseline);
    } catch (error) {
      failures.push(failure("git_diff_failed", null, error.message));
    }
  }

  const pathValidation = validateChangedPaths(job, gitChanges.changedPaths);
  failures.push(...pathValidation.violations);

  const stagedValidation = validateChangedPaths(job, gitChanges.stagedPaths);
  for (const violation of stagedValidation.violations) {
    failures.push({
      ...violation,
      code: `staged_${violation.code}`,
      message: `staged change rejected: ${violation.message}`
    });
  }

  if (
    resolvedBaseline &&
    gitCommitExists(root, resolvedBaseline) &&
    pathValidation.changedPaths.length > 0
  ) {
    failures.push(
      ...inspectProtectedContentChanges(
        root,
        resolvedBaseline,
        pathValidation.changedPaths,
        gitChanges.untrackedPaths
      )
    );
  }

  const commandResults = [];
  const focusedCommands = job.focusedValidation ?? [];
  for (const commandEntry of focusedCommands) {
    const commandSafety = validateWorkerCommand(commandEntry);
    if (!commandSafety.ok) {
      for (const violation of commandSafety.violations) {
        failures.push(
          failure(
            violation.code,
            null,
            `${violation.message}: ${commandSafety.command || "<invalid>"}`
          )
        );
      }
    }
  }

  if (failures.length === 0 && runCommands) {
    for (const commandEntry of focusedCommands) {
      const result = runManifestCommand(root, commandEntry, {
        RCAP_FACTORY_JOB_ID: job.jobId,
        RCAP_FACTORY_VALIDATION_SCOPE: validationScope
      });
      commandResults.push(result);
      if (!result.passed) {
        failures.push(
          failure(
            "focused_validation_failed",
            null,
            `focused validation failed (${result.command}, exit ${result.exitCode ?? "unknown"})`
          )
        );
        break;
      }
    }
  } else if (!runCommands && focusedCommands.length > 0) {
    notes.push("focused validation commands were checked but not executed");
  }

  return {
    schemaVersion: "rcap-factory-job-validation/v1",
    jobId: job.jobId,
    jurisdiction: job.jurisdiction,
    baselineCommit: resolvedBaseline ?? null,
    scope: "focused",
    passed: failures.length === 0,
    changedPaths: pathValidation.changedPaths,
    stagedPaths: gitChanges.stagedPaths,
    untrackedPaths: gitChanges.untrackedPaths,
    allowedPaths: pathValidation.allowedPaths,
    failures: dedupeFailures(failures),
    commandResults,
    notes
  };
}

export function collectGitChanges(rootDir, baselineCommit) {
  const tracked = gitNullList(rootDir, [
    "diff",
    "--name-only",
    "--diff-filter=ACDMRTUXB",
    "-z",
    baselineCommit,
    "--"
  ]);
  const untrackedPaths = gitNullList(rootDir, [
    "ls-files",
    "--others",
    "--exclude-standard",
    "-z"
  ]);
  const stagedPaths = gitNullList(rootDir, [
    "diff",
    "--cached",
    "--name-only",
    "--diff-filter=ACDMRTUXB",
    "-z",
    "--"
  ]);
  const changed = [...new Set([...tracked, ...untrackedPaths])]
    .map(normalizeRepoPath)
    .sort((a, b) => a.localeCompare(b));

  return {
    changedPaths: changed,
    stagedPaths: [...new Set(stagedPaths.map(normalizeRepoPath))].sort((a, b) =>
      a.localeCompare(b)
    ),
    untrackedPaths: [...new Set(untrackedPaths.map(normalizeRepoPath))].sort(
      (a, b) => a.localeCompare(b)
    )
  };
}

export function runManifestCommand(rootDir, commandEntry, extraEnv = {}) {
  const command = commandFromEntry(commandEntry);
  const entry =
    commandEntry && typeof commandEntry === "object" ? commandEntry : {};
  const commandCwd = entry.cwd
    ? path.resolve(rootDir, normalizeRepoPath(entry.cwd))
    : rootDir;
  if (!pathIsInside(rootDir, commandCwd)) {
    return {
      command,
      passed: false,
      exitCode: null,
      signal: null,
      stdout: "",
      stderr: "command cwd escapes the repository"
    };
  }

  let argv;
  try {
    argv = tokenizeCommand(command);
  } catch (error) {
    return {
      command,
      passed: false,
      exitCode: null,
      signal: null,
      stdout: "",
      stderr: error.message
    };
  }
  const result = spawnSync(argv[0], argv.slice(1), {
    cwd: commandCwd,
    shell: false,
    encoding: "utf8",
    maxBuffer: MAX_COMMAND_OUTPUT,
    env: {
      ...process.env,
      ...extraEnv,
      ...(entry.env && typeof entry.env === "object" ? entry.env : {})
    }
  });
  return {
    command,
    // Some managed runners attach an EPERM diagnostic after a child has
    // already exited successfully. A real spawn failure has status=null; an
    // observed zero exit status remains authoritative.
    passed: result.status === 0,
    exitCode: result.status,
    signal: result.signal ?? null,
    stdout: result.stdout ?? "",
    stderr: result.error && result.status !== 0
      ? `${result.stderr ?? ""}${result.stderr ? "\n" : ""}${result.error.message}`
      : result.stderr ?? ""
  };
}

/**
 * Parse a deliberately small command-string language into argv.
 *
 * Job manifests need readable command strings, but worker validation does not
 * need a shell. Operators, redirection, command substitution and environment
 * assignments are refused; simple single/double quotes and backslash escapes
 * are supported.
 */
export function tokenizeCommand(command) {
  if (typeof command !== "string" || command.trim().length === 0) {
    throw new Error("command must be a non-empty string");
  }
  if (/[\r\n\0]/.test(command)) {
    throw new Error("validation command may not contain control lines");
  }
  const argv = [];
  let token = "";
  let state = "normal";
  let tokenStarted = false;

  const pushToken = () => {
    if (!tokenStarted) return;
    argv.push(token);
    token = "";
    tokenStarted = false;
  };

  for (let index = 0; index < command.length; index += 1) {
    const character = command[index];
    if (state === "normal") {
      if (/\s/.test(character)) {
        pushToken();
      } else if (character === "'") {
        state = "single";
        tokenStarted = true;
      } else if (character === "\"") {
        state = "double";
        tokenStarted = true;
      } else if (character === "\\") {
        index += 1;
        if (index >= command.length) {
          throw new Error("validation command ends with an incomplete escape");
        }
        token += command[index];
        tokenStarted = true;
      } else if (";&|<>`".includes(character)) {
        throw new Error(
          `shell operator ${JSON.stringify(character)} is not allowed in validation commands`
        );
      } else if (
        character === "$" &&
        ["(", "{", "`"].includes(command[index + 1])
      ) {
        throw new Error("shell substitution is not allowed in validation commands");
      } else {
        token += character;
        tokenStarted = true;
      }
    } else if (state === "single") {
      if (character === "'") state = "normal";
      else token += character;
    } else if (state === "double") {
      if (character === "\"") {
        state = "normal";
      } else if (character === "\\") {
        index += 1;
        if (index >= command.length) {
          throw new Error("validation command ends with an incomplete escape");
        }
        token += command[index];
      } else {
        token += character;
      }
    }
  }
  if (state !== "normal") {
    throw new Error(`validation command has an unterminated ${state} quote`);
  }
  pushToken();
  if (argv.length === 0 || argv[0].length === 0) {
    throw new Error("validation command has no executable");
  }
  if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(argv[0])) {
    throw new Error("inline environment assignments are not allowed; use command env metadata");
  }
  return argv;
}

export function normalizeRepoPath(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("repository paths must be non-empty strings");
  }
  const raw = value.trim().replaceAll("\\", "/").replace(/^\.\/+/, "");
  if (path.posix.isAbsolute(raw) || /^[A-Za-z]:\//.test(raw)) {
    throw new Error(`absolute repository path is not allowed: ${value}`);
  }
  const normalized = path.posix.normalize(raw).replace(/\/+$/, "");
  if (
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  ) {
    throw new Error(`repository path escapes the worktree: ${value}`);
  }
  return normalized;
}

export function pathRuleMatches(rule, candidate) {
  const normalizedRule = normalizeRepoPath(rule);
  const normalizedCandidate = normalizeRepoPath(candidate);
  if (normalizedRule.includes("*")) {
    const regex = new RegExp(
      `^${escapeRegExp(normalizedRule)
        .replaceAll("\\*\\*", ".*")
        .replaceAll("\\*", "[^/]*")}(?:/.*)?$`
    );
    return regex.test(normalizedCandidate);
  }
  return (
    normalizedCandidate === normalizedRule ||
    normalizedCandidate.startsWith(`${normalizedRule}/`)
  );
}

export function reviewManifestPathFor(jobId) {
  const safeJobId = safeIdentifier(jobId, "jobId");
  return `${REVIEW_MANIFEST_PREFIX}${safeJobId}.json`;
}

function inspectProtectedContentChanges(
  rootDir,
  baselineCommit,
  changedPaths,
  untrackedPaths
) {
  const failures = [];
  const untracked = new Set(untrackedPaths);
  // Naming a runtime flag is not setting one.
  //
  // These matched the bare identifier on any changed line, which caught the
  // opposite of what they exist to catch: a worker verifier whose whole job is
  // to refuse runtime-enabling values has to name them to forbid them, and
  // Wyoming's guidance verifier was rejected for carrying its own table of
  // patterns that must never appear in an owned artifact. A guard that fails on
  // the guard is a false blocker, and the way past it would have been for the
  // worker to weaken its own check.
  //
  // What a worker may not do is *set* one of these to an enabling value, and
  // every real enablement is an assignment. The real runtime and enablement
  // surfaces are unreachable anyway: they are forbidden by path above, so this
  // is the second layer rather than the only one. Disabling values and
  // prohibitions pass; `productionEnabled: true` does not.
  const protectedLinePatterns = [
    {
      code: "packet_ready_change",
      pattern: /\bpacket_?ready\b\s*[:=]\s*(?:true\b|["']?[1-9])/i,
      message: "packet_ready may not be set to a ready value in a worker job"
    },
    {
      code: "enabled_jurisdiction_change",
      pattern:
        /\b(?:enabledJurisdictions|ENABLED_JURISDICTIONS|enabled_jurisdictions)\b\s*[:=]\s*["']?[1-9]/i,
      message: "enabled jurisdictions may not be set above zero in a worker job"
    },
    {
      code: "runtime_enablement_change",
      pattern:
        /\b(?:productionEnabled|production_enabled|runtimeEnabled|runtime_enabled|liveEnabled)\b\s*[:=]\s*true\b/i,
      message: "runtime enablement may not be set true in a worker job"
    },
    {
      code: "runtime_disable_removed",
      pattern: /\b(?:runtimeDisabled|runtime_disabled)\b\s*[:=]\s*false\b/i,
      message: "a worker job may not turn runtime_disabled off"
    },
    {
      code: "runtime_status_change",
      pattern: /\bruntime_?status\b\s*[:=]\s*["']?runtime_enabled\b/i,
      message: "a worker job may not set runtime_status to runtime_enabled"
    }
  ];

  for (const changedPath of changedPaths) {
    let changedLines = [];
    if (untracked.has(changedPath)) {
      const absolutePath = path.join(rootDir, changedPath);
      if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
        continue;
      }
      const size = fs.statSync(absolutePath).size;
      if (size > 2 * 1024 * 1024) continue;
      changedLines = fs.readFileSync(absolutePath, "utf8").split(/\r?\n/);
    } else {
      const result = spawnSync(
        "git",
        ["diff", "--unified=0", "--no-ext-diff", baselineCommit, "--", changedPath],
        {
          cwd: rootDir,
          encoding: "utf8",
          maxBuffer: MAX_COMMAND_OUTPUT
        }
      );
      if (result.status !== 0) {
        failures.push(
          failure(
            "content_diff_failed",
            changedPath,
            `could not inspect protected content changes for ${changedPath}`
          )
        );
        continue;
      }
      changedLines = (result.stdout ?? "")
        .split(/\r?\n/)
        .filter(
          (line) =>
            (/^[+-]/.test(line) && !line.startsWith("+++") && !line.startsWith("---"))
        )
        .map((line) => line.slice(1));
    }

    for (const protectedPattern of protectedLinePatterns) {
      if (changedLines.some((line) => protectedPattern.pattern.test(line))) {
        failures.push(
          failure(
            protectedPattern.code,
            changedPath,
            protectedPattern.message
          )
        );
      }
    }
  }
  return failures;
}

function checkExternalMaterializedInputs(rootDir, inputs) {
  if (inputs.length === 0) return [];
  const failures = [];
  const configuredRoot =
    typeof process.env.RCAP_SOURCE_MATERIALIZATION_ROOT === "string"
      ? process.env.RCAP_SOURCE_MATERIALIZATION_ROOT.trim()
      : "";
  if (!configuredRoot) {
    return inputs.map((input) =>
      failure(
        "required_input_missing",
        input.materializationDestination,
        "RCAP_SOURCE_MATERIALIZATION_ROOT is required for an exact materialized source input"
      )
    );
  }
  let externalRoot;
  try {
    externalRoot = fs.realpathSync(path.resolve(configuredRoot));
    const rootStat = fs.lstatSync(externalRoot);
    if (
      !rootStat.isDirectory() ||
      rootStat.isSymbolicLink() ||
      (rootStat.mode & 0o777) !== 0o555
    ) {
      throw new Error("the external materialization root is not a sealed directory");
    }
  } catch (error) {
    return inputs.map((input) =>
      failure(
        "required_input_missing",
        input.materializationDestination,
        `external materialization root is unavailable: ${error.message}`
      )
    );
  }
  for (const input of inputs) {
    const destination = path.resolve(
      externalRoot,
      ...String(input.materializationDestination ?? "").split("/")
    );
    const relative = path.relative(externalRoot, destination);
    if (
      relative === ".." ||
      relative.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relative)
    ) {
      failures.push(
        failure(
          "required_input_missing",
          input.materializationDestination,
          "materialized source destination escapes the approved external root"
        )
      );
      continue;
    }
    try {
      const stat = fs.statSync(destination);
      const actualSha256 = crypto
        .createHash("sha256")
        .update(fs.readFileSync(destination))
        .digest("hex");
      if (
        !stat.isFile() ||
        stat.size !== input.expectedBytes ||
        actualSha256 !== input.expectedSha256 ||
        (stat.mode & 0o777) !== 0o444
      ) {
        throw new Error(
          "materialized source size, hash, file type, or read-only mode does not match"
        );
      }
      if (
        typeof input.receiptOutput !== "string" ||
        !fs.existsSync(path.join(rootDir, input.receiptOutput))
      ) {
        throw new Error("canonical source-materialization receipt is missing");
      }
    } catch (error) {
      failures.push(
        failure(
          "required_input_missing",
          input.materializationDestination,
          error.message
        )
      );
    }
  }
  return failures;
}

function checkManifestPaths(rootDir, entries, code) {
  const failures = [];
  for (const entry of entries) {
    try {
      const relativePath = normalizeRepoPath(
        typeof entry === "string" ? entry : entry?.path
      );
      const absolutePath = path.resolve(rootDir, relativePath);
      if (!pathIsInside(rootDir, absolutePath) || !fs.existsSync(absolutePath)) {
        failures.push(
          failure(code, relativePath, `${relativePath} does not exist`)
        );
      }
    } catch (error) {
      failures.push(failure(code, null, error.message));
    }
  }
  return { failures };
}

function readWorkerMarker(rootDir) {
  const markerPath = path.join(rootDir, "tmp/rcap-factory/job.json");
  if (!fs.existsSync(markerPath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(markerPath, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { invalid: "marker must be a JSON object" };
    }
    const workerBaseCommit =
      typeof parsed.workerBaseCommit === "string"
        ? parsed.workerBaseCommit.trim()
        : "";
    return { ...parsed, workerBaseCommit };
  } catch (error) {
    return { invalid: error.message };
  }
}

function validateWorkerMarker(rootDir, job, marker) {
  if (!marker) {
    return isWorkerScaffoldCheckout(rootDir)
      ? [
          failure(
            "missing_scaffold_marker",
            "tmp/rcap-factory/job.json",
            "a factory worker branch/worktree must retain its non-disposable scaffold marker until integration"
          )
        ]
      : [];
  }
  const failures = [];
  if (marker.invalid) {
    return [
      failure(
        "invalid_scaffold_marker",
        "tmp/rcap-factory/job.json",
        marker.invalid
      )
    ];
  }
  if (marker.jobId !== job.jobId) {
    failures.push(
      failure(
        "scaffold_job_mismatch",
        "tmp/rcap-factory/job.json",
        `scaffold is assigned to ${marker.jobId ?? "unknown"}, not ${job.jobId}`
      )
    );
  }
  if (marker.manifestBaseCommit !== job.baseCommit) {
    failures.push(
      failure(
        "scaffold_manifest_base_mismatch",
        "tmp/rcap-factory/job.json",
        "scaffold manifestBaseCommit does not match the loaded job"
      )
    );
  }
  for (const field of ["ownedPaths", "forbiddenPaths", "focusedValidation"]) {
    if (JSON.stringify(marker[field] ?? null) !== JSON.stringify(job[field] ?? null)) {
      failures.push(
        failure(
          "scaffold_contract_mismatch",
          "tmp/rcap-factory/job.json",
          `scaffold ${field} does not match the loaded job`
        )
      );
    }
  }
  for (const [field, expected] of Object.entries({
    worktreeKind: "complete_git_worktree",
    worktreeDisposable: false,
    retainUntilIntegration: true
  })) {
    if (marker[field] !== expected) {
      failures.push(
        failure(
          "scaffold_contract_mismatch",
          "tmp/rcap-factory/job.json",
          `scaffold ${field} must be ${JSON.stringify(expected)}`
        )
      );
    }
  }

  const currentBranch = gitOneLine(rootDir, ["branch", "--show-current"]);
  if (marker.branch !== currentBranch) {
    failures.push(
      failure(
        "scaffold_branch_mismatch",
        "tmp/rcap-factory/job.json",
        `scaffold branch ${marker.branch ?? "unknown"} does not match ${currentBranch ?? "detached HEAD"}`
      )
    );
  }

  const head = gitOneLine(rootDir, ["rev-parse", "HEAD"]);
  const headSubject = gitOneLine(rootDir, ["show", "-s", "--format=%s", "HEAD"]);
  const expectedBaseline =
    headSubject === job.commitSubject
      ? gitOneLine(rootDir, ["rev-parse", "HEAD^"])
      : head;
  if (marker.workerBaseCommit !== expectedBaseline) {
    failures.push(
      failure(
        "scaffold_baseline_mismatch",
        "tmp/rcap-factory/job.json",
        `scaffold baseline ${marker.workerBaseCommit || "unknown"} does not match the worker branch base ${expectedBaseline ?? "unknown"}`
      )
    );
  }
  if (marker.scaffoldBaseCommit !== marker.workerBaseCommit) {
    failures.push(
      failure(
        "scaffold_baseline_mismatch",
        "tmp/rcap-factory/job.json",
        "scaffoldBaseCommit and workerBaseCommit must match"
      )
    );
  }
  return failures;
}

/**
 * Verifies a worker's completion commit before it is pushed.
 *
 * `validateJobWorkspace` proves the checkout is doing the right work; this
 * proves the commit that leaves it is the one integration will accept. The gap
 * between the two is how four Session D normalization commits reached the
 * remote with `feat(legal-design): normalize Utah` when the factory pins
 * `feat(record-clearing): normalize UT legal design` — every one of them had to
 * be integrated through a captain-equivalent commit instead, because a pushed
 * worker commit cannot be amended.
 *
 * The subject is read from `job.commitSubject`, the same field the worker
 * prompt renders and the integration planner compares against, so the three can
 * never drift apart.
 */
export function validateWorkerCompletionCommit(
  job,
  { rootDir = process.cwd(), commit = "HEAD", branch } = {}
) {
  const failures = [];
  const root = path.resolve(rootDir);

  if (!job || typeof job !== "object") {
    return {
      schemaVersion: "rcap-factory-worker-completion-commit/v1",
      jobId: "unknown",
      commit: null,
      passed: false,
      failures: [failure("invalid_job", null, "job manifest is required")]
    };
  }

  if (!gitCommitExists(root, commit)) {
    return {
      schemaVersion: "rcap-factory-worker-completion-commit/v1",
      jobId: job.jobId,
      commit: null,
      passed: false,
      failures: [
        failure("commit_missing", null, `${commit} does not resolve to a commit`)
      ]
    };
  }

  const resolved = gitOneLine(root, ["rev-parse", commit]);
  const marker = readWorkerMarker(root);
  failures.push(...validateWorkerMarker(root, job, marker));

  // Exactly one parent, and it must be the commit the assignment was scaffolded
  // from. A worker that branched from somewhere else is not producing the
  // change the captain reserved.
  const parents = (gitOneLine(root, ["show", "-s", "--format=%P", resolved]) ?? "")
    .split(/\s+/u)
    .filter(Boolean);
  const assignedBase = marker?.workerBaseCommit ?? job.baseCommit;
  if (parents.length !== 1) {
    failures.push(
      failure(
        "commit_parent_count",
        null,
        `worker commit must have exactly one parent, found ${parents.length}`
      )
    );
  } else if (assignedBase && parents[0] !== assignedBase) {
    failures.push(
      failure(
        "commit_parent_mismatch",
        null,
        `worker commit parent ${parents[0]} is not the assigned base ${assignedBase}`
      )
    );
  }

  const subject = gitOneLine(root, ["show", "-s", "--format=%s", resolved]);
  if (typeof job.commitSubject !== "string" || job.commitSubject.trim() === "") {
    failures.push(
      failure("commit_subject_unassigned", null, "job carries no pinned commit subject")
    );
  } else if (subject !== job.commitSubject) {
    failures.push(
      failure(
        "commit_subject_mismatch",
        null,
        `commit subject must be exactly ${JSON.stringify(job.commitSubject)}, found ${JSON.stringify(subject)}`
      )
    );
  }

  const changedPaths = gitNullList(root, [
    "diff-tree",
    "--no-commit-id",
    "--name-only",
    "--diff-filter=ACDMRTUXB",
    "-r",
    "-z",
    resolved
  ])
    .map(normalizeRepoPath)
    .sort((left, right) => left.localeCompare(right));
  failures.push(...validateChangedPaths(job, changedPaths).violations);

  // A binary in a worker commit is always wrong: sources are materialized to a
  // sealed external root and pinned by receipt, never committed.
  const numstat = gitOneLine(root, ["diff-tree", "--no-commit-id", "--numstat", "-r", resolved]) ?? "";
  for (const line of numstat.split("\n").filter(Boolean)) {
    const [added, removed, changedPath] = line.split(/\t/u);
    if (added === "-" || removed === "-") {
      failures.push(
        failure("binary_in_commit", changedPath ?? null, `${changedPath} is a binary change`)
      );
    }
  }

  const currentBranch =
    branch ?? gitOneLine(root, ["rev-parse", "--abbrev-ref", "HEAD"]);
  const expectedBranch = `rcap-factory/${scaffoldKeyFor(job.jobId, {
    job,
    model: job.model
  })}`;
  const legacyBranch = `rcap-factory/${scaffoldKeyFor(job.jobId)}`;
  if (
    currentBranch &&
    currentBranch !== expectedBranch &&
    currentBranch !== legacyBranch
  ) {
    failures.push(
      failure(
        "branch_not_canonical",
        null,
        `worker branch must be ${expectedBranch}, found ${currentBranch}`
      )
    );
  }

  const deduped = dedupeFailures(failures);
  return {
    schemaVersion: "rcap-factory-worker-completion-commit/v1",
    jobId: job.jobId,
    commit: resolved,
    branch: currentBranch ?? null,
    expectedBranch,
    requiredCommitSubject: job.commitSubject ?? null,
    actualCommitSubject: subject,
    changedPaths,
    passed: deduped.length === 0,
    failures: deduped
  };
}

export function isWorkerScaffoldCheckout(rootDir) {
  const root = path.resolve(rootDir);
  const branch = gitOneLine(root, ["branch", "--show-current"]);
  return (
    branch.startsWith("rcap-factory/") ||
    root.split(path.sep).join("/").includes("/tmp/rcap-factory/worktrees/")
  );
}

function normalizePathList(values) {
  return values.map((entry) =>
    normalizeRepoPath(typeof entry === "string" ? entry : entry?.path)
  );
}

function jurisdictionFromMemoPath(repoPath) {
  for (const pattern of MEMO_PATTERNS) {
    const match = repoPath.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function normalizeJurisdictionCode(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (/^[A-Za-z]{2}$/.test(normalized)) return normalized.toUpperCase();
  return JURISDICTION_CODES.get(
    normalized.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ")
  ) ?? null;
}

function commandFromEntry(entry) {
  if (typeof entry === "string") return entry.trim();
  if (entry && typeof entry.command === "string") return entry.command.trim();
  return "";
}

function gitNullList(rootDir, args) {
  const result = spawnSync("git", args, {
    cwd: rootDir,
    encoding: "buffer",
    maxBuffer: MAX_COMMAND_OUTPUT
  });
  if (result.status !== 0 || result.error) {
    throw new Error(
      result.error?.message ??
        Buffer.from(result.stderr ?? "").toString("utf8").trim() ??
        `git ${args[0]} failed`
    );
  }
  return Buffer.from(result.stdout ?? [])
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
}

function gitCommitExists(rootDir, commit) {
  if (!commit || typeof commit !== "string") return false;
  const result = spawnSync(
    "git",
    ["rev-parse", "--verify", "--quiet", `${commit}^{commit}`],
    { cwd: rootDir, encoding: "utf8" }
  );
  return result.status === 0;
}

function gitOneLine(rootDir, args) {
  const result = spawnSync("git", args, {
    cwd: rootDir,
    encoding: "utf8"
  });
  if (result.status !== 0) return null;
  return result.stdout.trim() || null;
}

function gitIsAncestor(rootDir, ancestor, descendant) {
  if (!ancestor || !gitCommitExists(rootDir, ancestor)) return false;
  return (
    spawnSync("git", ["merge-base", "--is-ancestor", ancestor, descendant], {
      cwd: rootDir,
      encoding: "utf8"
    }).status === 0
  );
}

function pathIsInside(rootDir, absolutePath) {
  const relative = path.relative(path.resolve(rootDir), path.resolve(absolutePath));
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

function failure(code, changedPath, message) {
  return { code, path: changedPath, message };
}

function dedupeFailures(failures) {
  const seen = new Set();
  return failures.filter((entry) => {
    const key = `${entry.code}\0${entry.path ?? ""}\0${entry.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function failedWorkspaceReport(jobId, failures) {
  return {
    schemaVersion: "rcap-factory-job-validation/v1",
    jobId,
    jurisdiction: null,
    baselineCommit: null,
    scope: "focused",
    passed: false,
    changedPaths: [],
    stagedPaths: [],
    untrackedPaths: [],
    allowedPaths: [],
    failures,
    commandResults: [],
    notes: []
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function safeIdentifier(value, label) {
  if (
    typeof value !== "string" ||
    !/^[a-z0-9][a-z0-9._-]*$/i.test(value)
  ) {
    throw new Error(`${label} must contain only letters, digits, dot, dash, or underscore`);
  }
  return value;
}
