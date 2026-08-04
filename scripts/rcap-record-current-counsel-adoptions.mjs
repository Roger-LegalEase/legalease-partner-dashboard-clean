#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
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
    if (existing !== serialized && committed && !renewedApproval) {
      throw new Error(
        `${relativePath} differs from the current approved hashes; refusing to overwrite it without --renewed-counsel-adoption and a new direct counsel instruction.`
      );
    }
  }
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, serialized, "utf8");
  process.stdout.write(`${relativePath}\n`);
}
