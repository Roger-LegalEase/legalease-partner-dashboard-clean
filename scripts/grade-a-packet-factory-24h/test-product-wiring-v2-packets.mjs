#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "product-wiring-v2-"));

try {
  const scriptDir = path.join(sandbox, "scripts", "grade-a-packet-factory-24h");
  const queueDir = path.join(sandbox, "data", "rcap-grade-a", "packet-factory-24h");
  const familyDir = path.join(sandbox, "data", "families", "v2-packets-family");
  fs.mkdirSync(scriptDir, { recursive: true });
  fs.mkdirSync(queueDir, { recursive: true });
  fs.mkdirSync(path.join(familyDir, "reports"), { recursive: true });
  fs.mkdirSync(path.join(familyDir, "fixtures"), { recursive: true });

  fs.copyFileSync(
    path.join(repoRoot, "scripts", "grade-a-packet-factory-24h", "generate-product-wiring.mjs"),
    path.join(scriptDir, "generate-product-wiring.mjs")
  );
  fs.writeFileSync(path.join(queueDir, "MASTER_QUEUE.json"), JSON.stringify({ families: [{
    familyId: "v2-packets-family",
    jurisdiction: "HI",
    directory: "data/families/v2-packets-family",
    routeKeys: ["route:test"],
    implementationStrategy: "official_pdf_fill",
    instrumentKinds: ["primary_filing"],
    packetComponents: ["component:test"],
    sourceReadiness: { boundSources: [] },
    buildScript: "scripts/build-test.mjs"
  }] }));
  fs.writeFileSync(path.join(queueDir, "RASTER_QUEUE.json"), JSON.stringify({ rows: [] }));
  fs.writeFileSync(path.join(queueDir, "VERIFIER_RETURNS.json"), JSON.stringify({ rows: [] }));
  fs.writeFileSync(path.join(familyDir, "fixtures", "canonical.pdf"), "canonical bytes");
  fs.writeFileSync(path.join(familyDir, "reports", "rendered-artifacts.json"), JSON.stringify({
    schemaVersion: "rcap-rendered-artifacts/v2",
    familyId: "v2-packets-family",
    packets: [{
      fixture: "canonical",
      file: "data/families/v2-packets-family/fixtures/canonical.pdf",
      sha256: "0".repeat(64),
      documents: [{ documentId: "TEST-1", componentKinds: ["primary_filing"] }]
    }]
  }));

  const run = spawnSync(process.execPath, [path.join(scriptDir, "generate-product-wiring.mjs")], {
    cwd: sandbox,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  const wiringPath = path.join(familyDir, "product-wiring.json");
  assert.equal(fs.existsSync(wiringPath), true, "v2 packets must produce product-wiring.json");
  const wiring = JSON.parse(fs.readFileSync(wiringPath, "utf8"));
  assert.equal(wiring.proposedRepresentation.components.length, 1);
  assert.equal(wiring.proposedRepresentation.components[0].documentId, "TEST-1");
  console.log("PASS product wiring accepts rendered-artifacts/v2 packets");
} finally {
  fs.rmSync(sandbox, { recursive: true, force: true });
}
