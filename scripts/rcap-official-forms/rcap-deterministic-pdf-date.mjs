/*
 * One fixed timestamp for every packet PDF this factory assembles.
 *
 * pdf-lib stamps the wall clock into a document created with
 * PDFDocument.create(). Two builds of the same family from the same inputs
 * therefore differ: measured on two empty documents 1.1 seconds apart, 257 of
 * 583 bytes differ, because the date string moves every following byte offset
 * and the xref table cascades behind it.
 *
 * That breaks the raster gate rather than the packet. A RASTER_PASS is bound to
 * a SHA-256, and the raster queue's carry-forward keeps a verdict only while
 * both pinned hashes are unchanged. A rebuild that changed nothing would move
 * the hash, and the verdict would be discarded as though the packet had been
 * edited. PF-C found this while rebasing and fixed the three families it owned.
 *
 * This lives in rcap-official-forms/ and NOT in scripts/lib/ deliberately:
 * deploy/rcap-render-worker/Dockerfile copies scripts/lib/ wholesale into the
 * render worker image, so a new file there changes the image fingerprint. That
 * is exactly how PR #169 broke main.
 *
 * The value matches ND_PACKET_PDF_DATE in the two shared assemblers, which
 * already did this correctly, so the whole factory now emits one date.
 */
export const RCAP_PACKET_PDF_DATE = new Date("2026-08-29T00:00:00.000Z");

/** Stamp a freshly created document so its bytes do not depend on when it was built. */
export const stampDeterministic = (doc) => {
  doc.setCreationDate(RCAP_PACKET_PDF_DATE);
  doc.setModificationDate(RCAP_PACKET_PDF_DATE);
  return doc;
};
