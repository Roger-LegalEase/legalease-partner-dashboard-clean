#!/usr/bin/env node
/**
 * TRUTH4 / CHECK B — SELF-HELP STOP COVERAGE
 *
 * For every family whose committed track registry
 * (data/record-clearing/legal-design-track-registry.json) holds
 * selfHelpStopConditions, prove the participant instructions represent each
 * applicable condition.
 *
 * The registry is the authority. This detector does no legal research and
 * invents no condition: it quotes the registry and asks only whether the
 * participant-facing text carries what the registry already decided.
 *
 * Each condition lands in one of three classes:
 *
 *   CARRIED_VERBATIM     the condition appears in the instructions word for word
 *   CARRIED_IN_SUBSTANCE the instructions carry >= 60% of the condition's
 *                        distinctive anchors (statute cites and rare words),
 *                        so a paraphrase is credited rather than punished
 *   NOT_REPRESENTED      neither; the participant is not told
 *
 * A family FAILS when any applicable condition is not CARRIED_VERBATIM. The
 * stricter subcount — families with at least one NOT_REPRESENTED condition —
 * is reported separately so a paraphrase is never mistaken for silence.
 *
 * Separately counted, as its own flag: B2_HEARING_INVERSION — instructions
 * that tell the participant to attend or continue through a hearing at a
 * point this family's own registry entry records as the end of self-help.
 * That inversion is worse than silence. Families whose own registry records
 * attendance at a hearing as an ordinary participant step (Ohio does) are
 * excluded by reading that family's registry entry, not by pattern-matching
 * the sentence.
 *
 * Read-only.
 *
 * Usage:
 *   node scripts/rcap-truth-checks/check-b-self-help-stop-coverage.mjs
 *   node scripts/rcap-truth-checks/check-b-self-help-stop-coverage.mjs --family nj_arrest_no_conviction-set
 *   node scripts/rcap-truth-checks/check-b-self-help-stop-coverage.mjs --selftest
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  familyIndex,
  trackRegistry,
  trackIdFromRouteKey,
  rel,
  writeSection,
} from './lib/corpus.mjs';

const ANCHOR_STOPWORDS = new Set([
  'which', 'their', 'there', 'these', 'those', 'after', 'before', 'about',
  'under', 'other', 'another', 'every', 'because', 'through', 'without',
  'within', 'where', 'while', 'being', 'still', 'would', 'could', 'should',
  'shall', 'cannot', 'count', 'counts', 'participant', 'records', 'record',
  'court', 'courts', 'matter', 'matters', 'offense', 'offence', 'offenses',
  'offences', 'person', 'persons', 'filing', 'filed', 'file',
]);

const IMMIGRATION = /\b(immigra\w*|citizen\w*|non-?citizen\w*|deport\w*|removal proceeding|ICE\b|USCIS|green card|visa|naturali[sz]\w*)/i;

/** Tell-the-participant-to-attend, in prose. Table rows quoting a form are not prose. */
const ATTEND_HEARING =
  /\b(attend(?:ing)?|go to|appear(?:\s+in\s+person)?\s+at|show up (?:for|at)|be present at|continue through|sit through)\b[^.|]{0,80}\bhearings?\b|\bhearings?\b[^.|]{0,60}\byou (?:must|should|will|need to) (?:attend|appear|be present)/i;

/** The registry recording attendance itself as an ordinary participant step. */
const ORDINARY_ATTENDANCE =
  /\b(attend\w*|appear\w*|be present|presence)\b[^.]{0,60}\bhearing\b|\bhearing\b[^.]{0,40}\b(attend\w*|appear\w*)/i;

