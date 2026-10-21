import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

/*
 * The anchors-and-withheld branch of readFieldRows skipped selectionControls
 * entirely, so on that shape a selection control could not be classified,
 * counted, or fail anything. These drive the real reader over real field maps
 * written to disk, through the module's own export where one exists and
 * otherwise through the script, so the test cannot pass by re-implementing it.
 */
const MODULE = new URL("./verify-packet-completeness.mjs", import.meta.url).pathname;
const src = fs.readFileSync(MODULE, "utf8");

test("the anchors-and-withheld branch reads selectionControls at all", () => {
  const branch = src.slice(src.indexOf("anchors-and-withheld (Washington)"), src.indexOf("maps-with-canonical-and-boundary (West Virginia)"));
  assert.match(branch, /doc\.selectionControls/,
    "the branch must read selectionControls; skipping them is the defect FIX172 proved by arithmetic on mn_petition_15218-set");
});

test("it classifies a selection control the same way the maps branch does", () => {
  const anchors = src.slice(src.indexOf("anchors-and-withheld (Washington)"), src.indexOf("maps-with-canonical-and-boundary (West Virginia)"));
  const maps = src.slice(src.indexOf("maps-with-canonical-and-boundary (West Virginia)"));
  for (const branch of [anchors, maps]) {
    assert.match(branch, /disposition \?\? ""\)\.toLowerCase\(\)\.startsWith\("select"\)/,
      "a disposition starting 'select' is a write on both shapes; anything else is a blank carrying its own reason");
  }
});

test("both branches route a non-select control to blanks with its reason and refusal class", () => {
  const anchors = src.slice(src.indexOf("anchors-and-withheld (Washington)"), src.indexOf("maps-with-canonical-and-boundary (West Virginia)"));
  assert.match(anchors, /blanks\.push\(normalizeRow\(\{[^}]*reason: c\.reason/s,
    "a control routed to blanks must carry its own reason, or a stated reason becomes invisible again");
  assert.match(anchors, /declaredRefusalClass\(c,/,
    "the refusal class must be declared, not inferred, so an unclassified control shows as unclassified");
});

test("the two Minnesota families are the whole blast radius, and the reader now sees them", () => {
  /* Bounded deliberately: this measures the corpus rather than asserting a
   * number, so it stays true as families are added. It fails if a family on
   * this shape carries selection controls the audit still cannot reach. */
  const ROOT = path.resolve(path.dirname(MODULE), "..", "..");
  const queue = path.join(ROOT, "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json");
  if (!fs.existsSync(queue)) return; // hermetic run without the corpus
  const m = JSON.parse(fs.readFileSync(queue, "utf8"));
  const onThisShape = [];
  for (const f of m.families ?? []) {
    if (!f.directory) continue;
    const p = path.join(ROOT, f.directory, "production-field-map.json");
    if (!fs.existsSync(p)) continue;
    let fm; try { fm = JSON.parse(fs.readFileSync(p, "utf8")); } catch { continue; }
    if (!Array.isArray(fm.documents)) continue;
    const anchorShape = fm.documents.some((d) => !(d.fields ?? []).length && ((d.writableAnchors ?? []).length || (d.withheld ?? []).length));
    const controls = fm.documents.reduce((a, d) => a + (d.selectionControls ?? []).length, 0);
    if (anchorShape && controls > 0) onThisShape.push({ familyId: f.familyId, controls });
  }
  for (const fam of onThisShape) {
    const out = execFileSync(process.execPath, [MODULE, "--family", fam.familyId],
      { cwd: ROOT, encoding: "utf8", env: process.env });
    assert.match(out, /written/, `${fam.familyId} produced no audit line`);
    const written = Number(/(\d+)\/(\d+) written/.exec(out)?.[2] ?? 0);
    assert.ok(written > 0, `${fam.familyId} audited nothing`);
  }
});
