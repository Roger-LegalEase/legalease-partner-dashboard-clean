import assert from 'node:assert/strict';
import { auditFamily, auditPreparedInputs } from '../../rcap-packet-completeness/verify-packet-completeness.mjs';
import { IA_FORM1_FAMILY, IA_FORM1_DIRECTORY } from './ia-form1-expected-candidates.mjs';

const raw = auditPreparedInputs(IA_FORM1_DIRECTORY, IA_FORM1_FAMILY);
assert.equal(raw.result, 'FAIL_ROUTE_SELECTION');
assert.equal(raw.totals.terminalFields, 285);
assert.equal(raw.counters.requiredOptionsMissing, 2);
const actual = auditFamily(IA_FORM1_DIRECTORY, IA_FORM1_FAMILY);
assert.equal(actual.result, 'PASS_COMPLETE');
assert.equal(actual.totals.terminalFields, 171);
assert.equal(actual.totals.written, 74);
assert.equal(actual.totals.blank, 97);
assert(Object.values(actual.counters).every(n => n === 0));
assert.deepEqual(actual.expectedOutcomeAccounting.rawAggregate, raw);
assert.deepEqual(actual.expectedOutcomeAccounting.supportedFixtures, ['canonical', 'boundary', 'good-cause-waiver']);
assert.deepEqual(actual.expectedOutcomeAccounting.diagnosticFixtures, ['exact-day-180', 'missing-contact']);
assert.equal(actual.expectedOutcomeAccounting.fixtures.length, 5);
assert.equal(actual.expectedOutcomeAccounting.allFilingReadyFlagsFalse, true);
assert.equal(actual.expectedOutcomeAccounting.runtimeInstalled, false);
console.log(JSON.stringify({ actualHost: actual.result, supportedAreas: 171, rawAreas: 285,
  rawDay180RefusalsPreserved: 2, completeOutputsAccountedFor: 5, diagnosticFixtures: 2,
  filingReady: false, runtimeInstalled: false }));
