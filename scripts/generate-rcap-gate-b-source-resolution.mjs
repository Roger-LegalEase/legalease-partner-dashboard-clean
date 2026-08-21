#!/usr/bin/env node
/**
 * Gate B source resolution, drift comparison, and archive/workbook reconciliation.
 *
 * Reconciles every production overlay family's pinned source against the two
 * committed records of what this repository actually holds:
 *
 *   - data/rcap-all50/local-source-corpus-index.json  (the archive: Edition 1)
 *   - data/rcap-all50/problematic-pdf-register.json   (the currentness register)
 *
 * The classification vocabulary is fixed by the Gate B lane. Two of its members
 * -- exact_current_source and current_replacement_requires_rerender -- assert a
 * relationship to the *current* bytes served by the issuing body. Neither can be
 * established without fetching those bytes, so this generator never emits them.
 * It records what the committed evidence establishes and names the exact operator
 * action for everything that needs an issuing-body round trip.
 *
 * Deterministic: no clock, no network, no filesystem order dependence. Running it
 * twice over an unchanged tree produces byte-identical output.
 */
import fs from 'node:fs';
import path from 'node:path';

const REPO = process.cwd();
const OVERLAY_ROOT = 'data/rcap-all50/overlays/production';
const CORPUS_INDEX = 'data/rcap-all50/local-source-corpus-index.json';
const REGISTER = 'data/rcap-all50/problematic-pdf-register.json';
const OUT = 'data/rcap-all50/gate-b-source-resolution.json';

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(REPO, rel), 'utf8'));

const corpus = readJson(CORPUS_INDEX);
const register = readJson(REGISTER);

const corpusBySha = new Map(corpus.entries.map((e) => [e.sha256, e]));

// Register records key off familyIds; a family may carry several defect rows.
const registerByFamily = new Map();
for (const rec of register.records) {
  for (const fid of rec.familyIds ?? []) {
    registerByFamily.set(fid, (registerByFamily.get(fid) ?? []).concat([rec]));
  }
}

/** Walk the overlay tree in sorted order so output never depends on readdir order. */
function collectFamilies() {
  const out = [];
  const root = path.join(REPO, OVERLAY_ROOT);
  for (const state of fs.readdirSync(root).sort()) {
    const statePath = path.join(root, state);
    if (!fs.statSync(statePath).isDirectory()) continue;
    for (const family of fs.readdirSync(statePath).sort()) {
      const famPath = path.join(statePath, family);
      if (!fs.statSync(famPath).isDirectory()) continue;
      const recordPath = path.join(famPath, 'source-record.json');
      if (!fs.existsSync(recordPath)) continue;
      const receiptPath = path.join(famPath, 'source-receipt.json');
      out.push({
        state,
        family,
        dir: path.relative(REPO, famPath),
        sourceRecord: JSON.parse(fs.readFileSync(recordPath, 'utf8')),
        sourceReceipt: fs.existsSync(receiptPath)
          ? JSON.parse(fs.readFileSync(receiptPath, 'utf8'))
          : null,
      });
    }
  }
  return out;
}

/**
 * A pinned URL is only usable if it is a single absolute http(s) URL. Everything
 * else is a corrupt record: comma- or pipe-concatenated lists, embedded
 * whitespace, relative corpus paths, and LegalEase-hosted decoys.
 */
