#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  LEGAL_REVIEW_MATERIALIZATION_CONTRACT_PATH,
  OFFICIAL_PDF_SOURCE_PROJECTION_PATH,
  buildLegalReviewMaterializationContract,
  buildOfficialPdfSourceProjection,
  stableJson,
  validateLegalReviewMaterializationContract,
  validateOfficialPdfSourceProjection
} from "./lib/rcap-factory/materialization-planning.mjs";
import { buildFactoryPlan } from "./lib/rcap-factory/planner.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const write = process.argv.includes("--write");
const unsupported = process.argv.slice(2).filter((argument) => argument !== "--write");
if (unsupported.length > 0) {
  throw new Error(`Unsupported arguments: ${unsupported.join(", ")}`);
}

const outputs = [
  {
    path: LEGAL_REVIEW_MATERIALIZATION_CONTRACT_PATH,
    value: buildLegalReviewMaterializationContract(ROOT),
    validate: validateLegalReviewMaterializationContract
  },
  {
    path: OFFICIAL_PDF_SOURCE_PROJECTION_PATH,
    value: buildOfficialPdfSourceProjection(ROOT),
    validate: validateOfficialPdfSourceProjection
  }
];

for (const output of outputs) {
  const issues = output.validate(output.value);
  if (issues.length > 0) {
    throw new Error(`${output.path} is invalid:\n- ${issues.join("\n- ")}`);
  }
  const serialized = stableJson(output.value);
  const absolutePath = path.join(ROOT, output.path);
  if (write) {
    fs.writeFileSync(absolutePath, serialized);
    process.stdout.write(`wrote ${output.path}\n`);
  } else {
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`${output.path} is missing; run with --write.`);
    }
    const current = fs.readFileSync(absolutePath, "utf8");
    if (current !== serialized) {
      throw new Error(`${output.path} is stale; run with --write.`);
    }
    process.stdout.write(`verified ${output.path}\n`);
  }
}

const productionPlanPath =
  "planning/record-clearing-100-percent/production-plan.json";
const productionPlanAbsolute = path.join(ROOT, productionPlanPath);
const productionPlan = JSON.parse(
  fs.readFileSync(productionPlanAbsolute, "utf8")
);
const recordedFactoryBase =
  productionPlan.factoryQueueReconciliation?.generatedAgainstCommit;
if (
  !write &&
  (typeof recordedFactoryBase !== "string" ||
    !/^[0-9a-f]{40}$/u.test(recordedFactoryBase))
) {
  throw new Error(
    `${productionPlanPath} has no valid recorded factory planning base.`
  );
}
const factoryPlan = buildFactoryPlan({
  rootDir: ROOT,
  ...(!write ? { baseCommit: recordedFactoryBase } : {})
});
const byStatus = tally(factoryPlan.jobs, (job) => job.status);
const byLane = Object.fromEntries(
  factoryPlan.lanes.map((lane) => [lane.lane, lane.jobIds.length])
);
const reviewContract = outputs[0].value;
const projection = outputs[1].value;
const reconciliation = JSON.parse(
  fs.readFileSync(
    path.join(
      ROOT,
      "data/record-clearing/production-factory/official-pdf-source-contract-reconciliation.json"
    ),
    "utf8"
  )
);
const officialJobs = factoryPlan.jobs.filter(
  (job) => (job.officialPdfAssignment?.identityKeys?.length ?? 0) > 0
);
const jobClaimsPath =
  "data/record-clearing/production-factory/job-claims.json";
