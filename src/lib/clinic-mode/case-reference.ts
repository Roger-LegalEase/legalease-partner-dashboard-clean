import "server-only";
import { createHash } from "node:crypto";

/** Stable event-local display label; confers no participant or matter access. */
export function clinicCaseReference(eventId: string, caseId: string) {
  const digest = createHash("sha256").update(`clinic-case:${eventId}:${caseId}`).digest("hex").slice(0, 12).toUpperCase();
  return `C-${digest.match(/.{4}/g)!.join("-")}`;
}
