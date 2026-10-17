import "server-only";
import type { EngineProfile, ScreeningAnswerValue, ScreeningEvaluation } from "@/lib/rcap-engine/contracts";
import { contactRepresentationHash as hash } from "@/lib/expungement-ai/contact-representation";
import { legalRouteContract } from "@/lib/legal-authority/index";
import { packetSpecificationFor } from "@/lib/rcap/grade-a/packet-specification";
import memo from "../../../data/record-clearing/legal-design-intake/FL.memo.json";
import crosswalk from "../../../data/rcap-ledger/track-pathway-crosswalk.json";

// Original GA42 FL32/34/35/37: conditional information inside the existing hold.
// These source-owned application commitments and later certifier steps are not
// personal qualification, a new service branch, or commercial/output authority.
export const FL_INFORMATION_ROUTES = {
  "automatic": "automatic-sealing-943-0595",
  "selfDefense": "lawful-self-defense-expunction-943-0578",
  "juvenileDiversion": "juvenile-diversion-expunction-943-0582",
  "administrative": "administrative-expunction-mistaken-or-unlawful-arrest"
} as const;
export const FL_INFORMATION_COPY = {
  "automatic": {
    "general": "General information about Florida automatic sealing under section 943.0595. FDLE acts after receiving a qualifying certified disposition from the clerk; the participant files nothing for this automatic process. This does not establish that your record qualifies or has been sealed.",
    "checks": "Check the final outcome of every count and whether the clerk sent the eligible certified disposition. Ask the clerk and use an FDLE personal review to check what the record currently shows. Automatic sealing has different effects from a court-ordered expunction."
  },
  "selfDefense": {
    "general": "General information about Florida’s dedicated lawful-self-defense FDLE expunction application under section 943.0578. A no-charge or dismissal answer does not establish that lawful self-defense was the reason or that the required certification exists.",
    "checks": "The participant can complete the dedicated FDLE application; the State Attorney completes the separate certification. The case must actually have ended because of lawful self-defense. The later certification document does not substitute for that underlying fact. Seek legal help if the prosecutor declines to certify."
  },
  "juvenileDiversion": {
    "general": "General information about Florida’s juvenile-diversion FDLE expunction application under section 943.0582. Being under 18 or having a juvenile matter does not establish successful completion of a qualifying diversion program or eligibility for this process.",
    "checks": "Check the actual diversion program, successful completion and offense requirements. The dedicated FDLE application requires certification, completion proof and fingerprints for later submission; those documents do not establish facts in this screening. The certifying office completes its section. This process does not use the ordinary once-per-lifetime sealing or expunction allowance."
  },
  "administrative": {
    "general": "General information about Florida administrative expunction under section 943.0581 for an arrest made by mistake or contrary to law. A no-charge or dismissal answer alone does not establish either circumstance or the required agency or prosecutor support.",
    "checks": "The person may apply to FDLE, with support certified separately by the head of the arresting agency or the State Attorney. The arrest must actually have been mistaken or contrary to law; later certification is not proof supplied by this screening. The participant and certifier complete their own sections. Seek legal help if certification is declined."
  }
};
export const FL_INFORMATION_LIMIT = "This is conditional information, not a finding that your record qualifies, has been cleared, or that any required certification exists. Check the exact record and source requirements before any application; this result offers no paid packet.";
export const FL_INFORMATION_HELD_LABEL = "Information about this process; case facts still need review.";
export const FL_INFORMATION_SOURCE = "FL.memo:fl-auto-seal/fl-self-defense/fl-juvenile-diversion/fl-administrative;LD-FL-01;conditional-information";
const expected = {
  "automatic-sealing-943-0595": {
    "pathway": "62e833cbc856242012e12cf4f7bd0d51cf709279b9fb0dcd390271e257189813",
    "plan": "3937688b8fa95880a655eeb0124d24a384b13386dae25345e4083fbdb3dea49a",
    "rules": "8aca02280a6bbdfd81f32f9357ea845722af4edca72d28f8e66e0f35f91777b7",
    "contract": "285cc811a6a7f9c4f460283cce9e73fec196bcf320285374897cf6fa3077c50e",
    "memo": "351cad63f01a7d49de6b69643279bf2d9d21c5c66808f2371d1366cf65955c31",
    "trackId": "fl-auto-seal",
    "crosswalk": "3c190a3e09a35f964f06d5da368415834605fe56a0ce71b0ef59733b3ef93bdf"
  },
  "lawful-self-defense-expunction-943-0578": {
    "pathway": "eada12e0128128870c6e2cfcd897173864dadda8b612af5edd556aea81c3dc75",
    "plan": "66b0b68d22417e5cfb477791c7b26834eed628e029bbc33e7bc56f157013d4f7",
    "rules": "34050abec60a688ffec7aeb7d5fa6d6ee841ed7612219fcf68415bfa81d4270d",
    "contract": "65cc72d07ea4a24715f8f04ff9c23ad499bb93d565fa3216c19110a7d18b1bcf",
    "memo": "08592a6cf5fb431bcdf092fd8e6487860ec30f522f9ca12d33afac24c298fe1f",
    "trackId": "fl-self-defense",
    "crosswalk": "a342eeb94a2d35abcec59190950aed357b8a9ff794d78588108a9d5a4d5a237a"
  },
  "juvenile-diversion-expunction-943-0582": {
    "pathway": "d98b93009b0056e34d725aeccb32012888a7882fb2960de3f6d7a092cef95705",
    "plan": "7368f1563621d0baab96a57b44ffde4221fb15536ef274f1474d73124420b382",
    "rules": "cc20665c54de770d519f8908a1bc08ab5a1e15836c6f8a9be4c84cbfe1bd9d6a",
    "contract": "ef0cb9a12f82dba7adee42278683ab3bc85e3fa8fcd34d0fe47e2624716d5fdf",
    "memo": "7f9732b81c3fe11b112420fd691c09f1b88b391a0a8fad53acce56541e46af67",
    "trackId": "fl-juvenile-diversion",
    "crosswalk": "0a83a473bbf32c93bffdc9d60ac3f60d52f021814245cad346432be20ec548e1"
  },
  "administrative-expunction-mistaken-or-unlawful-arrest": {
    "pathway": "26805e3e61c6b8f631493eee4d8042b13c3c88081c3cd0ca7cb42317e24aeed3",
    "plan": "1c836208f694934c139484c12e39267be034f6ec1256757b2da39743dad1177d",
    "rules": "f992d9b0351b810277b777387d0327fbb9629647f946f2f15526867eca9476d3",
    "contract": "7a0b6cb817f73ba596e220fd12012fb00fd3c3080af81505e11e0377e3b37511",
    "memo": "5ea3b292236d046cb58f1ab2446877ff1c46eab622cca9cef5d6555591b41c00",
    "trackId": "fl-administrative",
    "crosswalk": "34d0924b4f10a01f726cf589790a27180129214ea5b0a3b95797964d549005fa"
  }
};
const questionIds = ["ownership_scope", "jurisdiction_scope", "case_outcome", "offense_level", "possible_pathway_context", "age_at_offense", "sentence_completion_date", "prior_relief", "trafficking_status", "identity_error", "state_exclusion_categories"];
const genericTimingIds = ["sentence_completion_date", "resolved_timing_bucket"];
type Current = { contract?: unknown; memoTrack?: unknown; crosswalk?: unknown; specification?: unknown };
export function flConditionalInformationSourceIsCurrent(profile: EngineProfile, pathwayId: string | undefined, current: Current = {}): boolean {
  const route = Object.values(FL_INFORMATION_ROUTES).find(id => id === pathwayId);
  if (!route) return false;
  const pinned = expected[route];
  const rules = profile.orderedDecisionRules.filter(row => row.candidatePathwayIds?.includes(route) || row.when.backendPathwayId === route);
  return profile.jurisdiction.code === "FL" && profile.profileVersion === "2026-06-19-source-conversion-1"
    && profile.source?.sourceCorpusSha256 === "ae42a03eae275b18bc5bb384e16d793ea9ac9b3290daa561579350c9cd9974d7"
    && hash(profile.pathways.find(row => row.id === route) ?? null) === pinned.pathway
    && hash(profile.packetGenerator.pathways.find(row => row.pathwayId === route) ?? null) === pinned.plan
    && hash(rules) === pinned.rules
    && hash(profile.questions.filter(row => questionIds.includes(row.id))) === "5a0d10fd029c9e677e011714aa794595a03c25e685caa9f554ef85b251ebf5d8"
    && hash(current.contract === undefined ? legalRouteContract("FL", route) : current.contract) === pinned.contract
    && hash(current.memoTrack === undefined ? memo.tracks.find(row => row.trackId === pinned.trackId) : current.memoTrack) === pinned.memo
    && hash((current.crosswalk === undefined ? crosswalk.compiledPathways.find(row => row.compiledPathwayId === route) : current.crosswalk) ?? null) === pinned.crosswalk
    && (current.specification === undefined ? packetSpecificationFor(`FL:${route}`) : current.specification) == null;
}
export function flConditionalInformationContext(profile: EngineProfile, pathwayId: string | undefined, answers: Record<string, ScreeningAnswerValue>): keyof typeof FL_INFORMATION_ROUTES | null {
  if (!flConditionalInformationSourceIsCurrent(profile, pathwayId)
    || !["Yes", "I am helping someone complete their own check"].includes(String(answers.ownership_scope))
    || answers.jurisdiction_scope !== "State or local"
    || !["Misdemeanor", "Felony"].includes(String(answers.offense_level))) return null;
  const outcome = String(answers.case_outcome);
  if (pathwayId === FL_INFORMATION_ROUTES.juvenileDiversion) {
    const age = answers.age_at_offense;
    const numericAge = typeof age === "number" ? age : typeof age === "string" && /^\d+(?:\.\d+)?$/.test(age) ? Number(age) : NaN;
    return Number.isFinite(numericAge) && numericAge >= 0 && numericAge < 18
      && ["Juvenile adjudication or offense committed as a minor", "Diversion, deferred disposition, supervision, or similar program"].includes(outcome) ? "juvenileDiversion" : null;
  }
  if (!["Arrest or citation with no charge filed", "Dismissed, no-billed, nolle prosequi, or not prosecuted", "Acquitted or found not guilty"].includes(outcome)) return null;
  if (pathwayId === FL_INFORMATION_ROUTES.selfDefense && outcome === "Acquitted or found not guilty") return null;
  return pathwayId === FL_INFORMATION_ROUTES.automatic ? "automatic" : pathwayId === FL_INFORMATION_ROUTES.selfDefense ? "selfDefense" : "administrative";
}
export function flConditionalInformationQuestionApplies(profile: EngineProfile, pathwayId: string | undefined, answers: Record<string, ScreeningAnswerValue>, id: string): boolean {
  return !genericTimingIds.includes(id) || flConditionalInformationContext(profile, pathwayId, answers) === null;
}
/** Presentation never changes an eligibility/hold/commerce decision. Unknown
 * facts and genuine adverse/authority reasons remain the primary outcome. */
export function withFlConditionalInformation(evaluation: ScreeningEvaluation, context: keyof typeof FL_INFORMATION_ROUTES | null): ScreeningEvaluation {
  if (!context || !["needs_more_info", "needs_review", "guidance_only"].includes(evaluation.resultCode)) return evaluation;
  const copy = FL_INFORMATION_COPY[context];
  const code = `fl.${context}_conditional_information`;
  const genericSteps = ["We need the case date, dismissal date, disposition date, or completion date used to check the waiting period.", "Do not pay for a filing packet for this route."];
  return { ...evaluation,
    userLabel: evaluation.resultCode === "needs_more_info" ? FL_INFORMATION_HELD_LABEL : evaluation.userLabel,
    reasons: evaluation.reasons.some(row => row.code === code) ? evaluation.reasons : [...evaluation.reasons, { code, text: copy.general, sourceRef: FL_INFORMATION_SOURCE }],
    nextSteps: [copy.checks, ...evaluation.nextSteps.filter(text => !genericSteps.includes(text))],
    cautions: [...evaluation.cautions, FL_INFORMATION_LIMIT]
  };
}
