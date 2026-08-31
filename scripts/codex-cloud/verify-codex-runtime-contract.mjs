#!/usr/bin/env node
/**
 * The Codex Cloud runtime contract, and eight ways it must refuse.
 *
 * ENV-RAS01. The prior failure was not that a check was wrong; it was that
 * every check that could have caught it asked a question one step short of the
 * one that mattered. setup printed LEGALEASE_CODEX_CLOUD_READY without
 * mentioning a browser. The preflight asked whether a path was executable. The
 * READY_TO_RUN workflow ran `node --check` on the preflight and never ran it.
 * Each of those passes while a lane cannot raster.
 *
 * So this file is the negative controls, and each one constructs the broken
 * environment rather than describing it. A gate that refuses everything is
 * indistinguishable from one that works, so N0 comes first: the real
 * environment must be ACCEPTED, or the eight refusals below prove nothing.
 *
 *   node scripts/codex-cloud/verify-codex-runtime-contract.mjs
 *   node scripts/codex-cloud/verify-codex-runtime-contract.mjs --skip-runtime
 *
 * --skip-runtime drops the five controls that launch a browser, for use where
 * no browser is provisioned at all; it reports them as not-applicable and never
 * as passes.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SKIP_RUNTIME = process.argv.includes("--skip-runtime");
const PROBE = "scripts/codex-cloud/verify-packet-runtime.mjs";
const SETUP = "scripts/codex-cloud/setup-packet-factory.sh";
const PREFLIGHT = "scripts/verify-packet-build-environment.mjs";
const READY_WORKFLOW = ".github/workflows/rcap-source-conveyor-ready.yml";

const results = [];
const check = (id, title, ok, detail, notApplicable = false) =>
  results.push({ id, title, ok, detail, notApplicable });

// Run the probe under a constructed environment. Every control that says
// "must refuse" is measured by a non-zero exit from the probe itself.
const probe = (env) => {
  const out = spawnSync(process.execPath, [PROBE], {
    cwd: ROOT, encoding: "utf8",
    env: { ...process.env, ...env }
  });
  return { code: out.status, text: `${out.stdout ?? ""}${out.stderr ?? ""}` };
};

/* ---- N0. the positive control ------------------------------------------- */
const real = SKIP_RUNTIME ? null : probe({});
if (SKIP_RUNTIME) {
  check("N0", "the real environment is accepted (the control)", true, "not applicable: --skip-runtime", true);
} else {
  check("N0", "the real environment is accepted (the control)",
    real.code === 0 && /CODEX_PACKET_RUNTIME_READY/.test(real.text),
    real.code === 0 ? "accepted, and rendered a page" : `REFUSED: ${real.text.trim().split("\n").slice(-2)[0]}`);
}

/* ---- N1. no browser installed ------------------------------------------- */
const emptyRegistry = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-no-browser-"));
if (SKIP_RUNTIME) check("N1", "an environment with no browser at all is refused", true, "not applicable: --skip-runtime", true);
else {
  const r = probe({ PLAYWRIGHT_BROWSERS_PATH: emptyRegistry, RCAP_CHROMIUM_PATH: "", PATH: "/nonexistent-path-for-this-control" });
  check("N1", "an environment with no browser at all is refused",
    r.code !== 0 && /no executable Chromium|CODEX_PACKET_RUNTIME_NOT_READY/.test(r.text),
    r.code !== 0 ? "refused" : "ACCEPTED — the probe passed with no browser present");
}

/* ---- N2. the path exists and is not executable --------------------------- */
const notExec = path.join(emptyRegistry, "not-a-program");
fs.writeFileSync(notExec, "this is a text file wearing a browser's name\n");
fs.chmodSync(notExec, 0o644);
if (SKIP_RUNTIME) check("N2", "a browser path that exists and is not executable is refused", true, "not applicable: --skip-runtime", true);
else {
  const r = probe({ RCAP_CHROMIUM_PATH: notExec, PLAYWRIGHT_BROWSERS_PATH: emptyRegistry, PATH: "/nonexistent-path-for-this-control" });
  check("N2", "a browser path that exists and is not executable is refused",
    r.code !== 0, r.code !== 0 ? "refused" : "ACCEPTED — a non-executable file passed as a browser");
}

