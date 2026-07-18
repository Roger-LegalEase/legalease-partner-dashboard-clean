/** Route content-auth dependencies to isolated test doubles for the CMS access verifier. */

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const doublesUrl = pathToFileURL(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "content-auth-test-doubles.mjs")
).href;

const mockedSpecifiers = new Set([
  "@/lib/supabase/auth-server",
  "@/lib/supabase/server",
  "@/lib/partners/session-partner",
  "next/navigation"
]);

export async function resolve(specifier, context, next) {
  if (mockedSpecifiers.has(specifier)) {
    return { url: doublesUrl, shortCircuit: true };
  }

  return next(specifier, context);
}
