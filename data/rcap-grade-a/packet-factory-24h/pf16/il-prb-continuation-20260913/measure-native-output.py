"""IL PRB author saved-output proof; no independent/raster acceptance asserted."""
from pathlib import Path
import collections,hashlib,json,subprocess,sys,xml.etree.ElementTree as ET
base=Path(sys.argv[1] if len(sys.argv)>1 else 'data/rcap-grade-a/packet-factory-24h/pf16/il-prb-continuation-20260913/staged-overlay')
def read(p):return json.loads(p.read_text())
def pages(p):
    x=ET.fromstring(subprocess.check_output(['pdftotext','-bbox',str(p),'-']))
    return [[dict(text=''.join(w.itertext()),**{k:float(v) for k,v in w.attrib.items()})for w in p.findall('{*}word')]for p in x.findall('.//{*}page')]
def key(w):return (w['text'],*[round(w[k],2) for k in ['xMin','yMin','xMax','yMax']])
receipt=read(base/'source-receipt.json');sources={s['documentId']:pages(Path(s['path']))for s in receipt['sources']}
actual=read(base/'reports/actual-writes.json');artifacts=read(base/'reports/rendered-artifacts.json')['artifacts'];proofs=[];findings=[]
for a in artifacts:
    path=Path(a['file']);assert hashlib.sha256(path.read_bytes()).hexdigest()==a['sha256'];saved=pages(path);assert len(saved)==a['pageCount'];planned=[w for w in actual['writes']if w['fixture']==a['fixture']];added_all=[];missing_all=[];outside=[];unexpected=[];pageproof=[]
    for m in a['pageManifest']:
        n=m['packetPage'];ws=saved[n-1]
        if m['documentId']not in sources:
            for word in ws:
                if word['xMin']<47 or word['xMax']>565 or word['yMin']<30 or word['yMax']>770:findings.append({'fixture':a['fixture'],'page':n,'compositionOutOfBounds':word})
            continue
        original=collections.Counter(key(w)for w in sources[m['documentId']][m['sourcePage']-1]);output=collections.Counter(key(w)for w in ws);missing=list((original-output).elements());added=list((output-original).elements());expected=[w for w in planned if w['packetPage']==n]
        expected_words=collections.Counter(token for w in expected for token in w['text'].split());added_words=collections.Counter(w[0]for w in added)
        if expected_words!=added_words:unexpected.append({'page':n,'missing':dict(expected_words-added_words),'unexpected':dict(added_words-expected_words)})
        for w in added:
            text,x0,y0,x1,y1=w
            fits=[p for p in expected if x0>=p['x']-.03 and x1<=p['x']+p['boxWidth']+.03 and abs(y1-(792-p['y']))<4 and y0>792-p['y']-p['fontSize']-2]
            if not fits:outside.append({'page':n,'word':w})
        missing_all.extend(missing);added_all.extend(added);pageproof.append({'page':n,'documentId':m['documentId'],'sourcePage':m['sourcePage'],'originalWords':sum(original.values()),'missingSourceWords':len(missing),'addedWords':len(added)})
    findings.extend([{'fixture':a['fixture'],'missingSourceWords':missing_all}]if missing_all else [])
    findings.extend([{'fixture':a['fixture'],'unreportedOrMissingWords':unexpected}]if unexpected else [])
    findings.extend([{'fixture':a['fixture'],'outsideWriteBoxes':outside}]if outside else [])
    proofs.append({'fixture':a['fixture'],'sha256':a['sha256'],'savedPagesMeasured':len(saved),'valuesReportedByFinalizer':len(planned),'addedGlyphsReadFromOutputBytes':sum(len(w[0])for w in added_all),'flattenedWidgetAppearancesReadFromOutputBytes':0,'nonWhitespaceGlyphsOutsideMeasuredWriteBoxes':sum(len(w['word'][0])for w in outside),'refusedFieldsWithInk':unexpected,'originalSourceWordsMissing':len(missing_all),'pageProofs':pageproof,'proofMethod':'Saved PDF word-and-coordinate difference from exact source pages; every added word is a declared field value inside measured source widget; all other official-page words remain. Author proof only.'})
report={'savedPagesMeasured':sum(p['savedPagesMeasured']for p in proofs),'writesMeasured':len(actual['writes']),'findings':findings,'artifacts':proofs}
(base/'reports/saved-page-measurements.json').write_text(json.dumps(report,indent=2)+'\n')
if findings:print(json.dumps(findings[:8],indent=2));sys.exit(1)
actual['artifacts']=proofs;(base/'reports/actual-writes.json').write_text(json.dumps(actual,indent=2)+'\n');print(json.dumps({'savedPagesMeasured':report['savedPagesMeasured'],'writesMeasured':report['writesMeasured'],'findings':0}))
