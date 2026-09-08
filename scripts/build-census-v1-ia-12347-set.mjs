#!/usr/bin/env node
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildFamily} from './rcap-packet-recovery/chat8/ia-12347.mjs';
export {buildFamily};
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.length&&!(args.length===2&&args[0]==='--out'))throw Error('Use no arguments or --out <directory>. --check is not a full build.');
 await buildFamily(args.length?{outDir:path.resolve(args[1])}:{});
}
