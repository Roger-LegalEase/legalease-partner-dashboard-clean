export function isFirstAdminSameOriginRequest(request: Request) {
  const source = request.headers.get("origin") ?? request.headers.get("referer");
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!source || !host) return false;

  try {
    const sourceUrl = new URL(source);
    const forwardedProtocol = request.headers
      .get("x-forwarded-proto")
      ?.split(",")[0]
      ?.trim();
    const expectedProtocol = forwardedProtocol
      ? `${forwardedProtocol}:`
      : new URL(request.url).protocol;
    return (
      sourceUrl.host.toLowerCase() === host.toLowerCase() &&
      sourceUrl.protocol === expectedProtocol
    );
  } catch {
    return false;
  }
}
