/** Internal route provenance belongs in evidence, not on composed filing pages.
 * Keep the original wrapped-row count: removing ink must not move signatures,
 * court footers, page numbers, or page breaks. Official PDF filling is separate.
 */
export function courtFacingRows(wrap) {
  return (line, ...args) => {
    const rows = wrap(line, ...args);
    // A nonempty space also preserves block balancers that count nonempty rows.
    return /^\s*_?Route:\s*obligation:\S/.test(line)
      ? rows.map(() => " ")
      : rows;
  };
}
