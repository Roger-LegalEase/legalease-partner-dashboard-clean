import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// A short-lived, owner-bound source receipt. Its only destination is the
// existing campaign attribution field, never sponsor/event authority fields.
function sign(value: string) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Acquisition receipt is unavailable.");
  return createHmac("sha256", key).update(`clinic-acquisition-v1:${value}`).digest("base64url");
}
export function clinicConsumerContinuation(userId: string, jurisdiction: string, source: string) {
  if (!/^(clinic|partner):[a-z0-9]+(?:-[a-z0-9]+)*$/.test(source)) throw new Error("Invalid acquisition source.");
  const payload = Buffer.from(JSON.stringify({ source, owner: sign(userId), until: Date.now() + 8 * 60 * 60 * 1000 })).toString("base64url");
  return `/expungement-ai/screening/${jurisdiction.toLowerCase()}?acquisition=${encodeURIComponent(`${payload}.${sign(payload)}`)}`;
}
export function readClinicAcquisition(receipt: unknown, userId: string): string | null {
  try {
    if (typeof receipt !== "string" || receipt.length > 1500) return null;
    const [payload, signature, extra] = receipt.split(".");
    if (!payload || !signature || extra) return null;
    const a = Buffer.from(sign(payload)), b = Buffer.from(signature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const value = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (value.owner !== sign(userId) || !Number.isFinite(value.until) || value.until <= Date.now()
      || !/^(clinic|partner):[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.source)) return null;
    return value.source;
  } catch { return null; }
}
