/** Route Promotion Studio approval dependencies to deterministic server-side test doubles. */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const doublesUrl = pathToFileURL(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "content-social-approval-test-doubles.mjs")
).href;

const mocked = new Set([
  "@/lib/content/auth",
  "@/lib/content/command-center",
  "@/lib/content/promotion-generation",
  "@/lib/content/promotion-package",
  "@/lib/observability/logger",
  "@/lib/supabase/server"
]);

export async function resolve(specifier, context, next) {
  if (mocked.has(specifier)) return { url: doublesUrl, shortCircuit: true };
  return next(specifier, context);
}
