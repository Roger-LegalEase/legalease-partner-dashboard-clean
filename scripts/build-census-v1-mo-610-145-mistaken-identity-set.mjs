#!/usr/bin/env node
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {buildFamily, buildPacket, importFacts} from './rcap-packet-recovery/chat7/mistaken-identity.mjs';
export {buildFamily, buildPacket, importFacts};
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.some(x=>!['--no-raster'].includes(x)))throw Error('Usage: node scripts/build-census-v1-mo-610-145-mistaken-identity-set.mjs [--no-raster]. This always performs a FULL build; central raster is separate.');
 const result=await buildFamily();console.log(JSON.stringify({familyId:result.familyId,variants:result.variants.length,pages:result.variants.reduce((n,x)=>n+x.pages,0),status:result.status,rasterAdmission:result.rasterAdmission},null,2));
}
