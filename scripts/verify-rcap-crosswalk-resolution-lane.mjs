#!/usr/bin/env node
// Captain-owned verifier for the crosswalk-resolution lanes (E4-R*).
//
// Evidence citation rules:
//   1. An ordinary repository path resolves at the lane base commit.
//   2. A `path@commit` citation is off-branch immutable evidence, which this repository
//      supports as an input. It requires a resolvable commit, a resolvable blob, and a
//      cited pointer that actually appears in that blob. It does NOT require the commit
//      to be an ancestor of the lane base — off-branch evidence is still re-checkable
//      offline from the object store, which is what the stop conditions ask for.
//   3. Failure is reserved for: commit unavailable, blob unavailable, pointer invalid,
//      or cited bytes that do not support the proposition.
//
// Usage: node scripts/verify-rcap-crosswalk-resolution-lane.mjs <laneId> [--json]

import fs from 'node:fs';
import { execSync } from 'node:child_process';

const lane = process.argv[2];
const asJson = process.argv.includes('--json');
const BASE = '8744a701391e2d963c867c2a25f7af7869fe8611';

const dispatch = JSON.parse(fs.readFileSync('data/rcap-ledger/crosswalk-resolution-dispatch.json', 'utf8'));
const spec = dispatch.lanes.find((l) => l.laneId === lane);
if (!spec) {
  console.error(`unknown lane ${lane}; expected one of ${dispatch.lanes.map((l) => l.laneId).join(', ')}`);
  process.exit(2);
}

const fail = [];
const warn = [];
const provenance = [];
// Registry blobs run to ~1MB, well past execSync's 1MB default maxBuffer.
const MAX_BUFFER = 64 * 1024 * 1024;
const sh = (c) => execSync(c, { encoding: 'utf8', maxBuffer: MAX_BUFFER }).trim();
const ok = (c) => { try { execSync(c, { stdio: 'ignore', maxBuffer: MAX_BUFFER }); return true; } catch { return false; } };

// Same (commit, path) blob is cited by many subjects; read it once.
const blobCache = new Map();
function readBlob(pin, path) {
  const key = `${pin}:${path}`;
  if (!blobCache.has(key)) blobCache.set(key, sh(`git show '${pin}:${path}'`));
  return blobCache.get(key);
}

// ---- lane file, read from the working tree (captain has already adopted it) -------------
let doc;
try {
  doc = JSON.parse(fs.readFileSync(spec.resolutionPath, 'utf8'));
} catch (e) {
  console.error(`${lane}: resolution file unreadable: ${e.message}`);
  process.exit(1);
}
if (!fs.existsSync(spec.reportPath)) fail.push(`report missing: ${spec.reportPath}`);

// ---- header ----------------------------------------------------------------------------
if (doc.laneId !== lane) fail.push(`laneId ${doc.laneId} != ${lane}`);
if (doc.baseCommit !== BASE) fail.push(`baseCommit ${doc.baseCommit} != ${BASE}`);
if (doc.crosswalkContentHash !== dispatch.input.crosswalkContentHash) fail.push('crosswalkContentHash mismatch');
if (doc.jobGraphSha256 !== dispatch.input.jobGraphSha256) fail.push('jobGraphSha256 mismatch');

// ---- coverage --------------------------------------------------------------------------
const res = Array.isArray(doc.resolutions) ? doc.resolutions : [];
if (res.length !== spec.jobCount) fail.push(`resolutions length ${res.length} != jobCount ${spec.jobCount}`);
const got = res.map((r) => r.jobId);
const dupes = [...new Set(got.filter((j, i) => got.indexOf(j) !== i))];
if (dupes.length) fail.push(`duplicate jobIds: ${dupes.join(', ')}`);
const missing = spec.jobIds.filter((j) => !got.includes(j));
const extra = got.filter((j) => !spec.jobIds.includes(j));
if (missing.length) fail.push(`missing jobIds: ${missing.join(', ')}`);
if (extra.length) fail.push(`extra jobIds: ${extra.join(', ')}`);

// ---- identifier universes --------------------------------------------------------------
const validTracks = new Set();
(function walk(o, d = 0) {
  if (d > 6 || o == null) return;
  if (Array.isArray(o)) return o.forEach((i) => walk(i, d + 1));
  if (typeof o === 'object') {
    for (const [k, v] of Object.entries(o)) {
      if (['trackId', 'registryTrackId', 'track_id', 'id'].includes(k) && typeof v === 'string') validTracks.add(v);
      walk(v, d + 1);
    }
  }
})(JSON.parse(fs.readFileSync('data/rcap-ledger/registry-crosswalk-projection.json', 'utf8')));

