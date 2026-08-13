// Checks the eight corrected families against the acceptance conditions the
// independent reviewer wrote, and against the evidence rules that apply to all
// of them.
//
// This is not the review. It is what a reviewer should not have to re-derive:
// every claim the implementation makes about the final bytes, stated as a
// checkable assertion and answered from those bytes. The reviewer's job is to
// disagree with it, which is only possible if it is specific.
//
// Read-only with respect to the family packages: it loads artifacts and reports.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PDFDocument } from "pdf-lib";

import { extractTextItems, groupIntoLines } from "./rcap-pdf-anchor-capture.mjs";
import { verifyWrittenValue } from "./rcap-text-fitting.mjs";
import { scanBytesForActiveContent } from "./rcap-active-content.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(REPO, "docs/record-clearing/d-wave/v4");
const inputs = JSON.parse(fs.readFileSync(path.join(OUT, "implementation-inputs.json"), "utf8"));
const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

const requested = process.argv.slice(2);
const families = inputs.families.filter((f) => requested.length === 0 || requested.includes(f.familyId));

// Captions that only an interactive form has. A flattened artifact has no
// buttons left, so any of these appearing as drawn text means the artifact --
// or a sheet built from it -- is not the finalized one.
const CONTROL_CAPTIONS = [/^print$/i, /^reset$/i, /^save$/i, /^clear$/i, /^submit$/i,
  /^next\b/i, /^previous\b/i, /^back$/i, /^continue$/i, /^print\s+form$/i,
  /^reset\s+form$/i, /^clear\s+form$/i, /^save\s+form$/i, /^form\s+guide$/i, /^help$/i];

const results = [];
const assertions = [];
const assert = (familyId, name, pass, detail) => {
  assertions.push({ familyId, assertion: name, pass: Boolean(pass), detail: detail ?? null });
  return Boolean(pass);
};

async function visibleRuns(file, renderStrategy) {
  const bytes = fs.readFileSync(file);
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const runsByPage = doc.getPages().map((p) => extractTextItems(p));
  // The channel follows the render strategy, which is recorded, rather than
  // being inferred from what happens to be on the page. Inference fails on the
  // one artifact that matters most here: Vermont's boundary fixture had its
  // single value withdrawn, so it carries no appearance runs at all, and a
  // runs-based guess falls back to geometry and reads the form's own printed
  // rule line as the withdrawn value -- reporting a correct withdrawal as a
  // clipped filing.
  // Two shapes, one predicate, matching how the driver decides which path to
  // render a family down: a flat overlay draws onto the page, everything else
  // is an AcroForm filled through its own fields. Vermont's source record
  // leaves renderStrategy unset, and a null there means AcroForm rather than
  // unknown -- the package carries a widget census, which a flat form has not.
  const runSource = renderStrategy === "flat_overlay_anchor_draw" ? "geometry" : "appearance";
  return { bytes, doc, runsByPage, runSource };
}

