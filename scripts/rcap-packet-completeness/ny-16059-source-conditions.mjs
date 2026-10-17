import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { NY_COMPLETION_FAMILY, nyCompletionDeclaration, nyCompletionApplicability } from "../lib/ny-16059-completion-conditions.mjs";
import { NY_16059_HELD_SOURCES, NY_16059_ROUTE } from "../lib/ny-16059-participant-guidance.mjs";

const fieldPins = Object.freeze({
  "NY-CPL-160.59-APPLICATION": "e34b5bcfed65f6a56ff54760da7fd3c708abac798da02c12eff6f0367f559757",
  "NY-CPL-160.59-COD-REQUEST": "2d11e4c95511b7de95a657f5b38f3cd27c151ad19e1a4a805aacfcd3b5c62014",
  "NY-CPL-160.59-PRO-SE-PACKET": "a41b19d23b805b4de917030ac5b2790d465a1c31e1ae9ea1b6f4bb137c67b0ec",
  "NY-CPL-160.59-SEAL-VERIFICATION": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
});
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const same = isDeepStrictEqual;
const identities = Object.keys(fieldPins).sort();

export function nyCompletionInventoryProblems(familyId, fieldMap, census) {
  if (familyId !== NY_COMPLETION_FAMILY) return [];
  const problems = [];
  const fail = (why, field) => problems.push({ counter: "unclassifiedBlanks", why, ...(field ? { field } : {}) });
  if (fieldMap?.familyId !== familyId || census?.familyId !== familyId
      || !same(fieldMap?.documents?.map(doc => doc.documentId).sort(), identities)
      || !same(census?.documents?.map(doc => doc.documentId).sort(), identities)) {
    fail("Exact NY four-document inventory is missing, duplicated or changed.");
    return problems;
  }
  let declarations = 0;
  for (const documentId of identities) {
    const doc = census.documents.find(row => row.documentId === documentId);
    const map = fieldMap.documents.find(row => row.documentId === documentId);
    if (doc.sourceSha256 !== NY_16059_HELD_SOURCES[documentId] || sha(JSON.stringify(doc.fields)) !== fieldPins[documentId]) {
      fail(`${documentId}: exact retained source field census changed.`);
      continue;
    }
    if (!same(map.fields.map(row => row.field).sort(), doc.fields.map(row => row.name).sort())) fail(`${documentId}: every exact field must occur once.`);
    for (const row of map.fields) {
      const expected = nyCompletionDeclaration(documentId, row.field);
      if (!expected) {
        if (row.nyCompletion) fail("Unregistered NY completion declaration.", row.field);
        continue;
      }
      declarations++;
      if (!same(row.nyCompletion, expected) || row.decision !== "refuse"
        || row.requiredBeforeFiling !== (expected.condition.length === 0)
        || row.blankTreatment !== (expected.condition.length === 0 ? "REQUIRED_BEFORE_FILING" : null)
        || row.routeDetermined !== false || row.refusalClass !== "ny_source_conditional_completion") {
        fail("NY source condition, actor, stage or requiredness is absent or changed; legacy prose cannot replace it.", row.field);
      }
    }
  }
  if (declarations !== 68) fail("All 68 exact NY condition/actor declarations remain owed.");
  return problems;
}

/** Reads actual source bytes when available. No serialized proof flag or
 * applicability context is authoritative. resolveOwnedField is an in-process
 * server callback, constructed only after the caller's existing owner read.
 * The callback type is not authentication. The CLI supplies no callback, and
 * fixture PDFs never become owner-rendered artifacts through this diagnostic.
 * @param {{ familyId: string, fieldMap: any, census: any, receipt: any,
 * instructions: string, sourceRoot?: string,
 * resolveOwnedField?: ((declaration: {documentId: string, field: string, condition: string[]}) =>
 * {conditionValues: Record<string, boolean | null>, factAvailable: boolean, factIds: string[]}) | null }} options
 */
