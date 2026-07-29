/** Route content-create dependencies to deterministic test doubles. */

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const doublesUrl = pathToFileURL(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "content-create-test-doubles.mjs")
).href;

const mockedSpecifiers = new Set([
  "@/lib/content/auth",
  "@/lib/content/workflow",
  "@/lib/observability/logger",
  "@/lib/supabase/server"
]);

export async function resolve(specifier, context, next) {
  if (mockedSpecifiers.has(specifier)) {
    return { url: doublesUrl, shortCircuit: true };
  }

  return next(specifier, context);
}
