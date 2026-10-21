// The deterministic archive recipe, shared by the acquirer and its test.
//
// The supplement is pinned by its archive digest, so two runs over the same
// documents must produce the same digest. Otherwise the digest pins the run --
// the machine, the clock, the uid that happened to build it -- rather than the
// bytes, and a consumer who rebuilds to check gets a mismatch that means
// nothing.
//
// Four things make tar output vary between runs over identical files: entry
// order, mtimes, ownership, and the timestamp gzip writes into its header.
// Fixing all four is the whole recipe.
//
// This lives apart from acquire-colorado-supplement.mjs so it can be exercised
// without a network and without giving the acquirer a mode that packages bytes
// it did not itself retrieve from the issuing court.

import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const BIG = 1024 * 1024 * 1024;

export const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

export const tarArgs = (stageDir, topLevel, mtimeEpoch) => [
  "--sort=name",
  "--format=pax",
  "--pax-option=exthdr.name=%d/PaxHeaders/%f,delete=atime,delete=ctime,delete=mtime",
  `--mtime=@${mtimeEpoch}`,
  "--owner=0",
  "--group=0",
  "--numeric-owner",
  "-C", stageDir,
  "-cf", "-",
  topLevel,
];

/**
 * Pack `stageDir/topLevel` into a gzipped tar whose digest depends only on the
 * files' names, modes and contents.
 *
 * @returns {{ bytes: Buffer, sha256: string }}
 */
export function packSupplement(stageDir, topLevel, mtimeEpoch) {
  const tarball = execFileSync("tar", tarArgs(stageDir, topLevel, mtimeEpoch), { maxBuffer: BIG });
  // -n keeps gzip from stamping the current time into the header, which would
  // otherwise change the digest on every run.
  const gz = execFileSync("gzip", ["-n", "-9"], { input: tarball, maxBuffer: BIG });
  return { bytes: gz, sha256: sha256(gz) };
}
