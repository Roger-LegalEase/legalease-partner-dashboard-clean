#!/usr/bin/env node
/**
 * TRUTH4 / CHECK C — PARTICIPANT-FACING ROUTE LABEL
 *
 * Find every family printing, on a participant-facing page, a route key that
 * exists in NO route record.
 *
 * Route records (the universe a printed key must appear in):
 *   - data/rcap-grade-a/route-obligation-census-candidate/**  (route-obligation-candidate.json
 *     is the named authority; canonical-route-universe.json sits beside it)
 *   - data/rcap-grade-a/route-obligation-census-v1/**         (the compiled census)
 *   - data/record-clearing/**                                 (registries the runtime imports)
 *   - data/rcap-ledger/**                                     (runtime ledgers)
 *   - src/**                                                  (compiled runtime code and its json)
 *   - each family's installed bindings: product-wiring.json, source-receipt.json
 *   - the fleet index families.json
 *
 * Deliberately NOT part of the universe:
 *   - the family's own production-field-map.json. It is the surface under test:
 *     in every failure found so far it is where the fabricated label is stored.
 *   - lane bookkeeping (packet-factory-24h assignments, verifier returns, launch
 *     control). Those copy whatever a family claimed; a work queue is not a
 *     route record, and treating one as a record would launder the defect.
 *   - participant-facing text itself.
 *
 * Participant-facing pages read: every *.md in a family directory and every
 * rendered *.pdf (text extracted with pdftotext).
 *
 * Two extraction artifacts are absorbed before a key is called unknown, so the
 * detector reports fabrication and not poppler:
 *   - markdown emphasis: `_Route: <key>_` leaves a trailing underscore
 *   - line-wrap rejoining in PDF text drops hyphens
 *     ("...-under12-4516a", "set-asidesealing")
 * Comparison is therefore made on a canonical form (lowercase, hyphens and
 * underscores removed), plus a prefix rule for keys poppler truncated.
 *
 * Read-only. Reports the full population. Repairs nothing and proposes no
 * national label migration.
 *
 * Usage:
 *   node scripts/rcap-truth-checks/check-c-participant-route-label.mjs
 *   node scripts/rcap-truth-checks/check-c-participant-route-label.mjs --selftest
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  REPO_ROOT,
  CENSUS_ROOT,
  FLEET_INDEX,
  familyIndex,
  rel,
  writeSection,
} from './lib/corpus.mjs';

const ROUTE_KEY =
  /obligation:[A-Za-z][A-Za-z0-9-]*:[A-Z]{2}:[A-Za-z0-9_.-]+(?::[A-Za-z0-9_.-]+)?/g;

const RECORD_ROOTS = [
  'data/rcap-grade-a/route-obligation-census-candidate',
  'data/rcap-grade-a/route-obligation-census-v1',
  'data/record-clearing',
  'data/rcap-ledger',
  'src',
];

const INSTALLED_BINDING_FILES = ['product-wiring.json', 'source-receipt.json'];

export const stripTrailing = (k) => k.replace(/[_*`.,;:)\]]+$/, '');
export const canon = (k) => stripTrailing(k).toLowerCase().replace(/[-_]/g, '');

export function buildRouteUniverse() {
  const byKey = new Map();
  const byCanon = new Map();
  const add = (raw, source) => {
    const k = stripTrailing(raw);
    if (!byKey.has(k)) byKey.set(k, new Set());
    byKey.get(k).add(source);
    const c = canon(k);
    if (!byCanon.has(c)) byCanon.set(c, new Set());
    byCanon.get(c).add(k);
  };
  const scan = (p) => {
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      for (const c of fs.readdirSync(p)) scan(path.join(p, c));
      return;
    }
    if (!/\.(json|ts|tsx|js|mjs)$/.test(p)) return;
    let s;
    try {
      s = fs.readFileSync(p, 'utf8');
    } catch {
      return;
    }
    for (const k of new Set(s.match(ROUTE_KEY) || [])) add(k, rel(p));
  };
  for (const r of RECORD_ROOTS) {
    const abs = path.join(REPO_ROOT, r);
    if (fs.existsSync(abs)) scan(abs);
  }
  for (const state of fs.readdirSync(CENSUS_ROOT)) {
    const sd = path.join(CENSUS_ROOT, state);
    if (!fs.statSync(sd).isDirectory()) continue;
    for (const d of fs.readdirSync(sd)) {
      for (const f of INSTALLED_BINDING_FILES) {
        const p = path.join(sd, d, f);
        if (!fs.existsSync(p)) continue;
        for (const k of new Set(fs.readFileSync(p, 'utf8').match(ROUTE_KEY) || [])) {
          add(k, rel(p));
        }
      }
    }
  }
  for (const k of new Set(fs.readFileSync(FLEET_INDEX, 'utf8').match(ROUTE_KEY) || [])) {
    add(k, rel(FLEET_INDEX));
  }
  const canonList = [...byCanon.keys()];
  return {
    byKey,
    byCanon,
    size: byKey.size,
    isKnown(key) {
      const c = canon(key);
      if (byCanon.has(c)) return { known: true, how: 'exact', matches: [...byCanon.get(c)] };
      const pref = canonList.filter((u) => u.startsWith(c));
      if (pref.length > 0) {
        return {
          known: true,
          how: 'truncated_by_text_extraction',
          matches: pref.flatMap((p) => [...byCanon.get(p)]),
        };
      }
      return { known: false };
    },
  };
}

function pdfText(p) {
  try {
    return execFileSync('pdftotext', ['-q', p, '-'], {
      encoding: 'utf8',
      maxBuffer: 1 << 26,
    });
  } catch {
    return '';
  }
}

function participantSurfaces(dir) {
  const out = [];
  const walkDir = (d) => {
    for (const c of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, c.name);
      if (c.isDirectory()) walkDir(p);
      else if (/\.md$/i.test(c.name)) out.push({ file: p, kind: 'markdown' });
      else if (/\.pdf$/i.test(c.name)) out.push({ file: p, kind: 'rendered_pdf' });
    }
  };
  walkDir(dir);
  return out;
}

/** Route keys the family's own binding records name — the correct census key. */
function bindingKeys(fam) {
  const keys = new Set();
  for (const d of fam.directories) {
    for (const f of INSTALLED_BINDING_FILES) {
      const p = path.join(d.dir, f);
      if (!fs.existsSync(p)) continue;
      for (const k of fs.readFileSync(p, 'utf8').match(ROUTE_KEY) || []) {
        keys.add(stripTrailing(k));
      }
    }
  }
  return [...keys];
}

