import "server-only";
import { createHash } from "node:crypto";
import type { InternalOnboardingContext } from "./auth-context";
import { getInternalLaunchReadiness } from "./launch-readiness-service";
import { Phase1OnboardingError } from "./errors";

/** A reviewed program is still held until a separately authorized release can
 * persist an operation receipt, publish fail-closed and verify public readback.
 * This projection never converts a commercial override into payment evidence.
 */
export async function getLaunchPreflight(context: InternalOnboardingContext) {
  if (context.role !== "internal_admin") throw new Phase1OnboardingError("forbidden", "An authorized program operator is required.");
  const view = await getInternalLaunchReadiness(context);
  const reviewedInputs = {
    partnerSlug: context.partnerSlug,
    workspaceVersion: view.board.workspaceVersion,
    program: view.program,
    checks: view.readiness.checks.map(check => ({ key: check.key, status: check.status, evidence: check.evidenceReference, checkedAt: check.checkedAt })),
    versions: view.board.entries.map(entry => ({ type: entry.artifactType, id: entry.currentVersion?.id, hash: entry.currentVersion?.snapshotHash, freshness: entry.sourceFreshness, approval: entry.currentVersion?.approvalStatus, partnerApproval: entry.currentVersion?.partnerReviewStatus }))
  };
  return {
    partnerSlug: context.partnerSlug,
    operatorAuthUserId: context.authUserId,
    asOf: new Date().toISOString(),
    snapshotHash: createHash("sha256").update(JSON.stringify(reviewedInputs)).digest("hex"),
    readiness: view.readiness,
    program: view.program,
    operationStatus: "held" as const,
    canLaunch: false as const,
    heldReason: "Launch requires an approved commercial/publication authority and durable operation receipts with fail-closed public verification. No launch write is enabled in this candidate."
  };
}
