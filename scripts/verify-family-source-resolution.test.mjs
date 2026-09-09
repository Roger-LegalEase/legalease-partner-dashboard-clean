#!/usr/bin/env node
// A form number is a label; a digest is an identity.
//
// familySources' form-number tier asked the committed corpus index one
// question — which entry carries this exact formNumber string — and called a
// source unresolvable when nothing answered. That is right when the document is
// absent and wrong when it is held under no declared number, which is true of an
// entire custody: all 380 nationwide_recovery_pool_2026_09_02 entries carry
// formNumber null, because the pool was recovered as human-named files rather
// than under the STATE__FORM__NUMBER__slug convention the other 604 entries
// follow. Every pool-held document was therefore unresolvable by construction —
// and the pool was mounted precisely to unblock these families. PF14 hit it on
// mo-art-xiv-marijuana-set and stopped the row BLOCKED_SOURCE while FI-05's
// bytes sat mounted and byte-exact. All 15 affected families measured
// UNRESOLVABLE before this repair.
//
// The repair does not trust MASTER_QUEUE's pin on its own — PF14 was right that
// "a hash recorded in a generated queue is not a committed source identity". It
// uses the pin to ask the committed index a better question: which entry has
// these bytes. That is why the refusals below must survive.
//
//   node --test scripts/verify-family-source-resolution.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VERIFIER = path.join(ROOT, "scripts/verify-packet-build-environment.mjs");

/** How family_sources_bind classified one family, from the verifier itself. */
const classify = (family) => {
  let out = "";
  try {
    out = execFileSync(process.execPath, [VERIFIER, "--family", family], { cwd: ROOT, encoding: "utf8" });
  } catch (e) {
    out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }
  const line = out.split("\n").find((l) => l.includes("family_sources_bind")) ?? "";
  if (line.includes("do not resolve to exactly one committed index entry")) return "UNRESOLVABLE";
  if (line.includes("do not bind")) return "DOES_NOT_BIND";
  if (line.includes("bind by exact SHA-256")) return "BINDS";
  return `UNRECOGNIZED: ${line.trim()}`;
};

test("a pool-held source with no declared form number resolves through its confirmed pin", () => {
  // FI-05 is "LegalEase Missouri/Conf Case Filing Info Sheet(FI-05).pdf",
  // sha256 53f1e04e…, a committed index entry whose formNumber is null.
  assert.equal(classify("mo-art-xiv-marijuana-set"), "BINDS");
});

test("the same repair reaches the other states the pool unblocked", () => {
  for (const f of ["wv_conv_nonviolent_felony-set", "ga-nonconv-pre2013-set", "ks-21-6614-conviction-set"]) {
    assert.equal(classify(f), "BINDS", f);
  }
});

test("a form number no pin can confirm against the index is still refused", () => {
  // ks-22-2410-arrest-set names three forms; two have neither an index entry
  // carrying the number nor a queue pin matching a committed entry by digest.
  assert.equal(classify("ks-22-2410-arrest-set"), "UNRESOLVABLE");
  assert.equal(classify("ks-22-4908-registration-relief-set"), "UNRESOLVABLE");
});

test("resolving an identity is not the same as holding the bytes", () => {
  // These five now resolve every source identity and fail honestly on bytes
  // that are not held in this container — a different answer from "no such
  // form", and the one the operator needs.
  for (const f of ["mo-610-140-arrest-set", "mo-610-140-conviction-set", "mo-610-145-mistaken-identity-set"]) {
    assert.equal(classify(f), "DOES_NOT_BIND", f);
  }
});

test("the pin is a lead, never a verdict", () => {
  const src = fs.readFileSync(VERIFIER, "utf8");
  const helper = src.slice(src.indexOf("function queuePin("), src.indexOf("function familySources("));
  assert.match(helper, /return \/\^\[0-9a-f\]\{64\}\$\/\.test\(digest\) \? digest : null;/, "queuePin returns a digest, never a source");
  assert.doesNotMatch(helper, /sources\.push/, "queuePin must not resolve a source by itself");
  // And the caller must confirm it against the committed index before use.
  const tier = src.slice(src.indexOf("const pinned = queuePin("), src.indexOf("unresolvable.push({"));
  assert.match(tier, /index\.entries\.filter\(\(e\) => e\.sha256 === pinned\)/, "the pin must be confirmed against the committed index");
});

test("the recovery pool is the custody this repair exists for", () => {
  const idx = JSON.parse(fs.readFileSync(path.join(ROOT, "data/rcap-all50/local-source-corpus-index.json"), "utf8"));
  const pool = idx.entries.filter((e) => e.custody === "nationwide_recovery_pool_2026_09_02");
  assert.ok(pool.length > 0, "the pool must be in the committed index");
  assert.equal(pool.filter((e) => e.formNumber).length, 0, "no pool entry declares a form number");
  const others = idx.entries.filter((e) => e.custody !== "nationwide_recovery_pool_2026_09_02");
  assert.ok(others.filter((e) => e.formNumber).length / others.length > 0.9, "every other custody declares them");
});
