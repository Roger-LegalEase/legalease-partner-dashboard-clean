#!/usr/bin/env node
// One actual native run, with independently retained candidate identities as
// the installation condition. No source/PDF reconstruction code lives here.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const ROOT = process.cwd();
const EVIDENCE = 'data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session08';
const FAMILY = 'md_10110_conviction-set';
const DIRECTORY = 'data/rcap-all50/overlays/census-v1/md/md-10110-conviction-set--official-pdf-fill';
const STAGE = 'inputs/md-conviction-native-stage';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const read = relative => fs.readFileSync(path.join(ROOT, relative));
const reportPath = EVIDENCE + '/md-conviction-native-installation.json';
assert(!fs.existsSync(path.join(ROOT, reportPath)), 'A native run is already recorded; do not repeat it automatically.');
assert(!fs.existsSync(path.join(ROOT, DIRECTORY)), 'Conviction destination exists; reconcile exact preimages first.');
assert(!fs.existsSync(path.join(ROOT, STAGE)), 'Existing stage may contain unique work; do not overwrite.');
const disk = fs.statfsSync(ROOT), diskBefore = disk.bavail * disk.bsize;
assert(diskBefore > 350 * 1024 ** 2 + 1024 ** 3, '350 MiB execution budget plus 1 GiB safety margin unavailable.');
assert.equal(digest(read('inputs/md-conviction-review-04.zip')), '0cef9b810ce1788235392e3089190fbc416e71b62ca67b01d43e0318eb02210b');
const vectorBytes = read(EVIDENCE + '/md-conviction-reviewed-input-hashes.json');
assert.equal(digest(vectorBytes), '4953be4b734be957f3c4dc7d6f81911bd3386bdccff0fc270386a6b54715592f');
const vector = JSON.parse(vectorBytes);
assert.equal(vector.length, 193); assert.equal(new Set(vector.map(file => file.path)).size, 193);
assert(vector.every(file => file.matchesManifest === true));
const expected = vector.filter(file => file.path.startsWith(DIRECTORY + '/'));
assert.equal(expected.length, 107);
const freshPaths = vector.filter(file => file.path.startsWith('reference/') || file.path.startsWith('scripts/'));
assert.equal(freshPaths.length, 8);
for (const file of freshPaths) {
  const bytes = read(file.path); assert.equal(bytes.length, file.bytes, file.path); assert.equal(digest(bytes), file.sha256, file.path);
}
const favorableFiles = JSON.parse(read('scripts/rcap-packet-completeness/md-reviewed-candidate-inputs.json')).files;
const preserved = favorableFiles.map(file => ({path: file.path, sha256: digest(read(file.path))}));
const command = [process.execPath, 'scripts/build-census-v1-md_10110_conviction-set.mjs', '--out', STAGE];
const start = new Date().toISOString();
const execution = spawnSync(command[0], command.slice(1), {cwd: ROOT, encoding: 'utf8', timeout: 180000, maxBuffer: 8 * 1024 * 1024});
const report = {schemaVersion: 'md-conviction-native-installation/v1', familyId: FAMILY,
  candidateCommit: '97f04c670d4a9c8a3915f5a71dc1893edb32489b', independentReviewCommit: '4bd14fa189824294fde0bd965dded8d3aa75e84e',
  authority: {reviewArchive: 'inputs/md-conviction-review-04.zip', reviewArchiveSha256: '0cef9b810ce1788235392e3089190fbc416e71b62ca67b01d43e0318eb02210b',
    inputVectorPath: EVIDENCE + '/md-conviction-reviewed-input-hashes.json', inputVectorSha256: digest(vectorBytes), retainedReviewedInputIdentities: vector.length,
    boundary: 'All193 identities are preserved from the independently reviewed candidate. The107 family files and8 code/source files are freshly hashed here;78 prior author-evidence/raster members are retained review evidence, not a fresh local rehash.'},
  transport: {largeCandidateDownloaded: false, largeCandidateSha256FromIndependentReview: 'a071ebc0a73057bbca87dc042db89fbe3c3e08866a9ac31b3065f1832b8658d9',
    failures: ['Streaming Drive fetch returned unsupported sediment URI.', 'Legacy raw response failed: code-mode IPC frame length88906102 exceeds67108864 bytes.', 'Unauthenticated direct Drive download returned907959-byte Google Drive: Sign-in HTML.'],
    sourceRecovery: 'Three individually transferred exact held PDFs verified against PR240 source hashes.'},
  nativeExecution: {command, startedAt: start, completedAt: new Date().toISOString(), exitCode: execution.status, signal: execution.signal,
    stdout: execution.stdout, stderr: execution.stderr, error: execution.error?.message ?? null, fullWrapperRuns: 1, checkMode: false},
  installed: false, stage: STAGE, mismatches: [], matchedFiles: [], diskBeforeBytes: diskBefore,
  runtimeInstalled: false, centralRasterAdmission: false, terminalPromotion: false, cannabisRefactorInstalled: false};
