#!/usr/bin/env node
/**
 * TRUTH4 / CHECK D — ACTUAL ARTIFACT WRITE
 *
 * A declared participant write counts only when the final PDF proves the value
 * is present in the expected field or page region.
 *
 * The reader this exists to correct sorts any field row whose decision is not
 * "refuse" into writes[]. That is a belief about the field map, not a
 * measurement of the artifact. This detector goes to the bytes.
 *
 * Method, per declared write, per widget, per rendered fixture:
 *
 *   1. Rasterise the fixture page and measure ink inside the widget rectangle.
 *   2. Rasterise the SAME rectangle on the blank official source and subtract,
 *      so the form's own rules, shading and labels are not read as a value.
 *   3. Ink added by the render => the value is present. No ink added => the
 *      region is empty and the declared write did not happen.
 *
 * Two traps that produced false results for other readers, and how each is
 * handled here:
 *
 *   - A value drawn in a Form XObject with a font pdftotext cannot map IS
 *     present even though text extraction shows nothing. Ink is therefore the
 *     authority and pdftotext is only ever a witness. Where the two disagree
 *     the row is reported as PRESENT_BUT_NOT_TEXT_EXTRACTABLE — a rendering
 *     note, never a failure.
 *
 *   - A caption repeating across the rows of one document means a different
 *     fact on each row. So every widget of a field is measured separately and
 *     reported separately; a field is never credited because one of its
 *     widgets carries ink.
 *
 * Disposition vocabulary. A declared write is a field row whose `decision` is
 * present and not "refuse", or whose `disposition` is one of the WRITE/SELECT
 * values. REQUIRED_BEFORE_FILING is NOT a declared write — it is a blank the
 * packet deliberately leaves for the participant, and counting it here would
 * manufacture failures out of disclosed blanks.
 *
 * Read-only. Repairs nothing, writes no verdict, opens no overlay for writing.
 *
 * Usage:
 *   node scripts/rcap-truth-checks/check-d-actual-artifact-write.mjs
 *   node scripts/rcap-truth-checks/check-d-actual-artifact-write.mjs --family nj_arrest_no_conviction-set
 *   node scripts/rcap-truth-checks/check-d-actual-artifact-write.mjs --selftest
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import {
  REPO_ROOT,
  familyIndex,
  readJsonIfPresent,
  masterLibraryDir,
  rel,
  walk,
  writeSection,
} from './lib/corpus.mjs';
import {
  renderPage,
  rectToBox,
  darkFraction,
  pageHeights,
} from './lib/ink.mjs';

/** Ink the render added, above which the region is judged to carry a value. */
const INK_DELTA_PRESENT = 0.0015;

const WRITE_DISPOSITIONS = new Set([
  'WRITE',
  'SELECT',
  'selected_by_route',
  'selected_route_or_known_fact',
  'selected_route_determined_marked_by_build',
  'selected_route_option',
]);

/** A blank the packet deliberately leaves for the participant is not a write. */
const NOT_A_WRITE_DISPOSITIONS = new Set([
  'REQUIRED_BEFORE_FILING',
  'REFUSE',
  'explicit_refusal',
  // "a choice only the participant can make, and one this route does not
  // determine" — Texas states it in exactly those words. A deliberate blank.
  'participant_election',
]);

export function isDeclaredWrite(node) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return false;
  if (typeof node.decision === 'string') return node.decision !== 'refuse';
  if (typeof node.disposition === 'string') {
    if (NOT_A_WRITE_DISPOSITIONS.has(node.disposition)) return false;
    return WRITE_DISPOSITIONS.has(node.disposition);
  }
  return false;
}

/**
 * Every (field, widget) a field map declares written, with geometry.
 *
 * The enclosing document is carried down the walk. A field row usually does not
 * repeat its own documentId — New York's rows sit inside a documents[] entry
 * that names it once — and losing that context would leave the write
 * unattributable and silently unmeasured.
 */
