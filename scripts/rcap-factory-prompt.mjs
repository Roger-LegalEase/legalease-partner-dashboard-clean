import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  compileWorkerPrompt,
  parsePromptArgs
} from "./lib/rcap-factory/prompt.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`RCAP factory prompt failed: ${error.message}`);
    process.exitCode = 1;
  });
}

async function main() {
  const { jobId, model: requestedModel } = parsePromptArgs(process.argv.slice(2));
  const factory = await loadFactoryApi();
  const options = { root: rootDir, rootDir };
  const plan = await factory.loadFactoryPlan(options);
  const job = await factory.loadJob(jobId, options);

  if (!job) throw new Error(`Unknown factory job: ${jobId}`);

  const model = requestedModel ?? job.model;
  const authorityVersion =
    plan?.authorityVersion ??
    plan?.authorityEdition ??
    job.authorityVersion;

  process.stdout.write(compileWorkerPrompt({ job, authorityVersion, model }));
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
