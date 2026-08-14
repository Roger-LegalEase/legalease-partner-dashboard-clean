/**
 * Route only the Supabase client and the session reader to test doubles.
 *
 * Deliberately short. Every module NOT listed here — the webhook handler, the
 * reconciliation logic, the payment writer, the render-request builder, the
 * delivery control, the route handlers, the Stripe SDK — is loaded for real, so
 * the tests exercise the shipped code rather than a restatement of it.
 */

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const doublesUrl = pathToFileURL(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "consumer-payment-test-doubles.mjs")
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
