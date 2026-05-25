import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleCache = new Map();

const requiredActions = [
  "mark_qualified",
  "mark_payment_complete",
  "move_to_provisioning",
  "activate_partner",
  "pause_partner",
  "mark_asset_ready",
  "mark_asset_active",
  "add_internal_note"
];

try {
  const {
    supportedPartnerAdminActions,
    isSupportedPartnerAdminAction
  } = loadTsModule(path.join(rootDir, "src/lib/partners/admin-actions.ts"));

  for (const action of requiredActions) {
    assert(supportedPartnerAdminActions.includes(action), `Missing supported admin action: ${action}`);
    assert(isSupportedPartnerAdminAction(action), `Action validator rejected required action: ${action}`);
  }

  assert(!isSupportedPartnerAdminAction("send_real_email"), "Action validator accepted unsupported action.");
  console.log(`Partner admin action registry check passed for ${requiredActions.length} mock actions.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Partner admin action registry check failed.");
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function loadTsModule(filename) {
  const resolved = path.resolve(filename);
  const cached = moduleCache.get(resolved);
  if (cached) {
    return cached.exports;
  }

  const source = fs.readFileSync(resolved, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;

  const mod = new Module(resolved);
  mod.filename = resolved;
  mod.paths = Module._nodeModulePaths(path.dirname(resolved));
  moduleCache.set(resolved, mod);
  mod.require = (request) => {
    const nextFile = resolveTsRequest(request, path.dirname(resolved));
    return nextFile ? loadTsModule(nextFile) : require(request);
  };
  mod._compile(transpiled, resolved);
  return mod.exports;
}

function resolveTsRequest(request, basedir) {
  if (request.startsWith("@/")) {
    return path.join(rootDir, "src", `${request.slice(2)}.ts`);
  }

  if (request.startsWith(".")) {
    const candidate = path.resolve(basedir, request);
    for (const extension of [".ts", ".tsx", ".js"]) {
      if (fs.existsSync(`${candidate}${extension}`)) {
        return `${candidate}${extension}`;
      }
    }
  }

  return null;
}
