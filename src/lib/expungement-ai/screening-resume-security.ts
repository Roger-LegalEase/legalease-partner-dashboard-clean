import "server-only";

import crypto from "node:crypto";

export const resumeTokenTtlMs = 7 * 24 * 60 * 60 * 1000;
export const previousTokenGraceMs = 5 * 60 * 1000;
export const resumeConfirmLockoutMs = 30 * 60 * 1000;
export const maxResumeConfirmFailures = 5;
export const resumeConsentTextVersion = "screening-resume-email-v1";
export const genericResumeFailureMessage = "We couldn't resume that session. Please check the link and email address, or request a new link.";

export function generateResumeToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashResumeToken(rawToken: string) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function timingSafeTokenHashEqual(a: string, b: string) {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function normalizeResumeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidResumeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeResumeEmail(value));
}

export function resumeExpiry(now = Date.now()) {
  return new Date(now + resumeTokenTtlMs).toISOString();
}

export function previousTokenGraceExpiry(now = Date.now()) {
  return new Date(now + previousTokenGraceMs).toISOString();
}

export function lockoutUntil(now = Date.now()) {
  return new Date(now + resumeConfirmLockoutMs).toISOString();
}

export function isAfterNow(value: string | null | undefined, now = Date.now()) {
  if (!value) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && parsed > now;
}

export function genericResumeFailureResponse() {
  return {
    ok: false as const,
    message: genericResumeFailureMessage,
    session: null,
    resumeUrl: null
  };
}
