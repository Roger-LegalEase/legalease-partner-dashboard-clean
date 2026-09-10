import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildersWithAFlagGatedSelfTest } from "./verify-builder-self-tests-run.mjs";

/*
 * The discovery half of the checker, on fixtures rather than on the corpus.
 *
 * The checker finds its own scope by reading builder sources, not from a list,
 * so that a builder which grows a flag-gated selfTest is covered the day it
 * does. That only holds if the reading is right, and the reading is what these
 * fixtures exercise: a temporary scripts directory holding one builder per
 * shape, with nothing from the real corpus involved.
 *
 * RCAP_SELF_TEST_ROOT is the environment variable the checker resolves its ROOT
 * from, so the staged root is set there too: a test that pointed the function at
 * a temporary directory while the module still resolved the repository would be
 * reading the corpus without saying so.
 */
const stage = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "builder-self-tests-"));
  fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
  return root;
};
const builder = (root, name, source) =>
  fs.writeFileSync(path.join(root, "scripts", name), source);
const scopeOf = (root) => {
  const previous = process.env.RCAP_SELF_TEST_ROOT;
  process.env.RCAP_SELF_TEST_ROOT = root;
  try {
    return buildersWithAFlagGatedSelfTest(path.join(root, "scripts"));
  } finally {
    if (previous === undefined) delete process.env.RCAP_SELF_TEST_ROOT;
    else process.env.RCAP_SELF_TEST_ROOT = previous;
  }
};

/* The defect this checker exists for: assertions that protect a delivered
 * artifact, reachable only through a flag nothing passes. */
const FLAG_GATED = `import assert from "node:assert/strict";
async function build() { /* writes the packet */ }
function selfTest() {
  assert.equal(1, 1, "a delivered-output invariant");
  assert.ok(true, "another one");
  if (false) throw new Error("and a third");
}
if (process.argv.includes("--self-test")) selfTest();
else await build();
`;

/* A builder that never wrote a selfTest at all. Nothing is dormant here. */
const NO_SELF_TEST = `import assert from "node:assert/strict";
async function build() {
  assert.ok(true, "asserted in the build path, where it runs");
}
await build();
`;

/* A builder whose assertions run on every build. It needs no flag to reach
 * them, so it declares none: there is nothing here for the checker to run. */
const CALLED_UNCONDITIONALLY = `import assert from "node:assert/strict";
function selfTest() {
  assert.equal(1, 1, "a delivered-output invariant");
  assert.ok(true, "another one");
}
async function build() {
  selfTest();
}
await build();
`;

/* The shape this lane left behind on the builders it repaired: the assertions
 * moved into a named function the build path calls, and selfTest kept as a thin
 * wrapper so --self-test still audits the committed tree. The wrapper holds no
 * assertions, so the builder is out of scope -- which is the point. */
const GUARD_MOVED_OUT = `import assert from "node:assert/strict";
function assertDeliveredPacket() {
  assert.equal(1, 1, "a delivered-output invariant");
  assert.ok(true, "another one");
}
async function build() {
  assertDeliveredPacket();
}
function selfTest() {
  assertDeliveredPacket();
  console.log("self-test passed");
}
if (process.argv.includes("--self-test")) selfTest();
else await build();
`;

test("a builder whose assertions are reachable only through --self-test is found", () => {
  const root = stage();
  builder(root, "build-census-v1-flag-gated-set.mjs", FLAG_GATED);
  const scope = scopeOf(root);
  assert.deepEqual(scope.map((row) => row.builder), ["build-census-v1-flag-gated-set.mjs"]);
  /* Counted, not merely detected: the count is what the checker reports as the
   * size of the dormant surface, so a body it mis-measures is a number nobody
   * should believe. Three assertion-shaped statements sit in that selfTest. */
  assert.equal(scope[0].assertions, 3);
});

test("a builder with no selfTest is not found", () => {
  const root = stage();
  builder(root, "build-census-v1-no-self-test-set.mjs", NO_SELF_TEST);
  assert.deepEqual(scopeOf(root), []);
});

test("a builder whose selfTest is called unconditionally is not found", () => {
  const root = stage();
  builder(root, "build-census-v1-unconditional-set.mjs", CALLED_UNCONDITIONALLY);
  assert.deepEqual(scopeOf(root), []);
});

test("a builder whose guard has moved into the build path is not found", () => {
  const root = stage();
  builder(root, "build-census-v1-guard-moved-set.mjs", GUARD_MOVED_OUT);
  assert.deepEqual(scopeOf(root), []);
});

test("the three shapes together: only the dormant one is in scope", () => {
  const root = stage();
  builder(root, "build-census-v1-flag-gated-set.mjs", FLAG_GATED);
  builder(root, "build-census-v1-no-self-test-set.mjs", NO_SELF_TEST);
  builder(root, "build-census-v1-unconditional-set.mjs", CALLED_UNCONDITIONALLY);
  builder(root, "build-census-v1-guard-moved-set.mjs", GUARD_MOVED_OUT);
  assert.deepEqual(scopeOf(root).map((row) => row.builder), ["build-census-v1-flag-gated-set.mjs"]);
});

test("only build-census-v1 builders are read, and a helper beside them is left alone", () => {
  const root = stage();
  builder(root, "build-census-v1-flag-gated-set.mjs", FLAG_GATED);
  /* Same dormant shape, different name. The checker's subject is the packet
   * builders; a verifier or helper carrying a selfTest is not one. */
  builder(root, "verify-something.mjs", FLAG_GATED);
  builder(root, "summarize-readiness-steps.mjs", FLAG_GATED);
  assert.deepEqual(scopeOf(root).map((row) => row.builder), ["build-census-v1-flag-gated-set.mjs"]);
});

test("a selfTest declared as a const is found too", () => {
  const root = stage();
  builder(root, "build-census-v1-const-form-set.mjs", `import assert from "node:assert/strict";
const selfTest = () => {
  assert.equal(1, 1, "a delivered-output invariant");
};
if (process.argv.includes("--self-test")) selfTest();
`);
  const scope = scopeOf(root);
  assert.deepEqual(scope.map((row) => row.builder), ["build-census-v1-const-form-set.mjs"]);
  assert.equal(scope[0].assertions, 1);
});

test("a flag-gated selfTest holding no assertions is not counted as a dormant guard", () => {
  const root = stage();
  builder(root, "build-census-v1-empty-self-test-set.mjs", `function selfTest() {
  console.log("nothing is asserted here");
}
if (process.argv.includes("--self-test")) selfTest();
`);
  assert.deepEqual(scopeOf(root), []);
});

test("an empty scripts directory yields an empty scope rather than throwing", () => {
  assert.deepEqual(scopeOf(stage()), []);
});
