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

export async function resolve(specifier, context, next) {
  if (specifier === "next/server") {
    return {
      // Node 24 exposes the CommonJS export names but initializes their values as
      // undefined when a customization hook resolves the bare specifier straight
      // to next/server.js. The ESM bridge requires that same installed module and
      // publishes concrete bindings for route-level verifiers.
      url: new URL("./next-server-shim.mjs", import.meta.url).href,
      shortCircuit: true
    };
  }
  return next(specifier, context);
}