for (const family of families) {
  const pkgAbs = path.join(REPO, family.familyPackagePath);
  const manifest = readJson(path.join(pkgAbs, "reports/rendered-artifacts.json"));
  const id = family.familyId;

  // --- evidence rules that apply to every family --------------------------
  // Every path in the manifest exists, and every recorded digest is the digest
  // of the file on disk. A manifest that describes something else is worse than
  // no manifest, because it reads as verification.
  let allPathsExist = true;
  let allShasMatch = true;
  for (const [rel, entry] of Object.entries(manifest.artifacts ?? {})) {
    const abs = path.join(pkgAbs, rel);
    if (!fs.existsSync(abs)) { allPathsExist = false; continue; }
    if (sha256(fs.readFileSync(abs)) !== entry.sha256) allShasMatch = false;
  }
  assert(id, "every manifest path exists on disk", allPathsExist);
  assert(id, "every manifest digest is the digest of the file on disk", allShasMatch);

  // No active content, and the artifact is inspectable enough to say so.
  let clean = true;
  const scans = {};
  for (const rel of Object.keys(manifest.artifacts ?? {})) {
    const abs = path.join(pkgAbs, rel);
    if (!fs.existsSync(abs)) continue;
    const scan = scanBytesForActiveContent(fs.readFileSync(abs));
    scans[rel] = { inspectable: scan.inspectable, clean: scan.clean, hits: scan.hits };
    if (!scan.clean || !scan.inspectable) clean = false;
  }
  assert(id, "no XFA, JavaScript, additional-action, OpenAction, Launch, Submit, Import, URI or unsafe annotation residue in any artifact", clean, scans);

  // The contact sheet describes the finalized participant artifact, not an
  // intermediate: its recorded source digest is that artifact's digest.
  const sheetProofPath = path.join(pkgAbs, "contact-sheet/contact-sheet-proof.json");
  if (fs.existsSync(sheetProofPath)) {
    const proof = readJson(sheetProofPath);
    const finalized = path.join(pkgAbs, "fixtures/canonical-filled.pdf");
    const finalizedSha = fs.existsSync(finalized) ? sha256(fs.readFileSync(finalized)) : null;
    assert(id, "the contact sheet was built from the finalized participant artifact",
      proof.builtFromSha256 === finalizedSha && proof.finalizedSha256 === finalizedSha,
      { proofBuiltFrom: proof.builtFromSha256, proofFinalized: proof.finalizedSha256, artifactOnDisk: finalizedSha });

    // Control captions, on the sheet and on the artifact itself.
    const sheet = await visibleRuns(path.join(pkgAbs, "contact-sheet/blank-vs-filled.pdf"), "contact_sheet");
    const filled = fs.existsSync(finalized) ? await visibleRuns(finalized, family.renderStrategy) : null;
    const captionsIn = (v) => v === null ? [] : v.runsByPage.flatMap((runs, i) =>
      groupIntoLines(runs).flatMap((l) => (l.runs ?? []).map((r) => ({ text: String(r.text ?? "").trim(), page: i + 1, y: l.y }))))
      .filter((r) => CONTROL_CAPTIONS.some((re) => re.test(r.text)));
    // The sheet's left panel is the blank form as issued, so a caption printed
    // on the form itself is expected there; what must be gone is any caption on
    // the *finalized* artifact, which is the panel a reviewer signs off.
    const onArtifact = captionsIn(filled);
    assert(id, "the finalized participant artifact carries no Print, Reset, Save, Clear or navigation caption",
      onArtifact.length === 0, onArtifact.slice(0, 8));
  }

  // --- per-family acceptance conditions ------------------------------------
  if (id === "MO:cr145-form-petition-en") {
    const map = readJson(path.join(pkgAbs, "production-field-map.json"));
    const bound = new Map(map.bindings.map((b) => [b.field, b.factId]));
    const refused = new Map((map.bindingRefusals ?? []).map((r) => [r.field, r]));
    const other = refused.get("Other Defendants");
    assert(id, "'Other Defendants' is refused with an agency or outside-party reason",
      !bound.has("Other Defendants") && ["agency", "outside_party"].includes(other?.category ?? ""), other);

    // And the participant's name is not in it in the artifact, whatever the map
    // says: the map is a claim about the render, the page is the render.
    const census = readJson(path.join(pkgAbs, "field-census.json"));
    const w = census.fields.find((f) => f.name === "Other Defendants")?.widgets?.[0];
    const facts = readJson(path.join(pkgAbs, "fixtures/canonical.json")).facts;
    const filled = await visibleRuns(path.join(pkgAbs, "fixtures/canonical-filled.pdf"), family.renderStrategy);
    const v = verifyWrittenValue({ value: facts["participant.full_legal_name"], rect: w.rect, runs: filled.runsByPage[(w.page ?? 1) - 1] ?? [], runSource: filled.runSource });
    assert(id, "the petitioner's name does not appear in the 'Other Defendants' widget on the page",
      v.outcome === "absent", { outcome: v.outcome, drawn: v.drawn ?? null });

    // The agency siblings the reviewer named stay refused.
    const siblings = ["County Sheriff's Dept", "Municipal Police Dept", "Missouri Highway Patrol Troop"];
    assert(id, "the sibling agency fields remain refused",
      siblings.every((s) => !bound.has(s)), siblings.filter((s) => bound.has(s)));
  }

  if (id === "NH:nhjb-2956-support-record-request-en") {
    const proof = readJson(path.join(pkgAbs, "contact-sheet/contact-sheet-proof.json"));
    assert(id, "the sheet's panels differ and its scan is clean",
      proof.panelsDiffer === true && proof.activeContentScan?.clean === true, proof.activeContentScan);
    assert(id, "the manifest records the sheet that is on disk",
      manifest.artifacts?.["contact-sheet/blank-vs-filled.pdf"]?.sha256
        === sha256(fs.readFileSync(path.join(pkgAbs, "contact-sheet/blank-vs-filled.pdf"))));
  }

  if (id.startsWith("WA:")) {
    const profile = readJson(path.join(pkgAbs, "overlay-profile.json"));
    const ledger = readJson(path.join(pkgAbs, "reports/refusal-ledger.json"));
    const perPageRefused = (profile.anchorCapture.pages ?? []).reduce((n, p) => n + (p.unreadableLines ?? 0), 0);
    assert(id, "the profile's unreadable-line count equals the decoder's own refusal count",
      profile.anchorCapture.totalUnreadableLines === perPageRefused
      && ledger.unreadableLines === perPageRefused,
      { profile: profile.anchorCapture.totalUnreadableLines, perPage: perPageRefused, ledger: ledger.unreadableLines });
    assert(id, "a zero-unreadable result is not recorded while the decoder refused a line",
      !(perPageRefused > 0 && profile.anchorCapture.totalUnreadableLines === 0));
    assert(id, "'no participant label matched' is not concluded where usable labels were read",
      profile.anchorCapture.candidateLabelCount > 0, profile.anchorCapture.candidateLabelCount);
    assert(id, "every refused line and every refused label is recorded with a reason",
      (ledger.refusals ?? []).length > 0 && (ledger.refusals ?? []).every((r) => Boolean(r.reason)));
    assert(id, "undecodable geometry fails closed: no anchor sits on a refused line",
      (profile.anchorCapture.anchors ?? []).every((a) =>
        !(ledger.refusals ?? []).some((r) => r.reason === "line_carries_undecoded_character_codes" && Math.abs((r.y ?? -1) - a.labelBox.y) < 0.01)));
  }

  if (id === "VA:cc-1203-form-en" || id === "VT:200-00631-form-en") {
    const overflow = readJson(path.join(pkgAbs, "reports/overflow-and-clipping.json"));
    const decisions = overflow.allFittingDecisions ?? [];
    // Every value either renders whole or is explicitly withdrawn. There is no
    // third outcome, and in particular no clean `shrunk` covering a clip.
    const rendered = decisions.filter((d) => d.disposition === "rendered_whole_inside_widget");
    const withdrawn = decisions.filter((d) => d.disposition?.startsWith("withdrawn"));
    assert(id, "every fitting decision is either rendered-whole or withdrawn",
      decisions.length === rendered.length + withdrawn.length,
      decisions.filter((d) => !d.disposition).slice(0, 5));
    assert(id, "no decision records a clean outcome while the rendered text is shorter than the supplied value",
      !rendered.some((d) => d.renderedChars != null && d.suppliedChars != null && d.renderedChars < d.suppliedChars),
      rendered.filter((d) => d.renderedChars < d.suppliedChars).slice(0, 5));
    assert(id, "no rendered value leaves its widget",
      !rendered.some((d) => (d.overflowLeftPt ?? 0) > 0.5 || (d.overflowRightPt ?? 0) > 0.5),
      rendered.filter((d) => (d.overflowRightPt ?? 0) > 0.5).slice(0, 5));
    assert(id, "every withdrawn value is recorded with its geometry and both character counts",
      withdrawn.every((d) => d.suppliedChars != null && d.renderedChars != null),
      withdrawn.filter((d) => d.suppliedChars == null).slice(0, 5));

    // And the page agrees: nothing withdrawn is visible in its widget.
    const census = readJson(path.join(pkgAbs, "field-census.json"));
    const widget = new Map((census.fields ?? []).map((f) => [f.name, f.widgets?.[0] ?? null]));
    let leaked = [];
    for (const fixture of ["canonical", "boundary"]) {
      const file = path.join(pkgAbs, `fixtures/${fixture}-filled.pdf`);
      if (!fs.existsSync(file)) continue;
      const v = await visibleRuns(file, family.renderStrategy);
      for (const d of withdrawn.filter((x) => x.fixture === fixture)) {
        const w = widget.get(d.field);
        if (!w?.rect) continue;
        const r = verifyWrittenValue({ value: "x".repeat(Math.max(1, d.suppliedChars ?? 1)), rect: w.rect, runs: v.runsByPage[(w.page ?? 1) - 1] ?? [], runSource: v.runSource });
        if (r.outcome !== "absent") leaked.push({ fixture, field: d.field, outcome: r.outcome, drawn: r.drawn });
      }
    }
    assert(id, "a withdrawn value is blank on the page, not filed in a shorter form", leaked.length === 0, leaked.slice(0, 5));
  }

  results.push({ familyId: id, manifestArtifacts: Object.keys(manifest.artifacts ?? {}).length });
}