const validPathways = new Set();
{
  const xw = fs.readFileSync('data/rcap-ledger/track-pathway-crosswalk.json', 'utf8');
  for (const m of xw.matchAll(/"([a-z0-9]+(?:-[a-z0-9]+){2,})"/g)) validPathways.add(m[1]);
}

// ---- base tree, for ordinary paths -----------------------------------------------------
const baseTree = new Set(sh(`git ls-tree -r --name-only ${BASE}`).split('\n'));

// Resolve one evidence citation. Returns {status, note}.
function checkEvidence(citation, subjectTokens) { // subjectTokens = {outcome, jurisdiction, tokens}
  const raw = String(citation).split('#')[0].trim();
  const at = raw.lastIndexOf('@');
  const hasPin = at > 0 && !raw.slice(at + 1).includes('/');
  if (!hasPin) {
    const p = raw;
    const exists = baseTree.has(p) || [...baseTree].some((f) => f.startsWith(p.replace(/\/$/, '') + '/'));
    return exists ? { status: 'ok' } : { status: 'fail', note: `path not present at lane base: ${p}` };
  }
  const p = raw.slice(0, at);
  const pin = raw.slice(at + 1);
  // (a) full resolvable commit
  if (!ok(`git cat-file -e '${pin}^{commit}'`)) return { status: 'fail', note: `commit unavailable: ${pin}` };
  const full = sh(`git rev-parse '${pin}^{commit}'`);
  // (b) resolvable blob
  if (!ok(`git show '${pin}:${p}' > /dev/null`)) return { status: 'fail', note: `blob unavailable: ${p}@${pin}` };
  // (c) the cited bytes must support the proposition — which differs by outcome.
  //
  //   resolved     the citation asserts a mapping, so the blob must name the subject
  //                or its counterpart. Absence means the bytes do not support it.
  //   terminalized the claim is that NO counterpart exists. Such a citation supports the
  //                claim by absence, over a corpus that is complete for the jurisdiction.
  //                Demanding the subject token here would test the opposite of the claim.
  //   still_blocked no proposition is asserted; nothing to support.
  const blob = readBlob(pin, p);
  const { outcome, jurisdiction } = subjectTokens;
  if (outcome === 'resolved') {
    const want = subjectTokens.tokens.filter(Boolean);
    const hits = want.filter((t) => blob.includes(t));
    if (want.length && hits.length === 0) {
      return { status: 'fail', note: `cited bytes do not support the mapping: none of [${want.join(', ')}] appear in ${p}@${pin.slice(0, 10)}` };
    }
  } else if (outcome === 'terminalized') {
    // the corpus must at least cover the jurisdiction, or its silence proves nothing
    if (jurisdiction && !blob.includes(`"${jurisdiction}"`)) {
      return { status: 'fail', note: `cited bytes cannot support a gap claim: ${p}@${pin.slice(0, 10)} contains no ${jurisdiction} records, so its silence is not evidence` };
    }
  }
  // (d) record source branch / receipt where available
  let refs = [];
  try {
    refs = sh(`git branch -a --contains ${full}`).split('\n').map((s) => s.trim().replace(/^\*\s*/, '')).filter(Boolean);
  } catch { /* detached or unreferenced: still valid, just unattributed */ }
  provenance.push({ path: p, commit: full.slice(0, 10), sourceRefs: refs, supports: outcome });
  return { status: 'ok' };
}

// ---- per-resolution --------------------------------------------------------------------
const OUTCOMES = new Set(['resolved', 'terminalized', 'still_blocked']);
const counts = { resolved: 0, terminalized: 0, still_blocked: 0 };
const counterpartUse = new Map();

