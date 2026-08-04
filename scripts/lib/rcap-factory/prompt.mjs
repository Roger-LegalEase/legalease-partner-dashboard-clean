const SUPPORTED_MODELS = new Set(["opus", "codex"]);

const JOB_FIELD_ORDER = [
  "jobId",
  "parentJobId",
  "canonicalWave",
  "canonicalLane",
  "lane",
  "jurisdiction",
  "trackIds",
  "strategyFamily",
  "baseCommit",
  "dependencies",
  "ownedPaths",
  "integrationOwnedOutputs",
  "forbiddenPaths",
  "requiredInputs",
  "expectedOutputs",
  "requiredOutputFields",
  "downloadedSourceCount",
  "regressionVerifier",
  "participantPacketProofRequired",
  "sourceMaterializationInputs",
  "normalizationReadiness",
  "executionNote",
  "focusedValidation",
  "integrationValidation",
  "model",
  "effort",
  "executionScope",
  "status",
  "completionCommit",
  "commitSubject",
  "stopCondition"
];

const PROMPT_MANIFEST_FIELDS = [
  "jobId",
  "parentJobId",
  "canonicalWave",
  "canonicalLane",
  "lane",
  "jurisdiction",
  "trackIds",
  "strategyFamily",
  "baseCommit",
  "dependencies",
  "acquisitionIds",
  "reconciliationIds",
  "downloadedSourceCount",
  "requiredOutputFields",
  "regressionVerifier",
  "participantPacketProofRequired",
  "sourceMaterializationInputs",
  "normalizationReadiness",
  "executionNote",
  "requiredInputs",
  "model",
  "effort",
  "executionScope",
  "status"
];

/**
 * Compile the deliberately small hand-off prompt for one factory worker.
 *
 * Legal and operational context belongs in the pinned authority and the job
 * manifest. Repeating it here would make prompts drift independently of those
 * records, so this compiler emits only the contract sections, including the
 * safety sections that distinguish the complete worker worktree from
 * captain-owned integration outputs.
 */
export function compileWorkerPrompt({ job, authorityVersion, model = job?.model }) {
  assertJob(job);
  assertSupportedModel(model);
  assertAuthorityVersion(authorityVersion);

  const assignedJob = orderedJobManifest(job, model);
  const promptManifest = promptJobManifest(assignedJob);
  const sections = [
    section("Mission", missionFor(assignedJob)),
    section("Authority version", renderScalar(authorityVersion, "unavailable")),
    section("Assigned job manifest", fenced("json", JSON.stringify(promptManifest, null, 2))),
    section("Owned paths", renderList(assignedJob.ownedPaths)),
    section(
      "Integration-owned outputs — do not create or commit",
      renderIntegrationOwnedOutputs(assignedJob)
    ),
    section("Forbidden paths", renderList(assignedJob.forbiddenPaths)),
    section("Required outputs", renderRequiredOutputs(assignedJob)),
    section("Focused acceptance command", renderFocusedValidation(assignedJob)),
    section(
      "Scaffold worktree",
      "The scaffold --apply command created a complete linked Git worktree, not a disposable " +
        "marker or generated-output directory. Work only in that checkout and retain it, its branch, " +
        "and its metadata until integration; never delete or treat the worktree as disposable output."
    ),
    section("Commit subject", renderScalar(assignedJob.commitSubject, "Not specified.")),
    section("Stop condition", renderValue(assignedJob.stopCondition, "Not specified."))
  ];

  return `${sections.join("\n\n")}\n`;
}

export function promptJobManifest(job, model = job?.model) {
  const complete = orderedJobManifest(job, model);
  return Object.fromEntries(
    PROMPT_MANIFEST_FIELDS
      .filter((field) => Object.hasOwn(complete, field))
      .map((field) => [field, complete[field]])
  );
}

export function orderedJobManifest(job, model = job?.model) {
  assertJob(job);
  assertSupportedModel(model);

  const source = { ...job, model };
  const ordered = {};

  for (const field of JOB_FIELD_ORDER) {
    if (Object.hasOwn(source, field)) ordered[field] = canonicalize(source[field]);
  }

  for (const field of Object.keys(source).sort()) {
    if (!Object.hasOwn(ordered, field)) ordered[field] = canonicalize(source[field]);
  }

  return ordered;
}

export function stableStringify(value, space = 2) {
  return JSON.stringify(canonicalize(value), null, space);
}

