/**
 * Naming and ordering the blanks a participant is asked to fill in.
 *
 * FIX130, 2026-09-10. This is the shared home for a repair that had already
 * been written out by hand twice, and was about to be written a third time.
 *
 * WHAT IT IS FOR
 *
 * A packet's "what you must do before you file" list is, for most participants,
 * the only instrument they have for finding a blank on a court form. Each item
 * names a blank by the words the form prints beside it. That is enough only
 * where those words appear beside exactly ONE blank on that page. Court forms
 * are full of repeating tables -- three charge rows, three new-charge rows, two
 * state-agency rows -- and in a repeating table every row prints the same
 * column headings, so the caption alone names three blanks and the participant
 * cannot tell which row an item means.
 *
 * The list is also, by default, emitted in whatever order the AcroForm field
 * tree happens to hold, which is not the order the page is read in.
 *
 * WHY IT LIVES HERE AND NOT IN A BUILD HOST
 *
 * Two Vermont hosts already carry a hand-written copy of this logic -- FIX130's
 * five seal families in build-census-v1-vt_seal_misdemeanor-set.mjs and FIX05's
 * expungement families in build-census-v1-vt_exp_decriminalized-set.mjs -- and
 * they were written independently against the same defect. The third family to
 * need it, vt_seal_nonconviction-set, was MISSED for exactly that reason: the
 * first repair was scoped by an opt-in set inside one host, so a sibling family
 * on a different host kept the defect and carried it into terminal status.
 *
 * Every host in this repository that publishes a requiredBeforeFiling list
 * builds it the same way, from the same census shape. A repair that is copied
 * into one host at a time is a repair that will be missed again. This module is
 * the shared home so the next host imports it instead of re-deriving it, and so
 * a change to the wording a participant reads changes in one place.
 *
 * WHAT IT DOES NOT DO
 *
 * It composes nothing. Every locator it emits is either a number the form
 * itself prints, read out of the pinned binary at build time, or an explicit
 * statement that the form prints no number there. It never invents a row
 * number, and it never implies one by silence: the "the form prints no row
 * numbers here" clause is load-bearing, because a participant told "second row"
 * on a form that prints "1. 2. 3." would go looking for a printed 2 that means
 * something else.
 *
 * It is not an input to any rendered page. It reaches the field map and the
 * participant instruction markdown. Callers that draw instruction pages from a
 * separately composed body do not move a PDF byte by adopting it.
 *
 * WHAT THE CALLER MUST SUPPLY
 *
 * A census per document, shaped as the census builders in this repository
 * already shape it:
 *
 *   census.rows[]     { key, page, rect: {x, y, width, height}, effectiveLabel }
 *   census.pageText[] { page, lines: [{ x, yExact, text }] }
 *
 * `x` and `yExact` on a printed line are REQUIRED and are checked. `yExact` is
 * the baseline at the precision the anchor capture reports it -- one decimal
 * place -- as against the integer a census typically rounds `y` to for its
 * caption search; it is not a claim of infinite precision, and it is tested
 * against widget rectangles whose bands are more than a point deep, so a tenth
 * of a point is comfortably inside the tolerance.
 *
 * A caller whose line records carry only the rounded baseline and no left edge
 * cannot recognise a printed row-number column, and would silently publish "the
 * form prints no row numbers here" for a form that prints them -- a false
 * statement about the paper, produced by a missing field. That is refused
 * rather than guessed.
 */
import assert from "node:assert/strict";

export const ORDINALS = [
  "first", "second", "third", "fourth", "fifth",
  "sixth", "seventh", "eighth", "ninth", "tenth"
];

/*
 * A printed number is accepted as a ROW NUMBER only when it behaves like a
 * table's row-number column: every row in the group has one, they increase down
 * the page, and they are all printed at one left edge. The tolerance is the
 * width of that column, not a guess about the page.
 */
export const ROW_NUMBER_COLUMN_TOLERANCE_PT = 2;

