import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = 'data/rcap-grade-a/route-artifact-acceptance';
const OBLIGATIONS = ['ROUTE_IDENTITY', 'SOURCE_IDENTITY', 'COMPONENT_SET', 'KNOWN_PREFILLS',
  'REQUIRED_BEFORE_FILING', 'ROUTE_OPTIONS', 'REPEATING_ROWS', 'PROTECTED_FIELDS', 'ARTIFACTS',
  'PAGE_ORDER', 'CLIPPING_AND_OVERLAP', 'FILING_DESTINATION', 'FEE_AND_WAIVER', 'SERVICE', 'SELF_HELP_STOP'];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const registrationPath = family => `${DIR}/independent-registrations/${family}.json`;

// Explicit admission of an existing review. Neither this function nor its
// consumers issue a verdict, install a runtime route, or infer commercial rights.
export function reviewedRouteRegistration(reviewPath, options = {}) {
  const root = options.root ?? ROOT;
  const bytes = options.readBytes ?? (p => fs.readFileSync(path.join(root, p)));
  const read = p => JSON.parse(bytes(p));
  const pinned = options.pinnedBytes ?? ((commit, p) => execFileSync('git', ['show', `${commit}:${p}`],
    { cwd: root, maxBuffer: 32 * 1024 * 1024 }));
  const review = read(reviewPath);
  assert.equal(review.schemaVersion, 'rcap-route-artifact-independent-verifier-return/v1');
  assert.match(review.familyId, /^[A-Za-z0-9_-]+$/);
  assert.equal(review.verdict, 'PASS_COMPLETE_INDEPENDENT');
  assert.equal(review.verifier?.independent, true);
  assert.equal(review.verifier?.builtOrAuthoredThisFamily, false);
  assert.equal(review.verifier?.authoredRouteScopingMachinery, false);
  assert.ok(review.verifier.id);
  assert.deepEqual(review.failedObligations, []);
  assert.deepEqual(review.unmeasuredObligations, []);
  assert.equal(review.obligationsScored, OBLIGATIONS.length);
  for (const name of OBLIGATIONS) assert.equal(review.results?.[name]?.result, 'PASS', `${name} not independently passed`);
  assert.equal(review.route?.contractPacketFamily, review.familyId);
  assert.equal(review.route.unitOfDelivery, 'route_artifact');
  assert.match(review.reviewedAtBase, /^[0-9a-f]{40}$/);
  const proofPath = review.artifacts.originalEvidence;
  const proof = read(proofPath);
  assert.equal(proof.conclusion, 'success');
  assert.equal(proof.runId, review.artifacts.centralRasterRun);
  assert.equal(proof.inputs.commit_sha, review.reviewedAtBase);
  const runDir = path.posix.dirname(proofPath);
  const run = read(`${runDir}/run.json`);
  const jobs = read(`${runDir}/jobs.json`).jobs;
  assert.equal(run.id, proof.runId);
  assert.equal(run.status, 'completed');
  assert.equal(run.conclusion, 'success');
  assert.equal(run.path, '.github/workflows/rcap-packet-raster-acceptance-batch.yml');
  for (const name of ['Synthetic canary and live negative controls', 'Plan the family matrix'])
    assert.equal(jobs.find(j => j.name === name)?.conclusion, 'success', `missing central gate ${name}`);
  const queue = JSON.parse(pinned(review.reviewedAtBase, proof.inputs.raster_manifest_path));
  const master = read('data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json');
  const family = master.families.find(f => f.familyId === review.familyId);
  assert.ok(family, 'review family missing');
  const home = family.directory;
  const reportPath = `${home}/reports/rendered-artifacts.json`;
  const report = read(reportPath);
  const fieldMap = read(`${home}/production-field-map.json`);
  for (const file of [reportPath, `${home}/production-field-map.json`, `${home}/participant-instructions.md`, `${home}/source-receipt.json`])
    assert.equal(hash(bytes(file)), hash(pinned(review.reviewedAtBase, file)), `review context changed: ${file}`);
  const slugs = review.route.routeSlugs;
  assert.ok(slugs?.length);
  assert.equal(new Set(slugs).size, slugs.length, 'duplicate reviewed route');
  assert.deepEqual([...new Set(report.routeArtifacts.map(a => a.route))].sort(), [...slugs].sort(), 'review must cover the declared route scope');
  assert.deepEqual([...new Set(report.routeArtifacts.map(a => a.routeKey))].sort(), [...review.route.routeKeys].sort());
  assert.equal(review.route.artifactCount, slugs.length * 2);
  const determinism = read(review.determinismEvidence.evidencePath);
  assert.equal(hash(bytes(review.determinismEvidence.evidencePath)), review.determinismEvidence.evidenceSha256);
  assert.equal(determinism.familyId, review.familyId);
  const boundInputs = [reportPath, `${home}/production-field-map.json`, `${home}/participant-instructions.md`,
    `${home}/source-receipt.json`, proofPath, `${runDir}/run.json`, `${runDir}/jobs.json`,
    review.determinismEvidence.evidencePath];
  const bindings = slugs.map(route => {
    const row = queue.rows.find(r => r.packetFamilyId === review.familyId && r.route === route);
    assert.ok(row, `route not enrolled: ${route}`);
    assert.ok(review.route.routeKeys.includes(row.routeKey));
    const evidence = proof.families.find(f => f.familyId === row.familyId);
    assert.ok(evidence, `no original evidence for ${route}`);
    assert.equal(evidence.packetCommit, review.reviewedAtBase);
    const job = jobs.find(j => j.id === evidence.jobId && j.name === row.familyId);
    assert.equal(job?.run_id, proof.runId);
    assert.equal(job?.status, 'completed');
    assert.equal(job?.conclusion, 'success');
    assert.ok(job.steps.some(s => s.name === 'Refuse a modified packet byte' && s.conclusion === 'success'));
    assert.equal(evidence.artifact.workflow_run.id, proof.runId);
    assert.equal(evidence.artifact.digest, `sha256:${evidence.archiveSha256}`);
    const verdict = read(evidence.verdictPath);
    boundInputs.push(evidence.verdictPath);
    assert.equal(verdict.verdict, 'RASTER_PASS');
    assert.equal(verdict.familyId, row.familyId);
    assert.equal(String(verdict.workflowRunId), String(proof.runId));
    assert.equal(verdict.packetCommitSha, review.reviewedAtBase);
    assert.equal(verdict.documentsDigest, row.documentsDigest);
    assert.deepEqual(verdict.problems, []);
    assert.deepEqual(verdict.environmentProblems, []);
    assert.equal(verdict.packetPdfsModified, 0);
    assert.equal(verdict.coversTheWholeFamily, true);
    assert.deepEqual(verdict.documentsRendered, row.documents.map(d => ({role:d.role, document:d.name, path:d.path, pinned:d.sha256})));
    const fixtures = ['canonical', 'boundary'].map(fixture => {
      const declared = report.routeArtifacts.filter(a => a.route === route && a.fixture === fixture);
      assert.equal(declared.length, 1, 'missing or duplicate declared fixture');
      const artifact = declared[0];
      const queued = row.documents.filter(d => d.role === fixture);
      assert.equal(queued.length, 1);
      const d = queued[0];
      assert.equal(artifact.routeKey, row.routeKey);
      assert.equal(artifact.file, d.path);
      assert.equal(artifact.sha256, d.sha256);
      assert.equal(hash(bytes(d.path)), d.sha256, 'current PDF differs from reviewed PDF');
      assert.equal(hash(pinned(review.reviewedAtBase, d.path)), d.sha256, 'review pin differs from dispatched PDF');
      assert.equal(artifact.pageCount, d.pageCount);
      assert.equal(bytes(d.path).length, artifact.byteLength);
      for (const name of ['committedPdfInventory', 'pass1PdfInventory', 'pass2PdfInventory']) {
        const measured = determinism[name]?.find(p => p.path === d.path);
        assert.equal(measured?.sha256, d.sha256, 'independent rebuild evidence binds different bytes');
        assert.equal(measured?.bytes, artifact.byteLength);
      }
      assert.ok(artifact.components.length > 0);
      for (const component of artifact.components)
        assert.equal(fieldMap.componentRoutes[component], row.routeKey, 'foreign component in route artifact');
      const pages = verdict.measurements.filter(m => m.document === d.name);
      assert.equal(pages.length, d.pageCount);
      assert.deepEqual(pages.map(m => m.page).sort((a,b) => a-b), Array.from({length:d.pageCount}, (_,i) => i+1));
      assert.ok(pages.every(m => m.nonblank && m.croppedToThePage && m.calibrationResidualPx <= 1.5));
      return { fixture, file:d.path, sha256:d.sha256, pageCount:d.pageCount, components:artifact.components };
    });
    assert.equal(verdict.pagesMeasured, fixtures.reduce((n,f) => n+f.pageCount, 0));
    return { familyId:review.familyId, route, routeKey:row.routeKey, unitOfDelivery:'route_artifact', fixtures,
      independentVerification:{verdict:review.verdict, reviewer:review.verifier.id, reviewedAtBase:review.reviewedAtBase,
        evidence:reviewPath, sha256:hash(bytes(reviewPath))},
      rasterReceipt:{workflowRunId:String(proof.runId), jobId:String(job.id), artifactId:String(evidence.artifact.id),
        artifactDigest:evidence.artifact.digest, verdictPath:evidence.verdictPath, documentsDigest:row.documentsDigest},
      paymentEligible:false, sponsorshipEligible:false, runtimeInstalled:false };
  });
  return {schemaVersion:'rcap-route-review-registration/v1', familyId:review.familyId, reviewPath,
    reviewSha256:hash(bytes(reviewPath)), boundInputs:[...new Set(boundInputs)].map(file => ({file, sha256:hash(bytes(file))})),
    bindings, createsCommercialAuthority:false, changesFamilyVerdict:false};
}

export function registeredRouteBindings(family, options = {}) {
  const root = options.root ?? ROOT;
  const file = registrationPath(family);
  if (!fs.existsSync(path.join(root, file))) return [];
  const saved = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  const current = reviewedRouteRegistration(saved.reviewPath, options);
  assert.deepEqual(saved, current, `stale route-review registration: ${family}`);
  return current.bindings.map(binding => ({...binding, registration:file}));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf('--review');
  assert.ok(i >= 0 && process.argv[i+1], 'usage: route-review-registration.mjs --review PATH [--check]');
  const result = reviewedRouteRegistration(process.argv[i+1]);
  const target = path.join(ROOT, registrationPath(result.familyId));
  if (process.argv.includes('--check')) assert.deepEqual(JSON.parse(fs.readFileSync(target, 'utf8')), result);
  else { fs.mkdirSync(path.dirname(target), {recursive:true}); fs.writeFileSync(target, JSON.stringify(result,null,2)+'\n'); }
  console.log(`${result.familyId}: ${result.bindings.length} exact route reviews registered; no runtime or commercial authority created`);
}
