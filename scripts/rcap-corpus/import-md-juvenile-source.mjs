// GA-14-M01031: install the acquired original, preserving every earlier custody.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PDFDocument, PDFName } from 'pdf-lib';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const SOURCE = Object.freeze({
  formNumber: 'JUV-11-506.1', revision: '01/2022', byteLength: 284201,
  sha256: '24fcb98eb0af35906252a424011a00d14ed393ed5451b01219ed5653c4c10a92',
  path: 'private/source-imports/md-juvenile-official-20261018/MD_JUV-11-506.1.pdf',
  custody: 'md_juvenile_official_20261018',
  officialUrl: 'https://www.mdcourts.gov/sites/default/files/court-forms/juv-11-506.1.pdf',
});
export const INDEX = 'data/rcap-all50/local-source-corpus-index.json';
export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export function verifySource(bytes) {
  assert.equal(bytes.length, SOURCE.byteLength, 'juvenile source length');
  assert.equal(hash(bytes), SOURCE.sha256, 'juvenile source digest');
  return bytes;
}

export async function importSource(original, root = ROOT) {
  const bytes = verifySource(fs.readFileSync(original));
  const document = await PDFDocument.load(bytes, { updateMetadata: false });
  assert.equal(document.getPageCount(), 2);
  assert.equal(document.getForm().getFields().length, 45);
  assert(!document.getForm().acroForm.dict.has(PDFName.of('XFA')), 'no XFA in the acquired form');
  const indexPath = path.join(root, INDEX);
  const before = fs.readFileSync(indexPath, 'utf8');
  const index = JSON.parse(before);
  const target = path.join(root, SOURCE.path);
  // The assigned worktree mounts shared private custody. Add only this new
  // digest-bound destination; an existing different file is never replaced.
  if (fs.existsSync(target)) verifySource(fs.readFileSync(target));
  const prior = index.entries.filter(row => row.path === SOURCE.path || row.custody === SOURCE.custody);
  if (prior.length) {
    assert.equal(prior.length, 1, 'unique juvenile index entry');
    assert.equal(prior[0].sha256, SOURCE.sha256);
    assert.equal(prior[0].byteLength, SOURCE.byteLength);
    assert.equal(prior[0].path, SOURCE.path);
    assert.equal(prior[0].custody, SOURCE.custody);
    assert.equal(index.custodies.filter(row => row.id === SOURCE.custody).length, 1);
  } else {
    assert(!index.custodies.some(row => row.id === SOURCE.custody), 'orphan juvenile custody');
    assert(!index.entries.some(row => row.sha256 === SOURCE.sha256), 'source already indexed under another custody; review first');
    const entry = {
      path: SOURCE.path, custody: SOURCE.custody, custodyType: 'NEWLY_ACQUIRED_OFFICIAL_PUBLICATION',
      fileName: path.basename(SOURCE.path), state: 'MD', assetClass: 'FORM',
      formNumber: SOURCE.formNumber, revision: SOURCE.revision, language: 'EN',
      byteLength: bytes.length, sha256: hash(bytes), assetFormat: 'pdf', pageCount: 2,
      acroFormPresent: true, acroFieldCount: 45, xfaPresent: false,
      structuralClassObserved: 'acroform', loadError: null,
    };
    index.entries.push(entry);
    index.custodies.push({ id: SOURCE.custody, root: path.dirname(SOURCE.path),
      pathsRelativeTo: 'repositoryRoot', describes: 'JUV-11-506.1 acquired from Maryland Judiciary on 2026-10-18; exact retrieval receipt in the juvenile family source receipt. No complete corpus or delivery claim.',
      custodyType: 'NEWLY_ACQUIRED_OFFICIAL_PUBLICATION', completeOperationalCorpus: false,
      binariesIndexed: 1, pdfsIndexed: 1 });
    index.totals.binariesIndexed += 1;
    index.totals.pdfsIndexed += 1;
    index.totals.byAssetFormat.pdf += 1;
    index.totals.byCustody[SOURCE.custody] = 1;
    index.totals.byStructure.acroform += 1;
    index.byState.MD += 1;
  }
  if (!fs.existsSync(target)) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes, { flag: 'wx', mode: 0o600 });
  }
  verifySource(fs.readFileSync(target));
  const after = JSON.stringify(index, null, 2) + '\n';
  // Refuse a concurrent index writer instead of losing their changes.
  assert.equal(fs.readFileSync(indexPath, 'utf8'), before, 'corpus index changed during intake');
  if (before !== after) {
    const temporary = indexPath + `.md-juvenile-${process.pid}.tmp`;
    fs.writeFileSync(temporary, after, { flag: 'wx' });
    fs.renameSync(temporary, indexPath);
  }
  return { source: SOURCE, installed: true, indexChanged: before !== after, existingEntriesPreserved: index.entries.length - 1 };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 3, 'usage: node scripts/rcap-corpus/import-md-juvenile-source.mjs <held original PDF>');
  console.log(JSON.stringify(await importSource(process.argv[2]), null, 2));
}