function classifyUrl(raw) {
  if (raw == null || raw === '') return { class: 'no_url_recorded', defects: [] };
  const url = String(raw);
  const defects = [];
  if (url.includes(',')) defects.push('comma_concatenated');
  if (url.includes('|')) defects.push('pipe_concatenated');
  if (/\s/.test(url)) defects.push('whitespace_in_url');
  if (!/^https?:\/\//i.test(url)) defects.push('not_absolute_http');
  if (/(^|\/)(STATES|private|data)\//.test(url) || url.includes('../')) {
    defects.push('corpus_path_contaminated');
  }
  if (/legalease|expungement\.ai|localhost|vercel\.app/i.test(url)) {
    defects.push('legalease_output_decoy');
  }
  if (defects.length) return { class: 'corrupt_url_record', defects };
  if (/\.pdf(\?|#|$)/i.test(url)) return { class: 'direct_pdf_url', defects };
  return { class: 'official_landing_page', defects };
}

/** The overlay family id encodes the document's role; the slug encodes the URL's. */
const familyRole = (family) =>
  /-instructions(-|$)/.test(family) ? 'instructions'
  : /-form(-|$)/.test(family) ? 'form'
  : 'unclassified';

// The NC landing-page slugs name the petition AND its instructions, because one
// page carries both. An earlier version of this generator read "instructions" in
// a slug as proof the resource was instructions-only and reported six NC forms
// as wrong identities on that basis. It is not proof, and those were false
// positives. Identity is checked on offense class, which the slug does state.
const offenseClassOfSlug = (url) =>
  url == null ? null
  : /nonviolent-felonyies|nonviolent-felonies/i.test(url) ? 'nonviolent_felony'
  : /nonviolent-misdemeanors/i.test(url) ? 'nonviolent_misdemeanor'
  : null;

/** Established from the compiled NC profile and the master list's track bindings. */
const OFFENSE_CLASS_BY_DOCUMENT = {
  'AOC-CR-297': 'nonviolent_felony',
  'AOC-CR-298': 'nonviolent_misdemeanor',
};

function reconcileAgainstArchive(sourceRecord, sourceReceipt) {
  // v2 records pin an Edition 1 sha256. v1 records pin a Nationwide path whose
  // hash the bundle reconciliation already found absent from Edition 1.
  const sha = sourceRecord.sha256 ?? null;
  if (sha == null) {
    const bundle = sourceRecord.bundleReconciliation ?? {};
    return {
      status: 'pinned_hash_absent_from_canonical_library',
      archiveEntryFound: false,
      pinnedSha256: sourceRecord.expectedSha256 ?? null,
      pinnedPath: sourceRecord.relativePath ?? null,
      pathAgrees: null,
      byteLengthAgrees: null,
      lifecycleClassification: bundle.lifecycleClassification ?? null,
      note: bundle.note ?? null,
    };
  }
  const entry = corpusBySha.get(sha);
  if (!entry) {
    return {
      status: 'pinned_sha256_not_present_in_archive_index',
      archiveEntryFound: false,
      pinnedSha256: sha,
      pinnedPath: sourceRecord.canonicalBundlePath ?? null,
      pathAgrees: null,
      byteLengthAgrees: null,
      lifecycleClassification: sourceRecord.lifecycleClassification ?? null,
      note: null,
    };
  }
  const declaredPath = String(sourceRecord.canonicalBundlePath ?? '').replace(
    /^Expungement_AI_RCAP_Master_Library_Edition_1\//,
    '',
  );
  const pathAgrees = declaredPath === '' ? null : declaredPath === entry.path;
  const byteLengthAgrees =
    sourceRecord.byteLength == null || entry.byteLength == null
      ? null
      : sourceRecord.byteLength === entry.byteLength;
  const receiptAgrees =
    sourceReceipt == null ? null : sourceReceipt.sha256 === sha;
  return {
    status:
      pathAgrees === false || byteLengthAgrees === false || receiptAgrees === false
        ? 'archive_pin_disagrees'
        : 'reconciled_against_archive_index',
    archiveEntryFound: true,
    pinnedSha256: sha,
    pinnedPath: entry.path,
    pathAgrees,
    byteLengthAgrees,
    receiptPresent: sourceReceipt != null,
    receiptShaAgrees: receiptAgrees,
    lifecycleClassification: sourceRecord.lifecycleClassification ?? null,
    note: null,
  };
}

const families = collectFamilies();

// First pass: gather per-family facts and build the duplicate-URL table.
const urlOwners = new Map();
const rows = families.map((f) => {
  const sr = f.sourceRecord;
  const familyId = `${sr.jurisdiction ?? f.state}:${f.family}`;
  const rawUrl = sr.sourceUrl ?? null;
  const url = classifyUrl(rawUrl);
  if (url.class === 'official_landing_page' || url.class === 'direct_pdf_url') {
    urlOwners.set(rawUrl, (urlOwners.get(rawUrl) ?? []).concat([familyId]));
  }
  return {
    familyId,
    jurisdiction: sr.jurisdiction ?? f.state.toUpperCase(),
    overlayFamily: f.family,
    overlayPath: f.dir,
    documentId: sr.documentId ?? sr.fileName ?? null,
    revision: sr.revision ?? null,
    schemaVersion: sr.schemaVersion,
    pinnedSourceUrl: rawUrl,
    sourceUrlClass: url.class,
    sourceUrlDefects: url.defects,
    declaredRole: familyRole(f.family),
    pinnedUrlOffenseClass: offenseClassOfSlug(rawUrl),
    documentOffenseClass: OFFENSE_CLASS_BY_DOCUMENT[String(sr.documentId ?? '').toUpperCase()] ?? null,
    isPdfSource: sr.isPdf ?? true,
    archive: reconcileAgainstArchive(sr, f.sourceReceipt),
    registerDefects: (registerByFamily.get(familyId) ?? []).flatMap(
      (r) => r.defectCategories ?? [],
    ),
    operatorAction: sr.exactSourceRequirement ?? null,
  };
});

// Second pass: findings that need the whole set (duplicates, crossed identities).
//
// A shared URL is not by itself drift. Three different things produce one:
//   - two family ids that are aliases for a single binary (legacy id + canonical id);
//   - a landing page that legitimately hosts every language and role of one document;
//   - two genuinely different documents pinned to the same resource, which is a
//     contradiction at most one of them can survive.
// Only the third is drift, so the groups are separated by their own evidence.

// Identity is compared on the exact document id. Collapsing CC-1201-A into
// CC-1201 would hide the very thing this table exists to surface: CC-1201 and
// CC-1201-A are different filings, and one PDF cannot be both.
const exactDocumentId = (docId) => String(docId ?? '').toUpperCase();

const rowsByFamily = new Map(rows.map((r) => [r.familyId, r]));

const duplicateUrlTable = [...urlOwners.entries()]
  .filter(([, owners]) => owners.length > 1)
  .map(([url, owners]) => {
    const families = [...owners].sort();
    const members = families.map((f) => rowsByFamily.get(f));
    const shas = new Set(members.map((m) => m.archive.pinnedSha256));
    const docIds = members.map((m) => exactDocumentId(m.documentId));
    const distinctDocIds = new Set(docIds);
    const isLandingPage = members[0].sourceUrlClass === 'official_landing_page';

    // With several documents on one URL, the modal document is the one the URL
    // is plausibly about; anything else pinned to it is an intruder. A tie means
    // no member has a better claim than any other, so every one needs an owner.
    const counts = docIds.reduce((acc, d) => acc.set(d, (acc.get(d) ?? 0) + 1), new Map());
    const top = Math.max(...counts.values());
    const modal = [...counts.entries()].filter(([, n]) => n === top).map(([d]) => d);
    const intruders =
      distinctDocIds.size > 1 && modal.length === 1
        ? families.filter((f, i) => docIds[i] !== modal[0])
        : [];

    let kind;
    let isDrift;
    if (distinctDocIds.size === 1) {
      if (shas.size === 1) {
        kind = 'alias_pair_same_binary';
        isDrift = false;
      } else if (isLandingPage) {
        // One document's landing page legitimately carries every language and role.
        kind = 'one_document_all_variants_on_its_landing_page';
        isDrift = false;
      } else {
        kind = 'distinct_binaries_share_one_direct_pdf_url';
        isDrift = true;
      }
    } else if (isLandingPage) {
      kind = 'unrelated_document_pinned_to_another_documents_landing_page';
      // Only the intruders are wrong here; the page's own document is fine.
      isDrift = intruders.length === 0;
    } else {
      kind = 'distinct_documents_share_one_direct_pdf_url';
      isDrift = true;
    }

    return {
      url,
      assetCount: families.length,
      duplicateKind: kind,
      isDrift,
      distinctPinnedBinaries: shas.size,
      distinctDocumentIds: [...distinctDocIds].sort(),
      intruderFamilies: intruders,
      families,
    };
  })
  .sort((a, b) => (a.url < b.url ? -1 : a.url > b.url ? 1 : 0));

const driftUrls = new Map(duplicateUrlTable.map((d) => [d.url, d]));

for (const row of rows) {
  const findings = [];
  const group = row.pinnedSourceUrl == null ? null : driftUrls.get(row.pinnedSourceUrl);

  if (row.sourceUrlClass === 'corrupt_url_record') findings.push('corrupt_url_record');

  // A document pinned to a page for the other offense class is a wrong identity
  // regardless of whether the bytes behind it are current.
  if (
    row.documentOffenseClass != null &&
    row.pinnedUrlOffenseClass != null &&
    row.documentOffenseClass !== row.pinnedUrlOffenseClass
  ) {
    findings.push('pinned_to_the_wrong_offense_class');
  }

  // An HTML document cannot be the renderable source for a PDF overlay family.
  if (row.isPdfSource === false) findings.push('html_document_pinned_as_form_source');

  if (group) {
    findings.push(`duplicate_url:${group.duplicateKind}`);
    if (group.intruderFamilies.includes(row.familyId)) {
      findings.push('pinned_to_another_documents_source');
    }
  }

  if (row.archive.status === 'pinned_hash_absent_from_canonical_library') {
    findings.push('pinned_hash_absent_from_canonical_library');
  }
  if (row.archive.status === 'archive_pin_disagrees') findings.push('archive_pin_disagrees');

  row.findings = findings.sort();
  row.duplicateKind = group ? group.duplicateKind : null;

  const wrongIdentity =
    findings.includes('pinned_to_the_wrong_offense_class') ||
    findings.includes('html_document_pinned_as_form_source') ||
    findings.includes('corrupt_url_record') ||
    findings.includes('pinned_to_another_documents_source');

  // Classification. exact_current_source and current_replacement_requires_rerender
  // both assert a comparison against the bytes the issuing body serves today.
  // This session cannot fetch those bytes, so neither is ever emitted here.
  row.classification = wrongIdentity
    ? 'wrong_identity_offered'
    : group && group.isDrift
      ? 'source_drift_requires_adjudication'
      : row.sourceUrlClass === 'official_landing_page'
        ? 'official_landing_page_resolved'
        : row.sourceUrlClass === 'direct_pdf_url'
          ? 'direct_url_asset_owned_by_session_11'
          : findings.includes('pinned_hash_absent_from_canonical_library')
            ? 'genuinely_no_official_source_identified'
            : 'archive_reconciled_currentness_unproven';

  row.currentnessProvenHere = false;
}

rows.sort((a, b) => (a.familyId < b.familyId ? -1 : a.familyId > b.familyId ? 1 : 0));

const tally = (key) =>
  rows.reduce((acc, r) => {
    acc[r[key]] = (acc[r[key]] ?? 0) + 1;
    return acc;
  }, {});

const sortObject = (o) =>
  Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : 1)));