/* ---- N3. Chromium launches and cannot render a PDF ----------------------- */
/*
 * The subject is real, not invented: Playwright ships chromium_headless_shell,
 * it launches, and it has no PDF viewer -- navigating to a PDF starts a
 * download instead of drawing a page. That is the exact environment that
 * printed ok and then failed inside the render.
 */
const registryRoot = process.env.PLAYWRIGHT_BROWSERS_PATH ?? "/opt/pw-browsers";
const shell = fs.existsSync(registryRoot)
  ? fs.readdirSync(registryRoot).filter((d) => /^chromium_headless_shell-\d+$/.test(d))
    .map((d) => path.join(registryRoot, d, "chrome-linux/headless_shell")).find((p) => fs.existsSync(p))
  : null;
if (SKIP_RUNTIME) check("N3", "a browser that launches and cannot render a PDF is refused", true, "not applicable: --skip-runtime", true);
else if (!shell) {
  // A negative test whose subject cannot exist proves nothing, and saying so is
  // better than reporting a pass over an empty set.
  check("N3", "a browser that launches and cannot render a PDF is refused", false,
    "no headless_shell on this image, so this control has no subject and proves nothing here");
} else {
  const r = probe({ RCAP_CHROMIUM_PATH: shell, PLAYWRIGHT_BROWSERS_PATH: emptyRegistry, PATH: "/nonexistent-path-for-this-control" });
  check("N3", "a browser that launches and cannot render a PDF is refused",
    r.code !== 0, r.code !== 0 ? `refused (${path.basename(shell)})` : "ACCEPTED — headless_shell passed as a page rasterizer");
}