export function createNyCompletionVerifier({ familyId, fieldMap, census, receipt, instructions, sourceRoot, resolveOwnedField = null }) {
  const inventory = nyCompletionInventoryProblems(familyId, fieldMap, census);
  const measured = new Map();
  return (blank, declared) => {
    if (familyId !== NY_COMPLETION_FAMILY) return null;
    const expected = nyCompletionDeclaration(blank.document, blank.name);
    if (!expected) return null;
    const base = { fieldClass: "NY_EXACT_SOURCE_CONDITION", completionActor: expected.actor,
      completionStage: expected.stage, condition: expected.condition, eventIdentity: expected.event,
      remainingObligation: expected.obligation, sourceVerified: false, applicabilityVerified: false };
    const fail = (proofState, basis) => ({ ...base, disposition: "UNCLASSIFIED_BLANK", proofState, basis });
    if (inventory.length) return fail("INVALID_DECLARATION", inventory[0].why);
    const doc = census.documents.find(row => row.documentId === blank.document);
    const row = fieldMap.documents.find(row => row.documentId === blank.document).fields.find(row => row.field === blank.name);
    const field = doc.fields.find(row => row.name === blank.name);
    if (!same(blank.nyCompletion, expected) || !same(row.widgets, field.widgets)
      || blank.page !== (field.widgets[0]?.page ?? null) || blank.label !== row.effectiveLabel
      || declared.requiredBeforeFiling !== row.requiredBeforeFiling || declared.routeDetermined !== false) {
      return fail("INVALID_DECLARATION", "Exact field identity, geometry or typed reader transport changed.");
    }
    let owned = null;
    if (typeof resolveOwnedField === "function") {
      try { owned = resolveOwnedField(structuredClone(expected)); } catch { /* An unavailable owner read grants nothing. */ }
    }
    const applicability = owned && owned.conditionValues && typeof owned.conditionValues === "object"
      ? nyCompletionApplicability(expected, owned.conditionValues) : "unknown";
    // Metadata is diagnostic. Source custody and exact disclosure still precede
    // any accepted blank. Raw answers and personal values stay out of this row.
    base.ownedApplicability = applicability;
    base.ownedFactIds = Array.isArray(owned?.factIds) ? owned.factIds.filter(id => typeof id === "string") : [];
    if (declared.factAvailable === true || row.factAvailable === true || owned?.factAvailable === true) return { ...base,
      disposition: "KNOWN_FACT_NOT_WRITTEN", proofState: "KNOWN_VALUE_STILL_OWED",
      basis: "A conditional or actor declaration never excuses an actual available owned fact. Its correct destination remains owed." };
    try {
      if (receipt?.familyId !== familyId || !same(receipt.routeKeys, [NY_16059_ROUTE])
        || !same(receipt.documents.map(row => row.documentId).sort(), identities)) throw Error("Exact source receipt or route changed.");
      const source = receipt.documents.find(row => row.documentId === blank.document);
      if (source.sha256 !== expected.sourceSha256 || source.acroFieldCount !== doc.fields.length) throw Error("Retained source identity changed.");
      if (!measured.has(blank.document)) {
        if (!sourceRoot || !path.isAbsolute(sourceRoot)) return fail("SOURCE_BYTES_UNAVAILABLE", "Exact original source root is unavailable; a rendered historical fixture is not source custody.");
        if (typeof source.pathInArchive !== "string" || path.isAbsolute(source.pathInArchive)
          || source.pathInArchive.split(/[\\/]/).includes("..")) throw Error("Unsafe source path.");
        const root = fs.realpathSync(sourceRoot), file = fs.realpathSync(path.join(root, source.pathInArchive));
        if (!file.startsWith(root + path.sep)) throw Error("Source path escapes corpus root.");
        const bytes = fs.readFileSync(file);
        if (bytes.length !== source.byteLength || sha(bytes) !== expected.sourceSha256) throw Error("Actual source bytes differ from retained receipt; fixture substitution is refused.");
        measured.set(blank.document, true);
      }
    } catch (error) { return fail("SOURCE_PROOF_UNRESOLVED", error instanceof Error ? error.message : String(error)); }
    if (!instructions.includes(blank.name) || !instructions.includes(expected.conditionDescription)) {
      return fail("DISCLOSURE_UNRESOLVED", "Exact source field and applicability/actor obligation are not disclosed.");
    }
    if (expected.condition.length) {
      if (applicability === "inactive") return { ...base, sourceVerified: true, applicabilityVerified: true,
        disposition: "NOT_APPLICABLE_ON_THIS_ROUTE", proofState: "SOURCE_AND_OWNED_CONDITION_INACTIVE",
        basis: "Exact source, field and disclosure plus this owner's explicit condition establish that this field is inactive. Remaining case facts and later acts are unchanged." };
      return { ...base, sourceVerified: true, applicabilityVerified: applicability === "active",
        disposition: "UNCLASSIFIED_BLANK", proofState: expected.condition.includes("source_revision_review")
          ? "SOURCE_REVISION_UNRESOLVED" : applicability === "active" ? "APPLICABLE_FACT_STILL_OWED" : "OWNED_APPLICABILITY_UNRESOLVED",
        basis: "An active or unknown owner condition does not excuse an unwritten field. Serialized context and proof flags confer no authority." };
    }
    return { ...base, sourceVerified: true, applicabilityVerified: true,
      disposition: "REQUIRED_BEFORE_FILING", proofState: "UNCONDITIONAL_PREPARATION_FACT",
      basis: "Exact source, field and disclosure identify an unavailable first-case preparation fact; a second case is not required for this obligation." };
  };
}
