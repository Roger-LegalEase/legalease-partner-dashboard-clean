import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleCache = new Map();

try {
  const { computePartnerDashboardActionLayer } = loadTsModule(path.join(rootDir, "src/lib/partners/dashboard-action-layer.ts"));

  const normal = computePartnerDashboardActionLayer({ started: 10, completed: 4 });
  assert(normal.started === 10, "started numerator should preserve the RLS-backed started count.");
  assert(normal.completed === 4, "completed numerator should preserve the RLS-backed completed count.");
  assert(normal.completionRate === 40, "completion rate should be completed / started.");
  assert(normal.notCompleted === 6, "not-completed count should be started minus completed.");
  assertMetric(normal, "intake_completion", {
    label: "Intake completion",
    value: "40%",
    actionFraming: "no"
  });
  assertMetric(normal, "intakes_not_completed", {
    label: "Intakes not completed",
    value: "6",
    actionFraming: "no"
  });
  assert(!containsActionLanguage(normal.metrics), "neutral metrics should not emit follow-up or problem action language.");
  assert(!containsUnsupportedOutcomeLanguage(normal), "action layer should not claim legal success, outcomes, eligibility, or conversion.");

  const empty = computePartnerDashboardActionLayer({ started: 0, completed: 0 });
  assert(empty.completionRate === 0, "started == 0 should produce a neutral 0% completion value.");
  assert(Number.isFinite(empty.completionRate), "completion rate should never be NaN or Infinity.");
  assert(empty.notCompleted === 0, "not-completed count should not go negative for empty data.");
  assert(JSON.stringify(empty).includes("0%"), "empty state should expose a deliberate neutral 0% completion label.");
  assert(!/NaN|Infinity/.test(JSON.stringify(empty)), "empty state should not render NaN or Infinity.");
  assert(!containsActionLanguage(empty.metrics), "empty-state neutral metrics should not emit unsupported action language.");
  assert(!containsUnsupportedOutcomeLanguage(empty), "empty state should not claim success, outcomes, eligibility, or conversion.");
  assert(empty.recommendedAction.body === "Share your intake link.", "zero-started state should recommend sharing the intake link.");
  assert(empty.recommendedAction.actionFraming === "yes", "zero-started recommendation is explicitly action framed.");

  const malformed = computePartnerDashboardActionLayer({ started: 3, completed: 9 });
  assert(malformed.completionRate <= 100, "completion rate should never exceed 100%.");
  assert(malformed.notCompleted >= 0, "not-completed count should never be negative.");

  const active = computePartnerDashboardActionLayer({ started: 3, completed: 2 });
  assert(active.recommendedAction.body === "Keep sharing the program.", "active state should use generic continuation language.");
  assert(!/follow up|review|fix|convert|urgent/i.test(active.recommendedAction.body), "recommended action should not invent unsupported urgency.");
  assert(active.recommendedAction.labelDoesNotOverclaim === true, "recommended action must carry the label-meaning contract.");

  console.log("Partner dashboard action-layer metric tests passed.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Partner dashboard action-layer metric tests failed.");
  process.exit(1);
}

function assertMetric(layer, id, expected) {
  const metric = layer.metrics.find((candidate) => candidate.id === id);
  assert(metric, `Missing metric ${id}.`);
  assert(metric.label === expected.label, `${id} label mismatch.`);
  assert(metric.value === expected.value, `${id} value mismatch.`);
  assert(metric.actionFraming === expected.actionFraming, `${id} action framing mismatch.`);
  assert(metric.labelDoesNotOverclaim === true, `${id} must confirm LABEL <= MEANING.`);
  assert(typeof metric.source === "string" && metric.source.includes("RLS-scoped"), `${id} must document an RLS-scoped source.`);
  assert(typeof metric.numerator === "string" && metric.numerator.length > 0, `${id} must document a numerator.`);
  assert(typeof metric.denominator === "string" && metric.denominator.length > 0, `${id} must document a denominator.`);
  assert(typeof metric.meaning === "string" && metric.meaning.length > 0, `${id} must document meaning.`);
}

function containsActionLanguage(metrics) {
  return metrics.some((metric) => /follow up|review|fix|convert|gap|problem|urgent/i.test(`${metric.label} ${metric.detail} ${metric.meaning}`));
}

function containsUnsupportedOutcomeLanguage(layer) {
  const visibleText = [
    layer.recommendedAction.label,
    layer.recommendedAction.body,
    ...layer.metrics.flatMap((metric) => [metric.label, metric.value, metric.detail])
  ].join(" ");
  return /success|outcome|eligible|eligibility rate|conversion|filed|court/i.test(visibleText);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function loadTsModule(filename) {
  const resolved = path.resolve(filename);
  const cached = moduleCache.get(resolved);
  if (cached) {
    return cached.exports;
  }

  const source = fs.readFileSync(resolved, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;

  const mod = new Module(resolved);
  mod.filename = resolved;
  mod.paths = Module._nodeModulePaths(path.dirname(resolved));
  moduleCache.set(resolved, mod);
  mod.require = (request) => {
    const nextFile = resolveTsRequest(request, path.dirname(resolved));
    return nextFile ? loadTsModule(nextFile) : require(request);
  };
  mod._compile(transpiled, resolved);
  return mod.exports;
}

function resolveTsRequest(request, basedir) {
  if (request.startsWith("@/")) {
    return path.join(rootDir, "src", `${request.slice(2)}.ts`);
  }

  if (request.startsWith(".")) {
    const candidate = path.resolve(basedir, request);
    for (const extension of [".ts", ".tsx", ".js"]) {
      if (fs.existsSync(`${candidate}${extension}`)) {
        return `${candidate}${extension}`;
      }
    }
  }

  return null;
}
