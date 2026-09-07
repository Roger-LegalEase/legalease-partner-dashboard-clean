#!/usr/bin/env node
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export {buildFamily} from './rcap-packet-recovery/chat8/ia-12346.mjs';
import {buildFamily} from './rcap-packet-recovery/chat8/ia-12346.mjs';
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const a=process.argv.slice(2);if(a.length&&!(a.length===2&&a[0]==='--out'))throw Error('Use no args or --out <directory>; not --check');
 await buildFamily(a.length?{outDir:path.resolve(a[1])}:{});
}
