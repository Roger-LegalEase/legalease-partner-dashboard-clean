// A family whose participant instructions say "Every page states its own route in its footer" must print a
// route footer where its fixture PDFs promise one. The sentence is true only while the renderer prints
// Route: lines (courtFacingRows blanks "Route: obligation:" rows), so a rerender that drops the footer
// while the sentence stays must fail here, as it did for NV.
//
//   node scripts/test-route-footer-sentence.mjs        (needs pdftotext from poppler-utils)
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const SENTENCE = "Every page states its own route in its footer";
const ROOT = "data/rcap-all50/overlays/census-v1";
// Any form, key or readable label, any case: a key-only or case-sensitive probe misreads KS and "ROUTE:".
// A footer sits at the page foot: every fixture footer is among its page's last 3 non-empty lines (2026-10-20: 220 last,
// 30 second, 4 third of 254), so a body line that starts "Route:" cannot stand in for a dropped footer.
const FOOT_LINES = 3;
const hasRoute = (text) => text.split("\n").filter((l) => l.trim()).slice(-FOOT_LINES).some((l) => /^\s*route:/i.test(l));

// Pages that must carry a footer. A footer on any page that is not its component's last page (page 1 for KS, MS)
// means the family prints one on every page; otherwise it prints one on each component's last page (ND, SC, TN, WA).
// Losing every non-final footer at once reads as the second form, which the sentence also describes.
export function requiredFooterPages(pages, manifest) {
  const last = manifest.map((m, i) => manifest[i + 1]?.component !== m.component);
  const everyPage = pages.some((text, i) => !last[i] && hasRoute(text));
  return pages.map((_, i) => i + 1).filter((p) => everyPage || last[p - 1]);
}
export function missingFooterPages(instructions, pages, manifest) {
  if (!instructions.includes(SENTENCE)) return [];
  return requiredFooterPages(pages, manifest).filter((p) => !hasRoute(pages[p - 1]));
}

const families = [];
for (const state of fs.readdirSync(ROOT).sort()) {
  for (const family of fs.readdirSync(path.join(ROOT, state)).sort()) {
    const dir = path.join(ROOT, state, family), instructionsPath = path.join(dir, "participant-instructions.md");
    if (!fs.existsSync(instructionsPath)) continue;
    const instructions = fs.readFileSync(instructionsPath, "utf8");
    if (!instructions.includes(SENTENCE)) continue;
    const report = JSON.parse(fs.readFileSync(path.join(dir, "reports/rendered-artifacts.json"), "utf8"));
    const fixtures = fs.readdirSync(path.join(dir, "fixtures")).filter((f) => f.endsWith(".pdf")).sort();
    assert(fixtures.length > 0, `${dir}: the sentence is present but there is no fixture PDF to hold it to`);
    for (const file of fixtures) {
      const pdf = path.join(dir, "fixtures", file), bytes = fs.readFileSync(pdf);
      const artifact = (report.artifacts ?? []).find((a) => a.fixture === file.slice(0, -4));
      // The page manifest must describe these exact bytes, or component boundaries are guesses.
      assert.equal(artifact?.sha256, createHash("sha256").update(bytes).digest("hex"), `${pdf}: rendered-artifacts.json does not bind these bytes`);
      const pages = execFileSync("pdftotext", [pdf, "-"], { encoding: "utf8", maxBuffer: 64e6 }).split("\f").slice(0, -1);
      assert.equal(pages.length, artifact.pageManifest.length, `${pdf}: page manifest and PDF page count differ`);
      families.push({ pdf, instructions, pages, manifest: artifact.pageManifest });
    }
  }
}
assert(families.length > 0, `no overlay carries "${SENTENCE}"; retire this guard`);

const failures = families.map((f) => ({ pdf: f.pdf, missing: missingFooterPages(f.instructions, f.pages, f.manifest) })).filter((f) => f.missing.length);
assert.deepEqual(failures, [], "the instructions promise a route footer that these pages do not print");

// Self-check on the real fixture text: the guard tracks the sentence, not the footer alone.
const strip = (text) => text.replace(/^(\s*)route:/gim, "$1");
for (const f of families) {
  const required = requiredFooterPages(f.pages, f.manifest);
  const finals = f.manifest.map((m, i) => (f.manifest[i + 1]?.component !== m.component ? i + 1 : null)).filter(Boolean);
  assert.deepEqual(required, f.pages.map((t, i) => (hasRoute(t) ? i + 1 : null)).filter(Boolean), `${f.pdf}: the guard must cover every footer the family prints`);
  for (const p of required) {
    assert.deepEqual(missingFooterPages(f.instructions, f.pages.map((t, i) => (i === p - 1 ? strip(t) : t)), f.manifest), [p], `${f.pdf}: dropping page ${p}'s footer must fail`);
    // A fixed 2-line pad, not FOOT_LINES: on SC's 1-line footer pages the body line sits 4th from the foot, so any wider window fails here.
    const body = "Route: a body line\nbody\nbody\n";
    assert.deepEqual(missingFooterPages(f.instructions, f.pages.map((t, i) => (i === p - 1 ? body + strip(t) : t)), f.manifest), [p], `${f.pdf}: a body line starting "Route:" must not stand in for page ${p}'s footer`);
    assert.deepEqual(missingFooterPages(f.instructions, f.pages.map((t, i) => (i === p - 1 ? `${strip(t)}\nfiled under route: obligation:x\n` : t)), f.manifest), [p], `${f.pdf}: "route:" inside a foot line is not page ${p}'s footer`);
  }
  assert.deepEqual(missingFooterPages(f.instructions, f.pages.map(strip), f.manifest), finals, `${f.pdf}: dropping every footer must fail`);
  assert.deepEqual(missingFooterPages(f.instructions.replaceAll(SENTENCE, ""), f.pages.map(strip), f.manifest), [], `${f.pdf}: no sentence, no promise`);
  assert.deepEqual(missingFooterPages(f.instructions, f.pages.map((t) => t.replace(/^(\s*)route:/gim, "$1ROUTE:")), f.manifest), [], `${f.pdf}: an upper-case ROUTE: footer still counts`);
}
console.log(JSON.stringify({ status: "PASS_ROUTE_FOOTER_SENTENCE", fixtures: families.length,
  checked: families.map((f) => ({ pdf: f.pdf, pages: f.pages.length, footerPages: f.pages.filter(hasRoute).length })) }));
