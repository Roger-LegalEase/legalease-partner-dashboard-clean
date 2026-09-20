import json,hashlib,re,subprocess
from pathlib import Path
root=Path('data/rcap-all50/overlays/census-v1/il/il-seal-edu-set--official-pdf-fill')
report=json.loads((root/'reports/rendered-artifacts.json').read_text());results=[]
for row in report['packets']:
 docs={d['documentId'] for d in row['documents']}
 waiver='FW-CIV-APPLICATION' in docs
 assert ('FW-CIV-ORDER' in docs)==waiver,'Waiver application/order must be included together'
 p=Path(row['file']);b=p.read_bytes();assert hashlib.sha256(b).hexdigest()==row['sha256'] and len(b)==row['byteLength']
 info=subprocess.check_output(['pdfinfo',str(p)],text=True);pages=int(re.search(r'^Pages:\s+(\d+)',info,re.M).group(1));assert pages==(17 if waiver else 10),'Incomplete official component page set'
 assert 'EXP-AD Order Denying' in docs,'Required official denial order missing'
 text=subprocess.check_output(['pdftotext','-layout',str(p),'-'],text=True);assert re.search(r'2906\.6',text),'Official denial footer absent from saved PDF'
 assert bool(re.search(r'602\.8',text))==waiver,'Official waiver-order footer disagrees with delivered branch'
 if waiver:
  assert len(re.findall(r'602\.8',text))==3,'All three waiver-order pages must ship'
 results.append({'fixture':row['fixture'],'sha256':row['sha256'],'byteLength':len(b),'pages':pages,'waiverRequestedBranch':waiver,'result':'PASS'})
Path('/tmp/il-edu-component-saved-byte-preflight-result.json').write_text(json.dumps({'result':'PASS','method':'Actual saved PDF page count, printed official form footers, and manifest-to-byte agreement','independentFinalAcceptance':False,'fixtures':results},indent=2)+'\n');print(json.dumps(results))
