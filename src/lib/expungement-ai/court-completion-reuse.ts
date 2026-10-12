import "server-only";
import catalog from "@/lib/expungement-ai/reviewed-court-completion-contracts.json";
import { contactRepresentationHash as hash } from "@/lib/expungement-ai/contact-representation";
import type { AnswerValue } from "@/lib/expungement-ai/frontend/contracts";

export type CourtCompletionContract = (typeof catalog.contracts)[number];
export type CourtCompletionImplication = {
  version: 1;
  scope: "same_protected_snapshot";
  contractId: string;
  contractSha256: string;
  routeKey: string;
  profileVersion: string;
  profileSourceFingerprint: string | null;
  profileAuthorityFingerprint: string;
  sourceFactId: string;
  targetFactId: string;
  sourceMap: "screeningAnswers" | "prefilledAnswers" | "packetAnswers";
  sourceRawValueSha256: string;
  outputMap: "prefilledAnswers";
  outputRawValueSha256: string;
};
type Maps = Record<"screeningAnswers" | "prefilledAnswers" | "packetAnswers", Record<string, AnswerValue>>;
const mapNames = ["screeningAnswers", "prefilledAnswers", "packetAnswers"] as const;
const owns = (object: object, id: string) => Object.prototype.hasOwnProperty.call(object, id);
export function courtCompletionContractsFor(routeKey: string): CourtCompletionContract[] {
  return catalog.contracts.filter(contract => contract.routeKey === routeKey);
}

/** Paid-only legacy facts stay independent. A broad completion Yes plus a
 * paid No needs clarification; it cannot prove either payment or a legal
 * exception. Exact route/question wording prevents a paid-or-satisfied field
 * from being silently reinterpreted under this contract.
 */
export function isIndependentPaidFinancialFact(routeKey: string, question: { id: string; prompt: string; helperText?: string | null } | undefined): boolean {
  return Boolean(question && catalog.independentPaidFactContracts.some(contract => contract.routeKey === routeKey
    && contract.factId === question.id && contract.prompt === question.prompt && contract.helperText === question.helperText));
}

/**
 * The caller validates the protected row and exact current source contracts.
 * Markers remain inside that owner/matter's hashed CAS snapshot. They are never
 * accepted as client input, copied from another matter, or payment authority.
 */
export function refreshCourtCompletionImplications(input: {
  contracts: CourtCompletionContract[];
  currentContractIds: ReadonlySet<string>;
  original: Maps;
  incoming: Maps;
  provenance?: Record<string, CourtCompletionImplication>;
  authorityUnchanged: (maps: Maps) => boolean;
}): { maps: Maps; provenance: Record<string, CourtCompletionImplication> } {
  const maps: Maps = { screeningAnswers: { ...input.incoming.screeningAnswers }, prefilledAnswers: { ...input.incoming.prefilledAnswers }, packetAnswers: { ...input.incoming.packetAnswers } };
  const provenance = { ...input.provenance };
  const proposals: Array<{ contract: CourtCompletionContract; marker: CourtCompletionImplication }> = [];
  for (const contract of input.contracts) {
    const id = contract.targetFactId, source = contract.sourceFactId;
    const sourceMap = [...mapNames].reverse().find(name => owns(maps[name], source));
    // A protected screening answer supplies participant provenance. A later
    // explicit unknown/No/empty override never falls back to that earlier Yes.
    const affirmative = owns(maps.screeningAnswers, source) && maps.screeningAnswers[source] === "yes"
      && sourceMap !== undefined && maps[sourceMap][source] === "yes";
    const marker = provenance[id];
    const proven = Boolean(marker && marker.version === 1 && marker.scope === "same_protected_snapshot"
      && marker.contractId === contract.contractId && marker.contractSha256 === contract.contractSha256
      && marker.routeKey === contract.routeKey && marker.profileVersion === contract.profileVersion
      && marker.profileSourceFingerprint === contract.profileSourceFingerprint
      && marker.profileAuthorityFingerprint === contract.profileAuthorityFingerprint
      && marker.sourceFactId === source && marker.targetFactId === id && mapNames.includes(marker.sourceMap)
      && marker.sourceRawValueSha256 === hash("yes") && marker.outputMap === "prefilledAnswers"
      && marker.outputRawValueSha256 === hash("Yes")
      && input.original.prefilledAnswers[id] === "Yes" && maps.prefilledAnswers[id] === "Yes"
      && !owns(input.original.screeningAnswers, id) && !owns(input.original.packetAnswers, id)
      && !owns(maps.screeningAnswers, id) && !owns(maps.packetAnswers, id));
    if (marker && !proven) delete provenance[id]; // Never relabel an independent value as derived.
    const current = input.currentContractIds.has(contract.contractId);
    if (proven && (!current || !affirmative)) {
      delete maps.prefilledAnswers[id];
      delete provenance[id];
    }
    if (!current || !affirmative) continue;
    if (mapNames.some(name => owns(maps[name], id))) continue;
    proposals.push({ contract, marker: {
      version: 1, scope: "same_protected_snapshot", contractId: contract.contractId, contractSha256: contract.contractSha256,
      routeKey: contract.routeKey, profileVersion: contract.profileVersion, profileSourceFingerprint: contract.profileSourceFingerprint,
      profileAuthorityFingerprint: contract.profileAuthorityFingerprint, sourceFactId: source, targetFactId: id,
      sourceMap: sourceMap!, sourceRawValueSha256: hash(maps[sourceMap!][source]), outputMap: "prefilledAnswers", outputRawValueSha256: hash("Yes")
    } });
  }
  if (!proposals.length || !input.authorityUnchanged(maps)) return { maps, provenance };
  const proposed = { ...maps, prefilledAnswers: { ...maps.prefilledAnswers } };
  for (const { contract } of proposals) proposed.prefilledAnswers[contract.targetFactId] = "Yes";
  // Validate the complete output set together; neither one nor several new
  // status answers may create a route or improve its eligibility/payment result.
  if (!input.authorityUnchanged(proposed)) return { maps, provenance };
  for (const { contract, marker } of proposals) provenance[contract.targetFactId] = marker;
  return { maps: proposed, provenance };
}
