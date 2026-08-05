import crypto from "node:crypto";

/**
 * Canonical factory JSON orders object keys by ECMAScript UTF-16 code-unit
 * comparison: `left < right`, never localeCompare. Arrays retain their
 * existing semantic order. JSON primitives and undefined retain the native
 * JSON.stringify treatment (undefined object members are omitted; undefined
 * array entries become null).
 */
export function canonicalizeFactoryValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalizeFactoryValue(entry));
  }
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort(compareUtf16CodeUnits)
      .map((key) => [key, canonicalizeFactoryValue(value[key])])
  );
}

export function canonicalStringify(value, space = 2) {
  return JSON.stringify(canonicalizeFactoryValue(value), null, space);
}

export function canonicalSha256(value) {
  return crypto
    .createHash("sha256")
    .update(canonicalStringify(value, 0))
    .digest("hex");
}

function compareUtf16CodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
