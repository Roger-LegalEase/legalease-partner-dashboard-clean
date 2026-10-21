/**
 * Node ESM hooks that let a security verifier import the real Clinic service
 * source (`src/lib/clinic-mode/**`) while the four external edges it depends on
 * -- authentication, cookies, the Supabase admin client and the partner session
 * -- resolve to harness stubs. Everything else, including the guards under
 * test, is the production TypeScript compiled on the fly.
 */
import { pathToFileURL, fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const here = path.dirname(fileURLToPath(import.meta.url));
const CANDIDATE_EXTENSIONS = [".ts", ".tsx", ".json"];

const STUBS = new Map([
  ["server-only", "server-only.mjs"],
  ["next/headers", "stub-next-headers.mjs"],
  ["@/lib/supabase/auth-server", "stub-auth-server.mjs"],
  ["@/lib/supabase/server", "stub-supabase-server.mjs"],
  ["@/lib/partners/session-partner", "stub-session-partner.mjs"]
]);

function resolveAliasPath(base) {
  if (existsSync(base)) return base;
  for (const extension of CANDIDATE_EXTENSIONS) {
    if (existsSync(base + extension)) return base + extension;
  }
  return base + ".ts";
}

export async function resolve(specifier, context, next) {
  const stub = STUBS.get(specifier);
  if (stub) return { url: pathToFileURL(path.join(here, stub)).href, shortCircuit: true };
  if (specifier.startsWith("@/")) {
    return { url: pathToFileURL(resolveAliasPath(path.join(root, "src", specifier.slice(2)))).href, shortCircuit: true };
  }
  return next(specifier, context);
}

export async function load(url, context, next) {
  if (url.endsWith(".ts") || url.endsWith(".tsx")) {
    const fileName = fileURLToPath(url);
    const out = ts.transpileModule(readFileSync(fileName, "utf8"), {
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
