import "server-only";
import type { EngineProfile } from "@/lib/rcap-engine/contracts";
import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import type { RegisteredSpecification } from "@/lib/rcap/grade-a/packet-specification";
import { contactRepresentationHash } from "@/lib/expungement-ai/contact-representation";
import { MO_MARIJUANA_CUSTODY_FACT, missouriMarijuanaCustodyContext } from "@/lib/rcap-engine/missouri-marijuana-status-facts";
import memo from "../../../data/record-clearing/legal-design-intake/MO.memo.json";
import proof from "../../../data/record-clearing/production-factory/packet-proofs/rcap-mo-guidance-implementation.json";
import manifest from "../../../data/rcap-ledger/completed-output-counsel-manifest.json";
import fieldMap from "../../../data/rcap-all50/overlays/census-v1/mo/mo-art-xiv-marijuana-set--official-pdf-fill/production-field-map.json";
import wiring from "../../../data/rcap-all50/overlays/census-v1/mo/mo-art-xiv-marijuana-set--official-pdf-fill/product-wiring.json";
import sourceReceipt from "../../../data/rcap-all50/overlays/census-v1/mo/mo-art-xiv-marijuana-set--official-pdf-fill/source-receipt.json";

const family = manifest.families.find(row => row.familyId === "rcap-mo-guidance-implementation");

/** Original GA14 Q-f57ac5d91f3085beddd1. Unit 1 status verification has no
 * participant filing venue. Generic historical court text may help locate the
 * record, but is not CR375's conditional charge/finding county, case caption,
 * per-conviction court or the incarcerated petition's sentencing court.
 * The caller supplies existing resolved custody text, never an older fallback. */
export function moXivCourtIsContext(profile: EngineProfile | undefined,
  pathwayId: string | null, specification: RegisteredSpecification | null | undefined,
  resolvedCustody: string,
  current: { memo?: unknown; proof?: unknown; family?: unknown; fieldMap?: unknown; wiring?: unknown; sourceReceipt?: unknown } = {}): boolean {
  return Boolean(profile) && specification == null && family != null
    && missouriMarijuanaCustodyContext(profile!, pathwayId, { [MO_MARIJUANA_CUSTODY_FACT]: resolvedCustody }) === "completed_status_check"
    && contactRepresentationHash(profile) === "88e33a1958a25c8bd1082df4fccc1ebcba24938d8a4545af68c1a65820c8a750"
    && contactRepresentationHash((current.memo === undefined ? memo : current.memo)) === "37c15117017d2c24fa57d1a9f53231626c14978f190073c044d35b6599a8c27f"
    && contactRepresentationHash((current.proof === undefined ? proof : current.proof)) === "1296944c258e497d7fee6260bab11e9392f68c572da5862e3409f77bb8fbdfd7"
    && contactRepresentationHash((current.family === undefined ? family : current.family)) === "e4696eaaa02e68dd1971aa7591d8e47f492aa2ab5f2ef566d1b4fac37dc0d87a"
    && contactRepresentationHash((current.fieldMap === undefined ? fieldMap : current.fieldMap)) === "e4d850412c745f1e4552209830964c2525f2fd2d3e33a611db007288fbfba940"
    && contactRepresentationHash((current.wiring === undefined ? wiring : current.wiring)) === "c196819a7627cb276adeec282af679fd618c17e136f291d0aab9657bab895ec0"
    && contactRepresentationHash((current.sourceReceipt === undefined ? sourceReceipt : current.sourceReceipt)) === "66ebb14adb5baaf8b40089fa34de4a1d45ac10bd5eac743fc7f0c994bc020339";
}

/** Use the collection's source-bound disposition so question metadata cannot
 * independently resurrect an old custody value or ignore a human override. */
export function moXivCourtContextQuestion<T extends ProfileQuestion>(question: T, context: boolean): T {
  if (!context || question.id !== "court" || question.stage !== "case_details" || question.type !== "text"
    || question.prompt !== "Which court or agency handled the case?" || question.options != null) return question;
  return { ...question, required: false, contextOnly: true, lifecyclePhase: "guidance_only" };
}