export function declaredWrites(fieldMap) {
  const out = [];
  const descend = (node, inheritedDocumentId) => {
    if (Array.isArray(node)) {
      for (const v of node) descend(v, inheritedDocumentId);
      return;
    }
    if (!node || typeof node !== 'object') return;
    const documentId = node.documentId ?? node.document ?? inheritedDocumentId ?? null;
    if (isDeclaredWrite(node)) collect(node, documentId);
    for (const k of Object.keys(node)) descend(node[k], documentId);
  };
  const collect = (node, documentId) => {
    const name =
      node.field ?? node.fieldName ?? node.acroFieldName ?? node.effectiveLabel ?? null;
    const widgets = [];
    if (Array.isArray(node.widgets)) {
      for (const w of node.widgets) {
        if (w && typeof w.page === 'number' && w.rect && typeof w.rect.x === 'number') {
          widgets.push({ page: w.page, rect: w.rect, widgetIndex: w.widgetIndex ?? widgets.length });
        }
      }
    } else if (typeof node.page === 'number' && node.rect && typeof node.rect.x === 'number') {
      widgets.push({ page: node.page, rect: node.rect, widgetIndex: 0 });
    }
    if (widgets.length === 0) return;
    out.push({
      field: name,
      factId: node.factId ?? null,
      decision: node.decision ?? null,
      disposition: node.disposition ?? null,
      documentId: documentId ? String(documentId) : null,
      widgets,
    });
  };
  descend(fieldMap, null);
  return out;
}

/** The blank official source for a documentId, from the Master Library. */
function blankSourceFor(receipt, documentId) {
  const root = masterLibraryDir();
  if (!root || !receipt) return null;
  const docs = Array.isArray(receipt.documents) ? receipt.documents : [];
  const pick =
    docs.find((d) => documentId && d.documentId === documentId) ||
    (docs.length === 1 ? docs[0] : null);
  if (!pick?.pathInArchive) return null;
  const p = path.join(root, pick.pathInArchive);
  return fs.existsSync(p) ? { file: p, documentId: pick.documentId, pathInArchive: pick.pathInArchive } : null;
}

const normDoc = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

/** A fixture that carries whatever the family declares, because nothing separates them. */
const ANY_DOCUMENT = Symbol('any-document');

/**
 * Which document each fixture renders.
 *
 * A family commonly ships several documents — New York ships an Application, a
 * COD Request and a pro-se packet — and a field declared on one of them does
 * not exist on the others. Measuring every declared write against every fixture
 * therefore invents failures. reports/rendered-artifacts.json states the
 * pairing outright for most families; where it does not, the fixture stem is
 * matched against the document ids, and a single-document family pairs
 * trivially. A fixture that cannot be attributed in a multi-document family is
 * left unattributed and measured against nothing.
 */
function fixturesOf(dir, documentIds) {
  const out = [];
  const fx = path.join(dir, 'fixtures');
  if (!fs.existsSync(fx)) return out;

  const stated = new Map();
  const ra = readJsonIfPresent(path.join(dir, 'reports/rendered-artifacts.json'));
  for (const p of ra?.pdfs || []) {
    if (p?.file && p?.documentId) stated.set(path.basename(p.file), String(p.documentId));
  }

  const pdfs = fs.readdirSync(fx).filter((f) => /\.pdf$/i.test(f)).sort();
  // What the fixture renders, with the variant word removed wherever it sits.
  // "boundary.pdf" and "canonical.pdf" are the same document in two variants and
  // must reduce to the same stem; "rule-790-order-boundary.pdf" and
  // "rule-790-petition-boundary.pdf" are two documents and must not.
  const stemOf = (f) =>
    normDoc(f.replace(/\.pdf$/i, '').replace(/\b(canonical|boundary)\b/gi, ''));
  const stems = new Set(pdfs.map(stemOf));

  // Attribution only matters when the family renders several documents as
  // separate fixtures. One rendered artifact per variant is unambiguous however
  // many documents the map names — Maryland's single fixture pair carries both
  // of its documents — and a map naming no document at all cannot be ambiguous.
  const ambiguous = documentIds.length > 1 && stems.size > 1;

  for (const f of pdfs) {
    if (!ambiguous) {
      out.push({
        file: path.join(fx, f),
        name: f,
        documentId: documentIds.length === 1 ? documentIds[0] : ANY_DOCUMENT,
        attributedBy:
          documentIds.length <= 1
            ? 'the family renders a single document'
            : 'one rendered artifact per variant carries every document',
      });
      continue;
    }
    let documentId = stated.get(f) || null;
    let how = documentId ? 'rendered-artifacts.json' : null;
    if (!documentId) {
      const stem = stemOf(f);
      const hit = documentIds.filter((d) => {
        const n = normDoc(d);
        return stem.length >= 4 && (n.includes(stem) || stem.includes(n));
      });
      if (hit.length === 1) {
        [documentId] = hit;
        how = 'fixture stem matched the document id';
      }
    }
    out.push({ file: path.join(fx, f), name: f, documentId, attributedBy: how });
  }
  return out;
}

