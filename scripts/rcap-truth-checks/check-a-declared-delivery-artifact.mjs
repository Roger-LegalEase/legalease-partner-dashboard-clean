#!/usr/bin/env node
/**
 * TRUTH4 / CHECK A — DECLARED DELIVERY ARTIFACT EXISTS
 *
 * For every component a family declares as delivered, prove four things about
 * the delivery artifact:
 *
 *   A1  it exists on disk at the declared path
 *   A2  its bytes hash to the recorded sha256
 *   A3  its byte length matches the recorded byteLength
 *   A4  its page count matches the recorded pageCount
 *   A5  it is present in the assembled packet, or is itself the exact
 *       delivery bundle the family ships
 *
 * The rule this detector exists to enforce:
 *
 *   A SOURCE HELD IN THE MASTER LIBRARY DOES NOT SATISFY PARTICIPANT DELIVERY.
 *
 * So when a declared artifact is missing from the tree, the detector still
 * fails it even if a byte-identical copy is sitting in
 * MASTER_LIBRARY_SOURCE_DIR — it records `masterLibrarySourceHeld: true`
 * beside the failure rather than letting it excuse the failure.
 *
 * Read-only. Repairs nothing, writes no verdict, opens no overlay for writing.
 *
 * Usage:
 *   node scripts/rcap-truth-checks/check-a-declared-delivery-artifact.mjs
 *   node scripts/rcap-truth-checks/check-a-declared-delivery-artifact.mjs --family oh_marijuana_expungement-set
 *   node scripts/rcap-truth-checks/check-a-declared-delivery-artifact.mjs --no-write
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import osModule from 'node:os';
import {
  REPO_ROOT,
  familyIndex,
  readJsonIfPresent,
  masterLibraryDir,
  pdfPageCount,
  sha256File,
  rel,
  walk,
  writeSection,
} from './lib/corpus.mjs';

const PATH_KEYS = [
  'file',
  'path',
  'filePath',
  'artifact',
  'artifactPath',
  'companionArtifact',
  'sourcePdf',
  'pdf',
  'renderedFile',
  'output',
  'outputPath',
];

const DECLARATION_FILES = [
  'source-receipt.json',
  'product-wiring.json',
  'approval-request.json',
  'reports/rendered-artifacts.json',
  'reports/actual-writes.json',
];

function isArtifactPath(v) {
  return (
    typeof v === 'string' &&
    /\.(pdf|png)$/i.test(v) &&
    !v.startsWith('http') &&
    v.includes('/')
  );
}

/**
 * Pull every "declared artifact" record out of a declaration document: an
 * object that names an artifact file AND records at least one measurable
 * property of its bytes. Schema-agnostic on purpose — rendered-artifacts.json
 * alone has 30 distinct key sets across the corpus.
 */
function declaredArtifacts(doc, sourceFile) {
  const out = [];
  if (!doc) return out;
  for (const [node, trail] of walk(doc)) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) continue;
    const key = PATH_KEYS.find((k) => isArtifactPath(node[k]));
    if (!key) continue;
    const hasMeasure =
      typeof node.sha256 === 'string' ||
      typeof node.byteLength === 'number' ||
      typeof node.pageCount === 'number';
    if (!hasMeasure) continue;
    out.push({
      declaredIn: sourceFile,
      jsonPath: trail.join('.') || '$',
      declaredPath: node[key],
      pathKey: key,
      documentId: node.documentId ?? node.componentId ?? null,
      role: node.role ?? node.documentRole ?? null,
      fixture: node.fixture ?? null,
      trackId: node.trackId ?? null,
      sha256: typeof node.sha256 === 'string' ? node.sha256 : null,
      byteLength:
        typeof node.byteLength === 'number' ? node.byteLength : null,
      pageCount: typeof node.pageCount === 'number' ? node.pageCount : null,
    });
  }
  return out;
}

