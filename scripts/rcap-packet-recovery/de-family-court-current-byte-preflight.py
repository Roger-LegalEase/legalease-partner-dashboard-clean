import json,hashlib,re,argparse
from pathlib import Path
import pymupdf as fitz
import numpy as np
parser=argparse.ArgumentParser()
parser.add_argument('--source-bases', default='/tmp/rcap-de-office/print-bases')
parser.add_argument('--output', default='/tmp/de-fc-current-byte-preflight.json')
args=parser.parse_args()
root=Path('data/rcap-all50/overlays/census-v1/de/de-discretionary-family-court-set--official-pdf-fill')
source_pins={'form281':'1865ddec131fc77ea353ac3253751877b68fd305639dfc5df9c1bfd05482ba77','form281e':'43e76bceb54e0707412eebd8efb9008e1de8c91b4d0f82a468fa33e384cef175'}
for name,digest in source_pins.items():
 assert hashlib.sha256((Path(args.source_bases)/(name+'.pdf')).read_bytes()).hexdigest()==digest, name+' source-derived base drift'
a=json.loads((root/'reports/rendered-artifacts.json').read_text());w=json.loads((root/'reports/actual-writes.json').read_text());findings=[];checks=0
norm=lambda s:re.sub(r'\s+','',s)
for packet,wd in zip(a['packets'],w['documents']):
 p=Path(packet['file']);b=p.read_bytes();assert hashlib.sha256(b).hexdigest()==packet['sha256'];assert len(b)==packet['byteLength'];doc=fitz.open(p)
 for pm in packet['pageManifest']:
  if not pm.get('sourceSha256'):continue
  page=doc[pm['packetPage']-1];sourceName='form281e' if pm['formNumber']=='FORM-281E' else 'form281'
  source=fitz.open(Path(args.source_bases)/(sourceName+'.pdf'))[0]
  def raster(pg):
   pix=pg.get_pixmap(matrix=fitz.Matrix(2,2),colorspace=fitz.csGRAY,alpha=False);return np.frombuffer(pix.samples,dtype=np.uint8).reshape(pix.height,pix.width)
  old,new=raster(source),raster(page);mask=np.zeros(old.shape,dtype=bool)
  for wr in wd['actualWrites']:
   if wr['page']!=pm['packetPage']:continue
   r=wr['rect'];box=fitz.Rect(r['x'],792-r['y']-r['height'],r['x']+r['width'],792-r['y']);box+=(-1.5,-1.5,1.5,1.5)
   actual=page.get_textbox(box);checks+=1
   if norm(wr['expected']) not in norm(actual):findings.append({'fixture':packet['fixture'],'page':pm['packetPage'],'field':wr['field'],'expected':wr['expected'],'actual':actual})
   x0,y0,x1,y1=[int(v*2) for v in box];mask[max(0,y0):y1,max(0,x0):x1]=True
  changed=np.abs(old.astype('int16')-new.astype('int16'))>32
  outside=int(np.count_nonzero(changed & ~mask));checks+=1
  if outside:findings.append({'fixture':packet['fixture'],'page':pm['packetPage'],'sourceInkChangesOutsideWrites':outside})
result={'familyId':'de_discretionary_family_court-set','checks':checks,'packetBindings':[{'path':p['file'],'sha256':p['sha256'],'byteLength':p['byteLength']} for p in a['packets']],'sourceDerivedBaseHashes':source_pins,'result':'FAIL' if findings else 'PASS','findings':findings,'scope':'Saved-byte per-field readback and source pixel preservation outside declared write rectangles; not independent semantic or central raster acceptance.'}
Path(args.output).write_text(json.dumps(result,indent=2));print(json.dumps(result));raise SystemExit(bool(findings))
