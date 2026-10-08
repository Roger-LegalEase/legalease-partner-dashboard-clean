import type { ArtifactSourceInput } from "./artifact-domain";

const CONTROLLING_TYPES = new Set(["order_form", "master_services_agreement"]);

/** Shared contractual determination; funding and launch consent are separate. */
export function agreementClearance(source: Pick<ArtifactSourceInput, "workspace" | "agreements" | "assets" | "agreementEvidenceCurrent">, today = new Date().toISOString().slice(0, 10)) {
  const agreements = source.agreements ?? [];
  const documentFor = (agreement: NonNullable<ArtifactSourceInput["agreements"]>[number]) =>
    source.assets.find(asset => asset.id === agreement.finalizedAssetId &&
      asset.lifecycleStatus === "active" && asset.reviewStatus === "approved" &&
      ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(asset.mediaType ?? ""));
  const executed = (agreement: NonNullable<ArtifactSourceInput["agreements"]>[number]) => {
    const document = documentFor(agreement);
    return CONTROLLING_TYPES.has(agreement.type) && agreement.status === "executed" &&
      Boolean(agreement.signedReceiptId && agreement.signedAssetSha256) &&
      document?.category === "procurement_document" &&
      document.executionSha256 === agreement.signedAssetSha256 &&
      Boolean(agreement.effectiveDate && agreement.effectiveDate <= today);
  };
  if (source.workspace.agreementStatus !== "signed") {
    return { passing: false, reason: "No signed partner agreement has been verified. An approved order form without verified execution is not a signed agreement." };
  }
  if (!agreements.some(executed)) {
    return { passing: false, reason: "Needs agreement verification: link the current approved executed copy, matching immutable receipt and hash, and effective date." };
  }
  const missing = agreements.filter(agreement => agreement.required &&
    (CONTROLLING_TYPES.has(agreement.type) ? !executed(agreement) :
      !["approved", "finalized", "executed"].includes(agreement.status) || !documentFor(agreement) ||
      Boolean(agreement.effectiveDate && agreement.effectiveDate > today)));
  if (missing.length) {
    return { passing: false, reason: `Required contract documents still need review: ${missing.map(agreement => agreement.type.replace(/_/g, " ")).join(", ")}.` };
  }
  if (source.agreementEvidenceCurrent !== true) {
    return { passing: false, reason: "Needs agreement verification: current private document custody or authoritative execution evidence is unavailable or withdrawn." };
  }
  return { passing: true, reason: "Verified execution, current private document, matching immutable evidence, and all required contract documents are recorded." };
}
