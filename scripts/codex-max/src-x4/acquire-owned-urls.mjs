#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
const out = 'data/rcap-grade-a/codex-max/source-and-candidate/src-x4';
const universe = JSON.parse(await readFile(`${out}/corroborated-urls.json`, 'utf8'));
const temp = '/tmp/legalease-src-x4-acquisition';
await rm(temp, { recursive: true, force: true }); await mkdir(temp, { recursive: true });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const receipts = [], blocks = [];
let cursor = 0;
async function worker() {
  while (cursor < universe.rows.length) {
    const row = universe.rows[cursor++];
    try {
      const response = await fetch(row.normalizedUrl, { redirect: 'follow', signal: AbortSignal.timeout(15000), headers: { 'user-agent': 'LegalEase-source-audit/1.0' } });
      const bytes = Buffer.from(await response.arrayBuffer());
      const type = response.headers.get('content-type') ?? 'unknown';
      const prefix = bytes.subarray(0, 8192).toString('utf8').toLowerCase();
      const htmlError = /text\/html/.test(type) && (/\b(login|sign in|access denied|not found|error 404|page not found)\b/.test(prefix) || bytes.length < 256);
      if (!response.ok || htmlError || bytes.length === 0) throw new Error(`REFUSED_HTTP_${response.status}_${htmlError ? 'HTML_ERROR_OR_LOGIN' : 'EMPTY_OR_NON_SUCCESS'}`);
      const digest = sha(bytes); const file = `${temp}/${digest}`; await writeFile(file, bytes);
      const recomputed = sha(await readFile(file)); if (digest !== recomputed) throw new Error('DOWNLOADED_HASH_RECOMPUTE_MISMATCH');
      receipts.push({ normalizedUrl: row.normalizedUrl, normalizedUrlSha256: row.normalizedUrlSha256, expectedSourceIdentity: basename(new URL(row.normalizedUrl).pathname) || 'official-index-page', affectedFamilies: row.affectedFamilies, supportingEvidenceFiles: row.supportingEvidenceFiles, httpStatus: response.status, redirected: response.redirected, finalUrl: response.url, contentType: type, byteLength: bytes.length, sha256: digest, recomputedSha256: recomputed, status: 'ACQUISITION_READY_TEMP_BYTES_NOT_COMMITTED' });
    } catch (error) { blocks.push({ normalizedUrl: row.normalizedUrl, normalizedUrlSha256: row.normalizedUrlSha256, status: 'ACQUISITION_BLOCKED', reason: String(error.message ?? error) }); }
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
receipts.sort((a,b)=>a.normalizedUrl.localeCompare(b.normalizedUrl)); blocks.sort((a,b)=>a.normalizedUrl.localeCompare(b.normalizedUrl));
await writeFile(`${out}/acquisition-ready-receipts.json`, `${JSON.stringify({ schemaVersion:'src-x4-acquisition-ready-receipts/v1', head: universe.head, temporaryStorage: temp, sourceBodiesCommitted: 0, readyCount: receipts.length, blockedCount: blocks.length, receipts, blocks }, null, 2)}\n`);
console.log(`SRC_X4_ACQUIRED ${receipts.length} BLOCKED ${blocks.length}`);