/** Where the printed label is stored, when it is stored anywhere in the family. */
function storedIn(fam, key) {
  const hits = [];
  const c = canon(key);
  for (const d of fam.directories) {
    const walkDir = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walkDir(p);
        else if (/\.json$/i.test(e.name)) {
          const s = fs.readFileSync(p, 'utf8');
          for (const k of s.match(ROUTE_KEY) || []) {
            if (canon(k) === c) {
              hits.push(rel(p));
              return;
            }
          }
        }
      }
    };
    walkDir(d.dir);
  }
  return [...new Set(hits)];
}

export function run({ onlyFamily = null } = {}) {
  const universe = buildRouteUniverse();
  const { families } = familyIndex();
  const rows = [];
  const notMeasurable = [];

  for (const fam of families) {
    if (onlyFamily && fam.familyId !== onlyFamily) continue;
    if (fam.directories.length === 0) {
      notMeasurable.push({
        familyId: fam.familyId,
        reason: 'NOT_MEASURABLE_HERE',
        why: 'no census-v1 family directory, so the family prints no participant-facing page here',
      });
      continue;
    }

    const unknown = new Map();
    let surfacesRead = 0;
    for (const d of fam.directories) {
      for (const s of participantSurfaces(d.dir)) {
        surfacesRead += 1;
        const text =
          s.kind === 'rendered_pdf' ? pdfText(s.file) : fs.readFileSync(s.file, 'utf8');
        for (const raw of new Set(text.match(ROUTE_KEY) || [])) {
          const key = stripTrailing(raw);
          if (universe.isKnown(key).known) continue;
          if (!unknown.has(key)) unknown.set(key, []);
          unknown.get(key).push({ file: rel(s.file), kind: s.kind, asPrinted: raw });
        }
      }
    }

    const failing = [...unknown.entries()].map(([key, printedOn]) => {
      const c = canon(key);
      // A confusable neighbour: a real route key that differs only in one segment.
      const segs = key.split(':');
      const confusable = [...universe.byKey.keys()].filter((u) => {
        const us = u.split(':');
        if (us.length !== segs.length) return false;
        const diff = us.filter((x, i) => x !== segs[i]).length;
        return diff === 1;
      });
      return {
        printedRouteKey: key,
        canonicalForm: c,
        existsInAnyRouteRecord: false,
        printedOn,
        storedInFamilyFiles: storedIn(fam, key),
        familyBindingRouteKeys: bindingKeys(fam),
        confusableWithRealRouteKeys: confusable,
      };
    });

    rows.push({
      familyId: fam.familyId,
      jurisdiction: fam.jurisdiction,
      directories: fam.directories.map((d) => d.dirRel),
      participantSurfacesRead: surfacesRead,
      result: failing.length === 0 ? 'PASS' : 'FAIL',
      unknownRouteLabels: failing,
    });
  }

  const failing = rows.filter((r) => r.result === 'FAIL');
  return {
    checkId: 'C',
    title: 'PARTICIPANT-FACING ROUTE LABEL',
    question:
      'Which families print, on a participant-facing page, a route key that exists in no route record?',
    routeUniverse: {
      size: universe.size,
      recordRoots: RECORD_ROOTS,
      installedBindingFiles: INSTALLED_BINDING_FILES,
      fleetIndex: rel(FLEET_INDEX),
      excludedFromUniverse: [
        'the family production-field-map.json — the surface under test',
        'lane bookkeeping (packet-factory-24h, fable-packet-factory, launch-control, wave-2 returns) — a work queue copies what a family claimed and is not a route record',
        'participant-facing markdown and rendered PDFs — the surface under test',
      ],
    },
    extractionArtifactsAbsorbed: [
      'markdown emphasis leaves a trailing underscore on `_Route: <key>_`',
      'pdftotext rejoins line-wrapped keys without the hyphen',
      'pdftotext truncates a long key; a printed key that is a prefix of a real one is credited',
    ],
    failureCode: {
      C1_ROUTE_LABEL_IN_NO_ROUTE_RECORD:
        'participant-facing page prints a route key held by no route record',
    },
    denominator: {
      fleetFamilies: families.length,
      familiesWithParticipantSurfaces: rows.length,
      familiesNotMeasurableHere: notMeasurable.length,
    },
    failingFamilyCount: failing.length,
    failingFamilies: failing,
    passingFamilyCount: rows.length - failing.length,
    notMeasurable,
  };
}

