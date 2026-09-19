// The repository's TypeScript ESM loader, with one specifier redirected:
// `@/lib/supabase/server` resolves to the counting stub beside this file.
//
// Everything else — the "@/" alias, next/server, server-only, extensionless
// relative TypeScript imports — is delegated to the real loader unchanged, so
// the code under test is the production code. No production source is modified.
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import * as base from "../lib/ts-esm-loader.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const STUB = pathToFileURL(path.join(here, "supabase-counting-stub.mjs")).href;

export async function resolve(specifier, context, next) {
  if (specifier === "@/lib/supabase/server") return { url: STUB, shortCircuit: true };
  return base.resolve(specifier, context, next);
}

export const load = base.load;