const artifact = {
  schemaVersion: 'rcap-gate-b-source-resolution/v1',
  generatedBy: 'scripts/generate-rcap-gate-b-source-resolution.mjs',
  purpose:
    'Classify every production overlay family against the committed archive index and currentness register, so landing-page resolution, source drift and archive/workbook reconciliation rest on hashed evidence rather than on source receipts.',
  lane: 'Gate B session 12 — source resolution and drift',
  whatThisArtifactEstablishes: [
    'whether each family\'s pinned sha256 is the sha256 of a file the committed archive index actually records',
    'whether the pinned archive path and byte length agree with that index entry',
    'whether the pinned source URL is a single absolute official URL, a landing page, or a corrupt record',
    'whether a filing form is pinned to a resource whose own slug names instructions',
    'which pinned URLs are claimed by more than one asset',
  ],
  whatThisArtifactDoesNotEstablish: [
    'that any pinned file is the current official edition: that requires the bytes the issuing body serves today, and this session\'s network policy answers 403 to CONNECT for every official host',
    'that any pinned file is free of source-inherent contamination: private/ is git-ignored and absent from this clone, so no pinned binary could be re-hashed or re-read here',
    'that a landing page resolves to any particular PDF: no landing page could be fetched',
  ],
  classificationVocabulary: {
    wrong_identity_offered:
      'the pinned source is not the document this family claims: a page for the other offense class, an HTML index pinned as a form source, or a structurally corrupt URL record',
    source_drift_requires_adjudication:
      'the pinned URL is claimed by more than one asset, so at most one of them can be correct and an owner must say which',
    official_landing_page_resolved:
      'an official issuing-body landing page is identified for this asset; resolving it to a direct PDF requires egress this session does not have',
    genuinely_no_official_source_identified:
      'no official URL is recorded and the pinned hash appears in no canonical library asset',
    archive_reconciled_currentness_unproven:
      'the pin reconciles exactly against the archive index, but no URL is recorded and currentness is unproven',
    direct_url_asset_owned_by_session_11:
      'a direct official PDF URL is already pinned; session 11 owns these and this session does not duplicate them',
  },
  duplicateKindVocabulary: {
    alias_pair_same_binary:
      'two family ids for one binary (a legacy id and its canonical id). Sharing a URL is correct for these and is not drift.',
    one_document_all_variants_on_its_landing_page:
      'every language and role of a single document pinned to that document\'s own landing page. Correct, but each variant still needs its own direct PDF resolved.',
    distinct_binaries_share_one_direct_pdf_url:
      'one direct PDF URL is pinned to several different binaries. At most one can be what that URL serves.',
    distinct_documents_share_one_direct_pdf_url:
      'one direct PDF URL is pinned to several different documents. A single PDF cannot be all of them.',
    unrelated_document_pinned_to_another_documents_landing_page:
      'a document is pinned to a landing page belonging to a different document. Where one document holds the majority the others are named as intruders; where the members tie, none has the better claim and every one needs an owner.',
  },
  priorityFindings: [
    {
      finding: 'NC AOC-CR-298 Rev. 7/25 is pinned to a felony instructions resource, and that resource is claimed by a second asset',
      familyId: 'NC:aoc-cr-298-form-en',
      pinnedSha256:
        '8f526257102e5a5f59bed531e227a2d263d4ef192aaf99fd808a1a866385872b',
      pinnedSourceUrl:
        'https://www.nccourts.gov/documents/forms/petition-and-order-of-expunction-under-gs-15a-1455-nonviolent-felonyies-instructions-for-petition-and-order-of-expunction-under-gs-15a-1455-nonviolent-felonyies',
      establishedFromCommittedEvidence: [
        'AOC-CR-298 is the nonviolent MISDEMEANOR petition — established by the compiled NC profile and the master list track binding nc_145_5_misdemeanor — but its pinned URL is the nonviolent FELONY page, and NC:aoc-cr-297-form-en carries the mirror-image error',
        'the same URL is pinned to NC:aoc-cr-297-instructions-en, whose document IS the felony one, so the instructions record is correct and the form record is not',
        'the two FORM records are the swapped pair; the two INSTRUCTIONS records are pinned to the right offense class',
        'the pinned sha256 reconciles exactly against the committed archive index at STATES/NC/02_PACKET_FORMS/NC__FORM__AOC-CR-298__aoc-cr-298-petition-and-order-of-expunction__REV-2025-07__EN.pdf, 300577 bytes, 107 acro fields',
      ],
      notEstablishedHere: [
        'whether the pinned bytes carry a flattened records-officer name. private/ is absent from this clone, so the binary could not be re-read, and the family\'s committed field census records no such field.',
        'what the nccourts landing page currently serves, because the egress gateway refuses that host',
      ],
      exactOperatorAction:
        'From a session or workstation permitted to reach www.nccourts.gov, open the AOC-CR-298 form page, download the Rev. 7/25 English filing form PDF (not the instructions), record its sha256 and byte length, and compare against 8f526257102e5a5f59bed531e227a2d263d4ef192aaf99fd808a1a866385872b. Repin the direct PDF URL, preserve both hashes on the record, and hand the family to rerender only after the fresh bytes are confirmed blank.',
      prohibitedRemediation:
        'Do not strip the reported records-officer name from the existing bytes. A source-inherent name is removed by acquiring a clean official source, never by editing the official form.',
    },
  ],
  blockers: [
    {
      blocker: 'official_hosts_not_permitted_from_this_session',
      detail:
        'The egress gateway answered 403 to CONNECT for www.nccourts.gov, public.courts.alaska.gov and www.kycourts.gov. Every issuing-body host is refused, so no landing page could be inspected, no form re-acquired, and no current-bytes drift comparison performed.',
      ownedBy: 'Roger, or a session whose egress policy permits official court hosts',
      effect:
        'exact_current_source and current_replacement_requires_rerender cannot be established for any asset from this session. No asset was promoted on an unproven currentness claim.',
    },
    {
      blocker: 'pinned_binaries_absent_from_this_clone',
      detail:
        'The corpus root private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1 is git-ignored and absent. The committed archive index is the only record of those bytes.',
      ownedBy: 'Roger, or a session with the working corpus mounted',
      effect:
        'Archive reconciliation here compares pinned metadata against the committed index. It is not a re-hash of the bytes, and is not claimed as one.',
    },
  ],
  totals: {
    familiesExamined: rows.length,
    byClassification: sortObject(tally('classification')),
    bySourceUrlClass: sortObject(tally('sourceUrlClass')),
    byArchiveStatus: sortObject(
      rows.reduce((acc, r) => {
        acc[r.archive.status] = (acc[r.archive.status] ?? 0) + 1;
        return acc;
      }, {}),
    ),
    duplicateUrlGroups: duplicateUrlTable.length,
    duplicateUrlGroupsThatAreDrift: duplicateUrlTable.filter((d) => d.isDrift).length,
    assetsOnADuplicatedUrl: duplicateUrlTable.reduce((n, d) => n + d.assetCount, 0),
    byDuplicateKind: sortObject(
      duplicateUrlTable.reduce((acc, d) => {
        acc[d.duplicateKind] = (acc[d.duplicateKind] ?? 0) + 1;
        return acc;
      }, {}),
    ),
  },
  duplicateUrlTable,
  rows,
};

fs.writeFileSync(path.join(REPO, OUT), `${JSON.stringify(artifact, null, 2)}\n`);
process.stdout.write(
  `wrote ${OUT}\n` +
    `  families: ${rows.length}\n` +
    `  duplicate url groups: ${duplicateUrlTable.length}\n` +
    Object.entries(sortObject(tally('classification')))
      .map(([k, v]) => `  ${k}: ${v}\n`)
      .join(''),
);
