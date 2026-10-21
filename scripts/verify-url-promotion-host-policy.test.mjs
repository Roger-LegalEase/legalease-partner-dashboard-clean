#!/usr/bin/env node
// The URL promotion generator must get its host policy from the policy module.
//
// It used to scrape three constants out of rcap-acquire-official-source.mjs
// with regexes over that file's characters. The constants had since moved into
// scripts/lib/official-host-policy.mjs, so all three regexes came back empty:
// hostAllowed answered false for every host on earth, the generator refused 210
// of 242 URLs and produced zero promotion candidates, and it reported itself
// green while doing it. The official-source acquisition pipeline was silently
// dead.
//
// The failure happened to fail closed. The empty REFUSED_HOSTS is the half that
// would not have: had any suffix survived the scrape, www.uslegalforms.com
// would have passed the reseller check.
//
//   node --test scripts/verify-url-promotion-host-policy.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { hostAllowed, HOST_POLICY_VECTORS, ALLOWED_HOST_SUFFIXES, REFUSED_HOSTS } from "./lib/official-host-policy.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GEN = path.join(ROOT, "scripts/grade-a-packet-factory-24h/generate-url-promotion-candidates.mjs");
const SRC = fs.readFileSync(GEN, "utf8");
const OUT = path.join(ROOT, "data/rcap-grade-a/packet-factory-24h/SOURCE_URL_PROMOTION_CANDIDATES.json");

test("the generator imports the policy instead of scraping it", () => {
  assert.match(SRC, /from "\.\.\/lib\/official-host-policy\.mjs"/, "the one authority must be imported");
  assert.doesNotMatch(SRC, /exec\(acquireText\)/, "the scrape is back");
  assert.doesNotMatch(SRC, /const ALLOWED_HOST_SUFFIXES = \\\[\(/, "a regex over another script's source is not a policy");
  assert.doesNotMatch(SRC, /readFileSync\([^)]*rcap-acquire-official-source/, "the policy must not be read out of another script's text");
});

test("it defines no second hostAllowed of its own", () => {
  assert.doesNotMatch(SRC, /const hostAllowed = /, "two implementations of one policy is the defect this replaced");
});

test("the policy the generator now uses is not empty", () => {
  // The whole failure was three empty lists that nothing noticed.
  assert.ok(ALLOWED_HOST_SUFFIXES.length > 0, "an empty suffix list refuses every host in the world");
  assert.ok(REFUSED_HOSTS.size > 0, "an empty reseller list admits every reseller");
});

test("every one of the policy's own vectors holds", () => {
  for (const v of HOST_POLICY_VECTORS) {
    assert.equal(hostAllowed(v.host), v.allowed, `${v.host}: ${v.why}`);
  }
});

test("a government judiciary host on .gov is admitted", () => {
  // Each of these was refused by the empty scrape while sitting in committed
  // evidence, and one of them was already carried by the manifest.
  for (const h of ["www.txcourts.gov", "www.vtcourts.gov", "www.kycourts.gov", "ujs.sd.gov", "public.courts.alaska.gov"]) {
    assert.equal(hostAllowed(h), true, `${h} ends in the closed .gov namespace`);
  }
});

test("the written record names the policy module as its authority", () => {
  if (!fs.existsSync(OUT)) return; // nothing generated in this checkout
  const doc = JSON.parse(fs.readFileSync(OUT, "utf8"));
  assert.match(String(doc.hostPolicyAuthority), /official-host-policy\.mjs$/);
});

test("the generated record is not still reporting a dead pipeline", () => {
  if (!fs.existsSync(OUT)) return;
  const doc = JSON.parse(fs.readFileSync(OUT, "utf8"));
  const refusedForHost = (doc.refused ?? []).filter((r) => /is not an allowlisted official host/.test(String(r.why)));
  const govRefused = refusedForHost.filter((r) => { try { return new URL(r.url).hostname.endsWith(".gov"); } catch { return false; } });
  assert.deepEqual(govRefused.map((r) => r.url), [], "a .gov host refused as non-allowlisted means the policy is disconnected again");
});
