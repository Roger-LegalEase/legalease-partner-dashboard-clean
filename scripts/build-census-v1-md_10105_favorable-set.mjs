#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runMdFavorable } from './rcap-packet-recovery/chat5/md-favorable.mjs';
export { runMdFavorable as runFamily };
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.includes('--check')) throw new Error('--check is not regeneration; use the Chat5 test script for verification');
  for (let i = 0; i < args.length; i += 2) if (!['--out', '--input'].includes(args[i]) || !args[i + 1]) throw new Error('Usage: node scripts/build-census-v1-md_10105_favorable-set.mjs [--out DIR] [--input FACTS.json]');
  const option = flag => args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
  const records = await runMdFavorable({ outDir: option('--out'), inputFile: option('--input') });
  console.log(JSON.stringify({ familyId: 'md_10105_favorable-set', pdfs: records.length, pages: records.reduce((n, r) => n + r.pageCount, 0), rendererExecuted: true }));
}