/*
 * How far apart two blanks' baselines may be and still be one printed row.
 *
 * The cells of one printed row do not share an exact baseline on these forms:
 * a court form's table cells are laid out per column, so a row's cells differ
 * by a point or two. Any tolerance wider than the widest row and narrower than
 * the closest gap between two rows separates the rows and joins each row's own
 * cells.
 *
 * This number is not asserted to be correct in a comment. `inReadingOrder`
 * checks it against the geometry it is actually given and stops the build if
 * two bands on a page come within the tolerance of each other, so a form whose
 * tables are tighter than this refuses rather than publishing an order it
 * cannot justify.
 *
 * Be precise about which of the two properties is CHECKED and which is
 * GUARANTEED, because they are not the same and a reader should not be left
 * thinking both are earned the same way. The band separation is checked and can
 * fail. The band spread cannot: clustering is greedy against a band's SEED
 * baseline, which never moves, so every member is within the tolerance of the
 * seed and the spread is bounded by the tolerance by construction. The spread
 * assertion below is therefore unreachable as the clustering is written today.
 * It is kept deliberately, as the thing that would fail first if the seed were
 * ever changed to a running mean or a midpoint -- a plausible future edit that
 * would silently widen bands -- and it is documented as unreachable so nobody
 * counts it as evidence that today's bands were measured.
 */
export const READING_ORDER_BAND_PT = 4;

/* How far to the left of a blank a row number must sit to be that blank's. */
const ROW_NUMBER_LEFT_OF_BLANK_PT = 4;

/* How far below a blank's own baseline a printed row number may sit. */
const ROW_NUMBER_BELOW_BASELINE_PT = 2;

function assertLineGeometry(census, where) {
  for (const p of census.pageText ?? []) {
    for (const l of p.lines ?? []) {
      assert.ok(typeof l.x === "number" && Number.isFinite(l.x),
        `${where} page ${p.page}: a printed line carries no left edge, so a printed row-number column cannot be recognised and this build would claim the form prints no row numbers without having looked`);
      assert.ok(typeof l.yExact === "number" && Number.isFinite(l.yExact),
        `${where} page ${p.page}: a printed line carries no unrounded baseline, so it cannot be tested against a widget's own rectangle`);
    }
  }
}

/**
 * Which of several identically-captioned blanks this one is, resolved by
 * geometry against the printed page and never by AcroForm field name -- the
 * field names on these forms are bare ordinals that agree with the printed row
 * numbers nowhere, and some of them name two different blanks in two unrelated
 * tables on one page.
 *
 * A locator is attached only where one is NEEDED: where the same printed words
 * name more than one blank on one page of one form. Those blanks are ordered by
 * their own rectangles, top of the page first. Where the form prints a row
 * number beside every one of them, that printed number is the locator and the
 * label says it is printed. Where it does not, the locator is the blank's
 * position down the page -- something the participant can see -- and the label
 * says the form prints no numbers there rather than implying one.
 *
 * @returns Map keyed `${row.key}@p${row.page}` -> locator phrase.
 */
