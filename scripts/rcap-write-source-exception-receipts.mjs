#!/usr/bin/env node
/**
 * Write explicit non-binary dispositions for source obligations that cannot be
 * represented as a successful issuer-file download.
 */
import fs from 'node:fs';
import path from 'node:path';

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const outDir = path.resolve(arg('--out', 'acquired-source-supplement'));
const sourcesDir = path.join(outDir, 'sources');
const baseSummaryPath = path.join(outDir, 'acquisition-summary.json');
if (!fs.existsSync(baseSummaryPath)) throw new Error(`Missing acquisition summary: ${baseSummaryPath}`);
fs.mkdirSync(sourcesDir, { recursive: true });

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

function writeReceipt(sourceId, receipt, yamlRecord) {
  const dir = path.join(sourcesDir, sourceId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`);
  fs.writeFileSync(path.join(dir, 'receipt.yaml'), `${toYaml(yamlRecord)}\n`);
}

const baseSummary = JSON.parse(fs.readFileSync(baseSummaryPath, 'utf8'));
const directReceipts = Array.isArray(baseSummary.receipts) ? baseSummary.receipts : [];

const moYaml = {
  'Family ID': ['mo-610-145-mistaken-identity-set'],
  'Repository source label': ['CR301'],
  'Issuing authority': 'Missouri Courts / Office of State Courts Administrator',
  'Official landing page': [
    'https://www.courts.mo.gov/page.jsp?id=191585',
    'https://www.16thcircuit.org/miscellaneous-forms',
  ],
  'Direct binary URL': 'https://www.courts.mo.gov/file.jsp?id=116396',
  'Final resolved URL': 'https://www.courts.mo.gov/file.jsp?id=116396',
  'Printed title': 'Petition for Expungement – Mistaken Identity',
  'Printed form number': 'CR301',
  'Revision/effective date': null,
  'Original filename': null,
  'MIME type': null,
  'Page count': null,
  'Byte length': null,
  'SHA-256': null,
  'Statewide/county/court scope': 'Missouri statewide court form',
  'Standalone, parent, continuation, or component': 'Standalone petition',
  'Notes': [
    'Current official Missouri circuit-court forms pages still identify CR301 and link it to OSCA file ID 116396.',
    'Fresh native and headless-browser transfers from the official OSCA endpoint returned HTTP 403.',
    'The repository inventory records a historical hash and byte length, but the underlying PDF is not present in the current Git tree; no repository copy is claimed or retained.',
    'Disposition: issuer-host acquisition blocked. A normal interactive browser download remains required for original-byte custody.',
  ],
};
const moReceipt = {
  schemaVersion: 'rcap-targeted-source-exception-receipt/v1',
  batchId: 'source-acquisition-28-families-2026-09-04-supplement',
  sourceId: 'MO-CR301',
  status: 'issuer_binary_blocked_http_403',
  requiredForUserBatch: true,
  familyIds: ['mo-610-145-mistaken-identity-set'],
  repositorySourceLabels: ['CR301'],
  officialDirectBinaryUrl: 'https://www.courts.mo.gov/file.jsp?id=116396',
  expectedHistoricalSha256FromInventory: '5f4fecf410664cc725e298e2d96f3aa0448acaa800dc559e548f8f2e38a3f9f8',
  expectedHistoricalByteLengthFromInventory: 952015,
  binaryRetained: false,
  selfHelpAcquisitionStop: 'Use a normal interactive browser to download OSCA file 116396. Do not substitute CR310, CR311, or another form.',
  userYamlRecord: moYaml,
  recordedAt: new Date().toISOString(),
};
writeReceipt('MO-CR301', moReceipt, moYaml);

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
    'The current DSP units page identifies the Expungement Section as the starting point but exposes no downloadable mandatory-expungement application binary.',
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
  binaryRetained: false,
  disposition: 'replace descriptive document obligation with current SBI contact/eligibility-letter process guidance',
  userYamlRecord: deYaml,
  recordedAt: new Date().toISOString(),
};
writeReceipt('DE-SBI-MANDATORY', deReceipt, deYaml);

const allReceipts = [...directReceipts, moReceipt, deReceipt];
const bySourceId = Object.fromEntries(allReceipts.map((receipt) => [receipt.sourceId, receipt]));
const counts = {
  directIssuerSourcesPlanned: directReceipts.length,
  directIssuerBinariesAcquired: directReceipts.filter((r) => r.status === 'acquired').length,
  issuerHostBlocks: allReceipts.filter((r) => r.status === 'issuer_binary_blocked_http_403').length,
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
    missouri: 'CR301 identity remains current, but the OSCA host blocks automated and headless-browser acquisition and no current repository binary exists.',
  },
};
fs.writeFileSync(path.join(outDir, 'supplement-disposition-summary.json'), `${JSON.stringify(dispositionSummary, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, 'source-supplement-ledger.yaml'), `${toYaml(allReceipts.map((r) => r.userYamlRecord))}\n`);

const directRows = directReceipts.map((r) => `| ${r.sourceId} | ${r.status} | ${r.byteLength ?? '—'} | ${r.sha256 ? r.sha256.slice(0, 16) : '—'} |`);
const readme = [
  '# Missing-source supplement',
  '',
  `- Direct issuer binaries acquired: **${counts.directIssuerBinariesAcquired}/${counts.directIssuerSourcesPlanned}**`,
  `- Issuer-host acquisition blocks: **${counts.issuerHostBlocks}**`,
  `- No-public-binary process dispositions: **${counts.noPublicBinaryDispositions}**`,
  '',
  '| Direct source | Status | Bytes | SHA-256 prefix |',
  '| --- | --- | ---: | --- |',
  ...directRows,
  '',
  '## Exception dispositions',
  '',
  '- **MO-CR301:** current identity confirmed; fresh issuer bytes still blocked by OSCA HTTP 403; no repository binary claimed.',
  '- **DE-SBI-MANDATORY:** no current public issuer binary or issuer-assigned form number identified; route as SBI process guidance.',
  '- **Colorado:** JDF 684 is the denial order. JDF 686 is the granting/sealing order.',
  '',
].join('\n');
fs.writeFileSync(path.join(outDir, 'SUPPLEMENT-README.md'), `${readme}\n`);
console.log(JSON.stringify(counts, null, 2));
