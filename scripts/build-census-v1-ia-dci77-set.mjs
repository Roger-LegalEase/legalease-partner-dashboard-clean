#!/usr/bin/env node
import path from 'node:path';
import {buildFamily} from './rcap-packet-recovery/chat8/ia-dci77.mjs';
const args=process.argv.slice(2);let options={};
if(args.length){if(args.length!==2||args[0]!=='--out')throw Error('Usage: node scripts/build-census-v1-ia-dci77-set.mjs [--out directory]');options.outDir=path.resolve(args[1]);}
await buildFamily(options);
