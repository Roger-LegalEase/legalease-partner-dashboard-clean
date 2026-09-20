/**
 * Route only the Supabase client and the session reader to test doubles.
 *
 * Everything else — the route handlers, the deletion pipeline, the export
 * builder, the proof mint and verify, the rate limiter, the same-origin check —
 * is loaded for real.
 */

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const doublesUrl = pathToFileURL(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "participant-privacy-test-doubles.mjs")
).href;

const mockedSpecifiers = new Set([
  "@/lib/supabase/server",
  "@/lib/supabase/auth-server",
  "@/lib/rcap/briefcase/auth"
]);

export async function resolve(specifier, context, next) {
  if (mockedSpecifiers.has(specifier)) {
    return { url: doublesUrl, shortCircuit: true };
  }
  return next(specifier, context);
}
