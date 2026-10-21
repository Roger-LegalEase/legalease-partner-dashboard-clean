import crypto from 'node:crypto';
/** Preserve the immutable historical anchor while allowing regenerated headers.
 * This does not accept even one changed family field or reuse a packet verdict.
 */
export function verifyPreservedFamilyBaseline(originalBytes, expectedHash, currentQueue) {
  if (crypto.createHash('sha256').update(originalBytes).digest('hex') !== expectedHash)
    throw new Error('Baseline queue digest disagrees with pinned queue bytes');
  const original=JSON.parse(originalBytes);
  if (!Array.isArray(original.families) || !original.families.length
    || JSON.stringify(original.families)!==JSON.stringify(currentQueue.families))
    throw new Error('Current family identities, dispositions or evidence differ from the bound baseline');
  return true;
}
