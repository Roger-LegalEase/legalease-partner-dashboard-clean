// Minimal Node ESM customization hooks so verification scripts can import the real
// TypeScript source modules (engine .ts files and React .tsx components) directly, instead of
// re-implementing their logic in JS. Resolves the "@/..." path alias and the empty "server-only"
// shim, and transpiles .ts/.tsx on the fly with the already-installed `typescript` dependency.
//
// Register from a test script with:
//   import { register } from "node:module";
//   register("./lib/ts-esm-loader.mjs", import.meta.url);

import { pathToFileURL, fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const CANDIDATE_EXTENSIONS = [".ts", ".tsx"];

function resolveAliasPath(base) {
  for (const ext of CANDIDATE_EXTENSIONS) {
    if (existsSync(base + ext)) return base + ext;
  }
  // Fall back to .ts so the error message points at a concrete file.
  return base + ".ts";
}

export async function resolve(specifier, context, next) {
  if ((specifier === "next/headers" || specifier === "next/navigation") && existsSync(path.join(root, "node_modules", `${specifier}.js`))) {
    return { url: pathToFileURL(path.join(root, "node_modules", `${specifier}.js`)).href, shortCircuit: true };
  }
  if (specifier.startsWith("@/")) {
    const target = resolveAliasPath(path.join(root, "src", specifier.slice(2)));
    return { url: pathToFileURL(target).href, shortCircuit: true };
  }
  if (specifier === "server-only") {
    return { url: pathToFileURL(path.join(root, "scripts/lib/server-only-shim.mjs")).href, shortCircuit: true };
  }
  return next(specifier, context);
}

export async function load(url, context, next) {
  if (url.endsWith(".ts") || url.endsWith(".tsx")) {
    const fileName = fileURLToPath(url);
    const source = readFileSync(fileName, "utf8");
    const out = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        jsxImportSource: "react"
      },
      fileName
    });
    return { format: "module", source: out.outputText, shortCircuit: true };
  }
  return next(url, context);
}
