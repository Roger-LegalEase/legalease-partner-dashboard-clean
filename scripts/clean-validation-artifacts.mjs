import { rmSync } from "node:fs";

for (const path of [
  "tsconfig.tsbuildinfo",
  "tsconfig 2.tsbuildinfo",
  "vitest.config 2.ts",
  "scripts/staging-smoke-check 2.mjs",
  "tests/expungement-readiness.test 2.ts",
  "prisma/schema 2.prisma",
  ".next/cache",
  "node_modules/.vite",
  "node_modules/.cache/vitest"
]) {
  rmSync(path, { force: true, recursive: true });
}
