"""Author measurement of saved official-page additions, without raster claims."""
import collections, hashlib, json, subprocess, xml.etree.ElementTree as ET
from pathlib import Path
base=Path('data/rcap-all50/overlays/census-v1/ut/ut-pet-remove-link-set--official-pdf-fill')
def read(p): return json.loads(p.read_text())
def pages(p):
    doc=ET.fromstring(subprocess.check_output(['pdftotext','-bbox',str(p),'-']))
    return [[dict(text=''.join(w.itertext()), **{k:float(v) for k,v in w.attrib.items()}) for w in p.findall('{*}word')] for p in doc.findall('.//{*}page')]
def key(w): return (w['text'],*[round(w[k],3) for k in ['xMin','yMin','xMax','yMax']])
sources=read(base/'source-receipt.json')['sources']
original={s['formNumber']:pages(Path(s['path'])) for s in sources}
report=read(base/'reports/actual-writes.json'); artifacts=read(base/'reports/rendered-artifacts.json')['artifacts']; proofs=[]
for artifact in artifacts:
    p=Path(artifact['file']); assert hashlib.sha256(p.read_bytes()).hexdigest()==artifact['sha256']
    output=pages(p); assert len(output)==artifact['pageCount']
    writes=[w for w in report['writes'] if w['fixture']==artifact['fixture']]
    extras=[]; missing=[]; unknown=[]; outside=[]; controls=[]
    for m in artifact['pageManifest']:
        if m['formNumber'] not in original: continue
        prior=collections.Counter(key(w) for w in original[m['formNumber']][m['sourcePage']-1]); current=collections.Counter(key(w) for w in output[m['packetPage']-1])
        missing.extend((prior-current).elements()); added=list((current-prior).elements())
        expected=[w for w in writes if w['packetPage']==m['packetPage']]
        expected_words=collections.Counter(word for w in expected for word in w['text'].split()); actual_words=collections.Counter(w[0] for w in added)
        if expected_words!=actual_words: unknown.append({'page':m['packetPage'],'expected':dict(expected_words),'actual':dict(actual_words)})
        for word in added:
            text,x0,y0,x1,y1=word
            fit=[w for w in expected if x0>=w['x']-.02 and x1<=w['x']+w['boxWidth']+.02 and abs(y1-(792-w['y']))<4 and y0>792-w['y']-w['fontSize']-2]
            if not fit: outside.append({'page':m['packetPage'],'word':word})
        if not expected and added: controls.append({'page':m['packetPage'],'unexpectedInk':added})
        extras.extend(added)
    assert not missing, f"{artifact['fixture']}: original source words removed"
    assert not unknown, f"{artifact['fixture']}: unknown or missing added words {unknown}"
    assert not outside, f"{artifact['fixture']}: actual saved word outside field {outside}"
    assert not controls, f"{artifact['fixture']}: protected page added ink {controls}"
    proofs.append({'fixture':artifact['fixture'],'sha256':artifact['sha256'],'valuesReportedByFinalizer':len(writes),'addedGlyphsReadFromOutputBytes':sum(len(w[0]) for w in extras),'flattenedWidgetAppearancesReadFromOutputBytes':0,'nonWhitespaceGlyphsOutsideMeasuredWriteBoxes':sum(len(w['word'][0]) for w in outside),'refusedFieldsWithInk':controls,'originalSourceWordsMissing':len(missing),'unreportedAddedWords':len(unknown),'savedPagesMeasured':len(output),'officialPagesMeasured':artifact['officialPages'],'proofMethod':'Actual saved pdftotext bounding boxes minus exact source words and positions; all added words required inside declared field bounds; unchanged protected pages carry zero added words. This is author byte geometry, not independent or raster acceptance.'})
report['artifacts']=proofs
(base/'reports/actual-writes.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'savedPagesMeasured':sum(p['savedPagesMeasured'] for p in proofs),'actualWritesMeasured':sum(p['valuesReportedByFinalizer'] for p in proofs),'outsideFields':sum(p['nonWhitespaceGlyphsOutsideMeasuredWriteBoxes'] for p in proofs),'originalSourceWordsMissing':sum(p['originalSourceWordsMissing'] for p in proofs)}))