function analyseGroups(census, where) {
  assertLineGeometry(census, where);
  const byLabel = new Map();
  for (const r of census.rows) {
    const key = `p${r.page}|${r.effectiveLabel}`;
    byLabel.set(key, [...(byLabel.get(key) ?? []), r]);
  }
  const groups = [];
  for (const group of byLabel.values()) {
    if (group.length < 2) continue;
    const ordered = [...group].sort((a, b) => b.rect.y - a.rect.y);
    const page = ordered[0].page;
    const lines = census.pageText.find((p) => p.page === page)?.lines ?? [];
    const printed = ordered.map((r) => lines.find((l) => /^\d+\.$/.test(l.text)
      // inside this blank's OWN vertical band, read from its own rectangle
      && l.yExact >= r.rect.y - ROW_NUMBER_BELOW_BASELINE_PT
      && l.yExact <= r.rect.y + r.rect.height
      // and to the left of it, which is where a row number is printed
      && l.x < r.rect.x - ROW_NUMBER_LEFT_OF_BLANK_PT) ?? null);
    const found = printed.filter((l) => l !== null).length;
    /*
     * ALL OR NOTHING, and the build refuses in between.
     *
     * This is the premise the participant's label asserts about the paper. If a
     * number is found beside SOME rows of a group and not others, the old
     * behaviour was to fall back to positional ordinals and print "the form
     * prints no row numbers here" -- a plain false statement about a page that
     * demonstrably prints some. That is the shape a repin would produce if a
     * revised form nudged one row number out of its band, and it would reach a
     * participant silently, so it stops the build instead.
     */
    assert.ok(found === 0 || found === ordered.length,
      `${where} page ${page}: the caption "${ordered[0].effectiveLabel}" names ${ordered.length} blanks and a printed row number was found beside ${found} of them. Either the form numbers that table or it does not; a partial reading would publish "the form prints no row numbers here" about a page that prints ${found}`);
    const numbers = printed.map((l) => (l ? Number(l.text.slice(0, -1)) : null));
    const everyRowNumbered = found === ordered.length
      && numbers.every((n, i) => i === 0 || n > numbers[i - 1])
      && printed.every((l) => Math.abs(l.x - printed[0].x) <= ROW_NUMBER_COLUMN_TOLERANCE_PT);
    /*
     * Found beside every row, but not as a COLUMN -- out of order down the page,
     * or not at one left edge. Same reasoning: falling back to ordinals would
     * deny in print that the form numbers a table it does number.
     *
     * Written as a branch rather than as `assert.ok(found === 0 || ...)`: a
     * template literal passed to assert.ok is evaluated whether the assertion
     * holds or not, and on the unnumbered path -- which is 12 of this family's
     * 15 groups -- every entry of `printed` is null, so composing the message
     * would throw on a page that is perfectly sound. Found by mutation-testing
     * the guard rather than by reading it.
     */
    if (found > 0 && !everyRowNumbered) {
      assert.fail(`${where} page ${page}: the caption "${ordered[0].effectiveLabel}" has a printed number beside every one of its ${ordered.length} blanks, but they do not read as a row-number column (numbers ${JSON.stringify(numbers)}, left edges ${JSON.stringify(printed.map((l) => l?.x ?? null))})`);
    }
    groups.push({
      page, label: ordered[0].effectiveLabel, size: ordered.length,
      numbered: everyRowNumbered, numbers: everyRowNumbered ? numbers : null, ordered
    });
  }
  return groups;
}

export function rowLocatorsFor(census, where = "census") {
  const locator = new Map();
  for (const g of analyseGroups(census, where)) {
    g.ordered.forEach((r, i) => {
      assert.ok(g.numbered || i < ORDINALS.length,
        `${where}: a caption names ${g.size} blanks on one page and the form prints no row numbers, which is more positions than there are ordinals to name them by`);
      locator.set(`${r.key}@p${r.page}`, g.numbered
        ? `row ${g.numbers[i]} as printed on the form`
        : `${ORDINALS[i]} row (the form prints no row numbers here)`);
    });
  }
  return locator;
}

/**
 * What the forms were found to print, in a shape a build host can PIN.
 *
 * A locator that silently changes from "row 2 as printed on the form" to
 * "second row (the form prints no row numbers here)" because a repinned revision
 * moved a number two points is a change to what a participant reads, and nothing
 * downstream would see it: both strings are well-formed, both are honest about
 * the page as measured, and every counter stays zero. A host that pins the
 * expected shape here turns that into a refused build.
 *
 * @returns [{ formNumber, page, label, size, numbered }]
 */
export function describeRowNumberGroups(censuses) {
  return censuses.flatMap(({ source, census }) =>
    analyseGroups(census, source.formNumber).map((g) => ({
      formNumber: source.formNumber, page: g.page, label: g.label,
      size: g.size, numbered: g.numbered
    })));
}

/**
 * The label a participant reads: the words the form prints beside that blank
 * and -- only where those words name more than one blank on that page -- which
 * one.
 *
 * Two blanks on one page of one form may not carry the same identifier, and the
 * build refuses rather than emit a list where they do. The check covers every
 * widget on every form, not only the ones that reach the participant's list.
 *
 * @param censuses [{ source: { formNumber }, census }]
 * @returns Map keyed `${formNumber}|${row.key}|${row.page}` -> label.
 */