/** Every document id the field map names. */
function documentIdsOf(fieldMap) {
  const ids = new Set();
  for (const [node] of walk(fieldMap)) {
    if (node && typeof node === 'object' && !Array.isArray(node) && node.documentId) {
      ids.add(String(node.documentId));
    }
  }
  return [...ids];
}

/**
 * Independent cross-check on an absence.
 *
 * Ink is the authority because text extraction under-reports. The opposite
 * error is still possible: if the rasteriser silently dropped something the
 * text layer knows about — poppler warns "XObject subtype is missing or wrong
 * type" on several forms here — ink would under-report too. So every widget
 * ink calls empty is asked again, from the text layer, with word geometry. A
 * word sitting inside a rectangle ink called empty is a contradiction, and the
 * detector reports it rather than resolving it.
 */
function wordsInRegion(pdf, page, rect, pageHeightPts, cache) {
  const key = `${pdf}#${page}`;
  let words = cache.get(key);
  if (!words) {
    words = [];
    try {
      const xml = execFileSync(
        'pdftotext',
        ['-q', '-bbox', '-f', String(page), '-l', String(page), pdf, '-'],
        { encoding: 'utf8', maxBuffer: 1 << 24, timeout: 60000 },
      );
      const re = /<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g;
      let m;
      while ((m = re.exec(xml)) !== null) {
        words.push({
          xMin: Number(m[1]), yMin: Number(m[2]), xMax: Number(m[3]), yMax: Number(m[4]),
          text: m[5],
        });
      }
    } catch { /* leave empty; ink still decides */ }
    cache.set(key, words);
  }
  // -bbox reports y from the top; widget rects are from the bottom.
  const top = pageHeightPts - rect.y - rect.height;
  const bottom = pageHeightPts - rect.y;
  const inside = [];
  const overlapping = [];
  for (const w of words) {
    if (w.text.trim().length === 0) continue;
    const overlaps =
      w.xMax > rect.x && w.xMin < rect.x + rect.width && w.yMax > top && w.yMin < bottom;
    if (!overlaps) continue;
    // A word belongs to this field only when it sits in it. A value written to
    // a neighbouring field routinely clips into this rectangle — New Jersey's
    // court address runs through the county caption, Pennsylvania's second
    // address line runs through the city box — and counting that as this
    // field's value would credit a write that never happened.
    const cx = (w.xMin + w.xMax) / 2;
    const cy = (w.yMin + w.yMax) / 2;
    if (cx >= rect.x && cx <= rect.x + rect.width && cy >= top && cy <= bottom) inside.push(w.text);
    else overlapping.push(w.text);
  }
  return { inside, overlapping };
}

function pdfTextOfPage(pdf, page) {
  try {
    return execFileSync('pdftotext', ['-q', '-f', String(page), '-l', String(page), pdf, '-'], {
      encoding: 'utf8',
      maxBuffer: 1 << 24,
      timeout: 60000,
    });
  } catch {
    return '';
  }
}

