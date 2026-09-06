"""Focused author measurements, not an independent verification or raster pass."""
import hashlib
import json
import re
import subprocess
import xml.etree.ElementTree as ET
from pathlib import Path

OUT = Path(__file__).resolve().parent
FAMILY = Path('data/rcap-all50/overlays/census-v1/il/composed-treatment:obligation:runtime-only:il:criminal-identity-theft-mistaken-identity-relief--custom-pleading')
sha = lambda data: hashlib.sha256(data).hexdigest()
before = json.loads((OUT/'before-family-manifest.json').read_text())
after = json.loads((OUT/'build-2-family-manifest.json').read_text())
assert after == json.loads((OUT/'build-1-family-manifest.json').read_text())
assert before['approval-request.json'] == after['approval-request.json']
assert before['product-wiring.json'] == after['product-wiring.json']
(OUT/'before-source-receipt.json').write_bytes(subprocess.check_output(['git','show',f'HEAD:{FAMILY}/source-receipt.json']))
receipt = json.loads((FAMILY/'source-receipt.json').read_text())
records = []
for record in receipt['committedRecords']:
    data = Path(record['pathInRepository']).read_bytes()
    assert sha(data) == record['sha256'] and len(data) == record['byteLength']
    records.append({'path':record['pathInRepository'], 'sha256':sha(data), 'byteLength':len(data), 'matchesReceipt':True})
fieldmap = json.loads((FAMILY/'production-field-map.json').read_text())
primary = fieldmap['maps'][0]
assert fieldmap['requiredBeforeFilingCount'] == 7
caption = 'il-mistaken-identity-primary-filing-1.arrest_circuit_caption'
rbf = fieldmap['requiredBeforeFiling']
assert caption in json.dumps(rbf)
instructions = (FAMILY/'participant-instructions.md').read_text()
assert 'opening IN THE ... COURT caption' in instructions
assert 'using the arrest record and the circuit identified in item C2' in instructions
result = {
    'measurementRole':'author repair checks; no independent verdict or calibrated raster acceptance',
    'sourceRecords':records, 'twoBuildFamilyFilesByteIdentical':len(after),
    'approvalRequestByteUnchanged':True, 'productWiringByteUnchanged':True,
    'requiredBeforeFilingCount':7, 'logicalPetitionBlankCountPerFixture':10,
    'expectedPetitionDottedWriteSpansPerFixture':16, 'fixtures':[]
}
for fixture in ['canonical','boundary']:
    refs = primary[f'{fixture}Refusals']
    found = [r for r in refs if r['field'] == caption]
    assert len(found) == 1 and found[0]['disposition'] == 'REQUIRED_BEFORE_FILING'
    assert found[0]['page'] == 1 and not found[0]['routeDetermined'] and found[0]['factId'] is None
    assert len(refs) == 10 and sum(r['requiredBeforeFiling'] for r in refs) == 7
    pdf = FAMILY/'fixtures'/f'{fixture}.pdf'
    text = subprocess.check_output(['pdftotext','-layout',str(pdf),'-'],text=True)
    old_pdf = subprocess.check_output(['git','show',f'HEAD:{pdf}'])
    old_text = subprocess.check_output(['pdftotext','-layout','-','-'],input=old_pdf).decode()
    pages, old_pages = text.split('\f'), old_text.split('\f')
    assert len(pages) == len(old_pages) == 5 and not pages[-1].strip()
    assert pages[:2] == old_pages[:2], 'Petition substance or known fields changed'
    assert re.search(r'IN THE\s+\.{8,}\s+COURT',pages[0])
    assert len(re.findall(r'\.{8,}', ''.join(pages[:2]))) == 16
    normalized = ' '.join(''.join(pages[2:4]).split())
    assert 'Complete the opening IN THE ... COURT caption' in normalized
    assert "office of that circuit's chief judge before filing" in normalized
    (OUT/f'{fixture}-text.txt').write_text(text)
    bbox = subprocess.check_output(['pdftotext','-bbox',str(pdf),'-'])
    root = ET.fromstring(bbox)
    ns = {'h':'http://www.w3.org/1999/xhtml'}
    word_count = 0
    out_of_page = []
    overlaps = []
    for page_no,page in enumerate(root.findall('.//h:page',ns),1):
        words = page.findall('.//h:word',ns)
        width,height = float(page.get('width')),float(page.get('height'))
        rects = [(float(w.get('xMin')),float(w.get('yMin')),float(w.get('xMax')),float(w.get('yMax'))) for w in words]
        word_count += len(words)
        for i,(x0,y0,x1,y1) in enumerate(rects):
            if not (0 <= x0 <= x1 <= width and 0 <= y0 <= y1 <= height):out_of_page.append({'page':page_no,'word':words[i].text,'box':rects[i]})
            for j in range(i):
                a,b,c,d = rects[j]
                if min(x1,c)-max(x0,a)>0.2 and min(y1,d)-max(y0,b)>0.2:
                    overlaps.append({'page':page_no,'words':[words[j].text,words[i].text]})
    assert not out_of_page and not overlaps
    images = []
    for page_no in [1,3,4]:
        prefix = OUT/f'{fixture}-page-{page_no}'
        cmd = ['pdftoppm','-f',str(page_no),'-l',str(page_no),'-singlefile','-r','110','-png',str(pdf),str(prefix)]
        subprocess.run(cmd,check=True,capture_output=True)
        png = prefix.with_suffix('.png')
        images.append({'page':page_no,'file':png.name,'sha256':sha(png.read_bytes()),'renderer':'pdftoppm 110 DPI author reading aid; not central acceptance'})
    result['fixtures'].append({
        'fixture':fixture, 'artifactSha256':sha(pdf.read_bytes()), 'byteLength':pdf.stat().st_size,
        'pageCount':4, 'firstTwoPetitionPagesTextExactlyUnchanged':True,
        'captionRequiredBeforeFiling':True, 'captionStillBlank':True,
        'renderedInstructionPresent':True, 'petitonDottedWriteSpans':16,
        'classifiedDottedWriteSpans':{'caption':1,'sixTwoLineFactAnswers':12,'courtCaseNumber':1,'signature':1,'signatureDate':1},
        'wordBoxesMeasured':word_count, 'wordBoxesOutsidePage':out_of_page,
        'wordBoxIntersectionsOver0_2pt':overlaps, 'authorReadingImages':images
    })
(OUT/'repair-measurements.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'sourcesExact':len(records),'twoBuildFilesByteIdentical':len(after),'fixtures':[{k:f[k] for k in ['fixture','artifactSha256','pageCount','wordBoxesMeasured']} for f in result['fixtures']]}))
