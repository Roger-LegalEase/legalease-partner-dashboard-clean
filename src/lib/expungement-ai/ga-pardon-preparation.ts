import type { EngineProfile } from "@/lib/rcap-engine/contracts";
import { GA_PARDON_FACT_IDS, GA_PARDON_ROUTE, GA_PARDON_SOURCE, georgiaConvictionCitation, georgiaPardonFacts, georgiaPardonQuestionApplies } from "@/lib/rcap-engine/georgia-pardon-facts";
import type { ProtectedPacketDraftSnapshot } from "@/lib/expungement-ai/verification-cas";
import { packetSpecificationFor } from "@/lib/rcap/grade-a/packet-specification";
import { georgiaPardonCategoryIsContext } from "@/lib/expungement-ai/ga-pardon-category-context";

const REQUIRED_DOCUMENT_FACTS = ["ga_pardoned_offense_section", "ga_pardon_date", "court", "county", "case_number", "arrest_date", "participant_narrative"] as const;
const SOURCE = "GA-02:2026-10-13;GA.memo:ga-pardon-j7;OCGA35-3-37(j)(7)";
type PreparationSnapshot = Pick<ProtectedPacketDraftSnapshot, "jurisdiction" | "pathwayId" | "profileVersion" | "profileSourceFingerprint" | "profileAuthorityFingerprint" | "resultCode" | "paymentAllowed" | "packetPlan" | "selectedTrackId" | "screeningAnswers" | "prefilledAnswers" | "packetAnswers" | "serverFacts">;

/** Collection scope only. Call AFTER the protected snapshot's integrity and
 * current authoritative evaluation have passed their existing checks. The
 * current fingerprint is computed by that consumer, never supplied by a user.
 * These controls belong to an explicit preparation surface; they must not add
 * mandatory document questions to an ordinary held eligibility correction.
 * GA.memo permits preparing the participant's petition before the court's
 * discretionary balance; it does not grant fulfillment or verification.
 */
export function georgiaPardonPreparationFactIds(snapshot: PreparationSnapshot, current: {
  profile: EngineProfile;
  profileAuthorityFingerprint: string;
  today: string;
  specification?: ReturnType<typeof packetSpecificationFor>;
}) {
  const { profile } = current;
  const specification = current.specification === undefined
    ? packetSpecificationFor(`GA:${GA_PARDON_ROUTE}`) : current.specification;
  if (snapshot.jurisdiction !== "GA" || snapshot.pathwayId !== GA_PARDON_ROUTE
    || profile.jurisdiction.code !== "GA" || profile.profileVersion !== "2026-06-19-source-conversion-1"
    || profile.source?.sourceCorpusSha256 !== "2e9c9d5f9ad17fefb315d71b4336f0ffd2de6c1b614453cd06abd45f06cf2812"
    || snapshot.profileVersion !== profile.profileVersion || snapshot.profileSourceFingerprint !== profile.source.sourceCorpusSha256
    || !/^[a-f0-9]{64}$/.test(current.profileAuthorityFingerprint)
    || snapshot.profileAuthorityFingerprint !== current.profileAuthorityFingerprint
    || GA_PARDON_SOURCE !== SOURCE || snapshot.resultCode !== "needs_review" || snapshot.paymentAllowed !== false
    || snapshot.packetPlan !== null || ![null, "ga-pardon-j7"].includes(snapshot.selectedTrackId)
    || specification?.routeKey !== `GA:${GA_PARDON_ROUTE}` || specification.trackId !== "ga-pardon-j7"
    || specification.specificationSha256 !== "75ccdf5a48c9ee30b0e4cf197edcd4e6ad967a9425470ed96bc47cb974cfb061") return null;
  const requiredFacts = specification.requiredFacts;
  if (!requiredFacts || REQUIRED_DOCUMENT_FACTS.some(id => !requiredFacts.some(fact => fact.factId === id && fact.ownership === "participant"))
    || !requiredFacts.some(fact => fact.factId === "otn" && fact.ownership === "participant" && fact.requiredForGeneration === false)) return null;
  const date = new Date(`${current.today}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(current.today) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== current.today) return null;

  // Do not let higher-priority map merging conceal a contradictory legal fact.
  // Document-only uncertainty remains editable; the strict document mapper and
  // existing caption confirmations still govern any later render.
  const ids = ["case_outcome", "pending_cases", ...GA_PARDON_FACT_IDS];
  const values = new Map<string, unknown[]>();
  const answers: Record<string, unknown> = {};
  for (const id of ids) {
    const supplied: unknown[] = [];
    for (const map of [snapshot.screeningAnswers, snapshot.prefilledAnswers, snapshot.packetAnswers, snapshot.serverFacts]) {
      if (!Object.hasOwn(map, id)) continue;
      const raw = map[id];
      const wrapped = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : null;
      const value = wrapped ? wrapped.unknown === false ? wrapped.value : undefined : raw;
      supplied.push(value);
    }
    values.set(id, supplied);
    if (supplied.length) answers[id] = supplied[supplied.length - 1];
  }
  for (const id of ids.filter(id => georgiaPardonQuestionApplies("GA", answers, id, GA_PARDON_ROUTE))) {
    const supplied = values.get(id)!;
    const meaning = (value: unknown) => {
      if (id === "pending_cases" && typeof value === "boolean") return value ? "Yes" : "No";
      if (typeof value !== "string" || !value.trim() || /^(unknown|i am not sure)$/i.test(value.trim())) return null;
      if (id !== "ga_pardoned_offense_section") return value;
      const citation = georgiaConvictionCitation(value);
      return citation ? `${citation.section}${citation.subsection}` : null;
    };
    if (supplied.some(value => meaning(value) === null || meaning(value) !== meaning(supplied[0]))) return null;
  }
  const decision = georgiaPardonFacts(answers, current.today);
  if (decision.status !== "review" || decision.ids.length || !["court_review", "court_review_traffic"].includes(decision.code)) return null;
  return {
    purpose: "participant_document_preparation" as const,
    source: SOURCE,
    requiredFactIds: [...REQUIRED_DOCUMENT_FACTS],
    optionalFactIds: ["otn", ...([snapshot.screeningAnswers, snapshot.prefilledAnswers, snapshot.packetAnswers].some(map => Object.hasOwn(map, "offense_category"))
      && georgiaPardonCategoryIsContext(snapshot.jurisdiction, snapshot.pathwayId, specification, profile) ? ["offense_category"] : [])],
    captionConfirmationFactIds: ["court", "county"]
  };
}