export function assertSupportedModel(model) {
  if (!SUPPORTED_MODELS.has(model)) {
    throw new Error(`Unsupported worker model "${model ?? ""}". Expected opus or codex.`);
  }
}

export function assertAuthorityVersion(authorityVersion) {
  if (typeof authorityVersion !== "string" || authorityVersion.trim() === "") {
    throw new Error("Factory authority version must be a non-empty string.");
  }
}

export function parsePromptArgs(rawArgs) {
  const positionals = [];
  let model;

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];

    if (arg === "--") continue;
    if (arg === "--model") {
      model = rawArgs[index + 1];
      index += 1;
      if (!model) throw new Error("--model requires opus or codex.");
      continue;
    }
    if (arg.startsWith("--model=")) {
      model = arg.slice("--model=".length);
      continue;
    }
    if (arg.startsWith("-")) throw new Error(`Unsupported argument: ${arg}`);
    positionals.push(arg);
  }

  if (positionals.length !== 1) {
    throw new Error("Usage: rcap:factory:prompt -- <jobId> --model opus|codex");
  }
  if (model !== undefined) assertSupportedModel(model);

  return { jobId: positionals[0], model };
}

function assertJob(job) {
  if (!job || typeof job !== "object" || Array.isArray(job)) {
    throw new Error("Factory job must be an object.");
  }
  if (typeof job.jobId !== "string" || job.jobId.trim() === "") {
    throw new Error("Factory job is missing jobId.");
  }
  if (job.executionScope !== "worker") {
    throw new Error(
      `${job.jobId} is ${job.executionScope ?? "not"} scoped and cannot compile a worker prompt.`
    );
  }
  if (job.status !== "ready") {
    throw new Error(
      `${job.jobId} has status ${job.status ?? "missing"} and cannot compile a worker prompt; ` +
        "only ready jobs are eligible."
    );
  }
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map((entry) => canonicalize(entry));
  if (!value || typeof value !== "object") return value;

  const result = {};
  for (const key of Object.keys(value).sort()) {
    result[key] = canonicalize(value[key]);
  }
  return result;
}

function missionFor(job) {
  if (typeof job.mission === "string" && job.mission.trim()) return job.mission.trim();

  const lane = humanize(job.lane ?? "assigned factory work");
  const jurisdiction = job.jurisdiction ? ` for ${job.jurisdiction}` : "";
  const tracks =
    Array.isArray(job.trackIds) && job.trackIds.length > 0
      ? ` (${job.trackIds.join(", ")})`
      : "";
  return `Complete the assigned ${lane}${jurisdiction}${tracks} job and produce only its required outputs.`;
}

function renderFocusedValidation(job) {
  return fenced("sh", `npm run rcap:factory:validate-job -- ${job.jobId}`);
}

function renderIntegrationOwnedOutputs(job) {
  const paths = renderList(job.integrationOwnedOutputs);
  return (
    `${paths}\n\n` +
    "These paths are generated and committed only by the integration captain. A worker must not " +
    "create, modify, stage, or commit them, and no production-enablement marker exemption exists."
  );
}

function renderRequiredOutputs(job) {
  const paths = renderList(job.expectedOutputs);
  const fields = job.requiredOutputFields ?? [];
  if (fields.length === 0) return paths;
  const expectedCount = Number.isInteger(job.downloadedSourceCount)
    ? ` The assignment requires downloadedSourceCount=${job.downloadedSourceCount}.`
    : "";
  return (
    `${paths}\n\n` +
    `Every JSON authority output must include these required top-level fields: ${fields.join(", ")}.` +
    expectedCount
  );
}

function renderList(value) {
  const items = Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
  if (items.length === 0) return "- None.";

  return items
    .map((item) => {
      if (typeof item === "string") return `- ${inlineCode(item)}`;
      return `- ${inlineCode(stableStringify(item, 0))}`;
    })
    .join("\n");
}

function renderValue(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "string") return value.trim();
  return fenced("json", stableStringify(value));
}

function renderScalar(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return stableStringify(value, 0);
}

function humanize(value) {
  return String(value).replaceAll("_", " ").replaceAll("-", " ");
}

function inlineCode(value) {
  const text = String(value);
  const ticks = text.match(/`+/g)?.reduce((longest, run) => Math.max(longest, run.length), 0) ?? 0;
  const delimiter = "`".repeat(ticks + 1);
  return `${delimiter}${text}${delimiter}`;
}

function section(title, body) {
  return `## ${title}\n\n${body}`;
}

function fenced(language, body) {
  return `\`\`\`${language}\n${body}\n\`\`\``;
}
