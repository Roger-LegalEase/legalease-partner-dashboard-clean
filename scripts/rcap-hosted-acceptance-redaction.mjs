/**
 * Redact every exact secret currently held by a hosted-acceptance process,
 * followed by conservative shape-based redaction for values a child process
 * may echo in decorated or reconstructed output.
 */
export function redactHostedAcceptanceOutput(text, heldSecrets = []) {
  let output = String(text ?? "");
  for (const value of heldSecrets) {
    if (typeof value !== "string" || value.length === 0) continue;
    output = output.split(value).join("***REDACTED***");
  }
  return output
    .replace(/eyJ[A-Za-z0-9_.-]{20,}/g, "***REDACTED***")
    .replace(/sk_(?:test|live)_[A-Za-z0-9_-]+/g, "***REDACTED***")
    .replace(/whsec_[A-Za-z0-9_-]+/g, "***REDACTED***");
}
