import "server-only";
import type { EngineProfile } from "@/lib/rcap-engine/contracts";
import { contactRepresentationHash as hash } from "@/lib/expungement-ai/contact-representation";
import { packetSpecificationFor } from "@/lib/rcap/grade-a/packet-specification";
import memo from "../../../data/record-clearing/legal-design-intake/MO.memo.json";
import guide from "../../../data/rcap-all50/guidance-packets/mo.json";
import proof from "../../../data/record-clearing/production-factory/packet-proofs/rcap-mo-guidance-implementation.json";
import manifest from "../../../data/rcap-ledger/completed-output-counsel-manifest.json";

export const MO_AUTOMATIC_DRUG_ROUTE = "state-initiated-automatic-expungement-of-eligible-drug-offenses-under-610-141";
export const MO_AUTOMATIC_DRUG_SOURCE = "MO.memo:mo-610-141-automatic-drug;Mo.Rev.Stat.610.141";
const routeKey = `MO:${MO_AUTOMATIC_DRUG_ROUTE}`;
const family = manifest.families.find(row => row.familyId === "rcap-mo-guidance-implementation");
const packet = guide.packets.find(row => row.trackId === "mo-610-141-automatic-drug")!;

/** Original GA42 index90/Q-05da98d5c9ff4737b1d0: this is general
 * nonfiling information, not an analysis of an individual's qualification.
 * The historical source's absence of an implementation notice never proves
 * current operational status. No completion or payment answer is inferred. */
export function moAutomaticDrugGuidanceSourceIsCurrent(profile: EngineProfile,
  current: { memo?: unknown; guide?: unknown; proof?: unknown; family?: unknown; specification?: unknown } = {}): boolean {
  const pathway = profile.pathways.find(row => row.id === MO_AUTOMATIC_DRUG_ROUTE);
  const posture = pathway as { automatic?: unknown; filingRequired?: unknown; routeType?: unknown } | undefined;
  const plan = profile.packetGenerator.pathways.find(row => row.pathwayId === MO_AUTOMATIC_DRUG_ROUTE);
  return profile.jurisdiction.code === "MO"
    && hash(profile) === "88e33a1958a25c8bd1082df4fccc1ebcba24938d8a4545af68c1a65820c8a750"
    && posture?.automatic === true && posture.filingRequired === false && posture.routeType === "automatic"
    && pathway?.legalAuthority?.paymentAuthority === "closed" && pathway.legalAuthority.packetFamily === null
    && plan?.mode === "automatic_relief_verification_and_guidance" && plan.formMappingStatus === "not_required"
    && plan.requiredInputIds?.length === 0 && plan.formCandidates?.length === 0
    && (current.specification === undefined ? packetSpecificationFor(routeKey) : current.specification) == null
    && hash(current.memo === undefined ? memo : current.memo) === "37c15117017d2c24fa57d1a9f53231626c14978f190073c044d35b6599a8c27f"
    && hash(current.guide === undefined ? guide : current.guide) === "6490c6dd8670c9b045d8d30892ff37fef2b18a7484a7357a972682eebfa0f9cb"
    && hash(current.proof === undefined ? proof : current.proof) === "1296944c258e497d7fee6260bab11e9392f68c572da5862e3409f77bb8fbdfd7"
    && hash(current.family === undefined ? family : current.family) === "e4696eaaa02e68dd1971aa7591d8e47f492aa2ab5f2ef566d1b4fac37dc0d87a";
}

export const MO_AUTOMATIC_DRUG_GUIDANCE = {
  filing: packet.participantFiles.en,
  nextStep: packet.nextStep.en,
  individualLimit: "And to be plain about our limits: we cannot see the central repository's data, we cannot run the eligibility analysis, and we never assert an outcome for a particular record in either direction.",
  operationLimit: "The state's clock: the section itself takes effect on 28 August 2026 as the ordinary date for an act of a session that adjourned on 15 May 2026, but § 610.141.10 then makes its provisions operative only when it is technically feasible for both the Office of the State Courts Administrator and the central repository, and no later than 1 January 2027."
};
