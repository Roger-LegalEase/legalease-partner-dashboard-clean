#!/usr/bin/env node
// A lane's reasoning is not lost because it chose the other field name.
//
// extract-verifier-returns.mjs read `finding` and nothing else, while
// verification lanes write their reasoning under either `finding` or `detail` —
// both are how a verifier says why an obligation did not pass, and nothing ever
// told them which key the extractor reads. Measured across every lane file when
// this was found: 759 non-passing obligations carried `finding`, 380 carried
// ONLY `detail`. All 380 were extracted as null.
//
// The cost was not cosmetic. Three Connecticut families sat in GUIDANCE_READY —
// a terminal state, counted toward the 346 — while independent verifiers had
// failed them, because the generator could not see a reason behind the failure.
// Regenerating with `detail` read as a fallback moved all three out and took the
// terminal census from 198 to 195.
//
//   node --test scripts/grade-a-packet-factory-24h/verify-finding-extraction.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const EXTRACTOR = path.join(ROOT, "scripts/grade-a-packet-factory-24h/extract-verifier-returns.mjs");
const RETURNS = path.join(ROOT, "data/rcap-grade-a/packet-factory-24h/VERIFIER_RETURNS.json");
const LANES = path.join(ROOT, "data/rcap-grade-a/packet-factory-24h");

const obligations = () => {
  const d = JSON.parse(fs.readFileSync(RETURNS, "utf8"));
  return (d.rows ?? []).flatMap((r) => [...(r.failedObligations ?? []), ...(r.blockedLegalObligations ?? [])]);
};

test("the extractor reads detail when finding is absent", () => {
  const src = fs.readFileSync(EXTRACTOR, "utf8");
  assert.match(src, /const obligationFinding = /, "one derivation, not a repeated ternary");
  assert.match(src, /v\?\.detail/, "detail must be read");
  assert.doesNotMatch(src, /finding: v\.finding \?\? null/, "the old finding-only read must be gone");
});

test("the source key is recorded, so no reader has to infer which field answered", () => {
  const src = fs.readFileSync(EXTRACTOR, "utf8");
  assert.match(src, /findingReadFrom/, "provenance must travel with the text");
  const all = obligations();
  assert.ok(all.length > 0, "the extracted returns must carry obligations");
  for (const o of all) {
    if (o.finding) assert.ok(["finding", "detail", "named-obligation-block"].includes(o.findingReadFrom), `${o.obligation} has a finding but no source key`);
    else assert.equal(o.findingReadFrom, null, `${o.obligation} has no finding, so no source key`);
  }
});

test("findings that live only in detail are actually recovered", () => {
  const byKey = obligations().reduce((a, o) => { a[o.findingReadFrom ?? "none"] = (a[o.findingReadFrom ?? "none"] ?? 0) + 1; return a; }, {});
  assert.ok((byKey.detail ?? 0) > 0, "no obligation was answered by detail; either the writers migrated or the fallback regressed");
  assert.ok((byKey.finding ?? 0) > 0, "obligations that use finding must still be read from it");
});

test("whitespace is not a finding", () => {
  const src = fs.readFileSync(EXTRACTOR, "utf8");
  assert.match(src, /\.trim\(\)/, "a blank string must not count as a stated reason");
});

test("the lane files still carry detail-only obligations for this to matter", () => {
  let detailOnly = 0;
  for (const dir of fs.readdirSync(LANES)) {
    const p = path.join(LANES, dir, "rows.json");
    if (!fs.existsSync(p)) continue;
    let parsed;
    try { parsed = JSON.parse(fs.readFileSync(p, "utf8")); } catch { continue; }
    for (const r of (Array.isArray(parsed) ? parsed : parsed.rows ?? [])) {
      for (const v of Object.values(r.proofObligations ?? {})) {
        if (!v || typeof v !== "object") continue;
        if (["PASS", "OK", ""].includes(String(v.result ?? ""))) continue;
        if (!v.finding && v.detail) detailOnly += 1;
      }
    }
  }
  assert.ok(detailOnly > 0, "if every lane now writes `finding`, retire this fallback deliberately rather than by attrition");
});

/*
 * A lane may write the obligation result as the value itself.
 *
 * VF49 wrote fifteen PASSes as `{ ROUTE_IDENTITY: "PASS", ... }` -- the
 * vocabulary, spelled correctly, just not wrapped in an object -- and lost BOTH
 * rows: the strict reader took only `v.result`, threw on undefined and refused
 * them. The asymmetry is what makes it a defect rather than a house style: the
 * harvest path already read that exact shape when the row FAILED, so the same
 * row was readable failing and unreadable passing. A passing row is the one
 * that moves a family.
 */
test("the strict reader accepts a bare vocabulary string as the result", () => {
  const src = fs.readFileSync(EXTRACTOR, "utf8");
  assert.match(src, /const resultOf = /, "one derivation, not a repeated ternary");
  assert.match(src, /typeof v === "string" \? v : undefined/, "a bare string must be read as the result");
  assert.doesNotMatch(src, /obligationFailed\(v\?\.result\)/, "the wrapped-only read must be gone");
  assert.match(src, /obligationFailed\(resultOf\(v\)\)/, "the failure test must go through resultOf");
});

test("a row written as bare strings is extracted, and its obligations are read", () => {
  const d = JSON.parse(fs.readFileSync(RETURNS, "utf8"));
  const bare = (d.rows ?? []).filter((r) => String(r.lane ?? "").toLowerCase() === "vf49");
  assert.equal(bare.length, 2, "VF49 wrote two rows as bare vocabulary strings; both must be extracted");
  const pass = bare.find((r) => r.verdict === "PASS_COMPLETE_INDEPENDENT");
  const fail = bare.find((r) => r.verdict === "FAIL_REPAIR_REQUIRED");
  assert.ok(pass, "the passing row must survive extraction -- it is the one that moves a family");
  assert.deepEqual(pass.unmeasuredObligations ?? [], [], "a fifteen-of-fifteen pass has no unmeasured obligation");
  assert.ok(fail, "the failing row must survive too");
  assert.ok((fail.failedObligations ?? []).length > 0, "the failing row must name its obligations");
});
