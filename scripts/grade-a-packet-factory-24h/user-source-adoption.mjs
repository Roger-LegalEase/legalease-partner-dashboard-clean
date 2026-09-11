import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const USER_SOURCE_ADOPTION_PATH =
  "data/rcap-grade-a/source-wave-integration/SOURCE_USER_UPLOAD_ADOPTION_2026-09-11.json";
export const AZ_ATTACHMENT_ADOPTION_PATH =
  "data/rcap-grade-a/source-wave-integration/SOURCE_AZ_R260001_ATTACHMENT_ADOPTION_2026-09-11.json";

const SCHEMA = "rcap-source-custody-adoption/v1";
const ACCEPTED_RESULTS = new Set([
  "ACQUIRED_CURRENT_OFFICIAL_BINARY",
  "OFFICIAL_SOURCE_ALREADY_HELD",
  "PASS",
]);
const SHA256 = /^[0-9a-f]{64}$/;
const clone = (value) => JSON.parse(JSON.stringify(value));
const refuse = (detail) => {
  throw new Error(`REFUSED user source adoption — ${detail}`);
};
const stringArray = (value, label, { nonempty = true } = {}) => {
  if (!Array.isArray(value) || (nonempty && value.length === 0)
      || value.some((entry) => typeof entry !== "string" || entry.length === 0)) {
    refuse(`${label} must be ${nonempty ? "a nonempty" : "an"} array of nonempty strings`);
  }
  if (new Set(value).size !== value.length) refuse(`${label} contains duplicates`);
  return value;
};

function adoptedBytes(root, source, index) {
  const label = `sources[${index}]`;
  if (typeof source.heldCorpusPath !== "string" || source.heldCorpusPath.length === 0
      || path.isAbsolute(source.heldCorpusPath)) {
    refuse(`${label}.heldCorpusPath must be a repository-relative path`);
  }
  const rootPath = path.resolve(root);
  const candidate = path.resolve(rootPath, source.heldCorpusPath);
  if (candidate !== rootPath && !candidate.startsWith(`${rootPath}${path.sep}`)) {
    refuse(`${label}.heldCorpusPath escapes the repository root`);
  }
  let realRoot;
  let realCandidate;
  try {
    realRoot = fs.realpathSync(rootPath);
    realCandidate = fs.realpathSync(candidate);
  } catch {
    refuse(`${label}.heldCorpusPath is missing: ${source.heldCorpusPath}`);
  }
  if (realCandidate !== realRoot && !realCandidate.startsWith(`${realRoot}${path.sep}`)) {
    refuse(`${label}.heldCorpusPath resolves outside the repository root`);
  }
  const stat = fs.statSync(realCandidate);
  if (!stat.isFile()) refuse(`${label}.heldCorpusPath is not a file`);
  if (!Number.isSafeInteger(source.byteLength) || source.byteLength < 0) {
    refuse(`${label}.byteLength must be a nonnegative safe integer`);
  }
  if (!SHA256.test(String(source.sha256 ?? ""))) {
    refuse(`${label}.sha256 must be a lowercase SHA-256 digest`);
  }
  const bytes = fs.readFileSync(realCandidate);
  if (bytes.length !== source.byteLength) {
    refuse(`${label} byte length drift for ${source.heldCorpusPath}: expected ${source.byteLength}, observed ${bytes.length}`);
  }
  const observed = crypto.createHash("sha256").update(bytes).digest("hex");
  if (observed !== source.sha256) {
    refuse(`${label} SHA-256 drift for ${source.heldCorpusPath}: expected ${source.sha256}, observed ${observed}`);
  }
}

