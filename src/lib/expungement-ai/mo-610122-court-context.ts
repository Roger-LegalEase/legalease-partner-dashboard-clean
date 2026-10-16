import "server-only";
import type { EngineProfile } from "@/lib/rcap-engine/contracts";
import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import type { RegisteredSpecification } from "@/lib/rcap/grade-a/packet-specification";
import { contactRepresentationHash } from "@/lib/expungement-ai/contact-representation";
import memo from "../../../data/record-clearing/legal-design-intake/MO.memo.json";
import sourceReceipt from "../../../data/rcap-all50/overlays/census-v1/mo/mo-610-122-arrest-expungement-set--official-pdf-fill/source-receipt.json";
import fieldMap from "../../../data/rcap-all50/overlays/census-v1/mo/mo-610-122-arrest-expungement-set--official-pdf-fill/production-field-map.json";
import wiring from "../../../data/rcap-all50/overlays/census-v1/mo/mo-610-122-arrest-expungement-set--official-pdf-fill/product-wiring.json";
import ratifications from "../../../data/record-clearing/legal-decisions/route-ratification-registry.json";

export const MO_610122_COURT_CONTEXT_ROUTE = "false-information-or-qualifying-arrest-record-expungement-under-610-122-123";
const ratification = ratifications.routes.find(row => row.routeKey === `MO:${MO_610122_COURT_CONTEXT_ROUTE}`);

/** Original GA14 Q-09aa40a73d4a52efba7c. The retained filing contract requires
 * the civil division of the circuit court in the county of arrest. Generic
 * historical court text is not that venue or the distinct CR145 caption and
 * respondent fields. Only the exact currently held, uninstalled, null-spec
 * consumer treats that generic text as optional retained context. This neither
 * removes the source filing requirements nor installs a filing destination. */
export function mo610122CourtIsContext(profile: EngineProfile | undefined,
  pathwayId: string | null, specification: RegisteredSpecification | null | undefined,
  current: { memo?: unknown; sourceReceipt?: unknown; fieldMap?: unknown; wiring?: unknown; ratification?: unknown } = {}): boolean {
  return profile?.jurisdiction.code === "MO" && pathwayId === MO_610122_COURT_CONTEXT_ROUTE
    && specification == null && ratification != null
    && contactRepresentationHash(profile) === "88e33a1958a25c8bd1082df4fccc1ebcba24938d8a4545af68c1a65820c8a750"
    && contactRepresentationHash((current.memo === undefined ? memo : current.memo)) === "37c15117017d2c24fa57d1a9f53231626c14978f190073c044d35b6599a8c27f"
    && contactRepresentationHash((current.sourceReceipt === undefined ? sourceReceipt : current.sourceReceipt)) === "d21dd472cbd693b8c1d0692ef1f51d44dc44d25e7ac8606a71b5632790436ec8"
    && contactRepresentationHash((current.fieldMap === undefined ? fieldMap : current.fieldMap)) === "437a4ae05010aef489a4c80789d73322323cd3a16c78799c9fec1fbdfafd9bc1"
    && contactRepresentationHash((current.wiring === undefined ? wiring : current.wiring)) === "e2a764f8456926fc276727fe8c25dde09e850c6a2cd9a0c23a6ab595ff676883"
    && contactRepresentationHash((current.ratification === undefined ? ratification : current.ratification)) === "2a932ce4fe192e0ebf6648278c7d2d87219df65068750ec847def53c116c224f";
}

export function mo610122CourtContextQuestion<T extends ProfileQuestion>(question: T,
  profile: EngineProfile | undefined, pathwayId: string | null,
  specification: RegisteredSpecification | null | undefined): T {
  if (question.id !== "court" || question.stage !== "case_details" || question.type !== "text"
    || question.prompt !== "Which court or agency handled the case?" || question.options != null
    || !mo610122CourtIsContext(profile, pathwayId, specification)) return question;
  return { ...question, required: false, contextOnly: true, lifecyclePhase: "guidance_only" };
}
