import fs from "node:fs";
import path from "node:path";

// LegalEase.com footer pages.
//
// Each file in ./html is a fully self-contained HTML document (header, footer, brand system,
// self-hosted fonts inlined as base64 — no external CDN). They are served verbatim so the
// provided legal copy (privacy, terms, legal-boundaries, data-request) is laid out exactly as
// delivered, with no React-layout wrapping. This mirrors how the live homepage is shipped as a
// single static file (public/static/legalease/index.html) rather than rendered through the app
// root layout.
//
// The route handlers that call this are static (no request-time dynamic APIs), so the read runs
// at build time and prod serves a pre-rendered static asset — no runtime filesystem access.

const htmlRoot = path.join(process.cwd(), "src/app/legalease/_footer-pages/html");

export type FooterPageSlug =
  | "privacy"
  | "terms"
  | "legal-boundaries"
  | "data-request"
  | "about"
  | "accessibility"
  | "press"
  | "security"
  | "impact";

export function serveFooterPage(slug: FooterPageSlug) {
  const html = fs.readFileSync(path.join(htmlRoot, `${slug}.html`), "utf8");
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" }
  });
}