const writeReport = () => fs.writeFileSync(path.join(ROOT, reportPath), JSON.stringify(report, null, 2) + '\n');
if (execution.status !== 0) { writeReport(); throw Error('Native renderer failed; exact execution retained in ' + reportPath); }
const observedFiles = [];
function visit(directory, prefix = '') {
  for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
    assert(!entry.isSymbolicLink(), 'Stage contains symlink');
    const relative = prefix + entry.name;
    if (entry.isDirectory()) visit(path.join(directory, entry.name), relative + '/');
    else observedFiles.push(relative);
  }
}
visit(path.join(ROOT, STAGE));
const expectedNames = expected.map(file => file.path.slice(DIRECTORY.length + 1)).sort();
if (JSON.stringify(observedFiles.sort()) !== JSON.stringify(expectedNames)) report.mismatches.push({kind: 'file-set', expected: expectedNames, actual: observedFiles});
for (const file of expected) {
  const staged = path.join(ROOT, STAGE, file.path.slice(DIRECTORY.length + 1));
  if (!fs.existsSync(staged)) { report.mismatches.push({path: file.path, kind: 'missing'}); continue; }
  const bytes = fs.readFileSync(staged), actual = digest(bytes);
  if (bytes.length !== file.bytes || actual !== file.sha256) report.mismatches.push({path: file.path, expectedSha256: file.sha256, actualSha256: actual, expectedBytes: file.bytes, actualBytes: bytes.length});
  else report.matchedFiles.push({path: file.path, sha256: actual, bytes: bytes.length});
}
for (const file of preserved) assert.equal(digest(read(file.path)), file.sha256, 'Earlier favorable candidate changed: ' + file.path);
report.favorableInputsPreserved = preserved.length;
report.sourceAndCodeMatches = freshPaths.map(({path, sha256, bytes}) => ({path, sha256, bytes}));
if (report.mismatches.length) { writeReport(); throw Error('Candidate identity mismatch; no install. Stage and exact diagnostics preserved.'); }
assert.equal(report.matchedFiles.length, 107);
const index = JSON.parse(fs.readFileSync(path.join(ROOT, STAGE, 'reports/rendered-artifacts.json')));
assert.equal(index.pdfs.length, 25); assert.equal(index.pdfs.reduce((sum, pdf) => sum + pdf.pageCount, 0), 170);
assert.equal(index.pdfs.filter(pdf => pdf.diagnostic).length, 2);
// Rename on the same filesystem avoids a duplicate35MiB output tree.
fs.mkdirSync(path.dirname(path.join(ROOT, DIRECTORY)), {recursive: true});
fs.renameSync(path.join(ROOT, STAGE), path.join(ROOT, DIRECTORY));
report.installed = true; report.installedDirectory = DIRECTORY;
report.installedPdfs = 25; report.installedPages = 170; report.diagnostics = index.pdfs.filter(pdf => pdf.diagnostic).map(pdf => pdf.fixture);
const after = fs.statfsSync(ROOT); report.diskAfterBytes = after.bavail * after.bsize;
report.diskChangeBytes = report.diskBeforeBytes - report.diskAfterBytes;
writeReport();
console.log(JSON.stringify({installed: true, matchedFamilyFiles: report.matchedFiles.length, matchedSourceAndCodeFiles: freshPaths.length,
  fullWrapperRuns: 1, pdfs: 25, pages: 170, diagnosticPdfs: 2, reportPath}, null, 2));