/* ---- N4 and N5. the environment file must carry both exports ------------- */
const setupText = fs.readFileSync(path.join(ROOT, SETUP), "utf8");
const envBlock = /write_env\(\) \{([\s\S]*?)\nENVEOF/.exec(setupText)?.[1] ?? "";
check("N4", "the environment file the setup writes carries RCAP_CHROMIUM_PATH",
  /export RCAP_CHROMIUM_PATH=/.test(envBlock),
  /export RCAP_CHROMIUM_PATH=/.test(envBlock) ? "exported" : "the setup writes an environment file that never names the browser executable");
check("N5", "the environment file the setup writes carries PLAYWRIGHT_BROWSERS_PATH",
  /export PLAYWRIGHT_BROWSERS_PATH=/.test(envBlock),
  /export PLAYWRIGHT_BROWSERS_PATH=/.test(envBlock) ? "exported" : "the setup writes an environment file that never names the browser registry");

/* ---- N6. no prompt may hardcode a denominator the preflight does not print */
/*
 * Eleven places stated "14/14" by hand. The roster is fifteen with two checks
 * not applicable in cloud mode, so the preflight prints 13/13 -- and a worker
 * told to expect 14/14 that sees 13/13 cannot tell an improvement from a
 * regression, which is how a real failure gets waved through as "the shallow
 * checkout being tolerated".
 */
const { preflightDenominator } = await import(path.join(ROOT, "scripts/grade-a-packet-factory-24h/preflight-denominator.mjs"));
/*
 * There are two right answers, and which one a prompt must state depends on the
 * command that prompt instructs. A family-scoped run in cloud mode has
 * family_sources_bind applicable and prints 14/14; an unscoped run does not and
 * prints 13/13. The first version of this control compared every prompt against
 * the unscoped number and reported 133 disagreements over prompts that were
 * correct -- a control that is wrong about the contract is worse than none,
 * because it teaches the reader to ignore it.
 *
 * So each ratio is measured against the denominator for the command it sits
 * beside, and any literal a generator states by hand rather than computing is
 * reported whatever its value: the defect is the hand-written number, which
 * cannot follow the roster when a check is added.
 */
/*
 * The expected ratio is measured for the invocation the prompt itself
 * instructs, flag for flag. Two earlier versions of this control were wrong
 * about the contract -- first ignoring --family, then ignoring --codex-cloud --
 * and each time it reported dozens of correct prompts as defects. A control
 * that is wrong about the thing it checks is worse than no control, because it
 * teaches the reader to skip it. So it reads the command instead of assuming
 * one.
 */
const ratioCache = new Map();
const ratioFor = (args) => {
  const key = args.join(" ");
  if (!ratioCache.has(key)) {
    ratioCache.set(key, /(\d+\/\d+)/.exec(preflightDenominator(args).mustReturn)?.[1] ?? "");
  }
  return ratioCache.get(key);
};
// The command block a prompt gives its worker, taken verbatim from the fence.
const argsFromCommand = (block) => {
  const args = [];
  if (/--family\s+\S/.test(block)) args.push("--family", "__denominator_probe__");
  if (/--codex-cloud/.test(block)) args.push("--codex-cloud");
  return args;
};
/*
 * Every preflight invocation in a prompt, with the offset it sits at.
 *
 * A prompt has more than one: PF carries a lane gate (no --family, 14/14) and a
 * row gate (--family, 15/15), and they print different numbers. Reading only
 * the first command measured both against the lane gate; reading the wrong one
 * measured both against the row gate. Each stated ratio belongs to the command
 * nearest above it, and the return-format line at the foot of the prompt
 * reports the lane gate, which is the first.
 */
const commandsIn = (text) => {
  const out = [];
  for (const m of text.matchAll(/node scripts\/verify-packet-build-environment\.mjs/g)) {
    const fenceEnd = text.indexOf("\n```", m.index);
    out.push({ at: m.index, args: argsFromCommand(text.slice(m.index, fenceEnd < 0 ? m.index + 400 : fenceEnd)) });
  }
  return out;
};
const hardcoded = [];
const walkPrompts = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { walkPrompts(p); continue; }
    if (!e.name.endsWith(".md")) continue;
    const t = fs.readFileSync(p, "utf8");
    const commands = commandsIn(t);
    for (const m of t.matchAll(/(^|\n)([^\n]*PACKET_BUILD_ENVIRONMENT_READY:?\s*`?(\d+\/\d+)[^\n]*)/g)) {
      const line = m[2];
      const stated = m[3];
      if (!commands.length) {
        // A prompt that names this preflight's output and never tells the
        // worker to run it names a string its own lane cannot produce.
        hardcoded.push(`${path.relative(ROOT, p)} states ${stated} and instructs no packet-build preflight run`);
        continue;
      }
      /*
       * A past measurement may state a past number, and must not be rewritten
       * to agree with the present one -- editing the record of a broken gate to
       * match the fixed one destroys the evidence that it was ever broken. The
       * exemption is narrow and has to earn itself: the line must name the
       * roster the observation was made against, so a stale instruction cannot
       * hide behind it by simply sounding historical.
       */
      if (/against the then-current roster of \d+/.test(line)) continue;
      // The return-format block reports the LANE gate, wherever it sits.
      const isReturnFormat = /^PREFLIGHT:/.test(line.trim());
      const owner = isReturnFormat
        ? commands[0]
        : [...commands].reverse().find((c) => c.at < m.index) ?? commands[0];
      const expected = ratioFor(owner.args);
      if (stated !== expected) {
        hardcoded.push(`${path.relative(ROOT, p)} states ${stated} where \`${["node", PREFLIGHT, ...owner.args].join(" ")}\` prints ${expected}`);
      }
    }
  }
};
walkPrompts(path.join(ROOT, "docs/rcap/grade-a/packet-factory-24h"));
walkPrompts(path.join(ROOT, "docs/rcap/grade-a/launch-control"));
/*
 * And the generators. A literal here reaches every prompt it writes and cannot
 * follow the roster, so ANY hand-written ratio is the finding -- not only one
 * that currently disagrees. A number that happens to be right today is the
 * same defect as one that is wrong, discovered later.
 */
