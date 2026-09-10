// Captain probe: does the relocated writeLaneRows() still publish rows for a
// family whose final-governance reconciliation did NOT happen in this process?
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import vm from 'node:vm';
const WV = process.argv[2];
if (!WV) throw new Error("usage: node lane-rows-publishes-unreconciled-siblings.probe.mjs <path to patched build-census-v1-wv_conv_multiple_misdemeanors-set.mjs>");
const src = fs.readFileSync(WV,'utf8');
const start = src.indexOf('function writeLaneRows() {');
const end = src.indexOf('\n/*\n * FIX-C/FIX03', start);
if (start < 0 || end < 0) throw new Error('could not slice writeLaneRows');
const slice = src.slice(start, end);

const root = fs.mkdtempSync(path.join(os.tmpdir(),'probe-lane-'));
const SPECS = {
  'wv_conv_multiple_misdemeanors-set': { directory: 'wv/multi', beforeUnclassifiedBlanks: 128 },
  'wv_conv_single_misdemeanor-set':    { directory: 'wv/single', beforeUnclassifiedBlanks: 99 }
};
const map = (form) => ({
  completenessRepair: { assignmentId: 'ASSIGN-1' },
  maps: [{ formNumber: form,
    canonicalWrites: [{field:'PetAdd1',factId:'f1',kind:'k'},{field:'Other',factId:'f2',kind:'k'}],
    canonicalRefusals: [{field:'B1',blankDisposition:'REQUIRED_BEFORE_FILING',reason:'r',participantInstructionId:'i1'}] }]
});
for (const [id, spec] of Object.entries(SPECS)) {
  fs.mkdirSync(path.join(root, spec.directory), { recursive: true });
  fs.writeFileSync(path.join(root, spec.directory, 'production-field-map.json'), JSON.stringify(map('SCA-C906')));
}
// The SECOND family is mid-suspension: its product-wiring.json holds NO current
// receipt because its own wrapper threw between suspendPacketReceipt() and
// completeStagedPacketGovernance(). Only the FIRST family was reconciled here.
fs.writeFileSync(path.join(root,'wv/single/product-wiring.json'), JSON.stringify({
  binding: { acceptanceReceiptWithdrawn: [{ why:'suspended while the WV multi-stage renderer runs',
    boundToCanonicalSha256:'a'.repeat(64), replacedByCanonicalSha256:null,
    withdrawnReceipt:{ boundToCanonicalSha256:'a'.repeat(64), workflowRunId:'run-1' } }] }
}));

const writeJson = (rel, value) => { const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`); };
const ctx = { fs, path, ROOT: root, ASSIGNMENT_ID: 'ASSIGN-1', BASE_SHA: 'base', DISPATCH_SHA: 'disp',
  LANE_OUT: 'lane', FAMILY_SPECS: SPECS, writeJson };
vm.runInNewContext(`(function(){${slice}\nwriteLaneRows();})()`, ctx);

const out = JSON.parse(fs.readFileSync(path.join(root,'lane/rows.json'),'utf8'));
console.log('rows published:', out.rows.length);
for (const r of out.rows) console.log(' ', r.itemId, r.status, r.result, 'countersAfter=', JSON.stringify(r.countersAfter));
fs.rmSync(root,{recursive:true,force:true});