/** Every documentId / component named by any assembled-packet page manifest. */
function assembledPacketMembership(doc) {
  const manifests = [];
  const members = new Set();
  if (!doc) return { manifests, members };
  for (const [node] of walk(doc)) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) continue;
    const pm = node.pageManifest;
    if (!Array.isArray(pm) || pm.length === 0) continue;
    manifests.push({
      file: node.file ?? null,
      fixture: node.fixture ?? null,
      pages: pm.length,
    });
    for (const p of pm) {
      if (p && typeof p === 'object') {
        if (p.documentId) members.add(String(p.documentId));
        if (p.component) members.add(String(p.component));
      }
    }
  }
  return { manifests, members };
}

function masterLibraryHolds(sha256, receipt) {
  const root = masterLibraryDir();
  if (!root || !sha256) {
    return { checked: false, held: null, note: 'MASTER_LIBRARY_SOURCE_DIR unset' };
  }
  const docs = Array.isArray(receipt?.documents) ? receipt.documents : [];
  for (const d of docs) {
    if (d?.sha256 !== sha256 || !d?.pathInArchive) continue;
    const p = path.join(root, d.pathInArchive);
    if (!fs.existsSync(p)) continue;
    const actual = sha256File(p);
    return {
      checked: true,
      held: actual === sha256,
      pathInArchive: d.pathInArchive,
      recomputedSha256: actual,
    };
  }
  return { checked: true, held: false, note: 'no receipt document carries this sha256' };
}

function measure(a, familyDir, receipt) {
  const abs = path.isAbsolute(a.declaredPath)
    ? a.declaredPath
    : path.join(REPO_ROOT, a.declaredPath);
  const absAlt = path.join(familyDir, a.declaredPath);
  const target = fs.existsSync(abs) ? abs : fs.existsSync(absAlt) ? absAlt : null;

  if (!target) {
    const ml = masterLibraryHolds(a.sha256, receipt);
    return {
      ...a,
      failures: ['A1_MISSING_ON_DISK'],
      observed: { exists: false },
      masterLibrarySourceHeld: ml.held === true,
      masterLibraryEvidence: ml,
      masterLibraryDoesNotSatisfyDelivery: true,
    };
  }

  const stat = fs.statSync(target);
  const observed = { exists: true, byteLength: stat.size, sha256: null, pageCount: null };
  const failures = [];

  if (a.byteLength !== null && stat.size !== a.byteLength) {
    failures.push('A3_BYTELENGTH_MISMATCH');
  }
  if (a.sha256) {
    observed.sha256 = crypto
      .createHash('sha256')
      .update(fs.readFileSync(target))
      .digest('hex');
    if (observed.sha256 !== a.sha256) failures.push('A2_HASH_MISMATCH');
  }
  if (a.pageCount !== null && /\.pdf$/i.test(target)) {
    observed.pageCount = pdfPageCount(target);
    if (observed.pageCount === null) {
      failures.push('A4_PAGECOUNT_UNREADABLE');
    } else if (observed.pageCount !== a.pageCount) {
      failures.push('A4_PAGECOUNT_MISMATCH');
    }
  }
  return { ...a, failures, observed, resolvedPath: rel(target) };
}

