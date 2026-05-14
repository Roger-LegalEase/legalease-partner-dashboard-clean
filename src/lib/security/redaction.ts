import type { Prisma } from "@prisma/client";

const sensitiveKeyFragments = [
  "ssn",
  "social_security",
  "date_of_birth",
  "dob",
  "driver_license",
  "license_number",
  "background_report",
  "raw_report",
  "report_payload",
  "authorization",
  "api_key",
  "secret",
  "token",
  "password"
];

const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const ssnPattern = /\b\d{3}-?\d{2}-?\d{4}\b/g;
const phonePattern = /(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]\d{3}[-.\s]\d{4}\b/g;
const dobLikePattern = /\b(?:19|20)\d{2}[-/](?:0[1-9]|1[0-2])[-/](?:0[1-9]|[12]\d|3[01])\b/g;

export function redactForStorage(value: unknown): Prisma.InputJsonValue {
  return redactValue(value) as Prisma.InputJsonValue;
}

export function redactForLog(value: unknown): unknown {
  return redactValue(value);
}

export function minimizeTranscriptContent(value: string): string {
  return value
    .replace(emailPattern, "[REDACTED_EMAIL]")
    .replace(ssnPattern, "[REDACTED_SSN]")
    .replace(phonePattern, "[REDACTED_PHONE]")
    .replace(dobLikePattern, "[REDACTED_DATE]");
}

function redactValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value
      .replace(emailPattern, "[REDACTED_EMAIL]")
      .replace(ssnPattern, "[REDACTED_SSN]")
      .replace(phonePattern, "[REDACTED_PHONE]")
      .replace(dobLikePattern, "[REDACTED_DATE]");
  }

  if (Array.isArray(value)) {
    return value.map(redactValue);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      isSensitiveKey(key) ? "[REDACTED]" : redactValue(item)
    ])
  );
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "_");
  return sensitiveKeyFragments.some((fragment) => normalized.includes(fragment));
}
