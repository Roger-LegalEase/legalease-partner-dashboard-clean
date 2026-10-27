import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {admitDtcRecoveryChain} from './rcap-hosted-configured-recovery-admission.mjs';
assert(process.env.DTC_ACTUAL_PRIVATE_CUSTODY_ROOT,'external original private native custody only');
const root=process.env.DTC_ACTUAL_PRIVATE_CUSTODY_ROOT,c=path.join(root,'dtc-purpose-deploy-execution/run-40441747499'),r=path.join(root,'dtc-purpose-recovery-execution/run-40446715593');const binding=JSON.parse(fs.readFileSync(new URL('./dtc-readonly-native-binding.json',import.meta.url)));
const args={binding,creatorBytes:fs.readFileSync(path.join(c,'extracted/deploy.json')),creatorRun:JSON.parse(fs.readFileSync(path.join(c,'run.json'))),recoveryBytes:fs.readFileSync(path.join(r,'extracted/configured-recovery.json')),recoveryRun:JSON.parse(fs.readFileSync(path.join(r,'run.json')))};
const view=admitDtcRecoveryChain(args);assert.equal(view.creatorFailed,true);assert.equal(view.recoveryPassed,true);assert.equal(JSON.parse(args.creatorBytes).passed,false);
console.log('PASS: offline admission of actual successful404467 recovery chain; original404417 remains failure; no Auth/query/customer/network operations.');
