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

const PUBLISHER = 'data/rcap-all50/pdf-source-handoffs/source-resolution/publisher-resolutions.json';
const assignment = readJson(ASSIGNMENT);
const publisher = readJson(PUBLISHER);
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
const corpusByDoc = new Map(
  corpus.entries.map((e) => [`${e.state}|${String(e.formNumber).toUpperCase()}`, e]),
);

/** Match an assigned asset to a publisher resolution by its document id token. */
const normDoc = (v) => String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
function findResolution(jurisdiction, fileName, formNumber) {
  const stem = fileName.replace(/\.(pdf|html)$/i, '');
  // Filenames carry a leading form number followed by a title
  // ("200-00129 – Petition to Expunge…"), so take that token too.
  const leading = /^([A-Za-z]{0,4}[-_ ]?[\d]{1,3}[-.\d]*[A-Za-z]?)/.exec(stem)?.[1] ?? null;
  const wanted = new Set(
    [formNumber, stem, leading]
      .filter(Boolean)
      .flatMap((v) => [normDoc(v), normDoc(v).replace(/^AOC/, '')]),
  );
  return (
    publisher.resolutions.find((r) => {
      if (r.jurisdiction !== jurisdiction) return false;
      const id = normDoc(r.documentId);
      return wanted.has(id) || wanted.has(id.replace(/^AOC/, ''));
    }) ?? null
  );
}
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

  // The NC landing-page slugs name the petition AND its instructions, because
  // one page carries both. The word "instructions" appearing in a slug is
  // therefore not evidence that the resource is instructions-only, and an
  // earlier version of this generator wrongly treated it as such. Identity is
  // checked against the publisher's own document identity instead.
  const resolution = findResolution(jurisdiction, fileName, csv?.formNumber ?? queueRow?.formNumber);

  // Drift: the revision the archive records for the pinned bytes, against the
  // revision the publisher's current listing prints.
  const archiveEntry = corpusBySha.get(pinnedSha) ?? null;
  const pinnedRevision = archiveEntry?.revision ?? null;
  const liveRevision = resolution?.liveRevision ?? null;
  const driftVerdict =
    liveRevision == null || pinnedRevision == null || pinnedRevision === 'REV-UNKNOWN'
      ? 'not_comparable_here'
      : pinnedRevision === liveRevision
        ? 'pinned_revision_matches_published_revision'
        : 'pinned_revision_differs_from_published_revision';

  const disposition =
    resolution?.directFormPdfUrl
      ? 'official_direct_url_resolved_acquisition_blocked'
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
    sharedWithOtherAssignedAssets: [],
    publisherResolution: resolution
      ? {
          officialTitle: resolution.officialTitle,
          landingPageUrl: resolution.landingPageUrl,
          directFormPdfUrl: resolution.directFormPdfUrl ?? null,
          directInstructionsPdfUrl: resolution.directInstructionsPdfUrl ?? null,
          evidenceGrade: publisher.evidenceGrade,
        }
      : null,
    pinnedRevision,
    publishedRevision: liveRevision,
    driftVerdict,
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
  pristineReplacementForNcAocCr298: {
    subject: 'NC AOC-CR-298 Rev. 7/25 — pristine official source',
    ownedForRerenderBy: 'data/rcap-all50/gate-b-assignments/family-rerender-1.json',
    resolvedHereBecause: 'acquiring a clean official source is LANE-SOURCE work; this record is written only into this lane\'s handoff directory and touches no path the rerender or evidence shards own.',
    identityCorrection: {
      established: 'AOC-CR-298 is the nonviolent MISDEMEANOR petition; AOC-CR-297 is the nonviolent FELONY petition.',
      evidence: [
        'the publishers\' own page titles, retrieved twice independently',
        'src/lib/rcap-engine/compiled/profiles/NC-north-carolina.json: "AOC-CR-298 Expunge ONE or MORE nonviolent MISDEMEANOR convictions"',
        'docs/record-clearing/problematic-pdf-master-list.csv binds AOC-CR-298 to track nc_145_5_misdemeanor',
      ],
      consequence:
        'data/rcap-all50/overlays/production/north-carolina/aoc-cr-298-form-en/source-record.json pins the nonviolent FELONY landing page. The 298 filing form is pinned to the wrong offense class, and aoc-cr-297-form-en carries the mirror-image error. A petitioner served from these pins would receive the form for the other offense class.',
      correctionToAnEarlierFindingFromThisLane:
        'This lane previously reported the 298 form as "pinned to an instructions resource". That was wrong. Each NC landing page carries the petition AND its instructions, so the word instructions in the slug proves nothing. The real defect is the offense-class swap, and it is the two FORM records that are swapped, not the instructions records.',
    },
    pristineSource: {
      landingPage:
        'https://www.nccourts.gov/documents/forms/petition-and-order-of-expunction-under-gs-15a-1455-nonviolent-misdemeanors-instructions-for-petition-and-order-of-expunction-under-gs-15a-1455-nonviolent-misdemeanors',
      directFormPdfUrl: 'https://www.nccourts.gov/assets/documents/forms/cr298_1.pdf',
      directInstructionsPdfUrl: 'https://www.nccourts.gov/assets/documents/forms/cr298-instr_1.pdf',
      evidenceGrade: 'publisher_search_index_title — no byte was read from any of these URLs',
    },
    currentPin: {
      sha256: '8f526257102e5a5f59bed531e227a2d263d4ef192aaf99fd808a1a866385872b',
      byteLength: 300577,
      archivePath:
        'STATES/NC/02_PACKET_FORMS/NC__FORM__AOC-CR-298__aoc-cr-298-petition-and-order-of-expunction__REV-2025-07__EN.pdf',
      reportedContamination: 'a flattened records-officer name in the pinned bytes',
      contaminationStatusHere:
        'unverified. The binary is absent from this clone and the family\'s committed field census records no such field. It is neither confirmed nor dismissed.',
    },
    exactOperatorAction: [
      'From a session permitted to reach www.nccourts.gov, download https://www.nccourts.gov/assets/documents/forms/cr298_1.pdf.',
      'Record its sha256 and byte length, and confirm the document header reads AOC-CR-298 and names nonviolent MISDEMEANOR(S).',
      'Open the bytes and confirm no records-officer name, signature or any other party-specific text is present in the blank form.',
      'Compare the new sha256 against the pinned 8f526257102e5a5f59bed531e227a2d263d4ef192aaf99fd808a1a866385872b and preserve BOTH hashes on the source record as a drift pair.',
      'Repin sourceUrl to the direct PDF URL and the misdemeanor landing page, not the felony one.',
      'Only then hand NC:aoc-cr-298-form-en to the rerender lane.',
    ],
    prohibitedRemediation:
      'Do not strip the reported records-officer name from the existing bytes. A source-inherent name is removed by acquiring a clean official source, never by editing an official form. Do not repin on the strength of this artifact alone: every URL here is search-index evidence, not a downloaded byte.',
  },
  crossLaneFindings: [
    {
      finding: 'NC AOC-CR-297 and AOC-CR-298 filing-form source records are pinned to each other\'s offense class',
      affectedFamilies: ['NC:aoc-cr-297-form-en', 'NC:aoc-cr-298-form-en'],
      notThisLanesAssets: true,
      ownedBy: 'data/rcap-all50/gate-b-assignments/family-rerender-1.json',
      raisedNotPushed:
        'These families are not in this lane\'s assignment, so no file of theirs was modified. The correction is recorded here for their owner.',
      correctPins: {
        'NC:aoc-cr-297-form-en':
          'https://www.nccourts.gov/documents/forms/petition-and-order-of-expunction-under-gs-15a-1455-nonviolent-felonyies-instructions-for-petition-and-order-of-expunction-under-gs-15a-1455-nonviolent-felonyies (direct: assets/documents/forms/cr297_2.pdf)',
        'NC:aoc-cr-298-form-en':
          'https://www.nccourts.gov/documents/forms/petition-and-order-of-expunction-under-gs-15a-1455-nonviolent-misdemeanors-instructions-for-petition-and-order-of-expunction-under-gs-15a-1455-nonviolent-misdemeanors (direct: assets/documents/forms/cr298_1.pdf)',
      },
    },
    {
      finding: 'the archive index already holds a CC-6-11 at the revision the publisher currently lists',
      assignedAsset: 'NE|CC-6-11.pdf|sha256_unrecorded_in_repo',
      detail:
        'The assigned asset pins no sha256, but data/rcap-all50/local-source-corpus-index.json records NE CC-6-11 at REV-2024-04, and the publisher lists CC 6:11 at Rev. 04/2024. The asset and that archive entry are candidates for the same document at the same revision.',
      exactOperatorAction:
        'With the corpus mounted, hash the archive CC-6-11 entry and the freshly downloaded https://nebraskajudicial.gov/sites/default/files/CC-6-11.pdf, and pin the asset only if the two agree.',
    },
  ],
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
