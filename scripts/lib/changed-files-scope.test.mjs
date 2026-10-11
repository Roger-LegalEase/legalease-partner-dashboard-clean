import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { changedFilesForScopeGuard } from "./changed-files-scope.mjs";

test("scope enumeration retains a committed inventory larger than 1 MiB and fails closed on Git errors", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-scope-buffer-"));
  const previousPath = process.env.PATH;
  const bin = path.join(root, "git");
  const files = Array.from({ length: 18000 }, (_, i) => `src/${String(i).padStart(6, "0")}/${"long-path-segment/".repeat(4)}page.tsx`);
  assert.ok(Buffer.byteLength(files.join("\n")) > 1024 * 1024);
  fs.writeFileSync(path.join(root, "paths.json"), JSON.stringify(files));
  fs.writeFileSync(bin, `#!${process.execPath}
const fs = require("node:fs");
const command = process.argv[2];
if (fs.existsSync(command + "-failure")) { process.stderr.write("injected git failure"); process.exit(1); }
if (command === "status") process.stdout.write(" M src/uncommitted.ts\\n");
else if (["rev-parse", "merge-base"].includes(command)) process.stdout.write("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\\n");
else if (command === "diff") process.stdout.write(JSON.parse(fs.readFileSync("paths.json")).join("\\n") + "\\n");
`, { mode: 0o700 });
  process.env.PATH = `${root}${path.delimiter}${previousPath}`;
  try {
    const failures = [];
    const result = changedFilesForScopeGuard({ rootDir: root, failures });
    assert.deepEqual(failures, []);
    assert.deepEqual(result.files, [...files, "src/uncommitted.ts"].sort());
    fs.writeFileSync(path.join(root, "status-failure"), "");
    const statusFailures = [];
    const statusResult = changedFilesForScopeGuard({ rootDir: root, failures: statusFailures });
    assert.match(statusFailures.join("\n"), /Could not enumerate working-tree changes: injected git failure/);
    assert.deepEqual(statusResult.files, files);
    fs.writeFileSync(path.join(root, "diff-failure"), "");
    const diffFailures = [];
    changedFilesForScopeGuard({ rootDir: root, failures: diffFailures });
    assert.match(diffFailures.join("\n"), /Could not diff HEAD.*injected git failure/);
  } finally {
    process.env.PATH = previousPath;
    fs.rmSync(root, { recursive: true, force: true });
  }
});
