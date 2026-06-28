import { serveFooterPage } from "../_footer-pages/serve";

// Serves the self-contained /legalease/accessibility page verbatim. Static (build-time) render.
export const dynamic = "force-static";

export function GET() {
  return serveFooterPage("accessibility");
}
