import "server-only";
import type { EngineProfile } from "@/lib/rcap-engine/contracts";
import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import type { RegisteredSpecification } from "@/lib/rcap/grade-a/packet-specification";
import { contactRepresentationHash } from "@/lib/expungement-ai/contact-representation";
import { MO_CLOSED_RECORD_ROUTE, isMissouriClosureGuidanceWithoutIdentityForm } from "@/lib/rcap-engine/missouri-closed-record-facts";
import memo from "../../../data/record-clearing/legal-design-intake/MO.memo.json";
import proof from "../../../data/record-clearing/production-factory/packet-proofs/rcap-mo-guidance-implementation.json";
import manifest from "../../../data/rcap-ledger/completed-output-counsel-manifest.json";

const family = manifest.families.find(row => row.familyId === "rcap-mo-guidance-implementation");
/** Hashes of the imported constants, computed once per process on first use.
 * Anything passed in current.* is hashed live, so overrides stay exact. */
let imported: { memo: string; proof: string; family: string } | undefined;
const importedHashes = () => imported ??= { memo: contactRepresentationHash(memo), proof: contactRepresentationHash(proof), family: contactRepresentationHash(family) };

/** Original GA14 Q-05683e402a6b283d367f. Originating-court information
 * helps locate the record for clerk/Case.net/MSHP status checks. The retained
 * §610.105 guidance has no participant filing or mapped court destination.
 * Preserve generic court text as context; do not infer a venue, petition,
 * completed closure or the separate §610.122/Article XIV court meanings. */
export function mo610105CourtIsContext(profile: EngineProfile | undefined,
  pathwayId: string | null, specification: RegisteredSpecification | null | undefined,
  current: { memo?: unknown; proof?: unknown; family?: unknown } = {}): boolean {
  return profile?.jurisdiction.code === "MO" && pathwayId === MO_CLOSED_RECORD_ROUTE
    && specification == null && isMissouriClosureGuidanceWithoutIdentityForm(profile, pathwayId)
    && contactRepresentationHash(profile) === "88e33a1958a25c8bd1082df4fccc1ebcba24938d8a4545af68c1a65820c8a750"
    && (current.memo === undefined ? importedHashes().memo : contactRepresentationHash(current.memo)) === "37c15117017d2c24fa57d1a9f53231626c14978f190073c044d35b6599a8c27f"
    && (current.proof === undefined ? importedHashes().proof : contactRepresentationHash(current.proof)) === "1296944c258e497d7fee6260bab11e9392f68c572da5862e3409f77bb8fbdfd7"
    && (current.family === undefined ? importedHashes().family : contactRepresentationHash(current.family)) === "e4696eaaa02e68dd1971aa7591d8e47f492aa2ab5f2ef566d1b4fac37dc0d87a";
}

export function mo610105CourtContextQuestion<T extends ProfileQuestion>(question: T,
  profile: EngineProfile | undefined, pathwayId: string | null,
  specification: RegisteredSpecification | null | undefined): T {
  if (question.id !== "court" || question.stage !== "case_details" || question.type !== "text"
    || question.prompt !== "Which court or agency handled the case?" || question.options != null
    || !mo610105CourtIsContext(profile, pathwayId, specification)) return question;
  return { ...question, required: false, contextOnly: true, lifecyclePhase: "guidance_only" };
}
