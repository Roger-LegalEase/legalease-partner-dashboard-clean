import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertSupportedModel, stableStringify } from "./lib/rcap-factory/prompt.mjs";
import { scaffoldJob } from "./lib/rcap-factory/scaffold.mjs";
import { assertClaimPermitsSession } from "./lib/rcap-factory/normalization-readiness.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`RCAP factory scaffold failed: ${error.message}`);
    process.exitCode = 1;
  });
}

async function main() {
  const args = parseScaffoldArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(scaffoldHelp());
    return;
  }
  const factory = await loadFactoryApi();
  const options = { root: rootDir, rootDir };
  const factoryPlan = await factory.loadFactoryPlan(options);
  const job = await factory.loadJob(args.jobId, options);

  if (!job) throw new Error(`Unknown factory job: ${args.jobId}`);
  assertClaimPermitsSession(job, args.session);

  const model = args.model ?? job.model;
  const authorityVersion =
    factoryPlan?.authorityVersion ??
    factoryPlan?.authorityEdition ??
    job.authorityVersion;
  const result = scaffoldJob({
    rootDir,
    job,
    authorityVersion,
    model,
    apply: args.apply
  });

  process.stdout.write(`${stableStringify(result)}\n`);
}

export function parseScaffoldArgs(rawArgs) {
  const positionals = [];
  let model;
  let session;
  let apply = false;
  let explicitDryRun = false;
  let help = false;

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];

    if (arg === "--") continue;
    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }
    if (arg === "--apply") {
      apply = true;
      continue;
    }
    if (arg === "--dry-run") {
      explicitDryRun = true;
      continue;
    }
    if (arg === "--model") {
      model = rawArgs[index + 1];
      index += 1;
      if (!model) throw new Error("--model requires opus or codex.");
      continue;
    }
    if (arg === "--session") {
      session = rawArgs[index + 1];
      index += 1;
      if (!session) throw new Error("--session requires a session identifier.");
      continue;
    }
    if (arg.startsWith("--model=")) {
      model = arg.slice("--model=".length);
      continue;
    }
    if (arg.startsWith("--session=")) {
      session = arg.slice("--session=".length);
      continue;
    }
    if (arg.startsWith("-")) throw new Error(`Unsupported argument: ${arg}`);
    positionals.push(arg);
  }

  if (!help && positionals.length !== 1) {
    throw new Error(scaffoldHelp().trim());
  }
  if (help && positionals.length > 0) {
    throw new Error("--help does not accept a job ID.");
  }
  if (apply && explicitDryRun) throw new Error("Specify --apply or --dry-run, not both.");
  if (model !== undefined) assertSupportedModel(model);
  if (
    session !== undefined &&
    !["SESSION_B", "SESSION_C", "SESSION_D", "SESSION_E", "SESSION_F"].includes(session)
  ) {
    throw new Error(
      "--session must be SESSION_B, SESSION_C, SESSION_D, SESSION_E, or SESSION_F."
    );
  }

  return { jobId: positionals[0] ?? null, model, session, apply, help };
}

function scaffoldHelp() {
  return [
    "Usage: rcap:factory:scaffold -- <jobId> [--model opus|codex] [--session SESSION_B|SESSION_C|SESSION_D|SESSION_E|SESSION_F] [--apply|--dry-run]",
    "",
    "Without --apply, print a deterministic scaffold plan and make no changes.",
    "--apply creates a complete linked Git worktree at worktreePath and a worker branch.",
    "The reported marker and workspace paths are metadata, not the checkout or disposable output.",
    "Retain the complete worktree, branch, and metadata until integration.",
    "A reserved exact-job claim requires the matching --session value.",
    ""
  ].join("\n");
}

async function loadFactoryApi() {
  try {
    const factory = await import("./lib/rcap-factory/index.mjs");
    if (typeof factory.loadFactoryPlan !== "function" || typeof factory.loadJob !== "function") {
      throw new Error("factory index must export loadFactoryPlan(options) and loadJob(jobId, options)");
    }
    return factory;
  } catch (error) {
    if (error?.code === "ERR_MODULE_NOT_FOUND") {
      throw new Error("Factory planner API is unavailable at scripts/lib/rcap-factory/index.mjs.");
    }
    throw error;
  }
}
