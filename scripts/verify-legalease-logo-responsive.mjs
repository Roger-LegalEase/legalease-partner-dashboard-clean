import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const failures = [];

function file(relativePath) {
  return path.join(root, relativePath);
}

function read(relativePath) {
  return fs.readFileSync(file(relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function assertIncludes(source, needles, label) {
  for (const needle of needles) {
    assert(source.includes(needle), `${label} missing ${needle}`);
  }
}

function readPngSize(relativePath) {
  const buffer = fs.readFileSync(file(relativePath));
  assert(buffer.toString("ascii", 1, 4) === "PNG", `${relativePath} is not a PNG`);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

const wordmark = "public/legalease/logos/legalease-wordmark.png";
assert(fs.existsSync(file(wordmark)), `Missing ${wordmark}`);

const { width, height } = readPngSize(wordmark);
assert(width === 900 && height === 221, `LegalEase wordmark intrinsic size changed: ${width}x${height}`);

const staticPage = read("public/static/legalease/index.html");
const nav = read("src/app/legalease/LegalEaseNav.tsx");
const appCss = read("src/app/legalease/LegalEaseStyles.css");
const handoffCss = read("design-handoff/legalease-homepage/styles.css");
const handoffHtml = read("design-handoff/legalease-homepage/index.html");
const handoffGen = read("design-handoff/legalease-homepage/_build/gen.py");

assertIncludes(staticPage, [
  'id="headerLogo"',
  'src="/legalease/logos/legalease-wordmark.png"',
  'width="900" height="221"',
  ".header .logo{display:inline-flex;align-items:center;flex:0 0 auto;}",
  ".header .logo img{display:block;height:40px;width:auto;max-width:min(190px,46vw);object-fit:contain;flex:0 0 auto;}",
  ".m-menu-top img{height:28px;width:auto;max-width:170px;object-fit:contain;flex:0 0 auto;}",
  ".footer .f-brand img{height:28px;width:auto;max-width:170px;object-fit:contain;margin-bottom:18px;}"
], "static LegalEase logo surface");

assert(
  !/<img id="headerLogo" src="data:image\/png;base64,/.test(staticPage),
  "Static header must not use an inline base64 logo"
);
assert(
  !/headerLogo[^>]+(?:width|height):\s*(?:40px|44px|48px)/.test(staticPage),
  "Static header logo must not force square CSS dimensions"
);

assertIncludes(nav, [
  'className="le-logo"',
  'src="/legalease/logos/legalease-wordmark.png"',
  "width={900}",
  "height={221}"
], "React LegalEase nav logo");

assertIncludes(appCss, [
  ".le-logo",
  "height: 34px;",
  "width: auto;",
  "object-fit: contain;",
  "flex-shrink: 0;"
], "React LegalEase nav CSS");

assertIncludes(handoffCss, [
  ".header .logo{display:inline-flex;align-items:center;flex:0 0 auto;}",
  ".header .logo img{display:block;height:30px;width:auto;max-width:min(190px,46vw);object-fit:contain;flex:0 0 auto;}",
  ".m-menu-top img{height:28px;width:auto;max-width:170px;object-fit:contain;flex:0 0 auto;}"
], "handoff LegalEase logo CSS");

assertIncludes(handoffHtml, [
  'src="/legalease/logos/legalease-wordmark.png"',
  'width="900" height="221"'
], "handoff LegalEase logo HTML");

assertIncludes(handoffGen, [
  'src="/legalease/logos/legalease-wordmark.png"',
  'width="900" height="221"'
], "handoff generator LegalEase logo HTML");

const changed = runGitStatus();
const forbiddenPrefixes = [
  "src/app/expungement-ai",
  "src/app/partner",
  "src/app/partners",
  "src/components/expungement",
  "src/components/partners",
  "src/lib/partners",
  "src/lib/rcap",
  "src/lib/record-clearing",
  "src/lib/stripe",
  "src/lib/supabase"
];

for (const changedPath of changed) {
  if (forbiddenPrefixes.some((prefix) => changedPath.startsWith(prefix))) {
    failures.push(`Forbidden product area changed: ${changedPath}`);
  }
}

if (failures.length) {
  console.error("LegalEase responsive logo verifier failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("LegalEase responsive logo verifier passed.");

function runGitStatus() {
  const result = spawnSync("git", ["status", "--short"], { cwd: root, encoding: "utf8" });
  if (result.status !== 0) {
    failures.push(`Unable to inspect git status: ${result.stderr || result.error?.message || "unknown error"}`);
    return [];
  }

  return (result.stdout || "")
    .split("\n")
    .filter(Boolean)
    .map((line) => line.slice(3).trim())
    .map((line) => line.replace(/^"|"$/g, ""));
}
