#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {ROOT,ROUTES,buildFamily} from './mo-610-140-packet-host.mjs';
const KIND='conviction';
const route=ROUTES[KIND];
const cliArgs=process.argv.slice(2);for(const arg of cliArgs)if(arg!=='--no-raster')throw Error(`UNSUPPORTED_ARGUMENT:${arg}`);
process.argv=process.argv.slice(0,2);
const {auditFamily}=await import('./rcap-packet-completeness/verify-packet-completeness.mjs');
const built=await buildFamily(KIND);
const relative=path.relative(ROOT,built.outDir);
const audit=auditFamily(relative,route.familyId);
const evidence={schemaVersion:'rcap-builder-completeness-counters/v1',familyId:route.familyId,measured:true,measurement:'native auditFamily over current saved packet, map, source receipt, actual writes and participant instructions',counters:audit.counters,totals:audit.totals,status:audit.result};
fs.writeFileSync(path.join(built.outDir,'reports/completeness-counters.json'),JSON.stringify(evidence,null,2)+'\n');
if(audit.result!=='PASS_COMPLETE'||Object.values(audit.counters).some(Number))throw Error(`${route.familyId}:COMPLETENESS_FAILED:${JSON.stringify(audit.counters)}`);
console.log(JSON.stringify({familyId:route.familyId,output:relative,status:audit.result,counters:audit.counters,fixtures:Object.fromEntries(Object.entries(built.built).map(([fixture,result])=>[fixture,{pages:result.packet.pages}]))},null,2));
