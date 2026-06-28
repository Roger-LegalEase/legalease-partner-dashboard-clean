import fs from "node:fs";
import path from "node:path";

// LegalEase Partner Program landing page (legaleasepartner.com -> /partners via proxy.ts).
//
// The RCAP redesign is shipped as a single self-contained static HTML file
// (public/static/partners/index.html: RCAP brand, self-hosted fonts inlined, no external CDN),
// mirroring how legalease.com ships its homepage. Served verbatim here so it renders exactly as
// delivered with no app-root-layout wrapping. Static (build-time) render.
export const dynamic = "force-static";

export function GET() {
  const html = fs.readFileSync(
    path.join(process.cwd(), "public/static/partners/index.html"),
    "utf8"
  );
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" }
  });
}
