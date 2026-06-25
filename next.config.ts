import type { NextConfig } from "next";

// The consumer Expungement.ai funnel lives in the app under /expungement-ai/*.
// On this host we serve that subtree from the root so customers see clean URLs
// (e.g. expungement.ai/pay, expungement.ai/packet-ready) and so the Stripe
// success_url / cancel_url paths resolve to real pages.
const CONSUMER_HOST = "expungement.ai";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      // beforeFiles runs *before* filesystem routes, so it overrides the root
      // partner/umbrella pages when the request arrives on the consumer host.
      beforeFiles: [
        // expungement.ai/  ->  consumer landing page
        {
          source: "/",
          has: [{ type: "host", value: CONSUMER_HOST }],
          destination: "/expungement-ai",
        },
        // expungement.ai/<anything>  ->  /expungement-ai/<anything>, EXCEPT:
        //   api/*            API routes (incl. /api/stripe/webhook) must resolve natively
        //   _next/*          framework assets
        //   expungement-ai/* already prefixed — avoid /expungement-ai/expungement-ai/* (404)
        //   static files     favicon / robots / sitemap
        {
          source:
            "/:path((?!api/|_next/|expungement-ai/|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)",
          has: [{ type: "host", value: CONSUMER_HOST }],
          destination: "/expungement-ai/:path",
        },
      ],
    };
  },
};

export default nextConfig;
