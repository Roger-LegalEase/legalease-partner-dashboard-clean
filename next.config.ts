import type { NextConfig } from "next";
import { createRuntimeAuthorityTracingIncludes } from "./scripts/rcap-runtime-authority-consumers.mjs";

const nextConfig: NextConfig = {
  experimental: { webpackMemoryOptimizations: true },
  // Application build dependency: discover value-import consumers and include
  // the structural authority trees that their dynamic readers require.
  outputFileTracingIncludes: createRuntimeAuthorityTracingIncludes(),
};
export default nextConfig;
