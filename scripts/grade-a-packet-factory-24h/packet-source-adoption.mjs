import fs from "node:fs";
import path from "node:path";

const clone = (value) => JSON.parse(JSON.stringify(value));

/**
 * Measure whether a family's packet receipt has adopted each source identity
 * required by its verified additive source determination.
 */
export function assessPacketSourceAdoption(root, directory, sourceReconciliation) {
  const required = sourceReconciliation?.requiredPacketSourceBindings;
  if (!Array.isArray(required) || required.length === 0) return null;

  const receiptPath = path.posix.join(directory, "source-receipt.json");
  const absolute = path.resolve(root, receiptPath);
  let receipt;
  try {
    receipt = JSON.parse(fs.readFileSync(absolute, "utf8"));
  } catch (error) {
    return {
      status: "PACKET_SOURCE_RECEIPT_MISSING_OR_INVALID",
      ready: false,
      receiptPath,
      requiredBindings: clone(required),
      observedBindings: [],
      reason: `Packet source adoption refused: ${receiptPath} is missing or invalid (${error.message}).`,
    };
  }

  const documents = Array.isArray(receipt.documents) ? receipt.documents : [];
  const observedBindings = [];
  const mismatches = [];
  for (const expected of required) {
    const matches = documents.filter((document) => Array.isArray(document.sourceIds)
      && document.sourceIds.includes(expected.sourceId));
    const observedSha256 = [...new Set(matches.map((document) => document.sha256)
      .filter((sha256) => typeof sha256 === "string"))];
    observedBindings.push({ sourceId: expected.sourceId, sha256: observedSha256 });
    if (matches.length === 0) {
      mismatches.push({ sourceId: expected.sourceId, expectedSha256: expected.sha256, observedSha256: [], mismatch: "SOURCE_ID_MISSING" });
    } else if (matches.length !== 1 || observedSha256.length !== 1 || observedSha256[0] !== expected.sha256) {
      mismatches.push({ sourceId: expected.sourceId, expectedSha256: expected.sha256, observedSha256, mismatch: "SHA256_MISMATCH_OR_AMBIGUOUS" });
    }
  }

  if (mismatches.length > 0) {
    return {
      status: "PACKET_SOURCE_ADOPTION_REQUIRED",
      ready: false,
      receiptPath,
      requiredBindings: clone(required),
      observedBindings,
      mismatches,
      reason: `Packet source adoption refused: ${receiptPath} does not bind every required sourceId to its adopted SHA-256.`,
    };
  }
  return {
    status: "PACKET_SOURCE_ADOPTION_CURRENT",
    ready: true,
    receiptPath,
    requiredBindings: clone(required),
    observedBindings,
    mismatches: [],
    reason: "The family source receipt binds every required adopted packet source by SHA-256.",
  };
}
