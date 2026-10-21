import { existsSync, readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = process.cwd();
const extensions = [".ts", ".tsx", ".json"];

function concretePath(base) {
  if (existsSync(base)) return base;
  for (const extension of extensions) {
    if (existsSync(`${base}${extension}`)) return `${base}${extension}`;
  }
  return base;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return {
      url: pathToFileURL(path.join(root, "scripts/lib/server-only-shim.mjs")).href,
      shortCircuit: true
    };
  }
  if (specifier.startsWith("@/")) {
    return {
      url: pathToFileURL(concretePath(path.join(root, "src", specifier.slice(2)))).href,
      shortCircuit: true
    };
  }
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    context.parentURL &&
    !path.extname(specifier)
  ) {
    const base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    const concrete = concretePath(base);
    if (concrete !== base || existsSync(concrete)) {
      return { url: pathToFileURL(concrete).href, shortCircuit: true };
    }
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith(".json")) {
    return {
      format: "module",
      source: `export default ${readFileSync(fileURLToPath(url), "utf8")};`,
      shortCircuit: true
    };
  }
  if (url.endsWith(".ts") || url.endsWith(".tsx")) {
    return {
      format: "module",
      source: stripTypeScriptTypes(readFileSync(fileURLToPath(url), "utf8"), {
        mode: "transform"
      }),
      shortCircuit: true
    };
  }
  return nextLoad(url, context);
}
