import assert from "node:assert/strict";
import { register } from "node:module";

register("../lib/ts-esm-loader.mjs", import.meta.url);

const { safeAppRedirectPath } = await import("../../src/lib/auth/redirect.ts");

const applicationOrigin = "https://app.legalease.test";
const fallback = "/sign-in";

const malicious = [
  "//evil.example",
  "/\\evil.example",
  "\\\\evil.example",
  "https://evil.example",
  "http://evil.example",
  "javascript:alert(1)",
  "/%5Cevil.example",
  "/%5c%5cevil.example",
  "/%2Fevil.example",
  "/%2f%2fevil.example",
  "/%5C%5Cevil.example",
  "/%09/evil.example",
  "/%0d%0aLocation:%20https://evil.example",
  "/%5c%2FeViL.example",
  "/%255CEvil.example",
  "/%252f%252fEVIL.example",
  "/%250d%250aLocation:%2520https://evil.example",
  "/%25255cEvil.example",
  "/%",
  "/%E0%A4%A"
];

for (const value of malicious) {
  assert.equal(safeAppRedirectPath(value, fallback), fallback, `unsafe redirect survived: ${value}`);
}

const safe = [
  "/internal/partners/provisioning",
  "/internal/partners/provisioning/example",
  "/internal/content/articles/123",
  "/internal/partners/provisioning?tab=access",
  "/internal/partners/provisioning#users"
];

for (const value of safe) {
  const accepted = safeAppRedirectPath(value, fallback);
  assert.equal(accepted, value, `legitimate local redirect was rejected: ${value}`);
  const parsed = new URL(accepted, applicationOrigin);
  assert.equal(parsed.origin, applicationOrigin, `redirect escaped the application origin: ${value}`);
}

console.log(`Auth redirect security passed: ${malicious.length} malicious values denied; ${safe.length} local deep links preserved.`);