function normalize(s) {
  return String(s)
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Distinctive tokens of a condition: statutory cites plus rare words. */
export function anchorsOf(condition) {
  const cites = (
    condition.match(/§+\s?[\w.:()-]+|\b\d+[A-Za-z]?[:.-]\d+[\w.()-]*/g) || []
  ).map((x) => x.toLowerCase());
  const words = (normalize(condition).match(/[a-z][a-z-]{4,}/g) || []).filter(
    (w) => !ANCHOR_STOPWORDS.has(w),
  );
  return [...new Set([...cites, ...words])];
}

export function classify(condition, instructionsText) {
  const T = normalize(instructionsText);
  if (T.includes(normalize(condition))) return { klass: 'CARRIED_VERBATIM', coverage: 1 };
  const a = anchorsOf(condition);
  if (a.length < 2) return { klass: 'NOT_REPRESENTED', coverage: 0, anchors: a };
  const hit = a.filter((x) => T.includes(x));
  const coverage = hit.length / a.length;
  return {
    klass: coverage >= 0.6 ? 'CARRIED_IN_SUBSTANCE' : 'NOT_REPRESENTED',
    coverage: Number(coverage.toFixed(3)),
    anchors: a,
    anchorsMissing: a.filter((x) => !T.includes(x)),
  };
}

/** Prose lines only: markdown table rows quote the official form, not the packet's own voice. */
function proseOf(text) {
  return text
    .split('\n')
    .filter((l) => !/^\s*\|/.test(l))
    .join('\n');
}

function tracksForFamily(fam, byTrack, byPacketSet) {
  const ids = new Set();
  for (const rk of fam.routeKeys || []) {
    const t = trackIdFromRouteKey(rk);
    if (t && byTrack.has(t)) ids.add(t);
  }
  if (byPacketSet.has(fam.familyId)) {
    for (const t of byPacketSet.get(fam.familyId)) ids.add(t.trackId);
  }
  for (const d of fam.directories) {
    const keys = [
      ...(d.receipt?.routeKeys || []),
      ...(d.wiring?.routeKeys || []),
      ...(d.wiring?.binding?.routeKeys || []),
    ];
    for (const rk of keys) {
      const t = trackIdFromRouteKey(rk);
      if (t && byTrack.has(t)) ids.add(t);
    }
    const tracksDir = path.join(d.dir, 'tracks');
    if (fs.existsSync(tracksDir)) {
      for (const t of fs.readdirSync(tracksDir)) if (byTrack.has(t)) ids.add(t);
    }
  }
  return [...ids].sort();
}

function instructionsFor(fam) {
  const files = [];
  let text = '';
  for (const d of fam.directories) {
    const top = path.join(d.dir, 'participant-instructions.md');
    if (fs.existsSync(top)) {
      files.push(rel(top));
      text += `${fs.readFileSync(top, 'utf8')}\n`;
    }
    const tracksDir = path.join(d.dir, 'tracks');
    if (fs.existsSync(tracksDir)) {
      for (const t of fs.readdirSync(tracksDir).sort()) {
        const p = path.join(tracksDir, t, 'participant-instructions.md');
        if (fs.existsSync(p)) {
          files.push(rel(p));
          text += `${fs.readFileSync(p, 'utf8')}\n`;
        }
      }
    }
    const comp = path.join(d.dir, 'companion', 'companion-guidance.md');
    if (fs.existsSync(comp)) {
      files.push(rel(comp));
      text += `${fs.readFileSync(comp, 'utf8')}\n`;
    }
  }
  return { files, text };
}

export function run({ onlyFamily = null } = {}) {
  const { families } = familyIndex();
  const { byTrack, byPacketSet } = trackRegistry();
  const rows = [];
  const notMeasurable = [];

  for (const fam of families) {
    if (onlyFamily && fam.familyId !== onlyFamily) continue;

    const trackIds = tracksForFamily(fam, byTrack, byPacketSet);
    if (trackIds.length === 0) {
      notMeasurable.push({
        familyId: fam.familyId,
        reason: 'NOT_MEASURABLE_HERE',
        why: 'no committed track registry entry resolves from this family\'s route keys, packet-set id or track directories',
      });
      continue;
    }

    const { files, text } = instructionsFor(fam);
    if (files.length === 0) {
      notMeasurable.push({
        familyId: fam.familyId,
        reason: 'NOT_MEASURABLE_HERE',
        why: 'the family holds registry stop conditions but ships no participant-instructions.md to measure them against',
        trackIds,
        conditionsHeld: trackIds.reduce(
          (n, t) => n + (byTrack.get(t).selfHelpStopConditions || []).length,
          0,
        ),
      });
      continue;
    }

    const prose = proseOf(text);
    const conditions = [];
    for (const t of trackIds) {
      for (const c of byTrack.get(t).selfHelpStopConditions || []) {
        const verdict = classify(c, text);
        conditions.push({
          trackId: t,
          condition: c,
          ...verdict,
          immigration: IMMIGRATION.test(c),
        });
      }
    }
    if (conditions.length === 0) {
      notMeasurable.push({
        familyId: fam.familyId,
        reason: 'NOT_MEASURABLE_HERE',
        why: 'registry entry exists but holds an empty selfHelpStopConditions list',
        trackIds,
      });
      continue;
    }

    // B2 — hearing inversion, read out of this family's own registry entry.
    const hearingStops = [];
    const ordinaryHearingSteps = [];
    for (const t of trackIds) {
      const tr = byTrack.get(t);
      for (const c of tr.selfHelpStopConditions || []) {
        if (/hearing/i.test(c)) hearingStops.push({ trackId: t, condition: c });
      }
      for (const a of tr.packetSet?.participantActionRequired || []) {
        const d = String(a?.description || '');
        if (/hearing/i.test(d) && ORDINARY_ATTENDANCE.test(d)) {
          ordinaryHearingSteps.push({ trackId: t, step: d });
        }
      }
    }
    const attendMatch = prose.match(ATTEND_HEARING);
    const hearingInversion =
      hearingStops.length > 0 &&
      ordinaryHearingSteps.length === 0 &&
      Boolean(attendMatch);

    const missingVerbatim = conditions.filter((c) => c.klass !== 'CARRIED_VERBATIM');
    const notRepresented = conditions.filter((c) => c.klass === 'NOT_REPRESENTED');
    const failures = [];
    if (missingVerbatim.length > 0) failures.push('B1_STOP_CONDITION_NOT_CARRIED_VERBATIM');
    if (notRepresented.length > 0) failures.push('B1B_STOP_CONDITION_NOT_REPRESENTED_AT_ALL');
    if (hearingInversion) failures.push('B2_HEARING_INVERSION');

    rows.push({
      familyId: fam.familyId,
      jurisdiction: fam.jurisdiction,
      trackIds,
      instructionFiles: files,
      conditionsHeld: conditions.length,
      conditionsCarriedVerbatim: conditions.length - missingVerbatim.length,
      conditionsCarriedInSubstance: conditions.filter(
        (c) => c.klass === 'CARRIED_IN_SUBSTANCE',
      ).length,
      conditionsNotRepresented: notRepresented.length,
      immigrationConditionsHeld: conditions.filter((c) => c.immigration).length,
      immigrationConditionsNotRepresented: conditions.filter(
        (c) => c.immigration && c.klass === 'NOT_REPRESENTED',
      ).length,
      result: failures.length === 0 ? 'PASS' : 'FAIL',
      failures,
      missingVerbatim: missingVerbatim.map((c) => ({
        trackId: c.trackId,
        condition: c.condition,
        classification: c.klass,
        anchorCoverage: c.coverage,
        anchorsMissing: c.anchorsMissing,
        immigration: c.immigration,
      })),
      hearingInversion: hearingInversion
        ? {
            registrySaysEndOfSelfHelp: hearingStops,
            registryOrdinaryHearingSteps: ordinaryHearingSteps,
            instructionsSay: attendMatch[0].trim(),
          }
        : null,
    });
  }

  const failing = rows.filter((r) => r.result === 'FAIL');
  return {
    checkId: 'B',
    title: 'SELF-HELP STOP COVERAGE',
    question:
      'For every family whose committed track registry holds selfHelpStopConditions, do the ' +
      'participant instructions represent each applicable condition?',
    authority: 'data/record-clearing/legal-design-track-registry.json (quoted, never restated)',
    failureCodes: {
      B1_STOP_CONDITION_NOT_CARRIED_VERBATIM:
        'at least one registry stop condition is not carried word for word',
      B1B_STOP_CONDITION_NOT_REPRESENTED_AT_ALL:
        'at least one registry stop condition is carried neither verbatim nor in substance',
      B2_HEARING_INVERSION:
        'instructions tell the participant to attend or continue through a hearing at a point ' +
        "this family's own registry entry records as the end of self-help, and that same entry " +
        'records no ordinary participant step of attending a hearing',
    },
    denominator: {
      fleetFamilies: families.length,
      familiesWithRegistryStopConditions: rows.length,
      familiesNotMeasurableHere: notMeasurable.length,
    },
    failingFamilyCount: failing.length,
    failingFamiliesNotRepresentedAtAll: rows.filter(
      (r) => r.conditionsNotRepresented > 0,
    ).length,
    hearingInversionCount: rows.filter((r) => r.hearingInversion).length,
    hearingInversionFamilies: rows
      .filter((r) => r.hearingInversion)
      .map((r) => ({
        familyId: r.familyId,
        jurisdiction: r.jurisdiction,
        ...r.hearingInversion,
      })),
    immigrationConditionsNotRepresentedFamilyCount: rows.filter(
      (r) => r.immigrationConditionsNotRepresented > 0,
    ).length,
    failingFamilies: failing,
    passingFamilyCount: rows.length - failing.length,
    passingFamilyIds: rows.filter((r) => r.result === 'PASS').map((r) => r.familyId),
    notMeasurable,
  };
}

function selftest() {
  const cases = [
    {
      name: 'verbatim condition is carried',
      condition: 'Immigration exposure. New Jersey expungement has no federal immigration effect.',
      text: 'Stop here if there is Immigration exposure. New Jersey expungement has no federal immigration effect.',
      expect: 'CARRIED_VERBATIM',
    },
    {
      name: 'faithful paraphrase is credited',
      condition: 'The participant is not a US citizen and is asking about the consequences of clearing a record.',
      text:
        'If the participant is not a US citizen, stop: asking about the consequences of clearing a ' +
        'record is a question for an immigration lawyer.',
      expect: 'CARRIED_IN_SUBSTANCE',
    },
    {
      name: 'silence is not representation',
      condition: 'Immigration exposure. New Jersey expungement has no federal immigration effect.',
      text: 'File the petition with the clerk. Bring a certified disposition. Pay the fee.',
      expect: 'NOT_REPRESENTED',
    },
  ];
  let ok = true;
  for (const c of cases) {
    const got = classify(c.condition, c.text).klass;
    const pass = got === c.expect;
    if (!pass) ok = false;
    process.stdout.write(`  ${pass ? 'ok  ' : 'FAIL'} ${c.name} -> ${got}\n`);
  }
  const inv = [
    ['prose attendance instruction matches', 'you must attend any hearing scheduled in your case', true],
    ['form checkbox quoted in a table row does not', '| 1 | `Checkbox[0]` | right to personally attend any hearing held in this matter |', false],
  ];
  for (const [name, line, want] of inv) {
    const got = ATTEND_HEARING.test(proseOf(line));
    const pass = got === want;
    if (!pass) ok = false;
    process.stdout.write(`  ${pass ? 'ok  ' : 'FAIL'} ${name} -> ${got}\n`);
  }
  const ord = [
    ['Ohio ordinary step is recognised', 'Attending the hearing - The sentencing or trial court, 45 to 90 days after filing.', true],
    ['service-timing mention is not an attendance step', 'United States mail or hand delivery to the district attorney, with at least ten days before any hearing.', false],
  ];
  for (const [name, d, want] of ord) {
    const got = /hearing/i.test(d) && ORDINARY_ATTENDANCE.test(d);
    const pass = got === want;
    if (!pass) ok = false;
    process.stdout.write(`  ${pass ? 'ok  ' : 'FAIL'} ${name} -> ${got}\n`);
  }
  return ok;
}

const argv = process.argv.slice(2);
if (argv.includes('--selftest')) {
  process.stdout.write('CHECK B selftest (negative control)\n');
  process.exit(selftest() ? 0 : 1);
}
const famArg = argv.indexOf('--family');
const section = run({ onlyFamily: famArg >= 0 ? argv[famArg + 1] : null });
if (!argv.includes('--no-write')) writeSection('B', section);
process.stdout.write(
  `CHECK B  failing families: ${section.failingFamilyCount}` +
    `  (not represented at all: ${section.failingFamiliesNotRepresentedAtAll};` +
    ` hearing inversions: ${section.hearingInversionCount})` +
    `  passing: ${section.passingFamilyCount}  not measurable: ${section.notMeasurable.length}\n`,
);
for (const f of section.hearingInversionFamilies) {
  process.stdout.write(`  B2 ${f.familyId}  instructions say: "${f.instructionsSay}"\n`);
}
