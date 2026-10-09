import { isVerifiedPracticeProgram, recordPracticeProgram } from "@/lib/partners/onboarding/practice-receipt";
import type { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { requireInternalOnboardingContext } from "@/lib/partners/onboarding/auth-context";
import { loadInternalArtifactBoardWithSource } from "@/lib/partners/onboarding/artifact-service";
import { isDisposableLaunchEnvironment } from "@/lib/partners/onboarding/synthetic-launch-security";
import { Phase1OnboardingError } from "@/lib/partners/onboarding/errors";
import { onboardingHttpError, onboardingJson } from "@/lib/partners/onboarding/http";
import { assertSameOrigin, readBoundedJson, requireRequestId } from "@/lib/partners/onboarding/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function inspect(partnerSlug: string) {
  if (!isDisposableLaunchEnvironment()) throw new Phase1OnboardingError("feature_disabled", "Practice launch is available only in the isolated local test environment.");
  const context = await requireInternalOnboardingContext(partnerSlug);
  const { board, source } = await loadInternalArtifactBoardWithSource(context);
  const entries = board.entries.filter(entry => entry.artifactType !== "partner_launch_kit");
  const blockers = entries.filter(entry => entry.sourceFreshness !== "current" ||
    entry.currentVersion?.generationStatus !== "succeeded" || entry.currentVersion?.approvalStatus !== "approved")
    .map(entry => `Review the current ${entry.label}.`);
  const snapshotHash = createHash("sha256").update(JSON.stringify({
    partnerSlug, workspaceVersion: source.workspace.aggregateVersion,
    versions: entries.map(entry => [entry.artifactType, entry.currentVersion?.id, entry.currentVersion?.snapshotHash, entry.sourceFreshness, entry.currentVersion?.approvalStatus])
  })).digest("hex");
  return { context, snapshotHash, blockers };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ partnerSlug: string }> }) {
  try {
    const { partnerSlug } = await params;
    const { snapshotHash, blockers } = await inspect(partnerSlug);
    const verified = blockers.length === 0 && await isVerifiedPracticeProgram(partnerSlug, snapshotHash);
    return onboardingJson({ success: true, snapshotHash, blockers, verified });
  } catch (error) { return onboardingHttpError(error); }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ partnerSlug: string }> }) {
  try {
    assertSameOrigin(request);
    const { partnerSlug } = await params;
    const current = await inspect(partnerSlug);
    const body = await readBoundedJson(request);
    const requestId = requireRequestId(body.requestId);
    if (body.confirmed !== true || body.snapshotHash !== current.snapshotHash)
      throw new Phase1OnboardingError("revision_conflict", "Review the current practice package before simulating launch.");
    if (current.blockers.length) throw new Phase1OnboardingError("invalid_transition", current.blockers[0]);
    const publicResponse = await fetch(new URL(`/p/${encodeURIComponent(partnerSlug)}`, process.env.RCAP_SYNTHETIC_PUBLIC_ORIGIN), {
      cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(15000)
    });
    if (publicResponse.status !== 404) throw new Phase1OnboardingError("invalid_transition", "This program is publicly accessible. Use an unpublished practice partner.");
    // A practice receipt is deliberately outside contractual/activation tables.
    const receipt = { mode: "simulation", requestId, partnerSlug, snapshotHash: current.snapshotHash,
      actor: current.context.authUserId, verifiedAt: new Date().toISOString(), publicStatus: 404,
      activated: false, paymentRecorded: false, consentRecorded: false };
    const directory = join(tmpdir(), "legalease-launch-practice");
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await writeFile(join(directory, `${current.context.authUserId}-${requestId}.json`), JSON.stringify(receipt), { mode: 0o600 });
    await recordPracticeProgram(partnerSlug, receipt);
    return onboardingJson({ success: true, receipt });
  } catch (error) { return onboardingHttpError(error); }
}