export function measureWidget(ctx, fixture, blank, widget) {
  const { imgCache, heightCache, scratch } = ctx;
  const fh = pageHeights(fixture, heightCache);
  const fImg = renderPage(fixture, widget.page, scratch, imgCache);
  if (!fImg) return { measured: false, why: 'fixture page would not rasterise' };
  const fBox = rectToBox(widget.rect, fh, fImg);
  const fDark = darkFraction(fImg, fBox);
  if (fDark === null) return { measured: false, why: 'widget rectangle falls outside the page' };

  let bDark = null;
  if (blank) {
    const bh = pageHeights(blank, heightCache);
    const bImg = renderPage(blank, widget.page, scratch, imgCache);
    if (bImg) {
      const bBox = rectToBox(widget.rect, bh, bImg);
      bDark = darkFraction(bImg, bBox);
    }
  }

  const delta = bDark === null ? fDark : fDark - bDark;
  return {
    measured: true,
    page: widget.page,
    widgetIndex: widget.widgetIndex,
    rect: widget.rect,
    fixtureInk: Number(fDark.toFixed(5)),
    blankSourceInk: bDark === null ? null : Number(bDark.toFixed(5)),
    inkAddedByRender: Number(delta.toFixed(5)),
    baseline: bDark === null ? 'NO_BLANK_SOURCE' : 'BLANK_OFFICIAL_SOURCE',
    present: delta >= INK_DELTA_PRESENT,
  };
}

