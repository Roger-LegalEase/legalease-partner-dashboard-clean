const NONVISUAL = [
  'knownRequiredFieldsMissing', 'requiredFactsNotCollected', 'unclassifiedBlanks',
  'incompleteRows', 'requiredOptionsMissing', 'requiredComponentsMissing',
  'invisibleWrites', 'protectedWrites',
];

// Eligibility to request the missing measurement, never a visual verdict.
export function visualOnlyRasterPending({ counters, completedBuild, sourceReady,
  legalBlocked, routeMappingOpen, artifactPresent, independentVerdict,
  failedObligations, unmeasuredObligations, isIndependentVerification, rasterPassed }) {
  return completedBuild === true && sourceReady === true && legalBlocked === false
    && routeMappingOpen === false && artifactPresent === true
    && independentVerdict === 'PASS' && Array.isArray(failedObligations)
    && failedObligations.length === 0 && isIndependentVerification === true
    && Array.isArray(unmeasuredObligations) && unmeasuredObligations.length === 1
    && unmeasuredObligations[0] === 'CLIPPING_AND_OVERLAP' && rasterPassed !== true
    && counters !== null && typeof counters === 'object'
    && Object.keys(counters).length === NONVISUAL.length + 1
    && counters.visualDefects === null
    && NONVISUAL.every(name => counters[name] === 0);
}
