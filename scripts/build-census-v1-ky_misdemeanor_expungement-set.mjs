#!/usr/bin/env node
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {checkKy, runKy} from './rcap-packet-recovery/ky-misdemeanor.mjs';

export {runKy as runFamily};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const value = key => args.includes(key) ? args[args.indexOf(key) + 1] : undefined;
  const known = new Set(['--check', '--out', '--input']);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!known.has(arg)) throw Error(`UNKNOWN_ARGUMENT: ${arg}`);
    if (arg === '--out' || arg === '--input') {
      if (!args[index + 1] || args[index + 1].startsWith('--')) throw Error(`MISSING_ARGUMENT_VALUE: ${arg}`);
      index += 1;
    }
  }
  if (check && value('--input')) throw Error('--check verifies existing artifacts and does not accept --input');
  const result = check
    ? await checkKy({outDir: value('--out')})
    : await runKy({outDir: value('--out'), inputFile: value('--input')});
  console.log(JSON.stringify(check ? result : {familyId: 'ky_misdemeanor_expungement-set', rendererExecuted: true, pdfs: result.length, pages: result.reduce((sum, packet) => sum + packet.pageCount, 0), rasterStatus: 'RASTER_PENDING'}, null, 2));
}
