#!/usr/bin/env node
/*
 * A GUARD THAT NOTHING INVOKES IS NOT A GUARD.
 *
 * Repair lanes in this fleet write assertions into a builder's selfTest() and
 * credit them as protecting the repair. Most builders reach selfTest() only
 * through `process.argv.includes("--self-test")`, and nothing runs that: the
 * only --self-test in .github/ or the integration chain belongs to
 * summarize-readiness-steps.mjs, which is not a builder.
 *
 * VF61 proved the consequence rather than inferring it. It reintroduced the
 * exact defect FIX166 had just repaired in il-seal-3yr-set -- the hardcoded
 * literal zeros in addedGlyphsReadFromOutputBytes and
 * nonWhitespaceGlyphsOutsideMeasuredWriteBoxes -- and a plain
 * `node scripts/build-census-v1-il-seal-3yr-set.mjs` exited 0 and wrote the
 * literals back. The same tree with --self-test exited 1. Three of FIX166's
 * five guards were dormant. FIX163 hit the same shape from the other side: its
 * first probe left an injected internal-vocabulary sentence in the DELIVERED
 * guide, because the guard was in selfTest() and the build had no reason to
 * refuse it.
 *
 * 676 assertions sit behind that flag across 14 builders. This runs them.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = process.env.RCAP_SELF_TEST_ROOT
  ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCRIPTS = path.join(ROOT, "scripts");

/* A builder is in scope when it declares a selfTest containing assertions and
 * reaches it only through the flag. Reading the source rather than a list means
 * a builder that grows one is covered the day it does. */
export function buildersWithAFlagGatedSelfTest(scriptsDir) {
  const out = [];
  for (const name of fs.readdirSync(scriptsDir).sort()) {
    if (!/^build-census-v1-.*\.mjs$/.test(name)) continue;
    const src = fs.readFileSync(path.join(scriptsDir, name), "utf8");
    if (!/process\.argv\.includes\(["']--self-test["']\)/.test(src)) continue;
    const lines = src.split("\n");
    const decl = lines.findIndex((l) => /(function\s+selfTest|const\s+selfTest\s*=)/.test(l));
    if (decl < 0) continue;
    let depth = 0, started = false, end = decl;
    for (let i = decl; i < lines.length; i++) {
      for (const ch of lines[i]) { if (ch === "{") { depth++; started = true; } else if (ch === "}") depth--; }
      if (started && depth <= 0) { end = i; break; }
    }
    const body = lines.slice(decl, end + 1).join("\n");
    const assertions = (body.match(/\bassert\b|\bthrow new Error\b/g) ?? []).length;
    if (assertions > 0) out.push({ builder: name, assertions });
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const scope = buildersWithAFlagGatedSelfTest(SCRIPTS);
  const failures = [];
  for (const { builder } of scope) {
    try {
      execFileSync(process.execPath, [path.join("scripts", builder), "--self-test"],
        { cwd: ROOT, stdio: "pipe", timeout: 300000, env: process.env });
    } catch (e) {
      const text = String(e.stdout ?? "") + String(e.stderr ?? "");
      const line = text.split("\n").map((l) => l.trim())
        .find((l) => l && !/^at /.test(l) && l.length > 12) ?? String(e.message).slice(0, 200);
      failures.push({ builder, why: line.slice(0, 240) });
    }
  }
  /* A builder's self-test may write into its own output directory. Leaving that
   * behind would make the next reader think a build happened. */
  try { execFileSync("git", ["checkout", "--", "data/rcap-all50"], { cwd: ROOT, stdio: "pipe" }); } catch { /* nothing to restore */ }

  const total = scope.reduce((a, b) => a + b.assertions, 0);
  if (!failures.length) {
    console.log(`${total} assertion(s) across ${scope.length} builder(s) sit behind --self-test, and all ${scope.length} pass when it is actually run.`);
    process.exit(0);
  }
  console.error(`${failures.length} of ${scope.length} builder self-test(s) fail when actually run (${total} assertions are gated behind --self-test):`);
  for (const f of failures) console.error(`  ${f.builder}: ${f.why}`);
  console.error("A guard nothing invokes is not a guard. These assertions were written to protect repairs and have never run.");
  process.exit(1);
}