for (const r of res) {
  const id = r.jobId || '(no jobId)';
  if (!OUTCOMES.has(r.outcome)) { fail.push(`${id}: outcome "${r.outcome}" is not one of the three literals`); continue; }
  counts[r.outcome]++;

  // what the cited bytes have to show depends on what the row claims
  const subjTail = String(id).split(':').pop();
  const cpTail = r.counterpart ? String(r.counterpart).split(':').pop() : null;
  const parts = String(id).split(':');
  const claim = {
    outcome: r.outcome,
    jurisdiction: parts.length >= 3 ? parts[1] : null,
    tokens: [subjTail, cpTail].filter(Boolean),
  };

  if (r.outcome === 'resolved') {
    if (!r.counterpart) fail.push(`${id}: resolved but counterpart is empty`);
    if (!r.operativeAuthority?.citation) fail.push(`${id}: resolved but no operativeAuthority.citation`);
    if (!r.license) fail.push(`${id}: resolved but no re-checkable license`);
    if (r.counterpart) {
      const subjectIsTrack = String(id).startsWith('registry_track:');
      const universe = subjectIsTrack ? validPathways : validTracks;
      const kind = subjectIsTrack ? 'compiled pathway' : 'registry track';
      if (!universe.has(cpTail)) fail.push(`${id}: counterpart "${r.counterpart}" is not a real ${kind}`);
      counterpartUse.set(cpTail, [...(counterpartUse.get(cpTail) || []), id]);
    }
  }
  if (r.outcome === 'terminalized' && !r.terminalizationBasis) fail.push(`${id}: terminalized but no terminalizationBasis`);
  if (r.outcome === 'still_blocked') {
    if (!r.retrievalPacket) fail.push(`${id}: still_blocked but no retrievalPacket named`);
    else if (!baseTree.has(r.retrievalPacket)) fail.push(`${id}: retrievalPacket does not exist at base: ${r.retrievalPacket}`);
    if (r.counterpart) warn.push(`${id}: still_blocked but proposes a counterpart`);
  }

  const ev = r.repositoryEvidence || [];
  if (r.outcome !== 'still_blocked' && ev.length === 0) fail.push(`${id}: ${r.outcome} with no repositoryEvidence`);
  for (const e of ev) {
    const v = checkEvidence(e, claim);
    if (v.status === 'fail') fail.push(`${id}: ${v.note}`);
  }
}

// ---- terminal classification is crosswalk-only ------------------------------------------
// `terminalized` closes the MAPPING question, never the relief question. The schema binds it
// to transport name crosswalk_terminal_classified with launchLedgerEffect none. Enforce that
// no lane row smuggles a ledger effect in alongside it.
const schema = JSON.parse(fs.readFileSync('data/rcap-ledger/crosswalk-resolution-schema.json', 'utf8'));
const termSpec = schema.outcomes.terminalized;
for (const r of res) {
  if (r.outcome !== 'terminalized') continue;
  if (r.launchLedgerEffect && r.launchLedgerEffect !== 'none') {
    fail.push(`${r.jobId}: terminalized row declares launchLedgerEffect "${r.launchLedgerEffect}"; schema binds it to none`);
  }
  if (r.crosswalkTerminalOnly === false) {
    fail.push(`${r.jobId}: terminalized row sets crosswalkTerminalOnly false; schema binds it to true`);
  }
  if (r.buildStatus || r.reviewStatus === 'approved_for_live' || r.reviewStatus === 'live') {
    fail.push(`${r.jobId}: terminalized row carries a promotion signal (${r.buildStatus || r.reviewStatus}); lane files are evidence inputs, not ledger transitions`);
  }
}
// every row, any outcome, must stay an evidence input
for (const r of res) {
  if (r.reviewStatus && !['qa_review_pending'].includes(r.reviewStatus)) {
    fail.push(`${r.jobId}: reviewStatus "${r.reviewStatus}" is not an evidence-input status; lane files may only assert qa_review_pending`);
  }
}

for (const [track, users] of counterpartUse) {
  if (users.length > 1) warn.push(`counterpart collision: ${users.length} subjects map to "${track}" — ${users.join(' | ')}`);
}

const result = {
  lane, jurisdictions: spec.jurisdictions, jobCount: spec.jobCount,
  counts, terminalTransport: termSpec.transportName, launchLedgerEffect: 'none', warnings: warn, failures: fail,
  offBranchEvidence: provenance,
  pass: fail.length === 0,
};

if (asJson) console.log(JSON.stringify(result, null, 2));
else {
  console.log(`\n### ${lane} (${spec.jurisdictions.join('/')}, ${spec.jobCount} jobs)`);
  console.log(`  outcomes: resolved=${counts.resolved} terminalized=${counts.terminalized} (transport: ${termSpec.transportName}, launchLedgerEffect=${termSpec.launchLedgerEffect}) still_blocked=${counts.still_blocked}`);
  if (provenance.length) {
    const byCommit = [...new Set(provenance.map((p) => `${p.path}@${p.commit}`))];
    console.log(`  off-branch evidence accepted (${provenance.length} citations):`);
    for (const c of byCommit) {
      const one = provenance.find((p) => `${p.path}@${p.commit}` === c);
      console.log(`    ${c}  source: ${one.sourceRefs.join(', ') || '(unattributed)'}`);
    }
  }
  if (warn.length) { console.log('  WARN:'); warn.forEach((w) => console.log(`    - ${w}`)); }
  if (fail.length) { console.log('  FAIL:'); fail.forEach((f) => console.log(`    - ${f}`)); }
  else console.log('  PASS: contract satisfied');
}
process.exit(fail.length ? 1 : 0);
