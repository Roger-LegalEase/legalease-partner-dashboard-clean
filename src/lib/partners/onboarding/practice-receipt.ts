import "server-only";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { isDisposableLaunchEnvironment } from "./synthetic-launch-security";

const directory = join(tmpdir(), "legalease-launch-practice");
export async function recordPracticeProgram(partnerSlug: string, receipt: Record<string, unknown>) {
  if (!isDisposableLaunchEnvironment() || !/^[a-z0-9-]+$/.test(partnerSlug)) throw new Error("Practice is unavailable.");
  await mkdir(directory, {recursive: true, mode: 0o700});
  await writeFile(join(directory, `program-${partnerSlug}.json`), JSON.stringify(receipt), {mode: 0o600});
}
/** Local owner verification is a simulation capability, never a financial entitlement. */
export async function isVerifiedPracticeProgram(partnerSlug: string, snapshotHash?: string) {
  if (!isDisposableLaunchEnvironment() || !/^[a-z0-9-]+$/.test(partnerSlug)) return false;
  try {
    const receipt = JSON.parse(await readFile(join(directory, `program-${partnerSlug}.json`), "utf8"));
    return (!snapshotHash || receipt.snapshotHash === snapshotHash) && receipt.mode === "simulation" && receipt.partnerSlug === partnerSlug && receipt.activated === false &&
      receipt.paymentRecorded === false && receipt.consentRecorded === false && receipt.publicStatus === 404 &&
      Date.now() >= Date.parse(receipt.verifiedAt) && Date.now() - Date.parse(receipt.verifiedAt) < 24 * 60 * 60 * 1000;
  } catch { return false; }
}

export async function canUseClinicPractice(partnerSlug: string, participant: {isVerified: boolean; email?: string}) {
  return participant.isVerified && /@[^@]+\.test$/i.test(participant.email ?? "") && await isVerifiedPracticeProgram(partnerSlug);
}
