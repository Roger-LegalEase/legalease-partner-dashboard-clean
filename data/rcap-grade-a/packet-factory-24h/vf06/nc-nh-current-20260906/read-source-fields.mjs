import fs from 'node:fs';
import crypto from 'node:crypto';
import { PDFDocument } from 'pdf-lib';

// Read-only source/widget census. No builder or packet finalizer is invoked.
const out = 'data/rcap-grade-a/packet-factory-24h/vf06/nc-nh-current-20260906';
const sourceRoot = process.env.MASTER_LIBRARY_SOURCE_DIR;
if (!sourceRoot) throw new Error('MASTER_LIBRARY_SOURCE_DIR required');
const recovery = JSON.parse(fs.readFileSync(`${sourceRoot}/recovery-receipt.json`));
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const result = { sourceRoot, sources: [], fixtures: [] };
for (const [state, slug] of [['nc','nc-146-dismissal-petition-set'],['nh','nh-petition-nonconviction-pre2019-set']]) {
  const dir = `data/rcap-all50/overlays/census-v1/${state}/${slug}--official-pdf-fill`;
  const receipt = JSON.parse(fs.readFileSync(`${dir}/source-receipt.json`));
  for (const document of receipt.documents) {
    const recovered = recovery.recovered.find(r => r.sha256 === document.sha256);
    if (!recovered) throw new Error(`Exact recovery missing ${document.documentId}`);
    const bytes = fs.readFileSync(recovered.path);
    if (hash(bytes) !== document.sha256 || bytes.length !== document.byteLength) throw new Error(`Source identity mismatch ${document.documentId}`);
    const pdf = await PDFDocument.load(bytes);
    const pages = pdf.getPages();
    const fields = pdf.getForm().getFields().map(f => ({
      name: f.getName(), type: f.constructor.name, readOnly: f.isReadOnly(),
      maxLength: f.getMaxLength?.() ?? null, value: f.getText?.() ?? f.getSelected?.() ?? f.isChecked?.() ?? null,
      options: f.getOptions?.() ?? null,
      widgets: f.acroField.getWidgets().map(w => ({
        page: pages.findIndex(p => (p.node.Annots()?.asArray() ?? []).some(r => pdf.context.lookup(r) === w.dict)) + 1,
        rect: w.getRectangle(), appearanceState: w.getAppearanceState()?.toString() ?? null
      }))
    }));
    if (fields.some(f => f.widgets.some(w => w.page === 0))) throw new Error('Unlocated source widget');
    result.sources.push({state, documentId: document.documentId, path: recovered.path, sha256: hash(bytes), byteLength: bytes.length, pageCount: pages.length, fieldCount: fields.length, fields});
  }
  for (const fixture of ['canonical','boundary']) {
    const path = `${dir}/fixtures/${fixture}.pdf`;
    const bytes = fs.readFileSync(path), pdf = await PDFDocument.load(bytes);
    result.fixtures.push({state, fixture, path, sha256: hash(bytes), byteLength: bytes.length, pageCount: pdf.getPageCount(), acroFieldCount: pdf.getForm().getFields().length});
  }
}
fs.writeFileSync(`${out}/source-fields.json`, `${JSON.stringify(result,null,2)}\n`);
console.log(JSON.stringify({sources: result.sources.map(({state,documentId,sha256,byteLength,pageCount,fieldCount})=>({state,documentId,sha256,byteLength,pageCount,fieldCount})), fixtures: result.fixtures},null,2));
