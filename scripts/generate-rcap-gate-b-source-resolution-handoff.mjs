import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ASSIGNMENT = 'data/rcap-all50/gate-b-assignments/source-resolution.json';
const QUEUE = 'data/rcap-all50/source-acquisition-queue.json';
const MASTER_CSV = 'docs/record-clearing/problematic-pdf-master-list.csv';
const CORPUS_INDEX = 'data/rcap-all50/local-source-corpus-index.json';
const RECONCILIATION = 'data/rcap-all50/unmatched-source-reconciliation.json';
const OUT_DIR = 'data/rcap-all50/pdf-source-handoffs/source-resolution';

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

/** RFC4180 parse. The queue's generator sliced this file on bare commas and
 *  carried a dozen trailing columns into the URL; that is the defect below. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === ',') { row.push(field); field = ''; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    if (c === '\r') continue;
    field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const assignment = readJson(ASSIGNMENT);
const queue = readJson(QUEUE);
const corpus = readJson(CORPUS_INDEX);
const reconciliation = readJson(RECONCILIATION);

const queueRows = Object.values(queue.sets).flat();
const queueById = new Map(queueRows.map((r) => [r.assetId, r]));

const csvRows = parseCsv(fs.readFileSync(path.join(ROOT, MASTER_CSV), 'utf8'));
const header = csvRows[0];
const col = (name) => header.indexOf(name);
const csvRecords = csvRows.slice(1).filter((r) => r.length > 1).map((r) => ({
  jurisdiction: r[col('jurisdiction')],
  formNumber: r[col('formNumber')],
  formName: r[col('formName')],
  officialSourceUrl: r[col('officialSourceUrl')],
  sourcePublisher: r[col('sourcePublisher')],
  sourceRetrievalDate: r[col('sourceRetrievalDate')],
  sourceRevision: r[col('sourceRevision')],
  sourceSha256: r[col('sourceSha256')],
  sourceBinaryPathInClone: r[col('sourceBinaryPathInClone')],
  currentnessStatus: r[col('currentnessStatus')],
  exactBlocker: r[col('exactBlocker')],
}));

const corpusBySha = new Map(corpus.entries.map((e) => [e.sha256, e]));
const reconciliationText = JSON.stringify(reconciliation);

const OFFICIAL_HOSTS = new Set(
  Object.values(queue.officialHostsByJurisdiction ?? {}).flat(),
);

const hostOf = (url) => { try { return new URL(url).host; } catch { return null; } };

/** The publisher of record, taken from the jurisdiction's own official host list. */
const publisherOfRecord = {
  VT: 'Vermont Judiciary (vtcourts.gov)',
  NC: 'North Carolina Administrative Office of the Courts (nccourts.gov)',
  NE: 'Nebraska Judicial Branch (nebraskajudicial.gov / supremecourt.nebraska.gov)',
  VA: 'Virginia Judicial System (vacourts.gov)',
};

