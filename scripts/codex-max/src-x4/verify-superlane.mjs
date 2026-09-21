#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const out = 'data/rcap-grade-a/codex-max/source-and-candidate/src-x4';
const required = ['collision-guard.json','source-relationship-rows.json','source-relationship-apply-payload.json','corroborated-urls.json','acquisition-ready-receipts.json','candidate-families.json','route-mapping-payload.json','state.json'];
for (const name of required) JSON.parse(readFileSync(join(out, name), 'utf8'));
const rows = JSON.parse(readFileSync(join(out, 'source-relationship-rows.json')).toString());
if (rows.attemptedCount !== 15 || rows.rows[0].rowId !== 'SRR-046' || rows.rows.at(-1).rowId !== 'SRR-060') throw new Error('SRR shard mismatch');
const urls = JSON.parse(readFileSync(join(out, 'corroborated-urls.json')).toString()).rows;
const seen = new Set();
for (const row of urls) { const digest=createHash('sha256').update(row.normalizedUrl).digest('hex'); if (digest !== row.normalizedUrlSha256 || Number(BigInt(`0x${digest.slice(0,16)}`)%8n)!==3 || seen.has(row.normalizedUrl)) throw new Error(`URL ownership mismatch: ${row.normalizedUrl}`); seen.add(row.normalizedUrl); }
const acquisitions = JSON.parse(readFileSync(join(out, 'acquisition-ready-receipts.json')).toString());
for (const receipt of acquisitions.receipts) { const path=join(acquisitions.temporaryStorage, receipt.sha256); if (!existsSync(path) || createHash('sha256').update(readFileSync(path)).digest('hex') !== receipt.recomputedSha256 || receipt.sha256 !== receipt.recomputedSha256) throw new Error(`acquisition hash mismatch: ${receipt.normalizedUrl}`); }
const changed = [...execFileSync('git', ['diff','--name-only','HEAD'], {encoding:'utf8'}).trim().split('\n'), ...execFileSync('git', ['ls-files','--others','--exclude-standard'], {encoding:'utf8'}).trim().split('\n')].filter(Boolean);
for (const path of changed) if (!path.startsWith(`${out}/`) && !path.startsWith('scripts/codex-max/src-x4/')) throw new Error(`out-of-scope path: ${path}`);
if (changed.some(path => /\.pdf$/i.test(path))) throw new Error('PDF committed');
console.log(`SRC_X4_VALID ${rows.attemptedCount} SRR_ROWS ${urls.length} URLS ${required.length} JSON_FILES`);
