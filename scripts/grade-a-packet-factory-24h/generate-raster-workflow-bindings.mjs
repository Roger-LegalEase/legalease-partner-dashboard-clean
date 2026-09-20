import fs from 'node:fs';
import {BINDINGS_PATH, readRunProof, receiptDigest} from './raster-workflow-bindings.mjs';
const queue = JSON.parse(fs.readFileSync('data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json'));
const rows = queue.rows.filter(r => r.rasterReceipt && r.rasterReceipt.workflow === undefined)
  .map(row => ({familyId:row.familyId,receiptSha256:receiptDigest(row.rasterReceipt),proof:readRunProof(process.cwd(),row.rasterReceipt)}));
const bytes = JSON.stringify({schemaVersion:'rcap-raster-workflow-bindings/v1',
  generatedBy:'scripts/grade-a-packet-factory-24h/generate-raster-workflow-bindings.mjs',
  meaning:'Original run/job metadata authenticates missing legacy receipt workflow identity. No raster verdict, packet byte, or review is changed.',rows},null,2)+'\n';
if (process.argv.includes('--check')) {
  if (fs.readFileSync(BINDINGS_PATH,'utf8') !== bytes) throw new Error('Raster workflow bindings do not converge');
} else fs.writeFileSync(BINDINGS_PATH,bytes);
console.log(`PASS ${rows.length} original raster receipt workflow bindings`);
