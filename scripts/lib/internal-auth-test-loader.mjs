import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const doublesUrl = pathToFileURL(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "internal-auth-test-doubles.mjs")
).href;

const mockedSpecifiers = new Set([
  "@/lib/supabase/auth-server",
  "@/lib/observability/logger",
  "next/navigation"
]);

export async function resolve(specifier, context, next) {
  if (mockedSpecifiers.has(specifier)) {
    return { url: doublesUrl, shortCircuit: true };
  }
  return next(specifier, context);
}
