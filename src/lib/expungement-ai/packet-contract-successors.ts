import "server-only";
import { ny16059PacketPlanSuccessor } from "@/lib/expungement-ai/ny-16059-packet-successor";
import { caProp64CaptionPlanSuccessor, caProp64PriorCaptionPlan } from "@/lib/expungement-ai/ca-prop64-caption-successor";
import contracts from "@/lib/expungement-ai/reviewed-packet-contract-successors.json";
import { contactRepresentationHash as hash } from "@/lib/expungement-ai/contact-representation";
import { packetSpecificationFor } from "@/lib/rcap/grade-a/packet-specification";
import type { PacketVerificationSnapshot } from "@/lib/expungement-ai/types";
import type { ProtectedPacketDraftSnapshot } from "@/lib/expungement-ai/verification-cas";
import type { ScreeningPacketPlan } from "@/lib/rcap-engine/contracts";

type Snapshot = PacketVerificationSnapshot | ProtectedPacketDraftSnapshot;
type SemanticSource = Pick<Snapshot, "jurisdiction" | "pathwayId" | "requiredInputIds" | "profileVersion" | "profileSourceFingerprint"
  | "profileAuthorityFingerprint" | "screeningAnswers" | "prefilledAnswers" | "packetAnswers" | "dependencies">;
export const MS_CHARGED_CONDUCT_FACT = "ms_charged_trafficking_distribution_manufacture";
const MS_ROUTE = "MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal";

/** Original hashes are validated by the caller first. This is a read projection, never a database migration. */
export function reviewedPacketContractSuccessor<T extends Snapshot>(snapshot: T, currentPlan: ScreeningPacketPlan | undefined): T | null {
  const nyPreparation = ny16059PacketPlanSuccessor(snapshot, currentPlan);
  if (nyPreparation) return nyPreparation;
  const caption = caProp64CaptionPlanSuccessor(snapshot, currentPlan);
  if (caption) return caption;
  const priorCaptionPlan = caProp64PriorCaptionPlan(currentPlan);
  if (priorCaptionPlan) {
    const prior = previousPacketContractSuccessor(snapshot, priorCaptionPlan);
    return prior ? caProp64CaptionPlanSuccessor(prior, currentPlan) : null;
  }
  return previousPacketContractSuccessor(snapshot, currentPlan);
}

function previousPacketContractSuccessor<T extends Snapshot>(snapshot: T, currentPlan: ScreeningPacketPlan | undefined): T | null {
  const routeKey = `${snapshot.jurisdiction}:${snapshot.pathwayId}`;
  const reviewed = (contracts.routes as Record<string, (typeof contracts.routes)[keyof typeof contracts.routes]>)[routeKey];
  const specification = packetSpecificationFor(routeKey);
  if (!reviewed || !currentPlan || !snapshot.packetPlan || !Array.isArray(snapshot.requiredInputIds) || snapshot.profileVersion !== reviewed.profileVersion
    || snapshot.profileSourceFingerprint !== reviewed.profileSourceFingerprint
    || snapshot.profileAuthorityFingerprint !== reviewed.profileAuthorityFingerprint
    || hash(snapshot.packetPlan) !== reviewed.previousPlanSha256
    || hash(snapshot.requiredInputIds) !== reviewed.previousRequiredIdsSha256
    || hash(currentPlan) !== reviewed.currentPlanSha256
    || hash(specification ?? null) !== reviewed.currentSpecificationSha256) return null;
  return preserveAmbiguousMsAnswer({ ...snapshot, packetPlan: { ...currentPlan }, requiredInputIds: [...currentPlan.requiredInputIds] });
}

/** A legacy wire ID alone cannot establish victimhood versus charged conduct. Never copy it into the new fact. */
export function preserveAmbiguousMsAnswer<T extends SemanticSource>(snapshot: T): T {
  const routeKey = `${snapshot.jurisdiction}:${snapshot.pathwayId}`;
  if (routeKey !== MS_ROUTE || !snapshot.requiredInputIds.includes(MS_CHARGED_CONDUCT_FACT)) return snapshot;
  const next = { ...snapshot, screeningAnswers: { ...snapshot.screeningAnswers }, prefilledAnswers: { ...snapshot.prefilledAnswers }, packetAnswers: { ...snapshot.packetAnswers } };
  const history = [...(snapshot.dependencies.semanticAnswerHistory ?? [])];
  for (const source of ["screeningAnswers", "prefilledAnswers", "packetAnswers"] as const) {
    if (!("trafficking_status" in next[source])) continue;
    const entry = { factId: "trafficking_status", value: next[source].trafficking_status, source,
      meaning: "ambiguous_victimhood_or_charged_conduct" as const, routeKey, profileVersion: snapshot.profileVersion,
      profileSourceFingerprint: snapshot.profileSourceFingerprint, profileAuthorityFingerprint: snapshot.profileAuthorityFingerprint };
    if (!history.some((prior) => hash(prior) === hash(entry))) history.push(entry);
    delete next[source].trafficking_status;
  }
  return history.length ? { ...next, dependencies: { ...snapshot.dependencies, semanticAnswerHistory: history } } : next;
}
