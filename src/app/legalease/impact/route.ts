import { serveFooterPage } from "../_footer-pages/serve";

// Serves the self-contained /legalease/impact page verbatim. Static (build-time) render.
export const dynamic = "force-static";

export function GET() {
  return serveFooterPage("impact");
}
