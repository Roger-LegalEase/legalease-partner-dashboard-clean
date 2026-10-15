import type { EngineProfile } from "@/lib/rcap-engine/contracts";
import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import type { RegisteredSpecification } from "@/lib/rcap/grade-a/packet-specification";
import { contactRepresentationHash } from "@/lib/expungement-ai/contact-representation";
import memo from "../../../data/record-clearing/legal-design-intake/OH.memo.json";
import proof from "../../../data/record-clearing/production-factory/packet-proofs/rcap-oh-guidance-implementation.json";
import manifest from "../../../data/rcap-ledger/completed-output-counsel-manifest.json";

export const OH_TRAFFICKING_GUIDANCE_ROUTES = [
  "human-trafficking-survivor-conviction-expungement-under-2953-36",
  "human-trafficking-survivor-non-conviction-expungement-under-2953-521"
] as const;
const family = manifest.families.find(row => row.familyId === "rcap-oh-guidance-implementation");

/** Original GA14 Q-0e68b7c58f6013139482 / Q-f345b79fbbfd08086e28.
 * Adopted guidance names a court destination but prepares no application.
 * Earlier court identity is context, never a required filing input for these
 * two guidance scopes. This guard grants no route, editor or output authority.
 * Historical proof review flags are not rewritten by the later named approval.
 */
export function ohTraffickingCourtIsContext(profile: EngineProfile | undefined,
  pathwayId: string | null, specification: RegisteredSpecification | null | undefined,
  current: { memo?: unknown; proof?: unknown; family?: unknown } = {}): boolean {
  return profile?.jurisdiction.code === "OH"
    && OH_TRAFFICKING_GUIDANCE_ROUTES.some(route => route === pathwayId)
    && specification == null
    && contactRepresentationHash(profile) === "10d16893413374ee1d2e37059f4d17ec1f15e8cd2329d5d22096396c142e9f68"
    && contactRepresentationHash(current.memo === undefined ? memo : current.memo) === "91e19cea7bd699b107c6efeeccb718aaf6899a586ae2145dbffb5346650a2252"
    && contactRepresentationHash(current.proof === undefined ? proof : current.proof) === "c9a63ad0fdc53dbe6ac15c41ebeefa8212de63c1fa414696c0031f32e44c4469"
    && contactRepresentationHash(current.family === undefined ? family : current.family) === "b36e5c2c3f9dea77f19ca8665df9e6916b69ce28ae864d07e1778e6239c80ef4";
}

export function ohTraffickingCourtContextQuestion<T extends ProfileQuestion>(question: T,
  profile: EngineProfile | undefined, pathwayId: string | null,
  specification: RegisteredSpecification | null | undefined): T {
  if (question.id !== "court" || question.stage !== "case_details" || question.type !== "text"
    || question.prompt !== "Which court or agency handled the case?"
    || question.options != null || !ohTraffickingCourtIsContext(profile, pathwayId, specification)) return question;
  return { ...question, required: false, contextOnly: true,
    prompt: "Earlier court or agency answer (optional history)",
    helperText: "Your earlier answer remains in your history. This service provides information and referrals for this route and does not prepare a court application. You do not need to supply a court name for this guidance. This answer does not establish eligibility or a connection to trafficking.",
    translations: { ...question.translations, es: { ...question.translations?.es,
      prompt: "Respuesta anterior sobre el tribunal o la agencia (historial opcional)",
      helperText: "Su respuesta anterior se conserva en su historial. Este servicio ofrece información y referencias para esta vía y no prepara una solicitud judicial. No necesita indicar el nombre de un tribunal para esta orientación. Esta respuesta no establece los requisitos para obtener una reparación ni una relación con la trata de personas."
    } } };
}
