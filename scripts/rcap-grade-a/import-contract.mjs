// Import the owner's complete contract without inventing acceptance results.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const [sourcePath, outputDirectory] = process.argv.slice(2);
if (!sourcePath || !outputDirectory) throw new Error('Usage: node scripts/rcap-grade-a/import-contract.mjs <owner-plan.md> <evidence-directory>');
const source = fs.readFileSync(sourcePath, 'utf8');
const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const controls = [], cases = [], gaps = [];
let section = '', sourceRows = 0;
for (const [index, line] of source.split('\n').entries()) {
  if (/^#{1,6} /.test(line)) section = line.replace(/^#+ /, '');
  if (!line.startsWith('| ')) continue;
  const [identifier, ...columns] = line.split('|').slice(1, -1).map(value => value.trim());
  const match = /^([APCU]\d{2})-(\d{2})(?:[–-](\d{2}))?$/.exec(identifier);
  const origin = { sourceEntry: identifier, sourceLine: index + 1, section, contract: columns };
  if (match) {
    sourceRows++;
    for (let number = Number(match[2]); number <= Number(match[3] ?? match[2]); number++) {
      controls.push({ controlId: `${match[1]}-${String(number).padStart(2, '0')}`, ...origin,
        actualRoute: null, actor: null, stateVariant: null, currentLabel: null, targetLabel: columns[0],
        precondition: null, capability: null, handler: null, serverOperation: null, dataAuthority: null,
        successReadback: null, failureCopy: null, nextDestination: null, testCase: [], evidence: [],
        disposition: null, result: 'NOT_RUN', sourceSha });
    }
  } else if (/^[APCU]-T\d{2}$/.test(identifier)) {
    cases.push({ caseId: identifier, ...origin, actor: null, fixture: null, initialServerState: null,
      browser: null, viewport: null, locale: null, actions: [], expected: columns[1], observed: null,
      evidence: [], readback: null, result: 'NOT_RUN', issue: null, sourceSha });
  } else if (/^G-\d{2}$/.test(identifier)) {
    gaps.push({ gapId: identifier, ...origin, status: 'PENDING_RECONCILIATION', before: null,
      after: null, evidence: [], sourceSha });
  }
}
if (sourceRows !== 411 || controls.length !== 417 || new Set(controls.map(row => row.controlId)).size !== 417 || cases.length !== 103 || gaps.length !== 21) {
  throw new Error('Owner contract inventory differs: inspect the source before importing');
}
fs.mkdirSync(outputDirectory, { recursive: true });
const writeOnce = (name, value, jsonl = false) => {
  const destination = path.join(outputDirectory, name);
  if (fs.existsSync(destination)) throw new Error(`Preserving existing evidence: ${destination}`);
  fs.writeFileSync(destination, (jsonl ? value.map(row => JSON.stringify(row)).join('\n') : JSON.stringify(value, null, 2)) + '\n');
};
writeOnce('control-ledger.jsonl', controls, true);
writeOnce('acceptance-ledger.jsonl', cases, true);
writeOnce('ux-gap-ledger.json', gaps);
writeOnce('manifest.json', {
  status: 'IN_PROGRESS', createdAt: new Date().toISOString(),
  branch: execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim(),
  baselineSha: sourceSha, controllingPlan: { path: path.resolve(sourcePath), sha256: createHash('sha256').update(source).digest('hex') },
  inventory: { sourceTableEntries: sourceRows, individualControlIds: controls.length, explanation: 'A04-27–33 is one source table entry containing seven individual Spanish fields.', scenarios: cases.length, gaps: gaps.length },
  finalCampaign: { status: 'NOT_RUN', sourceSha: null }, ownerProductionAcceptance: 'PENDING', productionReleaseAuthorizedForThisIntegration: false,
});
console.log(JSON.stringify({ sourceTableEntries: sourceRows, individualControls: controls.length, scenarios: cases.length, gaps: gaps.length, outputDirectory }));
