import assert from 'node:assert/strict';
import { orderedReclassificationReadReturned as assess } from './reclassification-review-order.mjs';

let positive = 0;
let refusal = 0;
let regression = 0;
function accepts(input) { assert.equal(assess(input), true); positive++; }
function refuses(input) { assert.equal(assess(input), false); refusal++; }

const failure = {verdict: 'FAIL_REPAIR_REQUIRED', reviewIsOrdered: true, artifactsMoved: true};
const before = JSON.stringify(failure);
accepts(failure);
accepts({...failure, artifactsMoved: false});
accepts({...failure, artifactsMoved: undefined});
for (const verdict of ['PASS_COMPLETE_INDEPENDENT', 'BLOCKED_SOURCE', 'BLOCKED_LEGAL_INPUT', 'PRODUCT_PATH_PENDING']) {
  accepts({verdict, reviewIsOrdered: true, artifactsMoved: false});
  refuses({verdict, reviewIsOrdered: true, artifactsMoved: true});
  refuses({verdict, reviewIsOrdered: true});
}
for (const reviewIsOrdered of [false, null, undefined, 'true', 1]) refuses({...failure, reviewIsOrdered});
for (const verdict of [undefined, null, '', 1, 'PASS', 'BLOCKED_BEFORE_CLAIM']) refuses({...failure, verdict});
refuses();
assert.equal(JSON.stringify(failure), before);

// Exhaustively compare the old condition on well-formed inputs. The only
// changed result is an ordered FAIL on later edited bytes. No PASS is added.
for (const verdict of ['FAIL_REPAIR_REQUIRED', 'PASS_COMPLETE_INDEPENDENT', 'BLOCKED_SOURCE', 'BLOCKED_LEGAL_INPUT', 'PRODUCT_PATH_PENDING', 'PASS', 'BLOCKED_BEFORE_CLAIM']) {
  for (const reviewIsOrdered of [true, false]) for (const artifactsMoved of [true, false]) {
    const oldResult = reviewIsOrdered && !['PASS', 'BLOCKED_BEFORE_CLAIM'].includes(verdict) && !artifactsMoved;
    const actual = assess({verdict, reviewIsOrdered, artifactsMoved});
    const permittedDifference = verdict === 'FAIL_REPAIR_REQUIRED' && reviewIsOrdered && artifactsMoved;
    assert.equal(actual, permittedDifference ? true : oldResult);
    regression++;
  }
}
// A returned historical reread is not a current repair certificate. Model the
// downstream decisions explicitly so an edit alone never becomes a pass.
function afterFailure({completedRepair, rasterPass}) {
  if (!completedRepair) return 'FAIL_REPAIR_REQUIRED';
  return rasterPass ? 'VERIFY_PENDING' : 'BUILT_RASTER_PENDING';
}
assert.equal(afterFailure({completedRepair:false, rasterPass:true}), 'FAIL_REPAIR_REQUIRED');
assert.equal(afterFailure({completedRepair:true, rasterPass:true}), 'VERIFY_PENDING');
assert.equal(afterFailure({completedRepair:true, rasterPass:false}), 'BUILT_RASTER_PENDING');
console.log(JSON.stringify({positiveCases:positive,refusalCases:refusal,oldBehaviorComparisons:regression,downstreamBoundaryExamples:3,inputsUnchanged:true,grantsApproval:false}));