const jobClaimsAbsolute = path.join(ROOT, jobClaimsPath);
const materializationPlanningSnapshot = {
  legalReviewMaterialization: {
    contractPath: LEGAL_REVIEW_MATERIALIZATION_CONTRACT_PATH,
    ownerJobs: reviewContract.assignmentCount,
    readyJobs: factoryPlan.materializationPlanning.legalReviewMaterialization.readyJobs,
    blockedJobs:
      factoryPlan.materializationPlanning.legalReviewMaterialization.blockedJobs,
    completedJobs:
      factoryPlan.materializationPlanning.legalReviewMaterialization.completedJobs,
    externalArchiveStatus:
      factoryPlan.materializationPlanning.legalReviewMaterialization
        .externalArchiveStatus,
    materializedReviews:
      factoryPlan.materializationPlanning.legalReviewMaterialization
        .completedJobs
  },
  officialPdfAssignment: {
    projectionPath: OFFICIAL_PDF_SOURCE_PROJECTION_PATH,
    queueIdentities: projection.coverage.queueIdentityCount,
    exactSourceContracts: projection.coverage.exactSourceContractCount,
    exactWorkerAssignable: projection.coverage.assignmentEligibleCount,
    assignedToNewImplementationChildren:
      factoryPlan.materializationPlanning.officialPdfProjection
        .assignedToNewImplementationChildren,
    existingImplementationMaterializationOnly:
      factoryPlan.materializationPlanning.officialPdfProjection
        .existingImplementationMaterializationOnly,
    childJobsWithExactAssignments: officialJobs.length,
    readyFamilies:
      factoryPlan.materializationPlanning.officialPdfChildren
        .workerReadyFamilies,
    blockedFamilies:
      factoryPlan.materializationPlanning.officialPdfChildren.blockedFamilies,
    materializedSources:
      factoryPlan.materializationPlanning.officialPdfChildren
        .materializedSources,
    dispositionCounts: projection.coverage.countsByDisposition,
    projectionIsMaterialization: false,
    materializationIsImplementation: false,
    implementationIsApproval: false,
    approvalIsRuntimeEnablement: false
  }
};
const marylandShieldingSourceReady = officialJobs.some((job) =>
  (job.sourceMaterializationInputs ?? []).some(
    (input) =>
      input.documentId === "CC-DC-CR-148" &&
      input.workerReadiness === "worker_ready"
  )
);
const expectedPlanScope =
  "This integrated baseline includes both immutable normalization-research bundles, " +
  "Session D's controlling source-identity and typed-blocker adjudication, the " +
  "mechanism-inventory-v1 canonical denominator for all 24 remaining jurisdictions, " +
  "24 explicit portable legal-review materialization jobs, Pennsylvania normalization, " +
  "40 track-specific guidance implementations, Session E's 25-jurisdiction official-PDF " +
  "source-contract reconciliation, one integration-owned 192-identity portable projection, " +
  "18 exact Session E child assignments, and eleven bounded Session F authority results. " +
  `The exact Edition 1.2 archive ${
    factoryPlan.materializationPlanning.legalReviewMaterialization
      .externalArchiveStatus === "external_archive_not_materialized"
      ? "remains absent"
      : "is exact-input verified"
  }, and Maryland CC-DC-CR-148 ${
    marylandShieldingSourceReady
      ? "is materialized and locally verified"
      : "remains absent"
  }, so review ` +
  "receipts, binary materialization, normalization, and official-PDF implementation remain " +
  "fail-closed. It publishes no edition, enables no route, performs no promotion, and " +
  "deploys nothing.";
