import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { webpackMemoryOptimizations: true },
  outputFileTracingIncludes: {
    "/api/expungement-ai/packet/render": [
      "./data/record-clearing/legal-decisions/2026-09-20-ms-nonconv-paid-consumer-successor-v3.json",
      "./data/record-clearing/legal-decisions/2026-09-20-ms-nonconv-paid-consumer-successor-v2.json",
      "./data/record-clearing/legal-decisions/2026-09-14-ms-nonconv-paid-consumer-successor.json",
      "./data/record-clearing/packet-specifications/MS-nonconviction-expungement-99-19-71-4.v1.json",
      "./data/record-clearing/supplemental-guides/MS-nonconviction-expungement-99-19-71-4.v1.json",
      "./data/rcap-ledger/grade-a/ms-nonconviction-successor-review.evidence.json",
      "./data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.artifacts.json",
      "./data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.participant-delivery.raster-review.json",
      "./data/rcap-ledger/grade-a/artifacts/ms-nonconviction-successor-review-full-en.pdf",
      "./data/rcap-ledger/grade-a/artifacts/ms-nonconviction-successor-review-full-es.pdf",
      "./data/rcap-ledger/grade-a/artifacts/ms-nonconviction-successor-review-court-only.pdf",
    ],
  },
};

export default nextConfig;