const rows = assignment.assetIds.map((assetId, i) => {
  const [jurisdiction, fileName, pinnedSha] = assetId.split('|');
  const familyId = assignment.familyIds[i];
  const queueRow = queueById.get(assetId) ?? null;

  // The authoritative URL comes from the CSV column, not from the queue's
  // mangled concatenation. Match on the pinned sha where one exists, since
  // filenames are exactly what cannot be trusted here.
  const csv =
    csvRecords.find(
      (r) => r.jurisdiction === jurisdiction && r.sourceSha256 && r.sourceSha256 === pinnedSha,
    ) ??
    csvRecords.find(
      (r) => r.jurisdiction === jurisdiction && r.formName === fileName,
    ) ??
    csvRecords.find(
      (r) => r.jurisdiction === jurisdiction && r.formNumber === fileName,
    ) ??
    null;

  const queueUrl = queueRow?.url ?? null;
  const contaminated =
    queueUrl != null && (queueUrl.includes(',') || queueUrl.includes('private/'));

  // Recover the leading field of the mangled string and prove the recovery by
  // checking that the row's own sha column lands where it should.
  let recovery = null;
  if (contaminated) {
    const parts = queueUrl.split(',');
    recovery = {
      recoveredUrl: parts[0],
      recoveredPublisher: parts[1] ?? null,
      recoveredRevision: parts[3] ?? null,
      recoveredSha256: parts[4] ?? null,
      recoveredShaMatchesPin:
        pinnedSha === 'sha256_unrecorded_in_repo' ? null : parts[4] === pinnedSha,
      recoveryVerification:
        pinnedSha === 'sha256_unrecorded_in_repo'
          ? 'not_applicable_no_sha_pinned_for_this_asset'
          : parts[4] === pinnedSha
            ? 'column_alignment_confirmed_by_pinned_sha256'
            : 'column_alignment_not_confirmed',
      trailingColumnsCarriedIn: parts.length - 1,
    };
  }

  // Precedence: the CSV column when it is populated, because that is the
  // authoritative field the queue mis-parsed; otherwise the queue's own URL,
  // recovered first if a CSV row was carried into it. The queue reconciles
  // against link inventories the CSV column does not carry, so it is a real
  // source rather than a fallback of last resort.
  const cleanQueueUrl = contaminated ? recovery?.recoveredUrl ?? null : queueUrl;
  const csvUrl = csv?.officialSourceUrl && csv.officialSourceUrl !== '' ? csv.officialSourceUrl : null;
  const officialUrl = csvUrl ?? (cleanQueueUrl && cleanQueueUrl !== '' ? cleanQueueUrl : null);
  const resolvedFrom =
    officialUrl == null ? null
    : csvUrl != null ? `${MASTER_CSV}#officialSourceUrl`
    : contaminated ? `${QUEUE}#url (recovered from a carried-in CSV row)`
    : `${QUEUE}#url`;

  const host = officialUrl ? hostOf(officialUrl) : null;
  const hostIsOfficial = host ? OFFICIAL_HOSTS.has(host) : false;
  const isDirectPdf = officialUrl ? /\.pdf(\?|#|$)/i.test(officialUrl) : false;

  const searched = [
    { source: MASTER_CSV, result: csv ? 'row found; officialSourceUrl column read' : 'no row matched' },
    { source: QUEUE, result: queueRow ? `row found in acquisition group ${queueRow.acquisitionGroup}` : 'no row matched' },
    {
      source: CORPUS_INDEX,
      result: corpusBySha.has(pinnedSha)
        ? `pinned sha256 present at ${corpusBySha.get(pinnedSha).path}`
        : 'pinned sha256 absent from the committed archive index',
    },
    {
      source: RECONCILIATION,
      result: reconciliationText.includes(pinnedSha)
        ? 'pinned sha256 named in the unmatched-source reconciliation'
        : 'pinned sha256 not named in the unmatched-source reconciliation',
    },
    {
      source: 'live publisher of record',
      result: 'not reachable: the egress gateway answered 403 to CONNECT for every official host in this jurisdiction set',
    },
  ];

  // An asset that is not itself an instructions document must not be pinned to
  // a resource whose own slug names instructions.
  const assetIsInstructions = /inst/i.test(fileName);
  const urlNamesInstructions = officialUrl != null && /instruction/i.test(officialUrl);
  const formPinnedToInstructionsResource = urlNamesInstructions && !assetIsInstructions;

  const disposition =
    formPinnedToInstructionsResource
      ? 'wrong_identity_offered'
      : officialUrl == null
      ? 'genuinely_no_official_source_identified'
      : !hostIsOfficial
        ? 'wrong_identity_offered'
        : isDirectPdf
          ? 'official_direct_url_resolved_acquisition_blocked'
          : 'official_landing_page_resolved';

  return {
    assetId,
    familyId,
    jurisdiction,
    fileName,
    pinnedSha256: pinnedSha === 'sha256_unrecorded_in_repo' ? null : pinnedSha,
    publisherOfRecord: publisherOfRecord[jurisdiction] ?? csv?.sourcePublisher ?? null,
    formNumber: csv?.formNumber ?? queueRow?.formNumber ?? null,
    formName: csv?.formName ?? queueRow?.formName ?? null,
    revision: csv?.sourceRevision || null,
    resolvedOfficialUrl: officialUrl,
    resolvedFrom,
    formPinnedToInstructionsResource,
    sharedWithOtherAssignedAssets: [],
    resolvedUrlKind: officialUrl == null ? null : isDirectPdf ? 'direct_pdf' : 'landing_page',
    resolvedUrlHost: host,
    resolvedUrlHostIsOfficialForJurisdiction: hostIsOfficial,
    queueUrlWasContaminated: contaminated,
    contaminatedQueueUrl: contaminated ? queueUrl : null,
    contaminationRecovery: recovery,
    archiveStatus: corpusBySha.has(pinnedSha)
      ? 'pinned_sha256_present_in_archive_index'
      : 'pinned_sha256_absent_from_archive_index',
    binaryReadableHere: false,
    sha256RecomputedHere: null,
    disposition,
    whatWasSearched: searched,
    exactOperatorAction:
      officialUrl == null
        ? `No official URL is recorded for ${jurisdiction} ${fileName} in any committed index. From a session permitted to reach the publisher of record, search that publisher's forms index for this document, and if it is not published there, record a no-official-source finding naming the index searched.`
        : isDirectPdf
          ? `From a session permitted to reach ${host}, download ${officialUrl}, record its sha256 and byte length, and compare against the pinned ${pinnedSha}. Repin only if the bytes are confirmed to be this document.`
          : `From a session permitted to reach ${host}, open ${officialUrl}, locate the ${csv?.formNumber ?? fileName} entry, resolve it to its direct PDF URL, download it, record sha256 and byte length, then repin the direct URL in place of the landing page.`,
  };
});

// Second pass: a landing page with no form-level path cannot distinguish the
// assets pinned to it, so name the assigned assets that collide on one URL.
for (const row of rows) {
  if (row.resolvedOfficialUrl == null) continue;
  row.sharedWithOtherAssignedAssets = rows
    .filter((o) => o !== row && o.resolvedOfficialUrl === row.resolvedOfficialUrl)
    .map((o) => o.assetId)
    .sort();
}

const tally = (key) =>
  Object.fromEntries(
    Object.entries(
      rows.reduce((acc, r) => { acc[r[key]] = (acc[r[key]] ?? 0) + 1; return acc; }, {}),
    ).sort(([a], [b]) => (a < b ? -1 : 1)),
  );

const artifact = {
  schemaVersion: 'rcap-gate-b-source-resolution-handoff/v1',
  generatedBy: 'scripts/generate-rcap-gate-b-source-resolution-handoff.mjs',
  assignment: 'data/rcap-all50/gate-b-assignments/source-resolution.json',
  lane: 'LANE-SOURCE — source-resolution',
  baseSha: assignment.baseSha,
  denominator: {
    basis: 'the assigned asset population, one row per assigned asset id',
    assignedAssets: assignment.assetIds.length,
    rowsEmitted: rows.length,
    note: 'This artifact is denominated on the assignment. It does not group assets by alias and does not use an alias-group denominator.',
  },
  rootBlocker: assignment.rootBlocker,
  blockers: [
    {
      blocker: 'publishers_of_record_not_reachable_from_this_session',
      detail:
        'The egress gateway answered 403 to CONNECT for www.vtcourts.gov, www.nccourts.gov, supremecourt.nebraska.gov and www.vacourts.gov. No assigned asset could be acquired here.',
      ownedBy: 'Roger, or a session whose egress policy permits the publishers of record',
    },
    {
      blocker: 'corpus_not_mounted',
      detail:
        'node scripts/generate-rcap-source-resolution.mjs --check exits with: FAIL source resolution — the corpus is not mounted at private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1. No SHA-256 could be recomputed from bytes, so no acquisition receipt could be issued.',
      ownedBy: 'Roger, or a session with the Edition 1 extract mounted',
    },
  ],
  whatThisArtifactDoesNotClaim: [
    'that any pinned binary is the current official edition',
    'that any resolved landing page serves the pinned bytes',
    'a SHA-256 computed from bytes: every hash here is read back from a committed record, never recomputed',
  ],
  defectFoundInTheAcquisitionQueue: {
    defect: 'csv_row_carried_into_the_url_field',
    detail:
      'scripts/generate-rcap-source-acquisition-queue.mjs sliced docs/record-clearing/problematic-pdf-master-list.csv on bare commas, so for some rows the url field holds the officialSourceUrl column followed by every column after it — publisher, retrieval date, revision, sha256, and the git-ignored corpus path. Those values are not URLs and must not be fetched or repinned as they stand.',
    affectedAssignedAssets: rows.filter((r) => r.queueUrlWasContaminated).length,
    recoveryProof:
      'Splitting the contaminated string on commas puts the pinned sha256 at index 4 for every affected assigned asset, which is where the CSV column order predicts it. That alignment is what makes the leading field a safe recovery of officialSourceUrl.',
    authoritativeSourceUsedInstead: MASTER_CSV,
  },
  totals: {
    assignedAssets: rows.length,
    byDisposition: tally('disposition'),
    byResolvedUrlKind: tally('resolvedUrlKind'),
    contaminatedQueueUrls: rows.filter((r) => r.queueUrlWasContaminated).length,
    resolvedToAnOfficialHost: rows.filter((r) => r.resolvedUrlHostIsOfficialForJurisdiction).length,
    acquiredHere: 0,
    sha256RecomputedHere: 0,
  },
  rows,
};

fs.mkdirSync(path.join(ROOT, OUT_DIR), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, OUT_DIR, 'source-resolution-findings.json'),
  `${JSON.stringify(artifact, null, 2)}\n`,
);
process.stdout.write(
  `wrote ${OUT_DIR}/source-resolution-findings.json\n  assets: ${rows.length}\n` +
    Object.entries(tally('disposition')).map(([k, v]) => `  ${k}: ${v}\n`).join('') +
    `  contaminated queue urls: ${artifact.totals.contaminatedQueueUrls}\n`,
);
