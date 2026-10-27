import assert from 'node:assert/strict';
import {classifyKnownHistoricalSourceConveyor} from './rcap-hosted-saved-dtc-controls.mjs';
const known={id:34748757660,workflow_id:346843973,path:'.github/workflows/rcap-source-conveyor-ready.yml',name:'RCAP Source Conveyor',head_sha:'a7c892d6891120fae5f04b367bcd0d1d6695d2ad',head_branch:'claude/legalease-sprint-captain-utucnw',event:'push',run_attempt:1,conclusion:null,status:'queued'};
const label='NON_ACCEPTANCE_SOURCE_CI_WITH_ISSUE_METADATA_WRITE';assert.equal(classifyKnownHistoricalSourceConveyor(known),label);assert.equal(classifyKnownHistoricalSourceConveyor({...known,status:'in_progress'}),label);
for(const[k,v]of Object.entries({id:34748757661,workflow_id:332448793,path:'.github/workflows/rcap-hosted-acceptance.yml',name:'Other',head_sha:'0'.repeat(40),head_branch:'captain-release',event:'workflow_dispatch',run_attempt:2,conclusion:'success',status:'pending'}))assert.equal(classifyKnownHistoricalSourceConveyor({...known,[k]:v}),null,k);
for(const k of Object.keys(known)){const bad={...known};delete bad[k];assert.equal(classifyKnownHistoricalSourceConveyor(bad),null,k);}
for(const status of ['waiting','requested','completed'])assert.equal(classifyKnownHistoricalSourceConveyor({...known,status}),null);
assert.equal(classifyKnownHistoricalSourceConveyor(null),null);console.log('Exact historical non-consumer classifier positive/negative checks PASS');