for (const g of fs.readdirSync(path.join(ROOT, "scripts/grade-a-packet-factory-24h")).filter((f) => f.startsWith("generate"))) {
  const t = fs.readFileSync(path.join(ROOT, "scripts/grade-a-packet-factory-24h", g), "utf8");
  for (const line of t.split("\n")) {
    if (/^\s*\*/.test(line)) continue; // the comment recording the history of this defect
    if (/PACKET_BUILD_ENVIRONMENT_READY:?\s*\\?`?\d+\/\d+/.test(line)) {
      hardcoded.push(`${g} states a denominator by hand instead of computing it: ${line.trim().slice(0, 60)}`);
    }
  }
}
check("N6", "no prompt or generator states a preflight denominator the preflight does not print",
  hardcoded.length === 0,
  `${ratioCache.size} distinct invocation(s) measured; ${hardcoded.length} place(s) disagree: ${hardcoded.slice(0, 3).join(" | ")}`);

/* ---- N7. the readiness workflow must run the runtime acceptance ---------- */
const wf = fs.existsSync(path.join(ROOT, READY_WORKFLOW)) ? fs.readFileSync(path.join(ROOT, READY_WORKFLOW), "utf8") : "";
const wfProblems = [];
if (!wf) wfProblems.push("the readiness workflow is absent");
if (!new RegExp(PROBE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(wf)) wfProblems.push("it never runs the packet-runtime probe");
if (!new RegExp(`node ${PREFLIGHT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(wf)) wfProblems.push("it never runs the packet-build preflight — only node --check on it, which proves the file parses");
/*
 * Does a change to this path trigger the workflow -- not, is this exact string
 * spelled out. `scripts/lib/**` covers scripts/lib/pdf-page-raster.mjs, and a
 * control that demanded the literal reported a covered path as uncovered. A
 * check that is wrong about what it is checking teaches the reader to skip it.
 */
const triggerPaths = [...wf.matchAll(/^\s+- ([\w./*-]+)$/gm)].map((m) => m[1]);
const covers = (glob, file) => {
  const re = new RegExp(`^${glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "\u0000")
    .replace(/\*/g, "[^/]*")
    .replace(/\u0000/g, ".*")}$`);
  return re.test(file);
};
for (const file of [
  "scripts/codex-cloud/setup-packet-factory.sh",
  "scripts/lib/pdf-page-raster.mjs",
  "package.json",
  "package-lock.json",
  "docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md"
]) {
  if (!triggerPaths.some((g) => covers(g, file))) wfProblems.push(`a change to ${file} does not trigger it`);
}
check("N7", "the readiness workflow runs the runtime acceptance and is triggered by what can break it",
  wfProblems.length === 0, `${wfProblems.length} problem(s): ${wfProblems.slice(0, 3).join(" | ")}`);

/* ---- N8. no worker may reach for apt-get or Poppler ---------------------- */
const offending = [];
const walkForbidden = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { walkForbidden(p); continue; }
    if (!e.name.endsWith(".md")) continue;
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const stripped = line.replace(/`[^`]*`/g, "");
      if (/\bpdftoppm\b|\bapt-get\b|playwright install/.test(stripped)) offending.push(`${path.relative(ROOT, p)}: ${line.trim().slice(0, 48)}`);
    }
  }
};
walkForbidden(path.join(ROOT, "docs/rcap/grade-a/packet-factory-24h"));
walkForbidden(path.join(ROOT, "docs/rcap/grade-a/launch-control"));
// The setup phase is the ONE place `playwright install` is legitimate, because
// it is the only phase with a network. It is still never apt-get.
// Comments and quoted strings are stripped first: the setup script's own
// refusal message names apt-get in order to forbid it, and a check that cannot
// tell a prohibition from an instruction fires on the fix.
const setupCommands = setupText.replace(/^\s*#.*$/gm, "").replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/'(?:[^']|\n)*?'/g, "''");
const setupUsesAptGet = /\bapt-get\b/.test(setupCommands);
if (setupUsesAptGet) offending.push(`${SETUP}: reaches for apt-get`);
check("N8", "no worker instruction reaches for apt-get, Poppler or a browser install",
  offending.length === 0, `${offending.length} offending line(s): ${offending.slice(0, 2).join(" | ")}`);

try { fs.rmSync(emptyRegistry, { recursive: true, force: true }); } catch { /* the control owns it */ }

for (const r of results) {
  const mark = r.notApplicable ? "n/a " : r.ok ? "ok  " : "FAIL";
  console.log(`  ${mark} ${r.id.padEnd(3)} ${r.title}\n         ${r.detail}`);
}
const applicable = results.filter((r) => !r.notApplicable);
const failed = applicable.filter((r) => !r.ok);
console.log(`\n${applicable.length - failed.length}/${applicable.length} runtime-contract controls held${results.length - applicable.length ? `, ${results.length - applicable.length} not applicable` : ""}.`);
if (failed.length) {
  console.error("\nCODEX_RUNTIME_CONTRACT_NOT_PROVEN");
  process.exit(1);
}
console.log("\nCODEX_RUNTIME_CONTRACT_PROVEN");
