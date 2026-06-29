// Minimal Node ESM customization hooks so verification scripts can import the real
// TypeScript engine modules (src/lib/rcap-engine/*.ts) directly, instead of re-implementing
// engine logic in JS. Resolves the "@/..." path alias and the empty "server-only" shim,
// and transpiles .ts on the fly with the already-installed `typescript` dependency.
//
// Register from a test script with:
//   import { register } from "node:module";
//   register("./lib/ts-esm-loader.mjs", import.meta.url);

import { pathToFileURL, fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    const target = path.join(root, "src", specifier.slice(2)) + ".ts";
    return { url: pathToFileURL(target).href, shortCircuit: true };
  }
  if (specifier === "server-only") {
    return { url: pathToFileURL(path.join(root, "scripts/lib/server-only-shim.mjs")).href, shortCircuit: true };
  }
  return next(specifier, context);
}

export async function load(url, context, next) {
  if (url.endsWith(".ts")) {
    const source = readFileSync(fileURLToPath(url), "utf8");
    const out = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      fileName: fileURLToPath(url)
    });
    return { format: "module", source: out.outputText, shortCircuit: true };
  }
  return next(url, context);
}
