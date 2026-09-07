#!/usr/bin/env node
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildFamily as buildOriginal,ROOT,OUTPUT} from './rcap-packet-recovery/chat8/ia-901c3.mjs';
import {writeForm2Inventory} from './rcap-packet-recovery/chat8/ia-901c3-inventory-v2.mjs';
export async function buildFamily(options={}) {
  const packets=await buildOriginal(options);
  await writeForm2Inventory(options.outDir??path.join(ROOT,OUTPUT));
  return packets;
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const args=process.argv.slice(2);
  if(args.length && !(args.length===2 && args[0]==='--out')) throw new Error('Use no arguments or --out <directory>. --check is not a full build.');
  await buildFamily(args.length?{outDir:path.resolve(args[1])}:{});
}
