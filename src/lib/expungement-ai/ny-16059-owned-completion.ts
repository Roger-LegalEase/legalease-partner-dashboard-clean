import "server-only";
import fs from "node:fs";
import path from "node:path";
import fieldMap from "../../../data/rcap-all50/overlays/census-v1/ny/ny-160-59-petition-set--official-pdf-fill/production-field-map.json";
import census from "../../../data/rcap-all50/overlays/census-v1/ny/ny-160-59-petition-set--official-pdf-fill/field-census.census-v1.json";
import receipt from "../../../data/rcap-all50/overlays/census-v1/ny/ny-160-59-petition-set--official-pdf-fill/source-receipt.json";
import { createNyCompletionVerifier } from "../../../scripts/rcap-packet-completeness/ny-16059-source-conditions.mjs";
import { ny16059ProtectedDocumentPreparation } from "@/lib/expungement-ai/ny-16059-document-preparation";
import type { ProtectedPacketVerificationRecord } from "@/lib/expungement-ai/verification-cas";

const familyId = "ny_160_59_petition-set";
type Declaration = { documentId: string; field: string; condition: string[] };
type Preparation = NonNullable<ReturnType<typeof ny16059ProtectedDocumentPreparation>>;

// Private, in-process resolver. No HTTP/JSON caller can supply this callback.
// Case-number collections for multiple covered cases are deliberately absent:
// they need per-case association before any single printed row can use them.
function ownedFieldResolver(preparation: Preparation) {
  const held = structuredClone(preparation);
  const direct: Record<string, string> = {
    "NY-CPL-160.59-PRO-SE-PACKET/AKAs": "ny_16059_case_alias_names",
    "NY-CPL-160.59-PRO-SE-PACKET/NYSID": "ny_16059_nysid_number",
    "NY-CPL-160.59-APPLICATION/Court_Name": "ny_16059_future_court",
    "NY-CPL-160.59-PRO-SE-PACKET/Court Name 3": "ny_16059_future_court",
    "NY-CPL-160.59-PRO-SE-PACKET/Case Number 3": "ny_16059_future_case_numbers",
  };
  const conditionValues = Object.fromEntries(Object.entries(held.conditions).map(([id, condition]) => [id, condition.value]));
  return (declaration: Declaration) => {
    const factId = direct[`${declaration.documentId}/${declaration.field}`];
    const futureField = factId === "ny_16059_future_court" || factId === "ny_16059_future_case_numbers";
    const future = held.futureApplications;
    const singleFutureCase = future.complete && future.applications?.length === 1 && future.applications[0].cases.length === 1 ? future.applications[0].cases[0] : null;
    const fact = futureField ? singleFutureCase ? { factId: "ny_16059_future_sealing_records" } : null : factId ? held.availableFacts[factId] : null;
    return {
      conditionValues,
      factAvailable: !!fact,
      factIds: [...declaration.condition.flatMap(id => {
        const condition = held.conditions[id as keyof typeof held.conditions];
        return condition?.value !== null && condition?.evidence ? [condition.evidence.factId] : [];
      }), ...(fact ? [fact.factId] : [])],
    };
  };
}

/** Only the existing authenticated owner GET calls this operation. Ownership
 * comes from its principal -> owned item -> protected RPC/seed read, NOT from
 * the hash-valid record or item identifier passed here. This is a read-only
 * source/field diagnostic, not verification of an owner-rendered PDF. */
export function ny16059OwnedCompletionDiagnostic(briefcaseItemId: string, record: ProtectedPacketVerificationRecord) {
  const preparation = ny16059ProtectedDocumentPreparation(record);
  if (!preparation) return null;
  let instructions = "";
  try {
    instructions = fs.readFileSync(path.join(process.cwd(), "data/rcap-all50/overlays/census-v1/ny/ny-160-59-petition-set--official-pdf-fill/participant-instructions.md"), "utf8");
  } catch { /* The verifier retains the missing-disclosure obligation. */ }
  const verify = createNyCompletionVerifier({ familyId, fieldMap, census, receipt, instructions,
    sourceRoot: process.env.MASTER_LIBRARY_SOURCE_DIR,
    resolveOwnedField: ownedFieldResolver(preparation),
  });
  const rows = fieldMap.documents.flatMap(document => document.fields.flatMap(row => {
    if (!("nyCompletion" in row) || !row.nyCompletion) return [];
    const declaration = { requiredBeforeFiling: "requiredBeforeFiling" in row && row.requiredBeforeFiling === true, routeDetermined: false };
    const blank = { document: document.documentId, name: row.field, label: row.effectiveLabel,
      page: row.widgets[0]?.page ?? null, nyCompletion: row.nyCompletion };
    return [{ documentId: document.documentId, field: row.field, ...verify(blank, declaration) }];
  }));
  return {
    schemaVersion: "ny-16059/owned-completion-diagnostic/v1" as const,
    briefcaseItemId, revision: preparation.revision, recordHash: preparation.recordHash, familyId,
    sourceIdentities: receipt.documents.map(document => ({ documentId: document.documentId, sha256: document.sha256 })),
    rows, ownerRenderedArtifactVerified: false as const, generationAllowed: false as const, reviewOnly: true as const,
  };
}
