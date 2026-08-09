#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  adoptionRepinIsMeasurementOnly,
  buildCurrentCounselAdoptionRecords
} from "./lib/rcap-counsel-adoption.mjs";

const rootDir = path.resolve(process.cwd());
const args = new Set(process.argv.slice(2));
if (!args.has("--apply")) {
  throw new Error(
    "Recording counsel adoption requires the explicit --apply flag and a direct counsel instruction."
  );
}
const renewedApproval = args.has("--renewed-counsel-adoption");
// A third door, narrower than renewal and not a substitute for it.
//
// A shared-renderer correction moves the digests an adoption record measures
// without touching the document it adopts. With only "refuse" and
// "--renewed-counsel-adoption" available, the choices were to leave the record
// asserting digests nothing produces any more, or to claim a renewal that did
// not happen. This permits the re-pin when the difference is confined to
// measurement and an applicability record names the family — and refuses on
// anything else, including every field that carries legal meaning.
const standingApplicability = args.has("--standing-adoption-applicability");

const records = await buildCurrentCounselAdoptionRecords({ rootDir });
for (const [relativePath, record] of records) {
  const absolutePath = path.join(rootDir, relativePath);
  const serialized = `${JSON.stringify(record, null, 2)}\n`;
  if (fs.existsSync(absolutePath)) {
    const existing = fs.readFileSync(absolutePath, "utf8");
    const committed =
      spawnSync(
        "git",
        ["cat-file", "-e", `HEAD:${relativePath}`],
        { cwd: rootDir, encoding: "utf8" }
      ).status === 0;
    const measurementOnly =
      standingApplicability &&
      (() => {
        try {
          return adoptionRepinIsMeasurementOnly(
            rootDir,
            JSON.parse(existing),
            record
          );
        } catch {
          return false;
        }
      })();
    if (existing !== serialized && committed && !renewedApproval && !measurementOnly) {
      throw new Error(
        `${relativePath} differs from the current approved hashes; refusing to overwrite it without --renewed-counsel-adoption and a new direct counsel instruction.`
      );
    }
  }
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, serialized, "utf8");
  process.stdout.write(`${relativePath}\n`);
}
