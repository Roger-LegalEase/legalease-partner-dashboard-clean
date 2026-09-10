#!/usr/bin/env node
/*
 * Regression suite for the leading-background-fill normaliser.
 *
 * Every case here is a real stream measured out of a pinned source or a
 * delivered fixture in this repository. Each of the three bugs this normaliser
 * has carried published an official form's own ink as invented, whose remedy
 * REMOVES it -- so each is pinned by a test that fails if the bug returns.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { skeleton } from "./stroke-fill-skeleton.mjs";

const b = (text) => Buffer.from(text, "latin1");

/* MC-227B, the Michigan human-trafficking set-aside application. The /Off
 * appearance for `posnoticecheck`, 64 bytes, and the delivered stream on page 3
 * of both mi_setaside_trafficking-set fixtures, 37 bytes. */
const MC227B_OFF = "q\n1 g\n0 0 8.2573 12.2473 re\nf\n0 G\n0 w\n0 0 8.2573 12.2473 re\ns\nQ\n";
const MC227B_DELIVERED = "q\n\n0 G\n0 w\n0 0 8.2573 12.2473 re\ns\nQ\n";

test("bug 3: a preamble kept on one side and consumed on the other split the pair", () => {
  const source = skeleton(b(MC227B_OFF));
  const delivered = skeleton(b(MC227B_DELIVERED));
  assert.equal(source.changed, true, "the source stream carries a leading fill");
  assert.equal(delivered.changed, false, "the delivered stream has none left to strip");
  assert.equal(source.sha256, delivered.sha256,
    "the delivered stream IS MC-227B's own /Off appearance minus its fill");
});

test("the re-emitted preamble does not fuse to the operator after it", () => {
  assert.equal(skeleton(b(MC227B_OFF)).normalised, "q 0 G 0 w 0 0 8.2573 12.2473 re s Q");
});

test("white is stripped, and so is grey -- the colour was never the bug", () => {
  const white = "q\n1 g\n0 0 8 12 re\nf\n0 G\n0 0 8 12 re\ns\nQ\n";
  const grey = "q\n0.749023 g\n0 0 8 12 re\nf\n0 G\n0 0 8 12 re\ns\nQ\n";
  assert.equal(skeleton(b(white)).changed, true);
  assert.equal(skeleton(b(grey)).changed, true);
  assert.equal(skeleton(b(white)).sha256, skeleton(b(grey)).sha256,
    "two fills of different colours leave the same drawing behind them");
});

test("bug 1: whitespace left where a fill was excised does not split the pair", () => {
  const source = "0.749023 g\n0 0 8 12 re\nf\n0 G\n0 0 8 12 re\ns\n";
  const delivered = "\n\n\n0 G\n0 0 8 12 re\ns\n";
  assert.equal(skeleton(b(source)).sha256, skeleton(b(delivered)).sha256);
});

test("bug 2: a fill behind a q/gs/w preamble is still found", () => {
  const withPreamble = "q\n/GS0 gs\n0.25 w\n1 g\n0 0 8 12 re\nf\n0 G\n0 0 8 12 re\ns\nQ\n";
  assert.equal(skeleton(b(withPreamble)).changed, true);
  assert.equal(skeleton(b(withPreamble)).normalised, "q /GS0 gs 0.25 w 0 G 0 0 8 12 re s Q");
});

test("rgb and separation fills are recognised as well as grey", () => {
  for (const fill of ["1 1 1 rg", "/CS0 cs 1 1 1  scn"]) {
    assert.equal(skeleton(b(`${fill}\n0 0 8 12 re\nf\n0 G\n0 0 8 12 re\ns\n`)).changed, true, fill);
  }
});

test("a fill that is not leading is left alone -- it is drawing, not background", () => {
  const midStream = "0 G\n0 0 8 12 re\nS\n1 g\n2 2 4 4 re\nf\n";
  const s = skeleton(b(midStream));
  assert.equal(s.changed, false);
  assert.equal(s.normalised, "0 G 0 0 8 12 re S 1 g 2 2 4 4 re f");
});

test("a stream with no fill at all is unchanged but for whitespace", () => {
  const s = skeleton(b("0 G\n0 w\n0 0 8 12 re\ns\n"));
  assert.equal(s.changed, false);
  assert.equal(s.normalised, "0 G 0 w 0 0 8 12 re s");
});

test("two different drawings do not collide once their fills are gone", () => {
  const a = skeleton(b("1 g\n0 0 8 12 re\nf\n0 G\n0 0 8 12 re\ns\n"));
  const c = skeleton(b("1 g\n0 0 8 12 re\nf\n0 G\n1 1 6 10 re\ns\n"));
  assert.notEqual(a.sha256, c.sha256, "the normaliser must not erase the drawing itself");
});
