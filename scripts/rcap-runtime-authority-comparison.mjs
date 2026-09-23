// Three separate proof obligations: trace contents, same-mode reads, behavior.
// A lazy structural dependency need not be read by every behavioral probe.
import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';

export function behaviorOf(result, modes) {
  const b = {};
  if (modes.includes('successor')) b.successor = result.results.successor?.decisionId ?? null;
  if (modes.includes('resolver')) b.resolver = result.results.resolver;
  if (modes.includes('commercial')) b.commercial = result.results.commercial ? { surfaces: result.results.commercial.surfaces, unmigratedSiblingCheckout: result.results.commercial.unmigratedSiblingCheckout } : null;
  if (modes.includes('workerStatic')) b.workerStatic = result.results.workerStatic?.bound ?? null;
  if (modes.includes('checkout')) b.checkout = result.results.checkout;
  return b;
}

export function compareConsumerAuthority({consumer, structuralDependencies, traceFiles, modes, source, packaged}) {
  // A universal baseline cannot stand in for the modes this consumer executes.
  assert.deepEqual(source.modes, modes, `${consumer}: source baseline modes differ`);
  assert.deepEqual(packaged.modes, modes, `${consumer}: packaged probe modes differ`);
  for (const key of ['resets', 'probeRoute', 'unmigratedSibling']) {
    assert.ok(source[key] !== undefined && packaged[key] !== undefined, `${consumer}: missing probe context ${key}`);
    assert.deepEqual(source[key], packaged[key], `${consumer}: probe context differs: ${key}`);
  }
  for (const probe of [source, packaged]) {
    assert.ok(Array.isArray(probe.reads), `${consumer}: missing read inventory`);
    assert.ok(probe.reads.every(r => typeof r.path === 'string'), `${consumer}: malformed read inventory`);
    assert.ok(Number.isInteger(probe.escapeCount) && probe.escapeCount >= 0, `${consumer}: missing escape accounting`);
  }
  const required = new Set(structuralDependencies), traced = new Set(traceFiles);
  const missing = [...required].filter(p => !traced.has(p)).sort();
  const sourceReads = [...new Set(source.reads.map(r => r.path))].sort();
  const packagedReads = [...new Set(packaged.reads.map(r => r.path))].sort();
  const sourceSet = new Set(sourceReads), packagedSet = new Set(packagedReads);
  const difference = {
    missing_in_packaged: sourceReads.filter(p => !packagedSet.has(p)),
    extra_in_packaged: packagedReads.filter(p => !sourceSet.has(p))
  };
  const expected = behaviorOf(source, modes), observed = behaviorOf(packaged, modes);
  const structuralClosed = missing.length === 0;
  const readsEqual = difference.missing_in_packaged.length === 0 && difference.extra_in_packaged.length === 0;
  const behaviorEqual = isDeepStrictEqual(expected, observed);
  const isolationClean = source.escapeCount === 0 && packaged.escapeCount === 0;
  return {
    consumer,
    structural_dependency_count: required.size,
    structural_missing_count: missing.length,
    structural_missing: missing,
    structural_trace_closed: structuralClosed,
    probe_modes: [...modes],
    probe_context: {resets: source.resets, probeRoute: source.probeRoute, unmigratedSibling: source.unmigratedSibling},
    source_read_count: sourceReads.length,
    packaged_read_count: packagedReads.length,
    source_read_set: sourceReads,
    packaged_read_set: packagedReads,
    read_set_difference: difference,
    executed_read_equal: readsEqual,
    source_behavior: expected,
    packaged_behavior: observed,
    behavior_equal: behaviorEqual,
    escape_count: packaged.escapeCount,
    source_escape_count: source.escapeCount,
    isolation_clean: isolationClean,
    successor_result: observed.successor ?? 'n/a',
    pass: structuralClosed && readsEqual && behaviorEqual && isolationClean
  };
}

export function probeConsumerAuthority({sourceRoot, packagedRoot, runProbe, ...comparison}) {
  // Deliberately no cross-consumer cache. The verifier's runProbe starts a fresh
  // process for each side, with identical modes, resets and root-relative cwd.
  const source = runProbe({root: sourceRoot, modes: comparison.modes});
  const packaged = runProbe({root: packagedRoot, modes: comparison.modes});
  return compareConsumerAuthority({...comparison, source, packaged});
}