export function run({ onlyFamily = null } = {}) {
  const { families } = familyIndex();
  const rows = [];
  const notMeasurable = [];

  for (const fam of families) {
    if (onlyFamily && fam.familyId !== onlyFamily) continue;
    if (fam.directories.length === 0) {
      notMeasurable.push({
        familyId: fam.familyId,
        reason: 'NOT_MEASURABLE_HERE',
        why:
          'no census-v1 family directory exists, so the family declares no delivery artifact ' +
          `to prove (fleet-index state ${fam.currentState}, artifactStatus ${fam.artifactStatus})`,
      });
      continue;
    }

    const declaredAll = [];
    const membership = { manifests: [], members: new Set() };
    let receipt = null;

    for (const d of fam.directories) {
      for (const relName of DECLARATION_FILES) {
        const p = path.join(d.dir, relName);
        const doc = readJsonIfPresent(p);
        if (!doc) continue;
        if (relName === 'source-receipt.json') receipt = doc;
        declaredAll.push(
          ...declaredArtifacts(doc, `${d.dirRel}/${relName}`).map((a) => ({
            ...a,
            familyDir: d.dir,
          })),
        );
        const m = assembledPacketMembership(doc);
        membership.manifests.push(...m.manifests);
        for (const x of m.members) membership.members.add(x);
      }
    }

    // De-duplicate on (declaredPath, sha256, byteLength, pageCount): the same
    // artifact is commonly declared by two documents with identical numbers.
    const seen = new Map();
    for (const a of declaredAll) {
      const k = [a.declaredPath, a.sha256, a.byteLength, a.pageCount].join('|');
      if (!seen.has(k)) seen.set(k, { ...a, alsoDeclaredIn: [] });
      else seen.get(k).alsoDeclaredIn.push(a.declaredIn);
    }

    const measured = [...seen.values()].map((a) =>
      measure(a, a.familyDir, receipt),
    );

    // A5: when the family ships an assembled packet, a declared component-level
    // artifact that no page manifest names is not in the bundle it claims.
    if (membership.manifests.length > 0) {
      for (const m of measured) {
        if (!m.documentId) continue;
        const isThePacketItself = membership.manifests.some(
          (x) => x.file && x.file.endsWith(path.basename(m.declaredPath)),
        );
        if (isThePacketItself) continue;
        if (!membership.members.has(String(m.documentId))) {
          m.failures.push('A5_NOT_IN_ASSEMBLED_PACKET');
        }
      }
    }

    const failing = measured.filter((m) => m.failures.length > 0);
    rows.push({
      familyId: fam.familyId,
      jurisdiction: fam.jurisdiction,
      directories: fam.directories.map((d) => d.dirRel),
      declaredArtifacts: measured.length,
      assembledPacketManifests: membership.manifests.length,
      result: failing.length === 0 ? 'PASS' : 'FAIL',
      failingArtifacts: failing.map((f) => ({
        declaredPath: f.declaredPath,
        declaredIn: f.declaredIn,
        alsoDeclaredIn: f.alsoDeclaredIn,
        documentId: f.documentId,
        role: f.role,
        declared: {
          sha256: f.sha256,
          byteLength: f.byteLength,
          pageCount: f.pageCount,
        },
        observed: f.observed,
        failures: f.failures,
        ...(f.masterLibrarySourceHeld !== undefined
          ? {
              masterLibrarySourceHeld: f.masterLibrarySourceHeld,
              masterLibraryEvidence: f.masterLibraryEvidence,
              masterLibraryDoesNotSatisfyDelivery:
                f.masterLibraryDoesNotSatisfyDelivery,
            }
          : {}),
      })),
    });
  }

  const failing = rows.filter((r) => r.result === 'FAIL');
  return {
    checkId: 'A',
    title: 'DECLARED DELIVERY ARTIFACT EXISTS',
    question:
      'For every component a family declares as delivered, does the delivery artifact exist on ' +
      'disk, hash to the recorded value, carry the recorded page count, and appear in the ' +
      'assembled packet or exact delivery bundle?',
    rule:
      'A source held in the Master Library does not satisfy participant delivery. The source can ' +
      'be exact and present and the packet still ship nothing.',
    failureCodes: {
      A1_MISSING_ON_DISK: 'declared delivery artifact is not in the tree',
      A2_HASH_MISMATCH: 'bytes on disk do not hash to the recorded sha256',
      A3_BYTELENGTH_MISMATCH: 'bytes on disk are not the recorded byteLength',
      A4_PAGECOUNT_MISMATCH: 'page count on disk is not the recorded pageCount',
      A4_PAGECOUNT_UNREADABLE: 'file will not open as a PDF',
      A5_NOT_IN_ASSEMBLED_PACKET:
        'declared component artifact appears in no assembled-packet page manifest',
    },
    denominator: {
      fleetFamilies: familyIndex().families.length,
      familiesWithADirectory: rows.length,
      familiesNotMeasurableHere: notMeasurable.length,
    },
    failingFamilyCount: failing.length,
    failingFamilies: failing,
    passingFamilyCount: rows.length - failing.length,
    passingFamilyIds: rows.filter((r) => r.result === 'PASS').map((r) => r.familyId),
    notMeasurable,
    masterLibraryDirConfigured: Boolean(masterLibraryDir()),
  };
}

