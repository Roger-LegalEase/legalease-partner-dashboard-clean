#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "product-wiring-artifact-identity-"));
const familyId = "artifact-identity-family";
const otherFamilyId = "unselected-family";
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const initialArtifactBytes = `${familyId} original bytes`;

try {
  const scriptDir = path.join(sandbox, "scripts", "grade-a-packet-factory-24h");
  const queueDir = path.join(sandbox, "data", "rcap-grade-a", "packet-factory-24h");
  fs.mkdirSync(scriptDir, { recursive: true });
  fs.mkdirSync(queueDir, { recursive: true });
  /* The generator imports its byte-identity rule from a sibling module; the
   * sandbox must carry both or the generator cannot start and the test reads
   * an empty stdout as a wrong answer. */
  // Copy the actual static relative-import graph; do not mock admission rules.
  const copied = new Set();
  const copyModule = (rel) => {
    const absolute = path.resolve(repoRoot, rel);
    assert.ok(absolute.startsWith(repoRoot + path.sep), "dependency outside repository");
    if (copied.has(absolute)) return;
    copied.add(absolute);
    const source = fs.readFileSync(absolute, "utf8");
    const destination = path.join(sandbox, path.relative(repoRoot, absolute));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, source);
    for (const match of source.matchAll(/(?:from\s*|import\s*)["'](\.[^"']+)["']/g)) {
      copyModule(path.relative(repoRoot, path.resolve(path.dirname(absolute), match[1])));
    }
  };
  copyModule("scripts/grade-a-packet-factory-24h/generate-product-wiring.mjs");
  fs.symlinkSync(path.join(repoRoot, "node_modules"), path.join(sandbox, "node_modules"), "dir");

  const families = [familyId, otherFamilyId].map((id) => ({
    familyId: id,
    jurisdiction: "AK",
    directory: `data/families/${id}`,
    routeKeys: [`route:${id}`],
    implementationStrategy: "custom_pleading",
    instrumentKinds: [],
    packetComponents: [],
    sourceReadiness: { boundSources: [] },
    buildScript: `scripts/build-${id}.mjs`
  }));
  fs.writeFileSync(path.join(queueDir, "MASTER_QUEUE.json"), JSON.stringify({ families }));
  fs.writeFileSync(path.join(queueDir, "RASTER_QUEUE.json"), JSON.stringify({
    rows: [],
    historicalRasterRows: [{
      familyId,
      canonicalPdfPath: `data/families/${familyId}/fixtures/canonical.pdf`,
      canonicalPdfSha256: sha256(initialArtifactBytes),
      /* Every real row declares what it covers and whether that coverage is
       * complete; acceptance re-hashes only against a row that says so. */
      coverage: { complete: true, documents: ["canonical.pdf"], rastered: ["canonical.pdf"] },
      documents: [{ role: "canonical", name: "canonical.pdf", path: `data/families/${familyId}/fixtures/canonical.pdf`, sha256: sha256(initialArtifactBytes) }],
      rasterReceipt: {
        verdict: "RASTER_PASS",
        workflowRunId: "test-run",
        boundToCanonicalSha256: sha256(initialArtifactBytes),
        coversTheWholeFamily: true
      }
    }]
  }));
  fs.writeFileSync(path.join(queueDir, "VERIFIER_RETURNS.json"), JSON.stringify({ rows: [] }));

  for (const id of [familyId, otherFamilyId]) {
    const familyDir = path.join(sandbox, "data", "families", id);
    const fixtureRel = `data/families/${id}/fixtures/canonical.pdf`;
    const staleDigest = id === familyId
      ? "9f00da8f072069098dce0b465bbc242d5713730f5472a6f9d6a104699bd1428a"
      : "8".repeat(64);
    fs.mkdirSync(path.join(familyDir, "fixtures"), { recursive: true });
    fs.mkdirSync(path.join(familyDir, "reports"), { recursive: true });
    fs.writeFileSync(path.join(sandbox, fixtureRel), id === familyId ? initialArtifactBytes : `${id} original bytes`);
    fs.writeFileSync(path.join(familyDir, "reports", "rendered-artifacts.json"), JSON.stringify({
      schemaVersion: "rcap-rendered-artifacts/v1",
      familyId: id,
      pdfs: [{ fixture: "canonical", file: fixtureRel, sha256: staleDigest }]
    }));
    fs.writeFileSync(path.join(familyDir, "product-wiring.json"), JSON.stringify({
      schemaVersion: "rcap-census-v1-product-wiring/v1",
      family: id,
      generatedBy: "scripts/grade-a-packet-factory-24h/generate-product-wiring.mjs",
      proposedRepresentation: {
        note: "preserve this proposal",
        components: [{ componentId: `${id}-component-1`, file: fixtureRel, sha256: staleDigest }]
      }
    }, null, 2) + "\n");
  }

  const generator = path.join(scriptDir, "generate-product-wiring.mjs");
  const wiringPath = path.join(sandbox, "data", "families", familyId, "product-wiring.json");
  const otherWiringPath = path.join(sandbox, "data", "families", otherFamilyId, "product-wiring.json");
  const initialWiring = fs.readFileSync(wiringPath, "utf8");
  const initialOtherWiring = fs.readFileSync(otherWiringPath, "utf8");
  const run = (...args) => spawnSync(process.execPath, [generator, ...args], { cwd: sandbox, encoding: "utf8" });

  const staleCheck = run("--check", "--family", familyId);
  assert.equal(staleCheck.status, 1, staleCheck.stderr || staleCheck.stdout);
  assert.match(staleCheck.stdout, /1 record\(s\) need refresh/, staleCheck.stderr);
  assert.equal(fs.readFileSync(wiringPath, "utf8"), initialWiring, "--check must not rewrite stale wiring");

  const firstRefresh = run("--family", familyId);
  assert.equal(firstRefresh.status, 0, firstRefresh.stderr || firstRefresh.stdout);
  let wiring = JSON.parse(fs.readFileSync(wiringPath, "utf8"));
  const fixturePath = path.join(sandbox, wiring.proposedRepresentation.components[0].file);
  assert.equal(wiring.proposedRepresentation.components[0].sha256, sha256(fs.readFileSync(fixturePath)));
  assert.equal(wiring.proposedRepresentation.note, "preserve this proposal");
  assert.equal(wiring.binding.acceptanceReceipt.verdict, "RASTER_PASS", "an exact historical receipt stays bound");
  assert.equal(fs.readFileSync(otherWiringPath, "utf8"), initialOtherWiring, "--family must not touch another family");

  fs.writeFileSync(fixturePath, "artifact identity changed again");
  const movedBytesCheck = run("--check", "--family", familyId);
  assert.equal(movedBytesCheck.status, 1, movedBytesCheck.stderr || movedBytesCheck.stdout);

  const secondRefresh = run("--family", familyId);
  assert.equal(secondRefresh.status, 0, secondRefresh.stderr || secondRefresh.stdout);
  wiring = JSON.parse(fs.readFileSync(wiringPath, "utf8"));
  assert.equal(wiring.proposedRepresentation.components[0].sha256, sha256(fs.readFileSync(fixturePath)));
  assert.equal(wiring.binding.acceptanceReceipt, null, "a receipt for superseded bytes must not stay bound");
  assert.equal(run("--check", "--family", familyId).status, 0, "refreshed wiring must pass check mode");
  assert.equal(fs.readFileSync(otherWiringPath, "utf8"), initialOtherWiring, "unselected wiring must stay byte-identical");

  // Exercise the actual generator CLI with both exact AZ family/route bindings.
  // Synthetic bytes below test metadata identity only, never PDF acceptance.
  const azRoutes = {
    "az_record_sealing_arrest_no_charges-set": "obligation:track-pathway:AZ:az_record_sealing_arrest_no_charges:remedy-1-record-sealing",
    "az_record_sealing_dismissal_not_guilty-set": "obligation:track-only:AZ:az_record_sealing_dismissal_not_guilty"
  };
  let azCliChecks = 0;
  for (const [id, routeKey] of Object.entries(azRoutes)) {
    const f = { ...families[0], familyId:id, jurisdiction:"AZ", directory:`data/families/${id}`, routeKeys:[routeKey] };
    families.push(f);
    const dir = path.join(sandbox, f.directory);
    fs.mkdirSync(path.join(dir,"reports"),{recursive:true});
    fs.writeFileSync(path.join(dir,"reports/rendered-artifacts.json"),JSON.stringify({artifacts:[]}));
    const dest = path.join(dir,"product-wiring.json");
    fs.writeFileSync(dest,JSON.stringify({family:id,generatedBy:"scripts/grade-a-packet-factory-24h/generate-product-wiring.mjs",proposedRepresentation:{components:[]}}));
    const saveMaster = () => fs.writeFileSync(path.join(queueDir,"MASTER_QUEUE.json"),JSON.stringify({families}));
    saveMaster();
    const valid = run("--family",id); azCliChecks++;
    assert.equal(valid.status,0,valid.stderr);
    const exact = fs.readFileSync(dest,"utf8");
    const binding = JSON.parse(exact).binding;
    assert.equal(binding.filingCourtSelection.routeKey,routeKey);
    assert.equal(binding.filingCourtSelection.status,"IMPLEMENTED_NOT_INSTALLED");
    assert.equal(binding.filingCourtSelection.generationAllowed,false);
    assert.equal(binding.paymentEligible,false); assert.equal(binding.sponsorshipEligible,false);
    assert.equal(run("--check","--family",id).status,0); azCliChecks++;
    for (const bad of [["wrong-route"],[routeKey,"additional-route"],[]]) {
      f.routeKeys=bad;saveMaster();
      const refused=run("--family",id);azCliChecks++;
      assert.notEqual(refused.status,0,"Invalid AZ scope was silently skipped/accepted");
      assert.match(refused.stderr,/cannot broaden family route scope/);
      assert.equal(fs.readFileSync(dest,"utf8"),exact,"Refusal changed existing wiring");
    }
    f.routeKeys=[routeKey];saveMaster();
  }
  assert.equal(fs.readFileSync(otherWiringPath,"utf8"),initialOtherWiring);
  console.log(JSON.stringify({status:"PASS",artifactIdentityAndStaleReceiptRegression:true,azCliChecks,azSuccessfulCliChecks:4,azRejectedRouteScopes:6,unselectedFilesUnchanged:true,syntheticMetadataOnly:true,packetRebuilds:0}));
} finally {
  fs.rmSync(sandbox, { recursive: true, force: true });
}
