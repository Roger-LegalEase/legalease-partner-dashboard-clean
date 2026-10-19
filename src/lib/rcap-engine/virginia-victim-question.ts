import "server-only";
import type { EngineProfile, PublicQuestion } from "@/lib/rcap-engine/contracts";
import type { RegisteredSpecification } from "@/lib/rcap/grade-a/packet-specification";
import { packetSpecificationFor } from "@/lib/rcap/grade-a/packet-specification";
import { contactRepresentationHash } from "@/lib/expungement-ai/contact-representation";
import memo from "../../../data/record-clearing/legal-design-intake/VA.memo.json";

export const VA_VICTIM_CONTEXT_ROUTES = ["regime-1-expungement-available-now", "automatic-sealing-no-filing", "petition-based-sealing"];
export const VA_VICTIM_STATUS_ID = "trafficking_status";
/** Hash of the imported memo, computed once per process on first use.
 * Anything passed in current.memo is hashed live, so overrides stay exact. */
let importedMemoHash: string | undefined;
const VA_REGIME1_SPECIFICATION_REPRESENTATIONS = new Set([
  "15f00b98121bfc500a5f3be0d25fe4860b0f6bea1046cf61522ae58a90df40b2",
  "1a86cdc4709753cb09fa4753a700f18a37feb4b9a6094a46f2db2e6244fe501e"
]);
/** Original three GA14 victim-status members. Retained VA mechanisms collect
 * offense/disposition facts, not compulsory victim disclosure. This removes
 * only the derived victim-question gate; it never supplies an offense, chooses
 * a mechanism, changes a statutory exclusion or approves the compiled regime. */
export function virginiaVictimQuestionContract(profile: EngineProfile | undefined, pathwayId?: string | null,
  current: { memo?: unknown; specification?: RegisteredSpecification | null } = {}): boolean {
  if (profile?.jurisdiction.code !== "VA" || pathwayId != null && !VA_VICTIM_CONTEXT_ROUTES.includes(pathwayId)
    || contactRepresentationHash(profile) !== "8b9e5e8eb7100788dae197f75a552d4e831918fc11d5fa74218652c1f8a7ca1c"
    || (current.memo === undefined ? importedMemoHash ??= contactRepresentationHash(memo) : contactRepresentationHash(current.memo)) !== "58eb8edd74515bbce9f737b4a749230f3568cc30b9cb578a9d0aa3d206ce1d6e") return false;
  // The current broad Regime1 route resolves to the existing absolute-pardon
  // specification. Pin that observed identity without borrowing its approval
  // for the other mechanisms. The two other original routes have no spec.
  // The observed identity and its one declared successor (a9e4ee852, adopted
  // CC-1474 source treatments under OWNER-RELAYED-ADOPTION-v3 section 7, also
  // bound in va-pardon-type-source.ts); neither consumes the victim status.
  return (pathwayId == null ? VA_VICTIM_CONTEXT_ROUTES : [pathwayId]).every(route => {
    const specification = Object.hasOwn(current, "specification") ? current.specification : packetSpecificationFor(`VA:${route}`);
    return route === VA_VICTIM_CONTEXT_ROUTES[0]
      ? specification != null && VA_REGIME1_SPECIFICATION_REPRESENTATIONS.has(contactRepresentationHash(specification))
        && !JSON.stringify(specification).includes(VA_VICTIM_STATUS_ID)
      : specification == null;
  });
}
export function virginiaVictimQuestionApplies(profile: EngineProfile | undefined, pathwayId: string | null | undefined, id: string): boolean {
  return id !== VA_VICTIM_STATUS_ID || !virginiaVictimQuestionContract(profile, pathwayId);
}
/** Preserve the descriptor for validation/history, while ending compulsory disclosure. */
export function virginiaVictimContextQuestion<T extends PublicQuestion>(profile: EngineProfile, question: T): T {
  return virginiaVictimQuestionApplies(profile, undefined, question.id) ? question : { ...question, required: false, contextOnly: true };
}