const expectedFactoryQueue = {
  ...productionPlan.factoryQueueReconciliation,
  generatedAgainstCommit: factoryPlan.baseCommit,
  jobs: factoryPlan.jobs.length,
  ready: byStatus.ready ?? 0,
  blocked: byStatus.blocked ?? 0,
  inProgress: byStatus.in_progress ?? 0,
  completed: byStatus.completed ?? 0,
  activeOwnedPathOverlaps: 0,
  acquisitionRecordsRepresented:
    factoryPlan.acquisitionReconciliation.researchedDocuments,
  acquisitionDuplicateAssignments:
    factoryPlan.acquisitionReconciliation.duplicateAssignments,
  acquisitionOmissions:
    factoryPlan.acquisitionReconciliation.omissions,
  normalizedTracksRepresentedExactlyOnce:
    factoryPlan.trackReconciliation.representedExactlyOnce,
  completedTracksRegeneratedAsPending: 0,
  canonicalParentMappingPolicy:
    factoryPlan.canonicalPlan.childMappingPolicy,
  byLane
};
const expectedOfficial = {
  ...productionPlan.officialPdfSourceContractIntegration,
  reconciliationPath:
    "data/record-clearing/production-factory/official-pdf-source-contract-reconciliation.json",
  projectionPath: OFFICIAL_PDF_SOURCE_PROJECTION_PATH,
  projectedDocumentIdentities:
    reconciliation.totals.projectedDocumentIdentities,
  projectedExactWorkerAssignments:
    reconciliation.totals.projectedExactWorkerAssignments,
  unresolvedSourceIdentities:
    reconciliation.queueCoverage.totals.unresolvedSourceIdentities,
  projectedUnresolvedIdentities:
    projection.coverage.countsByDisposition.unresolved_identity,
  terminallyDispositionedOrBlockedIdentities:
    projection.coverage.queueIdentityCount -
    projection.coverage.assignmentEligibleCount,
  normativeAssignedRequirements:
    reconciliation.totals.normativeAssignedRequirements,
  pendingAssignmentFamilies:
    reconciliation.totals.pendingAssignmentFamilies,
  materializationBlockedFamilies:
    reconciliation.totals.materializationBlockedFamilies,
  assignmentMarker: {
    contractPath: "tmp/rcap-factory/job.json",
    status: "generated_worker_local_untracked_by_factory_scaffold",
    owner: "SESSION_E",
    canonicalChildCount: officialJobs.length,
    integrationCheckoutMarkerCreated: false
  },
  portableProjection: {
    path: OFFICIAL_PDF_SOURCE_PROJECTION_PATH,
    status: "integration_owned_projection_present",
    owner: "SESSION_A",
    queueIdentityCount: projection.coverage.queueIdentityCount,
    exactWorkerAssignable: projection.coverage.assignmentEligibleCount,
    dispositionCounts: projection.coverage.countsByDisposition
  },
  materializedSourceCount:
    factoryPlan.materializationPlanning.officialPdfChildren
      .materializedSources,
  activatedRendererCount: 0,
  workerReadyFamilies:
    factoryPlan.materializationPlanning.officialPdfChildren
      .workerReadyFamilies,
  runtimeStatus: "runtime_disabled"
};

if (write) {
  fs.writeFileSync(jobClaimsAbsolute, stableJson(factoryPlan.jobClaims));
  process.stdout.write(`wrote ${jobClaimsPath}\n`);
  productionPlan.factoryQueueReconciliation = expectedFactoryQueue;
  productionPlan.officialPdfSourceContractIntegration = expectedOfficial;
  productionPlan.materializationPlanning = materializationPlanningSnapshot;
  let productionPlanSource = fs.readFileSync(productionPlanAbsolute, "utf8");
  productionPlanSource = upsertTopLevelJsonProperty(
    productionPlanSource,
    "planScope",
    expectedPlanScope
  );
  productionPlanSource = upsertTopLevelJsonProperty(
    productionPlanSource,
    "factoryQueueReconciliation",
    expectedFactoryQueue
  );
  productionPlanSource = upsertTopLevelJsonProperty(
    productionPlanSource,
    "officialPdfSourceContractIntegration",
    expectedOfficial
  );
  productionPlanSource = upsertTopLevelJsonProperty(
    productionPlanSource,
    "materializationPlanning",
    materializationPlanningSnapshot
  );
  fs.writeFileSync(
    productionPlanAbsolute,
    productionPlanSource
  );
  process.stdout.write(`wrote ${productionPlanPath}\n`);
} else {
  const committedClaims = JSON.parse(
    fs.readFileSync(jobClaimsAbsolute, "utf8")
  );
  if (stableJson(committedClaims) !== stableJson(factoryPlan.jobClaims)) {
    throw new Error(`${jobClaimsPath} exact assignment claims are stale.`);
  }
  if (
    productionPlan.planScope !== expectedPlanScope ||
    stableJson(productionPlan.factoryQueueReconciliation) !==
      stableJson(expectedFactoryQueue) ||
    stableJson(productionPlan.officialPdfSourceContractIntegration) !==
      stableJson(expectedOfficial) ||
    stableJson(productionPlan.materializationPlanning) !==
      stableJson(materializationPlanningSnapshot)
  ) {
    throw new Error(`${productionPlanPath} factory planning snapshot is stale.`);
  }
  process.stdout.write(`verified ${productionPlanPath}\n`);
}

