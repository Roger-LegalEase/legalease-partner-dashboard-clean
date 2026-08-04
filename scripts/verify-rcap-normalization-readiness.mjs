#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  REMAINING_NORMALIZATION_JURISDICTIONS,
  buildNormalizationReadinessRecords,
  canonicalStringify,
  inspectNormalizationBundle,
  legalReviewAssetsForTesting,
  mechanismInventorySha256,
  validateFactoryJobClaims,
  validateNormalizationReadinessInput
} from "./lib/rcap-factory/normalization-readiness.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INPUT_PATH =
  "data/record-clearing/production-factory/normalization-readiness-input.json";
const CLAIMS_PATH =
  "data/record-clearing/production-factory/job-claims.json";
const AUTHORITY_PATH = "data/record-clearing/master-library/authority.json";
const ASSET_AUDIT_PATH =
  "data/record-clearing/master-library/repository-asset-audit.json";
const QUEUE_PATH =
  "data/record-clearing/legal-design-implementation-queue.json";

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const context = loadContext();

    if (args.bundle) {
      verifyCandidateBundle(context, args.bundle);
    } else {
      verifyCommittedReadiness(context, args.jurisdiction);
    }
  } catch (error) {
    process.stderr.write(
      `RCAP normalization readiness verification failed: ${error.message}\n`
    );
    process.exitCode = 1;
  }
}

function loadContext() {
  return {
    input: readJson(INPUT_PATH),
    claims: readJson(CLAIMS_PATH),
    authority: readJson(AUTHORITY_PATH),
    repositoryAssetAudit: readJson(ASSET_AUDIT_PATH),
    queue: readJson(QUEUE_PATH)
  };
}

function verifyCommittedReadiness(context, jurisdiction) {
  const validation = validateNormalizationReadinessInput(context);
  if (!validation.ok) {
    throw new Error(validation.issues.join("\n"));
  }
  const claimValidation = validateFactoryJobClaims(context.claims);
  if (!claimValidation.ok) {
    throw new Error(claimValidation.issues.join("\n"));
  }

  const outstanding = context.queue.outstandingJurisdictions ?? [];
  const records = buildNormalizationReadinessRecords({
    ...context,
    outstandingJurisdictions: outstanding
  });
  const remainingRecords = REMAINING_NORMALIZATION_JURISDICTIONS.map(
    (code) => records.get(code)
  );
  if (remainingRecords.some((record) => !record)) {
    throw new Error("The 24-jurisdiction readiness partition is incomplete.");
  }

  if (jurisdiction) {
    const record = records.get(jurisdiction);
    if (!record) {
      throw new Error(`Unknown normalization jurisdiction ${jurisdiction}.`);
    }
    if (record.readinessState !== "ready_for_normalization") {
      throw new Error(
        `normalization_readiness_blocked ${jurisdiction}: ` +
          record.readinessBlockers.join(", ")
      );
    }
    process.stdout.write(
      `${JSON.stringify(
        {
          jurisdiction,
          result: "ready_for_normalization",
          controllingReviewSha256: record.controllingReviewSha256,
          mechanismInventorySha256: record.mechanismInventorySha256,
          expectedSourceIds: record.expectedSourceIds.length
        },
        null,
        2
      )}\n`
    );
    return;
  }

  const readinessCounts = Object.fromEntries(
    [...new Set(remainingRecords.map((record) => record.readinessState))]
      .sort()
      .map((state) => [
        state,
        remainingRecords.filter((record) => record.readinessState === state)
          .length
      ])
  );
  process.stdout.write(
    `${JSON.stringify(
      {
        result: "passed",
        authorityEdition: context.input.authorityEdition,
        expectedJurisdictions: REMAINING_NORMALIZATION_JURISDICTIONS.length,
        representedExactlyOnce: remainingRecords.length,
        reviewIdentityConfirmations:
          context.input.reviewIdentityConfirmations.length,
        bundlesReceived: context.input.bundles.length,
        readinessCounts,
        exactJobClaims: context.claims.claims.length,
        sourceAuthorityState:
          "authority_asset_known_binary_materialization_required"
      },
      null,
      2
    )}\n`
  );
}

function verifyCandidateBundle(context, bundlePath) {
  const absolute = path.resolve(process.cwd(), bundlePath);
  const bundle = JSON.parse(fs.readFileSync(absolute, "utf8"));
  const reviewAssets = legalReviewAssetsForTesting(
    context.repositoryAssetAudit
  );
  const reviewAsset = (reviewAssets.get(bundle.jurisdiction) ?? [])[0];
  const inspection = inspectNormalizationBundle({
    bundle,
    authorityEdition: String(context.input.authorityEdition),
    authorityArchive: context.input.authorityArchive,
    reviewAsset
  });
  if (!inspection.ok) {
    throw new Error(inspection.issues.join("\n"));
  }

  const expectedHash = mechanismInventorySha256({
    authorityEdition: context.input.authorityEdition,
    jurisdiction: bundle.jurisdiction,
    controllingReviewSha256: bundle.controllingReviewSha256,
    mechanismInventory: bundle.mechanismInventory
  });
  const nextInput = structuredClone(context.input);
  nextInput.bundles = [
    ...nextInput.bundles.filter(
      (entry) => entry.jurisdiction !== bundle.jurisdiction
    ),
    bundle
  ].sort((left, right) =>
    left.jurisdiction.localeCompare(right.jurisdiction)
  );
  const validation = validateNormalizationReadinessInput({
    ...context,
    input: nextInput
  });
  if (!validation.ok) {
    throw new Error(validation.issues.join("\n"));
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        result: "bundle_valid",
        jurisdiction: bundle.jurisdiction,
        reviewSha256: bundle.controllingReviewSha256,
        mechanismInventoryRows: bundle.mechanismInventory.length,
        mechanismInventorySha256: expectedHash,
        expectedSourceIds: bundle.expectedSourceIds.length
      },
      null,
      2
    )}\n`
  );
}

function parseArgs(argv) {
  let bundle = null;
  let jurisdiction = null;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--bundle" || arg === "--jurisdiction") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${arg} requires a value.`);
      }
      index += 1;
      if (arg === "--bundle") bundle = value;
      if (arg === "--jurisdiction") jurisdiction = value;
    } else if (arg.startsWith("--bundle=")) {
      bundle = arg.slice("--bundle=".length);
    } else if (arg.startsWith("--jurisdiction=")) {
      jurisdiction = arg.slice("--jurisdiction=".length);
    } else {
      throw new Error(`Unsupported argument ${arg}.`);
    }
  }
  if (bundle && jurisdiction) {
    throw new Error("Use --bundle or --jurisdiction, not both.");
  }
  if (jurisdiction && !/^[A-Z]{2}$/.test(jurisdiction)) {
    throw new Error("--jurisdiction must be a two-letter uppercase code.");
  }
  return { bundle, jurisdiction };
}

function readJson(relativePath) {
  return JSON.parse(
    fs.readFileSync(path.join(ROOT, relativePath), "utf8")
  );
}

export { canonicalStringify };
