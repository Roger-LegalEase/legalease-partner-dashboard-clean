import { serveFooterPage } from "../_footer-pages/serve";

// Serves the self-contained /partners/about page verbatim. Static (build-time) render.
export const dynamic = "force-static";

export function GET() {
  return serveFooterPage("about");
}
