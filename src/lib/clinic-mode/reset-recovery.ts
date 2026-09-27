import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const RECOVERY_COOKIE = "clinic_reset_recovery";
export const RETENTION_SECONDS = 400 * 24 * 60 * 60;
const CLOSE_MS = 8 * 60 * 60 * 1000;
const RECONCILE_MS = 30 * 24 * 60 * 60 * 1000;
export type Recovery = { version: 1; owner: string; handoff: string; device: string; expires: number; reconcileUntil?: number; retainUntil?: number; empty?: true };
export const hash = (value: string) => createHash("sha256").update(value).digest("hex");
function signature(payload: string) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Reset recovery unavailable");
  return createHmac("sha256", key).update(`clinic-reset-v1:${payload}`).digest("base64url");
}
export function mintRecovery(owner: string, handoff: string, device: string, empty = false): Recovery {
  const now = Date.now();
  return { version: 1, owner, handoff, device, expires: now + CLOSE_MS, reconcileUntil: now + RECONCILE_MS,
    retainUntil: now + RETENTION_SECONDS * 1000, ...(empty ? { empty: true as const } : {}) };
}
export function encodeRecovery(proof: Recovery) {
  const payload = Buffer.from(JSON.stringify(proof)).toString("base64url");
  return `${payload}.${signature(payload)}`;
}
// Parsing a locator grants NO authority. A fresh authenticated owner and an
// exact DB match are required when signature/close authority is unusable.
export function parseRecovery(value: string): Recovery {
  const [payload, sig, extra] = value.split(".");
  if (!payload || !sig || extra) throw new Error("Invalid recovery locator");
  const proof = JSON.parse(Buffer.from(payload, "base64url").toString()) as Recovery;
  if (proof.version !== 1 || typeof proof.owner !== "string" || !/^[a-f0-9]{64}$/.test(proof.handoff)
    || !/^[a-f0-9]{64}$/.test(proof.device) || !Number.isFinite(proof.expires)) throw new Error("Invalid recovery locator");
  return proof;
}
export function authenticRecovery(value: string) {
  try {
    const [payload, sig] = value.split(".");
    const a = Buffer.from(signature(payload)), b = Buffer.from(sig);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch { return false; }
}
export function recoveryOptions(proof: Recovery) {
  // Absolute deadline; reads/retries/focus never extend cookie or authority.
  return { path: "/", httpOnly: true, sameSite: "strict" as const, secure: process.env.NODE_ENV === "production",
    expires: new Date(proof.retainUntil ?? proof.expires + RECONCILE_MS) };
}