export function disclosureLabelsFor(censuses) {
  const labels = new Map();
  const seen = new Map();
  for (const { source, census } of censuses) {
    const locator = rowLocatorsFor(census, source.formNumber);
    for (const r of census.rows) {
      const where = locator.get(`${r.key}@p${r.page}`);
      const label = where ? `${r.effectiveLabel} — ${where}` : r.effectiveLabel;
      labels.set(`${source.formNumber}|${r.key}|${r.page}`, label);
      const uniquenessKey = `${source.formNumber}|p${r.page}|${label}`;
      seen.set(uniquenessKey, [...(seen.get(uniquenessKey) ?? []), r.key]);
    }
  }
  const collisions = [...seen.entries()]
    .filter(([, keys]) => keys.length > 1)
    .map(([key, widgets]) => ({ key, widgets }));
  assert.equal(collisions.length, 0,
    `two blanks on one page of one form would be disclosed to the participant under the same label: ${JSON.stringify(collisions.slice(0, 4))}`);
  return labels;
}

/**
 * Page, then down the page, then across the row.
 *
 * Clustered into rows FIRST, because ordering on the raw baseline interleaves
 * the columns of a row whose cells sit a fraction of a point apart -- which is
 * how a row's right-hand cell comes to be emitted above the left-hand cell that
 * introduces it, printing a demonstrative before its antecedent.
 *
 * The band tolerance is proven against the geometry of the items actually
 * passed in. If a band ever held two cells further apart than the tolerance, or
 * two bands on a page ever came closer together than the tolerance, the
 * clustering would be arbitrary and the build stops.
 *
 * @param items [{ page, y, x, ... }]
 */
export function inReadingOrder(items, where) {
  const bands = [];
  for (const r of [...items].sort((a, b) => a.page - b.page || b.y - a.y)) {
    assert.ok(Number.isFinite(r.y) && Number.isFinite(r.x),
      `${where}: an item carries no measured position, and an unmeasured position is not position zero`);
    const band = bands.find((b) => b.page === r.page && Math.abs(b.y - r.y) <= READING_ORDER_BAND_PT);
    if (band) band.rows.push(r);
    else bands.push({ page: r.page, y: r.y, rows: [r] });
  }
  /*
   * Unreachable while a band's `y` is its seed and never moves: every member
   * joined by being within the tolerance of that seed. Kept as the guard that
   * would fail first if the seed were ever changed to a running mean. See the
   * note on READING_ORDER_BAND_PT; do not read a pass here as a measurement.
   */
  for (const b of bands) {
    const ys = b.rows.map((r) => r.y);
    const spread = Math.max(...ys) - Math.min(...ys);
    assert.ok(spread <= READING_ORDER_BAND_PT,
      `${where} page ${b.page}: one row band spans ${spread.toFixed(2)}pt, wider than the ${READING_ORDER_BAND_PT}pt tolerance that built it, so the row clustering is not sound`);
  }
  for (const page of new Set(bands.map((b) => b.page))) {
    const extents = bands.filter((b) => b.page === page)
      .map((b) => ({ lo: Math.min(...b.rows.map((r) => r.y)), hi: Math.max(...b.rows.map((r) => r.y)) }))
      .sort((a, b) => b.hi - a.hi);
    for (let i = 1; i < extents.length; i += 1) {
      const gap = extents[i - 1].lo - extents[i].hi;
      assert.ok(gap > READING_ORDER_BAND_PT,
        `${where} page ${page}: two row bands are ${gap.toFixed(2)}pt apart, within the ${READING_ORDER_BAND_PT}pt tolerance, so which row a blank belongs to is not decidable from its baseline alone`);
    }
  }
  return bands.flatMap((b) => [...b.rows].sort((a, b2) => a.x - b2.x));
}

/**
 * The last line of defence, over the list actually emitted rather than over the
 * census it was derived from. This is the artifact the defect lived in, and it
 * is the check that would fail if the label derivation and the emission ever
 * came apart.
 */
export function assertNoTwoBlanksShareALabel(items, where) {
  const disclosed = new Map();
  for (const i of items) {
    const key = `${i.document}|p${i.page}|${i.disclosureLabel}`;
    disclosed.set(key, [...(disclosed.get(key) ?? []), i.field]);
  }
  const shared = [...disclosed.entries()].filter(([, fields]) => fields.length > 1);
  assert.equal(shared.length, 0,
    `${where}: the participant's item list would name ${shared.length} caption(s) against more than one blank: ${JSON.stringify(shared.slice(0, 4))}`);
}