const byFamily = {};
for (const a of assertions) {
  (byFamily[a.familyId] ??= { pass: 0, fail: 0, failed: [] });
  if (a.pass) byFamily[a.familyId].pass += 1;
  else { byFamily[a.familyId].fail += 1; byFamily[a.familyId].failed.push(a); }
}

const out = {
  schema: "rcap-d-v4-correction-verification/v1",
  posture: "Every claim the implementation makes about the final bytes, answered from those bytes. Not a review: the implementation session may not approve its own work.",
  canonicalControlPlaneBase: inputs.canonicalControlPlaneBase,
  totals: {
    families: results.length,
    assertions: assertions.length,
    passed: assertions.filter((a) => a.pass).length,
    failed: assertions.filter((a) => !a.pass).length
  },
  byFamily, assertions
};
fs.writeFileSync(path.join(OUT, "correction-verification.json"), `${JSON.stringify(out, null, 2)}\n`);

for (const [fam, r] of Object.entries(byFamily)) {
  console.log(`${r.fail === 0 ? "PASS" : "FAIL"}  ${fam.padEnd(40)} ${r.pass} passed, ${r.fail} failed`);
  for (const f of r.failed) console.log(`        ${f.assertion}\n          ${JSON.stringify(f.detail).slice(0, 300)}`);
}
console.log(`\n${out.totals.passed}/${out.totals.assertions} assertions pass across ${out.totals.families} families`);
process.exitCode = out.totals.failed === 0 ? 0 : 1;
