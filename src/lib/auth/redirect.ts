export const defaultPartnerAuthRedirect = "/partner/dashboard";

const REDIRECT_VALIDATION_ORIGIN = "https://local-navigation.invalid";
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/u;
const MAX_DECODE_PASSES = 8;

export function safeAppRedirectPath(value: string | null | undefined, fallback = defaultPartnerAuthRedirect) {
  if (!value) return fallback;

  let normalized = value;
  for (let pass = 0; pass < MAX_DECODE_PASSES; pass += 1) {
    if (!hasSafeLocalShape(normalized)) return fallback;

    let decoded: string;
    try {
      decoded = decodeURIComponent(normalized);
    } catch {
      return fallback;
    }

    if (decoded === normalized) break;
    normalized = decoded;
    if (pass === MAX_DECODE_PASSES - 1) return fallback;
  }

  try {
    const parsed = new URL(value, REDIRECT_VALIDATION_ORIGIN);
    if (
      parsed.origin !== REDIRECT_VALIDATION_ORIGIN ||
      parsed.username ||
      parsed.password
    ) {
      return fallback;
    }
  } catch {
    return fallback;
  }

  return value;
}

function hasSafeLocalShape(value: string) {
  return (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !CONTROL_CHARACTER.test(value) &&
    !/^[a-z][a-z0-9+.-]*:/iu.test(value)
  );
}