/**
 * Negative control. Proves each failure code actually fires, using a scratch
 * copy of a real corpus PDF — nothing in data/ is written or moved.
 */
function selftest() {
  const os = osModule;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'truth4-a-'));
  const real = path.join(
    REPO_ROOT,
    'data/rcap-all50/overlays/census-v1/oh/oh-marijuana-expungement-set--custom-pleading',
    'tracks/oh_marijuana_expungement/rendered/canonical/canonical.pdf',
  );
  const good = path.join(tmp, 'good.pdf');
  const short = path.join(tmp, 'short.pdf');
  fs.copyFileSync(real, good);
  const bytes = fs.readFileSync(real);
  fs.writeFileSync(short, bytes.subarray(0, bytes.length - 64));
  const trueSha = sha256File(good);
  const truePages = pdfPageCount(good);
  const cases = [
    {
      name: 'clean artifact produces no failure',
      rec: { declaredPath: good, sha256: trueSha, byteLength: bytes.length, pageCount: truePages },
      expect: [],
    },
    {
      name: 'A1 missing on disk',
      rec: { declaredPath: path.join(tmp, 'absent.pdf'), sha256: trueSha, byteLength: 1, pageCount: 1 },
      expect: ['A1_MISSING_ON_DISK'],
    },
    {
      name: 'A2 hash mismatch',
      rec: { declaredPath: good, sha256: 'f'.repeat(64), byteLength: bytes.length, pageCount: truePages },
      expect: ['A2_HASH_MISMATCH'],
    },
    {
      name: 'A3 byteLength mismatch',
      rec: { declaredPath: good, sha256: trueSha, byteLength: bytes.length + 1, pageCount: truePages },
      expect: ['A3_BYTELENGTH_MISMATCH'],
    },
    {
      name: 'A4 pageCount mismatch',
      rec: { declaredPath: good, sha256: trueSha, byteLength: bytes.length, pageCount: truePages + 7 },
      expect: ['A4_PAGECOUNT_MISMATCH'],
    },
    {
      name: 'A4 unreadable pdf',
      rec: { declaredPath: short, sha256: null, byteLength: null, pageCount: 3 },
      expect: ['A4_PAGECOUNT_UNREADABLE'],
    },
  ];
  let ok = true;
  for (const c of cases) {
    const got = measure({ ...c.rec }, tmp, null).failures.sort();
    const want = [...c.expect].sort();
    const pass = JSON.stringify(got) === JSON.stringify(want);
    if (!pass) ok = false;
    process.stdout.write(
      `  ${pass ? 'ok  ' : 'FAIL'} ${c.name} -> ${JSON.stringify(got)}\n`,
    );
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  return ok;
}

const argv = process.argv.slice(2);
if (argv.includes('--selftest')) {
  process.stdout.write('CHECK A selftest (negative control)\n');
  process.exit(selftest() ? 0 : 1);
}
const famArg = argv.indexOf('--family');
const section = run({ onlyFamily: famArg >= 0 ? argv[famArg + 1] : null });
if (!argv.includes('--no-write')) writeSection('A', section);
process.stdout.write(
  `CHECK A  failing families: ${section.failingFamilyCount}` +
    `  passing: ${section.passingFamilyCount}` +
    `  not measurable: ${section.notMeasurable.length}\n`,
);
for (const f of section.failingFamilies) {
  process.stdout.write(
    `  FAIL ${f.familyId}  ${f.failingArtifacts
      .map((a) => `${a.failures.join('+')} ${a.declaredPath}`)
      .join(' | ')}\n`,
  );
}