export function run({ onlyFamily = null } = {}) {
  const { families } = familyIndex();
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'truth4-d-'));
  const rows = [];
  const notMeasurable = [];

  try {
    for (const fam of families) {
      if (onlyFamily && fam.familyId !== onlyFamily) continue;
      if (fam.directories.length === 0) {
        notMeasurable.push({
          familyId: fam.familyId,
          reason: 'NOT_MEASURABLE_HERE',
          why: 'no census-v1 family directory, so the family renders no artifact to measure',
        });
        continue;
      }

      const perFamily = [];
      let declaredCount = 0;
      let fixturesRead = 0;
      let noGeometry = 0;
      let unattributedFixtures = 0;
      let unattributedWrites = 0;

      for (const d of fam.directories) {
        const fieldMap = readJsonIfPresent(path.join(d.dir, 'production-field-map.json'));
        if (!fieldMap) continue;
        const receipt = readJsonIfPresent(path.join(d.dir, 'source-receipt.json'));
        const writes = declaredWrites(fieldMap);
        // Declared writes carrying no geometry cannot be located on a page.
        for (const [node] of walk(fieldMap)) {
          if (isDeclaredWrite(node) && !Array.isArray(node.widgets) && typeof node.page !== 'number') {
            noGeometry += 1;
          }
        }
        if (writes.length === 0) continue;
        declaredCount += writes.length;

        const documentIds = documentIdsOf(fieldMap);
        const fixtures = fixturesOf(d.dir, documentIds);
        if (fixtures.length === 0) continue;

        const ctx = { imgCache: new Map(), heightCache: new Map(), wordCache: new Map(), scratch };
        for (const fx of fixtures) {
          if (!fx.documentId) { unattributedFixtures += 1; continue; }
          fixturesRead += 1;
          for (const w of writes) {
            // A field belongs to one document. Measuring it against a fixture
            // that renders a different document would invent a failure.
            if (fx.documentId !== ANY_DOCUMENT) {
              if (w.documentId && String(w.documentId) !== fx.documentId) continue;
              if (!w.documentId && documentIds.length > 1) { unattributedWrites += 1; continue; }
            }
            const blank = blankSourceFor(
              receipt,
              w.documentId || (fx.documentId === ANY_DOCUMENT ? null : fx.documentId),
            );
            for (const widget of w.widgets) {
              const m = measureWidget(ctx, fx.file, blank?.file || null, widget);
              if (!m.measured) continue;
              let textWitness = null;
              let textLayerWordsInRegion = null;
              let textLayerWordsClippingIn = null;
              if (!m.present) {
                // Consulted to corroborate an absence, never to overrule ink.
                const t = pdfTextOfPage(fx.file, widget.page);
                textWitness = t.trim().length > 0 ? 'page extracts text' : 'page extracts no text';
                // The form's own labels overlap these rectangles — New Jersey's
                // county caption sits inside "(where you are filing)". So the
                // same subtraction ink uses is applied here: words the blank
                // official source already carries are the form's, not a value.
                const onFixture = wordsInRegion(
                  fx.file,
                  widget.page,
                  widget.rect,
                  pageHeights(fx.file, ctx.heightCache),
                  ctx.wordCache,
                );
                const onBlank = blank?.file
                  ? wordsInRegion(
                      blank.file,
                      widget.page,
                      widget.rect,
                      pageHeights(blank.file, ctx.heightCache),
                      ctx.wordCache,
                    )
                  : { inside: [], overlapping: [] };
                const subtract = (fixtureWords, blankWords) => {
                  const counts = new Map();
                  for (const w of blankWords) counts.set(w, (counts.get(w) || 0) + 1);
                  return fixtureWords.filter((w) => {
                    const n = counts.get(w) || 0;
                    if (n > 0) { counts.set(w, n - 1); return false; }
                    return true;
                  });
                };
                textLayerWordsInRegion = subtract(onFixture.inside, onBlank.inside || []);
                textLayerWordsClippingIn = subtract(
                  onFixture.overlapping,
                  onBlank.overlapping || [],
                );
              }
              perFamily.push({
                fixture: rel(fx.file),
                fixtureDocumentId: fx.documentId === ANY_DOCUMENT ? null : fx.documentId,
                fixtureAttributedBy: fx.attributedBy,
                field: w.field,
                factId: w.factId,
                decision: w.decision,
                disposition: w.disposition,
                documentId: w.documentId,
                blankSource: blank ? blank.pathInArchive : null,
                ...m,
                textWitness,
                textLayerWordsInRegion,
                textLayerWordsClippingIn,
                textLayerBaseline: blank?.file ? 'BLANK_OFFICIAL_SOURCE' : 'NO_BLANK_SOURCE',
                inkAndTextDisagree:
                  Array.isArray(textLayerWordsInRegion) && textLayerWordsInRegion.length > 0,
              });
            }
          }
        }
      }

      if (declaredCount === 0) {
        notMeasurable.push({
          familyId: fam.familyId,
          reason: 'NOT_MEASURABLE_HERE',
          why: 'the family field map declares no participant write carrying page geometry, so no region can be inspected',
        });
        continue;
      }
      if (perFamily.length === 0) {
        notMeasurable.push({
          familyId: fam.familyId,
          reason: 'NOT_MEASURABLE_HERE',
          why:
            'the family declares writes with geometry but no fixture PDF could be measured against ' +
            'them — it renders none, or it renders several documents that could not be paired to a ' +
            'declared write without guessing',
          declaredWrites: declaredCount,
        });
        continue;
      }

      const absent = perFamily.filter((m) => !m.present);
      // A field is only credited when every one of its widgets carries ink, on
      // every fixture: a caption repeated down a document means a different
      // fact on each row.
      const absentFields = [...new Set(absent.map((a) => `${a.fixture}::${a.field}`))];
      const withoutBaseline = perFamily.filter((m) => m.baseline === 'NO_BLANK_SOURCE').length;

      rows.push({
        familyId: fam.familyId,
        jurisdiction: fam.jurisdiction,
        directories: fam.directories.map((x) => x.dirRel),
        declaredWritesWithGeometry: declaredCount,
        declaredWritesWithoutGeometry: noGeometry,
        fixturesMeasured: fixturesRead,
        widgetMeasurements: perFamily.length,
        widgetsProvenPresent: perFamily.length - absent.length,
        widgetsProvenAbsent: absent.length,
        measurementsWithoutBlankBaseline: withoutBaseline,
        fixturesNotAttributableToADocument: unattributedFixtures,
        declaredWritesNotAttributableToADocument: unattributedWrites,
        widgetsWhereInkAndTextDisagree: absent.filter((a) => a.inkAndTextDisagree).length,
        result: absent.length === 0 ? 'PASS' : 'FAIL',
        failures: absent.length > 0 ? ['D1_DECLARED_WRITE_NOT_IN_ARTIFACT'] : [],
        absentFieldCount: absentFields.length,
        absentWidgets: absent.map((a) => ({
          fixture: a.fixture,
          fixtureDocumentId: a.fixtureDocumentId,
          fixtureAttributedBy: a.fixtureAttributedBy,
          field: a.field,
          factId: a.factId,
          declaredBy: a.decision ? `decision=${a.decision}` : `disposition=${a.disposition}`,
          page: a.page,
          widgetIndex: a.widgetIndex,
          rect: a.rect,
          blankSource: a.blankSource,
          baseline: a.baseline,
          fixtureInk: a.fixtureInk,
          blankSourceInk: a.blankSourceInk,
          inkAddedByRender: a.inkAddedByRender,
          textWitness: a.textWitness,
          textLayerWordsInRegion: a.textLayerWordsInRegion,
          textLayerWordsClippingIn: a.textLayerWordsClippingIn,
          textLayerBaseline: a.textLayerBaseline,
          inkAndTextDisagree: a.inkAndTextDisagree,
        })),
      });
    }
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }

  const failing = rows.filter((r) => r.result === 'FAIL');
  return {
    checkId: 'D',
    title: 'ACTUAL ARTIFACT WRITE',
    question:
      'A declared participant write counts only when the final PDF proves the value is present ' +
      'in the expected field or page region. Which declared writes are not there?',
    method: {
      authority: 'ink inside the declared widget rectangle on the rendered fixture',
      baseline:
        'the same rectangle on the blank official source in the Master Library, subtracted so the ' +
        "form's own rules, shading and labels are not read as a participant value",
      inkDeltaThreshold: INK_DELTA_PRESENT,
      dpi: 150,
      textExtraction:
        'consulted only to corroborate an absence, never to overrule ink. Every widget ink calls ' +
        'empty is asked again from the text layer with word geometry; a word inside a rectangle ' +
        'ink called empty is reported as inkAndTextDisagree rather than silently resolved.',
    },
    crossCheckInterpretation: {
      whatInkAndTextDisagreeMeans:
        'the text layer holds a word centred in a rectangle the raster shows empty. It is a ' +
        'prompt to look, not a verdict, and this detector does not resolve it.',
      whatWasObservedHere:
        'every disagreement in this run traces to one cause, confirmed by eye on New Jersey page ' +
        '27 and on Pennsylvania: a boundary fixture writes a deliberately over-long value that ' +
        'overflows its own field, so the tail of the address lands on the neighbouring county ' +
        "rectangle's coordinates in the text layer while the render clips it. The county line is " +
        'blank on the page. The absence stands; the disagreement is the neighbour, not the field.',
      whyItIsReportedAnyway:
        'the opposite case — a value the raster misses — would look identical from here, so the ' +
        'rows are published rather than suppressed.',
    },
    trapsHandled: {
      fieldMeasuredAgainstTheWrongDocument:
        'a family may ship several documents and a field declared on one does not exist on the ' +
        'others, so each declared write is measured only against the fixture that renders its own ' +
        'document, paired from reports/rendered-artifacts.json where that states the pairing',
      formXObjectWithUnmappableFont:
        'a value drawn in a Form XObject with a font pdftotext cannot map is present even though ' +
        'text extraction shows nothing, so ink and not pdftotext decides presence',
      captionRepeatedAcrossRows:
        'a caption repeating across the rows of one document means a different fact on each row, ' +
        'so every widget is measured and reported separately and a field is never credited ' +
        'because one of its widgets carries ink',
    },
    declaredWriteVocabulary: {
      byDecision: 'any decision that is not "refuse"',
      byDisposition: [...WRITE_DISPOSITIONS],
      notAWrite: [...NOT_A_WRITE_DISPOSITIONS],
      note:
        'REQUIRED_BEFORE_FILING is a blank the packet deliberately leaves for the participant. ' +
        'Counting it here would manufacture failures out of disclosed blanks.',
    },
    failureCodes: {
      D1_DECLARED_WRITE_NOT_IN_ARTIFACT:
        'a field the map declares written adds no ink to its own widget rectangle on the rendered artifact',
    },
    denominator: {
      fleetFamilies: families.length,
      familiesMeasured: rows.length,
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
 * Negative control. Uses the New Jersey kit, whose blank source and rendered
 * fixture are both in the tree, to prove the measurement separates a written
 * field from an empty one and that it survives the two traps.
 */
function selftest() {
  const dir = path.join(
    REPO_ROOT,
    'data/rcap-all50/overlays/census-v1/nj/nj-arrest-no-conviction-set--official-pdf-fill',
  );
  const fieldMap = readJsonIfPresent(path.join(dir, 'production-field-map.json'));
  const receipt = readJsonIfPresent(path.join(dir, 'source-receipt.json'));
  const fixture = path.join(dir, 'fixtures/cn-10557-canonical.pdf');
  const blank = blankSourceFor(receipt, 'NJ-CN-10557');
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'truth4-d-st-'));
  const ctx = { imgCache: new Map(), heightCache: new Map(), scratch };
  const writes = declaredWrites(fieldMap);
  const byName = new Map(writes.map((w) => [w.field, w]));
  const cases = [
    { field: 'DefName', expect: true, why: 'a value the fixture really carries' },
    { field: 'DefAddrCity', expect: true, why: 'a second written value' },
    { field: 'ExpungeCntyName', expect: false, why: 'the hand-measured empty county caption' },
  ];
  let ok = Boolean(blank);
  if (!blank) process.stdout.write('  FAIL blank official source unavailable (MASTER_LIBRARY_SOURCE_DIR)\n');
  for (const c of cases) {
    const w = byName.get(c.field);
    if (!w) { ok = false; process.stdout.write(`  FAIL ${c.field} not declared\n`); continue; }
    const results = w.widgets.map((x) => measureWidget(ctx, fixture, blank?.file || null, x));
    const present = results.every((r) => r.present);
    const pass = present === c.expect;
    if (!pass) ok = false;
    process.stdout.write(
      `  ${pass ? 'ok  ' : 'FAIL'} ${c.field} (${c.why}) -> present=${present} ` +
        `across ${results.length} widget(s); inkAdded=${results.map((r) => r.inkAddedByRender).join(',')}\n`,
    );
  }
  // Trap 2: every widget measured separately, not collapsed to the first.
  const cnty = byName.get('ExpungeCntyName');
  const perWidget = cnty.widgets.map((x) => measureWidget(ctx, fixture, blank?.file || null, x));
  const pagesSeen = perWidget.map((r) => r.page);
  const trapOk = perWidget.length === 4 && new Set(pagesSeen).size === 4;
  if (!trapOk) ok = false;
  process.stdout.write(
    `  ${trapOk ? 'ok  ' : 'FAIL'} repeated caption measured per row -> ${perWidget.length} widgets on pages ${pagesSeen.join('/')}\n`,
  );
  fs.rmSync(scratch, { recursive: true, force: true });
  return ok;
}

const argv = process.argv.slice(2);
if (argv.includes('--selftest')) {
  process.stdout.write('CHECK D selftest (negative control, New Jersey kit)\n');
  process.exit(selftest() ? 0 : 1);
}
const famArg = argv.indexOf('--family');
const section = run({ onlyFamily: famArg >= 0 ? argv[famArg + 1] : null });
if (!argv.includes('--no-write')) writeSection('D', section);
process.stdout.write(
  `CHECK D  failing families: ${section.failingFamilyCount}` +
    `  passing: ${section.passingFamilyCount}` +
    `  not measurable: ${section.notMeasurable.length}\n`,
);
for (const f of section.failingFamilies) {
  const fields = [...new Set(f.absentWidgets.map((a) => a.field))];
  process.stdout.write(
    `  FAIL ${f.familyId}  ${f.widgetsProvenAbsent}/${f.widgetMeasurements} widget(s) empty; fields: ${fields.join(', ')}\n`,
  );
}
