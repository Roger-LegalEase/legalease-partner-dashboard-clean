// The MVLP co-branded page follows the We Must Vote pattern: on the production
// partner host the proxy serves the generated static page; every other host
// (Vercel previews, localhost) renders the dynamic partner template so the
// page can be exercised without the production domain. Exact-path only, so
// the registration, clinic list and continue routes under /p/mvlp/* stay on
// the application.
export const MVLP_PARTNER_SLUG = "mvlp";
export const MVLP_STATIC_LANDING_PATH = "/mvlp-landing.html";

export function shouldUseStaticMvlpLanding(pathname: string, hostHeader: string | null) {
  if (pathname !== `/p/${MVLP_PARTNER_SLUG}`) return false;

  const host = (hostHeader ?? "").split(":")[0]?.toLowerCase() ?? "";
  return host === "legaleasepartner.com" || host === "www.legaleasepartner.com";
}
