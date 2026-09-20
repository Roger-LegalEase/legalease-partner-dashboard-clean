import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildArizonaRecordSealing } from '../lib/az-record-sealing-official-builder.mjs';
const root=path.resolve(new URL('../..',import.meta.url).pathname),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'az-clock-proof-'));
const OriginalDate=globalThis.Date;
const configs=[{familyId:'az_record_sealing_arrest_no_charges-set',trackId:'az_record_sealing_arrest_no_charges',routeKey:'obligation:track-pathway:AZ:az_record_sealing_arrest_no_charges:remedy-1-record-sealing',kind:'arrest'},{familyId:'az_record_sealing_dismissal_not_guilty-set',trackId:'az_record_sealing_dismissal_not_guilty',routeKey:'obligation:track-only:AZ:az_record_sealing_dismissal_not_guilty',kind:'dismissal'}];
let compared=0;
try {
 for(const config of configs){
  const rounds=[];
  for(const epoch of [1700000000000,1800000000000]){
   globalThis.Date=class extends OriginalDate {constructor(...args){super(...(args.length?args:[epoch]));}static now(){return epoch;}};
   const out=path.join(tmp,config.kind,String(epoch));await buildArizonaRecordSealing({...config,outDir:path.relative(root,out)});
   const hashes={};for(const fixture of ['canonical','boundary'])for(const name of ['petition','order','packet-assembly']){const f=`${fixture}/${name}.pdf`;hashes[f]=crypto.createHash('sha256').update(fs.readFileSync(path.join(out,'fixtures',f))).digest('hex');}
   rounds.push(hashes);
  }
  assert.deepEqual(rounds[0],rounds[1],`${config.familyId}: PDF bytes depend on wall clock`);compared+=Object.keys(rounds[0]).length;
 }
 console.log(JSON.stringify({differentClockEpochs:[1700000000000,1800000000000],identicalPdfPairs:compared,localRaster:false}));
}finally{globalThis.Date=OriginalDate;fs.rmSync(tmp,{recursive:true,force:true});}
