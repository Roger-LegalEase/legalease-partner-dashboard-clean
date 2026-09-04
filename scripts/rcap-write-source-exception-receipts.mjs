#!/usr/bin/env node
/**
 * Adds the two deliberately non-generic dispositions to the targeted source
 * supplement:
 *
 * 1. Missouri CR301: retain the already-pinned issuer PDF only when its bytes
 *    match the queue hash. The current OSCA endpoint remains the official
 *    source, but automated/browser transfer returned HTTP 403.
 * 2. Delaware mandatory SBI: record that current official State pages expose
 *    a contact/letter process, not a public downloadable application binary.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const outDir = path.resolve(arg('--out', 'acquired-source-supplement'));
const moCachePath = path.resolve(arg('--mo-cache', 'LegalEase Missouri/petition-for-expungement-mistaken-identity.pdf'));
const sourcesDir = path.join(outDir, 'sources');
const baseSummaryPath = path.join(outDir, 'acquisition-summary.json');

if (!fs.existsSync(baseSummaryPath)) throw new Error(`Missing supplement acquisition summary: ${baseSummaryPath}`);
fs.mkdirSync(sourcesDir, { recursive: true });

const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
const safe = (v) => String(v).replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');

function run(command, args, maxBuffer = 20 * 1024 * 1024) {
  const r = spawnSync(command, args, { encoding: 'utf8', maxBuffer });
  return {
    ok: r.status === 0,
    stdout: r.stdout ?? '',
    stderr: r.stderr ?? '',
    error: r.error ? String(r.error.message ?? r.error) : null,
  };
}

function yamlScalar(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  return JSON.stringify(String(value));
}

function yamlKey(key) {
  return /^[A-Za-z0-9_-]+$/.test(key) ? key : JSON.stringify(key);
}

function toYaml(value, indent = 0) {
  const pad = ' '.repeat(indent);
  if (Array.isArray(value)) {
    if (!value.length) return `${pad}[]`;
    return value.map((item) => {
      if (item && typeof item === 'object') {
        const rendered = toYaml(item, indent + 2).split('\n');
        return `${pad}- ${rendered[0].trimStart()}\n${rendered.slice(1).join('\n')}`;
      }
      return `${pad}- ${yamlScalar(item)}`;
    }).join('\n');
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    if (!entries.length) return `${pad}{}`;
    return entries.map(([key, item]) => {
      if (item && typeof item === 'object') return `${pad}${yamlKey(key)}:\n${toYaml(item, indent + 2)}`;
      return `${pad}${yamlKey(key)}: ${yamlScalar(item)}`;
    }).join('\n');
  }
  return `${pad}${yamlScalar(value)}`;
}

function pdfPageCount(filePath) {
  const info = run('pdfinfo', [filePath]);
  if (!info.ok) return null;
  const m = /^Pages:\s*(\d+)/mi.exec(info.stdout);
  return m ? Number(m[1]) : null;
}

function pdfText(filePath) {
  const text = run('pdftotext', ['-layout', '-f', '1', '-l', '4', filePath, '-']);
  return text.ok ? text.stdout : '';
}

function mimeType(filePath) {
  const r = run('file', ['--brief', '--mime-type', filePath]);
  return r.ok ? clean(r.stdout) : null;
}

function writeReceipt(dir, receipt, yamlRecord) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`);
  fs.writeFileSync(path.join(dir, 'receipt.yaml'), `${toYaml(yamlRecord)}\n`);
}

const baseSummary = JSON.parse(fs.readFileSync(baseSummaryPath, 'utf8'));
const directReceipts = Array.isArray(baseSummary.receipts) ? baseSummary.receipts : [];

// Missouri CR301: retain the exact pinned issuer bytes, but do not pretend this
// is a fresh transfer from OSCA.
const moExpected = '5f4fecf410664cc725e298e2d96f3aa0448acaa800dc559e548f8f2e38a3f9f8';
if (!fs.existsSync(moCachePath)) throw new Error(`Pinned CR301 cache is missing: ${moCachePath}`);
const moBytes = fs.readFileSync(moCachePath);
const moHash = sha256(moBytes);
if (moHash !== moExpected) throw new Error(`Pinned CR301 hash mismatch: expected ${moExpected}, saw ${moHash}`);
if (!moBytes.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw new Error('Pinned CR301 cache is not a PDF binary.');

const moDir = path.join(sourcesDir, 'MO-CR301');
const moStoredName = 'petition-for-expungement-mistaken-identity.pdf';
fs.mkdirSync(moDir, { recursive: true });
fs.copyFileSync(moCachePath, path.join(moDir, moStoredName));
const moText = pdfText(path.join(moDir, moStoredName));
fs.writeFileSync(path.join(moDir, 'extracted-text.txt'), moText);
const moYaml = {
  'Family ID': ['mo-610-145-mistaken-identity-set'],
  'Repository source label': ['CR301'],
  'Issuing authority': 'Missouri Courts / Office of State Courts Administrator',
  'Official landing page': [
    'https://www.courts.mo.gov/page.jsp?id=191585',
    'https://www.16thcircuit.org/miscellaneous-forms',
  ],
  'Direct binary URL': 'https://www.courts.mo.gov/file.jsp?id=116396',
  'Final resolved URL': `repository-cache://${path.relative(process.cwd(), moCachePath)}`,
  'Printed title': 'Petition for Expungement – Mistaken Identity',
  'Printed form number': 'CR301',
  'Revision/effective date': null,
  'Original filename': moStoredName,
  'MIME type': mimeType(path.join(moDir, moStoredName)),
  'Page count': pdfPageCount(path.join(moDir, moStoredName)),
  'Byte length': moBytes.length,
  'SHA-256': moHash,
  'Statewide/county/court scope': 'Missouri statewide court form',
  'Standalone, parent, continuation, or component': 'Standalone petition',
  'Notes': [
    'The current OSCA direct binary remains file ID 116396, and a current Missouri circuit-court forms page links CR301 to that OSCA source.',
    'Fresh automated and browser-context transfers returned HTTP 403.',
    'The retained repository copy exactly matches the queue-pinned issuer hash and is preserved as source custody evidence, not represented as a fresh current download.',
  ],
};
const moReceipt = {
  schemaVersion: 'rcap-targeted-source-exception-receipt/v1',
  batchId: 'source-acquisition-28-families-2026-09-04-supplement',
  sourceId: 'MO-CR301',
  status: 'pinned_issuer_copy_retained',
  acquisitionFreshness: 'not_freshly_downloaded_due_to_current_issuer_http_403',
  identityCurrentness: 'current official circuit-court page still identifies CR301 and points to OSCA file 116396',
  requiredForUserBatch: true,
  familyIds: ['mo-610-145-mistaken-identity-set'],
  repositorySourceLabels: ['CR301'],
  officialDirectBinaryUrl: 'https://www.courts.mo.gov/file.jsp?id=116396',
  retainedFrom: path.relative(process.cwd(), moCachePath),
  storedFilename: moStoredName,
  pageCount: moYaml['Page count'],
  byteLength: moBytes.length,
  sha256: moHash,
  expectedSha256: [moExpected],
  matchesExpectedSha256: true,
  userYamlRecord: moYaml,
  recordedAt: new Date().toISOString(),
};
writeReceipt(moDir, moReceipt, moYaml);

// Delaware SBI mandatory expungement: source obligation resolves to an agency
// contact/eligibility-letter process. There is no current public form identity
// or issuer binary to download from the official pages reviewed on 2026-09-04.
const deDir = path.join(sourcesDir, 'DE-SBI-MANDATORY');
const deYaml = {
  'Family ID': ['de_mandatory_expungement-set'],
  'Repository source label': ['DE-SBI-MANDATORY-EXPUNGEMENT-APPLICATION'],
  'Issuing authority': 'Delaware State Police, State Bureau of Identification',
  'Official landing page': [
    'https://dsp.delaware.gov/units/',
    'https://pardons.delaware.gov/how-apply-expungement/',
    'https://delcode.delaware.gov/title11/c043/sc07/',
  ],
  'Direct binary URL': null,
  'Final resolved URL': null,
  'Printed title': null,
  'Printed form number': null,
  'Revision/effective date': null,
  'Original filename': null,
  'MIME type': null,
  'Page count': null,
  'Byte length': null,
  'SHA-256': null,
  'Statewide/county/court scope': 'Delaware statewide SBI administrative process',
  'Standalone, parent, continuation, or component': 'No public downloadable application identified; agency contact and eligibility-letter process',
  'Notes': [
    'The repository label is descriptive and must not be preserved as though it were an issuer-assigned form title.',
    'Current official Delaware pages direct the person to contact SBI; if eligible, SBI provides a letter with further instructions.',
    'The current DSP units page identifies the Expungement Section as the starting point, but exposes no downloadable mandatory-expungement application binary.',
    'Disposition: SOURCE_IDENTITY / PROCESS_GUIDANCE, not a failed PDF acquisition and not a court-form substitution.',
  ],
};
const deReceipt = {
  schemaVersion: 'rcap-targeted-source-exception-receipt/v1',
  batchId: 'source-acquisition-28-families-2026-09-04-supplement',
  sourceId: 'DE-SBI-MANDATORY',
  status: 'no_public_binary_exposed',
  requiredForUserBatch: true,
  familyIds: ['de_mandatory_expungement-set'],
  repositorySourceLabels: ['DE-SBI-MANDATORY-EXPUNGEMENT-APPLICATION'],
  issuerAssignedPublicTitle: null,
  issuerAssignedFormNumber: null,
  disposition: 'replace descriptive document obligation with current SBI contact/eligibility-letter process guidance',
  userYamlRecord: deYaml,
  recordedAt: new Date().toISOString(),
};
writeReceipt(deDir, deReceipt, deYaml);

const allReceipts = [...directReceipts, moReceipt, deReceipt];
const bySourceId = Object.fromEntries(allReceipts.map((r) => [r.sourceId, r]));
const counts = {
  directIssuerBinariesPlanned: directReceipts.length,
  directIssuerBinariesAcquired: directReceipts.filter((r) => r.status === 'acquired').length,
  pinnedIssuerCopiesRetained: allReceipts.filter((r) => r.status === 'pinned_issuer_copy_retained').length,
  noPublicBinaryDispositions: allReceipts.filter((r) => r.status === 'no_public_binary_exposed').length,
  totalSupplementSourceRecords: allReceipts.length,
};
const dispositionSummary = {
  schemaVersion: 'rcap-targeted-source-supplement-disposition/v1',
  batchId: 'source-acquisition-28-families-2026-09-04-supplement',
  generatedAt: new Date().toISOString(),
  counts,
  bySourceId,
  materialConclusions: {
    colorado: 'JDF 684 is the denial order; JDF 686 is the granting/sealing order.',
    delaware: 'No issuer-assigned downloadable mandatory SBI application was identified on current official pages.',
    missouri: 'CR301 identity remains current; the preserved bytes match the pinned issuer hash, but the OSCA host still blocks fresh transfer.',
  },
};
fs.writeFileSync(path.join(outDir, 'supplement-disposition-summary.json'), `${JSON.stringify(dispositionSummary, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, 'source-supplement-ledger.yaml'), `${toYaml(allReceipts.map((r) => r.userYamlRecord))}\n`);

const directRows = directReceipts.map((r) => `| ${r.sourceId} | ${r.status} | ${r.byteLength ?? '—'} | ${r.sha256 ? r.sha256.slice(0, 16) : '—'} |`);
const readme = [
  '# Missing-source supplement',
  '',
  `- Direct issuer binaries acquired: **${counts.directIssuerBinariesAcquired}/${counts.directIssuerBinariesPlanned}**`,
  `- Pinned issuer copies retained under explicit transport caveat: **${counts.pinnedIssuerCopiesRetained}**`,
  `- No-public-binary process dispositions: **${counts.noPublicBinaryDispositions}**`,
  '',
  '| Direct source | Status | Bytes | SHA-256 prefix |',
  '| --- | --- | ---: | --- |',
  ...directRows,
  '',
  '## Exception dispositions',
  '',
  `- **MO-CR301:** ${moHash}; ${moBytes.length} bytes; exact queue-hash match; not represented as a fresh download.`,
  '- **DE-SBI-MANDATORY:** no current public issuer binary or issuer-assigned form number identified; route as SBI process guidance.',
  '- **Colorado:** JDF 684 is the denial order. JDF 686 is the granting/sealing order.',
  '',
].join('\n');
fs.writeFileSync(path.join(outDir, 'SUPPLEMENT-README.md'), `${readme}\n`);

console.log(JSON.stringify(counts, null, 2));
