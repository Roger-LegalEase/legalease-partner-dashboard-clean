import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { PDFDocument, PDFName, PDFArray, decodePDFRawStream } from 'pdf-lib';
const dir = 'data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading';
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const read = p => JSON.parse(fs.readFileSync(p));
const report = read(`${dir}/reports/rendered-artifacts.json`);
const result = [];
const source = read(`${dir}/source-receipt.json`).documents.find(s => s.physicalPage === 475);
const sourceBytes = fs.readFileSync(source.path);
if (hash(sourceBytes) !== source.sha256) throw Error('OFFICIAL_CONTAINER_HASH');
const sourcePdf = await PDFDocument.load(sourceBytes);
function imageHashes(doc, page) {
  const objects = page.node.Resources().lookup(PDFName.of('XObject'));
  const hashes = [];
  for (const key of objects?.keys() ?? []) {
    const stream = doc.context.lookup(objects.get(key));
    if (stream.dict?.get(PDFName.of('Subtype'))?.toString() === '/Image') hashes.push(hash(stream.contents));
  }
  return hashes.sort();
}
const originalImageHashes = imageHashes(sourcePdf, sourcePdf.getPage(474));
if (!originalImageHashes.length) throw Error('NO_OFFICIAL_IMAGE');
for (const packet of report.packets) {
  const bytes = fs.readFileSync(`${dir}/${packet.file}`);
  if (hash(bytes) !== packet.sha256) throw Error(`PACKET_HASH:${packet.fixture}`);
  const pdf = await PDFDocument.load(bytes);
  if (pdf.getPageCount() !== packet.pageCount) throw Error('PACKET_PAGES');
  const home = path.dirname(`${dir}/${packet.file}`);
  const coverage = read(`${home}/coverage.json`);
  let next = 1, glyphCount = 0;
  const documents = [];
  for (const component of coverage) {
    const cb = fs.readFileSync(`${home}/${component.documentId}.pdf`);
    if (hash(cb) !== component.sha256 || component.firstPage !== next) throw Error('COMPONENT_IDENTITY');
    const doc = await PDFDocument.load(cb);
    if (doc.getPageCount() !== component.pageCount) throw Error('COMPONENT_PAGES');
    next += component.pageCount;
    if (component.documentId === '96C1' && JSON.stringify(imageHashes(doc, doc.getPage(0))) !== JSON.stringify(originalImageHashes)) throw Error('OFFICIAL_IMAGE_CHANGED');
    if (component.documentId === 'bci-transmission') {
      if (hash(cb) !== '9234ec763403b1ccfbed796dfcf86f29bf7887390d1770460d0bcc9da31fc8cb') throw Error('BCI_CHANGED');
      documents.push({ id: component.documentId, sha256: hash(cb), originalBciUnmodified: true });
      continue;
    }
    let componentGlyphs = 0, fontOperations = 0;
    for (const page of doc.getPages()) {
      const fontDict = page.node.Resources().lookup(PDFName.of('Font'));
      const maps = new Map();
      for (const key of fontDict.keys()) {
        const font = fontDict.lookup(key);
        if (!font.lookup(PDFName.of('BaseFont')).toString().includes('ArialMT')) continue;
        const descendant = doc.context.lookup(font.lookup(PDFName.of('DescendantFonts')).get(0));
        const descriptor = descendant.lookup(PDFName.of('FontDescriptor'));
        if (!descriptor.get(PDFName.of('FontFile2'))) throw Error('ARIAL_NOT_EMBEDDED');
        const cmap = new TextDecoder().decode(decodePDFRawStream(font.lookup(PDFName.of('ToUnicode'))).decode());
        const chars = new Map();
        for (const block of cmap.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
          for (const pair of block[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
            chars.set(pair[1].toUpperCase(), String.fromCharCode(...pair[2].match(/.{4}/g).map(s => parseInt(s, 16))));
          }
        }
        maps.set(key.toString(), chars);
      }
      const contents = page.node.Contents();
      for (const ref of (contents instanceof PDFArray ? contents.asArray() : [contents])) {
        const stream = new TextDecoder().decode(decodePDFRawStream(doc.context.lookup(ref)).decode());
        let current = null;
        for (const token of stream.matchAll(/(\/[A-Za-z0-9-]+)\s+([0-9.]+)\s+Tf|<([0-9A-Fa-f]+)>\s*Tj/g)) {
          if (token[1]) {
            current = maps.get(token[1]);
            if (current) {
              if (![8, 12].includes(Number(token[2]))) throw Error('UNEXPECTED_BODY_FONT_SIZE');
              fontOperations++;
            }
          } else if (current) {
            for (const code of token[3].match(/.{4}/g)) {
              const char = current.get(code.toUpperCase());
              if (char === undefined) throw Error('UNMAPPED_RENDERED_GLYPH');
              if (!/\s/.test(char)) componentGlyphs++;
            }
          }
        }
      }
    }
    if (fontOperations === 0 || componentGlyphs === 0) throw Error('NO_MEASURED_ARIAL_CONTENT');
    glyphCount += componentGlyphs;
    documents.push({ id: component.documentId, sha256: hash(cb), pageCount: doc.getPageCount(), measuredArialNonWhitespaceGlyphs: componentGlyphs, fontOperations, embeddedArial: true });
  }
  if (next - 1 !== packet.pageCount) throw Error('COVERAGE_PAGES');
  result.push({ fixture: packet.fixture, file: packet.file, sha256: hash(bytes), byteLength: bytes.length, pageCount: packet.pageCount, measuredArialNonWhitespaceGlyphs: glyphCount, documents });
}
const dest = 'data/rcap-grade-a/packet-factory-24h/vfoh1/oh-independent-current-stream-measurement.json';
fs.writeFileSync(dest, JSON.stringify({ reviewer: '/root/prerequisite', officialSourceImageHashes: originalImageHashes, method: 'Decode saved Arial Identity-H Tj codes through actual embedded ToUnicode; count nonwhitespace mapped glyphs. Verify all component hashes, contiguous page coverage, embedded TrueType and 12pt body/8pt footer operations. BCI exact source unchanged.', packets: result }, null, 2) + '\n');
console.log({ packets: result.length, pages: result.reduce((n, p) => n + p.pageCount, 0), measuredDocuments: result.flatMap(p => p.documents).filter(d => d.embeddedArial).length });
