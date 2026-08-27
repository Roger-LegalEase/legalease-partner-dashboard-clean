/**
 * Resolve Next's `next/server` bare specifier for plain-node verifiers.
 *
 * The repo's ts-esm-loader lets a verifier import real `.ts` modules, but it cannot resolve
 * `next/server` (Next ships it as a subpath export that Node's default resolver does not pick up in
 * this context). Route handlers import `NextResponse` from it, so without this a verifier cannot
 * drive a real route handler and would have to re-implement the route — which is exactly the kind
 * of test-a-copy-of-the-code mistake that let the public-profile leak survive.
 *
 * Chain it BEFORE the ts loader:
 *   register("./lib/next-server-loader.mjs", import.meta.url);
 *   register("./lib/ts-esm-loader.mjs", import.meta.url);
 */

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function resolve(specifier, context, next) {
  if (specifier === "next/server") {
    return {
      url: pathToFileURL(path.join(root, "scripts/lib/next-server-esm-bridge.mjs")).href,
      shortCircuit: true
    };
  }
  return next(specifier, context);
}
