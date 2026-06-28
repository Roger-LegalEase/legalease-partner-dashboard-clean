import fs from "node:fs";
import path from "node:path";

// LegalEase Partner Program (legaleasepartner.com) footer pages.
//
// Each file in ./html is a fully self-contained HTML document (header, footer, RCAP brand system,
// self-hosted fonts inlined as base64 — no external CDN). They are served verbatim so the provided
// legal copy (privacy, terms, disclaimer, data-request) is laid out exactly as delivered, with no
// React-layout wrapping. This mirrors how the partner landing page is shipped as a single static
// file (public/static/partners/index.html) rather than rendered through the app root layout, and
// matches the established legalease.com footer-page pattern (src/app/legalease/_footer-pages).
//
// The route handlers that call this are static (no request-time dynamic APIs), so the read runs at
// build time and prod serves a pre-rendered static asset — no runtime filesystem access.

const htmlRoot = path.join(process.cwd(), "src/app/partners/_footer-pages/html");

export type FooterPageSlug =
  | "about"
  | "accessibility"
  | "data-request"
  | "disclaimer"
  | "impact-reporting"
  | "press"
  | "privacy"
  | "security"
  | "terms";

export function serveFooterPage(slug: FooterPageSlug) {
  const html = fs.readFileSync(path.join(htmlRoot, `${slug}.html`), "utf8");
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" }
  });
}