function tally(values, keyFor) {
  const result = {};
  for (const value of values) {
    const key = keyFor(value);
    result[key] = (result[key] ?? 0) + 1;
  }
  return result;
}

function upsertTopLevelJsonProperty(source, property, value) {
  const span = topLevelJsonPropertyValueSpan(source, property);
  const serialized = JSON.stringify(value, null, 2).replaceAll("\n", "\n  ");
  if (span) {
    return `${source.slice(0, span.start)}${serialized}${source.slice(span.end)}`;
  }
  const close = source.lastIndexOf("}");
  if (close === -1 || source.slice(close + 1).trim() !== "") {
    throw new Error("production-plan.json is not a top-level JSON object.");
  }
  const prefix = source.slice(0, close).trimEnd();
  const separator = prefix.endsWith("{") ? "" : ",";
  return (
    `${prefix}${separator}\n\n  ${JSON.stringify(property)}: ` +
    `${serialized}\n${source.slice(close)}`
  );
}

function topLevelJsonPropertyValueSpan(source, property) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === "\"") {
        inString = false;
      }
      continue;
    }
    if (character === "\"") {
      const stringStart = index;
      inString = true;
      let end = index + 1;
      let stringEscaped = false;
      for (; end < source.length; end += 1) {
        const stringCharacter = source[end];
        if (stringEscaped) {
          stringEscaped = false;
        } else if (stringCharacter === "\\") {
          stringEscaped = true;
        } else if (stringCharacter === "\"") {
          break;
        }
      }
      if (depth === 1) {
        const token = JSON.parse(source.slice(stringStart, end + 1));
        let cursor = end + 1;
        while (/\s/u.test(source[cursor] ?? "")) cursor += 1;
        if (token === property && source[cursor] === ":") {
          cursor += 1;
          while (/\s/u.test(source[cursor] ?? "")) cursor += 1;
          return {
            start: cursor,
            end: jsonValueEnd(source, cursor)
          };
        }
      }
      index = end;
      inString = false;
      continue;
    }
    if (character === "{" || character === "[") depth += 1;
    if (character === "}" || character === "]") depth -= 1;
  }
  return null;
}

function jsonValueEnd(source, start) {
  const opening = source[start];
  if (opening !== "{" && opening !== "[") {
    let cursor = start;
    let inString = false;
    let escaped = false;
    for (; cursor < source.length; cursor += 1) {
      const character = source[cursor];
      if (inString) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === "\"") inString = false;
      } else if (character === "\"") {
        inString = true;
      } else if (character === "," || character === "}") {
        return cursor;
      }
    }
    return cursor;
  }
  const closing = opening === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let cursor = start; cursor < source.length; cursor += 1) {
    const character = source[cursor];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === "\"") inString = false;
      continue;
    }
    if (character === "\"") {
      inString = true;
    } else if (character === opening) {
      depth += 1;
    } else if (character === closing) {
      depth -= 1;
      if (depth === 0) return cursor + 1;
    }
  }
  throw new Error(`Unterminated JSON value for ${opening}.`);
}
