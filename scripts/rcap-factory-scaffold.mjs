import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertSupportedModel, stableStringify } from "./lib/rcap-factory/prompt.mjs";
import { scaffoldJob } from "./lib/rcap-factory/scaffold.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`RCAP factory scaffold failed: ${error.message}`);
    process.exitCode = 1;
  });
}

async function main() {
  const args = parseScaffoldArgs(process.argv.slice(2));
  const factory = await loadFactoryApi();
  const options = { root: rootDir, rootDir };
  const factoryPlan = await factory.loadFactoryPlan(options);
  const job = await factory.loadJob(args.jobId, options);

  if (!job) throw new Error(`Unknown factory job: ${args.jobId}`);

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
  let apply = false;
  let explicitDryRun = false;

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];

    if (arg === "--") continue;
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
    if (arg.startsWith("--model=")) {
      model = arg.slice("--model=".length);
      continue;
    }
    if (arg.startsWith("-")) throw new Error(`Unsupported argument: ${arg}`);
    positionals.push(arg);
  }

  if (positionals.length !== 1) {
    throw new Error("Usage: rcap:factory:scaffold -- <jobId> [--model opus|codex] [--apply]");
  }
  if (apply && explicitDryRun) throw new Error("Specify --apply or --dry-run, not both.");
  if (model !== undefined) assertSupportedModel(model);

  return { jobId: positionals[0], model, apply };
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
