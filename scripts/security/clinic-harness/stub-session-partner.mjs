// Re-exports the real SessionPartnerError so `instanceof` narrowing in the
// module under test is exercised against the production class, and overrides
// only the resolver so a scenario can pose as any tenant or role.
import { pathToFileURL } from "node:url";
import path from "node:path";
import { currentSessionPartner } from "./control.mjs";

const real = await import(
  pathToFileURL(path.join(process.cwd(), "src/lib/partners/session-partner.ts")).href
);

export const SessionPartnerError = real.SessionPartnerError;

export async function resolveSessionPartner() {
  const partner = currentSessionPartner();
  if (!partner) throw new SessionPartnerError("unauthenticated", "No partner session.");
  if (partner instanceof Error) throw partner;
  return partner;
}