function validateAdoption(root, document) {
  if (!document || typeof document !== "object" || Array.isArray(document)) refuse("record must be an object");
  if (document.schemaVersion !== SCHEMA) refuse(`schemaVersion must be ${SCHEMA}`);
  if (!Array.isArray(document.sources)) refuse("sources must be an array");
  if (!Array.isArray(document.familyDeterminations)) refuse("familyDeterminations must be an array");

  const sourceIds = new Set();
  const sourceById = new Map();
  const itemIds = new Set();
  for (const [index, source] of document.sources.entries()) {
    const label = `sources[${index}]`;
    if (!source || typeof source !== "object" || Array.isArray(source)) refuse(`${label} must be an object`);
    if (typeof source.sourceObligationId !== "string"
        || (!source.sourceObligationId.startsWith("official-form:")
          && !source.sourceObligationId.startsWith("official-authority:")
          && !source.sourceObligationId.includes("::official-form:")
          && !source.sourceObligationId.includes("::official-authority:"))) {
      refuse(`${label}.sourceObligationId must identify an official form or authority obligation`);
    }
    if (source.sourceId !== source.sourceObligationId) {
      refuse(`${label}.sourceId must equal sourceObligationId`);
    }
    if (sourceIds.has(source.sourceObligationId)) {
      refuse(`duplicate sourceObligationId ${source.sourceObligationId}`);
    }
    sourceIds.add(source.sourceObligationId);
    sourceById.set(source.sourceObligationId, source);
    stringArray(source.familyIds, `${label}.familyIds`);
    stringArray(source.itemIds, `${label}.itemIds`);
    for (const itemId of source.itemIds) {
      if (itemIds.has(itemId)) refuse(`duplicate adopted itemId ${itemId}`);
      itemIds.add(itemId);
    }
    const expectedItemIds = source.familyIds.map((familyId) => `${familyId}::${source.sourceObligationId}`).sort();
    if (JSON.stringify([...source.itemIds].sort()) !== JSON.stringify(expectedItemIds)) {
      refuse(`${label}.itemIds must equal familyIds::sourceObligationId exactly`);
    }
    if (!ACCEPTED_RESULTS.has(source.result)) {
      refuse(`${label}.result ${JSON.stringify(source.result)} is not an accepted acquisition result`);
    }
    adoptedBytes(root, source, index);
  }

  const familyIds = new Set();
  for (const [index, determination] of document.familyDeterminations.entries()) {
    const label = `familyDeterminations[${index}]`;
    if (!determination || typeof determination !== "object" || Array.isArray(determination)) {
      refuse(`${label} must be an object`);
    }
    if (typeof determination.familyId !== "string" || determination.familyId.length === 0) {
      refuse(`${label}.familyId must be a nonempty string`);
    }
    if (familyIds.has(determination.familyId)) {
      refuse(`duplicate family determination ${determination.familyId}`);
    }
    familyIds.add(determination.familyId);
    if (typeof determination.disposition !== "string" || determination.disposition.length === 0) {
      refuse(`${label}.disposition must be a nonempty string`);
    }
    if (Object.hasOwn(determination, "requiredPacketSourceBindings")) {
      if (!Array.isArray(determination.requiredPacketSourceBindings)
          || determination.requiredPacketSourceBindings.length === 0) {
        refuse(`${label}.requiredPacketSourceBindings must be a nonempty array`);
      }
      const bindingIds = new Set();
      for (const [bindingIndex, binding] of determination.requiredPacketSourceBindings.entries()) {
        const bindingLabel = `${label}.requiredPacketSourceBindings[${bindingIndex}]`;
        if (!binding || typeof binding !== "object" || Array.isArray(binding)
            || typeof binding.sourceId !== "string" || !SHA256.test(String(binding.sha256 ?? ""))) {
          refuse(`${bindingLabel} must name a sourceId and lowercase SHA-256 digest`);
        }
        if (bindingIds.has(binding.sourceId)) refuse(`${label}.requiredPacketSourceBindings contains duplicate ${binding.sourceId}`);
        bindingIds.add(binding.sourceId);
        const adopted = sourceById.get(binding.sourceId);
        if (!adopted || !adopted.familyIds.includes(determination.familyId)) {
          refuse(`${bindingLabel} is not an adopted source for ${determination.familyId}`);
        }
        if (binding.sha256 !== adopted.sha256) {
          refuse(`${bindingLabel}.sha256 does not match the adopted source digest`);
        }
      }
    }
  }
  return document;
}

/** Read and byte-verify only the source bodies explicitly adopted by the additive record. */
export function loadUserSourceAdoption(root, options = {}) {
  const recordPath = options.recordPath ?? USER_SOURCE_ADOPTION_PATH;
  const absolute = path.resolve(root, recordPath);
  let document;
  try {
    document = JSON.parse(fs.readFileSync(absolute, "utf8"));
  } catch (error) {
    refuse(`${recordPath} is not readable JSON: ${error.message}`);
  }
  validateAdoption(root, document);
  return clone(document);
}

/**
 * Return an effective clone. Historical determination bytes and the caller's
 * parsed object remain untouched; family rows in the additive record replace
 * the same family or append a newly governed family.
 */
export function applyUserSourceDeterminations(root, historical, options = {}) {
  if (!historical || typeof historical !== "object" || Array.isArray(historical)) {
    refuse("historical determinations must be an object");
  }
  if (!historical.reconciliation42 || !Array.isArray(historical.reconciliation42.families)
      || !Array.isArray(historical.reconciliation42.acquisitionEvidencePaths)) {
    refuse("historical determinations carry no usable reconciliation42 record");
  }
  const adoption = options.adoption
    ? validateAdoption(root, clone(options.adoption))
    : loadUserSourceAdoption(root, { recordPath: options.recordPath });
  const effective = clone(historical);
  const families = effective.reconciliation42.families;
  const indexByFamily = new Map(families.map((row, index) => [row.familyId, index]));
  for (const determination of adoption.familyDeterminations) {
    const row = clone(determination);
    const index = indexByFamily.get(row.familyId);
    if (index === undefined) {
      indexByFamily.set(row.familyId, families.length);
      families.push(row);
    } else {
      families[index] = { ...families[index], ...row };
    }
  }
  const adoptedFamilyIds = new Set(adoption.familyDeterminations.map((row) => row.familyId));
  effective.reconciliation42.laterSourceBlockersKeptSeparate =
    (effective.reconciliation42.laterSourceBlockersKeptSeparate ?? [])
      .filter((familyId) => !adoptedFamilyIds.has(familyId));
  const evidencePath = options.recordPath ?? USER_SOURCE_ADOPTION_PATH;
  if (!effective.reconciliation42.acquisitionEvidencePaths.includes(evidencePath)) {
    effective.reconciliation42.acquisitionEvidencePaths.push(evidencePath);
  }
  // Apply later custody as a separate governed record. Preserve the original
  // upload determination and its then-correct missing-attachment finding.
  // Explicit records used by tests/tools remain isolated from this chain.
  if (!options.recordPath && !options.adoption) {
    return applyUserSourceDeterminations(root, effective, { recordPath: AZ_ATTACHMENT_ADOPTION_PATH });
  }
  return effective;
}