function selftest() {
  const u = buildRouteUniverse();
  const cases = [
    ['known real route key is known', 'obligation:track-pathway:VA:va_seal_ancillary_matter_only:petition-based-sealing', true],
    ['measured VT fabrication is unknown', 'obligation:track-pathway:VT:vt_exp_decriminalized:expungement-of-decriminalized-conduct', false],
    ['measured VA fabrication is unknown', 'obligation:track-pathway:VA:va_seal_petition_misdemeanor:petition-based-sealing', false],
    ['markdown emphasis is not a fabrication', 'obligation:track-only:VA:va_exp_nonconviction_', true],
    ['pdf hyphen loss is not a fabrication', 'obligation:track-pathway:KS:ks-12-4516a-municipal-arrest:municipal-arrest-record-expungement-under12-4516a', true],
  ];
  let ok = true;
  for (const [name, key, want] of cases) {
    const got = u.isKnown(key).known;
    const pass = got === want;
    if (!pass) ok = false;
    process.stdout.write(`  ${pass ? 'ok  ' : 'FAIL'} ${name} -> known=${got}\n`);
  }
  return ok;
}

const argv = process.argv.slice(2);
if (argv.includes('--selftest')) {
  process.stdout.write('CHECK C selftest (negative control)\n');
  process.exit(selftest() ? 0 : 1);
}
const famArg = argv.indexOf('--family');
const section = run({ onlyFamily: famArg >= 0 ? argv[famArg + 1] : null });
if (!argv.includes('--no-write')) writeSection('C', section);
process.stdout.write(
  `CHECK C  failing families: ${section.failingFamilyCount}` +
    `  passing: ${section.passingFamilyCount}` +
    `  not measurable: ${section.notMeasurable.length}` +
    `  (route universe ${section.routeUniverse.size} keys)\n`,
);
for (const f of section.failingFamilies) {
  for (const u of f.unknownRouteLabels) {
    process.stdout.write(
      `  FAIL ${f.familyId}  prints ${u.printedRouteKey}` +
        `  on ${u.printedOn.length} surface(s); binding says ${JSON.stringify(u.familyBindingRouteKeys)}\n`,
    );
  }
}
