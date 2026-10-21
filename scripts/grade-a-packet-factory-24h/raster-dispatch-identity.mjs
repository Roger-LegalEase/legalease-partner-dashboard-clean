import assert from 'node:assert/strict';

export const RASTER_QUEUE_PATH = 'data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json';
const SHA = /^[0-9a-f]{40}$/;
const currentPinPath = p => p.length === 1 && p[0] === 'packetCommitSha'
  || p.length === 3 && p[0] === 'rows' && Number.isInteger(p[1]) && p[2] === 'packetCommitSha';

// Preserve all original text, including receipt/history identifiers, timestamps
// and whitespace. Only the JSON string tokens at the two declared current
// dispatch locations may vary. JSON.parse validates syntax first; this bounded
// token walk locates those values and rejects duplicate object keys.
function normalizeCurrentPins(text) {
  const tokens = [...text.matchAll(/"(?:\\[\s\S]|[^"\\])*"|[{}\[\]:,]|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null/g)];
  let i = 0;
  const spans = [];
  const take = expected => { assert.equal(tokens[i]?.[0], expected, 'Invalid raster JSON token structure'); i++; };
  const visit = (location, depth = 0) => {
    assert(depth < 256, 'Raster dispatch JSON nesting is excessive');
    const token = tokens[i]; assert(token, 'Missing raster JSON value');
    if (token[0] === '{') {
      i++; const keys = new Set();
      if (tokens[i]?.[0] === '}') { i++; return; }
      while (true) {
        const key = JSON.parse(tokens[i++][0]);
        assert.equal(typeof key, 'string'); assert(!keys.has(key), 'Duplicate raster JSON object key'); keys.add(key);
        take(':'); visit([...location, key], depth + 1);
        if (tokens[i]?.[0] === '}') { i++; break; } take(',');
      }
    } else if (token[0] === '[') {
      i++; let index = 0;
      if (tokens[i]?.[0] === ']') { i++; return; }
      while (true) {
        visit([...location, index++], depth + 1);
        if (tokens[i]?.[0] === ']') { i++; break; } take(',');
      }
    } else {
      if (currentPinPath(location)) spans.push({start: token.index, end: token.index + token[0].length});
      i++;
    }
  };
  visit([]); assert.equal(i, tokens.length, 'Unconsumed raster JSON tokens');
  let normalizedContent = text;
  for (const span of spans.reverse()) normalizedContent = normalizedContent.slice(0, span.start)
    + '"<dispatch-pin>"' + normalizedContent.slice(span.end);
  return normalizedContent;
}

/** Opt-in only for the native raster queue. Receipt and historical row pins
 * describe earlier rendered bytes and are never this generation's dispatch. */
export function selectRasterDispatchIdentity(relative, text) {
  if (relative !== RASTER_QUEUE_PATH) return null;
  const queue = JSON.parse(text);
  assert(queue && typeof queue === 'object' && !Array.isArray(queue), 'Raster queue must be an object');
  assert.equal(queue.schemaVersion, 'rcap-raster-queue/v1', 'Unknown raster queue schema');
  assert.equal(typeof queue.packetCommitSha, 'string');
  assert(SHA.test(queue.packetCommitSha), 'Raster queue lacks a valid current dispatch pin');
  assert(Array.isArray(queue.rows), 'Raster queue rows must be an array');
  if (Object.hasOwn(queue, 'historicalRasterRows')) assert(Array.isArray(queue.historicalRasterRows), 'Historical raster rows must be an array');
  const pins = [queue.packetCommitSha], families = new Set();
  for (const row of queue.rows) {
    assert(row && typeof row === 'object' && !Array.isArray(row), 'Current raster row must be an object');
    assert(typeof row.familyId === 'string' && row.familyId.length > 0, 'Current raster row lacks family identity');
    assert(!families.has(row.familyId), 'Duplicate current raster family'); families.add(row.familyId);
    assert(typeof row.packetCommitSha === 'string' && SHA.test(row.packetCommitSha), 'Current raster row lacks a valid dispatch pin');
    assert.equal(row.packetCommitSha, queue.packetCommitSha, 'Current raster row belongs to a different dispatch');
    pins.push(row.packetCommitSha);
  }
  return {pins, normalizedContent: normalizeCurrentPins(text)};
}
