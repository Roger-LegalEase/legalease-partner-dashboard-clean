export const defaultPartnerAuthRedirect = "/partner/dashboard";

export function safeAppRedirectPath(value: string | null | undefined, fallback = defaultPartnerAuthRedirect) {
  if (value && value.startsWith("/") && !value.startsWith("//") && !hasUrlScheme(value)) {
    return value;
  }

  return fallback;
}

function hasUrlScheme(value: string) {
  return /^[a-z][a-z0-9+.-]*:/i.test(value);
}
